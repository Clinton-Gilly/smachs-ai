const OpenAI = require('openai');
const config = require('../config/config');

class QueryOptimizer {
  constructor() {
    this.openai = new OpenAI({
      apiKey: config.openai.apiKey
    });
  }

  /**
   * Query Rewriting - reformulate query for better retrieval
   */
  async rewriteQuery(query) {
    try {
      const prompt = config.prompts.queryRewrite.replace('{query}', query);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a query optimization assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 200
      });

      return response.choices[0].message.content.trim();
    } catch (error) {
      console.error('Error rewriting query:', error);
      return query; // Return original query on error
    }
  }

  /**
   * Query Expansion - generate multiple similar queries
   */
  async expandQuery(query, numExpansions = 3) {
    try {
      const prompt = `Generate ${numExpansions} alternative phrasings of this query for better information retrieval. Return only the queries, one per line.

Original Query: ${query}

Alternative Queries:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a query expansion assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.7,
        max_tokens: 300
      });

      const expandedQueries = response.choices[0].message.content
        .trim()
        .split('\n')
        .map(q => q.replace(/^\d+\.\s*/, '').trim())
        .filter(q => q.length > 0);

      return [query, ...expandedQueries];
    } catch (error) {
      console.error('Error expanding query:', error);
      return [query];
    }
  }

  /**
   * Query Decomposition - break complex queries into sub-queries
   */
  async decomposeQuery(query) {
    try {
      const prompt = config.prompts.queryDecomposition.replace('{query}', query);

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a query decomposition assistant. Return valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.3,
        max_tokens: 500
      });

      const content = response.choices[0].message.content.trim();
      
      // Try to parse JSON
      try {
        const subQueries = JSON.parse(content);
        return Array.isArray(subQueries) ? subQueries : [query];
      } catch {
        // If not valid JSON, split by newlines
        return content.split('\n')
          .map(q => q.replace(/^\d+\.\s*/, '').trim())
          .filter(q => q.length > 0);
      }
    } catch (error) {
      console.error('Error decomposing query:', error);
      return [query];
    }
  }

  /**
   * Extract keywords from query
   */
  extractKeywords(query) {
    // Simple keyword extraction (can be enhanced with NLP libraries)
    const stopWords = new Set([
      'a', 'an', 'and', 'are', 'as', 'at', 'be', 'by', 'for', 'from',
      'has', 'he', 'in', 'is', 'it', 'its', 'of', 'on', 'that', 'the',
      'to', 'was', 'will', 'with', 'what', 'when', 'where', 'who', 'how'
    ]);

    const words = query.toLowerCase()
      .replace(/[^\w\s]/g, '')
      .split(/\s+/)
      .filter(word => word.length > 2 && !stopWords.has(word));

    return [...new Set(words)];
  }

  /**
   * Extract metadata filters from query
   */
  async extractMetadataFilters(query) {
    try {
      const prompt = `Extract any metadata filters from this query. Return as JSON with fields: source, category, dateFrom, dateTo.
Only include fields that are explicitly mentioned. Return empty object if no filters found.

Query: ${query}

JSON:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a metadata extraction assistant. Return valid JSON only.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 200
      });

      const content = response.choices[0].message.content.trim();
      
      try {
        return JSON.parse(content);
      } catch {
        return {};
      }
    } catch (error) {
      console.error('Error extracting metadata filters:', error);
      return {};
    }
  }

  /**
   * Determine query intent and route to appropriate pipeline
   */
  async routeQuery(query) {
    try {
      const prompt = `Analyze this query and determine its type. Return one of: factual, summarization, comparison, procedural, conversational

Query: ${query}

Type:`;

      const response = await this.openai.chat.completions.create({
        model: 'gpt-3.5-turbo',
        messages: [
          { role: 'system', content: 'You are a query classification assistant.' },
          { role: 'user', content: prompt }
        ],
        temperature: 0.1,
        max_tokens: 50
      });

      const queryType = response.choices[0].message.content.trim().toLowerCase();

      // Map to retrieval strategy
      const routingMap = {
        'factual': { searchType: 'hybrid', topK: 5, rerank: true },
        'summarization': { searchType: 'vector', topK: 15, rerank: true },
        'comparison': { searchType: 'hybrid', topK: 10, rerank: true },
        'procedural': { searchType: 'keyword', topK: 8, rerank: false },
        'conversational': { searchType: 'vector', topK: 5, rerank: false }
      };

      return routingMap[queryType] || routingMap['factual'];
    } catch (error) {
      console.error('Error routing query:', error);
      return { searchType: 'hybrid', topK: 5, rerank: true };
    }
  }

  /**
   * Optimize query with multiple techniques
   */
  async optimizeQuery(query, options = {}) {
    const {
      rewrite = true,
      expand = false,
      decompose = false,
      extractFilters = true,
      route = true
    } = options;

    const result = {
      originalQuery: query,
      optimizedQuery: query,
      expandedQueries: [query],
      subQueries: [query],
      keywords: this.extractKeywords(query),
      filters: {},
      routing: null
    };

    try {
      // Rewrite query
      if (rewrite) {
        result.optimizedQuery = await this.rewriteQuery(query);
      }

      // Expand query
      if (expand) {
        result.expandedQueries = await this.expandQuery(result.optimizedQuery);
      }

      // Decompose query
      if (decompose) {
        result.subQueries = await this.decomposeQuery(query);
      }

      // Extract metadata filters
      if (extractFilters) {
        result.filters = await this.extractMetadataFilters(query);
      }

      // Route query
      if (route) {
        result.routing = await this.routeQuery(query);
      }

      return result;
    } catch (error) {
      console.error('Error optimizing query:', error);
      return result;
    }
  }
}

module.exports = new QueryOptimizer();

