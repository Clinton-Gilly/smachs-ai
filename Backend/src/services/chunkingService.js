const natural = require('natural');
const logger = require('../utils/logger');
const geminiService = require('./geminiService');

class ChunkingService {
  constructor() {
    this.tokenizer = new natural.WordTokenizer();
    this.sentenceTokenizer = new natural.SentenceTokenizer();
  }

  /**
   * Main chunking method that routes to appropriate strategy
   */
  async chunkDocument(text, metadata = {}, strategy = null) {
    const chunkStrategy = strategy || process.env.CHUNKING_STRATEGY || 'recursive';
    
    logger.info(`Chunking document using ${chunkStrategy} strategy`);

    switch (chunkStrategy) {
      case 'fixed-size':
        return this.fixedSizeChunking(text, metadata);
      case 'recursive':
        return this.recursiveChunking(text, metadata);
      case 'semantic':
        return await this.semanticChunking(text, metadata);
      case 'document-based':
        return this.documentBasedChunking(text, metadata);
      default:
        return this.recursiveChunking(text, metadata);
    }
  }

  /**
   * Fixed-size chunking with overlap
   */
  fixedSizeChunking(text, metadata = {}) {
    const chunkSize = parseInt(process.env.CHUNK_SIZE) || 1000;
    const chunkOverlap = parseInt(process.env.CHUNK_OVERLAP) || 200;
    
    const chunks = [];
    let startIndex = 0;

    while (startIndex < text.length) {
      const endIndex = Math.min(startIndex + chunkSize, text.length);
      const chunk = text.slice(startIndex, endIndex);
      
      chunks.push({
        content: chunk.trim(),
        metadata: {
          ...metadata,
          chunkIndex: chunks.length,
          startIndex,
          endIndex,
          chunkingStrategy: 'fixed-size'
        }
      });

      startIndex += chunkSize - chunkOverlap;
    }

    logger.info(`Created ${chunks.length} fixed-size chunks`);
    return chunks;
  }

  /**
   * Recursive chunking - splits by paragraphs, then sentences if needed
   */
  recursiveChunking(text, metadata = {}) {
    const chunkSize = parseInt(process.env.CHUNK_SIZE) || 1000;
    const chunkOverlap = parseInt(process.env.CHUNK_OVERLAP) || 200;
    
    // First split by paragraphs
    const paragraphs = text.split(/\n\n+/).filter(p => p.trim());
    const chunks = [];
    let currentChunk = '';
    let chunkIndex = 0;

    for (const paragraph of paragraphs) {
      // If adding this paragraph exceeds chunk size
      if (currentChunk.length + paragraph.length > chunkSize && currentChunk.length > 0) {
        // Save current chunk
        chunks.push({
          content: currentChunk.trim(),
          metadata: {
            ...metadata,
            chunkIndex: chunkIndex++,
            chunkingStrategy: 'recursive'
          }
        });

        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + paragraph;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + paragraph;
      }

      // If current chunk is too large, split by sentences
      if (currentChunk.length > chunkSize * 1.5) {
        const sentenceChunks = this.splitBySentences(currentChunk, chunkSize, chunkOverlap);
        sentenceChunks.forEach(chunk => {
          chunks.push({
            content: chunk.trim(),
            metadata: {
              ...metadata,
              chunkIndex: chunkIndex++,
              chunkingStrategy: 'recursive'
            }
          });
        });
        currentChunk = '';
      }
    }

    // Add remaining chunk
    if (currentChunk.trim()) {
      chunks.push({
        content: currentChunk.trim(),
        metadata: {
          ...metadata,
          chunkIndex: chunkIndex,
          chunkingStrategy: 'recursive'
        }
      });
    }

    logger.info(`Created ${chunks.length} recursive chunks`);
    return chunks;
  }

