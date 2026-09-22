// scripts/smoke-phase19.7.js — Phase 19.7 (B2): U10 sub-pool composition
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

  // Helper: seed progress with custom letter statuses
  async function seedProgress(letterStatuses) {
    await page.evaluate((statuses) => {
      const prog = {};
      const ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
      for (let i = 0; i < ALL.length; i++) {
        const L = ALL[i];
        const s = statuses[L] || 'unopened';
        prog[L] = { status: s, seen: s === 'unopened' ? 0 : 5, firstTryOk: 0, recent: [] };
      }
      localStorage.setItem('ls-progress', JSON.stringify(prog));
    }, letterStatuses);
    await page.reload();
    await page.waitForSelector('#js-start-btn');
  }

  // Helper: read what U10 currently returns
  async function getU10Pool() {
    return await page.evaluate(() => {
      // activeLetters is exported but not on window.LetterShooter; check via curriculum module
      // by triggering activeLetters indirectly — instead, just sample multiple times and check
      // the unit is U10. We can inspect through the game by switching unit.
      // Simpler: read the source via dynamic eval. Since curriculum.js is bundled but functions
      // are in IIFE scope, we'll exercise via startGame + sampling letter choices.
      // Easier still: read from a global export if present.
      if (window.LetterShooter && typeof window.LetterShooter.activeLetters === 'function') {
        const arr = window.LetterShooter.activeLetters('U10');
        return arr.slice().sort();
      }
      return null;
    });
  }

  // [51] activeLetters exposed on LetterShooter
  const exposed = await page.evaluate(() => typeof window.LetterShooter?.activeLetters === 'function');
  console.log(`[51] activeLetters exposed on LetterShooter: ${exposed ? 'OK' : 'FAIL'}`);

  // [52] no progress → fallback to first 12 alphabet letters
  await seedProgress({});
  let pool = await getU10Pool();
  const expected12 = 'ABCDEFGHIJKL'.split('');
  const fallbackOk = pool && JSON.stringify(pool) === JSON.stringify(expected12);
  console.log(`[52] no progress → fallback to ABCDEFGHIJKL: ${fallbackOk ? 'OK' : 'FAIL'} (${pool?.join(',')})`);

  // [53] 0 mastered, 0 practice (everything unopened) → fallback
  await seedProgress({});
  pool = await getU10Pool();
  console.log(`[53] all-unopened → still 12-letter pool: ${pool && pool.length === 12 ? 'OK' : 'FAIL'} (${pool?.length})`);

  // [54] 8 mastered + 18 practice → pool of 6 practice + 6 mastered = 12
  const statuses54 = {};
  const ALL = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
  for (let i = 0; i < 8; i++) statuses54[ALL[i]] = 'mastered';
  for (let i = 8; i < 26; i++) statuses54[ALL[i]] = 'practice';
  await seedProgress(statuses54);
  pool = await getU10Pool();
  const counts54 = pool ? {
    mastered: pool.filter(L => statuses54[L] === 'mastered').length,
    practice: pool.filter(L => statuses54[L] === 'practice').length,
  } : null;
  const ok54 = counts54 && counts54.mastered === 6 && counts54.practice === 6 && pool.length === 12;
  console.log(`[54] 8M+18P → 6 mastered + 6 practice (12 total): ${ok54 ? 'OK' : 'FAIL'} (${JSON.stringify(counts54)})`);

  // [55] 20 mastered + 6 practice → pool of 6 practice + 6 mastered = 12 (mastered capped)
  const statuses55 = {};
  for (let i = 0; i < 20; i++) statuses55[ALL[i]] = 'mastered';
  for (let i = 20; i < 26; i++) statuses55[ALL[i]] = 'practice';
  await seedProgress(statuses55);
  pool = await getU10Pool();
  const counts55 = pool ? {
    mastered: pool.filter(L => statuses55[L] === 'mastered').length,
    practice: pool.filter(L => statuses55[L] === 'practice').length,
  } : null;
  const ok55 = counts55 && counts55.mastered === 6 && counts55.practice === 6 && pool.length === 12;
  console.log(`[55] 20M+6P → 6 mastered + 6 practice (capped at 6): ${ok55 ? 'OK' : 'FAIL'} (${JSON.stringify(counts55)})`);

  // [56] 3 mastered + 23 practice → 6 practice + 3 mastered = 9 (no padding, no unopened)
  const statuses56 = {};
  statuses56[ALL[0]] = 'mastered';
  statuses56[ALL[1]] = 'mastered';
  statuses56[ALL[2]] = 'mastered';
  for (let i = 3; i < 26; i++) statuses56[ALL[i]] = 'practice';
  await seedProgress(statuses56);
  pool = await getU10Pool();
  const ok56 = pool && pool.length === 9 && pool.every(L => statuses56[L] !== 'unopened');
  console.log(`[56] 3M+23P → 9 letters, none unopened: ${ok56 ? 'OK' : 'FAIL'} (count=${pool?.length})`);

  // [57] 26 mastered → 12 letters, all mastered
  const statuses57 = {};
  for (let i = 0; i < 26; i++) statuses57[ALL[i]] = 'mastered';
  await seedProgress(statuses57);
  pool = await getU10Pool();
  const ok57 = pool && pool.length === 12 && pool.every(L => statuses57[L] === 'mastered');
  console.log(`[57] 26M → 12 mastered letters: ${ok57 ? 'OK' : 'FAIL'} (count=${pool?.length}, allM=${pool?.every(L => statuses57[L] === 'mastered')})`);

  // [58] mixed 'new' status counts as practice; never pads with unopened
  const statuses58 = {};
  for (let i = 0; i < 5; i++) statuses58[ALL[i]] = 'mastered';
  for (let i = 5; i < 10; i++) statuses58[ALL[i]] = 'new';
  for (let i = 10; i < 26; i++) statuses58[ALL[i]] = 'unopened';
  await seedProgress(statuses58);
  pool = await getU10Pool();
  const counts58 = pool ? {
    mastered: pool.filter(L => statuses58[L] === 'mastered').length,
    new: pool.filter(L => statuses58[L] === 'new').length,
    unopened: pool.filter(L => statuses58[L] === 'unopened').length,
  } : null;
  // 5M + 5N = 10 total. No padding with unopened. Length = 10.
  const ok58 = counts58 && counts58.mastered === 5 && counts58.new === 5 && counts58.unopened === 0 && pool.length === 10;
  console.log(`[58] 'new' status acts as practice (no unopened padding): ${ok58 ? 'OK' : 'FAIL'} (${JSON.stringify(counts58)})`);

  // [59] U10 doesn't break when progress is corrupted JSON
  await page.evaluate(() => localStorage.setItem('ls-progress', 'not-valid-json{'));
  await page.reload();
  await page.waitForSelector('#js-start-btn');
  pool = await getU10Pool();
  const ok59 = pool && pool.length === 12 && JSON.stringify(pool.slice().sort()) === JSON.stringify(expected12.slice().sort());
  console.log(`[59] corrupted ls-progress → graceful fallback to ABCDEFGHIJKL: ${ok59 ? 'OK' : 'FAIL'} (${pool?.join(',')})`);

  // [60] non-U10 units still return their normal pool (regression check)
  await seedProgress({});  // clear
  const u1Pool = await page.evaluate(() => window.LetterShooter.activeLetters('U1'));
  const u2Pool = await page.evaluate(() => window.LetterShooter.activeLetters('U2'));
  const c1Pool = await page.evaluate(() => {
    localStorage.setItem('ls-settings', JSON.stringify({ customLevels: 'MNO,PQR' }));
    return window.LetterShooter.activeLetters('C1');
  });
  // Reset custom levels for cleanliness
  await page.evaluate(() => localStorage.removeItem('ls-settings'));
  const ok60 = u1Pool && u1Pool.length === 3 && u2Pool && u2Pool.length === 4 && c1Pool && c1Pool.join('') === 'MNO';
  console.log(`[60] U1=3 letters, U2=4 letters, C1=MNO (regression): ${ok60 ? 'OK' : 'FAIL'} (U1=${u1Pool?.join(',')}, U2=${u2Pool?.join(',')}, C1=${c1Pool?.join(',')})`);

  // [61] no JS errors
  console.log(`[61] no JS errors: ${errors.length === 0 ? 'OK' : 'FAIL'} (${errors.length} errors)`);
  if (errors.length) errors.forEach(e => console.log('     ' + e));

  await browser.close();
  process.exit(errors.length ? 1 : 0);
})();