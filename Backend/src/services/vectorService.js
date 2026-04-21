const { getDB } = require('../config/database');
const logger = require('../utils/logger');

class VectorService {
  constructor() {
    this.collectionName = process.env.MONGODB_COLLECTION || 'documents';
  }

  getCollection() {
    const db = getDB();
    return db.collection(this.collectionName);
  }

  /**
   * Insert document chunks with embeddings into MongoDB
   */
  async insertChunks(chunks) {
    try {
      const collection = this.getCollection();
      const result = await collection.insertMany(chunks);
      logger.info(`Inserted ${result.insertedCount} chunks into MongoDB`);
      return result;
    } catch (error) {
      logger.error('Error inserting chunks:', error);
      throw error;
    }
  }

  /**
   * Vector similarity search using MongoDB Atlas Vector Search or fallback
   */
  async vectorSearch(queryEmbedding, options = {}) {
    try {
      const collection = this.getCollection();
      const {
        topK = parseInt(process.env.DEFAULT_TOP_K) || 20,
        filter = {},
        distanceThreshold = parseFloat(process.env.DISTANCE_THRESHOLD) || 0.7
      } = options;

      const isAtlas = process.env.MONGODB_URI?.includes('mongodb+srv://') ||
                      process.env.USE_ATLAS_VECTOR_SEARCH === 'true';

      if (isAtlas) {
        // ATLAS: Use $vectorSearch aggregation pipeline
        const pipeline = [
          {
            $vectorSearch: {
              index: "vector_index",
              path: "embedding",
              queryVector: queryEmbedding,
              numCandidates: topK * 10,
              limit: topK,
              filter: filter
            }
          },
          {
            $addFields: {
              score: { $meta: "vectorSearchScore" }
            }
          },
          {
            $match: {
              score: { $gte: distanceThreshold }
            }
          },
          {
            $project: {
              _id: 1,
              documentId: 1,
              chunkId: 1,
              content: 1,
              metadata: 1,
              score: 1
            }
          }
        ];

        const results = await collection.aggregate(pipeline).toArray();
        logger.info(`Vector search (Atlas) returned ${results.length} results`);
        return results;
      } else {
        // LOCAL MONGODB: Fallback to manual cosine similarity calculation
        logger.warn('Using fallback vector search (local MongoDB) - slower than Atlas');

        // Fetch all documents (or use filter to limit)
        const allDocs = await collection.find(filter).limit(topK * 50).toArray();

        // Calculate cosine similarity for each document
        const resultsWithScores = allDocs
          .map(doc => ({
            ...doc,
            score: this.cosineSimilarity(queryEmbedding, doc.embedding)
          }))
          .filter(doc => doc.score >= distanceThreshold)
          .sort((a, b) => b.score - a.score)
          .slice(0, topK);

        logger.info(`Vector search (fallback) returned ${resultsWithScores.length} results`);
        return resultsWithScores;
      }
    } catch (error) {
      logger.error('Error in vector search:', error);
      throw error;
    }
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vecA, vecB) {
    if (!vecA || !vecB || vecA.length !== vecB.length) {
      return 0;
    }

    let dotProduct = 0;
    let normA = 0;
    let normB = 0;

    for (let i = 0; i < vecA.length; i++) {
      dotProduct += vecA[i] * vecB[i];
      normA += vecA[i] * vecA[i];
      normB += vecB[i] * vecB[i];
    }

    const denominator = Math.sqrt(normA) * Math.sqrt(normB);
    return denominator === 0 ? 0 : dotProduct / denominator;
  }

