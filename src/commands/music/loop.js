const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('loop')
    .setDescription('Toggle loop mode for the current queue'),
  cooldown: 2,

  async execute(interaction) {
    const queue = getQueue(interaction.guild.id);

    if (!queue) {
      return interaction.reply({ content: "❌ I'm not in a voice channel!", ephemeral: true });
    }

    queue.loop = !queue.loop;
    await interaction.reply(queue.loop ? '🔁 Loop **enabled** — queue will repeat.' : '➡️ Loop **disabled**.');
  },
};
