const { read, write, FILES } = require('../utils/dataStore');

const XP_MIN = 5;
const XP_MAX = 25;
const XP_DAILY_MIN = 100;
const XP_DAILY_MAX = 400;

// Level formula: level = floor(0.1 * sqrt(xp))
function calcLevel(xp) {
  return Math.floor(0.1 * Math.sqrt(xp));
}

// Minimum XP required to reach a given level
function xpForLevel(level) {
  return Math.pow(level / 0.1, 2);
}

function randomXP(min = XP_MIN, max = XP_MAX) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// ── CRUD helpers ──────────────────────────────────────────────
function getAll() {
  return read(FILES.xp);
}

function getUserData(guildId, userId) {
  const data = getAll();
  return data?.[guildId]?.[userId] ?? { xp: 0, level: 0 };
}

function addXP(guildId, userId, amount) {
  const data = getAll();
  if (!data[guildId]) data[guildId] = {};
  if (!data[guildId][userId]) data[guildId][userId] = { xp: 0, level: 0 };

  data[guildId][userId].xp += amount;
  const newLevel = calcLevel(data[guildId][userId].xp);
  const leveledUp = newLevel > data[guildId][userId].level;
  data[guildId][userId].level = newLevel;

  write(FILES.xp, data);
  return {
    leveledUp,
    newLevel,
    xp: data[guildId][userId].xp,
  };
}

function getLeaderboard(guildId, limit = 10) {
  const data = getAll();
  if (!data[guildId]) return [];

  return Object.entries(data[guildId])
    .map(([userId, d]) => ({ userId, ...d }))
    .sort((a, b) => b.xp - a.xp)
    .slice(0, limit);
}

module.exports = {
  addXP,
  getUserData,
  getLeaderboard,
  calcLevel,
  xpForLevel,
  randomXP,
  XP_MIN,
  XP_MAX,
  XP_DAILY_MIN,
  XP_DAILY_MAX,
};
