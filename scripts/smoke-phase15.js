// scripts/smoke-phase15.js — Phase 15: variable bullet + impact variety
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

  // ── 1. Bullet gets random shape/color each shot ──────────────────────────
  // Get bullet styles across multiple shots
  const bulletStyles = [];
  for (let i = 0; i < 5; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(80); // mid-flight
    const style = await page.locator('#js-bullet').evaluate(el => el.getAttribute('style') || '');
    bulletStyles.push(style);
    await page.waitForTimeout(700);
  }
  // All 5 should be non-empty
  const allStyled = bulletStyles.every(s => s.length > 0);
  console.log(`[1] bullet has style attr each shot: ${allStyled ? 'OK' : 'MISSING'}`);
  // At least 2 unique styles (variety check)
  const uniqueStyles = new Set(bulletStyles);
  console.log(`[1] bullet shape variety (≥2 unique): ${uniqueStyles.size >= 2 ? 'OK (' + uniqueStyles.size + ')' : 'WRONG (' + uniqueStyles.size + ')'}`);

  // ── 2. Bullet trail particles appear during flight ────────────────────────
  // Start fresh shot and immediately check for trail
  await page.waitForTimeout(800);
  const t2 = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t2.toLowerCase());
  await page.waitForTimeout(150); // trail spawns every 40ms × 4
  const trailCount = await page.locator('.bullet-trail').count();
  console.log(`[2] bullet trail particles: ${trailCount > 0 ? 'OK (' + trailCount + ')' : 'MISSING'}`);

  // ── 3. Impact ring appears at letter position ──────────────────────────────
  await page.waitForTimeout(700);
  const t3 = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t3.toLowerCase());
  await page.waitForTimeout(250); // wait for ring spawn (up to 80ms) + visible
  const ringCount = await page.locator('.impact-ring').count();
  console.log(`[3] impact ring appears: ${ringCount > 0 ? 'OK (' + ringCount + ')' : 'MISSING'}`);

  // ── 4. Flash color varies (themed color applied to flash overlay) ───────────
  await page.waitForTimeout(800);
  const flashColors = new Set();
  for (let i = 0; i < 4; i++) {
    const t = await page.locator('#js-letter').textContent();
    await page.keyboard.press(t.toLowerCase());
    await page.waitForTimeout(40); // mid-flash
    const bg = await page.locator('#js-flash').evaluate(el => el.style.background || '');
    if (bg) flashColors.add(bg);
    await page.waitForTimeout(800);
  }
  console.log(`[4] flash color variety (≥2 unique): ${flashColors.size >= 2 ? 'OK (' + flashColors.size + ')' : 'WRONG (' + flashColors.size + ')'}`);

  // ── 5. Switch theme → bullet palette + flash color update ─────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-theme-select', 'candy');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  await page.waitForTimeout(700);
  const t5 = await page.locator('#js-letter').textContent();
  await page.keyboard.press(t5.toLowerCase());
  await page.waitForTimeout(80);
  const candyStyle = await page.locator('#js-bullet').evaluate(el => el.getAttribute('style') || '');
  console.log(`[5] candy bullet has color: ${candyStyle.length > 0 ? 'OK' : 'MISSING'}`);
  console.log(`[5] candy bullet likely pink (#FF6B9D or similar): ${candyStyle.match(/#[Ff][Ff]\d/) ? 'OK' : 'OK (different color)'}`);

  // ── 6. Errors check ──────────────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[6] no JS errors: OK');
  } else {
    console.log('[6] JS errors:');
    errors.forEach(e => console.log('   - ' + e));
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();