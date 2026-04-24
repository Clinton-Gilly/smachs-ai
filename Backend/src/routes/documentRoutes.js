const express = require('express');
const multer = require('multer');
const router = express.Router();
const documentService = require('../services/documentService');
const logger = require('../utils/logger');

// Configure multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage: storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  },
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/pdf',
      'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'text/plain',
      'text/markdown'
    ];

    if (allowedTypes.includes(file.mimetype) || file.originalname.endsWith('.md')) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Allowed: PDF, DOCX, TXT, MD'));
    }
  }
});

/**
 * POST /api/documents/upload
 * Upload and process a document
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    // Extract metadata from request body.
    // Admin uploads are marked isGlobal=true so all users can query them.
    const isAdmin = req.user.role === 'admin';
    const metadata = {
      category: req.body.category,
      author: req.body.author,
      tags: req.body.tags ? JSON.parse(req.body.tags) : [],
      description: req.body.description,
      userId: isAdmin ? null : req.userId,
      isGlobal: isAdmin
    };

    const result = await documentService.processDocument(req.file, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error in document upload:', error);
    res.status(500).json({
      success: false,
      error: error.message || error.toString() || 'Document processing failed'
    });
  }
});

/**
 * POST /api/documents/url
 * Fetch and ingest a URL as a document.
 */
router.post('/url', async (req, res) => {
  try {
    const { url, metadata: bodyMeta } = req.body || {};
    if (!url || typeof url !== 'string') {
      return res.status(400).json({ success: false, error: 'url is required' });
    }
    const isAdmin = req.user.role === 'admin';
    const metadata = {
      ...(bodyMeta || {}),
      userId: isAdmin ? null : req.userId,
      isGlobal: isAdmin
    };
    const result = await documentService.processUrl(url, metadata);
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error ingesting URL:', error);
    res.status(500).json({ success: false, error: error.message || error.toString() || 'URL ingestion failed' });
  }
});

/**
 * POST /api/documents/text
 * Process raw text directly
 */
router.post('/text', async (req, res) => {
  try {
    const { text, metadata: bodyMeta } = req.body;

    if (!text) {
      return res.status(400).json({
        success: false,
        error: 'Text content is required'
      });
    }

    const isAdmin = req.user.role === 'admin';
    const metadata = {
      ...(bodyMeta || {}),
      userId: isAdmin ? null : req.userId,
      isGlobal: isAdmin
    };
    const result = await documentService.processText(text, metadata);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error processing text:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/documents/stats
 * Get document statistics
 */
router.get('/stats', async (req, res) => {
  try {
    const stats = await documentService.getStats();

    res.json({
      success: true,
      data: stats
    });
  } catch (error) {
    logger.error('Error getting stats:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

/**
 * GET /api/documents
 * List documents (grouped from chunk collection).
 * Query: ?limit=50&offset=0&search=foo&category=...&author=...&tag=...&collectionId=...
 */
router.get('/', async (req, res) => {
  try {
    const {
      limit,
      offset,
      search,
      category,
      author,
      tag,
      collectionId
    } = req.query;

    let documentIds = null;
    if (collectionId) {
      const collectionsService = require('../services/collectionsService');
      const col = await collectionsService.get(String(collectionId));
      if (!col) {
        return res
          .status(404)
          .json({ success: false, error: 'Collection not found' });
      }
      documentIds = col.documentIds || [];
    }

    // Admins see all documents; regular users see their own + global docs
    const userId = req.user.role === 'admin' ? null : req.userId;

    const result = await documentService.listDocuments({
      limit: limit ? parseInt(limit, 10) : 100,
      offset: offset ? parseInt(offset, 10) : 0,
      search: typeof search === 'string' ? search : '',
      category: typeof category === 'string' ? category : '',
      author: typeof author === 'string' ? author : '',
      tag: typeof tag === 'string' ? tag : '',
      documentIds,
      userId
    });

    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error listing documents:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/facets
 * Distinct category/author/tag values for filter UIs.
 */
router.get('/facets', async (req, res) => {
  try {
    const vectorService = require('../services/vectorService');
    const facets = await vectorService.getFacets();
    res.json({ success: true, data: facets });
  } catch (error) {
    logger.error('Error getting facets:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/:documentId
 * Get a single document with preview chunks.
 */
router.get('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const { chunkLimit } = req.query;
    const doc = await documentService.getDocument(documentId, {
      chunkLimit: chunkLimit ? parseInt(chunkLimit, 10) : 20
    });

    if (!doc) {
      return res.status(404).json({ success: false, error: 'Document not found' });
    }

    res.json({ success: true, data: doc });
  } catch (error) {
    logger.error('Error getting document:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

/**
 * PATCH /api/documents/:documentId
 * Update top-level metadata fields on all chunks of a document.
 */
router.patch('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;
    const updated = await documentService.updateDocumentMetadata(
      documentId,
      req.body || {}
    );
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating document:', error);
    const status = /not found/i.test(error.message) ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * POST /api/documents/:documentId/reindex
 * Re-chunk + re-embed a document. Accepts `{ text }` or `{ refetch: true }`
 * for url-sourced documents.
 */
router.post('/:documentId/reindex', async (req, res) => {
  try {
    const { documentId } = req.params;
    const result = await documentService.reindexDocument(
      documentId,
      req.body || {}
    );
    res.json({ success: true, data: result });
  } catch (error) {
    logger.error('Error reindexing document:', error);
    const status = /not found/i.test(error.message) ? 404 : 400;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * GET /api/documents/:documentId/export
 * Export a document's chunks as JSON.
 */
router.get('/:documentId/export', async (req, res) => {
  try {
    const { documentId } = req.params;
    const data = await documentService.exportDocument(documentId);
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="document-${documentId}.json"`
    );
    res.json({ success: true, data });
  } catch (error) {
    logger.error('Error exporting document:', error);
    const status = /not found/i.test(error.message) ? 404 : 500;
    res.status(status).json({ success: false, error: error.message });
  }
});

/**
 * DELETE /api/documents/:documentId
 * Delete a document and all its chunks
 */
router.delete('/:documentId', async (req, res) => {
  try {
    const { documentId } = req.params;

    const result = await documentService.deleteDocument(documentId);

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    logger.error('Error deleting document:', error);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

module.exports = router;

