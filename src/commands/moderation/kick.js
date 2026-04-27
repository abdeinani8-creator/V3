const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('kick')
    .setDescription('Kick a member from the server')
    .addUserOption((opt) =>
      opt.setName('target').setDescription('Member to kick').setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for kick').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.KickMembers),
  cooldown: 5,

  async execute(interaction) {
    const target = interaction.options.getMember('target');
    const reason = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot kick yourself.', ephemeral: true });
    }
    if (!target.kickable) {
      return interaction.reply({
        content: '❌ I cannot kick that user — they may have higher permissions than me.',
        ephemeral: true,
      });
    }

    try {
      await target.kick(reason);
      logger.info(`${interaction.user.tag} kicked ${target.user.tag} | Reason: ${reason}`);
      await interaction.reply(
        `✅ **${target.user.tag}** was kicked.\n📝 **Reason:** ${reason}`
      );
    } catch (err) {
      logger.error('Kick error:', err);
      await interaction.reply({ content: '❌ Failed to kick the user.', ephemeral: true });
    }
  },
};
