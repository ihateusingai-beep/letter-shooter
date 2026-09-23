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
  level: 'L1',        // 'L0' | 'L1' — Phase 19.9 changed default to falling letters (was 'L0')
  kbMode: 'full',     // 'full' | 'compact' — full shows 26 QWERTY, compact shows only target letter
  robotColor: 0,      // 0/1/2 — robot palette index (Phase 16f)
  mascotTheme: 'auto', // 'auto' | 'space' | 'candy' | 'ocean' | 'forest' (Phase 16f)
  gameMode: 'classic', // 'classic' | 'sound' | 'sequence' | 'word' (Phase 17 — secondary SEN variants)
  caseMode: 'upper',  // 'upper' | 'lower' — display letter case (Phase 17 W4)
  customLevels: '',   // teacher-defined letter groups, comma-separated (Phase 18)
                     // e.g. "ABC,DEF,GHI" → C1=ABC, C2=DEF, C3=GHI
  confettiIntensity: 'normal', // 'gentle' | 'normal' | 'party' — Phase 19.2 overstimulation control
                                // gentle = 12 particles, no emoji burst
                                // normal = 32 particles + 3 letter emoji (default)
                                // party  = 50 particles + 5 letter emoji, longer duration
  masteryThreshold: 6,         // 5 | 6 | 7 | 8 — Phase 19.5 teacher-overrideable mastery threshold
                                // Default 6 (= 60% in rolling 10-window) preserves current behavior.
                                // Lower for moderate-ID students who can't sustain 60% accuracy.
                                // Status re-evaluated on threshold change (see progress.js reevaluateAllStatuses).
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
