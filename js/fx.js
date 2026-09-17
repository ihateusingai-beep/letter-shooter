// js/fx.js — visual effects: confetti, streak flash, letter trail
// All CSS-animated DOM particles — no canvas, no assets, no library.

let flashTimer = null;
let trailTimer = null;

// ── Per-letter symbol confetti (Phase 10d + 11) ─────────────────────────────
// Iconic picture-word associations for SEN learners (all 26 letters).
export const LETTER_SYMBOLS = {
  A: '✈️',   // Airplane
  B: '🏀',   // Ball
  C: '🌙',   // Crescent moon
  D: '💎',   // Diamond
  E: '⭐',   // Star
  F: '🐟',   // Fish
  G: '🍇',   // Grapes
  H: '❤️',   // Heart
  I: '🍦',   // Ice cream
  J: '🧃',   // Juice
  K: '🔑',   // Key
  L: '🍋',   // Lemon
  M: '🌊',   // Wave
  N: '🌙',   // Night
  O: '🍊',   // Orange
  P: '🍕',   // Pizza
  Q: '👑',   // Queen
  R: '🌈',   // Rainbow
  S: '☀️',   // Sun
  T: '🌳',   // Tree
  U: '☂️',   // Umbrella
  V: '🎻',   // Violin
  W: '🐋',   // Whale
  X: '❌',   // X mark
  Y: '🪀',   // Yo-yo
  Z: '⚡',   // Lightning (zap)
};

// ── Confetti burst on correct answer ────────────────────────────────────────
// opts.theme: 'space' | 'candy' | 'ocean' — picks shape family
// opts.letter: optional uppercase letter — adds themed symbol confetti
export function confettiBurst(originX, originY, opts = {}) {
  const container = document.getElementById('js-confetti-layer');
  if (!container) return;

  const theme = opts.theme || 'space';
  const letter = opts.letter;
  const count = opts.count || 32;

  // Theme-specific palettes
  const palettes = {
    space: ['#4FC3F7', '#FF6B9D', '#FFD54F', '#69F0AE', '#CE93D8', '#FF8A65', '#80DEEA', '#F48FB1'],
    candy: ['#FF6B9D', '#FFD54F', '#B388FF', '#69F0AE', '#FF9D7A', '#F48FB1'],
    ocean: ['#00BCD4', '#26C6DA', '#FFCA28', '#66BB6A', '#80DEEA', '#4FC3F7'],
    forest: ['#43A047', '#66BB6A', '#FFCA28', '#AB47BC', '#A5D6A7', '#FFB74D'],
  };
  const colors = opts.colors || palettes[theme] || palettes.space;

  // Theme-specific shape: 'mix' | 'stars' | 'hearts' | 'waves'
  const shapeFamilies = {
    space: ['star', 'star', 'circle', 'square', 'ribbon'],
    candy: ['heart', 'heart', 'circle', 'circle', 'ribbon'],
    ocean: ['wave', 'bubble', 'circle', 'circle', 'ribbon'],
    forest: ['leaf', 'flower', 'circle', 'circle', 'ribbon'],
  };
  const shapes = shapeFamilies[theme] || shapeFamilies.space;

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = originX + 'px';
    piece.style.top  = originY + 'px';
    piece.style.background = colors[i % colors.length];

    const shape = shapes[i % shapes.length];

    if (shape === 'star') {
      // 5-pointed star via clip-path
      piece.classList.add('confetti-star');
      piece.style.width = '14px';
      piece.style.height = '14px';
    } else if (shape === 'heart') {
      piece.classList.add('confetti-heart');
      piece.style.width = '12px';
      piece.style.height = '12px';
    } else if (shape === 'wave') {
      piece.classList.add('confetti-wave');
      piece.style.width = '16px';
      piece.style.height = '8px';
    } else if (shape === 'leaf') {
      piece.classList.add('confetti-leaf');
      piece.style.width = '14px';
      piece.style.height = '10px';
    } else if (shape === 'flower') {
      piece.classList.add('confetti-flower');
      piece.style.width = '14px';
      piece.style.height = '14px';
    } else if (shape === 'bubble') {
      piece.classList.add('confetti-bubble');
      piece.style.width = (8 + Math.random() * 6) + 'px';
      piece.style.height = piece.style.width;
    } else if (shape === 'circle') {
      piece.style.borderRadius = '50%';
      piece.style.width = (8 + Math.random() * 4) + 'px';
      piece.style.height = piece.style.width;
    } else if (shape === 'square') {
      piece.style.width = '6px';
      piece.style.height = '6px';
    } else { // ribbon
      piece.style.width = '4px';
      piece.style.height = '14px';
      piece.style.borderRadius = '2px';
    }

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 80 + Math.random() * 140;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 60;
    const rot = (Math.random() - 0.5) * 720;

    piece.style.setProperty('--dx', dx + 'px');
    piece.style.setProperty('--dy', dy + 'px');
    piece.style.setProperty('--rot', rot + 'deg');
    piece.style.animationDuration = (0.9 + Math.random() * 0.5) + 's';

    container.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }

  // Phase 10d: per-letter symbol particles (3 large emoji floating up)
  if (letter && LETTER_SYMBOLS[letter]) {
    for (let i = 0; i < 3; i++) {
      const sym = document.createElement('div');
      sym.className = 'confetti-piece letter-symbol';
      sym.textContent = LETTER_SYMBOLS[letter];
      sym.style.fontSize = '36px';
      sym.style.left = originX + 'px';
      sym.style.top  = originY + 'px';
      sym.style.background = 'transparent';
      const dx = (i - 1) * 60 + (Math.random() - 0.5) * 30;
      const dy = -120 - Math.random() * 60;
      sym.style.setProperty('--dx', dx + 'px');
      sym.style.setProperty('--dy', dy + 'px');
      sym.style.setProperty('--rot', (Math.random() - 0.5) * 180 + 'deg');
      sym.style.animationDuration = (1.4 + Math.random() * 0.4) + 's';
      container.appendChild(sym);
      sym.addEventListener('animationend', () => sym.remove(), { once: true });
    }
  }
}

