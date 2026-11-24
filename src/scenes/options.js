import * as me from "melonjs";
import { W, H, DEMO } from "../config.js";
import { Background } from "../entities/background.js";
import { Label } from "../game/label.js";
import { sfx, startMusic, stopMusic, toggleMute, isMuted, setVolumes, refreshMusic } from "../game/audio.js";
import { getSettings } from "../game/settings.js";
import { onMenuKeys, onCanvasPointer } from "../game/menuinput.js";

// ---- layout (coordenadas do jogo, 960x540) ----
const TABS = [
  { label: "COMANDOS", color: "#ffd23f" },
  { label: "SOM", color: "#ff3d81" },
  { label: "PARTICIPANTES", color: "#4cc9f0" },
];
const TW = 250;
const TH = 42;
const TGAP = 12;
const TY = 84;
const TX0 = (W - (TABS.length * TW + (TABS.length - 1) * TGAP)) / 2;
const tabX = (i) => TX0 + i * (TW + TGAP);
const PX = 70;
const PY = 138;
const PW = W - 140;
const PH = 352;
const BACK = { x: 24, y: 20, w: 132, h: 40 };

// aba COMANDOS: [teclas, manobra, descrição]
const CONTROLS = [
  ["ESPAÇO · ↑ · W", "OLLIE", "pulo · vence o cone"],
  ["Z · J", "KICKFLIP", "no ar · vence o banco"],
  ["X · K", "SHOVE-IT", "no ar · vence o hidrante"],
  ["C · L", "INDY GRAB", "no ar · vence a escadaria"],
  ["↓ · S", "GRIND", "segure sobre o corrimão"],
  ["P · ESC", "PAUSAR", "ENTER volta ao menu"],
  ["M", "SOM", "liga e desliga o som"],
];
const CTRL_COLORS = ["#ffd23f", "#ff7ab0", "#4cc9f0", "#8dffb5", "#ffa94d", "#c9d1ff", "#c9d1ff"];
const CTRL_Y = (i) => 172 + i * 42;

// aba SOM
const SX = 330; // início da barra
const SW = 380; // largura da barra
const SOM_Y = [200, 290, 380]; // música, efeitos, mudo
const TOGGLE_W = 190;

// aba PARTICIPANTES
const TEAM = ["Pedro Henrique Rocha Lima", "Lucas Lopes", "Pedro Henrique Paixão", "Pedro Ciampi"];
const TEAM_COLORS = ["#ffd23f", "#ff3d81", "#4cc9f0", "#ffa94d"];
const TEAM_Y = (i) => 232 + i * 56;

const pct = (v) => `${Math.round(v * 100)}%`;

