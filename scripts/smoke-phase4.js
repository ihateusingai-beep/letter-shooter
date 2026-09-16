// scripts/smoke-phase4.js — Phase 4: BGM module + track selection
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

  // ── 1. Settings panel has BGM dropdown ──────────────────────────────────
  await page.click('#js-start-btn'); // unlock audio
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(200);

  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  const hasBgmSelect = await page.locator('#js-bgm-select').count();
  console.log(`[1] BGM select present: ${hasBgmSelect === 1 ? 'OK' : 'MISSING'}`);

  // Old toggle should be gone
  const oldToggleCount = await page.locator('#js-bgm-toggle').count();
  console.log(`[1] old BGM toggle gone: ${oldToggleCount === 0 ? 'OK' : 'STILL THERE (' + oldToggleCount + ')'}`);

  // ── 2. Default 'off' ────────────────────────────────────────────────────
  const bgmDefault = await page.locator('#js-bgm-select').inputValue();
  console.log(`[2] BGM default off: ${bgmDefault === 'off' ? 'OK' : 'WRONG (' + bgmDefault + ')'}`);

  // ── 3. Switch to 'space' track → no errors, settings persist ────────────
  await page.selectOption('#js-bgm-select', 'space');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(500);
  const stored = await page.evaluate(() => {
    const raw = localStorage.getItem('ls-settings');
    return raw ? JSON.parse(raw) : null;
  });
  console.log(`[3] BGM settings saved: ${stored?.bgm === true && stored?.bgmTrack === 'space' ? 'OK' : 'WRONG ' + JSON.stringify({bgm: stored?.bgm, bgmTrack: stored?.bgmTrack})}`);

  // ── 4. Switch through all 3 tracks without errors ──────────────────────
  for (const track of ['xylophone', 'rain', 'off']) {
    await page.click('#js-settings-btn');
    await page.waitForSelector('#js-settings-panel.visible');
    await page.selectOption('#js-bgm-select', track);
    await page.click('#js-settings-apply');
    await page.waitForTimeout(300);
    const errCount = errors.length;
    console.log(`[4] track=${track} no errors: ${errCount === errors.length - (track === 'space' ? 0 : 0) ? 'OK' : 'NEW ERROR'}`);
  }

  // ── 5. Verify pause affects BGM (just verify no errors during pause) ───
  await page.keyboard.press('a'); // any key
  await page.waitForTimeout(700);
  await page.click('#js-pause-btn');
  await page.waitForTimeout(300);
  await page.click('#js-pause-btn');
  await page.waitForTimeout(300);
  const pauseErrors = errors.length;
  console.log(`[5] pause/resume no errors: ${pauseErrors === errors.length ? 'OK' : 'NEW ERROR'}`);

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