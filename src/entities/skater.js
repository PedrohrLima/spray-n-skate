import * as me from "melonjs";
import { W, H, GROUND_Y, PLAYER_X, GRAVITY, JUMP_V, GRIND_POP_V, TRICKS } from "../config.js";

const SKIN = "#f2c58f";
const SHIRT = "#e63946";
const SHIRT_D = "#a8232f";
const PANTS = "#243b6b";
const PANTS_D = "#17264a";
const SHOE = "#f4f1de";
const CAP = "#ffb703";
const DECK = "#2ec4b6";
const DECK_BOTTOM = "#ff6b9d";
const WHEEL = "#f4f1de";
const HAIR = "#3a2a22";

const clamp = (v, a, b) => Math.max(a, Math.min(b, v));
const rot = (x, y, a) => [x * Math.cos(a) - y * Math.sin(a), x * Math.sin(a) + y * Math.cos(a)];

// segmento (membro) entre dois pontos
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
// cinemática inversa de 2 ossos -> posição do joelho/cotovelo
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

export class Skater extends me.Renderable {
  constructor() {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.alwaysUpdate = true;
    this.events = {};
    this.t = 0;
    this.reset();
  }

  reset() {
    this.state = "ride"; // ride | air | grind | bail
    this.y = GROUND_Y;
    this.prevY = GROUND_Y;
    this.vy = 0;
    this.offsetX = 0;
    this.tricks = new Set();
    this.trick = null;
    this.pending = null;
    this.pendingT = 0;
    this.ollieBuf = 0;
    this.downBuf = 0;
    this.squash = 0;
    this.invuln = 0;
    this.grindObs = null;
    this.grindT = 0;
    this.bail = null;
    this.celebrate = false;
    this.frozen = false;
    this.speed = 0;
    this.airTime = 0;
  }

  get airborne() {
    return this.state === "air";
  }
  emit(name, ...a) {
    if (this.events[name]) this.events[name](...a);
  }

  // ------------------------------------------------------------ lógica
  /** inp: {ollie, kickflip, shoveit, grab, down} (down = segurado; o resto = apertado neste frame) */
  tick(dt, inp, speed) {
    this.t += dt;
    this.speed = speed;
    this.prevY = this.y;
    if (this.invuln > 0) this.invuln -= dt;
    if (this.squash > 0) this.squash -= dt;
    this.ollieBuf = inp.ollie ? 0.13 : Math.max(0, this.ollieBuf - dt);
    this.downBuf = inp.down ? 0.16 : Math.max(0, this.downBuf - dt);
    if (this.state === "bail") return this.tickBail(dt);
    if (this.frozen) return;

    for (const name of Object.keys(TRICKS)) if (inp[name]) this.requestTrick(name);

    if (this.state === "ride" && this.ollieBuf > 0) this.jump();

    if (this.state === "grind") this.grindT += dt;

    if (this.state === "air") {
      this.airTime += dt;
      this.vy += GRAVITY * dt;
      this.y += this.vy * dt;
      if (this.trick) {
        this.trick.t += dt;
        if (this.trick.t >= this.trick.dur) {
          this.trick = null;
          if (this.pending && this.pendingT > 0) this.startTrick(this.pending);
          this.pending = null;
        }
      }
      if (this.pending) {
        this.pendingT -= dt;
        if (this.pendingT <= 0) this.pending = null;
      }
      if (this.y >= GROUND_Y) this.land();
    }
  }

  requestTrick(name) {
    if (this.state !== "air" || this.tricks.has(name)) return;
    if (!this.trick) this.startTrick(name);
    else if (this.trick.name !== name) {
      this.pending = name;
      this.pendingT = 0.22;
    }
  }
  startTrick(name) {
    if (this.tricks.has(name)) return;
    this.tricks.add(name);
    this.trick = { name, t: 0, dur: TRICKS[name].dur };
    this.emit("trick", name);
  }
  jump(power = 1) {
    this.state = "air";
    this.vy = JUMP_V * power;
    this.tricks = new Set();
    this.trick = null;
    this.pending = null;
    this.squash = 0.09;
    this.airTime = 0;
    this.ollieBuf = 0;
    this.emit("jump");
  }
  land() {
    this.y = GROUND_Y;
    this.vy = 0;
    this.state = "ride";
    this.trick = null;
    this.squash = 0.1;
    this.emit("land", this.tricks.size);
  }
  startGrind(obs, topY) {
    this.state = "grind";
    this.y = topY;
    this.prevY = topY;
    this.vy = 0;
    this.grindObs = obs;
    this.grindT = 0;
    this.trick = null;
    this.pending = null;
    this.tricks = new Set();
    this.emit("grindStart");
  }
  /** mode: 'end' (saída automática) | 'jump' | 'release' */
  endGrind(mode) {
    this.grindObs = null;
    if (mode === "jump") this.jump(0.85);
    else {
      this.state = "air";
      this.vy = mode === "end" ? GRIND_POP_V : 0;
      this.airTime = 0;
    }
    this.emit("grindEnd", mode);
  }

