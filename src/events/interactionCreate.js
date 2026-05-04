const { Collection } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'interactionCreate',
  once: false,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    logger.info(`Command received: /${interaction.commandName} from ${interaction.user.tag} in ${interaction.guild?.name}`);

    const command = client.commands.get(interaction.commandName);
    if (!command) {
      logger.warn(`Unknown command: ${interaction.commandName}`);
      return;
    }

    // ── Cooldown ──────────────────────────────────────────────
    const { cooldowns } = client;
    if (!cooldowns.has(command.data.name)) {
      cooldowns.set(command.data.name, new Collection());
    }

    const timestamps    = cooldowns.get(command.data.name);
    const cooldownMs    = (command.cooldown ?? 3) * 1_000;
    const now           = Date.now();
    const lastUsed      = timestamps.get(interaction.user.id);

    if (lastUsed) {
      const remaining = lastUsed + cooldownMs - now;
      if (remaining > 0) {
        return interaction.reply({
          content: `Please wait **${(remaining / 1000).toFixed(1)}s** before using \`/${command.data.name}\` again.`,
          ephemeral: true,
        });
      }
    }

    timestamps.set(interaction.user.id, now);
    setTimeout(() => timestamps.delete(interaction.user.id), cooldownMs);

    // ── Execute ───────────────────────────────────────────────
    try {
      await command.execute(interaction, client);
    } catch (error) {
      logger.error(`Error in /${interaction.commandName}:`, error);
      const reply = { content: '❌ An error occurred running that command.', ephemeral: true };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(reply).catch(() => {});
      } else {
        await interaction.reply(reply).catch(() => {});
      }
    }
  },
};
