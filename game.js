const W = 405;
const H = 720;
const MAIN_ROWS = 6;
const FREE_ROWS = 9;
const COLS = 6;
const STARTING_WALLET = 1000;
const DEFAULT_BET = 10;
const BET_STEP = 10;
const MIN_BET = 10;
const MAX_BET = 500;
const SCATTER_DROP_RATE = 0.016;
const FREE_SCATTER_DROP_RATE = 0.0016;
const BONUS_BUY_COST_MULT = 100;
const BONUS_EVENT_RATE = 0.18;
const TYPES = ["red", "blue", "green", "yellow", "purple"];
const COLORS = {
  red: 0xff5372,
  blue: 0x58c8ff,
  green: 0x79df7b,
  yellow: 0xffdf57,
  purple: 0xc77bff,
  chocolate: 0x9a522c
};
const ORDER_ROW_LAYOUT = [
  { y: 136, iconX: 76, textX: 118, rewardX: 312, labelDy: -5, progressDy: 8 },
  { y: 171, iconX: 76, textX: 118, rewardX: 312, labelDy: -5, progressDy: 8 },
  { y: 206, iconX: 76, textX: 118, rewardX: 312, labelDy: -5, progressDy: 8 }
];
const LABELS = {
  red: "Red",
  blue: "Blue",
  green: "Green",
  yellow: "Yellow",
  purple: "Purple",
  any: "Any",
  cascade: "Cascades",
  chocolate: "Chocolate"
};

class CandyOrdersScene extends Phaser.Scene {
  constructor() {
    super("CandyOrdersScene");
    this.cell = 50;
    this.boardX = Math.round((W - this.cell * COLS) / 2);
    this.boardY = 292;
    this.rows = MAIN_ROWS;
  }

  preload() {
    this.load.image("bg-strawberry-dessert", "assets/backgrounds/strawberry-dessert-bg.png");
    this.load.image("sym-red", "assets/symbols/symbol-red.png");
    this.load.image("sym-blue", "assets/symbols/symbol-blue.png");
    this.load.image("sym-green", "assets/symbols/symbol-green.png");
    this.load.image("sym-yellow", "assets/generated/symbol-pudding.png?v=20260615artapply");
    this.load.image("sym-purple", "assets/generated/symbol-grape.png?v=20260615artapply");
    this.load.image("sym-stripe-row", "assets/symbols/symbol-stripe.png");
    this.load.image("sym-stripe-col", "assets/symbols/symbol-stripe.png");
    this.load.image("sym-bomb", "assets/symbols/symbol-bomb.png");
    this.load.image("sym-chocolate", "assets/symbols/symbol-chocolate.png");
    this.load.image("fx-coin", "assets/symbols/coin.png");
    this.load.image("sym-chest", "assets/symbols/chest.png");
    this.load.image("sym-key", "assets/symbols/key.png");
    this.load.image("sym-scatter", "assets/generated/scatter-chest-premium.png?v=20260615artapply");
    this.load.image("ui-task-panel-strawberry", "assets/generated/ui-task-panel-strawberry.png?v=20260615strawberryui");
    this.load.image("ui-bottom-panel-strawberry", "assets/generated/ui-bottom-panel-strawberry.png?v=20260615strawberryui");
    this.load.image("ui-board-frame-strawberry", "assets/generated/ui-board-frame-thin-square.png?v=20260615thinboard");
    this.load.image("ui-start-screen-panel", "assets/generated/ui-start-screen-panel.png?v=20260615startpanel");
    this.load.image("ui-logo-candy-orders", "assets/generated/logo-candy-orders.png?v=20260615artapply");
    this.load.image("ui-board", "assets/ui/ui-board.png");
    this.load.image("ui-order-a", "assets/ui/ui-order-a.png");
    this.load.image("ui-order-b", "assets/ui/ui-order-b.png");
    this.load.image("ui-status", "assets/ui/ui-status.png");
    this.load.image("ui-popup", "assets/ui/ui-popup.png");
  }

  create() {
    this.board = [];
    this.sprites = [];
    this.allCandySprites = new Set();
    this.fxSprites = new Set();
    this.selected = null;
    this.busy = false;
    this.resolvingMove = false;
    this.inputOpen = false;
    this.sessionActive = false;
    this.wallet = STARTING_WALLET;
    this.displayedWallet = STARTING_WALLET;
    this.walletCounterTween = null;
    this.musicStarted = false;
    this.musicTimer = null;
    this.betAmount = DEFAULT_BET;
    this.movesMade = 0;
    this.endReason = "";
    this.totalRemoved = 0;
    this.removedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.cascadeCount = 0;
    this.chocolatesCreated = 0;
    this.comboCounts = { any: 0, stripeStripe: 0, stripeBomb: 0, bombBomb: 0, chocolateSpecial: 0 };
    this.ordersCompleted = 0;
    this.sessionReward = 0;
    this.paidBetTotal = 0;
    this.moveReward = 0;
    this.moveCompletions = [];
    this.keysCollected = 0;
    this.scatterGoal = 3;
    this.gameMode = "main";
    this.freeMovesLeft = 0;
    this.freeRemoved = 0;
    this.freeRemovedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.freeCascadeCount = 0;
    this.freeChocolatesCreated = 0;
    this.freeComboCounts = { any: 0, stripeStripe: 0, stripeBomb: 0, bombBomb: 0, chocolateSpecial: 0 };
    this.freeReward = 0;
    this.freeOrdersCompleted = 0;
    this.freeChestsOpened = 0;
    this.freeScatterRetriggers = 0;
    this.freeEventCount = 0;
    this.freeColorClearUsed = false;
    this.freeMoveHadEvent = false;
    this.freeBoughtMode = false;
    this.bonusExitCooldown = 0;
    this.freeMusicTimer = null;
    this.freeChestHud = [];
    this.configureBoard(MAIN_ROWS);
    this.displayedWin = 0;
    this.lastWinAmount = 0;
    this.winCounterTween = null;
    this.betAmount = Phaser.Math.Clamp(this.betAmount, MIN_BET, Math.max(MIN_BET, Math.min(MAX_BET, this.wallet)));

    this.createSymbolTextures();
    this.createBackground();
    this.createUi();
    this.createBoardFrame();
    this.showPreStart();
  }

  configureBoard(rows) {
    this.rows = rows;
    this.cell = rows === FREE_ROWS ? 43 : 49;
    this.boardX = Math.round((W - this.cell * COLS) / 2);
    this.boardY = rows === FREE_ROWS ? 292 : 286;
  }

  createBackground() {
    this.add.rectangle(W / 2, H / 2, W, H, 0x4f1220, 1);
  }

  createSymbolTextures() {
    const defs = [
      ["sym-red", "gummy", "#ff5372", "#7b1630"],
      ["sym-blue", "lollipop", "#58c8ff", "#164a7b"],
      ["sym-green", "bear", "#79df7b", "#1d6b3c"],
      ["sym-yellow", "wrapped", "#ffdf57", "#8a5e0b"],
      ["sym-purple", "planet", "#c77bff", "#5a258e"],
      ["sym-stripe-row", "stripeH", "#ffdf57", "#8a5e0b"],
      ["sym-stripe-col", "stripeV", "#58c8ff", "#164a7b"],
      ["sym-bomb", "bomb", "#ff5aa7", "#64204a"],
      ["sym-chocolate", "chocolate", "#9a522c", "#3a1d12"]
    ];
    defs.forEach(([key, kind, color, outline]) => {
      if (this.textures.exists(key)) return;
      const canvas = document.createElement("canvas");
      canvas.width = 64;
      canvas.height = 64;
      const ctx = canvas.getContext("2d");
      ctx.imageSmoothingEnabled = false;
      const r = (x, y, w, h, fill) => {
        ctx.fillStyle = fill;
        ctx.fillRect(x, y, w, h);
      };
      const shine = () => {
        r(18, 12, 10, 6, "rgba(255,255,255,.82)");
        r(15, 19, 5, 4, "rgba(255,255,255,.55)");
      };
      r(14, 46, 34, 8, "rgba(36,16,48,.28)");
      if (kind === "wrapped" || kind === "stripeH" || kind === "stripeV") {
        r(4, 24, 12, 18, outline);
        r(48, 24, 12, 18, outline);
        r(8, 27, 10, 12, "#fff4cf");
        r(46, 27, 10, 12, "#fff4cf");
        r(16, 14, 32, 38, outline);
        r(20, 17, 24, 32, color);
        if (kind === "stripeH") {
          r(20, 25, 24, 5, "#ffffff");
          r(20, 36, 24, 5, "#ffffff");
        } else if (kind === "stripeV") {
          r(27, 17, 5, 32, "#ffffff");
          r(36, 17, 5, 32, "#ffffff");
        } else {
          r(29, 17, 5, 32, "#fff6b8");
        }
        shine();
      } else if (kind === "bear" || kind === "gummy") {
        r(16, 10, 12, 12, outline);
        r(36, 10, 12, 12, outline);
        r(19, 13, 8, 8, color);
        r(37, 13, 8, 8, color);
        r(13, 18, 38, 40, outline);
        r(17, 21, 30, 34, color);
        r(23, 30, 5, 5, "#1c1026");
        r(36, 30, 5, 5, "#1c1026");
        r(29, 39, 8, 4, "#1c1026");
        shine();
      } else if (kind === "lollipop") {
        r(29, 38, 6, 18, outline);
        r(30, 39, 4, 15, "#ffe0d4");
        r(11, 7, 42, 42, outline);
        r(15, 11, 34, 34, color);
        r(22, 17, 22, 5, "#cfffff");
        r(19, 28, 28, 5, "#ffffff");
        shine();
      } else if (kind === "planet") {
        r(13, 13, 38, 38, outline);
        r(17, 17, 30, 30, color);
        r(4, 31, 56, 8, outline);
        r(8, 32, 48, 5, "#ffd28f");
        r(19, 19, 8, 6, "#ffffff");
        r(38, 35, 5, 5, "#6ee8ff");
        r(27, 30, 5, 5, "#ff8bd4");
      } else if (kind === "bomb") {
        r(14, 17, 38, 38, outline);
        r(18, 21, 30, 30, color);
        r(27, 8, 14, 14, outline);
        r(30, 4, 8, 10, "#ffef70");
        r(23, 31, 18, 6, "#ffffff");
        r(18, 17, 8, 6, "#ffd0e7");
      } else if (kind === "chocolate") {
        r(12, 10, 42, 44, outline);
        r(16, 14, 34, 36, color);
        r(17, 30, 32, 4, "#4a2415");
        r(32, 15, 4, 34, "#4a2415");
        r(20, 17, 10, 7, "#d98b4a");
        r(39, 36, 7, 6, "#c47a40");
      }
      this.textures.addCanvas(key, canvas);
    });
    this.createOrderIconTexture("sym-any-order", "any");
    this.createOrderIconTexture("sym-cascade-order", "cascade");
    this.createOrderEventTexture("event-help", "help");
    this.createOrderEventTexture("event-special", "special");
    this.createOrderEventTexture("event-scatter", "scatter");
    this.createScatterTexture();
  }

