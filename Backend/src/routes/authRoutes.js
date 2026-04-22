const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { ObjectId } = require('mongodb');
const { getDB } = require('../config/database');
const requireAuth = require('../middleware/auth');
const requireAdmin = require('../middleware/requireAdmin');
const logger = require('../utils/logger');

const JWT_SECRET = process.env.JWT_SECRET || 'smachs-secret-change-in-production';
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || '7d';

function signToken(userId) {
  return jwt.sign({ userId }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
}

// ─── POST /api/auth/login ────────────────────────────────────────────────────
router.post('/login', async (req, res) => {
  try {
    const { username, password } = req.body || {};
    if (!username || !password) {
      return res.status(400).json({ success: false, error: 'Username and password required' });
    }

    const db = getDB();
    const user = await db.collection('users').findOne({
      $or: [{ username: username.trim() }, { email: username.trim().toLowerCase() }]
    });

    if (!user) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }
    if (!user.isActive) {
      return res.status(401).json({ success: false, error: 'Account is inactive. Contact admin.' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      return res.status(401).json({ success: false, error: 'Invalid credentials' });
    }

    // Update last login
    await db.collection('users').updateOne(
      { _id: user._id },
      { $set: { lastLoginAt: new Date() } }
    );

    const token = signToken(user._id.toString());
    const { password: _pw, ...safeUser } = user;

    logger.info(`User logged in: ${user.username}`);
    res.json({ success: true, token, user: safeUser });
  } catch (err) {
    logger.error('Login error:', err);
    res.status(500).json({ success: false, error: 'Login failed' });
  }
});

// ─── GET /api/auth/me ────────────────────────────────────────────────────────
router.get('/me', requireAuth, (req, res) => {
  const { password: _pw, ...safeUser } = req.user;
  res.json({ success: true, user: safeUser });
});

// ─── POST /api/auth/logout ───────────────────────────────────────────────────
router.post('/logout', requireAuth, (req, res) => {
  res.json({ success: true, message: 'Logged out' });
});

// ══════════════════════════════ ADMIN ONLY ════════════════════════════════════

// ─── GET /api/auth/users ─────────────────────────────────────────────────────
router.get('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const db = getDB();
    const users = await db.collection('users')
      .find({}, { projection: { password: 0 } })
      .sort({ createdAt: -1 })
      .toArray();
    res.json({ success: true, users });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── POST /api/auth/users ────────────────────────────────────────────────────
router.post('/users', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { username, email, password, role = 'user', displayName } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ success: false, error: 'username, email and password required' });
    }

    const db = getDB();
    const existing = await db.collection('users').findOne({
      $or: [{ username: username.trim() }, { email: email.trim().toLowerCase() }]
    });
    if (existing) {
      return res.status(409).json({ success: false, error: 'Username or email already exists' });
    }

    const hashed = await bcrypt.hash(password, 12);
    const now = new Date();
    const doc = {
      username: username.trim(),
      email: email.trim().toLowerCase(),
      password: hashed,
      displayName: displayName?.trim() || username.trim(),
      role: role === 'admin' ? 'admin' : 'user',
      isActive: true,
      createdBy: req.user._id,
      createdAt: now,
      updatedAt: now,
      lastLoginAt: null
    };

    const result = await db.collection('users').insertOne(doc);
    const { password: _pw, ...safeUser } = { ...doc, _id: result.insertedId };

    logger.info(`Admin ${req.user.username} created user: ${username}`);
    res.status(201).json({ success: true, user: safeUser });
  } catch (err) {
    logger.error('Create user error:', err);
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── PUT /api/auth/users/:id ─────────────────────────────────────────────────
router.put('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    const { displayName, email, password, isActive, role } = req.body || {};
    const db = getDB();
    const update = { updatedAt: new Date() };

    if (displayName !== undefined) update.displayName = displayName.trim();
    if (email !== undefined) update.email = email.trim().toLowerCase();
    if (isActive !== undefined) update.isActive = Boolean(isActive);
    if (role !== undefined) update.role = role === 'admin' ? 'admin' : 'user';
    if (password) update.password = await bcrypt.hash(password, 12);

    await db.collection('users').updateOne(
      { _id: new ObjectId(req.params.id) },
      { $set: update }
    );

    const updated = await db.collection('users').findOne(
      { _id: new ObjectId(req.params.id) },
      { projection: { password: 0 } }
    );
    res.json({ success: true, user: updated });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

// ─── DELETE /api/auth/users/:id ──────────────────────────────────────────────
router.delete('/users/:id', requireAuth, requireAdmin, async (req, res) => {
  try {
    if (req.params.id === req.userId) {
      return res.status(400).json({ success: false, error: 'Cannot delete your own account' });
    }
    const db = getDB();
    await db.collection('users').deleteOne({ _id: new ObjectId(req.params.id) });
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ success: false, error: err.message });
  }
});

module.exports = router;
