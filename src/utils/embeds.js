const { EmbedBuilder } = require('discord.js');

const COLORS = {
  primary: 0x5865F2,
  success: 0x57F287,
  warning: 0xFEE75C,
  error:   0xED4245,
  gold:    0xFFD700,
  purple:  0x9B59B6,
};

function errorEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.error)
    .setDescription(`❌ ${message}`)
    .setTimestamp();
}

function successEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.success)
    .setDescription(`✅ ${message}`)
    .setTimestamp();
}

function infoEmbed(title, description) {
  return new EmbedBuilder()
    .setColor(COLORS.primary)
    .setTitle(title)
    .setDescription(description)
    .setTimestamp();
}

function warningEmbed(message) {
  return new EmbedBuilder()
    .setColor(COLORS.warning)
    .setDescription(`⚠️ ${message}`)
    .setTimestamp();
}

module.exports = { errorEmbed, successEmbed, infoEmbed, warningEmbed, COLORS };
