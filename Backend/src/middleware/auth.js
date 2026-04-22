const jwt = require('jsonwebtoken');
const { getDB } = require('../config/database');
const { ObjectId } = require('mongodb');

const JWT_SECRET = process.env.JWT_SECRET || 'smachs-secret-change-in-production';

module.exports = async function requireAuth(req, res, next) {
  try {
    const header = req.headers['authorization'] || '';
    const token = header.startsWith('Bearer ') ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ success: false, error: 'Authentication required' });
    }

    const decoded = jwt.verify(token, JWT_SECRET);
    const db = getDB();
    const user = await db.collection('users').findOne(
      { _id: new ObjectId(decoded.userId), isActive: true },
      { projection: { password: 0 } }
    );

    if (!user) {
      return res.status(401).json({ success: false, error: 'User not found or inactive' });
    }

    req.user = user;
    req.userId = user._id.toString();
    next();
  } catch (err) {
    return res.status(401).json({ success: false, error: 'Invalid or expired token' });
  }
};
