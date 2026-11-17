import * as me from "melonjs";
import { W, GROUND_Y } from "../config.js";
import { setRGB } from "../game/palette.js";

/**
 * Cenários das cidades das 3 fases: Los Angeles, Miami e Nova York.
 * Cada cidade tem 3 camadas (longe · prédios · adereços da calçada) PRÉ-RENDERIZADAS em canvas que se repetem
 * em loop — a cada quadro só são necessários poucos drawImage, o que é bem mais leve do que desenhar
 * centenas de retângulos. Cada cidade tem duas versões (a da 1ª e a da 2ª zona da fase); a transição
 * dia → pôr do sol/noite é uma mistura (alpha) entre as duas.
 */
const PF = 1280; // período (px) da camada distante
const PM = 1600; // ... da camada de prédios
const PP = 1560; // ... dos adereços (palmeiras, postes)
const LH = 330; // altura dos canvases distante/prédios
const PH = 300; // altura do canvas de adereços
const B = LH - 14; // linha do chão dentro dos canvases distante/prédios
const BP = PH - 14; // ... dentro do canvas de adereços
const LAYER_Y = GROUND_Y + 14 - LH;
const PROP_Y = GROUND_Y + 14 - PH;
const TAU = Math.PI * 2;

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
const css = (c, a = 1) => `rgba(${c[0]},${c[1]},${c[2]},${a})`;
const pick = (rnd, list) => list[Math.floor(rnd() * list.length) % list.length];
const wrap = (P, x, fn) => {
  for (const d of [-P, 0, P]) fn(x + d);
};
/** cobre só o que já foi desenhado (atmosfera / luz do fim do dia) */
function tint(g, w, h, c) {
  if (!c || c[3] <= 0) return;
  g.save();
  g.globalCompositeOperation = "source-atop";
  g.fillStyle = css(c, c[3]);
  g.fillRect(0, 0, w, h);
  g.restore();
}

// ---------------------------------------------------------------------------- versões de cada cidade
// dark: véu de cor sobre prédios/adereços · haze: névoa sobre a camada distante
// lit: chance de uma janela estar acesa · neon: letreiros brilhando
const VARIANTS = {
  la: [
    { dark: [255, 214, 150, 0.07], haze: [196, 208, 238, 0.4], lit: 0, neon: false, glow: 0 },
    { dark: [96, 30, 96, 0.46], haze: [255, 126, 92, 0.5], lit: 0.5, neon: false, glow: 0.6 },
  ],
  miami: [
    { dark: [255, 120, 130, 0.16], haze: [226, 146, 206, 0.42], lit: 0.3, neon: false, glow: 0.3 },
    { dark: [22, 0, 70, 0.55], haze: [156, 44, 140, 0.5], lit: 0.9, neon: true, glow: 1 },
  ],
  ny: [
    { dark: [70, 46, 120, 0.3], haze: [255, 176, 126, 0.42], lit: 0.5, neon: false, glow: 0.7 },
    { dark: [4, 6, 34, 0.52], haze: [64, 54, 124, 0.5], lit: 0.95, neon: false, glow: 1 },
  ],
};

// ---------------------------------------------------------------------------- peças reutilizáveis
const PALM = { trunk: "#8a6a48", ring: "#5d452c", leaf: "#2e7a42", leaf2: "#3f9c57", coco: "#4a3220" };

function palm(g, x, base, h, lean, s) {
  const tx = x + lean;
  const ty = base - h;
  g.lineCap = "round";
  let px = x;
  let py = base;
  const N = 12;
  for (let i = 1; i <= N; i++) {
    const t = i / N;
    const qx = (1 - t) * (1 - t) * x + 2 * (1 - t) * t * (x + lean * 0.15) + t * t * tx;
    const qy = (1 - t) * (1 - t) * base + 2 * (1 - t) * t * (base - h * 0.55) + t * t * ty;
    g.strokeStyle = PALM.trunk;
    g.lineWidth = (6.4 - 2.8 * t) * s;
    g.beginPath();
    g.moveTo(px, py);
    g.lineTo(qx, qy);
    g.stroke();
    if (i % 2 === 0) {
      g.strokeStyle = PALM.ring;
      g.lineWidth = 1.3 * s;
      g.beginPath();
      g.moveTo(qx - 3.2 * s, qy);
      g.lineTo(qx + 3.2 * s, qy - 1);
      g.stroke();
    }
    px = qx;
    py = qy;
  }
  const n = 10;
  for (let i = 0; i < n; i++) {
    const a = -Math.PI + ((i + 0.5) * Math.PI) / n + (i % 2 ? 0.06 : -0.06);
    const len = (46 + (i % 3) * 8) * s;
    const side = Math.abs(Math.cos(a));
    const ex = tx + Math.cos(a) * len;
    const ey = ty + Math.sin(a) * len * 0.55 + (14 + 18 * side) * s;
    const mx = tx + Math.cos(a) * len * 0.5;
    const my = ty + Math.sin(a) * len * 0.3 - 10 * s;
    const wd = 6.5 * s;
    const nx = -Math.sin(a);
    const ny = Math.cos(a);
    g.fillStyle = i % 2 ? PALM.leaf : PALM.leaf2;
    g.beginPath();
    g.moveTo(tx, ty);
    g.quadraticCurveTo(mx + nx * wd, my + ny * wd, ex, ey);
    g.quadraticCurveTo(mx - nx * wd, my - ny * wd, tx, ty);
    g.fill();
  }
  g.fillStyle = PALM.coco;
  g.beginPath();
  g.arc(tx - 3 * s, ty + 4 * s, 3 * s, 0, TAU);
  g.arc(tx + 3 * s, ty + 5 * s, 3 * s, 0, TAU);
  g.fill();
}

