/**
 * Run once to create the first admin account:
 *   node src/scripts/seedAdmin.js
 */
require('dotenv').config();
process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';

const bcrypt = require('bcryptjs');
const { MongoClient } = require('mongodb');

async function seed() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME;

  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminEmail    = process.env.ADMIN_EMAIL    || 'admin@smachs.ai';
  const adminPassword = process.env.ADMIN_PASSWORD || 'Admin@1234';

  const client = new MongoClient(uri, { family: 4, tlsAllowInvalidCertificates: true });
  await client.connect();
  const db = client.db(dbName);

  const existing = await db.collection('users').findOne({ username: adminUsername });
  if (existing) {
    console.log(`✅ Admin "${adminUsername}" already exists — skipping.`);
    await client.close();
    return;
  }

  const hashed = await bcrypt.hash(adminPassword, 12);
  await db.collection('users').insertOne({
    username: adminUsername,
    email: adminEmail,
    password: hashed,
    displayName: 'Admin',
    role: 'admin',
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date(),
    lastLoginAt: null
  });

  console.log('');
  console.log('✅ Admin account created!');
  console.log(`   Username : ${adminUsername}`);
  console.log(`   Email    : ${adminEmail}`);
  console.log(`   Password : ${adminPassword}`);
  console.log('');
  console.log('Change the password after first login!');
  await client.close();
}

seed().catch((err) => { console.error(err); process.exit(1); });
