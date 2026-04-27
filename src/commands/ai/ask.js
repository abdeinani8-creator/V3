const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getAIReply } = require('../../services/aiService');
const { COLORS }     = require('../../utils/embeds');
const logger         = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('ask')
    .setDescription('Ask the AI a question')
    .addStringOption((opt) =>
      opt
        .setName('question')
        .setDescription('Your question')
        .setRequired(true)
        .setMaxLength(500)
    ),
  cooldown: 5,

  async execute(interaction) {
    const question = interaction.options.getString('question');
    await interaction.deferReply();

    try {
      const answer = await getAIReply(
        interaction.user.id,
        interaction.channel.id,
        question,
        interaction.guild.name
      );

      const embed = new EmbedBuilder()
        .setColor(COLORS.primary)
        .addFields(
          { name: '❓ Question', value: question },
          { name: '🤖 Answer',   value: answer   }
        )
        .setFooter({
          text: `Asked by ${interaction.user.username}`,
          iconURL: interaction.user.displayAvatarURL(),
        })
        .setTimestamp();

      await interaction.editReply({ embeds: [embed] });
    } catch (err) {
      logger.error('Ask command error:', err);
      await interaction.editReply('❌ Failed to get an AI response. Please try again!');
    }
  },
};
