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
  // Phase 19.7 (B2) — U10 mixed review sub-pool: avoid 26-letter overwhelm
  // by composing a ~12-letter pool from practice (not-yet-mastered) + random
  // mastered letters. Returns 'all 26' fallback only if localStorage is empty.
  if (unit.allMastered) {
    const prog = readProgressSafe();
    return buildU10SubPool(prog);
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

// Phase 19.7 (B2) — Helper: read ls-progress with try/catch fallback.
// Returns null on parse failure or missing key (caller must handle).
function readProgressSafe() {
  if (typeof localStorage === 'undefined') return null;
  try {
    const raw = localStorage.getItem('ls-progress');
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

// Phase 19.7 (B2) — Build U10 sub-pool from per-letter progress.
// Composition rules:
//   1. Try up to 6 unmastered letters (status: 'practice' or 'new')
//   2. Fill rest up to 12 with random mastered letters
//   3. If total < 12, leave it short (don't pad with unopened letters —
//      would confuse students who haven't seen those letters yet)
//   4. If progress is null/empty/all-unopened, fallback to first 12 alphabet
// Cap at 12 to avoid U10 overwhelm — Phase 17/18 polish feedback.
function buildU10SubPool(prog) {
  const ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  if (!prog || typeof prog !== 'object') {
    return ALL.slice(0, 12);
  }
  // Bucket letters by status. 'new' counts as practice (it's a letter that
  // has been seen but not mastered yet — relevant for U10 review).
  const practiceLetters = [];
  const masteredLetters = [];
  for (const L of ALL) {
    const s = prog[L]?.status;
    if (s === 'mastered') masteredLetters.push(L);
    else if (s === 'practice' || s === 'new') practiceLetters.push(L);
    // 'unopened' is excluded — student hasn't encountered it yet, would
    // only confuse them in U10 mixed review
  }
  // Defensive fallback: if no letters classified (e.g. empty {} storage),
  // return first 12 letters deterministically rather than random sampling.
  if (practiceLetters.length === 0 && masteredLetters.length === 0) {
    return ALL.slice(0, 12);
  }
  // Fisher-Yates shuffle (in-place, deterministic with seeded callers)
  const shuffled = (arr) => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };
  const MAX_POOL = 12;
  const MAX_PER_BUCKET = 6;
  const practicePick = shuffled(practiceLetters).slice(0, MAX_PER_BUCKET);
  // Mastered pool fills the remainder: if practice < 6, take up to (12 - practice)
  // mastered; if practice = 6, take up to 6 mastered; never exceed MAX_POOL.
  const masteredCap = Math.max(0, MAX_POOL - practicePick.length);
  const masteredPick = shuffled(masteredLetters).slice(0, masteredCap);
  return [...practicePick, ...masteredPick].slice(0, MAX_POOL);
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

// Mastery window: rolling 10 attempts (Phase 1 — unchanged)
// Mastery threshold is now teacher-overrideable via settings.masteryThreshold
// (Phase 19.5). Default 6 (= 60% correct). Read via getMasteryThreshold().
export const MASTERY_WINDOW = 10;
export const DEFAULT_MASTERY_THRESHOLD = 6;
export const ALLOWED_MASTERY_THRESHOLDS = [5, 6, 7, 8];

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

// Phase 19.5 — Mastery threshold is now teacher-overrideable via settings.
// Returns the active threshold from localStorage, falling back to default.
// Validates against ALLOWED_MASTERY_THRESHOLDS; coerces invalid values to default.
export function getMasteryThreshold() {
  let raw = 6;
  try {
    if (typeof localStorage !== 'undefined') {
      const parsed = JSON.parse(localStorage.getItem('ls-settings') || '{}');
      raw = Number(parsed.masteryThreshold);
    }
  } catch {}
  return ALLOWED_MASTERY_THRESHOLDS.includes(raw) ? raw : DEFAULT_MASTERY_THRESHOLD;
}
