// js/game.js — core game loop: L0 / L1, shooting, scoring
import { loadSettings, saveSettings, fallDuration } from './settings.js';
import { loadProgress, recordAttempt, masteredCount } from './progress.js';
import { activeLetters, currentRobotIndex } from './curriculum.js';
import { t, pickT, setLang } from './i18n.js';
import { playCorrect, playWrong, playStreak, playUnlock, unlockAudio } from './sfx.js';
import { confettiBurst, streakFlash, megaFireworks, startLetterTrail, stopLetterTrail, letterSparkle, floatCombo } from './fx.js';
import { startBgm, stopBgm, pauseBgm, resumeBgm, unlockBgm } from './bgm.js';

// Attach public API to window for non-module HTML
window.LetterShooter = {
  startGame, handleKey, openSettings, closeSettings, applySettings,
  renderTouchKeys, speakLetter, shoot, flashSuccess, shakeLetter,
  showLetter, updateScore, drawRobot,
  loadSettings, fallDuration, setLang, unlockAudio, unlockBgm,
  openProgressPanel, closeProgressPanel,
  highlightKey, clearHighlight,
};

// ── State ──────────────────────────────────────────────────────────────────
let score = 0;
let streak = 0;
let stars = 0;            // cumulative stars (1 per correct)
let currentLetter = null;
let touchKeys = [];       // visible touch key letters
let gameRunning = false;
let animFrame = null;

// Toast queue — prevents overwrite on rapid unlocks
let toastTimer = null;
const toastQueue = [];

// ── DOM refs ────────────────────────────────────────────────────────────────
export function getEls() {
  return {
    letter:    document.getElementById('js-letter'),
    robot:     document.getElementById('js-robot'),
    bullet:    document.getElementById('js-bullet'),
    scoreEl:   document.getElementById('js-score'),
    unitEl:    document.getElementById('js-unit'),
    robotWrap: document.getElementById('js-robot-wrap'),
    flashEl:   document.getElementById('js-flash'),
  };
}

// ── Helpers ────────────────────────────────────────────────────────────────
function pickLetter(keys) {
  return keys[Math.floor(Math.random() * keys.length)];
}

export function updateScore() {
  const { scoreEl } = getEls();
  if (!scoreEl) return;
  scoreEl.textContent = score;
  // Pop animation
  scoreEl.classList.remove('pop');
  void scoreEl.offsetWidth;
  scoreEl.classList.add('pop');
  scoreEl.addEventListener('transitionend', () => scoreEl.classList.remove('pop'), { once: true });
  // Rainbow shift when streak ≥ 5 (Phase 8b)
  scoreEl.classList.toggle('rainbow', streak >= 5);
}

export function updateUnit(unitKey) {
  const { unitEl } = getEls();
  if (unitEl) unitEl.textContent = unitKey;
}

// ── Streak display ──────────────────────────────────────────────────────────
function updateStreak(n) {
  const el = document.getElementById('js-streak');
  if (!el) return;
  el.textContent = '×' + n;
  el.classList.toggle('zero', n === 0);
  if (n > 0) {
    el.classList.remove('pop');
    void el.offsetWidth;
    el.classList.add('pop');
  } else {
    el.classList.remove('pop');
  }
}

// ── Stars display + progress bar (Phase 6d) + next milestone (Phase 9a) ───
function updateStars(total) {
  const num = document.getElementById('js-stars-num');
  const bar = document.getElementById('js-stars-bar-fill');
  const next = document.getElementById('js-stars-next');
  if (num) num.textContent = total;
  // Find next milestone from ACHIEVEMENT_MILESTONES
  const milestones = ACHIEVEMENT_MILESTONES.map(m => m.stars);
  const nextMs = milestones.find(m => m > total);
  if (bar) {
    const target = nextMs || (total + 10);
    const prevMs = milestones.filter(m => m <= total).pop() || 0;
    const pct = Math.min(100, ((total - prevMs) / (target - prevMs)) * 100);
    bar.style.width = pct + '%';
  }
  if (next) {
    if (!nextMs) {
      next.textContent = '👑 MAX';
      next.classList.add('zero');
    } else {
      const remaining = nextMs - total;
      next.textContent = `下一個 ${remaining} 粒`;
      next.classList.remove('zero');
    }
  }
}

// ── TTS ────────────────────────────────────────────────────────────────────
export function speakLetter(letter) {
  const settings = loadSettings();
  if (!settings.voice) return;
  if (!('speechSynthesis' in window)) return;
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(letter.toUpperCase());
  u.lang = 'en-US';
  u.rate = 0.9;
  window.speechSynthesis.speak(u);
}

