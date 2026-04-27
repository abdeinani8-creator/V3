const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('mute')
    .setDescription('Timeout (mute) a member for a set duration')
    .addUserOption((opt) =>
      opt.setName('target').setDescription('Member to mute').setRequired(true)
    )
    .addIntegerOption((opt) =>
      opt
        .setName('duration')
        .setDescription('Duration in minutes (1 – 40 320 / 28 days)')
        .setMinValue(1)
        .setMaxValue(40_320)
        .setRequired(true)
    )
    .addStringOption((opt) =>
      opt.setName('reason').setDescription('Reason for mute').setRequired(false)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers),
  cooldown: 5,

  async execute(interaction) {
    const target   = interaction.options.getMember('target');
    const duration = interaction.options.getInteger('duration');
    const reason   = interaction.options.getString('reason') ?? 'No reason provided';

    if (!target) {
      return interaction.reply({ content: '❌ That user is not in this server.', ephemeral: true });
    }
    if (target.id === interaction.user.id) {
      return interaction.reply({ content: '❌ You cannot mute yourself.', ephemeral: true });
    }
    if (!target.moderatable) {
      return interaction.reply({
        content: '❌ I cannot mute that user — they may have higher permissions than me.',
        ephemeral: true,
      });
    }

    try {
      await target.timeout(duration * 60_000, reason);
      logger.info(`${interaction.user.tag} muted ${target.user.tag} for ${duration}m | Reason: ${reason}`);
      await interaction.reply(
        `🔇 **${target.user.tag}** was muted for **${duration} minute(s)**.\n📝 **Reason:** ${reason}`
      );
    } catch (err) {
      logger.error('Mute error:', err);
      await interaction.reply({ content: '❌ Failed to mute the user.', ephemeral: true });
    }
  },
};
