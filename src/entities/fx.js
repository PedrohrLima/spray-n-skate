import * as me from "melonjs";
import { W, H, GROUND_Y } from "../config.js";
import { Label } from "../game/label.js";

/** Partículas simples (poeira, faíscas, confete) + linhas de velocidade. */
export class FX extends me.Renderable {
  constructor() {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.alwaysUpdate = true;
    this.parts = [];
    this.lines = Array.from({ length: 14 }, (_, i) => ({ x: Math.random() * W, y: 40 + Math.random() * 380, l: 60 + Math.random() * 120 }));
    this.speed = 0;
    this.slowTint = 0;
    this.flash = 0;
    this.flashColor = "#ffffff";
  }
  reset() {
    this.parts.length = 0;
    this.slowTint = 0;
    this.flash = 0;
  }

  add(p) {
    if (this.parts.length < 400) this.parts.push(p);
  }
  dust(x, y, n = 6, vx = -120) {
    for (let i = 0; i < n; i++)
      this.add({ x, y, vx: vx + (Math.random() - 0.5) * 120, vy: -30 - Math.random() * 90, g: 120, life: 0.45 + Math.random() * 0.3, max: 0.7, s: 4 + Math.random() * 5, c: "#e5e7eb", a: 0.55 });
  }
  sparks(x, y, n = 3) {
    for (let i = 0; i < n; i++)
      this.add({ x, y, vx: -60 - Math.random() * 280, vy: -40 - Math.random() * 220, g: 900, life: 0.3 + Math.random() * 0.25, max: 0.55, s: 3, c: Math.random() < 0.5 ? "#ffd23f" : "#ffffff", a: 1 });
  }
  burst(x, y, color = "#ffd23f", n = 14, power = 260) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2;
      const v = power * (0.4 + Math.random() * 0.6);
      this.add({ x, y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, g: 500, life: 0.5 + Math.random() * 0.35, max: 0.85, s: 4 + Math.random() * 3, c: color, a: 1 });
    }
  }
  confetti(n = 60) {
    const cols = ["#ff3b5c", "#ffd23f", "#2ec4b6", "#4cc9f0", "#c77dff", "#ffffff"];
    for (let i = 0; i < n; i++)
      this.add({ x: Math.random() * W, y: -20 - Math.random() * 120, vx: (Math.random() - 0.5) * 160, vy: 60 + Math.random() * 160, g: 90, life: 2.2 + Math.random() * 1.4, max: 3.6, s: 6 + Math.random() * 5, c: cols[i % cols.length], a: 1 });
  }
  doFlash(color, amount = 0.6) {
    this.flashColor = color;
    this.flash = amount;
  }

  tick(dt, speed) {
    this.speed = speed;
    for (let i = this.parts.length - 1; i >= 0; i--) {
      const p = this.parts[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.parts.splice(i, 1);
        continue;
      }
      p.vy += p.g * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.y > GROUND_Y + 2 && p.g > 200 && p.g < 1000) {
        p.y = GROUND_Y + 2;
        p.vy *= -0.3;
      }
    }
    for (const l of this.lines) {
      l.x -= speed * 1.7 * dt;
      if (l.x + l.l < 0) {
        l.x = W + Math.random() * 200;
        l.y = 40 + Math.random() * 380;
        l.l = 60 + Math.random() * 120;
      }
    }
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 2.2);
  }
  update() {
    return true;
  }

  draw(r) {
    // linhas de velocidade
    const k = Math.max(0, (this.speed - 480) / 320);
    if (k > 0.02) {
      r.setColor("#ffffff");
      r.setGlobalAlpha(0.16 * k);
      for (const l of this.lines) r.fillRect(l.x, l.y, l.l, 2);
      r.setGlobalAlpha(1);
    }
    for (const p of this.parts) {
      r.setColor(p.c);
      r.setGlobalAlpha(Math.min(1, (p.life / p.max) * 1.4) * p.a);
      r.fillRect(p.x - p.s / 2, p.y - p.s / 2, p.s, p.s);
    }
    r.setGlobalAlpha(1);
    if (this.slowTint > 0.01) {
      r.setColor("#3aa0ff");
      r.setGlobalAlpha(0.13 * this.slowTint);
      r.fillRect(0, 0, W, H);
      r.setGlobalAlpha(1);
    }
    if (this.flash > 0.01) {
      r.setColor(this.flashColor);
      r.setGlobalAlpha(this.flash);
      r.fillRect(0, 0, W, H);
      r.setGlobalAlpha(1);
    }
  }
}

/** Texto flutuante ("+250 KICKFLIP!") — pool de Labels */
export class Popups {
  constructor(world, z) {
    this.items = [];
    for (let i = 0; i < 9; i++) {
      const lb = new Label(" ", { size: 26, lineWidth: 5 });
      lb.hidden = true;
      lb.life = 0;
      world.addChild(lb, z);
      this.items.push(lb);
    }
  }
  reset() {
    this.items.forEach((l) => ((l.hidden = true), (l.life = 0)));
  }
  show(text, x, y, color = "#ffffff", size = 26, life = 1.1) {
    // empilha: se já existe um texto no mesmo lugar, sobe o novo para não ficar um sobre o outro
    const w = text.length * size * 0.56;
    for (let tries = 0; tries < 5; tries++) {
      const hit = this.items.find((o) => {
        if (o.life <= 0 || o.hidden) return false;
        const ox = o.bx;
        const oy = o.by - 46 * (1 - o.life / o.max);
        const ow = o.shown.length * (o.pop || 26) * 0.56;
        return Math.abs(ox - x) < (ow + w) / 2 && Math.abs(oy - y) < (size + (o.pop || 26)) * 0.62;
      });
      if (!hit) break;
      y -= size * 1.2;
    }
    y = Math.max(y, 122);
    const lb = this.items.find((l) => l.life <= 0) || this.items[0];
    lb.pop = size;
    lb.shown = text;
    lb.style({ size, color }); // re-renderiza com o texto, tamanho e cor novos
    lb.life = life;
    lb.max = life;
    lb.bx = x;
    lb.by = y;
    lb.hidden = false;
    lb.place(x, y);
  }
  tick(dt) {
    for (const l of this.items) {
      if (l.life <= 0) continue;
      l.life -= dt;
      if (l.life <= 0) {
        l.hidden = true;
        continue;
      }
      const k = 1 - l.life / l.max;
      l.place(l.bx, l.by - 46 * k);
      l.setOpacity(Math.min(1, l.life / (l.max * 0.4)));
    }
  }
}