function glowAt(g, x, y, rad, color, a) {
  const gr = g.createRadialGradient(x, y, 1, x, y, rad);
  gr.addColorStop(0, css(color, a));
  gr.addColorStop(1, css(color, 0));
  g.fillStyle = gr;
  g.fillRect(x - rad, y - rad, rad * 2, rad * 2);
}

/** poste de luz comum; devolve o ponto da lâmpada para o brilho */
function lamp(g, x, base) {
  g.fillStyle = "#16141f";
  g.fillRect(x - 2.5, base - 128, 5, 128);
  g.fillRect(x - 2.5, base - 130, 26, 4);
  g.fillRect(x + 16, base - 128, 14, 7);
  g.fillStyle = "#ffe9a8";
  g.fillRect(x + 18, base - 122, 10, 3);
  return [x + 23, base - 120];
}

// ---------------------------------------------------------------------------- LOS ANGELES
const STUCCO = ["#f2e6d0", "#e9c9a6", "#f4f0e6", "#d9a38c", "#cfe3e0", "#f0d58c", "#e8b9a0"];
const AWNING = [["#d6453d", "#ffffff"], ["#1f8a8a", "#ffffff"], ["#e0a526", "#ffffff"]];

function laFar(g, V, rnd, lights, post) {
  // torres do centro, ao fundo
  const towers = [[600, 64, 130], [664, 44, 178], [712, 58, 110], [776, 36, 152], [826, 62, 96], [892, 42, 126]];
  for (const [x, w, h] of towers) {
    g.fillStyle = "#7d88ac";
    g.fillRect(x, B - h, w, h + 20);
    g.fillStyle = "rgba(255,255,255,0.14)";
    g.fillRect(x, B - h, w, 3);
    for (let y = B - h + 8; y < B - 16; y += 9) {
      g.fillStyle = "rgba(20,30,70,0.18)";
      g.fillRect(x + 3, y, w - 6, 2);
    }
  }
  g.fillStyle = "#7d88ac";
  g.fillRect(684, B - 178 - 28, 3, 28); // antena
  // colinas (período exato = PF)
  const hillH = (x) => 100 + 42 * Math.sin((TAU * x) / PF + 0.6) + 24 * Math.sin((TAU * 3 * x) / PF + 2.1) + 10 * Math.sin((TAU * 7 * x) / PF + 4.2);
  g.fillStyle = "#5f6c92";
  g.beginPath();
  g.moveTo(0, LH);
  for (let x = 0; x <= PF; x += 8) g.lineTo(x, B - hillH(x));
  g.lineTo(PF, LH);
  g.fill();
  g.fillStyle = "rgba(255,255,255,0.1)";
  g.beginPath();
  g.moveTo(0, LH);
  for (let x = 0; x <= PF; x += 8) g.lineTo(x, B - hillH(x) + 4);
  g.lineTo(PF, LH);
  g.fill();
  // letreiro na colina (estilizado: blocos brancos acompanhando o terreno)
  let best = 200;
  for (let x = 160; x < 420; x += 4) if (hillH(x) > hillH(best)) best = x;
  for (let i = 0; i < 9; i++) {
    const x = best - 40 + i * 9;
    const y = B - hillH(x) - 9;
    g.fillStyle = "#f4f4ff";
    g.fillRect(x, y, 6, 10);
  }
}