// ── Robot palettes per theme (Phase 3c) ────────────────────────────────────
const ROBOT_PALETTES = {
  space: [
    { body: '#1e3a5f', eye: '#4FC3F7', accent: '#4FC3F7', glow: 'rgba(79,195,247,0.6)' },
    { body: '#3d1f2f', eye: '#FF6B9D', accent: '#FF6B9D', glow: 'rgba(255,107,157,0.6)' },
    { body: '#1f3d2f', eye: '#69F0AE', accent: '#69F0AE', glow: 'rgba(105,240,174,0.6)' },
  ],
  candy: [
    { body: '#FFFFFF', eye: '#FF6B9D', accent: '#FF6B9D', glow: 'rgba(255,107,157,0.5)' },
    { body: '#FFFFFF', eye: '#FFD54F', accent: '#FFD54F', glow: 'rgba(255,213,79,0.5)' },
    { body: '#FFFFFF', eye: '#B388FF', accent: '#B388FF', glow: 'rgba(179,136,255,0.5)' },
  ],
  ocean: [
    { body: '#FFFFFF', eye: '#00BCD4', accent: '#00BCD4', glow: 'rgba(0,188,212,0.5)' },
    { body: '#FFFFFF', eye: '#FFCA28', accent: '#FFCA28', glow: 'rgba(255,202,40,0.5)' },
    { body: '#FFFFFF', eye: '#66BB6A', accent: '#66BB6A', glow: 'rgba(102,187,106,0.5)' },
  ],
};

// ── Mascot companion (Phase 10c) — friendly cat, theme-aware ──────────────
export function drawMascot() {
  const wrap = document.getElementById('js-mascot-wrap');
  if (!wrap) return;
  const theme = loadSettings().theme || 'space';

  const palettes = {
    space: { body: '#FFE4B5', accent: '#FF6B9D', cheek: '#FFB3C6', eye: '#1a1a3e' },
    candy: { body: '#FFD9E8', accent: '#FF6B9D', cheek: '#FF8FB1', eye: '#4A2C5A' },
    ocean: { body: '#B2EBF2', accent: '#00BCD4', cheek: '#80DEEA', eye: '#004D40' },
  };
  const p = palettes[theme] || palettes.space;

  wrap.innerHTML = `
    <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true"
         style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.25))">
      <!-- ears -->
      <path d="M 18 22 L 14 6 L 30 16 Z" fill="${p.body}" stroke="${p.accent}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M 62 22 L 66 6 L 50 16 Z" fill="${p.body}" stroke="${p.accent}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M 20 18 L 18 10 L 26 16 Z" fill="${p.cheek}" opacity="0.7"/>
      <path d="M 60 18 L 62 10 L 54 16 Z" fill="${p.cheek}" opacity="0.7"/>
      <!-- head -->
      <circle cx="40" cy="38" r="22" fill="${p.body}" stroke="${p.accent}" stroke-width="2"/>
      <!-- eyes -->
      <ellipse cx="32" cy="36" rx="3" ry="4.5" fill="${p.eye}"/>
      <ellipse cx="48" cy="36" rx="3" ry="4.5" fill="${p.eye}"/>
      <circle cx="33" cy="34.5" r="1" fill="white"/>
      <circle cx="49" cy="34.5" r="1" fill="white"/>
      <!-- nose -->
      <path d="M 38 42 L 42 42 L 40 45 Z" fill="${p.accent}"/>
      <!-- mouth -->
      <path d="M 40 45 Q 36 49 33 46" stroke="${p.accent}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M 40 45 Q 44 49 47 46" stroke="${p.accent}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <!-- whiskers -->
      <line x1="18" y1="40" x2="28" y2="42" stroke="${p.accent}" stroke-width="1" stroke-linecap="round"/>
      <line x1="18" y1="44" x2="28" y2="44" stroke="${p.accent}" stroke-width="1" stroke-linecap="round"/>
      <line x1="62" y1="40" x2="52" y2="42" stroke="${p.accent}" stroke-width="1" stroke-linecap="round"/>
      <line x1="62" y1="44" x2="52" y2="44" stroke="${p.accent}" stroke-width="1" stroke-linecap="round"/>
      <!-- cheeks -->
      <circle cx="26" cy="46" r="3" fill="${p.cheek}" opacity="0.6"/>
      <circle cx="54" cy="46" r="3" fill="${p.cheek}" opacity="0.6"/>
      <!-- body hint -->
      <ellipse cx="40" cy="68" rx="16" ry="10" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.85"/>
    </svg>`;
  wrap.classList.remove('mascot-idle', 'mascot-happy', 'mascot-sad', 'mascot-cheer');
  wrap.classList.add('mascot-idle');
}

