const cron       = require('node-cron');
const { read }   = require('../utils/dataStore');
const { fetchAndBuildNews } = require('./newsService');
const logger     = require('../utils/logger');
const path       = require('path');
const fs         = require('fs');

const SETTINGS_FILE = path.join(__dirname, '../../data/settings.json');

function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { return {}; }
}

// ── Post news to all configured guilds ────────────────────────
async function postDailyNews(client) {
  const settings = readSettings();

  for (const [guildId, cfg] of Object.entries(settings)) {
    if (!cfg.newsChannelId) continue;

    const channel = client.channels.cache.get(cfg.newsChannelId);
    if (!channel) {
      logger.warn(`News channel ${cfg.newsChannelId} not found for guild ${guildId}`);
      continue;
    }

    try {
      const embeds = await fetchAndBuildNews();
      await channel.send({ embeds });
      logger.info(`Posted daily news to #${channel.name} (${guildId})`);
    } catch (err) {
      logger.error(`Failed to post news to guild ${guildId}:`, err);
    }
  }
}

// ── Start scheduler ───────────────────────────────────────────
function startScheduler(client) {
  // Every day at 9:00 AM UTC
  cron.schedule('0 9 * * *', () => {
    logger.info('Running daily news job…');
    postDailyNews(client);
  }, { timezone: 'UTC' });

  logger.info('Daily news scheduler started (posts at 09:00 UTC every day)');
}

module.exports = { startScheduler, postDailyNews };
