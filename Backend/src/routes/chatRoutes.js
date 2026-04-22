const express = require('express');
const router = express.Router();
const { GoogleGenerativeAI } = require('@google/generative-ai');
const logger = require('../utils/logger');

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const DEFAULT_MODEL = process.env.GEMINI_MODEL || 'gemini-1.5-flash';

// Retry a Gemini call up to maxRetries times on rate-limit (429) errors.
async function withRetry(fn, maxRetries = 3) {
  let delay = 5000; // start at 5 s
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const is429 = err?.status === 429 ||
        err?.message?.includes('429') ||
        err?.message?.toLowerCase().includes('rate limit') ||
        err?.message?.toLowerCase().includes('quota');
      if (is429 && attempt < maxRetries) {
        // honour retryAfter from the error if available
        const retryAfter = err?.errorDetails?.find?.((d) => d?.retryDelay)?.retryDelay;
        const waitMs = retryAfter
          ? parseInt(retryAfter) * 1000
          : delay;
        logger.warn(`Gemini rate-limited — retrying in ${waitMs / 1000}s (attempt ${attempt + 1}/${maxRetries})`);
        await new Promise((r) => setTimeout(r, waitMs));
        delay *= 2; // exponential back-off
        continue;
      }
      throw err;
    }
  }
}

function setupSSE(res) {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');
  res.setHeader('X-Accel-Buffering', 'no');
  res.flushHeaders();
}

function sendEvent(res, event, data) {
  res.write(`event: ${event}\n`);
  res.write(`data: ${JSON.stringify(data)}\n\n`);
}

/**
 * POST /api/chat/stream
 * Plain Gemini chat with multi-turn history. No RAG retrieval.
 * Body: { messages: [{role: 'user'|'assistant', content}], options? }
 * Emits SSE events: start, chunk, complete, error
 */
router.post('/stream', async (req, res) => {
  try {
    const { messages = [], options = {} } = req.body || {};

    if (!Array.isArray(messages) || messages.length === 0) {
      return res.status(400).json({
        success: false,
        error: 'messages array is required'
      });
    }

    const lastUser = [...messages].reverse().find((m) => m.role === 'user');
    if (!lastUser) {
      return res.status(400).json({
        success: false,
        error: 'At least one user message is required'
      });
    }

    setupSSE(res);
    sendEvent(res, 'start', {
      turns: messages.length,
      timestamp: new Date().toISOString()
    });

    const model = genAI.getGenerativeModel({
      model: options.model || DEFAULT_MODEL,
      systemInstruction:
        options.system ||
        'You are Smachs AI, a warm, capable general-purpose assistant built by the Smachs team. ' +
          'Your identity is Smachs AI — never identify as Gemini, Google, Bard, or any underlying model. ' +
          'If asked what or who you are, say you are Smachs AI built by Smachs. ' +
          'Answer questions across any topic directly and confidently; avoid unnecessary disclaimers. ' +
          'Only say you do not know when you genuinely do not. For live data you lack, explain that briefly and offer what you can still help with. ' +
          'Be friendly, concise by default, and use markdown when it aids clarity.',
      generationConfig: {
        temperature: options.temperature ?? 0.7,
        topP: 0.95,
        topK: 40,
        maxOutputTokens: options.maxOutputTokens ?? 2048
      }
    });

    // Convert chat history to Gemini contents format.
    // Gemini expects alternating user/model roles; we drop the last user msg
    // and pass the rest as history, then send the last user msg as the turn.
    const history = messages.slice(0, -1).map((m) => ({
      role: m.role === 'assistant' ? 'model' : 'user',
      parts: [{ text: String(m.content ?? '') }]
    }));

    const chat = model.startChat({ history });
    const stream = await withRetry(() => chat.sendMessageStream(String(lastUser.content)));

    let full = '';
    let chunkIndex = 0;
    for await (const chunk of stream.stream) {
      const text = chunk.text();
      if (!text) continue;
      full += text;
      chunkIndex++;
      sendEvent(res, 'chunk', { text, chunkIndex });
    }

    sendEvent(res, 'complete', {
      fullResponse: full,
      totalChunks: chunkIndex,
      timestamp: new Date().toISOString()
    });
    res.end();

    logger.info('Chat stream completed', {
      turns: messages.length,
      chunks: chunkIndex,
      length: full.length
    });
  } catch (error) {
    logger.error('Chat stream failed', { error: error.message });
    if (!res.headersSent) {
      res.status(500).json({ success: false, error: error.message });
    } else {
      sendEvent(res, 'error', {
        message: error.message,
        timestamp: new Date().toISOString()
      });
      res.end();
    }
  }
});

module.exports = router;
