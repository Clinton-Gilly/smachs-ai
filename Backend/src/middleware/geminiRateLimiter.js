const logger = require('../utils/logger');

/**
 * Gemini API Rate Limiter for FREE TIER
 * 
 * Free Tier Limits for gemini-2.0-flash:
 * - RPM (Requests Per Minute): 15
 * - TPM (Tokens Per Minute): 1,000,000
 * - RPD (Requests Per Day): 200
 * 
 * This middleware tracks usage and prevents exceeding limits
 */
class GeminiRateLimiter {
  constructor() {
    // Free tier limits for gemini-2.0-flash (set higher to avoid false-positives;
    // the real Gemini API will return 429 if the actual limit is hit)
    this.limits = {
      rpm: parseInt(process.env.GEMINI_RPM_LIMIT) || 14, // stay just under 15 to be safe
      tpm: parseInt(process.env.GEMINI_TPM_LIMIT) || 1000000,
      rpd: parseInt(process.env.GEMINI_RPD_LIMIT) || 190
    };

    // Usage tracking
    this.usage = {
      minute: {
        requests: 0,
        tokens: 0,
        resetTime: Date.now() + 60000
      },
      day: {
        requests: 0,
        resetTime: this.getNextMidnightPacific()
      }
    };

    // Start cleanup intervals
    this.startCleanupIntervals();

    logger.info('Gemini Rate Limiter initialized', {
      limits: this.limits,
      tier: 'FREE'
    });
  }

  /**
   * Get next midnight Pacific time (when RPD resets)
   */
  getNextMidnightPacific() {
    const now = new Date();
    const pacificTime = new Date(now.toLocaleString('en-US', { timeZone: 'America/Los_Angeles' }));
    const tomorrow = new Date(pacificTime);
    tomorrow.setDate(tomorrow.getDate() + 1);
    tomorrow.setHours(0, 0, 0, 0);
    return tomorrow.getTime();
  }

  /**
   * Start cleanup intervals to reset counters
   */
  startCleanupIntervals() {
    // Reset minute counters every minute
    setInterval(() => {
      this.usage.minute = {
        requests: 0,
        tokens: 0,
        resetTime: Date.now() + 60000
      };
      logger.debug('Minute counters reset');
    }, 60000);

    // Check for day reset every minute
    setInterval(() => {
      if (Date.now() >= this.usage.day.resetTime) {
        this.usage.day = {
          requests: 0,
          resetTime: this.getNextMidnightPacific()
        };
        logger.info('Daily counters reset (Pacific midnight)');
      }
    }, 60000);
  }

  /**
   * Estimate token count (rough approximation)
   * 1 token ≈ 4 characters for English text
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Check if request can proceed
   */
  canProceed(estimatedTokens = 0) {
    const now = Date.now();

    // Check RPD (Requests Per Day)
    if (this.usage.day.requests >= this.limits.rpd) {
      return {
        allowed: false,
        reason: 'RPD_EXCEEDED',
        message: `Daily request limit exceeded (${this.limits.rpd} requests/day)`,
        resetTime: this.usage.day.resetTime,
        current: this.usage.day.requests,
        limit: this.limits.rpd
      };
    }

    // Check RPM (Requests Per Minute)
    if (this.usage.minute.requests >= this.limits.rpm) {
      return {
        allowed: false,
        reason: 'RPM_EXCEEDED',
        message: `Minute request limit exceeded (${this.limits.rpm} requests/minute)`,
        resetTime: this.usage.minute.resetTime,
        current: this.usage.minute.requests,
        limit: this.limits.rpm
      };
    }

    // Check TPM (Tokens Per Minute)
    if (this.usage.minute.tokens + estimatedTokens > this.limits.tpm) {
      return {
        allowed: false,
        reason: 'TPM_EXCEEDED',
        message: `Minute token limit exceeded (${this.limits.tpm} tokens/minute)`,
        resetTime: this.usage.minute.resetTime,
        current: this.usage.minute.tokens,
        limit: this.limits.tpm
      };
    }

    return { allowed: true };
  }