// ── Mascot state triggers (Phase 10c) ──────────────────────────────────────
function mascotReact(kind) {
  const wrap = document.getElementById('js-mascot-wrap');
  if (!wrap) return;
  const cls = kind === 'happy' ? 'mascot-happy'
            : kind === 'sad'   ? 'mascot-sad'
            : kind === 'cheer' ? 'mascot-cheer'
            : 'mascot-idle';
  wrap.classList.remove('mascot-idle', 'mascot-happy', 'mascot-sad', 'mascot-cheer');
  void wrap.offsetWidth;
  wrap.classList.add(cls);
  if (kind !== 'idle') {
    setTimeout(() => {
      wrap.classList.remove(cls);
      wrap.classList.add('mascot-idle');
    }, kind === 'cheer' ? 1300 : kind === 'happy' ? 950 : 650);
  }
}

// ── Themed floor decoration (Phase 10b) ────────────────────────────────────
const FLOOR_EMOJIS = {
  space: ['⭐', '🌟', '🪐', '🚀', '⭐', '🌟', '⭐', '🌙'],
  candy: ['🍭', '🍩', '🌸', '🍬', '🌸', '🍩', '🍭', '🌼'],
  ocean: ['🪸', '🐚', '🪸', '🐠', '🪸', '🐚', '🪸', '🌿'],
};

export function populateFloor(theme) {
  const floor = document.getElementById('js-floor-decor');
  if (!floor) return;
  floor.innerHTML = '';
  const emojis = FLOOR_EMOJIS[theme] || FLOOR_EMOJIS.space;
  emojis.forEach((emo, i) => {
    const span = document.createElement('span');
    span.className = 'floor-emoji';
    if (theme === 'ocean') span.classList.add('sway');
    if (theme === 'space' && i % 2 === 0) span.classList.add('twinkle');
    span.textContent = emo;
    floor.appendChild(span);
  });
}

// ── Robot ──────────────────────────────────────────────────────────────────
// CSS-drawn robots: base + 2 unlockable variants — bigger eyes, bobble antenna
export function drawRobot(robotIdx = 0) {
  const { robotWrap } = getEls();
  if (!robotWrap) return;

  const theme = loadSettings().theme || 'space';
  const palettes = ROBOT_PALETTES[theme] || ROBOT_PALETTES.space;
  const p = palettes[robotIdx % palettes.length];

  robotWrap.innerHTML = `
    <svg viewBox="0 0 160 180" width="160" height="180" aria-hidden="true"
         style="filter:drop-shadow(0 0 16px ${p.glow})">
      <!-- glow aura -->
      <ellipse cx="80" cy="160" rx="58" ry="10" fill="${p.glow}" opacity="0.25"/>
      <!-- antenna with bobble -->
      <g class="robot-antenna">
        <line x1="80" y1="18" x2="80" y2="44" stroke="${p.accent}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="80" cy="13" r="9" fill="${p.accent}" opacity="0.95"/>
        <circle cx="77" cy="10" r="3" fill="white" opacity="0.85"/>
      </g>
      <!-- head -->
      <rect x="28" y="44" width="104" height="76" rx="18" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      <!-- cheek blush -->
      <circle cx="40" cy="82" r="8" fill="${p.accent}" opacity="0.3"/>
      <circle cx="120" cy="82" r="8" fill="${p.accent}" opacity="0.3"/>
      <!-- eyes (large, expressive) -->
      <g class="robot-eyes">
        <circle cx="58" cy="74" r="14" fill="white"/>
        <circle cx="102" cy="74" r="14" fill="white"/>
        <circle cx="58" cy="77" r="10" fill="${p.eye}"/>
        <circle cx="102" cy="77" r="10" fill="${p.eye}"/>
        <circle cx="61" cy="73" r="3.5" fill="white"/>
        <circle cx="105" cy="73" r="3.5" fill="white"/>
      </g>
      <!-- smile -->
      <path d="M 58 100 Q 80 114 102 100" stroke="${p.eye}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <!-- body -->
      <rect x="42" y="124" width="76" height="36" rx="10" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      <!-- chest light -->
      <circle cx="80" cy="142" r="5.5" fill="${p.accent}" opacity="0.9"/>
      <circle cx="80" cy="142" r="9" fill="${p.accent}" opacity="0.2"/>
      <!-- arms with hands -->
      <g class="robot-arm-l">
        <rect x="12" y="130" width="24" height="14" rx="7" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
        <circle cx="10" cy="137" r="8" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      </g>
      <g class="robot-arm-r">
        <rect x="124" y="130" width="24" height="14" rx="7" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
        <circle cx="150" cy="137" r="8" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      </g>
      <!-- legs -->
      <rect x="54" y="160" width="20" height="14" rx="5" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      <rect x="86" y="160" width="20" height="14" rx="5" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
    </svg>`;
}

