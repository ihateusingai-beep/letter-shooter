# Letter Personality Arrival — Phase 23 SPEC

**Audience**: 中度智障小學生 (moderate-ID primary), iPad-first, with Phase 24 ability-track opt-in for higher-ability students
**Type**: Per-letter arrival motion for `showLetter()` — additive visual layer + ability-gate architecture
**Companion**: `ARCHITECTURE.md` (game engine reference), `SPEC-runner.md` (Phase 22, in progress), Phase 24 Ability Track (next sprint)
**Status**: Spec draft — not yet implemented. Awaiting Phase 22 Runner WIP commit/stash.
**Replaces**: None (additive — current 0.3s opacity + scale(0.7→1) fade-in stays as fallback)

---

## 1. Concept

Today every letter arrives the same way: `opacity 0 → 1` + `scale(0.7 → 1)` over 0.3s. Functional but flat — students see the same motion 26 times and lose the "wow" moment per new letter.

**Phase 23** adds **5 motion personalities** mapped to the existing `LETTER_SYMBOLS` semantics so each letter arrives with a micro-story that reinforces its symbol association:

- `A` (✈️ airplane) flies in from the right
- `C` (🌙 moon) rises from below like a moonrise
- `Z` (⚡ lightning) zig-zags down quickly
- `K` (🔑 key) spirals in
- `Y` (🪀 yo-yo) swings in on a pendulum
- All others drop-bounce like a card landing

The motion is **0.7–1.2s** (track-scaled), **ends at the same letter position** as today (no layout shift), and is **gated by `.no-motion`** (existing reduce-motion toggle disables it cleanly — current 0.3s fade-in takes over).

**Ability-gate awareness (Phase 23 ships architecture; Phase 24 surfaces UI)**:

Phase 23 lays the foundation for differentiated instruction. The `letterArrival()` function reads `loadSettings().abilityTrack` (default `'beginner'`) and gates which motions are available:

- **beginner** (Phase 23 default) — `drop-bounce` only. Safe baseline.
- **standard** (Phase 24 will expose) — adds `fly-across`, `rise-glow`. Mild variety.
- **advanced** (Phase 24 will expose) — adds `zig-zag`, `spiral`, `pendulum`. Full personality.

Phase 23 ships with `abilityTrack: 'beginner'` baked into settings.js default — meaning **all students see `drop-bounce` only at launch**. Phase 24 will surface a teacher-facing UI toggle. This guarantees no SEN student accidentally gets harsh game-y motion even if Phase 24 ships a bug.

---

## 2. Motion Taxonomy (5 types)

| ID | Name | Description | Duration | Easing | Motion path |
|---|---|---|---|---|---|
| `fly-across` | Fly across | Off-screen right → center, slight tilt | 0.9s | cubic-bezier(.4, 0, .2, 1) | translateX(80vw) rotate(-8deg) → translateX(0) rotate(0) |
| `rise-glow` | Rise with glow | From below screen → center, opacity 0→1, filter brightness pulse | 1.1s | ease-out | translateY(60vh) + filter brightness(0.3→1.15→1) → translateY(0) |
| `drop-bounce` | Drop + settle | From above screen → center with one bounce | 0.9s | cubic-bezier(.5, -0.4, .3, 1.4) (overshoot) | translateY(-90vh) → translateY(0) (overshoot to 12px then settle) |
| `zig-zag` | Zig-zag | From above, X alternates 3 times | 0.8s | ease-in-out | translateY(-90vh) translateX(0→40→-40→0) → translateY(0) translateX(0) |
| `spiral` | Spiral | Scale 0 → 1, rotate 720° | 1.0s | cubic-bezier(.3, 1.4, .5, 1) | scale(0) rotate(0) → scale(1.15) rotate(720deg) → scale(1) rotate(720deg) |
| `pendulum` | Pendulum swing | Swings from top-center on invisible string | 1.2s | ease-in-out | translateY(-30vh) rotate(-25deg) → rotate(20deg) → rotate(0) |

Note: `drop-bounce` is the default — used by ~14 letters. The other 5 motions are special, semantically tied to the symbol.

---

## 3. Letter → Motion Mapping (26 entries)

Mapping rationale: motion matches symbol concept (already in `LETTER_SYMBOLS`). Students see airplane = airplane-flies-in, strengthening the letter↔symbol link.

