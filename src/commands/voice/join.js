const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { joinChannel } = require('../../services/voiceService');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('join')
    .setDescription('Join your voice channel and stay connected 24/7'),
  cooldown: 5,

  async execute(interaction) {
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ You must be in a voice channel first!',
        ephemeral: true,
      });
    }

    const perms = voiceChannel.permissionsFor(interaction.client.user);
    if (!perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
      return interaction.reply({
        content: "❌ I don't have **Connect** and **Speak** permissions in that channel!",
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      await joinChannel(voiceChannel);
      await interaction.editReply(
        `✅ Joined **${voiceChannel.name}**!\n` +
        `I'll stay here 24/7 and auto-reconnect if dropped. Use \`/leave\` to disconnect me.`
      );
    } catch (err) {
      logger.error('Join command error:', err);
      await interaction.editReply('❌ Failed to join the voice channel. Please try again.');
    }
  },
};
