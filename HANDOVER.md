# Letter Shooter — Handover & Field Testing Guide

**Audience**: SEN teacher preparing iPad classroom testing
**App**: Letter Shooter v1.6 (letter-shooting game for moderate-intellectual-disability primary students)
**Live URL**: https://ihateusingai-beep.github.io/letter-shooter
**Repo**: https://github.com/ihateusingai-beep/letter-shooter
**Last refreshed**: 2026-09-21 (Phase 18.2)

---

## What This Game Does

Students see a giant letter (A-Z) and press the matching keyboard key or touch key. The robot companion shoots the letter; correct answers earn confetti, stars, and a fire streak counter. Wrong answers shake the letter and trigger a gentle supportive voice prompt — no fail/lose language (no-life-no-death design).

**Target students**: 中度智障小學生 (moderate intellectual disability, primary school age)
**Platform**: iPad primary (touch screen), PC keyboard secondary
**Persistence**: All progress (stars, mastered letters, settings, leaderboard, daily/weekly) in `localStorage` — no backend, no login.

**4 game modes** (Settings → 玩法模式):
- **Classic** — see letter, press key (default)
- **Sound-only** — hear letter via TTS, press key (no visual)
- **Sequence** — press 3 letters in order
- **Word** — spell the emoji (e.g. see 🍕🍕 → press P-P)

---

## How To Test on iPad

1. Open Safari on the iPad
2. Visit `https://ihateusingai-beep.github.io/letter-shooter/`
3. Tap the blue **開始** button to dismiss the start overlay
4. Game begins: a giant letter appears, full QWERTY keyboard or 4 touch keys below
5. **First touch keypress matters**: it unlocks Web Audio (iOS Safari autoplay restriction). Make sure teacher demos this gesture on first load.
6. Optional: open Settings (⚙️ top right) to enable voice + sound FX; BGM is OFF by default (SEN overstimulation safety — only enable if the class handles it).

### Test Plan (one week, 1-2 students per session)

| Session | What to test | What to record |
|---|---|---|
| Day 1-2 | Default Classic + space theme, L0 static mode, U1·ABC | Time on task, frustrated? confused? |
| Day 3 | Switch to candy theme (Settings → 主題 → 🍬 糖果) | Does student prefer it? |
| Day 4 | Switch to ocean theme | Same |
| Day 5 | Try Forest theme (4th theme, Phase 13) | Same |
| Day 6 | Try L1 falling letter mode (Settings → 難度 → L1 慢落) | Easier/harder? |
| Day 7 | Try Sound-only mode (Phase 17 W2) — student listens, no visible letter | Engagement change |
| Day 8 | Try Sequence mode (Phase 17 W3) — 3-letter order | Memory load test |
| Day 9 | Try Lowercase mode (Phase 17 W4) | Case correspondence |
| Day 10 | Try Custom Levels (Phase 18) — teacher pre-defines ABC/DEF/GHI | Targeted practice |
| Day 11 | Try Speed Round (auto-triggers after N correct) | Excitement vs overwhelm |
| Day 12 | Try BGM on (Settings → 背景音樂 → 🌌 太空) | Overstimulation risk? |
| Day 13 | Free play — let student choose | Engagement drop-off curve |

---

## Features Shipped (25 phases)

### Core game (Phase 1-7)

| # | Feature | Where to test |
|---|---|---|
| 1 | Pause / Resume button + keys dim when paused | Top right ⏸ icon |
| 2 | SFX (答對 chime, 答錯 slide, streak fanfar), Praise TTS (5 random zh phrases), Nudge TTS on wrong | Audio on/off in Settings |
| 3 | Confetti on every correct + streak flash at 3/5/10 + letter trail during L1 fall + Candy theme | Watch the burst on each correct |
| 4 | 3 procedural BGM tracks (space / xylophone / rain), default OFF | Settings → 背景音樂 |
| 5 | Ocean theme with rising bubbles | Settings → 主題 → 🌊 海洋 |
| 6 | Mega fireworks at streak ≥10 / robot unlock, themed confetti shapes per theme, ⭐ stars counter + progress bar, robot 3-tier celebrate (jump → big jump → 720° spin) | Streak indicators in top bar |
| 7 | Letter pulse (gentle glow), themed floating emoji in background (stars in space, candies in candy), robot reach-up on L1 letter arrival | Watch the letter and the robot zone |

### Engagement (Phase 8-11)

