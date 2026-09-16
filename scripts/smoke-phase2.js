// scripts/smoke-phase2.js — quick playwright check for Phase 2 features
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

  // ── 0. Start game first (overlay blocks settings button) ──────────────
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(200);

  // ── 1. Settings panel should have new toggles ──────────────────────────
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  const hasSfx = await page.locator('#js-sfx-toggle').count();
  const hasBgm = await page.locator('#js-bgm-toggle').count();
  console.log(`[1] sfx toggle present: ${hasSfx === 1 ? 'OK' : 'MISSING'}`);
  console.log(`[1] bgm toggle present: ${hasBgm === 1 ? 'OK' : 'MISSING'}`);

  // Verify default states
  const sfxChecked = await page.locator('#js-sfx-toggle').isChecked();
  const bgmChecked = await page.locator('#js-bgm-toggle').isChecked();
  console.log(`[1] sfx default ON: ${sfxChecked ? 'OK' : 'WRONG'}`);
  console.log(`[1] bgm default OFF: ${bgmChecked ? 'WRONG' : 'OK'}`);
  await page.click('#js-settings-close');

  // ── 2. Streak block in top bar ─────────────────────────────────────────
  const streakExists = await page.locator('#js-streak-wrap').count();
  console.log(`[2] streak block present: ${streakExists === 1 ? 'OK' : 'MISSING'}`);
  const initialStreak = await page.locator('#js-streak').textContent();
  console.log(`[2] initial streak: ${initialStreak === '×0' ? 'OK' : 'WRONG (' + initialStreak + ')'}`);

  // ── 3. Press correct 3 times → streak ×3 ───────────────────────────────
  for (let i = 0; i < 3; i++) {
    const target = await page.locator('#js-letter').textContent();
    await page.keyboard.press(target.toLowerCase());
    await page.waitForTimeout(700);
  }
  const streakAfter3 = await page.locator('#js-streak').textContent();
  console.log(`[3] streak after 3 correct: ${streakAfter3 === '×3' ? 'OK' : 'WRONG (' + streakAfter3 + ')'}`);

  // ── 4. Wrong key resets streak ─────────────────────────────────────────
  const targetLetter = await page.locator('#js-letter').textContent();
  const wrongKey = targetLetter === 'A' ? 'B' : 'A';
  await page.keyboard.press(wrongKey);
  await page.waitForTimeout(300);
  const streakAfterWrong = await page.locator('#js-streak').textContent();
  console.log(`[4] streak after wrong: ${streakAfterWrong === '×0' ? 'OK' : 'WRONG (' + streakAfterWrong + ')'}`);

  // ── 5. Robot celebrate class applied on correct ────────────────────────
  await page.keyboard.press(targetLetter.toLowerCase());
  await page.waitForTimeout(100);
  const celebrateClass = await page.locator('#js-robot-wrap').getAttribute('class');
  console.log(`[5] robot celebrate class: ${celebrateClass?.includes('celebrate') ? 'OK' : 'MISSING (' + celebrateClass + ')'}`);

  // ── 6. Errors check ────────────────────────────────────────────────────
  if (errors.length === 0) {
    console.log('[6] no JS errors: OK');
  } else {
    console.log('[6] JS errors:');
    errors.forEach(e => console.log('   - ' + e));
  }

  await browser.close();
  process.exit(errors.length > 0 ? 1 : 0);
})();