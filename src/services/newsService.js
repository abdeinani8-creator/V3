const RSSParser = require('rss-parser');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

const parser = new RSSParser({
  timeout: 10_000,
  headers: { 'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)' },
});

// ── RSS sources ───────────────────────────────────────────────
const GAMING_FEEDS = [
  { name: 'IGN',        url: 'https://feeds.ign.com/ign/all' },
  { name: 'PC Gamer',   url: 'https://www.pcgamer.com/rss/' },
  { name: 'Eurogamer',  url: 'https://www.eurogamer.net/?format=rss' },
  { name: 'VG247',      url: 'https://www.vg247.com/feed' },
];

const AI_FEEDS = [
  { name: 'VentureBeat AI', url: 'https://venturebeat.com/category/ai/feed/' },
  { name: 'TechCrunch AI',  url: 'https://techcrunch.com/category/artificial-intelligence/feed/' },
  { name: 'MIT AI News',    url: 'https://news.mit.edu/rss/topic/artificial-intelligence2' },
  { name: 'The Verge AI',   url: 'https://www.theverge.com/rss/ai-artificial-intelligence/index.xml' },
];

// ── Fetch one feed safely ─────────────────────────────────────
async function fetchFeed(source) {
  try {
    const feed  = await parser.parseURL(source.url);
    const items = feed.items.slice(0, 3).map((item) => ({
      title:  item.title?.trim().replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>') || 'No title',
      url:    item.link  || item.guid || '',
      source: source.name,
      date:   item.pubDate ? new Date(item.pubDate) : new Date(),
    }));
    return items;
  } catch (err) {
    logger.warn(`Feed failed (${source.name}): ${err.message}`);
    return [];
  }
}

// ── Fetch all feeds for a category ───────────────────────────
async function fetchCategory(feeds, limit = 5) {
  const results = await Promise.allSettled(feeds.map(fetchFeed));
  const all = results
    .filter((r) => r.status === 'fulfilled')
    .flatMap((r) => r.value)
    .sort((a, b) => b.date - a.date)
    .slice(0, limit);
  return all;
}

// ── Build Discord embeds ──────────────────────────────────────
function buildNewsEmbeds(gamingItems, aiItems, date) {
  const dateStr = date.toLocaleDateString('en-US', {
    weekday: 'long', year: 'numeric', month: 'long', day: 'numeric',
  });

  const embeds = [];

  // Header embed
  embeds.push(
    new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`📰 Daily News Digest — ${dateStr}`)
      .setDescription('Your daily roundup of the latest **Gaming** and **AI** news. Stay informed!')
      .setTimestamp()
  );

  // Gaming embed
  if (gamingItems.length > 0) {
    const rows = gamingItems.map((item, i) =>
      `**${i + 1}.** [${item.title}](${item.url})\n> 📌 *${item.source}*`
    );
    embeds.push(
      new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🎮 Top Gaming News')
        .setDescription(rows.join('\n\n'))
        .setFooter({ text: 'Sources: IGN • PC Gamer • Eurogamer • VG247' })
    );
  }

  // AI embed
  if (aiItems.length > 0) {
    const rows = aiItems.map((item, i) =>
      `**${i + 1}.** [${item.title}](${item.url})\n> 📌 *${item.source}*`
    );
    embeds.push(
      new EmbedBuilder()
        .setColor(0x1ABC9C)
        .setTitle('🤖 Top AI News')
        .setDescription(rows.join('\n\n'))
        .setFooter({ text: 'Sources: VentureBeat • TechCrunch • MIT • The Verge' })
    );
  }

  return embeds;
}

// ── Main export ───────────────────────────────────────────────
async function fetchAndBuildNews() {
  logger.info('Fetching daily news…');
  const [gaming, ai] = await Promise.all([
    fetchCategory(GAMING_FEEDS, 5),
    fetchCategory(AI_FEEDS,     5),
  ]);
  logger.info(`Fetched ${gaming.length} gaming + ${ai.length} AI articles`);
  return buildNewsEmbeds(gaming, ai, new Date());
}

module.exports = { fetchAndBuildNews };
