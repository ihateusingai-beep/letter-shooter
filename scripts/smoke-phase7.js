// scripts/smoke-phase7.js — Phase 7: letter pulse, themed floaters, robot reach
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

  // ── 1. Float layer populated (space theme default) ───────────────────────
  const floatCount = await page.locator('#js-float-layer .float-emoji').count();
  console.log(`[1] space theme floaters > 0: ${floatCount > 0 ? 'OK (' + floatCount + ')' : 'MISSING'}`);

  // ── 2. Float layer hidden initially? No — should be visible since space is default
  const floatDisplay = await page.locator('#js-float-layer').evaluate(el =>
    getComputedStyle(el).display
  );
  console.log(`[2] float-layer visible on space: ${floatDisplay === 'block' ? 'OK' : 'WRONG (' + floatDisplay + ')'}`);

  // ── Start game ───────────────────────────────────────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(200);

  // ── 3. Switch to ocean → float layer hidden (ocean uses bubbles only) ────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-theme-select', 'ocean');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  const floatDisplayOcean = await page.locator('#js-float-layer').evaluate(el =>
    getComputedStyle(el).display
  );
  console.log(`[3] float-layer hidden on ocean: ${floatDisplayOcean === 'none' ? 'OK' : 'WRONG (' + floatDisplayOcean + ')'}`);

  // ── 4. Switch to candy → float layer visible with candy emojis ──────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-theme-select', 'candy');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  const candyFloatCount = await page.locator('#js-float-layer .float-emoji').count();
  console.log(`[4] candy floaters > 0: ${candyFloatCount > 0 ? 'OK (' + candyFloatCount + ')' : 'MISSING'}`);

  // ── 5. Letter pulse animation runs ──────────────────────────────────────
  const letterAnimation = await page.locator('#js-letter').evaluate(el =>
    getComputedStyle(el).animationName
  );
  console.log(`[5] letter has pulse animation: ${letterAnimation.includes('letterPulse') || letterAnimation === 'letterPulse' ? 'OK' : 'MISSING (' + letterAnimation + ')'}`);

  // ── 6. Switch to L1 mode, wait for letter to fall + arrive, check robot reach ─
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-level-select', 'L1');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);

  // Switch back to space (avoid ocean where reach might be different)
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-theme-select', 'space');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);

  // Pick 'verySlow' to give us time to check the reach class
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-speed-select', 'verySlow');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);

  // Wait for letter to fall and arrive (verySlow = 12s)
  // Just wait 13s and check if reach class appeared at any point
  let reachSeen = false;
  for (let i = 0; i < 14; i++) {
    await page.waitForTimeout(1000);
    const cls = await page.locator('#js-robot-wrap').getAttribute('class');
    if (cls && cls.includes('reach')) {
      reachSeen = true;
      break;
    }
  }
  console.log(`[6] robot reach applied on L1 arrival: ${reachSeen ? 'OK' : 'MISSING (no reach class)'}`);

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