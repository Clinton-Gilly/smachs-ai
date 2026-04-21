const logger = require('../utils/logger');
const geminiService = require('./geminiService');
const vectorService = require('./vectorService');
const cohereService = require('./cohereService');
const cacheService = require('./cacheService');
const analyticsService = require('./analyticsService');

class QueryService {
  /**
   * Main query processing pipeline with all optimizations
   */
  async processQuery(query, options = {}, req = null) {
    const startTime = Date.now();
    const retrievalStartTime = Date.now();

    try {
      logger.info(`Processing query: "${query}"`);

      const {
        useQueryRewriting = process.env.ENABLE_QUERY_REWRITING === 'true',
        useQueryExpansion = process.env.ENABLE_QUERY_EXPANSION === 'true',
        useQueryDecomposition = process.env.ENABLE_QUERY_DECOMPOSITION === 'true',
        useHybridSearch = process.env.ENABLE_HYBRID_SEARCH === 'true',
        useReranking = process.env.ENABLE_RERANKING === 'true',
        useContextCompression = process.env.ENABLE_CONTEXT_COMPRESSION === 'true',
        useCoT = false,
        metadataFilter = null,
        topK = parseInt(process.env.DEFAULT_TOP_K) || 20,
        rerankTopK = parseInt(process.env.RERANK_TOP_K) || 5
      } = options;

      // Check cache first
      if (process.env.ENABLE_REDIS_CACHE === 'true') {
        const cached = await cacheService.getCachedQueryResult(query, options);
        if (cached) {
          logger.info('Query result cache hit');
          return cached;
        }
      }

      let processedQuery = query;
      let retrievedContexts = [];

      // Step 1: Pre-Retrieval Optimization
      if (useQueryRewriting) {
        processedQuery = await geminiService.rewriteQuery(query);
      }

      // Step 2: Query Expansion or Decomposition (PARALLEL EXECUTION)
      if (useQueryDecomposition) {
        // Decompose complex query into sub-queries
        const subQueries = await geminiService.decomposeQuery(processedQuery);

        // Retrieve for ALL sub-queries in PARALLEL (much faster!)
        const subResultsPromises = subQueries.map(subQuery =>
          this.retrieveContext(subQuery, {
            useHybridSearch,
            metadataFilter,
            topK: Math.ceil(topK / subQueries.length)
          })
        );

        const subResultsArray = await Promise.all(subResultsPromises);
        retrievedContexts = subResultsArray.flat();

      } else if (useQueryExpansion) {
        // Expand query into multiple variations
        const expandedQueries = await geminiService.expandQuery(processedQuery);

        // Retrieve for ALL expanded queries in PARALLEL (much faster!)
        const resultsPromises = expandedQueries.map(expandedQuery =>
          this.retrieveContext(expandedQuery, {
            useHybridSearch,
            metadataFilter,
            topK: Math.ceil(topK / expandedQueries.length)
          })
        );

        const resultsArray = await Promise.all(resultsPromises);
        retrievedContexts = resultsArray.flat();

      } else {
        // Standard retrieval
        retrievedContexts = await this.retrieveContext(processedQuery, {
          useHybridSearch,
          metadataFilter,
          topK
        });
      }

      // Remove duplicates
      retrievedContexts = this.deduplicateResults(retrievedContexts);

      // Step 3: Post-Retrieval Optimization - Re-ranking
      if (useReranking && retrievedContexts.length > 0) {
        retrievedContexts = await cohereService.rerank(
          processedQuery,
          retrievedContexts,
          rerankTopK
        );
      }

      // Step 4: Context Compression
      let finalContext = retrievedContexts;
      if (useContextCompression && retrievedContexts.length > 0) {
        const compressedText = await geminiService.compressContext(
          retrievedContexts,
          processedQuery
        );
        finalContext = [{ content: compressedText, compressed: true }];
      }

      const retrievalTime = Date.now() - retrievalStartTime;
      const generationStartTime = Date.now();

      // Step 5: Generate Response
      let response;
      if (useCoT) {
        response = await geminiService.generateWithCoT(query, finalContext);
      } else {
        response = await geminiService.generateResponse(query, finalContext);
      }

      const generationTime = Date.now() - generationStartTime;
      const totalTime = Date.now() - startTime;

      const result = {
        success: true,
        query: query,
        processedQuery: processedQuery,
        response: response,
        context: finalContext.slice(0, 5), // Return top 5 for reference
        metadata: {
          totalContextsRetrieved: retrievedContexts.length,
          finalContextsUsed: finalContext.length,
          performance: {
            totalTime,
            retrievalTime,
            generationTime
          },
          optimizations: {
            queryRewriting: useQueryRewriting,
            queryExpansion: useQueryExpansion,
            queryDecomposition: useQueryDecomposition,
            hybridSearch: useHybridSearch,
            reranking: useReranking,
            contextCompression: useContextCompression,
            chainOfThought: useCoT
          }
        }
      };

      // Cache the result
      if (process.env.ENABLE_REDIS_CACHE === 'true') {
        await cacheService.cacheQueryResult(query, options, result);
      }

      // Log analytics
      if (process.env.ENABLE_ANALYTICS === 'true') {
        await analyticsService.logQuery({
          query,
          processedQuery,
          retrievalMethod: useHybridSearch ? 'hybrid' : 'vector',
          optimizations: result.metadata.optimizations,
          totalTime,
          retrievalTime,
          generationTime,
          contextsRetrieved: retrievedContexts.length,
          contextsFinal: finalContext.length,
          userAgent: req?.headers?.['user-agent'],
          ip: req?.ip,
          sessionId: req?.headers?.['x-session-id']
        });
      }

      return result;
    } catch (error) {
      logger.error('Error processing query:', error);
      throw error;
    }
  }

