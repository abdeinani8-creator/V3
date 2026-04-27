const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

module.exports = {
  name: 'guildMemberAdd',
  once: false,
  async execute(member, client) {
    const channelId = process.env.WELCOME_CHANNEL_ID;
    if (!channelId) return;

    const channel = member.guild.channels.cache.get(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setColor(0x5865F2)
      .setTitle(`Welcome to ${member.guild.name}! 🎉`)
      .setDescription(
        `Hey ${member}, we're thrilled to have you here!\n\n` +
        `📜 Read the rules to get started.\n` +
        `💬 Introduce yourself in #introductions.\n` +
        `🤖 Chat with our AI using \`/ask\`.\n` +
        `✨ Earn XP by chatting and check your level with \`/rank\`.\n` +
        `🎁 Grab your daily XP with \`/daily\`.\n\n` +
        `Have fun and enjoy your stay! 🚀`
      )
      .setThumbnail(member.user.displayAvatarURL({ dynamic: true, size: 256 }))
      .addFields(
        {
          name: '👥 Member Count',
          value: `You are member #${member.guild.memberCount}`,
          inline: true,
        },
        {
          name: '📅 Account Age',
          value: `<t:${Math.floor(member.user.createdTimestamp / 1000)}:R>`,
          inline: true,
        }
      )
      .setFooter({
        text: member.guild.name,
        iconURL: member.guild.iconURL() ?? undefined,
      })
      .setTimestamp();

    try {
      await channel.send({ content: `Welcome ${member}!`, embeds: [embed] });
      logger.info(`Welcomed ${member.user.tag} to ${member.guild.name}`);
    } catch (err) {
      logger.error('Failed to send welcome message:', err);
    }
  },
};