| Letter | Symbol | Motion | Why |
|---|---|---|---|
| A | ✈️ Airplane | `fly-across` | Airplane flies across screen |
| B | 🏀 Ball | `drop-bounce` | Ball drops and bounces |
| C | 🌙 Crescent moon | `rise-glow` | Moon rises |
| D | 💎 Diamond | `drop-bounce` | Diamond falls |
| E | ⭐ Star | `drop-bounce` | Star falls |
| F | 🐟 Fish | `drop-bounce` | Fish jumps up then lands |
| G | 🍇 Grapes | `drop-bounce` | Bunch falls |
| H | ❤️ Heart | `drop-bounce` | Heart falls |
| I | 🍦 Ice cream | `drop-bounce` | Cone falls |
| J | 🧃 Juice | `drop-bounce` | Box falls |
| K | 🔑 Key | `spiral` | Key spins (insert motion) |
| L | 🍋 Lemon | `drop-bounce` | Lemon falls |
| M | 🌊 Wave | `rise-glow` | Wave rises (also matches ocean theme) |
| N | 🌙 Night | `rise-glow` | Night rises |
| O | 🍊 Orange | `drop-bounce` | Orange falls |
| P | 🍕 Pizza | `drop-bounce` | Slice falls |
| Q | 👑 Queen | `drop-bounce` | Crown falls |
| R | 🌈 Rainbow | `rise-glow` | Rainbow arcs up |
| S | ☀️ Sun | `rise-glow` | Sun rises (matches 'sunrise' semantics) |
| T | 🌳 Tree | `drop-bounce` | Tree drops in |
| U | ☂️ Umbrella | `drop-bounce` | Umbrella falls |
| V | 🎻 Violin | `drop-bounce` | Violin falls |
| W | 🐋 Whale | `drop-bounce` | Whale falls |
| X | ❌ X mark | `drop-bounce` | Stamp lands |
| Y | 🪀 Yo-yo | `pendulum` | Yo-yo swings |
| Z | ⚡ Lightning | `zig-zag` | Lightning bolts zig-zag down |

**Distribution** (26 total):
- `drop-bounce`: 17 letters (B, D, E, F, G, H, I, J, L, O, P, Q, T, U, V, W, X)
- `rise-glow`: 5 letters (C, M, N, R, S)
- `fly-across`: 1 letter (A)
- `zig-zag`: 1 letter (Z)
- `spiral`: 1 letter (K)
- `pendulum`: 1 letter (Y)

---

## 4. CSS Implementation (in `index.html` `<style>` block)

Append after existing `.no-motion #js-letter` rule (currently line ~642):

```css
/* Phase 23 — Letter personality arrival */
#js-letter.arrival-fly-across {
  animation: arrival-fly-across 0.9s cubic-bezier(.4, 0, .2, 1) both;
}
#js-letter.arrival-rise-glow {
  animation: arrival-rise-glow 1.1s ease-out both;
}
#js-letter.arrival-drop-bounce {
  animation: arrival-drop-bounce 0.9s cubic-bezier(.5, -0.4, .3, 1.4) both;
}
#js-letter.arrival-zig-zag {
  animation: arrival-zig-zag 0.8s ease-in-out both;
}
#js-letter.arrival-spiral {
  animation: arrival-spiral 1.0s cubic-bezier(.3, 1.4, .5, 1) both;
}
#js-letter.arrival-pendulum {
  animation: arrival-pendulum 1.2s ease-in-out both;
  transform-origin: top center;
}

@keyframes arrival-fly-across {
  0%   { transform: translateX(80vw) rotate(-8deg); opacity: 0; }
  60%  { opacity: 1; }
  100% { transform: translateX(0) rotate(0); opacity: 1; }
}
@keyframes arrival-rise-glow {
  0%   { transform: translateY(60vh); opacity: 0; filter: brightness(0.3); }
  50%  { filter: brightness(1.15); }
  100% { transform: translateY(0); opacity: 1; filter: brightness(1); }
}
@keyframes arrival-drop-bounce {
  0%   { transform: translateY(-90vh); opacity: 0; }
  60%  { transform: translateY(12px); opacity: 1; }
  80%  { transform: translateY(-6px); }
  100% { transform: translateY(0); opacity: 1; }
}
@keyframes arrival-zig-zag {
  0%   { transform: translate(-30vw, -90vh); opacity: 0; }
  25%  { transform: translate(40px, -45vh); opacity: 1; }
  50%  { transform: translate(-40px, -20vh); }
  75%  { transform: translate(20px, -5vh); }
  100% { transform: translate(0, 0); opacity: 1; }
}
@keyframes arrival-spiral {
  0%   { transform: scale(0) rotate(0); opacity: 0; }
  60%  { transform: scale(1.15) rotate(540deg); opacity: 1; }
  100% { transform: scale(1) rotate(720deg); opacity: 1; }
}
@keyframes arrival-pendulum {
  0%   { transform: translateY(-30vh) rotate(-25deg); opacity: 0; }
  20%  { opacity: 1; }
  40%  { transform: translateY(0) rotate(20deg); }
  60%  { transform: translateY(0) rotate(-15deg); }
  80%  { transform: translateY(0) rotate(8deg); }
  100% { transform: translateY(0) rotate(0); opacity: 1; }
}

/* Phase 23 — Reduce motion overrides (Phase 19.1 compat) */
.no-motion #js-letter.arrival-fly-across,
.no-motion #js-letter.arrival-rise-glow,
.no-motion #js-letter.arrival-drop-bounce,
.no-motion #js-letter.arrival-zig-zag,
.no-motion #js-letter.arrival-spiral,
.no-motion #js-letter.arrival-pendulum {
  animation: none !important;
  transform: none !important;
  opacity: 1 !important;
  filter: none !important;
}
```