function laBuilding(g, rnd, x, w, h, V, lights) {
  const c = pick(rnd, STUCCO);
  g.fillStyle = c;
  g.fillRect(x, B - h, w, h + 20);
  g.fillStyle = "rgba(0,0,0,0.1)";
  g.fillRect(x + w * 0.82, B - h, w * 0.18, h + 20);
  g.fillStyle = "rgba(0,0,0,0.2)";
  g.fillRect(x, B - h, w, 4);
  g.fillStyle = "rgba(255,255,255,0.35)";
  g.fillRect(x, B - h + 4, w, 2);
  if (rnd() < 0.3) {
    g.fillStyle = "#c2603a";
    g.beginPath();
    g.moveTo(x - 4, B - h);
    g.lineTo(x + 7, B - h - 12);
    g.lineTo(x + w - 7, B - h - 12);
    g.lineTo(x + w + 4, B - h);
    g.fill();
    g.fillStyle = "rgba(0,0,0,0.2)";
    g.fillRect(x + 7, B - h - 5, w - 14, 2);
  }
  const cols = Math.max(1, Math.floor((w - 10) / 24));
  const gx = x + (w - cols * 24 + 11) / 2;
  for (let ci = 0; ci < cols; ci++)
    for (let y = B - h + 16; y < B - 66; y += 32) {
      const wx = gx + ci * 24;
      g.fillStyle = "#3b4a63";
      g.fillRect(wx, y, 13, 17);
      g.fillStyle = "rgba(255,255,255,0.22)";
      g.fillRect(wx, y, 13, 3);
      g.fillStyle = "rgba(0,0,0,0.2)";
      g.fillRect(wx - 2, y + 17, 17, 3);
      if (rnd() < V.lit) lights.push([wx, y, 13, 17, "#ffd98a"]);
    }
  // loja no térreo com toldo listrado
  g.fillStyle = "#2c394f";
  g.fillRect(x + 6, B - 36, w - 12, 32);
  if (rnd() < V.lit + 0.2) lights.push([x + 9, B - 33, w - 18, 26, "rgba(255,214,140,0.8)"]);
  const [a1, a2] = pick(rnd, AWNING);
  for (let sx = x + 4; sx < x + w - 8; sx += 10) {
    g.fillStyle = Math.floor((sx - x) / 10) % 2 ? a2 : a1;
    g.fillRect(sx, B - 50, Math.min(10, x + w - 4 - sx), 13);
  }
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.fillRect(x + 4, B - 38, w - 8, 2);
}

function laMid(g, V, rnd, lights, post) {
  let x = 0;
  const gaps = [];
  while (x < PM) {
    let w = 80 + rnd() * 70;
    if (PM - x - w < 84) w = PM - x;
    const h = 62 + rnd() * 84;
    laBuilding(g, rnd, x, w, h, V, lights);
    x += w;
    if (x < PM - 90 && rnd() < 0.4) {
      const gap = 34 + rnd() * 46;
      gaps.push([x, gap]);
      x += gap;
    }
  }
  // painel de propaganda sobre um prédio (marca de Los Angeles)
  const bx = 520;
  g.fillStyle = "#2b2b3a";
  g.fillRect(bx + 8, B - 190, 4, 50);
  g.fillRect(bx + 66, B - 190, 4, 50);
  g.fillStyle = "#1c1c2c";
  g.fillRect(bx, B - 232, 80, 44);
  g.fillStyle = "#ff5d8f";
  g.fillRect(bx + 4, B - 228, 72, 36);
  g.fillStyle = "#ffe14a";
  g.fillRect(bx + 10, B - 220, 36, 6);
  g.fillStyle = "#ffffff";
  g.fillRect(bx + 10, B - 208, 56, 4);
  g.fillRect(bx + 10, B - 200, 40, 4);
  // palmeiras nos vãos entre os prédios
  const spots = [60, 330, 700, 940, 1210, 1480];
  for (const sx of spots) wrap(PM, sx, (xx) => palm(g, xx, B + 4, 104 + ((sx * 7) % 40), ((sx * 3) % 20) - 10, 0.85));
}

function laProps(g, V, rnd, lights, post) {
  const palms = [[150, 232, 12], [690, 246, -10], [1230, 222, 9]];
  for (const [x, h, lean] of palms) wrap(PP, x, (xx) => palm(g, xx, BP + 6, h, lean, 1.5));
  for (const x of [430, 960, 1490]) {
    const p = lamp(g, x, BP + 4);
    post.push(() => glowAt(g, p[0], p[1], 52, [255, 220, 150], 0.5 * V.glow));
  }
}

// ---------------------------------------------------------------------------- MIAMI
const DECO = [["#ffa6cf", "#ff6fae"], ["#9fe8c8", "#5fcaa4"], ["#ffe08a", "#ffc24d"], ["#8fdcf0", "#4fb8d8"], ["#fff2f2", "#e8c8d0"], ["#c9b2ff", "#a086f0"]];
const NEONS = ["#ff4fa8", "#35e6ff", "#ffe24a", "#b266ff"];
const WORDS = ["HOTEL", "MIAMI", "CAFE", "BAR", "DINER"];

function miamiFar(g, V, rnd) {
  let x = 0;
  while (x < PF) {
    let w = 34 + rnd() * 40;
    if (PF - x - w < 38) w = PF - x;
    const h = 72 + rnd() * 150;
    g.fillStyle = "#8a80b4";
    g.fillRect(x, B - h, w, h + 20);
    // topos variados
    const kind = Math.floor(rnd() * 4);
    g.fillStyle = "#8a80b4";
    if (kind === 1) {
      g.beginPath();
      g.moveTo(x, B - h);
      g.lineTo(x + w, B - h - 18);
      g.lineTo(x + w, B - h);
      g.fill();
    } else if (kind === 2) g.fillRect(x + w * 0.2, B - h - 14, w * 0.6, 14);
    else if (kind === 3) g.fillRect(x + w / 2 - 1.5, B - h - 30, 3, 30);
    g.fillStyle = "rgba(255,255,255,0.16)";
    g.fillRect(x, B - h, 3, h);
    for (let y = B - h + 6; y < B - 12; y += 7) {
      g.fillStyle = "rgba(30,20,80,0.16)";
      g.fillRect(x + 3, y, w - 6, 2);
    }
    x += w + 2 + rnd() * 6;
  }
}