// ── Shoot animation ──────────────────────────────────────────────────────────
export function shoot() {
  const { letter, bullet } = getEls();
  if (!letter || !bullet) return;

  const lv = letter.getBoundingClientRect();
  const bv = bullet.getBoundingClientRect();

  const bx = (lv.left + lv.width / 2) - bv.left;
  const by = (lv.top  + lv.height / 2) - bv.top;

  bullet.style.transition = 'none';
  bullet.style.opacity = '1';
  bullet.style.transform = 'translate(0, 0)';
  void bullet.offsetWidth;

  bullet.style.transition = 'transform 0.25s ease-in, opacity 0.25s ease-in';
  bullet.style.transform = `translate(${bx}px, ${by}px)`;

  setTimeout(() => {
    bullet.style.opacity = '0';
    bullet.style.transition = 'none';
    bullet.style.transform = 'translate(0, 0)';
  }, 300);
}

// ── Success flash ────────────────────────────────────────────────────────────
export function flashSuccess() {
  const { flashEl } = getEls();
  if (!flashEl) return;
  flashEl.style.opacity = '1';
  setTimeout(() => { flashEl.style.opacity = '0'; }, 200);
}

// ── Wrong shake ──────────────────────────────────────────────────────────────
export function shakeLetter() {
  const { letter } = getEls();
  if (!letter) return;
  letter.classList.remove('shake');
  void letter.offsetWidth;
  letter.classList.add('shake');
  setTimeout(() => letter.classList.remove('shake'), 400);
}

// ── Show next letter ─────────────────────────────────────────────────────────
export function showLetter(letter) {
  const { letter: el } = getEls();
  if (!el) return;
  el.textContent = letter.toUpperCase();
  el.style.opacity = '0';
  el.style.transform = 'scale(0.7)';
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    el.style.opacity = '1';
    el.style.transform = 'scale(1)';
  });
  currentLetter = letter;

  // Sparkle burst around letter on appear (Phase 9c)
  setTimeout(() => {
    const r = el.getBoundingClientRect();
    letterSparkle(r.left + r.width / 2, r.top + r.height / 2, {
      color: getComputedStyle(document.documentElement).getPropertyValue('--primary2').trim() || '#4FC3F7',
    });
  }, 200);

  // Update compact keys for this letter
  compactKeys = getCompactKeys(letter);
  renderTouchKeys();
  highlightKey(letter);
}

// ── L1: fall animation ──────────────────────────────────────────────────────
let fallPaused = false;
let letterArrived = false;  // true when letter reached robot top

function startFall(onArrive) {
  const settings = loadSettings();
  if (settings.level !== 'L1') return;

  const { letter: letterEl } = getEls();
  if (!letterEl) return;
  const { robotWrap } = getEls();
  if (!robotWrap) return;

  const duration = fallDuration() * 1000;
  const robotY = robotWrap.getBoundingClientRect().top;
  const startY = letterEl.getBoundingClientRect().top;
  const maxFall = robotY - startY - letterEl.offsetHeight;

  letterArrived = false;
  fallPaused = false;
  letterEl.style.transition = 'none';
  letterEl.style.transform = 'translateY(0)';

  // Start sparkle trail following the letter
  startLetterTrail(() => {
    const r = letterEl.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  });

  const startMs = performance.now();

  function step(now) {
    if (!gameRunning) return;
    if (fallPaused) {
      animFrame = requestAnimationFrame(step);
      return;
    }

    const elapsed = now - startMs;
    const progress = Math.min(elapsed / duration, 1);
    const dy = maxFall * progress;

    letterEl.style.transform = `translateY(${dy}px)`;

    if (progress < 1) {
      animFrame = requestAnimationFrame(step);
    } else {
      // Arrived — stop here; student can still press the key
      letterArrived = true;
      stopLetterTrail();
      // Brief visual pulse to signal "waiting"
      letterEl.style.filter = 'drop-shadow(0 0 8px #FFD54F)';
      onArrive();
    }
  }

  animFrame = requestAnimationFrame(step);
}

// ── Game loop ───────────────────────────────────────────────────────────────
export function startGame(unitKey = 'U1', level = 'L0') {
  gameRunning = true;
  score = 0;
  streak = 0;
  stars = 0;
  touchKeys = activeLetters(unitKey);

  const prog = loadProgress();
  const robotIdx = currentRobotIndex(masteredCount(prog));

  updateUnit(unitKey);
  updateScore();
  updateStreak(0);
  updateStars(0);
  drawRobot(robotIdx);
  drawMascot();
  populateFloor(loadSettings().theme || 'space');
  renderTouchKeys(); // full QWERTY keyboard, no args
  nextTurn(level, touchKeys);

  // Start BGM if enabled
  const settings = loadSettings();
  if (settings.bgm) startBgm(settings.bgmTrack || 'space');
}

