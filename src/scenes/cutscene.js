import * as me from "melonjs";
import { W, H } from "../config.js";
import { Label } from "../game/label.js";
import { sfx, stopMusic } from "../game/audio.js";
import { onMenuKeys, onCanvasPointer } from "../game/menuinput.js";
import { renderLetter, WARM, SUN, COOL } from "../game/logo.js";
import { drawPerson, drawBoard, drawCar, drawHeli, drawBeam, drawSparkle, poly, HERO, COP, COP2 } from "../game/actors.js";

const FONT = '"Bungee", Impact, "Arial Black", sans-serif';
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (k) => {
  const t = clamp(k);
  return t * t * (3 - 2 * t);
};
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);
const rand = (a, b) => a + Math.random() * (b - a);
const seeded = (seed) => {
  let s = seed;
  return () => (s = (s * 1664525 + 1013904223) % 4294967296) / 4294967296;
};
const hash = (a, b) => (((a * 73856093) ^ (b * 19349663)) >>> 0) % 1000 / 1000;
const mk = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};

const WX0 = -420;
const WX1 = 2300;
const GY = 422; 
const ROAD_Y = 474; 
const WALL_TOP = 150;
const WALL_BOT = 410;
const HS = 1.6; 
const CS = 1.5; 
const NOZ = 38; 
const TAG_BASE = 345;
const TAG_SIZE = 112;
const TAG_CX = 520;
const BOARD_X = 800; 
const CAR_STOP = 270;
const BAR_T = 50; 
const BAR_B = 56;


const T = {
  in0: 0.15, hop: 1.2, shake0: 1.75, paint0: 2.7, paint1: 6.0, admire1: 6.95,
  siren0: 6.55, alert: 7.05, car0: 7.15, car1: 7.95, heli0: 7.2, door: 8.1,
  flee: 8.5, chase: 8.6, hop2: 8.95, land2: 9.2, end: 10.6,
};
const SCHEMES = [SUN, WARM, COOL, WARM, SUN];

function buildSky() {
  const cv = mk(W, 340);
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 0, 340);
  gr.addColorStop(0, "#0a0c2a");
  gr.addColorStop(0.14, "#1a1650");
  gr.addColorStop(0.22, "#3a2670");
  gr.addColorStop(0.31, "#8a3d86");
  gr.addColorStop(0.37, "#ff7f82");
  gr.addColorStop(0.44, "#ffb48a");
  gr.addColorStop(1, "#ffb48a");
  g.fillStyle = gr;
  g.fillRect(0, 0, W, 340);
  const rnd = seeded(5);
  for (let i = 0; i < 90; i++) {
    g.fillStyle = `rgba(255,255,255,${0.2 + rnd() * 0.6})`;
    g.fillRect(rnd() * W, 40 + rnd() * 70, rnd() < 0.15 ? 3 : 2, 2);
  }
  // lua
  const glow = g.createRadialGradient(790, 88, 6, 790, 88, 90);
  glow.addColorStop(0, "rgba(230,235,255,0.55)");
  glow.addColorStop(1, "rgba(230,235,255,0)");
  g.fillStyle = glow;
  g.fillRect(690, 0, 200, 190);
  g.fillStyle = "#f2f4ff";
  g.beginPath();
  g.arc(790, 88, 24, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(160,170,210,0.55)";
  g.beginPath();
  g.arc(782, 82, 6, 0, Math.PI * 2);
  g.arc(800, 98, 4, 0, Math.PI * 2);
  g.fill();
  for (let i = 0; i < 7; i++) {
    g.fillStyle = `rgba(255,170,170,${0.1 + rnd() * 0.1})`;
    g.beginPath();
    g.ellipse(rnd() * W, 100 + rnd() * 36, 80 + rnd() * 120, 6 + rnd() * 8, 0, 0, Math.PI * 2);
    g.fill();
  }
  return cv;
}

function buildSkyline(kind) {
  const w = 2700;
  const cv = mk(w, 380);
  const g = cv.getContext("2d");
  const rnd = seeded(kind * 31 + 5);
  const far = kind === 1;
  const base = far ? 188 : 180;
  for (let x = 0; x < w; ) {
    const bw = (far ? 36 : 52) + rnd() * (far ? 52 : 84);
    const bh = (far ? 46 : 70) + rnd() * (far ? 96 : 130);
    g.fillStyle = far ? "#4a2f72" : "#1c1642";
    g.fillRect(x, base - bh, bw, 380);
    if (rnd() < 0.35) {
      g.fillRect(x + bw * 0.4, base - bh - (far ? 14 : 22), 3, far ? 14 : 22); // antena
      g.fillStyle = "#ff3b4a";
      g.fillRect(x + bw * 0.4 - 1, base - bh - (far ? 16 : 24), 5, 3);
      g.fillStyle = far ? "#4a2f72" : "#1c1642";
    } else if (rnd() < 0.3) g.fillRect(x + 6, base - bh - 10, bw * 0.4, 10); // casa de máquinas
    g.fillStyle = far ? "rgba(255,196,150,0.3)" : "rgba(255,214,140,0.85)";
    const step = far ? 9 : 12;
    for (let wy = base - bh + 8; wy < base - 4; wy += step)
      for (let wx = x + 5; wx < x + bw - 6; wx += step) if (rnd() < (far ? 0.26 : 0.4)) g.fillRect(wx, wy, far ? 3 : 4, far ? 4 : 5);
    x += bw + (far ? 2 : 4) + rnd() * 8;
  }
  return cv;
}

