const express = require('express');
const router = express.Router();
const advancedRetrieverService = require('../services/advancedRetrieverService');
const geminiService = require('../services/geminiService');
const analyticsService = require('../services/analyticsService');
const logger = require('../utils/logger');
const { v4: uuidv4 } = require('uuid');

/**
 * Parent Document Retrieval
 * POST /api/advanced/parent-document
 */
router.post('/parent-document', async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();
    logger.info('Parent document retrieval request', { query });

    const results = await advancedRetrieverService.parentDocumentRetrieval(query, options);

    // Generate response
    const response = await geminiService.generateResponse(query, results);

    const totalTime = Date.now() - startTime;

    // Log analytics
    if (process.env.ENABLE_ANALYTICS === 'true') {
      await analyticsService.logQuery({
        query,
        retrievalMethod: 'parent-document',
        totalTime,
        contextsRetrieved: results.length,
        contextsFinal: results.length
      });
    }

    res.json({
      success: true,
      query,
      response,
      contexts: results.map(r => ({
        content: r.content.substring(0, 200) + '...',
        score: r.score,
        metadata: r.metadata
      })),
      metadata: {
        retrievalMethod: 'parent-document',
        totalTime,
        resultsCount: results.length
      }
    });
  } catch (error) {
    logger.error('Parent document retrieval failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Multi-Query Retrieval
 * POST /api/advanced/multi-query
 */
router.post('/multi-query', async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();
    logger.info('Multi-query retrieval request', { query });

    const results = await advancedRetrieverService.multiQueryRetrieval(query, options);

    // Generate response
    const response = await geminiService.generateResponse(query, results);

    const totalTime = Date.now() - startTime;

    // Log analytics
    if (process.env.ENABLE_ANALYTICS === 'true') {
      await analyticsService.logQuery({
        query,
        retrievalMethod: 'multi-query',
        totalTime,
        contextsRetrieved: results.length,
        contextsFinal: results.length
      });
    }

    res.json({
      success: true,
      query,
      response,
      contexts: results.map(r => ({
        content: r.content.substring(0, 200) + '...',
        score: r.fusionScore || r.score,
        metadata: r.metadata
      })),
      metadata: {
        retrievalMethod: 'multi-query',
        totalTime,
        resultsCount: results.length
      }
    });
  } catch (error) {
    logger.error('Multi-query retrieval failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * HyDE Retrieval
 * POST /api/advanced/hyde
 */
router.post('/hyde', async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();
    logger.info('HyDE retrieval request', { query });

    const results = await advancedRetrieverService.hydeRetrieval(query, options);

    // Generate response
    const response = await geminiService.generateResponse(query, results);

    const totalTime = Date.now() - startTime;

    // Log analytics
    if (process.env.ENABLE_ANALYTICS === 'true') {
      await analyticsService.logQuery({
        query,
        retrievalMethod: 'hyde',
        totalTime,
        contextsRetrieved: results.length,
        contextsFinal: results.length
      });
    }

    res.json({
      success: true,
      query,
      response,
      contexts: results.map(r => ({
        content: r.content.substring(0, 200) + '...',
        score: r.score,
        metadata: r.metadata
      })),
      metadata: {
        retrievalMethod: 'hyde',
        totalTime,
        resultsCount: results.length
      }
    });
  } catch (error) {
    logger.error('HyDE retrieval failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Ensemble Retrieval
 * POST /api/advanced/ensemble
 */
router.post('/ensemble', async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();
    logger.info('Ensemble retrieval request', { query });

    const results = await advancedRetrieverService.ensembleRetrieval(query, options);

    // Generate response
    const response = await geminiService.generateResponse(query, results);

    const totalTime = Date.now() - startTime;

    // Log analytics
    if (process.env.ENABLE_ANALYTICS === 'true') {
      await analyticsService.logQuery({
        query,
        retrievalMethod: 'ensemble',
        totalTime,
        contextsRetrieved: results.length,
        contextsFinal: results.length
      });
    }

    res.json({
      success: true,
      query,
      response,
      contexts: results.map(r => ({
        content: r.content.substring(0, 200) + '...',
        score: r.fusionScore || r.score,
        methods: r.methods,
        metadata: r.metadata
      })),
      metadata: {
        retrievalMethod: 'ensemble',
        totalTime,
        resultsCount: results.length
      }
    });
  } catch (error) {
    logger.error('Ensemble retrieval failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

/**
 * Self-Query Retrieval
 * POST /api/advanced/self-query
 */
router.post('/self-query', async (req, res) => {
  try {
    const { query, options = {} } = req.body;

    if (!query) {
      return res.status(400).json({ error: 'Query is required' });
    }

    const startTime = Date.now();
    logger.info('Self-query retrieval request', { query });

    const results = await advancedRetrieverService.selfQueryRetrieval(query, options);

    // Generate response
    const response = await geminiService.generateResponse(query, results);

    const totalTime = Date.now() - startTime;

    // Log analytics
    if (process.env.ENABLE_ANALYTICS === 'true') {
      await analyticsService.logQuery({
        query,
        retrievalMethod: 'self-query',
        totalTime,
        contextsRetrieved: results.length,
        contextsFinal: results.length
      });
    }

    res.json({
      success: true,
      query,
      response,
      contexts: results.map(r => ({
        content: r.content.substring(0, 200) + '...',
        score: r.score,
        metadata: r.metadata
      })),
      metadata: {
        retrievalMethod: 'self-query',
        totalTime,
        resultsCount: results.length
      }
    });
  } catch (error) {
    logger.error('Self-query retrieval failed', { error: error.message });
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;

