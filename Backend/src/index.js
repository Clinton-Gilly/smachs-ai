require('dotenv').config();

// Fix: Windows Node.js OpenSSL TLS negotiation failure with MongoDB Atlas (SSL alert 80).
// The Windows OpenSSL layer can fail the TLS handshake due to cipher/version mismatches.
// This must be set BEFORE any network connections are made.
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('./utils/logger');
const { connectDB } = require('./config/database');
const cacheService = require('./services/cacheService');
const geminiRateLimiter = require('./middleware/geminiRateLimiter');
const tokenOptimizer = require('./utils/tokenOptimizer');

// Import routes
const documentRoutes = require('./routes/documentRoutes');
const queryRoutes = require('./routes/queryRoutes');
const healthRoutes = require('./routes/healthRoutes');
const streamingRoutes = require('./routes/streamingRoutes');
const analyticsRoutes = require('./routes/analyticsRoutes');
const advancedQueryRoutes = require('./routes/advancedQueryRoutes');
const usageRoutes = require('./routes/usageRoutes');
const chatRoutes = require('./routes/chatRoutes');
const collectionsRoutes = require('./routes/collectionsRoutes');

const app = express();
const PORT = process.env.PORT || 5000;

// Security middleware
app.use(helmet());

// Compression middleware — skip SSE so chunks are not buffered into one payload.
app.use(
  compression({
    filter: (req, res) => {
      const type = res.getHeader('Content-Type');
      if (typeof type === 'string' && type.includes('text/event-stream')) {
        return false;
      }
      return compression.filter(req, res);
    }
  })
);

// CORS middleware
app.use(cors());

// Body parsing middleware
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Rate limiting
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // Limit each IP to 100 requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50, // Stricter limit for query endpoints
  message: 'Too many query requests, please try again later.',
});

app.use('/api/', limiter);
app.use('/api/query', queryLimiter);
app.use('/api/advanced', queryLimiter);
app.use('/api/stream', queryLimiter);

// Gemini API rate limiting (FREE TIER: 15 RPM, 1M TPM, 200 RPD)
app.use(geminiRateLimiter.middleware());

// Request logging middleware
app.use((req, res, next) => {
  const startTime = Date.now();

  res.on('finish', () => {
    const duration = Date.now() - startTime;
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      duration: `${duration}ms`
    });
  });

  next();
});

// Trust the reverse proxy (Render/Heroku/etc) so req.ip is correct for rate-limiting.
// Use an env var so you can control this in dev vs production.
if (process.env.TRUST_PROXY === 'true' || process.env.NODE_ENV === 'production') {
  // Option: `true` trusts all proxies in the chain; `1` trusts only the first proxy.
  // For Render, `true` or `1` is fine. If you want to be conservative use '1'.
  app.set('trust proxy', 1);
  console.log('Express trust proxy enabled');
}

// Routes
app.use('/api/health', healthRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/stream', streamingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/advanced', advancedQueryRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/collections', collectionsRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  res.status(err.status || 500).json({
    success: false,
    error: {
      message: err.message || 'Internal server error',
      ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
    }
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: {
      message: 'Route not found'
    }
  });
});

// Start server
const startServer = async () => {
  try {
    // Connect to MongoDB
    await connectDB();
    logger.info('MongoDB connected successfully');

    // Start listening
    app.listen(PORT, () => {
      logger.info(`🚀 RAG Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV}`);
      logger.info(`Chunking Strategy: ${process.env.CHUNKING_STRATEGY}`);
      logger.info(`Hybrid Search: ${process.env.ENABLE_HYBRID_SEARCH === 'true' ? 'Enabled' : 'Disabled'}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Handle graceful shutdown
process.on('SIGTERM', async () => {
  logger.info('SIGTERM received, shutting down gracefully');
  await cacheService.close();
  process.exit(0);
});

process.on('SIGINT', async () => {
  logger.info('SIGINT received, shutting down gracefully');
  await cacheService.close();
  process.exit(0);
});

startServer();