| # | Feature | Where to test |
|---|---|---|
| 8 | Achievement toast at 10/25/50/100 stars, score number rainbow shift on streak ≥5, falling sparkle rain in space theme | Long sessions — stars accumulate |
| 9 | "下一個 N 粒" hint next to stars, floating combo text on each correct (+1 → 叻! → 很好! → 太棒了!), letter sparkle burst when letter appears | Read the hint to predict next milestone |
| 10 | Bigger robot (160×180), 🐱 mascot cat companion with idle/happy/sad/cheer reactions, themed floor decoration (8 emoji per theme), per-letter symbol confetti (A→✈️, C→🌙, E→⭐, H→❤️, M→🌊) | Watch the mascot on every correct/wrong |
| 11 | All 26 letter symbols (airplane/ball/crescent/diamond/star/fish/grapes/heart/ice-cream/juice/key/lemon/wave/night/orange/pizza/queen/rainbow/sun/tree/umbrella/violin/whale/X/yo-yo/lightning) | Each correct letter bursts 3 large emojis |

### Curriculum & teacher tools (Phase 12-14)

| # | Feature | Where to test |
|---|---|---|
| 12 | **Daily challenge** — 20 stars/day goal with mini progress bar in header, weekly progress too | Top bar "今日 X/20 ⭐" |
| 13 | **Forest theme** (4th theme), iPad haptic feedback (vibration on correct/wrong), Solfège TTS for letter pronunciation, letter trace animation | Forest theme; haptic on iPad only |
| 14 | **U10 mixed review** (all 26 letters), **leaderboard** with name entry on unit completion, sanitized input (max name length, no special chars) | Complete a unit (U1-9) → modal pops for name → leaderboard opens |

### Game variety (Phase 15-16)

| # | Feature | Where to test |
|---|---|---|
| 15 | **Variable bullet** — random shape (star/heart/circle/square/ribbon) and color per shot; impact animation variety on letter hit | Watch the bullet's shape change between shots |
| 16 | **Speed Round** (auto-triggers after N correct — 15s timer, score hits), **Bonus Catch** (⭐ falls, tap to grab), **Avatar customize** (pick robot color + mascot theme) | Speed Round banner appears mid-game; ⭐ falls occasionally |

### Game modes (Phase 17)

| # | Feature | Where to test |
|---|---|---|
| 17 W1 | **Word Mode** — see emoji (🍕🍕), press letter P twice | Settings → 玩法模式 → 拼字 |
| 17 W2 | **Sound-only Mode** — hear TTS letter, no visual | Settings → 玩法模式 → 聽聲 |
| 17 W3 | **Sequence Mode** — press 3 letters in given order | Settings → 玩法模式 → 順序 |
| 17 W4 | **Lowercase Mode** — display letter as lowercase, key still uppercase | Settings → 大小寫 → 小寫 |
| 17 polish | Tier 1 mode fixes: TTS feedback on each correct in sequence mode; mid-game re-render when mode changes | Switch gameMode mid-game → letter updates immediately |

### Teacher-defined content (Phase 18)

| # | Feature | Where to test |
|---|---|---|
| 18 | **Custom Levels** — teacher types `ABC,DEF,GHI` into Settings → Custom Levels field. Each group becomes C1/C2/C3 in unit dropdown. Live preview. Max 6 letters per group, dedup, trim | Settings → 自訂關卡 |
| 18.1 | kbMode default aligned to 'full' (26-key QWERTY) across all fallbacks | Boot defaults to full keyboard |
| 18.2 | Levels section promoted to top of settings panel (teacher-adjustable is more important than keyboard cosmetics) | Settings panel ordering |

---

## Settings Panel Reference

Top-right ⚙️ icon opens settings. 16 rows (Phase 18.2 order):

