require('dotenv').config();

const config = {
  // MongoDB Configuration
  mongodb: {
    uri: process.env.MONGODB_URI,
    dbName: process.env.MONGODB_DB_NAME || 'rag_database',
    collections: {
      documents: 'documents',
      chunks: 'chunks',
      queries: 'query_history'
    }
  },

  // Gemini Configuration
  gemini: {
    apiKey: process.env.GEMINI_API_KEY,
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
    embeddingDimensions: parseInt(process.env.EMBEDDING_DIMENSIONS) || 768,
    llmModel: process.env.GEMINI_MODEL || 'gemini-1.5-flash',
    temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
    maxTokens: parseInt(process.env.MAX_TOKENS) || 2000
  },

  // Cohere Configuration
  cohere: {
    apiKey: process.env.COHERE_API_KEY
  },

  // Server Configuration
  server: {
    port: process.env.PORT || 5000,
    env: process.env.NODE_ENV || 'development'
  },

  // Chunking Configuration
  chunking: {
    defaultSize: parseInt(process.env.CHUNK_SIZE) || 1000,
    defaultOverlap: parseInt(process.env.CHUNK_OVERLAP) || 200,
    strategies: {
      FIXED: 'fixed',
      RECURSIVE: 'recursive',
      SEMANTIC: 'semantic',
      DOCUMENT_BASED: 'document_based'
    }
  },

  // Retrieval Configuration
  retrieval: {
    defaultTopK: parseInt(process.env.DEFAULT_TOP_K) || 10,
    rerankTopK: parseInt(process.env.RERANK_TOP_K) || 5,
    hybridSearchAlpha: parseFloat(process.env.HYBRID_SEARCH_ALPHA) || 0.5,
    distanceThreshold: 0.7,
    searchTypes: {
      VECTOR: 'vector',
      KEYWORD: 'keyword',
      HYBRID: 'hybrid'
    }
  },

  // Prompt Templates
  prompts: {
    defaultSystem: `You are a helpful AI assistant. Use the provided context to answer questions accurately and concisely. If the context doesn't contain enough information, say so.`,
    
    ragTemplate: `Answer the question based on the following context. If the context doesn't contain the answer, say "I don't have enough information to answer that question."

Context:
{context}

Question: {question}

Answer:`,

    queryRewrite: `Rewrite the following query to make it more suitable for semantic search. Make it clear and specific.

Original Query: {query}

Rewritten Query:`,

    queryDecomposition: `Break down the following complex query into simpler sub-queries that can be answered independently.

Complex Query: {query}

Sub-queries (return as JSON array):`,

    chainOfThought: `Let's approach this step-by-step:

Context:
{context}

Question: {question}

Think through this carefully and provide a detailed answer:`
  }
};

module.exports = config;