function miamiBuilding(g, rnd, x, w, h, V, lights, post) {
  const [c1, c2] = pick(rnd, DECO);
  g.fillStyle = c1;
  g.fillRect(x, B - h, w, h + 20);
  g.fillStyle = c2;
  g.fillRect(x + w * 0.8, B - h, w * 0.2, h + 20);
  const tw = Math.round(w * 0.34);
  const th = 30 + rnd() * 26;
  const tx = x + Math.round((w - tw) / 2);
  g.fillStyle = c1;
  g.fillRect(tx, B - h - th, tw, th + 2);
  g.fillStyle = c2;
  g.fillRect(tx + tw * 0.72, B - h - th, tw * 0.28, th + 2);
  g.fillStyle = "rgba(255,255,255,0.5)";
  for (let fx = tx + 5; fx < tx + tw - 4; fx += 7) g.fillRect(fx, B - h - th + 6, 2, th - 4);
  g.fillStyle = c2;
  g.beginPath();
  g.moveTo(tx + tw / 2 - 4, B - h - th);
  g.lineTo(tx + tw / 2, B - h - th - 26);
  g.lineTo(tx + tw / 2 + 4, B - h - th);
  g.fill();
  // "sobrancelhas" art déco em cada andar
  for (let y = B - h + 22; y < B - 40; y += 26) {
    g.fillStyle = "rgba(255,255,255,0.55)";
    g.fillRect(x - 3, y, w + 6, 3);
    g.fillStyle = c2;
    g.fillRect(x - 3, y + 3, w + 6, 2);
  }
  // janelas redondas (escotilhas) e retangulares
  let row = 0;
  for (let y = B - h + 28; y < B - 62; y += 26, row++)
    for (let wx = x + 10; wx < x + w - 14; wx += 20) {
      g.fillStyle = "#48709a";
      if (row % 2) {
        g.beginPath();
        g.arc(wx + 6, y + 7, 6, 0, TAU);
        g.fill();
        if (rnd() < V.lit) lights.push(["arc", wx + 6, y + 7, 5, "#ffe9a8"]);
      } else {
        g.fillRect(wx, y, 12, 14);
        if (rnd() < V.lit) lights.push([wx, y, 12, 14, "#ffe0a0"]);
      }
    }
  // térreo
  g.fillStyle = "#2a2145";
  g.fillRect(x + 6, B - 36, w - 12, 32);
  lights.push([x + 9, B - 33, w - 18, 26, "rgba(255,226,170,0.75)"]);
  // neon: faixa no telhado, na torre e um letreiro vertical
  const neon = pick(rnd, NEONS);
  const word = rnd() < 0.55 ? pick(rnd, WORDS) : null;
  post.push(() => {
    g.save();
    g.shadowColor = neon;
    g.shadowBlur = V.neon ? 14 : 0;
    g.fillStyle = neon;
    g.fillRect(x, B - h - 3, w, 3);
    g.fillRect(tx, B - h - th - 3, tw, 3);
    g.fillRect(x - 2, B - 42, w + 4, 3);
    if (word) {
      g.fillStyle = "rgba(18,10,40,0.85)";
      g.fillRect(x + 3, B - h + 10, 15, word.length * 13 + 6);
      g.fillStyle = neon;
      g.font = '12px Bungee, Impact, "Arial Black", sans-serif';
      g.textAlign = "center";
      g.textBaseline = "middle";
      for (let i = 0; i < word.length; i++) g.fillText(word[i], x + 10.5, B - h + 20 + i * 13);
    }
    g.restore();
  });
}

function miamiMid(g, V, rnd, lights, post) {
  let x = 0;
  while (x < PM) {
    let w = 96 + rnd() * 52;
    if (PM - x - w < 100) w = PM - x;
    const h = 72 + rnd() * 78;
    miamiBuilding(g, rnd, x, w, h, V, lights, post);
    x += w + (rnd() < 0.3 ? 24 : 4);
  }
  for (const sx of [24, 420, 800, 1190, 1540]) wrap(PM, sx, (xx) => palm(g, xx, B + 4, 100 + ((sx * 5) % 36), ((sx * 7) % 22) - 11, 0.85));
}

