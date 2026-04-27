const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ban')
    .setDescription('Ban a member from the server')
    .addUserOption((opt) =>
      opt.setName('target').setDescription('Member to ban').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for ban').setRequired(false)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('delete_days')
        .setDescription('Days of messages to delete (0–7)')
        .setMinValue(0)
        .setMaxValue(7)
        .setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.BanMembers),
  cooldown: 5,

  async execute(interaction) {
    const target     = interaction.options.getMember('target');
    const reason     = interaction.options.getString('reason') ?? 'No reason provided';
    const deleteDays = interaction.options.getInteger('delete_days') ?? 0;

    if (!target) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot ban yourself.', ephemeral: true });
    }
    if (!target.bannable) {
      return interaction.reply({
        content: '❌ I cannot ban that user — they may have higher permissions than me.',
        ephemeral: true,
      });
    }

    try {
      await target.ban({ reason, deleteMessageSeconds: deleteDays * 86_400 });
      logger.info(`${interaction.user.tag} banned ${target.user.tag} | Reason: ${reason}`);
      await interaction.reply(
        `🔨 **${target.user.tag}** was banned.\n` +
        `📝 **Reason:** ${reason}\n` +
        `🗑️ **Messages deleted:** ${deleteDays} day(s)`
      );
    } catch (err) {
      logger.error('Ban error:', err);
      await interaction.reply({ content: '❌ Failed to ban the user.', ephemeral: true });
    }
  },
};