export function stopGame() {
  gameRunning = false;
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
  stopBgm();
}

let paused = false;

export function togglePause() {
  if (!gameRunning) return;
  paused = !paused;
  const btn = document.getElementById('js-pause-btn');
  if (btn) btn.textContent = paused ? '▶' : '⏸';
  const bottomBar = document.querySelector('.bottom-bar');
  const hint = document.getElementById('js-kb-hint');
  if (paused) {
    if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
    bottomBar?.classList.add('paused');
    pauseBgm();
    if (hint) { hint.textContent = '⏸ 已暫停'; hint.classList.add('has-hint'); }
  } else {
    bottomBar?.classList.remove('paused');
    resumeBgm();
    if (hint && currentLetter) { hint.textContent = ''; hint.classList.remove('has-hint'); highlightKey(currentLetter); }
  }
}

function nextTurn(level, keys) {
  if (!gameRunning) return;

  const { letter: letterEl } = getEls();
  if (letterEl) letterEl.style.filter = '';

  const letter = pickLetter(keys);
  showLetter(letter);
  speakLetter(letter);

  if (level === 'L1') {
    startFall(() => {
      // Arrived — visual cue: robot does a brief "reach up" reaction
      robotReach();
    });
  }
}

// ── Input handling ──────────────────────────────────────────────────────────
export function handleKey(pressed) {
  if (!gameRunning || !currentLetter) return;
  const expected = currentLetter.toUpperCase();
  const settings = loadSettings();

  if (pressed === expected) {
    shoot();
    flashSuccess();
    score++;
    stars++;
    streak++;
    updateScore();
    updateStars(stars);
    updateStreak(streak);
    clearHighlight();

    // Achievement toast at star milestones (Phase 8a)
    if (stars === 10 || stars === 25 || stars === 50 || stars === 100) {
      showAchievement(stars);
    }

    // ── Themed confetti burst at letter position (Phase 6a) ─────────────
    const letterBox = document.getElementById('js-letter')?.getBoundingClientRect();
    if (letterBox) {
      confettiBurst(
        letterBox.left + letterBox.width / 2,
        letterBox.top + letterBox.height / 2,
        { theme: settings.theme || 'space', letter: currentLetter }
      );

      // Floating combo text (Phase 9b) — escalates by streak tier
      const lang = settings.lang || 'zh';
      const tier = streak >= 10 ? 10 : streak >= 5 ? 5 : streak >= 3 ? 3 : 1;
      const combos = {
        1:  lang === 'zh' ? '+1'      : '+1',
        3:  lang === 'zh' ? '叻!'      : 'Good!',
        5:  lang === 'zh' ? '很好!'    : 'Great!',
        10: lang === 'zh' ? '太棒了!'  : 'Amazing!',
      };
      floatCombo(combos[tier], letterBox.left + letterBox.width / 2, letterBox.top, { tier });
    }

    // ── Reward feedback ─────────────────────────────────────────────────
    celebrateRobot(streak);
    mascotReact(streak >= 5 ? 'cheer' : 'happy');
    if (settings.soundFx) playCorrect();
    if (streak === 3 || streak === 5 || streak === 10) {
      if (settings.soundFx) playStreak(streak);
      // Visual flash on milestone
      streakFlash(streak >= 5 ? 'big' : 'normal');
    }

    // Reset arrived state
    letterArrived = false;
    const { letter: letterEl } = getEls();
    if (letterEl) letterEl.style.filter = '';
    stopLetterTrail();

    const prog = recordAttempt(currentLetter.toUpperCase(), true);
    const prevMastered = masteredCount(loadProgress()) - 1;
    const afterMastered = masteredCount(prog);
    if (afterMastered > prevMastered) {
      if (settings.soundFx) playUnlock();
      streakFlash('big');
      megaFireworks({ theme: settings.theme || 'space' });
      showRobotUnlock(afterMastered);
    }

    // Mega fireworks at streak ≥10 — dramatic celebration
    if (streak >= 10 && afterMastered === prevMastered) {
      megaFireworks({ theme: settings.theme || 'space' });
    }

    // Praise TTS (only on streak >= 1 to avoid spamming every letter)
    if (settings.voice && streak >= 1) {
      speakPraise();
    }

    setTimeout(() => {
      if (gameRunning) nextTurn(loadSettings().level, touchKeys);
    }, 600);
  } else {
    // Wrong: gentle — no fail language, no buzzer
    streak = 0;
    updateStreak(0);
    updateScore(); // refresh rainbow off
    recordAttempt(currentLetter.toUpperCase(), false);
    shakeLetter();
    mascotReact('sad');
    if (settings.soundFx) playWrong();
    if (settings.voice) speakNudge();
  }
}

