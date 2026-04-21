const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');
const cacheService = require('./cacheService');
const tokenOptimizer = require('../utils/tokenOptimizer');
const rateLimiter = require('../middleware/geminiRateLimiter');

class GeminiService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined in environment variables');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.embeddingModel = process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004';
    this.llmModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
    this.enableCache = process.env.ENABLE_REDIS_CACHE === 'true';

    // Initialize models
    this.model = this.genAI.getGenerativeModel({
      model: this.llmModel,
      generationConfig: {
        temperature: parseFloat(process.env.LLM_TEMPERATURE) || 0.7,
        topP: parseFloat(process.env.TOP_P) || 0.95,
        topK: parseInt(process.env.TOP_K) || 40,
        maxOutputTokens: parseInt(process.env.MAX_TOKENS) || 2000,
      }
    });
  }

  /**
   * Generate embeddings for a single text with retry logic
   */
  async generateEmbedding(text, retries = 3) {
    try {
      // Check cache first
      if (this.enableCache) {
        const cached = await cacheService.getCachedEmbedding(text);
        if (cached) {
          logger.debug('Embedding cache hit');
          return cached;
        }
      }

      const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });

      // Retry logic for network issues
      let lastError;
      for (let attempt = 1; attempt <= retries; attempt++) {
        try {
          const result = await model.embedContent(text);
          const embedding = result.embedding.values;

          // Cache the result
          if (this.enableCache) {
            await cacheService.cacheEmbedding(text, embedding);
          }

          return embedding;
        } catch (error) {
          lastError = error;
          if (attempt < retries && (error.message.includes('fetch failed') || error.message.includes('ECONNREFUSED'))) {
            logger.warn(`Embedding generation attempt ${attempt} failed, retrying...`);
            await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
          } else {
            throw error;
          }
        }
      }

      throw lastError;
    } catch (error) {
      logger.error('Error generating embedding:', {
        message: error.message,
        model: this.embeddingModel,
        textLength: text?.length
      });

      // Provide helpful error messages
      if (error.message.includes('fetch failed')) {
        throw new Error('Network error: Unable to connect to Gemini API. Please check your internet connection and firewall settings.');
      } else if (error.message.includes('API key')) {
        throw new Error('Invalid API key: Please verify your GEMINI_API_KEY in the .env file.');
      } else if (error.message.includes('quota')) {
        throw new Error('API quota exceeded: Please check your Gemini API quota limits.');
      }

      throw error;
    }
  }

  /**
   * Generate embeddings for multiple texts in batch
   */
  async generateEmbeddings(texts) {
    try {
      const model = this.genAI.getGenerativeModel({ model: this.embeddingModel });
      
      // Process in batches to avoid rate limits
      const batchSize = 100;
      const embeddings = [];

      for (let i = 0; i < texts.length; i += batchSize) {
        const batch = texts.slice(i, i + batchSize);
        const batchPromises = batch.map(text => model.embedContent(text));
        const results = await Promise.all(batchPromises);
        embeddings.push(...results.map(r => r.embedding.values));
        
        logger.info(`Generated embeddings for batch ${i / batchSize + 1}/${Math.ceil(texts.length / batchSize)}`);
      }

      return embeddings;
    } catch (error) {
      logger.error('Error generating embeddings:', error);
      throw error;
    }
  }

  /**
   * Generate text response using Gemini LLM with token optimization
   */
  async generateResponse(prompt, context = null, options = {}) {
    try {
      // Optimize prompt to reduce tokens
      const optimizedPrompt = tokenOptimizer.optimizePrompt(prompt, { aggressive: options.aggressive || false });

      let fullPrompt = optimizedPrompt;

      if (context) {
        // Compress context to stay within token limits
        const maxContextTokens = options.maxContextTokens || 500;
        const compressedContext = tokenOptimizer.compressContext(context, maxContextTokens);
        fullPrompt = this.buildRAGPrompt(optimizedPrompt, compressedContext);
      }

      // Estimate tokens for rate limiting
      const estimatedTokens = tokenOptimizer.estimateTokens(fullPrompt);

      // Check rate limits before making API call
      const rateLimitCheck = rateLimiter.canProceed(estimatedTokens);
      if (!rateLimitCheck.allowed) {
        throw new Error(`Rate limit exceeded: ${rateLimitCheck.message}`);
      }

      // Check cache first
      if (this.enableCache) {
        const cached = await cacheService.getCachedLLMResponse(fullPrompt);
        if (cached) {
          logger.debug('LLM response cache hit - no API call made');
          return cached;
        }
      }

      // Make API call
      const result = await this.model.generateContent(fullPrompt);
      const response = result.response.text();

      // Record actual usage
      rateLimiter.recordUsage(estimatedTokens);

      // Cache the result
      if (this.enableCache) {
        await cacheService.cacheLLMResponse(fullPrompt, response);
      }

      logger.debug('LLM response generated', {
        originalPromptTokens: tokenOptimizer.estimateTokens(prompt),
        optimizedPromptTokens: estimatedTokens,
        tokensSaved: tokenOptimizer.estimateTokens(prompt) - estimatedTokens
      });

      return response;
    } catch (error) {
      logger.error('Error generating response:', error);
      throw error;
    }
  }

  /**
   * Build RAG prompt with retrieved context
   */
  buildRAGPrompt(query, context) {
    const contextText = Array.isArray(context) 
      ? context.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')
      : context;

    return `You are a helpful AI assistant. Answer the user's question based on the provided context. If the context doesn't contain enough information to answer the question, say so clearly.

Context:
${contextText}

Question: ${query}

Answer:`;
  }

  /**
   * Generate response with Chain of Thought prompting
   */
  async generateWithCoT(query, context) {
    try {
      const prompt = `You are a helpful AI assistant. Use step-by-step reasoning to answer the question based on the provided context.

Context:
${context.map((c, i) => `[${i + 1}] ${c.content}`).join('\n\n')}

Question: ${query}

Think step-by-step:
1. First, identify the relevant information from the context
2. Then, reason through the problem
3. Finally, provide a clear answer

Answer:`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error('Error in CoT generation:', error);
      throw error;
    }
  }

  /**
   * Rewrite query for better retrieval
   */
  async rewriteQuery(query) {
    try {
      const prompt = `Rewrite the following user query to make it more suitable for information retrieval. Make it clear, specific, and optimized for search. Return only the rewritten query without explanation.

Original query: ${query}

Rewritten query:`;

      const result = await this.model.generateContent(prompt);
      const rewritten = result.response.text().trim();
      logger.info(`Query rewritten: "${query}" -> "${rewritten}"`);
      return rewritten;
    } catch (error) {
      logger.error('Error rewriting query:', error);
      return query; // Return original on error
    }
  }

  /**
   * Expand query into multiple similar queries
   */
  async expandQuery(query, numExpansions = 3) {
    try {
      const prompt = `Generate ${numExpansions} alternative phrasings of the following query that capture the same intent but use different words. Return only the queries, one per line, without numbering or explanation.

Original query: ${query}

Alternative queries:`;

      const result = await this.model.generateContent(prompt);
      const expansions = result.response.text()
        .trim()
        .split('\n')
        .filter(q => q.trim())
        .slice(0, numExpansions);
      
      logger.info(`Query expanded into ${expansions.length} variations`);
      return [query, ...expansions];
    } catch (error) {
      logger.error('Error expanding query:', error);
      return [query]; // Return original on error
    }
  }

  /**
   * Decompose complex query into sub-queries
   */
  async decomposeQuery(query) {
    try {
      const prompt = `Break down the following complex question into simpler sub-questions that can be answered independently. Return only the sub-questions, one per line, without numbering or explanation.

Complex question: ${query}

Sub-questions:`;

      const result = await this.model.generateContent(prompt);
      const subQueries = result.response.text()
        .trim()
        .split('\n')
        .filter(q => q.trim());

      logger.info(`Query decomposed into ${subQueries.length} sub-queries`);
      return subQueries.length > 0 ? subQueries : [query];
    } catch (error) {
      logger.error('Error decomposing query:', error);
      return [query]; // Return original on error
    }
  }

  /**
   * Extract keywords from query for metadata filtering
   */
  async extractKeywords(query) {
    try {
      const prompt = `Extract the key search terms and concepts from the following query. Return only the keywords as a comma-separated list.

Query: ${query}

Keywords:`;

      const result = await this.model.generateContent(prompt);
      const keywords = result.response.text()
        .trim()
        .split(',')
        .map(k => k.trim())
        .filter(k => k);
      
      return keywords;
    } catch (error) {
      logger.error('Error extracting keywords:', error);
      return [];
    }
  }

  /**
   * Compress context by extracting only relevant information
   */
  async compressContext(context, query) {
    const contextText = context.map(c => c.content).join('\n\n');
    try {

      const prompt = `Given the following context and query, extract only the most relevant sentences that help answer the query. Remove redundant or irrelevant information.

Query: ${query}

Context:
${contextText}

Relevant excerpts:`;

      const result = await this.model.generateContent(prompt);
      return result.response.text().trim();
    } catch (error) {
      logger.error('Error compressing context:', error);
      return contextText; // Return original on error
    }
  }

  /**
   * Generate multiple query variations for Multi-Query Retrieval
   */
  async generateMultipleQueries(query, numQueries = 3) {
    try {
      const prompt = `Generate ${numQueries} different variations of the following query.
Each variation should ask the same question but using different wording, perspectives, or phrasings.
This will help retrieve more diverse and comprehensive results.

Original Query: "${query}"

Return ONLY the ${numQueries} query variations, one per line, without numbering or explanations.`;

      const result = await this.model.generateContent(prompt);
      const queries = result.response.text()
        .split('\n')
        .map(q => q.trim())
        .filter(q => q && !q.match(/^\d+[\.\)]/)) // Remove numbered lines
        .slice(0, numQueries);

      // Always include original query
      return [query, ...queries].slice(0, numQueries + 1);
    } catch (error) {
      logger.error('Multi-query generation failed', { error: error.message });
      return [query]; // Fallback to original query
    }
  }

  /**
   * Generate hypothetical document for HyDE retrieval
   */
  async generateHypotheticalDocument(query) {
    try {
      const prompt = `You are an expert assistant. Generate a detailed, factual answer to the following question.
Write as if you are creating a document that would perfectly answer this query.
Be specific, comprehensive, and use technical terminology where appropriate.

Question: "${query}"

Hypothetical Answer:`;

      const result = await this.model.generateContent(prompt);
      return result.response.text();
    } catch (error) {
      logger.error('Hypothetical document generation failed', { error: error.message });
      return query; // Fallback to original query
    }
  }

  /**
   * Extract metadata filters from natural language query (Self-Query)
   */
  async extractQueryMetadata(query) {
    try {
      const prompt = `Analyze the following query and extract:
1. The core semantic question (without metadata constraints)
2. Any metadata filters mentioned (category, date, author, tags, etc.)

Return a JSON object with this structure:
{
  "semanticQuery": "the core question",
  "metadataFilter": {
    "category": "value if mentioned",
    "dateFrom": "YYYY-MM-DD if mentioned",
    "dateTo": "YYYY-MM-DD if mentioned",
    "author": "value if mentioned",
    "tags": ["tag1", "tag2"] if mentioned
  }
}

Query: "${query}"

JSON:`;

      const result = await this.model.generateContent(prompt);
      const response = result.response.text();

      // Try to parse JSON response
      try {
        const jsonMatch = response.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);

          // Clean up metadata filter (remove null/undefined values)
          const cleanFilter = {};
          if (parsed.metadataFilter) {
            Object.keys(parsed.metadataFilter).forEach(key => {
              const value = parsed.metadataFilter[key];
              if (value && value !== 'null' && value !== 'undefined') {
                cleanFilter[key] = value;
              }
            });
          }

          return {
            semanticQuery: parsed.semanticQuery || query,
            metadataFilter: Object.keys(cleanFilter).length > 0 ? cleanFilter : null
          };
        }
      } catch (parseError) {
        logger.warn('Failed to parse metadata extraction response', { parseError: parseError.message });
      }

      // Fallback
      return {
        semanticQuery: query,
        metadataFilter: null
      };
    } catch (error) {
      logger.error('Query metadata extraction failed', { error: error.message });
      return {
        semanticQuery: query,
        metadataFilter: null
      };
    }
  }
}

module.exports = new GeminiService();

