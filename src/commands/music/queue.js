const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../../services/musicService');
const { COLORS } = require('../../utils/embeds');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('queue')
    .setDescription('Show the current music queue'),
  cooldown: 5,

  async execute(interaction) {
    const queue = getQueue(interaction.guild.id);

    if (!queue || (!queue.current && queue.songs.length === 0)) {
      return interaction.reply({ content: '❌ The queue is empty!', ephemeral: true });
    }

    const upcoming = queue.songs.slice(0, 10);
    const rows = upcoming.map((s, i) => `**${i + 1}.** [${s.title}](${s.url}) — \`${s.duration || '?:??'}\``);

    const embed = new EmbedBuilder()
      .setColor(COLORS.primary)
      .setTitle(`🎵 Music Queue — ${interaction.guild.name}`)
      .addFields({
        name: '▶️ Now Playing',
        value: queue.current
          ? `[${queue.current.title}](${queue.current.url}) — \`${queue.current.duration || '?:??'}\``
          : 'Nothing',
      });

    if (rows.length) {
      embed.addFields({
        name: `📋 Up Next (${queue.songs.length} song${queue.songs.length !== 1 ? 's' : ''})`,
        value: rows.join('\n') + (queue.songs.length > 10 ? `\n…and ${queue.songs.length - 10} more` : ''),
      });
    }

    embed
      .addFields({ name: '🔁 Loop', value: queue.loop ? 'On' : 'Off', inline: true })
      .setFooter({ text: 'Use /skip /pause /stop to control playback' });

    await interaction.reply({ embeds: [embed] });
  },
};
