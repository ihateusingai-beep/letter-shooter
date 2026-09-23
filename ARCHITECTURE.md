# Letter Shooter — Architecture Reference

**Audience**: Developer / maintainer picking up this codebase
**Status**: Living document — refresh after each phase
**Last refreshed**: 2026-09-22 (Phase 19.3)
**Companion docs**: [HANDOVER.md](./HANDOVER.md) (teacher-facing), [letter-shooter-sen-plan.md](./letter-shooter-sen-plan.md) (v0.2 original plan, **superseded**)

---

## 1. System Overview

Single-page browser game. **No backend, no login, no analytics**. Everything (game progress, settings, leaderboard, daily/weekly goals) is persisted to `localStorage`. Deploys as a static site to GitHub Pages.

**Stack constraints** (locked):
- Vanilla JS (ES modules + a pre-built IIFE bundle), no framework
- CSS-animated DOM particles (no canvas, no WebGL, no library)
- Procedural Web Audio (no audio assets)
- iPad Safari primary target, no install required

**Audience constraints** (locked):
- 中度智障小學生 (moderate-ID primary students) — no fail states, generous defaults
- SEN overstimulation safety — BGM / motion / confetti all default off or low
- Teacher runs the app — settings panel is the only configuration surface

---

## 2. File Map & Dependency Graph

```
index.html                       (HTML + CSS + boot script, ~2400 lines)
└── js/bundle.js                 (pre-built IIFE — actual runtime entry)
    └── js/game.js               (state machine, game loop, DOM API)
        ├── js/settings.js       (localStorage settings)
        ├── js/progress.js       (per-letter attempt tracking)
        ├── js/curriculum.js     (U1-U10 + custom levels + robot milestones)
        ├── js/i18n.js           (zh / en strings)
        ├── js/sfx.js            (Web Audio SFX + iPad haptic)
        ├── js/fx.js             (visual effects — confetti, fireworks, etc.)
        ├── js/challenge.js      (daily + weekly goal tracking)
        ├── js/leaderboard.js    (name entry + top-N storage)
        └── js/bgm.js            (procedural ambient BGM)
```

**Key architectural fact**: `js/bundle.js` is a **manually-maintained IIFE mirror** of the source modules. There is no build step that regenerates it. When you edit a `.js` source file, you must mirror the same change to the matching region of `bundle.js`. See §8.

---

## 3. localStorage Schema

All keys prefixed `ls-` (except a few legacy keys). No encryption; no PII beyond optional leaderboard name.

### `ls-settings` (object, JSON)

```js
{
  // Audio
  voice:        true,         // TTS on/off
  soundFx:      true,         // SFX chime / streak / unlock sounds
  bgm:          false,        // BGM on/off
  bgmTrack:     'space',      // 'space' | 'xylophone' | 'rain'

  // Appearance
  theme:        'space',      // 'space' | 'candy' | 'ocean' | 'forest'
  robotColor:   0,            // 0/1/2 — per-theme palette index
  mascotTheme:  'auto',       // 'auto' | 'space' | 'candy' | 'ocean' | 'forest'
  highContrast: false,
  reduceMotion: false,        // Phase 19.1 — actually disables CSS animations
  confettiIntensity: 'normal', // Phase 19.2 — 'gentle' | 'normal' | 'party'

  // Gameplay
  currentUnit:  'U1',         // 'U1'...'U10' | 'C1'...'C9' (custom)
  level:        'L0',         // 'L0' | 'L1' (L1 = slow fall)
  speed:        'slow',       // 'verySlow' | 'slow' | 'medium' (L1 only)
  gameMode:     'classic',    // 'classic' | 'sound' | 'sequence' | 'word'
  caseMode:     'upper',      // 'upper' | 'lower'
  customLevels: '',          // comma-separated "ABC,DEF,GHI" (Phase 18)
  masteryThreshold: 6,       // 5 | 6 | 7 | 8 — Phase 19.5 (see §6 + curriculum.js ALLOWED_MASTERY_THRESHOLDS)

  // Misc
  lang:         'zh',         // 'zh' | 'en'
  kbMode:       'full',       // 'full' | 'compact'
}
```

### `ls-progress` (object, JSON)

26-letter master map. Each entry tracks rolling 10-attempt window:

```js
{
  A: { status: 'mastered', seen: 10, firstTryOk: 7, recent: [1,1,1,1,0,1,1,1,0,1] },
  B: { status: 'practice',  seen: 5,  firstTryOk: 2, recent: [1,0,1,0,0] },
  C: { status: 'new',       seen: 1,  firstTryOk: 1, recent: [1] },
  D: { status: 'unopened',  seen: 0,  firstTryOk: 0, recent: [] },
  // ... X-Z
}
```

- **Mastery threshold** (Phase 19.5): teacher-overrideable via `settings.masteryThreshold` (5/6/7/8). Default 6 = 60% correct in rolling 10-attempt window. Computed via `getMasteryThreshold()` from `curriculum.js`. Letters with `<10 attempts` retain `new` or `practice` status (can't compute mastery yet).
- **Status re-evaluation** (Phase 19.5): when `masteryThreshold` changes, `reevaluateAllStatuses(newThreshold)` walks every letter with a full rolling window and recomputes `mastered`/`practice`. Letters below move down, letters above move up.
- **Robot unlocks**: at 9 / 18 / 26 mastered letters (Phase curriculum.js ROBOT_MILESTONES) — affected by masteryThreshold because mastered count is what drives robot palette unlock.

### `ls-leaderboard` (array of entries)

```js
[
  { name: '小明', score: 47, unit: 'U3', ts: 1758123456789 },
  { name: 'Mary', score: 89, unit: 'U9', ts: 1758234567890 },
  // top 10 only (MAX_NAME sanitized to 12 chars)
]
```

### Daily / Weekly (Phase 12)

```js
{
  'ls-daily':  { '2026-09-22': 12, '2026-09-21': 25, ... },
  'ls-weekly': { '2026-W38': 87, '2026-W37': 142, ... }
}
```

Goals: 20 stars/day, 100 stars/week (default).

### Schema migration policy

`loadSettings()` does `{ ...DEFAULTS, ...parsed }` — partial reads never fail. New fields added with default values; old fields ignored. Forward-compatible.

**⚠️ Known gotcha** (memory §11 single-file HTML trap equivalent): `JSON.parse` on corrupted localStorage returns `undefined` for the wrapper object, breaking object spreads. Always wrapped in `try/catch` returning `freshProgress()` / `DEFAULTS`.

---

## 4. Game Mode State Machine

Phases 17 + 18 introduced 4 game modes and 2 level modes. State machine:

```
                ┌─────────────────────────────────────┐
                │           any letter                │
                │                                     │
        ┌───────▼────────┐               ┌────────▼───────┐
        │  classic       │               │  word          │
        │  show letter   │               │  show emoji    │
        │  press match   │               │  press to      │
        │  (default)     │               │  spell letters │
        └────────────────┘               └────────────────┘
                ▲                                 ▲
                │                                 │
        ┌───────┴────────┐               ┌────────┴───────┐
        │  sound         │               │  sequence      │
        │  hide letter,  │               │  show 3-letter │
        │  TTS reads,    │               │  order, press  │
        │  press match   │               │  in sequence   │
        └────────────────┘               └────────────────┘
                ▲
                │ phase change triggers reset
                │
        ┌───────┴────────┐
        │  L1 falling    │  (orthogonal to game mode)
        │  adds letter   │
        │  fall timer    │
        └────────────────┘
```

**Transitions**: `applySettings()` reads prev + new gameMode, if changed:
1. `sequenceLetters = []; sequenceIndex = 0;` (reset sequence state)
2. `showLetter(currentLetter)` — force re-render
3. `speakLetter(currentLetter)` — re-trigger TTS
4. If L1 active: `startFall()` restarts fall timer

See `game.js:1679-1694` (applySettings mid-game re-render).

**State that must be reset on mode change** (in `resetPhase16State` + `resetPhase17State`):
- `sequenceLetters`, `sequenceIndex` (W3)
- `speedRoundActive`, `speedRoundTimer`, `correctSinceSpeed` (Phase 16a)
- `bonusCatchActive`, `bonusCatchTimer`, `bonusCatchKeyListener` (Phase 16e)

⚠️ **Bug class to watch** (memory §13 logical-bug pass): mode/state change without full reset = stale state leaks. Always trace state vars when adding a new mode.

---

## 5. Feedback Pipeline

Per correct press (in `handleKey` after match):

```
speakLetter(letter)       [if voice]     Web Speech API en-US rate 0.9
playCorrect()            [sfx.js]       Web Audio chime (440Hz → 880Hz)
recordAttempt(letter, true)              updates ls-progress rolling window
updateScore()                            score++ + pop animation
updateStars()                            stars++ + bar fill + next-milestone hint
updateStreak()                           streak++ + pop + rainbow at ≥5
floatCombo(phrase)                       rising text +1 → 叻! → 很好! → 太棒了!
confettiBurst(letter)                    themed particles (intensity-aware, Phase 19.2)
letterSparkle()                          10 small white particles at letter
streakFlash('normal' | 'big')            radial pulse at milestones 3/5/10
megaFireworks()                          3 concentric bursts at streak ≥10
robotCelebrate tier                      jump → big-jump → 720° spin (stages)
mascotReact('happy' | 'cheer')           cat reactions
bullet animation (Phase 15)              variable shape/color/duration
letter-symbol confetti                   3 large emoji floating up (intensity-aware)
recordStar()                             increments daily/weekly counters
updateDailyHint()                        header daily progress bar
toast for daily milestone                at 50% / 75% / 100% of daily goal
triggerSpeedRound()                      every 10 correct (Phase 16a, gated by reduceMotion)
triggerBonusCatch()                      random ⭐ falling (Phase 16e)
```

Per wrong press:

```
recordAttempt(letter, false)             updates rolling window
playWrong()                              Web Audio slide-down
shakeLetter()                            CSS class for 400ms
nudgeTts()                               5 random gentle phrases
mascotReact('sad')                       brief cat sad reaction
```

Per unit completion:

```
isUnitComplete(progress, unit) → true
megaFireworks()                          larger burst
openNameModal()                          modal pops for name entry
submitName() → submitEntry()             writes to ls-leaderboard
setTimeout(250ms) → openLeaderboardPanel()   auto-show
```

⚠️ **Bug class to watch**: feedback pipeline side-effects that fire on wrong letter (e.g. megaFireworks on every correct, not gated by streak). Always check `streak >= threshold` before triggering celebratory effects.

---

## 6. Feature Matrix by Phase

| Phase | Module(s) | Feature | Source |
|---|---|---|---|
| 1 | game.js | Pause dim keys | `Phase 1: pause dims keys via CSS class` |
| 2 | sfx.js, game.js | SFX + praise/nudge TTS + streak counter + robot celebrate | commit `6e118f9` |
| 3 | fx.js, game.js | Confetti + streak flash + letter trail + bigger robot + Candy theme | `0894d7d` |
| 4 | bgm.js | Procedural BGM (3 ambient tracks, default OFF) | `d9b9ae7` |
| 5 | fx.js, game.js | Ocean theme + bubbles | `af32078` |
| 6 | fx.js, game.js | Mega fireworks + themed confetti + stars + tier celebrate | `dee7614` |
| 7 | fx.js, game.js | Letter pulse + themed floaters + robot reach-up | `4c6caea` |
| 8 | fx.js, game.js | Achievement toast + score rainbow + space sparkle rain | `d882e24` |
| 9 | fx.js, game.js | Next milestone hint + floating combo text + letter sparkle | `66ab3c9` |
| 10 | game.js | Bigger robot + mascot cat + themed floor + per-letter confetti | `350efb0` |
| 11 | fx.js | All 26 letter symbol map | `13792a6` |
| 12 | challenge.js | Daily challenge goal + HANDOVER.md + touch key UX | `aefa986` |
| 13 | fx.js, sfx.js, game.js | Forest theme + iPad haptic + Solfège TTS + letter trace | `bf0d006` |
| 14 | leaderboard.js, curriculum.js | U10 mixed review + leaderboard + name entry | `7035327` |
| 15 | game.js | Variable bullet + impact animation variety | `1daba38` |
| 16 | game.js, settings.js | Speed round + ghost + bonus catch + avatar customize (+ 5-bug patch + 16.5 silent-data-loss fix) | `1ed413a`, `803ec01`, `cea0b7d`, `1142ddf` |
| 17 | game.js, settings.js, i18n.js | Word / Sound-only / Sequence / Lowercase game modes (+ polish patch) | `68f3a17`, `7fb56da`, `b9aaf2a`, `02c4913`, `f3e58f6` |
| 18 | curriculum.js, settings.js, game.js | Teacher-defined Custom Levels + kbMode default + settings ordering | `8e4b051`, `3967790`, `a391236` |
| 19.1 | game.js, bundle.js, index.html | Wire reduce-motion to actually disable all animations | `0d8dfc1` |
| 19.2 | settings.js, fx.js, game.js | Confetti intensity setting (gentle/normal/party) | `dac35e1` |
| 19.3 | index.html | Settings panel grouped into 4 collapsible sections | `b9bbbfa` |
| 19.4 | ARCHITECTURE.md | Replace v0.2 plan with 437-line dev reference doc | `e883bb1` |
| 19.5 | settings.js, curriculum.js, progress.js, game.js | Teacher-overrideable masteryThreshold (5/6/7/8) with re-evaluation | `e8c21a0` |
| 19.6 | dataio.js (new), game.js, index.html | Export/Import localStorage progress as JSON (settings → ⚙️ Advanced) | (current) |
| 19.7 | curriculum.js | U10 mixed review sub-pool: ≤12 letters from practice + mastered (no unopened padding) | `9508e3c` |
| 19.8 | index.html, game.js | Custom Levels visual picker (replace Phase 18 textarea with 26-button grid) | `c1ea8a0` |
| 18.3 | index.html | Start overlay level picker injects custom C# levels | `3c85585` |
| 19.9 | index.html, fx.js, game.js | Homepage redesign: level grid + difficulty picker (easy/normal/hard) + default L1 + letter hit explosion + bigger combo counter | `93f5cf3` |

---

## 7. Per-Module Reference

### `js/settings.js` (47 LoC)
Single source of truth for `DEFAULTS`. `loadSettings()` does `{ ...DEFAULTS, ...JSON.parse(localStorage) }`. `saveSettings(patch)` merges and persists. Add new settings here AND in `bundle.js` DEFAULTS block.

### `js/curriculum.js` (121 LoC)
Defines `UNITS` (U1-U10), `ROBOT_MILESTONES` (9/18/26), `MASTERY_WINDOW` (10), `DEFAULT_MASTERY_THRESHOLD` (6), `ALLOWED_MASTERY_THRESHOLDS` ([5,6,7,8]). Phase 18 added `parseCustomLevels(rawString)` + `getCustomUnitKeys()`. **Phase 19.5** added `getMasteryThreshold()` which reads `settings.masteryThreshold` with fallback to default + validation against allowed set. **Phase 19.7** added `buildU10SubPool(prog)` — U10 mixed review now returns up to 12 letters (max 6 unmastered + rest mastered) instead of all 26. **Bug-prone area**: `activeLetters(unitKey)` — review-letter join logic changed in 16.5 patch (`all.length < 6` not `< 3`); before patch, U2 only showed E/F/S and review letter A was defined but never appeared.

### `js/dataio.js` (Phase 19.6)
Export/import localStorage progress. `serializeExport()` returns JSON with `{version, exportedAt, appVersion, data}` wrapper; `downloadExport()` triggers browser download. `parseImport(jsonString)` validates structure; `applyImport(payload)` writes known keys via JSON-roundtrip safe setItem. `importFromString(s)` is the high-level entrypoint. Triggered via Settings → ⚙️ Advanced → Export/Import buttons.

### `js/progress.js` (81 LoC)
Per-letter rolling window of 10. `recordAttempt(letter, firstTry)` is the only mutator and uses `getMasteryThreshold()` from curriculum. Mastery computation: `sum(recent) >= threshold` → `mastered`. **Phase 19.5** added `reevaluateAllStatuses(threshold)` — bulk re-eval when teacher changes threshold setting; only walks letters with full rolling window. `masteredCount(prog)` for robot unlock + leaderboard logic.

### `js/progress.js` (81 LoC)
Per-letter rolling window of 10. `recordAttempt(letter, firstTry)` is the only mutator. Mastery computation: `sum(recent) >= 6`. `masteredCount(prog)` for robot unlock + leaderboard logic.

### `js/fx.js` (298 LoC)
Pure DOM effects (no canvas). `LETTER_SYMBOLS` map (Phase 11). `confettiBurst(x, y, opts)` honors `opts.intensity` (Phase 19.2). `megaFireworks` (Phase 6). `streakFlash`, `letterSparkle`, `startLetterTrail`, `floatCombo`. No imports — keep it pure.

### `js/sfx.js` (112 LoC)
Web Audio synthesis (no audio files). `playCorrect` (chime), `playWrong` (slide), `playStreak` (fanfare), `playUnlock` (cosmic). `unlockAudio()` must be called from a user gesture (iOS Safari autoplay restriction). `haptic()` is iPad-only vibration.

### `js/bgm.js` (201 LoC)
Procedural ambient BGM. 3 tracks: space (drone), xylophone (pluck), rain (filtered noise). Default OFF. `startBgm(trackId)`, `stopBgm()`, `pauseBgm()`, `resumeBgm()`, `unlockBgm()`.

### `js/challenge.js` (75 LoC)
Daily (20 stars) + weekly (100 stars) goals. ISO date key. `recordStar()` on every correct. `getDailyProgress()`, `getWeeklyProgress()` for the header progress bar.

### `js/leaderboard.js` (60 LoC)
Top-10 entries, sanitized name (max 12 chars, alphanumeric + CJK + space). `submitEntry({ name, score, unit, ts })`. `getLeaderboard()`, `clearLeaderboard()`.

### `js/i18n.js` (215 LoC)
zh / en translation maps. `t(key)` lookup. `pickT(key)` for arrays (e.g. praise phrases). `setLang(lang)` flips the active language.

### `js/game.js` (1850 LoC) — THE BIG ONE
Contains:
- State (`score`, `streak`, `stars`, `currentLetter`, `touchKeys`, `gameRunning`, `currentUnit`)
- Game loop (`startGame`, `stopGame`, `handleKey`)
- DOM rendering (`drawRobot`, `drawMascot`, `populateFloor`, `showLetter`, `shoot`, `flashSuccess`, `shakeLetter`, `updateScore`, `updateStars`, `updateStreak`, `renderTouchKeys`)
- Settings panel (`openSettings`, `closeSettings`, `applySettings`)
- Teacher Progress + Leaderboard panels (`openProgressPanel`, `openLeaderboardPanel`)
- Game mode handling (`applyTheme`, `applyGameMode`, `getCaseMode`)
- Mini-game triggers (`triggerSpeedRound`, `triggerBonusCatch`)
- Boot at module-eval time: `applyTheme(...)` + `applyGameMode(...)` + `body.classList.toggle('no-motion', ...)`

⚠️ `game.js` is approaching complexity ceiling. New features should consider whether they belong in their own module (e.g. challenge.js, leaderboard.js were both extracted).

### `js/bundle.js` (~2600 LoC) — THE MIRROR
Pre-built IIFE. Manually synced with the source modules. See §8.

---

## 8. Build & Deploy

### Build (no bundler)

There is **no automated build step**. `js/bundle.js` is a pre-built IIFE that's committed alongside the source. When you edit a `.js` source file, you must:

1. Make the edit in the source module (e.g. `js/game.js`)
2. **Find the equivalent code in `js/bundle.js`** (search by string content — variables get renamed but strings stay literal)
3. Apply the same edit to `js/bundle.js`
4. Commit both files together

**How to find the equivalent region in bundle.js**:
- `applySettings` → `js/bundle.js:2283`
- `applyTheme` → `js/bundle.js:2203`
- `confettiBurst` → `js/bundle.js:579`
- `handleKey` / feedback pipeline → `js/bundle.js:1780`
- DEFAULTS object → `js/bundle.js:283`

This is fragile. **TODO (not yet done)**: replace with a real esbuild step. Until then, every commit that touches a `.js` source MUST touch bundle.js or runtime will diverge.

### Deploy

GitHub Actions → `.github/workflows/deploy.yml`:
1. On push to `main`, upload repo as artifact
2. Deploy to GitHub Pages via official action
3. Live at https://ihateusingai-beep.github.io/letter-shooter

No build step in CI. The deployed artifact is the repo as-is.

---

## 9. Testing

### Smoke tests (Playwright)

`scripts/smoke-phase{N}.js` — one per phase. Pattern:

```js
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage();
  const errors = [];
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
  });
  const fileUrl = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await page.goto(fileUrl);
  await page.waitForSelector('#js-start-btn');
  // Reset localStorage, reload, exercise behavior, assert
})();
```

Each phase's smoke covers:
- Boot success (no JS errors)
- Phase-specific feature works
- Settings panel reflects new options
- Theme/mode transitions don't break

### What's NOT tested
- Visual regression (no screenshot diffing)
- Touch gestures on iPad (smoke uses Chromium, not WebKit)
- BGM audio output (silent in headless)
- localStorage corruption recovery (manual probe only)
- Long-session memory leaks (no soak test)

### Manual iPad testing checklist (HANDOVER §"How To Test")

---

## 10. Known Issues & Trade-offs (dev-facing)

1. **No automated build** — `bundle.js` mirror is manual. Drift will happen. Add esbuild soon.
2. **`index.html` is monolithic** (~2400 LoC with HTML + CSS + boot). Hard to scan. Could split CSS into a `style.css` file but breaks the no-build constraint.
3. **`game.js` is approaching complexity ceiling** at 1850 LoC. New features → extract module.
4. **No CI lint or type-check** — relies on smoke tests catching syntax errors.
5. **No semantic versioning** — `package.json` is `1.0.0` since initial scaffold. Use commit messages as changelog.
6. **Multiple students on one device = shared progress** — localStorage key is per-origin, not per-student.
7. **No export/import** — clearing browser data loses progress (Phase C1 future work).
8. **Sound-only mode lacks phonetic hint** for students who can't distinguish similar-sounding consonants (B/P, M/N) — see Phase B3.
9. **U10 mixed review = all 26 at once** — overwhelming for early students; see Phase B2 candidate.

---

## 11. How to Add a New Phase

Recipe (after planning with teacher + user confirmation):

1. **Spec the change** — what feature, what file(s), what test
2. **Audit existing code** — does this touch `bundle.js` mirror? `game.js` state? localStorage schema? settings panel?
3. **Edit source module(s)** — single logical change per commit
4. **Mirror to `js/bundle.js`** — find equivalent region, apply same edit
5. **Add smoke test** — `scripts/smoke-phase{N}.js` covering the new behavior
6. **Run all smoke tests** — no regression in older phases
7. **Commit** — message: `Phase {N}: {short description}` + bullet body
8. **Update `ARCHITECTURE.md`** — add row to §6 feature matrix, update §7 module refs if API changed
9. **Update `HANDOVER.md`** — refresh settings reference, add to test plan if user-facing

⚠️ **Always commit source + bundle + smoke + docs together** so any revert restores full state.

---

## 12. Memory Rules That Apply Here

This codebase inherits the Mavis agent's memory rules. Particularly relevant:

- **§5 Senior-engineer audit gates** — refactor before audit callsite / closure / type refs resolve
- **§13 Senior-engineer logical-bug pass** — 5 bug families: default-state desync / reset-on-render / enable-condition off-by-concept / silent default data loss / dead code via name collision
- **§14 CI gates** — no CI in this project yet, but smoke tests serve as the gate

When adding a new feature that has multiple versions (e.g. applying an `apply-with-choices` UI), do senior review first (§13).

---

## 13. Future Work (not yet prioritized)

Backlog from prior audits (Phase 19 review):

- **C1** Export/import localStorage progress (data portability)
- **A2** Visual picker for Custom Levels (replace textarea)
- **B1 already shipped** (Phase 19.5 masteryThreshold)
- **B2 already shipped** (Phase 19.7 U10 sub-pool)
- **A2 already shipped** (Phase 19.8 custom levels visual picker)
- **C1 already shipped** (Phase 19.6 export/import)
- **19.9 already shipped** (homepage redesign + explosion + combo counter)
- **B3** Sound-only mode phonetic hint for hard consonants
- Per-letter sound variations (currently all use same SFX)
- Replace manual bundle.js with esbuild
- Add WebKit smoke for iPad parity check
- Per-student profile switcher (multi-student on same device)
- Replace manual bundle.js with esbuild
- Add WebKit smoke for iPad parity check
- Per-student profile switcher (multi-student on same device)

— End of architecture reference —