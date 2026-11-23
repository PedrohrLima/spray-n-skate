import * as me from "melonjs";
import { W, H, LEVELS, ARCADE, DEMO, ZONES, starGoals } from "../config.js";
import { Background } from "../entities/background.js";
import { Label } from "../game/label.js";
import { sfx, startMusic, stopMusic } from "../game/audio.js";
import { levelInfo, arcadeInfo, isUnlocked, totalStars, toggleUnlockAll } from "../game/progress.js";
import { drawStar, drawLock } from "../game/shapes.js";
import { run, startRun } from "../states.js";

const ENTRIES = [...LEVELS, ARCADE]; // 3 fases + Arcade
const CW = 208; // largura do cartão
const CH = 282;
const GAP = 18;
const X0 = (W - (ENTRIES.length * CW + (ENTRIES.length - 1) * GAP)) / 2;
const CY = 92;
const cardX = (i) => X0 + i * (CW + GAP);
const fmt = (n) => Number(n).toLocaleString("pt-BR");

/** Menu de seleção: 3 fases (pontuação + estrelas) e o modo Arcade. */
class Cards extends me.Renderable {
  constructor(scene) {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.floating = true;
    this.alwaysUpdate = true;
    this.scene = scene;
    this.t = 0;
  }
  update(dt) {
    this.t += dt / 1000;
    return true;
  }
  draw(r) {
    const sc = this.scene;
    // cabeçalho e rodapé
    r.setColor("#0a0a18");
    r.setGlobalAlpha(0.78);
    r.fillRect(0, 0, W, 76);
    r.fillRect(0, H - 40, W, 40);
    r.setGlobalAlpha(1);

    // total de estrelas (canto superior direito)
    r.setColor("#0a0a18");
    r.fillRoundRect(W - 150, 18, 130, 40, 10);
    drawStar(r, W - 128, 38, 12, true);

    ENTRIES.forEach((lv, i) => {
      const x = cardX(i);
      const y = CY;
      const sel = i === sc.sel;
      const open = sc.open[i];
      // moldura do cartão selecionado (pulsando)
      if (sel) {
        r.setColor("#ffd23f");
        r.setGlobalAlpha(0.55 + 0.45 * Math.abs(Math.sin(this.t * 4)));
        r.fillRoundRect(x - 6, y - 6, CW + 12, CH + 12, 16);
        r.setGlobalAlpha(1);
      }
      r.setColor("#14152c");
      r.fillRoundRect(x, y, CW, CH, 12);
      r.setColor(sel ? "#242650" : "#1b1c3a");
      r.fillRoundRect(x + 3, y + 3, CW - 6, CH - 6, 10);

      // miniatura do cenário (céu em faixas + prédios)
      const z = ZONES[lv.arcade ? 2 : lv.keys[0]];
      const px = x + 10;
      const pw = CW - 20;
      const ph = 88;
      const bands = 8;
      for (let b = 0; b < bands; b++) {
        const k = b / (bands - 1);
        const c = z.top.map((v, n) => Math.round(v + (z.bottom[n] - v) * k));
        r.setColor(`rgb(${c[0]},${c[1]},${c[2]})`);
        r.fillRect(px, y + 10 + (ph / bands) * b, pw, ph / bands + 1);
      }
      r.setColor(`rgb(${z.near[0]},${z.near[1]},${z.near[2]})`);
      const heights = [26, 40, 30, 52, 34, 44, 28];
      heights.forEach((h, n) => r.fillRect(px + 6 + n * 27, y + 10 + ph - 8 - h, 22, h));
      r.setColor(`rgb(${z.ground[0]},${z.ground[1]},${z.ground[2]})`);
      r.fillRect(px, y + 10 + ph - 10, pw, 10);

      // etiqueta de dificuldade
      r.setColor(lv.tagColor);
      r.fillRoundRect(x + CW / 2 - 52, y + 138, 104, 24, 12);
      if (!lv.arcade && open) {
        // 3 estrelas da fase
        const info = sc.info[i];
        for (let n = 0; n < 3; n++) drawStar(r, x + CW / 2 + (n - 1) * 56, y + 202, 17, info.stars[n]);
      }
      if (!open) {
        // fase bloqueada: escurece a miniatura e a parte de baixo, e mostra o cadeado
        r.setColor("#0a0a18");
        r.setGlobalAlpha(0.55);
        r.fillRect(px, y + 10, pw, ph);
        r.setGlobalAlpha(0.88);
        r.fillRoundRect(x + 5, y + 170, CW - 10, CH - 175, 8);
        r.setGlobalAlpha(1);
        drawLock(r, x + CW / 2, y + 194, 1);
      }
    });

    // painel de objetivos da fase selecionada
    r.setColor("#0a0a18");
    r.setGlobalAlpha(0.82);
    r.fillRoundRect(X0 - 6, CY + CH + 18, W - 2 * (X0 - 6), 80, 12);
    r.setGlobalAlpha(1);
    const lv = ENTRIES[sc.sel];
    if (!lv.arcade) {
      const info = sc.info[sc.sel];
      for (let n = 0; n < 3; n++) drawStar(r, X0 + 30 + n * 296, CY + CH + 58, 14, sc.open[sc.sel] && info.stars[n]);
    }
  }
}

