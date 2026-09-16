// scripts/smoke-phase9.js — Phase 9: next milestone + combo text + letter sparkle
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

  // ── 1. Next milestone hint DOM exists ─────────────────────────────────────
  const nextHintExists = await page.locator('#js-stars-next').count();
  console.log(`[1] stars-next DOM: ${nextHintExists === 1 ? 'OK' : 'MISSING'}`);
  const initialHint = await page.locator('#js-stars-next').textContent();
  console.log(`[1] initial hint: ${initialHint.includes('10') ? 'OK (' + initialHint + ')' : 'WRONG (' + initialHint + ')'}`);

  // ── 2. Combo layer DOM exists ─────────────────────────────────────────────
  const comboLayerExists = await page.locator('#js-combo-layer').count();
  console.log(`[2] combo layer DOM: ${comboLayerExists === 1 ? 'OK' : 'MISSING'}`);

  // ── Boot game ────────────────────────────────────────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(200);

  // ── 3. Press correct → combo text "+1" appears briefly ───────────────────
  await page.waitForTimeout(700); // wait for letter trail etc to settle
  const t1 = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t1.toLowerCase());
  await page.waitForTimeout(150); // mid-animation
  const comboCount = await page.locator('.combo-text').count();
  console.log(`[3] combo text appears after correct: ${comboCount > 0 ? 'OK (' + comboCount + ')' : 'MISSING'}`);

  // Wait for combo to clear
  await page.waitForTimeout(1500);

  // ── 4. Build streak to 3 → tier-3 combo ──────────────────────────────────
  for (let i = 0; i < 2; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(750);
  }
  // Press 3rd correct and check
  const t3 = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t3.toLowerCase());
  await page.waitForTimeout(100);
  const tier3Count = await page.locator('.combo-text.tier-3').count();
  console.log(`[4] tier-3 combo at streak 3: ${tier3Count > 0 ? 'OK' : 'MISSING'}`);

  // ── 5. Wait then check stars-next updated ────────────────────────────────
  await page.waitForTimeout(1500);
  const hintAfter = await page.locator('#js-stars-next').textContent();
  console.log(`[5] next milestone hint updated: ${hintAfter.includes('7') || hintAfter.includes('下一個') ? 'OK (' + hintAfter + ')' : 'WRONG (' + hintAfter + ')'}`);

  // ── 6. Wait for letter to show → sparkle particles appear ────────────────
  // Press correct to trigger nextTurn → showLetter → sparkle (200ms after)
  const t6 = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t6.toLowerCase());
  // nextTurn setTimeout = 600ms, sparkle setTimeout = 200ms, then animation runs ~0.6-0.9s
  // Total: ~850ms after press is peak sparkle visibility
  await page.waitForTimeout(900);
  const sparkleCount = await page.locator('.confetti-piece.sparkle').count();
  console.log(`[6] letter sparkle on appear: ${sparkleCount > 0 ? 'OK (' + sparkleCount + ')' : 'MISSING'}`);

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