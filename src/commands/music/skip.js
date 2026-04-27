const { SlashCommandBuilder } = require('discord.js');
const { getQueue } = require('../../services/musicService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('skip')
    .setDescription('Skip the current song'),
  cooldown: 2,

  async execute(interaction) {
    const queue = getQueue(interaction.guild.id);

    if (!queue || !queue.current) {
      return interaction.reply({ content: '❌ Nothing is playing right now!', ephemeral: true });
    }

    const skipped = queue.current.title;
    queue.skip();
    await interaction.reply(`⏭ Skipped **${skipped}**.`);
  },
};