// ── Praise / nudge TTS ──────────────────────────────────────────────────────
function speakPraise() {
  if (!('speechSynthesis' in window)) return;
  const phrase = pickT('praise');
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(phrase);
  u.lang = loadSettings().lang === 'zh' ? 'zh-HK' : 'en-US';
  u.rate = 1.05;
  u.volume = 0.85;
  window.speechSynthesis.speak(u);
}

function speakNudge() {
  if (!('speechSynthesis' in window)) return;
  const phrase = pickT('nudge');
  window.speechSynthesis.cancel();
  const u = new SpeechSynthesisUtterance(phrase);
  u.lang = loadSettings().lang === 'zh' ? 'zh-HK' : 'en-US';
  u.rate = 1.0;
  u.volume = 0.7;
  window.speechSynthesis.speak(u);
}

// ── Robot celebration: brief jump + spin (Phase 6c — stronger per milestone)
function celebrateRobot(streakN = 1) {
  const wrap = document.getElementById('js-robot-wrap');
  if (!wrap) return;
  wrap.classList.remove('celebrate', 'celebrate-big', 'celebrate-mega');
  void wrap.offsetWidth;
  if (streakN >= 10) wrap.classList.add('celebrate-mega');
  else if (streakN >= 5) wrap.classList.add('celebrate-big');
  else wrap.classList.add('celebrate');
}

// ── Robot reach-up: when letter arrives (L1), robot lifts arms briefly ─────
function robotReach() {
  const wrap = document.getElementById('js-robot-wrap');
  if (!wrap) return;
  wrap.classList.remove('reach');
  void wrap.offsetWidth;
  wrap.classList.add('reach');
}

// ── Touch keys — virtual keyboard (full or compact) ──────────────────────────
const QWERTY_ROWS = [
  ['Q','W','E','R','T','Y','U','I','O','P'],
  ['A','S','D','F','G','H','J','K','L'],
  ['Z','X','C','V','B','N','M'],
];

let currentKbMode = 'compact';
let compactKeys = []; // letters shown in compact mode

function getCompactKeys(targetLetter) {
  const all = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const target = targetLetter.toUpperCase();
  const others = all.filter(l => l !== target);
  // Shuffle others, pick 3
  const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
  const keys = [target, ...shuffled].sort(() => Math.random() - 0.5);
  return keys;
}

export function renderTouchKeys() {
  const container = document.getElementById('js-touch-keys');
  if (!container) return;
  container.innerHTML = '';

  const settings = loadSettings();
  const reduceMotion = settings.reduceMotion;
  currentKbMode = settings.kbMode || 'compact';

  // Hint label
  const hint = document.createElement('div');
  hint.className = 'kb-hint';
  hint.id = 'js-kb-hint';
  container.appendChild(hint);

  if (currentKbMode === 'full') {
    // Full QWERTY
    QWERTY_ROWS.forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      row.forEach(letter => {
        const btn = makeKeyBtn(letter, reduceMotion);
        rowEl.appendChild(btn);
      });
      container.appendChild(rowEl);
    });
  } else {
    // Compact: show 4 keys (target + 3 others) in 2-row layout
    const keys = compactKeys.length ? compactKeys : getCompactKeys('A');
    const row1 = keys.slice(0, 2);
    const row2 = keys.slice(2, 4);
    [row1, row2].forEach(row => {
      const rowEl = document.createElement('div');
      rowEl.className = 'kb-row';
      row.forEach(letter => {
        const btn = makeKeyBtn(letter, reduceMotion);
        // Compact keys bigger
        btn.style.minWidth = '72px';
        btn.style.height = '64px';
        btn.style.fontSize = '24px';
        rowEl.appendChild(btn);
      });
      container.appendChild(rowEl);
    });
  }

  if (currentLetter) highlightKey(currentLetter);
}

function makeKeyBtn(letter, reduceMotion) {
  const btn = document.createElement('button');
  btn.className = 'kb-key';
  btn.textContent = letter;
  btn.setAttribute('data-letter', letter);
  btn.setAttribute('aria-label', `Letter ${letter}`);
  if (reduceMotion) btn.classList.add('no-motion');
  btn.addEventListener('click', () => handleKey(letter));
  return btn;
}

// Highlight the target key, dim all others
export function highlightKey(letter) {
  const hint = document.getElementById('js-kb-hint');
  const settings = loadSettings();
  const lang = settings.lang;

  document.querySelectorAll('.kb-key').forEach(btn => {
    const isTarget = btn.getAttribute('data-letter') === letter.toUpperCase();
    btn.classList.toggle('key-hint', isTarget);
  });

  if (hint) {
    hint.textContent = lang === 'zh'
      ? `請按 ${letter.toUpperCase()}`
      : `Press ${letter.toUpperCase()}`;
    hint.classList.add('has-hint');
  }
}

