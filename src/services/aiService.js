const logger = require('../utils/logger');

// ── Provider setup ────────────────────────────────────────────
let gemini    = null;
let groq      = null;
let anthropic = null;
let openai    = null;

if (process.env.GEMINI_API_KEY) {
  const { GoogleGenerativeAI } = require('@google/generative-ai');
  gemini = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
}
if (process.env.GROQ_API_KEY) {
  const Groq = require('groq-sdk');
  groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
}
if (process.env.ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}
if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

function resolveProvider() {
  const pref = process.env.AI_PROVIDER;
  if (pref === 'gemini'    && gemini)    return 'gemini';
  if (pref === 'groq'      && groq)      return 'groq';
  if (pref === 'anthropic' && anthropic) return 'anthropic';
  if (pref === 'openai'    && openai)    return 'openai';
  // Auto-fallback: first available
  if (gemini)    return 'gemini';
  if (groq)      return 'groq';
  if (anthropic) return 'anthropic';
  if (openai)    return 'openai';
  return null;
}

// ── Per-channel conversation history ─────────────────────────
const histories = new Map();
const HISTORY_LIMIT = 20;

function getHistory(channelId) {
  if (!histories.has(channelId)) histories.set(channelId, []);
  return histories.get(channelId);
}

function pushHistory(channelId, role, content) {
  const h = getHistory(channelId);
  h.push({ role, content });
  if (h.length > HISTORY_LIMIT) h.splice(0, h.length - HISTORY_LIMIT);
}

function buildSystem(guildName) {
  return (
    `You are a friendly, witty Discord bot for the server "${guildName}". ` +
    `Keep replies concise (under 400 characters when possible). ` +
    `Use Discord markdown (bold, italics, code blocks). ` +
    `Be helpful, engaging, and appropriate for a community chat. ` +
    `Never pretend to be human. Never output harmful content.`
  );
}

// ── Gemini ────────────────────────────────────────────────────
async function replyWithGemini(system, history, guildName) {
  const model = gemini.getGenerativeModel({
    model:             'gemini-2.0-flash',
    systemInstruction: system,
  });

  // Gemini uses 'user' / 'model' roles, and history excludes the last message
  const geminiHistory = history.slice(0, -1).map((m) => ({
    role:  m.role === 'assistant' ? 'model' : 'user',
    parts: [{ text: m.content }],
  }));

  const chat   = model.startChat({ history: geminiHistory });
  const last   = history.at(-1);
  const result = await chat.sendMessage(last.content);
  return result.response.text();
}

// ── Groq ──────────────────────────────────────────────────────
async function replyWithGroq(system, history) {
  const res = await groq.chat.completions.create({
    model:      'llama-3.1-8b-instant',
    messages:   [{ role: 'system', content: system }, ...history],
    max_tokens: 600,
  });
  return res.choices[0].message.content;
}

// ── Claude ────────────────────────────────────────────────────
async function replyWithClaude(system, history) {
  const res = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 600,
    system,
    messages:   history,
  });
  return res.content[0].text;
}

// ── OpenAI ────────────────────────────────────────────────────
async function replyWithOpenAI(system, history) {
  const res = await openai.chat.completions.create({
    model:    'gpt-4o-mini',
    messages: [{ role: 'system', content: system }, ...history],
  });
  return res.choices[0].message.content;
}

// ── Public API ────────────────────────────────────────────────
async function getAIReply(userId, channelId, userMessage, guildName) {
  const provider = resolveProvider();

  if (!provider) {
    return 'AI is not configured. Set `GEMINI_API_KEY`, `GROQ_API_KEY`, or `ANTHROPIC_API_KEY` in `.env`.';
  }

  pushHistory(channelId, 'user', userMessage);
  const history = getHistory(channelId);
  const system  = buildSystem(guildName);

  try {
    let reply;
    if      (provider === 'gemini')    reply = await replyWithGemini(system, history, guildName);
    else if (provider === 'groq')      reply = await replyWithGroq(system, history);
    else if (provider === 'anthropic') reply = await replyWithClaude(system, history);
    else                               reply = await replyWithOpenAI(system, history);

    pushHistory(channelId, 'assistant', reply);
    return reply;
  } catch (error) {
    logger.error(`AI error (${provider}):`, error);
    const h = getHistory(channelId);
    if (h.at(-1)?.role === 'user') h.pop();
    return "I'm having trouble thinking right now. Try again in a moment!";
  }
}

module.exports = { getAIReply };