  createOrderIconTexture(key, kind) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const r = (x, y, w, h, fill) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    };
    if (kind === "cascade") {
      r(6, 10, 14, 14, "#8ee8ff");
      r(20, 22, 14, 14, "#fff06a");
      r(34, 34, 14, 14, "#ff8fc7");
      r(46, 48, 10, 10, "#ffffff");
      r(9, 13, 8, 8, "#ffffff");
      r(23, 25, 8, 8, "#351352");
      r(37, 37, 8, 8, "#ffffff");
    } else {
      const swatches = [
        ["#ff5372", 9, 13],
        ["#58c8ff", 25, 9],
        ["#79df7b", 41, 14],
        ["#ffdf57", 17, 36],
        ["#c77bff", 36, 35]
      ];
      swatches.forEach(([fill, x, y]) => {
        r(x - 3, y - 3, 16, 16, "#351352");
        r(x, y, 10, 10, fill);
        r(x + 2, y + 2, 4, 4, "#ffffff");
      });
      r(28, 26, 8, 8, "#ffffff");
    }
    this.textures.addCanvas(key, canvas);
  }


  createScatterTexture() {
    if (this.textures.exists("sym-scatter")) return;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const r = (x, y, w, h, fill) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    };
    r(22, 4, 20, 8, "#fff6d0");
    r(16, 8, 32, 8, "#ffdf57");
    r(10, 16, 44, 8, "#351352");
    r(8, 24, 48, 28, "#351352");
    r(12, 20, 40, 32, "#fff06a");
    r(16, 24, 32, 24, "#ff4f88");
    r(20, 28, 24, 16, "#8ee8ff");
    r(26, 18, 12, 34, "#ffffff");
    r(14, 31, 36, 8, "#ffffff");
    r(29, 25, 6, 22, "#351352");
    r(21, 34, 22, 4, "#351352");
    r(18, 14, 7, 5, "rgba(255,255,255,.9)");
    r(42, 10, 5, 5, "#ffffff");
    r(6, 32, 5, 5, "#fff06a");
    r(53, 29, 5, 5, "#fff06a");
    r(15, 52, 34, 5, "rgba(36,16,48,.32)");
    this.textures.addCanvas("sym-scatter", canvas);
  }

  createOrderEventTexture(key, kind) {
    if (this.textures.exists(key)) return;
    const canvas = document.createElement("canvas");
    canvas.width = 64;
    canvas.height = 64;
    const ctx = canvas.getContext("2d");
    ctx.imageSmoothingEnabled = false;
    const r = (x, y, w, h, fill) => {
      ctx.fillStyle = fill;
      ctx.fillRect(x, y, w, h);
    };
    const bg = kind === "help" ? "#ff8fc7" : kind === "special" ? "#8ee8ff" : "#fff06a";
    const shade = kind === "help" ? "#7a2d93" : kind === "special" ? "#1763a0" : "#8a5e0b";
    r(10, 8, 44, 48, "#351352");
    r(14, 12, 36, 40, bg);
    if (kind === "help") {
      r(20, 16, 24, 11, "#ffffff");
      r(26, 27, 12, 12, "#ffffff");
      r(20, 37, 24, 7, "#ffffff");
      r(17, 33, 10, 8, "#ffffff");
      r(37, 33, 10, 8, "#ffffff");
      r(22, 19, 20, 4, shade);
    } else if (kind === "special") {
      r(19, 25, 7, 14, shade);
      r(38, 25, 7, 14, shade);
      r(24, 18, 16, 28, "#ff5372");
      r(27, 21, 10, 22, "#ffffff");
      r(30, 17, 5, 30, "#8ee8ff");
      r(25, 29, 14, 5, "#8ee8ff");
      r(43, 14, 6, 6, "#fff06a");
      r(15, 43, 6, 6, "#fff06a");
    } else if (kind === "scatter") {
      r(24, 15, 16, 7, "#ffffff");
      r(19, 22, 26, 21, "#ff4f88");
      r(23, 26, 18, 13, "#8ee8ff");
      r(29, 17, 6, 28, "#ffffff");
      r(21, 30, 22, 5, "#ffffff");
      r(30, 24, 4, 18, shade);
      r(24, 32, 16, 3, shade);
      r(45, 16, 5, 5, "#ffffff");
      r(14, 42, 5, 5, "#ffffff");
    }
    this.textures.addCanvas(key, canvas);
  }
  playPopSound(pitch = 520) {
    try {
      const ctx = this.sound.context;
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = "square";
      osc.frequency.setValueAtTime(pitch, ctx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(pitch * 1.7, ctx.currentTime + 0.08);
      gain.gain.setValueAtTime(0.035, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.11);
      osc.connect(gain);
      gain.connect(ctx.destination);
      osc.start();
      osc.stop(ctx.currentTime + 0.12);
    } catch (e) {}
  }

  playBetSound(delta, changed) {
    try {
      const ctx = this.sound.context;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      gain.gain.setValueAtTime(changed ? 0.042 : 0.024, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.18);
      gain.connect(ctx.destination);
      const notes = changed
        ? (delta > 0 ? [659, 988] : [988, 659])
        : [196, 164];
      notes.forEach((pitch, i) => {
        const osc = ctx.createOscillator();
        osc.type = changed ? "triangle" : "square";
        osc.frequency.setValueAtTime(pitch, now + i * 0.055);
        osc.frequency.exponentialRampToValueAtTime(pitch * (changed ? 1.18 : 0.82), now + i * 0.055 + 0.09);
        osc.connect(gain);
        osc.start(now + i * 0.055);
        osc.stop(now + i * 0.055 + 0.11);
      });
    } catch (e) {}
  }

  playOrderCompleteSound() {
    try {
      const ctx = this.sound.context;
      const now = ctx.currentTime;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "lowpass";
      filter.frequency.setValueAtTime(5200, now);
      gain.gain.setValueAtTime(0.09, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.72);
      filter.connect(gain);
      gain.connect(ctx.destination);
      [523, 784, 1047, 1568, 2093].forEach((pitch, i) => {
        const osc = ctx.createOscillator();
        osc.type = i < 2 ? "square" : "triangle";
        osc.frequency.setValueAtTime(pitch, now + i * 0.065);
        osc.frequency.exponentialRampToValueAtTime(pitch * 1.22, now + i * 0.065 + 0.18);
        osc.connect(filter);
        osc.start(now + i * 0.065);
        osc.stop(now + i * 0.065 + 0.22);
      });
    } catch (e) {}
  }

  playCoinDing(pitch = 1850, volume = 0.035, offset = 0) {
    try {
      const ctx = this.sound.context;
      const now = ctx.currentTime + offset;
      const master = ctx.createGain();
      master.gain.setValueAtTime(volume, now);
      master.gain.exponentialRampToValueAtTime(0.001, now + 0.22);
      master.connect(ctx.destination);

      [
        { ratio: 1, gain: 0.7, end: 0.2 },
        { ratio: 1.47, gain: 0.38, end: 0.13 },
        { ratio: 2.31, gain: 0.2, end: 0.08 }
      ].forEach(({ ratio, gain, end }) => {
        const osc = ctx.createOscillator();
        const partialGain = ctx.createGain();
        osc.type = "sine";
        osc.frequency.setValueAtTime(pitch * ratio, now);
        osc.frequency.exponentialRampToValueAtTime(pitch * ratio * 0.97, now + end);
        partialGain.gain.setValueAtTime(gain, now);
        partialGain.gain.exponentialRampToValueAtTime(0.001, now + end);
        osc.connect(partialGain);
        partialGain.connect(master);
        osc.start(now);
        osc.stop(now + end);
      });

      const noiseLength = Math.max(1, Math.floor(ctx.sampleRate * 0.025));
      const noiseBuffer = ctx.createBuffer(1, noiseLength, ctx.sampleRate);
      const noiseData = noiseBuffer.getChannelData(0);
      for (let i = 0; i < noiseLength; i++) noiseData[i] = (Math.random() * 2 - 1) * (1 - i / noiseLength);
      const noise = ctx.createBufferSource();
      const noiseFilter = ctx.createBiquadFilter();
      const noiseGain = ctx.createGain();
      noise.buffer = noiseBuffer;
      noiseFilter.type = "highpass";
      noiseFilter.frequency.setValueAtTime(1800, now);
      noiseGain.gain.setValueAtTime(0.22, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.001, now + 0.025);
      noise.connect(noiseFilter);
      noiseFilter.connect(noiseGain);
      noiseGain.connect(master);
      noise.start(now);
    } catch (e) {}
  }

  playCoinSpraySound() {
    const notes = [1568, 1760, 1976, 1760, 2093, 2349];
    notes.forEach((pitch, i) => this.playCoinDing(pitch, i === 0 || i === 4 ? 0.04 : 0.026, i * 0.16));
  }

  playUnlockSound() {
    try {
      const ctx = this.sound.context;
      const now = ctx.currentTime;
      const click = (time, freq, volume) => {
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "square";
        osc.frequency.setValueAtTime(freq, time);
        gain.gain.setValueAtTime(volume, time);
        gain.gain.exponentialRampToValueAtTime(0.001, time + 0.055);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start(time);
        osc.stop(time + 0.065);
      };
      click(now, 820, 0.045);
      click(now + 0.09, 1180, 0.038);
      click(now + 0.18, 1640, 0.032);
      const shimmer = ctx.createOscillator();
      const gain = ctx.createGain();
      shimmer.type = "triangle";
      shimmer.frequency.setValueAtTime(1350, now + 0.24);
      shimmer.frequency.exponentialRampToValueAtTime(2600, now + 0.56);
      gain.gain.setValueAtTime(0.032, now + 0.24);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.62);
      shimmer.connect(gain);
      gain.connect(ctx.destination);
      shimmer.start(now + 0.24);
      shimmer.stop(now + 0.64);
    } catch (e) {}
  }

  playComboVoice() {
    try {
      if (window.speechSynthesis) {
        const voices = window.speechSynthesis.getVoices ? window.speechSynthesis.getVoices() : [];
        const cuteVoice = voices.find((v) => /child|kid|girl|aria|jenny|zira|samantha|female/i.test(v.name))
          || voices.find((v) => /en/i.test(v.lang))
          || null;
        window.speechSynthesis.cancel();
        const voice = new SpeechSynthesisUtterance("Combo!");
        voice.lang = cuteVoice ? cuteVoice.lang : "en-US";
        voice.voice = cuteVoice;
        voice.pitch = 2;
        voice.rate = 1.62;
        voice.volume = 0.86;
        window.speechSynthesis.speak(voice);
      }
    } catch (e) {}
    try {
      const ctx = this.sound.context;
      const gain = ctx.createGain();
      const filter = ctx.createBiquadFilter();
      filter.type = "bandpass";
      filter.frequency.setValueAtTime(2400, ctx.currentTime);
      filter.Q.setValueAtTime(8, ctx.currentTime);
      gain.gain.setValueAtTime(0.07, ctx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.42);
      filter.connect(gain);
      gain.connect(ctx.destination);
      [0, 0.055, 0.12, 0.205].forEach((offset, i) => {
        const osc = ctx.createOscillator();
        osc.type = i % 2 === 0 ? "triangle" : "square";
        osc.frequency.setValueAtTime([1568, 2093, 2637, 3520][i], ctx.currentTime + offset);
        osc.frequency.exponentialRampToValueAtTime([2093, 2637, 3520, 4186][i], ctx.currentTime + offset + 0.08);
        osc.connect(filter);
        osc.start(ctx.currentTime + offset);
        osc.stop(ctx.currentTime + offset + 0.095);
      });
    } catch (e) {}
  }

  startCuteMusic() {
    if (this.musicStarted) return;
    this.musicStarted = true;
    const notes = [523, 659, 784, 659, 587, 698, 880, 698, 523, 659, 784, 988, 880, 784, 659, 587];
    let step = 0;
    const playNote = () => {
      try {
        const ctx = this.sound.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = "triangle";
        const freq = notes[step % notes.length];
        osc.frequency.setValueAtTime(freq, ctx.currentTime);
        gain.gain.setValueAtTime(0.018, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.18);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.2);
        if (step % 4 === 0) this.playPopSound(196);
        step += 1;
      } catch (e) {}
    };
    playNote();
    this.musicTimer = this.time.addEvent({ delay: 260, loop: true, callback: playNote });
  }

  stopCuteMusic() {
    if (this.musicTimer) this.musicTimer.remove(false);
    this.musicTimer = null;
    this.musicStarted = false;
  }

  startFreeMusic() {
    this.stopCuteMusic();
    if (this.freeMusicTimer) return;
    const notes = [392, 523, 659, 784, 988, 880, 784, 659, 740, 988, 1175, 988];
    let step = 0;
    const playNote = () => {
      try {
        const ctx = this.sound.context;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = step % 3 === 0 ? "square" : "triangle";
        osc.frequency.setValueAtTime(notes[step % notes.length], ctx.currentTime);
        gain.gain.setValueAtTime(step % 4 === 0 ? 0.028 : 0.018, ctx.currentTime);
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.14);
        osc.connect(gain);
        gain.connect(ctx.destination);
        osc.start();
        osc.stop(ctx.currentTime + 0.16);
        if (step % 6 === 0) this.playCoinDing();
        step += 1;
      } catch (e) {}
    };
    playNote();
    this.freeMusicTimer = this.time.addEvent({ delay: 155, loop: true, callback: playNote });
  }

  stopFreeMusic() {
    if (this.freeMusicTimer) this.freeMusicTimer.remove(false);
    this.freeMusicTimer = null;
  }

  burstAt(x, y, color = 0xffffff) {
    const bits = [];
    for (let i = 0; i < 5; i++) {
      const bit = this.add.rectangle(x, y, 5, 5, color, 0.95);
      bit.isFxSprite = true;
      this.fxSprites.add(bit);
      bits.push(bit);
      const angle = (Math.PI * 2 * i) / 5;
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * 28,
        y: y + Math.sin(angle) * 28,
        alpha: 0,
        scale: 0.2,
        duration: 260,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(bit)
      });
      this.time.delayedCall(420, () => this.destroyFx(bit));
    }
  }

  showOrderCompleteFx(index, order, reward) {
    const x = W / 2;
    const y = 113 + index * 46;
    const row = this.orderRows[index];
    this.setOrderNearState(row, false);
    this.playOrderCompleteSound();
    this.cameras.main.shake(620, 0.016);

    const flash = this.add.rectangle(x, y, W - 12, 50, 0xfff06a, 0.86);
    flash.isFxSprite = true;
    this.fxSprites.add(flash);
    this.tweens.add({
      targets: flash,
      scaleX: 1.08,
      alpha: 0,
      duration: 760,
      ease: "Cubic.Out",
      onComplete: () => this.destroyFx(flash)
    });

    if (reward <= 0) {
      const key = this.add.image(x, y, "sym-key").setDepth(23);
      key.setScale(28 / Math.max(key.width, key.height));
      key.isFxSprite = true;
      this.fxSprites.add(key);
      this.tweens.add({
        targets: key,
        y: y - 24,
        scale: key.scaleX * 1.28,
        alpha: 0,
        duration: 820,
        ease: "Back.Out",
        onComplete: () => this.destroyFx(key)
      });
      this.burstAt(x, y, 0xfff06a);
      return;
    }

    for (let i = 0; i < 32; i++) {
      const coin = this.add.image(x, y, "fx-coin").setDepth(22);
      const size = i % 3 === 0 ? 24 : 17;
      coin.setScale(size / Math.max(coin.width, coin.height));
      coin.isFxSprite = true;
      this.fxSprites.add(coin);
      const angle = -Math.PI + (Math.PI * 2 * i) / 32;
      const distance = 70 + (i % 6) * 18;
      const baseScale = coin.scaleX;
      this.tweens.add({
        targets: coin,
        x: x + Math.cos(angle) * distance,
        y: y + Math.sin(angle) * distance + 34,
        scaleX: baseScale * 0.14,
        scaleY: baseScale * 1.08,
        angle: 360,
        alpha: 0,
        duration: 1050 + (i % 5) * 90,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(coin)
      });
    }

    this.burstAt(x, y, 0xffffff);
  }

  grantScatterRewardFx(orderIndex = 0) {
    if (this.gameMode !== "main") return false;
    const candidates = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.board[r]?.[c];
        if (tile && !tile.scatter && !tile.chest && !tile.special) candidates.push([r, c]);
      }
    }
    if (!candidates.length) {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = this.board[r]?.[c];
          if (tile && !tile.scatter && !tile.chest) candidates.push([r, c]);
        }
      }
    }
    if (!candidates.length) return false;
    const [r, c] = Phaser.Utils.Array.GetRandom(candidates);
    const oldSprite = this.sprites[r]?.[c];
    if (oldSprite) this.destroyCandySprite(oldSprite);
    this.board[r][c] = { type: "scatter", special: null, scatter: true };
    this.sprites[r][c] = this.createCandySprite(this.board[r][c], r, c, false);
    const x = this.cellX(c);
    const y = this.cellY(r);
    const startY = this.orderRows[orderIndex]?.rowCenter || (122 + orderIndex * 43);
    const icon = this.add.image(W - 62, startY, "sym-scatter").setDepth(34);
    icon.setScale(23 / Math.max(icon.width, icon.height));
    icon.isFxSprite = true;
    this.fxSprites.add(icon);
    this.tweens.add({
      targets: icon,
      x,
      y,
      scale: 0.72,
      duration: 520,
      ease: "Cubic.InOut",
      onComplete: () => {
        this.burstAt(x, y, 0xfff06a);
        this.destroyFx(icon);
      }
    });
    this.playUnlockSound();
    this.updateKeyUi();
    return true;
  }

  showOrderAlmostFx(index) {
    const y = 113 + index * 46;
    this.playPopSound(1120);
    const banner = this.add.rectangle(W / 2, 238, W - 46, 48, 0x351352, 0.9).setStrokeStyle(4, 0xfff06a, 0.95);
    banner.isFxSprite = true;
    this.fxSprites.add(banner);
    const label = this.add.text(W / 2, 238, "75%  ORDER READY SOON", {
      fontSize: 24,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#7a2d93",
      strokeThickness: 6
    }).setOrigin(0.5);
    label.isFxSprite = true;
    this.fxSprites.add(label);
    banner.setScale(0.7);
    label.setScale(0.7);
    this.tweens.add({
      targets: [banner, label],
      scale: 1,
      duration: 260,
      ease: "Back.Out"
    });
    this.tweens.add({
      targets: [banner, label],
      alpha: 0,
      delay: 1450,
      duration: 450,
      ease: "Cubic.In",
      onComplete: () => {
        this.destroyFx(banner);
        this.destroyFx(label);
      }
    });
    for (let i = 0; i < 3; i++) this.time.delayedCall(i * 180, () => this.burstAt(W / 2, y, 0xfff06a));
  }

  showOrderRewardSummary(completions, totalReward) {
    const coinCompletions = completions.filter((item) => item.reward > 0 && item.range);
    const scatterCount = completions.filter((item) => item.scatter).length;
    const boostText = coinCompletions
      .filter((item) => item.goldMult > 1 || item.boostMult > 1)
      .map((item) => item.goldMult > 1 && item.boostMult > 1 ? `GOLD x${item.goldMult} + BOOST ${item.boostLabel}` : item.goldMult > 1 ? `GOLD x${item.goldMult}` : `BOOST ${item.boostLabel}`)
      .join("  ");
    const totalMult = coinCompletions.reduce((sum, item) => sum + item.rollMult, 0);
    const rangeMin = coinCompletions.reduce((sum, item) => sum + item.range.min, 0);
    const rangeMax = coinCompletions.reduce((sum, item) => sum + item.range.max, 0);
    const summaryDepth = 74;
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x16091f, 0.56).setDepth(summaryDepth);
    const panel = this.add.rectangle(W / 2, 430, W - 44, 224, 0x4a1a6b, 0.97).setStrokeStyle(6, 0xfff06a, 1).setDepth(summaryDepth + 1);
    const topLine = this.add.rectangle(W / 2, 330, W - 84, 7, 0x8ee8ff, 1).setDepth(summaryDepth + 2);
    const title = this.add.text(W / 2, 365, completions.length > 1 ? "ORDERS COMPLETE!" : "ORDER COMPLETE!", {
      fontSize: 33,
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#b218c9",
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(summaryDepth + 3);
    const multiplier = this.add.text(W / 2, 425, `+${totalMult}x`, {
      fontSize: 78,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#b218c9",
      strokeThickness: 12
    }).setOrigin(0.5).setDepth(summaryDepth + 4);
    const rangeText = this.add.text(W / 2, 462, `${boostText || `RANGE ${rangeMin}-${rangeMax}x`}${scatterCount ? `  +${scatterCount} SCATTER` : ""}`, {
      fontSize: 17,
      fontStyle: "900",
      color: "#8ee8ff",
      stroke: "#351352",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(summaryDepth + 3);
    const rewardText = this.add.text(W / 2, 492, `COINS +${totalReward}`, {
      fontSize: 31,
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#7a2d93",
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(summaryDepth + 3);
    const items = [veil, panel, topLine, title, multiplier, rangeText, rewardText];
    items.forEach((item) => {
      item.isFxSprite = true;
      this.fxSprites.add(item);
      item.setAlpha(0);
    });
    panel.setScale(0.72);
    multiplier.setScale(0.32);
    this.tweens.add({ targets: veil, alpha: 0.56, duration: 220 });
    this.tweens.add({ targets: [panel, topLine, title, rangeText, rewardText], alpha: 1, scale: 1, duration: 320, ease: "Back.Out" });
    this.tweens.add({ targets: multiplier, alpha: 1, scale: 1, duration: 520, ease: "Back.Out" });
    for (let spin = 0; spin < 12; spin++) {
      this.time.delayedCall(180 + spin * 58, () => {
        const preview = Phaser.Math.Between(rangeMin, rangeMax);
        multiplier.setText(`+${preview}x`);
        this.playPopSound(780 + spin * 42);
      });
    }
    this.time.delayedCall(930, () => {
      multiplier.setText(`+${totalMult}x`);
      this.playUnlockSound();
      this.cameras.main.shake(240, 0.008);
      this.burstAt(W / 2, 425, 0xfff06a);
    });
    this.tweens.add({
      targets: items,
      alpha: 0,
      delay: 2100,
      duration: 480,
      ease: "Cubic.In",
      onComplete: () => items.forEach((item) => this.destroyFx(item))
    });
    for (let i = 0; i < 4; i++) this.time.delayedCall(250 + i * 260, () => this.burstAt(W / 2, 425, i % 2 ? 0xffffff : 0xfff06a));
  }

  addFxRect(x, y, w, h, color, alpha = 1) {
    const rect = this.add.rectangle(x, y, w, h, color, alpha).setDepth(36);
    rect.isFxSprite = true;
    this.fxSprites.add(rect);
    return rect;
  }

  playStripeFx(r, c, dir) {
    const x = this.cellX(c);
    const y = this.cellY(r);
    const horizontal = dir === "stripeRow";
    const beam = this.addFxRect(
      horizontal ? W / 2 : x,
      horizontal ? y : this.boardY + (this.cell * this.rows) / 2,
      horizontal ? this.cell * COLS + 20 : 18,
      horizontal ? 18 : this.cell * this.rows + 20,
      0xff8fc7,
      0.75
    );
    const core = this.addFxRect(
      beam.x,
      beam.y,
      horizontal ? this.cell * COLS + 12 : 7,
      horizontal ? 7 : this.cell * this.rows + 12,
      0x8ee8ff,
      0.95
    );
    const sparkleA = this.addFxRect(x, y, 14, 14, 0xffe277, 1);
    const sparkleB = this.addFxRect(x, y, 8, 8, 0xffffff, 0.9);
    [beam, core].forEach((item, i) => {
      this.tweens.add({
        targets: item,
        scaleX: horizontal ? 1.08 : 0.7,
        scaleY: horizontal ? 0.7 : 1.08,
        alpha: 0,
        duration: 360 + i * 70,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(item)
      });
    });
    [sparkleA, sparkleB].forEach((item, i) => {
      this.tweens.add({
        targets: item,
        angle: 180,
        scale: 2.3 + i * 0.6,
        alpha: 0,
        duration: 420,
        ease: "Back.Out",
        onComplete: () => this.destroyFx(item)
      });
    });
    this.playPopSound(1180);
    return this.wait(300);
  }

  playBombFx(r, c) {
    const x = this.cellX(c);
    const y = this.cellY(r);
    const ring = this.add.circle(x, y, 10, 0xff8fc7, 0.28).setStrokeStyle(5, 0xffe277, 0.95).setDepth(36);
    ring.isFxSprite = true;
    this.fxSprites.add(ring);
    this.tweens.add({
      targets: ring,
      radius: 72,
      alpha: 0,
      duration: 440,
      ease: "Cubic.Out",
      onComplete: () => this.destroyFx(ring)
    });
    for (let i = 0; i < 12; i++) {
      const angle = (Math.PI * 2 * i) / 12;
      const bit = this.addFxRect(x, y, i % 2 ? 8 : 12, i % 2 ? 12 : 8, i % 3 === 0 ? 0x8ee8ff : i % 3 === 1 ? 0xff8fc7 : 0xffe277, 1);
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * 82,
        y: y + Math.sin(angle) * 82,
        angle: 180,
        scale: 0.25,
        alpha: 0,
        duration: 470,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(bit)
      });
    }
    this.playPopSound(420);
    this.time.delayedCall(80, () => this.playPopSound(980));
    return this.wait(390);
  }

  playChocolateFx(r, c, colorType) {
    const x = this.cellX(c);
    const y = this.cellY(r);
    const colorMap = { red: 0xff4f88, blue: 0x56bfff, green: 0x57d97c, yellow: 0xffdf4d, purple: 0xb95cff };
    const tint = colorMap[colorType] || 0xffe277;
    const splash = this.add.circle(x, y, 16, 0x6b311d, 0.65).setStrokeStyle(4, tint, 0.95).setDepth(36);
    splash.isFxSprite = true;
    this.fxSprites.add(splash);
    this.tweens.add({
      targets: splash,
      radius: 58,
      alpha: 0,
      duration: 520,
      ease: "Cubic.Out",
      onComplete: () => this.destroyFx(splash)
    });
    for (let i = 0; i < 10; i++) {
      const bit = this.addFxRect(x, y, 9, 9, i % 2 ? 0x8a4728 : tint, 1);
      const angle = -Math.PI / 2 + (Math.PI * 2 * i) / 10;
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * (42 + (i % 3) * 12),
        y: y + Math.sin(angle) * (42 + (i % 2) * 10),
        angle: 90,
        alpha: 0,
        duration: 460,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(bit)
      });
    }
    this.playPopSound(560);
    this.time.delayedCall(90, () => this.playPopSound(1440));
    return this.wait(410);
  }

  playSpecialActivationFx(tile, pos, otherTile) {
    const [r, c] = pos;
    if (tile.special === "stripeRow" || tile.special === "stripeCol") return this.playStripeFx(r, c, tile.special);
    if (tile.special === "bomb") return this.playBombFx(r, c);
    if (tile.special === "chocolate") {
      const color = TYPES.includes(otherTile.type) ? otherTile.type : tile.type;
      return this.playChocolateFx(r, c, color);
    }
    return this.wait(0);
  }

  async playSpecialComboFx(first, second, firstPos, secondPos, comboType, comboData = null) {
    const [r, c] = firstPos;
    const x = this.cellX(c);
    const y = this.cellY(r);
    const labels = {
      chocolateChocolate: "SWEET BOARD CLEAR!",
      chocolateSpecial: comboData?.transformSpecial === "bomb" ? "RANDOM BOMB POWER!" : "RANDOM STRIPE POWER!",
      stripeBomb: "MEGA STRIPE BLAST!",
      stripeStripe: "STRIPE CROSS!",
      bombBomb: "DOUBLE BOMB!"
    };
    const comboDepth = 70;
    const veil = this.add.rectangle(W / 2, this.boardY + this.cell * this.rows / 2, W, this.cell * this.rows + 32, 0x16091f, 0.34).setDepth(comboDepth);
    const label = this.add.text(W / 2, this.boardY + 142, labels[comboType] || "SPECIAL COMBO!", {
      fontSize: 31,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#b218c9",
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(comboDepth + 4);
    [veil, label].forEach((item) => {
      item.isFxSprite = true;
      this.fxSprites.add(item);
    });
    label.setScale(0.48);
    this.tweens.add({ targets: label, scale: 1, duration: 260, ease: "Back.Out" });
    this.tweens.add({ targets: [veil, label], alpha: 0, delay: 620, duration: 260, onComplete: () => {
      this.destroyFx(veil);
      this.destroyFx(label);
    } });

    const pulseAt = ([rr, cc], color) => {
      const ring = this.add.circle(this.cellX(cc), this.cellY(rr), 10, color, 0.22).setStrokeStyle(5, color, 1).setDepth(comboDepth + 2);
      ring.isFxSprite = true;
      this.fxSprites.add(ring);
      this.tweens.add({
        targets: ring,
        radius: 42,
        alpha: 0,
        duration: 620,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(ring)
      });
    };
    pulseAt(firstPos, 0xff8fc7);
    pulseAt(secondPos, 0x8ee8ff);

    if (comboType === "stripeStripe" || comboType === "stripeBomb") {
      const rows = comboType === "stripeBomb" ? [r - 1, r, r + 1] : [r];
      const cols = comboType === "stripeBomb" ? [c - 1, c, c + 1] : [c];
      rows.forEach((rr, i) => {
        if (rr < 0 || rr >= this.rows) return;
        const beam = this.addFxRect(W / 2, this.cellY(rr), W + 30, comboType === "stripeBomb" ? 14 : 20, i % 2 ? 0x8ee8ff : 0xff8fc7, 0.9).setDepth(comboDepth + 1);
        this.tweens.add({ targets: beam, scaleX: 1.08, alpha: 0, delay: 180 + i * 70, duration: 520, onComplete: () => this.destroyFx(beam) });
      });
      cols.forEach((cc, i) => {
        if (cc < 0 || cc >= COLS) return;
        const beam = this.addFxRect(this.cellX(cc), this.boardY + this.cell * this.rows / 2, comboType === "stripeBomb" ? 14 : 20, this.cell * this.rows + 28, i % 2 ? 0xff8fc7 : 0x8ee8ff, 0.9).setDepth(comboDepth + 1);
        this.tweens.add({ targets: beam, scaleY: 1.08, alpha: 0, delay: 180 + i * 70, duration: 520, onComplete: () => this.destroyFx(beam) });
      });
    } else if (comboType === "bombBomb") {
      for (let i = 0; i < 3; i++) {
        const ring = this.add.circle(x, y, 12, 0xff8fc7, 0.2).setStrokeStyle(7, i % 2 ? 0x8ee8ff : 0xffe277, 1).setDepth(comboDepth + 1);
        ring.isFxSprite = true;
        this.fxSprites.add(ring);
        this.tweens.add({
          targets: ring,
          radius: 72 + i * 38,
          alpha: 0,
          delay: i * 120,
          duration: 650,
          ease: "Cubic.Out",
          onComplete: () => this.destroyFx(ring)
        });
      }
    } else {
      const chocolate = first.special === "chocolate" ? first : second;
      const other = first.special === "chocolate" ? second : first;
      const color = comboData?.color || (TYPES.includes(other.type) ? other.type : chocolate.type);
      for (let rr = 0; rr < this.rows; rr++) {
        for (let cc = 0; cc < COLS; cc++) {
          const tile = this.board[rr][cc];
          if (comboType === "chocolateChocolate" || (tile && tile.type === color)) {
            this.time.delayedCall((rr + cc) * 28, () => this.burstAt(this.cellX(cc), this.cellY(rr), 0xffe277));
          }
        }
      }
    }

    this.cameras.main.shake(comboType === "stripeBomb" || comboType === "bombBomb" ? 620 : 420, comboType === "bombBomb" ? 0.018 : 0.011);
    this.playPopSound(520);
    this.time.delayedCall(110, () => this.playPopSound(1040));
    this.time.delayedCall(220, () => this.playPopSound(1680));
    await this.wait(900);
  }

  showComboText(combo) {
    this.playComboVoice();
    const label = this.add.text(W / 2, this.boardY + 150, `COMBO x${combo}`, {
      fontSize: 54,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#b218c9",
      strokeThickness: 10
    }).setOrigin(0.5).setDepth(74);
    label.isFxSprite = true;
    this.fxSprites.add(label);
    label.setScale(0.55);
    this.tweens.add({
      targets: label,
      y: label.y - 64,
      scale: 1.22,
      alpha: 0,
      delay: 420,
      duration: 1350,
      ease: "Back.Out",
      onComplete: () => this.destroyFx(label)
    });
  }

  destroyFx(sprite) {
    if (!sprite || sprite.destroyed) return;
    this.tweens.killTweensOf(sprite);
    this.fxSprites.delete(sprite);
    sprite.destroy();
  }

  clearEffects() {
    [...this.fxSprites].forEach((sprite) => this.destroyFx(sprite));
    this.children.list
      .filter((child) => child.isFxSprite)
      .forEach((child) => this.destroyFx(child));
  }

  symbolKey(tile) {
    if (tile.scatter) return "sym-scatter";
    if (tile.chest) return "sym-chest";
    if (tile.special === "stripeRow") return "sym-stripe-row";
    if (tile.special === "stripeCol") return "sym-stripe-col";
    if (tile.special === "bomb") return "sym-bomb";
    if (tile.special === "chocolate") return "sym-chocolate";
    return `sym-${tile.type}`;
  }

  addPixelFrame(x, y, w, h, options = {}) {
    const group = this.add.group();
    const variant = options.variant || "panel";
    const pink = options.pink || 0xff8fc7;
    const blue = options.blue || 0x8ee8ff;
    const yellow = options.yellow || 0xffe277;
    const bg = options.bg || 0x653184;
    const bgAlpha = options.bgAlpha ?? 0.58;
    const t = options.thickness || 4;
    const add = (item) => {
      group.add(item);
      return item;
    };
    add(this.add.rectangle(x, y, w, h, bg, bgAlpha));
    add(this.add.rectangle(x, y - h / 2 + t / 2, w, t, pink, 1));
    add(this.add.rectangle(x, y + h / 2 - t / 2, w, t, pink, 1));
    add(this.add.rectangle(x - w / 2 + t / 2, y, t, h, pink, 1));
    add(this.add.rectangle(x + w / 2 - t / 2, y, t, h, pink, 1));
    add(this.add.rectangle(x, y - h / 2 + t + 2, Math.max(20, w - 22), 2, 0xffffff, 0.42));
    add(this.add.rectangle(x, y + h / 2 - t - 2, Math.max(20, w - 22), 2, 0x351352, 0.32));

    if (variant === "board") {
      add(this.add.rectangle(x - w / 2 + 23, y - h / 2 + 10, 44, 4, blue, 1));
      add(this.add.rectangle(x + w / 2 - 36, y + h / 2 - 10, 64, 4, blue, 1));
      add(this.add.rectangle(x - w / 2 + 52, y + h / 2 - 10, 58, 4, yellow, 1));
      [[18, 18, blue], [w - 18, 18, yellow], [18, h - 18, pink], [w - 18, h - 18, yellow]].forEach(([cx, cy, color]) => {
        add(this.add.rectangle(x - w / 2 + cx, y - h / 2 + cy, 11, 11, color, 1));
        add(this.add.rectangle(x - w / 2 + cx, y - h / 2 + cy, 6, 6, 0xffffff, 0.5));
      });
    } else if (variant === "order") {
      add(this.add.rectangle(x - w / 2 + 44, y - h / 2 + t + 2, 34, 3, blue, 1));
      add(this.add.rectangle(x + w / 2 - 42, y + h / 2 - t - 2, 40, 3, blue, 1));
      add(this.add.rectangle(x - w / 2 + 78, y + h / 2 - t - 2, 46, 3, yellow, 1));
      add(this.add.rectangle(x - w / 2 + 18, y, 8, 18, blue, 1));
      add(this.add.rectangle(x + w / 2 - 18, y, 8, 18, yellow, 1));
      add(this.add.rectangle(x - w / 2 + 18, y - 11, 7, 7, 0xffffff, 0.55));
      add(this.add.rectangle(x + w / 2 - 18, y + 11, 7, 7, 0xffffff, 0.45));
    } else if (variant === "bottom") {
      add(this.add.rectangle(x - w / 2 + w * 0.33, y, 3, h - 22, blue, 0.55));
      add(this.add.rectangle(x - w / 2 + w * 0.66, y, 3, h - 22, yellow, 0.52));
      add(this.add.rectangle(x - w / 2 + 36, y - h / 2 + t + 3, 54, 3, blue, 1));
      add(this.add.rectangle(x + w / 2 - 72, y + h / 2 - t - 3, 76, 3, blue, 1));
      add(this.add.rectangle(x - w / 2 + 80, y + h / 2 - t - 3, 70, 3, yellow, 1));
      add(this.add.rectangle(x - w / 2 + 18, y + h / 2 - 18, 11, 11, blue, 1));
      add(this.add.rectangle(x + w / 2 - 18, y + h / 2 - 18, 8, 8, 0xffffff, 0.45));
    } else {
      add(this.add.rectangle(x - w / 2 + 22, y - h / 2 + t + 2, 42, 3, blue, 1));
      add(this.add.rectangle(x + w / 2 - 38, y + h / 2 - t - 2, 54, 3, blue, 1));
      add(this.add.rectangle(x - w / 2 + 54, y + h / 2 - t - 2, 48, 3, yellow, 1));
      add(this.add.rectangle(x + w / 2 - 16, y - h / 2 + 16, 12, 12, yellow, 1));
      add(this.add.rectangle(x - w / 2 + 16, y + h / 2 - 16, 12, 12, blue, 1));
      add(this.add.rectangle(x - w / 2 + 16, y - h / 2 + 16, 8, 8, 0xffffff, 0.65));
      add(this.add.rectangle(x + w / 2 - 16, y + h / 2 - 16, 8, 8, 0xffffff, 0.55));
    }
    return group;
  }

  createUi() {
    this.freeSceneWash = this.add.rectangle(W / 2, H / 2, W, H, 0x4f1220, 0.58);
    this.mainFrameArt = this.add.image(W / 2, H / 2 + 8, "ui-start-screen-panel")
      .setDisplaySize(W - 18, H - 8)
      .setAlpha(0.96)
      .setDepth(0);
    this.logoShadow = this.add.text(W / 2 + 4, 34, "CANDY", {
      fontFamily: "Trebuchet MS",
      fontSize: 42,
      fontStyle: "900",
      color: "#9b3a00",
      stroke: "#4b125b",
      strokeThickness: 8
    }).setOrigin(0.5);
    this.titleText = this.add.text(W / 2, 29, "CANDY", {
      fontFamily: "Trebuchet MS",
      fontSize: 42,
      fontStyle: "900",
      color: "#ffdf3f",
      stroke: "#ffffff",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(40);
    this.logoRibbon = this.add.rectangle(W / 2, 68, 206, 28, 0xa51ddb).setStrokeStyle(2, 0xff85ff, 0.95).setDepth(39);
    this.logoSubText = this.add.text(W / 2, 67, "ORDERS", {
      fontFamily: "Trebuchet MS",
      fontSize: 24,
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#4b125b",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(41);
    this.titleLogoArt = this.add.image(W / 2, 45, "ui-logo-candy-orders")
      .setDisplaySize(260, 101)
      .setDepth(40);
    [this.logoShadow, this.titleText, this.logoRibbon, this.logoSubText].forEach((item) => item.setVisible(false));
    this.ordersHeader = this.add.text(W / 2, 88, "", {
      fontSize: 15,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.betFrameArt = this.add.image(W / 2, 374, "ui-task-panel-strawberry")
      .setDisplaySize(W - 62, 188)
      .setAlpha(0);
    this.betPanel = this.add.rectangle(W / 2, 374, W - 96, 156, 0x6a1422, 0);
    this.betTopGlow = this.add.rectangle(W / 2, 289, W - 102, 8, 0x8ee8ff, 0);
    this.betBottomGlow = this.add.rectangle(W / 2, 459, W - 104, 8, 0xff8fc7, 0);
    this.betHeaderText = this.add.text(W / 2, 324, "SET YOUR BET", {
      fontSize: 21,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 5
    }).setOrigin(0.5);
    this.betHintText = this.add.text(W / 2, 357, "Each move spends this amount", {
      fontSize: 13,
      fontStyle: "800",
      color: "#ffffff",
      stroke: "#351352",
      strokeThickness: 3
    }).setOrigin(0.5);
    this.walletText = this.add.text(W / 2, 274, "", {
      fontSize: 18,
      fontStyle: "900",
      color: "#8ee8ff",
      stroke: "#2b1248",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5);

    this.betPillShadow = this.add.rectangle(W / 2, 410, 138, 68, 0x3b0c16, 0);
    this.betPill = this.add.rectangle(W / 2, 402, 142, 68, 0x5a1020, 0).setStrokeStyle(4, 0xffe277, 0);
    this.betMinusShadow = this.add.rectangle(92, 408, 62, 58, 0x3b0c16, 0);
    this.betMinus = this.add.rectangle(92, 400, 62, 58, 0xff4f88, 0).setStrokeStyle(4, 0xffffff, 0);
    this.betMinusText = this.add.rectangle(105, 403, 24, 5, 0xffffff, 1).setOrigin(0.5);
    this.betText = this.add.text(W / 2, 402, "", {
      fontSize: 28,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#2b1248",
      strokeThickness: 4
    }).setOrigin(0.5);
    this.betPlusShadow = this.add.rectangle(313, 408, 62, 58, 0x3b0c16, 0);
    this.betPlus = this.add.rectangle(313, 400, 62, 58, 0x45d66f, 0).setStrokeStyle(4, 0xffffff, 0);
    this.betPlusText = this.add.container(300, 403);
    this.betPlusText.add(this.add.rectangle(0, 0, 24, 5, 0xffffff, 1).setOrigin(0.5));
    this.betPlusText.add(this.add.rectangle(0, 0, 5, 24, 0xffffff, 1).setOrigin(0.5));
    this.betRangeText = this.add.text(W / 2, 456, `MIN ${MIN_BET}   STEP ${BET_STEP}   MAX ${MAX_BET}`, {
      fontSize: 13,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 3
    }).setOrigin(0.5);

    this.betMinus.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.adjustBet(-BET_STEP));
    this.betPlus.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.adjustBet(BET_STEP));

    this.orderRows = [];
    this.ordersPanelArt = this.add.image(W / 2, 166, "ui-task-panel-strawberry")
      .setDisplaySize(W - 12, 172);
    for (let i = 0; i < 3; i++) {
      const rowLayout = ORDER_ROW_LAYOUT[i];
      const rowCenter = rowLayout.y;
      const glow = this.add.rectangle(W / 2, rowCenter, W - 20, 39, 0xfff06a, 0).setStrokeStyle(3, 0xffffff, 0);
      const panel = this.add.rectangle(W / 2, rowCenter, W - 102, 30, 0x5e1422, 0.12);
      const frameArt = this.add.rectangle(W / 2, rowCenter, W - 30, 39, 0x000000, 0);
      const dotA = this.add.rectangle(70, rowCenter - 12, 7, 7, i === 0 ? 0xff78bf : i === 1 ? 0x5df2ff : 0xfff06a);
      const dotB = this.add.rectangle(W - 104, rowCenter + 12, 7, 7, i === 0 ? 0xfff06a : i === 1 ? 0xff78bf : 0x5df2ff);
      const icon = this.add.text(37, rowCenter, "", { fontSize: 24 }).setOrigin(0.5).setVisible(false);
      const label = this.add.text(rowLayout.textX, rowCenter + rowLayout.labelDy, "", { fontSize: 12, fontStyle: "800", color: "#fff" }).setOrigin(0, 0.5);
      const progress = this.add.text(rowLayout.textX, rowCenter + rowLayout.progressDy, "", {
        fontSize: 11,
        fontStyle: "800",
        color: "#fff4b8",
        stroke: "#351352",
        strokeThickness: 2
      }).setOrigin(0, 0.5);
      const rewardPlate = this.add.rectangle(rowLayout.rewardX, rowCenter, 82, 23, 0xfff4b8, 0.96)
        .setStrokeStyle(2, 0xffffff, 0.82);
      const reward = this.add.text(rowLayout.rewardX, rowCenter, "", {
        fontSize: 12,
        fontStyle: "900",
        color: "#8b2cff",
        align: "center"
      }).setOrigin(0.5).setFixedSize(78, 18);
      const keyRewardIcon = this.add.image(W - 56, rowCenter, "sym-key");
      keyRewardIcon.setScale(16 / Math.max(keyRewardIcon.width, keyRewardIcon.height));
      keyRewardIcon.setVisible(false);
      this.orderRows.push({ glow, frameArt, panel, dotA, dotB, icon, label, progress, rewardPlate, reward, keyRewardIcon, iconGroup: null, nearTweens: [], rowCenter, rowLayout });
    }

    this.statusText = this.add.text(132, 238, "Choose bet, then start", {
      fontSize: 13,
      fontStyle: "800",
      color: "#ffffff",
      stroke: "#31164c",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(41);

    this.keyHudPanel = this.add.rectangle(W - 62, 238, 96, 28, 0x5a1020, 0.9).setStrokeStyle(3, 0xffe277, 0.85);
    this.keyHudIcon = this.add.image(W - 96, 238, "sym-scatter");
    this.keyHudIcon.setScale(27 / Math.max(this.keyHudIcon.width, this.keyHudIcon.height));
    this.keyHudText = this.add.text(W - 58, 238, "0/3", {
      fontSize: 15,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4
    }).setOrigin(0.5);

    this.freeUiItems = [];
    this.freeTitleText = this.add.text(82, 48, "", {
      fontSize: 17,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#351352",
      strokeThickness: 5,
      align: "center"
    }).setOrigin(0.5).setDepth(41).setFixedSize(86, 24);
    this.freeHudPanel = this.add.image(W / 2, 52, "ui-bottom-panel-strawberry")
      .setDisplaySize(W - 20, 70)
      .setAlpha(0.98)
      .setDepth(39);
    this.freeMovesText = this.add.text(74, 56, "MOVE:15", {
      fontSize: 13,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(41).setFixedSize(104, 22);
    this.freeScatterIcon = this.add.image(248, 48, "sym-scatter");
    this.freeScatterIcon.setScale(20 / Math.max(this.freeScatterIcon.width, this.freeScatterIcon.height)).setDepth(41).setVisible(false);
    this.freeScatterText = this.add.text(214, 56, "SCATTER:0/3", {
      fontSize: 13,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(41).setFixedSize(146, 22);
    this.freeWinText = this.add.text(341, 56, "WIN 0", {
      fontSize: 12,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#351352",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(41).setFixedSize(68, 22);
    this.freeUiItems.push(this.freeHudPanel, this.freeMovesText, this.freeScatterText, this.freeWinText);

    this.mainButton = this.add.rectangle(W / 2, 526, 250, 62, 0xffd94c, 0).setStrokeStyle(4, 0xffffff, 0);
    this.mainButton.setInteractive({ useHandCursor: true });
    this.mainLabel = this.add.text(W / 2, 526, "START", {
      fontSize: 30,
      fontStyle: "900",
      color: "#5c1d7f",
      stroke: "#ffffff",
      strokeThickness: 3
    }).setOrigin(0.5);
    this.mainButton.on("pointerdown", () => {
      if (!this.busy && !this.sessionActive) this.startSession();
    });
    this.bonusBuyButton = this.add.rectangle(W / 2, 627, 250, 52, 0x19b7d4, 0).setStrokeStyle(4, 0xffffff, 0);
    this.bonusBuyButton.setInteractive({ useHandCursor: true });
    this.bonusBuyLabel = this.add.text(W / 2, 627, "", {
      fontSize: 18,
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#07354f",
      strokeThickness: 4
    }).setOrigin(0.5);
    this.bonusBuyButton.on("pointerdown", () => {
      if (!this.busy && !this.sessionActive) this.buyBonusGame();
    });

    this.winText = this.add.text(W / 2, 593, "", {
      fontSize: 18,
      fontStyle: "900",
      color: "#fff9cb",
      align: "center",
      stroke: "#351352",
      strokeThickness: 5
    }).setOrigin(0.5);

    this.statusFrameArt = this.add.image(W / 2, 650, "ui-bottom-panel-strawberry")
      .setDisplaySize(W - 12, 112)
      .setDepth(7);
    const leftInfoX = 70;
    const rightInfoX = W - 70;
    const infoLabelY = 652;
    const infoValueY = 666;
    const centerInfoY = 660;
    this.walletMeterGlow = this.add.rectangle(leftInfoX, 667, 92, 42, 0x8ee8ff, 0).setStrokeStyle(3, 0xffffff, 0).setDepth(8);
    this.gameWalletText = this.add.text(leftInfoX, infoLabelY, "WALLET", {
      fontSize: 13,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(11);
    this.gameWalletValueText = this.add.text(leftInfoX, infoValueY, "", {
      fontSize: 12,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(11);
    this.walletGainText = this.add.text(leftInfoX, 692, "", {
      fontSize: 14,
      fontStyle: "900",
      color: "#8ee8ff",
      stroke: "#351352",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(11);
    this.gameBetText = this.add.text(rightInfoX, infoLabelY, "BET", {
      fontSize: 13,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(11);
    this.gameBetValueText = this.add.text(rightInfoX, infoValueY, "", {
      fontSize: 12,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4,
      align: "center"
    }).setOrigin(0.5).setDepth(11);
    this.gameBetButton = this.add.rectangle(rightInfoX, 660, 92, 58, 0xffffff, 0.001)
      .setDepth(12)
      .setInteractive({ useHandCursor: true })
      .on("pointerdown", () => this.showGameBetMenu());
    this.winMeterGlow = this.add.rectangle(W / 2, 666, 126, 40, 0xfff06a, 0).setStrokeStyle(3, 0xfff06a, 0).setDepth(8);
    this.winMeterPanel = this.add.rectangle(W / 2, centerInfoY, 116, 38, 0x5a1020, 0).setStrokeStyle(2, 0xfff0aa, 0).setDepth(9);
    this.stepsText = this.add.text(W / 2, centerInfoY, "", {
      fontSize: 19,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#351352",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(11);
    this.winGainText = this.add.text(W / 2, 692, "", {
      fontSize: 15,
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#7a2d93",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(11);
  }

  createBoardFrame() {
    if (this.boardFrameItems) {
      this.boardFrameItems.forEach((item) => {
        if (!item) return;
        if (item.getChildren) [...item.getChildren()].forEach((child) => child.destroy());
        item.destroy();
      });
    }
    this.boardFrameItems = [];
    const boardW = this.cell * COLS;
    const boardH = this.cell * this.rows;
    const framePadX = this.gameMode === "free" ? 170 : 108;
    const framePadY = this.gameMode === "free" ? 176 : 112;
    const frameOffsetY = this.gameMode === "free" ? 4 : 4;
    const boardFrame = this.add.image(W / 2, this.boardY + boardH / 2 + frameOffsetY, "ui-board-frame-strawberry")
      .setDisplaySize(boardW + framePadX, boardH + framePadY)
      .setDepth(2)
      .setAlpha(this.gameMode === "free" ? 0.98 : 0.96);
    this.boardFrameItems.push(boardFrame);
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tileInset = this.gameMode === "free" ? 4 : 4;
        this.boardFrameItems.push(this.add.rectangle(this.cellX(c), this.cellY(r), this.cell - tileInset, this.cell - tileInset, 0x4f1020, 0.54).setStrokeStyle(1, 0xffffff, 0.16).setDepth(1));
      }
    }
  }

  setBoardVisible(visible) {
    this.boardFrameItems.forEach((item) => item.setVisible(visible));
    this.sprites.flat().forEach((sprite) => {
      if (sprite) sprite.getChildren().forEach((child) => child.setVisible(visible));
    });
  }

  showPreStart() {
    this.closePopup();
    this.clearEffects();
    this.clearOrderIcons();
    this.busy = false;
    this.resolvingMove = false;
    this.sessionActive = false;
    this.inputOpen = false;
    this.input.setDefaultCursor("none");
    this.clearSelection();
    this.gameMode = "main";
    this.savedMainOrders = null;
    this.stopFreeMusic();
    this.configureBoard(MAIN_ROWS);
    this.createBoardFrame();
    this.movesMade = 0;
    this.totalRemoved = 0;
    this.removedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.cascadeCount = 0;
    this.chocolatesCreated = 0;
    this.comboCounts = { any: 0, stripeStripe: 0, stripeBomb: 0, bombBomb: 0, chocolateSpecial: 0 };
    this.ordersCompleted = 0;
    this.sessionReward = 0;
    this.paidBetTotal = 0;
    this.moveReward = 0;
    this.moveCompletions = [];
    this.bonusExitCooldown = 0;
    this.displayedWin = 0;
    this.lastWinAmount = 0;
    this.displayedWallet = this.wallet;
    if (this.walletCounterTween) this.walletCounterTween.stop();
    this.walletCounterTween = null;
    if (this.winCounterTween) this.winCounterTween.stop();
    this.winCounterTween = null;
    this.winGainText.setText("").setAlpha(1).setY(706);
    this.walletGainText.setText("").setAlpha(1).setY(706);
    this.orders = [];
    this.clearSprites();
    this.betAmount = Phaser.Math.Clamp(this.betAmount, MIN_BET, Math.max(MIN_BET, Math.min(MAX_BET, this.wallet)));
    this.winText.setText("");
    this.statusText.setText("Choose bet, then start");
    this.updateKeyUi();
    this.orderRows.forEach((row, i) => {
      this.setOrderNearState(row, false);
      row.panel.setFillStyle(0xffffff, 0.11);
      row.icon.setText("-");
      row.label.setText(i === 0 ? "Easy order appears after start" : i === 1 ? "Medium order appears after start" : "Hard order appears after start");
      row.progress.setText("Progress locked");
      row.reward.setText("--");
    });
    this.updateBetUi();
    this.setMode("bet");
  }

  startSession() {
    if (this.wallet < this.betAmount) {
      this.statusText.setText("Not enough wallet");
      return;
    }
    this.startCuteMusic();
    this.closePopup();
    this.clearEffects();
    this.clearOrderIcons();
    this.busy = false;
    this.resolvingMove = false;
    this.sessionActive = true;
    this.inputOpen = true;
    this.selected = null;
    this.gameMode = "main";
    this.savedMainOrders = null;
    this.configureBoard(MAIN_ROWS);
    this.createBoardFrame();
    this.movesMade = 0;
    this.totalRemoved = 0;
    this.removedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.cascadeCount = 0;
    this.chocolatesCreated = 0;
    this.comboCounts = { any: 0, stripeStripe: 0, stripeBomb: 0, bombBomb: 0, chocolateSpecial: 0 };
    this.ordersCompleted = 0;
    this.sessionReward = 0;
    this.paidBetTotal = 0;
    this.moveReward = 0;
    this.moveCompletions = [];
    this.displayedWin = 0;
    this.lastWinAmount = 0;
    this.displayedWallet = this.wallet;
    if (this.walletCounterTween) this.walletCounterTween.stop();
    this.walletCounterTween = null;
    if (this.winCounterTween) this.winCounterTween.stop();
    this.winCounterTween = null;
    this.winGainText.setText("").setAlpha(1).setY(706);
    this.walletGainText.setText("").setAlpha(1).setY(706);
    this.winText.setText("");
    this.statusText.setText("Complete orders.");
    this.updateKeyUi();
    this.generateOrders();
    this.generateBoard();
    this.renderBoard(true);
    this.updateOrders();
    this.updateBetUi();
    this.setMode("game");
  }

  async buyBonusGame() {
    const cost = this.betAmount * BONUS_BUY_COST_MULT;
    if (this.wallet < cost) {
      this.statusText.setText("Not enough wallet for bonus");
      this.playBetSound(0, false);
      return;
    }
    this.closePopup();
    this.clearEffects();
    this.clearOrderIcons();
    this.stopCuteMusic();
    this.wallet -= cost;
    this.paidBetTotal = cost;
    this.movesMade = 0;
    this.totalRemoved = 0;
    this.removedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.cascadeCount = 0;
    this.chocolatesCreated = 0;
    this.comboCounts = { any: 0, stripeStripe: 0, stripeBomb: 0, bombBomb: 0, chocolateSpecial: 0 };
    this.ordersCompleted = 0;
    this.sessionReward = 0;
    this.moveReward = 0;
    this.moveCompletions = [];
    this.bonusExitCooldown = 0;
    this.displayedWin = 0;
    this.lastWinAmount = 0;
    this.displayedWallet = this.wallet;
    if (this.walletCounterTween) this.walletCounterTween.stop();
    this.walletCounterTween = null;
    if (this.winCounterTween) this.winCounterTween.stop();
    this.winCounterTween = null;
    this.winGainText.setText("").setAlpha(1).setY(706);
    this.walletGainText.setText("").setAlpha(1).setY(706);
    this.winText.setText("");
    this.orders = [];
    this.updateBetUi();
    this.playUnlockSound();
    await this.startFreeGame({ bought: true });
  }

  setMode(mode) {
    const isBet = mode === "bet";
    const isFree = mode === "free";
    const isGame = mode === "game" || isFree;
    [
      this.logoShadow,
      this.titleText,
      this.logoRibbon,
      this.logoSubText,
      this.betFrameArt,
      this.betPanel,
      this.betTopGlow,
      this.betBottomGlow,
      this.betHeaderText,
      this.betHintText,
      this.walletText,
      this.betPillShadow,
      this.betPill,
      this.betMinusShadow,
      this.betMinus,
      this.betMinusText,
      this.betText,
      this.betPlusShadow,
      this.betPlus,
      this.betPlusText,
      this.betRangeText,
      this.mainButton,
      this.mainLabel,
      this.bonusBuyButton,
      this.bonusBuyLabel
    ]
      .forEach((item) => item.setVisible(isBet));
    if (this.mainFrameArt) this.mainFrameArt.setVisible(isBet);
    [this.logoShadow, this.titleText, this.logoRibbon, this.logoSubText].forEach((item) => item.setVisible(false));
    if (this.titleLogoArt) this.titleLogoArt.setVisible(mode === "bet" || mode === "game");
    this.freeSceneWash.setVisible(isFree);
    this.ordersHeader.setVisible(mode === "game" || isFree);
    this.ordersHeader.setText(isFree ? "BONUS ORDERS" : "");
    this.ordersHeader.setY(isFree ? 88 : 88);
    if (this.ordersPanelArt) this.ordersPanelArt.setVisible(mode === "game" || isFree);
    this.orderRows.forEach((row) => Object.entries(row).forEach(([key, item]) => {
      if (item && item.setVisible) item.setVisible(key === "keyRewardIcon" ? false : mode === "game" || isFree);
    }));
    this.orderRows.forEach((row) => {
      if (row.iconGroup) {
        row.iconGroup.getChildren().forEach((child) => child.setVisible(mode === "game" || isFree));
      }
    });
    this.statusText.setVisible(mode === "game");
    this.statusText.setX(isFree ? W / 2 : 132);
    this.winText.setVisible(mode === "game");
    this.statusFrameArt.setVisible(mode === "game");
    this.walletMeterGlow.setVisible(mode === "game");
    this.gameWalletText.setVisible(mode === "game");
    this.gameWalletValueText.setVisible(mode === "game");
    this.walletGainText.setVisible(mode === "game");
    this.gameBetText.setVisible(mode === "game");
    this.gameBetValueText.setVisible(mode === "game");
    this.gameBetButton.setVisible(mode === "game");
    this.winMeterGlow.setVisible(mode === "game");
    this.winMeterPanel.setVisible(mode === "game");
    this.stepsText.setVisible(mode === "game");
    this.winGainText.setVisible(mode === "game");
    [this.keyHudPanel, this.keyHudIcon, this.keyHudText].forEach((item) => item.setVisible(mode === "game"));
    this.freeUiItems.forEach((item) => item.setVisible(isFree));
    this.setBoardVisible(isGame);
  }

  adjustBet(delta) {
    if (this.sessionActive || this.busy) return;
    const cap = Math.min(MAX_BET, this.wallet);
    const nextBet = Phaser.Math.Clamp(this.betAmount + delta, MIN_BET, cap);
    const changed = nextBet !== this.betAmount;
    this.betAmount = nextBet;
    this.playBetSound(delta, changed);
    this.pulseBetControl(delta, changed);
    this.updateBetUi();
  }

  pulseBetControl(delta, changed) {
    const button = delta > 0 ? this.betPlus : this.betMinus;
    const label = delta > 0 ? this.betPlusText : this.betMinusText;
    const scale = changed ? 1.14 : 0.95;
    [label, this.betText].forEach((target) => {
      this.tweens.killTweensOf(target);
      this.tweens.add({
        targets: target,
        scale,
        duration: 70,
        yoyo: true,
        ease: changed ? "Back.Out" : "Sine.Out"
      });
    });
    this.burstAt(delta > 0 ? 313 : 92, 378, changed ? 0xffe277 : 0x8ee8ff);
  }

  animateWinMeter(amount) {
    if (amount <= 0) return;
    if (this.winCounterTween) this.winCounterTween.stop();
    this.lastWinAmount = amount;
    const counter = { value: this.displayedWin };
    const target = this.sessionReward;
    this.playCoinSpraySound();
    this.stepsText.setY(660).setFontSize(19).setText(`WIN ${Math.round(this.displayedWin)}`);
    this.winGainText.setText(`+${amount}`).setAlpha(1).setScale(0.7).setY(692);
    this.winMeterGlow.setFillStyle(0xfff06a, 0.34).setStrokeStyle(4, 0xffffff, 0.95).setAlpha(1).setScale(1);
    this.tweens.killTweensOf([this.winMeterGlow, this.winMeterPanel, this.stepsText, this.winGainText]);
    this.tweens.add({
      targets: [this.winMeterPanel, this.stepsText],
      scale: 1.16,
      duration: 150,
      yoyo: true,
      repeat: 2,
      ease: "Back.Out"
    });
    this.tweens.add({
      targets: this.winMeterGlow,
      scaleX: 1.22,
      scaleY: 1.3,
      alpha: 0,
      duration: 980,
      ease: "Cubic.Out"
    });
    this.tweens.add({
      targets: this.winGainText,
      y: 662,
      scale: 1.15,
      alpha: 0,
      delay: 650,
      duration: 850,
      ease: "Cubic.Out",
      onComplete: () => this.winGainText.setY(692)
    });
    this.winCounterTween = this.tweens.add({
      targets: counter,
      value: target,
      duration: 2800,
      ease: "Sine.Out",
      onUpdate: () => {
        this.displayedWin = counter.value;
        this.stepsText.setText(`WIN ${Math.round(counter.value)}`);
      },
      onComplete: () => {
        this.displayedWin = target;
        this.winCounterTween = null;
        this.updateWinMeterLabel();
      }
    });
    for (let i = 0; i < 36; i++) {
      const side = i % 2 === 0 ? -1 : 1;
      const startX = W / 2 + side * (86 + (i % 4) * 8);
      const coin = this.add.image(startX, 657, "fx-coin").setDepth(10);
      const size = i % 4 === 0 ? 30 : i % 3 === 0 ? 24 : 19;
      const baseScale = size / Math.max(coin.width, coin.height);
      coin.setScale(baseScale);
      coin.isFxSprite = true;
      this.fxSprites.add(coin);
      const spread = side * (94 + (i % 7) * 13);
      const peakY = 468 - (i % 6) * 24;
      const delay = i * 62;
      const trail = this.add.circle(startX, 657, i % 4 === 0 ? 5 : 3, 0xfff06a, 0.7).setDepth(9);
      trail.isFxSprite = true;
      this.fxSprites.add(trail);
      this.tweens.add({
        targets: trail,
        x: W / 2 + spread * 0.86,
        y: peakY + 28,
        alpha: 0,
        delay: delay + 80,
        duration: 620,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(trail)
      });
      this.tweens.add({
        targets: coin,
        x: W / 2 + spread,
        y: peakY,
        angle: 360,
        scaleX: baseScale * 0.12,
        scaleY: baseScale * 1.08,
        delay,
        duration: 680 + (i % 4) * 70,
        ease: "Cubic.Out",
        onComplete: () => {
          this.tweens.add({
            targets: coin,
            x: coin.x + side * (18 + (i % 4) * 8),
            y: 700,
            angle: 720,
            scaleX: baseScale,
            scaleY: baseScale,
            alpha: 0,
            duration: 780 + (i % 5) * 70,
            ease: "Cubic.In",
            onComplete: () => {
              if (i % 9 === 0) this.playCoinDing(1900 + (i % 3) * 180, 0.022);
              this.burstAt(W / 2 + side * 54, 685, 0xfff06a);
              this.destroyFx(coin);
            }
          });
        }
      });
    }
  }

  animateWalletMeter(amount) {
    if (amount <= 0) return;
    if (this.walletCounterTween) this.walletCounterTween.stop();
    const counter = { value: this.displayedWallet };
    const target = this.wallet;
    this.walletGainText.setText(`+${amount}`).setAlpha(1).setScale(0.7).setY(692);
    this.walletMeterGlow.setFillStyle(0x8ee8ff, 0.34).setStrokeStyle(3, 0xffffff, 0.95).setAlpha(1).setScale(1);
    this.tweens.killTweensOf([this.walletMeterGlow, this.gameWalletText, this.gameWalletValueText, this.walletGainText]);
    this.tweens.add({
      targets: [this.gameWalletText, this.gameWalletValueText],
      scale: 1.16,
      duration: 150,
      yoyo: true,
      repeat: 2,
      ease: "Back.Out"
    });
    this.tweens.add({
      targets: this.walletMeterGlow,
      scaleX: 1.18,
      scaleY: 1.22,
      alpha: 0,
      duration: 1100,
      ease: "Cubic.Out"
    });
    this.tweens.add({
      targets: this.walletGainText,
      y: 648,
      scale: 1.12,
      alpha: 0,
      delay: 900,
      duration: 900,
      ease: "Cubic.Out",
      onComplete: () => this.walletGainText.setY(692)
    });
    this.walletCounterTween = this.tweens.add({
      targets: counter,
      value: target,
      duration: 2800,
      ease: "Sine.Out",
      onUpdate: () => {
        this.displayedWallet = counter.value;
        this.gameWalletText.setText("WALLET");
        this.gameWalletValueText.setText(`${Math.round(counter.value)}`);
      },
      onComplete: () => {
        this.displayedWallet = target;
        this.gameWalletText.setText("WALLET");
        this.gameWalletValueText.setText(`${target}`);
        this.walletCounterTween = null;
      }
    });
    for (let i = 0; i < 8; i++) {
      const coin = this.add.image(W / 2 + ((i % 3) - 1) * 22, 610 + (i % 2) * 10, "fx-coin").setDepth(10);
      const baseScale = (i % 3 === 0 ? 21 : 16) / Math.max(coin.width, coin.height);
      coin.setScale(baseScale);
      coin.isFxSprite = true;
      this.fxSprites.add(coin);
      this.tweens.add({
        targets: coin,
        x: 75 + ((i % 3) - 1) * 8,
        y: 684,
        angle: 360,
        scaleX: baseScale * 0.12,
        alpha: 0,
        delay: 360 + i * 95,
        duration: 760,
        ease: "Cubic.In",
        onComplete: () => {
          if (i % 4 === 0) this.playCoinDing(1650 + (i % 3) * 160, 0.024);
          this.burstAt(75, 684, 0x8ee8ff);
          this.destroyFx(coin);
        }
      });
    }
  }

  updateWinMeterLabel() {
    if (this.winCounterTween) {
      this.stepsText.setY(660).setFontSize(19).setText(`WIN ${Math.round(this.displayedWin)}`);
      return;
    }
    this.stepsText.setY(660).setFontSize(14).setText(`LAST WIN: ${this.lastWinAmount}`);
  }

  updateBetUi() {
    const cap = Math.min(MAX_BET, this.wallet);
    const atMin = this.betAmount <= MIN_BET;
    const atMax = this.betAmount >= cap;
    this.walletText.setText(`WALLET ${this.wallet}`);
    this.betText.setText(`BET ${this.betAmount}`);
    this.gameWalletText.setText("WALLET");
    this.gameWalletValueText.setText(`${Math.round(this.displayedWallet)}`);
    this.gameBetText.setText(this.gameMode === "free" ? "FREE" : "BET");
    this.gameBetValueText.setText(this.gameMode === "free" ? `${this.freeMovesLeft}` : `${this.betAmount}`);
    if (this.gameMode === "free") this.stepsText.setY(660).setFontSize(14).setText(`BONUS WIN: ${this.freeReward}`);
    else this.updateWinMeterLabel();
    this.betMinus.setFillStyle(atMin ? 0x9a4666 : 0xff4f88, 0);
    this.betPlus.setFillStyle(atMax ? 0x3f8a55 : 0x45d66f, 0);
    this.betMinus.setAlpha(1);
    this.betMinusText.setAlpha(atMin ? 0.72 : 1);
    this.betPlus.setAlpha(1);
    this.betPlusText.setAlpha(atMax ? 0.72 : 1);
    this.mainLabel.setText("START");
    this.mainButton.setFillStyle(0xffd94c, 0);
    const bonusCost = this.betAmount * BONUS_BUY_COST_MULT;
    const canBuyBonus = this.wallet >= bonusCost;
    this.bonusBuyLabel.setText(`BONUS ${bonusCost}`);
    this.bonusBuyButton.setFillStyle(canBuyBonus ? 0x19b7d4 : 0x34606f, 0);
    this.bonusBuyButton.setAlpha(1);
    this.bonusBuyLabel.setAlpha(canBuyBonus ? 1 : 0.68);
  }

  payoutThrottle() {
    const betTotal = Math.max(this.betAmount, this.paidBetTotal || 0);
    const walletHeat = Math.max(0, (this.wallet - STARTING_WALLET) / STARTING_WALLET);
    const rewardHeat = Math.max(0, (this.sessionReward - betTotal * 0.9) / betTotal);
    return Phaser.Math.Clamp(1 - walletHeat * 0.4 - rewardHeat * 0.28, 0.66, 1);
  }

  effectiveMult(mult) {
    return Math.max(1, Math.round(mult * this.payoutThrottle()));
  }

  effectiveReward(mult) {
    return Math.max(1, Math.round(mult * this.betAmount * this.payoutThrottle()));
  }

  multRange(mult) {
    const median = this.effectiveMult(mult);
    const spread = Math.max(1, Math.round(median * 0.25));
    return { min: Math.max(1, median - spread), median, max: median + spread };
  }

  rollOrderMult(mult) {
    const range = this.multRange(mult);
    return { range, mult: Phaser.Math.Between(range.min, range.max) };
  }

  rollBonusOrderBoost(order) {
    return { mult: 1, label: "" };
  }

  chooseMainRewardType(tier) {
    const roll = Math.random();
    if (tier === "Easy") {
      if (roll < 0.75) return "coins";
      if (roll < 0.95) return "scatter";
      return "coinsScatter";
    }
    if (tier === "Medium") {
      if (roll < 0.45) return "coins";
      if (roll < 0.80) return "scatter";
      return "coinsScatter";
    }
    if (roll < 0.60) return "coins";
    if (roll < 0.85) return "scatter";
    return "coinsScatter";
  }

  orderPaysCoins(order) {
    return order.scope === "free" || order.rewardType === "coins" || order.rewardType === "coinsScatter";
  }

  orderPaysScatter(order) {
    return order.scope !== "free" && (order.rewardType === "scatter" || order.rewardType === "coinsScatter");
  }

  generateOrders() {
    this.orders = [
      this.createOrder("Easy"),
      this.createOrder("Medium"),
      this.createOrder("Hard")
    ];
  }

  createOrder(tier) {
    let spec;
    if (tier === "Easy") {
      spec = { kind: "color", type: Phaser.Utils.Array.GetRandom(TYPES), need: 16, mult: 6 };
    } else if (tier === "Medium") {
      const pool = [
        ...TYPES.map((type) => ({ kind: "color", type, need: 45, mult: 15 })),
        { kind: "any", need: 90, mult: 17 },
        { kind: "cascade", need: 8, mult: 19 },
        { kind: "combo", comboType: "any", need: 3, mult: 24 }
      ];
      spec = Phaser.Utils.Array.GetRandom(pool);
    } else {
      const pool = [
        ...TYPES.map((type) => ({ kind: "color", type, need: 150, mult: 24 })),
        { kind: "chocolate", need: 12, mult: 29 },
        { kind: "cascade", need: 24, mult: 31 },
        { kind: "combo", comboType: "stripeStripe", need: 10, mult: 36 },
        { kind: "combo", comboType: "stripeBomb", need: 8, mult: 40 },
        { kind: "combo", comboType: "bombBomb", need: 7, mult: 46 },
        { kind: "combo", comboType: "chocolateSpecial", need: 5, mult: 55 }
      ];
      spec = Phaser.Utils.Array.GetRandom(pool);
    }
    const order = { tier, rewardType: this.chooseMainRewardType(tier), ...spec };
    order.start = this.rawOrderProgress(order);
    return order;
  }

  generateFreeOrders() {
    this.orders = [
      this.createFreeOrder("Bonus Easy"),
      this.createFreeOrder("Bonus Medium"),
      this.createFreeOrder("Bonus Hard")
    ];
  }

  createFreeOrder(tier) {
    const pools = {
      "Bonus Easy": [
        ...TYPES.map((type) => ({ kind: "color", type, need: 26, mult: 8 })),
        { kind: "any", need: 62, mult: 10 }
      ],
      "Bonus Medium": [
        ...TYPES.map((type) => ({ kind: "color", type, need: 55, mult: 22 })),
        { kind: "cascade", need: 7, mult: 27 },
        { kind: "combo", comboType: "any", need: 3, mult: 34 }
      ],
      "Bonus Hard": [
        ...TYPES.map((type) => ({ kind: "color", type, need: 92, mult: 54 })),
        { kind: "chocolate", need: 5, mult: 64 },
        { kind: "combo", comboType: "stripeBomb", need: 4, mult: 75 },
        { kind: "combo", comboType: "chocolateSpecial", need: 3, mult: 96 }
      ]
    };
    const order = { tier, scope: "free", ...Phaser.Utils.Array.GetRandom(pools[tier]) };
    order.start = this.rawOrderProgress(order);
    order.gold = false;
    order.discounted = false;
    return order;
  }

  generateBoard() {
    this.clearSprites();
    do {
      this.board = [];
      for (let r = 0; r < this.rows; r++) {
        this.board[r] = [];
        for (let c = 0; c < COLS; c++) {
          this.board[r][c] = this.randomTile();
        }
      }
    } while (this.findMatches().length > 0 || !this.hasLegalMove());
  }

  generateFreeBoard() {
    this.generateBoard();
    const cells = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) cells.push([r, c]);
    }
    Phaser.Utils.Array.Shuffle(cells).slice(0, Phaser.Math.Between(3, 5)).forEach(([r, c]) => {
      this.board[r][c] = this.randomFreeSpecialTile();
    });
  }

  scatterDropRateFor(count, wave = 0) {
    const rates = [SCATTER_DROP_RATE, SCATTER_DROP_RATE * 0.8, SCATTER_DROP_RATE * 0.55];
    const cooldownBrake = this.bonusExitCooldown > 0 ? 0.2 : 1;
    return (rates[Math.min(count, rates.length - 1)] || 0) * Math.pow(0.94, Math.max(0, wave)) * cooldownBrake;
  }

  freeScatterDropRateFor(count, wave = 0) {
    const rates = [FREE_SCATTER_DROP_RATE, FREE_SCATTER_DROP_RATE * 0.75, FREE_SCATTER_DROP_RATE * 0.45];
    const retriggerBrake = Math.pow(0.72, Math.max(0, this.freeScatterRetriggers || 0));
    return (rates[Math.min(count, rates.length - 1)] || 0) * Math.pow(0.92, Math.max(0, wave)) * retriggerBrake;
  }

  localTypePressure(board, r, c, type) {
    const same = (rr, cc) => board[rr]?.[cc]?.type === type && !board[rr]?.[cc]?.scatter && board[rr]?.[cc]?.chest !== true;
    let pressure = 1;
    if ((same(r, c - 1) && same(r, c - 2)) || (same(r, c + 1) && same(r, c + 2)) || (same(r, c - 1) && same(r, c + 1))) {
      pressure *= 0.55;
    } else if (same(r, c - 1) || same(r, c + 1)) {
      pressure *= 0.85;
    }
    if (same(r + 1, c) && same(r + 2, c)) {
      pressure *= 0.5;
    } else if (same(r + 1, c)) {
      pressure *= 0.82;
    }
    return pressure;
  }

  weightedRandomTile(board = this.board, r = -1, c = -1, allowScatter = false, wave = 0) {
    const scatterCount = this.countScatters();
    if (allowScatter && this.gameMode === "main" && scatterCount < this.scatterGoal && Math.random() < this.scatterDropRateFor(scatterCount, wave)) {
      return { type: "scatter", special: null, scatter: true };
    }
    if (allowScatter && this.gameMode === "free" && scatterCount < this.scatterGoal && Math.random() < this.freeScatterDropRateFor(scatterCount, wave)) {
      return { type: "scatter", special: null, scatter: true };
    }
    const weights = TYPES.map((type) => {
      const local = r >= 0 && c >= 0 ? this.localTypePressure(board, r, c, type) : 1;
      const cascadePressure = Math.pow(0.96, Math.max(0, wave));
      return Math.max(0.05, local * cascadePressure);
    });
    const total = weights.reduce((sum, weight) => sum + weight, 0);
    let roll = Math.random() * total;
    for (let i = 0; i < TYPES.length; i++) {
      roll -= weights[i];
      if (roll <= 0) return { type: TYPES[i], special: null };
    }
    return { type: Phaser.Utils.Array.GetRandom(TYPES), special: null };
  }

  randomTile(allowScatter = false, board = this.board, r = -1, c = -1, wave = 0) {
    return this.weightedRandomTile(board, r, c, allowScatter, wave);
  }

  randomFreeSpecialTile() {
    const special = Phaser.Utils.Array.GetRandom(["stripeRow", "stripeCol", "bomb", "chocolate"]);
    return { type: Phaser.Utils.Array.GetRandom(TYPES), special };
  }

  isLegalSwap(r1, c1, r2, c2) {
    const a = this.board[r1]?.[c1];
    const b = this.board[r2]?.[c2];
    if (!a || !b || a.chest || b.chest) return false;
    this.board[r1][c1] = b;
    this.board[r2][c2] = a;
    const legal = a.special || b.special || this.findMatches().length > 0;
    this.board[r1][c1] = a;
    this.board[r2][c2] = b;
    return legal;
  }

  hasLegalMove() {
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (c < COLS - 1 && this.isLegalSwap(r, c, r, c + 1)) return true;
        if (r < this.rows - 1 && this.isLegalSwap(r, c, r + 1, c)) return true;
      }
    }
    return false;
  }

  shuffleBoardTilesOnly() {
    const cells = [];
    const tiles = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.board[r]?.[c];
        if (!tile || tile.chest) continue;
        cells.push([r, c]);
        tiles.push(tile);
      }
    }
    if (tiles.length < 2) return;
    Phaser.Utils.Array.Shuffle(tiles);
    cells.forEach(([r, c], index) => {
      this.board[r][c] = tiles[index];
    });
  }

  rebuildShuffledBoard() {
    let guard = 0;
    do {
      this.shuffleBoardTilesOnly();
      guard += 1;
    } while ((this.findMatches().length > 0 || !this.hasLegalMove()) && guard < 50);
  }

  async showShuffleFx() {
    this.statusText.setText("No moves. Refreshing board...");
    const veil = this.add.rectangle(W / 2, this.boardY + (this.rows * this.cell) / 2, this.cell * COLS + 28, this.cell * this.rows + 28, 0x42f5ff, 0.1)
      .setStrokeStyle(4, 0xfff06a, 0.85);
    veil.isFxSprite = true;
    this.fxSprites.add(veil);
    const label = this.add.text(W / 2, this.boardY + (this.rows * this.cell) / 2, "RESHUFFLE", {
      fontFamily: "Arial Black",
      fontSize: "26px",
      color: "#fff6a8",
      stroke: "#351352",
      strokeThickness: 6
    }).setOrigin(0.5);
    label.isFxSprite = true;
    this.fxSprites.add(label);
    this.playUnlockSound();
    this.time.delayedCall(90, () => this.playPopSound(880));
    this.time.delayedCall(190, () => this.playPopSound(1320));
    this.cameras.main.flash(260, 90, 245, 255);
    this.cameras.main.shake(300, 0.008);
    this.tweens.add({ targets: veil, alpha: 0.55, yoyo: true, repeat: 1, duration: 160, ease: "Sine.InOut" });
    this.tweens.add({ targets: label, scale: 1.16, yoyo: true, repeat: 1, duration: 160, ease: "Back.Out" });
    await this.wait(360);
    this.tweens.add({ targets: [veil, label], alpha: 0, duration: 180, ease: "Cubic.In" });
    await this.wait(190);
    this.tweens.killTweensOf(veil);
    this.tweens.killTweensOf(label);
    this.fxSprites.delete(veil);
    this.fxSprites.delete(label);
    veil.destroy();
    label.destroy();
  }

  async ensureLegalMovesWithShuffle(showFx = true) {
    let guard = 0;
    while (!this.hasLegalMove() && guard < 3) {
      if (showFx) await this.showShuffleFx();
      this.rebuildShuffledBoard();
      this.renderBoard(true);
      if (showFx) {
        this.cameras.main.flash(220, 255, 240, 106);
        this.playPopSound(1560);
        await this.wait(180);
      }
      guard += 1;
    }
  }

  clearSprites() {
    if (!this.sprites) this.sprites = [];
    this.clearEffects();
    [...this.allCandySprites].forEach((s) => this.destroyCandySprite(s));
    this.children.list
      .filter((child) => child.isBoardSymbol)
      .forEach((child) => {
        this.tweens.killTweensOf(child);
        child.destroy();
      });
    this.sprites = Array.from({ length: this.rows }, () => Array(COLS).fill(null));
  }

  destroyCandySprite(sprite) {
    if (!sprite) return;
    sprite.getChildren().forEach((child) => {
      this.tweens.killTweensOf(child);
      if (child.disableInteractive) child.disableInteractive();
      child.destroy();
    });
    this.allCandySprites.delete(sprite);
    sprite.destroy();
  }

  renderBoard(instant = false) {
    this.clearSprites();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.board[r][c];
        if (tile) this.sprites[r][c] = this.createCandySprite(tile, r, c, instant);
      }
    }
  }

  addBlock(group, x, y, dx, dy, w, h, color, alpha = 1) {
    const block = this.add.rectangle(Math.round(x + dx), Math.round(y + dy), w, h, color, alpha).setOrigin(0, 0);
    group.add(block);
    return block;
  }

  drawPixelCandy(group, tile, x, y, scale = 1) {
    const px = (v) => Math.round(v * scale);
    const ox = -22 * scale;
    const oy = -22 * scale;
    const color = tile.special === "chocolate" ? COLORS.chocolate : COLORS[tile.type];
    const dark = 0x3a1638;
    const light = 0xffffff;
    this.addBlock(group, x, y, ox + px(4), oy + px(8), px(36), px(32), 0x21102e, 0.25);

    if (tile.type === "green" && !tile.special) {
      this.addBlock(group, x, y, ox + px(8), oy + px(6), px(10), px(10), dark);
      this.addBlock(group, x, y, ox + px(26), oy + px(6), px(10), px(10), dark);
      this.addBlock(group, x, y, ox + px(10), oy + px(8), px(8), px(8), color);
      this.addBlock(group, x, y, ox + px(26), oy + px(8), px(8), px(8), color);
      this.addBlock(group, x, y, ox + px(7), oy + px(14), px(30), px(28), dark);
      this.addBlock(group, x, y, ox + px(10), oy + px(16), px(24), px(24), color);
      this.addBlock(group, x, y, ox + px(15), oy + px(20), px(4), px(4), 0x1a1020);
      this.addBlock(group, x, y, ox + px(27), oy + px(20), px(4), px(4), 0x1a1020);
      this.addBlock(group, x, y, ox + px(19), oy + px(29), px(8), px(3), 0x1a1020);
    } else if (tile.type === "yellow" && !tile.special) {
      this.addBlock(group, x, y, ox + px(2), oy + px(15), px(10), px(18), dark);
      this.addBlock(group, x, y, ox + px(34), oy + px(15), px(10), px(18), dark);
      this.addBlock(group, x, y, ox + px(4), oy + px(17), px(8), px(14), 0xfff0a0);
      this.addBlock(group, x, y, ox + px(34), oy + px(17), px(8), px(14), 0xfff0a0);
      this.addBlock(group, x, y, ox + px(10), oy + px(9), px(26), px(34), dark);
      this.addBlock(group, x, y, ox + px(13), oy + px(12), px(20), px(28), color);
      this.addBlock(group, x, y, ox + px(19), oy + px(12), px(4), px(28), 0xfff7b8, 0.75);
    } else if (tile.type === "purple" && !tile.special) {
      this.addBlock(group, x, y, ox + px(8), oy + px(10), px(30), px(30), dark);
      this.addBlock(group, x, y, ox + px(11), oy + px(12), px(24), px(24), color);
      this.addBlock(group, x, y, ox + px(3), oy + px(24), px(40), px(6), 0xffd28f, 0.95);
      this.addBlock(group, x, y, ox + px(7), oy + px(26), px(32), px(4), 0x8b5dff, 0.65);
    } else if (tile.type === "blue" && !tile.special) {
      this.addBlock(group, x, y, ox + px(20), oy + px(30), px(6), px(16), dark);
      this.addBlock(group, x, y, ox + px(21), oy + px(31), px(4), px(13), 0xffe0d3);
      this.addBlock(group, x, y, ox + px(8), oy + px(5), px(30), px(30), dark);
      this.addBlock(group, x, y, ox + px(11), oy + px(8), px(24), px(24), color);
      this.addBlock(group, x, y, ox + px(17), oy + px(13), px(14), px(4), 0xbcecff);
      this.addBlock(group, x, y, ox + px(17), oy + px(21), px(14), px(4), 0xbcecff);
    } else {
      this.addBlock(group, x, y, ox + px(10), oy + px(8), px(26), px(34), dark);
      this.addBlock(group, x, y, ox + px(13), oy + px(10), px(20), px(30), color);
      this.addBlock(group, x, y, ox + px(16), oy + px(12), px(14), px(4), 0xffa4b3, 0.85);
      this.addBlock(group, x, y, ox + px(15), oy + px(34), px(16), px(4), 0xffb8c3, 0.45);
    }

    this.addBlock(group, x, y, ox + px(14), oy + px(11), px(7), px(5), light, 0.7);

    if (tile.special === "stripeRow" || tile.special === "stripeCol") {
      const stripeColor = 0xffffff;
      if (tile.special === "stripeRow") {
        this.addBlock(group, x, y, ox + px(10), oy + px(17), px(26), px(5), stripeColor, 0.9);
        this.addBlock(group, x, y, ox + px(10), oy + px(29), px(26), px(5), stripeColor, 0.9);
      } else {
        this.addBlock(group, x, y, ox + px(16), oy + px(9), px(5), px(33), stripeColor, 0.9);
        this.addBlock(group, x, y, ox + px(28), oy + px(9), px(5), px(33), stripeColor, 0.9);
      }
    }
    if (tile.special === "bomb") {
      this.addBlock(group, x, y, ox + px(8), oy + px(12), px(30), px(28), 0x7ed7ff);
      this.addBlock(group, x, y, ox + px(12), oy + px(16), px(22), px(20), 0xff5aa7);
      this.addBlock(group, x, y, ox + px(18), oy + px(8), px(8), px(8), 0xfff06a);
      this.addBlock(group, x, y, ox + px(20), oy + px(4), px(4), px(6), 0xfff06a);
      this.addBlock(group, x, y, ox + px(15), oy + px(23), px(16), px(5), 0xffffff, 0.85);
    }
    if (tile.special === "chocolate") {
      this.addBlock(group, x, y, ox + px(8), oy + px(8), px(32), px(34), 0x3a1d12);
      this.addBlock(group, x, y, ox + px(11), oy + px(11), px(26), px(28), 0x7a3f23);
      this.addBlock(group, x, y, ox + px(12), oy + px(24), px(24), px(3), 0x2a120b, 0.8);
      this.addBlock(group, x, y, ox + px(23), oy + px(12), px(3), px(26), 0x2a120b, 0.8);
      this.addBlock(group, x, y, ox + px(14), oy + px(13), px(7), px(5), 0xd98b4a, 0.75);
    }
  }

  createCandySprite(tile, r, c, instant = false, startY = null) {
    const x = this.cellX(c);
    const y = startY === null ? this.cellY(r) : startY;
    const g = this.add.group();
    const hit = this.add.circle(x, y, Math.max(20, this.cell * 0.44), 0xffffff, 0.001);
    if (!tile.chest) hit.setInteractive({ useHandCursor: true });
    hit.tileRef = tile;
    hit.row = r;
    hit.col = c;

    const img = this.add.image(x, y, this.symbolKey(tile));
    const isFreeBoard = this.rows === FREE_ROWS;
    const symbolSize = tile.scatter
      ? this.cell * (isFreeBoard ? 0.94 : 1.08)
      : this.cell * (isFreeBoard ? 0.86 : 0.94);
    img.setScale(symbolSize / Math.max(img.width, img.height));
    if (tile.scatter) img.setRotation(0);
    img.isBoardSymbol = true;
    hit.isBoardSymbol = true;
    g.addMultiple([img, hit]);

    if (!tile.chest) hit.on("pointerdown", () => this.onTileTap(hit.row, hit.col));
    g.getChildren().forEach((child) => {
      child.setDepth(4);
      child.row = r;
      child.col = c;
      if (!instant) {
        const baseScaleX = child.scaleX;
        const baseScaleY = child.scaleY;
        child.setScale(baseScaleX * 0.7, baseScaleY * 0.7);
        this.tweens.add({
          targets: child,
          scaleX: baseScaleX,
          scaleY: baseScaleY,
          duration: 170,
          ease: "Back.Out"
        });
      }
    });
    g.x = 0;
    g.y = 0;
    this.allCandySprites.add(g);
    return g;
  }

  specialMark(tile) {
    if (tile.special === "stripeRow") return "-";
    if (tile.special === "stripeCol") return "|";
    if (tile.special === "bomb") return "B";
    if (tile.special === "chocolate") return "C";
    return "";
  }

  onTileTap(r, c) {
    if (!this.inputOpen || this.busy || this.resolvingMove) return;
    const tile = this.board[r][c];
    if (!tile || tile.chest) return;
    if (!this.selected) {
      this.selectTile(r, c);
      return;
    }
    const prev = this.selected;
    if (prev.r === r && prev.c === c) {
      this.clearSelection();
      return;
    }
    if (Math.abs(prev.r - r) + Math.abs(prev.c - c) !== 1) {
      this.clearSelection();
      this.selectTile(r, c);
      return;
    }
    this.clearSelection();
    this.performMove(prev.r, prev.c, r, c);
  }

  selectTile(r, c) {
    this.selected = { r, c };
    this.selection = this.add.rectangle(this.cellX(c), this.cellY(r), this.cell - 4, this.cell - 4, 0xffffff, 0)
      .setStrokeStyle(4, 0xfff36a, 1)
      .setDepth(5);
  }

  clearSelection() {
    if (this.selection) this.selection.destroy();
    this.selection = null;
    this.selected = null;
  }

  moveSpriteTo(sprite, r, c, duration = 220) {
    if (!sprite) return;
    const children = sprite.getChildren();
    const hit = children[children.length - 1];
    const dx = this.cellX(c) - hit.x;
    const dy = this.cellY(r) - hit.y;
    children.forEach((child) => {
      child.row = r;
      child.col = c;
      this.tweens.add({
        targets: child,
        x: child.x + dx,
        y: child.y + dy,
        duration,
        ease: "Cubic.Out"
      });
    });
  }

  async performMove(r1, c1, r2, c2) {
    if (!this.sessionActive) return;
    if (this.resolvingMove) return;
    this.resolvingMove = true;
    const inFreeGame = this.gameMode === "free";
    if (!inFreeGame && this.wallet < this.betAmount) {
      this.resolvingMove = false;
      await this.finishSession("Wallet empty");
      return;
    }
    this.inputOpen = false;
    this.busy = true;
    this.statusText.setText("Checking move...");
    const a = this.board[r1][c1];
    const b = this.board[r2][c2];
    const spriteA = this.sprites[r1][c1];
    const spriteB = this.sprites[r2][c2];
    this.board[r1][c1] = b;
    this.board[r2][c2] = a;
    this.sprites[r1][c1] = spriteB;
    this.sprites[r2][c2] = spriteA;
    this.moveSpriteTo(spriteB, r1, c1, 190);
    this.moveSpriteTo(spriteA, r2, c2, 190);
    await this.wait(210);

    const specialSwap = a.special || b.special;
    const matchesAfterSwap = this.findMatches();
    const oneSpecialOneNormal = (a.special && !b.special) || (!a.special && b.special);
    if (!specialSwap && matchesAfterSwap.length === 0) {
      this.board[r1][c1] = a;
      this.board[r2][c2] = b;
      this.sprites[r1][c1] = spriteA;
      this.sprites[r2][c2] = spriteB;
      this.moveSpriteTo(spriteA, r1, c1, 170);
      this.moveSpriteTo(spriteB, r2, c2, 170);
      await this.wait(190);
      this.statusText.setText("No match. Pick another swap.");
      this.busy = false;
      this.resolvingMove = false;
      this.inputOpen = true;
      return;
    }

    if (inFreeGame) {
      this.freeMovesLeft = Math.max(0, this.freeMovesLeft - 1);
    } else {
      this.wallet -= this.betAmount;
      this.paidBetTotal += this.betAmount;
      if (this.bonusExitCooldown > 0) this.bonusExitCooldown -= 1;
    }
    if (this.walletCounterTween) this.walletCounterTween.stop();
    this.walletCounterTween = null;
    this.displayedWallet = this.wallet;
    this.movesMade += 1;
    this.moveReward = 0;
    this.moveCompletions = [];
    this.updateBetUi();
    this.updateFreeUi();
    this.statusText.setText(inFreeGame ? "Free move resolving..." : "Resolving...");

    if (oneSpecialOneNormal) {
      const normalMovedPos = a.special ? [r1, c1] : [r2, c2];
      const specialMovedPos = a.special ? [r2, c2] : [r1, c1];
      const normalMatches = matchesAfterSwap.filter((group) =>
        group.cells.some(([r, c]) => r === normalMovedPos[0] && c === normalMovedPos[1])
      );
      if (normalMatches.length > 0) {
        const createdSpecials = await this.resolveMatches(normalMatches, {
          preferredCreatePositions: [normalMovedPos],
          protectedPositions: [specialMovedPos],
          skipSpecialExpansion: true
        });
        await this.collapseAndFill(true, [specialMovedPos, ...(createdSpecials || []).map(({ r, c }) => [r, c])]);
      }
      await this.activateMovedSpecials(a, b, [[r1, c1], [r2, c2]]);
    } else if (specialSwap) {
      await this.activateMovedSpecials(a, b, [[r1, c1], [r2, c2]]);
    }

    await this.resolveAll({ preferredCreatePositions: [[r2, c2], [r1, c1]] });
    if (this.gameMode === "free") await this.checkFreeScatterRetrigger();
    else this.checkScatterBonus();
    await this.finishMove();
  }

  async activateMovedSpecials(a, b, positions) {
    const remove = new Set();
    const fxWaits = [];
    const [posA, posB] = positions;
    const addCell = (r, c) => {
      if (r >= 0 && r < this.rows && c >= 0 && c < COLS) remove.add(`${r},${c}`);
    };
    const addRow = (r) => {
      if (r < 0 || r >= this.rows) return;
      for (let c = 0; c < COLS; c++) addCell(r, c);
    };
    const addCol = (c) => {
      if (c < 0 || c >= COLS) return;
      for (let r = 0; r < this.rows; r++) addCell(r, c);
    };
    const addArea = (r, c, radius) => {
      for (let rr = r - radius; rr <= r + radius; rr++) {
        for (let cc = c - radius; cc <= c + radius; cc++) addCell(rr, cc);
      }
    };
    const addColorTargets = (color, applyTarget) => {
      if (!TYPES.includes(color)) return 0;
      let count = 0;
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = this.board[r][c];
          if (tile && !tile.scatter && tile.type === color && tile.special !== "chocolate") {
            applyTarget(r, c, count);
            count += 1;
          }
        }
      }
      return count;
    };
    const addBoard = () => {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < COLS; c++) addCell(r, c);
      }
    };
    const activateCombo = (first, second, firstPos, secondPos) => {
      if (!first.special || !second.special) return false;
      const specials = [first.special, second.special];
      this.recordSpecialCombo(specials);
      const center = firstPos;
      const [r, c] = center;
      addCell(firstPos[0], firstPos[1]);
      addCell(secondPos[0], secondPos[1]);

      if (specials.every((special) => special === "chocolate")) {
        addBoard();
        return "chocolateChocolate";
      }

      if (specials.includes("chocolate")) {
        const other = first.special === "chocolate" ? second : first;
        const color = TYPES.includes(other.type) ? other.type : this.randomTransformColor();
        if (other.special === "stripeRow" || other.special === "stripeCol") {
          addColorTargets(color, (rr, cc) => addCell(rr, cc));
          return { type: "chocolateSpecial", color, transformSpecial: "stripe" };
        }
        if (other.special === "bomb") {
          addColorTargets(color, (rr, cc) => addCell(rr, cc));
          return { type: "chocolateSpecial", color, transformSpecial: "bomb" };
        }
      }

      const striped = specials.includes("stripeRow") || specials.includes("stripeCol");
      const bombs = specials.filter((special) => special === "bomb").length;
      if (striped && bombs > 0) {
        for (let rr = r - 1; rr <= r + 1; rr++) addRow(rr);
        for (let cc = c - 1; cc <= c + 1; cc++) addCol(cc);
        return "stripeBomb";
      }
      if (striped && bombs === 0) {
        addRow(r);
        addCol(c);
        return "stripeStripe";
      }
      if (bombs === 2) {
        addArea(r, c, 2);
        return "bombBomb";
      }
      return false;
    };
    const combo = activateCombo(a, b, posB, posA);
    if (combo) {
      const comboType = typeof combo === "string" ? combo : combo.type;
      if (typeof combo === "object" && combo.transformSpecial) {
        await this.transformColorToSpecial(combo.color, combo.transformSpecial);
      }
      const triggerEvents = [];
      if (comboType === "chocolateSpecial") this.expandSpecialRemoval(remove, triggerEvents, [posA, posB]);
      await this.playSpecialComboFx(a, b, posB, posA, comboType, typeof combo === "object" ? combo : null);
      await this.playRemovalSpecialFx(remove, [posA, posB], triggerEvents);
      await this.removePositions(remove, null);
      await this.collapseAndFill();
      return;
    }
    const sourcePositions = [];
    const addBySpecial = (tile, pos, otherTile) => {
      const [r, c] = pos;
      sourcePositions.push(pos);
      addCell(r, c);
      let special = tile.special;
      if (special === "stripeRow" || special === "stripeCol") {
        const horizontalSwap = posA[0] === posB[0];
        special = horizontalSwap ? "stripeRow" : "stripeCol";
      }
      fxWaits.push(this.playSpecialActivationFx({ ...tile, special }, pos, otherTile));
      if (special === "stripeRow") {
        addRow(r);
      } else if (special === "stripeCol") {
        addCol(c);
      } else if (special === "bomb") {
        addArea(r, c, 1);
      } else if (special === "chocolate") {
        const color = TYPES.includes(otherTile.type) ? otherTile.type : tile.type;
        addColorTargets(color, (rr, cc) => addCell(rr, cc));
      }
    };
    if (a.special) addBySpecial(a, posB, b);
    if (b.special) addBySpecial(b, posA, a);
    const triggerEvents = [];
    this.expandSpecialRemoval(remove, triggerEvents, sourcePositions);
    if (fxWaits.length) await Promise.all(fxWaits);
    await this.playRemovalSpecialFx(remove, [posA, posB], triggerEvents);
    await this.removePositions(remove, null);
    await this.collapseAndFill();
  }

  async playRemovalSpecialFx(remove, skipPositions = [], triggerEvents = null) {
    const skip = new Set(skipPositions.map(([r, c]) => `${r},${c}`));
    const events = triggerEvents && triggerEvents.length
      ? triggerEvents
      : [...remove].map((key) => {
        const [r, c] = key.split(",").map(Number);
        const tile = this.board[r]?.[c];
        return tile?.special ? { r, c, special: tile.special } : null;
      }).filter(Boolean);
    let played = 0;
    for (const event of events) {
      const key = `${event.r},${event.c}`;
      if (skip.has(key)) continue;
      const tile = this.board[event.r]?.[event.c];
      if (!tile?.special || tile.chest) continue;
      if (tile.special === "chocolate") await this.playChocolateFx(event.r, event.c, event.color || this.randomTransformColor());
      else await this.playSpecialActivationFx({ ...tile, special: event.special || tile.special }, [event.r, event.c], tile);
      played += 1;
      if (played >= 12) break;
    }
  }

  recordSpecialCombo(specials) {
    const striped = specials.filter((special) => special === "stripeRow" || special === "stripeCol").length;
    const bombs = specials.filter((special) => special === "bomb").length;
    const chocolates = specials.filter((special) => special === "chocolate").length;
    const counts = this.gameMode === "free" ? this.freeComboCounts : this.comboCounts;
    counts.any += 1;
    if (striped === 2) counts.stripeStripe += 1;
    else if (striped === 1 && bombs === 1) counts.stripeBomb += 1;
    else if (bombs === 2) counts.bombBomb += 1;
    else if (chocolates >= 1) counts.chocolateSpecial += 1;
    this.updateOrders();
  }

  randomTransformColor() {
    const available = TYPES.filter((type) => {
      for (let r = 0; r < this.rows; r++) {
        for (let c = 0; c < COLS; c++) {
          const tile = this.board[r][c];
          if (tile && tile.type === type && tile.special !== "chocolate") return true;
        }
      }
      return false;
    });
    return Phaser.Utils.Array.GetRandom(available.length ? available : TYPES);
  }

  async transformColorToSpecial(color, specialKind) {
    const transformed = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.board[r][c];
        if (!tile || tile.scatter || tile.type !== color || tile.special === "chocolate") continue;
        const special = specialKind === "stripe"
          ? (Phaser.Math.Between(0, 1) === 0 ? "stripeRow" : "stripeCol")
          : "bomb";
        const oldSprite = this.sprites[r]?.[c];
        if (oldSprite) this.destroyCandySprite(oldSprite);
        this.board[r][c] = { type: tile.type, special };
        const sprite = this.createCandySprite(this.board[r][c], r, c, true);
        this.sprites[r][c] = sprite;
        transformed.push({ r, c, sprite });
      }
    }
    transformed.forEach(({ r, c, sprite }, i) => {
      sprite.getChildren().forEach((child) => {
        child.setScale(child.scaleX * 0.35, child.scaleY * 0.35);
        this.tweens.add({
          targets: child,
          scaleX: child.scaleX / 0.35,
          scaleY: child.scaleY / 0.35,
          delay: i * 35,
          duration: 320,
          ease: "Back.Out"
        });
      });
      this.time.delayedCall(i * 35, () => this.burstAt(this.cellX(c), this.cellY(r), specialKind === "stripe" ? 0x8ee8ff : 0xff8fc7));
    });
    this.playPopSound(860);
    this.time.delayedCall(140, () => this.playPopSound(1320));
    await this.wait(480 + Math.min(transformed.length, 12) * 35);
  }

  async activateChocolate(color, positions) {
    if (!TYPES.includes(color)) return;
    const remove = new Set();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r][c] && !this.board[r][c].scatter && this.board[r][c].type === color) remove.add(`${r},${c}`);
      }
    }
    positions.forEach(([r, c]) => remove.add(`${r},${c}`));
    await Promise.all(positions.map(([r, c]) => this.playChocolateFx(r, c, color)));
    await this.removePositions(remove, null);
    await this.collapseAndFill();
  }

  async resolveAll(options = {}) {
    let wave = 0;
    while (true) {
      const matches = this.findMatches();
      if (matches.length === 0) break;
      if (wave > 0) {
        if (this.gameMode === "free") this.freeCascadeCount += 1;
        else this.cascadeCount += 1;
        this.showComboText(wave + 1);
        this.playPopSound(720 + wave * 70);
      }
      await this.resolveMatches(matches, wave === 0 ? options : {});
      await this.collapseAndFill(true, [], wave);
      if (this.gameMode === "free") this.updateFreeUi();
      else this.updateOrders();
      wave += 1;
      if (wave > 20) break;
    }
  }

  findMatches() {
    const groups = [];
    for (let r = 0; r < this.rows; r++) {
      let c = 0;
      while (c < COLS) {
        const start = c;
        const type = this.matchableType(r, c);
        while (c < COLS && this.matchableType(r, c) === type && type) c++;
        if (type && c - start >= 3) {
          groups.push({ dir: "h", cells: Array.from({ length: c - start }, (_, i) => [r, start + i]) });
        }
        if (!type) c++;
      }
    }
    for (let c = 0; c < COLS; c++) {
      let r = 0;
      while (r < this.rows) {
        const start = r;
        const type = this.matchableType(r, c);
        while (r < this.rows && this.matchableType(r, c) === type && type) r++;
        if (type && r - start >= 3) {
          groups.push({ dir: "v", cells: Array.from({ length: r - start }, (_, i) => [start + i, c]) });
        }
        if (!type) r++;
      }
    }
    return groups;
  }

  matchableType(r, c) {
    const tile = this.board[r]?.[c];
    if (!tile || tile.chest || tile.scatter || tile.special) return null;
    return tile.type;
  }

  async resolveMatches(matches, options = {}) {
    const remove = new Set();
    const create = [];
    const cellHits = new Map();
    const preferred = (options.preferredCreatePositions || []).map(([r, c]) => `${r},${c}`);
    const protectedKeys = new Set((options.protectedPositions || []).map(([r, c]) => `${r},${c}`));

    for (const group of matches) {
      const cells = group.cells;
      cells.forEach(([r, c]) => {
        const key = `${r},${c}`;
        const hit = cellHits.get(key) || { r, c, count: 0, max: 0, dirs: new Set() };
        hit.count += 1;
        hit.max = Math.max(hit.max, cells.length);
        hit.dirs.add(group.dir);
        cellHits.set(key, hit);
      });

      cells.forEach(([r, c]) => remove.add(`${r},${c}`));
    }

    protectedKeys.forEach((key) => remove.delete(key));
    const preferHit = (hits) => {
      for (const key of preferred) {
        const found = hits.find((hit) => `${hit.r},${hit.c}` === key);
        if (found) return found;
      }
      return hits[0];
    };
    const hits = [...cellHits.values()].filter((hit) => !protectedKeys.has(`${hit.r},${hit.c}`));
    const longHit = preferHit(hits.filter((hit) => hit.max >= 5));
    if (longHit) {
      create.push({ r: longHit.r, c: longHit.c, special: "chocolate", type: this.board[longHit.r][longHit.c].type });
      if (this.gameMode === "free") this.freeChocolatesCreated += 1;
      else this.chocolatesCreated += 1;
    } else {
      const bombHit = preferHit(hits.filter((hit) => hit.dirs.size > 1));
      if (bombHit) {
        create.push({ r: bombHit.r, c: bombHit.c, special: "bomb", type: this.board[bombHit.r][bombHit.c].type });
      } else {
        const stripeHit = preferHit(hits.filter((hit) => hit.max === 4));
        if (stripeHit) {
          const dir = stripeHit.dirs.has("h") ? "stripeRow" : "stripeCol";
          create.push({ r: stripeHit.r, c: stripeHit.c, special: dir, type: this.board[stripeHit.r][stripeHit.c].type });
        }
      }
    }

    create.forEach(({ r, c }) => remove.delete(`${r},${c}`));
    if (!options.allowSpecialExpansion) {
      for (const key of [...remove]) {
        const [r, c] = key.split(",").map(Number);
        if (this.board[r]?.[c]?.special) remove.delete(key);
      }
    }
    const triggerEvents = [];
    if (options.allowSpecialExpansion) {
      this.expandSpecialRemoval(remove, triggerEvents);
      await this.playRemovalSpecialFx(remove, create.map(({ r, c }) => [r, c]), triggerEvents);
    }
    await this.removePositions(remove, create);
    for (const made of create) {
      const oldSprite = this.sprites[made.r]?.[made.c];
      if (oldSprite) this.destroyCandySprite(oldSprite);
      this.board[made.r][made.c] = { type: made.type, special: made.special };
      this.sprites[made.r][made.c] = this.createCandySprite(this.board[made.r][made.c], made.r, made.c, false);
    }
    await this.wait(140);
    return create;
  }

  expandSpecialRemoval(remove, triggerEvents = [], sourcePositions = []) {
    let changed = true;
    const seenTriggers = new Set(triggerEvents.map((event) => `${event.r},${event.c}`));
    const sourceKeys = new Set(sourcePositions.map(([r, c]) => `${r},${c}`));
    while (changed) {
      changed = false;
      for (const key of [...remove]) {
        if (sourceKeys.has(key)) continue;
        const [r, c] = key.split(",").map(Number);
        const tile = this.board[r]?.[c];
        if (!tile || !tile.special) continue;
        let triggerEvent = triggerEvents.find((event) => event.r === r && event.c === c);
        if (!triggerEvent && !seenTriggers.has(key)) {
          triggerEvent = { r, c, special: tile.special };
          if (tile.special === "chocolate") triggerEvent.color = this.randomTransformColor();
          triggerEvents.push(triggerEvent);
          seenTriggers.add(key);
        }
        const stripeTrigger = [...remove].map((otherKey) => {
          if (otherKey === key) return null;
          const [rr, cc] = otherKey.split(",").map(Number);
          const other = this.board[rr]?.[cc];
          if (other?.special === "stripeRow" && rr === r) return "stripeRow";
          if (other?.special === "stripeCol" && cc === c) return "stripeCol";
          return null;
        }).find(Boolean);
        const stripeSpecial = (tile.special === "stripeRow" || tile.special === "stripeCol")
          ? (stripeTrigger === "stripeRow"
            ? "stripeCol"
            : stripeTrigger === "stripeCol"
              ? "stripeRow"
              : (Phaser.Math.Between(0, 1) === 0 ? "stripeRow" : "stripeCol"))
          : tile.special;
        if (triggerEvent) triggerEvent.special = stripeSpecial;
        if (stripeSpecial === "stripeRow") {
          for (let cc = 0; cc < COLS; cc++) {
            const next = `${r},${cc}`;
            if (!remove.has(next)) {
              remove.add(next);
              changed = true;
            }
          }
        }
        if (stripeSpecial === "stripeCol") {
          for (let rr = 0; rr < this.rows; rr++) {
            const next = `${rr},${c}`;
            if (!remove.has(next)) {
              remove.add(next);
              changed = true;
            }
          }
        }
        if (tile.special === "bomb") {
          for (let rr = Math.max(0, r - 1); rr <= Math.min(this.rows - 1, r + 1); rr++) {
            for (let cc = Math.max(0, c - 1); cc <= Math.min(COLS - 1, c + 1); cc++) {
              const next = `${rr},${cc}`;
              if (!remove.has(next)) {
                remove.add(next);
                changed = true;
              }
            }
          }
        }
        if (tile.special === "chocolate") {
          const color = triggerEvent?.color || this.randomTransformColor();
          for (let rr = 0; rr < this.rows; rr++) {
            for (let cc = 0; cc < COLS; cc++) {
              const target = this.board[rr]?.[cc];
              if (target && target.type === color && target.special !== "chocolate") {
                const next = `${rr},${cc}`;
                if (!remove.has(next)) {
                  remove.add(next);
                  changed = true;
                }
              }
            }
          }
        }
      }
    }
  }

  async removePositions(remove, create) {
    const targets = [];
    const removedSprites = [];
    for (const key of remove) {
      const [r, c] = key.split(",").map(Number);
      const tile = this.board[r][c];
      if (!tile) continue;
      if (tile.chest || tile.scatter) continue;
      if (this.gameMode === "free") {
        this.freeRemoved += 1;
        if (this.freeRemovedByColor[tile.type] !== undefined) this.freeRemovedByColor[tile.type] += 1;
      } else {
        this.totalRemoved += 1;
        if (this.removedByColor[tile.type] !== undefined) this.removedByColor[tile.type] += 1;
      }
      const sprite = this.sprites[r]?.[c];
      if (sprite) {
        sprite.getChildren().forEach((child) => targets.push(child));
        removedSprites.push(sprite);
        this.sprites[r][c] = null;
      }
      this.board[r][c] = null;
    }
    if (this.gameMode === "free") {
      this.updateFreeUi();
    } else if (this.fulfillCompletedOrders() === 0) {
      this.updateOrders();
    }
    if (targets.length) {
      this.playPopSound(480 + Math.min(this.totalRemoved, 20) * 18);
      for (const key of [...remove].slice(0, 10)) {
        const [rr, cc] = key.split(",").map(Number);
        this.burstAt(this.cellX(cc), this.cellY(rr), 0xfff06a);
      }
      this.tweens.add({ targets, scale: 1.35, alpha: 0, duration: 210, ease: "Cubic.In" });
      await this.wait(230);
    }
    removedSprites.forEach((sprite) => {
      this.destroyCandySprite(sprite);
    });
    if (create) {
      create.forEach(({ r, c, type, special }) => {
        this.board[r][c] = { type, special };
      });
    }
  }

  async collapseAndFill(collectChests = true, lockedPositions = [], wave = 0) {
    const locked = new Set(lockedPositions.map(([r, c]) => `${r},${c}`));
    const nextBoard = Array.from({ length: this.rows }, () => Array(COLS).fill(null));
    const nextSprites = Array.from({ length: this.rows }, () => Array(COLS).fill(null));
    let scatterSpawnBudget = (this.gameMode === "main" || this.gameMode === "free") ? Math.max(0, this.scatterGoal - this.countScatters()) : 0;
    for (let c = 0; c < COLS; c++) {
      const stack = [];
      const lockedRows = new Set();
      for (let r = this.rows - 1; r >= 0; r--) {
        if (locked.has(`${r},${c}`) && this.board[r][c]) {
          lockedRows.add(r);
          nextBoard[r][c] = this.board[r][c];
          nextSprites[r][c] = this.sprites[r][c];
        } else if (this.board[r][c]) {
          stack.push({ tile: this.board[r][c], sprite: this.sprites[r][c] });
        }
      }
      let writeRow = this.rows - 1;
      for (const item of stack) {
        while (lockedRows.has(writeRow)) writeRow -= 1;
        nextBoard[writeRow][c] = item.tile;
        nextSprites[writeRow][c] = item.sprite;
        this.moveSpriteTo(item.sprite, writeRow, c, 260);
        writeRow -= 1;
      }
      let spawnIndex = 0;
      for (let r = writeRow; r >= 0; r--) {
        if (lockedRows.has(r)) continue;
        const tile = this.randomTile((this.gameMode === "main" || this.gameMode === "free") && scatterSpawnBudget > 0, nextBoard, r, c, wave);
        if (tile.scatter) scatterSpawnBudget -= 1;
        const startY = this.cellY(-1 - spawnIndex);
        const sprite = this.createCandySprite(tile, r, c, true, startY);
        nextBoard[r][c] = tile;
        nextSprites[r][c] = sprite;
        this.moveSpriteTo(sprite, r, c, 320 + spawnIndex * 35);
        spawnIndex += 1;
      }
    }
    this.board = nextBoard;
    this.sprites = nextSprites;
    await this.wait(380);
    if (collectChests && this.gameMode === "free") {
      const collected = await this.collectBottomChests();
      if (collected > 0) await this.collapseAndFill(false);
    }
  }

  async collectBottomChests() {
    const row = this.rows - 1;
    const chests = [];
    for (let c = 0; c < COLS; c++) {
      const tile = this.board[row]?.[c];
      if (!tile?.chest) continue;
      chests.push({ c, tile, sprite: this.sprites[row][c] });
      this.board[row][c] = null;
      this.sprites[row][c] = null;
    }
    if (!chests.length) return 0;

    for (const item of chests) {
      const x = this.cellX(item.c);
      const y = this.boardY + this.cell * this.rows + 24;
      if (item.sprite) {
        this.moveSpriteTo(item.sprite, this.rows, item.c, 380);
        item.sprite.getChildren().forEach((child) => {
          this.tweens.add({ targets: child, y, scale: child.scale * 1.18, duration: 380, ease: "Back.In" });
        });
      }
      this.burstAt(x, y, 0xffe277);
    }
    this.playCoinSpraySound();
    await this.wait(420);

    for (const item of chests) {
      if (item.sprite) this.destroyCandySprite(item.sprite);
      const baseScore = Math.max(1, this.freeRemoved) * this.betAmount;
      const win = Math.round(baseScore * this.effectiveMult(item.tile.mult));
      this.freeReward += win;
      this.freeChestsOpened += 1;
      this.wallet += win;
      this.sessionReward += win;
      this.moveReward += win;
      this.animateWalletMeter(win);
      this.animateWinMeter(win);
      this.showChestOpenFx(this.cellX(item.c), this.boardY + this.cell * this.rows + 24, this.effectiveMult(item.tile.mult), win);
      this.markFreeChestOpened();
      await this.wait(520);
    }
    this.updateFreeUi();
    return chests.length;
  }

  showChestOpenFx(x, y, mult, win) {
    const ring = this.add.circle(x, y, 18, 0xffe277, 0.22).setStrokeStyle(7, 0xffffff, 1).setDepth(34);
    const label = this.add.text(x, y - 34, `${mult}x\n+${win}`, {
      fontSize: 25,
      fontStyle: "900",
      align: "center",
      color: "#fff6d0",
      stroke: "#061b30",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(35);
    ring.isFxSprite = true;
    label.isFxSprite = true;
    this.fxSprites.add(ring);
    this.fxSprites.add(label);
    this.tweens.add({ targets: ring, radius: 76, alpha: 0, duration: 850, ease: "Cubic.Out", onComplete: () => this.destroyFx(ring) });
    this.tweens.add({ targets: label, y: y - 78, scale: 1.22, alpha: 0, delay: 720, duration: 900, ease: "Cubic.Out", onComplete: () => this.destroyFx(label) });
    this.cameras.main.shake(260, 0.008);
  }

  markFreeChestOpened() {
    const hud = this.freeChestHud[this.freeChestsOpened - 1];
    if (!hud) return;
    hud.glow.setFillStyle(0xffe277, 0.55).setStrokeStyle(3, 0xffffff, 1);
    this.tweens.add({ targets: [hud.glow, hud.chest], scale: 1.2, duration: 150, yoyo: true, repeat: 1, ease: "Back.Out" });
    hud.chest.setAlpha(0.46);
  }

  updateFreeUi() {
    if (this.freeMovesText) this.freeMovesText.setText(`MOVE:${this.freeMovesLeft}`);
    if (this.freeScatterText) this.freeScatterText.setText(`SCATTER:${this.countScatters()}/${this.scatterGoal}`);
    if (this.freeWinText) this.freeWinText.setText(`WIN ${this.freeReward}`);
    if (this.gameMode === "free") {
      this.statusText.setText(`Complete bonus orders. Removed: ${this.freeRemoved}`);
      this.winText.setText(`BONUS WIN ${this.freeReward}`);
    }
  }

  keysForTier(tier) {
    const key = String(tier).toLowerCase();
    return key === "hard" ? 3 : key === "medium" ? 2 : 1;
  }


  countScatters() {
    let count = 0;
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r]?.[c]?.scatter) count += 1;
      }
    }
    return count;
  }

  scatterPositions(limit = Infinity) {
    const positions = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        if (this.board[r]?.[c]?.scatter) {
          positions.push([r, c]);
          if (positions.length >= limit) return positions;
        }
      }
    }
    return positions;
  }

  checkScatterBonus() {
    if (this.gameMode !== "main") return false;
    if (this.countScatters() >= this.scatterGoal) {
      this.bonusPending = true;
      this.updateKeyUi();
      this.statusText.setText("3 SCATTERS! Bonus unlocked.");
      return true;
    }
    this.updateKeyUi();
    return false;
  }
  updateKeyUi() {
    if (this.keyHudText) this.keyHudText.setText(`${this.countScatters()}/${this.scatterGoal}`);
  }

  async collectBonusScatterRetrigger() {
    const positions = this.scatterPositions(this.scatterGoal);
    if (this.gameMode !== "free" || positions.length < this.scatterGoal) return false;
    this.freeMovesLeft += 15;
    this.freeScatterRetriggers += 1;
    this.updateFreeUi();
    this.statusText.setText("+15 FREE MOVES!");
    this.playUnlockSound();
    this.time.delayedCall(120, () => this.playPopSound(1480));
    this.cameras.main.flash(420, 255, 240, 106);
    this.cameras.main.shake(420, 0.012);
    positions.forEach(([r, c], index) => {
      const x = this.cellX(c);
      const y = this.cellY(r);
      this.time.delayedCall(index * 90, () => this.burstAt(x, y, 0xfff06a));
      const sprite = this.sprites[r]?.[c];
      if (sprite) {
        sprite.getChildren().forEach((child) => {
          this.tweens.add({
            targets: child,
            x: W / 2,
            y: 226,
            scale: child.scale * 1.25,
            alpha: 0,
            delay: index * 80,
            duration: 420,
            ease: "Cubic.In"
          });
        });
      }
    });
    const label = this.add.text(W / 2, 226, "+15 FREE MOVES", {
      fontFamily: "Arial Black",
      fontSize: "26px",
      color: "#fff6a8",
      stroke: "#351352",
      strokeThickness: 6
    }).setDepth(36).setOrigin(0.5).setAlpha(0);
    label.isFxSprite = true;
    this.fxSprites.add(label);
    this.tweens.add({ targets: label, alpha: 1, scale: 1.14, duration: 180, yoyo: true, repeat: 1, ease: "Back.Out" });
    this.tweens.add({ targets: label, y: 190, alpha: 0, delay: 760, duration: 520, ease: "Cubic.In", onComplete: () => this.destroyFx(label) });
    await this.wait(520);
    positions.forEach(([r, c]) => {
      const sprite = this.sprites[r]?.[c];
      if (sprite) this.destroyCandySprite(sprite);
      this.board[r][c] = null;
      this.sprites[r][c] = null;
    });
    await this.collapseAndFill(false);
    return true;
  }

  async checkFreeScatterRetrigger() {
    if (this.gameMode !== "free") return false;
    let triggered = false;
    let guard = 0;
    while (this.countScatters() >= this.scatterGoal && guard < 3) {
      triggered = await this.collectBonusScatterRetrigger() || triggered;
      await this.resolveAll();
      guard += 1;
    }
    return triggered;
  }

  showBonusEventBanner(text, color = 0xfff06a) {
    const boardCenterY = this.boardY + this.cell * this.rows / 2;
    const wash = this.add.rectangle(W / 2, boardCenterY, W, this.cell * this.rows + 36, 0x061b30, 0.28).setDepth(36).setAlpha(0);
    wash.isFxSprite = true;
    this.fxSprites.add(wash);
    const plate = this.add.rectangle(W / 2, this.boardY + 96, W - 72, 54, color, 0.34).setStrokeStyle(4, 0xffffff, 0.86).setDepth(37).setAlpha(0);
    plate.isFxSprite = true;
    this.fxSprites.add(plate);
    const label = this.add.text(W / 2, this.boardY + 96, text, {
      fontFamily: "Arial Black",
      fontSize: "30px",
      color: "#ffffff",
      stroke: "#061b30",
      strokeThickness: 8
    }).setDepth(38).setOrigin(0.5).setAlpha(0);
    label.isFxSprite = true;
    this.fxSprites.add(label);
    this.tweens.add({ targets: wash, alpha: 0.28, duration: 110, yoyo: true, repeat: 1, ease: "Sine.InOut" });
    this.tweens.add({ targets: [label, plate], alpha: 1, scale: 1.08, duration: 160, yoyo: true, repeat: 1, ease: "Back.Out" });
    this.tweens.add({
      targets: [label, plate],
      y: this.boardY + 64,
      alpha: 0,
      delay: 780,
      duration: 420,
      ease: "Cubic.In",
      onComplete: () => {
        this.destroyFx(label);
        this.destroyFx(plate);
      }
    });
    this.tweens.add({ targets: wash, alpha: 0, delay: 820, duration: 360, ease: "Cubic.In", onComplete: () => this.destroyFx(wash) });
    this.playUnlockSound();
  }

  async playBonusForgeShow(r, c) {
    const x = this.cellX(c);
    const y = this.cellY(r);
    const beam = this.addFxRect(x, this.boardY - 24, 34, 60, 0x8ee8ff, 0.72).setDepth(35);
    const ring = this.add.circle(x, y, 8, 0x8ee8ff, 0.18).setStrokeStyle(5, 0xffffff, 0.95).setDepth(35);
    ring.isFxSprite = true;
    this.fxSprites.add(ring);
    this.tweens.add({ targets: beam, y, scaleY: 3.2, alpha: 0, duration: 520, ease: "Cubic.In", onComplete: () => this.destroyFx(beam) });
    this.tweens.add({ targets: ring, radius: 70, alpha: 0, delay: 160, duration: 620, ease: "Cubic.Out", onComplete: () => this.destroyFx(ring) });
    for (let i = 0; i < 10; i++) {
      const bit = this.addFxRect(x, y, i % 2 ? 8 : 12, i % 2 ? 12 : 8, i % 3 ? 0x8ee8ff : 0xffffff, 1).setDepth(36);
      const angle = (Math.PI * 2 * i) / 10;
      this.tweens.add({
        targets: bit,
        x: x + Math.cos(angle) * (48 + (i % 3) * 12),
        y: y + Math.sin(angle) * (48 + (i % 3) * 12),
        angle: 180,
        alpha: 0,
        delay: 160,
        duration: 620,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(bit)
      });
    }
    this.cameras.main.shake(220, 0.006);
    this.playPopSound(980);
    this.time.delayedCall(140, () => this.playPopSound(1560));
    await this.wait(420);
  }

  async playBonusStormShow(color, remove, type) {
    const boardCenterY = this.boardY + this.cell * this.rows / 2;
    const symbol = this.add.image(W / 2, boardCenterY, this.symbolKey({ type, special: null })).setDepth(39).setAlpha(0);
    symbol.setScale(66 / Math.max(symbol.width, symbol.height));
    symbol.isFxSprite = true;
    this.fxSprites.add(symbol);
    const halo = this.add.circle(W / 2, boardCenterY, 18, color, 0.22).setStrokeStyle(8, 0xffffff, 0.9).setDepth(38).setAlpha(0);
    halo.isFxSprite = true;
    this.fxSprites.add(halo);
    const targetText = this.add.text(W / 2, boardCenterY + 62, "TARGET SYMBOL", {
      fontFamily: "Arial Black",
      fontSize: "20px",
      color: "#ffffff",
      stroke: "#061b30",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(39).setAlpha(0);
    targetText.isFxSprite = true;
    this.fxSprites.add(targetText);
    this.tweens.add({ targets: [symbol, halo, targetText], alpha: 1, scale: 1.08, duration: 220, ease: "Back.Out" });
    this.tweens.add({ targets: halo, radius: 70, alpha: 0, delay: 180, duration: 680, ease: "Cubic.Out" });
    this.playPopSound(760);
    await this.wait(760);
    this.tweens.add({ targets: [symbol, targetText], alpha: 0, scale: 0.55, duration: 220, ease: "Cubic.In", onComplete: () => {
      this.destroyFx(symbol);
      this.destroyFx(targetText);
    }});
    const storm = this.addFxRect(-70, boardCenterY, 92, this.cell * this.rows + 34, color, 0.5).setDepth(35);
    storm.setAngle(-10);
    const white = this.addFxRect(-112, boardCenterY, 22, this.cell * this.rows + 50, 0xffffff, 0.72).setDepth(36);
    white.setAngle(-10);
    this.tweens.add({ targets: storm, x: W + 88, alpha: 0.18, duration: 620, ease: "Cubic.InOut", onComplete: () => this.destroyFx(storm) });
    this.tweens.add({ targets: white, x: W + 118, alpha: 0, duration: 560, ease: "Cubic.InOut", onComplete: () => this.destroyFx(white) });
    [...remove].slice(0, 18).forEach((key, index) => {
      const [r, c] = key.split(",").map(Number);
      this.time.delayedCall(140 + index * 18, () => this.burstAt(this.cellX(c), this.cellY(r), color));
    });
    this.cameras.main.shake(360, 0.008);
    this.playPopSound(520);
    this.time.delayedCall(160, () => this.playPopSound(1120));
    await this.wait(560);
  }

  async playBonusChefShow(orderIndex, fromNeed, toNeed) {
    const rowY = 113 + orderIndex * 46;
    const row = this.orderRows[orderIndex];
    const focus = this.add.rectangle(W / 2, rowY, W - 42, 42, 0xff8fc7, 0.24).setStrokeStyle(4, 0xffffff, 0.9).setDepth(37).setAlpha(0);
    focus.isFxSprite = true;
    this.fxSprites.add(focus);
    const counter = { value: fromNeed };
    const number = this.add.text(206, rowY, `${fromNeed}`, {
      fontFamily: "Arial Black",
      fontSize: "27px",
      color: "#ffffff",
      stroke: "#351352",
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(76);
    number.isFxSprite = true;
    this.fxSprites.add(number);
    this.tweens.add({ targets: [focus, row.progress], alpha: 1, scale: 1.18, duration: 190, yoyo: true, repeat: 1, ease: "Back.Out" });
    this.tweens.add({ targets: number, scale: 1.35, duration: 180, yoyo: true, repeat: 1, ease: "Back.Out" });
    this.playPopSound(740);
    await this.wait(360);
    this.tweens.add({
      targets: counter,
      value: toNeed,
      duration: 760,
      ease: "Cubic.Out",
      onUpdate: () => number.setText(`${Math.round(counter.value)}`)
    });
    this.tweens.add({ targets: [number, row.progress], scale: 1.24, duration: 110, yoyo: true, repeat: 5, ease: "Sine.InOut" });
    this.time.delayedCall(180, () => this.playPopSound(980));
    this.time.delayedCall(420, () => this.playPopSound(1280));
    this.time.delayedCall(710, () => this.burstAt(206, rowY, 0xff8fc7));
    await this.wait(860);
    this.tweens.add({ targets: [focus, number], alpha: 0, duration: 260, ease: "Cubic.In", onComplete: () => {
      this.destroyFx(focus);
      this.destroyFx(number);
    }});
  }

  async playBonusGoldShow(orderIndex, fromRange, toRange) {
    const rowY = 113 + orderIndex * 46;
    const row = this.orderRows[orderIndex];
    const wash = this.add.rectangle(W / 2, rowY, W - 28, 45, 0xfff06a, 0.44).setStrokeStyle(4, 0xffffff, 0.85).setDepth(36);
    wash.isFxSprite = true;
    this.fxSprites.add(wash);
    for (let i = 0; i < 8; i++) {
      const ray = this.addFxRect(W / 2, rowY, W - 50, 5, i % 2 ? 0xffffff : 0xfff06a, 0.8).setDepth(37);
      ray.setAngle(-18 + i * 5);
      this.tweens.add({ targets: ray, scaleX: 1.12, alpha: 0, delay: i * 38, duration: 520, ease: "Cubic.Out", onComplete: () => this.destroyFx(ray) });
    }
    const beforeText = `${fromRange.min}-${fromRange.max}x`;
    const afterText = `${toRange.min}-${toRange.max}x`;
    const mult = this.add.text(W - 54, rowY, beforeText, {
      fontFamily: "Arial Black",
      fontSize: "18px",
      color: "#fff6d0",
      stroke: "#5c1d00",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(39);
    mult.isFxSprite = true;
    this.fxSprites.add(mult);
    this.tweens.add({ targets: [mult, row.reward], scale: 1.34, duration: 260, yoyo: true, repeat: 1, ease: "Back.Out" });
    this.time.delayedCall(720, () => {
      mult.setText(afterText).setColor("#ffffff");
      this.burstAt(W - 54, rowY, 0xfff06a);
      this.playUnlockSound();
    });
    this.tweens.add({ targets: [mult, row.reward], scale: 1.18, delay: 720, duration: 180, yoyo: true, repeat: 4, ease: "Sine.InOut" });
    this.tweens.add({ targets: wash, scaleX: 1.05, alpha: 0, delay: 1020, duration: 560, ease: "Cubic.In", onComplete: () => this.destroyFx(wash) });
    this.tweens.add({ targets: mult, alpha: 0, y: rowY - 30, delay: 1460, duration: 420, ease: "Cubic.In", onComplete: () => this.destroyFx(mult) });
    this.cameras.main.flash(260, 255, 240, 106);
    this.playCoinSpraySound();
    await this.wait(1580);
  }

  plainCandyPositions() {
    const positions = [];
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.board[r]?.[c];
        if (tile && !tile.scatter && !tile.chest && !tile.special) positions.push([r, c]);
      }
    }
    return positions;
  }

  async bonusEventMakeSpecial() {
    const positions = this.plainCandyPositions();
    if (!positions.length) return false;
    this.showBonusEventBanner("SUGAR FORGE", 0x8ee8ff);
    const roll = Math.random();
    const count = roll < 0.68 ? 1 : roll < 0.92 ? 2 : 3;
    const picked = Phaser.Utils.Array.Shuffle([...positions]).slice(0, Math.min(count, positions.length));
    for (let i = 0; i < picked.length; i++) {
      const [r, c] = picked[i];
      const tile = this.board[r][c];
      const special = Phaser.Utils.Array.GetRandom(["stripeRow", "stripeCol", "bomb"]);
      const oldSprite = this.sprites[r]?.[c];
      if (oldSprite) this.destroyCandySprite(oldSprite);
      this.board[r][c] = { type: tile.type, special };
      const sprite = this.createCandySprite(this.board[r][c], r, c, true);
      this.sprites[r][c] = sprite;
      await this.playBonusForgeShow(r, c);
      sprite.getChildren().filter((child) => child.type === "Image").forEach((child) => {
        this.tweens.killTweensOf(child);
        const baseScaleX = child.scaleX;
        const baseScaleY = child.scaleY;
        child.setScale(child.scaleX * 0.45, child.scaleY * 0.45);
        this.tweens.add({ targets: child, scaleX: baseScaleX, scaleY: baseScaleY, duration: 330, ease: "Back.Out" });
      });
      this.burstAt(this.cellX(c), this.cellY(r), 0x8ee8ff);
    }
    if (picked.length > 1) {
      const label = this.add.text(W / 2, this.boardY + 144, `x${picked.length}`, {
        fontFamily: "Arial Black",
        fontSize: "32px",
        color: "#ffffff",
        stroke: "#061b30",
        strokeThickness: 7
      }).setOrigin(0.5).setDepth(39);
      label.isFxSprite = true;
      this.fxSprites.add(label);
      this.tweens.add({
        targets: label,
        y: label.y - 34,
        scale: 1.2,
        alpha: 0,
        duration: 760,
        ease: "Cubic.Out",
        onComplete: () => this.destroyFx(label)
      });
    }
    await this.wait(360);
    return true;
  }

  async bonusEventClearColor() {
    const counts = TYPES.map((type) => ({
      type,
      count: this.board.flat().filter((tile) => tile && !tile.scatter && !tile.special && tile.type === type).length
    })).filter((item) => item.count >= 3);
    if (!counts.length) return false;
    const color = Phaser.Utils.Array.GetRandom(counts).type;
    const remove = new Set();
    for (let r = 0; r < this.rows; r++) {
      for (let c = 0; c < COLS; c++) {
        const tile = this.board[r]?.[c];
        if (tile && !tile.scatter && !tile.special && tile.type === color) remove.add(`${r},${c}`);
      }
    }
    if (!remove.size) return false;
    this.freeColorClearUsed = true;
    this.showBonusEventBanner("SUGAR STORM", COLORS[color]);
    await this.playBonusStormShow(COLORS[color], remove, color);
    await this.removePositions(remove, null);
    await this.collapseAndFill(true);
    await this.resolveAll();
    await this.checkFreeScatterRetrigger();
    return true;
  }

  async bonusEventDiscountOrder() {
    const candidates = this.orders
      .map((order, index) => ({ order, index, progress: this.orderProgress(order) }))
      .filter(({ order, progress }) => order.scope === "free" && !order.discounted && order.need - progress > 1);
    if (!candidates.length) return false;
    const picked = Phaser.Utils.Array.GetRandom(candidates);
    const remaining = picked.order.need - picked.progress;
    const fromNeed = picked.order.need;
    const cutRate = Phaser.Math.FloatBetween(0.22, 0.42);
    const cutAmount = Math.max(1, Math.floor(remaining * cutRate));
    picked.order.need = Math.max(picked.progress + 1, picked.order.need - cutAmount);
    const toNeed = picked.order.need;
    picked.order.discounted = true;
    this.showBonusEventBanner("CHEF'S HELP", 0xff8fc7);
    await this.playBonusChefShow(picked.index, fromNeed, toNeed);
    const row = this.orderRows[picked.index];
    this.tweens.add({ targets: [row.panel, row.reward], scale: 1.12, duration: 140, yoyo: true, repeat: 1, ease: "Back.Out" });
    this.updateOrders();
    await this.wait(620);
    return true;
  }

  async bonusEventGoldOrder() {
    const candidates = this.orders
      .map((order, index) => ({ order, index }))
      .filter(({ order }) => order.scope === "free" && !order.gold);
    if (!candidates.length) return false;
    const picked = Phaser.Utils.Array.GetRandom(candidates);
    const fromRange = this.multRange(picked.order.mult);
    picked.order.gold = true;
    picked.order.goldMult = Number(Phaser.Math.FloatBetween(1.12, 1.36).toFixed(2));
    const toRange = {
      min: Math.max(1, Math.round(fromRange.min * picked.order.goldMult)),
      max: Math.max(1, Math.round(fromRange.max * picked.order.goldMult))
    };
    this.showBonusEventBanner(`GOLDEN RUSH x${picked.order.goldMult}`, 0xfff06a);
    await this.playBonusGoldShow(picked.index, fromRange, toRange);
    const row = this.orderRows[picked.index];
    this.tweens.add({ targets: [row.glow, row.frameArt, row.reward], scale: 1.14, duration: 150, yoyo: true, repeat: 2, ease: "Back.Out" });
    this.updateOrders();
    await this.wait(720);
    return true;
  }

  async maybeTriggerBonusMoveEvent() {
    if (this.gameMode !== "free" || this.freeMoveHadEvent) return false;
    const events = [
      { weight: 48, run: () => this.bonusEventMakeSpecial() },
      { weight: this.freeColorClearUsed ? 0 : 8, run: () => this.bonusEventClearColor() },
      { weight: 30, run: () => this.bonusEventDiscountOrder() },
      { weight: this.orders.some((order) => order.scope === "free" && order.gold) ? 8 : 20, run: () => this.bonusEventGoldOrder() }
    ].filter((event) => event.weight > 0);
    for (let attempt = 0; attempt < events.length; attempt++) {
      const total = events.reduce((sum, event) => sum + event.weight, 0);
      let roll = Math.random() * total;
      let selectedIndex = 0;
      for (let i = 0; i < events.length; i++) {
        roll -= events[i].weight;
        if (roll <= 0) {
          selectedIndex = i;
          break;
        }
      }
      const selected = events.splice(selectedIndex, 1)[0];
      if (await selected.run()) {
        this.freeMoveHadEvent = true;
        this.freeEventCount += 1;
        return true;
      }
    }
    return false;
  }

  addKeys(amount, orderIndex = 0) {
    this.keysCollected += amount;
    this.showKeyGainFx(orderIndex, amount);
    if (this.keysCollected >= this.keyGoal) {
      this.keysCollected -= this.keyGoal;
      this.bonusPending = true;
    }
    this.updateKeyUi();
  }

  showKeyGainFx(orderIndex, amount) {
    const startX = W - 92;
    const startY = this.orderRows[orderIndex]?.rowCenter || (122 + orderIndex * 43);
    const icon = this.add.image(startX, startY, "sym-scatter").setDepth(33);
    icon.setScale(25 / Math.max(icon.width, icon.height));
    icon.isFxSprite = true;
    this.fxSprites.add(icon);
    const label = this.add.text(startX + 20, startY - 10, `+${amount}`, {
      fontSize: 18,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 4
    }).setDepth(34).setOrigin(0.5);
    label.isFxSprite = true;
    this.fxSprites.add(label);
    this.tweens.add({ targets: icon, x: W - 102, y: 252, scale: 0.62, duration: 720, ease: "Cubic.InOut", onComplete: () => this.destroyFx(icon) });
    this.tweens.add({ targets: label, y: startY - 36, alpha: 0, duration: 740, ease: "Cubic.Out", onComplete: () => this.destroyFx(label) });
    this.tweens.add({ targets: [this.keyHudPanel, this.keyHudText, this.keyHudIcon], scale: 1.14, delay: 620, duration: 120, yoyo: true, ease: "Back.Out" });
    this.playCoinDing();
  }

  updateOrders() {
    this.orders.forEach((order, i) => {
      const row = this.orderRows[i];
      const progress = this.orderProgress(order);
      const done = progress >= order.need;
      const near = !done && progress >= Math.ceil(order.need * 0.75);
      if (this.setOrderNearState(row, near)) this.showOrderAlmostFx(i);
      if (order.scope === "free" && order.gold) {
        row.panel.setFillStyle(done ? 0xfff2a8 : near ? 0xffd94c : 0x9b3a16, done ? 0.34 : near ? 0.32 : 0.28);
      } else {
        row.panel.setFillStyle(done ? 0xfff2a8 : near ? 0xffd94c : 0x5e1422, done ? 0.3 : near ? 0.28 : 0.1);
      }
      const layout = row.rowLayout || ORDER_ROW_LAYOUT[i];
      const rowCenter = layout.y;
      row.rowCenter = rowCenter;
      this.drawOrderIcon(row, order, layout.iconX, rowCenter);
      row.label.setPosition(layout.textX, rowCenter + layout.labelDy);
      row.progress.setPosition(layout.textX, rowCenter + layout.progressDy);
      row.label.setText(near ? `${this.orderTierLabel(order)}  READY SOON` : this.orderRowLabel(order));
      row.progress.setText(near ? `${Math.min(progress, order.need)}/${order.need}  ALMOST COMPLETE` : `${Math.min(progress, order.need)}/${order.need}`);
      row.reward.setFontSize(order.scope === "free" ? 12 : 12);
      row.reward.setPosition(layout.rewardX, rowCenter);
      if (row.rewardPlate) {
        row.rewardPlate.setPosition(layout.rewardX, rowCenter);
        row.rewardPlate.setDisplaySize(order.scope === "free" ? 82 : 82, 23);
        row.rewardPlate.setFillStyle(order.scope === "free" && order.gold ? 0xfff06a : 0xfff4b8, 0.96);
      }
      const range = this.multRange(order.mult);
      const shownRange = order.scope === "free" && order.gold
        ? {
          min: Math.max(1, Math.round(range.min * (order.goldMult || 1.5))),
          max: Math.max(1, Math.round(range.max * (order.goldMult || 1.5)))
        }
        : range;
      if (order.scope !== "free" && order.rewardType === "scatter") {
        row.reward.setFontSize(10).setPosition(layout.rewardX, rowCenter).setText("SCATTER");
      } else if (order.scope !== "free" && order.rewardType === "coinsScatter") {
        row.reward.setFontSize(9).setPosition(layout.rewardX, rowCenter).setText(`${shownRange.min}-${shownRange.max}x+S`);
      } else {
        row.reward.setText(`${shownRange.min}-${shownRange.max}x`);
      }
      this.fitOrderLabel(row);
      if (row.keyRewardIcon) row.keyRewardIcon.setVisible(false);
    });
  }

  fitOrderLabel(row) {
    const maxRight = row.reward.x - row.reward.width / 2 - 10;
    const maxWidth = Math.max(92, maxRight - row.label.x);
    let size = 12;
    row.label.setFontSize(size);
    while (row.label.width > maxWidth && size > 9) {
      size -= 1;
      row.label.setFontSize(size);
    }
    let progressSize = 11;
    row.progress.setFontSize(progressSize);
    while (row.progress.width > maxWidth && progressSize > 8) {
      progressSize -= 1;
      row.progress.setFontSize(progressSize);
    }
  }

  setOrderNearState(row, active) {
    if (!row || row.nearActive === active) return false;
    row.nearActive = active;
    (row.nearTweens || []).forEach((tween) => tween.stop());
    row.nearTweens = [];
    this.tweens.killTweensOf([row.glow, row.panel, row.dotA, row.dotB, row.label, row.progress, row.rewardPlate, row.reward]);
    const layout = row.rowLayout || ORDER_ROW_LAYOUT[0];
    row.panel.setX(W / 2);
    row.label.setX(layout.textX);
    row.label.setFontSize(12);
    row.label.setColor("#ffffff");
    row.progress.setX(layout.textX);
    row.progress.setColor("#fff4b8").setFontStyle("800");
    if (row.rewardPlate) row.rewardPlate.setScale(1);
    row.dotA.setScale(1);
    row.dotB.setScale(1);
    row.reward.setScale(1);
    row.glow.setAlpha(0).setScale(1).setStrokeStyle(3, 0xffffff, 0);
    if (!active) return false;

    row.glow.setFillStyle(0xfff06a, 0.32).setStrokeStyle(4, 0xffffff, 1);
    row.progress.setColor("#fff06a").setFontStyle("900");
    row.label.setColor("#fff06a");
    row.nearTweens.push(this.tweens.add({
      targets: row.glow,
      alpha: { from: 0.34, to: 0.9 },
      scaleX: { from: 0.99, to: 1.025 },
      duration: 650,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    }));
    row.nearTweens.push(this.tweens.add({
      targets: [row.panel, row.label, row.progress],
      x: "+=1",
      duration: 120,
      yoyo: true,
      repeat: -1,
      ease: "Sine.InOut"
    }));
    row.nearTweens.push(this.tweens.add({
      targets: [row.dotA, row.dotB, row.rewardPlate, row.reward],
      scale: { from: 1, to: 1.25 },
      duration: 420,
      yoyo: true,
      repeat: -1,
      ease: "Back.InOut"
    }));
    return true;
  }

  clearOrderIcons() {
    this.orderRows.forEach((row) => {
      if (row.iconGroup) {
        [...row.iconGroup.getChildren()].forEach((child) => {
          this.tweens.killTweensOf(child);
          child.destroy();
        });
        row.iconGroup.destroy();
        row.iconGroup = null;
      }
    });
    this.children.list
      .filter((child) => child.isOrderIcon)
      .forEach((child) => {
        this.tweens.killTweensOf(child);
        child.destroy();
      });
  }

  drawOrderIcon(row, order, x, y) {
    if (row.iconGroup) {
      [...row.iconGroup.getChildren()].forEach((child) => {
        this.tweens.killTweensOf(child);
        child.destroy();
      });
      row.iconGroup.destroy();
    }
    row.iconGroup = this.add.group();
    const addIcon = (texture, ix, iy, size) => {
      const safeTexture = this.textures.exists(texture) ? texture : "sym-red";
      const iconImg = this.add.image(ix, iy, safeTexture).setDepth(18);
      iconImg.setScale(size / Math.max(iconImg.width || size, iconImg.height || size));
      iconImg.isOrderIcon = true;
      row.iconGroup.add(iconImg);
      return iconImg;
    };
    if (order.kind === "color") {
      addIcon(this.symbolKey({ type: order.type, special: null }), x, y, 31);
    } else if (order.kind === "chocolate") {
      addIcon("sym-chocolate", x, y, 31);
    } else if (order.kind === "any") {
      ["sym-red", "sym-blue", "sym-yellow"].forEach((key, idx) => {
        addIcon(key, x - 13 + idx * 13, y + (idx === 1 ? -4 : 3), 19);
      });
    } else if (order.kind === "cascade") {
      ["sym-stripe-row", "sym-bomb", "sym-chocolate"].forEach((key, idx) => {
        addIcon(key, x - 13 + idx * 13, y - 5 + idx * 5, 19);
      });
    } else if (order.kind === "combo") {
      const keys = {
        any: ["sym-stripe-row", "sym-bomb"],
        stripeStripe: ["sym-stripe-row", "sym-stripe-col"],
        stripeBomb: ["sym-stripe-row", "sym-bomb"],
        bombBomb: ["sym-bomb", "sym-bomb"],
        chocolateSpecial: ["sym-chocolate", "sym-stripe-row"]
      }[order.comboType] || ["sym-stripe-row", "sym-bomb"];
      keys.forEach((key, idx) => {
        addIcon(key, x - 10 + idx * 20, y, 22);
      });
      const plus = this.add.text(x, y, "+", {
        fontSize: 11,
        fontStyle: "900",
        color: "#fff06a",
        stroke: "#351352",
        strokeThickness: 3
      }).setOrigin(0.5).setDepth(19);
      plus.isOrderIcon = true;
      row.iconGroup.add(plus);
    } else {
      ["sym-red", "sym-blue", "sym-yellow"].forEach((key, idx) => {
        addIcon(key, x - 13 + idx * 13, y + (idx === 1 ? -4 : 3), 19);
      });
    }
    row.iconGroup.getChildren().forEach((child) => {
      child.isOrderIcon = true;
      child.setVisible(this.sessionActive);
    });
  }

  orderProgress(order) {
    return Math.max(0, this.rawOrderProgress(order) - (order.start || 0));
  }

  rawOrderProgress(order) {
    const free = order.scope === "free";
    if (order.kind === "color") return free ? (this.freeRemovedByColor[order.type] || 0) : (this.removedByColor[order.type] || 0);
    if (order.kind === "any") return free ? this.freeRemoved : this.totalRemoved;
    if (order.kind === "cascade") return free ? this.freeCascadeCount : this.cascadeCount;
    if (order.kind === "chocolate") return free ? this.freeChocolatesCreated : this.chocolatesCreated;
    if (order.kind === "combo") return (free ? this.freeComboCounts : this.comboCounts)[order.comboType] || 0;
    return 0;
  }

  orderName(order) {
    if (order.kind === "color") return `Collect ${order.need} ${LABELS[order.type]}`;
    if (order.kind === "any") return "Collect Any Candies";
    if (order.kind === "cascade") return "Trigger Cascades";
    if (order.kind === "combo") return "Combine Special Candies";
    return "Create Chocolate";
  }

  orderRowLabel(order) {
    if (order.kind !== "combo") return `${this.orderTierLabel(order)}  x${order.need}`;
    const names = {
      any: "ANY COMBO",
      stripeStripe: "STRIPE + STRIPE",
      stripeBomb: "STRIPE + BOMB",
      bombBomb: "BOMB + BOMB",
      chocolateSpecial: "CHOCO + SPECIAL"
    };
    return `${this.orderTierLabel(order)}  ${names[order.comboType] || "COMBO"} x${order.need}`;
  }

  orderTierLabel(order) {
    if (order.scope === "free" && order.gold) return "GOLD";
    if (order.scope !== "free") return String(order.tier).toUpperCase();
    if (order.tier.includes("Easy")) return "BONUS E";
    if (order.tier.includes("Medium")) return "BONUS M";
    return "BONUS H";
  }

  orderIcon(order) {
    if (order.kind === "color") return LABELS[order.type][0];
    if (order.kind === "any") return "A";
    if (order.kind === "cascade") return "C";
    return "*";
  }

  async showBonusIntroCard() {
    const group = this.add.group();
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x250712, 0.74).setDepth(80);
    const panel = this.add.rectangle(W / 2, H / 2, 330, 246, 0x7b1828, 0.98).setStrokeStyle(5, 0xffe277, 1).setDepth(81);
    const title = this.add.text(W / 2, H / 2 - 48, "BONUS GAME", {
      fontSize: 42,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#351352",
      strokeThickness: 8
    }).setOrigin(0.5).setDepth(82);
    const sub = this.add.text(W / 2, H / 2 + 22, "15 FREE MOVES", {
      fontSize: 26,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(82);
    const hint = this.add.text(W / 2, H / 2 + 74, "Complete bonus orders for huge multipliers", {
      fontSize: 15,
      fontStyle: "900",
      color: "#ffffff",
      stroke: "#351352",
      strokeThickness: 4
    }).setOrigin(0.5).setDepth(82);
    group.addMultiple([veil, panel, title, sub, hint]);
    const children = [...group.getChildren()];
    children.forEach((child) => child.setAlpha(0));
    this.tweens.add({ targets: children, alpha: 1, duration: 260, ease: "Cubic.Out" });
    this.tweens.add({ targets: [title, sub], scale: 1.1, duration: 220, yoyo: true, repeat: 2, ease: "Back.Out" });
    this.playCoinSpraySound();
    this.cameras.main.shake(420, 0.01);
    await this.wait(1900);
    this.tweens.add({ targets: children, alpha: 0, duration: 260, ease: "Cubic.In" });
    await this.wait(280);
    this.destroyTempGroup(group);
  }

  async showBonusUnlockAnimation() {
    const group = this.add.group();
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x061b30, 0.72).setDepth(76);
    const burst = this.add.circle(W / 2, H / 2 + 8, 86, 0xffe277, 0.12).setStrokeStyle(6, 0x8ee8ff, 0.75).setDepth(77);
    const chest = this.add.image(W / 2, H / 2 + 34, "sym-chest").setDepth(80);
    chest.setScale(112 / Math.max(chest.width, chest.height));
    const key = this.add.image(W / 2 - 118, H / 2 - 40, "sym-key").setDepth(81);
    key.setScale(68 / Math.max(key.width, key.height)).setRotation(-0.45);
    const title = this.add.text(W / 2, H / 2 - 132, "KEY UNLOCK", {
      fontSize: 31,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#061b30",
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(82);
    group.addMultiple([veil, burst, chest, key, title]);
    this.tweens.add({ targets: key, x: W / 2 - 22, y: H / 2 + 8, rotation: 0.18, duration: 720, ease: "Cubic.InOut" });
    this.tweens.add({ targets: chest, scale: chest.scale * 1.12, duration: 120, delay: 650, yoyo: true, repeat: 3, ease: "Back.Out" });
    this.tweens.add({ targets: burst, scale: 1.35, alpha: 0.62, duration: 820, yoyo: true, repeat: 1, ease: "Sine.InOut" });
    this.playCoinDing();
    await this.wait(860);
    this.playUnlockSound();
    this.playCoinSpraySound();
    this.cameras.main.shake(360, 0.012);
    const candyKeys = ["sym-stripe-row", "sym-stripe-col", "sym-bomb", "sym-chocolate", "sym-bomb", "sym-stripe-row"];
    candyKeys.forEach((texture, i) => {
      const angle = -Math.PI * 0.88 + i * (Math.PI * 1.76 / (candyKeys.length - 1));
      const candy = this.add.image(W / 2, H / 2 + 4, texture).setDepth(83);
      candy.setScale(38 / Math.max(candy.width, candy.height));
      candy.isFxSprite = true;
      this.fxSprites.add(candy);
      group.add(candy);
      this.tweens.add({
        targets: candy,
        x: W / 2 + Math.cos(angle) * 118,
        y: H / 2 + Math.sin(angle) * 96,
        scale: candy.scale * 1.35,
        rotation: (i - 2) * 0.35,
        duration: 760,
        ease: "Back.Out"
      });
    });
    await this.wait(1450);
    const children = [...group.getChildren()];
    this.tweens.add({ targets: children, alpha: 0, duration: 280, ease: "Cubic.In" });
    await this.wait(300);
    this.destroyTempGroup(group);
  }

  async showFreeEndCard() {
    const group = this.add.group();
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x250712, 0.78).setDepth(80);
    const panel = this.add.rectangle(W / 2, H / 2, 330, 270, 0x7b1828, 0.98).setStrokeStyle(5, 0xffe277, 1).setDepth(81);
    const title = this.add.text(W / 2, H / 2 - 72, "FREE GAME END", {
      fontSize: 33,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#351352",
      strokeThickness: 7
    }).setOrigin(0.5).setDepth(82);
    const body = this.add.text(W / 2, H / 2 + 8, [
      `Bonus orders completed: ${this.freeOrdersCompleted}`,
      `Removed in bonus: ${this.freeRemoved}`,
      `Bonus win: ${this.freeReward}`
    ].join("\n"), {
      fontSize: 18,
      fontStyle: "900",
      align: "center",
      color: "#ffffff",
      stroke: "#351352",
      strokeThickness: 5,
      lineSpacing: 9
    }).setOrigin(0.5).setDepth(82);
    const next = this.add.text(W / 2, H / 2 + 96, "BACK TO ORDERS", {
      fontSize: 18,
      fontStyle: "900",
      color: "#8ee8ff",
      stroke: "#061b30",
      strokeThickness: 5
    }).setOrigin(0.5).setDepth(82);
    group.addMultiple([veil, panel, title, body, next]);
    this.playCoinSpraySound();
    this.tweens.add({ targets: [title, body, next], scale: 1.08, duration: 200, yoyo: true, repeat: 1, ease: "Back.Out" });
    await this.wait(2600);
    const children = [...group.getChildren()];
    this.tweens.add({ targets: children, alpha: 0, duration: 280, ease: "Cubic.In" });
    await this.wait(300);
    this.destroyTempGroup(group);
  }

  destroyTempGroup(group) {
    if (!group) return;
    [...group.getChildren()].forEach((child) => {
      this.tweens.killTweensOf(child);
      this.fxSprites.delete(child);
      child.destroy();
    });
    group.destroy();
  }

  async finishMove() {
    if (this.gameMode === "free") {
      await this.finishFreeMove();
      return;
    }
    this.updateOrders();
    this.fulfillCompletedOrders();
    if (this.moveReward > 0) {
      this.winText.setText(`ORDER REWARD +${this.moveReward}`);
      this.statusText.setText("Order complete. New order ready.");
      this.playPopSound(1320);
      this.time.delayedCall(80, () => this.playPopSound(1760));
      this.showOrderRewardSummary(this.moveCompletions, this.moveReward);
      await this.wait(3100);
    } else if (this.moveCompletions.length > 0) {
      this.winText.setText(`EARNED ${this.sessionReward}`);
      this.statusText.setText("Order complete. Scatter added.");
      await this.wait(720);
    } else {
      this.winText.setText(`EARNED ${this.sessionReward}`);
      this.statusText.setText("Keep solving orders.");
      await this.wait(180);
    }
    if (this.wallet < this.betAmount) {
      await this.finishSession("Wallet empty");
      return;
    }
    if (this.bonusPending) {
      this.bonusPending = false;
      await this.startFreeGame();
      return;
    }
    await this.ensureLegalMovesWithShuffle();
    this.busy = false;
    this.resolvingMove = false;
    this.inputOpen = true;
    this.updateBetUi();
  }

  async finishFreeMove() {
    this.updateOrders();
    await this.maybeTriggerBonusMoveEvent();
    this.updateOrders();
    this.fulfillCompletedOrders();
    if (this.moveReward > 0) {
      this.winText.setText(`BONUS ORDER +${this.moveReward}`);
      this.statusText.setText("Bonus order complete.");
      this.showOrderRewardSummary(this.moveCompletions, this.moveReward);
      await this.wait(2300);
    } else {
      this.updateFreeUi();
    }
    if (this.freeMovesLeft <= 0) {
      await this.endFreeGame();
      return;
    }
    this.moveReward = 0;
    this.moveCompletions = [];
    this.freeMoveHadEvent = false;
    await this.ensureLegalMovesWithShuffle();
    this.busy = false;
    this.resolvingMove = false;
    this.inputOpen = true;
    this.updateBetUi();
  }

  async startFreeGame(options = {}) {
    this.inputOpen = false;
    this.busy = true;
    this.resolvingMove = true;
    this.sessionActive = true;
    this.savedMainOrders = (this.orders || []).map((order) => ({ ...order }));
    this.freeBoughtMode = !!options.bought;
    this.gameMode = "free";
    this.freeMovesLeft = 15;
    this.freeRemoved = 0;
    this.freeRemovedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.freeCascadeCount = 0;
    this.freeChocolatesCreated = 0;
    this.freeComboCounts = { any: 0, stripeStripe: 0, stripeBomb: 0, bombBomb: 0, chocolateSpecial: 0 };
    this.freeReward = 0;
    this.freeOrdersCompleted = 0;
    this.freeChestsOpened = 0;
    this.freeScatterRetriggers = 0;
    this.freeEventCount = 0;
    this.freeColorClearUsed = false;
    this.freeMoveHadEvent = false;
    this.moveReward = 0;
    this.moveCompletions = [];
    this.clearSelection();
    this.clearOrderIcons();
    await this.showBonusUnlockAnimation();
    await this.showBonusIntroCard();
    this.clearEffects();
    this.startFreeMusic();
    this.configureBoard(FREE_ROWS);
    this.createBoardFrame();
    this.generateFreeOrders();
    this.generateFreeBoard();
    this.renderBoard(true);
    this.updateOrders();
    this.updateFreeUi();
    this.setMode("free");
    this.cameras.main.flash(520, 100, 245, 255);
    this.busy = false;
    this.resolvingMove = false;
    this.inputOpen = true;
  }

  async endFreeGame() {
    this.inputOpen = false;
    this.busy = true;
    this.resolvingMove = true;
    this.stopFreeMusic();
    await this.showFreeEndCard();
    const wasBoughtBonus = this.freeBoughtMode;
    this.freeBoughtMode = false;
    this.gameMode = "main";
    if (!wasBoughtBonus) this.bonusExitCooldown = 20;
    if (this.savedMainOrders && this.savedMainOrders.length) {
      this.orders = this.savedMainOrders.map((order) => ({ ...order }));
    } else {
      this.generateOrders();
    }
    this.savedMainOrders = null;
    this.configureBoard(MAIN_ROWS);
    this.createBoardFrame();
    this.generateBoard();
    this.ensureLegalMovesWithShuffle(false);
    this.renderBoard(true);
    this.updateOrders();
    this.updateKeyUi();
    this.updateBetUi();
    this.setMode("game");
    this.startCuteMusic();
    this.statusText.setText("Back to orders.");
    this.busy = false;
    this.resolvingMove = false;
    this.inputOpen = true;
  }

  fulfillCompletedOrders() {
    let reward = 0;
    let scatterGranted = false;
    this.orders = this.orders.map((order, index) => {
      if (this.orderProgress(order) < order.need) return order;
      const paysCoins = this.orderPaysCoins(order);
      const paysScatter = this.orderPaysScatter(order);
      const roll = paysCoins ? this.rollOrderMult(order.mult) : { range: null, mult: 0 };
      const isFreeOrder = order.scope === "free";
      const goldMult = isFreeOrder && order.gold ? (order.goldMult || 1.5) : 1;
      const boost = paysCoins ? this.rollBonusOrderBoost(order) : { mult: 1, label: "" };
      const finalMult = paysCoins ? Math.max(1, Math.round(roll.mult * goldMult * boost.mult)) : 0;
      const adjustedRange = roll.range ? {
        min: Math.max(1, Math.round(roll.range.min * goldMult)),
        median: Math.max(1, Math.round(roll.range.median * goldMult)),
        max: Math.max(1, Math.round(roll.range.max * goldMult))
      } : null;
      const orderReward = paysCoins ? finalMult * this.betAmount : 0;
      const keyGain = 0;
      reward += orderReward;
      this.ordersCompleted += 1;
      if (isFreeOrder) {
        this.freeOrdersCompleted += 1;
        this.freeReward += orderReward;
      }
      if (paysScatter && this.grantScatterRewardFx(index)) scatterGranted = true;
      this.moveCompletions.push({
        order,
        reward: orderReward,
        rollMult: finalMult,
        range: adjustedRange,
        scatter: paysScatter,
        goldMult,
        boostMult: boost.mult,
        boostLabel: boost.label
      });
      this.showOrderCompleteFx(index, order, orderReward);
      
      return isFreeOrder ? this.createFreeOrder(order.tier) : this.createOrder(order.tier);
    });
    if (scatterGranted) this.checkScatterBonus();
    if (reward > 0) {
      this.wallet += reward;
      this.sessionReward += reward;
      this.moveReward += reward;
      this.animateWalletMeter(reward);
      if (this.gameMode === "free") this.updateFreeUi();
      else this.animateWinMeter(reward);
      this.winText.setText(`ORDER REWARD +${this.moveReward}`);
      this.statusText.setText("Order complete. New order ready.");
      this.updateOrders();
      this.updateBetUi();
    }
    if (scatterGranted && reward === 0) {
      this.statusText.setText("Order complete. Scatter added.");
      this.updateOrders();
      this.updateBetUi();
    }
    return reward;
  }

  async finishSession(reason) {
    this.endReason = reason;
    this.sessionActive = false;
    this.inputOpen = false;
    this.busy = false;
    this.resolvingMove = false;
    this.clearSelection();
    this.updateOrders();
    const payout = this.calculatePayout();
    this.statusText.setText(reason);
    this.winText.setText(`TOTAL EARNED ${payout.reward}`);
    this.updateBetUi();
    await this.wait(160);
    this.clearEffects();
    this.showPopup(payout);
  }

  calculatePayout() {
    return {
      reward: this.sessionReward,
      removed: this.totalRemoved,
      cascades: this.cascadeCount,
      completed: this.ordersCompleted,
      moves: this.movesMade,
      bet: this.betAmount,
      spent: this.movesMade * this.betAmount,
      wallet: this.wallet,
      reason: this.endReason
    };
  }

  showGameBetMenu() {
    if (this.gameMode !== "main" || !this.sessionActive || this.busy || this.resolvingMove) return;
    this.closePopup();
    this.popup = this.add.group();
    const originalBet = this.betAmount;
    let nextBet = this.betAmount;
    const depth = 82;
    const cap = () => Math.min(MAX_BET, this.wallet);
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x120926, 0.58).setDepth(depth);
    const panel = this.add.rectangle(W / 2, H / 2, 280, 230, 0x5a1020, 0.98)
      .setStrokeStyle(4, 0xffe277, 0.95)
      .setDepth(depth + 1);
    const title = this.add.text(W / 2, 270, "CHANGE BET", {
      fontSize: 27,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#351352",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(depth + 2);
    const value = this.add.text(W / 2, 345, `BET ${nextBet}`, {
      fontSize: 34,
      fontStyle: "900",
      color: "#fff6d0",
      stroke: "#351352",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(depth + 2);
    const minus = this.add.rectangle(W / 2 - 92, 345, 58, 54, 0xff4f88, 0.94)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setDepth(depth + 2);
    const minusMark = this.add.rectangle(W / 2 - 92, 345, 24, 5, 0xffffff, 1).setDepth(depth + 3);
    const plus = this.add.rectangle(W / 2 + 92, 345, 58, 54, 0x45d66f, 0.94)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setDepth(depth + 2);
    const plusH = this.add.rectangle(W / 2 + 92, 345, 24, 5, 0xffffff, 1).setDepth(depth + 3);
    const plusV = this.add.rectangle(W / 2 + 92, 345, 5, 24, 0xffffff, 1).setDepth(depth + 3);
    const hint = this.add.text(W / 2, 392, "Changing bet resets orders and board", {
      fontSize: 12,
      fontStyle: "800",
      color: "#8ee8ff",
      stroke: "#351352",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(depth + 2);
    const cancel = this.add.rectangle(W / 2 - 66, 437, 104, 42, 0x7a2d93, 0.95)
      .setStrokeStyle(3, 0xffffff, 0.82)
      .setDepth(depth + 2);
    const cancelText = this.add.text(W / 2 - 66, 437, "CANCEL", {
      fontSize: 16,
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5).setDepth(depth + 3);
    const ok = this.add.rectangle(W / 2 + 66, 437, 104, 42, 0xffd94c, 0.96)
      .setStrokeStyle(3, 0xffffff, 0.9)
      .setDepth(depth + 2);
    const okText = this.add.text(W / 2 + 66, 437, "OK", {
      fontSize: 18,
      fontStyle: "900",
      color: "#5c1d7f",
      stroke: "#ffffff",
      strokeThickness: 2
    }).setOrigin(0.5).setDepth(depth + 3);
    const refresh = () => {
      nextBet = Phaser.Math.Clamp(nextBet, MIN_BET, cap());
      value.setText(`BET ${nextBet}`);
      minus.setAlpha(nextBet <= MIN_BET ? 0.55 : 0.94);
      plus.setAlpha(nextBet >= cap() ? 0.55 : 0.94);
      ok.setAlpha(nextBet === originalBet ? 0.72 : 0.96);
      okText.setAlpha(nextBet === originalBet ? 0.72 : 1);
    };
    const change = (delta) => {
      const oldBet = nextBet;
      nextBet = Phaser.Math.Clamp(nextBet + delta, MIN_BET, cap());
      refresh();
      this.playBetSound(delta, nextBet !== oldBet);
    };
    minus.setInteractive({ useHandCursor: true }).on("pointerdown", () => change(-BET_STEP));
    plus.setInteractive({ useHandCursor: true }).on("pointerdown", () => change(BET_STEP));
    cancel.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.closePopup());
    ok.setInteractive({ useHandCursor: true }).on("pointerdown", () => {
      if (nextBet === originalBet) {
        this.closePopup();
        return;
      }
      this.betAmount = nextBet;
      this.closePopup();
      this.resetMainGameForBetChange();
    });
    this.popup.addMultiple([veil, panel, title, value, minus, minusMark, plus, plusH, plusV, hint, cancel, cancelText, ok, okText]);
    this.popup.getChildren().forEach((child) => {
      child.setAlpha(child.alpha ?? 1);
    });
    refresh();
  }

  resetMainGameForBetChange() {
    this.clearEffects();
    this.clearOrderIcons();
    this.busy = false;
    this.resolvingMove = false;
    this.sessionActive = true;
    this.inputOpen = true;
    this.selected = null;
    this.gameMode = "main";
    this.savedMainOrders = null;
    this.configureBoard(MAIN_ROWS);
    this.createBoardFrame();
    this.movesMade = 0;
    this.totalRemoved = 0;
    this.removedByColor = Object.fromEntries(TYPES.map((t) => [t, 0]));
    this.cascadeCount = 0;
    this.chocolatesCreated = 0;
    this.comboCounts = { any: 0, stripeStripe: 0, stripeBomb: 0, bombBomb: 0, chocolateSpecial: 0 };
    this.ordersCompleted = 0;
    this.sessionReward = 0;
    this.paidBetTotal = 0;
    this.moveReward = 0;
    this.moveCompletions = [];
    this.bonusExitCooldown = 0;
    this.displayedWin = 0;
    this.lastWinAmount = 0;
    this.displayedWallet = this.wallet;
    if (this.walletCounterTween) this.walletCounterTween.stop();
    this.walletCounterTween = null;
    if (this.winCounterTween) this.winCounterTween.stop();
    this.winCounterTween = null;
    this.winGainText.setText("").setAlpha(1).setY(706);
    this.walletGainText.setText("").setAlpha(1).setY(706);
    this.winText.setText("");
    this.statusText.setText("BET changed. New orders.");
    this.updateKeyUi();
    this.generateOrders();
    this.generateBoard();
    this.renderBoard(true);
    this.updateOrders();
    this.updateBetUi();
    this.setMode("game");
    this.playUnlockSound();
  }

  showPopup(p) {
    this.closePopup();
    this.popup = this.add.group();
    const veil = this.add.rectangle(W / 2, H / 2, W, H, 0x120926, 0.74);
    const panel = this.add.rectangle(W / 2, H / 2, 318, 364, 0x522474, 0.98);
    const inner = this.add.rectangle(W / 2, H / 2 + 10, 282, 258, 0x2f1555, 0.96);
    const topStripe = this.add.rectangle(W / 2, 264, 246, 5, 0x8ee8ff, 1);
    const bottomStripe = this.add.rectangle(W / 2, 478, 246, 5, 0xffe277, 1);
    const frame = this.addPixelFrame(W / 2, H / 2, 328, 374, { bg: 0x522474, bgAlpha: 0.18, thickness: 5 });
    const frameItems = frame.getChildren();
    const title = this.add.text(W / 2, 220, "SESSION END", {
      fontSize: 36,
      fontStyle: "900",
      color: "#fff06a",
      stroke: "#351352",
      strokeThickness: 6
    }).setOrigin(0.5).setDepth(summaryDepth + 3);
    title.setShadow(3, 4, "#2b1248", 0, true, true);
    const lines = [
      `${p.reason}`,
      `Moves: ${p.moves}  Bet: ${p.bet}`,
      `Spent: ${p.spent}`,
      `Removed: ${p.removed} candies`,
      `Cascades: ${p.cascades}`,
      `Orders completed: ${p.completed}`,
      `Rewards earned: ${p.reward}`,
      `Wallet: ${this.wallet}`
    ];
    const body = this.add.text(W / 2, 348, lines.join("\n"), {
      fontSize: 16,
      fontStyle: "800",
      color: "#fff8d8",
      align: "center",
      lineSpacing: 8,
      stroke: "#1e0d38",
      strokeThickness: 3
    }).setOrigin(0.5).setDepth(summaryDepth + 3);
    const next = this.add.rectangle(W / 2, 532, 202, 52, 0xff4f88).setStrokeStyle(3, 0xffffff);
    const nextText = this.add.text(W / 2, 532, "OK", {
      fontSize: 21,
      fontStyle: "900",
      color: "#ffffff"
    }).setOrigin(0.5);
    next.setInteractive({ useHandCursor: true }).on("pointerdown", () => this.showPreStart());
    this.popup.addMultiple([veil, panel, inner, topStripe, bottomStripe, ...frameItems, title, body, next, nextText]);
    this.popup.getChildren().forEach((child) => {
      child.setAlpha(0);
      this.tweens.add({ targets: child, alpha: 1, duration: 180 });
    });
  }

  closePopup() {
    if (this.popup) {
      this.popup.getChildren().forEach((child) => {
        this.tweens.killTweensOf(child);
        child.destroy();
      });
      this.popup.destroy(true);
      this.popup = null;
    }
  }

  cellX(c) {
    return this.boardX + c * this.cell + this.cell / 2;
  }

  cellY(r) {
    return this.boardY + r * this.cell + this.cell / 2;
  }

  wait(ms) {
    return new Promise((resolve) => this.time.delayedCall(ms, resolve));
  }
}

const config = {
  type: Phaser.AUTO,
  parent: "game",
  width: W,
  height: H,
  backgroundColor: "#4f1220",
  pixelArt: true,
  roundPixels: true,
  scale: {
    mode: Phaser.Scale.FIT,
    autoCenter: Phaser.Scale.CENTER_BOTH
  },
  scene: CandyOrdersScene
};

window.addEventListener("load", () => {
  if (window.candyGame && window.candyGame.destroy) {
    window.candyGame.destroy(true);
    const host = document.getElementById("game");
    if (host) host.innerHTML = "";
  }
  window.candyGame = new Phaser.Game(config);
});



















