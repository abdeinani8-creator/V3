const SpotifyWebApi = require('spotify-web-api-node');
const logger = require('../utils/logger');

let spotify = null;
let tokenExpiresAt = 0;

// ── Init ──────────────────────────────────────────────────────
function init() {
  if (!process.env.SPOTIFY_CLIENT_ID || !process.env.SPOTIFY_CLIENT_SECRET) return;

  spotify = new SpotifyWebApi({
    clientId:     process.env.SPOTIFY_CLIENT_ID,
    clientSecret: process.env.SPOTIFY_CLIENT_SECRET,
  });

  logger.info('Spotify service initialised');
}

// ── Auto-refresh access token (client credentials) ────────────
async function ensureToken() {
  if (Date.now() < tokenExpiresAt) return;

  const data = await spotify.clientCredentialsGrant();
  spotify.setAccessToken(data.body.access_token);
  // Tokens last 3600 s; refresh 60 s early
  tokenExpiresAt = Date.now() + (data.body.expires_in - 60) * 1000;
  logger.debug('Spotify access token refreshed');
}

// ── Parse Spotify URL type and ID ─────────────────────────────
function parseUrl(url) {
  const match = url.match(/spotify\.com\/(track|playlist|album)\/([A-Za-z0-9]+)/);
  if (!match) return null;
  return { type: match[1], id: match[2] };
}

// ── Resolve Spotify URL → array of { title, artist } ─────────
async function resolve(url) {
  if (!spotify) return null;

  const parsed = parseUrl(url);
  if (!parsed) return null;

  await ensureToken();

  try {
    if (parsed.type === 'track') {
      const res   = await spotify.getTrack(parsed.id);
      const track = res.body;
      return [{
        title:  track.name,
        artist: track.artists.map((a) => a.name).join(', '),
        album:  track.album.name,
        image:  track.album.images?.[0]?.url ?? null,
      }];
    }

    if (parsed.type === 'playlist') {
      const res    = await spotify.getPlaylist(parsed.id);
      const tracks = res.body.tracks.items
        .filter((i) => i.track && !i.track.is_local)
        .slice(0, 50)
        .map((i) => ({
          title:  i.track.name,
          artist: i.track.artists.map((a) => a.name).join(', '),
          album:  i.track.album.name,
          image:  i.track.album.images?.[0]?.url ?? null,
        }));
      return tracks;
    }

    if (parsed.type === 'album') {
      const res    = await spotify.getAlbum(parsed.id);
      const album  = res.body;
      return album.tracks.items.slice(0, 50).map((t) => ({
        title:  t.name,
        artist: t.artists.map((a) => a.name).join(', '),
        album:  album.name,
        image:  album.images?.[0]?.url ?? null,
      }));
    }
  } catch (err) {
    logger.error('Spotify resolve error:', err.message);
  }

  return null;
}

function isAvailable() {
  return !!spotify;
}

module.exports = { init, resolve, isAvailable };