  startBail(kind) {
    this.grindObs = null;
    this.trick = null;
    this.state = "bail";
    const fall = this.y < GROUND_Y - 4;
    this.bail = {
      t: 0,
      kind,
      x: 0,
      y: this.y,
      vx: 150,
      vy: fall ? Math.max(this.vy, 0) * 0.3 - 100 : -520,
      rot: 0,
      vr: 9,
      bd: { x: PLAYER_X + 30, y: this.y - 10, vx: 380, vy: -640, rot: 0, vr: 14 },
    };
    this.emit("bail", kind);
  }
  tickBail(dt) {
    const b = this.bail;
    b.t += dt;
    const g = 2400;
    b.vy += g * dt;
    b.y += b.vy * dt;
    b.x += b.vx * dt;
    b.rot += b.vr * dt;
    if (b.y >= GROUND_Y) {
      b.y = GROUND_Y;
      if (b.vy > 160) {
        b.vy *= -0.32;
        b.vr *= 0.5;
        this.emit("bounce");
      } else b.vy = 0;
      b.vx *= 1 - Math.min(1, dt * 4);
      b.vr *= 1 - Math.min(1, dt * 3);
    }
    const d = b.bd;
    d.vy += g * dt;
    d.x += d.vx * dt;
    d.y += d.vy * dt;
    d.rot += d.vr * dt;
    if (d.y >= GROUND_Y - 4) {
      d.y = GROUND_Y - 4;
      if (d.vy > 150) d.vy *= -0.4;
      else d.vy = 0;
      d.vx *= 1 - Math.min(1, dt * 3);
      d.vr *= 1 - Math.min(1, dt * 3);
    }
  }
  /** volta a andar depois do tombo */
  respawn() {
    this.reset();
    this.invuln = 1.9;
  }

  update() {
    return true;
  }

  // ------------------------------------------------------------ desenho
  draw(r) {
    const ox = PLAYER_X + this.offsetX;
    if (this.state === "bail") return this.drawBail(r);

    // sombra (encolhe com a altura)
    const h = Math.max(0, GROUND_Y - this.y);
    r.setColor("#000000");
    r.setGlobalAlpha(clamp(0.3 - h / 700, 0.08, 0.3));
    r.fillEllipse(ox, GROUND_Y + 4, clamp(30 - h / 12, 12, 30), 5);
    r.setGlobalAlpha(1);

    r.save();
    r.translate(ox, this.y);
    if (this.invuln > 0 && Math.floor(this.t * 14) % 2 === 0) r.setGlobalAlpha(0.35);
    this.drawRider(r);
    r.restore();
    r.setGlobalAlpha(1);
  }