function miamiProps(g, V, rnd, lights, post) {
  for (const [x, h, lean] of [[200, 236, -11], [1010, 226, 10]]) wrap(PP, x, (xx) => palm(g, xx, BP + 6, h, lean, 1.5));
  // torre de salva-vidas (ícone de Miami Beach)
  const tx = 640;
  g.strokeStyle = "#8a6a48";
  g.lineWidth = 3;
  g.beginPath();
  for (const dx of [4, 20, 40, 56]) {
    g.moveTo(tx + dx, BP + 4);
    g.lineTo(tx + dx + (dx < 30 ? 3 : -3), BP - 38);
  }
  g.moveTo(tx + 4, BP - 18);
  g.lineTo(tx + 56, BP - 18);
  g.stroke();
  g.fillStyle = "#ffffff";
  g.fillRect(tx - 2, BP - 78, 66, 40);
  g.fillStyle = "#ff6fae";
  for (let i = 0; i < 5; i++) g.fillRect(tx - 2 + i * 13.2 + 6.6, BP - 78, 6.6, 40);
  g.fillStyle = "#38c6e6";
  g.beginPath();
  g.moveTo(tx - 8, BP - 78);
  g.lineTo(tx + 31, BP - 96);
  g.lineTo(tx + 70, BP - 78);
  g.fill();
  g.fillStyle = "#2b4a7a";
  g.fillRect(tx + 14, BP - 70, 36, 18);
  g.fillStyle = "#ff3b5c";
  g.fillRect(tx + 31, BP - 124, 2, 28);
  g.beginPath();
  g.moveTo(tx + 33, BP - 124);
  g.lineTo(tx + 50, BP - 118);
  g.lineTo(tx + 33, BP - 111);
  g.fill();
  // guarda-sol listrado
  const ux = 1330;
  g.fillStyle = "#6a4a30";
  g.fillRect(ux - 1.5, BP - 78, 3, 80);
  for (let i = 0; i < 6; i++) {
    g.fillStyle = i % 2 ? "#ffffff" : "#ff5d8f";
    g.beginPath();
    g.moveTo(ux, BP - 92);
    g.lineTo(ux - 40 + i * 13.3, BP - 66);
    g.lineTo(ux - 40 + (i + 1) * 13.3, BP - 66);
    g.fill();
  }
  // postes art déco com globo
  for (const x of [430, 1180]) {
    g.fillStyle = "#2c1a46";
    g.fillRect(x - 2.5, BP - 112, 5, 116);
    g.fillRect(x - 9, BP - 4, 18, 8);
    g.beginPath();
    g.arc(x, BP - 120, 9, 0, TAU);
    g.fill();
    g.fillStyle = "#ffd0ec";
    g.beginPath();
    g.arc(x, BP - 120, 6.5, 0, TAU);
    g.fill();
    post.push(() => glowAt(g, x, BP - 120, 56, [255, 120, 200], 0.55 * V.glow));
  }
}

// ---------------------------------------------------------------------------- NOVA YORK
const BRICKS = ["#8c4a3c", "#7a3f36", "#9a5a46", "#6e4a46", "#a0654a", "#5d4a52"];
const NY_AWN = ["#b3263e", "#2a6f4a", "#1e4f8f"];

function waterTower(g, x, y) {
  g.strokeStyle = "#241a1a";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(x + 2, y);
  g.lineTo(x + 6, y - 14);
  g.moveTo(x + 22, y);
  g.lineTo(x + 18, y - 14);
  g.moveTo(x + 12, y);
  g.lineTo(x + 12, y - 14);
  g.stroke();
  g.fillStyle = "#6d4a30";
  g.fillRect(x + 2, y - 40, 20, 27);
  g.fillStyle = "#3a2616";
  g.fillRect(x + 2, y - 34, 20, 2);
  g.fillRect(x + 2, y - 24, 20, 2);
  g.fillStyle = "#3d2a1c";
  g.beginPath();
  g.moveTo(x, y - 40);
  g.lineTo(x + 12, y - 54);
  g.lineTo(x + 24, y - 40);
  g.fill();
}

function steamStack(g, x, y) {
  for (let i = 0; i < 5; i++) {
    g.fillStyle = i % 2 ? "#ffffff" : "#e8672c";
    g.fillRect(x, y - 46 + i * 9.2, 12, 9.2);
  }
  g.fillStyle = "#3a2a2a";
  g.fillRect(x - 1, y - 48, 14, 3);
  for (let i = 0; i < 4; i++) {
    g.fillStyle = `rgba(255,255,255,${0.55 - i * 0.12})`;
    g.beginPath();
    g.arc(x + 6 + i * 4, y - 58 - i * 16, 8 + i * 4, 0, TAU);
    g.fill();
  }
}

