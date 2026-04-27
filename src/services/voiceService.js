const {
  joinVoiceChannel,
  VoiceConnectionStatus,
  entersState,
  getVoiceConnection,
} = require('@discordjs/voice');
const logger = require('../utils/logger');

// guildId -> { connection, channel }
const sessions = new Map();

// ── Join ──────────────────────────────────────────────────────
async function joinChannel(channel) {
  const { id: guildId } = channel.guild;

  // Tear down any existing session first
  const existing = sessions.get(guildId);
  if (existing) {
    existing.connection.destroy();
    sessions.delete(guildId);
  }

  const connection = joinVoiceChannel({
    channelId:       channel.id,
    guildId,
    adapterCreator:  channel.guild.voiceAdapterCreator,
    selfDeaf:        true,
    selfMute:        true,
  });

  try {
    await entersState(connection, VoiceConnectionStatus.Ready, 30_000);
    logger.info(`Joined voice: ${channel.name} (${channel.guild.name})`);
  } catch (err) {
    connection.destroy();
    throw err;
  }

  sessions.set(guildId, { connection, channel });
  setupReconnect(guildId);
  return connection;
}

// ── Auto-reconnect ────────────────────────────────────────────
function setupReconnect(guildId) {
  const session = sessions.get(guildId);
  if (!session) return;

  const { connection, channel } = session;

  connection.on(VoiceConnectionStatus.Disconnected, async () => {
    logger.warn(`Voice disconnected in guild ${guildId} — attempting reconnect`);

    try {
      // Discord may be signalling a normal move; wait briefly
      await Promise.race([
        entersState(connection, VoiceConnectionStatus.Signalling,  5_000),
        entersState(connection, VoiceConnectionStatus.Connecting,  5_000),
      ]);
      // If we get here, it's reconnecting on its own
    } catch {
      // Truly dropped — rejoin from scratch with exponential backoff
      connection.destroy();
      sessions.delete(guildId);

      let delay = 5_000;
      for (let attempt = 1; attempt <= 5; attempt++) {
        logger.info(`Reconnect attempt ${attempt}/5 in ${delay / 1000}s…`);
        await sleep(delay);
        delay = Math.min(delay * 2, 60_000);

        try {
          await joinChannel(channel);
          logger.info(`Reconnected to voice on attempt ${attempt}`);
          return;
        } catch (e) {
          logger.warn(`Reconnect attempt ${attempt} failed:`, e.message);
        }
      }
      logger.error(`Gave up reconnecting to voice in guild ${guildId}`);
    }
  });
}

// ── Leave ─────────────────────────────────────────────────────
function leaveChannel(guildId) {
  const session = sessions.get(guildId);
  if (!session) return false;
  session.connection.destroy();
  sessions.delete(guildId);
  return true;
}

// ── Helpers ───────────────────────────────────────────────────
function getConnection(guildId) {
  return sessions.get(guildId)?.connection ?? null;
}

function getCurrentChannel(guildId) {
  return sessions.get(guildId)?.channel ?? null;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

module.exports = { joinChannel, leaveChannel, getConnection, getCurrentChannel };
