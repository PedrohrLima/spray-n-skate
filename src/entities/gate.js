import * as me from "melonjs";
import { W, GROUND_Y } from "../config.js";
import { Label } from "../game/label.js";

/**
 * Chegada da fase: a entrada de um túnel. O muro do túnel vem rolando pela direita; quando a boca passa pelo
 * skatista ele "entra" (corte lateral: o interior escuro com lâmpadas no teto), a luz do lado de fora vai
 * sumindo e, no fim, a tela fecha em preto (o círculo que fecha é desenhado pela cena de jogo, por cima de tudo).
 * Cada cidade tem o seu estilo: Los Angeles (estuque e arcos), Miami (art déco/neon) e Nova York (pedra e azulejo).
 */
const OPEN = 250; // altura da abertura (cabe o pulo)
const TOP = GROUND_Y - OPEN; // y do topo da abertura
const LIP = 30; // espessura da boca do túnel
const TW = 240; // largura do ladrilho do muro
const IW = 120; // largura do ladrilho do interior
const TAU = Math.PI * 2;

const STYLES = {
  la: { wall: "#e6d2ac", wall2: "#caa97a", trim: "#b0552e", inner: "#2a1d16", tile: "#43312a", lamp: "#ffb45a", glow: [255, 184, 110], plate: "#1b6b4c", text: "#ffffff", stripe: "#b0552e" },
  miami: { wall: "#ff9cc8", wall2: "#8fe6d0", trim: "#35e6ff", inner: "#0d1f2e", tile: "#17384a", lamp: "#8ff4ff", glow: [90, 230, 255], plate: "#140c2e", text: "#ff8ccb", stripe: "#ff4fa8" },
  ny: { wall: "#868a94", wall2: "#6b6f78", trim: "#3a3d46", inner: "#1d1c19", tile: "#34312b", lamp: "#ffb347", glow: [255, 176, 84], plate: "#14573a", text: "#ffffff", stripe: "#3a7a5a" },
};

const mk = (w, h) => {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
};
const seeded = (seed) => {
  let s = seed >>> 0;
  return () => (s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296;
};
const rgba = (c, a) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;

function wallTile(kind, st) {
  const cv = mk(TW, TOP);
  const g = cv.getContext("2d");
  const rnd = seeded(7 + kind.length);
  g.fillStyle = st.wall;
  g.fillRect(0, 0, TW, TOP);
  if (kind === "la") {
    for (let i = 0; i < 280; i++) {
      g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.08)" : "rgba(120,80,40,0.07)";
      g.fillRect(rnd() * TW, rnd() * TOP, 2 + rnd() * 3, 2);
    }
    for (const wx of [38, 158]) {
      g.fillStyle = "#3a2a24";
      g.fillRect(wx, 80, 34, 44);
      g.beginPath();
      g.arc(wx + 17, 80, 17, Math.PI, 0);
      g.fill();
      g.fillStyle = "rgba(255,200,120,0.18)";
      g.fillRect(wx + 4, 84, 10, 38);
      g.fillStyle = st.trim;
      g.fillRect(wx - 4, 124, 42, 6);
    }
    g.fillStyle = st.trim;
    g.fillRect(0, TOP - 14, TW, 14);
    g.fillStyle = "rgba(0,0,0,0.22)";
    for (let x = 20; x < TW; x += 40) {
      g.beginPath();
      g.arc(x, TOP - 14, 14, Math.PI, 0);
      g.fill();
    }
  } else if (kind === "miami") {
    for (let x = 0; x < TW; x += 40) {
      g.fillStyle = (x / 40) % 2 ? st.wall2 : st.wall;
      g.fillRect(x, 0, 40, TOP);
    }
    g.fillStyle = "rgba(255,255,255,0.6)";
    for (let y = 30; y < TOP - 24; y += 44) g.fillRect(0, y, TW, 4);
    for (let x = 30; x < TW; x += 60) {
      g.fillStyle = "#ffffff";
      g.beginPath();
      g.arc(x, 92, 11, 0, TAU);
      g.fill();
      g.fillStyle = "#14304a";
      g.beginPath();
      g.arc(x, 92, 8, 0, TAU);
      g.fill();
      g.fillStyle = "rgba(255,255,255,0.35)";
      g.fillRect(x - 5, 88, 5, 3);
    }
    g.fillStyle = "#ffffff";
    g.fillRect(0, TOP - 12, TW, 12);
  } else {
    for (let row = 0, y = 0; y < TOP; y += 22, row++) {
      const off = row % 2 ? 24 : 0;
      for (let x = -off; x < TW; x += 48) {
        g.fillStyle = rnd() < 0.5 ? "rgba(255,255,255,0.06)" : "rgba(0,0,0,0.08)";
        g.fillRect(x + 1, y + 1, 46, 20);
      }
      g.fillStyle = "rgba(0,0,0,0.28)";
      g.fillRect(0, y + 21, TW, 2);
      for (let x = -off; x < TW; x += 48) g.fillRect(x + 47, y, 2, 22);
    }
    for (const vx of [54, 146]) {
      g.fillStyle = "#23252c";
      g.fillRect(vx, 56, 40, 66);
      g.fillStyle = "#5a5e68";
      for (let y = 62; y < 120; y += 7) g.fillRect(vx + 3, y, 34, 3);
    }
    g.fillStyle = "#4d5058";
    g.fillRect(0, TOP - 14, TW, 14);
  }
  return cv;
}