function nyFar(g, V, rnd) {
  // ponte (estilo Brooklyn): 2 torres de pedra, cabos e pista
  const t1 = 360;
  const t2 = 960;
  const topY = B - 160;
  const deck = B - 46;
  g.fillStyle = "#6a6290";
  for (const tx of [t1, t2]) {
    g.fillRect(tx - 16, topY, 32, B - topY + 20);
    g.fillStyle = "#3b3560";
    g.beginPath();
    g.moveTo(tx - 9, topY + 44);
    g.quadraticCurveTo(tx - 9, topY + 26, tx, topY + 22);
    g.quadraticCurveTo(tx + 9, topY + 26, tx + 9, topY + 44);
    g.lineTo(tx + 9, topY + 84);
    g.lineTo(tx - 9, topY + 84);
    g.fill();
    g.fillStyle = "#6a6290";
    g.fillRect(tx - 18, topY - 4, 36, 6);
  }
  g.strokeStyle = "#6a6290";
  g.lineWidth = 2;
  g.beginPath();
  g.moveTo(t1, topY);
  g.quadraticCurveTo((t1 + t2) / 2, deck + 16, t2, topY);
  g.moveTo(t1, topY);
  g.lineTo(0, deck);
  g.moveTo(t2, topY);
  g.lineTo(PF, deck);
  g.stroke();
  g.lineWidth = 1;
  for (let x = t1 + 16; x < t2 - 8; x += 14) {
    const t = (x - t1) / (t2 - t1);
    const cy = (1 - t) * (1 - t) * topY + 2 * (1 - t) * t * (deck + 16) + t * t * topY;
    g.beginPath();
    g.moveTo(x, cy);
    g.lineTo(x, deck);
    g.stroke();
  }
  g.fillStyle = "#6a6290";
  g.fillRect(0, deck, PF, 5);
  // arranha-céus com recuos
  let x = 0;
  while (x < PF) {
    let w = 38 + rnd() * 40;
    if (PF - x - w < 42) w = PF - x;
    const h = 96 + rnd() * 120;
    g.fillStyle = "#5a5a86";
    g.fillRect(x, B - h, w, h + 20);
    if (rnd() < 0.6) g.fillRect(x + w * 0.2, B - h - 20, w * 0.6, 20);
    if (rnd() < 0.3) g.fillRect(x + w / 2 - 1, B - h - 36, 2, 36);
    g.fillStyle = "rgba(255,255,255,0.1)";
    g.fillRect(x, B - h, 3, h);
    x += w + 2 + rnd() * 6;
  }
  // torre em degraus (estilo Empire State) e coroa em arcos (estilo Chrysler)
  g.fillStyle = "#524f80";
  const ex = 560;
  g.fillRect(ex - 36, B - 120, 72, 140);
  g.fillRect(ex - 27, B - 156, 54, 36);
  g.fillRect(ex - 18, B - 188, 36, 32);
  g.fillRect(ex - 6, B - 228, 12, 40);
  g.fillRect(ex - 1, B - 270, 2, 42);
  const cx = 800;
  g.fillRect(cx - 22, B - 170, 44, 190);
  for (let i = 0; i < 5; i++) {
    g.beginPath();
    g.ellipse(cx, B - 170 - i * 7, 22 - i * 4, 10 - i * 1.4, 0, Math.PI, 0);
    g.fill();
  }
  g.fillRect(cx - 1, B - 218, 2, 24);
}

function nyBuilding(g, rnd, x, w, h, V, lights, post) {
  const c = pick(rnd, BRICKS);
  g.fillStyle = c;
  g.fillRect(x, B - h, w, h + 20);
  g.fillStyle = "rgba(0,0,0,0.13)";
  for (let y = B - h + 3; y < B; y += 6) g.fillRect(x, y, w, 1);
  g.fillStyle = "rgba(0,0,0,0.15)";
  g.fillRect(x + w * 0.84, B - h, w * 0.16, h + 20);
  g.fillStyle = "#c9b3a0";
  g.fillRect(x - 3, B - h - 6, w + 6, 7);
  g.fillStyle = "rgba(0,0,0,0.3)";
  g.fillRect(x - 3, B - h + 1, w + 6, 2);
  const cols = Math.max(1, Math.floor((w - 14) / 22));
  const gx = x + (w - cols * 22 + 10) / 2;
  const rows = [];
  for (let y = B - h + 18; y < B - 74; y += 34) rows.push(y);
  for (const y of rows)
    for (let ci = 0; ci < cols; ci++) {
      const wx = gx + ci * 22;
      g.fillStyle = "#c9b3a0";
      g.fillRect(wx - 2, y - 3, 16, 3);
      g.fillStyle = "#262d49";
      g.fillRect(wx, y, 12, 20);
      g.fillStyle = "rgba(255,255,255,0.14)";
      g.fillRect(wx, y, 12, 3);
      g.fillStyle = "#c9b3a0";
      g.fillRect(wx - 2, y + 20, 16, 3);
      const blue = rnd() < 0.15; // (sorteios sempre na mesma ordem nas duas versões do dia/noite)
      if (rnd() < V.lit) lights.push([wx, y, 12, 20, blue ? "#9fd2ff" : "#ffd27a"]);
    }
  // escada de incêndio
  if (rnd() < 0.6 && rows.length > 1) {
    const fx = x + (rnd() < 0.5 ? 6 : Math.max(6, w - 46));
    g.fillStyle = "#14121c";
    g.strokeStyle = "#14121c";
    g.lineWidth = 2;
    for (let i = 0; i < rows.length; i++) {
      const ly = rows[i] + 22;
      g.fillRect(fx, ly, 40, 3);
      g.fillRect(fx, ly - 15, 40, 2);
      g.fillRect(fx, ly - 15, 2, 15);
      g.fillRect(fx + 19, ly - 15, 2, 15);
      g.fillRect(fx + 38, ly - 15, 2, 15);
      if (i < rows.length - 1) {
        g.beginPath();
        g.moveTo(fx + 32, ly + 3);
        g.lineTo(fx + 8, ly + 34);
        g.stroke();
      }
    }
  }
  // loja no térreo + toldo
  g.fillStyle = "#1c1824";
  g.fillRect(x + 6, B - 38, w - 12, 34);
  lights.push([x + 9, B - 35, Math.max(8, w - 18), 28, "rgba(255,224,160,0.78)"]);
  g.fillStyle = pick(rnd, NY_AWN);
  g.fillRect(x + 3, B - 52, w - 6, 14);
  g.fillStyle = "rgba(0,0,0,0.25)";
  g.fillRect(x + 3, B - 40, w - 6, 3);
  // topo: caixa d'água ou ar-condicionado
  const roll = rnd();
  if (roll < 0.34 && w > 80) waterTower(g, x + 12 + rnd() * (w - 50), B - h - 6);
  else if (roll < 0.55) {
    g.fillStyle = "#3b3640";
    g.fillRect(x + 10 + rnd() * (w - 40), B - h - 14, 22, 9);
  }
}

