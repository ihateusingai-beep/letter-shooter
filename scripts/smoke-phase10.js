// scripts/smoke-phase10.js — Phase 10: bigger robot, mascot, floor, per-letter confetti
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

  // ── Start game first (so robot SVG is drawn) ───────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ── 1. Bigger robot SVG (160x180) ────────────────────────────────────────
  const robotWidth = await page.locator('#js-robot-wrap svg').evaluate(el => el.getAttribute('width'));
  console.log(`[1] robot width 160: ${robotWidth === '160' ? 'OK' : 'WRONG (' + robotWidth + ')'}`);

  // ── 2. Mascot zone + SVG present ─────────────────────────────────────────
  const mascotExists = await page.locator('#js-mascot-wrap svg').count();
  console.log(`[2] mascot SVG present: ${mascotExists === 1 ? 'OK' : 'MISSING'}`);
  const mascotIdleClass = await page.locator('#js-mascot-wrap').getAttribute('class');
  console.log(`[2] mascot idle class: ${mascotIdleClass?.includes('mascot-idle') ? 'OK' : 'MISSING (' + mascotIdleClass + ')'}`);

  // ── 3. Floor decor populated (space default) ─────────────────────────────
  const floorCount = await page.locator('#js-floor-decor .floor-emoji').count();
  console.log(`[3] floor emoji count > 0: ${floorCount > 0 ? 'OK (' + floorCount + ')' : 'MISSING'}`);

  // ── 4. Press correct → mascot happy class applied ───────────────────────
  await page.waitForTimeout(700);
  const target = await page.locator('#js-letter').textContent();
  await page.keyboard.press(target.toLowerCase());
  await page.waitForTimeout(150);
  const cls1 = await page.locator('#js-mascot-wrap').getAttribute('class');
  console.log(`[4] mascot-happy on correct: ${cls1?.includes('mascot-happy') ? 'OK' : 'MISSING (' + cls1 + ')'}`);

  // ── 5. If letter is A/C/E/H/M, letter-symbol confetti appears ────────────
  if (['A','C','E','H','M'].includes(target)) {
    await page.waitForTimeout(120);
    const symCount = await page.locator('.confetti-piece.letter-symbol').count();
    console.log(`[5] letter ${target} symbol confetti: ${symCount > 0 ? 'OK (' + symCount + ')' : 'MISSING'}`);
  } else {
    // Force letter to be A for the test
    await page.locator('#js-settings-btn').click().catch(() => {});
  }

  // ── 6. Wrong key → mascot sad class ─────────────────────────────────────
  await page.waitForTimeout(1500);
  const t6 = await page.locator('#js-letter').textContent();
  const wrongKey = t6 === 'A' ? 'B' : 'A';
  await page.keyboard.press(wrongKey);
  await page.waitForTimeout(200);
  const cls2 = await page.locator('#js-mascot-wrap').getAttribute('class');
  console.log(`[6] mascot-sad on wrong: ${cls2?.includes('mascot-sad') ? 'OK' : 'MISSING (' + cls2 + ')'}`);

  // ── 7. Switch theme → floor + mascot update ──────────────────────────────
  await page.waitForTimeout(800);
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  // Find theme select
  const themeSelectExists = await page.locator('#js-theme-select').count();
  console.log(`[7] theme select present: ${themeSelectExists === 1 ? 'OK' : 'MISSING'}`);

  // Switch to candy
  await page.selectOption('#js-theme-select', 'candy');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  const candyFloorCount = await page.locator('#js-floor-decor .floor-emoji').count();
  console.log(`[7] floor populated after theme switch: ${candyFloorCount > 0 ? 'OK (' + candyFloorCount + ')' : 'MISSING'}`);

  // ── 8. Errors check ──────────────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[8] no JS errors: OK');
  } else {
    console.log('[8] JS errors:');
    errors.forEach(e => console.log('   - ' + e));
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})()