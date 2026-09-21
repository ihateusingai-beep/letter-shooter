// scripts/smoke-phase19.3.js — Phase 19.3: Settings panel sections (collapsible)
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

  // Open settings panel
  await page.click('#js-start-btn');
  await page.waitForSelector('#js-start-overlay.hidden', { state: 'attached' });
  await page.waitForTimeout(300);
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(300);

  // [25] 4 collapsible sections exist
  const sectionCount = await page.evaluate(() =>
    document.querySelectorAll('#js-settings-panel .settings-section').length
  );
  console.log(`[25] 4 collapsible sections exist: ${sectionCount === 4 ? 'OK' : 'FAIL'} (${sectionCount})`);

  // [26] section labels correct
  const labels = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#js-settings-panel .settings-section > summary'))
      .map(s => s.textContent.trim().replace(/[▸▾]/g, '').trim())
  );
  const expectedLabels = ['🎮 玩法 Gameplay', '🔊 聲音 Audio', '🎨 外觀 Appearance', '⚙️ 進階 Advanced'];
  const labelsOk = JSON.stringify(labels) === JSON.stringify(expectedLabels);
  console.log(`[26] section labels correct: ${labelsOk ? 'OK' : 'FAIL'} (${labels.join(' | ')})`);

  // [27] gameplay + audio + appearance default-open, advanced default-closed
  const openStates = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#js-settings-panel .settings-section'))
      .map(s => ({ label: s.querySelector('summary').textContent.trim().replace(/[▸▾]/g, '').trim(), open: s.open }))
  );
  const openOk = openStates[0].open && openStates[1].open && openStates[2].open && !openStates[3].open;
  console.log(`[27] first 3 sections open, advanced closed: ${openOk ? 'OK' : 'FAIL'} (${JSON.stringify(openStates)})`);

  // [28] all 17 controls still present (1 lang + 5 gameplay + 3 audio + 6 appearance + 2 advanced)
  const controlIds = await page.evaluate(() => {
    const ids = [];
    document.querySelectorAll('#js-settings-panel select, #js-settings-panel textarea, #js-settings-panel input[type=checkbox]')
      .forEach(el => { if (el.id) ids.push(el.id); });
    return ids;
  });
  const expectedIds = [
    'js-lang-select',
    'js-unit-select', 'js-custom-levels-input', 'js-level-select', 'js-game-mode-select', 'js-case-mode-select',
    'js-voice-toggle', 'js-sfx-toggle', 'js-bgm-select',
    'js-theme-select', 'js-robot-color-select', 'js-mascot-theme-select',
    'js-hc-toggle', 'js-motion-toggle', 'js-confetti-intensity-select',
    'js-speed-select', 'js-kb-mode-select'
  ];
  const allPresent = expectedIds.every(id => controlIds.includes(id));
  console.log(`[28] all 17 control IDs present: ${allPresent ? 'OK' : 'FAIL'} (found ${controlIds.length}/17)`);

  // [29] advanced section can be toggled
  await page.evaluate(() => {
    document.querySelectorAll('#js-settings-panel .settings-section')[3].open = true;
  });
  const advancedOpen = await page.evaluate(() =>
    document.querySelectorAll('#js-settings-panel .settings-section')[3].open
  );
  console.log(`[29] advanced section toggles to open: ${advancedOpen ? 'OK' : 'FAIL'}`);

  // [30] settings save still works after restructure
  await page.selectOption('#js-theme-select', 'candy');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(200);
  const savedTheme = await page.evaluate(() =>
    JSON.parse(localStorage.getItem('ls-settings') || '{}').theme
  );
  console.log(`[30] theme=candy saves correctly: ${savedTheme === 'candy' ? 'OK' : 'FAIL'} (${savedTheme})`);

  // [31] body[data-theme] updated
  const bodyTheme = await page.evaluate(() => document.body.getAttribute('data-theme'));
  console.log(`[31] body data-theme=candy applied: ${bodyTheme === 'candy' ? 'OK' : 'FAIL'} (${bodyTheme})`);

  // [32] no JS errors
  console.log(`[32] no JS errors: ${errors.length === 0 ? 'OK' : 'FAIL'} (${errors.length} errors)`);
  if (errors.length) errors.forEach(e => console.log('     ' + e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();