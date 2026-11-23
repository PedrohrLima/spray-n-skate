import * as me from "melonjs";
import { W, H, GROUND_Y, PLAYER_X, DEMO } from "../config.js";
import { Background } from "../entities/background.js";
import { Skater } from "../entities/skater.js";
import { FX } from "../entities/fx.js";
import { Label } from "../game/label.js";
import { Logo } from "../game/logo.js";
import { sfx, startMusic, stopMusic } from "../game/audio.js";
import { onMenuKeys, onCanvasPointer } from "../game/menuinput.js";
import { STATE_LEVELS, STATE_OPTIONS, startRun } from "../states.js";

// a introdução do logo só toca na 1ª vez; ao voltar de outra tela ele já aparece montado
let introDone = false;
let lastSel = 0;

const BUTTONS = [
  { label: "FASES", color: "#ffd23f" },
  { label: "ARCADE", color: "#ff3d81" },
  { label: "MENU", color: "#4cc9f0" },
];
const BW = 300;
const BH = 46;
const BGAP = 10;
const BY = 324;
const bx = () => (W - BW) / 2;
const by = (i) => BY + i * (BH + BGAP);

/** Botões FASES / ARCADE / MENU: deslizam para dentro quando o logo termina de montar. */
class MenuButtons extends me.Renderable {
  constructor(scene) {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.floating = true;
    this.alwaysUpdate = true;
    this.scene = scene;
    this.t = 0;
    this.shown = 0; // 0..1 por botão, em sequência
    this.labels = BUTTONS.map((b, i) => {
      const lb = new Label(b.label, { size: 28, title: true, lineWidth: 0, color: "#ffffff" });
      lb.place(W / 2, by(i) + BH / 2 + 1);
      me.game.world.addChild(lb, 30);
      return lb;
    });
    this.cur = -1;
  }
  update(dt) {
    this.t += dt / 1000;
    const sc = this.scene;
    if (sc.logo.ready) this.shown = Math.min(1, this.shown + dt / 1000 / 0.9);
    if (sc.hint) sc.hint.hidden = this.shown < 0.3;
    // cor do texto: escuro no botão selecionado, branco nos outros
    if (this.cur !== sc.sel) {
      this.cur = sc.sel;
      this.labels.forEach((l, i) => l.recolor(i === sc.sel ? "#14091f" : "#ffffff"));
    }
    this.labels.forEach((l, i) => {
      const k = Math.max(0, Math.min(1, this.shown * 3 - i * 0.55));
      const e = 1 - Math.pow(1 - k, 3);
      l.hidden = k <= 0;
      l.setOpacity(e);
      const pulse = i === sc.sel ? 1 + 0.03 * Math.sin(this.t * 6) : 1;
      l.sc = pulse;
      l.place(W / 2 + (1 - e) * 80, by(i) + BH / 2 + 1);
    });
    return true;
  }
  draw(r) {
    const sc = this.scene;
    // faixa escura no rodapé (as dicas ficam legíveis sobre a rua)
    r.setColor("#0a0a18");
    r.setGlobalAlpha(0.78 * Math.min(1, this.shown * 3));
    r.fillRect(0, H - 38, W, 38);
    r.setGlobalAlpha(1);
    BUTTONS.forEach((b, i) => {
      const k = Math.max(0, Math.min(1, this.shown * 3 - i * 0.55));
      if (k <= 0) return;
      const e = 1 - Math.pow(1 - k, 3);
      const sel = i === sc.sel;
      const x = bx() + (1 - e) * 80;
      const y = by(i);
      const grow = sel ? 6 + 2 * Math.sin(this.t * 6) : 0;
      r.setGlobalAlpha(e);
      r.setColor("#12081f");
      r.fillRoundRect(x - grow - 3, y - grow / 2 - 3, BW + grow * 2 + 6, BH + grow + 6, 16);
      r.setColor(b.color);
      r.fillRoundRect(x - grow, y - grow / 2, BW + grow * 2, BH + grow, 13);
      if (!sel) {
        r.setColor("#1c1038");
        r.fillRoundRect(x - grow + 4, y - grow / 2 + 4, BW + grow * 2 - 8, BH + grow - 8, 10);
      } else {
        r.setColor("#ffffff"); // brilho no topo do botão selecionado
        r.setGlobalAlpha(0.28 * e);
        r.fillRoundRect(x - grow + 6, y - grow / 2 + 4, BW + grow * 2 - 12, 10, 5);
      }
      r.setGlobalAlpha(1);
    });
  }
}