function nyMid(g, V, rnd, lights, post) {
  let x = 0;
  let stack = false;
  while (x < PM) {
    let w = 78 + rnd() * 56;
    if (PM - x - w < 88) w = PM - x;
    const h = 96 + rnd() * 160;
    nyBuilding(g, rnd, x, w, h, V, lights, post);
    if (!stack && x > 700) {
      steamStack(g, x + w - 24, B - h - 6);
      stack = true;
    }
    x += w + 2;
  }
}

function nyProps(g, V, rnd, lights, post) {
  // postes clássicos de duas lâmpadas
  for (const x of [190, 720, 1250]) {
    g.fillStyle = "#14121c";
    g.fillRect(x - 2.5, BP - 126, 5, 130);
    g.fillRect(x - 14, BP - 126, 28, 3);
    g.fillRect(x - 6, BP - 4, 12, 8);
    for (const dx of [-14, 14]) {
      g.beginPath();
      g.arc(x + dx, BP - 132, 7, 0, TAU);
      g.fill();
      g.fillStyle = "#fff2c0";
      g.beginPath();
      g.arc(x + dx, BP - 132, 5, 0, TAU);
      g.fill();
      g.fillStyle = "#14121c";
    }
    post.push(() => {
      glowAt(g, x - 14, BP - 132, 48, [255, 220, 140], 0.5 * V.glow);
      glowAt(g, x + 14, BP - 132, 48, [255, 220, 140], 0.5 * V.glow);
    });
  }
  // entrada do metrô: grade e as duas lâmpadas verdes
  const sx = 470;
  g.fillStyle = "#14121c";
  g.fillRect(sx, BP - 50, 4, 54);
  g.fillRect(sx + 66, BP - 50, 4, 54);
  g.fillRect(sx, BP - 50, 70, 3);
  g.fillRect(sx, BP - 28, 70, 3);
  for (const dx of [2, 68]) {
    g.fillRect(sx + dx - 1.5, BP - 74, 3, 24);
    g.fillStyle = "#38d27a";
    g.beginPath();
    g.arc(sx + dx, BP - 80, 7, 0, TAU);
    g.fill();
    g.fillStyle = "#14121c";
  }
  post.push(() => {
    glowAt(g, sx + 2, BP - 80, 40, [60, 240, 140], 0.6 * V.glow);
    glowAt(g, sx + 68, BP - 80, 40, [60, 240, 140], 0.6 * V.glow);
  });
  // hidrante-fantasia ao fundo, lixeira e jornal
  g.fillStyle = "#3a3d4c";
  g.fillRect(1000, BP - 34, 24, 38);
  g.fillStyle = "#575b70";
  g.fillRect(998, BP - 38, 28, 6);
  g.fillStyle = "rgba(255,255,255,0.12)";
  for (let i = 0; i < 3; i++) g.fillRect(1002, BP - 28 + i * 9, 20, 2);
}

// ---------------------------------------------------------------------------- montagem das camadas
const GENS = {
  la: { far: laFar, mid: laMid, props: laProps },
  miami: { far: miamiFar, mid: miamiMid, props: miamiProps },
  ny: { far: nyFar, mid: nyMid, props: nyProps },
};

function finish(g, w, h, tintColor, lights, post) {
  tint(g, w, h, tintColor);
  for (const L of lights) {
    g.fillStyle = L[4] ?? "#fff";
    if (L[0] === "arc") {
      g.fillStyle = L[4];
      g.beginPath();
      g.arc(L[1], L[2], L[3], 0, TAU);
      g.fill();
    } else g.fillRect(L[0], L[1], L[2], L[3]);
  }
  for (const fn of post) fn();
}

