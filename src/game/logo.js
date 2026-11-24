import * as me from "melonjs";
import { W } from "../config.js";

/**
 * Logo "SPRAY N' SKATE" em estilo grafite, desenhado em canvas 2D (uma imagem por letra, com
 * degradê, brilho, contorno e extrusão 3D) e animado em cima do jogo:
 *  - as letras caem com quique; as da 2ª linha caem quando o skate passa por baixo (kickflips)
 *  - tinta escorrendo, brilhos e respingos de spray; a cada ~10 s o skate passa de novo
 */
const FONT = '"Bungee", Impact, "Arial Black", sans-serif';
const rand = (a, b) => a + Math.random() * (b - a);
const SPRAY = ["#ff2e7e", "#ffd23f", "#4cc9f0", "#9b5de5", "#ffffff"];

export const WARM = { top: "#fff59d", mid: "#ffb300", bot: "#ff2e7e", side: "#7d1450", glow: "rgba(255,60,150,0.9)" };
export const SUN = { top: "#fffbd0", mid: "#ffd23f", bot: "#ff7a00", side: "#8a3b00", glow: "rgba(255,170,0,0.9)" };
export const COOL = { top: "#e8fcff", mid: "#4cc9f0", bot: "#7b2ff7", side: "#241170", glow: "rgba(90,130,255,0.9)" };

function easeOutBounce(x) {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x -= 1.5 / d1) * x + 0.75;
  if (x < 2.5 / d1) return n1 * (x -= 2.25 / d1) * x + 0.9375;
  return n1 * (x -= 2.625 / d1) * x + 0.984375;
}

/** desenha uma letra num canvas: extrusão, contorno escuro, face em degradê com brilho e granulado */
export function renderLetter(ch, size, c) {
  const probe = document.createElement("canvas").getContext("2d");
  probe.font = `${size}px ${FONT}`;
  const adv = probe.measureText(ch).width;
  const pad = Math.ceil(size * 0.3);
  const depth = Math.max(4, Math.round(size * 0.075));
  const w = Math.ceil(adv) + pad * 2 + depth;
  const h = Math.ceil(size * 1.05) + pad * 2 + depth;
  const base = pad + size * 0.9;
  const cv = document.createElement("canvas");
  cv.width = w;
  cv.height = h;
  const g = cv.getContext("2d");
  g.font = probe.font;
  g.textBaseline = "alphabetic";
  g.lineJoin = "round";
  g.lineCap = "round";
  const ol = size * 0.17;

  // 1) silhueta escura extrudada (brilho colorido na ponta)
  g.strokeStyle = "#12081f";
  g.lineWidth = ol;
  for (let k = depth; k >= 0; k--) {
    g.save();
    if (k === depth) {
      g.shadowColor = c.glow;
      g.shadowBlur = size * 0.24;
    }
    g.strokeText(ch, pad + k, base + k);
    g.restore();
  }
  // 2) lateral colorida (3D)
  g.fillStyle = c.side;
  for (let k = depth; k >= 1; k--) g.fillText(ch, pad + k, base + k);
  // 3) filete escuro separando a face da lateral
  g.lineWidth = size * 0.05;
  g.strokeText(ch, pad, base);
  // 4) face com degradê + brilho + granulado de spray (num canvas à parte para só pintar dentro da letra)
  const tmp = document.createElement("canvas");
  tmp.width = w;
  tmp.height = h;
  const t = tmp.getContext("2d");
  t.font = probe.font;
  t.textBaseline = "alphabetic";
  const grad = t.createLinearGradient(0, base - size * 0.8, 0, base);
  grad.addColorStop(0, c.top);
  grad.addColorStop(0.45, c.mid);
  grad.addColorStop(1, c.bot);
  t.fillStyle = grad;
  t.fillText(ch, pad, base);
  t.globalCompositeOperation = "source-atop";
  t.fillStyle = "rgba(255,255,255,0.42)";
  t.fillRect(0, base - size * 0.82, w, size * 0.17); // faixa de brilho no topo
  t.fillStyle = "rgba(255,255,255,0.16)";
  t.beginPath(); // reflexo diagonal
  t.moveTo(pad + adv * 0.18, base - size * 0.8);
  t.lineTo(pad + adv * 0.42, base - size * 0.8);
  t.lineTo(pad + adv * 0.2, base);
  t.lineTo(pad - adv * 0.04, base);
  t.fill();
  for (let i = 0; i < 70; i++) {
    t.fillStyle = Math.random() < 0.5 ? "rgba(255,255,255,0.13)" : "rgba(30,0,60,0.10)";
    t.beginPath();
    t.arc(pad + Math.random() * adv, base - Math.random() * size * 0.82, rand(0.7, 2.2), 0, Math.PI * 2);
    t.fill();
  }
  g.drawImage(tmp, 0, 0);
  return { cv, w, h, adv, pad, cbase: base, depth };
}