  /**
   * Record API usage
   */
  recordUsage(tokens = 0) {
    this.usage.minute.requests++;
    this.usage.minute.tokens += tokens;
    this.usage.day.requests++;

    logger.debug('API usage recorded', {
      minuteRequests: this.usage.minute.requests,
      minuteTokens: this.usage.minute.tokens,
      dayRequests: this.usage.day.requests
    });
  }

  /**
   * Get current usage stats
   */
  getUsageStats() {
    return {
      minute: {
        requests: this.usage.minute.requests,
        requestsLimit: this.limits.rpm,
        requestsRemaining: Math.max(0, this.limits.rpm - this.usage.minute.requests),
        tokens: this.usage.minute.tokens,
        tokensLimit: this.limits.tpm,
        tokensRemaining: Math.max(0, this.limits.tpm - this.usage.minute.tokens),
        resetTime: this.usage.minute.resetTime
      },
      day: {
        requests: this.usage.day.requests,
        requestsLimit: this.limits.rpd,
        requestsRemaining: Math.max(0, this.limits.rpd - this.usage.day.requests),
        resetTime: this.usage.day.resetTime
      },
      percentageUsed: {
        rpm: Math.round((this.usage.minute.requests / this.limits.rpm) * 100),
        tpm: Math.round((this.usage.minute.tokens / this.limits.tpm) * 100),
        rpd: Math.round((this.usage.day.requests / this.limits.rpd) * 100)
      }
    };
  }

  /**
   * Express middleware
   */
  middleware() {
    return async (req, res, next) => {
      // Skip rate limiting for health checks
      if (req.path === '/api/health') {
        return next();
      }

      // Estimate tokens from request body
      let estimatedTokens = 0;
      if (req.body) {
        const bodyText = JSON.stringify(req.body);
        estimatedTokens = this.estimateTokens(bodyText);
      }

      // Check if request can proceed
      const check = this.canProceed(estimatedTokens);

      if (!check.allowed) {
        // Wait until the minute window resets, then proceed (up to 65 s)
        const waitMs = Math.min(check.resetTime - Date.now() + 500, 65000);
        if (waitMs > 0 && check.reason === 'RPM_EXCEEDED') {
          logger.warn(`Gemini RPM limit — queuing request for ${Math.ceil(waitMs / 1000)}s`, { path: req.path });
          await new Promise((r) => setTimeout(r, waitMs));
          // Re-check after waiting
          const recheck = this.canProceed(estimatedTokens);
          if (!recheck.allowed) {
            return res.status(429).json({
              success: false,
              error: 'Rate limit exceeded after retry',
              details: recheck,
              suggestion: 'Too many requests — please slow down.'
            });
          }
        } else {
          logger.warn('Rate limit exceeded', { reason: check.reason, path: req.path });
          return res.status(429).json({
            success: false,
            error: 'Rate limit exceeded',
            details: {
              reason: check.reason,
              message: check.message,
              current: check.current,
              limit: check.limit,
              resetTime: new Date(check.resetTime).toISOString(),
              retryAfter: Math.ceil((check.resetTime - Date.now()) / 1000)
            },
            suggestion: 'Please wait before making another request.'
          });
        }
      }

      // Record usage
      this.recordUsage(estimatedTokens);

      // Add usage stats to response headers
      const stats = this.getUsageStats();
      res.setHeader('X-RateLimit-Limit-RPM', this.limits.rpm);
      res.setHeader('X-RateLimit-Remaining-RPM', stats.minute.requestsRemaining);
      res.setHeader('X-RateLimit-Limit-RPD', this.limits.rpd);
      res.setHeader('X-RateLimit-Remaining-RPD', stats.day.requestsRemaining);
      res.setHeader('X-RateLimit-Reset-Minute', new Date(stats.minute.resetTime).toISOString());
      res.setHeader('X-RateLimit-Reset-Day', new Date(stats.day.resetTime).toISOString());

      next();
    };
  }
}

// Export singleton instance
module.exports = new GeminiRateLimiter();

