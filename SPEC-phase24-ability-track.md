# Phase 24 — Ability Track UI

**Audience**: SEN teacher (configure per-class / per-student)
**Type**: Settings UI surface for `settings.abilityTrack` (architecture shipped Phase 23)
**Companion**: `ARCHITECTURE.md §10a I2`, `SPEC-phase23-letter-personality.md`, `letter-shooter-sen-plan.md §1`
**Status**: Spec draft — not yet implemented
**Replaces**: None (additive — `abilityTrack` setting already in `js/settings.js` defaults since Phase 23)

---

## 1. Concept

Phase 23 shipped the **back-end** of differentiated instruction: `MOTION_GATE`, `DURATION_SCALE`, `settings.abilityTrack` defaulting to `'beginner'` (SEN-safe locked). But there's no **UI** for teachers to switch tracks yet — the value lives silently in localStorage.

**Phase 24** surfaces this:

- Settings → 玩法 Gameplay section, top row: **能力軌** radio button
- 3 options: 初階 Beginner (default, locked SEN-safe) / 標準 Standard (mild game-y) / 進階 Advanced (full game-y)
- Each option shows a one-line plain-language hint of what changes
- Changing the value immediately affects the game (per Phase 23's `letterArrival` track arg)
- The choice persists across sessions via `saveSettings`

Phase 24 ships **the UI selector**. The track-specific advanced behaviors (countdown, fail screen, score multiplier) ship in subsequent phases (25, 26, etc.) — Phase 24 is the unlock mechanism, not the advanced behaviors themselves.

---

## 2. UI Design

### Settings panel placement

```
        ## 能力軌 Ability Track  ← NEW Phase 24
        [ ● 初階 Beginner (SEN-safe default) ]
        [ ○ 標準 Standard (mild game-y) ]
        [ ○ 進階 Advanced (full game-y) ]
        hint: 初階：字母只用 drop-bounce；標準：fly-across + rise-glow 加埋；進階：全部 5 種 motion 加 multiplier

        ## 單元 Unit
        ...
```

Place **Ability Track as the FIRST row of Gameplay section** (above Levels/Custom Levels). Rationale: it's the most teacher-impactful setting (it gates multiple game behaviors). Falls under `letter-shooter-sen-plan.md §1` principle — different students need different tracks.

### Component

HTML5 `<input type="radio">` group, with 3 options. Existing settings panel uses raw `<select>` and `<button>` toggles — radios are a new pattern but consistent with HTML5 form standards.

```html
<fieldset class="settings-row" id="js-ability-track-row">
  <legend>能力軌 Ability Track</legend>
  <div class="radio-group">
    <label><input type="radio" name="abilityTrack" value="beginner" checked /> 初階 Beginner (SEN-safe default)</label>
    <label><input type="radio" name="abilityTrack" value="standard" /> 標準 Standard (mild game-y)</label>
    <label><input type="radio" name="abilityTrack" value="advanced" /> 進階 Advanced (full game-y)</label>
  </div>
  <p class="settings-hint" id="js-ability-track-hint">
    初階：字母只用 drop-bounce；標準：fly-across + rise-glow 加埋；進階：全部 5 種 motion
  </p>
</fieldset>
```

### Hint text per track (zh)

| Track | Hint text |
|---|---|
| Beginner | 「初階」：字母只用 drop-bounce，最安全 |
| Standard  | 「標準」：fly-across + rise-glow 加埋，多啲視覺變化 |
| Advanced | 「進階」：全部 5 種 motion，包含 multiplier 同挑戰 |

### Hint text per track (en)

| Track | Hint text |
|---|---|
| Beginner | Beginner: letters use drop-bounce only (safest) |
| Standard | Standard: adds fly-across + rise-glow for more visual variety |
| Advanced | Advanced: all 5 motion types unlocked, plus multiplier and challenges |

---

## 3. State Machine

```
[Settings Panel Open]
  ↓ user taps radio
[Mutate settings.abilityTrack]
  ↓ saveSettings({ abilityTrack: 'standard' })
[localStorage persists]
  ↓ next letter appearance in any mode
[letterArrival() reads new track from settings]
  ↓ motion class applies per MOTION_GATE[track]
[Effective immediately — no game restart needed]
```

No state machine inside the game itself — track is read fresh per `showLetter` call. Idempotent — switching tracks mid-game is safe.

---

## 4. Backend Wiring

### Files to touch

| File | Change | Approx LoC |
|---|---|---|
| `js/settings.js` | None (DEFAULTS already has `abilityTrack: 'beginner'`) | 0 |
| `js/i18n.js` | Add `abilityTrackLabel`, `abilityTrackHint`, `abilityTrackBeginner/Standard/Advanced`, `abilityTrackDescription` keys | +10 |
| `index.html` | Add `<fieldset id="js-ability-track-row">` to Settings panel Gameplay section | +15 |
| `index.html` | Add `.radio-group`, `.settings-hint` CSS classes | +20 |
| `js/game.js` | Wire radio change handler — `applyAbilityTrack(value)` updates settings, triggers re-show if in game | +25 |
| `js/bundle.js` | IIFE mirror of `applyAbilityTrack()` + i18n additions | +35 |

**Total new LoC**: ~105 (just over memory rule 5 threshold; 10-min mini-audit before commit)

### `applyAbilityTrack(value)` function (new in `game.js`)

```js
function applyAbilityTrack(value) {
  const valid = ['beginner', 'standard', 'advanced'];
  if (!valid.includes(value)) return;
  saveSettings({ abilityTrack: value });
  // Update radio UI (in case of programmatic change)
  const radios = document.querySelectorAll('input[name="abilityTrack"]');
  radios.forEach(r => { r.checked = (r.value === value); });
  // Update hint text
  updateAbilityTrackHint(value);
  // If a letter is currently shown, re-trigger its arrival with new track
  // (so the change is felt immediately without waiting for next letter)
  const letterEl = document.getElementById('js-letter');
  if (letterEl && currentLetter) {
    letterArrival(letterEl, currentLetter, { track: value });
  }
}

function updateAbilityTrackHint(track) {
  const hintEl = document.getElementById('js-ability-track-hint');
  if (!hintEl) return;
  const lang = getLang();
  const key = `abilityTrack${track.charAt(0).toUpperCase() + track.slice(1)}Hint`;
  hintEl.textContent = i18n[lang]?.[key] || i18n.en?.[key] || '';
}
```

### Radio event handler

```js
// In initSettingsPanel() or equivalent setup function:
const radios = document.querySelectorAll('input[name="abilityTrack"]');
radios.forEach(r => {
  r.addEventListener('change', () => {
    if (r.checked) applyAbilityTrack(r.value);
  });
});
// Initial sync from current value
const current = loadSettings().abilityTrack || 'beginner';
const initial = document.querySelector(`input[name="abilityTrack"][value="${current}"]`);
if (initial) initial.checked = true;
updateAbilityTrackHint(current);
```

---

## 5. i18n Keys (added to `js/i18n.js`)

```js
// In i18n.en:
abilityTrackLabel: 'Ability Track',
abilityTrackBeginner: 'Beginner (SEN-safe default)',
abilityTrackStandard: 'Standard (mild game-y)',
abilityTrackAdvanced: 'Advanced (full game-y)',
abilityTrackBeginnerHint: 'Letters use drop-bounce only (safest)',
abilityTrackStandardHint: 'Adds fly-across + rise-glow for visual variety',
abilityTrackAdvancedHint: 'All 5 motion types unlocked, plus multiplier and challenges',

// In i18n.zh:
abilityTrackLabel: '能力軌',
abilityTrackBeginner: '初階 (SEN 安全預設)',
abilityTrackStandard: '標準 (輕度遊戲化)',
abilityTrackAdvanced: '進階 (完整遊戲化)',
abilityTrackBeginnerHint: '字母只用 drop-bounce，最安全',
abilityTrackStandardHint: '加埋 fly-across + rise-glow，多啲視覺變化',
abilityTrackAdvancedHint: '全部 5 種 motion，加 multiplier 同挑戰',
```

---

## 6. CSS (added to `<style>` block in `index.html`)

```css
/* Phase 24 — Ability Track radio group */
.settings-row fieldset { border: none; padding: 0; margin: 0; }
.settings-row legend {
  font-weight: 700;
  margin-bottom: 8px;
  font-size: 0.95em;
}
.radio-group {
  display: flex;
  flex-direction: column;
  gap: 6px;
  margin-bottom: 8px;
}
.radio-group label {
  display: flex;
  align-items: center;
  gap: 8px;
  cursor: pointer;
  padding: 6px 10px;
  border-radius: 8px;
  background: rgba(255,255,255,0.06);
  transition: background 0.15s;
}
.radio-group label:hover {
  background: rgba(255,255,255,0.12);
}
.radio-group input[type="radio"] {
  width: 18px;
  height: 18px;
  cursor: pointer;
}
.settings-hint {
  font-size: 0.85em;
  color: var(--hint-color, rgba(255,255,255,0.6));
  margin: 6px 0 0;
  line-height: 1.4;
}

/* Reduce-motion: disable label hover transition */
.no-motion .radio-group label { transition: none; }
```

---

## 7. Acceptance Criteria

- [ ] Settings panel Gameplay section shows new "Ability Track" radio group as FIRST row
- [ ] 3 options visible: 初階 Beginner / 標準 Standard / 進階 Advanced
- [ ] Default = Beginner (matches Phase 23 default)
- [ ] Selecting a different radio updates `settings.abilityTrack` via `saveSettings`
- [ ] Hint text below radios updates to reflect current track
- [ ] Switching to Standard mid-game: next letter appearance uses fly-across / rise-glow (was drop-bounce)
- [ ] Switching to Advanced mid-game: all 5 motion types apply to letters that match the map
- [ ] Switching back to Beginner: drops back to drop-bounce only
- [ ] localStorage `ls-settings.abilityTrack` persists across reload
- [ ] i18n: zh and en both have full label set
- [ ] `.no-motion` toggle disables radio hover transition (consistent with other settings)
- [ ] Bundle mirror complete (per ARCHITECTURE.md §8)

---

## 8. Smoke Test Plan

New file `scripts/smoke-phase24.js`:

1. Open settings panel
2. Verify ability track radio group exists with 3 options
3. Verify default = beginner (already-checked radio)
4. Tap "standard" → verify settings.abilityTrack === 'standard'
5. Tap "advanced" → verify settings.abilityTrack === 'advanced'
6. Reload page → verify setting persists
7. Trigger letter show in standard mode → verify class includes 'arrival-fly-across' or 'arrival-rise-glow' (not 'arrival-drop-bounce' for A)
8. Same in beginner mode → verify class is always 'arrival-drop-bounce'
9. Verify hint text updates on each radio change

---

## 9. Files Touched

| File | Change | Approx LoC |
|---|---|---|
| `js/settings.js` | None | 0 |
| `js/i18n.js` | 8 new keys × 2 langs = 16 entries | +16 |
| `index.html` | `<fieldset>` + radio inputs + hint `<p>` + CSS block | +35 |
| `js/game.js` | `applyAbilityTrack()` + `updateAbilityTrackHint()` + radio event handler | +25 |
| `js/bundle.js` | IIFE mirror | +41 |
| `scripts/smoke-phase24.js` | New Playwright smoke | +120 |

**Total new LoC**: ~237 (just over 100 LoC threshold; 10-min mini-audit before commit per memory rule 5)

---

## 10. Out of Scope (deferred to Phase 25+)

These are advanced-track-specific behaviors. Phase 24 ships the UI to UNLOCK the track; subsequent phases add the actual behaviors:

- **Phase 25 (planned)**: Countdown timer visible only on Advanced + Standard tracks (Race 30s + Speed Round already have timers; this would add countdown to Classic / Word / Sequence)
- **Phase 26 (planned)**: Soft fail screen — "再試一次" overlay after N misses in Advanced track
- **Phase 27 (planned)**: Score multiplier — streak ≥ 5 → 2X, streak ≥ 10 → 4X, only enabled on Advanced track
- **Phase 28 (planned)**: Bonus round every N letters in Advanced track

These ship only when Phase 24 is in field use and teacher feedback indicates demand.

---

## 11. Open Questions

1. Should `beginner` be **locked one-way** (can't switch back to beginner once advanced)? Current design allows switching both ways. User input needed if teachers request harder lock.
2. Should the radio group show a warning when switching away from beginner? ("This enables game-y elements — confirm?") Current design switches silently. UX decision pending.
3. Does ability track affect BGM / confetti intensity settings? Currently no. Probably should not — those are independent overstimulation knobs.

---

## 12. Decision Log

- **2026-09-28**: Spec created. UI design = 3-radio group + hint text. Wire path = `applyAbilityTrack(value)` → `saveSettings` → next `letterArrival` call reads new value.

---

*Spec status: ready for implementation. ~237 LoC across 6 files (incl. smoke). No architecture changes.*