export class Logo extends me.Renderable {
  /** @param skipIntro  true = já começa montado (quando o jogador volta para o título) */
  constructor(skipIntro = false) {
    super(0, 0, W, 540);
    this.anchorPoint.set(0, 0);
    this.floating = true;
    this.alwaysUpdate = true;
    this.t = skipIntro ? 5 : 0;
    this.skip = skipIntro;
    this.parts = [];
    this.drips = [];
    this.sparks = [];
    this.board = null;
    this.nextPass = skipIntro ? 7 : 99; // a 1ª passada da introdução é fixa; depois vêm as periódicas
    this.passDir = 1;
    this.build();
  }

  build() {
    const probe = document.createElement("canvas").getContext("2d");
    probe.font = `100px ${FONT}`;
    const w100 = probe.measureText("N' SKATE").width;
    const size = Math.min(132, Math.round((100 * 700) / w100));
    this.size = size;
    const lines = [
      { text: "SPRAY", size: Math.round(size * 1.1), base: 150, colors: [WARM, WARM, WARM, WARM, WARM], row: 0 },
      { text: "N' SKATE", size, base: 150 + Math.round(size * 0.98), colors: [SUN, SUN, null, COOL, COOL, COOL, COOL, COOL], row: 1 },
    ];
    this.lineBase = lines[1].base;
    for (const L of lines) {
      const glyphs = [...L.text].map((ch, i) => (ch === " " ? null : { ch, ...renderLetter(ch, L.size, L.colors[i]), c: L.colors[i] }));
      probe.font = `${L.size}px ${FONT}`;
      const gap = L.size * 0.02;
      const space = L.size * 0.34;
      const total = glyphs.reduce((a, g) => a + (g ? g.adv : space) + gap, -gap);
      let x = W / 2 - total / 2;
      glyphs.forEach((g, i) => {
        if (!g) {
          x += space + gap;
          return;
        }
        const part = {
          ...g, x, base: L.base, row: L.row, i: this.parts.length,
          cx: x + g.adv / 2, b: 0, bumpAt: null, landed: false, delay: 0, rot0: rand(-0.02, 0.02),
        };
        this.parts.push(part);
        x += g.adv + gap;
      });
    }
    // atrasos: 1ª linha cai em sequência; a 2ª cai quando o skate passa por baixo
    const bStart = 0.9;
    const bDur = 2.7;
    this.intro = { bStart, bDur };
    this.parts.forEach((p) => {
      if (p.row === 0) p.delay = 0.2 + p.i * 0.11;
      else p.delay = bStart + (bDur * (p.cx + 110 - 90)) / (W + 220);
    });
    // gotas de tinta escorrendo (1ª linha, e algumas da 2ª)
    this.parts.forEach((p) => {
      if (p.row === 0 || p.i % 3 === 0) this.drips.push(this.newDrip(p, true));
    });
    for (let i = 0; i < 6; i++) this.sparks.push({ p: this.parts[(i * 2 + 1) % this.parts.length], u: rand(0, 1), ox: rand(-0.3, 0.3), oy: rand(0.2, 0.8), spd: rand(0.18, 0.3) });
    this.spray = [];
    if (this.skip) this.parts.forEach((p) => (p.landed = true));
  }

  newDrip(p, first) {
    return {
      p, ox: rand(-p.adv * 0.28, p.adv * 0.28), len: 0, max: rand(14, p.row === 0 ? 52 : 30),
      spd: rand(14, 26), wait: (first ? rand(1.6, 4.2) : rand(1.5, 4)) + (p.row === 0 ? 0 : 2.6), hold: rand(2.2, 4), w: rand(6, 9),
    };
  }

  /** onda de pulinhos nas letras (usada quando o skatista da tela pousa) */
  ripple(strength = 0.6) {
    this.parts.forEach((p) => {
      p.bumpAt = this.t + p.i * 0.04;
      p.bumpS = strength;
    });
  }

  startPass(dir = 1) {
    this.board = { u: 0, dir, dur: 2.6, flip: [0, 0], last: 0 };
    this.passDir = -dir;
  }

