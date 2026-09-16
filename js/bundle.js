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
      themeOcean: "Ocean",
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
      themeOcean: "\u6D77\u6D0B",
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
  var LETTER_SYMBOLS = {
    A: "\u2708\uFE0F",
    // Airplane
    B: "\u{1F3C0}",
    // Ball
    C: "\u{1F319}",
    // Crescent moon
    D: "\u{1F48E}",
    // Diamond
    E: "\u2B50",
    // Star
    F: "\u{1F41F}",
    // Fish
    G: "\u{1F347}",
    // Grapes
    H: "\u2764\uFE0F",
    // Heart
    I: "\u{1F366}",
    // Ice cream
    J: "\u{1F9C3}",
    // Juice
    K: "\u{1F511}",
    // Key
    L: "\u{1F34B}",
    // Lemon
    M: "\u{1F30A}",
    // Wave
    N: "\u{1F319}",
    // Night
    O: "\u{1F34A}",
    // Orange
    P: "\u{1F355}",
    // Pizza
    Q: "\u{1F451}",
    // Queen
    R: "\u{1F308}",
    // Rainbow
    S: "\u2600\uFE0F",
    // Sun
    T: "\u{1F333}",
    // Tree
    U: "\u2602\uFE0F",
    // Umbrella
    V: "\u{1F3BB}",
    // Violin
    W: "\u{1F40B}",
    // Whale
    X: "\u274C",
    // X mark
    Y: "\u{1FA80}",
    // Yo-yo
    Z: "\u26A1"
    // Lightning (zap)
  };
  function confettiBurst(originX, originY, opts = {}) {
    const container = document.getElementById("js-confetti-layer");
    if (!container) return;
    const theme = opts.theme || "space";
    const letter = opts.letter;
    const count = opts.count || 32;
    const palettes = {
      space: ["#4FC3F7", "#FF6B9D", "#FFD54F", "#69F0AE", "#CE93D8", "#FF8A65", "#80DEEA", "#F48FB1"],
      candy: ["#FF6B9D", "#FFD54F", "#B388FF", "#69F0AE", "#FF9D7A", "#F48FB1"],
      ocean: ["#00BCD4", "#26C6DA", "#FFCA28", "#66BB6A", "#80DEEA", "#4FC3F7"]
    };
    const colors = opts.colors || palettes[theme] || palettes.space;
    const shapeFamilies = {
      space: ["star", "star", "circle", "square", "ribbon"],
      candy: ["heart", "heart", "circle", "circle", "ribbon"],
      ocean: ["wave", "bubble", "circle", "circle", "ribbon"]
    };
    const shapes = shapeFamilies[theme] || shapeFamilies.space;
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece";
      piece.style.left = originX + "px";
      piece.style.top = originY + "px";
      piece.style.background = colors[i % colors.length];
      const shape = shapes[i % shapes.length];
      if (shape === "star") {
        piece.classList.add("confetti-star");
        piece.style.width = "14px";
        piece.style.height = "14px";
      } else if (shape === "heart") {
        piece.classList.add("confetti-heart");
        piece.style.width = "12px";
        piece.style.height = "12px";
      } else if (shape === "wave") {
        piece.classList.add("confetti-wave");
        piece.style.width = "16px";
        piece.style.height = "8px";
      } else if (shape === "bubble") {
        piece.classList.add("confetti-bubble");
        piece.style.width = 8 + Math.random() * 6 + "px";
        piece.style.height = piece.style.width;
      } else if (shape === "circle") {
        piece.style.borderRadius = "50%";
        piece.style.width = 8 + Math.random() * 4 + "px";
        piece.style.height = piece.style.width;
      } else if (shape === "square") {
        piece.style.width = "6px";
        piece.style.height = "6px";
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
    if (letter && LETTER_SYMBOLS[letter]) {
      for (let i = 0; i < 3; i++) {
        const sym = document.createElement("div");
        sym.className = "confetti-piece letter-symbol";
        sym.textContent = LETTER_SYMBOLS[letter];
        sym.style.fontSize = "36px";
        sym.style.left = originX + "px";
        sym.style.top = originY + "px";
        sym.style.background = "transparent";
        const dx = (i - 1) * 60 + (Math.random() - 0.5) * 30;
        const dy = -120 - Math.random() * 60;
        sym.style.setProperty("--dx", dx + "px");
        sym.style.setProperty("--dy", dy + "px");
        sym.style.setProperty("--rot", (Math.random() - 0.5) * 180 + "deg");
        sym.style.animationDuration = 1.4 + Math.random() * 0.4 + "s";
        container.appendChild(sym);
        sym.addEventListener("animationend", () => sym.remove(), { once: true });
      }
    }
  }
  function megaFireworks(opts = {}) {
    const layer = document.getElementById("js-confetti-layer");
    if (!layer) return;
    const theme = opts.theme || "space";
    const palettes = {
      space: ["#4FC3F7", "#FF6B9D", "#FFD54F", "#69F0AE", "#CE93D8", "#FF8A65", "#80DEEA", "#F48FB1", "#FFFFFF"],
      candy: ["#FF6B9D", "#FFD54F", "#B388FF", "#69F0AE", "#FF9D7A", "#F48FB1", "#FFFFFF"],
      ocean: ["#00BCD4", "#26C6DA", "#FFCA28", "#66BB6A", "#80DEEA", "#4FC3F7", "#FFFFFF"]
    };
    const colors = palettes[theme] || palettes.space;
    const bursts = [
      { x: "50%", y: "50%", count: 30, dist: 220, delay: 0 },
      { x: "50%", y: "50%", count: 25, dist: 160, delay: 120 },
      { x: "50%", y: "50%", count: 35, dist: 280, delay: 240 }
    ];
    bursts.forEach((b) => {
      setTimeout(() => {
        for (let i = 0; i < b.count; i++) {
          const piece = document.createElement("div");
          piece.className = "confetti-piece mega";
          piece.style.position = "absolute";
          piece.style.left = b.x;
          piece.style.top = b.y;
          piece.style.background = colors[i % colors.length];
          piece.style.borderRadius = "50%";
          const size = 6 + Math.random() * 8;
          piece.style.width = size + "px";
          piece.style.height = size + "px";
          piece.style.boxShadow = `0 0 8px ${colors[i % colors.length]}`;
          const angle = Math.PI * 2 * i / b.count + (Math.random() - 0.5) * 0.3;
          const dist = b.dist * (0.7 + Math.random() * 0.6);
          const dx = Math.cos(angle) * dist;
          const dy = Math.sin(angle) * dist;
          piece.style.setProperty("--dx", dx + "px");
          piece.style.setProperty("--dy", dy + "px");
          piece.style.setProperty("--rot", (Math.random() - 0.5) * 1080 + "deg");
          piece.style.animationDuration = 1.6 + Math.random() * 0.8 + "s";
          layer.appendChild(piece);
          piece.addEventListener("animationend", () => piece.remove(), { once: true });
        }
      }, b.delay);
    });
  }
  function floatCombo(text, originX, originY, opts = {}) {
    const layer = document.getElementById("js-combo-layer");
    if (!layer) return;
    const el = document.createElement("div");
    el.className = "combo-text" + (opts.tier ? " tier-" + opts.tier : "");
    el.textContent = text;
    el.style.left = originX + "px";
    el.style.top = originY + "px";
    layer.appendChild(el);
    el.addEventListener("animationend", () => el.remove(), { once: true });
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
  function letterSparkle(originX, originY, opts = {}) {
    const container = document.getElementById("js-confetti-layer");
    if (!container) return;
    const count = opts.count || 10;
    const color = opts.color || "#FFFFFF";
    for (let i = 0; i < count; i++) {
      const piece = document.createElement("div");
      piece.className = "confetti-piece sparkle";
      piece.style.left = originX + "px";
      piece.style.top = originY + "px";
      piece.style.background = color;
      piece.style.borderRadius = "50%";
      const size = 3 + Math.random() * 3;
      piece.style.width = size + "px";
      piece.style.height = size + "px";
      piece.style.boxShadow = `0 0 4px ${color}`;
      const angle = Math.PI * 2 * i / count + (Math.random() - 0.5) * 0.4;
      const dist = 30 + Math.random() * 50;
      const dx = Math.cos(angle) * dist;
      const dy = Math.sin(angle) * dist;
      const rot = (Math.random() - 0.5) * 360;
      piece.style.setProperty("--dx", dx + "px");
      piece.style.setProperty("--dy", dy + "px");
      piece.style.setProperty("--rot", rot + "deg");
      piece.style.animationDuration = 0.6 + Math.random() * 0.3 + "s";
      container.appendChild(piece);
      piece.addEventListener("animationend", () => piece.remove(), { once: true });
    }
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

  // js/challenge.js
  var DAILY_GOAL = 20;
  function todayKey() {
    const d = /* @__PURE__ */ new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  }
  function weekKey() {
    const d = /* @__PURE__ */ new Date();
    const target = new Date(d.valueOf());
    const dayNr = (d.getDay() + 6) % 7;
    target.setDate(target.getDate() - dayNr + 3);
    const firstThursday = target.valueOf();
    target.setMonth(0, 1);
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + (4 - target.getDay() + 7) % 7);
    }
    const weekNum = 1 + Math.ceil((firstThursday - target) / 6048e5);
    return `${d.getFullYear()}-W${String(weekNum).padStart(2, "0")}`;
  }
  function readBucket(key) {
    try {
      const raw = localStorage.getItem(key);
      return raw ? JSON.parse(raw) : { stars: 0, milestonesFired: [] };
    } catch {
      return { stars: 0, milestonesFired: [] };
    }
  }
  function writeBucket(key, bucket) {
    try {
      localStorage.setItem(key, JSON.stringify(bucket));
    } catch {
    }
  }
  function getDailyProgress() {
    return readBucket("ls-daily-" + todayKey());
  }
  function getWeeklyProgress() {
    return readBucket("ls-weekly-" + weekKey());
  }
  function recordStar() {
    const daily = getDailyProgress();
    daily.stars++;
    writeBucket("ls-daily-" + todayKey(), daily);
    const weekly = getWeeklyProgress();
    weekly.stars++;
    writeBucket("ls-weekly-" + weekKey(), weekly);
    const milestones = [0.25, 0.5, 0.75, 1];
    const prevRatio = (daily.stars - 1) / DAILY_GOAL;
    const newRatio = daily.stars / DAILY_GOAL;
    for (const m of milestones) {
      if (prevRatio < m && newRatio >= m && !daily.milestonesFired.includes(m)) {
        daily.milestonesFired.push(m);
        writeBucket("ls-daily-" + todayKey(), daily);
        return { dailyMilestone: m, daily: daily.stars, weekly: weekly.stars };
      }
    }
    return { daily: daily.stars, weekly: weekly.stars };
  }
  function dailyGoal() {
    return DAILY_GOAL;
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
  var stars = 0;
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
    scoreEl.classList.toggle("rainbow", streak >= 5);
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
  function updateStars(total) {
    const num = document.getElementById("js-stars-num");
    const bar = document.getElementById("js-stars-bar-fill");
    const next = document.getElementById("js-stars-next");
    if (num) num.textContent = total;
    const milestones = ACHIEVEMENT_MILESTONES.map((m) => m.stars);
    const nextMs = milestones.find((m) => m > total);
    if (bar) {
      const target = nextMs || total + 10;
      const prevMs = milestones.filter((m) => m <= total).pop() || 0;
      const pct = Math.min(100, (total - prevMs) / (target - prevMs) * 100);
      bar.style.width = pct + "%";
    }
    if (next) {
      if (!nextMs) {
        next.textContent = "\u{1F451} MAX";
        next.classList.add("zero");
      } else {
        const remaining = nextMs - total;
        next.textContent = `\u4E0B\u4E00\u500B ${remaining} \u7C92`;
        next.classList.remove("zero");
      }
    }
    updateDailyHint();
  }
  function updateDailyHint() {
    const el = document.getElementById("js-daily-hint");
    if (!el) return;
    const daily = getDailyProgress();
    const goal = dailyGoal();
    const pct = Math.min(100, Math.round(daily.stars / goal * 100));
    const lang = loadSettings().lang || "zh";
    if (daily.stars >= goal) {
      el.textContent = lang === "zh" ? `\u2705 \u4ECA\u65E5\u9054\u6A19 ${daily.stars}/${goal}` : `\u2705 Daily done ${daily.stars}/${goal}`;
      el.classList.add("done");
    } else {
      el.textContent = lang === "zh" ? `\u4ECA\u65E5 ${daily.stars}/${goal} \u2B50` : `Today ${daily.stars}/${goal} \u2B50`;
      el.classList.remove("done");
    }
    const fill = document.getElementById("js-daily-bar-fill");
    if (fill) fill.style.width = pct + "%";
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
    ],
    ocean: [
      { body: "#FFFFFF", eye: "#00BCD4", accent: "#00BCD4", glow: "rgba(0,188,212,0.5)" },
      { body: "#FFFFFF", eye: "#FFCA28", accent: "#FFCA28", glow: "rgba(255,202,40,0.5)" },
      { body: "#FFFFFF", eye: "#66BB6A", accent: "#66BB6A", glow: "rgba(102,187,106,0.5)" }
    ]
  };
  function drawMascot() {
    const wrap = document.getElementById("js-mascot-wrap");
    if (!wrap) return;
    const theme = loadSettings().theme || "space";
    const palettes = {
      space: { body: "#FFE4B5", accent: "#FF6B9D", cheek: "#FFB3C6", eye: "#1a1a3e" },
      candy: { body: "#FFD9E8", accent: "#FF6B9D", cheek: "#FF8FB1", eye: "#4A2C5A" },
      ocean: { body: "#B2EBF2", accent: "#00BCD4", cheek: "#80DEEA", eye: "#004D40" }
    };
    const p = palettes[theme] || palettes.space;
    wrap.innerHTML = `
    <svg viewBox="0 0 80 80" width="80" height="80" aria-hidden="true"
         style="filter:drop-shadow(0 4px 8px rgba(0,0,0,0.25))">
      <!-- ears -->
      <path d="M 18 22 L 14 6 L 30 16 Z" fill="${p.body}" stroke="${p.accent}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M 62 22 L 66 6 L 50 16 Z" fill="${p.body}" stroke="${p.accent}" stroke-width="2" stroke-linejoin="round"/>
      <path d="M 20 18 L 18 10 L 26 16 Z" fill="${p.cheek}" opacity="0.7"/>
      <path d="M 60 18 L 62 10 L 54 16 Z" fill="${p.cheek}" opacity="0.7"/>
      <!-- head -->
      <circle cx="40" cy="38" r="22" fill="${p.body}" stroke="${p.accent}" stroke-width="2"/>
      <!-- eyes -->
      <ellipse cx="32" cy="36" rx="3" ry="4.5" fill="${p.eye}"/>
      <ellipse cx="48" cy="36" rx="3" ry="4.5" fill="${p.eye}"/>
      <circle cx="33" cy="34.5" r="1" fill="white"/>
      <circle cx="49" cy="34.5" r="1" fill="white"/>
      <!-- nose -->
      <path d="M 38 42 L 42 42 L 40 45 Z" fill="${p.accent}"/>
      <!-- mouth -->
      <path d="M 40 45 Q 36 49 33 46" stroke="${p.accent}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <path d="M 40 45 Q 44 49 47 46" stroke="${p.accent}" stroke-width="1.5" fill="none" stroke-linecap="round"/>
      <!-- whiskers -->
      <line x1="18" y1="40" x2="28" y2="42" stroke="${p.accent}" stroke-width="1" stroke-linecap="round"/>
      <line x1="18" y1="44" x2="28" y2="44" stroke="${p.accent}" stroke-width="1" stroke-linecap="round"/>
      <line x1="62" y1="40" x2="52" y2="42" stroke="${p.accent}" stroke-width="1" stroke-linecap="round"/>
      <line x1="62" y1="44" x2="52" y2="44" stroke="${p.accent}" stroke-width="1" stroke-linecap="round"/>
      <!-- cheeks -->
      <circle cx="26" cy="46" r="3" fill="${p.cheek}" opacity="0.6"/>
      <circle cx="54" cy="46" r="3" fill="${p.cheek}" opacity="0.6"/>
      <!-- body hint -->
      <ellipse cx="40" cy="68" rx="16" ry="10" fill="${p.body}" stroke="${p.accent}" stroke-width="2" opacity="0.85"/>
    </svg>`;
    wrap.classList.remove("mascot-idle", "mascot-happy", "mascot-sad", "mascot-cheer");
    wrap.classList.add("mascot-idle");
  }
  function mascotReact(kind) {
    const wrap = document.getElementById("js-mascot-wrap");
    if (!wrap) return;
    const cls = kind === "happy" ? "mascot-happy" : kind === "sad" ? "mascot-sad" : kind === "cheer" ? "mascot-cheer" : "mascot-idle";
    wrap.classList.remove("mascot-idle", "mascot-happy", "mascot-sad", "mascot-cheer");
    void wrap.offsetWidth;
    wrap.classList.add(cls);
    if (kind !== "idle") {
      setTimeout(() => {
        wrap.classList.remove(cls);
        wrap.classList.add("mascot-idle");
      }, kind === "cheer" ? 1300 : kind === "happy" ? 950 : 650);
    }
  }
  var FLOOR_EMOJIS = {
    space: ["\u2B50", "\u{1F31F}", "\u{1FA90}", "\u{1F680}", "\u2B50", "\u{1F31F}", "\u2B50", "\u{1F319}"],
    candy: ["\u{1F36D}", "\u{1F369}", "\u{1F338}", "\u{1F36C}", "\u{1F338}", "\u{1F369}", "\u{1F36D}", "\u{1F33C}"],
    ocean: ["\u{1FAB8}", "\u{1F41A}", "\u{1FAB8}", "\u{1F420}", "\u{1FAB8}", "\u{1F41A}", "\u{1FAB8}", "\u{1F33F}"]
  };
  function populateFloor(theme) {
    const floor = document.getElementById("js-floor-decor");
    if (!floor) return;
    floor.innerHTML = "";
    const emojis = FLOOR_EMOJIS[theme] || FLOOR_EMOJIS.space;
    emojis.forEach((emo, i) => {
      const span = document.createElement("span");
      span.className = "floor-emoji";
      if (theme === "ocean") span.classList.add("sway");
      if (theme === "space" && i % 2 === 0) span.classList.add("twinkle");
      span.textContent = emo;
      floor.appendChild(span);
    });
  }
  function drawRobot(robotIdx = 0) {
    const { robotWrap } = getEls();
    if (!robotWrap) return;
    const theme = loadSettings().theme || "space";
    const palettes = ROBOT_PALETTES[theme] || ROBOT_PALETTES.space;
    const p = palettes[robotIdx % palettes.length];
    robotWrap.innerHTML = `
    <svg viewBox="0 0 160 180" width="160" height="180" aria-hidden="true"
         style="filter:drop-shadow(0 0 16px ${p.glow})">
      <!-- glow aura -->
      <ellipse cx="80" cy="160" rx="58" ry="10" fill="${p.glow}" opacity="0.25"/>
      <!-- antenna with bobble -->
      <g class="robot-antenna">
        <line x1="80" y1="18" x2="80" y2="44" stroke="${p.accent}" stroke-width="5" stroke-linecap="round"/>
        <circle cx="80" cy="13" r="9" fill="${p.accent}" opacity="0.95"/>
        <circle cx="77" cy="10" r="3" fill="white" opacity="0.85"/>
      </g>
      <!-- head -->
      <rect x="28" y="44" width="104" height="76" rx="18" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      <!-- cheek blush -->
      <circle cx="40" cy="82" r="8" fill="${p.accent}" opacity="0.3"/>
      <circle cx="120" cy="82" r="8" fill="${p.accent}" opacity="0.3"/>
      <!-- eyes (large, expressive) -->
      <g class="robot-eyes">
        <circle cx="58" cy="74" r="14" fill="white"/>
        <circle cx="102" cy="74" r="14" fill="white"/>
        <circle cx="58" cy="77" r="10" fill="${p.eye}"/>
        <circle cx="102" cy="77" r="10" fill="${p.eye}"/>
        <circle cx="61" cy="73" r="3.5" fill="white"/>
        <circle cx="105" cy="73" r="3.5" fill="white"/>
      </g>
      <!-- smile -->
      <path d="M 58 100 Q 80 114 102 100" stroke="${p.eye}" stroke-width="4" fill="none" stroke-linecap="round"/>
      <!-- body -->
      <rect x="42" y="124" width="76" height="36" rx="10" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      <!-- chest light -->
      <circle cx="80" cy="142" r="5.5" fill="${p.accent}" opacity="0.9"/>
      <circle cx="80" cy="142" r="9" fill="${p.accent}" opacity="0.2"/>
      <!-- arms with hands -->
      <g class="robot-arm-l">
        <rect x="12" y="130" width="24" height="14" rx="7" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
        <circle cx="10" cy="137" r="8" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      </g>
      <g class="robot-arm-r">
        <rect x="124" y="130" width="24" height="14" rx="7" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
        <circle cx="150" cy="137" r="8" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      </g>
      <!-- legs -->
      <rect x="54" y="160" width="20" height="14" rx="5" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
      <rect x="86" y="160" width="20" height="14" rx="5" fill="${p.body}" stroke="${p.accent}" stroke-width="2.5" opacity="0.95"/>
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
    setTimeout(() => {
      const r = el.getBoundingClientRect();
      letterSparkle(r.left + r.width / 2, r.top + r.height / 2, {
        color: getComputedStyle(document.documentElement).getPropertyValue("--primary2").trim() || "#4FC3F7"
      });
    }, 200);
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
    stars = 0;
    touchKeys = activeLetters(unitKey);
    const prog = loadProgress();
    const robotIdx = currentRobotIndex(masteredCount(prog));
    updateUnit(unitKey);
    updateScore();
    updateStreak(0);
    updateStars(0);
    updateDailyHint();
    drawRobot(robotIdx);
    drawMascot();
    populateFloor(loadSettings().theme || "space");
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
        robotReach();
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
      stars++;
      streak++;
      updateScore();
      updateStars(stars);
      updateStreak(streak);
      clearHighlight();
      if (stars === 10 || stars === 25 || stars === 50 || stars === 100) {
        showAchievement(stars);
      }
      const challenge = recordStar();
      updateDailyHint();
      if (challenge.dailyMilestone) {
        const pct = Math.round(challenge.dailyMilestone * 100);
        const lang = loadSettings().lang || "zh";
        const phrase = lang === "zh" ? `\u4ECA\u65E5 ${pct}%\uFF01\u4EF2\u5DEE\u5C11\u5C11\uFF01` : `${pct}% today! Almost there!`;
        const toast = document.getElementById("js-toast");
        const title = document.getElementById("js-toast-title");
        const body = document.getElementById("js-toast-body");
        if (toast && title && body) {
          title.textContent = lang === "zh" ? `\u{1F3AF} \u4ECA\u65E5\u9032\u5EA6 ${pct}%` : `\u{1F3AF} Daily ${pct}%`;
          body.textContent = phrase;
          toast.classList.remove("visible");
          void toast.offsetWidth;
          toast.classList.add("visible");
          setTimeout(() => toast.classList.remove("visible"), 2500);
        }
        if (challenge.dailyMilestone >= 1) {
          megaFireworks({ theme: loadSettings().theme || "space" });
        }
      }
      const letterBox = document.getElementById("js-letter")?.getBoundingClientRect();
      if (letterBox) {
        confettiBurst(
          letterBox.left + letterBox.width / 2,
          letterBox.top + letterBox.height / 2,
          { theme: settings.theme || "space", letter: currentLetter }
        );
        const lang = settings.lang || "zh";
        const tier = streak >= 10 ? 10 : streak >= 5 ? 5 : streak >= 3 ? 3 : 1;
        const combos = {
          1: lang === "zh" ? "+1" : "+1",
          3: lang === "zh" ? "\u53FB!" : "Good!",
          5: lang === "zh" ? "\u5F88\u597D!" : "Great!",
          10: lang === "zh" ? "\u592A\u68D2\u4E86!" : "Amazing!"
        };
        floatCombo(combos[tier], letterBox.left + letterBox.width / 2, letterBox.top, { tier });
      }
      celebrateRobot(streak);
      mascotReact(streak >= 5 ? "cheer" : "happy");
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
        megaFireworks({ theme: settings.theme || "space" });
        showRobotUnlock(afterMastered);
      }
      if (streak >= 10 && afterMastered === prevMastered) {
        megaFireworks({ theme: settings.theme || "space" });
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
      updateScore();
      recordAttempt(currentLetter.toUpperCase(), false);
      shakeLetter();
      flashWrongKey(pressed);
      mascotReact("sad");
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
  function celebrateRobot(streakN = 1) {
    const wrap = document.getElementById("js-robot-wrap");
    if (!wrap) return;
    wrap.classList.remove("celebrate", "celebrate-big", "celebrate-mega");
    void wrap.offsetWidth;
    if (streakN >= 10) wrap.classList.add("celebrate-mega");
    else if (streakN >= 5) wrap.classList.add("celebrate-big");
    else wrap.classList.add("celebrate");
  }
  function robotReach() {
    const wrap = document.getElementById("js-robot-wrap");
    if (!wrap) return;
    wrap.classList.remove("reach");
    void wrap.offsetWidth;
    wrap.classList.add("reach");
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
    btn.style.position = "relative";
    if (reduceMotion) btn.classList.add("no-motion");
    btn.addEventListener("click", () => {
      btn.classList.remove("ripple");
      void btn.offsetWidth;
      btn.classList.add("ripple");
      setTimeout(() => btn.classList.remove("ripple"), 600);
      handleKey(letter);
    });
    return btn;
  }
  function flashWrongKey(letter) {
    const btn = document.querySelector(`.kb-key[data-letter="${letter}"]`);
    if (!btn) return;
    btn.classList.remove("wrong-shake");
    void btn.offsetWidth;
    btn.classList.add("wrong-shake");
    setTimeout(() => btn.classList.remove("wrong-shake"), 400);
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
  var ACHIEVEMENT_MILESTONES = [
    { stars: 10, icon: "\u{1F31F}", title_zh: "\u7372\u5F97 10 \u7C92\u661F\uFF01", title_en: "10 Stars!", body_zh: "\u7E7C\u7E8C\u52AA\u529B\uFF01", body_en: "Keep going!" },
    { stars: 25, icon: "\u{1F3C6}", title_zh: "\u7372\u5F97 25 \u7C92\u661F\uFF01", title_en: "25 Stars!", body_zh: "\u592A\u53B2\u5BB3\u4E86\uFF01", body_en: "Amazing!" },
    { stars: 50, icon: "\u{1F48E}", title_zh: "\u7372\u5F97 50 \u7C92\u661F\uFF01", title_en: "50 Stars!", body_zh: "\u8D85\u7D1A\u53FB\uFF01", body_en: "Superstar!" },
    { stars: 100, icon: "\u{1F451}", title_zh: "100 \u7C92\u661F\uFF01", title_en: "100 Stars!", body_zh: "\u5B8C\u7F8E\uFF01", body_en: "Perfect!" }
  ];
  function showAchievement(stars2) {
    const ms = ACHIEVEMENT_MILESTONES.find((m) => m.stars === stars2);
    if (!ms) return;
    const ach = document.getElementById("js-ach-toast");
    const icon = document.getElementById("js-ach-icon");
    const title = document.getElementById("js-ach-title");
    const body = document.getElementById("js-ach-body");
    if (!ach || !icon || !title || !body) return;
    const lang = loadSettings().lang;
    icon.textContent = ms.icon;
    title.textContent = lang === "zh" ? ms.title_zh : ms.title_en;
    body.textContent = lang === "zh" ? ms.body_zh : ms.body_en;
    ach.classList.remove("visible");
    void ach.offsetWidth;
    ach.classList.add("visible");
    megaFireworks({ theme: loadSettings().theme || "space" });
    setTimeout(() => ach.classList.remove("visible"), 2200);
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
      drawMascot();
      populateFloor(theme);
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
