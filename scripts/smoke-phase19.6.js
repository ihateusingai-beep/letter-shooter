// scripts/smoke-phase19.6.js — Phase 19.6 (C1): Export/Import data I/O
const { chromium } = require('playwright');
const path = require('path');

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ acceptDownloads: true });
  const page = await ctx.newPage();

  const errors = [];
  page.on('pageerror', err => errors.push('pageerror: ' + err.message));
  page.on('console', msg => {
    if (msg.type() === 'error') errors.push('console.error: ' + msg.text());
  });

  const fileUrl = 'file://' + path.resolve(__dirname, '..', 'index.html');
  await page.goto(fileUrl);
  await page.waitForSelector('#js-start-btn');

  // Capture early errors
  const earlyErrors = [];
  page.on('pageerror', err => earlyErrors.push(err.message));
  await page.waitForTimeout(500);
  if (earlyErrors.length) {
    console.log('EARLY ERRORS:', earlyErrors.join(' | '));
    await browser.close();
    process.exit(1);
  }

  // Reset localStorage
  await page.evaluate(() => {
    Object.keys(localStorage).forEach(k => {
      if (k.startsWith('ls-')) localStorage.removeItem(k);
    });
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');

  // Pre-seed with some test data
  await page.evaluate(() => {
    localStorage.setItem('ls-settings', JSON.stringify({ voice: false, theme: 'candy' }));
    localStorage.setItem('ls-progress', JSON.stringify({
      A: { status: 'mastered', seen: 10, firstTryOk: 7, recent: [1,1,1,1,1,1,1,0,0,0] },
      B: { status: 'practice', seen: 3, firstTryOk: 1, recent: [1,0,0] },
    }));
    localStorage.setItem('ls-leaderboard', JSON.stringify([
      { name: '小明', score: 50, unit: 'U1', ts: 1758000000000 },
    ]));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(300);

  // [42] export button exists in Advanced section
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(200);
  // Open Advanced section (collapsed by default)
  await page.evaluate(() => {
    document.querySelectorAll('#js-settings-panel .settings-section')[3].open = true;
  });
  await page.waitForTimeout(200);
  const exportBtn = await page.evaluate(() => !!document.querySelector('#js-export-btn'));
  const importBtn = await page.evaluate(() => !!document.querySelector('#js-import-btn'));
  console.log(`[42] export + import buttons present in Advanced: ${exportBtn && importBtn ? 'OK' : 'FAIL'} (export=${exportBtn}, import=${importBtn})`);

  // [43] export downloads a JSON file with correct structure
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.click('#js-export-btn'),
  ]);
  const filename = download.suggestedFilename();
  const dlPath = await download.path();
  const fs = require('fs');
  const exportText = fs.readFileSync(dlPath, 'utf-8');
  const exportPayload = JSON.parse(exportText);
  const hasAllKeys = ['ls-settings', 'ls-progress', 'ls-leaderboard'].every(k => k in exportPayload.data);
  const hasMeta = exportPayload.version && exportPayload.exportedAt && exportPayload.appVersion;
  console.log(`[43] export downloads JSON with expected structure: ${hasAllKeys && hasMeta ? 'OK' : 'FAIL'} (filename=${filename}, keys=${Object.keys(exportPayload.data).join(',')})`);

  // [44] exported data matches what was stored
  const settingsTheme = await page.evaluate(() => JSON.parse(localStorage.getItem('ls-settings')).theme);
  const exportTheme = exportPayload.data['ls-settings'].theme;
  console.log(`[44] exported theme=candy matches storage: ${exportTheme === settingsTheme ? 'OK' : 'FAIL'} (stored=${settingsTheme}, exported=${exportTheme})`);

  // [45] importProgressFromString with valid payload applies keys
  const summary = await page.evaluate((jsonStr) => {
    return window.LetterShooter.importProgressFromString(jsonStr);
  }, exportText);
  const appliedAll = ['ls-settings', 'ls-progress', 'ls-leaderboard'].every(k => summary.appliedKeys.includes(k));
  console.log(`[45] importProgressFromString applies 3 known keys: ${appliedAll ? 'OK' : 'FAIL'} (applied=${summary.appliedKeys.join(',')})`);

  // [46] import validates malformed JSON
  let importErr = null;
  try {
    await page.evaluate(() => window.LetterShooter.importProgressFromString('not json {{{'));
  } catch (e) {
    importErr = e.message;
  }
  console.log(`[46] import rejects malformed JSON: ${importErr && importErr.includes('JSON') ? 'OK' : 'FAIL'} (err=${importErr})`);

  // [47] import validates missing data field
  let importErr2 = null;
  try {
    await page.evaluate(() => window.LetterShooter.importProgressFromString(JSON.stringify({ version: '1.0' })));
  } catch (e) {
    importErr2 = e.message;
  }
  console.log(`[47] import rejects payload without data field: ${importErr2 && importErr2.includes('data') ? 'OK' : 'FAIL'} (err=${importErr2})`);

  // [48] import accepts payload with only some keys (partial apply)
  const partialSummary = await page.evaluate(() => {
    // First reset storage
    localStorage.removeItem('ls-progress');
    // Import only ls-settings
    return window.LetterShooter.importProgressFromString(JSON.stringify({
      version: '1.0',
      exportedAt: new Date().toISOString(),
      appVersion: '1.7.1',
      data: { 'ls-settings': { voice: true, theme: 'ocean' } }
    }));
  });
  const settingsAfter = await page.evaluate(() => JSON.parse(localStorage.getItem('ls-settings')));
  const progressAfter = await page.evaluate(() => localStorage.getItem('ls-progress'));
  const partialOk = partialSummary.appliedKeys.length === 1 &&
                    settingsAfter.theme === 'ocean' &&
                    progressAfter === null;
  console.log(`[48] partial import (only ls-settings) works: ${partialOk ? 'OK' : 'FAIL'} (applied=${partialSummary.appliedKeys.length}, theme=${settingsAfter.theme}, progress cleared=${progressAfter === null})`);

  // [49] import overwrites existing keys
  await page.evaluate(() => {
    localStorage.setItem('ls-settings', JSON.stringify({ theme: 'space' }));
  });
  await page.evaluate(() => {
    window.LetterShooter.importProgressFromString(JSON.stringify({
      version: '1.0', exportedAt: '', appVersion: '1.7.1',
      data: { 'ls-settings': { theme: 'forest' } }
    }));
  });
  const afterOverwrite = await page.evaluate(() => JSON.parse(localStorage.getItem('ls-settings')).theme);
  console.log(`[49] import overwrites existing values: ${afterOverwrite === 'forest' ? 'OK' : 'FAIL'} (theme=${afterOverwrite})`);

  // [50] no JS errors
  console.log(`[50] no JS errors: ${errors.length === 0 ? 'OK' : 'FAIL'} (${errors.length} errors)`);
  if (errors.length) errors.forEach(e => console.log('     ' + e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();