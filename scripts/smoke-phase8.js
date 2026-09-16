// scripts/smoke-phase8.js — Phase 8: achievement toast + score rainbow + sparkle rain
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

  // ── 1. Achievement toast DOM exists ──────────────────────────────────────
  const achToastExists = await page.locator('#js-ach-toast').count();
  console.log(`[1] ach-toast DOM: ${achToastExists === 1 ? 'OK' : 'MISSING'}`);

  // ── 2. Sparkle rain populated (space default) ────────────────────────────
  const sparkleCount = await page.locator('#js-sparkle-rain .sparkle-fall').count();
  console.log(`[2] sparkle rain count > 0: ${sparkleCount > 0 ? 'OK (' + sparkleCount + ')' : 'MISSING'}`);

  // ── Start game ───────────────────────────────────────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(200);

  // ── 3. Switch to candy → sparkle rain hidden ─────────────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-theme-select', 'candy');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  const sparkleDisplay = await page.locator('#js-sparkle-rain').evaluate(el =>
    getComputedStyle(el).display
  );
  console.log(`[3] sparkle rain hidden on candy: ${sparkleDisplay === 'none' ? 'OK' : 'WRONG (' + sparkleDisplay + ')'}`);

  // ── 4. Switch back to space ──────────────────────────────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-theme-select', 'space');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);

  // ── 5. Build streak to 5 → score gets rainbow class ─────────────────────────
  for (let i = 0; i < 5; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(700);
  }
  const rainbowClass = await page.locator('#js-score').getAttribute('class');
  console.log(`[5] score has rainbow @ streak 5: ${rainbowClass?.includes('rainbow') ? 'OK' : 'MISSING (' + rainbowClass + ')'}`);

  // ── 6. Wrong key → rainbow removed ────────────────────────────────────────
  const t = await page.locator('#js-letter').textContent();
  const wrongKey = t === 'A' ? 'B' : 'A';
  await page.keyboard.press(wrongKey);
  await page.waitForTimeout(300);
  const rainbowAfterWrong = await page.locator('#js-score').getAttribute('class');
  console.log(`[6] rainbow off after wrong: ${!rainbowAfterWrong?.includes('rainbow') ? 'OK' : 'MISSING (' + rainbowAfterWrong + ')'}`);

  // ── 7. Errors check ──────────────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[7] no JS errors: OK');
  } else {
    console.log('[7] JS errors:');
    errors.forEach(e => console.log('   - ' + e));
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();