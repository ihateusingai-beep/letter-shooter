// js/settings.js — localStorage-backed settings
const DEFAULTS = {
  voice: true,       // TTS on/off
  speed: 'slow',      // 'verySlow' | 'slow' | 'medium'
  highContrast: false,
  reduceMotion: false,
  lang: 'zh',         // UI language: 'zh' | 'en'
  currentUnit: 'U1',
  level: 'L0',        // 'L0' | 'L1'
  kbMode: 'compact',  // 'full' | 'compact' — compact shows only target letter
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
