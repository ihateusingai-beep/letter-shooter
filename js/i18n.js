// js/i18n.js — bilingual labels
export const i18n = {
  en: {
    score: 'Score',
    settings: 'Settings',
    unit: 'Unit',
    voice: 'Voice',
    soundFx: 'Sound Effects',
    bgm: 'Background Music',
    bgmOff: 'Off',
    bgmSpace: 'Space',
    bgmXylophone: 'Xylophone',
    bgmRain: 'Rain',
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
    theme: 'Theme',
    themeSpace: 'Space',
    themeCandy: 'Candy',
    themeOcean: 'Ocean',
    themeForest: 'Forest',
    robotUnlock: 'New robot unlocked!',
    // Phase 17 — game mode selector
    gameMode: 'Game Mode',
    gameModeClassic: 'Classic (single letter)',
    gameModeSound: 'Sound-only (listen & press)',
    gameModeSequence: 'Sequence (3 in a row)',
    gameModeWord: 'Word Mode (spell emoji)',
    soundModeHint: '👂 Listen & press the letter',
    sequenceModeHint: 'Press letters in order',
    wordModeHint: 'Spell the word',
    // Phase 17 W4 — case correspondence mode
    caseMode: 'Letter Case',
    caseModeUpper: 'Uppercase (A)',
    caseModeLower: 'Lowercase (a)',
    // Phase 17 W1 — Word bank (emoji → 3-letter word). SEN-friendly 3-letter
    // words covering animals / objects / nature / body parts / actions.
    wordBank: [
      'CAT', 'DOG', 'PIG', 'BEE', 'OWL', 'BAT',
      'BUS', 'CAR', 'BED', 'CUP', 'HAT', 'KEY',
      'SUN', 'SEA', 'SKY',
      'EAR', 'EYE', 'TOE', 'ARM', 'LEG',
      'HUG', 'RUN', 'SIT', 'EAT', 'JUMP',
    ],
    wordEmojis: {
      CAT: '🐱', DOG: '🐶', PIG: '🐷', BEE: '🐝', OWL: '🦉', BAT: '🦇',
      BUS: '🚌', CAR: '🚗', BED: '🛏️', CUP: '☕', HAT: '🎩', KEY: '🔑',
      SUN: '☀️', SEA: '🌊', SKY: '🌌',
      EAR: '👂', EYE: '👁️', TOE: '🦶', ARM: '💪', LEG: '🦵',
      HUG: '🤗', RUN: '🏃', SIT: '🪑', EAT: '🍽️', JUMP: '🤸',
    },
    // Praise phrases (random pick on correct)
    praise: ['Great!', 'Yes!', 'Wonderful!', 'Awesome!', 'Nice!'],
    // Wrong-answer gentle nudge (no fail language)
    nudge: ['Try once more!', 'Almost! Keep going!', 'You can do it!'],
    // Speed round (Phase 16a)
    speedRoundTitle: '⚡ SPEED ROUND ⚡',
    speedRoundStart: '5s to score!',
    speedRoundEnd: 'Time! Bonus',
    speedRoundBonus: 'Bonus +{n} ⭐',
    // Contextual letter-symbol phrases (Phase 16b)
    letterPhrases: {
      A: 'A is for ✈️ Airplane!',
      B: 'B is for 🏀 Ball!',
      C: 'C is for 🌙 Crescent!',
      D: 'D is for 💎 Diamond!',
      E: 'E is for ⭐ Star!',
      F: 'F is for 🐟 Fish!',
      G: 'G is for 🍇 Grapes!',
      H: 'H is for ❤️ Heart!',
      I: 'I is for 🍦 Ice cream!',
      J: 'J is for 🧃 Juice!',
      K: 'K is for 🔑 Key!',
      L: 'L is for 🍋 Lemon!',
      M: 'M is for 🌊 Wave!',
      N: 'N is for 🌙 Night!',
      O: 'O is for 🍊 Orange!',
      P: 'P is for 🍕 Pizza!',
      Q: 'Q is for 👑 Queen!',
      R: 'R is for 🌈 Rainbow!',
      S: 'S is for ☀️ Sun!',
      T: 'T is for 🌳 Tree!',
      U: 'U is for ☂️ Umbrella!',
      V: 'V is for 🎻 Violin!',
      W: 'W is for 🐋 Whale!',
      X: 'X marks the spot!',
      Y: 'Y is for 🪀 Yo-Yo!',
      Z: 'Z is for ⚡ Lightning!',
    },
  },
  zh: {
    score: '分數',
    settings: '設定',
    unit: '單元',
    voice: '語音',
    soundFx: '音效',
    bgm: '背景音樂',
    bgmOff: '關',
    bgmSpace: '太空',
    bgmXylophone: '木琴',
    bgmRain: '雨聲',
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
    theme: '主題',
    themeSpace: '太空',
    themeCandy: '糖果',
    themeOcean: '海洋',
    themeForest: '森林',
    robotUnlock: '新機械人解鎖了！',
    // Phase 17 — game mode selector
    gameMode: '遊戲模式',
    gameModeClassic: '經典 (單字母)',
    gameModeSound: '聽音 (聽到按)',
    gameModeSequence: '連擊 (順序 3 個)',
    gameModeWord: '拼字 (emoji 變字)',
    soundModeHint: '👂 聽到個音,按對應字母',
    sequenceModeHint: '按順序打中 3 個字母',
    wordModeHint: '拼出呢個字',
    // Phase 17 W4 — case correspondence mode
    caseMode: '字母大細階',
    caseModeUpper: '大階 (A)',
    caseModeLower: '細階 (a)',
    // Note: wordBank + wordEmojis are in the `en` block — they're
    // language-independent spelling targets (English letters + universal emoji).
    praise: ['做得好！', '很好！', '太棒了！', '好叻！', '繼續！'],
    nudge: ['再試一次！', '差少少！', '加油！'],
    // Speed round (Phase 16a)
    speedRoundTitle: '⚡ 限時挑戰 ⚡',
    speedRoundStart: '5 秒快答！',
    speedRoundEnd: '時間到！獎勵',
    speedRoundBonus: '獎勵 +{n} ⭐',
    // Contextual letter-symbol phrases (Phase 16b)
    letterPhrases: {
      A: 'A 係 ✈️ 飛機！',
      B: 'B 係 🏀 波！',
      C: 'C 係 🌙 月亮！',
      D: 'D 係 💎 鑽石！',
      E: 'E 係 ⭐ 星星！',
      F: 'F 係 🐟 魚！',
      G: 'G 係 🍇 提子！',
      H: 'H 係 ❤️ 愛心！',
      I: 'I 係 🍦 雪糕！',
      J: 'J 係 🧃 果汁！',
      K: 'K 係 🔑 鎖匙！',
      L: 'L 係 🍋 檸檬！',
      M: 'M 係 🌊 波浪！',
      N: 'N 係 🌙 夜晚！',
      O: 'O 係 🍊 橙！',
      P: 'P 係 🍕 薄餅！',
      Q: 'Q 係 👑 皇后！',
      R: 'R 係 🌈 彩虹！',
      S: 'S 係 ☀️ 太陽！',
      T: 'T 係 🌳 大樹！',
      U: 'U 係 ☂️ 雨遮！',
      V: 'V 係 🎻 小提琴！',
      W: 'W 係 🐋 鯨魚！',
      X: 'X 標記個位置！',
      Y: 'Y 係 🪀 溜溜球！',
      Z: 'Z 係 ⚡ 閃電！',
    },
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
