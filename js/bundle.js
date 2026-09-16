(() => {
  // js/settings.js
  var DEFAULTS = {
    voice: true,
    // TTS on/off
    speed: "slow",
    // 'verySlow' | 'slow' | 'medium'
    highContrast: false,
    reduceMotion: false,
    lang: "zh",
    // UI language: 'zh' | 'en'
    currentUnit: "U1",
    level: "L0",
    // 'L0' | 'L1'
    kbMode: "compact"
    // 'full' | 'compact' — compact shows only target letter
  };
  function loadSettings() {
    try {
      const raw = localStorage.getItem("ls-settings");
      return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : { ...DEFAULTS };
    } catch {
      return { ...DEFAULTS };
    }
  }
  function saveSettings(patch) {
    const current = loadSettings();
    const next = { ...current, ...patch };
    localStorage.setItem("ls-settings", JSON.stringify(next));
    return next;
  }
  function getSetting(key) {
    return loadSettings()[key];
  }
  function fallDuration() {
    const map = { verySlow: 12, slow: 8, medium: 5 };
    return map[getSetting("speed")] ?? 8;
  }

  // js/progress.js
  var STORAGE_KEY = "ls-progress";
  function freshProgress() {
    return {
      A: { status: "new", seen: 0, firstTryOk: 0, recent: [] },
      B: { status: "new", seen: 0, firstTryOk: 0, recent: [] },
      C: { status: "new", seen: 0, firstTryOk: 0, recent: [] },
      D: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      E: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      F: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      G: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      H: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      I: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      J: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      K: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      L: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      M: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      N: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      O: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      P: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      Q: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      R: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      S: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      T: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      U: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      V: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      W: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      X: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      Y: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] },
      Z: { status: "unopened", seen: 0, firstTryOk: 0, recent: [] }
    };
  }
  function loadProgress() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? { ...freshProgress(), ...JSON.parse(raw) } : freshProgress();
    } catch {
      return freshProgress();
    }
  }
  function saveProgress(data) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  }
  function recordAttempt(letter, firstTry) {
    const prog = loadProgress();
    const entry = prog[letter];
    if (!entry) return prog;
    entry.seen++;
    if (firstTry) entry.firstTryOk++;
    entry.recent.push(firstTry ? 1 : 0);
    if (entry.recent.length > 10) entry.recent.shift();
    if (entry.seen === 1) {
      entry.status = "new";
    } else if (entry.recent.length >= 10) {
      const ok = entry.recent.reduce((a, b) => a + b, 0);
      entry.status = ok >= 6 ? "mastered" : "practice";
    } else {
      entry.status = "practice";
    }
    saveProgress(prog);
    return prog;
  }
  function masteredCount(prog) {
    return Object.values(prog).filter((e) => e.status === "mastered").length;
  }

  // js/curriculum.js
  var UNITS = {
    U1: { newLetters: ["A", "B", "C"], reviewLetters: [], step: 1 },
    U2: { newLetters: ["E", "F", "S"], reviewLetters: ["A"], step: 1 },
    U3: { newLetters: ["I", "O", "T"], reviewLetters: ["B"], step: 1 },
    U4: { newLetters: ["M", "P", "H"], reviewLetters: ["E"], step: 1 },
    U5: { newLetters: ["D", "G", "U"], reviewLetters: ["A"], step: 1 },
    U6: { newLetters: ["L", "R", "N"], reviewLetters: ["T"], step: 1 },
    U7: { newLetters: ["J", "K", "W"], reviewLetters: ["S"], step: 1 },
    U8: { newLetters: ["V", "X", "Q"], reviewLetters: ["P"], step: 1 },
    U9: { newLetters: ["Y", "Z"], reviewLetters: [], step: 1 },
    U10: { newLetters: [], reviewLetters: [], step: 1 }
    // mixed review
  };
  var ROBOT_MILESTONES = [9, 18, 26];
  var TOTAL_ROBOTS = ROBOT_MILESTONES.length + 1;
  function currentRobotIndex(masteredCount2) {
    let idx = 0;
    for (const m of ROBOT_MILESTONES) {
      if (masteredCount2 >= m) idx++;
    }
    return idx;
  }
  function activeLetters(unitKey) {
    const unit = UNITS[unitKey];
    if (!unit) return ["A", "B", "C"];
    const all = [...unit.newLetters];
    if (unit.reviewLetters.length && all.length < 3) {
      all.push(...unit.reviewLetters.slice(0, 3 - all.length));
    }
    return all.slice(0, 6);
  }

  // js/i18n.js
  function setLang(lang) {
    localStorage.setItem("ls-lang", lang);
  }

  // js/game.js
  window.LetterShooter = {
    startGame,
    handleKey,
    openSettings,
    closeSettings,
    applySettings,
    renderTouchKeys,
    speakLetter,
    shoot,
    flashSuccess,
    shakeLetter,
    showLetter,
    updateScore,
    drawRobot,
    loadSettings,
    fallDuration,
    setLang,
    openProgressPanel,
    closeProgressPanel,
    highlightKey,
    clearHighlight
  };
  var score = 0;
  var currentLetter = null;
  var touchKeys = [];
  var gameRunning = false;
  var animFrame = null;
  var toastTimer = null;
  var toastQueue = [];
  function getEls() {
    return {
      letter: document.getElementById("js-letter"),
      robot: document.getElementById("js-robot"),
      bullet: document.getElementById("js-bullet"),
      scoreEl: document.getElementById("js-score"),
      unitEl: document.getElementById("js-unit"),
      robotWrap: document.getElementById("js-robot-wrap"),
      flashEl: document.getElementById("js-flash")
    };
  }
  function pickLetter(keys) {
    return keys[Math.floor(Math.random() * keys.length)];
  }
  function updateScore() {
    const { scoreEl } = getEls();
    if (!scoreEl) return;
    scoreEl.textContent = score;
    scoreEl.classList.remove("pop");
    void scoreEl.offsetWidth;
    scoreEl.classList.add("pop");
    scoreEl.addEventListener("transitionend", () => scoreEl.classList.remove("pop"), { once: true });
  }
  function updateUnit(unitKey) {
    const { unitEl } = getEls();
    if (unitEl) unitEl.textContent = unitKey;
  }
  function speakLetter(letter) {
    const settings = loadSettings();
    if (!settings.voice) return;
    if (!("speechSynthesis" in window)) return;
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(letter.toUpperCase());
    u.lang = "en-US";
    u.rate = 0.9;
    window.speechSynthesis.speak(u);
  }
  function drawRobot(robotIdx = 0) {
    const { robotWrap } = getEls();
    if (!robotWrap) return;
    const palettes = [
      { body: "#1e3a5f", eye: "#4FC3F7", accent: "#4FC3F7", glow: "rgba(79,195,247,0.6)", bg: "#0d1f3c" },
      // blue
      { body: "#3d1f2f", eye: "#FF6B9D", accent: "#FF6B9D", glow: "rgba(255,107,157,0.6)", bg: "#1f0d1a" },
      // pink
      { body: "#1f3d2f", eye: "#69F0AE", accent: "#69F0AE", glow: "rgba(105,240,174,0.6)", bg: "#0d1f12" }
      // green
    ];
    const p = palettes[robotIdx % palettes.length];
    robotWrap.innerHTML = `
    <svg viewBox="0 0 80 90" width="80" height="90" aria-hidden="true"
         style="filter:drop-shadow(0 0 8px ${p.glow})">
      <!-- glow aura -->
      <ellipse cx="40" cy="75" rx="30" ry="6" fill="${p.glow}" opacity="0.2"/>
      <!-- antenna -->
      <line x1="40" y1="8" x2="40" y2="22" stroke="${p.accent}" stroke-width="3" stroke-linecap="round"/>
      <circle cx="40" cy="6" r="5" fill="${p.accent}" opacity="0.9"/>
      <!-- head -->
      <rect x="18" y="22" width="44" height="36" rx="10" fill="${p.body}" stroke="${p.accent}" stroke-width="1.5" opacity="0.9"/>
      <!-- eyes -->
      <circle cx="30" cy="36" r="7" fill="${p.eye}"/>
      <circle cx="50" cy="36" r="7" fill="${p.eye}"/>
      <circle cx="32" cy="34" r="2.5" fill="white"/>
      <circle cx="52" cy="34" r="2.5" fill="white"/>
      <!-- smile -->
      <path d="M 30 48 Q 40 55 50 48" stroke="${p.eye}" stroke-width="2" fill="none" stroke-linecap="round"/>
      <!-- body -->
      <rect x="22" y="60" width="36" height="22" rx="6" fill="${p.body}" stroke="${p.accent}" stroke-width="1.5" opacity="0.9"/>
      <!-- arms -->
      <rect x="6"  y="62" width="14" height="8" rx="4" fill="${p.body}" stroke="${p.accent}" stroke-width="1.5" opacity="0.9"/>
      <rect x="60" y="62" width="14" height="8" rx="4" fill="${p.body}" stroke="${p.accent}" stroke-width="1.5" opacity="0.9"/>
      <!-- legs -->
      <rect x="26" y="82" width="10" height="8" rx="3" fill="${p.body}" stroke="${p.accent}" stroke-width="1.5" opacity="0.9"/>
      <rect x="44" y="82" width="10" height="8" rx="3" fill="${p.body}" stroke="${p.accent}" stroke-width="1.5" opacity="0.9"/>
    </svg>`;
  }
  function shoot() {
    const { letter, bullet } = getEls();
    if (!letter || !bullet) return;
    const lv = letter.getBoundingClientRect();
    const bv = bullet.getBoundingClientRect();
    const bx = lv.left + lv.width / 2 - bv.left;
    const by = lv.top + lv.height / 2 - bv.top;
    bullet.style.transition = "none";
    bullet.style.opacity = "1";
    bullet.style.transform = "translate(0, 0)";
    void bullet.offsetWidth;
    bullet.style.transition = "transform 0.25s ease-in, opacity 0.25s ease-in";
    bullet.style.transform = `translate(${bx}px, ${by}px)`;
    setTimeout(() => {
      bullet.style.opacity = "0";
      bullet.style.transition = "none";
      bullet.style.transform = "translate(0, 0)";
    }, 300);
  }
  function flashSuccess() {
    const { flashEl } = getEls();
    if (!flashEl) return;
    flashEl.style.opacity = "1";
    setTimeout(() => {
      flashEl.style.opacity = "0";
    }, 200);
  }
  function shakeLetter() {
    const { letter } = getEls();
    if (!letter) return;
    letter.classList.remove("shake");
    void letter.offsetWidth;
    letter.classList.add("shake");
    setTimeout(() => letter.classList.remove("shake"), 400);
  }
  function showLetter(letter) {
    const { letter: el } = getEls();
    if (!el) return;
    el.textContent = letter.toUpperCase();
    el.style.opacity = "0";
    el.style.transform = "scale(0.7)";
    requestAnimationFrame(() => {
      el.style.transition = "opacity 0.3s, transform 0.3s";
      el.style.opacity = "1";
      el.style.transform = "scale(1)";
    });
    currentLetter = letter;
    compactKeys = getCompactKeys(letter);
    renderTouchKeys();
    highlightKey(letter);
  }
  var fallPaused = false;
  var letterArrived = false;
  function startFall(onArrive) {
    const settings = loadSettings();
    if (settings.level !== "L1") return;
    const { letter: letterEl } = getEls();
    if (!letterEl) return;
    const { robotWrap } = getEls();
    if (!robotWrap) return;
    const duration = fallDuration() * 1e3;
    const robotY = robotWrap.getBoundingClientRect().top;
    const startY = letterEl.getBoundingClientRect().top;
    const maxFall = robotY - startY - letterEl.offsetHeight;
    letterArrived = false;
    fallPaused = false;
    letterEl.style.transition = "none";
    letterEl.style.transform = "translateY(0)";
    const startMs = performance.now();
    function step(now) {
      if (!gameRunning) return;
      if (fallPaused) {
        animFrame = requestAnimationFrame(step);
        return;
      }
      const elapsed = now - startMs;
      const progress = Math.min(elapsed / duration, 1);
      const dy = maxFall * progress;
      letterEl.style.transform = `translateY(${dy}px)`;
      if (progress < 1) {
        animFrame = requestAnimationFrame(step);
      } else {
        letterArrived = true;
        letterEl.style.filter = "drop-shadow(0 0 8px #FFD54F)";
        onArrive();
      }
    }
    animFrame = requestAnimationFrame(step);
  }
  function startGame(unitKey = "U1", level = "L0") {
    gameRunning = true;
    score = 0;
    touchKeys = activeLetters(unitKey);
    const prog = loadProgress();
    const robotIdx = currentRobotIndex(masteredCount(prog));
    updateUnit(unitKey);
    updateScore();
    drawRobot(robotIdx);
    renderTouchKeys();
    nextTurn(level, touchKeys);
  }
  function stopGame() {
    gameRunning = false;
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
  }
  var paused = false;
  function togglePause() {
    if (!gameRunning) return;
    paused = !paused;
    const btn = document.getElementById("js-pause-btn");
    if (btn) btn.textContent = paused ? "\u25B6" : "\u23F8";
    const bottomBar = document.querySelector(".bottom-bar");
    const hint = document.getElementById("js-kb-hint");
    if (paused) {
      if (animFrame) {
        cancelAnimationFrame(animFrame);
        animFrame = null;
      }
      bottomBar?.classList.add("paused");
      if (hint) {
        hint.textContent = "\u23F8 \u5DF2\u66AB\u505C";
        hint.classList.add("has-hint");
      }
    } else {
      bottomBar?.classList.remove("paused");
      if (hint && currentLetter) {
        hint.textContent = "";
        hint.classList.remove("has-hint");
        highlightKey(currentLetter);
      }
    }
  }
  function nextTurn(level, keys) {
    if (!gameRunning) return;
    const { letter: letterEl } = getEls();
    if (letterEl) letterEl.style.filter = "";
    const letter = pickLetter(keys);
    showLetter(letter);
    speakLetter(letter);
    if (level === "L1") {
      startFall(() => {
      });
    }
  }
  function handleKey(pressed) {
    if (!gameRunning || !currentLetter) return;
    const expected = currentLetter.toUpperCase();
    if (pressed === expected) {
      shoot();
      flashSuccess();
      score++;
      updateScore();
      clearHighlight();
      letterArrived = false;
      const { letter: letterEl } = getEls();
      if (letterEl) letterEl.style.filter = "";
      const prog = recordAttempt(currentLetter.toUpperCase(), true);
      const prevMastered = masteredCount(loadProgress()) - 1;
      const afterMastered = masteredCount(prog);
      if (afterMastered > prevMastered) {
        showRobotUnlock(afterMastered);
      }
      setTimeout(() => {
        if (gameRunning) nextTurn(loadSettings().level, touchKeys);
      }, 600);
    } else {
      recordAttempt(currentLetter.toUpperCase(), false);
      shakeLetter();
    }
  }
  var QWERTY_ROWS = [
    ["Q", "W", "E", "R", "T", "Y", "U", "I", "O", "P"],
    ["A", "S", "D", "F", "G", "H", "J", "K", "L"],
    ["Z", "X", "C", "V", "B", "N", "M"]
  ];
  var currentKbMode = "compact";
  var compactKeys = [];
  function getCompactKeys(targetLetter) {
    const all = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const target = targetLetter.toUpperCase();
    const others = all.filter((l) => l !== target);
    const shuffled = others.sort(() => Math.random() - 0.5).slice(0, 3);
    const keys = [target, ...shuffled].sort(() => Math.random() - 0.5);
    return keys;
  }
  function renderTouchKeys() {
    const container = document.getElementById("js-touch-keys");
    if (!container) return;
    container.innerHTML = "";
    const settings = loadSettings();
    const reduceMotion = settings.reduceMotion;
    currentKbMode = settings.kbMode || "compact";
    const hint = document.createElement("div");
    hint.className = "kb-hint";
    hint.id = "js-kb-hint";
    container.appendChild(hint);
    if (currentKbMode === "full") {
      QWERTY_ROWS.forEach((row) => {
        const rowEl = document.createElement("div");
        rowEl.className = "kb-row";
        row.forEach((letter) => {
          const btn = makeKeyBtn(letter, reduceMotion);
          rowEl.appendChild(btn);
        });
        container.appendChild(rowEl);
      });
    } else {
      const keys = compactKeys.length ? compactKeys : getCompactKeys("A");
      const row1 = keys.slice(0, 2);
      const row2 = keys.slice(2, 4);
      [row1, row2].forEach((row) => {
        const rowEl = document.createElement("div");
        rowEl.className = "kb-row";
        row.forEach((letter) => {
          const btn = makeKeyBtn(letter, reduceMotion);
          btn.style.minWidth = "72px";
          btn.style.height = "64px";
          btn.style.fontSize = "24px";
          rowEl.appendChild(btn);
        });
        container.appendChild(rowEl);
      });
    }
    if (currentLetter) highlightKey(currentLetter);
  }
  function makeKeyBtn(letter, reduceMotion) {
    const btn = document.createElement("button");
    btn.className = "kb-key";
    btn.textContent = letter;
    btn.setAttribute("data-letter", letter);
    btn.setAttribute("aria-label", `Letter ${letter}`);
    if (reduceMotion) btn.classList.add("no-motion");
    btn.addEventListener("click", () => handleKey(letter));
    return btn;
  }
  function highlightKey(letter) {
    const hint = document.getElementById("js-kb-hint");
    const settings = loadSettings();
    const lang = settings.lang;
    document.querySelectorAll(".kb-key").forEach((btn) => {
      const isTarget = btn.getAttribute("data-letter") === letter.toUpperCase();
      btn.classList.toggle("key-hint", isTarget);
    });
    if (hint) {
      hint.textContent = lang === "zh" ? `\u8ACB\u6309 ${letter.toUpperCase()}` : `Press ${letter.toUpperCase()}`;
      hint.classList.add("has-hint");
    }
  }
  function clearHighlight() {
    document.querySelectorAll(".kb-key").forEach((btn) => {
      btn.classList.remove("key-hint");
    });
    const hint = document.getElementById("js-kb-hint");
    if (hint) {
      hint.textContent = "";
      hint.classList.remove("has-hint");
    }
  }
  function showRobotUnlock(count) {
    const settings = loadSettings();
    const title = settings.lang === "zh" ? "\u{1F916} \u65B0\u6A5F\u68B0\u4EBA\u89E3\u9396\u4E86\uFF01" : "\u{1F916} New robot unlocked!";
    const body = settings.lang === "zh" ? `\u5DF2\u638C\u63E1 ${count} \u500B\u5B57\u6BCD` : `${count} letters mastered`;
    toastQueue.push({ title, body });
    if (!toastTimer) drainToast();
  }
  function drainToast() {
    if (toastQueue.length === 0) {
      toastTimer = null;
      return;
    }
    const { title, body } = toastQueue.shift();
    showToast(title, body);
    toastTimer = setTimeout(drainToast, 3500);
  }
  function showToast(title, body) {
    const toast = document.getElementById("js-toast");
    const toastTitle = document.getElementById("js-toast-title");
    const toastBody = document.getElementById("js-toast-body");
    if (!toast || !toastTitle || !toastBody) return;
    toast.classList.remove("visible");
    void toast.offsetWidth;
    toastTitle.textContent = title;
    toastBody.textContent = body;
    toast.classList.add("visible");
    setTimeout(() => toast.classList.remove("visible"), 3e3);
  }
  function openSettings() {
    const panel = document.getElementById("js-settings-panel");
    if (!panel) return;
    const settings = loadSettings();
    panel.querySelector("#js-voice-toggle").checked = settings.voice;
    panel.querySelector("#js-speed-select").value = settings.speed;
    panel.querySelector("#js-hc-toggle").checked = settings.highContrast;
    panel.querySelector("#js-motion-toggle").checked = settings.reduceMotion;
    panel.querySelector("#js-lang-select").value = settings.lang;
    panel.querySelector("#js-unit-select").value = settings.currentUnit;
    panel.querySelector("#js-level-select").value = settings.level;
    panel.querySelector("#js-kb-mode-select").value = settings.kbMode || "compact";
    panel.classList.add("visible");
  }
  function closeSettings() {
    const panel = document.getElementById("js-settings-panel");
    if (panel) panel.classList.remove("visible");
  }
  function applySettings() {
    const panel = document.getElementById("js-settings-panel");
    if (!panel) return;
    const voice = panel.querySelector("#js-voice-toggle")?.checked ?? true;
    const speed = panel.querySelector("#js-speed-select")?.value ?? "slow";
    const hc = panel.querySelector("#js-hc-toggle")?.checked ?? false;
    const motion = panel.querySelector("#js-motion-toggle")?.checked ?? false;
    const lang = panel.querySelector("#js-lang-select")?.value ?? "zh";
    const unit = panel.querySelector("#js-unit-select")?.value ?? "U1";
    const level = panel.querySelector("#js-level-select")?.value ?? "L0";
    const kbMode = panel.querySelector("#js-kb-mode-select")?.value ?? "compact";
    const next = { voice, speed, highContrast: hc, reduceMotion: motion, lang, currentUnit: unit, level, kbMode };
    document.body.classList.toggle("high-contrast", hc);
    saveSettings(next);
    closeSettings();
    if (gameRunning) {
      renderTouchKeys();
      if (currentLetter) highlightKey(currentLetter);
    }
  }
  function openProgressPanel() {
    const panel = document.getElementById("js-progress-panel");
    if (!panel) return;
    renderProgressGrid();
    panel.removeAttribute("hidden");
  }
  function closeProgressPanel() {
    const panel = document.getElementById("js-progress-panel");
    if (panel) panel.setAttribute("hidden", "");
  }
  function renderProgressGrid() {
    const grid = document.getElementById("js-progress-grid");
    const title = document.getElementById("js-progress-title");
    if (!grid) return;
    const settings = loadSettings();
    const prog = loadProgress();
    const lang = settings.lang;
    if (title) {
      title.textContent = lang === "zh" ? "\u5B57\u6BCD\u9032\u5EA6" : "Letter Progress";
    }
    const legend = document.getElementById("js-progress-legend");
    if (legend) {
      legend.innerHTML = `
      <span class="legend-item"><span class="legend-dot dot-unopened"></span>${lang === "zh" ? "\u672A\u958B\u59CB" : "Unopened"}</span>
      <span class="legend-item"><span class="legend-dot dot-new"></span>${lang === "zh" ? "\u65B0\u5B78" : "New"}</span>
      <span class="legend-item"><span class="legend-dot dot-practice"></span>${lang === "zh" ? "\u7DF4\u7FD2\u4E2D" : "Practice"}</span>
      <span class="legend-item"><span class="legend-dot dot-mastered"></span>${lang === "zh" ? "\u5DF2\u638C\u63E1" : "Mastered"}</span>
    `;
    }
    grid.innerHTML = "";
    const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");
    const statusLabel = {
      unopened: lang === "zh" ? "\u672A\u958B\u59CB" : "Unopened",
      new: lang === "zh" ? "\u65B0\u5B78" : "New",
      practice: lang === "zh" ? "\u7DF4\u7FD2\u4E2D" : "Practice",
      mastered: lang === "zh" ? "\u5DF2\u638C\u63E1" : "Mastered"
    };
    ALPHABET.forEach((letter) => {
      const entry = prog[letter] || { status: "unopened" };
      const cell = document.createElement("div");
      cell.className = `progress-cell st-${entry.status}`;
      cell.setAttribute("role", "img");
      cell.setAttribute("aria-label", `${letter}: ${statusLabel[entry.status] || entry.status}`);
      cell.innerHTML = `
      <span>${letter}</span>
      <span class="cell-label">${statusLabel[entry.status] || entry.status}</span>
    `;
      grid.appendChild(cell);
    });
  }
})();