// Clear highlight
export function clearHighlight() {
  document.querySelectorAll('.kb-key').forEach(btn => {
    btn.classList.remove('key-hint');
  });
  const hint = document.getElementById('js-kb-hint');
  if (hint) { hint.textContent = ''; hint.classList.remove('has-hint'); }
}

// ── Toast queue ──────────────────────────────────────────────────────────────
export function showRobotUnlock(count) {
  const settings = loadSettings();
  const title   = settings.lang === 'zh'
    ? '🤖 新機械人解鎖了！'
    : '🤖 New robot unlocked!';
  const body = settings.lang === 'zh'
    ? `已掌握 ${count} 個字母`
    : `${count} letters mastered`;

  toastQueue.push({ title, body });
  if (!toastTimer) drainToast();
}

function drainToast() {
  if (toastQueue.length === 0) { toastTimer = null; return; }
  const { title, body } = toastQueue.shift();
  showToast(title, body);
  toastTimer = setTimeout(drainToast, 3500);
}

function showToast(title, body) {
  const toast      = document.getElementById('js-toast');
  const toastTitle = document.getElementById('js-toast-title');
  const toastBody  = document.getElementById('js-toast-body');
  if (!toast || !toastTitle || !toastBody) return;

  // Hide first to retrigger animation
  toast.classList.remove('visible');
  void toast.offsetWidth;
  toastTitle.textContent = title;
  toastBody.textContent  = body;
  toast.classList.add('visible');

  setTimeout(() => toast.classList.remove('visible'), 3000);
}

// ── Achievement toast (Phase 8a) — bigger, themed pop at star milestones ───
const ACHIEVEMENT_MILESTONES = [
  { stars: 10,  icon: '🌟', title_zh: '獲得 10 粒星！',  title_en: '10 Stars!',  body_zh: '繼續努力！', body_en: 'Keep going!' },
  { stars: 25,  icon: '🏆', title_zh: '獲得 25 粒星！',  title_en: '25 Stars!',  body_zh: '太厲害了！', body_en: 'Amazing!' },
  { stars: 50,  icon: '💎', title_zh: '獲得 50 粒星！',  title_en: '50 Stars!',  body_zh: '超級叻！',   body_en: 'Superstar!' },
  { stars: 100, icon: '👑', title_zh: '100 粒星！',      title_en: '100 Stars!', body_zh: '完美！',     body_en: 'Perfect!' },
];

function showAchievement(stars) {
  const ms = ACHIEVEMENT_MILESTONES.find(m => m.stars === stars);
  if (!ms) return;
  const ach = document.getElementById('js-ach-toast');
  const icon = document.getElementById('js-ach-icon');
  const title = document.getElementById('js-ach-title');
  const body = document.getElementById('js-ach-body');
  if (!ach || !icon || !title || !body) return;
  const lang = loadSettings().lang;
  icon.textContent = ms.icon;
  title.textContent = lang === 'zh' ? ms.title_zh : ms.title_en;
  body.textContent  = lang === 'zh' ? ms.body_zh  : ms.body_en;
  ach.classList.remove('visible');
  void ach.offsetWidth;
  ach.classList.add('visible');
  // Mega fireworks on every achievement
  megaFireworks({ theme: loadSettings().theme || 'space' });
  setTimeout(() => ach.classList.remove('visible'), 2200);
}

// ── Settings panel ──────────────────────────────────────────────────────────
export function applyTheme(theme) {
  document.body.setAttribute('data-theme', theme || 'space');
}

// ── Boot: apply saved theme + high-contrast class before first paint ───────
applyTheme(loadSettings().theme);

export function openSettings() {
  const panel = document.getElementById('js-settings-panel');
  if (!panel) return;

  const settings = loadSettings();
  panel.querySelector('#js-voice-toggle').checked = settings.voice;
  panel.querySelector('#js-sfx-toggle').checked = settings.soundFx;
  panel.querySelector('#js-bgm-select').value = settings.bgm ? (settings.bgmTrack || 'space') : 'off';
  panel.querySelector('#js-speed-select').value = settings.speed;
  panel.querySelector('#js-hc-toggle').checked = settings.highContrast;
  panel.querySelector('#js-motion-toggle').checked = settings.reduceMotion;
  panel.querySelector('#js-lang-select').value = settings.lang;
  panel.querySelector('#js-unit-select').value = settings.currentUnit;
  panel.querySelector('#js-level-select').value = settings.level;
  panel.querySelector('#js-kb-mode-select').value = settings.kbMode || 'compact';
  panel.querySelector('#js-theme-select').value = settings.theme || 'space';

  panel.classList.add('visible');
}

