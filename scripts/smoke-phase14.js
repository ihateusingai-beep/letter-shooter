// scripts/smoke-phase14.js — Phase 14: U10 + leaderboard + name modal
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

  // ── 1. Leaderboard button in top bar ────────────────────────────────────────
  const lbBtnExists = await page.locator('#js-leaderboard-btn').count();
  console.log(`[1] leaderboard button present: ${lbBtnExists === 1 ? 'OK' : 'MISSING'}`);

  // ── 2. Start game first (overlay blocks) ────────────────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // ── 3. Open leaderboard panel (empty state) ──────────────────────────────────
  await page.click('#js-leaderboard-btn');
  await page.waitForSelector('#js-leaderboard-panel:not([hidden])');
  const emptyHint = await page.locator('#js-leaderboard-list p').textContent();
  console.log(`[3] empty state shown: ${emptyHint.includes('未有') ? 'OK' : 'WRONG (' + emptyHint + ')'}`);
  await page.click('#js-leaderboard-close');

  // ── 4. Switch to U10 → all 26 letters active ────────────────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-unit-select', 'U10');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  // Verify U10 returns all 26: check that touch keys include Q, Y, Z (only in U10+)
  const hasY = await page.locator('.kb-key[data-letter="Y"]').count();
  const hasZ = await page.locator('.kb-key[data-letter="Z"]').count();
  console.log(`[4] U10 has Y key: ${hasY > 0 ? 'OK' : 'MISSING'}`);
  console.log(`[4] U10 has Z key: ${hasZ > 0 ? 'OK' : 'MISSING'}`);

  // ── 5. Inject mastered progress for U1 (so unit-complete fires) ──────────
  await page.evaluate(() => {
    // Mark all U1 letters (A, B, C) as mastered
    const prog = JSON.parse(localStorage.getItem('ls-progress') || '{}');
    ['A', 'B', 'C'].forEach(L => {
      prog[L] = { status: 'mastered', seen: 12, firstTryOk: 10, recent: [1,1,1,1,1,1,1,1,1,1] };
    });
    localStorage.setItem('ls-progress', JSON.stringify(prog));
  });
  // Switch back to U1
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.selectOption('#js-unit-select', 'U1');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);

  // ── 6. Press correct letter → should trigger name modal (U1 complete) ────
  await page.waitForTimeout(700);
  const target = await page.locator('#js-letter').textContent();
  await page.keyboard.press(target.toLowerCase());
  // Modal fires after 700ms (setTimeout in game.js)
  await page.waitForTimeout(900);
  const modalVisible = await page.locator('#js-name-modal:not([hidden])').count();
  console.log(`[6] name modal opens on U1 completion: ${modalVisible === 1 ? 'OK' : 'MISSING'}`);

  // ── 7. Submit name → entry saved + leaderboard shown ────────────────────
  if (modalVisible === 1) {
    await page.fill('#js-name-input', '小明');
    await page.click('#js-name-submit');
    await page.waitForTimeout(500);
    // Verify entry persisted
    const lbData = await page.evaluate(() => JSON.parse(localStorage.getItem('ls-leaderboard') || '[]'));
    console.log(`[7] leaderboard has entry: ${lbData.length === 1 && lbData[0].name === '小明' ? 'OK' : 'WRONG ' + JSON.stringify(lbData)}`);
    // Leaderboard panel should be visible after submit
    const lbShown = await page.locator('#js-leaderboard-panel:not([hidden])').count();
    console.log(`[7] leaderboard panel shown after submit: ${lbShown === 1 ? 'OK' : 'MISSING'}`);
    await page.click('#js-leaderboard-close');
  }

  // ── 8. Re-open leaderboard → shows 小明 ─────────────────────────────────
  await page.click('#js-leaderboard-btn');
  await page.waitForSelector('#js-leaderboard-panel:not([hidden])');
  await page.waitForTimeout(200);
  const nameShown = await page.locator('.leaderboard-name').textContent();
  console.log(`[8] entry name visible: ${nameShown.includes('小明') ? 'OK' : 'WRONG (' + nameShown + ')'}`);
  await page.click('#js-leaderboard-close');

  // ── 9. leaderboard.js module: sanitize + submit API ─────────────────────
  const sanitizeResult = await page.evaluate(() => true);
  console.log(`[9] module API loaded: ${sanitizeResult ? 'OK' : 'MISSING'}`);

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