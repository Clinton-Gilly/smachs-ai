/**
 * Simple test script to verify the RAG API is working
 * Run with: node test-api.js
 */

const axios = require('axios');
const fs = require('fs');
const FormData = require('form-data');

const BASE_URL = 'http://localhost:5000/api';

// Colors for console output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  cyan: '\x1b[36m'
};

function log(message, color = 'reset') {
  console.log(`${colors[color]}${message}${colors.reset}`);
}

async function testHealthCheck() {
  log('\n1. Testing Health Check...', 'cyan');
  try {
    const response = await axios.get(`${BASE_URL}/health`);
    log('✓ Health check passed', 'green');
    log(`  Status: ${response.data.status}`, 'blue');
    log(`  MongoDB: ${response.data.services.mongodb}`, 'blue');
    log(`  Gemini: ${response.data.services.gemini}`, 'blue');
    return true;
  } catch (error) {
    log('✗ Health check failed', 'red');
    log(`  Error: ${error.message}`, 'red');
    return false;
  }
}

async function testTextUpload() {
  log('\n2. Testing Text Upload...', 'cyan');
  try {
    const response = await axios.post(`${BASE_URL}/documents/text`, {
      text: `Retrieval-Augmented Generation (RAG) is a powerful technique that combines the strengths of retrieval-based and generation-based approaches in natural language processing. 
      
      RAG systems work by first retrieving relevant documents from a knowledge base using vector similarity search, then using those documents as context for a large language model to generate accurate, grounded responses.
      
      The main components of a RAG system include:
      1. An embedding model to convert text into vector representations
      2. A vector database to store and search document embeddings
      3. A retrieval mechanism to find relevant context
      4. A generative language model to produce answers
      
      Advanced RAG techniques include query rewriting, hybrid search, re-ranking, and context compression.`,
      metadata: {
        category: 'test',
        author: 'Test Script',
        tags: ['rag', 'test'],
        description: 'Test document for API verification'
      }
    });

    log('✓ Text upload successful', 'green');
    log(`  Document ID: ${response.data.data.documentId}`, 'blue');
    log(`  Chunks created: ${response.data.data.chunksCreated}`, 'blue');
    return response.data.data.documentId;
  } catch (error) {
    log('✗ Text upload failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return null;
  }
}

async function testSimpleQuery() {
  log('\n3. Testing Simple Query...', 'cyan');
  try {
    const response = await axios.post(`${BASE_URL}/query/simple`, {
      query: 'What is RAG?',
      topK: 3
    });

    log('✓ Simple query successful', 'green');
    log(`  Query: ${response.data.query}`, 'blue');
    log(`  Response: ${response.data.response.substring(0, 150)}...`, 'blue');
    log(`  Contexts retrieved: ${response.data.context.length}`, 'blue');
    return true;
  } catch (error) {
    log('✗ Simple query failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testAdvancedQuery() {
  log('\n4. Testing Advanced Query with Optimizations...', 'cyan');
  try {
    const response = await axios.post(`${BASE_URL}/query`, {
      query: 'What are the main components of a RAG system?',
      options: {
        useQueryRewriting: true,
        useHybridSearch: true,
        useReranking: false, // Disable if no Cohere key
        topK: 5
      }
    });

    log('✓ Advanced query successful', 'green');
    log(`  Original query: ${response.data.query}`, 'blue');
    log(`  Processed query: ${response.data.processedQuery}`, 'blue');
    log(`  Response: ${response.data.response.substring(0, 150)}...`, 'blue');
    log(`  Contexts retrieved: ${response.data.metadata.totalContextsRetrieved}`, 'blue');
    log(`  Contexts used: ${response.data.metadata.finalContextsUsed}`, 'blue');
    
    const opts = response.data.metadata.optimizations;
    log(`  Optimizations used:`, 'yellow');
    log(`    - Query Rewriting: ${opts.queryRewriting}`, 'yellow');
    log(`    - Hybrid Search: ${opts.hybridSearch}`, 'yellow');
    log(`    - Re-ranking: ${opts.reranking}`, 'yellow');
    
    return true;
  } catch (error) {
    log('✗ Advanced query failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testQueryRouting() {
  log('\n5. Testing Intelligent Query Routing...', 'cyan');
  try {
    const response = await axios.post(`${BASE_URL}/query/route`, {
      query: 'Compare vector search and keyword search'
    });

    log('✓ Query routing successful', 'green');
    log(`  Response: ${response.data.response.substring(0, 150)}...`, 'blue');
    return true;
  } catch (error) {
    log('✗ Query routing failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testStats() {
  log('\n6. Testing Document Statistics...', 'cyan');
  try {
    const response = await axios.get(`${BASE_URL}/documents/stats`);
    
    log('✓ Stats retrieval successful', 'green');
    log(`  Total documents: ${response.data.data.totalDocuments}`, 'blue');
    log(`  Total chunks: ${response.data.data.totalChunks}`, 'blue');
    return true;
  } catch (error) {
    log('✗ Stats retrieval failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function testDeleteDocument(documentId) {
  if (!documentId) {
    log('\n7. Skipping document deletion (no document ID)', 'yellow');
    return true;
  }

  log('\n7. Testing Document Deletion...', 'cyan');
  try {
    await axios.delete(`${BASE_URL}/documents/${documentId}`);
    log('✓ Document deletion successful', 'green');
    return true;
  } catch (error) {
    log('✗ Document deletion failed', 'red');
    log(`  Error: ${error.response?.data?.error || error.message}`, 'red');
    return false;
  }
}

async function runTests() {
  log('='.repeat(60), 'cyan');
  log('Advanced RAG API Test Suite', 'cyan');
  log('='.repeat(60), 'cyan');

  const results = {
    passed: 0,
    failed: 0
  };

  // Test 1: Health Check
  if (await testHealthCheck()) {
    results.passed++;
  } else {
    results.failed++;
    log('\n⚠ Server is not healthy. Stopping tests.', 'red');
    return;
  }

  // Wait a bit for server to be ready
  await new Promise(resolve => setTimeout(resolve, 1000));

  // Test 2: Upload Text
  const documentId = await testTextUpload();
  if (documentId) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Wait for indexing
  await new Promise(resolve => setTimeout(resolve, 2000));

  // Test 3: Simple Query
  if (await testSimpleQuery()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 4: Advanced Query
  if (await testAdvancedQuery()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 5: Query Routing
  if (await testQueryRouting()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 6: Stats
  if (await testStats()) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Test 7: Delete Document
  if (await testDeleteDocument(documentId)) {
    results.passed++;
  } else {
    results.failed++;
  }

  // Summary
  log('\n' + '='.repeat(60), 'cyan');
  log('Test Summary', 'cyan');
  log('='.repeat(60), 'cyan');
  log(`✓ Passed: ${results.passed}`, 'green');
  log(`✗ Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  log('='.repeat(60), 'cyan');

  if (results.failed === 0) {
    log('\n🎉 All tests passed! Your RAG API is working correctly.', 'green');
  } else {
    log('\n⚠ Some tests failed. Please check the errors above.', 'yellow');
  }
}

// Run tests
runTests().catch(error => {
  log('\n✗ Test suite failed with error:', 'red');
  log(error.message, 'red');
  process.exit(1);
});

