// js/curriculum.js — U1–U9 unit map + robot unlock milestones

export const UNITS = {
  U1:  { newLetters: ['A', 'B', 'C'],   reviewLetters: [],       step: 1 },
  U2:  { newLetters: ['E', 'F', 'S'],   reviewLetters: ['A'],    step: 1 },
  U3:  { newLetters: ['I', 'O', 'T'],   reviewLetters: ['B'],    step: 1 },
  U4:  { newLetters: ['M', 'P', 'H'],   reviewLetters: ['E'],    step: 1 },
  U5:  { newLetters: ['D', 'G', 'U'],   reviewLetters: ['A'],    step: 1 },
  U6:  { newLetters: ['L', 'R', 'N'],   reviewLetters: ['T'],    step: 1 },
  U7:  { newLetters: ['J', 'K', 'W'],   reviewLetters: ['S'],    step: 1 },
  U8:  { newLetters: ['V', 'X', 'Q'],   reviewLetters: ['P'],    step: 1 },
  U9:  { newLetters: ['Y', 'Z'],        reviewLetters: [],       step: 1 },
  U10: { newLetters: [],                reviewLetters: [],       step: 1, allMastered: true }, // mixed review of all 26
};

// Robot unlock milestones: [9, 18, 26] → 3 total robots
export const ROBOT_MILESTONES = [9, 18, 26];
export const TOTAL_ROBOTS = ROBOT_MILESTONES.length + 1; // 3 milestones + base = 4 robots

export function currentRobotIndex(masteredCount) {
  let idx = 0;
  for (const m of ROBOT_MILESTONES) {
    if (masteredCount >= m) idx++;
  }
  return idx; // 0 = base, 1 = milestone 1, etc.
}

export function unlockedRobot(masteredCount) {
  return currentRobotIndex(masteredCount);
}

// For MVP, return active letters from current unit
export function activeLetters(unitKey) {
  // Phase 18 — Custom level (e.g. 'C1', 'C2'): teacher-defined letter group
  if (typeof unitKey === 'string' && unitKey.startsWith('C')) {
    const idx = parseInt(unitKey.slice(1), 10) - 1;
    if (Number.isFinite(idx) && idx >= 0) {
      const groups = parseCustomLevels(getCustomLevelsRaw());
      if (groups[idx]) return groups[idx];
    }
    return ['A', 'B', 'C']; // fallback if index out of range
  }
  const unit = UNITS[unitKey];
  if (!unit) return ['A', 'B', 'C'];
  // U10: mixed review — all 26 letters
  if (unit.allMastered) {
    return 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  }
  const all = [...unit.newLetters];
  // Phase 16.5 patch — `all.length < 3` was always false since newLetters
  // already has 3. Switched to < 6 so review letters actually join the pool.
  // Was: U2 only showed E/F/S, A was defined as review but never appeared.
  if (unit.reviewLetters.length && all.length < 6) {
    all.push(...unit.reviewLetters.slice(0, 6 - all.length));
  }
  return all.slice(0, 6);
}

// Helper: read raw customLevels string from localStorage
function getCustomLevelsRaw() {
  if (typeof localStorage === 'undefined') return '';
  try {
    const raw = localStorage.getItem('ls-settings');
    if (!raw) return '';
    const parsed = JSON.parse(raw);
    return parsed.customLevels || '';
  } catch {
    return '';
  }
}

// ── Unit completion check (Phase 14d) ────────────────────────────────────────
export function isUnitComplete(prog, unitKey) {
  const unit = UNITS[unitKey];
  if (!unit) return false;
  const letters = [...unit.newLetters];
  return letters.length > 0 && letters.every(l => prog[l]?.status === 'mastered');
}

// Mastery threshold: 6/10
export const MASTERY_THRESHOLD = 6;
export const MASTERY_WINDOW = 10;

// Phase 18 — Custom levels (teacher-defined letter groups)
// Storage: settings.customLevels = "ABC,DEF,GHI" (comma-separated)
// Returns: array of letter arrays, e.g. [['A','B','C'], ['D','E','F'], ['G','H','I']]
// Validates: A-Z only, max 6 per group, dedupe within group, trim.
export function parseCustomLevels(rawString) {
  if (!rawString || typeof rawString !== 'string') return [];
  const seen = new Set();
  const result = [];
  rawString.split(',').forEach(group => {
    const letters = [];
    const groupSeen = new Set();
    group.toUpperCase().split('').forEach(ch => {
      if (ch >= 'A' && ch <= 'Z' && !groupSeen.has(ch)) {
        groupSeen.add(ch);
        letters.push(ch);
      }
    });
    if (letters.length > 0 && letters.length <= 6) {
      // Dedupe groups by content (so identical groups don't duplicate)
      const key = letters.join('');
      if (!seen.has(key)) {
        seen.add(key);
        result.push(letters);
      }
    }
  });
  return result;
}

// Returns array of custom unit keys like ['C1', 'C2', 'C3']
// Empty array if no custom levels defined.
export function getCustomUnitKeys() {
  const settings = (typeof localStorage !== 'undefined')
    ? JSON.parse(localStorage.getItem('ls-settings') || '{}')
    : {};
  const groups = parseCustomLevels(settings.customLevels || '');
  return groups.map((_, i) => `C${i + 1}`);
}
