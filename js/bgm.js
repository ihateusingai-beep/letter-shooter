// js/bgm.js — procedural background music (no asset files)
// Three ambient tracks: space / xylophone / rain. Default OFF (SEN safety).
// All use gentle volume + fade-in/out — never abrupt.

let bgmCtx = null;
let bgmMaster = null;       // master gain for the BGM bus
let activeNodes = [];       // currently scheduled audio sources/nodes
let loopTimers = [];        // setInterval ids for rhythmic tracks
let isPlaying = false;
let currentTrack = null;

const BASE_VOL = 0.18;      // gentle global BGM volume

// ── Lazy init ─────────────────────────────────────────────────────────────
function ensureCtx() {
  if (bgmCtx) return bgmCtx;
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  bgmCtx = new AC();
  bgmMaster = bgmCtx.createGain();
  bgmMaster.gain.value = 0;
  bgmMaster.connect(bgmCtx.destination);
  return bgmCtx;
}

// Called from start button click (same gesture that unlocks SFX)
export function unlockBgm() {
  ensureCtx();
  if (bgmCtx && bgmCtx.state === 'suspended') bgmCtx.resume();
}

// ── Stop everything ───────────────────────────────────────────────────────
function tearDown() {
  loopTimers.forEach(id => clearInterval(id));
  loopTimers = [];
  activeNodes.forEach(n => {
    try {
      if (n.stop) n.stop();
      if (n.disconnect) n.disconnect();
    } catch {}
  });
  activeNodes = [];
}

// ── Public API ────────────────────────────────────────────────────────────

export function startBgm(trackName) {
  if (!ensureCtx()) return;
  if (!trackName || trackName === 'off') {
    stopBgm();
    return;
  }
  if (bgmCtx.state === 'suspended') bgmCtx.resume();

  tearDown();
  currentTrack = trackName;
  isPlaying = true;

  // Fade in
  bgmMaster.gain.cancelScheduledValues(bgmCtx.currentTime);
  bgmMaster.gain.setValueAtTime(bgmMaster.gain.value, bgmCtx.currentTime);
  bgmMaster.gain.linearRampToValueAtTime(BASE_VOL, bgmCtx.currentTime + 1.5);

  if (trackName === 'space')      startSpace();
  else if (trackName === 'xylophone') startXylophone();
  else if (trackName === 'rain')      startRain();
}

export function stopBgm() {
  if (!bgmCtx || !bgmMaster) { isPlaying = false; return; }
  bgmMaster.gain.cancelScheduledValues(bgmCtx.currentTime);
  bgmMaster.gain.setValueAtTime(bgmMaster.gain.value, bgmCtx.currentTime);
  bgmMaster.gain.linearRampToValueAtTime(0, bgmCtx.currentTime + 0.4);
  isPlaying = false;
  currentTrack = null;
  setTimeout(tearDown, 500);
}

export function pauseBgm() {
  if (!bgmCtx || !bgmMaster || !isPlaying) return;
  bgmMaster.gain.cancelScheduledValues(bgmCtx.currentTime);
  bgmMaster.gain.setValueAtTime(bgmMaster.gain.value, bgmCtx.currentTime);
  bgmMaster.gain.linearRampToValueAtTime(0, bgmCtx.currentTime + 0.25);
}

export function resumeBgm() {
  if (!bgmCtx || !bgmMaster || !isPlaying || !currentTrack) return;
  if (bgmCtx.state === 'suspended') bgmCtx.resume();
  bgmMaster.gain.cancelScheduledValues(bgmCtx.currentTime);
  bgmMaster.gain.setValueAtTime(bgmMaster.gain.value, bgmCtx.currentTime);
  bgmMaster.gain.linearRampToValueAtTime(BASE_VOL, bgmCtx.currentTime + 0.4);
}

// ── Track generators ──────────────────────────────────────────────────────

// SPACE: 3 sustained sine pads at low octaves, slow tremolo
function startSpace() {
  const t = bgmCtx.currentTime;
  const notes = [130.81, 196.00, 261.63]; // C3, G3, C4
  notes.forEach((freq, i) => {
    const osc = bgmCtx.createOscillator();
    const g = bgmCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Slow tremolo via LFO
    const lfo = bgmCtx.createOscillator();
    const lfoGain = bgmCtx.createGain();
    lfo.frequency.value = 0.15 + i * 0.05; // different LFO rates
    lfoGain.gain.value = 0.04;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);

    g.gain.value = 0.20 / notes.length;
    osc.connect(g);
    g.connect(bgmMaster);
    osc.start(t);
    lfo.start(t);
    activeNodes.push(osc, lfo, g, lfoGain);
  });
}

// XYLOPHONE: pentatonic plucks on a gentle loop
function startXylophone() {
  // C major pentatonic: C D E G A across two octaves
  const scale = [261.63, 293.66, 329.63, 392.00, 440.00,
                 523.25, 587.33, 659.25, 783.99, 880.00];
  let idx = 0;

  const playNote = () => {
    const t = bgmCtx.currentTime;
    const freq = scale[idx % scale.length];
    idx++;

    const osc = bgmCtx.createOscillator();
    const g = bgmCtx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;

    // Soft pluck envelope
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(0.25, t + 0.01);
    g.gain.exponentialRampToValueAtTime(0.001, t + 1.2);

    osc.connect(g);
    g.connect(bgmMaster);
    osc.start(t);
    osc.stop(t + 1.3);

    setTimeout(() => {
      try { osc.disconnect(); g.disconnect(); } catch {}
    }, 1500);
  };

  // First note immediately, then every 2.5s
  playNote();
  const id = setInterval(playNote, 2500);
  loopTimers.push(id);
}

// RAIN: brown noise through bandpass + slow amplitude variation
function startRain() {
  const t = bgmCtx.currentTime;
  const bufferSize = 2 * bgmCtx.sampleRate;
  const buffer = bgmCtx.createBuffer(1, bufferSize, bgmCtx.sampleRate);
  const data = buffer.getChannelData(0);

  // Brown noise = random walk on amplitude
  let last = 0;
  for (let i = 0; i < bufferSize; i++) {
    last = (last + (Math.random() - 0.5) * 0.05);
    last = Math.max(-1, Math.min(1, last * 0.99));
    data[i] = last * 0.5;
  }

  const source = bgmCtx.createBufferSource();
  source.buffer = buffer;
  source.loop = true;

  const bandpass = bgmCtx.createBiquadFilter();
  bandpass.type = 'bandpass';
  bandpass.frequency.value = 1400;
  bandpass.Q.value = 0.6;

  const g = bgmCtx.createGain();
  g.gain.value = 1.2;

  // Slow LFO modulating amplitude
  const lfo = bgmCtx.createOscillator();
  const lfoGain = bgmCtx.createGain();
  lfo.frequency.value = 0.08;
  lfoGain.gain.value = 0.3;
  lfo.connect(lfoGain);
  lfoGain.connect(g.gain);

  source.connect(bandpass);
  bandpass.connect(g);
  g.connect(bgmMaster);
  source.start(t);
  lfo.start(t);
  activeNodes.push(source, bandpass, g, lfo, lfoGain);
}