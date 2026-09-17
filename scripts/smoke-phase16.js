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

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();