const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const { getOrCreateQueue, resolveQuery } = require('../../services/musicService');
const logger = require('../../utils/logger');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('play')
    .setDescription('Play music from YouTube, SoundCloud, or search terms')
    .addStringOption((opt) =>
      opt
        .setName('query')
        .setDescription('YouTube URL / SoundCloud URL / search terms')
        .setRequired(true)
    ),
  cooldown: 3,

  async execute(interaction) {
    const query        = interaction.options.getString('query');
    const voiceChannel = interaction.member.voice.channel;

    if (!voiceChannel) {
      return interaction.reply({ content: '❌ You need to be in a voice channel first!', ephemeral: true });
    }

    const perms = voiceChannel.permissionsFor(interaction.client.user);
    if (!perms.has(PermissionFlagsBits.Connect) || !perms.has(PermissionFlagsBits.Speak)) {
      return interaction.reply({ content: "❌ I don't have **Connect/Speak** permissions in that channel!", ephemeral: true });
    }

    if (query.includes('spotify.com')) {
      return interaction.reply({
        content: '⚠️ Spotify links require extra credentials.\nTip: paste the **song name** instead and I\'ll find it on YouTube!',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const songs = await resolveQuery(query);

      if (!songs || songs.length === 0) {
        return interaction.editReply('❌ No results found. Try a different search term or URL.');
      }

      const queue = await getOrCreateQueue(interaction.guild, voiceChannel, interaction.channel);

      for (const song of songs) {
        await queue.addSong({ ...song, requestedBy: interaction.user.id });
      }

      if (songs.length === 1) {
        const song  = songs[0];
        const embed = new EmbedBuilder()
          .setColor(0x1DB954)
          .setTitle(queue.current?.url === song.url ? '🎵 Now Playing' : '✅ Added to Queue')
          .setDescription(`**[${song.title}](${song.url})**`)
          .addFields(
            { name: '⏱ Duration',      value: song.duration || '?:??',        inline: true },
            { name: '📋 Queue length',  value: `${queue.songs.length} song(s)`, inline: true }
          )
          .setThumbnail(song.thumbnail ?? null)
          .setFooter({ text: `Requested by ${interaction.user.username}` });

        await interaction.editReply({ embeds: [embed] });
      } else {
        await interaction.editReply(`✅ Added **${songs.length} songs** to the queue!`);
      }
    } catch (err) {
      logger.error('Play command error:', err);
      await interaction.editReply('❌ Failed to play that track. Check the URL or try searching by name.');
    }
  },
};