  /**
   * Retrieve context using vector or hybrid search.
   * Pass `documentId` to scope retrieval to a single document.
   */
  async retrieveContext(query, options = {}) {
    const {
      useHybridSearch = false,
      metadataFilter = null,
      documentId = null,
      topK = 20
    } = options;

    // Generate query embedding
    const queryEmbedding = await geminiService.generateEmbedding(query);

    // If scoped to a single document, bypass the other filter plumbing and
    // push the `{ documentId }` filter straight into vector/hybrid search.
    if (documentId) {
      const filter = { documentId };
      if (useHybridSearch) {
        return vectorService.hybridSearch(query, queryEmbedding, {
          topK,
          filter
        });
      }
      return vectorService.vectorSearch(queryEmbedding, { topK, filter });
    }

    let results;

    if (metadataFilter) {
      // Search with metadata filtering
      results = await vectorService.searchWithMetadata(
        queryEmbedding,
        metadataFilter,
        { topK }
      );
    } else if (useHybridSearch) {
      // Hybrid search (vector + keyword)
      results = await vectorService.hybridSearch(query, queryEmbedding, { topK });
    } else {
      // Pure vector search
      results = await vectorService.vectorSearch(queryEmbedding, { topK });
    }

    return results;
  }

  /**
   * Remove duplicate results based on content similarity
   */
  deduplicateResults(results) {
    const seen = new Set();
    const deduplicated = [];

    for (const result of results) {
      // Use first 100 characters as a simple deduplication key
      const key = result.content.substring(0, 100);
      
      if (!seen.has(key)) {
        seen.add(key);
        deduplicated.push(result);
      }
    }

    logger.info(`Deduplicated ${results.length} results to ${deduplicated.length}`);
    return deduplicated;
  }

  /**
   * Simple query without optimizations (for comparison)
   */
  async simpleQuery(query, topK = 5) {
    try {
      const queryEmbedding = await geminiService.generateEmbedding(query);
      const results = await vectorService.vectorSearch(queryEmbedding, { topK });
      const response = await geminiService.generateResponse(query, results);

      return {
        success: true,
        query,
        response,
        context: results,
        metadata: {
          totalContextsRetrieved: results.length,
          optimizations: 'none'
        }
      };
    } catch (error) {
      logger.error('Error in simple query:', error);
      throw error;
    }
  }

  /**
   * Query routing - route to specialized pipelines based on query type
   */
  async routeQuery(query) {
    try {
      // Use LLM to classify query type
      const classification = await this.classifyQuery(query);

      logger.info(`Query classified as: ${classification.type}`);

      switch (classification.type) {
        case 'factual':
          // Use simple retrieval for factual questions
          return await this.processQuery(query, {
            useQueryRewriting: false,
            useQueryExpansion: false,
            useReranking: true
          });

        case 'complex':
          // Use query decomposition for complex questions
          return await this.processQuery(query, {
            useQueryDecomposition: true,
            useReranking: true,
            useCoT: true
          });

        case 'exploratory':
          // Use query expansion for exploratory questions
          return await this.processQuery(query, {
            useQueryExpansion: true,
            useHybridSearch: true,
            useReranking: true
          });

        default:
          // Default pipeline
          return await this.processQuery(query);
      }
    } catch (error) {
      logger.error('Error in query routing:', error);
      // Fall back to default pipeline
      return await this.processQuery(query);
    }
  }

  /**
   * Classify query type using LLM
   */
  async classifyQuery(query) {
    try {
      const prompt = `Classify the following query into one of these categories:
- factual: Simple factual questions with direct answers
- complex: Multi-part questions requiring reasoning
- exploratory: Open-ended questions requiring broad information

Return only the category name.

Query: ${query}

Category:`;

      const result = await geminiService.model.generateContent(prompt);
      const type = result.response.text().trim().toLowerCase();

      return { type: ['factual', 'complex', 'exploratory'].includes(type) ? type : 'factual' };
    } catch (error) {
      logger.error('Error classifying query:', error);
      return { type: 'factual' };
    }
  }
}

module.exports = new QueryService();

