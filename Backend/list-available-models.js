/**
 * List Available Gemini Models
 * 
 * This script lists all models available for your API key
 */

const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const { GoogleGenerativeAI } = require('@google/generative-ai');

async function listAvailableModels() {
  console.log('🔍 Listing Available Gemini Models...\n');

  const apiKey = process.env.GEMINI_API_KEY;
  
  if (!apiKey) {
    console.error('❌ GEMINI_API_KEY not found in .env file');
    process.exit(1);
  }

  console.log('✅ API Key found:', apiKey.substring(0, 10) + '...' + apiKey.substring(apiKey.length - 4));
  console.log('');

  try {
    const genAI = new GoogleGenerativeAI(apiKey);
    
    // Try to list models using the API
    console.log('📋 Attempting to fetch available models...\n');
    
    // Test common model names
    const modelsToTest = [
      'gemini-pro',
      'gemini-1.5-pro',
      'gemini-1.5-flash',
      'gemini-1.5-flash-latest',
      'gemini-1.0-pro',
      'gemini-1.0-pro-latest',
      'gemini-2.0-flash',
      'gemini-2.0-flash-lite',
      'gemini-2.5-flash',
      'gemini-2.5-flash-lite',
      'text-embedding-004',
      'embedding-001',
    ];

    console.log('Testing common model names:\n');
    const availableModels = [];
    
    for (const modelName of modelsToTest) {
      try {
        const model = genAI.getGenerativeModel({ model: modelName });
        
        // Try to generate content for text models
        if (!modelName.includes('embedding')) {
          try {
            const result = await model.generateContent('Hello');
            console.log(`✅ ${modelName.padEnd(30)} - AVAILABLE (Text Generation)`);
            availableModels.push({ name: modelName, type: 'text', status: 'available' });
          } catch (error) {
            if (error.message.includes('404')) {
              console.log(`❌ ${modelName.padEnd(30)} - NOT AVAILABLE`);
            } else {
              console.log(`⚠️  ${modelName.padEnd(30)} - ERROR: ${error.message.substring(0, 50)}...`);
            }
          }
        } else {
          // Try to generate embeddings
          try {
            const result = await model.embedContent('Hello');
            console.log(`✅ ${modelName.padEnd(30)} - AVAILABLE (Embeddings)`);
            availableModels.push({ name: modelName, type: 'embedding', status: 'available' });
          } catch (error) {
            if (error.message.includes('404')) {
              console.log(`❌ ${modelName.padEnd(30)} - NOT AVAILABLE`);
            } else {
              console.log(`⚠️  ${modelName.padEnd(30)} - ERROR: ${error.message.substring(0, 50)}...`);
            }
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 500));
        
      } catch (error) {
        console.log(`❌ ${modelName.padEnd(30)} - ERROR: ${error.message.substring(0, 50)}...`);
      }
    }

    console.log('\n' + '='.repeat(70));
    console.log('📊 Summary');
    console.log('='.repeat(70));
    
    if (availableModels.length === 0) {
      console.log('\n❌ No models found. This might indicate:');
      console.log('   1. API key is invalid');
      console.log('   2. API key doesn\'t have proper permissions');
      console.log('   3. Network/firewall issues\n');
      process.exit(1);
    }

    console.log(`\n✅ Found ${availableModels.length} available models:\n`);
    
    const textModels = availableModels.filter(m => m.type === 'text');
    const embeddingModels = availableModels.filter(m => m.type === 'embedding');
    
    if (textModels.length > 0) {
      console.log('📝 Text Generation Models:');
      textModels.forEach(m => console.log(`   - ${m.name}`));
      console.log('');
    }
    
    if (embeddingModels.length > 0) {
      console.log('🔢 Embedding Models:');
      embeddingModels.forEach(m => console.log(`   - ${m.name}`));
      console.log('');
    }

    console.log('💡 Recommended .env configuration:\n');
    
    if (textModels.length > 0) {
      const recommendedTextModel = textModels[0].name;
      console.log(`GEMINI_MODEL=${recommendedTextModel}`);
    } else {
      console.log('# No text generation models available!');
      console.log('# You may need to upgrade your API key or use a different service');
    }
    
    if (embeddingModels.length > 0) {
      const recommendedEmbeddingModel = embeddingModels[0].name;
      console.log(`GEMINI_EMBEDDING_MODEL=${recommendedEmbeddingModel}`);
    }
    
    console.log('\n' + '='.repeat(70));
    console.log('✅ Model discovery complete!');
    console.log('='.repeat(70));
    console.log('\n💡 Update your .env file with the recommended models above.\n');

  } catch (error) {
    console.error('\n❌ Error:', error.message);
    console.error('\nStack trace:');
    console.error(error.stack);
    process.exit(1);
  }
}

// Run the script
listAvailableModels();

