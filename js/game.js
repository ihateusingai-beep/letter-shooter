// js/game.js — core game loop: L0 / L1, shooting, scoring
import { loadSettings, saveSettings, fallDuration } from './settings.js';
import { loadProgress, recordAttempt, masteredCount } from './progress.js';
import { activeLetters, currentRobotIndex } from './curriculum.js';
import { t, pickT, setLang } from './i18n.js';
import { playCorrect, playWrong, playStreak, playUnlock, unlockAudio } from './sfx.js';
import { confettiBurst, streakFlash, startLetterTrail, stopLetterTrail } from './fx.js';
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
};

// ── Robot ──────────────────────────────────────────────────────────────────
// CSS-drawn robots: base + 2 unlockable variants — bigger eyes, bobble antenna
export function drawRobot(robotIdx = 0) {
  const { robotWrap } = getEls();
  if (!robotWrap) return;

  const theme = loadSettings().theme || 'space';
  const palettes = ROBOT_PALETTES[theme] || ROBOT_PALETTES.space;
  const p = palettes[robotIdx % palettes.length];

  robotWrap.innerHTML = `
    <svg viewBox="0 0 120 130" width="120" height="130" aria-hidden="true"
         style="filter:drop-shadow(0 0 12px ${p.glow})">
      <!-- glow aura -->
      <ellipse cx="60" cy="115" rx="42" ry="8" fill="${p.glow}" opacity="0.25"/>
      <!-- antenna with bobble -->
      <g class="robot-antenna">
        <line x1="60" y1="14" x2="60" y2="34" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="60" cy="10" r="7" fill="${p.accent}" opacity="0.95"/>
        <circle cx="58" cy="8" r="2" fill="white" opacity="0.8"/>
      </g>
      <!-- head -->
      <rect x="22" y="34" width="76" height="56" rx="14" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      <!-- cheek blush -->
      <circle cx="30" cy="62" r="6" fill="${p.accent}" opacity="0.3"/>
      <circle cx="90" cy="62" r="6" fill="${p.accent}" opacity="0.3"/>
      <!-- eyes (large, expressive) -->
      <g class="robot-eyes">
        <circle cx="44" cy="56" r="10" fill="white"/>
        <circle cx="76" cy="56" r="10" fill="white"/>
        <circle cx="44" cy="58" r="7" fill="${p.eye}"/>
        <circle cx="76" cy="58" r="7" fill="${p.eye}"/>
        <circle cx="46" cy="55" r="2.5" fill="white"/>
        <circle cx="78" cy="55" r="2.5" fill="white"/>
      </g>
      <!-- smile -->
      <path d="M 44 74 Q 60 84 76 74" stroke="${p.eye}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- body -->
      <rect x="32" y="92" width="56" height="26" rx="8" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      <!-- chest light -->
      <circle cx="60" cy="105" r="4" fill="${p.accent}" opacity="0.9"/>
      <!-- arms with hands -->
      <g class="robot-arm-l">
        <rect x="10" y="96" width="18" height="10" rx="5" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
        <circle cx="8" cy="101" r="6" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      </g>
      <g class="robot-arm-r">
        <rect x="92" y="96" width="18" height="10" rx="5" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
        <circle cx="112" cy="101" r="6" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      </g>
      <!-- legs -->
      <rect x="40" y="120" width="14" height="10" rx="4" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      <rect x="66" y="120" width="14" height="10" rx="4" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
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
  touchKeys = activeLetters(unitKey);

  const prog = loadProgress();
  const robotIdx = currentRobotIndex(masteredCount(prog));

  updateUnit(unitKey);
  updateScore();
  updateStreak(0);
  drawRobot(robotIdx);
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
      // Arrived — visual cue only; student still has time to press correct key
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
    updateScore();
    clearHighlight();

    // ── Confetti burst at letter position ────────────────────────────────
    const letterBox = document.getElementById('js-letter')?.getBoundingClientRect();
    if (letterBox) {
      confettiBurst(letterBox.left + letterBox.width / 2, letterBox.top + letterBox.height / 2);
    }

    // ── Streak + reward feedback ────────────────────────────────────────
    streak++;
    updateStreak(streak);
    celebrateRobot();
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
      showRobotUnlock(afterMastered);
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
    recordAttempt(currentLetter.toUpperCase(), false);
    shakeLetter();
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

// ── Robot celebration: brief jump + spin ────────────────────────────────────
function celebrateRobot() {
  const wrap = document.getElementById('js-robot-wrap');
  if (!wrap) return;
  wrap.classList.remove('celebrate');
  void wrap.offsetWidth;
  wrap.classList.add('celebrate');
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
