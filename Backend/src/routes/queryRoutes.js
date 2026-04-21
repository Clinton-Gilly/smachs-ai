const express = require('express');
const router = express.Router();
const queryService = require('../services/queryService');
const streamingService = require('../services/streamingService');
const geminiService = require('../services/geminiService');
const collectionsService = require('../services/collectionsService');
const logger = require('../utils/logger');

/**
 * Expand `options.collectionId` into a metadataFilter that scopes
 * retrieval to the collection's documentIds. Mutates & returns the
 * options object for convenience.
 */
async function applyCollectionScope(options = {}) {
  if (!options || !options.collectionId) return options;
  const ids = await collectionsService.resolveDocumentIds(
    String(options.collectionId)
  );
  if (!ids) {
    throw new Error(`Collection ${options.collectionId} not found`);
  }
  const merged = { ...(options.metadataFilter || {}) };
  merged.documentIds = ids; // buildMetadataFilter handles empty as no-match
  options.metadataFilter = merged;
  delete options.collectionId;
  return options;
}

/**
 * POST /api/query
 * Process a query with full RAG pipeline and optimizations
 */
router.post('/', async (req, res) => {
  try {
    const { query, options } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const scoped = await applyCollectionScope(options || {});
    const result = await queryService.processQuery(query, scoped, req);

    res.json(result);
  } catch (error) {
    logger.error('Error processing query:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/query/simple
 * Simple query without optimizations (for comparison)
 */
router.post('/simple', async (req, res) => {
  try {
    const { query, topK } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const result = await queryService.simpleQuery(query, topK);

    res.json(result);
  } catch (error) {
    logger.error('Error in simple query:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/query/route
 * Intelligent query routing based on query type
 */
router.post('/route', async (req, res) => {
  try {
    const { query } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const result = await queryService.routeQuery(query);

    res.json(result);
  } catch (error) {
    logger.error('Error in query routing:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/query/advanced
 * Advanced query with custom optimization settings
 */
router.post('/advanced', async (req, res) => {
  try {
    const {
      query,
      useQueryRewriting,
      useQueryExpansion,
      useQueryDecomposition,
      useHybridSearch,
      useReranking,
      useContextCompression,
      useCoT,
      metadataFilter,
      topK,
      rerankTopK
    } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    const scoped = await applyCollectionScope({
      useQueryRewriting,
      useQueryExpansion,
      useQueryDecomposition,
      useHybridSearch,
      useReranking,
      useContextCompression,
      useCoT,
      metadataFilter,
      topK,
      rerankTopK,
      collectionId: req.body.collectionId
    });

    const result = await queryService.processQuery(query, scoped);

    res.json(result);
  } catch (error) {
    logger.error('Error in advanced query:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * POST /api/query/stream
 * Stream query response with Server-Sent Events (SSE)
 * Returns response chunks as they're generated for better UX
 */
router.post('/stream', async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({
        success: false,
        error: 'Query is required'
      });
    }

    logger.info('Streaming query request', { query });

    // Apply default options from environment
    const fullOptions = {
      useQueryRewriting: process.env.ENABLE_QUERY_REWRITING === 'true',
      useHybridSearch: process.env.ENABLE_HYBRID_SEARCH === 'true',
      topK: parseInt(process.env.DEFAULT_TOP_K) || 10,
      ...options
    };
    await applyCollectionScope(fullOptions);

    // Define retrieval function with full optimization pipeline
    const retrievalFn = async (q) => {
      // Apply query rewriting if enabled
      let processedQuery = q;
      if (fullOptions.useQueryRewriting) {
        processedQuery = await geminiService.rewriteQuery(q);
        logger.info(`Query rewritten: "${q}" -> "${processedQuery}"`);
      }

      // Retrieve context with optimizations
      const result = await queryService.retrieveContext(processedQuery, fullOptions);
      return result;
    };

    // Stream the RAG process
    await streamingService.streamRAGProcess(res, query, retrievalFn, fullOptions);

  } catch (error) {
    logger.error('Streaming query failed', { error: error.message });

    if (!res.headersSent) {
      res.status(500).json({
        success: false,
        error: error.message
      });
    }
  }
});

module.exports = router;

