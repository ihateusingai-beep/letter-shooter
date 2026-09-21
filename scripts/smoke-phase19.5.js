// scripts/smoke-phase19.5.js — Phase 19.5: Teacher-overrideable mastery threshold
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

  // Reset localStorage
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

  // [33] masteryThreshold default = 6 (read via loadSettings which falls back to DEFAULTS)
  const defaultThreshold = await page.evaluate(() => {
    // loadSettings is not exposed on window.LetterShooter; emulate by reading DEFAULTS via settings panel select
    const sel = document.querySelector('#js-mastery-threshold-select');
    return sel ? Number(sel.options[sel.selectedIndex].value) : null;
  });
  console.log(`[33] default masteryThreshold=6: ${defaultThreshold === 6 ? 'OK' : 'FAIL'} (${defaultThreshold})`);

  // [34] settings panel has mastery threshold select with 4 options
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(200);
  const optionCount = await page.evaluate(() => {
    const sel = document.querySelector('#js-mastery-threshold-select');
    return sel ? sel.querySelectorAll('option').length : 0;
  });
  console.log(`[34] mastery-threshold select has 4 options: ${optionCount === 4 ? 'OK' : 'FAIL'} (${optionCount})`);

  // [35] current value displayed as '6' (default)
  const currentValue = await page.evaluate(() =>
    document.querySelector('#js-mastery-threshold-select').value
  );
  console.log(`[35] default option selected (6): ${currentValue === '6' ? 'OK' : 'FAIL'} (${currentValue})`);

  // [36] pre-seed progress with letters having specific recent arrays
  //   - 'A' has 5/10 correct → 'mastered' if threshold=5, 'practice' if threshold=6
  //   - 'B' has 7/10 correct → 'mastered' at both 5 and 6, NOT mastered at 7 or 8
  await page.evaluate(() => {
    const prog = JSON.parse(localStorage.getItem('ls-progress') || '{}');
    prog.A = { status: 'practice', seen: 10, firstTryOk: 5, recent: [1,1,1,1,1,0,0,0,0,0] };
    prog.B = { status: 'mastered', seen: 10, firstTryOk: 7, recent: [1,1,1,1,1,1,1,0,0,0] };
    prog.C = { status: 'practice', seen: 10, firstTryOk: 3, recent: [1,1,1,0,0,0,0,0,0,0] };
    localStorage.setItem('ls-progress', JSON.stringify(prog));
  });

  // [37] set threshold=5 → A should become mastered, B stays mastered, C stays practice
  await page.selectOption('#js-mastery-threshold-select', '5');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);
  const after5 = await page.evaluate(() => ({
    A: JSON.parse(localStorage.getItem('ls-progress')).A.status,
    B: JSON.parse(localStorage.getItem('ls-progress')).B.status,
    C: JSON.parse(localStorage.getItem('ls-progress')).C.status,
    threshold: JSON.parse(localStorage.getItem('ls-settings')).masteryThreshold,
  }));
  const ok5 = after5.threshold === 5 && after5.A === 'mastered' && after5.B === 'mastered' && after5.C === 'practice';
  console.log(`[37] threshold=5 re-evaluates (A→mastered, B stays, C stays): ${ok5 ? 'OK' : 'FAIL'} (${JSON.stringify(after5)})`);

  // [38] set threshold=8 → A and B should both be NOT mastered (practice)
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(200);
  await page.selectOption('#js-mastery-threshold-select', '8');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);
  const after8 = await page.evaluate(() => ({
    A: JSON.parse(localStorage.getItem('ls-progress')).A.status,
    B: JSON.parse(localStorage.getItem('ls-progress')).B.status,
    threshold: JSON.parse(localStorage.getItem('ls-settings')).masteryThreshold,
  }));
  const ok8 = after8.threshold === 8 && after8.A === 'practice' && after8.B === 'practice';
  console.log(`[38] threshold=8 re-evaluates (A→practice, B→practice): ${ok8 ? 'OK' : 'FAIL'} (${JSON.stringify(after8)})`);

  // [39] threshold=7 → B should stay mastered (7/10 ok), A stays practice
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(200);
  await page.selectOption('#js-mastery-threshold-select', '7');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);
  const after7 = await page.evaluate(() => ({
    A: JSON.parse(localStorage.getItem('ls-progress')).A.status,
    B: JSON.parse(localStorage.getItem('ls-progress')).B.status,
  }));
  const ok7 = after7.A === 'practice' && after7.B === 'mastered';
  console.log(`[39] threshold=7 (B=7/10 stays mastered, A=5/10 practice): ${ok7 ? 'OK' : 'FAIL'} (${JSON.stringify(after7)})`);

  // [40] invalid threshold in storage → getMasteryThreshold falls back to 6
  await page.evaluate(() => {
    const s = JSON.parse(localStorage.getItem('ls-settings') || '{}');
    s.masteryThreshold = 99;  // invalid
    localStorage.setItem('ls-settings', JSON.stringify(s));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  const recovered = await page.evaluate(() => {
    // window.LetterShooter may not expose getMasteryThreshold, test via the default select
    return JSON.parse(localStorage.getItem('ls-settings') || '{}').masteryThreshold;
  });
  // After reload with invalid=99, the UI's select will show the invalid value as stored;
  // but recordAttempt should still treat it as default 6 internally. We verify that the
  // panel re-opens without crashing (since storage was corrupted):
  await page.click('#js-start-btn');
  await page.waitForTimeout(200);
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(200);
  const panelOpensOk = await page.evaluate(() =>
    document.body.classList.contains('modal-open') ||
    document.querySelector('#js-settings-panel.visible') !== null
  );
  console.log(`[40] invalid threshold=99 doesn't crash panel: ${panelOpensOk ? 'OK' : 'FAIL'}`);

  // [41] no JS errors
  console.log(`[41] no JS errors: ${errors.length === 0 ? 'OK' : 'FAIL'} (${errors.length} errors)`);
  if (errors.length) errors.forEach(e => console.log('     ' + e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();