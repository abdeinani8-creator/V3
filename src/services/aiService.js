const logger = require('../utils/logger');

// ── Provider setup ────────────────────────────────────────────
let anthropic = null;
let openai = null;

if (process.env.ANTHROPIC_API_KEY) {
  const Anthropic = require('@anthropic-ai/sdk');
  anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

if (process.env.OPENAI_API_KEY) {
  const OpenAI = require('openai');
  openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
}

const provider = process.env.AI_PROVIDER || 'anthropic';

// ── Per-channel conversation history ─────────────────────────
// Keyed by channelId; holds last N message pairs
const histories = new Map();
const HISTORY_LIMIT = 20; // max messages kept per channel

function getHistory(channelId) {
  if (!histories.has(channelId)) histories.set(channelId, []);
  return histories.get(channelId);
}

function pushHistory(channelId, role, content) {
  const h = getHistory(channelId);
  h.push({ role, content });
  if (h.length > HISTORY_LIMIT) h.splice(0, h.length - HISTORY_LIMIT);
}

// ── System prompt ─────────────────────────────────────────────
function buildSystem(guildName) {
  return (
    `You are a friendly, witty Discord bot for the server "${guildName}". ` +
    `Keep replies concise (under 400 characters when possible). ` +
    `Use Discord markdown formatting (bold, italics, code blocks). ` +
    `Be helpful, engaging, and appropriate for a community chat. ` +
    `Never pretend to be human. Never output harmful content.`
  );
}

// ── Claude reply ──────────────────────────────────────────────
async function replyWithClaude(system, history) {
  const response = await anthropic.messages.create({
    model:      'claude-sonnet-4-6',
    max_tokens: 600,
    system,
    messages:   history,
  });
  return response.content[0].text;
}

// ── OpenAI reply ──────────────────────────────────────────────
async function replyWithOpenAI(system, history) {
  const response = await openai.chat.completions.create({
    model:    'gpt-4o-mini',
    messages: [{ role: 'system', content: system }, ...history],
  });
  return response.choices[0].message.content;
}

// ── Public API ────────────────────────────────────────────────
async function getAIReply(userId, channelId, userMessage, guildName) {
  if (!anthropic && !openai) {
    return (
      'AI is not configured. Set `ANTHROPIC_API_KEY` or `OPENAI_API_KEY` in `.env`.'
    );
  }

  pushHistory(channelId, 'user', userMessage);
  const history = getHistory(channelId);
  const system  = buildSystem(guildName);

  try {
    let reply;

    if (provider === 'anthropic' && anthropic) {
      reply = await replyWithClaude(system, history);
    } else if (openai) {
      reply = await replyWithOpenAI(system, history);
    } else {
      // Fallback to whichever is available
      reply = anthropic
        ? await replyWithClaude(system, history)
        : await replyWithOpenAI(system, history);
    }

    pushHistory(channelId, 'assistant', reply);
    return reply;
  } catch (error) {
    logger.error('AI service error:', error);
    // Remove the failed user message so it isn't stuck in history
    const h = getHistory(channelId);
    if (h.at(-1)?.role === 'user') h.pop();
    return "I'm having trouble thinking right now. Try again in a moment!";
  }
}

module.exports = { getAIReply };