  /**
   * Split text by sentences
   */
  splitBySentences(text, chunkSize, chunkOverlap) {
    const sentences = this.sentenceTokenizer.tokenize(text);
    const chunks = [];
    let currentChunk = '';

    for (const sentence of sentences) {
      if (currentChunk.length + sentence.length > chunkSize && currentChunk.length > 0) {
        chunks.push(currentChunk.trim());
        const overlapText = this.getOverlapText(currentChunk, chunkOverlap);
        currentChunk = overlapText + sentence;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + sentence;
      }
    }

    if (currentChunk.trim()) {
      chunks.push(currentChunk.trim());
    }

    return chunks;
  }

  /**
   * Get overlap text from end of chunk
   */
  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) return text;
    
    const overlapText = text.slice(-overlapSize);
    // Try to start at a word boundary
    const firstSpace = overlapText.indexOf(' ');
    return firstSpace > 0 ? overlapText.slice(firstSpace + 1) : overlapText;
  }

  /**
   * Semantic chunking - groups sentences by semantic similarity
   */
  async semanticChunking(text, metadata = {}) {
    try {
      const sentences = this.sentenceTokenizer.tokenize(text);
      
      if (sentences.length === 0) {
        return [];
      }

      // Generate embeddings for all sentences
      logger.info(`Generating embeddings for ${sentences.length} sentences`);
      const embeddings = await geminiService.generateEmbeddings(sentences);

      // Group sentences by semantic similarity
      const chunks = [];
      let currentChunk = [sentences[0]];
      let currentEmbedding = embeddings[0];

      const similarityThreshold = 0.7; // Cosine similarity threshold

      for (let i = 1; i < sentences.length; i++) {
        const similarity = this.cosineSimilarity(currentEmbedding, embeddings[i]);
        
        // If similarity is low, start a new chunk
        if (similarity < similarityThreshold) {
          chunks.push({
            content: currentChunk.join(' ').trim(),
            metadata: {
              ...metadata,
              chunkIndex: chunks.length,
              chunkingStrategy: 'semantic',
              sentenceCount: currentChunk.length
            }
          });
          currentChunk = [sentences[i]];
          currentEmbedding = embeddings[i];
        } else {
          currentChunk.push(sentences[i]);
          // Update average embedding
          currentEmbedding = this.averageEmbeddings([currentEmbedding, embeddings[i]]);
        }
      }

      // Add last chunk
      if (currentChunk.length > 0) {
        chunks.push({
          content: currentChunk.join(' ').trim(),
          metadata: {
            ...metadata,
            chunkIndex: chunks.length,
            chunkingStrategy: 'semantic',
            sentenceCount: currentChunk.length
          }
        });
      }

      logger.info(`Created ${chunks.length} semantic chunks`);
      return chunks;
    } catch (error) {
      logger.error('Error in semantic chunking, falling back to recursive:', error);
      return this.recursiveChunking(text, metadata);
    }
  }

  /**
   * Document-based chunking - splits by headings and sections
   */
  documentBasedChunking(text, metadata = {}) {
    // Split by markdown headings or section markers
    const sections = text.split(/(?=^#{1,6}\s)/m).filter(s => s.trim());
    
    if (sections.length <= 1) {
      // No clear sections, fall back to recursive
      return this.recursiveChunking(text, metadata);
    }

    const chunks = sections.map((section, index) => ({
      content: section.trim(),
      metadata: {
        ...metadata,
        chunkIndex: index,
        chunkingStrategy: 'document-based',
        isSection: true
      }
    }));

    logger.info(`Created ${chunks.length} document-based chunks`);
    return chunks;
  }

  /**
   * Calculate cosine similarity between two vectors
   */
  cosineSimilarity(vec1, vec2) {
    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    return dotProduct / (Math.sqrt(norm1) * Math.sqrt(norm2));
  }

  /**
   * Calculate average of multiple embeddings
   */
  averageEmbeddings(embeddings) {
    const dim = embeddings[0].length;
    const avg = new Array(dim).fill(0);

    for (const emb of embeddings) {
      for (let i = 0; i < dim; i++) {
        avg[i] += emb[i];
      }
    }

    return avg.map(v => v / embeddings.length);
  }
}

module.exports = new ChunkingService();

