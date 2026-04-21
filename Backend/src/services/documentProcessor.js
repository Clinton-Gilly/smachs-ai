const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { marked } = require('marked');
const fs = require('fs').promises;

class DocumentProcessor {
  /**
   * Extract text from various document formats
   */
  async extractText(filePath, fileType) {
    try {
      switch (fileType.toLowerCase()) {
        case 'pdf':
          return await this.extractFromPDF(filePath);
        case 'docx':
        case 'doc':
          return await this.extractFromWord(filePath);
        case 'md':
        case 'markdown':
          return await this.extractFromMarkdown(filePath);
        case 'txt':
          return await this.extractFromText(filePath);
        default:
          throw new Error(`Unsupported file type: ${fileType}`);
      }
    } catch (error) {
      console.error('Error extracting text:', error);
      throw error;
    }
  }

  async extractFromPDF(filePath) {
    const dataBuffer = await fs.readFile(filePath);
    const data = await pdfParse(dataBuffer);
    return {
      text: data.text,
      metadata: {
        pages: data.numpages,
        info: data.info
      }
    };
  }

  async extractFromWord(filePath) {
    const buffer = await fs.readFile(filePath);
    const result = await mammoth.extractRawText({ buffer });
    return {
      text: result.value,
      metadata: {}
    };
  }

  async extractFromMarkdown(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    const html = marked(content);
    return {
      text: content,
      html: html,
      metadata: {}
    };
  }

  async extractFromText(filePath) {
    const content = await fs.readFile(filePath, 'utf-8');
    return {
      text: content,
      metadata: {}
    };
  }

  /**
   * Clean and preprocess text
   */
  cleanText(text) {
    // Remove excessive whitespace
    let cleaned = text.replace(/\s+/g, ' ');
    
    // Remove special characters but keep punctuation
    cleaned = cleaned.replace(/[^\w\s.,!?;:()\-'"]/g, '');
    
    // Normalize line breaks
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    // Trim
    cleaned = cleaned.trim();
    
    return cleaned;
  }

  /**
   * Extract metadata from document
   */
  extractMetadata(text, filename, additionalMeta = {}) {
    const metadata = {
      filename,
      timestamp: new Date(),
      wordCount: text.split(/\s+/).length,
      charCount: text.length,
      ...additionalMeta
    };

    // Try to extract title (first heading or first line)
    const titleMatch = text.match(/^#\s+(.+)$/m) || text.match(/^(.+)$/m);
    if (titleMatch) {
      metadata.title = titleMatch[1].trim();
    }

    return metadata;
  }

  /**
   * Partition document into logical sections
   */
  partitionDocument(text) {
    const sections = [];
    
    // Split by markdown headers or double line breaks
    const parts = text.split(/(?=^#{1,6}\s+.+$)|(?:\n\n)/gm);
    
    let currentSection = {
      type: 'paragraph',
      content: '',
      level: 0
    };

    for (const part of parts) {
      const trimmed = part.trim();
      if (!trimmed) continue;

      // Check if it's a header
      const headerMatch = trimmed.match(/^(#{1,6})\s+(.+)$/);
      if (headerMatch) {
        if (currentSection.content) {
          sections.push({ ...currentSection });
        }
        currentSection = {
          type: 'header',
          level: headerMatch[1].length,
          content: headerMatch[2],
          fullText: trimmed
        };
      } else {
        if (currentSection.type === 'header') {
          sections.push({ ...currentSection });
          currentSection = {
            type: 'paragraph',
            content: trimmed,
            level: 0
          };
        } else {
          currentSection.content += (currentSection.content ? '\n\n' : '') + trimmed;
        }
      }
    }

    if (currentSection.content) {
      sections.push(currentSection);
    }

    return sections;
  }

  /**
   * Preprocess document: extract, clean, and partition
   */
  async preprocessDocument(filePath, fileType, metadata = {}) {
    try {
      // Extract text
      const extracted = await this.extractText(filePath, fileType);
      
      // Clean text
      const cleanedText = this.cleanText(extracted.text);
      
      // Extract metadata
      const docMetadata = this.extractMetadata(
        cleanedText,
        filePath.split('/').pop(),
        { ...metadata, ...extracted.metadata }
      );
      
      // Partition document
      const sections = this.partitionDocument(cleanedText);

      return {
        text: cleanedText,
        metadata: docMetadata,
        sections,
        raw: extracted.text
      };
    } catch (error) {
      console.error('Error preprocessing document:', error);
      throw error;
    }
  }
}

module.exports = new DocumentProcessor();