  // monta a pose e desenha o skatista (origem = ponto de contato das rodas)
  drawRider(r) {
    const st = this.state;
    const bobAmp = st === "ride" ? clamp(this.speed / 500, 0, 1) : 0;
    const bob = Math.sin(this.t * 16) * 1.4 * bobAmp;
    const sq = this.squash > 0 ? this.squash / 0.1 : 0;

    // ---- tábua
    let bx = 0;
    let by = -9;
    let bAng = 0;
    let len = 64;
    let th = 6;
    let flipColor = false;
    let hipX = 0;
    let hipY = -38 + bob + sq * 7;
    let lean = 0.1;
    let hands = "ride";

    if (st === "air") {
      bAng = clamp(this.vy / 2300, -0.42, 0.42);
      by = -14;
      hipY = -36 - clamp(-this.vy / 140, -1, 4);
      lean = 0.12 + clamp(this.vy / 5000, -0.1, 0.2);
      hands = "air";
    } else if (st === "grind") {
      by = -9;
      hipY = -30;
      lean = 0.28;
      hands = "grind";
    }
    if (this.celebrate) {
      hands = "cheer";
      hipY = -38 - Math.abs(Math.sin(this.t * 7)) * 8;
      by = -9 - Math.abs(Math.sin(this.t * 7)) * 8;
    }

    const tk = this.trick;
    if (tk) {
      const p = tk.t / tk.dur;
      if (tk.name === "kickflip") {
        const s = Math.sin(p * Math.PI * 2);
        th = 5 + 15 * Math.abs(s);
        flipColor = Math.cos(p * Math.PI * 2) < 0;
        by = -18 - 6 * Math.sin(p * Math.PI);
      } else if (tk.name === "shoveit") {
        len = 64 * Math.abs(Math.cos(p * Math.PI * 2));
        len = Math.max(len, 6);
        flipColor = p > 0.25 && p < 0.75;
        by = -18 - 6 * Math.sin(p * Math.PI);
      } else if (tk.name === "grab") {
        const k = Math.sin(clamp(p, 0, 1) * Math.PI);
        by = -14 - 14 * k;
        bAng = -0.22 * k;
        hipY = -36 + 3 * k;
        hands = "grab";
      }
      lean = 0.05;
    }

    // ---- pontos de apoio dos pés na tábua
    const [fx, fy] = rot(15, -th / 2 - 1, bAng);
    const [rx, ry] = rot(-15, -th / 2 - 1, bAng);
    const nose = rot(30, 0, bAng);
    const footF = [bx + fx, by + fy];
    const footR = [bx + rx, by + ry];

    // ---- tronco
    const shoulder = [hipX + Math.sin(lean) * 21, hipY - Math.cos(lean) * 21];
    const head = [shoulder[0] + Math.sin(lean * 1.4) * 13, shoulder[1] - Math.cos(lean * 1.4) * 14];

    // ---- desenha: tábua
    this.drawBoard(r, bx, by, bAng, len, th, flipColor);

    // ---- braços/pernas (IK)
    const handTarget = (side) => {
      const sx = shoulder[0];
      const sy = shoulder[1];
      const sw = Math.sin(this.t * 14) * 3 * bobAmp;
      switch (hands) {
        case "air":
          return side === "f" ? [sx + 20, sy - 2] : [sx - 19, sy - 7];
        case "grind":
          return side === "f" ? [sx + 25, sy + 8] : [sx - 24, sy + 4];
        case "cheer":
          return side === "f" ? [sx + 14, sy - 24] : [sx - 12, sy - 26];
        case "grab":
          return side === "f" ? [bx + nose[0] - 4, by + nose[1] - 2] : [sx - 20, sy - 4];
        default:
          return side === "f" ? [sx + 17, sy + 12 + sw] : [sx - 14, sy + 13 - sw];
      }
    };
    const hF = handTarget("f");
    const hR = handTarget("r");

    const legR = ik(hipX - 2, hipY, footR[0], footR[1], 17, 17, -1);
    const legF = ik(hipX + 2, hipY, footF[0], footF[1], 17, 17, -1);
    const armR = ik(shoulder[0] - 3, shoulder[1] + 1, hR[0], hR[1], 12, 12, 1);
    const armF = ik(shoulder[0] + 3, shoulder[1] + 1, hF[0], hF[1], 12, 12, 1);

    // perna e braço de trás
    limb(r, hipX - 2, hipY, legR[0], legR[1], 8, PANTS_D);
    limb(r, legR[0], legR[1], legR[2], legR[3], 7, PANTS_D);
    r.setColor(SHOE);
    r.fillRect(legR[2] - 6, legR[3] - 3, 13, 6);
    limb(r, shoulder[0] - 3, shoulder[1] + 1, armR[0], armR[1], 6, SHIRT_D);
    limb(r, armR[0], armR[1], armR[2], armR[3], 5, SKIN);
    // tronco
    limb(r, hipX, hipY, shoulder[0], shoulder[1], 15, SHIRT);
    r.setColor("#ffffff");
    limb(r, hipX + 1, hipY - 6, shoulder[0] + 1, shoulder[1] + 6, 4, "#f4f1de");
    // perna da frente
    limb(r, hipX + 2, hipY, legF[0], legF[1], 8, PANTS);
    limb(r, legF[0], legF[1], legF[2], legF[3], 7, PANTS);
    r.setColor(SHOE);
    r.fillRect(legF[2] - 5, legF[3] - 3, 14, 6);
    r.setColor("#d62828");
    r.fillRect(legF[2] - 5, legF[3] + 1, 14, 2);
    // cabeça + boné
    r.setColor(SKIN);
    r.fillRect(head[0] - 7, head[1] - 8, 15, 15);
    r.setColor(HAIR);
    r.fillRect(head[0] - 9, head[1] - 6, 5, 9);
    r.setColor(CAP);
    r.fillRect(head[0] - 9, head[1] - 12, 19, 7);
    r.fillRect(head[0] + 6, head[1] - 7, 9, 3);
    r.setColor("#1a1a1a");
    r.fillRect(head[0] + 3, head[1] - 3, 3, 3);
    // braço da frente
    limb(r, shoulder[0] + 3, shoulder[1] + 1, armF[0], armF[1], 6, SHIRT);
    limb(r, armF[0], armF[1], armF[2], armF[3], 5, SKIN);
    r.setColor(SKIN);
    r.fillRect(armF[2] - 3, armF[3] - 3, 6, 6);
  }

