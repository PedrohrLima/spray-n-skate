import * as me from "melonjs";
import { W, H, GROUND_Y, OBSTACLES, LEVELS } from "../config.js";
import { Label } from "../game/label.js";

const lerp = (a, b, t) => a + (b - a) * t;

export function obstacleWidth(def) {
  return def.parts.reduce((m, p) => Math.max(m, p.dx + p.w), 0);
}
export function obstacleHeight(def) {
  return def.parts.reduce((m, p) => Math.max(m, p.h), 0);
}

export class ObstacleField extends me.Renderable {
  constructor() {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.alwaysUpdate = true;
    this.list = [];
    this.level = LEVELS[0];
    this.spawned = 0;
    this.lastType = null;
    this.repeat = 0;
    this.nextGap = 0;
    this.time = 0;
    // pool de placas (Labels) com a tecla/manobra de cada obstáculo
    this.signs = [];
    for (let i = 0; i < 4; i++) {
      const lb = new Label(" ", { size: 20 });
      lb.hidden = true;
      this.signs.push(lb);
    }
  }

  configure(level) {
    this.level = level;
    this.reset();
  }

  reset() {
    for (const o of this.list) this.release(o);
    this.list.length = 0;
    this.spawned = 0;
    this.lastType = null;
    this.repeat = 0;
    this.nextGap = 0;
  }

  release(o) {
    if (o.sign) {
      o.sign.hidden = true;
      o.sign.used = false;
      o.sign = null;
    }
  }

  /** escolhe o próximo obstáculo: primeiro o "tutorial" da fase, depois sorteio pelos pesos */
  pickType(distM) {
    const lv = this.level;
    if (this.spawned < lv.tutorial.length) return lv.tutorial[this.spawned];
    // no Arcade os obstáculos mais difíceis só entram depois de certa distância
    const pool = Object.entries(lv.pool).filter(([k]) => !lv.unlock || distM >= (lv.unlock[k] || 0));
    const total = pool.reduce((a, [, w]) => a + w, 0);
    let tries = 0;
    for (;;) {
      let x = Math.random() * total;
      let id = pool[0][0];
      for (const [k, w] of pool) {
        x -= w;
        if (x <= 0) {
          id = k;
          break;
        }
      }
      // no máximo 2 iguais seguidos
      if (id !== this.lastType || this.repeat < 1 || tries > 6) return id;
      tries++;
    }
  }

  /** cria um obstáculo em x (borda esquerda) */
  spawn(x, speed, p = 0, distM = 0) {
    const type = this.pickType(distM);
    const def = OBSTACLES[type];
    if (type === this.lastType) this.repeat++;
    else this.repeat = 0;
    this.lastType = type;
    this.spawned++;
    const o = {
      type, def, x,
      w: obstacleWidth(def), h: obstacleHeight(def),
      judged: false, hit: false, grindOk: false, state: "pending",
      knock: null, sign: null, id: this.spawned,
    };
    const lb = this.signs.find((s) => !s.used);
    if (lb) {
      lb.used = true;
      lb.hidden = false;
      lb.set(`${def.keyLabel}  ·  ${def.hint}`);
      o.sign = lb;
    }
    this.list.push(o);
    // espaço livre até o próximo obstáculo: definido em SEGUNDOS (vezes a velocidade) e cresce com
    // a largura do obstáculo, porque pular algo largo "gasta" mais chão. O tempo diminui com p (0..1).
    const lv = this.level;
    const lo = lerp(lv.gap[0], lv.gapEnd[0], p);
    const hi = lerp(lv.gap[1], lv.gapEnd[1], p);
    const sec = lo + Math.random() * (hi - lo);
    const easy = this.spawned <= lv.tutorial.length ? 1.25 : 1;
    this.nextGap = (speed * sec + o.w * 0.6 + 40) * easy;
    return o;
  }

  /** o último obstáculo (mais à direita) */
  get last() {
    let best = null;
    for (const o of this.list) if (!o.knock && (!best || o.x > best.x)) best = o;
    return best;
  }

  /** derruba/remove obstáculos perto do jogador (depois de um tombo) */
  knockNear(maxX) {
    for (const o of this.list) {
      if (o.x < maxX && !o.knock) this.knockOver(o, 0.6);
    }
  }
  knockOver(o, power = 1) {
    o.knock = { t: 0, vx: 380 * power, vy: -620 * power, rot: 0, vr: 7, x: 0, y: 0 };
    o.judged = true;
  }

  tick(dt, dx) {
    this.time += dt;
    for (const o of this.list) {
      o.x -= dx;
      if (o.knock) {
        const k = o.knock;
        k.t += dt;
        k.vy += 2200 * dt;
        k.x += k.vx * dt;
        k.y += k.vy * dt;
        k.rot += k.vr * dt;
      }
    }
    for (let i = this.list.length - 1; i >= 0; i--) {
      const o = this.list[i];
      if (o.x + o.w < -140 || (o.knock && o.knock.t > 1.4)) {
        this.release(o);
        this.list.splice(i, 1);
      }
    }
  }
  update() {
    return true;
  }