/** Desenha as formas do menu (abas, painel, barras) e chama scene.tick() a cada frame. */
class OptionsPanel extends me.Renderable {
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
    this.scene.tick(dt);
    return true;
  }
  draw(r) {
    const sc = this.scene;
    const pulse = 0.55 + 0.45 * Math.abs(Math.sin(this.t * 4));
    // faixas de cabeçalho e rodapé
    r.setColor("#0a0a18");
    r.setGlobalAlpha(0.78);
    r.fillRect(0, 0, W, 76);
    r.fillRect(0, H - 40, W, 40);
    r.setGlobalAlpha(1);

    // botão voltar
    r.setColor("#0a0a18");
    r.fillRoundRect(BACK.x - 3, BACK.y - 3, BACK.w + 6, BACK.h + 6, 12);
    r.setColor("#2a2c5c");
    r.fillRoundRect(BACK.x, BACK.y, BACK.w, BACK.h, 10);

    // abas
    TABS.forEach((tb, i) => {
      const on = i === sc.tab;
      const x = tabX(i);
      if (on && sc.row === 0) {
        r.setColor("#ffffff");
        r.setGlobalAlpha(pulse);
        r.fillRoundRect(x - 5, TY - 5, TW + 10, TH + 10, 15);
        r.setGlobalAlpha(1);
      }
      r.setColor("#0a0a18");
      r.fillRoundRect(x - 3, TY - 3, TW + 6, TH + 6, 13);
      r.setColor(on ? tb.color : "#1d1e3e");
      r.fillRoundRect(x, TY, TW, TH, 10);
    });

    // painel
    r.setColor("#0a0a18");
    r.setGlobalAlpha(0.86);
    r.fillRoundRect(PX, PY, PW, PH, 16);
    r.setGlobalAlpha(1);
    r.setColor(TABS[sc.tab].color);
    r.fillRect(PX + 24, PY + 6, PW - 48, 3);

    if (sc.tab === 0) this.drawControls(r);
    else if (sc.tab === 1) this.drawSound(r, pulse);
    else this.drawTeam(r);
  }
  drawControls(r) {
    CONTROLS.forEach((_, i) => {
      const y = CTRL_Y(i);
      r.setColor("#0b0b16");
      r.fillRoundRect(94, y - 18, 224, 36, 10);
      r.setColor("#2a2c5c");
      r.fillRoundRect(97, y - 15, 218, 30, 8);
      r.setColor(CTRL_COLORS[i]);
      r.fillRect(100, y - 15, 5, 30);
    });
  }
  drawSound(r, pulse) {
    const sc = this.scene;
    const s = getSettings();
    const muted = isMuted();
    SOM_Y.forEach((y, i) => {
      if (sc.row === i + 1) {
        r.setColor("#ff3d81");
        r.setGlobalAlpha(pulse);
        r.fillRoundRect(PX + 20, y - 40, PW - 40, 80, 14);
        r.setGlobalAlpha(1);
        r.setColor("#14152c");
        r.fillRoundRect(PX + 24, y - 36, PW - 48, 72, 11);
      }
    });
    // barras de volume
    [s.music, s.sfx].forEach((v, i) => {
      const y = SOM_Y[i];
      r.setGlobalAlpha(muted ? 0.45 : 1);
      r.setColor("#0b0b16");
      r.fillRoundRect(SX - 4, y - 12, SW + 8, 24, 12);
      r.setColor("#2a2c5c");
      r.fillRoundRect(SX, y - 8, SW, 16, 8);
      const fw = Math.max(0, v * SW);
      if (fw > 2) {
        r.setColor(i === 0 ? "#4cc9f0" : "#ffd23f");
        r.fillRoundRect(SX, y - 8, Math.max(16, fw), 16, 8);
      }
      const kx = SX + v * SW;
      r.setColor("#0b0b16");
      r.fillRoundRect(kx - 12, y - 22, 24, 44, 9);
      r.setColor("#ffffff");
      r.fillRoundRect(kx - 9, y - 19, 18, 38, 7);
      r.setGlobalAlpha(1);
    });
    // chave ligado/mudo
    const y = SOM_Y[2];
    r.setColor("#0b0b16");
    r.fillRoundRect(SX - 4, y - 24, TOGGLE_W + 8, 48, 16);
    r.setColor(muted ? "#5b2230" : "#2f9e5b");
    r.fillRoundRect(SX, y - 20, TOGGLE_W, 40, 13);
    r.setColor("#ffffff");
    r.fillRoundRect(muted ? SX + 4 : SX + TOGGLE_W - 40, y - 16, 36, 32, 10);
  }
  drawTeam(r) {
    TEAM.forEach((_, i) => {
      const y = TEAM_Y(i);
      r.setColor("#0b0b16");
      r.fillRoundRect(318, y - 21, 42, 42, 21);
      r.setColor(TEAM_COLORS[i]);
      r.fillRoundRect(321, y - 18, 36, 36, 18);
    });
  }
}

