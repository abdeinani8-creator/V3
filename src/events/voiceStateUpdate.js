const logger = require('../utils/logger');

module.exports = {
  name: 'voiceStateUpdate',
  once: false,
  execute(oldState, newState, client) {
    // We only care when it's the bot itself being forcibly disconnected
    if (oldState.member?.id !== client.user.id) return;

    const wasConnected = !!oldState.channelId;
    const isConnected  = !!newState.channelId;

    if (wasConnected && !isConnected) {
      logger.warn(
        `Bot was removed from voice in guild ${oldState.guild.name} — voiceService reconnect will handle it`
      );
    }
  },
};
