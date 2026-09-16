(() => {
  // js/settings.js
  var DEFAULTS = {
    voice: true,
    // TTS on/off
    soundFx: true,
    // SFX chime / streak / unlock sounds
    bgm: false,
    // Background music (default OFF — SEN overstimulation safety)
    bgmTrack: "space",
    // 'space' | 'xylophone' | 'rain' — only used when bgm=true
    theme: "space",
    // 'space' | 'candy'
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
  var i18n = {
    en: {
      score: "Score",
      settings: "Settings",
      unit: "Unit",
      voice: "Voice",
      soundFx: "Sound Effects",
      bgm: "Background Music",
      bgmOff: "Off",
      bgmSpace: "Space",
      bgmXylophone: "Xylophone",
      bgmRain: "Rain",
      on: "On",
      off: "Off",
      speed: "Speed",
      verySlow: "Very Slow",
      slow: "Slow",
      medium: "Medium",
      highContrast: "High Contrast",
      reduceMotion: "Reduce Motion",
      close: "Close",
      start: "Start",
      next: "Next",
      mastered: "Mastered",
      practice: "Practice",
      newLetter: "New",
      streak: "Streak",
      theme: "Theme",
      themeSpace: "Space",
      themeCandy: "Candy",
      robotUnlock: "New robot unlocked!",
      // Praise phrases (random pick on correct)
      praise: ["Great!", "Yes!", "Wonderful!", "Awesome!", "Nice!"],
      // Wrong-answer gentle nudge (no fail language)
      nudge: ["Try once more!", "Almost! Keep going!", "You can do it!"]
    },
    zh: {
      score: "\u5206\u6578",
      settings: "\u8A2D\u5B9A",
      unit: "\u55AE\u5143",
      voice: "\u8A9E\u97F3",
      soundFx: "\u97F3\u6548",
      bgm: "\u80CC\u666F\u97F3\u6A02",
      bgmOff: "\u95DC",
      bgmSpace: "\u592A\u7A7A",
      bgmXylophone: "\u6728\u7434",
      bgmRain: "\u96E8\u8072",
      on: "\u958B",
      off: "\u95DC",
      speed: "\u901F\u5EA6",
      verySlow: "\u5F88\u6162",
      slow: "\u6162",
      medium: "\u4E2D",
      highContrast: "\u9AD8\u5C0D\u6BD4",
      reduceMotion: "\u6E1B\u52D5\u756B",
      close: "\u95DC",
      start: "\u958B\u59CB",
      next: "\u4E0B\u4E00\u984C",
      mastered: "\u5DF2\u638C\u63E1",
      practice: "\u7DF4\u7FD2\u4E2D",
      newLetter: "\u65B0\u5B78",
      streak: "\u9023\u5C0D",
      theme: "\u4E3B\u984C",
      themeSpace: "\u592A\u7A7A",
      themeCandy: "\u7CD6\u679C",
      robotUnlock: "\u65B0\u6A5F\u68B0\u4EBA\u89E3\u9396\u4E86\uFF01",
      praise: ["\u505A\u5F97\u597D\uFF01", "\u5F88\u597D\uFF01", "\u592A\u68D2\u4E86\uFF01", "\u597D\u53FB\uFF01", "\u7E7C\u7E8C\uFF01"],
      nudge: ["\u518D\u8A66\u4E00\u6B21\uFF01", "\u5DEE\u5C11\u5C11\uFF01", "\u52A0\u6CB9\uFF01"]
    }
  };
  function getLang() {
    return localStorage.getItem("ls-lang") || "zh";
  }
  function pickT(key) {
    const lang = getLang();
    const arr = i18n[lang]?.[key] ?? i18n["zh"][key];
    if (!Array.isArray(arr) || arr.length === 0) return key;
    return arr[Math.floor(Math.random() * arr.length)];
  }
  function setLang(lang) {
    localStorage.setItem("ls-lang", lang);
  }

  // js/sfx.js
  var ctx = null;
  var masterGain = null;
  function ensureCtx() {
    if (ctx) return ctx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    masterGain = ctx.createGain();
    masterGain.gain.value = 0.35;
    masterGain.connect(ctx.destination);
    return ctx;
  }
  function unlockAudio() {
    ensureCtx();
    if (ctx && ctx.state === "suspended") ctx.resume();
  }
  function envelope(node, attack, decay, peak = 1) {
    const t2 = ctx.currentTime;
    node.gain.cancelScheduledValues(t2);
    node.gain.setValueAtTime(0, t2);
    node.gain.linearRampToValueAtTime(peak, t2 + attack);
    node.gain.exponentialRampToValueAtTime(1e-4, t2 + attack + decay);
  }
  function tone(freq, duration, type = "sine", vol = 0.3) {
    if (!ensureCtx()) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.connect(g);
    g.connect(masterGain);
    envelope(g, 0.01, duration, vol);
    osc.start();
    osc.stop(ctx.currentTime + duration + 0.05);
  }
  function playCorrect() {
    if (!ensureCtx()) return;
    const notes = [523.25, 659.25, 783.99];
    notes.forEach((f, i) => {
      setTimeout(() => tone(f, 0.18, "sine", 0.32), i * 70);
    });
  }
  function playWrong() {
    if (!ensureCtx()) return;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = "triangle";
    osc.frequency.setValueAtTime(330, ctx.currentTime);
    osc.frequency.linearRampToValueAtTime(262, ctx.currentTime + 0.25);
    osc.connect(g);
    g.connect(masterGain);
    envelope(g, 0.02, 0.3, 0.18);
    osc.start();
    osc.stop(ctx.currentTime + 0.4);
  }
  function playStreak(n) {
    if (!ensureCtx()) return;
    const chords = {
      3: [523.25, 659.25, 783.99, 1046.5],
      // C major
      5: [523.25, 659.25, 783.99, 1046.5, 1318.5],
      // C major + high C
      10: [523.25, 659.25, 783.99, 987.77, 1318.5, 1567.98]
      // wide chord
    };
    const chord = chords[n] || chords[3];
    chord.forEach((f, i) => {
      setTimeout(() => tone(f, 0.4, i % 2 ? "triangle" : "sine", 0.18), i * 50);
    });
  }
  function playUnlock() {
    if (!ensureCtx()) return;
    const seq = [392, 523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => {
      setTimeout(() => tone(f, 0.25, "triangle", 0.28), i * 90);
    });
  }

  // js/fx.js
  var flashTimer = null;
  var trailTimer = null;
  function confettiBurst(originX, originY, opts = {}) {
    const container = document.getElementById("js-confetti-layer");
    if (!container) return;
    const count = opts.count || 32;
    const colors = opts.colors || [
      "#4FC3F7",
      "#FF6B9D",
      "#FFD54F",
      "#69F0AE",
      "#CE93D8",
      "#FF8A65",
      "#80DEEA",
      "#F48FB1"
    ];
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = originX + "px";
      piece.style.top = originY + "px";
      piece.style.background = colors[i % colors.length];
      const shape = i % 3;
      if (shape === 0) {
        piece.style.borderRadius = "50%";
        piece.style.width = "8px";
        piece.style.height = "8px";
      } else if (shape === 1) {
        piece.style.width = "6px";
        piece.style.height = "12px";
      } else {
        piece.style.width = "4px";
        piece.style.height = "14px";
        piece.style.borderRadius = "2px";
      }
      const angle = Math.PI * 2 * i / count + (Math.random() - 0.5) * 0.5;
      const dist = 80 + Math.random() * 140;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist - 60;
      const rot = (Math.random() - 0.5) * 720;
      piece.style.setProperty("--dx", dx + "px");
      piece.style.setProperty("--dy", dy + "px");
      piece.style.setProperty("--rot", rot + "deg");
      piece.style.animationDuration = 0.9 + Math.random() * 0.5 + "s";
      container.appendChild(piece);
      piece.addEventListener("animationend", () => piece.remove(), { once: true });
    }
  }
  function streakFlash(intensity = "normal") {
    const flash = document.getElementById("js-streak-flash");
    if (!flash) return;
    flash.classList.remove("flash-go");
    flash.classList.remove("flash-big");
    void flash.offsetWidth;
    flash.classList.add("flash-go");
    if (intensity === "big") flash.classList.add("flash-big");
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      flash.classList.remove("flash-go");
      flash.classList.remove("flash-big");
    }, 600);
  }
  function startLetterTrail(getPosition) {
    stopLetterTrail();
    const layer = document.getElementById("js-trail-layer");
    if (!layer) return;
    trailTimer = setInterval(() => {
      const pos = getPosition();
      if (!pos) return;
      const sparkle = document.createElement("div");
      sparkle.className = "trail-sparkle";
      sparkle.style.left = pos.x + (Math.random() - 0.5) * 30 + "px";
      sparkle.style.top = pos.y + (Math.random() - 0.5) * 20 + "px";
      const colors = ["#FFD54F", "#FF6B9D", "#4FC3F7", "#69F0AE"];
      sparkle.style.background = colors[Math.floor(Math.random() * colors.length)];
      sparkle.style.width = 4 + Math.random() * 6 + "px";
      sparkle.style.height = sparkle.style.width;
      layer.appendChild(sparkle);
      sparkle.addEventListener("animationend", () => sparkle.remove(), { once: true });
    }, 80);
  }
  function stopLetterTrail() {
    if (trailTimer) {
      clearInterval(trailTimer);
      trailTimer = null;
    }
  }

  // js/bgm.js
  var bgmCtx = null;
  var bgmMaster = null;
  var activeNodes = [];
  var loopTimers = [];
  var isPlaying = false;
  var currentTrack = null;
  var BASE_VOL = 0.18;
  function ensureCtx2() {
    if (bgmCtx) return bgmCtx;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    bgmCtx = new AC();
    bgmMaster = bgmCtx.createGain();
    bgmMaster.gain.value = 0;
    bgmMaster.connect(bgmCtx.destination);
    return bgmCtx;
  }
  function unlockBgm() {
    ensureCtx2();
    if (bgmCtx && bgmCtx.state === "suspended") bgmCtx.resume();
  }
  function tearDown() {
    loopTimers.forEach((id) => clearInterval(id));
    loopTimers = [];
    activeNodes.forEach((n) => {
      try {
        if (n.stop) n.stop();
        if (n.disconnect) n.disconnect();
      } catch {
      }
    });
    activeNodes = [];
  }
  function startBgm(trackName) {
    if (!ensureCtx2()) return;
    if (!trackName || trackName === "off") {
      stopBgm();
      return;
    }
    if (bgmCtx.state === "suspended") bgmCtx.resume();
    tearDown();
    currentTrack = trackName;
    isPlaying = true;
    bgmMaster.gain.cancelScheduledValues(bgmCtx.currentTime);
    bgmMaster.gain.setValueAtTime(bgmMaster.gain.value, bgmCtx.currentTime);
    bgmMaster.gain.linearRampToValueAtTime(BASE_VOL, bgmCtx.currentTime + 1.5);
    if (trackName === "space") startSpace();
    else if (trackName === "xylophone") startXylophone();
    else if (trackName === "rain") startRain();
  }
  function stopBgm() {
    if (!bgmCtx || !bgmMaster) {
      isPlaying = false;
      return;
    }
    bgmMaster.gain.cancelScheduledValues(bgmCtx.currentTime);
    bgmMaster.gain.setValueAtTime(bgmMaster.gain.value, bgmCtx.currentTime);
    bgmMaster.gain.linearRampToValueAtTime(0, bgmCtx.currentTime + 0.4);
    isPlaying = false;
    currentTrack = null;
    setTimeout(tearDown, 500);
  }
  function pauseBgm() {
    if (!bgmCtx || !bgmMaster || !isPlaying) return;
    bgmMaster.gain.cancelScheduledValues(bgmCtx.currentTime);
    bgmMaster.gain.setValueAtTime(bgmMaster.gain.value, bgmCtx.currentTime);
    bgmMaster.gain.linearRampToValueAtTime(0, bgmCtx.currentTime + 0.25);
  }
  function resumeBgm() {
    if (!bgmCtx || !bgmMaster || !isPlaying || !currentTrack) return;
    if (bgmCtx.state === "suspended") bgmCtx.resume();
    bgmMaster.gain.cancelScheduledValues(bgmCtx.currentTime);
    bgmMaster.gain.setValueAtTime(bgmMaster.gain.value, bgmCtx.currentTime);
    bgmMaster.gain.linearRampToValueAtTime(BASE_VOL, bgmCtx.currentTime + 0.4);
  }
  function startSpace() {
    const t2 = bgmCtx.currentTime;
    const notes = [130.81, 196, 261.63];
    notes.forEach((freq, i) => {
      const osc = bgmCtx.createOscillator();
      const g = bgmCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      const lfo = bgmCtx.createOscillator();
      const lfoGain = bgmCtx.createGain();
      lfo.frequency.value = 0.15 + i * 0.05;
      lfoGain.gain.value = 0.04;
      lfo.connect(lfoGain);
      lfoGain.connect(g.gain);
      g.gain.value = 0.2 / notes.length;
      osc.connect(g);
      g.connect(bgmMaster);
      osc.start(t2);
      lfo.start(t2);
      activeNodes.push(osc, lfo, g, lfoGain);
    });
  }
  function startXylophone() {
    const scale = [
      261.63,
      293.66,
      329.63,
      392,
      440,
      523.25,
      587.33,
      659.25,
      783.99,
      880
    ];
    let idx = 0;
    const playNote = () => {
      const t2 = bgmCtx.currentTime;
      const freq = scale[idx % scale.length];
      idx++;
      const osc = bgmCtx.createOscillator();
      const g = bgmCtx.createGain();
      osc.type = "sine";
      osc.frequency.value = freq;
      g.gain.setValueAtTime(0, t2);
      g.gain.linearRampToValueAtTime(0.25, t2 + 0.01);
      g.gain.exponentialRampToValueAtTime(1e-3, t2 + 1.2);
      osc.connect(g);
      g.connect(bgmMaster);
      osc.start(t2);
      osc.stop(t2 + 1.3);
      setTimeout(() => {
        try {
          osc.disconnect();
          g.disconnect();
        } catch {
        }
      }, 1500);
    };
    playNote();
    const id = setInterval(playNote, 2500);
    loopTimers.push(id);
  }
  function startRain() {
    const t2 = bgmCtx.currentTime;
    const bufferSize = 2 * bgmCtx.sampleRate;
    const buffer = bgmCtx.createBuffer(1, bufferSize, bgmCtx.sampleRate);
    const data = buffer.getChannelData(0);
    let last = 0;
    for (let i = 0; i < bufferSize; i++) {
      last = last + (Math.random() - 0.5) * 0.05;
      last = Math.max(-1, Math.min(1, last * 0.99));
      data[i] = last * 0.5;
    }
    const source = bgmCtx.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    const bandpass = bgmCtx.createBiquadFilter();
    bandpass.type = "bandpass";
    bandpass.frequency.value = 1400;
    bandpass.Q.value = 0.6;
    const g = bgmCtx.createGain();
    g.gain.value = 1.2;
    const lfo = bgmCtx.createOscillator();
    const lfoGain = bgmCtx.createGain();
    lfo.frequency.value = 0.08;
    lfoGain.gain.value = 0.3;
    lfo.connect(lfoGain);
    lfoGain.connect(g.gain);
    source.connect(bandpass);
    bandpass.connect(g);
    g.connect(bgmMaster);
    source.start(t2);
    lfo.start(t2);
    activeNodes.push(source, bandpass, g, lfo, lfoGain);
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
    unlockAudio,
    unlockBgm,
    openProgressPanel,
    closeProgressPanel,
    highlightKey,
    clearHighlight
  };
  var score = 0;
  var streak = 0;
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
  function updateStreak(n) {
    const el = document.getElementById("js-streak");
    if (!el) return;
    el.textContent = "\xD7" + n;
    el.classList.toggle("zero", n === 0);
    if (n > 0) {
      el.classList.remove("pop");
      void el.offsetWidth;
      el.classList.add("pop");
    } else {
      el.classList.remove("pop");
    }
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
  var ROBOT_PALETTES = {
    space: [
      { body: "#1e3a5f", eye: "#4FC3F7", accent: "#4FC3F7", glow: "rgba(79,195,247,0.6)" },
      { body: "#3d1f2f", eye: "#FF6B9D", accent: "#FF6B9D", glow: "rgba(255,107,157,0.6)" },
      { body: "#1f3d2f", eye: "#69F0AE", accent: "#69F0AE", glow: "rgba(105,240,174,0.6)" }
    ],
    candy: [
      { body: "#FFFFFF", eye: "#FF6B9D", accent: "#FF6B9D", glow: "rgba(255,107,157,0.5)" },
      { body: "#FFFFFF", eye: "#FFD54F", accent: "#FFD54F", glow: "rgba(255,213,79,0.5)" },
      { body: "#FFFFFF", eye: "#B388FF", accent: "#B388FF", glow: "rgba(179,136,255,0.5)" }
    ]
  };
  function drawRobot(robotIdx = 0) {
    const { robotWrap } = getEls();
    if (!robotWrap) return;
    const theme = loadSettings().theme || "space";
    const palettes = ROBOT_PALETTES[theme] || ROBOT_PALETTES.space;
    const p = palettes[robotIdx % palettes.length];
    robotWrap.innerHTML = `
    <svg viewBox="0 0 120 130" width="120" height="130" aria-hidden="true"
         style="filter:drop-shadow(0 0 12px ${p.glow})">
      <!-- glow aura -->
      <ellipse cx="60" cy="115" rx="42" ry="8" fill="${p.glow}" opacity="0.25"/>
      <!-- antenna with bobble -->
      <g class="robot-antenna">
        <line x1="60" y1="14" x2="60" y2="34" stroke="${p.accent}" stroke-width="4" stroke-linecap="round"/>
        <circle cx="60" cy="10" r="7" fill="${p.accent}" opacity="0.95"/>
        <circle cx="58" cy="8" r="2" fill="white" opacity="0.8"/>
      </g>
      <!-- head -->
      <rect x="22" y="34" width="76" height="56" rx="14" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      <!-- cheek blush -->
      <circle cx="30" cy="62" r="6" fill="${p.accent}" opacity="0.3"/>
      <circle cx="90" cy="62" r="6" fill="${p.accent}" opacity="0.3"/>
      <!-- eyes (large, expressive) -->
      <g class="robot-eyes">
        <circle cx="44" cy="56" r="10" fill="white"/>
        <circle cx="76" cy="56" r="10" fill="white"/>
        <circle cx="44" cy="58" r="7" fill="${p.eye}"/>
        <circle cx="76" cy="58" r="7" fill="${p.eye}"/>
        <circle cx="46" cy="55" r="2.5" fill="white"/>
        <circle cx="78" cy="55" r="2.5" fill="white"/>
      </g>
      <!-- smile -->
      <path d="M 44 74 Q 60 84 76 74" stroke="${p.eye}" stroke-width="3" fill="none" stroke-linecap="round"/>
      <!-- body -->
      <rect x="32" y="92" width="56" height="26" rx="8" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      <!-- chest light -->
      <circle cx="60" cy="105" r="4" fill="${p.accent}" opacity="0.9"/>
      <!-- arms with hands -->
      <g class="robot-arm-l">
        <rect x="10" y="96" width="18" height="10" rx="5" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
        <circle cx="8" cy="101" r="6" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      </g>
      <g class="robot-arm-r">
        <rect x="92" y="96" width="18" height="10" rx="5" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
        <circle cx="112" cy="101" r="6" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      </g>
      <!-- legs -->
      <rect x="40" y="120" width="14" height="10" rx="4" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
      <rect x="66" y="120" width="14" height="10" rx="4" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.95"/>
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
    startLetterTrail(() => {
      const r = letterEl.getBoundingClientRect();
      return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
    });
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
        stopLetterTrail();
        letterEl.style.filter = "drop-shadow(0 0 8px #FFD54F)";
        onArrive();
      }
    }
    animFrame = requestAnimationFrame(step);
  }
  function startGame(unitKey = "U1", level = "L0") {
    gameRunning = true;
    score = 0;
    streak = 0;
    touchKeys = activeLetters(unitKey);
    const prog = loadProgress();
    const robotIdx = currentRobotIndex(masteredCount(prog));
    updateUnit(unitKey);
    updateScore();
    updateStreak(0);
    drawRobot(robotIdx);
    renderTouchKeys();
    nextTurn(level, touchKeys);
    const settings = loadSettings();
    if (settings.bgm) startBgm(settings.bgmTrack || "space");
  }
  function stopGame() {
    gameRunning = false;
    if (animFrame) {
      cancelAnimationFrame(animFrame);
      animFrame = null;
    }
    stopBgm();
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
      pauseBgm();
      if (hint) {
        hint.textContent = "\u23F8 \u5DF2\u66AB\u505C";
        hint.classList.add("has-hint");
      }
    } else {
      bottomBar?.classList.remove("paused");
      resumeBgm();
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
    const settings = loadSettings();
    if (pressed === expected) {
      shoot();
      flashSuccess();
      score++;
      updateScore();
      clearHighlight();
      const letterBox = document.getElementById("js-letter")?.getBoundingClientRect();
      if (letterBox) {
        confettiBurst(letterBox.left + letterBox.width / 2, letterBox.top + letterBox.height / 2);
      }
      streak++;
      updateStreak(streak);
      celebrateRobot();
      if (settings.soundFx) playCorrect();
      if (streak === 3 || streak === 5 || streak === 10) {
        if (settings.soundFx) playStreak(streak);
        streakFlash(streak >= 5 ? "big" : "normal");
      }
      letterArrived = false;
      const { letter: letterEl } = getEls();
      if (letterEl) letterEl.style.filter = "";
      stopLetterTrail();
      const prog = recordAttempt(currentLetter.toUpperCase(), true);
      const prevMastered = masteredCount(loadProgress()) - 1;
      const afterMastered = masteredCount(prog);
      if (afterMastered > prevMastered) {
        if (settings.soundFx) playUnlock();
        streakFlash("big");
        showRobotUnlock(afterMastered);
      }
      if (settings.voice && streak >= 1) {
        speakPraise();
      }
      setTimeout(() => {
        if (gameRunning) nextTurn(loadSettings().level, touchKeys);
      }, 600);
    } else {
      streak = 0;
      updateStreak(0);
      recordAttempt(currentLetter.toUpperCase(), false);
      shakeLetter();
      if (settings.soundFx) playWrong();
      if (settings.voice) speakNudge();
    }
  }
  function speakPraise() {
    if (!("speechSynthesis" in window)) return;
    const phrase = pickT("praise");
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = loadSettings().lang === "zh" ? "zh-HK" : "en-US";
    u.rate = 1.05;
    u.volume = 0.85;
    window.speechSynthesis.speak(u);
  }
  function speakNudge() {
    if (!("speechSynthesis" in window)) return;
    const phrase = pickT("nudge");
    window.speechSynthesis.cancel();
    const u = new SpeechSynthesisUtterance(phrase);
    u.lang = loadSettings().lang === "zh" ? "zh-HK" : "en-US";
    u.rate = 1;
    u.volume = 0.7;
    window.speechSynthesis.speak(u);
  }
  function celebrateRobot() {
    const wrap = document.getElementById("js-robot-wrap");
    if (!wrap) return;
    wrap.classList.remove("celebrate");
    void wrap.offsetWidth;
    wrap.classList.add("celebrate");
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
  function applyTheme(theme) {
    document.body.setAttribute("data-theme", theme || "space");
  }
  applyTheme(loadSettings().theme);
  function openSettings() {
    const panel = document.getElementById("js-settings-panel");
    if (!panel) return;
    const settings = loadSettings();
    panel.querySelector("#js-voice-toggle").checked = settings.voice;
    panel.querySelector("#js-sfx-toggle").checked = settings.soundFx;
    panel.querySelector("#js-bgm-select").value = settings.bgm ? settings.bgmTrack || "space" : "off";
    panel.querySelector("#js-speed-select").value = settings.speed;
    panel.querySelector("#js-hc-toggle").checked = settings.highContrast;
    panel.querySelector("#js-motion-toggle").checked = settings.reduceMotion;
    panel.querySelector("#js-lang-select").value = settings.lang;
    panel.querySelector("#js-unit-select").value = settings.currentUnit;
    panel.querySelector("#js-level-select").value = settings.level;
    panel.querySelector("#js-kb-mode-select").value = settings.kbMode || "compact";
    panel.querySelector("#js-theme-select").value = settings.theme || "space";
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
    const sfx = panel.querySelector("#js-sfx-toggle")?.checked ?? true;
    const bgmSel = panel.querySelector("#js-bgm-select")?.value ?? "off";
    const bgm = bgmSel !== "off";
    const bgmTrack = bgmSel === "off" ? loadSettings().bgmTrack || "space" : bgmSel;
    const speed = panel.querySelector("#js-speed-select")?.value ?? "slow";
    const hc = panel.querySelector("#js-hc-toggle")?.checked ?? false;
    const motion = panel.querySelector("#js-motion-toggle")?.checked ?? false;
    const lang = panel.querySelector("#js-lang-select")?.value ?? "zh";
    const unit = panel.querySelector("#js-unit-select")?.value ?? "U1";
    const level = panel.querySelector("#js-level-select")?.value ?? "L0";
    const kbMode = panel.querySelector("#js-kb-mode-select")?.value ?? "compact";
    const theme = panel.querySelector("#js-theme-select")?.value ?? "space";
    const next = { voice, soundFx: sfx, bgm, bgmTrack, speed, highContrast: hc, reduceMotion: motion, lang, currentUnit: unit, level, kbMode, theme };
    document.body.classList.toggle("high-contrast", hc);
    applyTheme(theme);
    if (bgm) startBgm(bgmTrack);
    else stopBgm();
    saveSettings(next);
    closeSettings();
    if (gameRunning) {
      const prog = loadProgress();
      const robotIdx = currentRobotIndex(masteredCount(prog));
      drawRobot(robotIdx);
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
