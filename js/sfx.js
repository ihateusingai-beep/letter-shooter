// js/sfx.js — procedural sound effects via Web Audio API
// SEN-friendly: short, gentle, no harsh frequencies, no failure buzzers.

let ctx = null;            // AudioContext — lazy init on first user gesture
let masterGain = null;

// ── Lazy init ─────────────────────────────────────────────────────────────
function ensureCtx() {
  if (ctx) return ctx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  masterGain = ctx.createGain();
  masterGain.gain.value = 0.35;       // overall SFX volume (gentle)
  masterGain.connect(ctx.destination);
  return ctx;
}

export function unlockAudio() {
  // Called from start button click to satisfy iOS Safari gesture rule
  ensureCtx();
  if (ctx && ctx.state === 'suspended') ctx.resume();
}

// ── Core synth helpers ─────────────────────────────────────────────────────
function envelope(node, attack, decay, peak = 1) {
  const t = ctx.currentTime;
  node.gain.cancelScheduledValues(t);
  node.gain.setValueAtTime(0, t);
  node.gain.linearRampToValueAtTime(peak, t + attack);
  node.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay);
}

function tone(freq, duration, type = 'sine', vol = 0.3) {
  if (!ensureCtx()) return;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.value = freq;
  osc.connect(g);
  g.connect(masterGain);
  envelope(g, 0.01, duration, vol);
  osc.start();
  osc.stop(ctx.currentTime + duration + 0.05);
}

// ── Public SFX ─────────────────────────────────────────────────────────────

// Ascending 3-note chime (C5–E5–G5) — answers "you got it"
export function playCorrect() {
  if (!ensureCtx()) return;
  const notes = [523.25, 659.25, 783.99]; // C5, E5, G5
  notes.forEach((f, i) => {
    setTimeout(() => tone(f, 0.18, 'sine', 0.32), i * 70);
  });
}

// Gentle "try again" — single soft tone, descending
export function playWrong() {
  if (!ensureCtx()) return;
  // Soft E4 → C4 slide — supportive, not punitive
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = 'triangle';
  osc.frequency.setValueAtTime(330, ctx.currentTime);
  osc.frequency.linearRampToValueAtTime(262, ctx.currentTime + 0.25);
  osc.connect(g);
  g.connect(masterGain);
  envelope(g, 0.02, 0.3, 0.18);
  osc.start();
  osc.stop(ctx.currentTime + 0.4);
}

// Streak milestone — richer chord at 3, 5, 10
export function playStreak(n) {
  if (!ensureCtx()) return;
  const chords = {
    3: [523.25, 659.25, 783.99, 1046.5],  // C major
    5: [523.25, 659.25, 783.99, 1046.5, 1318.5], // C major + high C
    10: [523.25, 659.25, 783.99, 987.77, 1318.5, 1567.98], // wide chord
  };
  const chord = chords[n] || chords[3];
  chord.forEach((f, i) => {
    setTimeout(() => tone(f, 0.4, i % 2 ? 'triangle' : 'sine', 0.18), i * 50);
  });
}

// Robot unlock — fanfare
export function playUnlock() {
  if (!ensureCtx()) return;
  const seq = [392, 523.25, 659.25, 783.99, 1046.5]; // G4 → C5 fanfare
  seq.forEach((f, i) => {
    setTimeout(() => tone(f, 0.25, 'triangle', 0.28), i * 90);
  });
}

// Mute toggle
export function setMasterVolume(v) {
  if (masterGain) masterGain.gain.value = Math.max(0, Math.min(1, v));
}

// ── Haptic feedback (Phase 13b) — navigator.vibrate, best-effort ───────────
// iOS Safari does not support navigator.vibrate, but Android / Chrome do.
export function haptic(kind = 'light') {
  if (typeof navigator === 'undefined' || !navigator.vibrate) return;
  try {
    if (kind === 'light')        navigator.vibrate(15);
    else if (kind === 'medium')  navigator.vibrate(40);
    else if (kind === 'heavy')   navigator.vibrate(80);
    else if (kind === 'success') navigator.vibrate([20, 30, 40]);
    else if (kind === 'streak')  navigator.vibrate([30, 50, 30, 50, 60]);
  } catch {}
}