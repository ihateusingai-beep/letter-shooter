// js/i18n.js — bilingual labels
export const i18n = {
  en: {
    score: 'Score',
    settings: 'Settings',
    unit: 'Unit',
    voice: 'Voice',
    soundFx: 'Sound Effects',
    bgm: 'Background Music',
    on: 'On',
    off: 'Off',
    speed: 'Speed',
    verySlow: 'Very Slow',
    slow: 'Slow',
    medium: 'Medium',
    highContrast: 'High Contrast',
    reduceMotion: 'Reduce Motion',
    close: 'Close',
    start: 'Start',
    next: 'Next',
    mastered: 'Mastered',
    practice: 'Practice',
    newLetter: 'New',
    streak: 'Streak',
    robotUnlock: 'New robot unlocked!',
    // Praise phrases (random pick on correct)
    praise: ['Great!', 'Yes!', 'Wonderful!', 'Awesome!', 'Nice!'],
    // Wrong-answer gentle nudge (no fail language)
    nudge: ['Try once more!', 'Almost! Keep going!', 'You can do it!'],
  },
  zh: {
    score: '分數',
    settings: '設定',
    unit: '單元',
    voice: '語音',
    soundFx: '音效',
    bgm: '背景音樂',
    on: '開',
    off: '關',
    speed: '速度',
    verySlow: '很慢',
    slow: '慢',
    medium: '中',
    highContrast: '高對比',
    reduceMotion: '減動畫',
    close: '關',
    start: '開始',
    next: '下一題',
    mastered: '已掌握',
    practice: '練習中',
    newLetter: '新學',
    streak: '連對',
    robotUnlock: '新機械人解鎖了！',
    praise: ['做得好！', '很好！', '太棒了！', '好叻！', '繼續！'],
    nudge: ['再試一次！', '差少少！', '加油！'],
  }
};

// Active language key — default from localStorage or 'zh'
export function getLang() {
  return localStorage.getItem('ls-lang') || 'zh';
}

export function t(key) {
  const lang = getLang();
  return i18n[lang]?.[key] ?? i18n['zh'][key] ?? key;
}

// Random pick from array (e.g. praise, nudge)
export function pickT(key) {
  const lang = getLang();
  const arr = i18n[lang]?.[key] ?? i18n['zh'][key];
  if (!Array.isArray(arr) || arr.length === 0) return key;
  return arr[Math.floor(Math.random() * arr.length)];
}

export function setLang(lang) {
  localStorage.setItem('ls-lang', lang);
}