function innerTile(st) {
  const cv = mk(IW, OPEN);
  const g = cv.getContext("2d");
  g.fillStyle = st.inner;
  g.fillRect(0, 0, IW, OPEN);
  g.fillStyle = st.tile;
  for (let x = 0; x < IW; x += 24) g.fillRect(x, 0, 2, OPEN);
  for (let y = 0; y < OPEN; y += 24) g.fillRect(0, y, IW, 2);
  g.fillStyle = st.stripe;
  g.globalAlpha = 0.55;
  g.fillRect(0, Math.round(OPEN * 0.5), IW, 9);
  g.globalAlpha = 1;
  const gr = g.createLinearGradient(0, 0, 0, 60);
  gr.addColorStop(0, "rgba(0,0,0,0.6)");
  gr.addColorStop(1, "rgba(0,0,0,0)");
  g.fillStyle = gr;
  g.fillRect(0, 0, IW, 60);
  return cv;
}

function gradX(w, h, c0, c1) {
  const cv = mk(w, h);
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, w, 0);
  gr.addColorStop(0, c0);
  gr.addColorStop(1, c1);
  g.fillStyle = gr;
  g.fillRect(0, 0, w, h);
  return cv;
}

const CONE = new me.Polygon(0, 0, [new me.Vector2d(-16, 0), new me.Vector2d(16, 0), new me.Vector2d(84, OPEN - 15), new me.Vector2d(-84, OPEN - 15)]);

const ASSETS = {};
function assets(kind) {
  if (!ASSETS[kind]) {
    const st = STYLES[kind];
    ASSETS[kind] = {
      wall: wallTile(kind, st),
      inner: innerTile(st),
      glow: gradX(300, OPEN, rgba(st.glow, 0.5), rgba(st.glow, 0)),
      shade: gradX(520, OPEN, "rgba(0,0,0,0)", "rgba(0,0,0,0.74)"),
    };
  }
  return ASSETS[kind];
}

