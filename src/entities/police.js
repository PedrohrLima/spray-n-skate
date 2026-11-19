import * as me from "melonjs";
import { W, H, GROUND_Y, PLAYER_X } from "../config.js";
import { drawPerson, COP, COP2 } from "../game/actors.js";
import { sfx } from "../game/audio.js";

/**
 * Policiais que aparecem quando o skatista toma um tombo: dois guardas correm pela esquerda da tela até
 * ficarem a poucos passos dele, com as luzes da sirene piscando na borda. Se ainda há vidas, ele se levanta,
 * foge e os guardas ficam para trás (cansados); se foi o último tombo, eles alcançam o skatista.
 * (Os personagens são os mesmos da cutscene: src/game/actors.js)
 */
const clamp = (v, a = 0, b = 1) => Math.max(a, Math.min(b, v));
const lerp = (a, b, t) => a + (b - a) * t;
const easeOut = (k) => 1 - Math.pow(1 - clamp(k), 3);

const START = [-80, -170]; // onde cada guarda nasce (fora da tela, à esquerda)
const CHASE_END = [PLAYER_X - 105, PLAYER_X - 168]; // quase em cima dele, mas ainda não o alcançam
const CATCH_END = [PLAYER_X - 52, PLAYER_X - 104]; // o alcançam

/** luz vermelha/azul da sirene (um desenho só por quadro) */
function sweep(rgb) {
  const cv = document.createElement("canvas");
  cv.width = 520;
  cv.height = H;
  const g = cv.getContext("2d");
  const gr = g.createLinearGradient(0, 0, 520, 0);
  gr.addColorStop(0, `rgba(${rgb},0.34)`);
  gr.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = gr;
  g.fillRect(0, 0, 520, H);
  return cv;
}

export class Police extends me.Renderable {
  constructor() {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.floating = true;
    this.alwaysUpdate = true;
    this.wash = [sweep("255,31,61"), sweep("31,85,255")];
    this.frozen = false; // pausado
    this.speed = 0; // velocidade do cenário (px/s)
    this.reset();
  }

  reset() {
    this.mode = "idle"; // idle · chase (se aproximam) · catch (alcançam) · giveup (ficam para trás)
    this.t = 0;
    this.clock = 0;
    this.light = 0;
    this.cops = [
      { x: START[0], x0: START[0], ph: 0, pal: COP, k: 0 },
      { x: START[1], x0: START[1], ph: 2, pal: COP2, k: 0 },
    ];
  }

  /** o skatista caiu; caught = foi o último tombo (sem vidas) */
  show(caught) {
    this.mode = caught ? "catch" : "chase";
    this.t = 0;
    this.cops.forEach((c, i) => {
      c.x0 = c.x = START[i];
      c.ph = i * 2;
      c.k = 0;
    });
    sfx("whistle", 0.55);
    if (caught) sfx("siren", 0.5);
  }

  /** o skatista se levantou e foi embora: os guardas desistem da corrida */
  release() {
    if (this.mode === "chase" || this.mode === "catch") {
      this.mode = "giveup";
      this.t = 0;
    }
  }

  update(dtMs) {
    const d = this.frozen ? 0 : Math.min(dtMs / 1000, 0.05);
    this.t += d;
    this.clock += d;
    const m = this.mode;
    if (m === "chase" || m === "catch") {
      const end = m === "catch" ? CATCH_END : CHASE_END;
      const dur = m === "catch" ? 1.0 : 1.2;
      const k = easeOut(this.t / dur);
      this.cops.forEach((c, i) => {
        const nx = lerp(c.x0, end[i], k);
        c.ph += Math.abs(nx - c.x) * 0.075;
        c.x = nx;
        c.k = k;
      });
    } else if (m === "giveup") {
      let any = false;
      for (const c of this.cops) {
        c.x -= this.speed * d; // ficam parados no chão: o cenário os leva para a esquerda
        if (c.x > -90) any = true;
      }
      if (!any) this.mode = "idle";
    }
    const on = m !== "idle";
    this.light += ((on ? 1 : 0) - this.light) * Math.min(1, d * 7);
    return true;
  }

  pose(c, i) {
    const m = this.mode;
    const ph = c.ph;
    const run = {
      lean: 0.28,
      hipY: -37 + Math.abs(Math.sin(ph)) * 3,
      armR: [-8 + Math.sin(ph) * 14, 14],
      footF: [Math.sin(ph) * 17 + 4, -Math.max(0, Math.cos(ph)) * 12],
      footR: [-Math.sin(ph) * 17 - 4, -Math.max(0, -Math.cos(ph)) * 12],
    };
    if (m === "giveup") {
      // sem fôlego: curvado, mãos nos joelhos e suando
      return { lean: 0.4, hipY: -34, armF: [9, 20], armR: [-9, 20], footF: [14, 0], footR: [-6, 0], shock: true, sweat: this.t * 1.7 };
    }
    if (m === "catch" && c.k > 0.96) {
      // chegaram: braços esticados para agarrar o skatista
      const jit = Math.sin(this.clock * 24 + i) * 1.5;
      return { lean: 0.12, hipY: -37, armF: [26, 2 + jit], armR: [-4, 14], footF: [12, 0], footR: [-8, 0], shock: i === 0, mood: i === 1 ? "smile" : undefined, prop: i === 1 ? "baton" : undefined, propAng: -0.3 };
    }
    if (m === "chase" && c.k > 0.97) {
      // chegaram perto: apontam para ele
      return { lean: 0.1, hipY: -38, armF: [24, -6], armR: [-6, 16], footF: [12, 0], footR: [-8, 0], shock: true, prop: i === 0 ? "baton" : "light", propAng: -0.1 };
    }
    // correndo (o primeiro com cassetete, o segundo apitando)
    return i === 0
      ? { ...run, armF: [10 + Math.sin(ph + Math.PI) * 14, 14], prop: "baton", propAng: 0.4, shock: true }
      : { ...run, armF: [9, -11], prop: "whistle", propAng: 0 };
  }

  draw(r) {
    if (this.mode === "idle" && this.light < 0.01) return;
    // luzes da sirene na borda esquerda
    r.setGlobalAlpha(this.light);
    r.drawImage(this.wash[Math.floor(this.clock * 5.5) % 2], 0, 0);
    r.setGlobalAlpha(1);
    // o segundo guarda fica atrás do primeiro
    for (const i of [1, 0]) {
      const c = this.cops[i];
      if (c.x < -70 || c.x > W + 40) continue;
      r.setColor("#000000");
      r.setGlobalAlpha(0.3);
      r.fillEllipse(c.x + 4, GROUND_Y + 3, 30, 6);
      r.setGlobalAlpha(1);
      drawPerson(r, c.x, GROUND_Y, { pal: c.pal, scale: 1, face: 1, ...this.pose(c, i) });
    }
  }
}
