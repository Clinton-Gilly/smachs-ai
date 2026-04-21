const geminiService = require('./geminiService');
const vectorService = require('./vectorService');
const logger = require('../utils/logger');

/**
 * Advanced Retrieval Strategies Service
 * Implements cutting-edge retrieval techniques:
 * - Parent Document Retriever
 * - Multi-Query Retriever
 * - HyDE (Hypothetical Document Embeddings)
 * - Ensemble Retriever
 * - Self-Query Retriever
 */
class AdvancedRetrieverService {
  constructor() {
    this.queryCache = new Map(); // In-memory cache (will be replaced with Redis)
  }

  /**
   * Parent Document Retriever
   * Retrieves small chunks but returns larger parent documents for better context
   * 
   * Strategy:
   * 1. Search using small chunks (better precision)
   * 2. Return parent documents (better context)
   * 3. Merge overlapping parents
   */
  async parentDocumentRetrieval(query, options = {}) {
    try {
      const {
        topK = 20,
        parentTopK = 5,
        useHybridSearch = true
      } = options;

      logger.info('Parent Document Retrieval started', { query, topK, parentTopK });

      // Generate embedding for query
      const queryEmbedding = await geminiService.generateEmbedding(query);

      // Retrieve small chunks
      let chunks;
      if (useHybridSearch) {
        chunks = await vectorService.hybridSearch(query, queryEmbedding, { topK });
      } else {
        chunks = await vectorService.vectorSearch(queryEmbedding, { topK });
      }

      // Group chunks by parent document
      const parentDocuments = new Map();
      
      for (const chunk of chunks) {
        const parentId = chunk.metadata.documentId;
        
        if (!parentDocuments.has(parentId)) {
          parentDocuments.set(parentId, {
            documentId: parentId,
            chunks: [],
            totalScore: 0,
            metadata: chunk.metadata
          });
        }
        
        const parent = parentDocuments.get(parentId);
        parent.chunks.push(chunk);
        parent.totalScore += chunk.score || 0;
      }

      // Calculate average score and sort parents
      const rankedParents = Array.from(parentDocuments.values())
        .map(parent => ({
          ...parent,
          avgScore: parent.totalScore / parent.chunks.length,
          chunkCount: parent.chunks.length
        }))
        .sort((a, b) => b.avgScore - a.avgScore)
        .slice(0, parentTopK);

      // Retrieve full parent documents
      const parentResults = await Promise.all(
        rankedParents.map(async (parent) => {
          // Get all chunks from this parent document
          const allChunks = await vectorService.getChunksByDocumentId(parent.documentId);
          
          // Sort chunks by their index
          allChunks.sort((a, b) => 
            (a.metadata.chunkIndex || 0) - (b.metadata.chunkIndex || 0)
          );
          
          // Combine chunks into full document
          const fullContent = allChunks.map(c => c.content).join('\n\n');
          
          return {
            content: fullContent,
            score: parent.avgScore,
            metadata: {
              ...parent.metadata,
              retrievalMethod: 'parent-document',
              matchedChunks: parent.chunkCount,
              totalChunks: allChunks.length
            },
            matchedChunks: parent.chunks // Keep reference to matched chunks
          };
        })
      );

      logger.info('Parent Document Retrieval completed', {
        chunksRetrieved: chunks.length,
        parentsReturned: parentResults.length
      });

      return parentResults;
    } catch (error) {
      logger.error('Parent Document Retrieval failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Multi-Query Retriever
   * Generates multiple query variations and retrieves documents for each
   * 
   * Strategy:
   * 1. Generate 3-5 query variations
   * 2. Retrieve documents for each variation
   * 3. Use Reciprocal Rank Fusion to merge results
   */
  async multiQueryRetrieval(query, options = {}) {
    try {
      const {
        numQueries = 3,
        topK = 10,
        useHybridSearch = true
      } = options;

      logger.info('Multi-Query Retrieval started', { query, numQueries });

      // Generate multiple query variations
      const queries = await geminiService.generateMultipleQueries(query, numQueries);
      logger.info('Generated query variations', { queries });

      // Retrieve documents for each query variation
      const allResults = await Promise.all(
        queries.map(async (q) => {
          const embedding = await geminiService.generateEmbedding(q);
          
          if (useHybridSearch) {
            return await vectorService.hybridSearch(q, embedding, { topK });
          } else {
            return await vectorService.vectorSearch(embedding, { topK });
          }
        })
      );

      // Merge results using Reciprocal Rank Fusion
      const mergedResults = this.reciprocalRankFusion(allResults);

      logger.info('Multi-Query Retrieval completed', {
        queriesGenerated: queries.length,
        totalResults: mergedResults.length
      });

      return mergedResults.slice(0, topK);
    } catch (error) {
      logger.error('Multi-Query Retrieval failed', { error: error.message });
      throw error;
    }
  }

  /**
   * HyDE (Hypothetical Document Embeddings)
   * Generates a hypothetical answer and uses it for retrieval
   * 
   * Strategy:
   * 1. Generate hypothetical answer to the query
   * 2. Embed the hypothetical answer
   * 3. Use it to retrieve similar real documents
   */
  async hydeRetrieval(query, options = {}) {
    try {
      const { topK = 10 } = options;

      logger.info('HyDE Retrieval started', { query });

      // Generate hypothetical document
      const hypotheticalDoc = await geminiService.generateHypotheticalDocument(query);
      logger.info('Generated hypothetical document', {
        length: hypotheticalDoc.length
      });

      // Embed the hypothetical document
      const embedding = await geminiService.generateEmbedding(hypotheticalDoc);

      // Retrieve similar documents
      const results = await vectorService.vectorSearch(embedding, { topK });

      // Add HyDE metadata
      const hydeResults = results.map(result => ({
        ...result,
        metadata: {
          ...result.metadata,
          retrievalMethod: 'hyde',
          hypotheticalDoc: hypotheticalDoc.substring(0, 200) + '...'
        }
      }));

      logger.info('HyDE Retrieval completed', { resultsCount: hydeResults.length });

      return hydeResults;
    } catch (error) {
      logger.error('HyDE Retrieval failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Ensemble Retriever
   * Combines multiple retrieval strategies with weighted fusion
   * 
   * Strategy:
   * 1. Run multiple retrieval methods in parallel
   * 2. Assign weights to each method
   * 3. Merge using weighted RRF
   */
  async ensembleRetrieval(query, options = {}) {
    try {
      const {
        topK = 10,
        methods = ['vector', 'hybrid', 'hyde', 'multi-query'],
        weights = { vector: 0.3, hybrid: 0.4, hyde: 0.2, 'multi-query': 0.1 }
      } = options;

      logger.info('Ensemble Retrieval started', { query, methods });

      const queryEmbedding = await geminiService.generateEmbedding(query);
      const retrievalPromises = [];

      // Vector search
      if (methods.includes('vector')) {
        retrievalPromises.push(
          vectorService.vectorSearch(queryEmbedding, { topK })
            .then(results => ({ method: 'vector', results, weight: weights.vector || 0.25 }))
        );
      }

      // Hybrid search
      if (methods.includes('hybrid')) {
        retrievalPromises.push(
          vectorService.hybridSearch(query, queryEmbedding, { topK })
            .then(results => ({ method: 'hybrid', results, weight: weights.hybrid || 0.25 }))
        );
      }

      // HyDE
      if (methods.includes('hyde')) {
        retrievalPromises.push(
          this.hydeRetrieval(query, { topK })
            .then(results => ({ method: 'hyde', results, weight: weights.hyde || 0.25 }))
        );
      }

      // Multi-Query
      if (methods.includes('multi-query')) {
        retrievalPromises.push(
          this.multiQueryRetrieval(query, { topK, numQueries: 2 })
            .then(results => ({ method: 'multi-query', results, weight: weights['multi-query'] || 0.25 }))
        );
      }

      // Wait for all retrievals
      const allRetrievals = await Promise.all(retrievalPromises);

      // Weighted Reciprocal Rank Fusion
      const mergedResults = this.weightedRRF(allRetrievals);

      logger.info('Ensemble Retrieval completed', {
        methodsUsed: allRetrievals.map(r => r.method),
        totalResults: mergedResults.length
      });

      return mergedResults.slice(0, topK);
    } catch (error) {
      logger.error('Ensemble Retrieval failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Self-Query Retriever
   * Extracts metadata filters from natural language query
   * 
   * Strategy:
   * 1. Use LLM to extract structured metadata from query
   * 2. Separate semantic query from metadata filters
   * 3. Apply filters during retrieval
   */
  async selfQueryRetrieval(query, options = {}) {
    try {
      const { topK = 10 } = options;

      logger.info('Self-Query Retrieval started', { query });

      // Extract metadata filters from query
      const { semanticQuery, metadataFilter } = await geminiService.extractQueryMetadata(query);
      
      logger.info('Extracted query components', { semanticQuery, metadataFilter });

      // Generate embedding for semantic query
      const embedding = await geminiService.generateEmbedding(semanticQuery);

      // Retrieve with metadata filter
      const results = await vectorService.searchWithMetadata(embedding, metadataFilter, { topK });

      logger.info('Self-Query Retrieval completed', { resultsCount: results.length });

      return results;
    } catch (error) {
      logger.error('Self-Query Retrieval failed', { error: error.message });
      throw error;
    }
  }

  /**
   * Reciprocal Rank Fusion for multiple result sets
   */
  reciprocalRankFusion(resultSets, k = 60) {
    const scoreMap = new Map();

    resultSets.forEach((results, setIndex) => {
      results.forEach((result, rank) => {
        const id = result.chunkId || result._id?.toString();
        const rrfScore = 1 / (k + rank + 1);

        if (!scoreMap.has(id)) {
          scoreMap.set(id, {
            ...result,
            fusionScore: 0,
            appearances: 0
          });
        }

        const entry = scoreMap.get(id);
        entry.fusionScore += rrfScore;
        entry.appearances += 1;
      });
    });

    return Array.from(scoreMap.values())
      .sort((a, b) => b.fusionScore - a.fusionScore);
  }

  /**
   * Weighted Reciprocal Rank Fusion
   */
  weightedRRF(retrievals, k = 60) {
    const scoreMap = new Map();

    retrievals.forEach(({ method, results, weight }) => {
      results.forEach((result, rank) => {
        const id = result.chunkId || result._id?.toString();
        const rrfScore = weight * (1 / (k + rank + 1));

        if (!scoreMap.has(id)) {
          scoreMap.set(id, {
            ...result,
            fusionScore: 0,
            methods: [],
            metadata: {
              ...result.metadata,
              retrievalMethods: []
            }
          });
        }

        const entry = scoreMap.get(id);
        entry.fusionScore += rrfScore;
        entry.methods.push(method);
        entry.metadata.retrievalMethods.push({ method, rank, weight });
      });
    });

    return Array.from(scoreMap.values())
      .sort((a, b) => b.fusionScore - a.fusionScore);
  }
}

module.exports = new AdvancedRetrieverService();

