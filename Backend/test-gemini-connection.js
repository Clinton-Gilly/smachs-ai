/**
 * Test Gemini API Connection
 *
 * This script tests your Gemini API key and connection
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function testGeminiConnection() {
  console.log('🧪 Testing Gemini API Connection...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
  console.log('📝 Testing with model:', process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004');
  console.log('');

  try {
    // Initialize Gemini
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Test 1: List models
    console.log('Test 1: Listing available models...');
    try {
      const model = genAI.getGenerativeModel({ model: 'gemini-1.5-flash' });
      console.log('✅ Successfully connected to Gemini API\n');
    } catch (error) {
      console.error('❌ Failed to connect:', error.message);
      throw error;
    }

    // Test 2: Generate embeddings
    console.log('Test 2: Generating embeddings...');
    const embeddingModel = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004'
    });
    
    const testText = 'This is a test sentence for embedding generation.';
    console.log(`   Text: "${testText}"`);
    
    const result = await embeddingModel.embedContent(testText);
    const embedding = result.embedding;
    
    console.log(`✅ Embedding generated successfully`);
    console.log(`   Dimensions: ${embedding.values.length}`);
    console.log(`   First 5 values: [${embedding.values.slice(0, 5).map(v => v.toFixed(4)).join(', ')}...]\n`);

    // Test 3: Generate text
    console.log('Test 3: Generating text...');
    const textModel = genAI.getGenerativeModel({ 
      model: process.env.GEMINI_MODEL || 'gemini-1.5-flash'
    });
    
    const prompt = 'Say "Hello, RAG!" in one sentence.';
    console.log(`   Prompt: "${prompt}"`);
    
    const textResult = await textModel.generateContent(prompt);
    const response = textResult.response;
    const text = response.text();
    
    console.log(`✅ Text generated successfully`);
    console.log(`   Response: "${text}"\n`);

    // Success summary
    console.log('='.repeat(70));
    console.log('✅ All tests passed! Your Gemini API is working correctly.');
    console.log('='.repeat(70));
    console.log('\n🎯 You can now use the RAG application!\n');

  } catch (error) {
    console.error('\n' + '='.repeat(70));
    console.error('❌ Gemini API Test Failed');
    console.error('='.repeat(70));
    console.error('\nError:', error.message);
    
    if (error.message.includes('fetch failed')) {
      console.error('\n💡 Possible solutions:');
      console.error('   1. Check your internet connection');
      console.error('   2. Check if you\'re behind a proxy/firewall');
      console.error('   3. Try setting a proxy: set HTTPS_PROXY=http://your-proxy:port');
      console.error('   4. Verify the API endpoint is accessible from your region');
      console.error('   5. Try using a VPN if the service is blocked in your region\n');
    } else if (error.message.includes('API key')) {
      console.error('\n💡 API Key issue:');
      console.error('   1. Verify your API key at: https://makersuite.google.com/app/apikey');
      console.error('   2. Make sure the key is active and not expired');
      console.error('   3. Check if you have quota remaining');
      console.error('   4. Regenerate the API key if needed\n');
    } else if (error.message.includes('quota')) {
      console.error('\n💡 Quota exceeded:');
      console.error('   1. Check your quota at: https://console.cloud.google.com/');
      console.error('   2. Wait for quota to reset (usually daily)');
      console.error('   3. Upgrade your plan if needed\n');
    } else {
      console.error('\n💡 General troubleshooting:');
      console.error('   1. Check the full error above');
      console.error('   2. Verify your .env file configuration');
      console.error('   3. Make sure all dependencies are installed: npm install');
      console.error('   4. Check Gemini API status: https://status.cloud.google.com/\n');
    }
    
    console.error('Stack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the test
testGeminiConnection();

