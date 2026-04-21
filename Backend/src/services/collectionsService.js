const { v4: uuidv4 } = require('uuid');
const { getDB } = require('../config/database');
const logger = require('../utils/logger');

const COLLECTION_NAME =
  process.env.MONGODB_COLLECTIONS_COLLECTION || 'doc_collections';

class CollectionsService {
  coll() {
    return getDB().collection(COLLECTION_NAME);
  }

  async list() {
    return this.coll().find({}).sort({ updatedAt: -1, createdAt: -1 }).toArray();
  }

  async get(collectionId) {
    return this.coll().findOne({ collectionId });
  }

  async create({ name, description = '', documentIds = [] }) {
    const trimmed = (name || '').trim();
    if (!trimmed) throw new Error('name is required');
    const doc = {
      collectionId: uuidv4(),
      name: trimmed,
      description: String(description || ''),
      documentIds: Array.from(new Set(documentIds.filter(Boolean))),
      createdAt: new Date(),
      updatedAt: new Date()
    };
    await this.coll().insertOne(doc);
    return doc;
  }

  async update(collectionId, patch = {}) {
    const set = { updatedAt: new Date() };
    if (patch.name !== undefined) {
      const trimmed = String(patch.name || '').trim();
      if (!trimmed) throw new Error('name cannot be empty');
      set.name = trimmed;
    }
    if (patch.description !== undefined) {
      set.description = String(patch.description || '');
    }
    if (Array.isArray(patch.documentIds)) {
      set.documentIds = Array.from(new Set(patch.documentIds.filter(Boolean)));
    }
    const res = await this.coll().findOneAndUpdate(
      { collectionId },
      { $set: set },
      { returnDocument: 'after' }
    );
    return res.value || res; // driver version differences
  }

  async addDocuments(collectionId, documentIds = []) {
    const ids = documentIds.filter(Boolean);
    if (ids.length === 0) return this.get(collectionId);
    await this.coll().updateOne(
      { collectionId },
      {
        $addToSet: { documentIds: { $each: ids } },
        $set: { updatedAt: new Date() }
      }
    );
    return this.get(collectionId);
  }

  async removeDocument(collectionId, documentId) {
    await this.coll().updateOne(
      { collectionId },
      {
        $pull: { documentIds: documentId },
        $set: { updatedAt: new Date() }
      }
    );
    return this.get(collectionId);
  }

  async remove(collectionId) {
    const res = await this.coll().deleteOne({ collectionId });
    return { deleted: res.deletedCount === 1 };
  }

  /**
   * Resolve a collectionId to a list of documentIds. Used by query
   * scoping so queries can be limited to a collection's contents.
   */
  async resolveDocumentIds(collectionId) {
    const c = await this.get(collectionId);
    return c ? c.documentIds || [] : null;
  }
}

module.exports = new CollectionsService();
