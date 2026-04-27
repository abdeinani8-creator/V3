const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('stop')
    .setDescription('Stop music and clear the queue'),
  cooldown: 3,

  async execute(interaction) {
    const queue = getQueue(interaction.guild.id);

    if (!queue) {
      return interaction.reply({ content: "❌ I'm not playing anything!", ephemeral: true });
    }

    queue.destroy();
    await interaction.reply('⏹ Stopped playback and cleared the queue.');
  },
};
