const { getDB } = require('../config/database');
const logger = require('../utils/logger');

/**
 * Analytics and Feedback Service
 * Tracks query performance, user feedback, and system metrics
 */
class AnalyticsService {
  constructor() {
    this.analyticsCollection = 'analytics';
    this.feedbackCollection = 'feedback';
  }

  getAnalyticsCollection() {
    const db = getDB();
    return db.collection(this.analyticsCollection);
  }

  getFeedbackCollection() {
    const db = getDB();
    return db.collection(this.feedbackCollection);
  }

  /**
   * Log query analytics
   */
  async logQuery(data) {
    try {
      const collection = this.getAnalyticsCollection();
      
      const analyticsEntry = {
        timestamp: new Date(),
        query: data.query,
        processedQuery: data.processedQuery,
        retrievalMethod: data.retrievalMethod,
        optimizations: data.optimizations,
        mode: data.mode || 'rag', // 'coanony' | 'rag' | 'general'
        isGlobalQuery: data.isGlobalQuery || false,
        userId: data.userId || null,
        performance: {
          totalTime: data.totalTime,
          retrievalTime: data.retrievalTime,
          generationTime: data.generationTime,
          contextsRetrieved: data.contextsRetrieved,
          contextsFinal: data.contextsFinal
        },
        metadata: {
          userAgent: data.userAgent,
          ip: data.ip,
          sessionId: data.sessionId
        }
      };

      await collection.insertOne(analyticsEntry);
      logger.debug('Query analytics logged', { query: data.query });
      
      return analyticsEntry;
    } catch (error) {
      logger.error('Failed to log query analytics', { error: error.message });
      // Don't throw - analytics failure shouldn't break the app
    }
  }

  /**
   * Record user feedback
   */
  async recordFeedback(data) {
    try {
      const collection = this.getFeedbackCollection();
      
      const feedbackEntry = {
        timestamp: new Date(),
        queryId: data.queryId,
        query: data.query,
        response: data.response,
        rating: data.rating, // 1-5 stars or thumbs up/down
        feedback: data.feedback, // Optional text feedback
        helpful: data.helpful, // Boolean
        issues: data.issues, // Array of issue types
        metadata: {
          sessionId: data.sessionId,
          userAgent: data.userAgent
        }
      };

      const result = await collection.insertOne(feedbackEntry);
      logger.info('User feedback recorded', {
        queryId: data.queryId,
        rating: data.rating,
        helpful: data.helpful
      });
      
      return result;
    } catch (error) {
      logger.error('Failed to record feedback', { error: error.message });
      throw error;
    }
  }

