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

// Initialize @heyputer/puter.js (prefer `init`) — token is optional for free usage.
const PUTER_TOKEN = process.env.PUTER_AUTH_TOKEN || process.env.PUTTER_API_KEY || '';
let puter = null;
let hasPuter = false;
try {
  // Preferred import (CJS init entry)
  const initModule = require('@heyputer/puter.js/src/init.cjs');
  const init = initModule && (initModule.init || initModule);
  puter = init(PUTER_TOKEN || undefined);
  hasPuter = !!puter;
  console.log('llm-service: initialized @heyputer/puter.js via init');
} catch (e) {
  try {
    // Fallback: try requiring the package directly
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

// Simple RAG: load knowledge (markdown) and perform lexical scoring.
const KNOW_DIR = path.resolve(__dirname, '..', 'ai-service', 'helpers', 'chatbot_knowledge');
let knowledge = { preprompt: '', gesture_map: {}, chunks: [] };

const STOPWORDS = new Set(["và","là","của","cho","các","những","để","trong","với","một","có","không","để","được","này","của"]);

function tokenize(text) {
  if (!text) return [];
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\u00C0-\u024F]+/gi, ' ')
    .split(/\s+/)
    .map(t => t.trim())
    .filter(t => t.length > 1 && !STOPWORDS.has(t));
}

function splitToChunks(text, source) {
  const parts = text.split(/\n{2,}/g).map(p => p.trim()).filter(Boolean);
  const chunks = [];
  for (const p of parts) {
    if (p.length < 40) continue;
    chunks.push({ source, text: p });
  }
  return chunks;
}

function loadKnowledge() {
  try {
    knowledge = { preprompt: '', gesture_map: {}, chunks: [] };
    const prepromptPath = path.join(KNOW_DIR, 'preprompt_template.md');
    if (fs.existsSync(prepromptPath)) knowledge.preprompt = fs.readFileSync(prepromptPath, 'utf8') || '';

    const gestureMapPath = path.join(KNOW_DIR, 'gesture_motion_map.json');
    if (fs.existsSync(gestureMapPath)) {
      try {
        knowledge.gesture_map = JSON.parse(fs.readFileSync(gestureMapPath, 'utf8')) || {};
      } catch (e) {
        console.error('Failed to parse gesture_motion_map.json', e);
        knowledge.gesture_map = {};
      }
    }

    if (fs.existsSync(KNOW_DIR)) {
      const files = fs.readdirSync(KNOW_DIR);
      for (const f of files) {
        const lf = f.toLowerCase();
        if (!lf.endsWith('.md')) continue;
        if (f === 'preprompt_template.md' || f === 'gesture_catalog.md') continue;
        const p = path.join(KNOW_DIR, f);
        try {
          const text = fs.readFileSync(p, 'utf8');
          const chunks = splitToChunks(text, f);
          for (const c of chunks) knowledge.chunks.push(c);
        } catch (e) {}
      }
      const projectsDir = path.join(KNOW_DIR, 'projects');
      if (fs.existsSync(projectsDir)) {
        const pfiles = fs.readdirSync(projectsDir);
        for (const pf of pfiles) {
          if (!pf.toLowerCase().endsWith('.md')) continue;
          try {
            const text = fs.readFileSync(path.join(projectsDir, pf), 'utf8');
            const chunks = splitToChunks(text, path.join('projects', pf));
            for (const c of chunks) knowledge.chunks.push(c);
          } catch (e) {}
        }
      }
    }

    // precompute tokens
    knowledge.chunks = knowledge.chunks.map(c => ({ ...c, tokens: new Set(tokenize(c.text)) }));
    console.log(`llm-service: loaded knowledge chunks=${knowledge.chunks.length}`);
  } catch (e) {
    console.error('Error loading knowledge', e);
  }
}

function scoreChunks(query) {
  const qtokens = new Set(tokenize(query));
  const scores = knowledge.chunks.map((c, idx) => {
    const inter = [...qtokens].filter(t => c.tokens.has(t)).length;
    const denom = Math.sqrt(c.tokens.size || 1);
    const score = denom ? inter / denom : 0;
    return { idx, score };
  });
  scores.sort((a, b) => b.score - a.score);
  return scores;
}

function selectTopChunks(query, topK = 3) {
  const ranked = scoreChunks(query).filter(r => r.score > 0);
  const top = ranked.slice(0, topK).map(r => knowledge.chunks[r.idx]);
  return top;
}

function selectGesture(query, content) {
  const q = (query || '').toLowerCase();
  if (/gợi ý|đề xuất|recommend|suggest|đề nghị|gợi-y/i.test(q)) return 'suggest_action';
  if (/xin chào|hello|chào|hi\b/i.test(q)) return 'greet_wave';
  if (/cách|làm thế nào|hướng dẫn|bước/i.test(q)) return 'explain_point';
  // try to find a gesture key present in gesture_map by checking keywords
  for (const key of Object.keys(knowledge.gesture_map || {})) {
    if (q.includes(key.toLowerCase())) return key;
  }
  return 'neutral_idle';
}

// Load knowledge at startup
loadKnowledge();

