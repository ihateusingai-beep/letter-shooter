// js/settings.js — localStorage-backed settings
const DEFAULTS = {
  voice: true,       // TTS on/off
  soundFx: true,     // SFX chime / streak / unlock sounds
  bgm: false,        // Background music (default OFF — SEN overstimulation safety)
  bgmTrack: 'space', // 'space' | 'xylophone' | 'rain' — only used when bgm=true
  theme: 'space',    // 'space' | 'candy' | 'ocean' | 'forest'
  speed: 'slow',      // 'verySlow' | 'slow' | 'medium'
  highContrast: false,
  reduceMotion: false,
  lang: 'zh',         // UI language: 'zh' | 'en'
  currentUnit: 'U1',
  level: 'L0',        // 'L0' | 'L1'
  kbMode: 'full',     // 'full' | 'compact' — full shows 26 QWERTY, compact shows only target letter
  robotColor: 0,      // 0/1/2 — robot palette index (Phase 16f)
  mascotTheme: 'auto', // 'auto' | 'space' | 'candy' | 'ocean' | 'forest' (Phase 16f)
  gameMode: 'classic', // 'classic' | 'sound' | 'sequence' | 'word' (Phase 17 — secondary SEN variants)
  caseMode: 'upper',  // 'upper' | 'lower' — display letter case (Phase 17 W4)
};

export function loadSettings() {
  try {
    const raw = localStorage.getItem('ls-settings');
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
  } catch {
    return { ...DEFAULTS };
  }
}

export function saveSettings(patch) {
  const current = loadSettings();
  const next = { ...current, ...patch };
  localStorage.setItem('ls-settings', JSON.stringify(next));
  return next;
}

export function getSetting(key) {
  return loadSettings()[key];
}

// Fall speed in seconds (L1 only)
export function fallDuration() {
  const map = { verySlow: 12, slow: 8, medium: 5 };
  return map[getSetting('speed')] ?? 8;
}
