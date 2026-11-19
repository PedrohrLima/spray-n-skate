import * as me from "melonjs";

/**
 * Personagens e veículos das cutscenes, desenhados com o renderer da melonJS (sem imagens):
 *  - drawPerson: o pichador (HERO) e o guarda (COP), com membros por cinemática inversa
 *  - drawBoard:  o skate
 *  - drawCar / drawHeli / drawBeam: viatura, helicóptero e o facho do holofote
 * Tudo é desenhado em coordenadas locais "olhando para a direita", com a origem no chão.
 */
const FONT = '"Bungee", Impact, "Arial Black", sans-serif';

export const HERO = {
  kind: "hero", skin: "#f2c58f", shirt: "#e63946", shirtD: "#a8232f", pants: "#243b6b", pantsD: "#17264a",
  shoe: "#f4f1de", stripe: "#d62828", hair: "#3a2a22",
};
export const COP = {
  kind: "cop", skin: "#e2ad7e", shirt: "#2f6fd6", shirtD: "#1d4aa0", pants: "#1a2340", pantsD: "#111830",
  shoe: "#15151f", stripe: "#15151f", hair: "#2a2018",
};

export const COP2 = { ...COP, skin: "#8d5a3b", hair: "#1a120c", shirt: "#3b78e0", shirtD: "#2456b0" };

const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

/** segmento (membro) entre dois pontos */
function limb(r, x1, y1, x2, y2, th, color) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  const len = Math.hypot(dx, dy);
  r.save();
  r.translate(x1, y1);
  r.rotate(Math.atan2(dy, dx));
  r.setColor(color);
  r.fillRect(-th / 2, -th / 2, len + th, th);
  r.restore();
}

/** cinemática inversa de 2 ossos: devolve [joelhoX, joelhoY, pontaX, pontaY] */
function ik(x0, y0, x1, y1, l1, l2, dir) {
  let dx = x1 - x0;
  let dy = y1 - y0;
  let d = Math.hypot(dx, dy) || 0.001;
  const max = l1 + l2 - 0.5;
  if (d > max) {
    dx *= max / d;
    dy *= max / d;
    d = max;
  }
  const min = Math.abs(l1 - l2) + 0.5;
  if (d < min) d = min;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const ux = dx / d;
  const uy = dy / d;
  return [x0 + ux * a - uy * h * dir, y0 + uy * a + ux * h * dir, x0 + dx, y0 + dy];
}

/** polígono preenchido a partir de uma lista [[x,y],...] (coordenadas locais) */
export function poly(r, pts) {
  r.fillPolygon(new me.Polygon(0, 0, pts.map((p) => new me.Vector2d(p[0], p[1]))));
}

function drawHead(r, hx, hy, look, pal, shock, mood, sweat) {
  r.setColor(pal.skin);
  r.fillRect(hx - 7, hy - 8, 15, 15);
  if (pal.kind === "hero") {
    r.setColor(pal.hair);
    r.fillRect(look > 0 ? hx - 9 : hx + 4, hy - 6, 5, 9);
    r.setColor("#ffb703"); // boné
    r.fillRect(hx - 9, hy - 12, 19, 7);
    r.fillRect(look > 0 ? hx + 6 : hx - 15, hy - 7, 9, 3);
  } else {
    r.setColor("#1b2b6b"); // quepe
    r.fillRect(hx - 9, hy - 13, 19, 7);
    r.fillRect(hx - 7, hy - 16, 15, 4);
    r.setColor("#0d0d16");
    r.fillRect(look > 0 ? hx + 4 : hx - 13, hy - 7, 9, 3);
    r.setColor("#ffd23f"); // distintivo
    r.fillRect(hx - 2, hy - 12, 5, 4);
    r.setColor(pal.hair); // bigode
    r.fillRect(hx + look * 2 - 3, hy + 1, 8, 2);
  }
  const ex = hx + look * 3;
  if (shock) {
    r.setColor("#ffffff");
    r.fillRect(ex - 3, hy - 4, 7, 6);
    r.setColor("#1a1a1a");
    r.fillRect(ex - 1 + look, hy - 3, 3, 4);
    r.setColor("#4a0d18"); // boca aberta
    r.fillRect(hx + look * 3 - 2, hy + 3, 5, 4);
  } else {
    r.setColor("#1a1a1a");
    r.fillRect(ex - 1, hy - 3, 3, mood === "smile" ? 2 : 3);
    if (mood === "smile") {
      r.setColor("#7a3b2a"); // sorriso de canto
      r.fillRect(hx + look * 2 - 1, hy + 3, 6, 2);
      r.fillRect(hx + look * 2 + (look > 0 ? 5 : -2), hy + 2, 1, 1);
    }
  }
  if (sweat !== undefined) {
    r.setColor("#8fd0ff"); // gota de suor escorrendo
    r.fillRect(hx - look * 11, hy - 6 + (sweat % 1) * 12, 3, 5);
  }
}

