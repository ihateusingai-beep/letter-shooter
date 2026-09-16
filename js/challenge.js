// js/challenge.js — Daily / Weekly star goal tracking
// SEN-friendly: explicit target, milestone celebration, date-based reset.

const DAILY_GOAL = 20;     // default stars per day
const WEEKLY_GOAL = 100;    // default stars per week

// ── Date helpers ───────────────────────────────────────────────────────────
function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function weekKey() {
  const d = new Date();
  // ISO week: get first Thursday of year, count weeks from there
  const target = new Date(d.valueOf());
  const dayNr = (d.getDay() + 6) % 7;     // Monday = 0
  target.setDate(target.getDate() - dayNr + 3);
  const firstThursday = target.valueOf();
  target.setMonth(0, 1);
  if (target.getDay() !== 4) {
    target.setMonth(0, 1 + ((4 - target.getDay()) + 7) % 7);
  }
  const weekNum = 1 + Math.ceil((firstThursday - target) / 604800000);
  return `${d.getFullYear()}-W${String(weekNum).padStart(2, '0')}`;
}

// ── Storage helpers ────────────────────────────────────────────────────────
function readBucket(key) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : { stars: 0, milestonesFired: [] };
  } catch {
    return { stars: 0, milestonesFired: [] };
  }
}
function writeBucket(key, bucket) {
  try {
    localStorage.setItem(key, JSON.stringify(bucket));
  } catch {}
}

// ── Public API ─────────────────────────────────────────────────────────────
export function getDailyProgress() {
  return readBucket('ls-daily-' + todayKey());
}
export function getWeeklyProgress() {
  return readBucket('ls-weekly-' + weekKey());
}

// Called from handleKey on correct answer
export function recordStar() {
  const daily = getDailyProgress();
  daily.stars++;
  writeBucket('ls-daily-' + todayKey(), daily);

  const weekly = getWeeklyProgress();
  weekly.stars++;
  writeBucket('ls-weekly-' + weekKey(), weekly);

  // Check if a new milestone crossed for daily
  const milestones = [0.25, 0.5, 0.75, 1.0];
  const prevRatio = (daily.stars - 1) / DAILY_GOAL;
  const newRatio = daily.stars / DAILY_GOAL;
  for (const m of milestones) {
    if (prevRatio < m && newRatio >= m && !daily.milestonesFired.includes(m)) {
      daily.milestonesFired.push(m);
      writeBucket('ls-daily-' + todayKey(), daily);
      // Return milestone kind for caller to celebrate
      return { dailyMilestone: m, daily: daily.stars, weekly: weekly.stars };
    }
  }
  return { daily: daily.stars, weekly: weekly.stars };
}

export function dailyGoal() { return DAILY_GOAL; }
export function weeklyGoal() { return WEEKLY_GOAL; }