/** chama scene.tick() a cada frame (o Stage da melonJS não tem update próprio) */
class Driver extends me.Renderable {
  constructor(scene) {
    super(0, 0, 1, 1);
    this.alwaysUpdate = true;
    this.floating = true;
    this.scene = scene;
  }
  update(dt) {
    this.scene.tick(dt);
    return true;
  }
}

export class LevelSelect extends me.Stage {
  onResetEvent() {
    const w = me.game.world;
    const bg = new Background(DEMO);
    w.addChild(bg, 1);
    this.bg = bg;
    this.sel = Math.max(0, run.index < 0 ? ENTRIES.length - 1 : run.index);
    this.cardLabels = [];
    this.t = 0;
    this.dist = 0;
    const L = (text, size, x, y, o = {}) => {
      const lb = new Label(text, { lineWidth: 0, ...o, size });
      lb.place(x, y);
      w.addChild(lb, 30);
      return lb;
    };

    // cabeçalho
    const head = new Label("ESCOLHA A FASE", { size: 42, color: "#ffd23f" });
    head.place(W / 2, 40);
    w.addChild(head, 30);
    this.total = L("0 / 9", 26, W - 52, 39, { align: "left", color: "#ffffff" });
    this.total.place(W - 104, 39);

    // textos de cada cartão
    this.cards = ENTRIES.map((lv, i) => {
      const x = cardX(i) + CW / 2;
      const y = CY;
      const c = {};
      c.num = new Label(lv.arcade ? "ARCADE" : String(lv.id), { size: lv.arcade ? 30 : 56, title: true, color: "#ffffff", outline: 4 });
      c.num.place(x, y + 54);
      w.addChild(c.num, 30);
      c.name = L(lv.name, 22, x, y + 122, { color: "#ffffff" });
      c.tag = L(lv.tag, 16, x, y + 150, { color: "#10101c" });
      c.cap1 = L(lv.arcade ? "DISTÂNCIA (METROS)" : "MELHOR PONTUAÇÃO", 15, x, y + 236, { color: "#9fb0ff" });
      c.val1 = L("-", 26, x, y + 258, { title: true, color: "#8dffb5" });
      c.cap2 = L("MELHOR PONTUAÇÃO", 15, x, y + 190, { color: "#9fb0ff" });
      c.val2 = L("-", 24, x, y + 214, { title: true, color: "#8dffb5" });
      c.lock = L(i === 0 ? "" : `COMPLETE\nA FASE ${i}`, 20, x, y + 243, { color: "#ffd23f", lineHeight: 1.25 });
      return c;
    });

    // textos do painel de objetivos
    const gy = CY + CH + 58;
    this.goalLabels = [0, 1, 2].map((n) => L(" ", 19, X0 + 52 + n * 296, gy, { align: "left", color: "#ffffff" }));
    this.arcadeText = L(" ", 20, W / 2, gy, { color: "#ffffff", lineHeight: 1.35 });
    this.footer = L("SETAS  escolher        ESPAÇO / ENTER  jogar        ESC  voltar        U  liberar fases", 18, W / 2, H - 20, { color: "#c9d1ff" });
    this.toast = new Label(" ", { size: 22, color: "#ffd23f" });
    this.toast.place(W / 2, 486);
    this.toast.hidden = true;
    w.addChild(this.toast, 31);

    this.cardsDraw = new Cards(this);
    w.addChild(this.cardsDraw, 10);
    w.addChild(new Driver(this), 0);
    this.refresh();

    // clique/toque nos cartões (converte a posição do ponteiro para as coordenadas do jogo)
    this.canvas = me.video.renderer.getCanvas();
    this.onPointer = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const gx = ((e.clientX - rect.left) * W) / rect.width;
      const gy = ((e.clientY - rect.top) * H) / rect.height;
      if (gy < CY - 6 || gy > CY + CH + 6) return;
      const i = ENTRIES.findIndex((_, n) => gx >= cardX(n) && gx <= cardX(n) + CW);
      if (i < 0) return;
      if (this.sel === i) this.start();
      else this.select(i);
    };
    this.canvas.addEventListener("pointerdown", this.onPointer);

