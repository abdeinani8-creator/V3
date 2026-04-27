const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../../data');

const FILES = {
  xp:       path.join(DATA_DIR, 'xp.json'),
  daily:    path.join(DATA_DIR, 'daily.json'),
  warnings: path.join(DATA_DIR, 'warnings.json'),
};

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

function read(filePath) {
  ensureDir();
  if (!fs.existsSync(filePath)) return {};
  try {
    return JSON.parse(fs.readFileSync(filePath, 'utf8'));
  } catch {
    return {};
  }
}

function write(filePath, data) {
  ensureDir();
  // Atomic write via temp file to prevent corruption on crash
  const tmp = `${filePath}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2), 'utf8');
  fs.renameSync(tmp, filePath);
}

module.exports = { read, write, FILES };