  /**
   * Keyword-based text search
   */
  async keywordSearch(query, options = {}) {
    try {
      const collection = this.getCollection();
      const { topK = 20, filter = {} } = options;

      const results = await collection
        .find({
          $text: { $search: query },
          ...filter
        })
        .project({
          _id: 1,
          documentId: 1,
          chunkId: 1,
          content: 1,
          metadata: 1,
          score: { $meta: "textScore" }
        })
        .sort({ score: { $meta: "textScore" } })
        .limit(topK)
        .toArray();

      logger.info(`Keyword search returned ${results.length} results`);
      return results;
    } catch (error) {
      logger.error('Error in keyword search:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector and keyword search
   */
  async hybridSearch(query, queryEmbedding, options = {}) {
    try {
      const {
        topK = parseInt(process.env.DEFAULT_TOP_K) || 20,
        alpha = parseFloat(process.env.HYBRID_SEARCH_ALPHA) || 0.5,
        filter = {}
      } = options;

      // Perform both searches in parallel
      const [vectorResults, keywordResults] = await Promise.all([
        this.vectorSearch(queryEmbedding, { topK, filter }),
        this.keywordSearch(query, { topK, filter })
      ]);

      // Merge and rank results using Reciprocal Rank Fusion (RRF)
      const mergedResults = this.reciprocalRankFusion(
        vectorResults,
        keywordResults,
        alpha
      );

      logger.info(`Hybrid search returned ${mergedResults.length} results`);
      return mergedResults.slice(0, topK);
    } catch (error) {
      logger.error('Error in hybrid search:', error);
      throw error;
    }
  }

  /**
   * Reciprocal Rank Fusion algorithm for combining search results
   */
  reciprocalRankFusion(vectorResults, keywordResults, alpha, k = 60) {
    const scoreMap = new Map();

    // Process vector search results
    vectorResults.forEach((result, index) => {
      const id = result._id.toString();
      const rrf_score = alpha / (k + index + 1);
      scoreMap.set(id, {
        ...result,
        fusionScore: rrf_score
      });
    });

    // Process keyword search results
    keywordResults.forEach((result, index) => {
      const id = result._id.toString();
      const rrf_score = (1 - alpha) / (k + index + 1);
      
      if (scoreMap.has(id)) {
        const existing = scoreMap.get(id);
        existing.fusionScore += rrf_score;
      } else {
        scoreMap.set(id, {
          ...result,
          fusionScore: rrf_score
        });
      }
    });

    // Sort by fusion score
    return Array.from(scoreMap.values())
      .sort((a, b) => b.fusionScore - a.fusionScore);
  }

  /**
   * Search with metadata filtering
   */
  async searchWithMetadata(queryEmbedding, metadataFilter, options = {}) {
    try {
      const filter = this.buildMetadataFilter(metadataFilter);
      return await this.vectorSearch(queryEmbedding, { ...options, filter });
    } catch (error) {
      logger.error('Error in metadata filtered search:', error);
      throw error;
    }
  }

  /**
   * Build MongoDB filter from metadata criteria
   */
  buildMetadataFilter(metadataFilter) {
    const filter = {};

    if (metadataFilter.category) {
      filter['metadata.category'] = metadataFilter.category;
    }

    if (metadataFilter.dateFrom || metadataFilter.dateTo) {
      filter['metadata.timestamp'] = {};
      if (metadataFilter.dateFrom) {
        filter['metadata.timestamp'].$gte = new Date(metadataFilter.dateFrom);
      }
      if (metadataFilter.dateTo) {
        filter['metadata.timestamp'].$lte = new Date(metadataFilter.dateTo);
      }
    }

    if (metadataFilter.author) {
      filter['metadata.author'] = metadataFilter.author;
    }

    if (metadataFilter.tags && metadataFilter.tags.length > 0) {
      filter['metadata.tags'] = { $in: metadataFilter.tags };
    }

    if (Array.isArray(metadataFilter.documentIds)) {
      if (metadataFilter.documentIds.length === 0) {
        // Force-empty match.
        filter.documentId = { $in: ['__none__'] };
      } else {
        filter.documentId = { $in: metadataFilter.documentIds };
      }
    }

    return filter;
  }

  /**
   * Delete all chunks for a document
   */
  async deleteDocument(documentId) {
    try {
      const collection = this.getCollection();
      const result = await collection.deleteMany({ documentId });
      logger.info(`Deleted ${result.deletedCount} chunks for document ${documentId}`);
      return result;
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get all chunks for a specific document (for Parent Document Retriever)
   */
  async getChunksByDocumentId(documentId) {
    try {
      const collection = this.getCollection();
      const chunks = await collection
        .find({ 'metadata.documentId': documentId })
        .toArray();

      return chunks;
    } catch (error) {
      logger.error('Error getting chunks by document ID:', error);
      throw error;
    }
  }

  /**
   * Get document statistics (quality signals included).
   */
  async getStats() {
    try {
      const collection = this.getCollection();
      const totalChunks = await collection.countDocuments();
      const uniqueDocuments = await collection.distinct('documentId');

      const agg = await collection
        .aggregate([
          {
            $group: {
              _id: null,
              totalChars: {
                $sum: { $strLenCP: { $ifNull: ['$content', ''] } }
              },
              embeddingModels: { $addToSet: '$metadata.embeddingModel' },
              lastUpload: { $max: '$metadata.uploadDate' },
              lastRetrievedAt: { $max: '$metadata.lastRetrievedAt' }
            }
          }
        ])
        .toArray();

      const a = agg[0] || {};
      const totalChars = a.totalChars || 0;
      // Gemini embedding pricing typically uses token estimates; use
      // a conservative 4-chars-per-token heuristic for display only.
      const estimatedTokens = Math.round(totalChars / 4);

      return {
        totalChunks,
        totalDocuments: uniqueDocuments.length,
        totalChars,
        estimatedTokens,
        embeddingModels: (a.embeddingModels || []).filter(Boolean),
        lastUpload: a.lastUpload || null,
        lastRetrievedAt: a.lastRetrievedAt || null
      };
    } catch (error) {
      logger.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Update a shared metadata patch on every chunk of a document.
   */
  async updateDocumentMetadata(documentId, set) {
    const collection = this.getCollection();
    const res = await collection.updateMany(
      { documentId },
      { $set: { ...set, 'metadata.updatedAt': new Date() } }
    );
    if (res.matchedCount === 0) return null;
    return this.getDocument(documentId, { chunkLimit: 1 });
  }

  /**
   * Return every chunk (sans embedding) for a documentId. Used for export.
   */
  async getAllChunks(documentId) {
    const collection = this.getCollection();
    return collection
      .find({ documentId })
      .project({ embedding: 0 })
      .sort({ chunkId: 1 })
      .toArray();
  }

  /**
   * Read the original source URL off a document (first chunk holds it).
   */
  async getSourceUrl(documentId) {
    const collection = this.getCollection();
    const first = await collection.findOne(
      { documentId },
      { projection: { 'metadata.sourceUrl': 1 } }
    );
    return first?.metadata?.sourceUrl || null;
  }

  /**
   * Stamp lastRetrievedAt on chunks returned from a retrieval so stats
   * can show recency. Fire-and-forget; never throws.
   */
  async markRetrieved(chunkIds = []) {
    try {
      if (!chunkIds.length) return;
      const collection = this.getCollection();
      await collection.updateMany(
        { chunkId: { $in: chunkIds } },
        { $set: { 'metadata.lastRetrievedAt': new Date() } }
      );
    } catch (error) {
      logger.warn('markRetrieved failed (non-fatal):', error.message);
    }
  }

  /**
   * List documents (grouped from chunk collection).
   * Returns one row per documentId with aggregated counts and metadata
   * pulled from the first chunk.
   */
  async listDocuments({
    limit = 100,
    offset = 0,
    search = '',
    category = '',
    author = '',
    tag = '',
    documentIds = null
  } = {}) {
    try {
      const collection = this.getCollection();

      const match = {};
      if (search) {
        const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'i');
        match.$or = [
          { 'metadata.filename': rx },
          { 'metadata.source': rx },
          { 'metadata.description': rx },
          { 'metadata.author': rx },
          { 'metadata.tags': rx }
        ];
      }
      if (category) match['metadata.category'] = category;
      if (author) match['metadata.author'] = author;
      if (tag) match['metadata.tags'] = tag;
      if (Array.isArray(documentIds)) {
        if (documentIds.length === 0) {
          return { total: 0, offset, limit, documents: [] };
        }
        match.documentId = { $in: documentIds };
      }

      const pipeline = [
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        { $sort: { 'metadata.uploadDate': -1, _id: -1 } },
        {
          $group: {
            _id: '$documentId',
            documentId: { $first: '$documentId' },
            chunks: { $sum: 1 },
            totalChars: { $sum: { $strLenCP: { $ifNull: ['$content', ''] } } },
            filename: { $first: '$metadata.filename' },
            source: { $first: '$metadata.source' },
            fileType: { $first: '$metadata.fileType' },
            fileSize: { $first: '$metadata.fileSize' },
            uploadDate: { $first: '$metadata.uploadDate' },
            createdAt: { $first: '$createdAt' },
            category: { $first: '$metadata.category' },
            author: { $first: '$metadata.author' },
            tags: { $first: '$metadata.tags' },
            description: { $first: '$metadata.description' },
            totalPages: { $max: '$metadata.page' },
            sourceUrl: { $first: '$metadata.sourceUrl' },
            embeddingModel: { $first: '$metadata.embeddingModel' },
            lastRetrievedAt: { $max: '$metadata.lastRetrievedAt' },
            reindexedAt: { $max: '$metadata.reindexedAt' }
          }
        },
        { $sort: { uploadDate: -1, createdAt: -1 } },
        { $skip: Number(offset) || 0 },
        { $limit: Number(limit) || 100 }
      ];

      const rows = await collection.aggregate(pipeline).toArray();

      // Total distinct document count (for pagination).
      const totalPipeline = [
        ...(Object.keys(match).length ? [{ $match: match }] : []),
        { $group: { _id: '$documentId' } },
        { $count: 'n' }
      ];
      const totalAgg = await collection.aggregate(totalPipeline).toArray();
      const total = totalAgg[0]?.n || 0;

      return {
        total,
        offset: Number(offset) || 0,
        limit: Number(limit) || 100,
        documents: rows.map((r) => ({
          documentId: r.documentId,
          filename: r.filename || r.source || 'Untitled',
          fileType: r.fileType || (r.source === 'direct_text' ? 'text/plain' : null),
          fileSize: r.fileSize ?? null,
          chunks: r.chunks,
          totalChars: r.totalChars,
          totalPages: r.totalPages ?? null,
          uploadDate: r.uploadDate || r.createdAt || null,
          category: r.category || null,
          author: r.author || null,
          tags: Array.isArray(r.tags) ? r.tags : [],
          description: r.description || null,
          source: r.source || null,
          sourceUrl: r.sourceUrl || null,
          embeddingModel: r.embeddingModel || null,
          lastRetrievedAt: r.lastRetrievedAt || null,
          reindexedAt: r.reindexedAt || null
        }))
      };
    } catch (error) {
      logger.error('Error listing documents:', error);
      throw error;
    }
  }

  /**
   * Distinct facet values for building filter UIs.
   */
  async getFacets() {
    try {
      const collection = this.getCollection();
      const [categories, authors, tagsNested] = await Promise.all([
        collection.distinct('metadata.category'),
        collection.distinct('metadata.author'),
        collection.distinct('metadata.tags')
      ]);
      const tags = Array.from(
        new Set(
          []
            .concat(...tagsNested.map((t) => (Array.isArray(t) ? t : [t])))
            .filter(Boolean)
        )
      );
      return {
        categories: categories.filter(Boolean).sort(),
        authors: authors.filter(Boolean).sort(),
        tags: tags.sort()
      };
    } catch (error) {
      logger.error('Error getting facets:', error);
      return { categories: [], authors: [], tags: [] };
    }
  }

  /**
   * Get a single document's metadata + chunk previews.
   */
  async getDocument(documentId, { chunkLimit = 20 } = {}) {
    try {
      const collection = this.getCollection();
      const chunks = await collection
        .find({ documentId })
        .project({ embedding: 0 })
        .sort({ chunkId: 1 })
        .limit(Number(chunkLimit) || 20)
        .toArray();

      if (chunks.length === 0) return null;

      const totalChunks = await collection.countDocuments({ documentId });
      const first = chunks[0];
      const md = first.metadata || {};

      return {
        documentId,
        filename: md.filename || md.source || 'Untitled',
        fileType: md.fileType || (md.source === 'direct_text' ? 'text/plain' : null),
        fileSize: md.fileSize ?? null,
        uploadDate: md.uploadDate || first.createdAt || null,
        category: md.category || null,
        author: md.author || null,
        tags: Array.isArray(md.tags) ? md.tags : [],
        description: md.description || null,
        source: md.source || null,
        sourceUrl: md.sourceUrl || null,
        embeddingModel: md.embeddingModel || null,
        reindexedAt: md.reindexedAt || null,
        lastRetrievedAt: md.lastRetrievedAt || null,
        totalPages: md.totalPages ?? null,
        totalChunks,
        chunks: chunks.map((c) => ({
          chunkId: c.chunkId,
          content: c.content,
          charCount: (c.content || '').length,
          page: c.metadata?.page ?? null,
          chunkIndex: c.metadata?.chunkIndex ?? null
        }))
      };
    } catch (error) {
      logger.error('Error getting document:', error);
      throw error;
    }
  }
}

module.exports = new VectorService();

