const express = require('express');
const router = express.Router();
const collectionsService = require('../services/collectionsService');
const logger = require('../utils/logger');

router.get('/', async (req, res) => {
  try {
    const rows = await collectionsService.list();
    res.json({ success: true, data: rows });
  } catch (error) {
    logger.error('Error listing collections:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.post('/', async (req, res) => {
  try {
    const created = await collectionsService.create(req.body || {});
    res.json({ success: true, data: created });
  } catch (error) {
    logger.error('Error creating collection:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.get('/:collectionId', async (req, res) => {
  try {
    const col = await collectionsService.get(req.params.collectionId);
    if (!col) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: col });
  } catch (error) {
    logger.error('Error getting collection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.patch('/:collectionId', async (req, res) => {
  try {
    const updated = await collectionsService.update(
      req.params.collectionId,
      req.body || {}
    );
    if (!updated) {
      return res.status(404).json({ success: false, error: 'Not found' });
    }
    res.json({ success: true, data: updated });
  } catch (error) {
    logger.error('Error updating collection:', error);
    res.status(400).json({ success: false, error: error.message });
  }
});

router.post('/:collectionId/documents', async (req, res) => {
  try {
    const { documentIds } = req.body || {};
    if (!Array.isArray(documentIds)) {
      return res
        .status(400)
        .json({ success: false, error: 'documentIds must be an array' });
    }
    const col = await collectionsService.addDocuments(
      req.params.collectionId,
      documentIds
    );
    res.json({ success: true, data: col });
  } catch (error) {
    logger.error('Error adding to collection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:collectionId/documents/:documentId', async (req, res) => {
  try {
    const col = await collectionsService.removeDocument(
      req.params.collectionId,
      req.params.documentId
    );
    res.json({ success: true, data: col });
  } catch (error) {
    logger.error('Error removing from collection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

router.delete('/:collectionId', async (req, res) => {
  try {
    const out = await collectionsService.remove(req.params.collectionId);
    res.json({ success: true, data: out });
  } catch (error) {
    logger.error('Error deleting collection:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
