const express = require('express');
const router = express.Router();
const { getDB } = require('../config/database');

router.get('/', async (req, res) => {
  try {
    const db = getDB();
    
    // Check MongoDB connection
    await db.admin().ping();
    
    res.json({
      success: true,
      status: 'healthy',
      timestamp: new Date().toISOString(),
      services: {
        mongodb: 'connected',
        gemini: process.env.GEMINI_API_KEY ? 'configured' : 'not configured'
      },
      config: {
        chunkingStrategy: process.env.CHUNKING_STRATEGY,
        hybridSearch: process.env.ENABLE_HYBRID_SEARCH === 'true',
        reranking: process.env.ENABLE_RERANKING === 'true',
        queryRewriting: process.env.ENABLE_QUERY_REWRITING === 'true'
      }
    });
  } catch (error) {
    res.status(503).json({
      success: false,
      status: 'unhealthy',
      error: error.message
    });
  }
});

module.exports = router;

