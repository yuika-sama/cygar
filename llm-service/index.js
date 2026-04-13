const express = require('express');
const axios = require('axios');
const cors = require('cors');
const fs = require('fs');
const path = require('path');

require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

const PORT = process.env.PORT || 8080;
const PUTTER_BASE = (process.env.PUTTER_API_BASE_URL || 'https://api.putter.ai').replace(/\/$/, '');
const PUTTER_KEY = process.env.PUTTER_API_KEY || '';
const PUTTER_PATH = process.env.PUTTER_API_GENERATE_PATH || '/v1/generate';
const PUTTER_TIMEOUT = parseInt(process.env.PUTTER_API_TIMEOUT || '30', 10) * 1000;
const ENABLE_PUTER_SDK = String(process.env.ENABLE_PUTER_SDK || '').toLowerCase() === 'true';

// Prevent process crash from third-party unhandled async errors.
process.on('unhandledRejection', (reason) => {
  const rendered = reason && reason.stack ? reason.stack : JSON.stringify(reason);
  console.error('unhandledRejection captured:', rendered);
});

process.on('uncaughtException', (error) => {
  console.error('uncaughtException captured:', error && error.stack ? error.stack : error);
});

// Try to initialize local puter client; fall back to HTTP API.
const PUTER_TOKEN = process.env.PUTER_AUTH_TOKEN || process.env.PUTTER_API_KEY || '';
let puter = null;
let hasPuter = false;
if (ENABLE_PUTER_SDK) {
  try {
    const initModule = require('@heyputer/puter.js/src/init.cjs');
    const init = initModule && (initModule.init || initModule);
    puter = init(PUTER_TOKEN || undefined);
    hasPuter = !!puter;
    console.log('llm-service: initialized @heyputer/puter.js via init');
  } catch (e) {
    try {
      const puterModule = require('@heyputer/puter.js');
      const candidate = puterModule && (puterModule.default || puterModule);
      if (candidate && typeof candidate.init === 'function') {
        puter = candidate.init(PUTER_TOKEN || undefined);
      } else if (candidate && candidate.puter) {
        puter = candidate.puter;
      } else {
        puter = candidate;
      }
      hasPuter = !!puter;
      if (hasPuter) console.log('llm-service: initialized @heyputer/puter.js via fallback');
    } catch (e2) {
      console.log('llm-service: @heyputer/puter.js not available, HTTP fallback will be used');
      puter = null;
      hasPuter = false;
    }
  }
} else {
  console.log('llm-service: SDK disabled (ENABLE_PUTER_SDK!=true), using HTTP fallback');
}

async function callPutter(prompt, opts = {}) {
  // Primary path: use puter.ai.chat when available
  if (hasPuter && puter && puter.ai && typeof puter.ai.chat === 'function') {
    try {
      // Đảm bảo prompt không null nếu gọi chat(prompt)
      const input = prompt || (opts.messages && opts.messages.length > 0 ? opts.messages[opts.messages.length - 1].content : "");
      
      const aiResp = await puter.ai.chat(input); 

      // Kiểm tra kỹ cấu trúc response của Puter
      const text = aiResp?.message?.content ?? aiResp?.output ?? aiResp?.text ?? "No response content";
      return { status: 'ok', raw: aiResp, text };
    } catch (e) {
      // In toàn bộ object e để debug
      console.error('puter.ai.chat error object:', JSON.stringify(e, null, 2));
      return { status: 'error', status_code: 500, raw: e };
    }
  }

  // Simple HTTP fallback
  const url = `${PUTTER_BASE}${PUTTER_PATH}`;
  const headers = { 'Content-Type': 'application/json' };
  if (PUTTER_KEY) headers['Authorization'] = `Bearer ${PUTTER_KEY}`;
  const payload = { prompt, ...opts };
  try {
    const resp = await axios.post(url, payload, { headers, timeout: PUTTER_TIMEOUT });
    return { status: 'ok', raw: resp.data, text: resp.data?.output ?? resp.data?.text ?? JSON.stringify(resp.data) };
  } catch (err) {
    console.error('Putter HTTP call failed:', err.response ? err.response.data : err.message);
    if (err.response) {
      return { status: 'error', status_code: err.response.status, raw: err.response.data };
    }
    return { status: 'error', status_code: 500, raw: err.message };
  }
}

