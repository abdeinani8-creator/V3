require('dotenv').config();
const {
  Client,
  GatewayIntentBits,
  Partials,
  Collection,
} = require('discord.js');
const fs = require('fs');
const path = require('path');
const logger = require('./src/utils/logger');

// ── Validate required env vars ────────────────────────────────
if (!process.env.DISCORD_TOKEN) {
  logger.error('DISCORD_TOKEN is not set in .env — exiting.');
  process.exit(1);
}
if (!process.env.CLIENT_ID) {
  logger.error('CLIENT_ID is not set in .env — exiting.');
  process.exit(1);
}

// Prevent false memory-leak warnings from discord.js WebSocket internals
require('events').EventEmitter.defaultMaxListeners = 20;

// ── Create client ─────────────────────────────────────────────
const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildMessageReactions,
  ],
  partials: [Partials.Message, Partials.Channel, Partials.Reaction],
});

client.commands = new Collection();
client.cooldowns = new Collection();

// ── Load commands ─────────────────────────────────────────────
const commandsPath = path.join(__dirname, 'src', 'commands');
const commandFolders = fs.readdirSync(commandsPath);

for (const folder of commandFolders) {
  const folderPath = path.join(commandsPath, folder);
  if (!fs.statSync(folderPath).isDirectory()) continue;

  const commandFiles = fs
    .readdirSync(folderPath)
    .filter((f) => f.endsWith('.js'));

  for (const file of commandFiles) {
    const command = require(path.join(folderPath, file));
    if ('data' in command && 'execute' in command) {
      client.commands.set(command.data.name, command);
      logger.debug(`Loaded command: ${command.data.name}`);
    } else {
      logger.warn(`Skipped ${file} — missing data or execute export`);
    }
  }
}

logger.info(`Loaded ${client.commands.size} commands`);

// ── Load events ───────────────────────────────────────────────
const eventsPath = path.join(__dirname, 'src', 'events');
const eventFiles = fs
  .readdirSync(eventsPath)
  .filter((f) => f.endsWith('.js'));

for (const file of eventFiles) {
  const event = require(path.join(eventsPath, file));
  const handler = (...args) => event.execute(...args, client);

  if (event.once) {
    client.once(event.name, handler);
  } else {
    client.on(event.name, handler);
  }
  logger.debug(`Loaded event: ${event.name}`);
}

logger.info(`Loaded ${eventFiles.length} events`);

// ── Global error guards ───────────────────────────────────────
process.on('unhandledRejection', (error) => {
  logger.error('Unhandled promise rejection:', error);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught exception:', error);
  // Give logger time to flush, then exit so process manager can restart
  setTimeout(() => process.exit(1), 1000);
});

// ── Login ─────────────────────────────────────────────────────
client.login(process.env.DISCORD_TOKEN).catch((err) => {
  logger.error('Failed to log in:', err.message);
  process.exit(1);
});