async function callPutter(prompt, opts = {}) {
  // Primary path: use puter.ai.chat when available
  if (hasPuter && puter && puter.ai && typeof puter.ai.chat === 'function') {
    try {
      const aiResp = await puter.ai.chat(prompt);
      const text = aiResp?.message?.content ?? aiResp?.output ?? aiResp?.text ?? (Array.isArray(aiResp?.choices) ? aiResp.choices.map(c => c.text || c.content || c.message?.content).filter(Boolean).join('\n') : undefined) ?? JSON.stringify(aiResp);
      return { status: 'ok', raw: aiResp, text };
    } catch (e) {
      console.error('puter.ai.chat error:', e && e.message ? e.message : e);
      return { status: 'error', status_code: 500, raw: e && e.message ? e.message : String(e) };
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
    const model = body.model;
    const options = (body.options && typeof body.options === 'object') ? body.options : (body.option && typeof body.option === 'object' ? body.option : {});

    // support multiple input shapes
    const messages = Array.isArray(body.messages) ? body.messages : (Array.isArray(body.msgs) ? body.msgs : undefined);
    const promptFromBody = typeof body.prompt === 'string' ? body.prompt : (typeof body.input === 'string' ? body.input : undefined);

    let preprompt = '';
    try {
      const prepromptPath = path.resolve(__dirname, '..', 'ai-service', 'helpers', 'chatbot_knowledge', 'preprompt_template.md');
      if (fs.existsSync(prepromptPath)) preprompt = fs.readFileSync(prepromptPath, { encoding: 'utf8' });
    } catch (e) {}

    let queryText = promptFromBody || '';
    if (!queryText && Array.isArray(messages) && messages.length) {
      const lastUser = (messages.slice().reverse().find(m => m && m.role && String(m.role).toLowerCase() === 'user') || {}).content || '';
      const historyTail = messages.filter(m => m && m.role && String(m.role).toLowerCase() === 'user').slice(-2).map(m => m.content).join(' ').trim();
      queryText = historyTail ? `${historyTail} ${lastUser}`.trim() : (lastUser || '');
    }

    // RAG: insert top chunks unless explicitly disabled
    const useRag = options.hasOwnProperty('rag') ? !!options.rag : (knowledge.chunks && knowledge.chunks.length > 0);
    const topK = Number(options.top_k || options.k || 3);
    const topChunks = (useRag && queryText) ? selectTopChunks(queryText, topK) : [];
    const contextSnippet = topChunks.map(c => `- ${c.text.slice(0, 500)} (${c.source})`).join('\n');

    // Compose final payload for Puter: prefer structured messages when available
    let callResult;
    if (hasPuter && puter && Array.isArray(messages) && messages.length) {
      // attempt to send structured messages
      try {
        // attach context as system/preprompt if present
        const systemText = (preprompt || knowledge.preprompt || '') + (contextSnippet ? '\n\nContext:\n' + contextSnippet : '');
        const structured = messages.map(m => ({ role: m.role, content: m.content }));
        // if system role supported, inject at beginning
        if (!structured.find(m => String(m.role).toLowerCase() === 'system') && systemText) structured.unshift({ role: 'system', content: systemText });
        callResult = await callPutter(null, { messages: structured, model, ...options });
      } catch (e) {
        // fallback to text prompt
        const prompt = [(preprompt || knowledge.preprompt || ''), contextSnippet, buildPromptFromMessages(messages || [], '')].filter(Boolean).join('\n---\n');
        callResult = await callPutter(prompt, { model, ...options });
      }
    } else {
      // build prompt string
      const prompt = promptFromBody || [(preprompt || knowledge.preprompt || ''), contextSnippet, buildPromptFromMessages(messages || [], '')].filter(Boolean).join('\n---\n');
      callResult = await callPutter(prompt, { model, ...options });
    }

    if (!callResult || callResult.status !== 'ok') return res.status(callResult?.status_code || 502).json(callResult || { status: 'error', error: 'LLM call failed' });

    const raw = callResult.raw ?? null;
    const text = callResult.text || (typeof raw === 'string' ? raw : (raw && (raw.message?.content || raw.output || raw.text)) || '');
    const fullDetails = text || (contextSnippet || '');
    const short = (text && String(text).split('\n').find(Boolean)) || (topChunks[0] && topChunks[0].text.split('\n')[0]) || '';
    const gesture = selectGesture(queryText || short || fullDetails, fullDetails);
    const sources = topChunks.map(c => c.source || c);

    return res.json({ response: short, gesture, details: fullDetails, sources, raw });
  } catch (err) {
    console.error('chat error', err);
    return res.status(500).json({ status: 'error', error: err && err.message ? err.message : String(err) });
  }
});

app.post('/generate', async (req, res) => {
  try {
    const body = req.body || {};
    const prompt = body.prompt || body.input || body.text;
    const opts = body.options || body.params || {};
    if (!prompt && !opts.messages) return res.status(400).json({ error: 'prompt or messages required' });
    const resp = await callPutter(prompt || '', opts);
    if (!resp || resp.status !== 'ok') return res.status(resp?.status_code || 502).json(resp || { status: 'error', error: 'LLM call failed' });
    return res.json({ response: resp.text || '', raw: resp.raw });
  } catch (err) {
    console.error('generate error', err);
    return res.status(500).json({ status: 'error', error: err.message });
  }
});

app.get('/health', (req, res) => res.json({ status: 'ok', putter_configured: !!PUTTER_KEY }));

app.listen(PORT, () => console.log(`llm-service listening on port ${PORT}`));
