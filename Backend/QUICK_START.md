# 🚀 Quick Start Guide

## ✅ What We Just Fixed

1. ✅ **Text index created** - Keyword search now works!
2. ✅ **Metadata indexes created** - Fast filtering enabled
3. ✅ **Vector search fallback** - Works with local MongoDB
4. ✅ **Atlas support** - Ready for production with MongoDB Atlas
5. ✅ **README updated** - Complete MongoDB setup guide added

---

## 🎯 Next Steps

### 1. Start the Server

```bash
cd server
npm start
```

**Expected output**:
```
✅ Connected to MongoDB
✅ Text search index created successfully
🚀 RAG Server running on port 5000
```

### 2. Upload Your Documents

From the **root directory** (`RAG-Docs-Python`):

```bash
# Upload Weaviate tutorial
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@tutorial/weaviate.md" \
  -F "category=tutorial"

# Upload AI guide
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@data/books/ai-comprehensive-guide.md" \
  -F "category=guide"

# Upload LangChain guide
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@data/books/langchain-setup-guide.md" \
  -F "category=guide"
```

### 3. Test Queries

```bash
# Basic query
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is semantic chunking?"}'

# Advanced query with options
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{
    "query": "Explain RAG techniques",
    "options": {
      "topK": 10,
      "useHybridSearch": true
    }
  }'
```

### 4. Monitor FREE Tier Usage

```bash
# Check usage dashboard
curl http://localhost:5000/api/usage/dashboard

# Get simple stats
curl http://localhost:5000/api/usage/stats
```

---

## 📊 Current Setup

### MongoDB: Local (Development)
- ✅ Text index: Created
- ✅ Metadata indexes: Created
- ⚠️ Vector search: Fallback method (slower)
- 💡 **Recommendation**: Upgrade to MongoDB Atlas for production

### Gemini API: FREE Tier
- ✅ Model: `gemini-2.5-flash`
- ✅ Embeddings: `text-embedding-004`
- ✅ Rate limits: 15 RPM, 200 RPD
- ✅ Token optimization: Enabled
- ✅ Usage monitoring: Enabled

---

## 🔄 Upgrade to MongoDB Atlas (Recommended)

For **true vector search** performance, upgrade to MongoDB Atlas:

### Quick Atlas Setup:

1. **Create Account**: https://www.mongodb.com/cloud/atlas
2. **Create FREE M0 Cluster** (512MB)
3. **Create Database User**: `raguser` / `your_password`
4. **Whitelist IP**: `0.0.0.0/0` (for development)
5. **Get Connection String**:
   ```
   mongodb+srv://raguser:YOUR_PASSWORD@cluster.mongodb.net/rag_database
   ```
6. **Create Vector Search Index**:
   - Go to cluster → "Search" tab
   - Create index named `vector_index`
   - Use configuration from README

7. **Update .env**:
   ```env
   MONGODB_URI=mongodb+srv://raguser:YOUR_PASSWORD@cluster.mongodb.net/rag_database
   ```

8. **Restart server**:
   ```bash
   npm start
   ```

**See full guide in README.md → "MongoDB Setup Guide" section**

---

## 🐛 Troubleshooting

### Error: "text index required for $text query"
✅ **FIXED!** We created the text index with `node create-indexes.js`

### Error: "Cannot connect to MongoDB"
- Check if MongoDB is running: `brew services list | grep mongodb`
- Start MongoDB: `brew services start mongodb-community@7.0`
- Verify connection string in `.env`

### Error: "Vector search not working"
- Local MongoDB uses fallback method (slower but works)
- For true vector search, use MongoDB Atlas
- See "Upgrade to MongoDB Atlas" section above

### Error: "Rate limit exceeded"
- Check usage: `curl http://localhost:5000/api/usage/dashboard`
- Wait for reset (shown in response)
- Enable caching to reduce API calls

---

## 📚 Full Documentation

All documentation is now in **one file**: `README.md`

Key sections:
- 💰 **FREE TIER OPTIMIZATION** - How to stay free forever
- 🗄️ **MongoDB Setup Guide** - Detailed Atlas & Local setup
- 📚 **API Documentation** - All endpoints with curl examples
- 📋 **Quick Reference** - Common commands
- 🧪 **Testing** - How to test everything

---

## 🎉 You're Ready!

Your RAG application is now configured and ready to use!

**Next commands to run**:
```bash
# 1. Start server
cd server
npm start

# 2. In another terminal, upload documents
cd ..  # Go to root directory
curl -X POST http://localhost:5000/api/documents/upload \
  -F "file=@tutorial/weaviate.md" \
  -F "category=tutorial"

# 3. Test a query
curl -X POST http://localhost:5000/api/query \
  -H "Content-Type: application/json" \
  -d '{"query": "What is RAG?"}'

# 4. Check usage
curl http://localhost:5000/api/usage/dashboard
```

**Happy RAG building!** 🚀

