# Letter Runner — Phase 22 SPEC

**Audience**: 中度智障小學生 (moderate-ID primary), iPad-first
**Type**: Side-scrolling runner game, single-page, localStorage only
**Companion**: `ARCHITECTURE.md` (game engine reference), `letter-shooter-sen-plan.md §1`
**Status**: Phase 22 WIP — spec updated to comply with Design Invariant I1 (≥10 questions per level)
**Decision log**: 2026-09-28 — Per user feedback, Runner level length bumped from 3 → 10 letters (see ARCHITECTURE.md §10a).

---

## 1. Concept

A horizontal side-scrolling runner where the student jumps over obstacles by pressing the correct letter. Each level presents **10 letters** from the teacher's configured letter pool (per Design Invariant I1 — see ARCHITECTURE.md §10a). The character auto-runs right; correct letter press triggers a jump. Wrong press causes a brief stumble (no death, no fail). 10 successful jumps = level clear, speed increases slightly, next level loads.

**Design goal**: Pixel-art 8-bit aesthetic, bright colours, high visual clarity — makes it exciting enough for a 9-year-old but never overwhelming.

---

## 2. Visual Design

### Layout (portrait iPad, 375×667 base)

```
┌──────────────────────────────────────┐
│  HEADER: "Runner" + Level + Stars    │  44px
├──────────────────────────────────────┤
│                                      │
│  [A]  [B]  [C]     ← 3 letter slots  │  top ~30% of screen
│  ↑current target glow                │
│                                      │
│          parallax BG                 │
│                                      │
│    🏃 ←character   🪨 obstacle→      │  ground line
│  ═══════════════════════════════════ │  ground
└──────────────────────────────────────┘
│        touch controls (a-z grid)     │  bottom 120px
└──────────────────────────────────────┘
```

### Scene layers (back to front)

1. **Sky gradient** — theme-dependent, slow parallax
2. **Distant hills/clouds** — slow parallax (moves at 20% ground speed)
3. **Ground** — tiled floor scrolling at ground speed
4. **Obstacle** — comes from right, moves left at ground speed
5. **Character** — fixed X position, Y animates on jump
6. **Letter slots** — fixed top area, glows current target
7. **UI overlay** — score / level / progress dots

### Character

- 32×32 pixel-art robot (same `robotColor` setting drives palette)
- Run cycle: 4-frame CSS sprite animation (bob up/down)
- Jump: translateY(-80px) over 400ms ease-out, then 400ms ease-in return
- Stumble (wrong key): shake 4px left-right for 400ms
- Celebration (level clear): bounce + spin once

### Obstacles

Two types, randomly selected:
- **Rock** — grey rounded boulder, 40×36px
- **Stump** — brown tree stump, 36×40px

Both are large and high-contrast. No small/fast obstacles (audience safety).

### Letter slots

Three boxes in a row. Current target letter has:
- Themed glow border (`box-shadow: 0 0 20px`)
- Scale 1.1
- Colour fill

Completed letters: green tick overlay + opacity 0.5.

### Ground

Tiled CSS pattern, themed per palette (earthy brown for forest, blue for ocean, etc.)

### Progress dots

Three dots below letter slots: ○ ○ ○ → ● ○ ○ → ● ● ○ → ● ● ● (level complete)

---

## 3. Game Mechanics

### Letter Pool

Same as other modes: `activeLetters(currentUnit)` from `curriculum.js`. **10 letters** drawn randomly with replacement from the pool each level (resampling allowed since pool is small, e.g. U1 = 3 letters means many repeats — that's intentional for muscle memory). If pool < 1 letter remaining, fallback to first letter of alphabet.

### Game Loop

```
LEVEL_START:
  draw 10 letters from pool → letterSlots[0..9]
  set currentIndex = 0
  start obstacle loop
  start ground scroll

OBSTACLE_APPROACHING:
  obstacle moves left at groundSpeed px/frame
  when obstacle.x < jumpThreshold (character.x + 80):
    player MUST press correct letter to jump

ON CORRECT KEY:
  jump animation
  obstacle passes harmlessly
  mark letter slot[ currentIndex ] complete
  currentIndex++
  if currentIndex == 10 → LEVEL_COMPLETE

ON WRONG KEY:
  stumble animation (400ms)
  obstacle continues — collision = 500ms freeze, then resumes
  no life lost, no level restart

ON OBSTACLE COLLISION (wrong key):
  brief freeze 500ms
  screen flash red 200ms
  continue (obstacle disappears off left)
  student can still clear remaining letters

LEVEL_COMPLETE:
  confetti burst
  "LEVEL CLEAR!" overlay 1.5s
  level++
  groundSpeed += 0.3 px/frame (capped)
  back to LEVEL_START
```

### Difficulty curve

- Level 1: obstacle every 3s, groundSpeed = 2 px/frame
- Level 5: obstacle every 2.2s, groundSpeed = 3 px/frame
- Level 10+: obstacle every 1.8s, groundSpeed = 4 px/frame
- Cap: groundSpeed max 5, obstacle interval min 1.5s

### Scoring

- +10 stars per level clear (same star counter as other modes)
- No streak (runner mode independent)
- Personal best level saved to `ls-runner-best: number`

### Audio

- Jump: short ascending chime (Web Audio)
- Wrong: soft thud (Web Audio)
- Level clear: fanfare (Web Audio)
- Background: same BGM as other modes (user toggle)

---

## 4. State Machine

```
IDLE → RUNNING → (LEVEL_CLEAR → RUNNING) or (PAUSED → RUNNING)
```

New state vars in `game.js`:
- `runnerActive: bool`
- `runnerLevel: int` (starts 1)
- `runnerLetterPool: string[]`
- `runnerCurrentIndex: int` (0..9, since 10 slots per level)
- `runnerObstacleTimer: int`
- `runnerGroundOffset: int`
- `runnerGroundSpeed: float`
- `runnerJumping: bool`
- `runnerStumbling: bool`
- `runnerObstacleActive: bool`
- **Constant**: `RUNNER_LETTERS_PER_LEVEL = 10` (Design Invariant I1 — do not lower)

---

## 5. Files to Change

| File | Change |
|---|---|
| `js/settings.js` | Add `gameMode: 'classic'` default + `'race30' \| 'patternMissing' \| 'runner'` to allowed |
| `js/i18n.js` | Add runner labels (start, level clear, best, etc.) × 2 langs |
| `js/game.js` | Add runner game loop, state machine, render functions |
| `js/bundle.js` | Mirror all changes from js/game.js + js/settings.js |
| `index.html` | Add runner CSS, runner HTML structure (hidden until mode active) |
| `SPEC-runner.md` | This file |

---

## 6. Acceptance Criteria

- [ ] Game launches from hub/start overlay with "Runner" mode button
- [ ] **10 letters** drawn from active letter pool (respects teacher settings) — I1 invariant
- [ ] Character auto-runs (ground scrolls)
- [ ] Obstacle appears from right, moves left
- [ ] Correct letter → jump → obstacle passes → letter slot completes
- [ ] Wrong letter → stumble → brief freeze → resume
- [ ] **10 correct = level clear**, speed increases, next level
- [ ] Personal best level saved to localStorage and shown on game over
- [ ] Star counter increments (+10/level)
- [ ] Theme colours apply (floor, sky, character palette)
- [ ] BGM plays (if enabled)
- [ ] All 4 themes (space/candy/ocean/forest) visually distinct
- [ ] iPad touch: on-screen a-z keyboard works
- [ ] PC keyboard: physical a-z works
- [ ] No death/fail state — always continue
- [ ] Mobile responsive (portrait iPad 375px wide minimum)
