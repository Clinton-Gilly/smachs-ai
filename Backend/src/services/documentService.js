const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { marked } = require('marked');
const { v4: uuidv4 } = require('uuid');
const axios = require('axios');
const logger = require('../utils/logger');
const chunkingService = require('./chunkingService');
const geminiService = require('./geminiService');
const vectorService = require('./vectorService');

class DocumentService {
  /**
   * Process uploaded document file
   */
  async processDocument(file, metadata = {}) {
    try {
      logger.info(`Processing document: ${file.originalname}`);

      // Extract text as pages (PDF keeps page boundaries; others are 1 "page").
      const pages = await this.extractPages(file);

      // Generate document ID
      const documentId = uuidv4();
      const totalPages = pages.length;

      // Prepare metadata (scoped to the whole document)
      const docMetadata = {
        documentId,
        filename: file.originalname,
        fileType: file.mimetype,
        uploadDate: new Date(),
        fileSize: file.size,
        totalPages,
        embeddingModel:
          process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
        ...metadata
      };

      // Chunk each page independently so we can stamp a page number on every
      // chunk. chunkIndex is then reassigned globally across pages.
      let chunks = [];
      for (const p of pages) {
        const cleaned = this.cleanText(p.text);
        if (!cleaned) continue;

        const pageMetadata = {
          ...docMetadata,
          ...(p.page != null ? { page: p.page } : {})
        };
        const pageChunks = await chunkingService.chunkDocument(
          cleaned,
          pageMetadata
        );
        chunks.push(...pageChunks);
      }

      // Re-index chunkIndex globally across pages
      chunks = chunks.map((c, i) => ({
        ...c,
        metadata: { ...c.metadata, chunkIndex: i }
      }));

      if (chunks.length === 0) {
        throw new Error('No extractable text found in document');
      }

      // Generate embeddings for all chunks
      logger.info(`Generating embeddings for ${chunks.length} chunks`);
      const chunkTexts = chunks.map((c) => c.content);
      const embeddings = await geminiService.generateEmbeddings(chunkTexts);

      // Prepare chunks for insertion
      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        documentId,
        chunkId: `${documentId}_${index}`,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: chunk.metadata,
        createdAt: new Date()
      }));

      // Insert into MongoDB
      await vectorService.insertChunks(chunksWithEmbeddings);

      logger.info(
        `Successfully processed document ${documentId} with ${chunks.length} chunks across ${totalPages} page(s)`
      );

      return {
        documentId,
        filename: file.originalname,
        chunksCreated: chunks.length,
        totalPages,
        metadata: docMetadata
      };
    } catch (error) {
      logger.error('Error processing document:', error);
      throw error;
    }
  }

  /**
   * Extract document as an array of pages: `[{ page, text }]`.
   * Only PDFs track real page numbers; everything else collapses to a single
   * logical "page" with `page = null`.
   */
  async extractPages(file) {
    const fileType = file.mimetype;
    try {
      if (fileType === 'application/pdf') {
        return await this.extractFromPDF(file.buffer);
      }

      let text;
      if (
        fileType ===
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ) {
        text = await this.extractFromDocx(file.buffer);
      } else if (
        fileType === 'text/markdown' ||
        file.originalname.endsWith('.md')
      ) {
        text = this.extractFromMarkdown(file.buffer.toString('utf-8'));
      } else if (fileType.startsWith('text/')) {
        text = file.buffer.toString('utf-8');
      } else {
        throw new Error(`Unsupported file type: ${fileType}`);
      }

      return [{ page: null, text }];
    } catch (error) {
      logger.error('Error extracting pages:', error);
      throw error;
    }
  }

  /**
   * Legacy: flatten extractPages back to a single string. Retained for any
   * external callers that still expect a joined transcript.
   */
  async extractText(file) {
    const pages = await this.extractPages(file);
    return pages.map((p) => p.text).join('\n\n');
  }

  /**
   * Extract text from PDF preserving page boundaries.
   * Uses pdf-parse's `pagerender` hook to collect per-page text.
   */
  async extractFromPDF(buffer) {
    const pages = [];
    const options = {
      pagerender: async (pageData) => {
        try {
          const textContent = await pageData.getTextContent({
            normalizeWhitespace: true,
            disableCombineTextItems: false
          });
          let last = -1;
          let text = '';
          for (const item of textContent.items) {
            if (last !== -1 && item.transform && item.transform[5] < last) {
              text += '\n';
            }
            text += item.str + ' ';
            if (item.transform) last = item.transform[5];
          }
          const pageNumber =
            pageData.pageNumber ??
            (typeof pageData.pageIndex === 'number'
              ? pageData.pageIndex + 1
              : pages.length + 1);
          pages.push({ page: pageNumber, text });
          return text;
        } catch (err) {
          logger.warn('pagerender failed, skipping page', err.message);
          return '';
        }
      }
    };

    try {
      await pdfParse(buffer, options);
    } catch (error) {
      logger.error('Error parsing PDF:', error);
      throw new Error('Failed to parse PDF file');
    }

    pages.sort((a, b) => (a.page || 0) - (b.page || 0));
    return pages.length > 0 ? pages : [{ page: 1, text: '' }];
  }

  /**
   * Extract text from DOCX
   */
  async extractFromDocx(buffer) {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch (error) {
      logger.error('Error parsing DOCX:', error);
      throw new Error('Failed to parse DOCX file');
    }
  }

  /**
   * Extract text from Markdown (convert to plain text)
   */
  extractFromMarkdown(text) {
    // Convert markdown to HTML then strip HTML tags
    const html = marked(text);
    return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ');
  }

  /**
   * Clean and preprocess text
   */
  cleanText(text) {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ');
    
    // Remove special characters but keep punctuation
    cleaned = cleaned.replace(/[^\w\s.,!?;:()\-'"]/g, '');
    
    // Remove multiple consecutive punctuation
    cleaned = cleaned.replace(/([.,!?;:])\1+/g, '$1');
    
    // Trim
    cleaned = cleaned.trim();

    return cleaned;
  }

  /**
   * Process text directly (without file upload)
   */
  async processText(text, metadata = {}) {
    try {
      const documentId = uuidv4();
      
      const docMetadata = {
        documentId,
        source: metadata.source || 'direct_text',
        uploadDate: new Date(),
        embeddingModel:
          process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004',
        ...metadata
      };

      const cleanedText = this.cleanText(text);
      const chunks = await chunkingService.chunkDocument(cleanedText, docMetadata);

      const chunkTexts = chunks.map(c => c.content);
      const embeddings = await geminiService.generateEmbeddings(chunkTexts);

      const chunksWithEmbeddings = chunks.map((chunk, index) => ({
        documentId,
        chunkId: `${documentId}_${index}`,
        content: chunk.content,
        embedding: embeddings[index],
        metadata: chunk.metadata,
        createdAt: new Date()
      }));

      await vectorService.insertChunks(chunksWithEmbeddings);

      logger.info(`Successfully processed text with ${chunks.length} chunks`);

      return {
        documentId,
        chunksCreated: chunks.length,
        metadata: docMetadata
      };
    } catch (error) {
      logger.error('Error processing text:', error);
      throw error;
    }
  }

  /**
   * Delete a document and all its chunks
   */
  async deleteDocument(documentId) {
    try {
      await vectorService.deleteDocument(documentId);
      logger.info(`Deleted document ${documentId}`);
      return { success: true, documentId };
    } catch (error) {
      logger.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get document statistics
   */
  async getStats() {
    try {
      return await vectorService.getStats();
    } catch (error) {
      logger.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * List ingested documents (grouped by documentId).
   */
  async listDocuments(options = {}) {
    try {
      return await vectorService.listDocuments(options);
    } catch (error) {
      logger.error('Error listing documents:', error);
      throw error;
    }
  }

  /**
   * Get a single document's metadata + preview chunks.
   */
  async getDocument(documentId, options = {}) {
    try {
      return await vectorService.getDocument(documentId, options);
    } catch (error) {
      logger.error('Error getting document:', error);
      throw error;
    }
  }

  /**
   * Fetch a URL and ingest its text content.
   */
  async processUrl(url, metadata = {}) {
    let parsed;
    try {
      parsed = new URL(url);
    } catch {
      throw new Error('Invalid URL');
    }
    if (!['http:', 'https:'].includes(parsed.protocol)) {
      throw new Error('Only http(s) URLs are supported');
    }

    logger.info(`Fetching URL for ingestion: ${url}`);
    const res = await axios.get(url, {
      timeout: 20000,
      responseType: 'text',
      maxContentLength: 20 * 1024 * 1024,
      headers: {
        'User-Agent': 'SmachsAI-Ingestor/1.0 (+https://smachs.ai)'
      },
      validateStatus: (s) => s >= 200 && s < 400
    });

    const contentType = String(res.headers['content-type'] || '').toLowerCase();
    const rawBody = typeof res.data === 'string' ? res.data : String(res.data ?? '');

    let title = parsed.hostname + parsed.pathname;
    let text;
    if (contentType.includes('text/html') || /<html[\s>]/i.test(rawBody)) {
      const extracted = this.extractFromHtml(rawBody);
      text = extracted.text;
      if (extracted.title) title = extracted.title;
    } else if (
      contentType.includes('text/markdown') ||
      /\.md(\?|$)/i.test(parsed.pathname)
    ) {
      text = this.extractFromMarkdown(rawBody);
    } else if (contentType.includes('application/json')) {
      try {
        text = JSON.stringify(JSON.parse(rawBody), null, 2);
      } catch {
        text = rawBody;
      }
    } else {
      text = rawBody;
    }

    const cleaned = this.cleanText(text);
    if (!cleaned) {
      throw new Error('No extractable text at URL');
    }

    return this.processText(cleaned, {
      filename: metadata.filename || title,
      source: 'url',
      sourceUrl: url,
      fetchedAt: new Date(),
      ...metadata
    });
  }

  /**
   * Strip HTML down to plain text + extract <title>.
   */
  extractFromHtml(html) {
    const titleMatch = html.match(/<title[^>]*>([\s\S]*?)<\/title>/i);
    const title = titleMatch
      ? titleMatch[1].replace(/\s+/g, ' ').trim()
      : null;

    let text = html;
    text = text.replace(/<script[\s\S]*?<\/script>/gi, ' ');
    text = text.replace(/<style[\s\S]*?<\/style>/gi, ' ');
    text = text.replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ');
    text = text.replace(/<!--[\s\S]*?-->/g, ' ');
    text = text.replace(/<(br|\/p|\/div|\/li|\/h[1-6]|\/tr)>/gi, '\n');
    text = text.replace(/<[^>]+>/g, ' ');

    text = text
      .replace(/&nbsp;/gi, ' ')
      .replace(/&amp;/gi, '&')
      .replace(/&lt;/gi, '<')
      .replace(/&gt;/gi, '>')
      .replace(/&quot;/gi, '"')
      .replace(/&#39;/gi, "'")
      .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));

    return { title, text };
  }

  /**
   * Update document metadata (category, author, tags, description,
   * filename) across every chunk of a document.
   */
  async updateDocumentMetadata(documentId, patch = {}) {
    const allowed = [
      'category',
      'author',
      'tags',
      'description',
      'filename'
    ];
    const set = {};
    for (const key of allowed) {
      if (patch[key] !== undefined) {
        set[`metadata.${key}`] = patch[key];
      }
    }
    if (Object.keys(set).length === 0) {
      throw new Error('No updatable fields supplied');
    }
    const updated = await vectorService.updateDocumentMetadata(
      documentId,
      set
    );
    if (!updated) throw new Error('Document not found');
    return updated;
  }

  /**
   * Re-chunk and re-embed a document from fresh text. Supported for
   * `direct_text` and `url` sources (where we can refetch). For file
   * uploads we don't keep the original blob, so callers must supply
   * `text` in the payload.
   */
  async reindexDocument(documentId, { text, refetch } = {}) {
    const existing = await vectorService.getDocument(documentId, {
      chunkLimit: 1
    });
    if (!existing) throw new Error('Document not found');

    let newText = text;
    if (!newText && refetch && existing.source === 'url') {
      const url = await vectorService.getSourceUrl(documentId);
      if (!url) throw new Error('No source URL on record');
      const res = await axios.get(url, {
        timeout: 20000,
        responseType: 'text',
        maxContentLength: 20 * 1024 * 1024,
        headers: { 'User-Agent': 'SmachsAI-Ingestor/1.0' }
      });
      const body = typeof res.data === 'string' ? res.data : String(res.data);
      newText = this.extractFromHtml(body).text;
    }

    if (!newText) {
      throw new Error(
        'Re-index requires `text` (or `refetch` for URL-sourced docs)'
      );
    }

    const cleaned = this.cleanText(newText);
    if (!cleaned) throw new Error('Supplied text was empty after cleaning');

    const baseMetadata = {
      documentId,
      filename: existing.filename,
      source: existing.source || 'direct_text',
      category: existing.category,
      author: existing.author,
      tags: existing.tags,
      description: existing.description,
      fileType: existing.fileType,
      fileSize: existing.fileSize,
      uploadDate: existing.uploadDate || new Date(),
      reindexedAt: new Date()
    };

    const chunks = await chunkingService.chunkDocument(cleaned, baseMetadata);
    if (chunks.length === 0) throw new Error('Nothing to index');

    const embeddings = await geminiService.generateEmbeddings(
      chunks.map((c) => c.content)
    );

    const chunksWithEmbeddings = chunks.map((chunk, index) => ({
      documentId,
      chunkId: `${documentId}_${index}`,
      content: chunk.content,
      embedding: embeddings[index],
      metadata: { ...chunk.metadata, chunkIndex: index },
      createdAt: new Date()
    }));

    await vectorService.deleteDocument(documentId);
    await vectorService.insertChunks(chunksWithEmbeddings);

    return {
      documentId,
      chunksCreated: chunks.length
    };
  }

  /**
   * Export a document's chunks as JSON (embeddings excluded).
   */
  async exportDocument(documentId) {
    const chunks = await vectorService.getAllChunks(documentId);
    if (!chunks || chunks.length === 0) {
      throw new Error('Document not found');
    }
    const first = chunks[0];
    return {
      documentId,
      metadata: first.metadata || {},
      totalChunks: chunks.length,
      exportedAt: new Date(),
      chunks: chunks.map((c) => ({
        chunkId: c.chunkId,
        content: c.content,
        metadata: c.metadata || {},
        createdAt: c.createdAt
      }))
    };
  }
}

module.exports = new DocumentService();

