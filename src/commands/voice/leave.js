const { SlashCommandBuilder } = require('discord.js');
const { leaveChannel, getCurrentChannel } = require('../../services/voiceService');

module.exports = {
  data: new SlashCommandBuilder()
    .setName('leave')
    .setDescription('Disconnect from the voice channel'),
  cooldown: 5,

  async execute(interaction) {
    const channel = getCurrentChannel(interaction.guild.id);

    if (!channel) {
      return interaction.reply({
        content: "❌ I'm not in a voice channel right now!",
        ephemeral: true,
      });
    }

    leaveChannel(interaction.guild.id);
    await interaction.reply(`👋 Left **${channel.name}**. Use \`/join\` to bring me back!`);
  },
};