---

## 5. JS API (in `js/fx.js`)

Append after `LETTER_SYMBOLS` definition:

```js
// Phase 23 — Letter personality motion mapping
export const LETTER_ARRIVAL_MOTION = {
  A: 'fly-across',
  C: 'rise-glow',
  K: 'spiral',
  M: 'rise-glow',
  N: 'rise-glow',
  R: 'rise-glow',
  S: 'rise-glow',
  Y: 'pendulum',
  Z: 'zig-zag',
  // All others default to 'drop-bounce' — looked up via getMotionForLetter
};

// Phase 23 — Ability-track motion gate (Phase 24 will expand)
// Restricts which motions are available per ability track.
// Settings.js defaults abilityTrack to 'beginner' (Phase 23 ships with this).
// Phase 24 will surface this as a teacher-facing option in Settings.
export const MOTION_GATE = {
  beginner:  new Set(['drop-bounce']),                                                 // safest default
  standard:  new Set(['drop-bounce', 'fly-across', 'rise-glow']),                     // exclude intense
  advanced:  new Set(['drop-bounce', 'fly-across', 'rise-glow', 'zig-zag', 'spiral', 'pendulum']),  // all
};

// Phase 23 — Per-track animation duration scaling (gentler for beginner, snappier for advanced)
export const DURATION_SCALE = {
  beginner:  1.3,
  standard:  1.0,
  advanced:  0.85,
};

// Phase 23 — resolve motion for a letter, gated by ability track
// track param is optional — falls back to 'beginner' (default) when settings not migrated yet
export function getMotionForLetter(letter, track = 'beginner') {
  if (!letter) return 'drop-bounce';
  const L = letter.toUpperCase();
  const motion = LETTER_ARRIVAL_MOTION[L] || 'drop-bounce';
  const allowed = MOTION_GATE[track] || MOTION_GATE.beginner;
  return allowed.has(motion) ? motion : 'drop-bounce';
}

// Phase 23 — trigger letter arrival animation on an element
// opts.track — 'beginner' | 'standard' | 'advanced' (default 'beginner')
// Removes any prior arrival class, adds the motion class, auto-cleans after animationend
export function letterArrival(el, letter, opts = {}) {
  if (!el) return;
  const track = opts.track || 'beginner';
  const motion = getMotionForLetter(letter, track);
  // Remove all prior arrival classes (idempotent — multiple calls safe)
  el.classList.remove(
    'arrival-fly-across', 'arrival-rise-glow', 'arrival-drop-bounce',
    'arrival-zig-zag', 'arrival-spiral', 'arrival-pendulum'
  );
  // Force reflow so the same class re-add restarts the animation
  void el.offsetWidth;
  el.classList.add(`arrival-${motion}`);
  // Track-scaled cleanup duration (longer for beginner, shorter for advanced)
  const cleanupMs = Math.round(1400 * (DURATION_SCALE[track] || 1.0));
  const cleanup = setTimeout(() => {
    el.classList.remove(`arrival-${motion}`);
  }, cleanupMs);
  // If animationend fires earlier, clear the cleanup timer
  el.addEventListener('animationend', () => clearTimeout(cleanup), { once: true });
}
```

