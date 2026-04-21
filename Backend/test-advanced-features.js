/**
 * Advanced RAG Features Test Script
 * Tests all world-class RAG features including:
 * - Parent Document Retrieval
 * - Multi-Query Retrieval
 * - HyDE Retrieval
 * - Ensemble Retrieval
 * - Self-Query Retrieval
 * - Streaming Responses
 * - Analytics and Feedback
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:5000/api';

// Test queries
const testQueries = {
  simple: "What is RAG?",
  complex: "Explain the differences between vector search and hybrid search in RAG systems",
  temporal: "What are recent advances in RAG from 2024?",
  specific: "Show me documents about chunking strategies"
};

// Color codes for console output
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

function logSection(title) {
  console.log('\n' + '='.repeat(80));
  log(title, 'cyan');
  console.log('='.repeat(80) + '\n');
}

async function testParentDocumentRetrieval() {
  logSection('TEST 1: Parent Document Retrieval');
  
  try {
    const response = await axios.post(`${BASE_URL}/advanced/parent-document`, {
      query: testQueries.simple,
      options: {
        topK: 20,
        parentTopK: 3
      }
    });

    log('✓ Parent Document Retrieval successful', 'green');
    log(`  Query: ${response.data.query}`);
    log(`  Response length: ${response.data.response.length} chars`);
    log(`  Contexts returned: ${response.data.contexts.length}`);
    log(`  Total time: ${response.data.metadata.totalTime}ms`);
    
    return true;
  } catch (error) {
    log(`✗ Parent Document Retrieval failed: ${error.message}`, 'red');
    return false;
  }
}

async function testMultiQueryRetrieval() {
  logSection('TEST 2: Multi-Query Retrieval');
  
  try {
    const response = await axios.post(`${BASE_URL}/advanced/multi-query`, {
      query: testQueries.complex,
      options: {
        numQueries: 3,
        topK: 10
      }
    });

    log('✓ Multi-Query Retrieval successful', 'green');
    log(`  Query: ${response.data.query}`);
    log(`  Response length: ${response.data.response.length} chars`);
    log(`  Contexts returned: ${response.data.contexts.length}`);
    log(`  Total time: ${response.data.metadata.totalTime}ms`);
    
    return true;
  } catch (error) {
    log(`✗ Multi-Query Retrieval failed: ${error.message}`, 'red');
    return false;
  }
}

async function testHyDERetrieval() {
  logSection('TEST 3: HyDE (Hypothetical Document Embeddings) Retrieval');
  
  try {
    const response = await axios.post(`${BASE_URL}/advanced/hyde`, {
      query: testQueries.simple,
      options: {
        topK: 10
      }
    });

    log('✓ HyDE Retrieval successful', 'green');
    log(`  Query: ${response.data.query}`);
    log(`  Response length: ${response.data.response.length} chars`);
    log(`  Contexts returned: ${response.data.contexts.length}`);
    log(`  Total time: ${response.data.metadata.totalTime}ms`);
    
    return true;
  } catch (error) {
    log(`✗ HyDE Retrieval failed: ${error.message}`, 'red');
    return false;
  }
}

async function testEnsembleRetrieval() {
  logSection('TEST 4: Ensemble Retrieval');
  
  try {
    const response = await axios.post(`${BASE_URL}/advanced/ensemble`, {
      query: testQueries.complex,
      options: {
        topK: 10,
        methods: ['vector', 'hybrid', 'hyde'],
        weights: {
          vector: 0.3,
          hybrid: 0.5,
          hyde: 0.2
        }
      }
    });

    log('✓ Ensemble Retrieval successful', 'green');
    log(`  Query: ${response.data.query}`);
    log(`  Response length: ${response.data.response.length} chars`);
    log(`  Contexts returned: ${response.data.contexts.length}`);
    log(`  Methods used: ${response.data.contexts[0]?.methods?.join(', ') || 'N/A'}`);
    log(`  Total time: ${response.data.metadata.totalTime}ms`);
    
    return true;
  } catch (error) {
    log(`✗ Ensemble Retrieval failed: ${error.message}`, 'red');
    return false;
  }
}

async function testSelfQueryRetrieval() {
  logSection('TEST 5: Self-Query Retrieval');
  
  try {
    const response = await axios.post(`${BASE_URL}/advanced/self-query`, {
      query: testQueries.specific,
      options: {
        topK: 10
      }
    });

    log('✓ Self-Query Retrieval successful', 'green');
    log(`  Query: ${response.data.query}`);
    log(`  Response length: ${response.data.response.length} chars`);
    log(`  Contexts returned: ${response.data.contexts.length}`);
    log(`  Total time: ${response.data.metadata.totalTime}ms`);
    
    return true;
  } catch (error) {
    log(`✗ Self-Query Retrieval failed: ${error.message}`, 'red');
    return false;
  }
}

async function testAnalytics() {
  logSection('TEST 6: Analytics and Feedback');
  
  try {
    // Get query stats
    const statsResponse = await axios.get(`${BASE_URL}/analytics/stats?timeRange=24h`);
    log('✓ Query statistics retrieved', 'green');
    log(`  Total queries: ${statsResponse.data.queryStats.totalQueries}`);
    log(`  Avg total time: ${statsResponse.data.queryStats.avgTotalTime?.toFixed(2)}ms`);
    log(`  Cache hit rate: ${statsResponse.data.cacheStats.hitRate}`);

    // Submit feedback
    const feedbackResponse = await axios.post(`${BASE_URL}/analytics/feedback`, {
      queryId: 'test-query-id',
      query: testQueries.simple,
      response: 'Test response',
      rating: 5,
      helpful: true,
      feedback: 'Great response!'
    });
    log('✓ Feedback submitted', 'green');

    // Get feedback summary
    const summaryResponse = await axios.get(`${BASE_URL}/analytics/feedback/summary?timeRange=7d`);
    log('✓ Feedback summary retrieved', 'green');
    log(`  Total feedback: ${summaryResponse.data.summary.totalFeedback}`);
    log(`  Avg rating: ${summaryResponse.data.summary.avgRating?.toFixed(2)}`);
    log(`  Helpful percentage: ${summaryResponse.data.summary.helpfulPercentage}%`);
    
    return true;
  } catch (error) {
    log(`✗ Analytics test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testCaching() {
  logSection('TEST 7: Caching Performance');
  
  try {
    const query = testQueries.simple;

    // First request (cache miss)
    const start1 = Date.now();
    await axios.post(`${BASE_URL}/query`, { query });
    const time1 = Date.now() - start1;
    log(`  First request (cache miss): ${time1}ms`, 'yellow');

    // Second request (cache hit)
    const start2 = Date.now();
    await axios.post(`${BASE_URL}/query`, { query });
    const time2 = Date.now() - start2;
    log(`  Second request (cache hit): ${time2}ms`, 'yellow');

    const speedup = ((time1 - time2) / time1 * 100).toFixed(2);
    log(`✓ Cache speedup: ${speedup}%`, 'green');
    
    return true;
  } catch (error) {
    log(`✗ Caching test failed: ${error.message}`, 'red');
    return false;
  }
}

async function testComparison() {
  logSection('TEST 8: Retrieval Method Comparison');
  
  const query = testQueries.complex;
  const results = {};

  try {
    // Test standard query
    log('Testing standard query...', 'yellow');
    const start1 = Date.now();
    const response1 = await axios.post(`${BASE_URL}/query/simple`, { query });
    results.standard = {
      time: Date.now() - start1,
      contexts: response1.data.context?.length || 0
    };

    // Test multi-query
    log('Testing multi-query retrieval...', 'yellow');
    const start2 = Date.now();
    const response2 = await axios.post(`${BASE_URL}/advanced/multi-query`, { query });
    results.multiQuery = {
      time: Date.now() - start2,
      contexts: response2.data.contexts?.length || 0
    };

    // Test ensemble
    log('Testing ensemble retrieval...', 'yellow');
    const start3 = Date.now();
    const response3 = await axios.post(`${BASE_URL}/advanced/ensemble`, { query });
    results.ensemble = {
      time: Date.now() - start3,
      contexts: response3.data.contexts?.length || 0
    };

    log('\n✓ Comparison Results:', 'green');
    console.table(results);
    
    return true;
  } catch (error) {
    log(`✗ Comparison test failed: ${error.message}`, 'red');
    return false;
  }
}

async function runAllTests() {
  log('\n🚀 Starting Advanced RAG Features Test Suite\n', 'cyan');
  
  const results = {
    passed: 0,
    failed: 0
  };

  // Run all tests
  const tests = [
    testParentDocumentRetrieval,
    testMultiQueryRetrieval,
    testHyDERetrieval,
    testEnsembleRetrieval,
    testSelfQueryRetrieval,
    testAnalytics,
    testCaching,
    testComparison
  ];

  for (const test of tests) {
    const passed = await test();
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    await new Promise(resolve => setTimeout(resolve, 1000)); // Wait between tests
  }

  // Summary
  logSection('TEST SUMMARY');
  log(`Total Tests: ${results.passed + results.failed}`, 'cyan');
  log(`Passed: ${results.passed}`, 'green');
  log(`Failed: ${results.failed}`, results.failed > 0 ? 'red' : 'green');
  
  if (results.failed === 0) {
    log('\n🎉 All tests passed!', 'green');
  } else {
    log('\n⚠️  Some tests failed. Check the logs above.', 'yellow');
  }
}

// Run tests
runAllTests().catch(error => {
  log(`\n❌ Test suite failed: ${error.message}`, 'red');
  process.exit(1);
});

