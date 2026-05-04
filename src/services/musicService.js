const {
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  joinVoiceChannel,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const play    = require('play-dl');
const spotify = require('./spotifyService');
const { EmbedBuilder } = require('discord.js');
const logger = require('../utils/logger');

const queues      = new Map();   // guildId -> GuildQueue
const IDLE_MS     = 5 * 60_000; // leave after 5 min of silence

// ── Helpers ───────────────────────────────────────────────────
function fmtDuration(raw) {
  if (!raw) return '?:??';
  if (typeof raw === 'string') return raw;
  const s = Math.floor(raw / 1000);
  const m = Math.floor(s / 60);
  return `${m}:${String(s % 60).padStart(2, '0')}`;
}

function nowPlayingEmbed(song) {
  return new EmbedBuilder()
    .setColor(0x1DB954)
    .setTitle('🎵 Now Playing')
    .setDescription(`**[${song.title}](${song.url})**`)
    .addFields(
      { name: '⏱ Duration',     value: song.duration || '?:??',       inline: true },
      { name: '👤 Requested by', value: `<@${song.requestedBy}>`,      inline: true }
    )
    .setThumbnail(song.thumbnail ?? null)
    .setTimestamp();
}

// ── GuildQueue class ──────────────────────────────────────────
class GuildQueue {
  constructor(guild, voiceChannel, textChannel) {
    this.guild        = guild;
    this.voiceChannel = voiceChannel;
    this.textChannel  = textChannel;
    this.connection   = null;
    this.songs        = [];
    this.current      = null;
    this.loop         = false;
    this._idleTimer   = null;

    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });

    this.player.on(AudioPlayerStatus.Idle, () => this._onIdle());
    this.player.on('error', (err) => {
      logger.error('Player error:', err.message);
      this.textChannel?.send(`❌ Playback error — skipping.`).catch(() => {});
      this._playNext();
    });
  }

  // ── Connection ──────────────────────────────────────────────
  async connect() {
    this.connection = joinVoiceChannel({
      channelId:      this.voiceChannel.id,
      guildId:        this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf:       true,
    });

    await entersState(this.connection, VoiceConnectionStatus.Ready, 30_000);
    this.connection.subscribe(this.player);

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  // ── Queue management ────────────────────────────────────────
  async addSong(song) {
    this.songs.push(song);
    if (!this.current) await this._playNext();
  }

  _onIdle() {
    if (this.loop && this.current) this.songs.unshift(this.current);
    this._playNext();
  }

  async _playNext() {
    this._clearIdle();

    if (this.songs.length === 0) {
      this.current = null;
      this._startIdle();
      return;
    }

    const song    = this.songs.shift();
    this.current  = song;

    try {
      const source   = await play.stream(song.url, { quality: 2 });
      const resource = createAudioResource(source.stream, { inputType: source.type });
      this.player.play(resource);
      this.textChannel?.send({ embeds: [nowPlayingEmbed(song)] }).catch(() => {});
    } catch (err) {
      logger.error('Stream error:', err.message);
      this.textChannel?.send(`❌ Could not stream **${song.title}** — skipping.`).catch(() => {});
      await this._playNext();
    }
  }

  // ── Controls ────────────────────────────────────────────────
  skip()   { this.player.stop(true); }
  pause()  { return this.player.pause(); }
  resume() { return this.player.unpause(); }

  destroy() {
    this._clearIdle();
    this.songs   = [];
    this.current = null;
    try { this.player.stop(true); } catch {}
    try { this.connection?.destroy(); } catch {}
    queues.delete(this.guild.id);
  }

  get status() { return this.player.state.status; }

  // ── Idle timer ──────────────────────────────────────────────
  _startIdle() {
    this._idleTimer = setTimeout(() => {
      if (!this.current) {
        this.textChannel?.send('👋 Queue finished — leaving voice channel.').catch(() => {});
        this.destroy();
      }
    }, IDLE_MS);
  }

  _clearIdle() {
    if (this._idleTimer) { clearTimeout(this._idleTimer); this._idleTimer = null; }
  }
}

// ── Resolve a query to song objects ──────────────────────────
async function resolveQuery(query) {
  // Detect URL type
  const ytType = play.yt_validate(query);

  if (ytType === 'video') {
    const info = await play.video_info(query);
    const v    = info.video_details;
    return [{ title: v.title, url: v.url, duration: v.durationRaw, thumbnail: v.thumbnails?.[0]?.url }];
  }

  if (ytType === 'playlist') {
    const pl     = await play.playlist_info(query, { incomplete: true });
    const videos = await pl.all_videos();
    return videos.slice(0, 50).map((v) => ({
      title: v.title, url: v.url, duration: v.durationRaw, thumbnail: v.thumbnails?.[0]?.url,
    }));
  }

  // SoundCloud
  try {
    const soType = await play.so_validate(query);
    if (soType === 'track') {
      const info = await play.soundcloud(query);
      return [{ title: info.name, url: info.url, duration: fmtDuration(info.durationInMs), thumbnail: info.thumbnail }];
    }
  } catch {}

  // Spotify — resolve via Spotify API then search YouTube for each track
  if (query.includes('spotify.com')) {
    if (!spotify.isAvailable()) return null; // no credentials set

    const spTracks = await spotify.resolve(query);
    if (!spTracks || spTracks.length === 0) return null;

    const songs = [];
    for (const sp of spTracks) {
      const searchTerm = `${sp.title} ${sp.artist}`;
      try {
        const results = await play.search(searchTerm, { source: { youtube: 'video' }, limit: 1 });
        if (results.length) {
          songs.push({
            title:     `${sp.title} — ${sp.artist}`,
            url:       results[0].url,
            duration:  results[0].durationRaw,
            thumbnail: sp.image ?? results[0].thumbnails?.[0]?.url,
          });
        }
      } catch { /* skip unresolvable tracks */ }
    }
    return songs.length ? songs : null;
  }

  // Generic URL — try direct stream
  if (query.startsWith('http://') || query.startsWith('https://')) {
    return [{ title: query, url: query, duration: '?:??', thumbnail: null }];
  }

  // Plain text search → YouTube
  const results = await play.search(query, { source: { youtube: 'video' }, limit: 1 });
  if (!results.length) return null;
  const v = results[0];
  return [{ title: v.title, url: v.url, duration: v.durationRaw, thumbnail: v.thumbnails?.[0]?.url }];
}

// ── Public API ────────────────────────────────────────────────
async function getOrCreateQueue(guild, voiceChannel, textChannel) {
  if (queues.has(guild.id)) {
    const q = queues.get(guild.id);
    q.textChannel = textChannel;
    return q;
  }
  const q = new GuildQueue(guild, voiceChannel, textChannel);
  queues.set(guild.id, q);
  await q.connect();
  return q;
}

function getQueue(guildId) {
  return queues.get(guildId) ?? null;
}

module.exports = { getOrCreateQueue, getQueue, resolveQuery };