/** Portal de chegada: entrada do túnel da cidade. */
export class FinishGate extends me.Renderable {
  constructor(kind = "ny") {
    super(0, 0, W, 540);
    this.kind = STYLES[kind] ? kind : "ny";
    this.st = STYLES[this.kind];
    this.as = assets(this.kind);
    this.anchorPoint.set(0, 0);
    this.alwaysUpdate = true;
    this.x = 99999;
    this.time = 0;
    this.title = new Label("TUNNEL", { size: 26, color: this.st.text, title: true, lineWidth: 0 });
    this.title.hidden = true;
  }
  setName(name) {
    this.title.set(name);
    // cabe na placa (largura ~ 0,8 do tamanho da fonte por letra)
    this.title.sc = Math.min(1, 270 / (name.length * 0.82 * 26));
  }
  tick(dt, x) {
    this.time += dt;
    this.x = x;
  }
  update() {
    return true;
  }
  draw(r) {
    const x = this.x;
    if (x > W + 60) {
      this.title.hidden = true;
      return;
    }
    const st = this.st;
    const A = this.as;
    const x0 = Math.max(0, Math.floor(x));
    const xi = Math.floor(x) + LIP; // onde começa o interior
    const xs = Math.max(0, xi);

    // ---- muro acima da abertura (ladrilhos que andam com o mundo)
    const k0 = Math.floor((x0 - x) / TW);
    for (let tx = Math.floor(x) + k0 * TW; tx < W; tx += TW) r.drawImage(A.wall, tx, 0);
    // viga sobre a abertura + sombra
    r.setColor(st.trim);
    r.fillRect(x0, TOP - 2, W - x0, 8);
    r.setColor("#000000");
    r.setGlobalAlpha(0.35);
    r.fillRect(x0, TOP + 6, W - x0, 10);
    r.setGlobalAlpha(1);

    // ---- interior (corte lateral): fundo de azulejo, luz da entrada e escuridão crescente
    if (xs < W) {
      r.setColor(st.tile);
      r.fillRect(xs, TOP, W - xs, OPEN);
      const off = (((x * 0.72) % IW) + IW) % IW;
      for (let tx = xi + off - IW; tx < W; tx += IW) if (tx >= xi) r.drawImage(A.inner, tx, TOP);
      r.drawImage(A.glow, xs, TOP);
      r.drawImage(A.shade, xs, TOP);
      if (xs + 520 < W) {
        r.setColor("#000000");
        r.setGlobalAlpha(0.74);
        r.fillRect(xs + 520, TOP, W - xs - 520, OPEN);
        r.setGlobalAlpha(1);
      }
      // chão do túnel mais escuro que a calçada lá fora
      r.setColor("#000000");
      r.setGlobalAlpha(0.5);
      r.fillRect(xs, GROUND_Y, W - xs, 120);
      r.setGlobalAlpha(1);
      // lâmpadas no teto e poças de luz no chão
      r.setColor(st.lamp);
      for (let lx = xi + 120; lx < W + 60; lx += 190) {
        if (lx < -90) continue;
        r.save();
        r.translate(lx, TOP + 15);
        r.setGlobalAlpha(0.09);
        r.fillPolygon(CONE); // cone de luz da lâmpada
        r.restore();
        r.setGlobalAlpha(0.2);
        r.fillArc(lx, TOP + 14, 40, 0, TAU);
        r.fillEllipse(lx, GROUND_Y + 20, 92, 13);
        r.setGlobalAlpha(0.95);
        r.fillRect(lx - 18, TOP + 8, 36, 7);
        r.setGlobalAlpha(1);
      }
    }

    // ---- boca do túnel (coluna) e detalhes do estilo
    if (x > -LIP) {
      const bx = Math.max(0, Math.floor(x));
      const bw = Math.min(LIP, Math.floor(x) + LIP - bx);
      r.setColor(st.wall2);
      r.fillRect(bx, TOP, bw, OPEN);
      r.setColor("#ffffff");
      r.setGlobalAlpha(0.2);
      r.fillRect(bx, TOP, Math.min(5, bw), OPEN);
      r.setColor("#000000");
      r.setGlobalAlpha(0.3);
      r.fillRect(bx + bw - 6, TOP, 6, OPEN);
      r.setGlobalAlpha(1);
    }
    if (this.kind === "miami" && xs < W) {
      // neon contornando a abertura
      const flick = 0.85 + 0.15 * Math.sin(this.time * 9);
      for (const [pad, a] of [[8, 0.1], [5, 0.18], [2, 0.5]]) {
        r.setColor("#35e6ff");
        r.setGlobalAlpha(a * flick);
        r.fillRect(x0, TOP + 6 - pad / 2, W - x0, 3 + pad);
        r.setColor("#ff4fa8");
        r.fillRect(Math.max(0, Math.floor(x) + LIP - 3 - pad / 2), TOP + 6, 3 + pad, OPEN - 6);
      }
      r.setGlobalAlpha(1);
    }

    // ---- placa com o nome do túnel
    const cx = x + 210;
    if (cx > -190 && cx < W + 190) {
      r.setColor("#f4f4f4");
      r.fillRoundRect(cx - 152, TOP - 92, 304, 60, 10);
      r.setColor(st.plate);
      r.fillRoundRect(cx - 147, TOP - 87, 294, 50, 7);
      this.title.hidden = false;
      this.title.place(cx, TOP - 62);
    } else this.title.hidden = true;
  }
}
