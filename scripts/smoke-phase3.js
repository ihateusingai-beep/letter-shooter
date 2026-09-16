// scripts/smoke-phase3.js — Phase 3: confetti, streak flash, trail, robot SVG, theme switch
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

  // ── Start game ──────────────────────────────────────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(200);

  // ── 1. Robot SVG has new structure (eyes, antenna, arms groups) ────────
  const hasAntenna = await page.locator('#js-robot-wrap .robot-antenna').count();
  const hasEyes = await page.locator('#js-robot-wrap .robot-eyes').count();
  const hasArmR = await page.locator('#js-robot-wrap .robot-arm-r').count();
  console.log(`[1] robot antenna group: ${hasAntenna === 1 ? 'OK' : 'MISSING'}`);
  console.log(`[1] robot eyes group: ${hasEyes === 1 ? 'OK' : 'MISSING'}`);
  console.log(`[1] robot arm-r group: ${hasArmR === 1 ? 'OK' : 'MISSING'}`);

  // ── 2. Confetti layer exists, DOM empty before any correct ──────────────
  const confettiLayerExists = await page.locator('#js-confetti-layer').count();
  const initialConfettiCount = await page.locator('.confetti-piece').count();
  console.log(`[2] confetti layer: ${confettiLayerExists === 1 ? 'OK' : 'MISSING'}`);
  console.log(`[2] initial confetti count 0: ${initialConfettiCount === 0 ? 'OK' : 'WRONG (' + initialConfettiCount + ')'}`);

  // ── 3. Press correct → confetti appears ─────────────────────────────────
  const target = await page.locator('#js-letter').textContent();
  await page.keyboard.press(target.toLowerCase());
  await page.waitForTimeout(120); // mid-animation
  const confettiCount = await page.locator('.confetti-piece').count();
  console.log(`[3] confetti after correct: ${confettiCount > 20 ? 'OK (' + confettiCount + ')' : 'WRONG (' + confettiCount + ')'}`);

  // ── 4. Robot celebrate class applied ───────────────────────────────────
  const celebrateClass = await page.locator('#js-robot-wrap').getAttribute('class');
  console.log(`[4] robot celebrate: ${celebrateClass?.includes('celebrate') ? 'OK' : 'MISSING (' + celebrateClass + ')'}`);

  await page.waitForTimeout(700); // wait for next turn + animation cleanup

  // ── 5. Build streak to 3 → streak flash gets class ──────────────────────
  // Note: flash auto-removes after 600ms in fx.js, so check during flash window
  await page.waitForTimeout(700); // wait current turn to start fresh
  let flashClass = '';
  for (let i = 0; i < 3; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(150); // mid-flash window (within 600ms)
    if (i === 2) {
      flashClass = await page.locator('#js-streak-flash').getAttribute('class');
    } else {
      await page.waitForTimeout(600); // wait next turn
    }
  }
  console.log(`[5] streak flash @ ×3: ${flashClass?.includes('flash-go') ? 'OK' : 'MISSING (' + flashClass + ')'}`);

  // ── 6. Settings has theme picker ───────────────────────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  const hasThemeSelect = await page.locator('#js-theme-select').count();
  console.log(`[6] theme select present: ${hasThemeSelect === 1 ? 'OK' : 'MISSING'}`);
  const themeDefault = await page.locator('#js-theme-select').inputValue();
  console.log(`[6] theme default space: ${themeDefault === 'space' ? 'OK' : 'WRONG (' + themeDefault + ')'}`);

  // ── 7. Switch to candy → body data-theme=candy ─────────────────────────
  await page.selectOption('#js-theme-select', 'candy');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);
  const themeAttr = await page.locator('body').getAttribute('data-theme');
  console.log(`[7] body data-theme=candy: ${themeAttr === 'candy' ? 'OK' : 'WRONG (' + themeAttr + ')'}`);

  // ── 8. Robot re-rendered with candy palette (white body, pink eye) ─────
  const robotBody = await page.locator('#js-robot-wrap rect').first().getAttribute('fill');
  console.log(`[8] candy robot body fill: ${robotBody === '#FFFFFF' ? 'OK' : 'WRONG (' + robotBody + ')'}`);

  // ── 9. No JS errors ────────────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[9] no JS errors: OK');
  } else {
    console.log('[9] JS errors:');
    errors.forEach(e => console.log('   - ' + e));
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();