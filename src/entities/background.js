import * as me from "melonjs";
import { W, H, GROUND_Y, DEMO } from "../config.js";
import { paletteAt, setRGB, mix } from "../game/palette.js";
import { City } from "./cities.js";

function rng(seed) {
  return function () {
    seed |= 0;
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function makeSkyline(seed, minW, maxW, minH, maxH, windows) {
  const rand = rng(seed);
  const list = [];
  let x = 0;
  while (x < 2200) {
    const w = Math.floor(minW + rand() * (maxW - minW));
    const h = Math.floor(minH + rand() * (maxH - minH));
    const b = { x, w, h, lit: [], cols: 0, rows: 0, neon: null, antenna: rand() < 0.25 };
    if (windows) {
      b.cols = Math.max(1, Math.floor((w - 14) / 16));
      b.rows = Math.max(1, Math.floor((h - 30) / 22));
      for (let i = 0; i < b.cols * b.rows; i++) b.lit.push(rand());
      if (rand() < 0.35) b.neon = [[255, 60, 160], [60, 220, 255], [255, 220, 60]][Math.floor(rand() * 3)];
    }
    list.push(b);
    x += w + Math.floor(rand() * 10);
  }
  return { list, period: x };
}

export class Background extends me.Renderable {
  /** @param level fase que define as paletas do cenário (DEMO = ciclo completo, para os menus) */
  constructor(level = DEMO) {
    super(0, 0, W, H);
    this.level = level;
    this.anchorPoint.set(0, 0);
    this.alwaysUpdate = true;
    this.scroll = 0;
    this.time = 0;
    this.pal = paletteAt(level, 0);
    // fases com cidade própria (Los Angeles, Miami, Nova York) usam camadas pré-renderizadas; o Arcade e os menus
    // continuam com o cenário original
    this.city = level.city ? new City(level.city, level.keys.length) : null;
    this.far = makeSkyline(11, 50, 120, 70, 210, false);
    this.near = makeSkyline(29, 90, 170, 130, 300, true);
    const r = rng(5);
    this.stars = Array.from({ length: 70 }, () => ({ x: r() * W, y: r() * 260, p: r() * 6.28, s: r() < 0.2 ? 3 : 2 }));
    this.clouds = Array.from({ length: 5 }, () => ({ x: r() * 1400, y: 50 + r() * 140, s: 0.7 + r() * 0.9 }));
    this.speed = 0;
  }

  /** @param dist distância percorrida em px (define a paleta/zona) */
  tick(dt, speed, dist) {
    this.time += dt;
    this.speed = speed;
    this.scroll += speed * dt;
    this.pal = paletteAt(this.level, dist);
  }

  update() {
    return true;
  }

  draw(r) {
    const p = this.pal;
    // ---- céu em faixas
    const bands = 28;
    const bh = Math.ceil((GROUND_Y + 10) / bands);
    for (let i = 0; i < bands; i++) {
      setRGB(r, mix(p.top, p.bottom, Math.pow(i / (bands - 1), 1.2)));
      r.fillRect(0, i * bh, W, bh + 1);
    }
    // ---- estrelas
    if (p.stars > 0.02) {
      for (const s of this.stars) {
        const tw = 0.55 + 0.45 * Math.sin(this.time * 2 + s.p);
        r.setColor("#ffffff");
        r.setGlobalAlpha(p.stars * tw);
        r.fillRect((s.x - this.scroll * 0.02 + W * 4) % W, s.y, s.s, s.s);
      }
      r.setGlobalAlpha(1);
    }
    // ---- sol e lua
    if (p.sunA > 0.02) this.disc(r, 700, p.sunY, 58, [255, 236, 170], [255, 160, 70], p.sunA);
    if (p.moonA > 0.02) this.disc(r, 250, p.moonY, 38, [240, 244, 255], [170, 190, 255], p.moonA);
    // ---- nuvens (dia)
    const dayK = 1 - p.stars;
    if (dayK > 0.05) {
      r.setColor("#ffffff");
      r.setGlobalAlpha(0.55 * dayK);
      for (const c of this.clouds) {
        const x = ((c.x - this.scroll * 0.05 - this.time * 6) % 1500 + 1500) % 1500 - 200;
        r.fillEllipse(x, c.y, 54 * c.s, 15 * c.s);
        r.fillEllipse(x + 32 * c.s, c.y - 10 * c.s, 36 * c.s, 15 * c.s);
        r.fillEllipse(x - 30 * c.s, c.y - 4 * c.s, 32 * c.s, 12 * c.s);
      }
      r.setGlobalAlpha(1);
    }
    if (this.city) {
      // ---- cidade da fase (3 camadas com parallax)
      this.city.draw(r, this.scroll, p);
      this.ground(r);
      this.city.ground(r, this.scroll, this.time, p);
      return;
    }
    // ---- prédios (parallax em 2 camadas)
    this.skyline(r, this.far, 0.1, p.far, false);
    this.skyline(r, this.near, 0.3, p.near, true);
    // ---- postes de luz
    this.lamps(r);
    // ---- chão
    this.ground(r);
  }

  disc(r, x, y, rad, c1, c2, a) {
    for (let i = 4; i >= 1; i--) {
      setRGB(r, c2, a * 0.1);
      r.fillArc(x, y, rad + i * 14, 0, Math.PI * 2);
    }
    setRGB(r, c2, a);
    r.fillArc(x, y, rad, 0, Math.PI * 2);
    setRGB(r, c1, a);
    r.fillArc(x - 3, y - 3, rad - 7, 0, Math.PI * 2);
  }

  skyline(r, layer, k, color, detailed) {
    const off = (this.scroll * k) % layer.period;
    const p = this.pal;
    for (let rep = 0; rep < 2; rep++) {
      const base = -off + rep * layer.period;
      for (const b of layer.list) {
        const x = Math.floor(base + b.x);
        if (x > W || x + b.w < 0) continue;
        const top = GROUND_Y - b.h + (detailed ? 0 : -8);
        setRGB(r, color);
        r.fillRect(x, top, b.w, b.h + 12);
        if (b.antenna) r.fillRect(x + b.w / 2 - 1, top - 22, 3, 22);
        // topo mais claro
        setRGB(r, color, 1, 1.18);
        r.fillRect(x, top, b.w, 4);
        if (!detailed) continue;
        // janelas apagadas (uma cor) e acesas
        setRGB(r, color, 1, 0.78);
        for (let c = 0; c < b.cols; c++)
          for (let rw = 0; rw < b.rows; rw++) r.fillRect(x + 8 + c * 16, top + 14 + rw * 22, 9, 12);
        if (p.lit > 0.02) {
          r.setColor("#ffd37a");
          for (let c = 0; c < b.cols; c++)
            for (let rw = 0; rw < b.rows; rw++) {
              if (b.lit[c * b.rows + rw] < p.lit * 0.75) r.fillRect(x + 8 + c * 16, top + 14 + rw * 22, 9, 12);
            }
          if (b.neon && p.lit > 0.5) {
            const flick = 0.75 + 0.25 * Math.sin(this.time * 7 + b.x);
            setRGB(r, b.neon, 0.25 * p.lit * flick);
            r.fillRect(x + 4, top + 28, b.w - 8, 22);
            setRGB(r, b.neon, p.lit * flick);
            r.fillRect(x + 10, top + 36, b.w - 20, 6);
          }
        }
      }
    }
  }

  lamps(r) {
    const p = this.pal;
    const period = 520;
    const off = (this.scroll * 0.62) % period;
    for (let i = -1; i < Math.ceil(W / period) + 2; i++) {
      const x = i * period - off + 140;
      setRGB(r, p.near, 1, 0.55);
      r.fillRect(x, GROUND_Y - 120, 5, 120);
      r.fillRect(x, GROUND_Y - 120, 26, 5);
      r.fillRect(x + 20, GROUND_Y - 120, 12, 8);
      if (p.lit > 0.05) {
        r.setColor("#ffe9a8");
        for (let k = 3; k >= 1; k--) {
          r.setGlobalAlpha(0.05 * p.lit);
          r.fillArc(x + 26, GROUND_Y - 108, 14 + k * 14, 0, Math.PI * 2);
        }
        r.setGlobalAlpha(0.9 * p.lit);
        r.fillRect(x + 21, GROUND_Y - 112, 10, 5);
        r.setGlobalAlpha(1);
      }
    }
  }

  ground(r) {
    const p = this.pal;
    // faixa de calçada (onde o skate anda)
    setRGB(r, p.ground, 1, 1.25);
    r.fillRect(0, GROUND_Y, W, 12);
    setRGB(r, p.ground, 1, 1.05);
    r.fillRect(0, GROUND_Y + 12, W, 34);
    // juntas da calçada = sensação de velocidade
    setRGB(r, p.ground, 1, 0.8);
    const seam = 96;
    const so = this.scroll % seam;
    for (let x = -so; x < W; x += seam) r.fillRect(x, GROUND_Y + 12, 3, 34);
    // meio-fio
    setRGB(r, p.line2, 1, 0.9);
    r.fillRect(0, GROUND_Y + 46, W, 5);
    // rua
    setRGB(r, p.ground, 1, 0.62);
    r.fillRect(0, GROUND_Y + 51, W, H - GROUND_Y - 51);
    // faixas da rua
    setRGB(r, p.line2, 0.85);
    const dash = 150;
    const d = this.scroll % dash;
    for (let x = -d; x < W; x += dash) r.fillRect(x, GROUND_Y + 80, 80, 7);
    // brilho do asfalto à noite
    if (p.lit > 0.05) {
      r.setColor("#6fe3ff");
      r.setGlobalAlpha(0.05 * p.lit);
      r.fillRect(0, GROUND_Y + 51, W, 10);
      r.setGlobalAlpha(1);
    }
  }
}