  draw(r) {
    for (const o of this.list) {
      if (o.x > W + 20) {
        if (o.sign) o.sign.hidden = true;
        continue;
      }
      r.save();
      r.translate(o.x, GROUND_Y);
      if (o.knock) {
        r.setGlobalAlpha(Math.max(0, 1 - o.knock.t / 1.4));
        r.translate(o.knock.x + o.w / 2, o.knock.y - o.h / 2);
        r.rotate(o.knock.rot);
        r.translate(-o.w / 2, o.h / 2);
      }
      this.art(r, o);
      r.restore();
      r.setGlobalAlpha(1);
      this.sign(r, o);
    }
  }

  // placa flutuante com a tecla da manobra
  sign(r, o) {
    const s = o.sign;
    if (!s) return;
    // a placa some quando o obstáculo chega no skatista (não atrapalha a visão)
    if (o.judged || o.x > W - 30 || o.x < 230 || o.knock) {
      s.hidden = true;
      return;
    }
    s.hidden = false;
    const cx = o.x + o.w / 2;
    const cy = GROUND_Y - o.h - 62 + Math.sin(this.time * 4 + o.id) * 3;
    const bw = (s.metrics ? s.metrics.width : 120) + 28;
    const colors = { pending: "#1b1f3b", ok: "#1d8a4a", warn: "#b3261e" };
    r.setColor("#000000");
    r.setGlobalAlpha(0.35);
    r.fillRoundRect(cx - bw / 2 + 2, cy - 20 + 3, bw, 40, 9);
    r.setGlobalAlpha(0.95);
    r.setColor(colors[o.state] || colors.pending);
    r.fillRoundRect(cx - bw / 2, cy - 20, bw, 40, 9);
    r.setColor(o.state === "ok" ? "#8dffb5" : o.state === "warn" ? "#ff8a80" : "#ffd23f");
    r.fillRect(cx - bw / 2 + 8, cy + 15, bw - 16, 3);
    r.setGlobalAlpha(1);
    // setinha
    r.setColor(colors[o.state] || colors.pending);
    r.fillRect(cx - 6, cy + 20, 12, 5);
    r.fillRect(cx - 3, cy + 25, 6, 4);
    s.place(cx, cy - 2);
  }

  art(r, o) {
    switch (o.type) {
      case "cone": return this.cone(r);
      case "bench": return this.bench(r, o.w);
      case "hydrant": return this.hydrant(r);
      case "stairs": return this.stairs(r, o.def);
      case "rail": return this.rail(r, o.w);
    }
  }

  cone(r) {
    // base
    r.setColor("#c2410c");
    r.fillRect(-2, -5, 34, 5);
    const rows = [26, 22, 18, 14, 10, 7, 4];
    for (let i = 0; i < rows.length; i++) {
      const w = rows[i];
      r.setColor(i === 2 || i === 4 ? "#f8fafc" : "#ff7a1a");
      r.fillRect(15 - w / 2, -9 - i * 5, w, 5);
    }
    r.setColor("#ffa45c");
    r.fillRect(8, -34, 2, 22);
  }

  bench(r, w) {
    // pernas de ferro
    r.setColor("#4b5563");
    r.fillRect(8, -22, 7, 22);
    r.fillRect(w - 15, -22, 7, 22);
    // assento
    r.setColor("#8b5a2b");
    r.fillRect(0, -26, w, 8);
    r.setColor("#a8713a");
    r.fillRect(0, -26, w, 3);
    // encosto
    r.setColor("#8b5a2b");
    r.fillRect(2, -42, w - 4, 6);
    r.fillRect(2, -35, w - 4, 5);
    r.setColor("#4b5563");
    r.fillRect(4, -42, 5, 20);
    r.fillRect(w - 9, -42, 5, 20);
  }

  hydrant(r) {
    r.setColor("#7f1d1d");
    r.fillRect(1, -7, 30, 7);
    r.setColor("#dc2626");
    r.fillRect(6, -40, 20, 34);
    r.fillRect(0, -30, 32, 9);
    r.fillRect(3, -46, 26, 8);
    r.setColor("#ef4444");
    r.fillRect(9, -38, 5, 28);
    r.setColor("#fca5a5");
    r.fillRect(11, -36, 2, 10);
    r.setColor("#b91c1c");
    r.fillRect(12, -58, 8, 12);
    r.setColor("#fbbf24");
    r.fillRect(10, -52, 12, 3);
  }

  stairs(r, def) {
    for (const p of def.parts) {
      r.setColor("#8a8f99");
      r.fillRect(p.dx, -p.h, p.w, p.h);
      r.setColor("#b4bac6");
      r.fillRect(p.dx, -p.h, p.w, 4);
      r.setColor("#6b7280");
      r.fillRect(p.dx + p.w - 3, -p.h + 4, 3, p.h - 4);
      // borda amarela (marca de skate)
      r.setColor("#fbbf24");
      r.fillRect(p.dx, -p.h, p.w, 2);
    }
  }

  rail(r, w) {
    // postes
    r.setColor("#6b7280");
    for (let x = 6; x < w - 6; x += 60) r.fillRect(x, -26, 5, 26);
    r.fillRect(w - 11, -26, 5, 26);
    // barra principal
    r.setColor("#cbd5e1");
    r.fillRect(0, -30, w, 6);
    r.setColor("#f1f5f9");
    r.fillRect(0, -30, w, 2);
    r.setColor("#94a3b8");
    r.fillRect(0, -25, w, 1);
    // pontas
    r.setColor("#94a3b8");
    r.fillRect(-3, -31, 4, 8);
    r.fillRect(w - 1, -31, 4, 8);
  }
}
