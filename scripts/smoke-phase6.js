// scripts/smoke-phase6.js — Phase 6: mega fireworks, themed confetti, stars, robot celebrate tiers
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

  // ── Boot game ────────────────────────────────────────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(200);

  // ── 1. Stars block in top bar ────────────────────────────────────────────
  const starsBlockExists = await page.locator('.stars-block').count();
  console.log(`[1] stars block present: ${starsBlockExists === 1 ? 'OK' : 'MISSING'}`);
  const starsBarFillExists = await page.locator('#js-stars-bar-fill').count();
  console.log(`[1] stars bar fill present: ${starsBarFillExists === 1 ? 'OK' : 'MISSING'}`);
  const initialStars = await page.locator('#js-stars-num').textContent();
  console.log(`[1] initial stars 0: ${initialStars === '0' ? 'OK' : 'WRONG (' + initialStars + ')'}`);

  // ── 2. Themed confetti (space default — stars) ───────────────────────────
  const target = await page.locator('#js-letter').textContent();
  await page.keyboard.press(target.toLowerCase());
  await page.waitForTimeout(120);
  const spaceStars = await page.locator('.confetti-star').count();
  console.log(`[2] space theme confetti-star: ${spaceStars > 0 ? 'OK (' + spaceStars + ')' : 'MISSING'}`);

  // ── 3. Switch to candy → confetti-heart ──────────────────────────────────
  await page.waitForTimeout(700);
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-theme-select', 'candy');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);
  await page.keyboard.press(target.toLowerCase());
  await page.waitForTimeout(120);
  const candyHearts = await page.locator('.confetti-heart').count();
  console.log(`[3] candy theme confetti-heart: ${candyHearts > 0 ? 'OK (' + candyHearts + ')' : 'MISSING'}`);

  // ── 4. Stars increments + bar fills ──────────────────────────────────────
  await page.waitForTimeout(700);
  for (let i = 0; i < 4; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(750);
  }
  const starsAfter4 = await page.locator('#js-stars-num').textContent();
  console.log(`[4] stars after 4 correct: ${starsAfter4 === '4' ? 'OK' : 'WRONG (' + starsAfter4 + ')'}`);
  const barWidth = await page.locator('#js-stars-bar-fill').evaluate(el =>
    el.style.width || getComputedStyle(el).width
  );
  console.log(`[4] bar width > 0: ${barWidth !== '0%' && barWidth !== '0px' ? 'OK (' + barWidth + ')' : 'MISSING (' + barWidth + ')'}`);

  // ── 5. Build streak to 5 → celebrate-big class ──────────────────────────
  // We have 4 stars, 1 wrong reset things. Just check at any streak ≥5
  await page.waitForTimeout(700);
  for (let i = 0; i < 5; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(150); // check during animation
    const cls = await page.locator('#js-robot-wrap').getAttribute('class');
    if (cls && (cls.includes('celebrate-big') || cls.includes('celebrate-mega'))) {
      console.log(`[5] celebrate-big/mega @ streak ${i + 1}: OK`);
      break;
    }
    await page.waitForTimeout(600);
  }

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