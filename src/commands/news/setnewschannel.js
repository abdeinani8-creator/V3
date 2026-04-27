const { SlashCommandBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const { postDailyNews } = require('../../services/schedulerService');
const fs   = require('fs');
const path = require('path');

const SETTINGS_FILE = path.join(__dirname, '../../../data/settings.json');

function readSettings() {
  if (!fs.existsSync(SETTINGS_FILE)) return {};
  try { return JSON.parse(fs.readFileSync(SETTINGS_FILE, 'utf8')); } catch { return {}; }
}

function writeSettings(data) {
  fs.mkdirSync(path.dirname(SETTINGS_FILE), { recursive: true });
  fs.writeFileSync(SETTINGS_FILE, JSON.stringify(data, null, 2));
}

module.exports = {
  data: new SlashCommandBuilder()
    .setName('setnewschannel')
    .setDescription('Set the channel for daily gaming & AI news (posts at 9 AM UTC)')
    .addChannelOption((opt) =>
      opt
        .setName('channel')
        .setDescription('The channel to post news in')
        .addChannelTypes(ChannelType.GuildText)
        .setRequired(true)
    )
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),
  cooldown: 5,

  async execute(interaction) {
    const channel  = interaction.options.getChannel('channel');
    const settings = readSettings();

    if (!settings[interaction.guild.id]) settings[interaction.guild.id] = {};
    settings[interaction.guild.id].newsChannelId = channel.id;
    writeSettings(settings);

    await interaction.reply({
      content:
        `✅ Daily news will be posted in ${channel} every day at **9:00 AM UTC**.\n\n` +
        `Sending a preview now…`,
    });

    // Send a preview immediately
    try {
      const { fetchAndBuildNews } = require('../../services/newsService');
      const embeds = await fetchAndBuildNews();
      await channel.send({ embeds });
    } catch (err) {
      await interaction.followUp({ content: '⚠️ Preview failed — but the daily schedule is saved.', ephemeral: true });
    }
  },
};
