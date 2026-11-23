import * as me from "melonjs";
import { W, H, GROUND_Y } from "../config.js";
import { SPR, drawPixels, spriteSize } from "../game/pixels.js";

/** Estrelas (moedas) e power-ups: vida (coração) e energético (câmera lenta). */
export class Pickups extends me.Renderable {
  constructor() {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.alwaysUpdate = true;
    this.list = [];
    this.time = 0;
  }
  reset() {
    this.list.length = 0;
  }
  add(kind, x, y) {
    this.list.push({ kind, x, y, taken: false, ph: Math.random() * 6 });
  }
  /** arco de 5 estrelas sobre um obstáculo (premia quem pula na hora certa) */
  coinArc(cx, topY) {
    for (let i = -2; i <= 2; i++) {
      const k = i / 2;
      this.add("coin", cx + i * 42, topY - 62 - (1 - k * k) * 34);
    }
  }
  tick(dt, dx) {
    this.time += dt;
    for (let i = this.list.length - 1; i >= 0; i--) {
      const p = this.list[i];
      p.x -= dx;
      if (p.x < -60 || p.taken) this.list.splice(i, 1);
    }
  }
  update() {
    return true;
  }
  draw(r) {
    for (const p of this.list) {
      if (p.x > W + 40) continue;
      const bob = Math.sin(this.time * 5 + p.ph) * 4;
      if (p.kind === "coin") {
        const [w, h] = spriteSize(SPR.star, 3);
        r.setColor("#ffd23f");
        r.setGlobalAlpha(0.18);
        r.fillArc(p.x, p.y + bob, 19, 0, Math.PI * 2);
        r.setGlobalAlpha(1);
        drawPixels(r, SPR.star, p.x - w / 2, p.y + bob - h / 2, 3);
      } else {
        const spr = p.kind === "life" ? SPR.heart : SPR.can;
        const s = p.kind === "life" ? 5 : 4;
        const [w, h] = spriteSize(spr, s);
        r.setColor(p.kind === "life" ? "#ff3b5c" : "#4cc9f0");
        r.setGlobalAlpha(0.22 + 0.1 * Math.sin(this.time * 6));
        r.fillArc(p.x, p.y + bob, 34, 0, Math.PI * 2);
        r.setGlobalAlpha(1);
        drawPixels(r, spr, p.x - w / 2, p.y + bob - h / 2, s);
      }
    }
  }
}