/** lata de spray: corpo, tampa colorida e bico. Devolve a posição da ponta do bico. */
function drawCan(r, x, y, ang, color) {
  r.save();
  r.translate(x, y);
  r.rotate(ang);
  r.setColor("#10101c");
  r.fillRect(-3, -5, 17, 10);
  r.setColor("#c3c8d8");
  r.fillRect(-2, -4, 14, 8);
  r.setColor(color);
  r.fillRect(2, -4, 5, 8); // rótulo
  r.setColor("#10101c");
  r.fillRect(12, -3, 5, 6);
  r.setColor("#ffffff");
  r.fillRect(16, -1, 3, 2); // bico
  r.restore();
  return [x + Math.cos(ang) * 19, y + Math.sin(ang) * 19];
}

/** o skate; (x, y) = centro do deck, ang em radianos */
export function drawBoard(r, x, y, ang = 0, len = 64, th = 6, color = "#2ec4b6") {
  r.save();
  r.translate(x, y);
  r.rotate(ang);
  r.setColor("#1b1b2b");
  r.fillRect(-len / 2 + 7, th / 2 - 1, 7, 3);
  r.fillRect(len / 2 - 14, th / 2 - 1, 7, 3);
  r.setColor("#f4f1de");
  r.fillArc(-len / 2 + 11, th / 2 + 2, 4.5, 0, Math.PI * 2);
  r.fillArc(len / 2 - 11, th / 2 + 2, 4.5, 0, Math.PI * 2);
  r.setColor(color);
  r.fillRect(-len / 2, -th / 2, len, th);
  r.fillRect(-len / 2 - 3, -th / 2 - 3, 6, 4);
  r.fillRect(len / 2 - 3, -th / 2 - 3, 6, 4);
  r.setColor("#1b8f85");
  r.fillRect(-len / 2 + 4, -th / 2, len - 8, 2);
  r.restore();
}

/**
 * Uma pessoa. (x, y) = chão sob o corpo; o resto é opcional:
 *  face (±1) · scale · look (±1, para onde a cabeça olha) · shock · lean · hipX/hipY
 *  footF/footR = [x, y] dos pés · armF/armR = [dx, dy] da mão em relação ao ombro
 *  can = cor da tampa da lata na mão da frente · baton = cacetete na mão da frente
 *  board = { y, ang } desenha o skate sob os pés
 * Devolve { shoulder, head, hand, tip } em coordenadas locais (tip = ponta do bico da lata).
 */