---

## 6. Hook Point (in `js/game.js` `showLetter`)

Add 1 call after the existing `requestAnimationFrame` block (around line 681, after `currentLetter = letter;`):

```js
// Phase 23 — Letter personality arrival (with ability track gate)
import { letterArrival } from './fx.js'; // already in import list at top — just add to destructure
const _abilityTrack = loadSettings().abilityTrack || 'beginner';
letterArrival(el, letter, { track: _abilityTrack });
```

**Important**: the import is already at the top of `game.js` (line 7) — just extend the destructure to add `letterArrival`. The call must happen AFTER `el.textContent` is set (line ~674) so the browser sees the new letter glyph before measuring layout. `loadSettings` is already imported at the top of game.js (used elsewhere).

**Mode guard placement**: place the `letterArrival(el, letter, ...)` call only on the **Classic / Sound / Race / Pattern Missing** branch (after the `el.textContent = ...` block, before the `letterSparkle` call on line 716). Skip in Sequence / Word (they `return` early at lines 650 and 671 — natural skip). Runner is separate game loop, no shared call path.

**Runner mode (Phase 22)** — initially excluded from Phase 23. Phase 23.1 follow-up planned when Runner mode lands:
- Verify Runner's letter appearance path (not via `showLetter`) — likely uses `renderSequenceHTML()` slot pattern
- Decide which 3 letters in current Runner slot get the personality motion (slot-0 only? all 3?)
- Update `letterArrival()` signature to optionally accept a slot index for stagger
- Coordinate with Phase 22 owner before merging

**Mode compatibility**:
- **Classic mode** — applies (default path)
- **Sound-only mode** — applies (still shows letter shape after TTS)
- **Sequence mode** — ❌ skip (already uses scale(0.7→1) with sequence slots; would conflict with the slot UI)
- **Word mode** — ❌ skip (emoji + sequence; same reason)
- **Race 30s (Phase 21)** — applies (single letter, same as Classic)
- **Pattern Missing (Phase 21)** — applies (single letter)
- **Runner (Phase 22, in progress)** — ❌ skip (different game loop, not yet shipped; can revisit when Runner is shipped if desired)

Skip logic in `showLetter`:
```js
// Sequence / Word modes already return early before this point
// Add a guard for the remaining modes if needed (Runner state checked elsewhere)
```

---

## 7. Bundle Compatibility

`js/bundle.js` is auto-generated mirror of `js/game.js` + `js/fx.js`. After both source files are updated:
1. Re-run bundle build (check `scripts/` for build script — likely `npm run bundle`)
2. Verify `js/bundle.js` contains `LETTER_ARRIVAL_MOTION` and `letterArrival`
3. Verify `js/bundle.js` calls `letterArrival(el, letter)` in the showLetter section

---

## 8. iPad Safari Performance Notes

