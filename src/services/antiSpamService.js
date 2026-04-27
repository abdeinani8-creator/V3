const logger = require('../utils/logger');

// userId -> { count, firstMessageAt }
const tracker = new Map();

const THRESHOLD    = 5;        // messages
const WINDOW_MS    = 5_000;    // within 5 seconds
const TIMEOUT_MS   = 60_000;   // mute for 1 minute

function checkSpam(message) {
  const { id: userId } = message.author;
  const now = Date.now();
  const entry = tracker.get(userId);

  if (!entry || now - entry.firstMessageAt > WINDOW_MS) {
    tracker.set(userId, { count: 1, firstMessageAt: now });
    return false;
  }

  entry.count += 1;

  if (entry.count >= THRESHOLD) {
    tracker.delete(userId);
    return true;
  }

  return false;
}

async function handleSpammer(message) {
  try {
    const member = message.guild?.members.cache.get(message.author.id);
    if (!member) return;
    // Never mute admins or the bot owner
    if (member.permissions.has('Administrator')) return;

    await member.timeout(TIMEOUT_MS, 'Anti-spam: too many messages too fast');
    await message.channel.send(
      `⚠️ ${message.author}, you've been muted for **1 minute** for spamming.`
    );
    logger.warn(
      `Spam timeout: ${message.author.tag} in ${message.guild.name}`
    );
  } catch (err) {
    logger.error('handleSpammer error:', err);
  }
}

module.exports = { checkSpam, handleSpammer };
