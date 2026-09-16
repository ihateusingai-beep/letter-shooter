// scripts/smoke-phase12.js — Phase 12: HANDOVER + daily challenge + touch UX
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

  // Clear localStorage so daily counter starts fresh
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('ls-')) localStorage.removeItem(k);
    });
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');

  // ── Start game ────────────────────────────────────────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ── 1. Daily hint DOM present ─────────────────────────────────────────────
  const dailyHintExists = await page.locator('#js-daily-hint').count();
  console.log(`[1] daily hint present: ${dailyHintExists === 1 ? 'OK' : 'MISSING'}`);
  const initialDaily = await page.locator('#js-daily-hint').textContent();
  console.log(`[1] initial daily 0/20: ${initialDaily.includes('0/20') ? 'OK (' + initialDaily + ')' : 'WRONG (' + initialDaily + ')'}`);

  // ── 2. Daily bar fill at 0% ───────────────────────────────────────────────
  const dailyBarWidth = await page.locator('#js-daily-bar-fill').evaluate(el => el.style.width);
  console.log(`[2] daily bar at 0%: ${dailyBarWidth === '0%' || dailyBarWidth === '' ? 'OK' : 'WRONG (' + dailyBarWidth + ')'}`);

  // ── 3. Press correct → daily count + bar increases ───────────────────────
  await page.waitForTimeout(700);
  const t = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t.toLowerCase());
  await page.waitForTimeout(200);
  const afterCorrect = await page.locator('#js-daily-hint').textContent();
  console.log(`[3] daily 1/20 after correct: ${afterCorrect.includes('1/20') ? 'OK' : 'WRONG (' + afterCorrect + ')'}`);
  const afterBar = await page.locator('#js-daily-bar-fill').evaluate(el => el.style.width);
  console.log(`[3] daily bar 5%: ${afterBar === '5%' ? 'OK' : 'WRONG (' + afterBar + ')'}`);

  // ── 4. Ripple on touch key click (must use real click, not keyboard) ──────
  // Find a non-highlight key element
  const nonHintKeys = await page.locator('.kb-key:not(.key-hint)').count();
  console.log(`[4] non-hint keys available: ${nonHintKeys}`);
  if (nonHintKeys > 0) {
    const firstKey = page.locator('.kb-key:not(.key-hint)').first();
    await firstKey.click();
  }
  // Immediately check
  const rippleImmediate = await page.locator('.kb-key.ripple').count();
  console.log(`[4] ripple class on touch click (immediate): ${rippleImmediate > 0 ? 'OK' : 'MISSING'}`);
  await page.waitForTimeout(150);
  const rippleClass = await page.locator('.kb-key.ripple').count();
  console.log(`[4] ripple class on touch click (after 150ms): ${rippleClass > 0 ? 'OK' : 'MISSING'}`);

  // ── 5. Highlight key has halo glow (key-hint::before) ─────────────────────
  const hintBoxShadow = await page.locator('.kb-key.key-hint').first().evaluate(el =>
    getComputedStyle(el).boxShadow
  );
  console.log(`[5] hint key has glow: ${hintBoxShadow.includes('rgba') ? 'OK' : 'MISSING (' + hintBoxShadow.substring(0, 50) + ')'}`);

  // ── 6. Wrong key press → flashWrongKey class ─────────────────────────────
  await page.waitForTimeout(1500);
  const t6 = await page.locator('#js-letter').textContent();
  const wrongKey = t6 === 'A' ? 'B' : 'A';
  await page.keyboard.press(wrongKey);
  await page.waitForTimeout(150);
  const wrongShakeCount = await page.locator('.kb-key.wrong-shake').count();
  console.log(`[6] wrong-shake on wrong key: ${wrongShakeCount > 0 ? 'OK' : 'MISSING'}`);

  // ── 7. HANDOVER.md exists ─────────────────────────────────────────────────
  // Verify on disk
  const fs = require('fs');
  const handoverExists = fs.existsSync(path.resolve(__dirname, '..', 'HANDOVER.md'));
  console.log(`[7] HANDOVER.md exists: ${handoverExists ? 'OK' : 'MISSING'}`);

  // ── 8. Build a streak to 10 → daily hint counter increases ───────────────
  await page.waitForTimeout(1500);
  for (let i = 0; i < 9; i++) {
    const ti = await page.locator('#js-letter').textContent();
    await page.keyboard.press(ti.toLowerCase());
    await page.waitForTimeout(750);
  }
  const afterTen = await page.locator('#js-daily-hint').textContent();
  console.log(`[8] daily 10/20: ${afterTen.includes('10/20') ? 'OK' : 'WRONG (' + afterTen + ')'}`);
  const afterBar2 = await page.locator('#js-daily-bar-fill').evaluate(el => el.style.width);
  console.log(`[8] daily bar 50%: ${afterBar2 === '50%' ? 'OK' : 'WRONG (' + afterBar2 + ')'}`);

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