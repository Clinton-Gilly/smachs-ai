const { MongoClient } = require('mongodb');
const logger = require('../utils/logger');

let client;
let db;

const connectDB = async () => {
  try {
    if (db) {
      return db;
    }

    const uri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME;

    if (!uri) {
      throw new Error('MONGODB_URI is not defined in environment variables');
    }

    const isDev = process.env.NODE_ENV !== 'production';
    client = new MongoClient(uri, {
      maxPoolSize: 10,
      minPoolSize: 2,
      serverSelectionTimeoutMS: 15000,
      connectTimeoutMS: 15000,
      socketTimeoutMS: 45000,
      heartbeatFrequencyMS: 10000,
      retryWrites: true,
      retryReads: true,
      // Force IPv4 — Windows IPv6 stack can trigger TLS internal errors with Atlas
      family: 4,
      // Allow TLS cert issues in dev (Windows OpenSSL / Atlas TLS version mismatch)
      ...(isDev && { tlsAllowInvalidCertificates: true }),
    });

    await client.connect();
    db = client.db(dbName);

    // Log connection drops — the driver's pool handles reconnection internally,
    // so we keep `db` around (clearing it breaks synchronous getDB() callers).
    client.on('close', () => {
      logger.warn('MongoDB connection closed — driver will auto-reconnect');
    });
    client.on('error', (err) => {
      logger.error('MongoDB client error:', err.message);
    });

    // Create vector search index if it doesn't exist
    await createVectorSearchIndex();

    logger.info(`Connected to MongoDB database: ${dbName}`);
    return db;
  } catch (error) {
    // Provide a clear diagnosis for the most common Atlas connection failures
    const msg = error.message || '';
    if (msg.includes('SSL alert number 80') || msg.includes('tlsv1 alert internal error')) {
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
      logger.error('ATLAS CONNECTION BLOCKED — SSL alert 80 = IP not whitelisted');
      logger.error('Fix: Atlas console → Security → Network Access → Add IP Address');
      logger.error('     (or use 0.0.0.0/0 to allow all IPs during development)');
      logger.error('Also check: is the cluster paused? Resume it from the Atlas overview.');
      logger.error('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    } else if (msg.includes('ENOTFOUND') || msg.includes('ECONNREFUSED')) {
      logger.error('ATLAS CONNECTION FAILED — cannot reach the host. Check internet/DNS.');
    } else if (msg.includes('Authentication failed') || msg.includes('auth')) {
      logger.error('ATLAS AUTH FAILED — wrong username or password in MONGODB_URI.');
    } else {
      logger.error('MongoDB connection error:', msg);
    }
    throw error;
  }
};

const createVectorSearchIndex = async () => {
  try {
    const collection = db.collection(process.env.MONGODB_COLLECTION || 'documents');
    const isAtlas = process.env.MONGODB_URI?.includes('mongodb+srv://') ||
                    process.env.USE_ATLAS_VECTOR_SEARCH === 'true';

    // Check if index already exists
    const indexes = await collection.listIndexes().toArray();

    // For LOCAL MongoDB: Create simple index on embedding field
    // For ATLAS: Vector search index must be created via Atlas UI
    if (!isAtlas) {
      logger.info('Local MongoDB detected - creating standard embedding index...');
      const embeddingIndexExists = indexes.some(idx => idx.name === 'embedding_index');

      if (!embeddingIndexExists) {
        // Create a simple index on embedding field for local MongoDB
        // Note: This won't provide true vector search, but allows the app to run
        await collection.createIndex(
          { embedding: 1 },
          { name: "embedding_index" }
        );
        logger.info('✅ Embedding index created (local MongoDB)');
        logger.warn('⚠️  LOCAL MONGODB: Vector search will use fallback method (slower)');
        logger.warn('⚠️  For production, use MongoDB Atlas with Vector Search enabled');
      }
    } else {
      logger.info('MongoDB Atlas detected');
      logger.info('⚠️  ATLAS: Create vector search index manually in Atlas UI');
      logger.info('   Index name: vector_index');
      logger.info('   Field path: embedding');
      logger.info('   Dimensions: ' + (parseInt(process.env.EMBEDDING_DIMENSIONS) || 768));
      logger.info('   Similarity: cosine');
    }

    // Create text index for keyword search (hybrid search)
    const textIndexExists = indexes.some(idx => idx.name === 'text_index');
    if (!textIndexExists) {
      await collection.createIndex(
        { content: "text", "metadata.title": "text" },
        {
          name: "text_index",
          weights: {
            content: 10,
            "metadata.title": 5
          }
        }
      );
      logger.info('✅ Text search index created successfully');
    } else {
      logger.info('Text search index already exists');
    }

    // Create metadata indexes
    const metadataIndexes = [
      { field: { documentId: 1 }, name: 'documentId_index' },
      { field: { "metadata.timestamp": -1 }, name: 'timestamp_index' },
      { field: { "metadata.category": 1 }, name: 'category_index' },
      { field: { chunkId: 1 }, name: 'chunkId_index' }
    ];

    for (const idx of metadataIndexes) {
      try {
        const exists = indexes.some(i => i.name === idx.name);
        if (!exists) {
          await collection.createIndex(idx.field, { name: idx.name });
          logger.info(`✅ ${idx.name} created`);
        }
      } catch (error) {
        // Index might already exist, continue
      }
    }

  } catch (error) {
    logger.error('Error creating indexes:', error);
    // Don't throw - allow app to continue even if index creation fails
  }
};

const getDB = () => {
  if (!db) {
    throw new Error('Database not initialized. Call connectDB() during startup.');
  }
  return db;
};

const closeDB = async () => {
  if (client) {
    await client.close();
    logger.info('MongoDB connection closed');
  }
};

module.exports = {
  connectDB,
  getDB,
  closeDB
};

