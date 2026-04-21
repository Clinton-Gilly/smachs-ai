const { CohereClient } = require('cohere-ai');
const logger = require('../utils/logger');

class CohereService {
  constructor() {
    this.client = null;
    
    if (process.env.COHERE_API_KEY) {
      this.client = new CohereClient({
        token: process.env.COHERE_API_KEY
      });
      logger.info('Cohere client initialized for re-ranking');
    } else {
      logger.warn('COHERE_API_KEY not set - re-ranking will use fallback method');
    }
  }

  /**
   * Re-rank retrieved documents using Cohere's re-ranking model
   */
  async rerank(query, documents, topK = 5) {
    try {
      if (!this.client) {
        logger.warn('Cohere not configured, using fallback re-ranking');
        return this.fallbackRerank(documents, topK);
      }

      // Extract text content from documents
      const texts = documents.map(doc => doc.content);

      // Call Cohere rerank API
      const response = await this.client.rerank({
        query: query,
        documents: texts,
        topN: topK,
        model: 'rerank-english-v3.0'
      });

      // Map reranked results back to original documents
      const rerankedDocs = response.results.map(result => ({
        ...documents[result.index],
        rerankScore: result.relevanceScore
      }));

      logger.info(`Re-ranked ${documents.length} documents to top ${topK}`);
      return rerankedDocs;
    } catch (error) {
      logger.error('Error in Cohere re-ranking, using fallback:', error);
      return this.fallbackRerank(documents, topK);
    }
  }

  /**
   * Fallback re-ranking method (simple score-based)
   */
  fallbackRerank(documents, topK) {
    // Sort by existing score and return top K
    const sorted = documents
      .sort((a, b) => (b.score || b.fusionScore || 0) - (a.score || a.fusionScore || 0))
      .slice(0, topK);

    logger.info(`Fallback re-ranking: selected top ${topK} from ${documents.length} documents`);
    return sorted;
  }
}

module.exports = new CohereService();