function buildPromptFromMessages(messages = [], preprompt = '') {
  const lines = [];
  if (preprompt) lines.push(preprompt.trim(), '\n---\n');
  for (const m of messages) {
    if (!m || !m.role || !m.content) continue;
    const role = (m.role || 'user').toString().toUpperCase();
    lines.push(`${role}: ${m.content}`);
  }
  lines.push('\nASSISTANT:');
  return lines.join('\n');
}
// Flexible /chat endpoint: accepts either `messages` (array) or `prompt` (string).
// options.rag: true|false to enable/disable RAG insertion. options.top_k controls number of chunks.
app.post('/chat', async (req, res) => {
  try {
    const body = req.body || {};
    const messages = Array.isArray(body.messages) ? body.messages : (Array.isArray(body.msgs) ? body.msgs : []);
    const prompt = typeof body.prompt === 'string' ? body.prompt : (typeof body.input === 'string' ? body.input : undefined);

    let query = prompt;
    if (!query && messages.length) {
      const userMsgs = messages.filter(m => m && String(m.role).toLowerCase() === 'user').map(m => m.content).filter(Boolean);
      query = userMsgs.length ? userMsgs.join(' ') : (messages[messages.length - 1] && messages[messages.length - 1].content) || '';
    }

    if (!query && (!messages || !messages.length)) {
      return res.status(400).json({ error: 'prompt or messages required' });
    }

    let callResult;
    if (hasPuter && puter && messages.length) {
      const structured = messages.map(m => ({ role: m.role, content: m.content }));
      callResult = await callPutter(null, { messages: structured });
    } else {
      callResult = await callPutter(query || '', {});
    }

    if (!callResult || callResult.status !== 'ok') {
      return res.status(callResult?.status_code || 502).json(callResult || { status: 'error', error: 'LLM call failed' });
    }

    const raw = callResult.raw ?? null;
    const text = callResult.text || (typeof raw === 'string' ? raw : (raw && (raw.message?.content || raw.output || raw.text)) || '');
    const gesture = selectGesture(query || text, text);

    return res.json({ response: text, gesture });
  } catch (err) {
    console.error('chat error', err);
    return res.status(500).json({ status: 'error', error: err && err.message ? err.message : String(err) });
  }
});

app.post('/generate', async (req, res) => {
  try {
    const body = req.body || {};
    const prompt = body.prompt || body.input || body.text;
    const messages = Array.isArray(body.messages) ? body.messages : (Array.isArray(body.msgs) ? body.msgs : []);
    const opts = body.options || body.params || {};

    if (!prompt && !messages.length && !opts.messages) {
      return res.status(400).json({ error: 'prompt or messages required' });
    }

    let resp;
    if (hasPuter && puter && messages.length) {
      const structured = messages.map(m => ({ role: m.role, content: m.content }));
      resp = await callPutter(null, { messages: structured, ...opts });
    } else {
      resp = await callPutter(prompt || '', opts);
    }

    if (!resp || resp.status !== 'ok') return res.status(resp?.status_code || 502).json(resp || { status: 'error', error: 'LLM call failed' });

    const text = resp.text || '';
    const gesture = selectGesture(prompt || text, text);

    return res.json({ response: text, gesture, raw: resp.raw });
  } catch (err) {
    console.error('generate error', err);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    putter_configured: !!PUTTER_KEY,
    sdk_enabled: ENABLE_PUTER_SDK,
    sdk_active: hasPuter
  });
});

app.listen(PORT, () => console.log(`llm-service listening on port ${PORT}`));
