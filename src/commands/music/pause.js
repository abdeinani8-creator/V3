const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('pause')
    .setDescription('Pause the current song'),
  cooldown: 2,

  async execute(interaction) {
    const queue = getQueue(interaction.guild.id);

    if (!queue?.current) {
      return interaction.reply({ content: '❌ Nothing is playing!', ephemeral: true });
    }

    const paused = queue.pause();
    await interaction.reply(paused ? '⏸ Paused. Use `/resume` to continue.' : '⚠️ Already paused.');
  },
};
