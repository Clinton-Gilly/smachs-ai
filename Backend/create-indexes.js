const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { MongoClient } = require('mongodb');

async function createIndexes() {
  const uri = process.env.MONGODB_URI;
  const dbName = process.env.MONGODB_DB_NAME || 'rag_database';
  const collectionName = process.env.MONGODB_COLLECTION || 'documents';

  if (!uri) {
    console.error('❌ MONGODB_URI not found in .env file');
    console.error('Please make sure .env file exists in server/ directory');
    process.exit(1);
  }

  console.log('🔧 Creating MongoDB Indexes...\n');
  console.log(`Database: ${dbName}`);
  console.log(`Collection: ${collectionName}\n`);

  const client = new MongoClient(uri);

  try {
    await client.connect();
    console.log('✅ Connected to MongoDB\n');

    const db = client.db(dbName);
    const collection = db.collection(collectionName);

    // Get existing indexes
    console.log('📋 Checking existing indexes...');
    const existingIndexes = await collection.listIndexes().toArray();
    console.log('Existing indexes:', existingIndexes.map(idx => idx.name).join(', '));
    console.log('');

    // 1. Create Text Index for keyword search
    console.log('📝 Creating text index for keyword search...');
    try {
      const textIndexExists = existingIndexes.some(idx => idx.name === 'text_index');
      if (!textIndexExists) {
        await collection.createIndex(
          { content: "text", "metadata.title": "text" },
          { 
            name: "text_index",
            weights: {
              content: 10,
              "metadata.title": 5
            }
          }
        );
        console.log('✅ Text index created successfully');
      } else {
        console.log('ℹ️  Text index already exists');
      }
    } catch (error) {
      console.error('❌ Error creating text index:', error.message);
    }
    console.log('');

    // 2. Create Vector Search Index (Atlas Search Index)
    console.log('🔍 Creating vector search index...');
    console.log('⚠️  NOTE: Vector search index must be created in MongoDB Atlas UI');
    console.log('   Go to: Atlas Console → Database → Search → Create Search Index');
    console.log('   Use the following configuration:\n');
    console.log(JSON.stringify({
      "name": "vector_index",
      "type": "vectorSearch",
      "definition": {
        "fields": [
          {
            "type": "vector",
            "path": "embedding",
            "numDimensions": parseInt(process.env.EMBEDDING_DIMENSIONS) || 768,
            "similarity": "cosine"
          }
        ]
      }
    }, null, 2));
    console.log('');

    // 3. Create metadata indexes
    console.log('📊 Creating metadata indexes...');
    
    try {
      await collection.createIndex({ documentId: 1 }, { name: "documentId_index" });
      console.log('✅ documentId index created');
    } catch (error) {
      console.log('ℹ️  documentId index already exists');
    }

    try {
      await collection.createIndex({ "metadata.timestamp": -1 }, { name: "timestamp_index" });
      console.log('✅ timestamp index created');
    } catch (error) {
      console.log('ℹ️  timestamp index already exists');
    }

    try {
      await collection.createIndex({ "metadata.category": 1 }, { name: "category_index" });
      console.log('✅ category index created');
    } catch (error) {
      console.log('ℹ️  category index already exists');
    }

    try {
      await collection.createIndex({ chunkId: 1 }, { name: "chunkId_index" });
      console.log('✅ chunkId index created');
    } catch (error) {
      console.log('ℹ️  chunkId index already exists');
    }

    console.log('');

    // List all indexes after creation
    console.log('📋 Final index list:');
    const finalIndexes = await collection.listIndexes().toArray();
    finalIndexes.forEach(idx => {
      console.log(`  - ${idx.name}: ${JSON.stringify(idx.key)}`);
    });

    console.log('\n✅ Index creation complete!');
    console.log('\n⚠️  IMPORTANT: Make sure to create the vector_index in Atlas UI (see instructions above)');

  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    await client.close();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

createIndexes();