export function drawPerson(r, x, y, o = {}) {
  const pal = o.pal || HERO;
  const lean = o.lean ?? 0.08;
  const hipX = o.hipX ?? 0;
  const hipY = o.hipY ?? -38;
  const footF = o.footF || [10, 0];
  const footR = o.footR || [-8, 0];
  const look = o.look ?? 1;
  const shoulder = [hipX + Math.sin(lean) * 21, hipY - Math.cos(lean) * 21];
  const head = [shoulder[0] + Math.sin(lean * 1.4) * 13, shoulder[1] - Math.cos(lean * 1.4) * 14];
  const armF = o.armF || [6, 22];
  const armR = o.armR || [-6, 22];
  const hF = [shoulder[0] + armF[0], shoulder[1] + armF[1]];
  const hR = [shoulder[0] + armR[0], shoulder[1] + armR[1]];

  r.save();
  r.translate(x, y);
  r.scale((o.face ?? 1) * (o.scale ?? 1), o.scale ?? 1);
  if (o.board) drawBoard(r, 0, o.board.y ?? -9, o.board.ang ?? 0, 64, 6, o.board.color);

  const legR = ik(hipX - 2, hipY, footR[0], footR[1], 17, 17, -1);
  const legF = ik(hipX + 2, hipY, footF[0], footF[1], 17, 17, -1);
  const aR = ik(shoulder[0] - 3, shoulder[1] + 1, hR[0], hR[1], 12, 12, 1);
  const aF = ik(shoulder[0] + 3, shoulder[1] + 1, hF[0], hF[1], 12, 12, 1);

  // perna e braço de trás
  limb(r, hipX - 2, hipY, legR[0], legR[1], 8, pal.pantsD);
  limb(r, legR[0], legR[1], legR[2], legR[3], 7, pal.pantsD);
  r.setColor(pal.shoe);
  r.fillRect(legR[2] - 6, legR[3] - 3, 13, 6);
  limb(r, shoulder[0] - 3, shoulder[1] + 1, aR[0], aR[1], 6, pal.shirtD);
  limb(r, aR[0], aR[1], aR[2], aR[3], 5, pal.skin);
  // tronco
  limb(r, hipX, hipY, shoulder[0], shoulder[1], 15, pal.shirt);
  if (pal.kind === "hero") limb(r, hipX + 1, hipY - 6, shoulder[0] + 1, shoulder[1] + 6, 4, "#f4f1de");
  else {
    limb(r, hipX, hipY + 2, hipX + (shoulder[0] - hipX) * 0.12, hipY - 2, 16, "#0d0d16"); // cinto
    r.setColor("#ffd23f");
    r.fillRect(shoulder[0] + 2, shoulder[1] + 6, 4, 4); // distintivo no peito
  }
  // perna da frente
  limb(r, hipX + 2, hipY, legF[0], legF[1], 8, pal.pants);
  limb(r, legF[0], legF[1], legF[2], legF[3], 7, pal.pants);
  r.setColor(pal.shoe);
  r.fillRect(legF[2] - 5, legF[3] - 3, 14, 6);
  r.setColor(pal.stripe);
  r.fillRect(legF[2] - 5, legF[3] + 1, 14, 2);
  // cabeça
  drawHead(r, head[0], head[1], look, pal, !!o.shock, o.mood, o.sweat);
  // braço da frente (por cima) + objeto na mão
  limb(r, shoulder[0] + 3, shoulder[1] + 1, aF[0], aF[1], 6, pal.shirt);
  limb(r, aF[0], aF[1], aF[2], aF[3], 5, pal.skin);
  r.setColor(pal.skin);
  r.fillRect(aF[2] - 3, aF[3] - 3, 6, 6);
  let tip = [aF[2], aF[3]];
  const ang = Math.atan2(aF[3] - aF[1], aF[2] - aF[0]);
  if (o.can) tip = drawCan(r, aF[2], aF[3], o.canAng ?? ang, o.can);
  else if (o.prop === "baton") {
    r.save();
    r.translate(aF[2], aF[3]);
    r.rotate(o.propAng ?? ang);
    r.setColor("#0d0d16");
    r.fillRect(-3, -2, 20, 4);
    r.restore();
  } else if (o.prop === "light") {
    const pa = o.propAng ?? ang;
    r.save();
    r.translate(aF[2], aF[3]);
    r.rotate(pa);
    r.setColor("#0d0d16");
    r.fillRect(-3, -3, 16, 6);
    r.setColor("#9aa0b8");
    r.fillRect(2, -2, 8, 4);
    r.setColor("#fff7c2");
    r.fillRect(13, -4, 4, 8);
    r.restore();
    tip = [aF[2] + Math.cos(pa) * 18, aF[3] + Math.sin(pa) * 18];
  } else if (o.prop === "whistle") {
    r.setColor("#ffd23f");
    r.fillRect(aF[2] - 1, aF[3] - 3, 7, 5);
    r.setColor("#10101c");
    r.fillRect(aF[2] + 2, aF[3] - 2, 2, 2);
  }
  r.restore();
  return { shoulder, head, hand: [aF[2], aF[3]], tip };
}