// ── Mega fireworks: dramatic burst for streak ≥10 / robot unlock ───────────
// Multiple concentric bursts, 80+ particles, longer duration
export function megaFireworks(opts = {}) {
  const layer = document.getElementById('js-confetti-layer');
  if (!layer) return;

  const theme = opts.theme || 'space';
  const palettes = {
    space: ['#4FC3F7', '#FF6B9D', '#FFD54F', '#69F0AE', '#CE93D8', '#FF8A65', '#80DEEA', '#F48FB1', '#FFFFFF'],
    candy: ['#FF6B9D', '#FFD54F', '#B388FF', '#69F0AE', '#FF9D7A', '#F48FB1', '#FFFFFF'],
    ocean: ['#00BCD4', '#26C6DA', '#FFCA28', '#66BB6A', '#80DEEA', '#4FC3F7', '#FFFFFF'],
  };
  const colors = palettes[theme] || palettes.space;

  // 3 concentric bursts with slight delay
  const bursts = [
    { x: '50%', y: '50%', count: 30, dist: 220, delay: 0 },
    { x: '50%', y: '50%', count: 25, dist: 160, delay: 120 },
    { x: '50%', y: '50%', count: 35, dist: 280, delay: 240 },
  ];

  bursts.forEach(b => {
    setTimeout(() => {
      for (let i = 0; i < b.count; i++) {
        const piece = document.createElement('div');
        piece.className = 'confetti-piece mega';
        piece.style.position = 'absolute';
        piece.style.left = b.x;
        piece.style.top = b.y;
        piece.style.background = colors[i % colors.length];
        piece.style.borderRadius = '50%';
        const size = 6 + Math.random() * 8;
        piece.style.width = size + 'px';
        piece.style.height = size + 'px';
        piece.style.boxShadow = `0 0 8px ${colors[i % colors.length]}`;

        const angle = (Math.PI * 2 * i) / b.count + (Math.random() - 0.5) * 0.3;
        const dist = b.dist * (0.7 + Math.random() * 0.6);
        const dx = Math.cos(angle) * dist;
        const dy = Math.sin(angle) * dist;

        piece.style.setProperty('--dx', dx + 'px');
        piece.style.setProperty('--dy', dy + 'px');
        piece.style.setProperty('--rot', (Math.random() - 0.5) * 1080 + 'deg');
        piece.style.animationDuration = (1.6 + Math.random() * 0.8) + 's';

        layer.appendChild(piece);
        piece.addEventListener('animationend', () => piece.remove(), { once: true });
      }
    }, b.delay);
  });
}

