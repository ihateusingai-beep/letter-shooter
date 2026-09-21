// scripts/smoke-phase16.js — Phase 16: Speed round + ghost + bonus catch + avatar customize
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

  // Reset localStorage so previous progress doesn't pollute the test
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('ls-')) localStorage.removeItem(k);
    });
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');

  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ── 1. Wrong-letter ghost spawns on wrong key ────────────────────────────
  const t1 = await page.locator('#js-letter').textContent();
  const wrongKey = t1 === 'A' ? 'B' : 'A';
  await page.keyboard.press(wrongKey.toLowerCase());
  await page.waitForTimeout(150);
  const ghostCount = await page.locator('.wrong-ghost').count();
  console.log(`[1] wrong-ghost appears: ${ghostCount > 0 ? 'OK (' + ghostCount + ')' : 'MISSING'}`);

  await page.waitForTimeout(1500); // let ghost fade + next turn

  // ── 2. Speed round banner appears after 10 correct ────────────────────────
  for (let i = 0; i < 10; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700); // wait for next turn
  }
  // Give banner a moment to render
  await page.waitForTimeout(200);
  const bannerVisible = await page.locator('#js-speed-banner.visible').count();
  const bannerTimer = await page.locator('#js-speed-timer').textContent().catch(() => '');
  console.log(`[2] speed banner visible after 10 correct: ${bannerVisible > 0 ? 'OK' : 'MISSING'}`);
  console.log(`[2] speed timer present (${bannerTimer}): ${bannerTimer && parseFloat(bannerTimer) >= 0 ? 'OK' : 'WRONG'}`);

  // ── 2b. Keep pressing during speed round so we rack up bonus hits ≥ 2 ────
  // Speed round lasts 5s — fire ~5 correct answers in that window (~3.5s).
  for (let i = 0; i < 5; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700);
  }

  // ── 3. Speed banner auto-dismisses within ~5.5s ──────────────────────────
  // Banner dismissed at T+5s; check shortly after to also catch bonus catch.
  await page.waitForTimeout(2400); // T+5.5s — banner just dismissed
  const bannerAfter = await page.locator('#js-speed-banner.visible').count();
  console.log(`[3] speed banner dismissed after timeout: ${bannerAfter === 0 ? 'OK' : 'WRONG (still visible)'}`);

  // ── 4. Bonus catch star spawns 600ms after speed round end ──────────────
  // T+5s speed round ends → +600ms setTimeout → bonus catch (3s window).
  // We're now at T+5.5s; bonus catch should have spawned ~ -400ms ago.
  await page.waitForTimeout(700); // T+6.2s — bonus catch should be visible mid-fall
  const bonusVisible = await page.locator('#js-bonus-star.visible').count();
  console.log(`[4] bonus catch star visible: ${bonusVisible > 0 ? 'OK' : 'MISSING'}`);

  // ── 5. Bonus catch: pointerdown anywhere → caught class ───────────────────
  if (bonusVisible > 0) {
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(200);
    const bonusCaught = await page.locator('#js-bonus-star.caught').count();
    console.log(`[5] bonus star caught via pointerdown: ${bonusCaught > 0 ? 'OK' : 'WRONG'}`);
  } else {
    console.log('[5] bonus star caught: SKIPPED (no spawn)');
  }

  // Wait for star to fully clean up + next turn
  await page.waitForTimeout(800);

  // ── 6. Robot color override honored via settings ──────────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-robot-color-select', '1'); // Pink
  await page.selectOption('#js-mascot-theme-select', 'candy'); // Candy palette
  await page.click('#js-settings-apply');
  await page.waitForTimeout(400);

  // Robot pink palette uses #FF6B9D accent — check robot SVG body fill
  const robotFill = await page.locator('#js-robot-wrap svg rect').first().getAttribute('fill');
  console.log(`[6] robot color override (pink #FF6B9D): ${robotFill === '#3d1f2f' ? 'OK' : 'CHECK (' + robotFill + ')'}`);

  // ── 7. Mascot theme override: cat body fill uses candy palette #FFD9E8 ───
  const mascotFill = await page.locator('#js-mascot-wrap svg circle').first().getAttribute('fill');
  console.log(`[7] mascot theme override (candy body #FFD9E8): ${mascotFill === '#FFD9E8' ? 'OK' : 'CHECK (' + mascotFill + ')'}`);

  // ── 8. settings.mascotTheme 'auto' falls back to theme ────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-mascot-theme-select', 'auto');
  await page.selectOption('#js-theme-select', 'forest');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(400);
  const forestFill = await page.locator('#js-mascot-wrap svg circle').first().getAttribute('fill');
  console.log(`[8] mascot auto follows theme (forest #C8E6C9): ${forestFill === '#C8E6C9' ? 'OK' : 'CHECK (' + forestFill + ')'}`);

  // ── 9. Errors check ──────────────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[9] no JS errors: OK');
  } else {
    console.log('[9] JS errors:');
    errors.forEach(e => console.log('   - ' + e));
  }

  // ── 10. Phase 16 PATCH: bonus catch absorbs key press (Bug 2) ───────────
  // Drive 10 correct to enter speed round, keep firing during it,
  // then try pressing keys during bonus catch window — stars should
  // NOT increment (input absorbed by bonusCatchActive guard).
  await page.waitForTimeout(1500);
  // Reset state
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(400);

  // 10 correct → speed round
  for (let i = 0; i < 10; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700);
  }
  // Keep firing during 5s speed round
  for (let i = 0; i < 5; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700);
  }
  // Wait for bonus catch to appear (~T+5.6s after 10th correct)
  await page.waitForTimeout(2400); // T+5.5s — banner just dismissed
  await page.waitForTimeout(700);  // T+6.2s — bonus catch should be visible

  const bonusActive = await page.locator('#js-bonus-star.visible').count();
  if (bonusActive > 0) {
    // Snapshot stars BEFORE pressing a letter during bonus catch
    const starsBefore = await page.locator('#js-stars-num').textContent();
    const numBefore = parseInt(starsBefore || '0', 10) || 0;
    // Press a key during bonus catch — should be absorbed (no streak/score change)
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(150);
    const starsAfter = await page.locator('#js-stars-num').textContent();
    const numAfter = parseInt(starsAfter || '0', 10) || 0;
    // If absorbed: stars should be unchanged.
    // (If it leaked: would be +1 from handleKey correct)
    console.log(`[10] bonus catch absorbs key press: ${numAfter === numBefore ? 'OK (' + numAfter + ')' : 'WRONG (was ' + numBefore + ' now ' + numAfter + ')'}`);
    // Catch the bonus to clean up
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(800);
  } else {
    console.log('[10] bonus catch absorbs key press: SKIPPED (no spawn)');
  }

  // ── 11. Phase 16 PATCH: state resets on new game (Bug 1) ─────────────────
  // After bonus catch completes, start a new game and verify
  // speed round state is reset (correctSinceSpeed should be 0).
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(400);

  // Do 5 correct — speed round should NOT trigger (was reset on startGame)
  for (let i = 0; i < 5; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700);
  }
  const bannerVisibleEarly = await page.locator('#js-speed-banner.visible').count();
  console.log(`[11] no spurious speed round after 5 correct (state reset): ${bannerVisibleEarly === 0 ? 'OK' : 'WRONG (speed round fired at <10 correct)'}`);

  // ── 12. Phase 16 PATCH: errors check (final) ─────────────────────────────
  if (errors.length === 0) {
    console.log('[12] no JS errors after patch: OK');
  } else {
    console.log('[12] JS errors after patch:');
    errors.forEach(e => console.log('   - ' + e));
  }

  // ── 13. H1 patch: speed banner timer tick (500ms intervals) ─────────────
  // Verify timer updates on 0.5s boundaries (5.0, 4.5, 4.0, …) rather than
  // every 100ms — verifies H1 flicker reduction.
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(400);

  // 10 correct → speed round
  for (let i = 0; i < 10; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700);
  }
  // Wait for speed round banner
  await page.waitForTimeout(300);
  // Sample timer at 0ms and 250ms — should be IDENTICAL (no 100ms flicker)
  const tSnap1 = await page.locator('#js-speed-timer').textContent();
  await page.waitForTimeout(250);
  const tSnap2 = await page.locator('#js-speed-timer').textContent();
  console.log(`[13] H1 timer stable across 250ms (${tSnap1} → ${tSnap2}): ${tSnap1 === tSnap2 ? 'OK' : 'STILL FLICKERING'}`);

  // ── 14. H2 patch: ghost cap at MAX_GHOSTS=3 ─────────────────────────────
  // Wait for speed round + bonus catch to clear, then fire 5 wrong presses
  // and verify .wrong-ghost count never exceeds 3.
  await page.waitForTimeout(8000); // speed round ends ~5s + bonus catch 3s + buffer
  const wrongGhosts = await page.evaluate(() => {
    return new Promise(resolve => {
      const ghosts = [];
      // Fire 5 wrong presses rapid-fire
      const btn = document.querySelector('.kb-key[data-letter="X"]'); // likely wrong
      if (!btn) { resolve({ count: -1, samples: [] }); return; }
      for (let i = 0; i < 5; i++) {
        btn.click();
      }
      // Sample ghost count at 100ms intervals
      let n = 0;
      const samples = [];
      const sampler = setInterval(() => {
        const c = document.querySelectorAll('.wrong-ghost').length;
        samples.push(c);
        n++;
        if (n >= 6) { clearInterval(sampler); resolve({ maxCount: Math.max(...samples), samples }); }
      }, 100);
    });
  });
  console.log(`[14] H2 ghost cap ≤ 3 (max=${wrongGhosts.maxCount}): ${wrongGhosts.maxCount <= 3 && wrongGhosts.maxCount >= 0 ? 'OK' : 'WRONG (' + wrongGhosts.maxCount + ')'}`);

  // ── 15. H3 patch: bonus catch pauses L1 letter fall ─────────────────────
  // Switch to L1 mode, drive into speed round + bonus catch, verify the
  // letter stops falling (letter style.transform doesn't keep changing).
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
    localStorage.setItem('ls-settings', JSON.stringify({
      voice: true, soundFx: true, bgm: false, bgmTrack: 'space',
      theme: 'space', speed: 'slow', highContrast: false, reduceMotion: false,
      lang: 'zh', currentUnit: 'U1', level: 'L1', kbMode: 'full',
      robotColor: 0, mascotTheme: 'auto'
    }));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(400);

  // 10 correct to trigger speed round
  for (let i = 0; i < 10; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700);
  }
  // Keep firing during 5s speed round
  for (let i = 0; i < 5; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700);
  }
  // Wait for bonus catch to appear
  await page.waitForTimeout(2400);
  await page.waitForTimeout(700);

  const bonusActiveL1 = await page.locator('#js-bonus-star.visible').count();
  if (bonusActiveL1 > 0) {
    // Sample letter transform 2 times 200ms apart during bonus catch — should be identical (paused)
    const transform1 = await page.locator('#js-letter').evaluate(el => el.style.transform || '');
    await page.waitForTimeout(200);
    const transform2 = await page.locator('#js-letter').evaluate(el => el.style.transform || '');
    console.log(`[15] H3 L1 fall paused during bonus catch: ${transform1 === transform2 ? 'OK' : 'STILL FALLING (' + transform1 + ' → ' + transform2 + ')'}`);
    // Catch to clean up
    await page.mouse.move(400, 400);
    await page.mouse.down();
    await page.waitForTimeout(50);
    await page.mouse.up();
    await page.waitForTimeout(800);
    // After catch: letter should resume falling or be at end
    const transform3 = await page.locator('#js-letter').evaluate(el => el.style.transform || '');
    console.log(`[15] H3 letter resumes after catch (transform present): ${transform3.length > 0 ? 'OK' : 'WRONG (no transform)'}`);
  } else {
    console.log('[15] H3 L1 fall paused: SKIPPED (no bonus spawn)');
  }

  // ── 16. Final errors check ───────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[16] no JS errors after hot patch: OK');
  } else {
    console.log('[16] JS errors after hot patch:');
    errors.forEach(e => console.log('   - ' + e));
  }

  // ── 17. Curriculum fix: U2 review letter A appears in active pool ───────
  // Was a silent data loss — U2 reviewLetters=['A'] was defined but the
  // `all.length < 3` guard prevented it from joining the active pool.
  // Test via exposed activeLetters() (added in Phase 16.5 patch).
  const poolU2 = await page.evaluate(() => window.LetterShooter.activeLetters('U2'));
  const hasNewU2 = ['E', 'F', 'S'].every(l => poolU2.includes(l));
  const hasReviewU2 = poolU2.includes('A');
  console.log(`[17] U2 has 3 new letters (E,F,S): ${hasNewU2 ? 'OK' : 'MISSING'}`);
  console.log(`[17] U2 review letter A in pool: ${hasReviewU2 ? 'OK' : 'MISSING (still broken)'}`);
  console.log(`[17] U2 pool: [${poolU2.join(',')}] (length=${poolU2.length})`);

  // Spot-check U5 too — was D,G,U + review A
  const poolU5 = await page.evaluate(() => window.LetterShooter.activeLetters('U5'));
  const u5Ok = poolU5.includes('A') && poolU5.includes('D') && poolU5.includes('G') && poolU5.includes('U');
  console.log(`[17] U5 (D,G,U + review A): ${u5Ok ? 'OK [' + poolU5.join(',') + ']' : 'WRONG [' + poolU5.join(',') + ']'}`);

  // U9 has no review letter
  const poolU9 = await page.evaluate(() => window.LetterShooter.activeLetters('U9'));
  const u9Ok = poolU9.length === 2 && poolU9.includes('Y') && poolU9.includes('Z');
  console.log(`[17] U9 (Y,Z, no review): ${u9Ok ? 'OK [' + poolU9.join(',') + ']' : 'WRONG [' + poolU9.join(',') + ']'}`);

  // U10 all 26
  const poolU10 = await page.evaluate(() => window.LetterShooter.activeLetters('U10'));
  console.log(`[17] U10 all 26 mixed review: ${poolU10.length === 26 ? 'OK' : 'WRONG (length=' + poolU10.length + ')'}`);

  // ── 18. Phase 17 W2 — Sound-only mode hides letter ─────────────────────
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
    localStorage.setItem('ls-settings', JSON.stringify({
      voice: true, soundFx: true, bgm: false, bgmTrack: 'space',
      theme: 'space', speed: 'slow', highContrast: false, reduceMotion: false,
      lang: 'zh', currentUnit: 'U1', level: 'L0', kbMode: 'full',
      robotColor: 0, mascotTheme: 'auto', gameMode: 'sound'
    }));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(800);

  // body should have data-game-mode="sound"
  const bodyMode = await page.evaluate(() => document.body.getAttribute('data-game-mode'));
  console.log(`[18] body data-game-mode=sound: ${bodyMode === 'sound' ? 'OK' : 'WRONG (' + bodyMode + ')'}`);

  // Letter element textContent should be '?' not the actual letter
  const letterText = await page.locator('#js-letter').textContent();
  console.log(`[18] letter hidden (textContent='?'): ${letterText.trim() === '?' ? 'OK' : 'WRONG (' + letterText.trim() + ')'}`);

  // Verify computed color is transparent (visually hidden)
  const letterColor = await page.locator('#js-letter').evaluate(el => getComputedStyle(el).color);
  console.log(`[18] letter color transparent: ${letterColor === 'rgba(0, 0, 0, 0)' || letterColor === 'transparent' ? 'OK (' + letterColor + ')' : 'WRONG (' + letterColor + ')'}`);

  // Letter trace should be hidden (display: none) in sound mode
  const traceDisplay = await page.locator('#js-letter-trace').evaluate(el => getComputedStyle(el).display).catch(() => 'not-found');
  console.log(`[18] letter trace hidden in sound mode: ${traceDisplay === 'none' ? 'OK' : 'WRONG (' + traceDisplay + ')'}`);

  // ── 19. Phase 17 W3 — Sequence mode shows 3-letter sequence ─────────────
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
    localStorage.setItem('ls-settings', JSON.stringify({
      voice: true, soundFx: true, bgm: false, bgmTrack: 'space',
      theme: 'space', speed: 'slow', highContrast: false, reduceMotion: false,
      lang: 'zh', currentUnit: 'U1', level: 'L0', kbMode: 'full',
      robotColor: 0, mascotTheme: 'auto', gameMode: 'sequence'
    }));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(800);

  // body should have data-game-mode="sequence"
  const bodyModeSeq = await page.evaluate(() => document.body.getAttribute('data-game-mode'));
  console.log(`[19] body data-game-mode=sequence: ${bodyModeSeq === 'sequence' ? 'OK' : 'WRONG (' + bodyModeSeq + ')'}`);

  // Should have 3 .seq-slot elements with 1 .seq-active
  const slotCount = await page.locator('.seq-slot').count();
  const activeCount = await page.locator('.seq-slot.seq-active').count();
  console.log(`[19] 3 sequence slots rendered: ${slotCount === 3 ? 'OK' : 'WRONG (' + slotCount + ')'}`);
  console.log(`[19] 1 active slot: ${activeCount === 1 ? 'OK' : 'WRONG (' + activeCount + ')'}`);

  // Get the active letter — press it, should advance to next slot
  const activeLetter = await page.locator('.seq-slot.seq-active').textContent();
  const firstSeqLetter = activeLetter.trim();
  await page.keyboard.press(firstSeqLetter.toLowerCase());
  await page.waitForTimeout(300);
  const activeAfter1 = await page.locator('.seq-slot.seq-active').textContent();
  const secondSeqLetter = activeAfter1.trim();
  console.log(`[19] sequence advances after correct press: ${activeAfter1 !== activeLetter && secondSeqLetter.length > 0 ? 'OK (now ' + secondSeqLetter + ')' : 'WRONG (stuck on ' + secondSeqLetter + ')'}`);

  // ── 20. Phase 17 W1 — Word mode shows emoji + 3 slots ──────────────────
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
    localStorage.setItem('ls-settings', JSON.stringify({
      voice: true, soundFx: true, bgm: false, bgmTrack: 'space',
      theme: 'space', speed: 'slow', highContrast: false, reduceMotion: false,
      lang: 'zh', currentUnit: 'U1', level: 'L0', kbMode: 'full',
      robotColor: 0, mascotTheme: 'auto', gameMode: 'word'
    }));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(800);

  const bodyModeWord = await page.evaluate(() => document.body.getAttribute('data-game-mode'));
  console.log(`[20] body data-game-mode=word: ${bodyModeWord === 'word' ? 'OK' : 'WRONG (' + bodyModeWord + ')'}`);

  const emojiExists = await page.locator('.word-emoji-display').count();
  const slotCountWord = await page.locator('.seq-slot').count();
  console.log(`[20] word emoji display present: ${emojiExists === 1 ? 'OK' : 'WRONG (' + emojiExists + ')'}`);
  console.log(`[20] 3 seq-slots under emoji: ${slotCountWord === 3 ? 'OK' : 'WRONG (' + slotCountWord + ')'}`);

  // Press the first letter of the sequence, verify advance
  const activeLetterWord = await page.locator('.seq-slot.seq-active').textContent();
  const firstWordLetter = activeLetterWord.trim();
  await page.keyboard.press(firstWordLetter.toLowerCase());
  await page.waitForTimeout(300);
  const activeAfterWord = await page.locator('.seq-slot.seq-active').textContent();
  console.log(`[20] word mode advances on correct press: ${activeAfterWord !== activeLetterWord ? 'OK (now ' + activeAfterWord.trim() + ')' : 'WRONG (stuck)'}`);

  // ── 21. Phase 17 W4 — Lowercase case mode displays lowercase letter ────
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
    localStorage.setItem('ls-settings', JSON.stringify({
      voice: true, soundFx: true, bgm: false, bgmTrack: 'space',
      theme: 'space', speed: 'slow', highContrast: false, reduceMotion: false,
      lang: 'zh', currentUnit: 'U1', level: 'L0', kbMode: 'full',
      robotColor: 0, mascotTheme: 'auto', gameMode: 'classic',
      caseMode: 'lower'
    }));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(800);

  const letterLower = await page.locator('#js-letter').textContent();
  console.log(`[21] lowercase case mode displays lowercase ('${letterLower.trim()}'): ${letterLower === letterLower.toLowerCase() && letterLower !== letterLower.toUpperCase() ? 'OK' : 'WRONG'}`);

  // ── 22. Phase 17 polish — mid-game mode change re-renders letter ───────
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
    localStorage.setItem('ls-settings', JSON.stringify({
      voice: true, soundFx: true, bgm: false, bgmTrack: 'space',
      theme: 'space', speed: 'slow', highContrast: false, reduceMotion: false,
      lang: 'zh', currentUnit: 'U1', level: 'L0', kbMode: 'full',
      robotColor: 0, mascotTheme: 'auto', gameMode: 'classic', caseMode: 'upper'
    }));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(800);

  const beforeSwitch = await page.locator('#js-letter').textContent();
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-game-mode-select', 'sound');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(500);

  const afterSwitch = await page.locator('#js-letter').textContent();
  console.log(`[22] mid-game mode switch re-renders letter ('${beforeSwitch.trim()}' → '${afterSwitch.trim()}'): ${afterSwitch.trim() === '?' ? 'OK' : 'WRONG'}`);

  // ── 23. Phase 18 — Custom levels: teacher-defined letter groups ─────────
  // Set customLevels="ABC,DEF" → expect C1=ABC, C2=DEF
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
    localStorage.setItem('ls-settings', JSON.stringify({
      voice: true, soundFx: true, bgm: false, bgmTrack: 'space',
      theme: 'space', speed: 'slow', highContrast: false, reduceMotion: false,
      lang: 'zh', currentUnit: 'C1', level: 'L0', kbMode: 'full',
      robotColor: 0, mascotTheme: 'auto', gameMode: 'classic', caseMode: 'upper',
      customLevels: 'ABC,DEF'
    }));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');

  // activeLetters('C1') should return ['A','B','C']
  const c1Letters = await page.evaluate(() => window.LetterShooter.activeLetters('C1'));
  console.log(`[23] C1 returns [${c1Letters.join(',')}]: ${JSON.stringify(c1Letters) === '["A","B","C"]' ? 'OK' : 'WRONG'}`);

  // activeLetters('C2') should return ['D','E','F']
  const c2Letters = await page.evaluate(() => window.LetterShooter.activeLetters('C2'));
  console.log(`[23] C2 returns [${c2Letters.join(',')}]: ${JSON.stringify(c2Letters) === '["D","E","F"]' ? 'OK' : 'WRONG'}`);

  // activeLetters('C99') out of range → fallback ['A','B','C']
  const c99Letters = await page.evaluate(() => window.LetterShooter.activeLetters('C99'));
  console.log(`[23] C99 fallback to ABC: ${JSON.stringify(c99Letters) === '["A","B","C"]' ? 'OK' : 'WRONG'}`);

  // Verify the unit dropdown includes C1 and C2
  // Start the game first to dismiss start overlay, then open settings
  await page.click('#js-start-btn');
  await page.waitForTimeout(400);
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  const customOptions = await page.evaluate(() => {
    const sel = document.getElementById('js-unit-select');
    return Array.from(sel.querySelectorAll('option[data-custom]')).map(o => ({ value: o.value, text: o.textContent }));
  });
  const hasC1 = customOptions.some(o => o.value === 'C1' && o.text.includes('ABC'));
  const hasC2 = customOptions.some(o => o.value === 'C2' && o.text.includes('DEF'));
  console.log(`[23] unit dropdown has C1·ABC + C2·DEF: ${hasC1 && hasC2 ? 'OK' : 'WRONG (' + JSON.stringify(customOptions) + ')'}`);

  // Preview shows "C1=ABC, C2=DEF"
  const previewText = await page.locator('#js-custom-levels-preview').textContent();
  console.log(`[23] preview shows parsed levels: ${previewText.includes('ABC') && previewText.includes('DEF') ? 'OK' : 'WRONG (' + previewText + ')'}`);

  // ── 24. Default kbMode is 'full' (26-key QWERTY) ─────────────────────
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => { if (k.startsWith('ls-')) localStorage.removeItem(k); });
    // No settings at all — pure DEFAULTS path
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(500);
  const keyCount = await page.locator('.kb-key').count();
  console.log(`[24] default kbMode renders 26 full keys: ${keyCount === 26 ? 'OK (' + keyCount + ')' : 'WRONG (' + keyCount + ')'}`);

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();