const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('resume')
    .setDescription('Resume a paused song'),
  cooldown: 2,

  async execute(interaction) {
    const queue = getQueue(interaction.guild.id);

    if (!queue?.current) {
      return interaction.reply({ content: '❌ Nothing is paused!', ephemeral: true });
    }

    const resumed = queue.resume();
    await interaction.reply(resumed ? '▶️ Resumed!' : '⚠️ Already playing.');
  },
};
