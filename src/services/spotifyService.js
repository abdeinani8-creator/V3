const logger = require('../utils/logger');

// song.link (odesli) — free public API, no credentials needed
// Returns track title + artist from any Spotify URL
const SONGLINK = 'https://api.song.link/v1-alpha.1/links?url=';

function parseUrl(url) {
  const m = url.match(/spotify\.com\/(track|playlist|album)\/([A-Za-z0-9]+)/);
  return m ? { type: m[1], id: m[2] } : null;
}

// ── Resolve Spotify URL → [{ title, artist, image }] ─────────
async function resolve(url) {
  const parsed = parseUrl(url);
  if (!parsed) return null;

  if (parsed.type !== 'track') {
    // Playlists/albums need credentials — return a signal
    return { error: 'playlist' };
  }

  try {
    const res  = await fetch(SONGLINK + encodeURIComponent(url));
    if (!res.ok) return null;

    const data   = await res.json();
    const entity = Object.values(data.entitiesByUniqueId ?? {})[0];

    if (!entity?.title) return null;

    return [{
      title:  entity.title,
      artist: entity.artistName ?? '',
      image:  entity.thumbnailUrl ?? null,
    }];
  } catch (err) {
    logger.error('Spotify resolve error:', err.message);
    return null;
  }
}

function isAvailable() { return true; }
function init() { logger.info('Spotify ready (powered by song.link — no credentials needed)'); }

module.exports = { init, resolve, isAvailable };
