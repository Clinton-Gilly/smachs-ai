const database = require('../config/database');
const config = require('../config/config');
const embeddingService = require('./embeddingService');
const { ObjectId } = require('mongodb');

class VectorStore {
  constructor() {
    this.chunksCollection = null;
    this.documentsCollection = null;
  }

  async initialize() {
    this.chunksCollection = database.getCollection(config.mongodb.collections.chunks);
    this.documentsCollection = database.getCollection(config.mongodb.collections.documents);
  }

  /**
   * Store document and its chunks with embeddings
   */
  async storeDocument(documentData, chunks, metadata = {}) {
    try {
      // Store document metadata
      const document = {
        filename: documentData.filename,
        metadata: {
          ...metadata,
          ...documentData.metadata,
          uploadedAt: new Date(),
          chunkCount: chunks.length
        },
        status: 'processing'
      };

      const docResult = await this.documentsCollection.insertOne(document);
      const documentId = docResult.insertedId;

      // Generate embeddings for all chunks
      const chunkTexts = chunks.map(chunk => chunk.content);
      const embeddings = await embeddingService.embedBatch(chunkTexts);

      // Prepare chunks with embeddings
      const chunksToInsert = chunks.map((chunk, index) => ({
        documentId,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: {
          ...chunk.metadata,
          documentFilename: documentData.filename,
          chunkIndex: index,
          source: metadata.source || documentData.filename,
          timestamp: new Date(),
          category: metadata.category || 'general'
        }
      }));

      // Insert chunks
      await this.chunksCollection.insertMany(chunksToInsert);

      // Update document status
      await this.documentsCollection.updateOne(
        { _id: documentId },
        { $set: { status: 'completed' } }
      );

      return {
        documentId,
        chunkCount: chunks.length,
        status: 'success'
      };
    } catch (error) {
      console.error('Error storing document:', error);
      throw error;
    }
  }

  /**
   * Vector search using MongoDB Atlas Vector Search
   */
  async vectorSearch(queryEmbedding, options = {}) {
    try {
      const {
        topK = config.retrieval.defaultTopK,
        filter = {},
        threshold = null
      } = options;

      const pipeline = [
        {
          $vectorSearch: {
            index: 'vector_index',
            path: 'embedding',
            queryVector: queryEmbedding,
            numCandidates: topK * 10,
            limit: topK,
            filter: this.buildFilter(filter)
          }
        },
        {
          $project: {
            content: 1,
            metadata: 1,
            documentId: 1,
            score: { $meta: 'vectorSearchScore' }
          }
        }
      ];

      // Add threshold filtering if specified
      if (threshold !== null) {
        pipeline.push({
          $match: {
            score: { $gte: threshold }
          }
        });
      }

      const results = await this.chunksCollection.aggregate(pipeline).toArray();
      return results;
    } catch (error) {
      console.error('Error in vector search:', error);
      throw error;
    }
  }

  /**
   * Keyword search using MongoDB text search
   */
  async keywordSearch(query, options = {}) {
    try {
      const {
        topK = config.retrieval.defaultTopK,
        filter = {}
      } = options;

      const searchQuery = {
        $text: { $search: query },
        ...filter
      };

      const results = await this.chunksCollection
        .find(searchQuery)
        .project({
          content: 1,
          metadata: 1,
          documentId: 1,
          score: { $meta: 'textScore' }
        })
        .sort({ score: { $meta: 'textScore' } })
        .limit(topK)
        .toArray();

      return results;
    } catch (error) {
      console.error('Error in keyword search:', error);
      throw error;
    }
  }

  /**
   * Hybrid search combining vector and keyword search
   */
  async hybridSearch(query, queryEmbedding, options = {}) {
    try {
      const {
        alpha = config.retrieval.hybridSearchAlpha,
        topK = config.retrieval.defaultTopK,
        filter = {}
      } = options;

      // Perform both searches
      const [vectorResults, keywordResults] = await Promise.all([
        this.vectorSearch(queryEmbedding, { topK: topK * 2, filter }),
        this.keywordSearch(query, { topK: topK * 2, filter })
      ]);

      // Normalize and combine scores
      const combinedResults = this.combineSearchResults(
        vectorResults,
        keywordResults,
        alpha
      );

      // Sort by combined score and limit
      return combinedResults
        .sort((a, b) => b.score - a.score)
        .slice(0, topK);
    } catch (error) {
      console.error('Error in hybrid search:', error);
      throw error;
    }
  }

  /**
   * Combine and normalize search results
   */
  combineSearchResults(vectorResults, keywordResults, alpha) {
    const resultsMap = new Map();

    // Normalize vector scores
    const maxVectorScore = Math.max(...vectorResults.map(r => r.score), 1);
    vectorResults.forEach(result => {
      const id = result._id.toString();
      const normalizedScore = result.score / maxVectorScore;
      resultsMap.set(id, {
        ...result,
        score: alpha * normalizedScore,
        vectorScore: normalizedScore,
        keywordScore: 0
      });
    });

    // Normalize and add keyword scores
    const maxKeywordScore = Math.max(...keywordResults.map(r => r.score), 1);
    keywordResults.forEach(result => {
      const id = result._id.toString();
      const normalizedScore = result.score / maxKeywordScore;
      
      if (resultsMap.has(id)) {
        const existing = resultsMap.get(id);
        existing.score += (1 - alpha) * normalizedScore;
        existing.keywordScore = normalizedScore;
      } else {
        resultsMap.set(id, {
          ...result,
          score: (1 - alpha) * normalizedScore,
          vectorScore: 0,
          keywordScore: normalizedScore
        });
      }
    });

    return Array.from(resultsMap.values());
  }

  /**
   * Build MongoDB filter from metadata
   */
  buildFilter(filter) {
    const mongoFilter = {};

    if (filter.source) {
      mongoFilter['metadata.source'] = filter.source;
    }

    if (filter.category) {
      mongoFilter['metadata.category'] = filter.category;
    }

    if (filter.dateFrom || filter.dateTo) {
      mongoFilter['metadata.timestamp'] = {};
      if (filter.dateFrom) {
        mongoFilter['metadata.timestamp'].$gte = new Date(filter.dateFrom);
      }
      if (filter.dateTo) {
        mongoFilter['metadata.timestamp'].$lte = new Date(filter.dateTo);
      }
    }

    return mongoFilter;
  }

  /**
   * Get document by ID
   */
  async getDocument(documentId) {
    return await this.documentsCollection.findOne({ _id: new ObjectId(documentId) });
  }

  /**
   * Get all chunks for a document
   */
  async getDocumentChunks(documentId) {
    return await this.chunksCollection
      .find({ documentId: new ObjectId(documentId) })
      .sort({ 'metadata.chunkIndex': 1 })
      .toArray();
  }

  /**
   * Delete document and its chunks
   */
  async deleteDocument(documentId) {
    const objId = new ObjectId(documentId);
    await this.chunksCollection.deleteMany({ documentId: objId });
    await this.documentsCollection.deleteOne({ _id: objId });
  }

  /**
   * Get all documents
   */
  async getAllDocuments() {
    return await this.documentsCollection.find({}).toArray();
  }
}

module.exports = new VectorStore();