| # | Row | Options | Default |
|---|---|---|---|
| 1 | 關卡 Levels | U1-ABC / U2-EFS / ... / U10 混合 / C1, C2, ... | U1 |
| 2 | 難度 Level | L0 靜止 / L1 慢落 | L0 |
| 3 | 速度 Speed | 很慢 / 慢 / 中 (L1 only) | 慢 |
| 4 | 玩法模式 Game Mode | 經典 / 聽聲 / 順序 / 拼字 | 經典 |
| 5 | 大小寫 Case | 大寫 / 小寫 | 大寫 |
| 6 | 自訂關卡 Custom Levels | textarea "ABC,DEF,GHI" (live preview) | (空) |
| 7 | 語言 Language | 繁體中文 / English | 繁體中文 |
| 8 | 主題 Theme | 🌌太空 / 🍬糖果 / 🌊海洋 / 🌲森林 | 🌌太空 |
| 9 | 機械人 Robot Color | 0 / 1 / 2 (per-theme palettes) | 0 |
| 10 | 吉祥物 Mascot | 自動 / 太空 / 糖果 / 海洋 / 森林 | 自動 |
| 11 | 高對比 High Contrast | On/Off | Off |
| 12 | 減動畫 Reduce Motion | On/Off | Off |
| 13 | 語音朗讀 Voice | On/Off | On |
| 14 | 音效 Sound FX | On/Off | On |
| 15 | 背景音樂 BGM | 關 / 🌌太空 / 🎵木琴 / 🌧️雨聲 | 關 |
| 16 | 鍵盤模式 Keyboard | 完整 26 鍵 / 精簡（目標字母） | 完整 |

---

## Engagement Metrics to Collect

For each student session, please record (a simple spreadsheet works):

1. **Time on task** (minutes before first disengagement)
2. **Preferred theme** (which did they choose / react to most)
3. **Streak achieved** (max ×N they reached)
4. **Mistakes per session** (count of shake-letter events)
5. **Audio on or off?** (did voice help or distract?)
6. **Engagement drop-off point** (when did they look away / lose focus)
7. **Most-loved feature** (mascot cat? confetti? sparkle? per-letter symbols? leaderboard?)
8. **Mode preference** (Classic / Sound / Sequence / Word — which engaged most)
9. **Speed round tolerance** (excitement or overwhelm?)
10. **Daily goal completion rate** (how many days finished the 20-star goal)

---

## Known Limitations / Trade-offs

1. **No fail state**: intentional — wrong answers shake + nudge but never penalize. If teacher wants failure feedback for assessment, current version doesn't support it.
2. **No per-student profiles**: single device = single progress record. If multiple students share an iPad, data is shared/overwritten.
3. **No analytics / telemetry**: no way to track which letters each student struggles with across sessions in a remote dashboard.
4. **No 2-player mode**: single-player only.
5. **U10 mixed review = all 26 letters at once**: no sub-pool mechanic (planned Phase 19 candidate). May be overwhelming for early students.
6. **BGM iOS quirks**: if BGM is enabled, on iOS Safari the audio context must be unlocked via a user gesture first. The start button does this, but if user navigates away and back, audio may need to be re-unlocked.
7. **No export/import**: localStorage-only. If Safari clears cache, progress is lost.
8. **Sound-only mode has no phonetic hint** for students who can't distinguish similar-sounding letters (B/P, M/N, D/T).

---

## Architecture Quick Reference

```
letter-shooter/
├── index.html              ← All HTML, CSS, and inline boot script (~2300 lines)
├── js/
│   ├── main.js             ← ES module entry (imports everything)
│   ├── bundle.js           ← esbuild IIFE bundle (loaded by index.html)
│   ├── game.js             ← Core game loop, robot/mascot/floor SVG, settings panel (~1850 lines)
│   ├── settings.js         ← localStorage settings (defaults + load/save)
│   ├── i18n.js             ← zh / en translation strings
│   ├── curriculum.js       ← U1-U10 letter groups + custom levels (Phase 18) + robot-unlock thresholds
│   ├── progress.js         ← Per-letter attempt tracking, mastered-count (rolling 10-window, 6/10 threshold)
│   ├── challenge.js        ← Daily + weekly goal tracking (Phase 12)
│   ├── leaderboard.js      ← Name entry + sanitize + top-N storage (Phase 14)
│   ├── sfx.js              ← Procedural SFX (Web Audio: chime, slide, fanfar, unlock) + haptic
│   ├── fx.js               ← Visual effects (confetti, fireworks, sparkle, combo, mega) + LETTER_SYMBOLS map
│   └── bgm.js              ← Procedural ambient BGM (space / xylophone / rain)
├── scripts/
│   ├── smoke-phase2.js … smoke-phase16.js  ← Playwright smoke tests per phase
├── letter-shooter-sen-plan.md  ← Original v0.2 plan (322 lines, NOT refreshed since)
└── HANDOVER.md             ← This file (last refreshed 2026-09-21)
```

### Feedback pipeline (per correct press)

