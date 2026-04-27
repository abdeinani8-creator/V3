const { ActivityType } = require('discord.js');
const logger = require('../utils/logger');

const STATUSES = [
  { name: '/ask | AI-Powered',       type: ActivityType.Watching  },
  { name: 'your messages',           type: ActivityType.Listening },
  { name: '/rank | Earn XP',         type: ActivityType.Playing   },
  { name: '/daily | Free XP',        type: ActivityType.Playing   },
];

module.exports = {
  name: 'ready',
  once: true,
  execute(client) {
    logger.info(`Logged in as ${client.user.tag}`);
    logger.info(`Serving ${client.guilds.cache.size} guild(s)`);

    let i = 0;
    const rotate = () => {
      client.user.setActivity(STATUSES[i]);
      i = (i + 1) % STATUSES.length;
    };

    rotate();
    setInterval(rotate, 30_000);
  },
};
