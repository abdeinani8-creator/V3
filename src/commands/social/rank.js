const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getUserData, xpForLevel } = require('../../services/xpService');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('rank')
    .setDescription("Check your (or another user's) XP rank and level")
    .addUserOption((opt) =>
      opt.setName('user').setDescription('User to check (defaults to you)').setRequired(false)
    ),
  cooldown: 5,

  async execute(interaction) {
    const target   = interaction.options.getUser('user') ?? interaction.user;
    const userData = getUserData(interaction.guild.id, target.id);

    const { level, xp } = userData;
    const xpCurrentLevel = Math.floor(xpForLevel(level));
    const xpNextLevel    = Math.floor(xpForLevel(level + 1));
    const xpProgress     = xp - xpCurrentLevel;
    const xpNeeded       = xpNextLevel - xpCurrentLevel;
    const pct            = Math.min(100, Math.floor((xpProgress / xpNeeded) * 100));

    // 10-block progress bar
    const filled = Math.round(pct / 10);
    const bar    = '█'.repeat(filled) + '░'.repeat(10 - filled);

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`${target.username}'s Rank`)
      .setThumbnail(target.displayAvatarURL({ dynamic: true, size: 128 }))
      .addFields(
        { name: '🏆 Level',    value: `${level}`,                  inline: true },
        { name: '✨ Total XP', value: `${xp.toLocaleString()} XP`, inline: true },
        {
          name: '📈 Progress to Next Level',
          value: `\`${bar}\` ${pct}%\n${xpProgress.toLocaleString()} / ${xpNeeded.toLocaleString()} XP`,
        }
      )
      .setFooter({ text: 'Keep chatting to earn more XP!' })
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
