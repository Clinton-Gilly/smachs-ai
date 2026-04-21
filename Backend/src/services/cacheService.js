const crypto = require('crypto');
const logger = require('../utils/logger');

/**
 * Caching Service with Redis support
 * Falls back to in-memory cache if Redis is not available
 */
class CacheService {
  constructor() {
    this.redisClient = null;
    this.memoryCache = new Map();
    this.cacheStats = {
      hits: 0,
      misses: 0,
      sets: 0
    };
    
    this.initializeRedis();
  }

  async initializeRedis() {
    // Only initialize Redis if enabled
    if (process.env.ENABLE_REDIS_CACHE !== 'true') {
      logger.info('Redis caching disabled, using in-memory cache');
      return;
    }

    try {
      const redis = require('redis');

      const redisConfig = {
        url: process.env.REDIS_URL || 'redis://localhost:6379',
        socket: {
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              logger.error('Redis reconnection failed after 10 attempts');
              return new Error('Redis reconnection failed');
            }
            return retries * 100;
          }
        }
      };

      // Add password if provided
      if (process.env.REDIS_PASSWORD) {
        redisConfig.password = process.env.REDIS_PASSWORD;
      }

      this.redisClient = redis.createClient(redisConfig);

      this.redisClient.on('error', (err) => {
        logger.error('Redis Client Error', { error: err.message });
        this.redisClient = null; // Fall back to memory cache
      });

      this.redisClient.on('connect', () => {
        logger.info('Redis client connected successfully');
      });

      await this.redisClient.connect();
    } catch (error) {
      logger.warn('Redis initialization failed, using in-memory cache', { error: error.message });
      this.redisClient = null;
    }
  }

  /**
   * Generate cache key from input
   */
  generateKey(prefix, data) {
    const hash = crypto
      .createHash('sha256')
      .update(JSON.stringify(data))
      .digest('hex')
      .substring(0, 16);
    
    return `${prefix}:${hash}`;
  }

  /**
   * Get value from cache
   */
  async get(key) {
    try {
      let value;

      if (this.redisClient && this.redisClient.isOpen) {
        // Try Redis first
        value = await this.redisClient.get(key);
        if (value) {
          value = JSON.parse(value);
        }
      } else {
        // Fall back to memory cache
        value = this.memoryCache.get(key);
      }

      if (value) {
        this.cacheStats.hits++;
        logger.debug('Cache hit', { key });
        return value;
      }

      this.cacheStats.misses++;
      logger.debug('Cache miss', { key });
      return null;
    } catch (error) {
      logger.error('Cache get error', { key, error: error.message });
      return null;
    }
  }

  /**
   * Set value in cache
   */
  async set(key, value, ttl = 3600) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        // Store in Redis
        await this.redisClient.setEx(key, ttl, JSON.stringify(value));
      } else {
        // Store in memory cache
        this.memoryCache.set(key, value);
        
        // Auto-expire from memory cache
        setTimeout(() => {
          this.memoryCache.delete(key);
        }, ttl * 1000);
      }

      this.cacheStats.sets++;
      logger.debug('Cache set', { key, ttl });
      return true;
    } catch (error) {
      logger.error('Cache set error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Delete value from cache
   */
  async delete(key) {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.del(key);
      } else {
        this.memoryCache.delete(key);
      }
      
      logger.debug('Cache delete', { key });
      return true;
    } catch (error) {
      logger.error('Cache delete error', { key, error: error.message });
      return false;
    }
  }

  /**
   * Clear all cache
   */
  async clear() {
    try {
      if (this.redisClient && this.redisClient.isOpen) {
        await this.redisClient.flushAll();
      } else {
        this.memoryCache.clear();
      }
      
      logger.info('Cache cleared');
      return true;
    } catch (error) {
      logger.error('Cache clear error', { error: error.message });
      return false;
    }
  }

  /**
   * Get cache statistics
   */
  getStats() {
    const hitRate = this.cacheStats.hits + this.cacheStats.misses > 0
      ? (this.cacheStats.hits / (this.cacheStats.hits + this.cacheStats.misses) * 100).toFixed(2)
      : 0;

    return {
      ...this.cacheStats,
      hitRate: `${hitRate}%`,
      backend: this.redisClient && this.redisClient.isOpen ? 'redis' : 'memory',
      memorySize: this.memoryCache.size
    };
  }

  /**
   * Cache embedding with TTL
   */
  async cacheEmbedding(text, embedding) {
    const key = this.generateKey('embedding', text);
    await this.set(key, embedding, 86400); // 24 hours
    return key;
  }

  /**
   * Get cached embedding
   */
  async getCachedEmbedding(text) {
    const key = this.generateKey('embedding', text);
    return await this.get(key);
  }

  /**
   * Cache query result
   */
  async cacheQueryResult(query, options, result) {
    const key = this.generateKey('query', { query, options });
    await this.set(key, result, 1800); // 30 minutes
    return key;
  }

  /**
   * Get cached query result
   */
  async getCachedQueryResult(query, options) {
    const key = this.generateKey('query', { query, options });
    return await this.get(key);
  }

  /**
   * Cache LLM response
   */
  async cacheLLMResponse(prompt, response) {
    const key = this.generateKey('llm', prompt);
    await this.set(key, response, 3600); // 1 hour
    return key;
  }

  /**
   * Get cached LLM response
   */
  async getCachedLLMResponse(prompt) {
    const key = this.generateKey('llm', prompt);
    return await this.get(key);
  }

  /**
   * Invalidate cache by pattern (Redis only)
   */
  async invalidatePattern(pattern) {
    if (!this.redisClient || !this.redisClient.isOpen) {
      logger.warn('Pattern invalidation only works with Redis');
      return false;
    }

    try {
      const keys = await this.redisClient.keys(pattern);
      if (keys.length > 0) {
        await this.redisClient.del(keys);
        logger.info('Invalidated cache pattern', { pattern, count: keys.length });
      }
      return true;
    } catch (error) {
      logger.error('Pattern invalidation error', { pattern, error: error.message });
      return false;
    }
  }

  /**
   * Close Redis connection
   */
  async close() {
    if (this.redisClient && this.redisClient.isOpen) {
      await this.redisClient.quit();
      logger.info('Redis connection closed');
    }
  }
}

module.exports = new CacheService();

