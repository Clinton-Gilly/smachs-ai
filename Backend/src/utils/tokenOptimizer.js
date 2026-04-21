const logger = require('./logger');

/**
 * Token Optimizer
 * 
 * Aggressive token reduction strategies to maximize free tier usage
 */
class TokenOptimizer {
  constructor() {
    this.compressionStats = {
      totalOriginal: 0,
      totalOptimized: 0,
      callCount: 0
    };
  }

  /**
   * Estimate token count (1 token ≈ 4 characters)
   */
  estimateTokens(text) {
    if (!text) return 0;
    return Math.ceil(text.length / 4);
  }

  /**
   * Optimize prompt by removing redundant words and phrases
   */
  optimizePrompt(prompt, options = {}) {
    if (!prompt) return '';

    const originalTokens = this.estimateTokens(prompt);
    let optimized = prompt;

    // Remove redundant phrases
    const redundantPhrases = [
      'please ',
      'kindly ',
      'could you ',
      'can you ',
      'would you ',
      'I would like you to ',
      'I need you to ',
      'I want you to ',
      'if possible ',
      'if you can ',
      'thank you',
      'thanks',
    ];

    redundantPhrases.forEach(phrase => {
      const regex = new RegExp(phrase, 'gi');
      optimized = optimized.replace(regex, '');
    });

    // Remove extra whitespace
    optimized = optimized.replace(/\s+/g, ' ').trim();

    // Remove redundant punctuation
    optimized = optimized.replace(/\.{2,}/g, '.');
    optimized = optimized.replace(/!{2,}/g, '!');
    optimized = optimized.replace(/\?{2,}/g, '?');

    // If aggressive mode, make it even more concise
    if (options.aggressive) {
      // Remove articles in non-critical positions
      optimized = optimized.replace(/\b(a|an|the)\s+/gi, ' ');
      
      // Simplify common phrases
      const simplifications = {
        'in order to': 'to',
        'due to the fact that': 'because',
        'at this point in time': 'now',
        'for the purpose of': 'for',
        'in the event that': 'if',
        'with regard to': 'about',
        'in relation to': 'about',
      };

      Object.entries(simplifications).forEach(([long, short]) => {
        const regex = new RegExp(long, 'gi');
        optimized = optimized.replace(regex, short);
      });
    }

    // Final cleanup
    optimized = optimized.replace(/\s+/g, ' ').trim();

    const optimizedTokens = this.estimateTokens(optimized);
    const saved = originalTokens - optimizedTokens;
    const percentSaved = originalTokens > 0 ? Math.round((saved / originalTokens) * 100) : 0;

    // Track stats
    this.compressionStats.totalOriginal += originalTokens;
    this.compressionStats.totalOptimized += optimizedTokens;
    this.compressionStats.callCount++;

    if (saved > 0) {
      logger.debug('Prompt optimized', {
        originalTokens,
        optimizedTokens,
        saved,
        percentSaved
      });
    }

    return optimized;
  }

  /**
   * Compress context by extracting only relevant information
   */
  compressContext(context, maxTokens = 500) {
    if (!context || !Array.isArray(context)) return [];

    let totalTokens = 0;
    const compressed = [];

    for (const item of context) {
      const itemText = typeof item === 'string' ? item : item.content || '';
      const itemTokens = this.estimateTokens(itemText);

      if (totalTokens + itemTokens <= maxTokens) {
        compressed.push(item);
        totalTokens += itemTokens;
      } else {
        // Truncate the last item to fit
        const remainingTokens = maxTokens - totalTokens;
        if (remainingTokens > 50) { // Only add if meaningful
          const truncatedText = itemText.substring(0, remainingTokens * 4);
          compressed.push(
            typeof item === 'string' 
              ? truncatedText 
              : { ...item, content: truncatedText }
          );
        }
        break;
      }
    }

    logger.debug('Context compressed', {
      originalItems: context.length,
      compressedItems: compressed.length,
      estimatedTokens: totalTokens,
      maxTokens
    });

    return compressed;
  }

  /**
   * Create concise system message
   */
  createConciseSystemMessage(purpose) {
    const templates = {
      search: 'Rewrite queries for better search results. Be concise.',
      summarize: 'Summarize text. Keep it brief.',
      answer: 'Answer based on context. Be direct and concise.',
      classify: 'Classify the query. One word answer.',
      extract: 'Extract key information. List format.',
      rerank: 'Rank results by relevance. Return scores only.',
      default: 'Be helpful and concise.'
    };

    return templates[purpose] || templates.default;
  }

  /**
   * Optimize query for different retrieval methods
   */
  optimizeForRetrieval(query, method = 'standard') {
    const optimized = this.optimizePrompt(query, { aggressive: true });

    switch (method) {
      case 'semantic':
        // Keep semantic meaning, remove filler
        return optimized;
      
      case 'keyword':
        // Extract keywords only
        return optimized
          .split(' ')
          .filter(word => word.length > 3) // Remove short words
          .join(' ');
      
      case 'hybrid':
        // Balance between semantic and keyword
        return optimized;
      
      default:
        return optimized;
    }
  }

  /**
   * Get compression statistics
   */
  getStats() {
    const totalSaved = this.compressionStats.totalOriginal - this.compressionStats.totalOptimized;
    const percentSaved = this.compressionStats.totalOriginal > 0
      ? Math.round((totalSaved / this.compressionStats.totalOriginal) * 100)
      : 0;

    return {
      totalOriginalTokens: this.compressionStats.totalOriginal,
      totalOptimizedTokens: this.compressionStats.totalOptimized,
      totalTokensSaved: totalSaved,
      percentSaved,
      optimizationCalls: this.compressionStats.callCount,
      averageSavingsPerCall: this.compressionStats.callCount > 0
        ? Math.round(totalSaved / this.compressionStats.callCount)
        : 0
    };
  }

  /**
   * Reset statistics
   */
  resetStats() {
    this.compressionStats = {
      totalOriginal: 0,
      totalOptimized: 0,
      callCount: 0
    };
  }
}

module.exports = new TokenOptimizer();

