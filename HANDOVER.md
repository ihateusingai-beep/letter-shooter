# Letter Shooter — Handover & Field Testing Guide

**Audience**: SEN teacher preparing iPad classroom testing
**App**: Letter Shooter v1.5 (letter-shooting game for moderate-intellectual-disability primary students)
**Live URL**: https://ihateusingai-beep.github.io/letter-shooter
**Repo**: https://github.com/ihateusingai-beep/letter-shooter

---

## What This Game Does

Students see a giant letter (A-Z) and press the matching keyboard key or touch key. The robot companion shoots the letter; correct answers earn confetti, stars, and a fire streak counter. Wrong answers shake the letter and trigger a gentle supportive voice prompt — no fail/lose language (no-life-no-death design).

**Target students**: 中度智障小學生 (moderate intellectual disability, primary school age)
**Platform**: iPad primary (touch screen), PC keyboard secondary
**Persistence**: All progress (stars, mastered letters, settings) in `localStorage` — no backend, no login.

---

## How To Test on iPad

1. Open Safari on the iPad
2. Visit `https://ihateusingai-beep.github.io/letter-shooter/`
3. Tap the blue **開始** button to dismiss the start overlay
4. Game begins: a giant letter appears, 4 touch keys below
5. **First touch keypress matters**: it unlocks Web Audio (iOS Safari autoplay restriction). Make sure teacher demos this gesture on first load.
6. Optional: open Settings (⚙️ top right) to enable voice + sound FX; BGM is OFF by default (SEN overstimulation safety — only enable if the class handles it).

### Test Plan (one week, 1-2 students per session)

| Session | What to test | What to record |
|---|---|---|
| Day 1-2 | Default space theme, L0 static mode | Time on task, frustrated? confused? |
| Day 3 | Switch to candy theme (Settings → 主題 → 🍬 糖果) | Does student prefer it? |
| Day 4 | Switch to ocean theme | Same |
| Day 5 | Try L1 falling letter mode (Settings → 難度 → L1 慢落) | Easier/harder? |
| Day 6 | Try BGM on (Settings → 背景音樂 → 🌌 太空) | Overstimulation risk? |
| Day 7 | Free play — let student choose | Engagement drop-off curve |

---

## Features Shipped (11 phases)

| # | Feature | Where to test |
|---|---|---|
| 1 | Pause / Resume button + keys dim when paused | Top right ⏸ icon |
| 2 | SFX (答對 chime, 答錯 slide, streak fanfar), Praise TTS (5 random zh phrases), Nudge TTS on wrong | Audio on/off in Settings |
| 3 | Confetti on every correct + streak flash at 3/5/10 + letter trail during L1 fall | Watch the burst on each correct |
| 4 | 3 procedural BGM tracks (space / xylophone / rain), default OFF | Settings → 背景音樂 |
| 5 | Ocean theme with rising bubbles | Settings → 主題 → 🌊 海洋 |
| 6 | Mega fireworks at streak ≥10 / robot unlock, themed confetti shapes per theme, ⭐ stars counter + progress bar, robot 3-tier celebrate (jump → big jump → 720° spin) | Streak indicators in top bar |
| 7 | Letter pulse (gentle glow), themed floating emoji in background (stars in space, candies in candy), robot reach-up on L1 letter arrival | Watch the letter and the robot zone |
| 8 | Achievement toast at 10/25/50/100 stars, score number rainbow shift on streak ≥5, falling sparkle rain in space theme | Long sessions — stars accumulate |
| 9 | "下一個 N 粒" hint next to stars, floating combo text on each correct (+1 → 叻! → 很好! → 太棒了!), letter sparkle burst when letter appears | Read the hint to predict next milestone |
| 10 | Bigger robot (160×180), 🐱 mascot cat companion with idle/happy/sad/cheer reactions, themed floor decoration (8 emoji per theme), per-letter symbol confetti (A→✈️, C→🌙, E→⭐, H→❤️, M→🌊) | Watch the mascot on every correct/wrong |
| 11 | All 26 letter symbols (airplane/ball/crescent/diamond/star/fish/grapes/heart/ice-cream/juice/key/lemon/wave/night/orange/pizza/queen/rainbow/sun/tree/umbrella/violin/whale/X/yo-yo/lightning) | Each correct letter bursts 3 large emojis |

---

## Settings Panel Reference

Top-right ⚙️ icon opens settings. 8 rows:

| Row | Options | Default |
|---|---|---|
| 語言 Language | 繁體中文 / English | 繁體中文 |
| 單元 Unit | U1-ABC / U2-EFS / U3-IOT / U4-MPH / U5-DGU / U6-LRN / U7-JKW / U8-VXQ / U9-YZ / U10 混合 | U1 |
| 難度 Level | L0 靜止 (static) / L1 慢落 (slow fall) | L0 |
| 語音朗讀 Voice | On/Off | On |
| 音效 Sound FX | On/Off | On |
| 背景音樂 BGM | 關 / 🌌太空 / 🎵木琴 / 🌧️雨聲 | 關 |
| 鍵盤模式 Keyboard | 完整 26 鍵 / 精簡（目標字母） | 精簡 |
| 主題 Theme | 🌌太空 / 🍬糖果 / 🌊海洋 | 🌌太空 |
| 速度 Speed | 很慢 / 慢 / 中 (L1 only) | 慢 |
| 高對比 High Contrast | On/Off | Off |
| 減動畫 Reduce Motion | On/Off | Off |

---

## Engagement Metrics to Collect

For each student session, please record (a simple spreadsheet works):

1. **Time on task** (minutes before first disengagement)
2. **Preferred theme** (which did they choose / react to most)
3. **Streak achieved** (max ×N they reached)
4. **Mistakes per session** (count of shake-letter events)
5. **Audio on or off?** (did voice help or distract?)
6. **Engagement drop-off point** (when did they look away / lose focus)
7. **Most-loved feature** (mascot cat? confetti? sparkle? per-letter symbols?)

---

## Known Limitations / Trade-offs

1. **No fail state**: intentional — wrong answers shake + nudge but never penalize. If teacher wants failure feedback for assessment, current version doesn't support it.
2. **No progress for student**: only teacher-facing progress panel (📊). Students don't see "how many letters I've mastered" outside the in-session counter.
3. **No analytics / telemetry**: no way to track which letters each student struggles with across sessions.
4. **No 2-player mode**: single-player only.
5. **No daily goal yet**: stars accumulate but no target. (Phase 12 will add daily challenge.)
6. **BGM iOS quirks**: if BGM is enabled, on iOS Safari the audio context must be unlocked via a user gesture first. The start button does this, but if user navigates away and back, audio may need to be re-unlocked.

---

## Git / Commit History (recent, oldest first)

```
a25cc30 Phase 1 — Pause dim keys via CSS class
6e118f9 Phase 2 — SFX + praise/nudge TTS + streak counter + robot celebrate
0894d7d Phase 3 — Confetti + streak flash + trail + bigger robot + Candy theme
d9b9ae7 Phase 4 — procedural BGM (3 ambient tracks, default OFF)
af32078 Phase 5 — Ocean theme + bubbles
dee7614 Phase 6 — Mega fireworks + themed confetti + stars + tier celebrate
4c6caea Phase 7 — Letter pulse + themed floaters + robot reach-up
d882e24 Phase 8 — Achievement toast + score rainbow + space sparkle rain
66ab3c9 Phase 9 — Next milestone + combo text + letter sparkle
350efb0 Phase 10 — Bigger robot + mascot cat + themed floor + per-letter confetti
13792a6 Phase 11 — All 26 letter symbol map
```

---

## Quick File Map

```
letter-shooter/
├── index.html              ← All HTML, CSS, and inline boot script
├── js/
│   ├── main.js             ← ES module entry (imports everything)
│   ├── bundle.js           ← esbuild IIFE bundle (loaded by index.html)
│   ├── game.js             ← Core game loop, robot/mascot/floor SVG, settings panel
│   ├── settings.js         ← localStorage settings (defaults + load/save)
│   ├── i18n.js             ← zh / en translation strings
│   ├── curriculum.js       ← U1-U10 letter groups + robot-unlock thresholds
│   ├── progress.js         ← Per-letter attempt tracking, mastered-count
│   ├── sfx.js              ← Procedural SFX (Web Audio: chime, slide, fanfar, unlock)
│   ├── fx.js               ← Visual effects (confetti, fireworks, sparkle, combo, mega)
│   ├── bgm.js              ← Procedural ambient BGM (space / xylophone / rain)
│   └── LETTER_SYMBOLS      ← (defined in fx.js) all 26 letter→emoji associations
├── scripts/
│   ├── smoke-phase2.js … smoke-phase11.js  ← Playwright smoke tests per phase
├── letter-shooter-sen-plan.md  ← Original v0.2 plan (322 lines)
└── HANDOVER.md             ← This file
```

---

## Contact for Issues

If you find bugs or want features, note them down with:
- Phase number where you saw it (if obvious)
- Theme active (space / candy / ocean)
- Settings (which toggles on/off)
- Steps to reproduce

Then ping the dev team.

— End of handover —