let carText = null;
function carLabel() {
  if (!carText) {
    carText = document.createElement("canvas");
    carText.width = 84;
    carText.height = 20;
    const g = carText.getContext("2d");
    g.font = `15px ${FONT}`;
    g.fillStyle = "#1c2c68";
    g.textAlign = "center";
    g.textBaseline = "middle";
    g.fillText("POLÍCIA", 42, 11);
  }
  return carText;
}

/** viatura de polícia olhando para a direita; (x, y) = chão sob o centro */
export function drawCar(r, x, y, o = {}) {
  const t = o.t || 0;
  const lit = Math.floor(t * 6) % 2 === 0;
  r.save();
  r.translate(x, y);
  // sombra
  r.setColor("#000000");
  r.setGlobalAlpha(0.3);
  r.fillEllipse(0, 2, 104, 7);
  r.setGlobalAlpha(1);
  r.rotate(o.tilt || 0);
  // feixe dos faróis
  r.setColor("#fff3a3");
  r.setGlobalAlpha(0.12);
  poly(r, [[96, -34], [300, -66], [300, 8], [96, -26]]);
  r.setGlobalAlpha(1);
  // carroceria
  r.setColor("#0b0b16");
  r.fillRoundRect(-101, -45, 202, 33, 9);
  r.setColor("#1c2c68");
  r.fillRoundRect(-98, -43, 196, 29, 8);
  r.setColor("#f4f6ff"); // portas brancas
  r.fillRect(-62, -43, 100, 24);
  r.setColor("#e63946");
  r.fillRect(-62, -20, 100, 3);
  r.drawImage(carLabel(), -52, -41);
  // cabine
  r.setColor("#0b0b16");
  poly(r, [[-56, -42], [-37, -70], [40, -70], [64, -42]]);
  r.setColor("#f4f6ff");
  poly(r, [[-52, -43], [-35, -67], [38, -67], [60, -43]]);
  r.setColor("#8fd0ff"); // vidros
  poly(r, [[-30, -63], [-5, -63], [-5, -45], [-46, -45]]);
  poly(r, [[2, -63], [34, -63], [53, -45], [2, -45]]);
  r.setColor("#1c2c68");
  r.fillRect(-4, -64, 4, 20); // coluna
  // barra de luzes
  r.setColor("#10101c");
  r.fillRect(-18, -76, 42, 7);
  r.setColor(lit ? "#ff2a3d" : "#6f1420");
  r.fillRect(-16, -80, 18, 8);
  r.setColor(lit ? "#16336e" : "#2a7bff");
  r.fillRect(4, -80, 18, 8);
  if (o.lights !== false) {
    r.setColor(lit ? "#ff2a3d" : "#2a7bff");
    r.setGlobalAlpha(0.3);
    r.fillArc(lit ? -7 : 13, -78, 34, 0, Math.PI * 2);
    r.setGlobalAlpha(1);
  }
  // portas abertas (os policiais saem por elas)
  const dd = o.doors || 0;
  if (dd > 0) {
    for (const [hx, dir] of [[40, 1], [-62, -1]]) {
      const ex = hx + dir * 36 * dd;
      r.setColor("#0b0b16");
      poly(r, [[hx - dir * 1, -45], [hx - dir * 1, -17], [ex + dir * 3, -10], [ex + dir * 3, -40]]);
      r.setColor("#f4f6ff");
      poly(r, [[hx, -43], [hx, -19], [ex, -12], [ex, -38]]);
      r.setColor("#1c2c68");
      poly(r, [[hx, -29], [hx, -24], [ex, -17], [ex, -22]]);
    }
  }
  // faróis e lanternas
  r.setColor("#fff3a3");
  r.fillRect(92, -38, 9, 9);
  r.setColor("#ff3b3b");
  r.fillRect(-101, -38, 6, 9);
  // para-choques
  r.setColor("#0b0b16");
  r.fillRect(-103, -22, 8, 8);
  r.fillRect(95, -22, 8, 8);
  // rodas
  for (const wx of [-60, 58]) {
    r.setColor("#0b0b16");
    r.fillArc(wx, -15, 17, 0, Math.PI * 2);
    r.setColor("#2a2c40");
    r.fillArc(wx, -15, 12, 0, Math.PI * 2);
    r.setColor("#c7cbe0");
    r.fillArc(wx, -15, 7, 0, Math.PI * 2);
    r.save();
    r.translate(wx, -15);
    r.rotate(o.wheel || 0);
    r.setColor("#2a2c40");
    r.fillRect(-1, -7, 2, 14);
    r.fillRect(-7, -1, 14, 2);
    r.restore();
  }
  r.restore();
}