1. `recordAttempt(letter, firstTry)` → updates localStorage progress
2. `playCorrect()` → SFX chime
3. `confettiBurst(letter, theme)` → 32 themed particles + 3 letter-symbol emoji
4. `letterSparkle()` → 10 small white particles
5. `floatCombo(streakText)` → rising text +1 → 叻! → 很好! → 太棒了!
6. `streakFlash()` at milestones (3/5/10) + `megaFireworks()` at ≥10
7. `updateScore()` + `updateStars()` + `updateStreak()` with pop animations
8. `mascotReact('happy')` or `'cheer'` at higher streaks
9. Bullet shot animation (Phase 15 variable shape)
10. Robot celebration tier based on streak
11. Possible bonus: `triggerSpeedRound()` or `triggerBonusCatch()` (Phase 16)

### Feedback pipeline (per wrong press)

1. `recordAttempt(letter, false)` → updates localStorage
2. `playWrong()` → SFX slide
3. `nudgeTts()` → gentle supportive phrase ("再試一次" / "唔緊要" / etc.)
4. `shakeLetter()` → CSS class adds shake for 400ms
5. `mascotReact('sad')` → brief sad cat reaction

---

## Git / Commit History (newest first)

```
a391236 Phase 18.2: Promote 關卡 Levels section to top of settings panel
3967790 Phase 18.1: Align kbMode default to 'full' across all fallbacks
8e4b051 Phase 18: Teacher-defined Custom Levels (ABC, DEF, ...)
f3e58f6 Phase 17 polish: Tier 1 mode fixes (TTS feedback + mid-game re-render)
02c4913 Phase 17 W4: Lowercase case mode (case correspondence)
b9aaf2a Phase 17 W3: Sequence Mode (3 letters in order)
7fb56da Phase 17 W2: Sound-only Game Mode (listen & press)
68f3a17 Phase 17 W1: Word Mode (spell emoji)
1142ddf Phase 16.5: fix curriculum review letter bug (silent data loss)
cea0b7d Phase 16 hot patch: H1 timer 500ms + H2 ghost cap + H3 fall-pause + H4 TTS no-cancel
803ec01 Phase 16 patch: 5 bugs fixed (state reset + bonus absorb + praise skip + toast collision + ghost animationend)
1ed413a Phase 16: speed round + ghost + bonus catch + avatar customize
1daba38 Phase 15: variable bullet + impact animation variety
7035327 Phase 14: U10 mixed review + leaderboard + name entry
bf0d006 Phase 13: Forest theme + iPad haptic + Solfège TTS + letter trace
aefa986 Phase 12: HANDOVER.md + daily challenge goal + touch key UX polish
13792a6 Phase 11: complete per-letter symbol map (all 26 letters)
350efb0 Phase 10: bigger robot + mascot cat + themed floor + per-letter confetti
66ab3c9 Phase 9: next milestone hint + floating combo text + letter sparkle
d882e24 Phase 8: achievement toasts + score rainbow + space sparkle rain
4c6caea Phase 7: letter pulse + themed floaters + robot reach-up
dee7614 Phase 6: mega fireworks + themed confetti + stars + robot celebrate tiers
af32078 Phase 5: Ocean theme — 3rd option, bubbles, aqua/cyan palette
d9b9ae7 Phase 4: procedural BGM (3 ambient tracks, default OFF)
0894d7d Phase 3: confetti + streak flash + letter trail + bigger robot + Candy theme
6e118f9 Phase 2: SFX + praise/nudge TTS + streak counter + robot celebrate
a25cc30 Phase 1: pause dims keys via CSS class, fix touch-key selector
8ccbe18 feat: full QWERTY virtual keyboard with highlight hints
a1248cb ci: add GitHub Actions deploy workflow
2fdc2da ui: visual refresh — dark space theme, Fredoka font, glow effects, floating robot
5e23431 feat: v1.5 — unit selector, level toggle, teacher 26-letter progress grid
361e719 fix: 4 review findings — saveSettings persist, fallDuration/setLang export, toast queue, L1 arrive visual
1c0dc31 feat: MVP — L0/L1 game loop, touch keys, robot, settings panel
c38f124 docs: add v0.2 plan + open question decisions (2026-09-16)
```

---

## Contact for Issues

If you find bugs or want features, note them down with:
- Phase number where you saw it (if obvious)
- Theme active (space / candy / ocean / forest)
- Settings (which toggles on/off)
- Game mode (classic / sound / sequence / word)
- Custom levels (if used): the exact string
- Steps to reproduce

Then ping the dev team.

— End of handover (refreshed 2026-09-21) —