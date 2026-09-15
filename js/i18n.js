// js/i18n.js — bilingual labels
export const i18n = {
  en: {
    score: 'Score',
    settings: 'Settings',
    unit: 'Unit',
    voice: 'Voice',
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
    // robot unlock
    robotUnlock: 'New robot unlocked!',
    // touch key labels
  },
  zh: {
    score: '分數',
    settings: '設定',
    unit: '單元',
    voice: '語音',
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
    robotUnlock: '新機械人解鎖了！',
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

export function setLang(lang) {
  localStorage.setItem('ls-lang', lang);
}