/** Anima o cenário, o skatista de demonstração (ollie + manobras) e reage ao logo. */
class TitleDriver extends me.Renderable {
  constructor(bg, skater, fx, logo) {
    super(0, 0, 1, 1);
    this.floating = true;
    this.alwaysUpdate = true;
    this.bg = bg;
    this.skater = skater;
    this.fx = fx;
    this.logo = logo;
    this.t = 0;
    this.dist = 0;
    this.cycle = 0;
    this.tricks = ["kickflip", "shoveit", "grab"];
    this.n = 0;
    skater.events.jump = () => fx.dust(PLAYER_X - 10, GROUND_Y, 4);
    skater.events.land = () => {
      fx.dust(PLAYER_X - 10, GROUND_Y, 5);
      logo.ripple(0.55);
    };
  }
  update(dtMs) {
    const d = Math.min(dtMs / 1000, 0.05);
    this.t += d;
    this.cycle += d;
    this.dist += 2300 * d;
    const inp = {};
    if (this.logo.ready && this.cycle > 1.6) {
      this.cycle = 0;
      inp.ollie = true;
      this.pendingTrick = this.tricks[this.n++ % 3];
      this.trickAt = this.t + 0.18;
    }
    if (this.pendingTrick && this.t >= this.trickAt) {
      inp[this.pendingTrick] = true;
      this.pendingTrick = null;
    }
    this.bg.tick(d, 340, this.dist);
    this.skater.tick(d, inp, 340);
    this.fx.tick(d, 340);
    return true;
  }
}

export class TitleScreen extends me.Stage {
  onResetEvent() {
    const w = me.game.world;
    const bg = new Background(DEMO);
    const skater = new Skater();
    const fx = new FX();
    const logo = new Logo(introDone);
    this.logo = logo;
    this.sel = lastSel;
    this.leaving = false; // a mesma instância da tela é reutilizada a cada visita
    w.addChild(bg, 1);
    w.addChild(fx, 8);
    w.addChild(skater, 12);

    // véu escuro suave no alto: o logo sempre contrasta com o cenário
    const shade = new me.Renderable(0, 0, W, H);
    shade.anchorPoint.set(0, 0);
    shade.floating = true;
    shade.draw = (r) => {
      r.setColor("#0a0614");
      for (let i = 0; i < 8; i++) {
        r.setGlobalAlpha(0.06 + 0.035 * (7 - i));
        r.fillRect(0, i * 38, W, 38);
      }
      r.setGlobalAlpha(1);
    };
    w.addChild(shade, 10);
    w.addChild(logo, 15);
    this.buttons = new MenuButtons(this);
    w.addChild(this.buttons, 20);
    w.addChild(new TitleDriver(bg, skater, fx, logo), 0);

    const hint = new Label("SETAS  escolher        ENTER  confirmar", { size: 18, color: "#c9d1ff", lineWidth: 0 });
    hint.place(W / 2, H - 19);
    w.addChild(hint, 30);
    this.hint = hint;

    // teclado e mouse/toque
    this.offKeys = onMenuKeys((a) => {
      if (!logo.ready) return;
      if (a === "up") this.move(-1);
      else if (a === "down") this.move(1);
      else if (a === "ok") this.go(this.sel);
    });
    const canvas = me.video.renderer.getCanvas();
    this.hit = (gx, gy) => BUTTONS.findIndex((_, i) => gx >= bx() && gx <= bx() + BW && gy >= by(i) && gy <= by(i) + BH);
    this.offPointer = onCanvasPointer(canvas, W, H, (gx, gy) => {
      if (!logo.ready) return;
      const i = this.hit(gx, gy);
      if (i >= 0) {
        this.sel = i;
        this.go(i);
      }
    });
    this.onMove = (e) => {
      if (!logo.ready) return;
      const rect = canvas.getBoundingClientRect();
      const i = this.hit(((e.clientX - rect.left) * W) / rect.width, ((e.clientY - rect.top) * H) / rect.height);
      if (i >= 0 && i !== this.sel) {
        this.sel = i;
        sfx("beep", 0.35);
      }
    };
    canvas.addEventListener("pointermove", this.onMove);
    this.canvas = canvas;

    introDone = true;
    me.game.viewport.fadeOut("#10101c", 300);
    startMusic(0.35);
  }

  move(d) {
    this.sel = (this.sel + d + BUTTONS.length) % BUTTONS.length;
    sfx("beep", 0.45);
  }

  go(i) {
    if (this.leaving) return;
    this.leaving = true;
    lastSel = i;
    sfx("select");
    if (i === 0) me.state.change(STATE_LEVELS);
    else if (i === 1) startRun(-1); // Arcade: cutscene e depois o jogo
    else me.state.change(STATE_OPTIONS);
  }

  onDestroyEvent() {
    this.offKeys && this.offKeys();
    this.offPointer && this.offPointer();
    this.canvas && this.canvas.removeEventListener("pointermove", this.onMove);
    stopMusic();
  }
}
