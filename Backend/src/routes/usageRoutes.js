const express = require('express');
const router = express.Router();
const geminiRateLimiter = require('../middleware/geminiRateLimiter');
const tokenOptimizer = require('../utils/tokenOptimizer');
const logger = require('../utils/logger');

/**
 * GET /api/usage/stats
 * Get current API usage statistics
 */
router.get('/stats', (req, res) => {
  try {
    const rateLimitStats = geminiRateLimiter.getUsageStats();
    const tokenStats = tokenOptimizer.getStats();

    res.json({
      success: true,
      data: {
        rateLimit: rateLimitStats,
        tokenOptimization: tokenStats,
        recommendations: generateRecommendations(rateLimitStats, tokenStats)
      }
    });
  } catch (error) {
    logger.error('Error getting usage stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/usage/reset-token-stats
 * Reset token optimization statistics
 */
router.post('/reset-token-stats', (req, res) => {
  try {
    tokenOptimizer.resetStats();
    
    res.json({
      success: true,
      message: 'Token optimization statistics reset successfully'
    });
  } catch (error) {
    logger.error('Error resetting token stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/usage/dashboard
 * Get comprehensive usage dashboard data
 */
router.get('/dashboard', (req, res) => {
  try {
    const rateLimitStats = geminiRateLimiter.getUsageStats();
    const tokenStats = tokenOptimizer.getStats();

    // Calculate time until resets
    const now = Date.now();
    const minuteResetIn = Math.max(0, Math.ceil((rateLimitStats.minute.resetTime - now) / 1000));
    const dayResetIn = Math.max(0, Math.ceil((rateLimitStats.day.resetTime - now) / 1000));

    // Format times
    const formatTime = (seconds) => {
      const hours = Math.floor(seconds / 3600);
      const minutes = Math.floor((seconds % 3600) / 60);
      const secs = seconds % 60;
      
      if (hours > 0) return `${hours}h ${minutes}m`;
      if (minutes > 0) return `${minutes}m ${secs}s`;
      return `${secs}s`;
    };

    res.json({
      success: true,
      data: {
        tier: 'FREE',
        model: process.env.GEMINI_MODEL || 'gemini-2.0-flash',
        
        // Rate limits
        limits: {
          rpm: {
            current: rateLimitStats.minute.requests,
            limit: rateLimitStats.minute.requestsLimit,
            remaining: rateLimitStats.minute.requestsRemaining,
            percentUsed: rateLimitStats.percentageUsed.rpm,
            resetIn: formatTime(minuteResetIn)
          },
          tpm: {
            current: rateLimitStats.minute.tokens,
            limit: rateLimitStats.minute.tokensLimit,
            remaining: rateLimitStats.minute.tokensRemaining,
            percentUsed: rateLimitStats.percentageUsed.tpm,
            resetIn: formatTime(minuteResetIn)
          },
          rpd: {
            current: rateLimitStats.day.requests,
            limit: rateLimitStats.day.requestsLimit,
            remaining: rateLimitStats.day.requestsRemaining,
            percentUsed: rateLimitStats.percentageUsed.rpd,
            resetIn: formatTime(dayResetIn)
          }
        },

        // Token optimization
        optimization: {
          totalTokensSaved: tokenStats.totalTokensSaved,
          percentSaved: tokenStats.percentSaved,
          optimizationCalls: tokenStats.optimizationCalls,
          averageSavingsPerCall: tokenStats.averageSavingsPerCall
        },

        // Health indicators
        health: {
          status: getHealthStatus(rateLimitStats),
          warnings: getWarnings(rateLimitStats),
          canMakeRequest: rateLimitStats.day.requestsRemaining > 0 && 
                          rateLimitStats.minute.requestsRemaining > 0
        },

        // Recommendations
        recommendations: generateRecommendations(rateLimitStats, tokenStats)
      }
    });
  } catch (error) {
    logger.error('Error getting usage dashboard:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * Generate health status
 */
function getHealthStatus(stats) {
  const maxPercent = Math.max(
    stats.percentageUsed.rpm,
    stats.percentageUsed.tpm,
    stats.percentageUsed.rpd
  );

  if (maxPercent >= 90) return 'CRITICAL';
  if (maxPercent >= 70) return 'WARNING';
  if (maxPercent >= 50) return 'CAUTION';
  return 'HEALTHY';
}

/**
 * Generate warnings
 */
function getWarnings(stats) {
  const warnings = [];

  if (stats.percentageUsed.rpd >= 90) {
    warnings.push({
      type: 'RPD_CRITICAL',
      message: `Daily request limit almost reached (${stats.day.requests}/${stats.day.requestsLimit})`,
      severity: 'HIGH'
    });
  } else if (stats.percentageUsed.rpd >= 70) {
    warnings.push({
      type: 'RPD_WARNING',
      message: `70% of daily requests used (${stats.day.requests}/${stats.day.requestsLimit})`,
      severity: 'MEDIUM'
    });
  }

  if (stats.percentageUsed.rpm >= 80) {
    warnings.push({
      type: 'RPM_WARNING',
      message: `Minute request limit high (${stats.minute.requests}/${stats.minute.requestsLimit})`,
      severity: 'MEDIUM'
    });
  }

  if (stats.percentageUsed.tpm >= 80) {
    warnings.push({
      type: 'TPM_WARNING',
      message: `Minute token limit high (${stats.minute.tokens}/${stats.minute.tokensLimit})`,
      severity: 'MEDIUM'
    });
  }

  return warnings;
}

/**
 * Generate recommendations
 */
function generateRecommendations(rateLimitStats, tokenStats) {
  const recommendations = [];

  // Daily limit recommendations
  if (rateLimitStats.percentageUsed.rpd >= 80) {
    recommendations.push({
      priority: 'HIGH',
      category: 'RATE_LIMIT',
      message: 'Enable Redis caching to reduce API calls',
      action: 'Set ENABLE_REDIS_CACHE=true in .env'
    });
    
    recommendations.push({
      priority: 'HIGH',
      category: 'RATE_LIMIT',
      message: 'Consider upgrading to Tier 1 (paid) for higher limits',
      action: 'Add billing account to your Google Cloud project'
    });
  }

  // Token optimization recommendations
  if (tokenStats.percentSaved < 20 && tokenStats.optimizationCalls > 10) {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'OPTIMIZATION',
      message: 'Token optimization is not very effective',
      action: 'Review your prompts and make them more concise'
    });
  }

  // Caching recommendations
  if (process.env.ENABLE_REDIS_CACHE !== 'true') {
    recommendations.push({
      priority: 'MEDIUM',
      category: 'CACHING',
      message: 'Caching is disabled',
      action: 'Enable Redis caching to reduce API calls and stay within free tier'
    });
  }

  // General best practices
  if (recommendations.length === 0) {
    recommendations.push({
      priority: 'LOW',
      category: 'BEST_PRACTICE',
      message: 'Usage is healthy',
      action: 'Continue monitoring usage to stay within free tier limits'
    });
  }

  return recommendations;
}

module.exports = router;

