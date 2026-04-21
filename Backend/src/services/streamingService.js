const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

/**
 * Streaming Service for Server-Sent Events (SSE)
 * Provides real-time streaming of LLM responses
 */
class StreamingService {
  constructor() {
    if (!process.env.GEMINI_API_KEY) {
      throw new Error('GEMINI_API_KEY is not defined');
    }

    this.genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
    this.llmModel = process.env.GEMINI_MODEL || 'gemini-1.5-flash';
  }

  /**
   * Setup SSE headers for response
   */
  setupSSE(res) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no'); // Disable nginx buffering
    res.flushHeaders();
  }

  /**
   * Send SSE event
   */
  sendEvent(res, event, data) {
    res.write(`event: ${event}\n`);
    res.write(`data: ${JSON.stringify(data)}\n\n`);
  }

  /**
   * Stream LLM response with context
   * @param {boolean} skipSetup - Skip SSE setup if already configured
   */
  async streamResponse(res, query, context, options = {}) {
    try {
      const {
        useCoT = false,
        temperature = 0.7,
        skipSetup = false  // New parameter to skip SSE setup
      } = options;

      // Only setup SSE if not already done (e.g., by streamRAGProcess)
      if (!skipSetup) {
        this.setupSSE(res);

        // Send start event
        this.sendEvent(res, 'start', {
          query,
          contextsCount: context.length,
          timestamp: new Date().toISOString()
        });
      }

      // Build prompt
      const prompt = this.buildStreamingPrompt(query, context, useCoT);

      // Send context event with source-friendly metadata so the UI can
      // render citations (filename, page, chunk index).
      this.sendEvent(res, 'context', {
        contexts: context.map((c, i) => {
          const md = c.metadata || {};
          return {
            index: i + 1,
            content:
              (c.content || '').substring(0, 220) +
              ((c.content || '').length > 220 ? '...' : ''),
            score: c.score,
            filename: md.filename || md.source || null,
            page: md.page ?? null,
            chunkIndex: md.chunkIndex ?? null,
            documentId: md.documentId ?? null,
            metadata: md
          };
        })
      });

      // Initialize model for streaming
      const model = this.genAI.getGenerativeModel({
        model: this.llmModel,
        generationConfig: {
          temperature,
          topP: 0.95,
          topK: 40,
          maxOutputTokens: 2000,
        }
      });

      // Stream the response
      const result = await model.generateContentStream(prompt);

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of result.stream) {
        const chunkText = chunk.text();
        fullResponse += chunkText;
        chunkCount++;

        // Send chunk event
        this.sendEvent(res, 'chunk', {
          text: chunkText,
          chunkIndex: chunkCount
        });
      }

      // Send completion event
      this.sendEvent(res, 'complete', {
        fullResponse,
        totalChunks: chunkCount,
        timestamp: new Date().toISOString()
      });

      // End the stream
      res.end();

      logger.info('Streaming response completed', {
        query,
        chunks: chunkCount,
        responseLength: fullResponse.length
      });

      return fullResponse;
    } catch (error) {
      logger.error('Streaming response failed', { error: error.message });

      // Only send error if headers not sent
      if (!res.headersSent) {
        this.sendEvent(res, 'error', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        res.end();
      }
      throw error;
    }
  }

  /**
   * Stream multi-step RAG process
   * Shows each step of the RAG pipeline in real-time
   */
  async streamRAGProcess(res, query, retrievalFn, options = {}) {
    try {
      this.setupSSE(res);

      // Step 1: Query processing
      this.sendEvent(res, 'step', {
        step: 'query_processing',
        message: 'Processing your query...',
        data: { query }
      });

      // Step 2: Retrieval
      this.sendEvent(res, 'step', {
        step: 'retrieval',
        message: 'Retrieving relevant documents...'
      });

      const context = await retrievalFn(query);

      this.sendEvent(res, 'step', {
        step: 'retrieval_complete',
        message: `Retrieved ${context.length} relevant documents`,
        data: {
          count: context.length,
          topScores: context.slice(0, 3).map(c => c.score)
        }
      });

      // Check if we have context
      if (context.length === 0) {
        this.sendEvent(res, 'error', {
          message: 'No relevant documents found. Please upload documents first.',
          timestamp: new Date().toISOString()
        });
        res.end();
        return;
      }

      // Step 3: Generation
      this.sendEvent(res, 'step', {
        step: 'generation',
        message: 'Generating response...'
      });

      // Stream the actual response (skip SSE setup since we already did it)
      await this.streamResponse(res, query, context, { ...options, skipSetup: true });

    } catch (error) {
      logger.error('RAG process streaming failed', { error: error.message });

      // Only send error and end if headers haven't been sent
      if (!res.headersSent) {
        this.sendEvent(res, 'error', {
          message: error.message,
          timestamp: new Date().toISOString()
        });
        res.end();
      }
    }
  }

  /**
   * Build prompt for streaming, with citation-friendly source labels
   * ("[S1 page 3]", "[S2 chunk 12]") so the model can reference them inline.
   */
  buildStreamingPrompt(query, context, useCoT = false) {
    const labelFor = (c, i) => {
      const md = c.metadata || {};
      const name = md.filename || md.source || `Source ${i + 1}`;
      if (md.page != null) return `S${i + 1} | ${name} | page ${md.page}`;
      if (md.chunkIndex != null)
        return `S${i + 1} | ${name} | chunk ${md.chunkIndex + 1}`;
      return `S${i + 1} | ${name}`;
    };

    const contextText = context
      .map((c, i) => `[${labelFor(c, i)}]\n${c.content}`)
      .join('\n\n---\n\n');

    const citationRules = [
      'You are Smachs AI, a careful assistant that answers strictly from the provided source passages.',
      'Cite the sources you used at the end of each sentence or claim using square brackets, e.g. [S1] or [S2]. If a page is given in the label, prefer the page form like [S1 p.3].',
      'If the passages do not contain the answer, say so plainly in one short sentence — do NOT guess or pull from outside knowledge.',
      'Keep the reply concise and well-structured. Use short paragraphs or bullet points when helpful.',
      'Never invent source numbers. Only cite sources that are listed above.'
    ].join(' ');

    if (useCoT) {
      return `${citationRules}

Sources:
${contextText}

Question: ${query}

Think step-by-step internally, then write the final answer only. Every factual claim must be followed by a citation like [S1] or [S2 p.3].

Answer:`;
    }

    return `${citationRules}

Sources:
${contextText}

Question: ${query}

Answer (cite as [S1], [S2 p.3], etc.):`;
  }

  /**
   * Stream query decomposition process
   */
  async streamQueryDecomposition(res, query, subQueries) {
    try {
      this.setupSSE(res);

      this.sendEvent(res, 'decomposition_start', {
        originalQuery: query,
        subQueriesCount: subQueries.length
      });

      for (let i = 0; i < subQueries.length; i++) {
        this.sendEvent(res, 'sub_query', {
          index: i,
          query: subQueries[i],
          total: subQueries.length
        });

        // Small delay for better UX
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      this.sendEvent(res, 'decomposition_complete', {
        subQueries
      });

    } catch (error) {
      logger.error('Query decomposition streaming failed', { error: error.message });
      this.sendEvent(res, 'error', { message: error.message });
    }
  }

  /**
   * Stream ensemble retrieval process
   */
  async streamEnsembleRetrieval(res, methods, results) {
    try {
      this.sendEvent(res, 'ensemble_start', {
        methods,
        timestamp: new Date().toISOString()
      });

      for (const method of methods) {
        this.sendEvent(res, 'method_start', {
          method,
          message: `Running ${method} retrieval...`
        });

        // Simulate progress (in real implementation, this would be actual progress)
        await new Promise(resolve => setTimeout(resolve, 200));

        this.sendEvent(res, 'method_complete', {
          method,
          resultsCount: results[method]?.length || 0
        });
      }

      this.sendEvent(res, 'ensemble_complete', {
        totalResults: Object.values(results).flat().length
      });

    } catch (error) {
      logger.error('Ensemble retrieval streaming failed', { error: error.message });
      this.sendEvent(res, 'error', { message: error.message });
    }
  }
}

module.exports = new StreamingService();

