// js/fx.js — visual effects: confetti, streak flash, letter trail
// All CSS-animated DOM particles — no canvas, no assets, no library.

let flashTimer = null;
let trailTimer = null;

// ── Confetti burst on correct answer ────────────────────────────────────────
export function confettiBurst(originX, originY, opts = {}) {
  const container = document.getElementById('js-confetti-layer');
  if (!container) return;

  const count = opts.count || 32;
  const colors = opts.colors || [
    '#4FC3F7', '#FF6B9D', '#FFD54F', '#69F0AE',
    '#CE93D8', '#FF8A65', '#80DEEA', '#F48FB1'
  ];

  for (let i = 0; i < count; i++) {
    const piece = document.createElement('div');
    piece.className = 'confetti-piece';
    piece.style.left = originX + 'px';
    piece.style.top  = originY + 'px';
    piece.style.background = colors[i % colors.length];

    // Random shape: circle, square, or ribbon
    const shape = i % 3;
    if (shape === 0) {
      piece.style.borderRadius = '50%';
      piece.style.width = '8px';
      piece.style.height = '8px';
    } else if (shape === 1) {
      piece.style.width = '6px';
      piece.style.height = '12px';
    } else {
      piece.style.width = '4px';
      piece.style.height = '14px';
      piece.style.borderRadius = '2px';
    }

    // Random direction + distance
    const angle = (Math.PI * 2 * i) / count + (Math.random() - 0.5) * 0.5;
    const dist = 80 + Math.random() * 140;
    const dx = Math.cos(angle) * dist;
    const dy = Math.sin(angle) * dist - 60; // bias upward
    const rot = (Math.random() - 0.5) * 720;

    piece.style.setProperty('--dx', dx + 'px');
    piece.style.setProperty('--dy', dy + 'px');
    piece.style.setProperty('--rot', rot + 'deg');
    piece.style.animationDuration = (0.9 + Math.random() * 0.5) + 's';

    container.appendChild(piece);
    piece.addEventListener('animationend', () => piece.remove(), { once: true });
  }
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