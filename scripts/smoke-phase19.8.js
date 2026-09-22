// scripts/smoke-phase19.8.js — Phase 19.8 (A2): Custom Levels visual picker
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

  // Open settings
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(200);

  // [62] 26 letter buttons rendered
  const letterCount = await page.evaluate(() =>
    document.querySelectorAll('#js-letter-picker .letter-btn').length
  );
  console.log(`[62] 26 letter buttons rendered: ${letterCount === 26 ? 'OK' : 'FAIL'} (${letterCount})`);

  // [63] clicking letter adds to current group
  await page.click('#js-letter-picker .letter-btn[data-letter="A"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="B"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="C"]');
  const currentDisplay = await page.evaluate(() =>
    document.getElementById('js-current-group-display').textContent
  );
  console.log(`[63] clicking A B C populates current group: ${currentDisplay === 'A B C' ? 'OK' : 'FAIL'} (${currentDisplay})`);

  // [64] current group buttons get .in-current class
  const inCurrentCount = await page.evaluate(() =>
    document.querySelectorAll('#js-letter-picker .letter-btn.in-current').length
  );
  console.log(`[64] 3 buttons have .in-current class: ${inCurrentCount === 3 ? 'OK' : 'FAIL'} (${inCurrentCount})`);

  // [65] commit button enabled with 1+ letters
  const commitDisabled = await page.evaluate(() =>
    document.getElementById('js-commit-group').disabled
  );
  console.log(`[65] commit button enabled with letters in current: ${!commitDisabled ? 'OK' : 'FAIL'} (disabled=${commitDisabled})`);

  // [66] cap at 6 letters per group
  await page.click('#js-letter-picker .letter-btn[data-letter="D"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="E"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="F"]');
  // Try clicking G (should be rejected — currentGroup already has 6)
  await page.click('#js-letter-picker .letter-btn[data-letter="G"]');
  const capDisplay = await page.evaluate(() =>
    document.getElementById('js-current-group-display').textContent
  );
  const capOk = capDisplay === 'A B C D E F';
  console.log(`[66] 6-letter cap rejects 7th letter: ${capOk ? 'OK' : 'FAIL'} (${capDisplay})`);

  // [67] toggle off — click again removes letter
  await page.click('#js-letter-picker .letter-btn[data-letter="C"]');
  const toggleDisplay = await page.evaluate(() =>
    document.getElementById('js-current-group-display').textContent
  );
  console.log(`[67] re-click letter toggles it off: ${toggleDisplay === 'A B D E F' ? 'OK' : 'FAIL'} (${toggleDisplay})`);

  // [68] clear current group
  await page.click('#js-clear-current-group');
  const afterClear = await page.evaluate(() =>
    document.getElementById('js-current-group-display').textContent
  );
  console.log(`[68] clear button empties current group: ${afterClear === '—' ? 'OK' : 'FAIL'} (${afterClear})`);

  // [69] commit creates chip + unit dropdown option
  await page.click('#js-letter-picker .letter-btn[data-letter="X"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="Y"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="Z"]');
  await page.click('#js-commit-group');
  await page.waitForTimeout(200);
  const chipCount = await page.evaluate(() =>
    document.querySelectorAll('#js-committed-groups .chip').length
  );
  const c1Option = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#js-unit-select option'))
      .some(o => o.value === 'C1' && o.textContent.includes('XYZ'))
  );
  console.log(`[69] commit creates chip + C1 unit option: ${chipCount === 1 && c1Option ? 'OK' : 'FAIL'} (chips=${chipCount}, C1=${c1Option})`);

  // [70] committed letter buttons become disabled
  const xDisabled = await page.evaluate(() =>
    document.querySelector('#js-letter-picker .letter-btn[data-letter="X"]').disabled
  );
  console.log(`[70] committed letters become disabled: ${xDisabled ? 'OK' : 'FAIL'}`);

  // [71] committed letter has .in-committed class
  const xClass = await page.evaluate(() =>
    document.querySelector('#js-letter-picker .letter-btn[data-letter="X"]').classList.contains('in-committed')
  );
  console.log(`[71] committed letter has .in-committed class: ${xClass ? 'OK' : 'FAIL'}`);

  // [72] hidden input value updates on commit
  const hiddenValue = await page.evaluate(() =>
    document.getElementById('js-custom-levels-input').value
  );
  console.log(`[72] hidden input = "XYZ" after commit: ${hiddenValue === 'XYZ' ? 'OK' : 'FAIL'} (${hiddenValue})`);

  // [73] chip remove deletes group
  await page.click('#js-committed-groups .chip .chip-remove');
  await page.waitForTimeout(200);
  const chipsAfterRemove = await page.evaluate(() =>
    document.querySelectorAll('#js-committed-groups .chip').length
  );
  const c1AfterRemove = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#js-unit-select option'))
      .some(o => o.value === 'C1')
  );
  console.log(`[73] chip remove deletes group + removes C1: ${chipsAfterRemove === 0 && !c1AfterRemove ? 'OK' : 'FAIL'} (chips=${chipsAfterRemove}, C1exists=${c1AfterRemove})`);

  // [74] save + reload preserves committed groups
  await page.click('#js-letter-picker .letter-btn[data-letter="M"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="N"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="O"]');
  await page.click('#js-commit-group');
  await page.click('#js-letter-picker .letter-btn[data-letter="P"]');
  await page.click('#js-letter-picker .letter-btn[data-letter="Q"]');
  await page.click('#js-commit-group');
  await page.click('#js-settings-apply');
  await page.waitForTimeout(300);
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(200);
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(300);
  const restoredChips = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#js-committed-groups .chip')).map(c => c.textContent)
  );
  console.log(`[74] save+reload preserves 2 committed groups: ${restoredChips.length === 2 && restoredChips[0].includes('MNO') && restoredChips[1].includes('PQ') ? 'OK' : 'FAIL'} (${JSON.stringify(restoredChips)})`);

  // [75] backward compat: existing "ABC,DEF" string parses into 2 chips
  await page.evaluate(() => {
    localStorage.setItem('ls-settings', JSON.stringify({ customLevels: 'ABC,DEF' }));
  });
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  await page.click('#js-start-btn');
  await page.waitForTimeout(200);
  await page.click('#js-settings-btn');
  await page.waitForSelector('#js-settings-panel.visible');
  await page.waitForTimeout(300);
  const compatChips = await page.evaluate(() =>
    Array.from(document.querySelectorAll('#js-committed-groups .chip')).map(c => c.textContent)
  );
  console.log(`[75] 'ABC,DEF' string restores as 2 chips: ${compatChips.length === 2 ? 'OK' : 'FAIL'} (${JSON.stringify(compatChips)})`);

  // [76] no JS errors
  console.log(`[76] no JS errors: ${errors.length === 0 ? 'OK' : 'FAIL'} (${errors.length} errors)`);
  if (errors.length) errors.forEach(e => console.log('     ' + e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();