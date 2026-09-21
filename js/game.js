// js/game.js — core game loop: L0 / L1, shooting, scoring
import { loadSettings, saveSettings, fallDuration } from './settings.js';
import { loadProgress, recordAttempt, masteredCount } from './progress.js';
import { activeLetters, currentRobotIndex, isUnitComplete, parseCustomLevels, getCustomUnitKeys } from './curriculum.js';
import { t, pickT, setLang, i18n } from './i18n.js';
import { playCorrect, playWrong, playStreak, playUnlock, unlockAudio, haptic } from './sfx.js';
import { confettiBurst, streakFlash, megaFireworks, startLetterTrail, stopLetterTrail, letterSparkle, floatCombo, LETTER_SYMBOLS } from './fx.js';
import { recordStar, getDailyProgress, dailyGoal, getWeeklyProgress, weeklyGoal } from './challenge.js';
import { getLeaderboard, submitEntry, sanitizeName, clearLeaderboard, MAX_NAME } from './leaderboard.js';
import { startBgm, stopBgm, pauseBgm, resumeBgm, unlockBgm } from './bgm.js';

// Attach public API to window for non-module HTML
window.LetterShooter = {
  startGame, handleKey, openSettings, closeSettings, applySettings,
  renderTouchKeys, speakLetter, shoot, flashSuccess, shakeLetter,
  showLetter, updateScore, drawRobot,
  loadSettings, fallDuration, setLang, unlockAudio, unlockBgm,
  openProgressPanel, closeProgressPanel,
  openLeaderboardPanel, closeLeaderboardPanel, renderLeaderboard,
  openNameModal, closeNameModal, submitName,
  highlightKey, clearHighlight,
  // Phase 16.5 patch — expose for smoke testing of unit letter pools
  activeLetters,
};

// ── State ──────────────────────────────────────────────────────────────────
let score = 0;
let streak = 0;
let stars = 0;            // cumulative stars (1 per correct)
let currentLetter = null;
let touchKeys = [];       // visible touch key letters
let gameRunning = false;
let animFrame = null;
let currentUnit = 'U1';   // tracked for completion detection (Phase 14)
let correctSinceSpeed = 0; // counter for speed round trigger (Phase 16a)
let speedRoundActive = false;
let speedRoundTimer = null;
let speedRoundEnd = 0;     // timestamp
let speedRoundHits = 0;
let bonusCatchActive = false; // bonus catch mode (Phase 16e)
let bonusCatchTimer = null;
let toastTimerId = null;   // shared toast hide-timer (Phase 16 patch — prevents collision)

// Phase 17 W3 — Sequence mode state machine
const SEQUENCE_LENGTH = 3;
let sequenceLetters = [];   // ['C', 'A', 'T']
let sequenceIndex = 0;      // 0..2 — next expected position

// Phase 16 patch — full reset of speed-round + bonus-catch state.
// Called from startGame/stopGame so stale timers/listeners from a previous
// game can't poison the new one (e.g. speedRoundActive leaking true means
// correctSinceSpeed never increments and speed round never re-triggers).
function resetPhase16State() {
  speedRoundActive = false;
  if (speedRoundTimer) { clearInterval(speedRoundTimer); speedRoundTimer = null; }
  speedRoundHits = 0;
  correctSinceSpeed = 0;

  bonusCatchActive = false;
  if (bonusCatchTimer) { clearTimeout(bonusCatchTimer); bonusCatchTimer = null; }
  if (bonusCatchKeyListener) {
    try { document.removeEventListener('pointerdown', bonusCatchKeyListener, true); } catch {}
    bonusCatchKeyListener = null;
  }

  // Phase 17 W3 — sequence state reset
  sequenceLetters = [];
  sequenceIndex = 0;

  const banner = document.getElementById('js-speed-banner');
  if (banner) banner.classList.remove('visible');
  const star = document.getElementById('js-bonus-star');
  if (star) {
    star.classList.remove('visible', 'falling', 'caught', 'missed');
    star.style.transition = 'none';
  }
}

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
  updateDailyHint();
}

// ── Daily challenge hint (Phase 12b) ───────────────────────────────────────
function updateDailyHint() {
  const el = document.getElementById('js-daily-hint');
  if (!el) return;
  const daily = getDailyProgress();
  const goal = dailyGoal();
  const pct = Math.min(100, Math.round((daily.stars / goal) * 100));
  const lang = loadSettings().lang || 'zh';
  if (daily.stars >= goal) {
    el.textContent = lang === 'zh' ? `✅ 今日達標 ${daily.stars}/${goal}` : `✅ Daily done ${daily.stars}/${goal}`;
    el.classList.add('done');
  } else {
    el.textContent = lang === 'zh' ? `今日 ${daily.stars}/${goal} ⭐` : `Today ${daily.stars}/${goal} ⭐`;
    el.classList.remove('done');
  }
  // Mini progress bar
  const fill = document.getElementById('js-daily-bar-fill');
  if (fill) fill.style.width = pct + '%';
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
  forest: [
    { body: '#FFFFFF', eye: '#43A047', accent: '#43A047', glow: 'rgba(67,160,71,0.5)' },
    { body: '#FFFFFF', eye: '#FFCA28', accent: '#FFCA28', glow: 'rgba(255,202,40,0.5)' },
    { body: '#FFFFFF', eye: '#AB47BC', accent: '#AB47BC', glow: 'rgba(171,71,188,0.5)' },
  ],
};

