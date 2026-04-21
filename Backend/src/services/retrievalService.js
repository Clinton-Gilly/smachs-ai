const vectorStore = require('./vectorStore');
const embeddingService = require('./embeddingService');
const queryOptimizer = require('./queryOptimizer');
const config = require('../config/config');

class RetrievalService {
  /**
   * Main retrieval method with optimization
   */
  async retrieve(query, options = {}) {
    try {
      const {
        searchType = 'hybrid',
        topK = config.retrieval.defaultTopK,
        filter = {},
        optimize = true,
        useAutocut = false,
        distanceThreshold = null
      } = options;

      // Optimize query if requested
      let optimizedQuery = query;
      let filters = filter;
      
      if (optimize) {
        const optimization = await queryOptimizer.optimizeQuery(query, {
          rewrite: true,
          extractFilters: true,
          route: false
        });
        optimizedQuery = optimization.optimizedQuery;
        filters = { ...filter, ...optimization.filters };
      }

      // Generate query embedding
      const queryEmbedding = await embeddingService.embed(optimizedQuery);

      // Perform search based on type
      let results;
      switch (searchType) {
        case 'vector':
          results = await vectorStore.vectorSearch(queryEmbedding, {
            topK,
            filter: filters,
            threshold: distanceThreshold
          });
          break;
        case 'keyword':
          results = await vectorStore.keywordSearch(optimizedQuery, {
            topK,
            filter: filters
          });
          break;
        case 'hybrid':
        default:
          results = await vectorStore.hybridSearch(optimizedQuery, queryEmbedding, {
            topK,
            filter: filters,
            alpha: options.alpha
          });
          break;
      }

      // Apply autocut if requested
      if (useAutocut && results.length > 0) {
        results = this.applyAutocut(results);
      }

      return {
        query: optimizedQuery,
        originalQuery: query,
        results,
        metadata: {
          searchType,
          resultCount: results.length,
          filters
        }
      };
    } catch (error) {
      console.error('Error in retrieval:', error);
      throw error;
    }
  }

  /**
   * Multi-query retrieval with expansion
   */
  async retrieveWithExpansion(query, options = {}) {
    try {
      const { topK = config.retrieval.defaultTopK } = options;

      // Expand query
      const expandedQueries = await queryOptimizer.expandQuery(query, 3);

      // Retrieve for each expanded query
      const allResults = await Promise.all(
        expandedQueries.map(q => this.retrieve(q, { ...options, optimize: false }))
      );

      // Combine and deduplicate results
      const combinedResults = this.deduplicateResults(
        allResults.flatMap(r => r.results)
      );

      // Sort by score and limit
      return {
        query,
        expandedQueries,
        results: combinedResults
          .sort((a, b) => b.score - a.score)
          .slice(0, topK),
        metadata: {
          expansionCount: expandedQueries.length,
          resultCount: combinedResults.length
        }
      };
    } catch (error) {
      console.error('Error in retrieval with expansion:', error);
      throw error;
    }
  }

  /**
   * Decomposed query retrieval
   */
  async retrieveWithDecomposition(query, options = {}) {
    try {
      const { topK = config.retrieval.defaultTopK } = options;

      // Decompose query
      const subQueries = await queryOptimizer.decomposeQuery(query);

      // Retrieve for each sub-query
      const subResults = await Promise.all(
        subQueries.map(async (subQuery) => {
          const result = await this.retrieve(subQuery, {
            ...options,
            topK: Math.ceil(topK / subQueries.length),
            optimize: false
          });
          return {
            subQuery,
            results: result.results
          };
        })
      );

      // Combine all results
      const allResults = subResults.flatMap(sr => sr.results);
      const combinedResults = this.deduplicateResults(allResults);

      return {
        query,
        subQueries,
        subResults,
        results: combinedResults
          .sort((a, b) => b.score - a.score)
          .slice(0, topK),
        metadata: {
          subQueryCount: subQueries.length,
          resultCount: combinedResults.length
        }
      };
    } catch (error) {
      console.error('Error in retrieval with decomposition:', error);
      throw error;
    }
  }

  /**
   * Autocut - dynamically determine cutoff based on score distribution
   */
  applyAutocut(results) {
    if (results.length <= 2) return results;

    const scores = results.map(r => r.score);
    const gaps = [];

    // Calculate gaps between consecutive scores
    for (let i = 0; i < scores.length - 1; i++) {
      gaps.push({
        index: i + 1,
        gap: scores[i] - scores[i + 1]
      });
    }

    // Find the largest gap
    gaps.sort((a, b) => b.gap - a.gap);
    const largestGap = gaps[0];

    // If the largest gap is significant, cut there
    const avgGap = gaps.reduce((sum, g) => sum + g.gap, 0) / gaps.length;
    if (largestGap.gap > avgGap * 2) {
      return results.slice(0, largestGap.index);
    }

    return results;
  }

  /**
   * Deduplicate results based on content similarity
   */
  deduplicateResults(results) {
    const unique = [];
    const seen = new Set();

    for (const result of results) {
      const id = result._id.toString();
      if (!seen.has(id)) {
        seen.add(id);
        unique.push(result);
      }
    }

    return unique;
  }

  /**
   * Filter results by distance threshold
   */
  filterByThreshold(results, threshold) {
    return results.filter(r => r.score >= threshold);
  }

  /**
   * Get context window for a chunk (sentence window retrieval)
   */
  async getContextWindow(chunkId, windowSize = 2) {
    try {
      const chunk = await vectorStore.chunksCollection.findOne({ _id: chunkId });
      if (!chunk) return null;

      const chunkIndex = chunk.metadata.chunkIndex;
      const documentId = chunk.documentId;

      // Get surrounding chunks
      const surroundingChunks = await vectorStore.chunksCollection
        .find({
          documentId,
          'metadata.chunkIndex': {
            $gte: chunkIndex - windowSize,
            $lte: chunkIndex + windowSize
          }
        })
        .sort({ 'metadata.chunkIndex': 1 })
        .toArray();

      return {
        mainChunk: chunk,
        context: surroundingChunks.map(c => c.content).join('\n\n'),
        chunks: surroundingChunks
      };
    } catch (error) {
      console.error('Error getting context window:', error);
      return null;
    }
  }

  /**
   * Enhance results with context windows
   */
  async enhanceWithContext(results, windowSize = 1) {
    try {
      const enhanced = await Promise.all(
        results.map(async (result) => {
          const contextWindow = await this.getContextWindow(result._id, windowSize);
          return {
            ...result,
            enhancedContent: contextWindow ? contextWindow.context : result.content
          };
        })
      );

      return enhanced;
    } catch (error) {
      console.error('Error enhancing with context:', error);
      return results;
    }
  }
}

module.exports = new RetrievalService();

