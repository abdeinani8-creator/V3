const { checkSpam, handleSpammer } = require('../services/antiSpamService');
const { addXP }                    = require('../services/xpService');
const { getAIReply }               = require('../services/aiService');
const logger                       = require('../utils/logger');

// ── AI per-user cooldown ──────────────────────────────────────
const aiCooldowns = new Map();
const AI_COOLDOWN_MS = 5_000;

// ── Keyword auto-replies (triggered ~5 % of the time) ─────────
const KEYWORD_REPLIES = {
  'hello':        ['Hey there! 👋', 'Hello! How can I help?', 'Sup! 👋'],
  'good morning': ['Good morning! ☀️ Hope you have a great day!', 'Morning! ☀️'],
  'good night':   ['Good night! 🌙 Sweet dreams!', 'Night night! 🌙'],
  'lol':          ['😂', 'haha 😄', 'lmaooo 💀'],
  'gm':           ['gm! ☀️', 'Good morning fren! ☀️'],
  'gg':           ['GG! 🎮', 'Well played! 🏆'],
  'bruh':         ['bruh 💀', '😑 bruh', 'Fr tho 😂'],
  'help':         ["Need help? Use `/ask` to ask me anything! 💡", "I'm here! Try `/ask your question` 😊"],
  'thanks':       ["You're welcome! 😊", 'Anytime! 🙌', 'Happy to help! ✨'],
  'wow':          ['wow 😮', 'No way! 😱', 'Incredible! 🤯'],
};

module.exports = {
  name: 'messageCreate',
  once: false,
  async execute(message, client) {
    if (message.author.bot)  return;
    if (!message.guild)      return;   // ignore DMs

    // ── Anti-spam ─────────────────────────────────────────────
    if (checkSpam(message)) {
      await handleSpammer(message);
      return;
    }

    // ── XP (5-25 per message, 1-message-per-minute rate limit) ─
    const xpKey = `${message.guild.id}-${message.author.id}`;
    if (!message.client._xpCooldown) message.client._xpCooldown = new Set();

    if (!message.client._xpCooldown.has(xpKey)) {
      message.client._xpCooldown.add(xpKey);
      setTimeout(() => message.client._xpCooldown.delete(xpKey), 60_000);

      const amount = Math.floor(Math.random() * 21) + 5;
      const { leveledUp, newLevel } = addXP(message.guild.id, message.author.id, amount);

      if (leveledUp) {
        message.channel
          .send(`🎉 ${message.author} leveled up to **Level ${newLevel}**! Keep chatting! 🚀`)
          .catch(() => {});
      }
    }

    // ── Keyword auto-replies ──────────────────────────────────
    const lower = message.content.toLowerCase();
    for (const [kw, replies] of Object.entries(KEYWORD_REPLIES)) {
      if (lower.includes(kw) && Math.random() < 0.05) {
        await message.reply(replies[Math.floor(Math.random() * replies.length)]);
        return;
      }
    }

    // ── AI reply (mention or AI-channel) ─────────────────────
    const mentioned   = message.mentions.has(client.user);
    const inAIChan    = process.env.AI_CHANNEL_ID && message.channel.id === process.env.AI_CHANNEL_ID;

    if (!mentioned && !inAIChan) return;

    // Per-user cooldown to prevent spam
    const coolKey = `${message.guild.id}-${message.author.id}`;
    if (aiCooldowns.has(coolKey)) {
      await message.react('⏳').catch(() => {});
      return;
    }
    aiCooldowns.set(coolKey, true);
    setTimeout(() => aiCooldowns.delete(coolKey), AI_COOLDOWN_MS);

    // Strip mention tags from message text
    const clean = message.content.replace(/<@!?\d+>/g, '').trim();
    if (!clean) {
      await message.reply('Yes? Ask me anything! 😊');
      return;
    }

    try {
      await message.channel.sendTyping();
      const reply = await getAIReply(
        message.author.id,
        message.channel.id,
        clean,
        message.guild.name
      );
      await message.reply(reply);
    } catch (err) {
      logger.error('messageCreate AI reply error:', err);
      await message.reply("Sorry, I'm having trouble right now. Try again later!").catch(() => {});
    }
  },
};