/** helicóptero olhando para a direita; (x, y) = centro do corpo */
export function drawHeli(r, x, y, t = 0) {
  r.save();
  r.translate(x, y);
  // cauda
  r.setColor("#0b0b16");
  r.fillRect(-112, -9, 76, 11);
  r.setColor("#1d2a52");
  r.fillRect(-110, -7, 74, 7);
  poly(r, [[-116, -7], [-100, -7], [-108, -30], [-118, -30]]);
  // rotor da cauda
  r.setColor("#c9d1ff");
  r.setGlobalAlpha(0.5);
  r.fillEllipse(-112, -20, 3, 12 * Math.abs(Math.cos(t * 30)) + 2);
  r.setGlobalAlpha(1);
  // corpo
  r.setColor("#0b0b16");
  r.fillEllipse(0, 0, 50, 25);
  r.setColor("#1d2a52");
  r.fillEllipse(0, 0, 47, 22);
  r.setColor("#8fd0ff"); // cabine
  r.fillEllipse(24, -3, 21, 14);
  r.setColor("#e63946");
  r.fillRect(-30, 2, 40, 3);
  // patins
  r.setColor("#0b0b16");
  r.fillRect(-38, 24, 80, 4);
  r.fillRect(-22, 17, 4, 8);
  r.fillRect(16, 17, 4, 8);
  // mastro e hélice
  r.fillRect(-3, -34, 6, 12);
  const k = Math.abs(Math.cos(t * 22));
  r.setColor("#10101c");
  r.fillRect(-92 * (0.25 + 0.75 * k), -38, 184 * (0.25 + 0.75 * k), 4);
  r.setColor("#c9d1ff");
  r.setGlobalAlpha(0.35);
  r.fillEllipse(0, -36, 96, 5);
  r.setGlobalAlpha(1);
  // luz piscando
  r.setColor(Math.floor(t * 4) % 2 ? "#ff2a3d" : "#6f1420");
  r.fillArc(-116, -31, 3, 0, Math.PI * 2);
  r.restore();
}

/** facho do holofote: do ponto (sx, sy) até uma mancha de luz no chão em (tx, ty) */
export function drawBeam(r, sx, sy, tx, ty, w = 70, a = 1) {
  r.setColor("#fff7c2");
  r.setGlobalAlpha(0.2 * a);
  poly(r, [[sx - 6, sy], [sx + 6, sy], [tx + w, ty], [tx - w, ty]]);
  r.setGlobalAlpha(0.28 * a);
  r.fillEllipse(tx, ty, w, w * 0.2);
  r.setGlobalAlpha(1);
}

/** brilho em estrela de 4 pontas (a = opacidade, s = tamanho) */
export function drawSparkle(r, x, y, s, a = 1, color = "#ffffff") {
  r.setColor(color);
  r.setGlobalAlpha(a);
  const w = s * 0.18;
  poly(r, [[x, y - s], [x + w, y - w], [x + s, y], [x + w, y + w], [x, y + s], [x - w, y + w], [x - s, y], [x - w, y - w]]);
  r.setGlobalAlpha(1);
}
