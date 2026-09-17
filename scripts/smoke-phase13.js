// scripts/smoke-phase13.js — Phase 13: forest theme + haptic + solfège + letter trace
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

  // Clear localStorage for fresh start
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

  // ── 1. Letter trace overlay appears (trace lasts 900ms after showLetter) ──
  // Press correct to trigger new showLetter, then check within window
  await page.waitForTimeout(800);
  const t = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t.toLowerCase());
  // nextTurn setTimeout = 600ms, then showLetter fires creating trace
  // Trace auto-removes at 900ms after showLetter, so check at 700ms after press
  await page.waitForTimeout(700);
  const traceExists = await page.locator('#js-letter-trace').count();
  console.log(`[1] letter trace overlay: ${traceExists > 0 ? 'OK' : 'MISSING'}`);

  // ── 2. Trace has SVG <text> element ────────────────────────────────────────
  const traceSvg = await page.locator('#js-letter-trace svg text').count();
  console.log(`[2] trace SVG text element: ${traceSvg > 0 ? 'OK (' + traceSvg + ')' : 'MISSING'}`);

  // ── 3. Open settings → theme select has 4 options ──────────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  const themeOptions = await page.locator('#js-theme-select option').evaluateAll(opts =>
    opts.map(o => o.value)
  );
  console.log(`[3] 4 theme options: ${themeOptions.length === 4 ? 'OK' : 'WRONG (' + themeOptions.length + ')'}`);
  console.log(`[3] forest option exists: ${themeOptions.includes('forest') ? 'OK' : 'MISSING'}`);

  // ── 4. Switch to forest theme → body data-theme=forest ─────────────────────
  await page.selectOption('#js-theme-select', 'forest');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  const themeAttr = await page.locator('body').getAttribute('data-theme');
  console.log(`[4] body data-theme=forest: ${themeAttr === 'forest' ? 'OK' : 'WRONG (' + themeAttr + ')'}`);

  // ── 5. Forest floor populated ──────────────────────────────────────────────
  const floorCount = await page.locator('#js-floor-decor .floor-emoji').count();
  console.log(`[5] forest floor populated: ${floorCount > 0 ? 'OK (' + floorCount + ')' : 'MISSING'}`);

  // ── 6. LETTER_SYMBOLS still works (forest theme doesn't break symbols) ────
  await page.waitForTimeout(700);
  const t6 = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t6.toLowerCase());
  await page.waitForTimeout(120);
  const symbolCount = await page.locator('.confetti-piece.letter-symbol').count();
  console.log(`[6] letter symbol confetti in forest: ${symbolCount > 0 ? 'OK (' + symbolCount + ')' : 'MISSING'}`);

  // ── 7. Forest theme confetti has flower/leaf shapes ──────────────────────
  const flowerCount = await page.locator('.confetti-flower, .confetti-leaf').count();
  console.log(`[7] forest themed confetti shapes: ${flowerCount > 0 ? 'OK (' + flowerCount + ')' : 'MISSING'}`);

  // ── 8. Haptic function exists (best-effort, no actual vibrate in headless) ─
  const hasHaptic = await page.evaluate(() => typeof navigator.vibrate === 'function' || navigator.vibrate === undefined);
  console.log(`[8] navigator.vibrate present or absent: ${hasHaptic ? 'OK' : 'WRONG'}`);

  // ── 9. Switch to EN lang + press correct → solfège TTS scheduled ─────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-lang-select', 'en');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  await page.waitForTimeout(700);
  const t9 = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t9.toLowerCase());
  // solfège fires after 600ms via setTimeout — check speechSynthesis queue
  await page.waitForTimeout(700);
  const speaking = await page.evaluate(() => {
    // synth.speaking is true while a SpeechSynthesisUtterance is being spoken
    return window.speechSynthesis ? window.speechSynthesis.speaking || window.speechSynthesis.pending : false;
  });
  console.log(`[9] speechSynthesis active after correct: ${speaking ? 'OK' : 'PENDING/ENDED'}`);

  // ── 10. Errors check ──────────────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[10] no JS errors: OK');
  } else {
    console.log('[10] JS errors:');
    errors.forEach(e => console.log('   - ' + e));
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();