    me.game.viewport.fadeOut("#10101c", 300);
    startMusic(0.3);
  }

  /** (re)lê o progresso salvo e atualiza todos os textos */
  refresh() {
    this.open = ENTRIES.map((lv, i) => (lv.arcade ? true : isUnlocked(i)));
    this.info = ENTRIES.map((lv, i) => (lv.arcade ? arcadeInfo() : levelInfo(i)));
    this.total.set(`${totalStars()} / ${LEVELS.length * 3}`);
    ENTRIES.forEach((lv, i) => {
      const c = this.cards[i];
      const open = this.open[i];
      const info = this.info[i];
      c.lock.hidden = open;
      c.cap1.hidden = c.val1.hidden = !open;
      c.cap2.hidden = c.val2.hidden = !open || !lv.arcade;
      const show = (lb, v, text) => {
        lb.set(v > 0 ? text : "—");
        lb.recolor(v > 0 ? "#8dffb5" : "#6b7099");
      };
      if (lv.arcade) {
        show(c.val1, info.meters, fmt(info.meters));
        show(c.val2, info.score, fmt(info.score));
      } else show(c.val1, info.score, fmt(info.score));
    });
    this.updateGoals();
  }

  updateGoals() {
    const lv = ENTRIES[this.sel];
    this.arcadeText.hidden = !lv.arcade;
    this.goalLabels.forEach((l) => (l.hidden = lv.arcade));
    if (lv.arcade) {
      this.arcadeText.set(["Sem linha de chegada: a velocidade só aumenta!", "Novos obstáculos aparecem conforme você avança."]);
    } else {
      starGoals(lv).forEach((g, n) => this.goalLabels[n].set(g));
    }
  }

  select(i) {
    if (i === this.sel) return;
    this.sel = i;
    sfx("beep", 0.45);
    this.updateGoals();
  }

  start() {
    if (!this.open[this.sel]) {
      sfx("land", 0.7);
      this.flash("Complete a fase anterior para abrir esta (ou aperte U)");
      return;
    }
    sfx("select");
    startRun(ENTRIES[this.sel].arcade ? -1 : this.sel);
  }

  flash(msg) {
    this.toast.set(msg);
    this.toast.hidden = false;
    this.toastT = 2.2;
  }

  tick(dt) {
    const d = Math.min(dt / 1000, 0.05);
    this.t += d;
    this.dist += 260 * d;
    this.bg.tick(d, 220, this.dist);
    if (this.toastT > 0) {
      this.toastT -= d;
      if (this.toastT <= 0) this.toast.hidden = true;
    }
    if (this.t > 0.25) {
      const k = me.input.isKeyPressed;
      if (k("left")) this.select((this.sel + ENTRIES.length - 1) % ENTRIES.length);
      else if (k("right")) this.select((this.sel + 1) % ENTRIES.length);
      else if (k("ollie") || k("menu")) this.start();
      else if (k("pause")) {
        sfx("select", 0.6);
        me.state.change(me.state.MENU);
      } else if (k("unlock")) {
        const on = toggleUnlockAll();
        sfx("powerup", 0.7);
        this.refresh();
        this.flash(on ? "Todas as fases liberadas" : "Fases bloqueadas de novo");
      }
    }
  }

  onDestroyEvent() {
    if (this.canvas) this.canvas.removeEventListener("pointerdown", this.onPointer);
    stopMusic();
  }
}
