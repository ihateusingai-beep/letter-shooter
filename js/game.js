// js/game.js — core game loop: L0 / L1, shooting, scoring
import { loadSettings, saveSettings, fallDuration } from './settings.js';
import { loadProgress, recordAttempt, masteredCount } from './progress.js';
import { activeLetters, currentRobotIndex } from './curriculum.js';
import { t, setLang } from './i18n.js';

// Attach public API to window for non-module HTML
window.LetterShooter = {
  startGame, handleKey, openSettings, closeSettings, applySettings,
  renderTouchKeys, speakLetter, shoot, flashSuccess, shakeLetter,
  showLetter, updateScore, drawRobot,
  loadSettings, fallDuration, setLang,
  openProgressPanel, closeProgressPanel,
};

// ── State ──────────────────────────────────────────────────────────────────
let score = 0;
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
  if (scoreEl) scoreEl.textContent = score;
}

export function updateUnit(unitKey) {
  const { unitEl } = getEls();
  if (unitEl) unitEl.textContent = unitKey;
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

// ── Robot ──────────────────────────────────────────────────────────────────
// CSS-drawn robots: base + 2 unlockable variants
export function drawRobot(robotIdx = 0) {
  const { robotWrap } = getEls();
  if (!robotWrap) return;

  const colors = [
    { body: '#E8F4FD', eye: '#1A1A2E', accent: '#4FC3F7' },  // base: blue
    { body: '#FDE8E8', eye: '#1A1A2E', accent: '#EF9A9A' },  // 1: pink
    { body: '#E8FDE8', eye: '#1A1A2E', accent: '#A5D6A7' },  // 2: green
  ];
  const c = colors[robotIdx % colors.length];

  robotWrap.innerHTML = `
    <svg viewBox="0 0 80 90" width="80" height="90" aria-hidden="true">
      <line x1="40" y1="8" x2="40" y2="22" stroke="${c.accent}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="40" cy="6" r="5" fill="${c.accent}"/>
      <rect x="18" y="22" width="44" height="36" rx="10" fill="${c.body}" stroke="${c.accent}" stroke-width="2"/>
      <circle cx="30" cy="36" r="7" fill="${c.eye}"/>
      <circle cx="50" cy="36" r="7" fill="${c.eye}"/>
      <circle cx="32" cy="34" r="2.5" fill="white"/>
      <circle cx="52" cy="34" r="2.5" fill="white"/>
      <path d="M 30 48 Q 40 55 50 48" stroke="${c.eye}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <rect x="22" y="60" width="36" height="22" rx="6" fill="${c.body}" stroke="${c.accent}" stroke-width="2"/>
      <rect x="6"  y="62" width="14" height="8" rx="4" fill="${c.body}" stroke="${c.accent}" stroke-width="2"/>
      <rect x="60" y="62" width="14" height="8" rx="4" fill="${c.body}" stroke="${c.accent}" stroke-width="2"/>
      <rect x="26" y="82" width="10" height="8" rx="3" fill="${c.body}" stroke="${c.accent}" stroke-width="2"/>
      <rect x="44" y="82" width="10" height="8" rx="3" fill="${c.body}" stroke="${c.accent}" stroke-width="2"/>
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
  touchKeys = activeLetters(unitKey);

  const prog = loadProgress();
  const robotIdx = currentRobotIndex(masteredCount(prog));

  updateUnit(unitKey);
  updateScore();
  drawRobot(robotIdx);
  renderTouchKeys(touchKeys);
  nextTurn(level, touchKeys);
}

export function stopGame() {
  gameRunning = false;
  if (animFrame) { cancelAnimationFrame(animFrame); animFrame = null; }
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

  if (pressed === expected) {
    shoot();
    flashSuccess();
    score++;
    updateScore();

    // Reset arrived state
    letterArrived = false;
    const { letter: letterEl } = getEls();
    if (letterEl) letterEl.style.filter = '';

    const prog = recordAttempt(currentLetter.toUpperCase(), true);
    const prevMastered = masteredCount(loadProgress()) - 1;
    const afterMastered = masteredCount(prog);
    if (afterMastered > prevMastered) {
      showRobotUnlock(afterMastered);
    }

    setTimeout(() => {
      if (gameRunning) nextTurn(loadSettings().level, touchKeys);
    }, 600);
  } else {
    recordAttempt(currentLetter.toUpperCase(), false);
    shakeLetter();
  }
}

// ── Touch keys ───────────────────────────────────────────────────────────────
export function renderTouchKeys(keys) {
  const container = document.getElementById('js-touch-keys');
  if (!container) return;
  container.innerHTML = '';

  const settings = loadSettings();
  const reduceMotion = settings.reduceMotion;

  keys.forEach(letter => {
    const btn = document.createElement('button');
    btn.className = 'touch-key';
    btn.textContent = letter.toUpperCase();
    btn.setAttribute('data-letter', letter.toUpperCase());
    btn.setAttribute('aria-label', `Letter ${letter.toUpperCase()}`);
    if (reduceMotion) btn.classList.add('no-motion');
    btn.addEventListener('click', () => handleKey(letter.toUpperCase()));
    container.appendChild(btn);
  });
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
export function openSettings() {
  const panel = document.getElementById('js-settings-panel');
  if (!panel) return;

  const settings = loadSettings();
  panel.querySelector('#js-voice-toggle').checked = settings.voice;
  panel.querySelector('#js-speed-select').value = settings.speed;
  panel.querySelector('#js-hc-toggle').checked = settings.highContrast;
  panel.querySelector('#js-motion-toggle').checked = settings.reduceMotion;
  panel.querySelector('#js-lang-select').value = settings.lang;
  panel.querySelector('#js-unit-select').value = settings.currentUnit;
  panel.querySelector('#js-level-select').value = settings.level;

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
  const speed  = panel.querySelector('#js-speed-select')?.value ?? 'slow';
  const hc     = panel.querySelector('#js-hc-toggle')?.checked ?? false;
  const motion = panel.querySelector('#js-motion-toggle')?.checked ?? false;
  const lang   = panel.querySelector('#js-lang-select')?.value ?? 'zh';
  const unit   = panel.querySelector('#js-unit-select')?.value ?? 'U1';
  const level  = panel.querySelector('#js-level-select')?.value ?? 'L0';

  const next = { voice, speed, highContrast: hc, reduceMotion: motion, lang, currentUnit: unit, level };

  document.body.classList.toggle('high-contrast', hc);

  document.querySelectorAll('.touch-key').forEach(btn => {
    btn.classList.toggle('no-motion', motion);
  });

  saveSettings(next);
  closeSettings();
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