export class OptionsScreen extends me.Stage {
  onResetEvent() {
    const w = me.game.world;
    this.tab = 0;
    this.row = 0;
    this.leaving = false; // a mesma instância da tela é reutilizada a cada visita
    this.t = 0;
    this.dist = 0;
    this.drag = 0; // 1 = arrastando a barra da música, 2 = a dos efeitos
    this.prevCool = 0;
    this.bg = new Background(DEMO);
    w.addChild(this.bg, 1);

    const L = (text, size, x, y, o = {}) => {
      const lb = new Label(text, { lineWidth: 0, ...o, size });
      lb.place(x, y);
      w.addChild(lb, 30);
      return lb;
    };
    L("MENU", 42, W / 2, 40, { color: "#ffd23f", lineWidth: undefined, outline: 5 });
    L("‹ VOLTAR", 20, BACK.x + BACK.w / 2, BACK.y + BACK.h / 2 + 1, { color: "#ffffff" });
    this.tabLabels = TABS.map((tb, i) => L(tb.label, 20, tabX(i) + TW / 2, TY + TH / 2 + 1, { title: true, color: "#ffffff" }));
    this.footer = L(" ", 17, W / 2, H - 20, { color: "#c9d1ff" });

    // aba COMANDOS
    this.groups = [[], [], []];
    const g0 = this.groups[0];
    CONTROLS.forEach(([keys, name, desc], i) => {
      const y = CTRL_Y(i);
      g0.push(L(keys, 19, 206 + 3, y, { color: "#ffffff" }));
      g0.push(L(name, 20, 340, y + 1, { title: true, align: "left", color: CTRL_COLORS[i] }));
      g0.push(L(desc, 19, 520, y, { align: "left", color: "#ffffff" }));
    });
    g0.push(L("No celular, use os botões na tela.", 18, W / 2, 468, { color: "#9fb0ff" }));

    // aba SOM
    const g1 = this.groups[1];
    g1.push(L("MÚSICA", 26, 112, SOM_Y[0] + 1, { title: true, align: "left", color: "#ffffff" }));
    g1.push(L("EFEITOS", 26, 112, SOM_Y[1] + 1, { title: true, align: "left", color: "#ffffff" }));
    g1.push(L("SOM", 26, 112, SOM_Y[2] + 1, { title: true, align: "left", color: "#ffffff" }));
    this.musicVal = L("100%", 26, 748, SOM_Y[0] + 1, { title: true, align: "left", color: "#4cc9f0" });
    this.sfxVal = L("100%", 26, 748, SOM_Y[1] + 1, { title: true, align: "left", color: "#ffd23f" });
    this.muteVal = L("LIGADO", 20, SX + TOGGLE_W / 2, SOM_Y[2] + 1, { title: true, color: "#ffffff" });
    g1.push(this.musicVal, this.sfxVal, this.muteVal);
    g1.push(L("Os ajustes ficam salvos neste navegador.", 18, W / 2, 452, { color: "#9fb0ff" }));

    // aba PARTICIPANTES
    const g2 = this.groups[2];
    g2.push(L("EQUIPE", 28, W / 2, 174, { title: true, color: "#ffd23f" }));
    TEAM.forEach((name, i) => {
      g2.push(L(String(i + 1), 18, 339, TEAM_Y(i) + 1, { title: true, color: "#14091f" }));
      g2.push(L(name, 28, 380, TEAM_Y(i), { align: "left", color: "#ffffff" }));
    });
    g2.push(L("Desenvolvimento de Jogos  ·  feito com melonJS", 18, W / 2, 468, { color: "#9fb0ff" }));

    w.addChild(new OptionsPanel(this), 10);
    this.shownTab = -1;
    this.apply();

    // teclado
    this.offKeys = onMenuKeys((a) => this.key(a));

    // mouse / toque
    const canvas = me.video.renderer.getCanvas();
    this.canvas = canvas;
    this.offPointer = onCanvasPointer(canvas, W, H, (gx, gy) => this.press(gx, gy));
    this.toGame = (e) => {
      const rect = canvas.getBoundingClientRect();
      return [((e.clientX - rect.left) * W) / rect.width, ((e.clientY - rect.top) * H) / rect.height];
    };
    this.onMove = (e) => {
      if (this.drag) this.setFromX(this.drag, this.toGame(e)[0]);
    };
    this.onUp = () => (this.drag = 0);
    window.addEventListener("pointermove", this.onMove);
    window.addEventListener("pointerup", this.onUp);
    window.addEventListener("pointercancel", this.onUp);

    me.game.viewport.fadeOut("#10101c", 300);
    startMusic(0.35);
  }

  tick(dt) {
    const d = Math.min(dt / 1000, 0.05);
    this.t += d;
    this.dist += 260 * d;
    this.bg.tick(d, 220, this.dist);
    if (this.prevCool > 0) this.prevCool -= d;
  }