  /**
   * Get query statistics
   */
  async getQueryStats(timeRange = '24h') {
    try {
      const collection = this.getAnalyticsCollection();
      
      const timeFilter = this.getTimeFilter(timeRange);
      
      const stats = await collection.aggregate([
        { $match: timeFilter },
        {
          $group: {
            _id: null,
            totalQueries: { $sum: 1 },
            avgTotalTime: { $avg: '$performance.totalTime' },
            avgRetrievalTime: { $avg: '$performance.retrievalTime' },
            avgGenerationTime: { $avg: '$performance.generationTime' },
            avgContextsRetrieved: { $avg: '$performance.contextsRetrieved' },
            avgContextsFinal: { $avg: '$performance.contextsFinal' }
          }
        }
      ]).toArray();

      return stats[0] || {
        totalQueries: 0,
        avgTotalTime: 0,
        avgRetrievalTime: 0,
        avgGenerationTime: 0,
        avgContextsRetrieved: 0,
        avgContextsFinal: 0
      };
    } catch (error) {
      logger.error('Failed to get query stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Get popular queries
   */
  async getPopularQueries(limit = 10, timeRange = '7d') {
    try {
      const collection = this.getAnalyticsCollection();
      
      const timeFilter = this.getTimeFilter(timeRange);
      
      const popular = await collection.aggregate([
        { $match: timeFilter },
        {
          $group: {
            _id: '$query',
            count: { $sum: 1 },
            avgTime: { $avg: '$performance.totalTime' },
            lastQueried: { $max: '$timestamp' }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]).toArray();

      return popular.map(p => ({
        query: p._id,
        count: p.count,
        avgTime: p.avgTime,
        lastQueried: p.lastQueried
      }));
    } catch (error) {
      logger.error('Failed to get popular queries', { error: error.message });
      throw error;
    }
  }

  /**
   * Get slow queries
   */
  async getSlowQueries(limit = 10, threshold = 5000) {
    try {
      const collection = this.getAnalyticsCollection();
      
      const slowQueries = await collection
        .find({ 'performance.totalTime': { $gte: threshold } })
        .sort({ 'performance.totalTime': -1 })
        .limit(limit)
        .toArray();

      return slowQueries.map(q => ({
        query: q.query,
        totalTime: q.performance.totalTime,
        retrievalTime: q.performance.retrievalTime,
        generationTime: q.performance.generationTime,
        timestamp: q.timestamp
      }));
    } catch (error) {
      logger.error('Failed to get slow queries', { error: error.message });
      throw error;
    }
  }

  /**
   * Get feedback summary
   */
  async getFeedbackSummary(timeRange = '7d') {
    try {
      const collection = this.getFeedbackCollection();
      
      const timeFilter = this.getTimeFilter(timeRange);
      
      const summary = await collection.aggregate([
        { $match: timeFilter },
        {
          $group: {
            _id: null,
            totalFeedback: { $sum: 1 },
            avgRating: { $avg: '$rating' },
            helpfulCount: {
              $sum: { $cond: ['$helpful', 1, 0] }
            },
            notHelpfulCount: {
              $sum: { $cond: ['$helpful', 0, 1] }
            }
          }
        }
      ]).toArray();

      const result = summary[0] || {
        totalFeedback: 0,
        avgRating: 0,
        helpfulCount: 0,
        notHelpfulCount: 0
      };

      result.helpfulPercentage = result.totalFeedback > 0
        ? ((result.helpfulCount / result.totalFeedback) * 100).toFixed(2)
        : 0;

      return result;
    } catch (error) {
      logger.error('Failed to get feedback summary', { error: error.message });
      throw error;
    }
  }

  /**
   * Get common issues from feedback
   */
  async getCommonIssues(limit = 10, timeRange = '7d') {
    try {
      const collection = this.getFeedbackCollection();
      
      const timeFilter = this.getTimeFilter(timeRange);
      
      const issues = await collection.aggregate([
        { $match: { ...timeFilter, issues: { $exists: true, $ne: [] } } },
        { $unwind: '$issues' },
        {
          $group: {
            _id: '$issues',
            count: { $sum: 1 }
          }
        },
        { $sort: { count: -1 } },
        { $limit: limit }
      ]).toArray();

      return issues.map(i => ({
        issue: i._id,
        count: i.count
      }));
    } catch (error) {
      logger.error('Failed to get common issues', { error: error.message });
      throw error;
    }
  }

  /**
   * Get retrieval method performance comparison
   */
  async getRetrievalMethodStats(timeRange = '7d') {
    try {
      const collection = this.getAnalyticsCollection();
      
      const timeFilter = this.getTimeFilter(timeRange);
      
      const stats = await collection.aggregate([
        { $match: timeFilter },
        {
          $group: {
            _id: '$retrievalMethod',
            count: { $sum: 1 },
            avgTime: { $avg: '$performance.retrievalTime' },
            avgContexts: { $avg: '$performance.contextsRetrieved' }
          }
        },
        { $sort: { count: -1 } }
      ]).toArray();

      return stats.map(s => ({
        method: s._id,
        count: s.count,
        avgTime: s.avgTime,
        avgContexts: s.avgContexts
      }));
    } catch (error) {
      logger.error('Failed to get retrieval method stats', { error: error.message });
      throw error;
    }
  }

  /**
   * Helper: Get time filter for queries
   */
  getTimeFilter(timeRange) {
    const now = new Date();
    let startTime;

    switch (timeRange) {
      case '1h':
        startTime = new Date(now - 60 * 60 * 1000);
        break;
      case '24h':
        startTime = new Date(now - 24 * 60 * 60 * 1000);
        break;
      case '7d':
        startTime = new Date(now - 7 * 24 * 60 * 60 * 1000);
        break;
      case '30d':
        startTime = new Date(now - 30 * 24 * 60 * 60 * 1000);
        break;
      default:
        startTime = new Date(now - 24 * 60 * 60 * 1000);
    }

    return {
      timestamp: { $gte: startTime }
    };
  }

  /**
   * Get query stats for the global (company) knowledge base
   */
  async getGlobalKnowledgeBaseStats(timeRange = '7d') {
    try {
      const collection = this.getAnalyticsCollection();
      const timeFilter = this.getTimeFilter(timeRange);

      const [totals, topQueries] = await Promise.all([
        collection.aggregate([
          { $match: { ...timeFilter, isGlobalQuery: true } },
          { $group: {
            _id: null,
            totalQueries: { $sum: 1 },
            avgTime: { $avg: '$performance.totalTime' },
            avgContexts: { $avg: '$performance.contextsRetrieved' }
          }}
        ]).toArray(),
        collection.aggregate([
          { $match: { ...timeFilter, isGlobalQuery: true } },
          { $group: {
            _id: '$query',
            count: { $sum: 1 },
            lastQueried: { $max: '$timestamp' },
            avgTime: { $avg: '$performance.totalTime' }
          }},
          { $sort: { count: -1 } },
          { $limit: 10 }
        ]).toArray()
      ]);

      return {
        totalQueries: totals[0]?.totalQueries || 0,
        avgResponseTime: Math.round(totals[0]?.avgTime || 0),
        avgContextsRetrieved: parseFloat((totals[0]?.avgContexts || 0).toFixed(1)),
        topQueries: topQueries.map((q) => ({
          query: q._id,
          count: q.count,
          lastQueried: q.lastQueried,
          avgTime: Math.round(q.avgTime || 0)
        }))
      };
    } catch (error) {
      logger.error('Failed to get global KB stats', { error: error.message });
      return { totalQueries: 0, avgResponseTime: 0, avgContextsRetrieved: 0, topQueries: [] };
    }
  }

  /**
   * Clean old analytics data
   */
  async cleanOldData(daysToKeep = 90) {
    try {
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysToKeep);

      const analyticsCollection = this.getAnalyticsCollection();
      const feedbackCollection = this.getFeedbackCollection();

      const analyticsResult = await analyticsCollection.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      const feedbackResult = await feedbackCollection.deleteMany({
        timestamp: { $lt: cutoffDate }
      });

      logger.info('Old analytics data cleaned', {
        analyticsDeleted: analyticsResult.deletedCount,
        feedbackDeleted: feedbackResult.deletedCount,
        cutoffDate
      });

      return {
        analyticsDeleted: analyticsResult.deletedCount,
        feedbackDeleted: feedbackResult.deletedCount
      };
    } catch (error) {
      logger.error('Failed to clean old data', { error: error.message });
      throw error;
    }
  }
}

module.exports = new AnalyticsService();

