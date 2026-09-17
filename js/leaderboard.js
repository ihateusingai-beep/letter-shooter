// js/leaderboard.js — localStorage-backed leaderboard for completed units
// SEN-friendly: short list (top 10), friendly display, name validation.

const STORAGE_KEY = 'ls-leaderboard';
const MAX_ENTRIES = 10;
const MAX_NAME_LEN = 12;

// ── Read / write ───────────────────────────────────────────────────────────
function readAll() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}
function writeAll(list) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list));
  } catch {}
}

// ── Public API ─────────────────────────────────────────────────────────────
export function getLeaderboard() {
  // Sort by score desc, then earliest completion (lower timestamp first)
  return readAll()
    .slice()
    .sort((a, b) => b.score - a.score || a.completedAt - b.completedAt)
    .slice(0, MAX_ENTRIES);
}

// Submit a new entry — name validation, dedupe by name+unit
export function submitEntry({ name, score, unit }) {
  const cleanName = String(name || '').trim().slice(0, MAX_NAME_LEN);
  if (!cleanName) return null;
  const all = readAll();
  const entry = {
    name: cleanName,
    score: Math.max(0, Number(score) || 0),
    unit: String(unit || ''),
    completedAt: Date.now(),
  };
  all.push(entry);
  // Keep top 50 raw entries before sorting/limiting on read
  writeAll(all.slice(-50));
  return entry;
}

export function clearLeaderboard() {
  writeAll([]);
}

// Sanitize name: strip whitespace, replace invalid chars
export function sanitizeName(raw) {
  return String(raw || '')
    .trim()
    .replace(/[^\p{L}\p{N}\s]/gu, '')     // letters/numbers/spaces only
    .slice(0, MAX_NAME_LEN);
}

export const MAX_NAME = MAX_NAME_LEN;