function buildLayer(kind, v, layer) {
  const V = VARIANTS[kind][v];
  const seed = { far: 101, mid: 211, props: 307 }[layer] + kind.length * 17; // mesma semente nas duas versões: a mistura alinha
  const rnd = seeded(seed);
  const [w, h] = layer === "far" ? [PF, LH] : layer === "mid" ? [PM, LH] : [PP, PH];
  const cv = mk(w, h);
  const g = cv.getContext("2d");
  const lights = [];
  const post = [];
  GENS[kind][layer](g, V, rnd, lights, post);
  // a camada distante só leva névoa; os prédios e adereços levam a cor da luz do fim do dia
  finish(g, w, h, layer === "far" ? V.haze : V.dark, layer === "far" ? [] : lights, post);
  return cv;
}

const CACHE = new Map();
function layers(kind, v) {
  const key = `${kind}:${v}`;
  if (!CACHE.has(key)) CACHE.set(key, { far: buildLayer(kind, v, "far"), mid: buildLayer(kind, v, "mid"), props: buildLayer(kind, v, "props") });
  return CACHE.get(key);
}

// estrela da Calçada da Fama (LA)
const STAR_PTS = (() => {
  const out = [];
  for (let i = 0; i < 10; i++) {
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    const r = i % 2 ? 4.6 : 11;
    out.push(new me.Vector2d(Math.cos(a) * r, Math.sin(a) * r));
  }
  return out;
})();
const STAR_POLY = new me.Polygon(0, 0, STAR_PTS);

export class City {
  /** @param kind "la" | "miami" | "ny" */
  constructor(kind, keyCount) {
    this.kind = kind;
    this.n = Math.min(2, keyCount);
    this.v = [];
    for (let i = 0; i < this.n; i++) this.v.push(layers(kind, i));
  }

  tile(r, cv, period, off, y) {
    const o = Math.floor(off % period);
    for (let x = -o; x < W; x += period) r.drawImage(cv, x, y);
  }

  /** camadas de cenário (atrás do skatista); pal = paleta atual (zone/k) */
  draw(r, scroll, pal) {
    const i = Math.min(pal.zone, this.n - 1);
    const j = Math.min(i + 1, this.n - 1);
    const k = i === j ? 0 : pal.k;
    const specs = [["far", PF, 0.1, LAYER_Y], ["mid", PM, 0.3, LAYER_Y], ["props", PP, 0.62, PROP_Y]];
    for (const [name, period, f, y] of specs) {
      r.setGlobalAlpha(1);
      this.tile(r, this.v[i][name], period, scroll * f, y);
      if (k > 0.002) {
        r.setGlobalAlpha(k);
        this.tile(r, this.v[j][name], period, scroll * f, y);
        r.setGlobalAlpha(1);
      }
    }
  }

  /** detalhes do chão de cada cidade (por cima da calçada base) */
  ground(r, scroll, time, p) {
    const sy = GROUND_Y + 29;
    if (this.kind === "la") {
      // estrelas rosa da Calçada da Fama
      const period = 470;
      const o = scroll % period;
      for (let x = -o + 120; x < W + 20; x += period) {
        r.save();
        r.translate(x, sy);
        setRGB(r, [230, 214, 150]);
        r.fillPolygon(STAR_POLY);
        r.scale(0.78, 0.78);
        setRGB(r, [222, 98, 140]);
        r.fillPolygon(STAR_POLY);
        r.restore();
      }
    } else if (this.kind === "miami") {
      // lajes alternadas (terrazzo) e meio-fio com neon à noite
      const seam = 96;
      const o = scroll % (seam * 2);
      for (let x = -o; x < W; x += seam * 2) {
        setRGB(r, [120, 220, 230], 0.28);
        r.fillRect(x + seam, GROUND_Y + 12, seam, 34);
      }
      if (p.lit > 0.4) {
        setRGB(r, [90, 240, 255], 0.85 * p.lit);
        r.fillRect(0, GROUND_Y + 46, W, 3);
        setRGB(r, [255, 79, 168], 0.18 * p.lit);
        r.fillRect(0, GROUND_Y + 49, W, 6);
      }
      r.setGlobalAlpha(1);
    } else {
      // grades do metrô com vapor subindo
      const period = 760;
      const o = scroll % period;
      for (let x = -o + 260; x < W + 60; x += period) {
        setRGB(r, [20, 20, 28]);
        r.fillRect(x - 30, GROUND_Y + 16, 60, 22);
        setRGB(r, [70, 72, 88]);
        for (let i = 0; i < 6; i++) r.fillRect(x - 27 + i * 10, GROUND_Y + 18, 6, 18);
        r.setColor("#ffffff");
        for (let i = 0; i < 6; i++) {
          const q = (time * 0.55 + i / 6) % 1;
          r.setGlobalAlpha(0.2 * (1 - q) * (0.5 + 0.5 * p.lit));
          r.fillArc(x + Math.sin(time * 1.3 + i * 1.7) * 9 * q, GROUND_Y + 16 - q * 150, 7 + q * 22, 0, TAU);
        }
        r.setGlobalAlpha(1);
      }
    }
  }
}