function buildWorld(a, b) {
  const cv = mk(b - a, H);
  const g = cv.getContext("2d");
  g.translate(-a, 0);
  const wallH = WALL_BOT - WALL_TOP;

  g.fillStyle = "#222a45";
  g.fillRect(a, WALL_TOP, b - a, wallH);
  const bricks = ["#3f4a6e", "#384264", "#47527a", "#343d5c", "#3d4768"];
  const x0 = Math.floor(a / 48) * 48 - 48;
  for (let row = 0, y = WALL_TOP; y < WALL_BOT; y += 15, row++) {
    for (let x = x0 + (row % 2 ? -24 : 0); x < b; x += 48) {
      g.fillStyle = bricks[Math.floor(hash(Math.round(x / 24), row) * bricks.length)];
      g.fillRect(x + 1, y + 1, 46, 13);
      g.fillStyle = "rgba(255,255,255,0.06)";
      g.fillRect(x + 1, y + 1, 46, 2);
      g.fillStyle = "rgba(0,0,10,0.16)";
      g.fillRect(x + 1, y + 12, 46, 2);
    }
  }
  for (let i = 0; i < 40; i++) {
    const px = hash(i, 3) * 2700 - 500;
    if (px < a - 90 || px > b + 90) continue;
    g.fillStyle = `rgba(10,12,30,${0.05 + hash(i, 9) * 0.08})`;
    g.beginPath();
    g.ellipse(px, WALL_TOP + 20 + hash(i, 5) * (wallH - 40), 30 + hash(i, 7) * 80, 12 + hash(i, 11) * 34, 0, 0, Math.PI * 2);
    g.fill();
  }
  const px0 = 262;
  const px1 = 780;
  const py0 = 204;
  const py1 = 374;
  g.fillStyle = "#17142b";
  g.fillRect(px0, py0, px1 - px0, py1 - py0);
  g.fillStyle = "#1d1a36";
  g.fillRect(px0 + 6, py0 + 4, px1 - px0 - 40, py1 - py0 - 12);
  for (let x = px0 + 14; x < px1 - 8; x += 26) {
    g.fillStyle = "rgba(255,255,255,0.025)";
    g.fillRect(x, py0 + 3, 9, py1 - py0 - 6); 
  }
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(px0, py1 - 3, px1 - px0, 3);
  const poster = (x, y, c) => {
    g.fillStyle = "rgba(0,0,0,0.3)";
    g.fillRect(x + 3, y + 3, 54, 76);
    g.fillStyle = c;
    g.fillRect(x, y, 54, 76);
    g.fillStyle = "rgba(20,20,50,0.5)";
    g.fillRect(x + 6, y + 8, 42, 9);
    for (let k = 0; k < 3; k++) g.fillRect(x + 6, y + 26 + k * 12, 26 + hash(k, x) * 16, 5);
  };
  poster(180, 214, "#b9a98a");
  poster(900, 232, "#8fb4c9");
  poster(1560, 200, "#c99aae");
  poster(2080, 226, "#b9a98a");
  const win = (x, y, lit) => {
    g.fillStyle = "#0e0c1c";
    g.fillRect(x - 4, y - 4, 58, 78);
    g.fillStyle = lit ? "#ffcf7a" : "#141226";
    g.fillRect(x, y, 50, 70);
    g.fillStyle = "#0e0c1c";
    g.fillRect(x + 23, y, 4, 70);
    g.fillRect(x, y + 33, 50, 4);
  };
  win(-330, 200, true);
  win(-230, 200, false);
  win(1480, 196, false);
  win(1700, 200, true);
  win(2200, 198, false);

  g.strokeStyle = "#0d0b18";
  g.fillStyle = "#0d0b18";
  g.lineWidth = 4;
  for (const fy of [212, 316]) {
    g.fillRect(1040, fy, 330, 7);
    g.beginPath();
    for (let x = 1044; x <= 1366; x += 24) {
      g.moveTo(x, fy);
      g.lineTo(x, fy - 36);
    }
    g.moveTo(1040, fy - 36);
    g.lineTo(1370, fy - 36);
    g.stroke();
  }
  g.beginPath();
  g.moveTo(1230, 219);
  g.lineTo(1330, 316);
  g.moveTo(1250, 219);
  g.lineTo(1350, 316);
  g.stroke();
  g.fillRect(1366, 176, 6, 236);
  g.fillStyle = "#12101f";
  g.fillRect(846, WALL_TOP, 15, wallH);
  g.fillStyle = "rgba(255,255,255,0.14)";
  g.fillRect(849, WALL_TOP, 3, wallH);
  for (const by of [182, 262, 340]) {
    g.fillStyle = "#0a0914";
    g.fillRect(843, by, 21, 6);
  }

  g.fillStyle = "rgba(25,30,90,0.18)";
  g.fillRect(a, WALL_TOP, b - a, wallH);
  const shade = g.createLinearGradient(0, WALL_TOP, 0, WALL_TOP + 70);
  shade.addColorStop(0, "rgba(0,0,12,0.55)");
  shade.addColorStop(1, "rgba(0,0,12,0)");
  g.fillStyle = shade;
  g.fillRect(a, WALL_TOP, b - a, 70);
  g.fillStyle = "#1b1830";
  g.fillRect(a, WALL_TOP - 10, b - a, 13);
  g.fillStyle = "rgba(255,255,255,0.2)";
  g.fillRect(a, WALL_TOP - 10, b - a, 2);

  const lamps = [170, 905, 1420, 1960, -300];
  for (const lx of lamps) {
    const pool = g.createRadialGradient(lx, WALL_TOP + 46, 8, lx, WALL_TOP + 90, 300);
    pool.addColorStop(0, "rgba(255,210,130,0.7)");
    pool.addColorStop(0.5, "rgba(255,170,90,0.22)");
    pool.addColorStop(1, "rgba(255,170,90,0)");
    g.save();
    g.globalCompositeOperation = "lighter";
    g.fillStyle = pool;
    g.fillRect(lx - 320, WALL_TOP, 640, 300);
    g.restore();
    g.fillStyle = "#0d0b18";
    g.fillRect(lx - 3, WALL_TOP + 10, 6, 40);
    g.fillRect(lx - 24, WALL_TOP + 4, 48, 8);
    g.fillStyle = "#ffe9a8";
    g.fillRect(lx - 17, WALL_TOP + 10, 34, 5);
  }

  g.fillStyle = "#57577a";
  g.fillRect(a, WALL_BOT, b - a, 46);
  g.fillStyle = "rgba(0,0,0,0.26)";
  g.fillRect(a, WALL_BOT, b - a, 8);
  for (let x = Math.floor(a / 90) * 90; x < b; x += 90) {
    g.fillStyle = "rgba(0,0,0,0.25)";
    g.fillRect(x, WALL_BOT + 8, 2, 38);
    if (hash(x, 1) < 0.4) {
      g.fillRect(x + 30, WALL_BOT + 14, 14, 2); 
      g.fillRect(x + 42, WALL_BOT + 16, 2, 10);
    }
  }
  for (const lx of lamps) {
    const gp = g.createRadialGradient(lx, WALL_BOT + 20, 4, lx, WALL_BOT + 20, 190);
    gp.addColorStop(0, "rgba(255,200,120,0.4)");
    gp.addColorStop(1, "rgba(255,200,120,0)");
    g.fillStyle = gp;
    g.fillRect(lx - 200, WALL_BOT, 400, 50);
  }
  g.fillStyle = "#8a89b0";
  g.fillRect(a, WALL_BOT + 46, b - a, 7);
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.fillRect(a, WALL_BOT + 53, b - a, 3);
  g.fillStyle = "#15142a";
  g.fillRect(a, WALL_BOT + 56, b - a, H - WALL_BOT - 56);
  for (let x = Math.floor(a / 120) * 120; x < b; x += 120) {
    g.fillStyle = "rgba(255,255,255,0.35)";
    g.fillRect(x + 20, 524, 64, 5);
  }
  for (let i = 0; i < 9; i++) {
    const cx = -380 + i * 260 + hash(i, 2) * 80;
    g.fillStyle = "rgba(60,64,130,0.55)";
    g.beginPath();
    g.ellipse(cx, 494, 60 + hash(i, 4) * 60, 8 + hash(i, 6) * 6, 0, 0, Math.PI * 2);
    g.fill();
    g.fillStyle = "rgba(255,255,255,0.12)";
    g.fillRect(cx - 40, 491, 50, 2);
  }
  g.fillStyle = "#0b0a18";
  g.beginPath();
  g.ellipse(640, 508, 42, 7, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#26244a";
  g.beginPath();
  g.ellipse(640, 506, 38, 5, 0, 0, Math.PI * 2);
  g.fill();

  const dx = -40;
  g.fillStyle = "rgba(0,0,0,0.35)";
  g.beginPath();
  g.ellipse(dx + 70, GY + 4, 92, 8, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "#1b3a31";
  g.fillRect(dx, 336, 150, 82);
  g.fillStyle = "#254e42";
  g.fillRect(dx + 3, 339, 144, 74);
  g.fillStyle = "#16302a";
  for (let k = 1; k < 5; k++) g.fillRect(dx + k * 30, 339, 3, 74);
  g.fillStyle = "#12261f";
  g.fillRect(dx - 6, 326, 162, 14);
  g.fillStyle = "rgba(255,255,255,0.12)";
  g.fillRect(dx - 6, 326, 162, 3);
  g.fillStyle = "#0e0c18";
  g.beginPath();
  g.ellipse(dx + 178, 404, 26, 18, 0, 0, Math.PI * 2);
  g.ellipse(dx + 208, 410, 20, 13, 0, 0, Math.PI * 2);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.fillRect(dx + 170, 392, 10, 3);

  // gradiente de luz geral (cantos mais escuros)
  return cv;
}

function buildVignette() {
  const cv = mk(W, H);
  const g = cv.getContext("2d");
  const vg = g.createRadialGradient(W / 2, H / 2, 240, W / 2, H / 2, 640);
  vg.addColorStop(0, "rgba(0,0,0,0)");
  vg.addColorStop(1, "rgba(0,0,8,0.62)");
  g.fillStyle = vg;
  g.fillRect(0, 0, W, H);
  return cv;
}

function buildWash(rgb, w, h, a) {
  const cv = mk(w, h);
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, `rgba(${rgb},0)`);
  gr.addColorStop(0.5, `rgba(${rgb},${a})`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  return cv;
}
function buildSweep(rgb) {
  const cv = mk(528, H);
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 528, 0);
  gr.addColorStop(0, `rgba(${rgb},0.16)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 528, H);
  return cv;
}

function sliceLetter(l, n = 14) {
  const sw = Math.ceil(l.w / n);
  const strips = [];
  for (let i = 0; i < n; i++) {
    const c = mk(sw + 1, l.h);
    c.getContext("2d").drawImage(l.cv, i * sw, 0, sw + 1, l.h, 0, 0, sw + 1, l.h);
    strips.push(c);
  }
  const wh = mk(l.w, l.h);
  const g = wh.getContext("2d");
  g.drawImage(l.cv, 0, 0);
  g.globalCompositeOperation = "source-in";
  g.fillStyle = "#ffffff";
  g.fillRect(0, 0, l.w, l.h);
  return { strips, sw, white: wh };
}

let ASSETS = null;
function assets() {
  if (!ASSETS) {
    ASSETS = {
      sky: buildSky(),
      far: buildSkyline(1),
      near: buildSkyline(2),
      vig: buildVignette(),
      wash: [buildWash("255,31,61", 1000, WALL_BOT - WALL_TOP, 0.42), buildWash("31,85,255", 1000, WALL_BOT - WALL_TOP, 0.42)],
      sweep: [buildSweep("255,31,61"), buildSweep("31,85,255")],
      chunks: [[WX0, buildWorld(WX0, 700)], [700, buildWorld(700, WX1)]],
      letters: [...TAG_TEXT].map((ch, i) => {
        const l = { ch, scheme: SCHEMES[i % SCHEMES.length], ...renderLetter(ch, TAG_SIZE, SCHEMES[i % SCHEMES.length]) };
        return { ...l, ...sliceLetter(l) };
      }),
    };
  }
  return ASSETS;
}

class CutsceneView extends me.Renderable {
  constructor(scene) {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.floating = true;
    this.alwaysUpdate = true;
    this.scene = scene;
    const A = assets();
    this.sky = A.sky;
    this.far = A.far;
    this.near = A.near;
    this.vig = A.vig;
    this.wash = A.wash;
    this.sweep = A.sweep;
    this.chunks = A.chunks;
    this.t = 0;
    this.paused = false; 
    this.flags = {};
    this.parts = [];
    this.shake = 0;
    this.flash = 0;
    this.can = null;
    this.hero = { x: -300, y: GY, px: null, ph: 0, walk: 0, top: 280, nozzle: null };
    this.cops = [
      { x: 0, y: GY, px: null, ph: 0, walk: 0, pal: COP, who: "A" },
      { x: 0, y: GY, px: null, ph: 0, walk: 0, pal: COP2, who: "B" },
    ];
    this.cam = { cx: 330, cy: 288, z: 1 };
    this.buildTag();
    this.xPaint0 = this.nozzleX(T.paint0) - NOZ;
    this.xEnd = this.nozzleX(T.paint1) - NOZ;
    this.xAdm = this.xEnd - 62;
    this.xHop = this.rideX(T.hop);
    this.boardRoll = { v: 330, a: (330 * 330) / (2 * (BOARD_X - this.xHop)) };
  }

  buildTag() {
    const text = [...TAG_TEXT];
    const gap = 4;
    const letters = assets().letters;
    const total = letters.reduce((a, l) => a + l.adv, 0) + gap * (letters.length - 1);
    let x = TAG_CX - total / 2;
    this.letters = letters.map((l) => {
      const out = { ...l, x };
      x += l.adv + gap;
      return out;
    });
    this.dur = (T.paint1 - T.paint0) / letters.length;
    this.drips = [];
    this.letters.forEach((l, i) => {
      l.t0 = T.paint0 + i * this.dur;
      for (let k = 0; k < 2; k++) this.drips.push({ l, ox: rand(0.18, 0.82) * l.adv, max: rand(18, 50), spd: rand(14, 26), wait: rand(0.1, 0.7) });
    });
  }

  // ---------------------------------------------------------- posições em função do tempo
  nozzleX(t) {
    const n = this.letters.length;
    const u = ((clamp(t, T.paint0, T.paint1) - T.paint0) / (T.paint1 - T.paint0)) * n;
    const i = Math.min(n - 1, Math.floor(u));
    const l = this.letters[i];
    return l.x + (u - i) * l.adv;
  }
  rideX(t) {
    // chega de skate (rápido), freia um pouco e pula do skate em T.hop
    const x0 = -300;
    const tt = t - T.in0;
    if (t < 0.9) return x0 + 520 * tt;
    const k = Math.min(t, T.hop) - 0.9;
    return x0 + 520 * (0.9 - T.in0) + 520 * k - (190 / 0.3) * 0.5 * k * k;
  }
  heroXAt(t) {
    if (t < T.hop) return this.rideX(t);
    if (t < T.shake0) return lerp(this.xHop, this.xPaint0, easeOut((t - T.hop) / (T.shake0 - T.hop)));
    if (t < T.paint0) return this.xPaint0;
    if (t < T.paint1) return this.nozzleX(t) - NOZ;
    if (t < T.admire1) return lerp(this.xEnd, this.xAdm, smooth((t - 6.12) / 0.62));
    if (t < T.flee) return this.xAdm;
    if (t < T.hop2) return lerp(this.xAdm, BOARD_X, clamp((t - T.flee) / (T.hop2 - T.flee)));
    if (t < T.land2) return BOARD_X;
    const tau = t - T.land2;
    return BOARD_X + 90 * tau + 330 * tau * tau;
  }
  boardAt(t) {
    // posição do skate "solto": rolando depois do pulo, parado no chão até o pichador pular nele
    if (t < T.hop) return null;
    const tau = t - T.hop;
    const { v, a } = this.boardRoll;
    const tStop = v / a;
    const k = Math.min(tau, tStop);
    return { x: this.xHop + v * k - 0.5 * a * k * k, vx: Math.max(0, v - a * tau), ang: 0.05 * Math.sin(tau * 9) * Math.exp(-tau * 0.9) };
  }
  carXAt(t, stop = CAR_STOP, delay = 0) {
    if (t < T.car0 + delay) return -420;
    if (t < T.chase + 0.35) return lerp(-420, stop, easeOut((t - T.car0 - delay) / (T.car1 - T.car0)));
    const tau = t - (T.chase + 0.35);
    return stop + 60 * tau + 313 * tau * tau;
  }
  copXAt(c, t) {
    const x0 = c.who === "A" ? CAR_STOP + 36 : CAR_STOP - 44;
    if (t < T.chase) return x0;
    const tau = t - T.chase - (c.who === "A" ? 0 : 0.12);
    if (tau <= 0) return x0;
    return c.who === "A" ? x0 + 280 * tau + 110 * tau * tau : x0 + 270 * tau + 100 * tau * tau;
  }
  heliPos(t) {
    const hover = 380;
    let x = -300;
    if (t >= T.heli0) x = lerp(-300, hover, easeOut((t - T.heli0) / 1.6));
    if (t > T.hop2) {
      const tau = t - T.hop2;
      x = hover + 130 * tau + 400 * tau * tau;
    } else x += Math.sin(t * 1.4) * 12;
    return [x, 96 + Math.sin(t * 2.3) * 6];
  }
  /** para onde o holofote aponta: varre a tag e trava no pichador */
  beamTarget(t) {
    const hx = this.hero.x;
    const k = smooth((t - 8.0) / 0.45);
    return [lerp(this.xEnd - 340 + Math.sin(t * 5) * 20, hx, k), GY];
  }

  // ---------------------------------------------------------- partículas
  puff(x, y, n, c = "#d8d4e8", spread = 40, size = 6) {
    for (let i = 0; i < n; i++)
      this.parts.push({ k: "puff", x: x + rand(-8, 8), y: y + rand(-3, 3), vx: rand(-spread, spread), vy: rand(-45, -6), life: rand(0.35, 0.7), max: 0.7, c, s: rand(size * 0.6, size) });
  }
  mist(x, y, scheme, n = 2) {
    const cols = [scheme.mid, scheme.bot, scheme.top];
    for (let i = 0; i < n; i++)
      this.parts.push({ k: "sq", x: x + rand(-4, 4), y: y + rand(-4, 4), vx: rand(10, 100), vy: rand(-55, 30), life: rand(0.25, 0.55), max: 0.55, c: cols[Math.floor(rand(0, 3))], s: rand(2, 5), g: 90 });
    this.parts.push({ k: "puff", x: x + rand(-3, 3), y: y + rand(-3, 3), vx: rand(5, 40), vy: rand(-20, 10), life: 0.45, max: 0.45, c: scheme.mid, s: rand(8, 14), a: 0.22 });
  }
  twinkle(x, y) {
    this.parts.push({ k: "star", x, y, vx: 0, vy: 0, life: 0.55, max: 0.55, s: rand(7, 14), c: Math.random() < 0.5 ? "#ffffff" : "#ffe9a8" });
  }

  // ---------------------------------------------------------- lógica a cada quadro
  update(dtMs) {
    if (!this.paused) this.step(Math.min(dtMs / 1000, 0.05));
    return true;
  }

  seek(to) {
    this.paused = true;
    while (this.t < to) this.step(1 / 60);
  }

  step(d) {
    this.t += d;
    const t = this.t;
    this.cues(t);

    // pichador
    const h = this.hero;
    const hx = this.heroXAt(t);
    if (h.px !== null && d > 0) {
      h.ph += (hx - h.px) * 0.085;
      h.walk = clamp(Math.abs(hx - h.px) / d / 170);
    }
    h.px = hx;
    h.x = hx;
    // policiais
    for (const c of this.cops) {
      const cx = this.copXAt(c, t);
      if (c.px !== null && d > 0) {
        c.ph += (cx - c.px) * 0.075;
        c.walk = clamp(Math.abs(cx - c.px) / d / 160);
      }
      c.px = cx;
      c.x = cx;
    }

    this.updateCamera(t, d);
    this.emit(t, d);

    // partículas
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= d;
      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }
      p.x += p.vx * d;
      p.y += p.vy * d;
      if (p.g) p.vy += p.g * d;
      else if (p.k === "puff") p.vy -= 12 * d;
    }
    // lata caindo
    if (this.can) {
      const c = this.can;
      c.vy += 1500 * d;
      c.y += c.vy * d;
      c.x += c.vx * d;
      c.rot += 9 * d;
      if (c.y > GY - 6) {
        c.y = GY - 6;
        c.vy = -c.vy * 0.35;
        c.vx *= 0.5;
        if (Math.abs(c.vy) < 50) c.vy = 0;
      }
    }
    this.shake = Math.max(0, this.shake - d * 3);
    this.flash = Math.max(0, this.flash - d * 5);
  }

  /** efeitos sonoros e golpes de câmera nos momentos certos */
  cues(t) {
    const f = this.flags;
    const once = (name, at, fn) => {
      if (!f[name] && t >= at) {
        f[name] = true;
        fn();
      }
    };
    once("roll", T.in0, () => sfx("roll", 0.55));
    once("hop", T.hop - 0.02, () => {
      sfx("ollie", 0.55);
      sfx("roll", 0.4);
    });
    once("hopLand", T.hop + 0.3, () => this.puff(this.hero.x, GY, 5));
    once("shake", T.shake0 + 0.1, () => sfx("shake", 0.85));
    once("shake2", T.shake0 + 0.7, () => sfx("shake", 0.7));
    this.letters.forEach((l, i) => once("sp" + i, l.t0, () => sfx("spray", 0.75)));
    once("shine", T.paint1 + 0.05, () => sfx("coin", 0.55));
    once("siren0", T.siren0, () => sfx("siren", 0.3));
    once("alert", T.alert, () => {
      sfx("alert", 0.9);
      this.flash = 0.5;
      this.shake = 0.7;
    });
    once("siren1", T.car0 - 0.1, () => sfx("siren", 0.75));
    once("chopper", T.heli0, () => sfx("chopper", 0.6));
    once("skid", T.car1 - 0.42, () => {
      sfx("skid", 0.9);
      this.shake = 1;
    });
    once("doors", T.door, () => {
      sfx("door", 0.9);
      this.shake = 0.5;
    });
    once("door2", T.door + 0.11, () => sfx("door", 0.7));
    once("whistle", T.door + 0.15, () => sfx("whistle", 0.7));
    once("drop", T.flee, () => {
      const h = this.hero;
      this.can = { x: h.x + 36, y: GY - 120, vx: 30, vy: -80, rot: 0 };
      sfx("land", 0.35);
    });
    once("hop2", T.hop2, () => sfx("ollie", 0.9));
    once("land2", T.land2, () => {
      sfx("land", 0.7);
      sfx("roll", 0.7);
      this.shake = Math.max(this.shake, 0.7);
      this.puff(BOARD_X, GY, 8);
    });
  }

  emit(t, d) {
    const h = this.hero;
    // poeira da chegada de skate / frenagem
    if (t > T.in0 && t < T.hop && Math.random() < d * (t > 0.9 ? 40 : 14)) this.puff(h.x - 34, GY, 1, "#cfcbe0", 26, t > 0.9 ? 9 : 5);
    // skate rolando solta faísquinhas de poeira
    const b = this.boardAt(t);
    if (b && b.vx > 60 && Math.random() < d * 12) this.puff(b.x - 30, GY, 1, "#cfcbe0", 16, 4);
    // spray enquanto pinta
    if (t >= T.paint0 && t < T.paint1 && h.nozzle) {
      const i = Math.min(this.letters.length - 1, Math.floor((t - T.paint0) / this.dur));
      const l = this.letters[i];
      this.mist(h.nozzle[0], h.nozzle[1], l.scheme, 2);
      this.mist(this.nozzleX(t), rand(TAG_BASE - 0.85 * TAG_SIZE, TAG_BASE - 4), l.scheme, 1);
    }
    // brilhos na tag pronta
    if (t > T.paint1 + 0.1 && t < T.admire1 && Math.random() < d * 14) {
      const l = this.letters[Math.floor(rand(0, this.letters.length))];
      this.twinkle(l.x + rand(0.1, 0.9) * l.adv, TAG_BASE - rand(0.1, 0.85) * TAG_SIZE);
    }
    // fumaça da freada da viatura
    if (t > T.car1 - 0.5 && t < T.car1 + 0.3 && Math.random() < d * 40) this.puff(this.carXAt(t) - 70, ROAD_Y - 6, 1, "#b7b3cf", 50, 13);
    // poeira da corrida
    if (t > T.flee && t < T.hop2 && Math.random() < d * 24) this.puff(h.x, GY, 1);
    if (t > T.land2 && t < T.land2 + 1.1 && Math.random() < d * 40) this.puff(h.x - 34, GY, 1, "#d8d0c0", 24);
    for (const c of this.cops) if (t > T.chase && t < T.chase + 1.6 && c.walk > 0.3 && Math.random() < d * 18) this.puff(c.x, GY, 1);
  }

  updateCamera(t, d) {
    const h = this.hero;
    const cam = this.cam;
    let tx;
    let ty = 288;
    let tz = 1;
    let rate = 5;
    if (t < T.hop + 0.15) {
      // travelling: acompanha o pichador chegando
      tx = Math.max(330, h.x + 190);
      tz = 1.0;
      rate = 6;
    } else if (t < T.paint0) {
      tx = 500;
      ty = 292;
      tz = 1.08;
      rate = 3;
    } else if (t < T.paint1) {
      // vai se aproximando da parede enquanto ele pinta
      const k = smooth((t - T.paint0) / (T.paint1 - T.paint0));
      tx = lerp(500, this.nozzleX(t) * 0.55 + 520 * 0.45 + 30, 0.9);
      ty = 300;
      tz = lerp(1.08, 1.3, k);
      rate = 4;
    } else if (t < T.alert) {
      tx = 520;
      ty = 290;
      tz = lerp(1.3, 1.02, smooth((t - T.paint1) / 0.9));
      rate = 2.6;
    } else if (t < T.alert + 0.3) {
      // susto: a câmera "bate" no rosto do pichador
      tx = h.x + 50;
      ty = h.y - 100;
      tz = 1.5;
      rate = 16;
    } else if (t < T.flee) {
      // plano aberto: dá para ver a viatura, o helicóptero e o pichador
      tx = 440;
      ty = 290;
      tz = 0.95;
      rate = 6;
    } else {
      // perseguição: câmera corre atrás dele
      tx = Math.max(440, h.x + (t > T.land2 ? 60 : -90));
      ty = 292;
      tz = t > T.land2 ? 0.92 : 0.97;
      rate = t > T.land2 ? 6 : 7;
    }
    const k = 1 - Math.exp(-rate * d);
    cam.cx += (tx - cam.cx) * k;
    cam.cy += (ty - cam.cy) * k;
    cam.z += (tz - cam.z) * k;
    cam.cx = clamp(cam.cx, WX0 + W / 2 / cam.z + 4, WX1 - W / 2 / cam.z - 4);
  }

  // ---------------------------------------------------------- desenho
  /** aplica a câmera à camada com fator de paralaxe f (1 = o set; menor = mais longe) */
  layer(r, f, fn) {
    const c = this.cam;
    const zl = 1 + (c.z - 1) * f;
    const lcx = c.cx * f + (W / 2) * (1 - f);
    const lcy = c.cy * f + (H / 2) * (1 - f);
    const sh = this.shake * (f >= 1 ? 1 : f);
    r.save();
    r.translate(W / 2 + rand(-1, 1) * 6 * sh, H / 2 + rand(-1, 1) * 5 * sh);
    r.scale(zl, zl);
    r.translate(-lcx, -lcy);
    fn();
    r.restore();
  }

  draw(r) {
    const t = this.t;
    r.drawImage(this.sky, 0, 0);
    this.layer(r, 0.4, () => r.drawImage(this.far, -300, 0));
    this.layer(r, 0.7, () => r.drawImage(this.near, -300, -8));
    this.layer(r, 1, () => this.drawSet(r, t));
    this.drawFront(r, t);
    this.drawOverlays(r, t);
  }

  drawSet(r, t) {
    for (const [x, cv] of this.chunks) r.drawImage(cv, x, 0);
    this.drawLightning(r, t);
    // faixa da luz do holofote e das lanternas ficam atrás dos personagens
    const heli = this.heliPos(t);
    if (t > T.heli0) {
      const a = clamp((t - 7.75) / 0.5);
      const [bx, by] = this.beamTarget(t);
      if (a > 0) drawBeam(r, heli[0] + 22, heli[1] + 24, bx, by + 6, 96, a);
    }
    this.drawTag(r, t);
    this.drawBoardLoose(r, t);
    this.drawCops(r, t, true);
    this.drawHero(r, t);
    this.drawCarAndHeli(r, t, heli);
    this.drawCops(r, t, false);
    this.drawParts(r);
  }

  /** luz vermelha/azul batendo no muro e refletida no chão molhado */
  drawLightning(r, t) {
    const inten = clamp((t - T.siren0) / 0.9) * (1 - clamp((t - (T.end - 0.5)) / 0.5));
    if (inten <= 0) return;
    const lit = Math.floor(t * 5.5) % 2 === 0;
    const x = this.carXAt(t);
    const cx = Math.max(x, -100) + 40;
    r.setGlobalAlpha(inten);
    r.drawImage(this.wash[lit ? 0 : 1], cx - 500, WALL_TOP);
    // reflexo no asfalto molhado
    r.setColor(lit ? "#ff1f3d" : "#1f55ff");
    r.setGlobalAlpha(0.26 * inten);
    r.fillEllipse(cx + 20, 497, 150, 10);
    r.setColor(lit ? "#1f55ff" : "#ff1f3d");
    r.setGlobalAlpha(0.2 * inten);
    r.fillEllipse(cx - 50, 506, 110, 8);
    r.setGlobalAlpha(1);
  }

  drawTag(r, t) {
    for (const l of this.letters) {
      const k = clamp((t - l.t0) / this.dur);
      if (k <= 0) continue;
      const dx = l.x - l.pad;
      const dy = TAG_BASE - l.cbase;
      if (k >= 1) {
        r.drawImage(l.cv, dx, dy); // pronta: um único desenho (barato)
        continue;
      }
      const n = l.strips.length;
      const m = Math.min(n, Math.floor(k * n));
      for (let i = 0; i < m; i++) r.drawImage(l.strips[i], dx + i * l.sw, dy);
      if (m < n) {
        r.setGlobalAlpha(k * n - m);
        r.drawImage(l.strips[m], dx + m * l.sw, dy);
        r.setGlobalAlpha(1);
      }
    }
    // tinta escorrendo
    for (const dp of this.drips) {
      const k = (t - dp.l.t0 - this.dur - dp.wait) * dp.spd;
      if (k <= 0) continue;
      const len = Math.min(dp.max, k);
      const x = dp.l.x + dp.ox;
      const y0 = TAG_BASE - 6;
      r.setColor(dp.l.scheme.bot);
      r.fillRect(x - 2.5, y0, 5, len);
      r.fillArc(x, y0 + len, 3.6, 0, Math.PI * 2);
    }
    // brilho que varre as letras quando a tag fica pronta
    this.letters.forEach((l, i) => {
      const k = (t - (T.paint1 + 0.1 + i * 0.1)) / 0.38;
      if (k <= 0 || k >= 1) return;
      r.setGlobalAlpha(0.7 * Math.sin(Math.PI * k));
      r.drawImage(l.white, l.x - l.pad, TAG_BASE - l.cbase);
      r.setGlobalAlpha(1);
    });
  }

  drawBoardLoose(r, t) {
    const b = this.boardAt(t);
    let x;
    let ang = 0;
    if (b && t < T.hop2) {
      x = b.x;
      ang = b.ang;
    } else if (b && t < T.land2) x = BOARD_X;
    else if (t < T.hop) return;
    else return;
    r.setColor("#000000");
    r.setGlobalAlpha(0.28);
    r.fillEllipse(x, GY + 3, 38, 6);
    r.setGlobalAlpha(1);
    r.save();
    r.translate(x, GY);
    r.scale(HS, HS);
    drawBoard(r, 0, -9, ang);
    r.restore();
  }

  drawHero(r, t) {
    const hp = this.hero;
    const x = hp.x;
    let y = GY;
    const ph = hp.ph;
    const walk = hp.walk;
    const o = { scale: HS, face: 1, pal: HERO };
    const canColor = SCHEMES[0].mid;
    const feet = (amp = 1) => ({
      footF: [10 + Math.sin(ph) * 9 * walk * amp, -Math.max(0, Math.cos(ph)) * 6 * walk * amp],
      footR: [-8 - Math.sin(ph) * 9 * walk * amp, -Math.max(0, -Math.cos(ph)) * 6 * walk * amp],
    });
    const runFeet = () => ({
      footF: [Math.sin(ph) * 16 + 4, -Math.max(0, Math.cos(ph)) * 12],
      footR: [-Math.sin(ph) * 16 - 4, -Math.max(0, -Math.cos(ph)) * 12],
    });
    let onBoard = false;

    if (t < T.hop) {
      // chegando de skate: dois impulsos, depois desliza e freia com a ponta do skate levantando
      const pushing = (t > 0.3 && t < 0.52) || (t > 0.62 && t < 0.84);
      const brake = smooth((t - 0.9) / 0.3);
      Object.assign(o, {
        lean: 0.12 - 0.2 * brake, hipY: -37 + Math.sin(t * 15) * 1.1, armF: [18 + 6 * brake, 8 - 10 * brake], armR: [-15 - 6 * brake, 10 - 12 * brake],
        footF: [15, -13], footR: pushing ? [-24 + 10 * Math.sin(((t - 0.3) / 0.22) * Math.PI), 0] : [-15, -13],
        board: { y: -9, ang: -0.16 * brake }, mood: "smile",
      });
      onBoard = true;
    } else if (t < T.hop + 0.3) {
      // salta do skate (ele segue rolando sozinho)
      const k = (t - T.hop) / 0.3;
      y = GY - 26 * Math.sin(Math.PI * k);
      Object.assign(o, { lean: 0.2, armF: [18, -8], armR: [-16, -6], footF: [16, -15], footR: [-6, -11], hipY: -35 });
    } else if (t < T.shake0) {
      Object.assign(o, { lean: 0.22 - 0.16 * smooth((t - T.hop - 0.3) / 0.3), armF: [10 + Math.sin(ph + Math.PI) * 10, 14], armR: [-8 + Math.sin(ph) * 10, 14], ...runFeet() });
      o.hipY = -37 + Math.abs(Math.sin(ph)) * 2;
    } else if (t < T.paint0) {
      // pega a lata, olha para os lados (sem ninguém por perto) e sacode
      const k = (t - T.shake0) / (T.paint0 - T.shake0);
      const look = k < 0.35 ? -1 : k < 0.7 ? 1 : 1;
      const shaking = k < 0.85;
      Object.assign(o, {
        lean: 0.05, look, armF: [14, -4 + (shaking ? 8 * Math.sin(t * 38) : 0)], armR: [-8, 18], can: canColor, ...feet(), mood: k > 0.7 ? "smile" : undefined,
      });
    } else if (t < T.paint1) {
      // pichando: braço erguido, a lata varre a parede; leve balanço do corpo
      const u = (t - T.paint0) / this.dur;
      const th = -0.95 + 0.34 * Math.sin((t - T.paint0) * 11) - 0.05 * Math.sin(u * 3);
      Object.assign(o, { lean: 0.11 + 0.03 * Math.sin(t * 6), armF: [22 * Math.cos(th), 22 * Math.sin(th)], armR: [-9, 20], can: canColor, ...feet() });
    } else if (t < T.admire1) {
      // para, abaixa a lata, anda para trás e admira a obra de mãos na cintura
      const lower = smooth((t - T.paint1) / 0.25);
      const hands = smooth((t - 6.55) / 0.3);
      const th = -0.95;
      Object.assign(o, {
        lean: lerp(0.12, -0.03, smooth((t - 6.1) / 0.5)),
        armF: [lerp(lerp(22 * Math.cos(th), 6, lower), 13, hands), lerp(lerp(22 * Math.sin(th), 22, lower), 14, hands)],
        armR: [lerp(-9, -13, hands), lerp(20, 15, hands)], can: canColor, look: 1, mood: "smile", ...feet(1.2),
      });
    } else if (t < T.flee) {
      // ouviu a sirene: congela, olha para trás de boca aberta, tremendo
      const k = clamp((t - T.alert) / 0.3);
      const doors = t > T.door;
      Object.assign(o, {
        lean: lerp(0, -0.11, k), look: -1, shock: t > T.alert, armF: [14, doors ? -6 : 4], armR: [-12, doors ? -2 : 6],
        hipX: Math.sin(t * 50) * 0.7 * k, can: this.can ? null : canColor, footF: [8, 0], footR: [-10, 0], sweat: t * 1.7,
      });
      if (!(t > T.alert)) Object.assign(o, { lean: 0, look: 1, shock: false });
    } else if (t < T.hop2) {
      // larga a lata e dispara até o skate
      Object.assign(o, { lean: 0.3, armF: [10 + Math.sin(ph + Math.PI) * 14, 14 - Math.max(0, Math.cos(ph)) * 8], armR: [-8 + Math.sin(ph) * 14, 14], ...runFeet(), hipY: -36 + Math.abs(Math.sin(ph)) * 3 });
    } else if (t < T.land2) {
      // salta em cima do skate
      const k = (t - T.hop2) / (T.land2 - T.hop2);
      y = GY - 44 * Math.sin(Math.PI * k);
      Object.assign(o, { lean: 0.16, armF: [18, -4], armR: [-16, -2], footF: [16, -15], footR: [-6, -12], hipY: -34 });
    } else {
      // foge de skate, abaixado e acelerando (com um impulso no começo)
      const tau = t - T.land2;
      const push = tau < 0.3;
      Object.assign(o, {
        lean: 0.2, hipY: -34 + Math.sin(t * 16), armF: [20, 12], armR: [-16, 14], footF: [15, -13], footR: push ? [-24, 0] : [-15, -13],
        board: { y: -9, ang: -0.04 }, shock: true, look: 1, sweat: t * 2,
      });
      onBoard = true;
    }

    // sombra no chão
    r.setColor("#000000");
    r.setGlobalAlpha(0.32);
    r.fillEllipse(x + (onBoard ? 0 : 6), GY + 3, onBoard ? 44 : 34, 6);
    r.setGlobalAlpha(1);
    // skate parado esperando (até ele pular nele)
    const info = drawPerson(r, x, y, o);
    if (t >= T.paint0 && t < T.paint1) hp.nozzle = [x + info.tip[0] * HS, y + info.tip[1] * HS];
    hp.top = y - 90 * HS;
    // lata caída
    if (this.can) {
      const c = this.can;
      r.save();
      r.translate(c.x, c.y);
      r.rotate(c.rot);
      r.setColor("#10101c");
      r.fillRect(-6, -10, 12, 20);
      r.setColor("#c3c8d8");
      r.fillRect(-4, -8, 8, 16);
      r.setColor(canColor);
      r.fillRect(-4, -3, 8, 6);
      r.restore();
    }
  }

  drawCops(r, t, behind) {
    if (t < T.door) return;
    // policiais atrás da viatura: aparecem agachados e levantam; "behind" = desenhados antes da viatura
    if (!behind) return;
    this.cops.forEach((c) => {
      const rise = easeOut((t - T.door) / 0.4);
      const chasing = t > T.chase + (c.who === "A" ? 0 : 0.12);
      const hero = this.hero;
      const o = { pal: c.pal, scale: c.who === "A" ? CS : CS * 0.97, face: 1 };
      if (chasing) {
        Object.assign(o, {
          lean: 0.28, armF: [10 + Math.sin(c.ph + Math.PI) * 14, 14], armR: [-8 + Math.sin(c.ph) * 14, 14], prop: c.who === "A" ? "baton" : "light",
          footF: [Math.sin(c.ph) * 17 + 4, -Math.max(0, Math.cos(c.ph)) * 12], footR: [-Math.sin(c.ph) * 17 - 4, -Math.max(0, -Math.cos(c.ph)) * 12],
          hipY: -37 + Math.abs(Math.sin(c.ph)) * 3, propAng: 0.4,
        });
      } else if (c.who === "A") {
        // apita com a mão na boca e aponta
        const whistling = t < T.flee - 0.15;
        Object.assign(o, {
          hipY: lerp(-24, -38, rise), lean: -0.03, shock: true, armF: whistling ? [9, -11] : [26, -10], armR: [-6, 20], prop: whistling ? "whistle" : "baton",
          propAng: -0.05, footF: [12, 0], footR: [-8, 0],
        });
      } else {
        // lanterna apontada para o pichador
        const dx = hero.x - c.x;
        const ang = Math.atan2(-30, Math.max(60, dx));
        Object.assign(o, {
          hipY: lerp(-24, -38, rise), lean: 0.02, shock: true, armF: [24 * Math.cos(ang), 24 * Math.sin(ang)], armR: [-6, 20], prop: "light", propAng: ang, footF: [12, 0], footR: [-8, 0],
        });
      }
      r.setColor("#000000");
      r.setGlobalAlpha(0.3);
      r.fillEllipse(c.x, GY + 3, 32, 6);
      r.setGlobalAlpha(1);
      const info = drawPerson(r, c.x, GY, o);
      c.tip = [c.x + info.tip[0] * o.scale, GY + info.tip[1] * o.scale];
      // facho da lanterna do policial B
      if (c.who === "B" && !chasing && t < T.flee + 0.2) {
        const a = clamp((t - T.door - 0.1) / 0.3);
        drawBeam(r, c.tip[0], c.tip[1], hero.x + 6, GY - 16, 52, a * 0.7);
      }
      // ondas do apito
      if (c.who === "A" && !chasing && t < T.flee - 0.15) {
        for (let k = 0; k < 3; k++) {
          const q = ((t * 3 + k / 3) % 1);
          r.setColor("#fff3a3");
          r.setGlobalAlpha(0.7 * (1 - q));
          r.fillArc(c.tip[0] + 8, c.tip[1] - 6, 6 + q * 22, 0, Math.PI * 2);
        }
        r.setGlobalAlpha(1);
      }
    });
  }

  drawCarAndHeli(r, t, heli) {
    if (t >= T.car0 - 0.05) {
      const x = this.carXAt(t);
      const tau = t - (T.car1 - 0.42);
      const tilt = tau > 0 && t < T.chase + 0.3 ? 0.05 * Math.exp(-tau * 4.5) * Math.cos(tau * 15) : 0;
      const doors = easeOut((t - T.door) / 0.25);
      drawCar(r, x, ROAD_Y, { t, tilt, wheel: x / 14, lights: true, doors: t < T.chase + 0.3 ? doors : doors * (1 - easeOut((t - T.chase - 0.3) / 0.25)) });
    }
    if (t >= T.heli0 - 0.2) drawHeli(r, heli[0], heli[1], t);
  }

  drawParts(r) {
    for (const p of this.parts) {
      const a = clamp(p.life / p.max);
      if (p.k === "star") {
        drawSparkle(r, p.x, p.y, p.s * (0.5 + 0.5 * Math.sin(a * Math.PI)), Math.sin(a * Math.PI), p.c);
        continue;
      }
      r.setColor(p.c);
      if (p.k === "puff") {
        r.setGlobalAlpha((p.a ?? 0.4) * a);
        r.fillArc(p.x, p.y, p.s * (2 - a), 0, Math.PI * 2);
      } else {
        r.setGlobalAlpha(0.9 * a);
        r.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
      }
    }
    r.setGlobalAlpha(1);
  }

  /** primeiro plano com paralaxe forte: poste escuro passando na frente da câmera */
  drawFront(r, t) {
    this.layer(r, 1.28, () => {
      r.setColor("#06050f");
      r.fillRect(-30, -40, 15, 600);
      r.fillRect(-36, 96, 28, 10);
      r.fillRect(1010, -40, 17, 600);
      r.fillRect(1004, 80, 30, 10);
      r.fillRect(1500, -40, 16, 600);
      r.fillRect(1494, 90, 28, 10);
      r.fillRect(2150, -40, 18, 600);
      r.fillRect(2144, 84, 30, 10);
    });
  }

  drawOverlays(r, t) {
    // marcador de susto ("!") sobre a cabeça do pichador
    const hp = this.hero;
    if (t >= T.alert && t < T.flee + 0.2) this.drawBang(r, t, hp);
    // luzes da sirene "varrendo" a tela
    const inten = clamp((t - T.siren0) / 0.9) * (1 - clamp((t - (T.end - 0.5)) / 0.5));
    if (inten > 0) {
      r.setGlobalAlpha(inten);
      r.drawImage(this.sweep[Math.floor(t * 5.5) % 2 === 0 ? 0 : 1], 0, 0);
      r.setGlobalAlpha(1);
    }
    r.drawImage(this.vig, 0, 0);
    const out = clamp((t - (T.end - 0.4)) / 0.4);
    if (out > 0) {
      r.setColor("#05050a");
      r.setGlobalAlpha(out);
      r.fillRect(0, 0, W, H);
      r.setGlobalAlpha(1);
    }
    if (this.flash > 0) {
      r.setColor("#ffffff");
      r.setGlobalAlpha(this.flash * 0.55);
      r.fillRect(0, 0, W, H);
      r.setGlobalAlpha(1);
    }
    // tarjas de cinema
    r.setColor("#05050a");
    r.fillRect(0, 0, W, BAR_T);
    r.fillRect(0, H - BAR_B, W, BAR_B);
    r.setColor("#ffd23f");
    r.setGlobalAlpha(0.5);
    r.fillRect(0, BAR_T, W, 2);
    r.fillRect(0, H - BAR_B - 2, W, 2);
    r.setGlobalAlpha(1);
  }

  /** o "!" é desenhado com formas (sem texto): balão amarelo com exclamação e riscos de susto */
  drawBang(r, t, hp) {
    const c = this.cam;
    // posição da cabeça em tela
    const wx = hp.x + 8;
    const wy = hp.top - 34;
    const sx = W / 2 + (wx - c.cx) * c.z;
    const sy = H / 2 + (wy - c.cy) * c.z;
    const k = clamp((t - T.alert) / 0.22);
    const s = (k < 1 ? 0.2 + 1.5 * Math.sin(k * Math.PI * 0.5) : 1 + 0.07 * Math.sin(t * 22)) * c.z;
    r.save();
    r.translate(sx, sy);
    r.scale(s, s);
    r.setColor("#10101c");
    r.fillArc(0, 0, 30, 0, Math.PI * 2);
    r.setColor("#ffd23f");
    r.fillArc(0, 0, 25, 0, Math.PI * 2);
    r.setColor("#10101c");
    r.fillRoundRect(-5.5, -17, 11, 22, 4);
    r.fillArc(0, 14, 5.5, 0, Math.PI * 2);
    r.restore();
    // riscos de susto em volta da cabeça
    r.setColor("#ffffff");
    r.setGlobalAlpha(clamp(1 - (t - T.alert) / 0.9));
    for (let i = 0; i < 5; i++) {
      const a = -Math.PI * (0.15 + i * 0.18);
      const hx = W / 2 + (hp.x + 8 - c.cx) * c.z;
      const hy = H / 2 + (hp.top + 40 - c.cy) * c.z;
      const r0 = 46 * c.z;
      const r1 = (58 + 8 * Math.sin(t * 30 + i)) * c.z;
      r.save();
      r.translate(hx + Math.cos(a) * r0, hy + Math.sin(a) * r0);
      r.rotate(a);
      r.fillRect(0, -1.5, r1 - r0, 3);
      r.restore();
    }
    r.setGlobalAlpha(1);
  }
}

const TAG_TEXT = "SPRAY";

export class CutsceneScreen extends me.Stage {
  onResetEvent() {
    const w = me.game.world;
    w.backgroundColor.parseCSS("#05050a");
    stopMusic();
    this.leaving = false;
    this.view = new CutsceneView(this);
    w.addChild(this.view, 1);
    if (new URLSearchParams(window.location.search).has("debug")) window.__cut = this.view;

    const hint = new Label("ESPAÇO  pular", { size: 16, color: "#9fb0ff", lineWidth: 0, align: "right" });
    hint.place(W - 24, BAR_T / 2 + 1);
    w.addChild(hint, 20);
    this.hint = hint;

    const driver = new me.Renderable(0, 0, 1, 1);
    driver.floating = true;
    driver.alwaysUpdate = true;
    driver.update = (dt) => {
      this.tick(dt);
      return true;
    };
    w.addChild(driver, 0);

    this.offKeys = onMenuKeys((a) => {
      if ((a === "ok" || a === "back") && this.view.t > 0.4) this.leave();
    });
    this.offPointer = onCanvasPointer(me.video.renderer.getCanvas(), W, H, () => {
      if (this.view.t > 0.4) this.leave();
    });
    me.game.viewport.fadeOut("#05050a", 500);
  }

  tick() {
    const t = this.view.t;
    this.hint.setOpacity(t < 0.8 ? 0 : 0.45 + 0.4 * Math.abs(Math.sin(t * 3)));
    if (t >= T.end) this.leave();
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    me.state.change(me.state.PLAY);
  }

  onDestroyEvent() {
    this.offKeys && this.offKeys();
    this.offPointer && this.offPointer();
  }
}
