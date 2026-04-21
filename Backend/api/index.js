require('dotenv').config();

if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const rateLimit = require('express-rate-limit');
const logger = require('../src/utils/logger');
const { connectDB } = require('../src/config/database');
const cacheService = require('../src/services/cacheService');
const geminiRateLimiter = require('../src/middleware/geminiRateLimiter');

const documentRoutes = require('../src/routes/documentRoutes');
const queryRoutes = require('../src/routes/queryRoutes');
const healthRoutes = require('../src/routes/healthRoutes');
const streamingRoutes = require('../src/routes/streamingRoutes');
const analyticsRoutes = require('../src/routes/analyticsRoutes');
const advancedQueryRoutes = require('../src/routes/advancedQueryRoutes');
const usageRoutes = require('../src/routes/usageRoutes');
const chatRoutes = require('../src/routes/chatRoutes');
const collectionsRoutes = require('../src/routes/collectionsRoutes');

const app = express();

app.use(helmet());
app.use(
  compression({
    filter: (req, res) => {
      const type = res.getHeader('Content-Type');
      if (typeof type === 'string' && type.includes('text/event-stream')) return false;
      return compression.filter(req, res);
    }
  })
);
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

const limiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});
const queryLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: 'Too many query requests, please try again later.',
});

app.use('/api/', limiter);
app.use('/api/query', queryLimiter);
app.use('/api/advanced', queryLimiter);
app.use('/api/stream', queryLimiter);

app.use(geminiRateLimiter.middleware());

app.use((req, res, next) => {
  const startTime = Date.now();
  res.on('finish', () => {
    logger.info(`${req.method} ${req.path}`, {
      ip: req.ip,
      userAgent: req.get('user-agent'),
      statusCode: res.statusCode,
      duration: `${Date.now() - startTime}ms`
    });
  });
  next();
});

app.set('trust proxy', 1);

app.use('/api/health', healthRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/query', queryRoutes);
app.use('/api/stream', streamingRoutes);
app.use('/api/analytics', analyticsRoutes);
app.use('/api/advanced', advancedQueryRoutes);
app.use('/api/usage', usageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/collections', collectionsRoutes);

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

app.use((req, res) => {
  res.status(404).json({ success: false, error: { message: 'Route not found' } });
});

// Connect to DB once (cached across warm invocations)
let isConnected = false;
const connectOnce = async () => {
  if (!isConnected) {
    await connectDB();
    isConnected = true;
  }
};

module.exports = async (req, res) => {
  await connectOnce();
  return app(req, res);
};
