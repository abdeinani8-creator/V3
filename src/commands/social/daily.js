const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { read, write, FILES } = require('../../utils/dataStore');
const { addXP, randomXP, XP_DAILY_MIN, XP_DAILY_MAX } = require('../../services/xpService');
const { COLORS } = require('../../utils/embeds');

const COOLDOWN_MS = 24 * 60 * 60 * 1_000; // 24 hours

module.exports = {
  data: new SlashCommandBuilder()
    .setName('daily')
    .setDescription('Claim your daily XP reward (once every 24 hours)'),
  cooldown: 5,

  async execute(interaction) {
    const key       = `${interaction.guild.id}-${interaction.user.id}`;
    const dailyData = read(FILES.daily);
    const now       = Date.now();
    const lastClaim = dailyData[key] ?? 0;
    const remaining = COOLDOWN_MS - (now - lastClaim);

    if (remaining > 0) {
      const hours   = Math.floor(remaining / 3_600_000);
      const minutes = Math.floor((remaining % 3_600_000) / 60_000);
      return interaction.reply({
        content: `⏰ You already claimed today's reward! Come back in **${hours}h ${minutes}m**.`,
        ephemeral: true,
      });
    }

    const bonus = randomXP(XP_DAILY_MIN, XP_DAILY_MAX);
    dailyData[key] = now;
    write(FILES.daily, dailyData);

    const { newLevel, leveledUp } = addXP(
      interaction.guild.id,
      interaction.user.id,
      bonus
    );

    const nextClaimTs = Math.floor((now + COOLDOWN_MS) / 1000);

    const embed = new EmbedBuilder()
      .setColor(COLORS.success)
      .setTitle('🎁 Daily Reward Claimed!')
      .setDescription(
        `You received **+${bonus} XP**!` +
        (leveledUp ? `\n\n🎉 You leveled up to **Level ${newLevel}**!` : '')
      )
      .addFields({ name: '⏰ Next Reward', value: `<t:${nextClaimTs}:R>`, inline: true })
      .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