  drawBoard(r, bx, by, ang, len, th, flipColor) {
    r.save();
    r.translate(bx, by);
    r.rotate(ang);
    // rodas
    r.setColor("#1b1b2b");
    r.fillRect(-len / 2 + 7, th / 2 - 1, 7, 3);
    r.fillRect(len / 2 - 14, th / 2 - 1, 7, 3);
    r.setColor(WHEEL);
    const wy = th / 2 + 2;
    r.fillArc(-len / 2 + 11, wy, 4.5, 0, Math.PI * 2);
    r.fillArc(len / 2 - 11, wy, 4.5, 0, Math.PI * 2);
    // deck
    r.setColor(flipColor ? DECK_BOTTOM : DECK);
    r.fillRect(-len / 2, -th / 2, len, th);
    // pontas levantadas
    r.fillRect(-len / 2 - 3, -th / 2 - 3, 6, 4);
    r.fillRect(len / 2 - 3, -th / 2 - 3, 6, 4);
    if (!flipColor) {
      r.setColor("#1b8f85");
      r.fillRect(-len / 2 + 4, -th / 2, len - 8, 2);
    }
    r.restore();
  }

  drawBail(r) {
    const b = this.bail;
    // sombra
    r.setColor("#000000");
    r.setGlobalAlpha(0.25);
    r.fillEllipse(PLAYER_X + b.x, GROUND_Y + 4, 30, 5);
    r.setGlobalAlpha(1);
    // tábua voando
    r.save();
    r.translate(b.bd.x, b.bd.y);
    r.rotate(b.bd.rot);
    this.drawBoard(r, 0, 0, 0, 64, 6, true);
    r.restore();
    // corpo girando
    r.save();
    r.translate(PLAYER_X + b.x, b.y - 34);
    r.rotate(b.rot);
    r.translate(0, 34);
    const f = Math.sin(this.t * 24) * 0.6;
    this.drawFlail(r, f);
    r.restore();
  }
  drawFlail(r, f) {
    // pose "caindo": membros abertos
    const hipX = 0;
    const hipY = -38;
    limb(r, hipX, hipY, -12 + f * 6, -12, 8, PANTS_D);
    limb(r, hipX, hipY, 14 - f * 6, -14, 8, PANTS);
    r.setColor(SHOE);
    r.fillRect(-18 + f * 6, -14, 13, 6);
    r.fillRect(10 - f * 6, -16, 14, 6);
    limb(r, hipX, hipY, 0, -59, 15, SHIRT);
    limb(r, 0, -58, -24, -76 + f * 10, 6, SKIN);
    limb(r, 0, -58, 24, -72 - f * 10, 6, SKIN);
    r.setColor(SKIN);
    r.fillRect(-7, -81, 15, 15);
    r.setColor(CAP);
    r.fillRect(-9, -85, 19, 7);
    r.fillRect(6, -80, 9, 3);
    // olhinhos de "X"
    r.setColor("#1a1a1a");
    r.fillRect(1, -76, 4, 2);
  }
}
