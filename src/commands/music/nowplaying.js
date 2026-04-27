const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const { getQueue } = require('../../services/musicService');
const { AudioPlayerStatus } = require('@discordjs/voice');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('nowplaying')
    .setDescription('Show what is currently playing'),
  cooldown: 3,

  async execute(interaction) {
    const queue = getQueue(interaction.guild.id);

    if (!queue?.current) {
      return interaction.reply({ content: '❌ Nothing is playing right now!', ephemeral: true });
    }

    const song   = queue.current;
    const paused = queue.status === AudioPlayerStatus.Paused;

    const embed = new EmbedBuilder()
      .setColor(0x1DB954)
      .setTitle(`${paused ? '⏸ Paused' : '🎵 Now Playing'}`)
      .setDescription(`**[${song.title}](${song.url})**`)
      .addFields(
        { name: '⏱ Duration',      value: song.duration || '?:??',            inline: true },
        { name: '👤 Requested by', value: `<@${song.requestedBy}>`,            inline: true },
        { name: '📋 Queue',        value: `${queue.songs.length} song(s) left`, inline: true }
      )
      .setThumbnail(song.thumbnail ?? null)
      .setTimestamp();

    await interaction.reply({ embeds: [embed] });
  },
};