// ── Floating combo text on correct (Phase 9b) ──────────────────────────────
// Rises from letter position and fades. Phrase varies by streak tier.
export function floatCombo(text, originX, originY, opts = {}) {
  const layer = document.getElementById('js-combo-layer');
  if (!layer) return;
  const el = document.createElement('div');
  el.className = 'combo-text' + (opts.tier ? ' tier-' + opts.tier : '');
  el.textContent = text;
  el.style.left = originX + 'px';
  el.style.top  = originY + 'px';
  layer.appendChild(el);
  el.addEventListener('animationend', () => el.remove(), { once: true });
}

// ── Streak flash: brief radial pulse for milestones ────────────────────────
export function streakFlash(intensity = 'normal') {
  const flash = document.getElementById('js-streak-flash');
  if (!flash) return;
  flash.classList.remove('flash-go');
  flash.classList.remove('flash-big');
  void flash.offsetWidth;
  flash.classList.add('flash-go');
  if (intensity === 'big') flash.classList.add('flash-big');

  if (flashTimer) clearTimeout(flashTimer);
  flashTimer = setTimeout(() => {
    flash.classList.remove('flash-go');
    flash.classList.remove('flash-big');
  }, 600);
}

// ── Letter sparkle burst on appear (Phase 9c) ───────────────────────────────
// Smaller, gentler than confetti — radiates outward from letter on show.
export function letterSparkle(originX, originY, opts = {}) {
  const container = document.getElementById('js-confetti-layer');
  if (!container) return;
  const count = opts.count || 10;
  const color = opts.color || '#FFFFFF';
  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece sparkle';
    piece.style.left = originX + 'px';
    piece.style.top  = originY + 'px';
    piece.style.background = color;
    piece.style.borderRadius = '50%';
    const size = 3 + Math.random() * 3;
    piece.style.width = size + 'px';
    piece.style.height = size + 'px';
    piece.style.boxShadow = `0 0 4px ${color}`;

    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.4;
    const dist = 30 + Math.random() * 50;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist;
    const rot = (Math.random() - 0.5) * 360;

    piece.style.setProperty('--dx', dx + 'px');
    piece.style.setProperty('--dy', dy + 'px');
    piece.style.setProperty('--rot', rot + 'deg');
    piece.style.animationDuration = (0.6 + Math.random() * 0.3) + 's';

    container.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }
}

// ── Letter trail: sparkle particles following falling letter ───────────────
export function startLetterTrail(getPosition) {
  stopLetterTrail();
  const layer = document.getElementById('js-trail-layer');
  if (!layer) return;

  trailTimer = setInterval(() => {
    const pos = getPosition();
    if (!pos) return;

    const sparkle = document.createElement('div');
    sparkle.className = 'trail-sparkle';
    sparkle.style.left = (pos.x + (Math.random() - 0.5) * 30) + 'px';
    sparkle.style.top  = (pos.y + (Math.random() - 0.5) * 20) + 'px';
    const colors = ['#FFD54F', '#FF6B9D', '#4FC3F7', '#69F0AE'];
    sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
    sparkle.style.width = (4 + Math.random() * 6) + 'px';
    sparkle.style.height = sparkle.style.width;

    layer.appendChild(sparkle);
    sparkle.addEventListener('animationend', () => sparkle.remove(), { once: true });
  }, 80); // ~12 sparkles/sec
}

export function stopLetterTrail() {
  if (trailTimer) {
    clearInterval(trailTimer);
    trailTimer = null;
  }
}