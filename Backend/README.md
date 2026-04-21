# 🚀 World-Class Advanced RAG Application

> A production-ready Retrieval-Augmented Generation (RAG) system implementing cutting-edge techniques from Weaviate, LangChain, and production RAG systems. Built with Node.js, MongoDB Atlas Vector Search, Google Gemini AI, and Redis caching.

[![Node.js](https://img.shields.io/badge/Node.js-16+-green.svg)](https://nodejs.org/)
[![MongoDB](https://img.shields.io/badge/MongoDB-Atlas-green.svg)](https://www.mongodb.com/atlas)
[![Gemini AI](https://img.shields.io/badge/Gemini-AI-blue.svg)](https://ai.google.dev/)
[![License](https://img.shields.io/badge/license-ISC-blue.svg)](LICENSE)

---

## 💰 **100% FREE TO USE!**

This application is **fully optimized** for Gemini API's **FREE tier**:
- ✅ **No credit card required**
- ✅ **15 requests/minute, 200 requests/day** (plenty for development!)
- ✅ **Automatic rate limiting** prevents exceeding limits
- ✅ **Token optimization** reduces usage by 30-70%
- ✅ **Intelligent caching** reduces API calls by 60-80%
- ✅ **Real-time usage monitoring** dashboard

**See [FREE TIER OPTIMIZATION](#-free-tier-optimization) section for details!**

---

## 📑 Table of Contents

- [💰 FREE TIER OPTIMIZATION](#-free-tier-optimization) ⭐ **Start here!**
- [Overview](#-overview)
- [Features](#-features)
- [Tech Stack](#-tech-stack)
- [Quick Start](#-quick-start-5-minutes)
- [Installation](#-installation)
- [Configuration](#-configuration)
- [API Documentation](#-api-documentation)
- [Advanced Features](#-advanced-features)
- [Architecture](#-architecture)
- [Testing](#-testing)
- [Deployment](#-deployment)
- [Performance Tuning](#-performance-tuning)
- [Troubleshooting](#-troubleshooting)

---

## 🎯 Overview

This is a **world-class RAG application** that implements advanced retrieval and generation techniques inspired by:
- **Weaviate Advanced RAG Techniques Guide**
- **LangChain Production Patterns**
- **State-of-the-art Research Papers**

### What Makes This World-Class?

✅ **5 Advanced Retrieval Methods** (Parent Document, Multi-Query, HyDE, Ensemble, Self-Query)

✅ **Redis Caching Layer** (Embeddings, Queries, LLM Responses)

✅ **Server-Sent Events Streaming** (Real-time response streaming)

✅ **Analytics & Feedback System** (Query performance tracking, user feedback)

✅ **Production-Ready** (Security, Rate Limiting, Compression, Monitoring)

✅ **4 Chunking Strategies** (Fixed, Recursive, Semantic, Document-based)

✅ **Hybrid Search** (Vector + Keyword with RRF)

✅ **Re-ranking** (Cohere rerank-english-v3.0)

✅ **Query Optimization** (Rewriting, Expansion, Decomposition, Routing)

✅ **Context Compression** (LLM-based extraction)

✅ **Chain of Thought** (Step-by-step reasoning)

---

## ✨ Features

### 🔍 Advanced Retrieval Methods

#### 1. **Parent Document Retrieval**
- Retrieves small chunks for precision
- Returns larger parent documents for context
- Best for: Comprehensive answers with precise retrieval

#### 2. **Multi-Query Retrieval**
- Generates 3-5 query variations automatically
- Retrieves documents for each variation
- Merges results using Reciprocal Rank Fusion (RRF)
- Best for: Improving recall with different phrasings

#### 3. **HyDE (Hypothetical Document Embeddings)**
- Generates hypothetical answer to query
- Embeds hypothetical answer instead of query
- Retrieves documents similar to hypothetical answer
- Best for: When query and document language differ

#### 4. **Ensemble Retrieval**
- Combines multiple retrieval strategies (vector, hybrid, HyDE, multi-query)
- Configurable weights for each method
- Weighted RRF for merging results
- Best for: Maximum retrieval quality

#### 5. **Self-Query Retrieval**
- Extracts metadata filters from natural language
- Separates semantic query from metadata constraints
- Automatic filter application
- Best for: "Show me AI papers from 2024" → auto-extracts date filter

### 💾 Caching System

**Redis-Based Caching** (with in-memory fallback):
- **Embedding Cache**: Text → Vector mappings (24h TTL)
- **Query Result Cache**: Query → Results (30min TTL)
- **LLM Response Cache**: Prompt → Response (1h TTL)
- **Pattern Invalidation**: Clear cache by pattern
- **Cache Statistics**: Hit rate, backend type, memory size

**Benefits**:
- Reduces API calls to Gemini and Cohere
- Dramatically reduces latency for repeated queries
- Saves costs on embedding and LLM generation

### 📡 Streaming Responses

**Server-Sent Events (SSE)** for real-time streaming:
- Stream LLM tokens as they're generated
- Show RAG pipeline progress in real-time
- Better UX for long responses

**Streaming Events**:
- `start`: Query processing started
- `step`: Pipeline step progress
- `context`: Retrieved contexts
- `chunk`: LLM response chunks
- `complete`: Full response completed
- `error`: Error occurred

### 📊 Analytics & Feedback

**Query Analytics**:
- Track query performance (latency, retrieval time, generation time)
- Monitor retrieval method effectiveness
- Identify slow queries
- Popular queries tracking

**User Feedback System**:
- Collect ratings (1-5 stars)
- Thumbs up/down feedback
- Text feedback and comments
- Issue categorization
- Feedback summary and analytics

### 🔐 Production Features

**Security**:
- Helmet.js for security headers
- CORS configuration
- Rate limiting (100 req/15min general, 50 req/15min for queries)
- Input validation

**Performance**:
- Response compression (gzip)
- Connection pooling for MongoDB
- Batch embedding generation
- Efficient RRF algorithm

**Monitoring**:
- Request/response logging with timing
- Error tracking
- Cache statistics
- Analytics dashboard data

**Reliability**:
- Graceful error handling
- Fallback mechanisms
- Retry logic for external APIs
- Graceful shutdown

### 📝 Document Processing

**Supported Formats**: PDF, DOCX, TXT, Markdown

**4 Chunking Strategies**:
1. **Fixed-size**: Fast, simple, good for general content
2. **Recursive**: Respects document structure (paragraphs → sentences)
3. **Semantic**: Groups semantically similar content using embeddings
4. **Document-based**: Preserves section boundaries (Markdown headings)

**Pre-processing**:
- Text extraction and cleaning
- Metadata enrichment
- Chunk overlap for context preservation

### 🎯 Query Optimization

**Pre-Retrieval**:
- **Query Rewriting**: LLM-based query optimization
- **Query Expansion**: Generate multiple query variations
- **Query Decomposition**: Break complex queries into sub-queries
- **Query Routing**: Intelligent routing to specialized pipelines

**Retrieval**:
- **Vector Search**: Cosine similarity with HNSW index
- **Keyword Search**: BM25 text search
- **Hybrid Search**: RRF algorithm combining vector + keyword
- **Metadata Filtering**: Category, date, author, tags
- **Distance Thresholding**: Exclude low-quality matches

**Post-Retrieval**:
- **Re-ranking**: Cohere rerank-english-v3.0 model
- **Context Compression**: LLM-based extraction of relevant content
- **Context Deduplication**: Remove duplicate chunks
- **Chain of Thought**: Step-by-step reasoning for complex queries

---

## 🛠️ Tech Stack

### Backend
- **Node.js** + **Express.js** - Server framework
- **MongoDB Atlas** - Vector database with HNSW index
- **Redis** - Caching layer

### AI/ML
- **Google Gemini AI** (FREE TIER)
  - LLM: `gemini-2.5-flash` or `gemini-2.0-flash` (FREE)
  - Embeddings: `text-embedding-004` (768 dimensions, FREE)
  - Rate Limits: 15 RPM, 1M TPM, 200 RPD
- **Cohere AI**
  - Re-ranking: `rerank-english-v3.0`

### Libraries
- `@google/generative-ai` - Gemini SDK
- `cohere-ai` - Cohere SDK
- `redis` - Redis client
- `helmet` - Security headers
- `compression` - Response compression
- `express-rate-limit` - Rate limiting
- `winston` - Logging
- `natural` - NLP utilities
- `pdf-parse` - PDF extraction
- `mammoth` - DOCX extraction
- `marked` - Markdown parsing

---

## ⚡ Quick Start (5 Minutes)

### Step 1: Install Dependencies

```bash
cd server
npm install
```

### Step 2: Set Up MongoDB

You have **two options**: MongoDB Atlas (recommended) or Local MongoDB (development only).

#### **Option A: MongoDB Atlas (Recommended)** ✅

1. **Create Free Account**: Go to [MongoDB Atlas](https://www.mongodb.com/cloud/atlas)
2. **Create FREE M0 Cluster** (512MB, perfect for development!)
3. **Create Database User**: Username/password for connection
4. **Whitelist IP**: Add `0.0.0.0/0` for development
5. **Get Connection String**: `mongodb+srv://user:pass@cluster.mongodb.net/`
6. **Create Vector Search Index** (IMPORTANT!):
   - Go to cluster → "Search" tab → "Create Search Index"
   - Database: `rag_database`, Collection: `documents`
   - Index Name: `vector_index`
   - Configuration:
   ```json
   {
     "fields": [{
       "type": "vector",
       "path": "embedding",
       "numDimensions": 768,
       "similarity": "cosine"
     }]
   }
   ```

**See [MongoDB Setup Guide](#-mongodb-setup-guide) below for detailed instructions.**

#### **Option B: Local MongoDB (Development Only)** ⚠️

```bash
# Install MongoDB locally
brew install mongodb-community@7.0  # macOS
# OR download from mongodb.com for Windows/Linux

# Start MongoDB
brew services start mongodb-community@7.0

# Create indexes (REQUIRED!)
cd server
node create-indexes.js
```

**Note**: Local MongoDB uses fallback vector search (slower). Atlas recommended!

### Step 3: Get API Keys (100% FREE!)

**Google Gemini API Key** (FREE TIER):
1. Go to [Google AI Studio](https://aistudio.google.com/app/apikey)
2. Click "Get API Key" or "Create API Key"
3. Copy your API key
4. **FREE Limits**: 15 requests/min, 1M tokens/min, 200 requests/day
5. **No credit card required!**

**Cohere API Key** (Optional, for re-ranking):
1. Go to [Cohere Dashboard](https://dashboard.cohere.com/)
2. Sign up for free account
3. Copy your API key

### Step 4: Configure Environment

```bash
cp .env.example .env
```

Edit `.env` file:

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=rag_database

# Gemini AI (FREE TIER)
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Rate Limits (FREE TIER - automatically enforced)
GEMINI_RPM_LIMIT=15
GEMINI_TPM_LIMIT=1000000
GEMINI_RPD_LIMIT=200

# Cohere (optional, for re-ranking)
COHERE_API_KEY=your_cohere_api_key_here

# Caching (HIGHLY RECOMMENDED for free tier)
ENABLE_REDIS_CACHE=true

# Server
PORT=5000
NODE_ENV=development
```

### Step 5: Start the Server

```bash
# Development mode (auto-reload)
npm run dev

# Or production mode
npm start
```

You should see:
```
🚀 RAG Server running on port 5000
MongoDB connected successfully
Vector search index created successfully
```

### Step 6: Test the API

**Check Health**:
```bash
curl http://localhost:5000/api/health
```

**Upload a Document**:
```bash
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@../tutorial/weaviate.md" \
  -F "category=tutorial"
```

**Ask a Question**:
```bash
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is semantic chunking?"}'
```

🎉 **Success!** You now have a world-class RAG system running!

---

## 📦 Installation

### Prerequisites

- **Node.js** 16+ and npm
- **MongoDB Atlas** account with Vector Search enabled
- **Google Gemini** API key
- **Cohere** API key (optional, for re-ranking)
- **Redis** (optional, for caching)

### Full Installation

```bash
# 1. Clone repository
git clone <your-repo-url>
cd server

# 2. Install dependencies
npm install

# 3. Configure environment
cp .env.example .env
# Edit .env with your credentials

# 4. (Optional) Start Redis for caching
docker run -d -p 6379:6379 redis

# 5. Start server
npm run dev

# 6. Run tests
npm run test:all
```

---

## ⚙️ Configuration

### Environment Variables

All features are configurable via `.env` file. See `.env.example` for all options.

#### MongoDB Configuration
```env
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/
MONGODB_DB_NAME=rag_database
MONGODB_COLLECTION=documents
```

#### AI Configuration
```env
# Google Gemini
GEMINI_API_KEY=your_gemini_api_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Cohere (for re-ranking)
COHERE_API_KEY=your_cohere_api_key
```

#### Server Configuration
```env
PORT=5000
NODE_ENV=development
LOG_LEVEL=info
```

#### Vector Search Configuration
```env
EMBEDDING_DIMENSIONS=768
CHUNK_SIZE=1000
CHUNK_OVERLAP=200
MAX_CHUNKS_PER_DOCUMENT=1000
```

#### Retrieval Configuration
```env
DEFAULT_TOP_K=20
RERANK_TOP_K=5
HYBRID_SEARCH_ALPHA=0.5
DISTANCE_THRESHOLD=0.7
USE_AUTOCUT=true
```

#### LLM Configuration
```env
LLM_TEMPERATURE=0.7
MAX_TOKENS=2000
TOP_P=0.95
TOP_K=40
```

#### Feature Flags - Basic RAG
```env
ENABLE_QUERY_REWRITING=true
ENABLE_QUERY_EXPANSION=true
ENABLE_QUERY_DECOMPOSITION=true
ENABLE_RERANKING=true
ENABLE_CONTEXT_COMPRESSION=true
ENABLE_HYBRID_SEARCH=true
```

#### Feature Flags - Advanced Retrieval
```env
ENABLE_PARENT_DOCUMENT_RETRIEVAL=false
ENABLE_MULTI_QUERY_RETRIEVAL=false
ENABLE_HYDE_RETRIEVAL=false
ENABLE_ENSEMBLE_RETRIEVAL=false
ENABLE_SELF_QUERY_RETRIEVAL=false
```

#### Caching Configuration
```env
ENABLE_REDIS_CACHE=false
REDIS_URL=redis://localhost:6379
CACHE_EMBEDDING_TTL=86400
CACHE_QUERY_TTL=1800
CACHE_LLM_TTL=3600
```

#### Streaming Configuration
```env
ENABLE_STREAMING=true
```

#### Analytics Configuration
```env
ENABLE_ANALYTICS=true
ANALYTICS_RETENTION_DAYS=90
```

#### Chunking Strategy
```env
# Options: fixed-size, recursive, semantic, document-based
CHUNKING_STRATEGY=recursive
```

---

## 📚 API Documentation

### Base URL
```
http://localhost:5000/api
```

### Health Check

#### GET `/health`
Check server and database status.

**Request**:
```bash
curl http://localhost:5000/api/health
```

**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "vectorIndex": "ready"
}
```

---

### Document Management

```bash
# 1. Make sure you're in the root directory
cd ~/Documents/LANGCHAIN-COURSE/RAG-Docs-Python

# 2. Check server is running
curl http://localhost:5000/api/health

# 3. Check FREE tier usage before uploading
curl http://localhost:5000/api/usage/dashboard

# 4. Upload files (one by one to see progress)
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@tutorial/weaviate.md" \
  -F "category=tutorial"

curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@data/books/ai-comprehensive-guide.md" \
  -F "category=guide"

curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@data/books/langchain-setup-guide.md" \
  -F "category=guide"

# 5. Check document stats
curl http://localhost:5000/api/documents/stats

# 6. Test a query
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is semantic chunking?"}'

# 7. Check usage after uploads
curl http://localhost:5000/api/usage/dashboard

#### POST `/documents/upload`
Upload and process a document (PDF, DOCX, TXT, MD).

# Upload the Weaviate markdown tutorial

curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@tutorial/weaviate.md" \
  -F "category=tutorial" \
  -F "author=Weaviate" \
  -F 'tags=["rag", "tutorial", "weaviate"]'

```

# Upload the Weaviate PDF ebook
  ```
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@tutorial/Weaviate-Advanced-RAG-Techniques-ebook.pdf" \
  -F "category=tutorial" \
  -F "author=Weaviate" \
  -F 'tags=["rag", "advanced", "ebook"]'

  ```

# Upload AI Comprehensive Guide
```
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@data/books/ai-comprehensive-guide.md" \
  -F "category=guide" \
  -F 'tags=["ai", "guide"]'

  ```

# Upload LangChain Setup Guide
```
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@data/books/langchain-setup-guide.md" \
  -F "category=guide" \
  -F 'tags=["langchain", "setup", "guide"]'

  ```

**Response**:
```json
{
  "success": true,
  "message": "Document processed successfully",
  "documentId": "doc_123456",
  "chunksCreated": 45,
  "metadata": {
    "filename": "document.pdf",
    "category": "technical",
    "author": "John Doe",
    "tags": ["ai", "rag"]
  }
}
```

#### POST `/documents/text`
Process raw text directly.

**Request**:
```bash
curl -X POST http://localhost:5000/api/documents/text \
  -H "Content-Type: application/json" \
  -d '{
    "text": "Your text content here...",
    "metadata": {
      "title": "My Document",
      "category": "notes"
    }
  }'
```

**Response**:
```json
{
  "success": true,
  "documentId": "doc_789012",
  "chunksCreated": 12
}
```

#### DELETE `/documents/:id`
Delete a document and all its chunks.

**Request**:
```bash
curl -X DELETE http://localhost:5000/api/documents/doc_123456
```

**Response**:
```json
{
  "success": true,
  "message": "Document deleted successfully",
  "chunksDeleted": 45
}
```

#### GET `/documents/stats`
Get database statistics.

**Request**:
```bash
curl http://localhost:5000/api/documents/stats
```

**Response**:
```json
{
  "totalDocuments": 150,
  "totalChunks": 3420,
  "categories": {
    "technical": 80,
    "tutorial": 45,
    "notes": 25
  },
  "avgChunksPerDocument": 22.8
}
```

---

### Basic Query Endpoints

#### POST `/query`
Standard query with all optimizations enabled.

**Request**:
```bash
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is semantic chunking?",
    "options": {
      "topK": 20,
      "useReranking": true,
      "useHybridSearch": true
    }
  }'
```

**Response**:
```json
{
  "query": "What is semantic chunking?",
  "processedQuery": "Explain semantic chunking technique in RAG",
  "response": "Semantic chunking is a technique that...",
  "contexts": [
    {
      "content": "Semantic chunking groups...",
      "score": 0.92,
      "metadata": {
        "documentId": "doc_123",
        "category": "tutorial"
      }
    }
  ],
  "metadata": {
    "totalTime": 1250,
    "retrievalTime": 450,
    "generationTime": 800,
    "contextsRetrieved": 20,
    "contextsFinal": 5,
    "optimizations": {
      "queryRewriting": true,
      "hybridSearch": true,
      "reranking": true
    },
    "performance": {
      "totalTime": 1250,
      "retrievalTime": 450,
      "generationTime": 800
    }
  }
}
```

#### POST `/query/simple`
Basic query without optimizations (baseline).

**Request**:
```bash
curl -X POST http://localhost:5000/api/query/simple \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?"}'
```

**Response**:
```json
{
  "query": "What is RAG?",
  "response": "RAG stands for...",
  "context": [
    {
      "content": "Retrieval-Augmented Generation...",
      "score": 0.88
    }
  ]
}
```

#### POST `/query/route`
Intelligent query routing based on query type.

**Request**:
```bash
curl -X POST http://localhost:5000/api/query/route \
  -H "Content-Type: application/json" \
  -d '{"query": "Compare vector search and keyword search"}'
```

**Response**:
```json
{
  "query": "Compare vector search and keyword search",
  "route": "complex",
  "response": "Vector search and keyword search differ in...",
  "reasoning": "Step 1: Define vector search...\nStep 2: Define keyword search...",
  "contexts": [...]
}
```

#### POST `/query/advanced`
Custom query with fine-grained control.

**Request**:
```bash
curl -X POST http://localhost:5000/api/query/advanced \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Your question here",
    "metadataFilter": {
      "category": "tutorial",
      "tags": ["rag"]
    },
    "options": {
      "topK": 15,
      "rerankTopK": 3,
      "useQueryRewriting": true,
      "useQueryExpansion": false,
      "useHybridSearch": true,
      "hybridAlpha": 0.6,
      "useReranking": true,
      "useContextCompression": true
    }
  }'
```

#### POST `/query/stream` ⚡ **NEW!**
**Streaming query with Server-Sent Events (SSE) - Best UX!**

Returns response chunks as they're generated instead of waiting for completion.

**Benefits**:
- ✅ **Instant feedback** - See response within 3-5 seconds
- ✅ **Better UX** - Progressive loading instead of 30-second wait
- ✅ **Real-time streaming** - Text appears as it's generated
- ✅ **Same optimizations** - All RAG features enabled

**Request**:
```bash
curl -X POST http://localhost:5000/api/query/stream \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare vector search and keyword search",
    "options": {
      "topK": 10,
      "useHybridSearch": true
    }
  }' \
  --no-buffer
```

**Response** (Server-Sent Events):
```
event: status
data: {"status":"retrieving","message":"Retrieving context..."}

event: context
data: {"contextsRetrieved":10,"retrievalTime":2500}

event: chunk
data: {"chunk":"Vector"}

event: chunk
data: {"chunk":" search"}

event: chunk
data: {"chunk":" and"}

event: chunk
data: {"chunk":" keyword"}

event: chunk
data: {"chunk":" search"}

event: chunk
data: {"chunk":" differ"}

event: chunk
data: {"chunk":" in..."}

event: done
data: {"totalTime":5200,"tokensGenerated":150}
```

**Alternative streaming endpoint** (same functionality):
```bash
# Also available at /api/stream/query
curl -X POST http://localhost:5000/api/stream/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?"}' \
  --no-buffer
```

---

### Advanced Retrieval Endpoints

#### POST `/advanced/parent-document`
Parent document retrieval - retrieve small chunks, return large parents.

**Request**:
```bash
curl -X POST http://localhost:5000/api/advanced/parent-document \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is RAG?",
    "options": {
      "topK": 20,
      "parentTopK": 3
    }
  }'
```

**Response**:
```json
{
  "query": "What is RAG?",
  "response": "RAG (Retrieval-Augmented Generation) is...",
  "contexts": [
    {
      "content": "Full parent document content...",
      "score": 0.91,
      "matchedChunks": 3,
      "metadata": {...}
    }
  ],
  "metadata": {
    "retrievalMethod": "parent-document",
    "totalTime": 1100
  }
}
```

#### POST `/advanced/multi-query`
Multi-query retrieval - generate query variations and merge results.

**Request**:
```bash
curl -X POST http://localhost:5000/api/advanced/multi-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain hybrid search",
    "options": {
      "numQueries": 3,
      "topK": 10
    }
  }'
```

**Response**:
```json
{
  "query": "Explain hybrid search",
  "generatedQueries": [
    "Explain hybrid search",
    "What is hybrid search in RAG?",
    "How does hybrid search combine vector and keyword search?"
  ],
  "response": "Hybrid search combines...",
  "contexts": [...],
  "metadata": {
    "retrievalMethod": "multi-query",
    "queriesGenerated": 3
  }
}
```

#### POST `/advanced/hyde`
HyDE retrieval - generate hypothetical document and retrieve similar.

**Request**:
```bash
curl -X POST http://localhost:5000/api/advanced/hyde \
  -H "Content-Type: application/json" \
  -d '{
    "query": "What is semantic chunking?",
    "options": {
      "topK": 10
    }
  }'
```

**Response**:
```json
{
  "query": "What is semantic chunking?",
  "hypotheticalDocument": "Semantic chunking is a technique that groups...",
  "response": "Semantic chunking is...",
  "contexts": [...],
  "metadata": {
    "retrievalMethod": "hyde"
  }
}
```

#### POST `/advanced/ensemble`
Ensemble retrieval - combine multiple retrieval methods with weights.

**Request**:
```bash
curl -X POST http://localhost:5000/api/advanced/ensemble \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Compare chunking strategies",
    "options": {
      "topK": 10,
      "methods": ["vector", "hybrid", "hyde"],
      "weights": {
        "vector": 0.3,
        "hybrid": 0.5,
        "hyde": 0.2
      }
    }
  }'
```

**Response**:
```json
{
  "query": "Compare chunking strategies",
  "response": "Different chunking strategies include...",
  "contexts": [
    {
      "content": "...",
      "score": 0.94,
      "methods": ["vector", "hybrid", "hyde"],
      "weightedScore": 0.89
    }
  ],
  "metadata": {
    "retrievalMethod": "ensemble",
    "methodsUsed": ["vector", "hybrid", "hyde"]
  }
}
```

#### POST `/advanced/self-query`
Self-query retrieval - extract metadata filters from natural language.

**Request**:
```bash
curl -X POST http://localhost:5000/api/advanced/self-query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Show me tutorial documents about chunking from 2024",
    "options": {
      "topK": 10
    }
  }'
```

**Response**:
```json
{
  "query": "Show me tutorial documents about chunking from 2024",
  "semanticQuery": "documents about chunking",
  "extractedFilters": {
    "category": "tutorial",
    "year": 2024
  },
  "response": "Here are the chunking tutorials...",
  "contexts": [...],
  "metadata": {
    "retrievalMethod": "self-query"
  }
}
```

---

### Streaming Endpoints

#### POST `/stream/query`
Stream full RAG pipeline with real-time progress.

**Request**:
```bash
curl -X POST http://localhost:5000/api/stream/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?"}' \
  --no-buffer
```

**Response** (Server-Sent Events):
```
event: start
data: {"message":"Query processing started"}

event: step
data: {"step":"retrieval","message":"Retrieving relevant contexts..."}

event: context
data: {"contexts":[...]}

event: step
data: {"step":"generation","message":"Generating response..."}

event: chunk
data: {"text":"RAG "}

event: chunk
data: {"text":"stands "}

event: chunk
data: {"text":"for "}

event: complete
data: {"response":"RAG stands for Retrieval-Augmented Generation..."}
```

#### POST `/stream/simple`
Stream simple response without RAG pipeline.

**Request**:
```bash
curl -X POST http://localhost:5000/api/stream/simple \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain this",
    "context": "Some context here"
  }' \
  --no-buffer
```

---

### Analytics Endpoints

#### GET `/analytics/stats`
Get query statistics.

**Request**:
```bash
curl "http://localhost:5000/api/analytics/stats?timeRange=24h"
```

**Response**:
```json
{
  "queryStats": {
    "totalQueries": 1250,
    "avgTotalTime": 1150.5,
    "avgRetrievalTime": 420.3,
    "avgGenerationTime": 730.2
  },
  "cacheStats": {
    "hits": 450,
    "misses": 800,
    "hitRate": "36.00%",
    "backend": "redis"
  }
}
```

#### GET `/analytics/popular`
Get popular queries.

**Request**:
```bash
curl "http://localhost:5000/api/analytics/popular?limit=10&timeRange=7d"
```

**Response**:
```json
{
  "popularQueries": [
    {
      "query": "What is RAG?",
      "count": 45,
      "avgTime": 1100
    },
    {
      "query": "Explain semantic chunking",
      "count": 32,
      "avgTime": 1250
    }
  ]
}
```

#### GET `/analytics/slow`
Get slow queries.

**Request**:
```bash
curl "http://localhost:5000/api/analytics/slow?limit=10&threshold=5000"
```

**Response**:
```json
{
  "slowQueries": [
    {
      "query": "Complex multi-part question...",
      "totalTime": 8500,
      "retrievalTime": 3200,
      "generationTime": 5300,
      "timestamp": "2024-01-15T10:30:00.000Z"
    }
  ]
}
```

#### GET `/analytics/methods`
Get retrieval method performance stats.

**Request**:
```bash
curl "http://localhost:5000/api/analytics/methods?timeRange=7d"
```

**Response**:
```json
{
  "methodStats": [
    {
      "method": "hybrid",
      "count": 450,
      "avgTime": 1100,
      "avgRetrievalTime": 400
    },
    {
      "method": "vector",
      "count": 320,
      "avgTime": 950,
      "avgRetrievalTime": 350
    }
  ]
}
```

#### POST `/analytics/feedback`
Submit user feedback.

**Request**:
```bash
curl -X POST http://localhost:5000/api/analytics/feedback \
  -H "Content-Type: application/json" \
  -d '{
    "queryId": "query_123",
    "query": "What is RAG?",
    "response": "RAG stands for...",
    "rating": 5,
    "helpful": true,
    "feedback": "Great explanation!",
    "issues": []
  }'
```

**Response**:
```json
{
  "success": true,
  "message": "Feedback recorded successfully"
}
```

#### GET `/analytics/feedback/summary`
Get feedback summary.

**Request**:
```bash
curl "http://localhost:5000/api/analytics/feedback/summary?timeRange=7d"
```

**Response**:
```json
{
  "summary": {
    "totalFeedback": 250,
    "avgRating": 4.3,
    "helpfulPercentage": 85,
    "commonIssues": [
      {"issue": "incomplete", "count": 12},
      {"issue": "inaccurate", "count": 8}
    ]
  }
}
```

#### POST `/analytics/cache/clear`
Clear cache.

**Request**:
```bash
curl -X POST http://localhost:5000/api/analytics/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "embedding:*"}'
```

**Response**:
```json
{
  "success": true,
  "message": "Cache cleared successfully"
}
```

---

### 📋 Quick Reference: Common Commands

#### Essential Commands
```bash
# 1. Check server health
curl http://localhost:5000/api/health

# 2. Check usage (FREE TIER monitoring)
curl http://localhost:5000/api/usage/dashboard

# 3. Upload a document
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@document.pdf" \
  -F "category=tutorial"

# 4. Basic query
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?"}'

# 5. Advanced query with options
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain semantic chunking",
    "options": {
      "topK": 20,
      "useReranking": true,
      "useHybridSearch": true
    }
  }'

# 6. Multi-query retrieval
curl -X POST http://localhost:5000/api/advanced/multi-query \
  -H "Content-Type: application/json" \
  -d '{"query": "What are RAG techniques?"}'

# 7. HyDE retrieval
curl -X POST http://localhost:5000/api/advanced/hyde \
  -H "Content-Type: application/json" \
  -d '{"query": "Explain vector search"}'

# 8. Streaming query (RECOMMENDED - Best UX!)
curl -X POST http://localhost:5000/api/query/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?"}' \
  --no-buffer

# 9. Get analytics
curl "http://localhost:5000/api/analytics/stats?timeRange=24h"

# 10. Get document stats
curl http://localhost:5000/api/documents/stats
```

#### Testing Workflow
```bash
# Complete test workflow
# 1. Upload test document
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@tutorial/weaviate.md" \
  -F "category=tutorial"

# 2. Test basic query
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is semantic chunking?"}'

# 3. Compare retrieval methods
curl -X POST http://localhost:5000/api/advanced/multi-query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is semantic chunking?"}'

curl -X POST http://localhost:5000/api/advanced/hyde \
  -H "Content-Type: application/json" \
  -d '{"query": "What is semantic chunking?"}'

# 4. Check usage stats
curl http://localhost:5000/api/usage/dashboard | jq '.data.limits'

# 5. View analytics
curl "http://localhost:5000/api/analytics/stats?timeRange=1h"
```

#### Performance Testing

```bash
# Test streaming vs regular query
# Streaming (instant feedback, ~3-5s perceived)
time curl -X POST http://localhost:5000/api/query/stream \
  -H "Content-Type: application/json" \
  -d '{"query": "Compare vector and keyword search"}' \
  --no-buffer

# Regular (waits for full response, ~8-12s)
time curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "Compare vector and keyword search"}'

# Test cache performance
# First query (slow - not cached)
time curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?"}'

# Second query (FAST - cached, ~50-100ms!)
time curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?"}'

# Check cache stats
curl http://localhost:5000/api/usage/stats | jq '.cache'
```

---

## 🏗️ Advanced Features

### Reciprocal Rank Fusion (RRF)

RRF is used to merge results from multiple retrieval methods:

```
RRF_score(d) = Σ(weight_i * (1 / (k + rank_i(d))))
```

Where:
- `k = 60` (constant)
- `rank_i(d)` = position of document `d` in result list `i`
- `weight_i` = weight for retrieval method `i`

### Caching Strategy

**Three-tier caching**:
1. **Embedding Cache** (24h TTL) - Stores text → vector mappings
2. **Query Result Cache** (30min TTL) - Stores complete query results
3. **LLM Response Cache** (1h TTL) - Stores LLM-generated responses

**Cache Keys**: SHA-256 hash of input for consistency

**Fallback**: Automatic fallback to in-memory cache if Redis unavailable

### Analytics Data Model

**Query Logs**:
```javascript
{
  timestamp, query, processedQuery, retrievalMethod,
  totalTime, retrievalTime, generationTime,
  contextsRetrieved, contextsFinal,
  optimizations: {...},
  userAgent, ip, sessionId
}
```

**Feedback**:
```javascript
{
  timestamp, queryId, query, response,
  rating, helpful, feedback, issues
}
```

---

## 🏛️ Architecture

### System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         Client Application                       │
└────────────────────────────┬────────────────────────────────────┘
                             │ HTTP/REST API
┌────────────────────────────▼────────────────────────────────────┐
│                      Express.js Server                           │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   Security   │  │  Rate Limit  │  │ Compression  │          │
│  │  (Helmet)    │  │              │  │              │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         └──────────────────┴──────────────────┘                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │  Document    │  │    Query     │  │  Advanced    │          │
│  │   Routes     │  │   Routes     │  │   Routes     │          │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘          │
│         │                  │                  │                  │
│  ┌──────▼──────────────────▼──────────────────▼───────┐         │
│  │              Service Layer                          │         │
│  │  ┌──────────┐ ┌──────────┐ ┌──────────┐           │         │
│  │  │ Document │ │  Query   │ │ Advanced │           │         │
│  │  │ Service  │ │ Service  │ │Retriever │           │         │
│  │  └────┬─────┘ └────┬─────┘ └────┬─────┘           │         │
│  │       │            │            │                  │         │
│  │  ┌────▼─────┐ ┌───▼──────┐ ┌───▼──────┐          │         │
│  │  │Chunking  │ │  Gemini  │ │  Cache   │          │         │
│  │  │ Service  │ │ Service  │ │ Service  │          │         │
│  │  └──────────┘ └──────────┘ └──────────┘          │         │
│  └─────────────────────────────────────────────────┘          │
└────────────────────────────┬────────────────────────────────────┘
                             │
        ┌────────────────────┼────────────────────┐
        │                    │                    │
┌───────▼────────┐  ┌────────▼────────┐  ┌───────▼────────┐
│   MongoDB      │  │  Google Gemini  │  │    Redis       │
│ Atlas Vector   │  │   AI API        │  │   Cache        │
│    Search      │  │  (Embeddings    │  │                │
│                │  │   & LLM)        │  │                │
└────────────────┘  └─────────────────┘  └────────────────┘
```

### Data Flow

#### Document Ingestion Pipeline

```
Upload File/Text
      │
      ▼
┌─────────────────┐
│ Extract Text    │ ← PDF, DOCX, TXT, MD support
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Clean Text     │ ← Remove noise, normalize
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│  Chunk Text     │ ← Fixed/Recursive/Semantic/Document-based
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Generate        │ ← Gemini Embedding Model
│ Embeddings      │
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Store in        │ ← MongoDB with vector index
│ Vector DB       │
└─────────────────┘
```

#### Query Processing Pipeline

```
User Query
    │
    ▼
┌──────────────────────┐
│ Pre-Retrieval        │
│ Optimization         │
│ ┌────────────────┐   │
│ │Query Rewriting │   │ ← LLM-based query optimization
│ └────────────────┘   │
│ ┌────────────────┐   │
│ │Query Expansion │   │ ← Generate variations
│ └────────────────┘   │
│ ┌────────────────┐   │
│ │Query           │   │ ← Break into sub-queries
│ │Decomposition   │   │
│ └────────────────┘   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Retrieval            │
│ ┌────────────────┐   │
│ │Vector Search   │   │ ← Cosine similarity
│ └────────────────┘   │
│ ┌────────────────┐   │
│ │Keyword Search  │   │ ← BM25
│ └────────────────┘   │
│ ┌────────────────┐   │
│ │Hybrid Search   │   │ ← RRF fusion
│ └────────────────┘   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Post-Retrieval       │
│ Optimization         │
│ ┌────────────────┐   │
│ │Re-ranking      │   │ ← Cohere rerank model
│ └────────────────┘   │
│ ┌────────────────┐   │
│ │Context         │   │ ← LLM-based extraction
│ │Compression     │   │
│ └────────────────┘   │
└──────────┬───────────┘
           │
           ▼
┌──────────────────────┐
│ Response Generation  │
│ ┌────────────────┐   │
│ │Gemini LLM      │   │ ← Generate final response
│ └────────────────┘   │
│ ┌────────────────┐   │
│ │Chain of Thought│   │ ← For complex queries
│ └────────────────┘   │
└──────────────────────┘
```

### Project Structure

```
server/
├── src/
│   ├── index.js                          # Main server entry point
│   ├── config/
│   │   └── database.js                   # MongoDB connection & indexes
│   ├── routes/
│   │   ├── healthRoutes.js               # Health check endpoints
│   │   ├── documentRoutes.js             # Document management
│   │   ├── queryRoutes.js                # Basic query processing
│   │   ├── advancedQueryRoutes.js        # Advanced retrieval methods
│   │   ├── streamingRoutes.js            # SSE streaming endpoints
│   │   └── analyticsRoutes.js            # Analytics & feedback
│   ├── services/
│   │   ├── geminiService.js              # Gemini AI integration
│   │   ├── vectorService.js              # Vector operations
│   │   ├── chunkingService.js            # Chunking strategies
│   │   ├── documentService.js            # Document processing
│   │   ├── queryService.js               # Query pipeline
│   │   ├── cohereService.js              # Re-ranking
│   │   ├── advancedRetrieverService.js   # Advanced retrieval methods
│   │   ├── cacheService.js               # Redis caching
│   │   ├── streamingService.js           # SSE streaming
│   │   └── analyticsService.js           # Analytics & feedback
│   └── utils/
│       └── logger.js                     # Winston logger
├── examples/
│   └── api-examples.http                 # API request examples
├── ADVANCED_FEATURES.txt                 # Feature documentation
├── test-api.js                           # Basic test script
├── test-advanced-features.js             # Advanced features test
├── package.json                          # Dependencies
├── .env.example                          # Environment template
└── README.md                             # This file
```

---

## 🧪 Testing

### Run All Tests

```bash
# Run basic tests
npm test

# Run advanced features tests
npm run test:advanced

# Run all tests
npm run test:all
```

### Test Coverage

**Basic Tests** (`test-api.js`):
1. Health check
2. Text upload
3. Simple query
4. Advanced query with optimizations
5. Intelligent query routing
6. Document statistics
7. Document deletion

**Advanced Tests** (`test-advanced-features.js`):
1. Parent Document Retrieval
2. Multi-Query Retrieval
3. HyDE Retrieval
4. Ensemble Retrieval
5. Self-Query Retrieval
6. Analytics and Feedback
7. Caching Performance
8. Retrieval Method Comparison

### Manual Testing

Use the provided `examples/api-examples.http` file with REST Client extension in VS Code, or use curl commands from this README.

---

## 🗄️ MongoDB Setup Guide

### Option 1: MongoDB Atlas (Cloud - Recommended)

MongoDB Atlas provides **true vector search** with `$vectorSearch` aggregation pipeline.

#### Step-by-Step Setup:

**1. Create Account & Cluster**:
```
1. Go to https://www.mongodb.com/cloud/atlas
2. Click "Try Free" → Sign up
3. Create Organization → Create Project
4. Click "Build a Database"
5. Choose "FREE" M0 tier (512MB storage)
6. Select cloud provider (AWS/GCP/Azure)
7. Choose region closest to you
8. Cluster Name: "rag-cluster" (or any name)
9. Click "Create"
```

**2. Create Database User**:
```
1. Go to "Database Access" (left sidebar)
2. Click "Add New Database User"
3. Authentication Method: Password
4. Username: raguser
5. Password: (click "Autogenerate Secure Password" or create your own)
6. Database User Privileges: "Atlas admin" or "Read and write to any database"
7. Click "Add User"
8. SAVE YOUR PASSWORD! You'll need it for the connection string
```

**3. Configure Network Access**:
```
1. Go to "Network Access" (left sidebar)
2. Click "Add IP Address"
3. For development: Click "Allow Access from Anywhere" (0.0.0.0/0)
4. For production: Add your server's specific IP address
5. Click "Confirm"
```

**4. Get Connection String**:
```
1. Go to "Database" (left sidebar)
2. Click "Connect" on your cluster
3. Choose "Connect your application"
4. Driver: Node.js, Version: 5.5 or later
5. Copy the connection string:
   mongodb+srv://raguser:<password>@rag-cluster.xxxxx.mongodb.net/?retryWrites=true&w=majority
6. Replace <password> with your actual password
7. Add database name at the end:
   mongodb+srv://raguser:YOUR_PASSWORD@rag-cluster.xxxxx.mongodb.net/rag_database
```

**5. Create Vector Search Index** (CRITICAL!):
```
1. Go to your cluster → "Search" tab
2. Click "Create Search Index"
3. Choose "JSON Editor" (not Visual Editor)
4. Configuration:
   - Database: rag_database
   - Collection: documents
   - Index Name: vector_index
5. Paste this JSON configuration:
```

```json
{
  "fields": [
    {
      "type": "vector",
      "path": "embedding",
      "numDimensions": 768,
      "similarity": "cosine"
    },
    {
      "type": "filter",
      "path": "metadata.category"
    },
    {
      "type": "filter",
      "path": "documentId"
    }
  ]
}
```

```
6. Click "Next" → "Create Search Index"
7. Wait 2-5 minutes for index to build (status will show "Active")
```

**6. Update .env File**:
```env
MONGODB_URI=mongodb+srv://raguser:YOUR_PASSWORD@rag-cluster.xxxxx.mongodb.net/rag_database
MONGODB_DB_NAME=rag_database
MONGODB_COLLECTION=documents
```

**7. Test Connection**:
```bash
cd server
npm start
# Look for: "Connected to MongoDB database: rag_database"
```

---

### Option 2: Local MongoDB (Development Only)

Local MongoDB **does NOT support** `$vectorSearch`. The app uses a **fallback method** (slower).

#### Installation:

**macOS**:
```bash
# Install via Homebrew
brew tap mongodb/brew
brew install mongodb-community@7.0

# Start MongoDB
brew services start mongodb-community@7.0

# Verify it's running
brew services list | grep mongodb
```

**Ubuntu/Debian**:
```bash
# Import MongoDB public GPG key
wget -qO - https://www.mongodb.org/static/pgp/server-7.0.asc | sudo apt-key add -

# Add MongoDB repository
echo "deb [ arch=amd64,arm64 ] https://repo.mongodb.org/apt/ubuntu jammy/mongodb-org/7.0 multiverse" | sudo tee /etc/apt/sources.list.d/mongodb-org-7.0.list

# Update package database
sudo apt-get update

# Install MongoDB
sudo apt-get install -y mongodb-org

# Start MongoDB
sudo systemctl start mongod
sudo systemctl enable mongod

# Verify it's running
sudo systemctl status mongod
```

**Windows**:
```
1. Download installer: https://www.mongodb.com/try/download/community
2. Run installer (choose "Complete" installation)
3. Install as Windows Service (check the box)
4. MongoDB Compass will be installed (optional GUI)
5. MongoDB starts automatically
```

#### Create Database & User:

```bash
# Connect to MongoDB shell
mongosh

# Switch to rag_database
use rag_database

# Create user with read/write permissions
db.createUser({
  user: "raguser",
  pwd: "ragpass123",  // Change this!
  roles: [
    { role: "readWrite", db: "rag_database" }
  ]
})

# Exit
exit
```

#### Create Indexes (REQUIRED!):

```bash
cd server
node create-indexes.js
```

**Output should show**:
```
✅ Text index created successfully
✅ documentId index created
✅ timestamp index created
✅ category index created
✅ chunkId index created
```

#### Update .env File:

```env
# With authentication
MONGODB_URI=mongodb://raguser:ragpass123@localhost:27017/rag_database?authSource=rag_database

# OR without authentication (if you skipped user creation)
# MONGODB_URI=mongodb://localhost:27017/rag_database

MONGODB_DB_NAME=rag_database
MONGODB_COLLECTION=documents
```

#### Limitations:
- ❌ No `$vectorSearch` support (uses fallback cosine similarity)
- ❌ Slower performance (calculates similarity in-memory)
- ❌ Not suitable for production
- ✅ Good for development and testing

---

### Comparison: Atlas vs Local

| Feature | MongoDB Atlas | Local MongoDB |
|---------|---------------|---------------|
| **Cost** | FREE (M0 tier) | FREE |
| **Vector Search** | ✅ True `$vectorSearch` | ⚠️ Fallback method |
| **Performance** | ⚡ Fast (optimized HNSW index) | 🐌 Slower (in-memory calculation) |
| **Setup Time** | 10-15 minutes | 5 minutes |
| **Scalability** | ✅ Auto-scaling | ❌ Manual scaling |
| **Backups** | ✅ Automatic | ❌ Manual |
| **Production Ready** | ✅ Yes | ❌ No |
| **Recommended For** | Production & Development | Development only |

**Recommendation**: Use **MongoDB Atlas** even for development. It's free and provides the full production experience!

---

## 🚀 Deployment

### MongoDB Atlas Setup (Production)

1. **Create Production Cluster**:
   - Tier: M10 or higher (for better performance)
   - Region: Choose closest to your users
   - Version: MongoDB 6.0+

2. **Enable Vector Search**:
   - Go to cluster → "Search" tab
   - Create Search Index with JSON Editor:

```json
{
  "mappings": {
    "dynamic": true,
    "fields": {
      "embedding": {
        "type": "knnVector",
        "dimensions": 768,
        "similarity": "cosine"
      },
      "content": {
        "type": "string"
      },
      "metadata": {
        "type": "document",
        "dynamic": true
      }
    }
  }
}
```

3. **Configure Network Access**:
   - Add your server's IP address
   - Or use `0.0.0.0/0` for testing (not recommended for production)

4. **Create Database User**:
   - Go to "Database Access"
   - Create user with read/write permissions
   - Save credentials securely

### Redis Setup (Optional but Recommended)

**Option 1: Docker**
```bash
docker run -d -p 6379:6379 --name redis redis:latest
```

**Option 2: Cloud Redis**
- [Redis Cloud](https://redis.com/cloud/)
- [AWS ElastiCache](https://aws.amazon.com/elasticache/)
- [Azure Cache for Redis](https://azure.microsoft.com/en-us/services/cache/)

### Environment Configuration (Production)

```env
# MongoDB
MONGODB_URI=mongodb+srv://username:password@cluster.mongodb.net/?retryWrites=true&w=majority
MONGODB_DB_NAME=rag_production
MONGODB_COLLECTION=documents

# Google Gemini
GEMINI_API_KEY=your_production_gemini_key
GEMINI_MODEL=gemini-1.5-flash
GEMINI_EMBEDDING_MODEL=text-embedding-004

# Cohere
COHERE_API_KEY=your_production_cohere_key

# Redis
ENABLE_REDIS_CACHE=true
REDIS_URL=redis://your-redis-host:6379

# Server
PORT=5000
NODE_ENV=production
LOG_LEVEL=info

# Enable all features
ENABLE_QUERY_REWRITING=true
ENABLE_QUERY_EXPANSION=true
ENABLE_QUERY_DECOMPOSITION=true
ENABLE_RERANKING=true
ENABLE_CONTEXT_COMPRESSION=true
ENABLE_HYBRID_SEARCH=true
ENABLE_STREAMING=true
ENABLE_ANALYTICS=true
```

### Deployment Options

#### Option 1: Traditional Server (VPS, EC2, etc.)

```bash
# 1. Install Node.js 16+
curl -fsSL https://deb.nodesource.com/setup_16.x | sudo -E bash -
sudo apt-get install -y nodejs

# 2. Clone and setup
git clone <your-repo>
cd server
npm install --production

# 3. Configure environment
cp .env.example .env
# Edit .env with production values

# 4. Use PM2 for process management
npm install -g pm2
pm2 start src/index.js --name rag-server
pm2 save
pm2 startup
```

#### Option 2: Docker

**Dockerfile**:
```dockerfile
FROM node:16-alpine

WORKDIR /app

COPY package*.json ./
RUN npm install --production

COPY . .

EXPOSE 5000

CMD ["node", "src/index.js"]
```

**Build and Run**:
```bash
docker build -t rag-server .
docker run -d -p 5000:5000 --env-file .env rag-server
```

#### Option 3: Cloud Platforms

**Heroku**:
```bash
heroku create your-app-name
heroku config:set MONGODB_URI=your_mongodb_uri
heroku config:set GEMINI_API_KEY=your_gemini_key
git push heroku main
```

**AWS Elastic Beanstalk**:
```bash
eb init -p node.js-16 rag-server
eb create rag-production
eb setenv MONGODB_URI=your_mongodb_uri GEMINI_API_KEY=your_gemini_key
eb deploy
```

**Google Cloud Run**:
```bash
gcloud run deploy rag-server \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

### Production Checklist

- [ ] MongoDB Atlas cluster configured with vector search
- [ ] Redis cache configured (optional but recommended)
- [ ] Environment variables set correctly
- [ ] API keys secured (use secrets management)
- [ ] Rate limiting configured
- [ ] CORS configured for your domain
- [ ] Logging configured (Winston)
- [ ] Error tracking setup (Sentry, etc.)
- [ ] Health check endpoint working
- [ ] SSL/TLS certificate configured
- [ ] Backup strategy in place
- [ ] Monitoring setup (CPU, memory, API usage)

---

## ⚡ Performance Tuning

### For Speed (Low Latency)

```env
# Chunking
CHUNKING_STRATEGY=fixed-size
CHUNK_SIZE=500
CHUNK_OVERLAP=50

# Retrieval
DEFAULT_TOP_K=10
ENABLE_RERANKING=false
ENABLE_CONTEXT_COMPRESSION=false

# Query Optimization
ENABLE_QUERY_REWRITING=false
ENABLE_QUERY_EXPANSION=false
ENABLE_QUERY_DECOMPOSITION=false

# Hybrid Search
ENABLE_HYBRID_SEARCH=false

# Caching
ENABLE_REDIS_CACHE=true
```

**Expected Performance**: 500-800ms per query

### For Quality (Best Results)

```env
# Chunking
CHUNKING_STRATEGY=semantic
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Retrieval
DEFAULT_TOP_K=30
RERANK_TOP_K=5
ENABLE_RERANKING=true
ENABLE_CONTEXT_COMPRESSION=true

# Query Optimization
ENABLE_QUERY_REWRITING=true
ENABLE_QUERY_EXPANSION=true
ENABLE_HYBRID_SEARCH=true
HYBRID_SEARCH_ALPHA=0.5

# Advanced Retrieval
ENABLE_ENSEMBLE_RETRIEVAL=true

# Caching
ENABLE_REDIS_CACHE=true
```

**Expected Performance**: 1500-2500ms per query

### For Complex Questions

```env
# Chunking
CHUNKING_STRATEGY=document-based
CHUNK_SIZE=1500

# Retrieval
DEFAULT_TOP_K=20
ENABLE_RERANKING=true

# Query Optimization
ENABLE_QUERY_DECOMPOSITION=true
ENABLE_CONTEXT_COMPRESSION=false

# Advanced Retrieval
ENABLE_PARENT_DOCUMENT_RETRIEVAL=true
ENABLE_MULTI_QUERY_RETRIEVAL=true

# LLM
LLM_TEMPERATURE=0.3
MAX_TOKENS=3000
```

**Expected Performance**: 2000-3500ms per query

### Balanced Configuration (Recommended)

```env
# Chunking
CHUNKING_STRATEGY=recursive
CHUNK_SIZE=1000
CHUNK_OVERLAP=200

# Retrieval
DEFAULT_TOP_K=20
RERANK_TOP_K=5
ENABLE_RERANKING=true
ENABLE_HYBRID_SEARCH=true
HYBRID_SEARCH_ALPHA=0.5

# Query Optimization
ENABLE_QUERY_REWRITING=true
ENABLE_QUERY_EXPANSION=false
ENABLE_QUERY_DECOMPOSITION=false
ENABLE_CONTEXT_COMPRESSION=true

# Caching
ENABLE_REDIS_CACHE=true

# Analytics
ENABLE_ANALYTICS=true
```

**Expected Performance**: 1000-1500ms per query

### Performance Optimization Tips

1. **Enable Redis Caching**: Reduces latency by 60-80% for repeated queries
2. **Use Hybrid Search**: Better results than vector-only search
3. **Enable Re-ranking**: Improves top results quality significantly
4. **Tune topK**: Higher values = better recall, lower values = faster
5. **Monitor Analytics**: Use `/analytics/slow` to identify bottlenecks
6. **Batch Operations**: Process multiple documents at once
7. **Connection Pooling**: MongoDB connection pool size = 10-50
8. **Compress Responses**: Enabled by default with gzip
9. **Rate Limiting**: Prevents abuse and ensures fair usage

---

## 🐛 Troubleshooting

### Common Issues

#### MongoDB Connection Error

**Error**: `MongoServerError: Authentication failed`

**Solutions**:
- Check your connection string in `.env`
- Verify database user credentials
- Ensure your IP is whitelisted in MongoDB Atlas
- Check if database user has read/write permissions

#### Vector Index Not Created

**Error**: `Vector search index not found`

**Solutions**:
- MongoDB Atlas Vector Search must be enabled
- Free tier (M0) supports vector search
- Index creation happens automatically on first start
- Manually create index using JSON configuration above
- Wait 5-10 minutes for index to build

#### Gemini API Error

**Error**: `API key not valid`

**Solutions**:
- Verify your API key is correct in `.env`
- Check you have API quota remaining
- Ensure you're using a supported model
- Try regenerating your API key

#### Redis Connection Error

**Error**: `Redis connection failed`

**Solutions**:
- Check if Redis is running: `redis-cli ping`
- Verify `REDIS_URL` in `.env`
- Application will fallback to in-memory cache automatically
- Set `ENABLE_REDIS_CACHE=false` to disable Redis

#### Out of Memory

**Error**: `JavaScript heap out of memory`

**Solutions**:
- Reduce `CHUNK_SIZE` in `.env`
- Process smaller documents
- Use `fixed-size` chunking instead of `semantic`
- Increase Node.js memory: `node --max-old-space-size=4096 src/index.js`
- Reduce `MAX_CHUNKS_PER_DOCUMENT`

#### Slow Query Performance

**Issue**: Queries taking > 5 seconds

**Solutions**:
- Enable Redis caching
- Reduce `DEFAULT_TOP_K`
- Disable `ENABLE_QUERY_DECOMPOSITION`
- Disable `ENABLE_CONTEXT_COMPRESSION`
- Use `fixed-size` chunking
- Check `/analytics/slow` endpoint for insights

#### Rate Limit Exceeded

**Error**: `Too many requests`

**Solutions**:
- Increase rate limits in `src/index.js`
- Implement API key authentication
- Use caching to reduce API calls
- Distribute load across multiple instances

### Debug Mode

Enable detailed logging:

```env
LOG_LEVEL=debug
NODE_ENV=development
```

Check logs for detailed error messages and performance metrics.

### Health Check

Always check the health endpoint first:

```bash
curl http://localhost:5000/api/health
```

Expected response:
```json
{
  "status": "healthy",
  "timestamp": "2024-01-15T10:30:00.000Z",
  "database": "connected",
  "vectorIndex": "ready"
}
```

### Getting Help

1. **Check Logs**: Review Winston logs for error messages
2. **Verify Environment**: Ensure all required env variables are set
3. **Test MongoDB**: Use MongoDB Compass to verify connection
4. **Test APIs**: Verify Gemini and Cohere API keys work
5. **Review Analytics**: Check `/analytics/stats` for insights
6. **Consult Documentation**: Review this README and `ADVANCED_FEATURES.txt`

---

## 📊 API Endpoints Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/health` | GET | Check server status |
| `/api/documents/upload` | POST | Upload file |
| `/api/documents/text` | POST | Process text |
| `/api/documents/stats` | GET | Get statistics |
| `/api/documents/:id` | DELETE | Delete document |
| `/api/query` | POST | Standard query |
| `/api/query/simple` | POST | Basic query |
| `/api/query/route` | POST | Auto-routed query |
| `/api/query/advanced` | POST | Custom query |
| `/api/advanced/parent-document` | POST | Parent doc retrieval |
| `/api/advanced/multi-query` | POST | Multi-query retrieval |
| `/api/advanced/hyde` | POST | HyDE retrieval |
| `/api/advanced/ensemble` | POST | Ensemble retrieval |
| `/api/advanced/self-query` | POST | Self-query retrieval |
| `/api/stream/query` | POST | Stream RAG pipeline |
| `/api/stream/simple` | POST | Stream simple response |
| `/api/analytics/stats` | GET | Query statistics |
| `/api/analytics/popular` | GET | Popular queries |
| `/api/analytics/slow` | GET | Slow queries |
| `/api/analytics/methods` | GET | Method performance |
| `/api/analytics/feedback` | POST | Submit feedback |
| `/api/analytics/feedback/summary` | GET | Feedback summary |
| `/api/analytics/cache/clear` | POST | Clear cache |

---

## 🎓 Example Workflows

### Workflow 1: Basic Setup and Query

```bash
# 1. Upload a document
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@document.pdf" \
  -F "category=technical"

# 2. Ask a question
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is the main topic?"}'

# 3. Check statistics
curl http://localhost:5000/api/documents/stats
```

### Workflow 2: Advanced Retrieval Comparison

```bash
# Test different retrieval methods on the same query
QUERY="Explain semantic chunking"

# Standard retrieval
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\"}"

# Multi-query retrieval
curl -X POST http://localhost:5000/api/advanced/multi-query \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\"}"

# HyDE retrieval
curl -X POST http://localhost:5000/api/advanced/hyde \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\"}"

# Ensemble retrieval (best quality)
curl -X POST http://localhost:5000/api/advanced/ensemble \
  -H "Content-Type: application/json" \
  -d "{\"query\": \"$QUERY\", \"options\": {\"methods\": [\"vector\", \"hybrid\", \"hyde\"]}}"
```

### Workflow 3: Analytics and Optimization

```bash
# 1. Run queries
# ... (run multiple queries)

# 2. Check performance stats
curl "http://localhost:5000/api/analytics/stats?timeRange=24h"

# 3. Identify slow queries
curl "http://localhost:5000/api/analytics/slow?limit=10&threshold=3000"

# 4. Check cache performance
curl "http://localhost:5000/api/analytics/stats?timeRange=24h" | jq '.cacheStats'

# 5. Clear cache if needed
curl -X POST http://localhost:5000/api/analytics/cache/clear \
  -H "Content-Type: application/json" \
  -d '{"pattern": "*"}'
```

---

## 💰 FREE TIER OPTIMIZATION

### 🎯 Stay Free Forever!

This application is **fully optimized** to work within Gemini API's **FREE tier** limits. With proper usage, you can run this app **completely free** for a very long time!

### 📊 Free Tier Limits (Gemini 2.5 Flash / 2.0 Flash)

| Metric | Limit | Description |
|--------|-------|-------------|
| **RPM** | 15 | Requests Per Minute |
| **TPM** | 1,000,000 | Tokens Per Minute (plenty for most use cases!) |
| **RPD** | 200 | Requests Per Day (resets at midnight Pacific time) |

### ✅ Built-in Optimizations

#### 1. **Automatic Rate Limiting** 🚦
- Tracks RPM, TPM, and RPD in real-time
- Blocks requests that would exceed limits
- Returns helpful error messages with retry times
- Adds usage stats to response headers

#### 2. **Token Optimization** 🔧
- Removes redundant phrases ("please", "kindly", etc.)
- Compresses context to fit within token limits
- Optimizes prompts automatically
- **Saves 30-70% tokens** on average

**Example**:
```
Before: "Please could you kindly tell me what are the best advanced RAG techniques?"
After:  "Best advanced RAG techniques?"
Tokens: 18 → 5 (72% reduction!)
```

#### 3. **Intelligent Caching** 💾
- Embeddings cached (no repeated API calls)
- LLM responses cached (instant responses)
- Query results cached
- **Reduces API calls by 60-80%**

#### 4. **Usage Monitoring** 📈
Real-time dashboard to track your usage

### 🎮 Usage Monitoring API

#### Check Current Usage
```bash
curl http://localhost:5000/api/usage/dashboard
```

**Response**:
```json
{
  "success": true,
  "data": {
    "tier": "FREE",
    "model": "gemini-2.5-flash",
    "limits": {
      "rpm": {
        "current": 5,
        "limit": 15,
        "remaining": 10,
        "percentUsed": 33,
        "resetIn": "45s"
      },
      "tpm": {
        "current": 12500,
        "limit": 1000000,
        "remaining": 987500,
        "percentUsed": 1,
        "resetIn": "45s"
      },
      "rpd": {
        "current": 42,
        "limit": 200,
        "remaining": 158,
        "percentUsed": 21,
        "resetIn": "8h 23m"
      }
    },
    "optimization": {
      "totalTokensSaved": 15420,
      "percentSaved": 35,
      "optimizationCalls": 42,
      "averageSavingsPerCall": 367
    },
    "health": {
      "status": "HEALTHY",
      "warnings": [],
      "canMakeRequest": true
    },
    "recommendations": [
      {
        "priority": "LOW",
        "category": "BEST_PRACTICE",
        "message": "Usage is healthy",
        "action": "Continue monitoring usage to stay within free tier limits"
      }
    ]
  }
}
```

#### Get Usage Statistics
```bash
curl http://localhost:5000/api/usage/stats
```

#### Reset Token Optimization Stats
```bash
curl -X POST http://localhost:5000/api/usage/reset-token-stats
```

### 📈 Response Headers

Every API response includes usage information:
```
X-RateLimit-Limit-RPM: 15
X-RateLimit-Remaining-RPM: 10
X-RateLimit-Limit-RPD: 200
X-RateLimit-Remaining-RPD: 158
X-RateLimit-Reset-Minute: 2025-11-01T10:45:00Z
X-RateLimit-Reset-Day: 2025-11-02T08:00:00Z
```

### 💡 Best Practices to Stay Free

#### ✅ DO:
1. **Enable Redis caching** (set `ENABLE_REDIS_CACHE=true`)
2. **Monitor daily usage** via `/api/usage/dashboard`
3. **Use batch operations** when uploading multiple documents
4. **Keep prompts concise** (automatic optimization helps)
5. **Reuse queries** (caching handles this automatically)

#### ❌ DON'T:
1. **Don't make rapid-fire requests** (respect 15 RPM limit)
2. **Don't upload huge documents** without proper chunking
3. **Don't disable caching** (saves 60-80% of API calls!)
4. **Don't ignore rate limit warnings**

### 🚨 What Happens When You Hit Limits?

**Rate Limit Exceeded Response**:
```json
{
  "success": false,
  "error": "Rate limit exceeded",
  "details": {
    "reason": "RPD_EXCEEDED",
    "message": "Daily request limit exceeded (200 requests/day)",
    "current": 200,
    "limit": 200,
    "resetTime": "2025-11-02T08:00:00Z",
    "retryAfter": 28800
  },
  "suggestion": "Please wait before making another request, or enable caching to reduce API calls."
}
```

### 📊 Expected Daily Usage (with optimizations)

| Activity | Requests | Notes |
|----------|----------|-------|
| Upload 10 documents | ~30 | Chunking + embedding generation |
| 50 queries (with cache) | ~20 | 60% cache hit rate |
| Advanced retrieval (20 queries) | ~40 | Multi-query, HyDE, etc. |
| **Total** | **~90/day** | ✅ Well within 200 limit! |

**Without optimizations**: Same workload = ~300+ requests/day ❌

### 🎯 Health Status Levels

- 🟢 **HEALTHY** (0-50% usage) - All good!
- 🟡 **CAUTION** (50-70% usage) - Monitor closely
- 🟠 **WARNING** (70-90% usage) - Consider enabling more caching
- 🔴 **CRITICAL** (90-100% usage) - Approaching limits!

### 🚀 Upgrade Path (When Needed)

#### Tier 1 (Paid - No upfront cost)
- **RPM**: 60 (4x increase)
- **TPM**: 4,000,000 (4x increase)
- **RPD**: 1,500 (7.5x increase)
- **Cost**: Pay-as-you-go (very affordable)
- **How**: Add billing account to Google Cloud project

#### Tier 2 ($250+ total spend)
- **RPM**: 360
- **TPM**: 4,000,000
- **RPD**: 10,000

### 📞 Resources

- **Gemini API Pricing**: https://ai.google.dev/gemini-api/docs/pricing
- **Rate Limits**: https://ai.google.dev/gemini-api/docs/rate-limits
- **Get API Key**: https://aistudio.google.com/app/apikey

---

## 📝 License

ISC

---

## 🙏 Acknowledgments

This project implements advanced RAG techniques from:
- **Weaviate Advanced RAG Techniques Guide**
- **LangChain Documentation**
- **Research Papers on RAG Systems**

Built with:
- **MongoDB Atlas** - Vector database (FREE tier available)
- **Google Gemini AI** - Embeddings and LLM (FREE tier: 200 requests/day)
- **Cohere AI** - Re-ranking (optional)
- **Redis** - Caching (optional, highly recommended)
- **Node.js** - Runtime
- **Express.js** - Web framework

### Key Features:
- ✅ **100% FREE** to use with Gemini API free tier
- ✅ **Automatic rate limiting** and token optimization
- ✅ **5 advanced retrieval methods** (Parent Document, Multi-Query, HyDE, Ensemble, Self-Query)
- ✅ **Production-ready** with security, monitoring, and analytics
- ✅ **Real-time usage monitoring** to stay within free limits

---

## 🚀 What's Next?

### Immediate Next Steps

1. **Upload Your Documents**: Start building your knowledge base
2. **Test Different Chunking Strategies**: Find what works best for your content
3. **Compare Retrieval Methods**: Use the test script to compare performance
4. **Tune Parameters**: Optimize for your specific use case
5. **Enable Analytics**: Track performance and user feedback

### Future Enhancements

- [ ] Multi-modal support (images, tables, charts)
- [ ] Custom embedding fine-tuning
- [ ] A/B testing framework
- [ ] Web UI dashboard
- [ ] Batch query processing
- [ ] Document versioning
- [ ] User authentication and authorization
- [ ] Multi-language support
- [ ] GraphQL API
- [ ] WebSocket support for real-time updates

---

**Built with ❤️ using cutting-edge RAG techniques**

For questions, issues, or contributions, please refer to the documentation or check the logs for detailed error messages.

Happy RAG building! 🎉