export function closeSettings() {
  const panel = document.getElementById('js-settings-panel');
  if (panel) panel.classList.remove('visible');
}

export function applySettings() {
  const panel = document.getElementById('js-settings-panel');
  if (!panel) return;

  const voice  = panel.querySelector('#js-voice-toggle')?.checked ?? true;
  const sfx    = panel.querySelector('#js-sfx-toggle')?.checked ?? true;
  const bgmSel = panel.querySelector('#js-bgm-select')?.value ?? 'off';
  const bgm    = bgmSel !== 'off';
  const bgmTrack = bgmSel === 'off' ? (loadSettings().bgmTrack || 'space') : bgmSel;
  const speed  = panel.querySelector('#js-speed-select')?.value ?? 'slow';
  const hc     = panel.querySelector('#js-hc-toggle')?.checked ?? false;
  const motion = panel.querySelector('#js-motion-toggle')?.checked ?? false;
  const lang   = panel.querySelector('#js-lang-select')?.value ?? 'zh';
  const unit   = panel.querySelector('#js-unit-select')?.value ?? 'U1';
  const level  = panel.querySelector('#js-level-select')?.value ?? 'L0';
  const kbMode = panel.querySelector('#js-kb-mode-select')?.value ?? 'compact';
  const theme  = panel.querySelector('#js-theme-select')?.value ?? 'space';

  const next = { voice, soundFx: sfx, bgm, bgmTrack, speed, highContrast: hc, reduceMotion: motion, lang, currentUnit: unit, level, kbMode, theme };

  document.body.classList.toggle('high-contrast', hc);
  applyTheme(theme);

  // Apply BGM choice
  if (bgm) startBgm(bgmTrack);
  else stopBgm();

  saveSettings(next);
  closeSettings();

  // Re-render keyboard with new mode + theme robot palette
  if (gameRunning) {
    const prog = loadProgress();
    const robotIdx = currentRobotIndex(masteredCount(prog));
    drawRobot(robotIdx);
    drawMascot();
    populateFloor(theme);
    renderTouchKeys();
    if (currentLetter) highlightKey(currentLetter);
  }
}

// ── Teacher Progress Panel ───────────────────────────────────────────────────
export function openProgressPanel() {
  const panel = document.getElementById('js-progress-panel');
  if (!panel) return;
  renderProgressGrid();
  panel.removeAttribute('hidden');
}

export function closeProgressPanel() {
  const panel = document.getElementById('js-progress-panel');
  if (panel) panel.setAttribute('hidden', '');
}

export function renderProgressGrid() {
  const grid = document.getElementById('js-progress-grid');
  const title = document.getElementById('js-progress-title');
  if (!grid) return;

  const settings = loadSettings();
  const prog = loadProgress();
  const lang = settings.lang;

  // Update title
  if (title) {
    title.textContent = lang === 'zh' ? '字母進度' : 'Letter Progress';
  }

  // Update legend labels
  const legend = document.getElementById('js-progress-legend');
  if (legend) {
    legend.innerHTML = `
      <span class="legend-item"><span class="legend-dot dot-unopened"></span>${lang === 'zh' ? '未開始' : 'Unopened'}</span>
      <span class="legend-item"><span class="legend-dot dot-new"></span>${lang === 'zh' ? '新學' : 'New'}</span>
      <span class="legend-item"><span class="legend-dot dot-practice"></span>${lang === 'zh' ? '練習中' : 'Practice'}</span>
      <span class="legend-item"><span class="legend-dot dot-mastered"></span>${lang === 'zh' ? '已掌握' : 'Mastered'}</span>
    `;
  }

  grid.innerHTML = '';
  const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
  const statusLabel = {
    unopened: lang === 'zh' ? '未開始' : 'Unopened',
    new:      lang === 'zh' ? '新學' : 'New',
    practice: lang === 'zh' ? '練習中' : 'Practice',
    mastered: lang === 'zh' ? '已掌握' : 'Mastered',
  };

  ALPHABET.forEach(letter => {
    const entry = prog[letter] || { status: 'unopened' };
    const cell = document.createElement('div');
    cell.className = `progress-cell st-${entry.status}`;
    cell.setAttribute('role', 'img');
    cell.setAttribute('aria-label', `${letter}: ${statusLabel[entry.status] || entry.status}`);
    cell.innerHTML = `
      <span>${letter}</span>
      <span class="cell-label">${statusLabel[entry.status] || entry.status}</span>
    `;
    grid.appendChild(cell);
  });
}
