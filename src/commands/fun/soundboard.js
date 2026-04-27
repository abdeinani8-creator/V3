const {
  SlashCommandBuilder,
  EmbedBuilder,
} = require('discord.js');
const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  entersState,
  VoiceConnectionStatus,
} = require('@discordjs/voice');
const path   = require('path');
const fs     = require('fs');
const logger = require('../../utils/logger');
const { COLORS } = require('../../utils/embeds');

// Place .mp3 / .ogg files in sounds/ folder at the project root
const SOUNDS_DIR = path.join(__dirname, '../../../sounds');

function listSounds() {
  if (!fs.existsSync(SOUNDS_DIR)) return [];
  return fs
    .readdirSync(SOUNDS_DIR)
    .filter((f) => /\.(mp3|ogg|wav)$/i.test(f))
    .map((f) => f.replace(/\.[^.]+$/, '')); // strip extension for display
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('soundboard')
    .setDescription('Play a sound clip in your voice channel')
    .addStringOption((opt) =>
      opt
        .setName('sound')
        .setDescription('Name of the sound to play (omit to list available sounds)')
        .setRequired(false)
    ),
  cooldown: 5,

  async execute(interaction) {
    const soundName = interaction.options.getString('sound');

    // List available sounds
    if (!soundName) {
      const sounds = listSounds();
      const embed = new EmbedBuilder()
        .setColor(COLORS.purple)
        .setTitle('🎵 Available Sounds')
        .setDescription(
          sounds.length
            ? sounds.map((s) => `• \`${s}\``).join('\n')
            : 'No sounds found. Add `.mp3` / `.ogg` files to the `sounds/` folder.'
        );
      return interaction.reply({ embeds: [embed], ephemeral: true });
    }

    // Find the sound file
    const sounds = listSounds();
    const match  = sounds.find((s) => s.toLowerCase() === soundName.toLowerCase());

    if (!match) {
      return interaction.reply({
        content: `❌ Sound \`${soundName}\` not found. Use \`/soundboard\` (no argument) to list sounds.`,
        ephemeral: true,
      });
    }

    const voiceChannel = interaction.member.voice.channel;
    if (!voiceChannel) {
      return interaction.reply({
        content: '❌ Join a voice channel first!',
        ephemeral: true,
      });
    }

    await interaction.deferReply();

    try {
      const connection = joinVoiceChannel({
        channelId:      voiceChannel.id,
        guildId:        interaction.guild.id,
        adapterCreator: interaction.guild.voiceAdapterCreator,
        selfDeaf:       false,
        selfMute:       false,
      });

      await entersState(connection, VoiceConnectionStatus.Ready, 10_000);

      // Find the actual file with extension
      const file = fs
        .readdirSync(SOUNDS_DIR)
        .find((f) => f.replace(/\.[^.]+$/, '').toLowerCase() === match.toLowerCase());

      const player   = createAudioPlayer();
      const resource = createAudioResource(path.join(SOUNDS_DIR, file));

      connection.subscribe(player);
      player.play(resource);

      await entersState(player, AudioPlayerStatus.Idle, 30_000);

      // Don't destroy if the /join command also has a session — just stop
      connection.destroy();

      await interaction.editReply(`🔊 Played **${match}** in **${voiceChannel.name}**!`);
    } catch (err) {
      logger.error('Soundboard error:', err);
      await interaction.editReply('❌ Failed to play the sound.');
    }
  },
};