- All animations use `transform` + `opacity` + `filter` only — GPU-accelerated on iOS
- No layout thrash (transform doesn't trigger reflow)
- Max simultaneous animations: 1 (letter arrival) + 1 (letter trace SVG from Phase 13d, if active) + 1 (letterSparkle from fx.js)
- Duration cap: 1.2s (pendulum longest)
- `.no-motion` override fully kills animation — students with overstimulation settings see plain letter instantly

**Test device priority**: iPad (Safari, iOS 17+), then iPhone, then Mac/PC.

---

## 9. Theme Compatibility

Letter arrival motion does NOT interact with theme backgrounds (space/candy/ocean/forest). The motion is on `#js-letter` only; background emoji decoration runs on `.float-emoji` class (separate layer). No conflicts expected.

**Edge case**: `.rise-glow` uses `filter: brightness()`. This may briefly interact with `filter: drop-shadow()` set during `hit` state (line ~971 in game.js). The hit filter is set AFTER arrival completes (after student presses key), so no race. Verified by code inspection.

---

## 10. Acceptance Criteria

- [ ] Each of the 26 letters shows a motion matching its symbol (per table §3)
- [ ] Animations complete in ≤1.2s (default standard track), end with letter in correct position
- [ ] `abilityTrack: 'beginner'` (default in Phase 23) restricts to `drop-bounce` only — verifies gate works
- [ ] When `loadSettings().abilityTrack === 'standard'`, letters A, C, M, N, R, S show their motion; K, Y, Z fall back to `drop-bounce`
- [ ] When `loadSettings().abilityTrack === 'advanced'`, all 26 letters show their full motion mapping
- [ ] `.no-motion` toggle disables all 6 arrival animations (falls back to current 0.3s opacity fade-in)
- [ ] iPad Safari: no jank, no dropped frames during arrival
- [ ] Sequence mode + Word mode unchanged (arrival skipped)
- [ ] Race 30s + Pattern Missing modes work with arrival
- [ ] Runner mode (Phase 22) unaffected (arrival skipped there — but Runner is its own game loop, no shared call path)
- [ ] `js/bundle.js` regenerated and includes new code
- [ ] Letter trace SVG (Phase 13d) still overlays correctly
- [ ] `letterSparkle` burst (Phase 9c) still triggers after arrival settles
- [ ] Manual smoke: tap Settings → 減動畫 ON → all letters fade in instantly (no motion)
- [ ] Manual smoke: Settings → 減動畫 OFF + abilityTrack = beginner → all letters drop-bounce only (even A, Z, K, Y, etc)
- [ ] Manual smoke: programmatically flip `settings.abilityTrack` to 'advanced' → all 5 motion types observable

---

## 11. Files Touched

| File | Change | Approx LoC |
|---|---|---|
| `js/fx.js` | Add `LETTER_ARRIVAL_MOTION`, `MOTION_GATE`, `DURATION_SCALE`, `getMotionForLetter()`, `letterArrival()` (with `opts.track`) | +55 |
| `js/game.js` | Extend import destructure (line 7), add 3-line call in `showLetter` (track read + letterArrival) | +4 |
| `js/settings.js` | Add `abilityTrack: 'beginner'` to defaults (Phase 24 will surface in UI; Phase 23 ships it as a placeholder key only) | +1 |
| `js/bundle.js` | Mirror of fx.js + game.js + settings.js changes (rebuild) | +60 (mirrored) |
| `index.html` | Add 6 animation classes + 6 keyframes + reduce-motion override | +75 |

**Total new LoC**: ~195 (just over 100 LoC threshold but still under 500 LoC senior-review gate per memory rule 5; **add 10min mini-audit before commit**)

**Phase 23 vs Phase 24 boundary**:
- Phase 23 ships: architecture only — `MOTION_GATE`, `DURATION_SCALE`, `abilityTrack` default `'beginner'` (locked)
- Phase 24 will: surface `abilityTrack` setting in Settings UI, expand `MOTION_GATE.advanced` with countdown/fail/multiplier flash, possibly add per-track celebration variants

---

## 12. Out of Scope

- **Per-letter sound on arrival** — could add later (Phase 24 candidate) but not this phase
- **Motion variation per session** — same letter always uses same motion (predictable for SEN)
- **Letter-specific emoji overlay during arrival** — already exists via `letterSparkle` (Phase 9c)
- **Touching mode-specific UX** — Sequence / Word / Runner explicitly excluded
- **Settings toggle for arrival animations** — uses existing `.no-motion` toggle (Phase 19.1)

---

## 13. Open Questions

None blocking. Design assumes:
- Current letter arrival position is the default landing point (no layout change)
- Existing 0.3s opacity+scale fade-in is acceptable as `.no-motion` fallback
- Sequence/Word/Runner mode exclusion is correct (verify with Phase 22 owner if merging into same sprint)

---

## 14. Follow-up: Phase 23.1 Runner Integration (deferred)

**Trigger**: Phase 22 Runner mode lands first
**Owner**: User self-coordinates (Runner owner = user)
**Scope**:
1. Audit Runner's letter appearance path (likely `renderSequenceHTML()` slot, not `showLetter`)
2. Decide per-slot motion (only first letter? all 3 with stagger?)
3. Possibly extend `letterArrival()` signature with `slotIndex` for stagger delays
4. Add `runner-*` mode guard to letterArrival
5. Update reduce-motion override for Runner slot elements
6. Coordinate merge order — Runner must land before Phase 23.1 starts

**Estimated LoC**: ~40 (additive to Phase 23)

---

*Spec status: ready for implementation. ~150 LoC across 4 files. No architecture changes.*