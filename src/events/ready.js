const { ActivityType } = require('discord.js');
const { startScheduler } = require('../services/schedulerService');
const spotify = require('../services/spotifyService');
const logger  = require('../utils/logger');

const STATUSES = [
  { name: '/ask | AI-Powered',       type: ActivityType.Watching  },
  { name: 'your messages',           type: ActivityType.Listening },
  { name: '/rank | Earn XP',         type: ActivityType.Playing   },
  { name: '/daily | Free XP',        type: ActivityType.Playing   },
];

module.exports = {
  name: 'clientReady',
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);
    client.guilds.cache.forEach(g => logger.info(`  → Guild: ${g.name} (${g.id})`));

    let i = 0;
    const rotate = () => {
      client.user.setActivity(STATUSES[i]);
      i = (i + 1) % STATUSES.length;
    };

    rotate();
    setInterval(rotate, 30_000);

    // Start daily news scheduler
    startScheduler(client);

    // Init Spotify (if credentials are set)
    spotify.init();
  },
};
