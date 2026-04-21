const express = require('express');
const router = express.Router();
const analyticsService = require('../services/analyticsService');
const cacheService = require('../services/cacheService');
const logger = require('../utils/logger');

/**
 * Get query statistics
 * GET /api/analytics/stats?timeRange=24h
 */
router.get('/stats', async (req, res) => {
  try {
    const { timeRange = '24h' } = req.query;

    const stats = await analyticsService.getQueryStats(timeRange);
    const cacheStats = cacheService.getStats();

    res.json({
      success: true,
      timeRange,
      queryStats: stats,
      cacheStats
    });
  } catch (error) {
    logger.error('Failed to get analytics stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get popular queries
 * GET /api/analytics/popular?limit=10&timeRange=7d
 */
router.get('/popular', async (req, res) => {
  try {
    const { limit = 10, timeRange = '7d' } = req.query;

    const popularQueries = await analyticsService.getPopularQueries(
      parseInt(limit),
      timeRange
    );

    res.json({
      success: true,
      queries: popularQueries
    });
  } catch (error) {
    logger.error('Failed to get popular queries', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get slow queries
 * GET /api/analytics/slow?limit=10&threshold=5000
 */
router.get('/slow', async (req, res) => {
  try {
    const { limit = 10, threshold = 5000 } = req.query;

    const slowQueries = await analyticsService.getSlowQueries(
      parseInt(limit),
      parseInt(threshold)
    );

    res.json({
      success: true,
      queries: slowQueries
    });
  } catch (error) {
    logger.error('Failed to get slow queries', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get retrieval method performance
 * GET /api/analytics/methods?timeRange=7d
 */
router.get('/methods', async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;

    const methodStats = await analyticsService.getRetrievalMethodStats(timeRange);

    res.json({
      success: true,
      methods: methodStats
    });
  } catch (error) {
    logger.error('Failed to get method stats', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Submit user feedback
 * POST /api/analytics/feedback
 */
router.post('/feedback', async (req, res) => {
  try {
    const {
      queryId,
      query,
      response,
      rating,
      feedback,
      helpful,
      issues
    } = req.body;

    if (!queryId || !query) {
      return res.status(400).json({ error: 'queryId and query are required' });
    }

    const result = await analyticsService.recordFeedback({
      queryId,
      query,
      response,
      rating,
      feedback,
      helpful,
      issues,
      sessionId: req.headers['x-session-id'],
      userAgent: req.headers['user-agent']
    });

    res.json({
      success: true,
      message: 'Feedback recorded successfully',
      feedbackId: result.insertedId
    });
  } catch (error) {
    logger.error('Failed to record feedback', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Get feedback summary
 * GET /api/analytics/feedback/summary?timeRange=7d
 */
router.get('/feedback/summary', async (req, res) => {
  try {
    const { timeRange = '7d' } = req.query;

    const summary = await analyticsService.getFeedbackSummary(timeRange);
    const commonIssues = await analyticsService.getCommonIssues(10, timeRange);

    res.json({
      success: true,
      summary,
      commonIssues
    });
  } catch (error) {
    logger.error('Failed to get feedback summary', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Clear cache
 * POST /api/analytics/cache/clear
 */
router.post('/cache/clear', async (req, res) => {
  try {
    await cacheService.clear();

    res.json({
      success: true,
      message: 'Cache cleared successfully'
    });
  } catch (error) {
    logger.error('Failed to clear cache', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