  /** mostra só os textos da aba atual e atualiza valores/rodapé */
  apply() {
    if (this.shownTab !== this.tab) {
      this.shownTab = this.tab;
      this.groups.forEach((g, i) => g.forEach((lb) => (lb.hidden = i !== this.tab)));
      this.tabLabels.forEach((lb, i) => lb.recolor(i === this.tab ? "#14091f" : "#ffffff"));
    }
    const s = getSettings();
    this.musicVal.set(pct(s.music));
    this.sfxVal.set(pct(s.sfx));
    const muted = isMuted();
    this.muteVal.set(muted ? "MUDO" : "LIGADO");
    this.muteVal.place(muted ? SX + TOGGLE_W / 2 + 16 : SX + TOGGLE_W / 2 - 16, SOM_Y[2] + 1);
    this.footer.set(
      this.row === 0
        ? this.tab === 1
          ? "←  →  trocar de aba        ↓  ajustar o som        ESC  voltar"
          : "←  →  trocar de aba        ESC  voltar"
        : "←  →  ajustar        ↑  ↓  mudar de linha        ESC  voltar às abas"
    );
  }

  setTab(i) {
    if (i === this.tab) return;
    this.tab = i;
    this.row = 0;
    sfx("beep", 0.45);
    this.apply();
  }

  key(a) {
    if (a === "back") {
      if (this.row > 0) {
        this.row = 0;
        sfx("beep", 0.4);
        this.apply();
      } else this.leave();
      return;
    }
    if (a === "up" && this.row > 0) {
      this.row--;
      sfx("beep", 0.4);
    } else if (a === "down" && this.tab === 1 && this.row < 3) {
      this.row++;
      sfx("beep", 0.4);
    } else if (a === "left" || a === "right") {
      const d = a === "left" ? -1 : 1;
      if (this.row === 0) this.setTab((this.tab + d + TABS.length) % TABS.length);
      else if (this.row === 1) this.setVol("music", getSettings().music + d * 0.1);
      else if (this.row === 2) this.setVol("sfx", getSettings().sfx + d * 0.1);
      else this.mute();
    } else if (a === "ok" && this.row === 3) this.mute();
    else if (a === "ok" && this.row === 0 && this.tab === 1) this.row = 1;
    this.apply();
  }

  press(gx, gy) {
    const inside = (x, y, w, h) => gx >= x && gx <= x + w && gy >= y && gy <= y + h;
    if (inside(BACK.x, BACK.y, BACK.w, BACK.h)) return this.leave();
    const ti = TABS.findIndex((_, i) => inside(tabX(i), TY, TW, TH));
    if (ti >= 0) return this.setTab(ti);
    if (this.tab !== 1) return;
    for (let i = 0; i < 2; i++) {
      if (gx >= SX - 18 && gx <= SX + SW + 18 && Math.abs(gy - SOM_Y[i]) < 30) {
        this.row = i + 1;
        this.drag = i + 1;
        this.setFromX(i + 1, gx);
        return this.apply();
      }
    }
    if (inside(SX - 4, SOM_Y[2] - 28, TOGGLE_W + 8, 56)) {
      this.row = 3;
      this.mute();
      this.apply();
    }
  }

  setFromX(which, gx) {
    const v = Math.round(Math.max(0, Math.min(1, (gx - SX) / SW)) * 20) / 20;
    this.setVol(which === 1 ? "music" : "sfx", v);
    this.apply();
  }

  setVol(which, value) {
    const v = Math.round(Math.max(0, Math.min(1, value)) * 100) / 100;
    if (Math.abs(getSettings()[which] - v) < 0.001) return;
    setVolumes(which === "music" ? { music: v } : { sfx: v });
    if (which === "music") refreshMusic();
    else if (this.prevCool <= 0) {
      this.prevCool = 0.16;
      sfx("coin", 0.9); // prévia do volume dos efeitos
    }
  }

  mute() {
    const m = toggleMute();
    if (!m) sfx("select", 0.8);
  }

  leave() {
    if (this.leaving) return;
    this.leaving = true;
    sfx("select", 0.6);
    me.state.change(me.state.MENU);
  }

  onDestroyEvent() {
    this.offKeys && this.offKeys();
    this.offPointer && this.offPointer();
    window.removeEventListener("pointermove", this.onMove);
    window.removeEventListener("pointerup", this.onUp);
    window.removeEventListener("pointercancel", this.onUp);
    stopMusic();
  }
}