// ── Mascot companion (Phase 10c) — friendly cat, theme-aware ──────────────
export function drawMascot() {
  const wrap = document.getElementById('js-mascot-wrap');
  if (!wrap) return;
  // Phase 16f — honor user-chosen mascot palette (or 'auto' = follow theme)
  const settings = loadSettings();
  const theme = (settings.mascotTheme && settings.mascotTheme !== 'auto')
    ? settings.mascotTheme
    : (settings.theme || 'space');

  const palettes = {
    space: { body: '#FFE4B5', accent: '#FF6B9D', cheek: '#FFB3C6', eye: '#1a1a3e' },
    candy: { body: '#FFD9E8', accent: '#FF6B9D', cheek: '#FF8FB1', eye: '#4A2C5A' },
    ocean: { body: '#B2EBF2', accent: '#00BCD4', cheek: '#80DEEA', eye: '#004D40' },
    forest: { body: '#C8E6C9', accent: '#43A047', cheek: '#A5D6A7', eye: '#1B5E20' },
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
  forest: ['🌳', '🌲', '🍄', '🌷', '🌲', '🌳', '🍄', '🌷'],
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
    if (theme === 'forest') span.classList.add('sway');
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
  // Phase 16f — honor user-chosen robot palette from settings.
  // (Milestone unlocks still trigger showRobotUnlock notifications;
  // palette index is purely cosmetic and always honors the user's pick.)
  const settings = loadSettings();
  // Phase 16 patch — coerce defensively in case localStorage was corrupted
  // to a string ("0") or non-numeric value; fallback to default 0.
  const userPick = Number(settings.robotColor) || 0;
  const p = palettes[userPick % palettes.length];

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

// ── Shoot animation (Phase 15a — variable bullet) ───────────────────────────
// Random shape / color / rotation per shot for variety.
const BULLET_SHAPES = ['star', 'heart', 'circle', 'square', 'ribbon'];
const BULLET_PALETTES = {
  space:   ['#4FC3F7', '#FF6B9D', '#FFD54F', '#69F0AE', '#CE93D8', '#80DEEA'],
  candy:   ['#FF6B9D', '#FFD54F', '#B388FF', '#69F0AE', '#FF9D7A', '#F48FB1'],
  ocean:   ['#00BCD4', '#26C6DA', '#FFCA28', '#66BB6A', '#80DEEA', '#4FC3F7'],
  forest:  ['#43A047', '#66BB6A', '#FFCA28', '#AB47BC', '#A5D6A7', '#FFB74D'],
};

function bulletStyle(shape, color) {
  switch (shape) {
    case 'star':
      return `width:14px;height:14px;clip-path:polygon(50% 0%, 61% 35%, 98% 35%, 68% 57%, 79% 91%, 50% 70%, 21% 91%, 32% 57%, 2% 35%, 39% 35%);`;
    case 'heart':
      return `width:14px;height:14px;clip-path:path('M7 14s-7-4.5-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 14 4c0 5.5-7 10-7 10z');`;
    case 'circle':
      return `width:12px;height:12px;border-radius:50%;`;
    case 'square':
      return `width:10px;height:10px;`;
    default: // ribbon
      return `width:5px;height:14px;border-radius:2px;`;
  }
}

export function shoot() {
  const { letter, bullet } = getEls();
  if (!letter || !bullet) return;

  const lv = letter.getBoundingClientRect();
  const bv = bullet.getBoundingClientRect();

  const bx = (lv.left + lv.width / 2) - bv.left;
  const by = (lv.top  + lv.height / 2) - bv.top;

  // Pick random shape + color from current theme palette
  const theme = loadSettings().theme || 'space';
  const palette = BULLET_PALETTES[theme] || BULLET_PALETTES.space;
  const shape = BULLET_SHAPES[Math.floor(Math.random() * BULLET_SHAPES.length)];
  const color = palette[Math.floor(Math.random() * palette.length)];

  // Apply style + color (reset previous transforms)
  bullet.removeAttribute('class');
  bullet.setAttribute('style', bulletStyle(shape, color) + `background:${color};`);

  // Reset position + animate flight with random spin
  const spin = (Math.random() - 0.5) * 720;  // ±360° rotation
  bullet.style.transition = 'none';
  bullet.style.opacity = '1';
  bullet.style.transform = 'translate(0, 0) rotate(0deg)';
  void bullet.offsetWidth;

  bullet.style.transition = 'transform 0.28s ease-in, opacity 0.28s ease-in';
  bullet.style.transform = `translate(${bx}px, ${by}px) rotate(${spin}deg)`;

  // Trail particles behind bullet
  spawnBulletTrail(bx, by, color);

  setTimeout(() => {
    bullet.style.opacity = '0';
    bullet.style.transition = 'none';
    bullet.style.transform = 'translate(0, 0) rotate(0deg)';
    // Restore default bullet style for next shot
    bullet.removeAttribute('style');
  }, 350);
}

// Tiny trail particles following the bullet path
function spawnBulletTrail(targetX, targetY, color) {
  const layer = document.getElementById('js-confetti-layer');
  if (!layer) return;
  const startX = window.innerWidth / 2;
  const startY = window.innerHeight - 160;
  const dx = targetX - startX;
  const dy = targetY - startY;
  for (let i = 0; i < 4; i++) {
    setTimeout(() => {
      const p = document.createElement('div');
      p.className = 'bullet-trail';
      p.style.left = startX + 'px';
      p.style.top  = startY + 'px';
      p.style.background = color;
      p.style.boxShadow = `0 0 6px ${color}`;
      p.style.setProperty('--dx', (dx * (0.3 + i * 0.2)) + 'px');
      p.style.setProperty('--dy', (dy * (0.3 + i * 0.2)) + 'px');
      layer.appendChild(p);
      p.addEventListener('animationend', () => p.remove(), { once: true });
    }, i * 40);
  }
}

// ── Success flash (Phase 15b — variable impact) ─────────────────────────────
// Random color from theme palette + concentric impact rings
export function flashSuccess() {
  const { flashEl } = getEls();
  if (!flashEl) return;

  // Pick random flash color (themed palette)
  const theme = loadSettings().theme || 'space';
  const palette = BULLET_PALETTES[theme] || BULLET_PALETTES.space;
  const color = palette[Math.floor(Math.random() * palette.length)];
  flashEl.style.background = `radial-gradient(circle at center, ${color}66 0%, transparent 65%)`;

  flashEl.style.opacity = '1';
  setTimeout(() => { flashEl.style.opacity = '0'; }, 220);

  // Impact rings (1-2 concentric circles expanding from letter)
  spawnImpactRings(letterBoxAt());
}

// Cache last letter position for impact rings (set right before flashSuccess)
let lastLetterPos = null;
function letterBoxAt() {
  return lastLetterPos;
}

function spawnImpactRings(origin) {
  if (!origin) return;
  const layer = document.getElementById('js-confetti-layer');
  if (!layer) return;
  const ringCount = Math.random() < 0.5 ? 1 : 2;
  for (let i = 0; i < ringCount; i++) {
    setTimeout(() => {
      const ring = document.createElement('div');
      ring.className = 'impact-ring';
      ring.style.left = origin.x + 'px';
      ring.style.top  = origin.y + 'px';
      const theme = loadSettings().theme || 'space';
      const palette = BULLET_PALETTES[theme] || BULLET_PALETTES.space;
      const color = palette[Math.floor(Math.random() * palette.length)];
      ring.style.borderColor = color;
      ring.style.boxShadow = `0 0 12px ${color}`;
      layer.appendChild(ring);
      ring.addEventListener('animationend', () => ring.remove(), { once: true });
    }, i * 80);
  }
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

  // Phase 17 — mode-aware rendering
  const mode = getGameMode();
  const isSound = mode === 'sound';
  const isSequence = mode === 'sequence';

  if (isSequence) {
    // Generate a fresh 3-letter sequence from the current pool.
    // Use `letter` (the chosen seed) as the first element so activeLetters
    // curriclum still applies, then pick 2 more random distinct letters.
    const used = new Set([letter.toUpperCase()]);
    const seq = [letter.toUpperCase()];
    // Pool = current touchKeys — we approximate by reading any in-flight state
    // via window.LetterShooter; for simplicity, pick from A-Z excluding used.
    const allLetters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('');
    while (seq.length < SEQUENCE_LENGTH) {
      const pick = allLetters[Math.floor(Math.random() * allLetters.length)];
      if (!used.has(pick)) { seq.push(pick); used.add(pick); }
    }
    sequenceLetters = seq;
    sequenceIndex = 0;
    el.innerHTML = renderSequenceHTML();
    el.style.opacity = '0';
    el.style.transform = 'scale(0.7)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
    // Track the "current" letter for downstream systems (nextTurn etc).
    // We treat the first letter as currentLetter so the keyboard hint works.
    currentLetter = seq[0];
    // Skip letter trace + sparkle in sequence mode (would conflict with slots)
    return;
  }

  if (mode === 'word') {
    // Phase 17 W1 — Word mode: pick a 3-letter word from wordBank, show
    // its emoji, and re-use sequence state machine for letter order.
    const bank = i18n.en?.wordBank || ['CAT', 'DOG', 'SUN'];
    const emojis = i18n.en?.wordEmojis || {};
    const word = bank[Math.floor(Math.random() * bank.length)];
    sequenceLetters = word.split('');
    sequenceIndex = 0;
    const emoji = emojis[word] || '❓';
    el.innerHTML = `<div class="word-emoji-display">${emoji}</div>${renderSequenceHTML()}`;
    el.style.opacity = '0';
    el.style.transform = 'scale(0.7)';
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 0.3s, transform 0.3s';
      el.style.opacity = '1';
      el.style.transform = 'scale(1)';
    });
    currentLetter = sequenceLetters[0];
    return;
  }

  el.textContent = isSound ? '?' : (getCaseMode() === 'lower' ? letter.toLowerCase() : letter.toUpperCase());
  el.style.opacity = '0';
  el.style.transform = 'scale(0.7)';
  requestAnimationFrame(() => {
    el.style.transition = 'opacity 0.3s, transform 0.3s';
    el.style.opacity = '1';
    el.style.transform = 'scale(1)';
  });
  currentLetter = letter;

  // Phase 13d — Letter trace: draw the letter outline first via SVG stroke,
  // then fade out as the main letter becomes fully visible.
  // Phase 17 W2 — skip trace in sound mode (would reveal answer).
  const gameArea = document.getElementById('js-game-area');
  if (gameArea) {
    // Remove any previous trace
    const prev = document.getElementById('js-letter-trace');
    if (prev) prev.remove();
    const trace = document.createElement('div');
    trace.id = 'js-letter-trace';
    trace.className = 'letter-trace';
    trace.setAttribute('aria-hidden', 'true');
    if (isSound) trace.style.display = 'none';
    const settings = loadSettings();
    const color = getComputedStyle(document.documentElement).getPropertyValue('--primary2').trim() || '#4FC3F7';
    trace.innerHTML = `
      <svg viewBox="0 0 200 200" width="200" height="200" aria-hidden="true">
        <text x="100" y="140" text-anchor="middle"
              font-family="Fredoka, sans-serif"
              font-weight="900" font-size="180"
              fill="none" stroke="${color}" stroke-width="3"
              stroke-linecap="round" stroke-linejoin="round"
              class="trace-path">${letter.toUpperCase()}</text>
      </svg>`;
    gameArea.appendChild(trace);
    // Auto-remove after animation
    setTimeout(() => trace.remove(), 900);
  }

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

// Phase 17 W3 — Sequence mode DOM helpers
function renderSequenceHTML() {
  return sequenceLetters.map((l, i) => {
    const cls = i < sequenceIndex ? 'seq-slot seq-done'
              : i === sequenceIndex ? 'seq-slot seq-active'
              : 'seq-slot seq-pending';
    const mark = i < sequenceIndex ? '✓' : '';
    // Phase 17 polish — respect caseMode (lowercase display if caseMode='lower')
    const display = getCaseMode() === 'lower' ? l.toLowerCase() : l;
    return `<span class="${cls}" data-pos="${i}">${mark}${display}</span>`;
  }).join('<span class="seq-arrow">→</span>');
}

function highlightSequenceProgress() {
  const el = document.getElementById('js-letter');
  if (!el) return;
  // Re-render to update state (cheap — 3 spans)
  el.innerHTML = renderSequenceHTML();
}

// Phase 17 polish — TTS the whole word on word-mode completion.
// Uses Web Speech (same rate/pitch/volume profile as speakLetter).
function speakWord(word) {
  if (!('speechSynthesis' in window)) return;
  if (!word) return;
  const lang = loadSettings().lang || 'zh';
  const u = new SpeechSynthesisUtterance(word);
  u.lang = lang === 'zh' ? 'zh-HK' : 'en-US';
  u.rate = 0.85;
  u.pitch = 1.1;
  u.volume = 0.9;
  window.speechSynthesis.speak(u);
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

  // Pick random fall pattern (Phase 16c): straight 60% / zigzag 25% / spiral 15%
  const roll = Math.random();
  const pattern = roll < 0.6 ? 'straight' : roll < 0.85 ? 'zigzag' : 'spiral';
  const startMs = performance.now();
  const baseWidth = Math.min(window.innerWidth * 0.35, 200);

  function step(now) {
    if (!gameRunning) return;
    if (fallPaused) {
      animFrame = requestAnimationFrame(step);
      return;
    }

    const elapsed = now - startMs;
    const progress = Math.min(elapsed / duration, 1);
    const dy = maxFall * progress;

    // Apply pattern-specific x-offset
    let dx = 0;
    if (pattern === 'zigzag') {
      // 2 oscillations across the fall
      dx = Math.sin(progress * Math.PI * 4) * baseWidth * 0.15;
    } else if (pattern === 'spiral') {
      // Circle x-position slowly
      dx = Math.cos(progress * Math.PI * 3) * baseWidth * 0.18;
    }

    letterEl.style.transform = `translate(${dx}px, ${dy}px)`;

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
  resetPhase16State();   // Phase 16 patch — clean slate on new game
  gameRunning = true;
  score = 0;
  streak = 0;
  stars = 0;
  currentUnit = unitKey;     // Phase 14: track for completion detection
  touchKeys = activeLetters(unitKey);

  const prog = loadProgress();
  const robotIdx = currentRobotIndex(masteredCount(prog));

  updateUnit(unitKey);
  updateScore();
  updateStreak(0);
  updateStars(0);
  updateDailyHint();
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
  resetPhase16State();   // Phase 16 patch — kill any in-flight speed round/bonus
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
  // Phase 16 patch — bonus catch absorbs all input (touch + physical keyboard)
  // so the bonus star's pointerdown doesn't double-count as a letter press.
  if (bonusCatchActive) return;

  const settings = loadSettings();
  const mode = getGameMode();

  // Phase 17 W3/W1 — Sequence + Word mode intercept (shared logic).
  // Correct in-order: highlight next slot, shoot anim on completion only.
  // Wrong: reset to slot 0 (no streak break — SEN-friendly retry mechanic).
  if (mode === 'sequence' || mode === 'word') {
    const expected = sequenceLetters[sequenceIndex];
    if (!expected) return;
    if (pressed.toUpperCase() === expected) {
      sequenceIndex++;
      highlightSequenceProgress();
      if (settings.soundFx) playCorrect();
      haptic('light');
      // Phase 17 polish — TTS the letter just pressed (phonemic reinforcement
      // for SEN learners in sequence/word modes).
      if (settings.voice) speakLetter(expected);
      if (sequenceIndex >= SEQUENCE_LENGTH) {
        // Complete — fall through to standard correct path.
        // currentLetter was set to seq[0]; replace with last so success uses it.
        currentLetter = expected;
        // Phase 17 polish — word mode: speak the whole word on completion
        if (mode === 'word') {
          const word = sequenceLetters.join('');
          setTimeout(() => speakWord(word), 200);
        }
      } else {
        // Update keyboard hint for next expected letter
        const nextExpected = sequenceLetters[sequenceIndex];
        if (nextExpected) {
          compactKeys = getCompactKeys(nextExpected);
          renderTouchKeys();
          highlightKey(nextExpected);
        }
        return; // partial progress — don't trigger full success yet
      }
    } else {
      // Wrong — reset sequence, gentle feedback only (no streak break)
      sequenceIndex = 0;
      highlightSequenceProgress();
      shakeLetter();
      if (settings.soundFx) playWrong();
      return;
    }
  }

  const expected = currentLetter.toUpperCase();

  if (pressed === expected) {
    // Capture letter position BEFORE bullet flies (for impact rings)
    const letterHitEl = document.getElementById('js-letter');
    if (letterHitEl) {
      const r = letterHitEl.getBoundingClientRect();
      lastLetterPos = { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    }
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

    // Daily challenge tracking (Phase 12b)
    const challenge = recordStar();
    updateDailyHint();  // refresh UI after recordStar increments

    // Phase 16a — Speed round: every SPEED_ROUND_TRIGGER correct answers
    if (speedRoundActive) {
      speedRoundHits++;
      const hits = document.getElementById('js-speed-hits');
      if (hits) hits.textContent = speedRoundHits;
    } else {
      correctSinceSpeed++;
      if (correctSinceSpeed >= SPEED_ROUND_TRIGGER) {
        startSpeedRound();
      }
    }
    if (challenge.dailyMilestone) {
      const pct = Math.round(challenge.dailyMilestone * 100);
      const lang = loadSettings().lang || 'zh';
      const phrase = lang === 'zh'
        ? `今日 ${pct}%！仲差少少！`
        : `${pct}% today! Almost there!`;
      // Quick milestone toast (reuse js-toast)
      showToast(
        lang === 'zh' ? `🎯 今日進度 ${pct}%` : `🎯 Daily ${pct}%`,
        phrase,
        2500
      );
      if (challenge.dailyMilestone >= 1.0) {
        // Daily goal complete: mega fireworks
        megaFireworks({ theme: loadSettings().theme || 'space' });
      }
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
    haptic(streak >= 5 ? 'streak' : 'light');
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

    // Phase 14d — Unit completion: open name-entry modal when all letters
    // in current unit are mastered (only triggers once per unit completion).
    if (currentUnit && currentUnit !== 'U10' && !pendingCompletion && isUnitComplete(prog, currentUnit)) {
      setTimeout(() => openNameModal(currentUnit, score), 700);
    }

    // Mega fireworks at streak ≥10 — dramatic celebration
    if (streak >= 10 && afterMastered === prevMastered) {
      megaFireworks({ theme: settings.theme || 'space' });
    }

    // Praise TTS (only on streak >= 1 to avoid spamming every letter)
    if (settings.voice && streak >= 1) {
      // Phase 16 patch — on every 3rd correct we replace the generic praise
      // with the contextual letter-symbol phrase. The old behaviour was to
      // cancel praise 50ms after speaking it, which meant praise never
      // actually played on those turns. Skip-on-contextual is cleaner.
      const useContextual = streak % 3 === 0;
      if (useContextual) {
        speakContextual(currentLetter);
      } else {
        speakPraise();
      }
      // Phonetic pronunciation (English only — bilingual stays clean)
      if (settings.lang === 'en') speakLetterSay(currentLetter);
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
    flashWrongKey(pressed);  // Phase 12c — per-key shake
    spawnWrongGhost(pressed);  // Phase 16d — wrong-letter ghost effect
    mascotReact('sad');
    haptic('medium');
    if (settings.soundFx) playWrong();
    if (settings.voice) speakNudge();
  }
}

// ── Per-letter phonetic pronunciation (Phase 13c) ────────────────────────────
// "B" → "buh", "S" → "ess" — reinforces sound-symbol association for SEN
const LETTER_SAY = {
  A: 'ah', B: 'buh', C: 'see', D: 'dee', E: 'eh', F: 'fff',
  G: 'gee', H: 'aitch', I: 'eye', J: 'jay', K: 'kay', L: 'el',
  M: 'em', N: 'en', O: 'oh', P: 'pee', Q: 'cue', R: 'ar',
  S: 'ess', T: 'tee', U: 'you', V: 'vee', W: 'double-you',
  X: 'ex', Y: 'why', Z: 'zee',
};

function speakLetterSay(letter) {
  if (!('speechSynthesis' in window)) return;
  const say = LETTER_SAY[letter];
  if (!say) return;
  // H4 patch — queue utterance (no cancel) so it doesn't cut off the
  // contextual letter-symbol phrase that just started playing. Speech
  // synthesis natively queues utterances; canceling kills in-flight audio.
  setTimeout(() => {
    const u = new SpeechSynthesisUtterance(say);
    u.lang = 'en-US';
    u.rate = 0.7;
    u.pitch = 1.1;
    u.volume = 0.85;
    window.speechSynthesis.speak(u);
  }, 600);
}

// ── Speed round (Phase 16a) ─────────────────────────────────────────────────
const SPEED_ROUND_DURATION_MS = 5000;
const SPEED_ROUND_TRIGGER = 10;  // every N correct answers

export function startSpeedRound() {
  if (speedRoundActive) return;
  speedRoundActive = true;
  speedRoundHits = 0;
  speedRoundEnd = Date.now() + SPEED_ROUND_DURATION_MS;
  correctSinceSpeed = 0;

  // Banner UI
  const banner = document.getElementById('js-speed-banner');
  const timer = document.getElementById('js-speed-timer');
  const hits = document.getElementById('js-speed-hits');
  if (banner) {
    banner.classList.add('visible');
    const lang = loadSettings().lang;
    const titleEl = banner.querySelector('.speed-title');
    if (titleEl) titleEl.textContent = (lang === 'zh' ? '⚡ 限時挑戰 ⚡' : '⚡ SPEED ROUND ⚡');
  }
  if (timer) timer.textContent = '5.0';
  if (hits) hits.textContent = '0';

  // Countdown updater
  if (speedRoundTimer) clearInterval(speedRoundTimer);
  // H1 patch — 500ms tick (was 100ms) reduces visual flicker for SEN
  // overstimulation. Updates on 0.5s boundaries (5.0, 4.5, 4.0, …).
  speedRoundTimer = setInterval(() => {
    const remaining = Math.max(0, speedRoundEnd - Date.now()) / 1000;
    if (timer) timer.textContent = remaining.toFixed(1);
    if (Date.now() >= speedRoundEnd) {
      endSpeedRound();
    }
  }, 500);
}

function endSpeedRound() {
  if (speedRoundTimer) clearInterval(speedRoundTimer);
  speedRoundTimer = null;
  speedRoundActive = false;
  const banner = document.getElementById('js-speed-banner');
  if (banner) banner.classList.remove('visible');

  // Award bonus stars
  const bonus = speedRoundHits;
  if (bonus > 0) {
    stars += bonus;
    updateStars(stars);
    const lang = loadSettings().lang;
    const phrase = lang === 'zh'
      ? `獎勵 +${bonus} ⭐！`
      : `Bonus +${bonus} ⭐!`;
    showToast(
      lang === 'zh' ? '⚡ 限時完成！' : '⚡ Speed done!',
      phrase,
      2500
    );
    if (bonus >= 3) megaFireworks({ theme: loadSettings().theme || 'space' });
  }

  // Phase 16e — Bonus Catch: spawn a falling star for the student to tap
  if (bonus >= 2 && !bonusCatchActive) {
    setTimeout(() => startBonusCatch(), 600);
  }
}

// ── Bonus Catch (Phase 16e) — falling star student taps to catch ───────────
let bonusCatchKeyListener = null;
const BONUS_CATCH_DURATION_MS = 3000;
const BONUS_CATCH_STARS = 5;

function startBonusCatch() {
  if (bonusCatchActive) return;
  if (loadSettings().reduceMotion) return; // a11y: skip motion-heavy mini-game

  const star = document.getElementById('js-bonus-star');
  if (!star) return;

  bonusCatchActive = true;

  // H3 patch — pause L1 letter fall during bonus catch window so the
  // student isn't juggling two simultaneous falling animations.
  fallPaused = true;

  // Random horizontal lane (avoid edges so the star is reachable)
  const lane = 0.15 + Math.random() * 0.7; // 15%–85%
  const startLeft = window.innerWidth * lane;
  const endTop = window.innerHeight - 120;

  star.style.left = startLeft + 'px';
  star.style.transition = 'none';
  star.style.top = '-60px';
  star.classList.remove('caught', 'missed');
  // Force reflow before adding visible/falling so transitions take effect
  void star.offsetWidth;

  star.classList.add('visible', 'falling');
  star.style.transition = `top ${BONUS_CATCH_DURATION_MS}ms cubic-bezier(0.55, 0.05, 0.85, 0.45)`;
  star.style.top = endTop + 'px';

  // Catch handler — one-shot pointerdown anywhere on screen
  const onPointer = (e) => {
    if (!bonusCatchActive) return;
    // Ignore taps that originate on a settings/keyboard button (their own
    // click handler will still fire — we only consume the *catch* state).
    endBonusCatch(true);
    document.removeEventListener('pointerdown', onPointer, true);
  };
  document.addEventListener('pointerdown', onPointer, true);
  bonusCatchKeyListener = onPointer;

  // Miss timer — fires if not caught in time
  bonusCatchTimer = setTimeout(() => {
    endBonusCatch(false);
    document.removeEventListener('pointerdown', onPointer, true);
  }, BONUS_CATCH_DURATION_MS + 100);
}

function endBonusCatch(caught) {
  if (!bonusCatchActive) return;
  bonusCatchActive = false;
  if (bonusCatchTimer) { clearTimeout(bonusCatchTimer); bonusCatchTimer = null; }

  // H3 patch — resume L1 fall if it was paused
  fallPaused = false;

  const star = document.getElementById('js-bonus-star');
  if (star) {
    star.classList.remove('falling');
    star.style.transition = 'none';
    if (caught) {
      star.classList.add('caught');
      // After catch animation, clean up
      setTimeout(() => {
        star.classList.remove('visible', 'caught');
      }, 600);
    } else {
      star.classList.add('missed');
      setTimeout(() => {
        star.classList.remove('visible', 'missed');
      }, 500);
    }
  }

  if (bonusCatchKeyListener) {
    try { document.removeEventListener('pointerdown', bonusCatchKeyListener, true); } catch {}
    bonusCatchKeyListener = null;
  }

  if (caught) {
    stars += BONUS_CATCH_STARS;
    updateStars(stars);

    // Toast
    const lang = loadSettings().lang || 'zh';
    const title = lang === 'zh' ? '⭐ 接到星星！' : '⭐ Bonus caught!';
    const body  = lang === 'zh'
      ? `+${BONUS_CATCH_STARS} ⭐ 獎勵！`
      : `+${BONUS_CATCH_STARS} ⭐ bonus!`;
    showToast(title, body, 2200);

    // Phase 16 patch — celebrate big (visual sync with mega fireworks)
    celebrateRobot(10);
    mascotReact('cheer');

    megaFireworks({ theme: loadSettings().theme || 'space' });
    haptic('streak');
    if (loadSettings().soundFx) playStreak(5);
  }
}

// ── Contextual robot dialogues (Phase 16b) ──────────────────────────────────
// Uses LETTER_SYMBOLS from fx.js + per-letter phrases from i18n.js
function speakContextual(letter) {
  if (!('speechSynthesis' in window)) return;
  const lang = loadSettings().lang;
  // Prefer i18n letterPhrases, fall back to "X is for SYMBOL Word!"
  const phrase = i18n[lang]?.letterPhrases?.[letter] ||
                 `${letter} is for ${LETTER_SYMBOLS[letter] || ''} ${letter}!`;
  const u = new SpeechSynthesisUtterance(phrase);
  u.lang = lang === 'zh' ? 'zh-HK' : 'en-US';
  u.rate = lang === 'zh' ? 0.95 : 0.85;
  u.volume = 0.9;
  // H4 patch — queue (no cancel) so we don't kill any in-flight praise from
  // the previous turn. Speech synthesis naturally queues utterances.
  setTimeout(() => window.speechSynthesis.speak(u), 80);
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

let currentKbMode = 'full'; // matches DEFAULTS in settings.js
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
  currentKbMode = settings.kbMode || 'full';

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
  btn.style.position = 'relative';  // for ripple + halo positioning
  if (reduceMotion) btn.classList.add('no-motion');
  btn.addEventListener('click', () => {
    // Ripple on every tap (Phase 12c)
    btn.classList.remove('ripple');
    void btn.offsetWidth;
    btn.classList.add('ripple');
    setTimeout(() => btn.classList.remove('ripple'), 600);
    handleKey(letter);
  });
  return btn;
}

// Wrong-press feedback (Phase 12c) — applied to a specific key element
function flashWrongKey(letter) {
  const btn = document.querySelector(`.kb-key[data-letter="${letter}"]`);
  if (!btn) return;
  btn.classList.remove('wrong-shake');
  void btn.offsetWidth;
  btn.classList.add('wrong-shake');
  setTimeout(() => btn.classList.remove('wrong-shake'), 400);
}

// Wrong-letter ghost (Phase 16d) — spawn ghost of wrong letter floating up
// H2 patch — cap concurrent ghosts at MAX_GHOSTS so 5-rapid-wrong-presses
// doesn't stack 5 floating letters (overstimulation risk for SEN).
const MAX_GHOSTS = 3;
function spawnWrongGhost(letter) {
  const btn = document.querySelector(`.kb-key[data-letter="${letter}"]`);
  if (!btn) return;
  const r = btn.getBoundingClientRect();
  // Cap: if we already have MAX_GHOSTS, remove the oldest before spawning
  const existing = document.querySelectorAll('.wrong-ghost');
  if (existing.length >= MAX_GHOSTS) {
    existing[0].remove();
  }
  const ghost = document.createElement('div');
  ghost.className = 'wrong-ghost';
  ghost.textContent = letter;
  ghost.style.left = (r.left + r.width / 2) + 'px';
  ghost.style.top  = (r.top + r.height / 2) + 'px';
  document.body.appendChild(ghost);
  // Phase 16 patch — use animationend (more robust than fixed setTimeout)
  // with a 1.5s fallback in case the event never fires.
  let cleaned = false;
  const cleanup = () => {
    if (cleaned) return;
    cleaned = true;
    ghost.remove();
  };
  ghost.addEventListener('animationend', cleanup, { once: true });
  setTimeout(cleanup, 1500);
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

function showToast(title, body, hideMs = 3000) {
  const toast      = document.getElementById('js-toast');
  const toastTitle = document.getElementById('js-toast-title');
  const toastBody  = document.getElementById('js-toast-body');
  if (!toast || !toastTitle || !toastBody) return;

  // Phase 16 patch — cancel any prior toast's hide-timer so a fast follow-up
  // toast (e.g. speed-round → bonus-catch ~600ms later) doesn't get
  // prematurely hidden by the previous call's setTimeout.
  if (toastTimerId) { clearTimeout(toastTimerId); toastTimerId = null; }

  // Hide first to retrigger animation
  toast.classList.remove('visible');
  void toast.offsetWidth;
  toastTitle.textContent = title;
  toastBody.textContent  = body;
  toast.classList.add('visible');

  toastTimerId = setTimeout(() => {
    toast.classList.remove('visible');
    toastTimerId = null;
  }, hideMs);
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

// Phase 17 — apply Game Mode by toggling body class. Modes change visual
// treatment of the target letter but reuse the same handleKey pipeline.
//   classic  — letter shown as text (default)
//   sound    — letter hidden, TTS reads it (👂 mode)
//   sequence — letter shown as part of 3-letter sequence (Phase 17 future)
//   word     — letter shown as emoji word to spell (Phase 17 future)
export function applyGameMode(mode) {
  const m = mode || 'classic';
  document.body.setAttribute('data-game-mode', m);
}

export function getGameMode() {
  return loadSettings().gameMode || 'classic';
}

// Phase 17 W4 — Case mode: 'upper' (default A) or 'lower' (a).
// Touch keys stay uppercase labels (QWERTY rows are uppercase); only the
// big target letter display changes case. Trains case correspondence.
export function getCaseMode() {
  return loadSettings().caseMode || 'upper';
}

// ── Boot: apply saved theme + high-contrast class before first paint ───────
applyTheme(loadSettings().theme);
applyGameMode(loadSettings().gameMode);
// Phase 19 — apply reduce-motion class so all CSS .no-motion rules take effect
// (CSS already has comprehensive .no-motion rules; only the body toggle was missing)
document.body.classList.toggle('no-motion', !!loadSettings().reduceMotion);

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
  panel.querySelector('#js-kb-mode-select').value = settings.kbMode || 'full';
  panel.querySelector('#js-theme-select').value = settings.theme || 'space';
  panel.querySelector('#js-robot-color-select').value = String(settings.robotColor ?? 0);
  panel.querySelector('#js-mascot-theme-select').value = settings.mascotTheme || 'auto';
  panel.querySelector('#js-game-mode-select').value = settings.gameMode || 'classic';
  panel.querySelector('#js-case-mode-select').value = settings.caseMode || 'upper';

  // Phase 18 — Custom levels: populate textarea + inject C# options into unit dropdown
  const customLevels = settings.customLevels || '';
  const customInput = panel.querySelector('#js-custom-levels-input');
  if (customInput) customInput.value = customLevels;
  rebuildUnitDropdown(panel.querySelector('#js-unit-select'), settings.currentUnit, customLevels);
  updateCustomLevelsPreview(customLevels);

  // Phase 18 — live preview as user types
  if (customInput && !customInput._liveBound) {
    customInput.addEventListener('input', () => {
      const v = customInput.value;
      updateCustomLevelsPreview(v);
      rebuildUnitDropdown(panel.querySelector('#js-unit-select'),
                          panel.querySelector('#js-unit-select')?.value,
                          v);
    });
    customInput._liveBound = true;
  }

  panel.classList.add('visible');
}

// Phase 18 — Rebuild the unit dropdown options based on current customLevels string.
// Removes existing C# options, then injects fresh ones. Keeps the currently
// selected value if still valid; otherwise falls back to U1.
function rebuildUnitDropdown(selectEl, currentValue, customLevelsRaw) {
  if (!selectEl) return;
  // Remove any existing C# options
  Array.from(selectEl.querySelectorAll('option[data-custom]')).forEach(o => o.remove());
  const groups = parseCustomLevels(customLevelsRaw || '');
  groups.forEach((letters, i) => {
    const opt = document.createElement('option');
    opt.value = `C${i + 1}`;
    opt.textContent = `C${i + 1}·${letters.join('')}`;
    opt.setAttribute('data-custom', '1');
    selectEl.appendChild(opt);
  });
  // Restore selection if still valid
  const validValues = Array.from(selectEl.querySelectorAll('option')).map(o => o.value);
  selectEl.value = validValues.includes(currentValue) ? currentValue : 'U1';
}

// Phase 18 — Update the preview line below the textarea ("C1=ABC, C2=DEF, ...")
function updateCustomLevelsPreview(rawString) {
  const preview = document.getElementById('js-custom-levels-preview');
  if (!preview) return;
  const groups = parseCustomLevels(rawString || '');
  if (groups.length === 0) {
    preview.textContent = '留空即用預設 U1–U10';
  } else {
    const labels = groups.map((l, i) => `C${i + 1}=${l.join('')}`).join(', ');
    preview.textContent = `✓ 將會加入: ${labels}`;
  }
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
  const kbMode = panel.querySelector('#js-kb-mode-select')?.value ?? 'full';
  const theme  = panel.querySelector('#js-theme-select')?.value ?? 'space';
  const robotColor = parseInt(panel.querySelector('#js-robot-color-select')?.value ?? '0', 10);
  const mascotTheme = panel.querySelector('#js-mascot-theme-select')?.value ?? 'auto';
  const gameMode = panel.querySelector('#js-game-mode-select')?.value ?? 'classic';
  const caseMode = panel.querySelector('#js-case-mode-select')?.value ?? 'upper';
  const customLevels = panel.querySelector('#js-custom-levels-input')?.value?.trim() ?? '';

  const next = { voice, soundFx: sfx, bgm, bgmTrack, speed, highContrast: hc, reduceMotion: motion, lang, currentUnit: unit, level, kbMode, theme, robotColor, mascotTheme, gameMode, caseMode, customLevels };

  document.body.classList.toggle('high-contrast', hc);
  // Phase 19 — apply reduce-motion class globally so all CSS .no-motion rules
  // (already defined per-animation in CSS) actually take effect when toggled.
  document.body.classList.toggle('no-motion', motion);
  applyTheme(theme);
  applyGameMode(gameMode);

  // Apply BGM choice
  if (bgm) startBgm(bgmTrack);
  else stopBgm();

  // Phase 17 polish — capture prev settings BEFORE save so we can detect
  // gameMode / caseMode changes and re-render the current letter.
  const prevSettings = loadSettings();
  saveSettings(next);
  closeSettings();

  // Re-render keyboard with new mode + theme robot palette
  if (gameRunning) {
    const modeChanged = prevSettings.gameMode !== gameMode;
    const caseChanged = prevSettings.caseMode !== caseMode;

    const prog = loadProgress();
    const robotIdx = currentRobotIndex(masteredCount(prog));
    drawRobot(robotIdx);
    drawMascot();
    populateFloor(theme);
    renderTouchKeys();
    if (currentLetter) highlightKey(currentLetter);

    // Phase 17 polish — when gameMode or caseMode changes mid-game,
    // re-render the current letter so the visual treatment updates
    // immediately instead of waiting for the next correct press.
    if (modeChanged || caseChanged) {
      const lvl = loadSettings().level || 'L0';
      // sequence/word mode state was set up for old gameMode; reset cleanly
      sequenceLetters = [];
      sequenceIndex = 0;
      // Force re-show by passing the current letter through showLetter
      const target = currentLetter || touchKeys[0] || 'A';
      showLetter(target);
      speakLetter(target);
      if (lvl === 'L1') {
        startFall(() => robotReach());
      }
    }
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

// ── Leaderboard panel (Phase 14) ───────────────────────────────────────────
export function openLeaderboardPanel() {
  const panel = document.getElementById('js-leaderboard-panel');
  if (!panel) return;
  renderLeaderboard();
  panel.removeAttribute('hidden');
}

export function closeLeaderboardPanel() {
  const panel = document.getElementById('js-leaderboard-panel');
  if (panel) panel.setAttribute('hidden', '');
}

export function renderLeaderboard() {
  const list = document.getElementById('js-leaderboard-list');
  if (!list) return;
  const entries = getLeaderboard();
  if (entries.length === 0) {
    list.innerHTML = '<p style="text-align:center;color:var(--text-dim);padding:24px">未有紀錄<br>完成第一個單元就上榜！</p>';
    return;
  }
  const lang = loadSettings().lang;
  const rankClass = ['gold', 'silver', 'bronze'];
  list.innerHTML = entries.map((e, i) => {
    const rc = rankClass[i] ? `class="leaderboard-rank ${rankClass[i]}"` : 'class="leaderboard-rank"';
    const trophy = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '';
    const unitLabel = lang === 'zh' ? `完成 ${e.unit}` : `Done ${e.unit}`;
    return `
      <div class="leaderboard-row">
        <div ${rc}>${trophy || (i + 1)}</div>
        <div class="leaderboard-name">${escapeHtml(e.name)}</div>
        <div class="leaderboard-unit">${escapeHtml(unitLabel)}</div>
        <div class="leaderboard-score">⭐ ${e.score}</div>
      </div>`;
  }).join('');
}

function escapeHtml(s) {
  return String(s || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[c]);
}

// ── Name entry modal (Phase 14) ────────────────────────────────────────────
let pendingCompletion = null;  // { unit, score } waiting for name entry

export function openNameModal(unit, score) {
  const modal = document.getElementById('js-name-modal');
  const titleEl = document.getElementById('js-name-modal-title');
  const bodyEl = document.getElementById('js-name-modal-body');
  const input = document.getElementById('js-name-input');
  if (!modal || !titleEl || !bodyEl || !input) return;

  const lang = loadSettings().lang;
  titleEl.textContent = lang === 'zh' ? `🎉 完成 ${unit}！` : `🎉 ${unit} cleared!`;
  bodyEl.textContent  = lang === 'zh' ? '輸入你嘅名，登上排行榜！' : 'Enter your name for the leaderboard!';
  input.value = '';
  input.maxLength = MAX_NAME;

  pendingCompletion = { unit, score };
  modal.removeAttribute('hidden');
  setTimeout(() => input.focus(), 100);
}

export function closeNameModal() {
  const modal = document.getElementById('js-name-modal');
  if (modal) modal.setAttribute('hidden', '');
  pendingCompletion = null;
}

export function submitName() {
  const input = document.getElementById('js-name-input');
  if (!input || !pendingCompletion) return;
  const raw = sanitizeName(input.value);
  if (!raw) {
    // Empty after sanitize — just skip
    closeNameModal();
    return;
  }
  submitEntry({
    name: raw,
    score: pendingCompletion.score,
    unit: pendingCompletion.unit,
  });
  closeNameModal();
  // Briefly show leaderboard so student sees their entry
  setTimeout(() => openLeaderboardPanel(), 250);
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
