// scripts/smoke-phase5.js — Phase 5: Ocean theme + bubbles
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

  // ── 0. Boot: bubbles populated? ─────────────────────────────────────────
  const bubbleCount = await page.locator('#js-bubble-layer .bubble').count();
  console.log(`[0] bubble DOM count > 0: ${bubbleCount > 0 ? 'OK (' + bubbleCount + ')' : 'MISSING'}`);

  // Bubble layer hidden by default (theme=space)
  const bubbleLayerDisplay = await page.locator('#js-bubble-layer').evaluate(el =>
    getComputedStyle(el).display
  );
  console.log(`[0] bubble layer hidden by default: ${bubbleLayerDisplay === 'none' ? 'OK' : 'WRONG (' + bubbleLayerDisplay + ')'}`);

  // ── 1. Start + open settings ────────────────────────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(200);

  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');

  // ── 2. Theme select has ocean option ────────────────────────────────────
  const themeOptions = await page.locator('#js-theme-select option').evaluateAll(opts =>
    opts.map(o => o.value)
  );
  console.log(`[2] theme options include ocean: ${themeOptions.includes('ocean') ? 'OK' : 'MISSING'}`);
  console.log(`[2] 3 themes total: ${themeOptions.length === 3 ? 'OK' : 'WRONG (' + themeOptions.length + ')'}`);

  // ── 3. Switch to ocean → bubbles visible, data-theme set ────────────────
  await page.selectOption('#js-theme-select', 'ocean');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);

  const themeAttr = await page.locator('body').getAttribute('data-theme');
  console.log(`[3] body data-theme=ocean: ${themeAttr === 'ocean' ? 'OK' : 'WRONG (' + themeAttr + ')'}`);

  const bubbleDisplay = await page.locator('#js-bubble-layer').evaluate(el =>
    getComputedStyle(el).display
  );
  console.log(`[3] bubble layer visible: ${bubbleDisplay === 'block' ? 'OK' : 'WRONG (' + bubbleDisplay + ')'}`);

  // ── 4. Robot palette uses ocean colors ──────────────────────────────────
  const robotEyeColor = await page.locator('#js-robot-wrap circle').first().evaluate(el =>
    el.getAttribute('fill')
  );
  console.log(`[4] robot eye cyan-ish: ${robotEyeColor === '#00BCD4' ? 'OK' : 'WRONG (' + robotEyeColor + ')'}`);

  // ── 5. Switch back to space → bubbles hidden ────────────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-theme-select', 'space');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);

  const bubbleDisplay2 = await page.locator('#js-bubble-layer').evaluate(el =>
    getComputedStyle(el).display
  );
  console.log(`[5] bubble hidden after space: ${bubbleDisplay2 === 'none' ? 'OK' : 'WRONG (' + bubbleDisplay2 + ')'}`);

  // ── 6. Final errors check ───────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[6] no JS errors: OK');
  } else {
    console.log('[6] JS errors:');
    errors.forEach(e => console.log('   - ' + e));
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();