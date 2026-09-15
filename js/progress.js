// js/progress.js — per-letter progress tracking

const STORAGE_KEY = 'ls-progress';

function freshProgress() {
  return {
    A: { status: 'new', seen: 0, firstTryOk: 0, recent: [] },
    B: { status: 'new', seen: 0, firstTryOk: 0, recent: [] },
    C: { status: 'new', seen: 0, firstTryOk: 0, recent: [] },
    D: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    E: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    F: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    G: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    H: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    I: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    J: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    K: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    L: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    M: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    N: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    O: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    P: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    Q: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    R: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    S: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    T: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    U: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    V: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    W: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    X: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    Y: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
    Z: { status: 'unopened', seen: 0, firstTryOk: 0, recent: [] },
  };
}

export function loadProgress() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...freshProgress(), ...JSON.parse(raw) } : freshProgress();
  } catch {
    return freshProgress();
  }
}

export function saveProgress(data) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export function recordAttempt(letter, firstTry) {
  const prog = loadProgress();
  const entry = prog[letter];
  if (!entry) return prog;

  entry.seen++;
  if (firstTry) entry.firstTryOk++;

  // Rolling window of 10
  entry.recent.push(firstTry ? 1 : 0);
  if (entry.recent.length > 10) entry.recent.shift();

  // Update status
  if (entry.seen === 1) {
    entry.status = 'new';
  } else if (entry.recent.length >= 10) {
    const ok = entry.recent.reduce((a, b) => a + b, 0);
    entry.status = ok >= 6 ? 'mastered' : 'practice';
  } else {
    entry.status = 'practice';
  }

  saveProgress(prog);
  return prog;
}

export function masteredCount(prog) {
  return Object.values(prog).filter(e => e.status === 'mastered').length;
}

export function letterStatus(letter) {
  return loadProgress()[letter]?.status ?? 'unopened';
}