  burst(x, y, n, colors = SPRAY, spd = 220) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, Math.PI * 2);
      const s = rand(0.3, 1) * spd;
      this.spray.push({ x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s - 60, life: rand(0.45, 0.9), max: 0.9, c: colors[(Math.random() * colors.length) | 0], r: rand(1.6, 3.6) });
    }
  }

  /** o skate está "montado"? (a tela de título usa isto para mostrar o menu) */
  get ready() {
    return this.t > 2.4;
  }

  update(dtMs) {
    const dt = Math.min(dtMs / 1000, 0.05);
    this.t += dt;
    const t = this.t;
    // passadas do skate: a da introdução e uma a cada ~10 s
    if (!this.skip && !this.board && !this.introStarted && t >= this.intro.bStart) {
      this.introStarted = true;
      this.board = { u: 0, dir: 1, dur: this.intro.bDur, flip: [0, 0], last: 0 };
      this.nextPass = t + 9;
    }
    if (!this.board && t >= this.nextPass && t > 4.5) {
      this.startPass(this.passDir);
      this.nextPass = t + 10;
    }
    // letras: quique ao pousar, pulinhos
    for (const p of this.parts) {
      const ti = t - p.delay;
      if (!p.landed && ti >= 0.7 * 0.37) {
        p.landed = true;
        p.b = 0.8;
        this.burst(p.cx, p.base, 7, p.row === 0 ? [SPRAY[0], SPRAY[1]] : [SPRAY[2], SPRAY[3], SPRAY[4]], 170);
      }
      if (p.bumpAt !== null && t >= p.bumpAt) {
        p.b = p.bumpS || 0.6;
        p.bumpAt = null;
      }
      p.b = Math.max(0, p.b - dt * 2.4);
    }
    // gotas
    for (const d of this.drips) {
      if (t < 2.2) continue;
      if (d.wait > 0) d.wait -= dt;
      else if (d.len < d.max) d.len += d.spd * dt;
      else if (d.hold > 0) d.hold -= dt;
      else Object.assign(d, this.newDrip(d.p, false));
    }
    for (const s of this.sparks) s.u += dt * s.spd;
    // skate
    const b = this.board;
    if (b) {
      b.u += dt / b.dur;
      const u = Math.min(1, b.u);
      const x0 = b.dir > 0 ? -110 : W + 110;
      b.x = x0 + b.dir * (W + 220) * u;
      // dois pulos com kickflip (rotação do skate em torno do próprio eixo)
      const hops = [[0.2, 0.42], [0.58, 0.8]];
      b.hop = 0;
      b.phi = 0;
      b.pitch = 0;
      hops.forEach(([a, e]) => {
        if (u > a && u < e) {
          const v = (u - a) / (e - a);
          b.hop = Math.sin(v * Math.PI) * 54;
          b.phi = v * Math.PI * 2;
          b.pitch = -0.28 * Math.sin(v * Math.PI) * b.dir;
        }
      });
      b.y = this.lineBase + 34 - b.hop;
      // rastro de spray + pulinho nas letras que ele cruza
      if (Math.random() < 0.75) this.spray.push({ x: b.x - b.dir * 60, y: b.y + 8, vx: -b.dir * rand(20, 90), vy: rand(-110, -20), life: 0.5, max: 0.5, c: SPRAY[(Math.random() * 4) | 0], r: rand(1.6, 3) });
      for (const p of this.parts) {
        if (p.row === 1 && !p.hitBy && (b.x - p.cx) * b.dir > -4 && (b.x - p.cx) * b.dir < 90) {
          p.hitBy = true;
          if (this.t - p.delay > 0.5) p.b = 0.7; // letra já no lugar: dá um pulinho
        }
      }
      if (u >= 1) {
        this.board = null;
        this.parts.forEach((p) => (p.hitBy = false));
      }
    }
    // partículas
    for (const s of this.spray) {
      s.life -= dt;
      s.x += s.vx * dt;
      s.y += s.vy * dt;
      s.vy += 520 * dt;
    }
    this.spray = this.spray.filter((s) => s.life > 0);
    return true;
  }

  drawBoard(r, b) {
    r.save();
    r.translate(b.x, b.y);
    r.rotate(b.pitch);
    const cs = Math.cos(b.phi);
    const sn = Math.sin(b.phi);
    const deckH = 9 + 30 * Math.abs(sn);
    // rodas e eixos (atrás ou na frente do deck, conforme o giro)
    const yw = 17 * cs;
    const drawWheels = () => {
      for (const sx of [-48, 48]) {
        r.setColor("#8d93c9");
        r.fillRect(sx - 4, Math.min(0, yw), 8, Math.abs(yw));
        r.setColor("#12081f");
        r.fillRoundRect(sx - 13, yw - 13, 26, 26, 13);
        r.setColor("#ffffff");
        r.fillRoundRect(sx - 10, yw - 10, 20, 20, 10);
        r.setColor("#ff2e7e");
        r.fillRect(sx - 3, yw - 3, 6, 6);
      }
    };
    if (cs >= 0) drawWheels();
    // deck: contorno, face (cor depende do lado que aparece) e rabeta/nariz
    r.setColor("#12081f");
    r.fillRoundRect(-82, -deckH / 2 - 3, 164, deckH + 6, 12);
    r.setColor(sn >= 0 ? "#ffd23f" : "#3b3f63");
    r.fillRoundRect(-79, -deckH / 2, 158, deckH, 10);
    if (sn >= 0 && deckH > 18) {
      r.setColor("#ff2e7e"); // gráfico do shape
      r.fillRect(-52, -deckH * 0.18, 104, deckH * 0.36);
      r.setColor("#4cc9f0");
      r.fillRect(-30, -deckH * 0.08, 60, deckH * 0.16);
    }
    if (cs < 0) drawWheels();
    r.restore();
  }

  draw(r) {
    const t = this.t;
    // letras
    for (const p of this.parts) {
      const ti = t - p.delay;
      if (ti < 0) continue;
      const u = Math.min(1, ti / 0.7);
      const drop = (1 - easeOutBounce(u)) * -(p.base + 220);
      const idle = u >= 1 ? Math.sin(t * 2.1 + p.i * 0.55) * 2.4 : 0;
      const rot = p.rot0 * (1 - u) + (u >= 1 ? Math.sin(t * 1.4 + p.i) * 0.012 : 0);
      const sq = 1 + 0.1 * p.b;
      r.save();
      r.setGlobalAlpha(Math.min(1, ti / 0.08));
      // centro da imagem da letra no mundo (a letra "pisa" na linha de base p.base)
      r.translate(p.x - p.pad + p.w / 2, p.base - p.cbase + p.h / 2 + drop + idle - 16 * p.b);
      r.rotate(rot);
      r.scale(sq, 1 / sq + 0.02 * p.b);
      r.drawImage(p.cv, -p.w / 2, -p.h / 2);
      r.restore();
      r.setGlobalAlpha(1);
    }
    // gotas de tinta
    for (const d of this.drips) {
      if (d.len < 1 || t - d.p.delay < 1.4) continue;
      const p = d.p;
      const x = p.cx + d.ox;
      const y = p.base - 8;
      const col = p.row === 0 ? "#ff2e7e" : p.c === SUN ? "#ff7a00" : "#7b2ff7";
      r.setColor("#12081f");
      r.fillRoundRect(x - d.w / 2 - 2, y - 2, d.w + 4, d.len + 5, (d.w + 4) / 2);
      r.fillRoundRect(x - d.w / 2 - 3, y + d.len - d.w * 0.6, d.w + 6, d.w + 6, (d.w + 6) / 2);
      r.setColor(col);
      r.fillRoundRect(x - d.w / 2, y, d.w, d.len + 2, d.w / 2);
      r.fillRoundRect(x - d.w / 2 - 1, y + d.len - d.w * 0.5, d.w + 2, d.w + 2, (d.w + 2) / 2);
    }
    // brilhos
    for (const s of this.sparks) {
      const k = s.u % 1;
      const a = Math.sin(k * Math.PI);
      if (a < 0.05 || t - s.p.delay < 1) continue;
      const x = s.p.x + s.p.adv * (0.5 + s.ox);
      const y = s.p.base - s.p.adv * 0.1 - 90 * s.oy;
      const z = 12 * a;
      r.setColor("#ffffff");
      r.setGlobalAlpha(a);
      r.fillRect(x - z, y - 1.5, z * 2, 3);
      r.fillRect(x - 1.5, y - z, 3, z * 2);
      r.fillRect(x - z * 0.45, y - z * 0.45, z * 0.9, z * 0.9);
      r.setGlobalAlpha(1);
    }
    if (this.board) this.drawBoard(r, this.board);
    // respingos de spray
    for (const s of this.spray) {
      r.setColor(s.c);
      r.setGlobalAlpha(Math.max(0, Math.min(1, (s.life / s.max) * 1.4)));
      r.fillRect(s.x - s.r, s.y - s.r, s.r * 2, s.r * 2);
    }
    r.setGlobalAlpha(1);
  }
}
