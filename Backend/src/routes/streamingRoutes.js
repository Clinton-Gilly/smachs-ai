const express = require('express');
const router = express.Router();
const streamingService = require('../services/streamingService');
const queryService = require('../services/queryService');
const geminiService = require('../services/geminiService');
const logger = require('../utils/logger');

/**
 * Stream query response with SSE
 * POST /api/stream/query
 */
router.post('/query', async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    logger.info('Streaming query request', { query });

    // Apply default options from environment
    const fullOptions = {
      useQueryRewriting: process.env.ENABLE_QUERY_REWRITING === 'true',
      useHybridSearch: process.env.ENABLE_HYBRID_SEARCH === 'true',
      topK: parseInt(process.env.DEFAULT_TOP_K) || 10,
      ...options,
      // Scope retrieval to requesting user's documents
      metadataFilter: { ...(options.metadataFilter || {}), userId: req.userId }
    };

    // When scoped to a single document, query rewriting frequently hurts
    // precision (it broadens the question). Turn it off by default in that
    // case unless the caller explicitly opts in.
    if (fullOptions.documentId && options.useQueryRewriting === undefined) {
      fullOptions.useQueryRewriting = false;
    }

    // Define retrieval function with full optimization pipeline
    const retrievalFn = async (q) => {
      // Apply query rewriting if enabled
      let processedQuery = q;
      if (fullOptions.useQueryRewriting) {
        processedQuery = await geminiService.rewriteQuery(q);
        logger.info(`Query rewritten: "${q}" -> "${processedQuery}"`);
      }

      // Retrieve context with optimizations (respect scoping to a single doc)
      const result = await queryService.retrieveContext(processedQuery, {
        ...fullOptions,
        documentId: fullOptions.documentId || null
      });
      return result;
    };

    // Stream the RAG process
    await streamingService.streamRAGProcess(res, query, retrievalFn, fullOptions);

  } catch (error) {
    logger.error('Streaming query failed', { error: error.message });

    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

/**
 * Stream simple response (no RAG)
 * POST /api/stream/simple
 */
router.post('/simple', async (req, res) => {
  try {
    const { query, context = [], options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    logger.info('Streaming simple query', { query });

    await streamingService.streamResponse(res, query, context, options);

  } catch (error) {
    logger.error('Streaming simple query failed', { error: error.message });
    
    if (!res.headersSent) {
      res.status(500).json({ error: error.message });
    }
  }
});

module.exports = router;

