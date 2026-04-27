const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getLeaderboard } = require('../../services/xpService');
const { COLORS } = require('../../utils/embeds');

const MEDALS = ['🥇', '🥈', '🥉'];

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leaderboard')
    .setDescription('View the top 10 XP earners in this server'),
  cooldown: 10,

  async execute(interaction) {
    await interaction.deferReply();

    const top = getLeaderboard(interaction.guild.id, 10);

    if (top.length === 0) {
      return interaction.editReply(
        "No one has earned XP yet! Start chatting to appear on the board! 💬"
      );
    }

    const rows = top.map((entry, i) => {
      const badge = MEDALS[i] ?? `**${i + 1}.**`;
      return `${badge} <@${entry.userId}> — Level **${entry.level}** · ${entry.xp.toLocaleString()} XP`;
    });

    const embed = new EmbedBuilder()
      .setColor(COLORS.gold)
      .setTitle(`🏆 ${interaction.guild.name} — XP Leaderboard`)
      .setDescription(rows.join('\n'))
      .setThumbnail(interaction.guild.iconURL() ?? null)
      .setFooter({ text: 'Earn XP by chatting every minute • Top 10' })
      .setTimestamp();

    await interaction.editReply({ embeds: [embed] });
  },
};
