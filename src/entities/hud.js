import * as me from "melonjs";
import { W, H, MAX_LIVES, METER } from "../config.js";
import { Label } from "../game/label.js";
import { SPR, drawPixels, spriteSize } from "../game/pixels.js";

const COMBO_COLORS = ["#ffffff", "#ffd23f", "#ff9f1c", "#ff5d73", "#c77dff", "#4cc9f0"];

export class HUD extends me.Renderable {
  constructor(s, level) {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.floating = true;
    this.alwaysUpdate = true;
    this.s = s;
    this.level = level;
    this.disp = 0;
    this.score = new Label("0", { size: 44, align: "left", baseline: "top" });
    this.score.place(22, 6);
    this.combo = new Label(" ", { size: 24, align: "left", baseline: "top" });
    this.combo.place(24, 58);
    this.zone = new Label(" ", { size: 22 });
    this.zone.place(W / 2, 62);
    this.stickers = new Label("0", { size: 30, align: "right", baseline: "middle" });
    this.stickers.place(W - 22, 70);
    this.legend = new Label("ESPAÇO Ollie  ·  Z Kickflip  ·  X Shove-it  ·  C Grab  ·  ↓ Grind  ·  P Pausa  ·  M Som", {
      size: 19, color: "#ffffff", outline: 3,
    });
    this.legend.place(W / 2, H - 22);
    this.labels = [this.score, this.combo, this.zone, this.stickers, this.legend];
  }

  update(dt) {
    const s = this.s;
    const lv = this.level;
    this.disp += (s.score - this.disp) * Math.min(1, (dt / 1000) * 9);
    if (Math.abs(s.score - this.disp) < 1) this.disp = s.score;
    this.score.set(Math.floor(this.disp).toLocaleString("pt-BR"));
    if (s.combo >= 1) {
      this.combo.set(`COMBO x${s.mult}  (${s.combo})`);
      const col = COMBO_COLORS[Math.min(s.mult - 1, COMBO_COLORS.length - 1)];
      if (this.comboCol !== col) {
        this.comboCol = col;
        this.combo.style({ color: col });
      }
    } else this.combo.set(" ");
    const m = Math.floor(s.dist / METER);
    if (lv.endless) this.zone.set(`ARCADE  ·  ZONA ${s.zone + 1}  ·  ${m.toLocaleString("pt-BR")} m`);
    else this.zone.set(`FASE ${lv.id} · ${lv.name}  ·  ${Math.min(m, lv.meters)} / ${lv.meters} m`);
    this.stickers.set(lv.endless ? `${s.stickers}` : `${s.stickers} / ${lv.stickerGoal}`);
    return true;
  }

  draw(r) {
    const s = this.s;
    const lv = this.level;
    // faixas translúcidas (topo e rodapé) para o texto sempre ler bem
    r.setColor("#0a0a18");
    r.setGlobalAlpha(0.72);
    r.fillRect(0, 0, W, 94);
    r.setGlobalAlpha(0.78);
    r.fillRect(0, H - 44, W, 44);
    r.setGlobalAlpha(1);

    // barra de progresso da fase (ou barra de velocidade no Arcade)
    const x0 = W / 2 - 190;
    const bw = 380;
    const prog = lv.endless
      ? Math.min(1, Math.max(0, (s.speed - lv.speed[0]) / (lv.speed[1] - lv.speed[0])))
      : Math.min(1, s.dist / (lv.meters * METER));
    r.setColor("#10101c");
    r.fillRoundRect(x0 - 3, 12, bw + 6, 24, 8);
    r.setColor("#303456");
    r.fillRoundRect(x0, 17, bw, 14, 6);
    r.setColor(lv.endless ? (prog > 0.75 ? "#ff5d73" : prog > 0.4 ? "#ffb703" : "#2ec4b6") : "#2ec4b6");
    if (prog > 0.01) r.fillRoundRect(x0, 17, Math.max(10, bw * prog), 14, 6);
    if (!lv.endless) {
      r.setColor("#10101c");
      r.fillRect(x0 + bw / 2 - 1, 17, 3, 14); // metade da fase
      // marcador do skatista e bandeira
      r.setColor("#ffb703");
      r.fillRect(x0 + bw * prog - 5, 11, 10, 7);
      r.setColor("#e63946");
      r.fillRect(x0 + bw * prog - 5, 18, 10, 12);
      r.setColor("#ffffff");
      r.fillRect(x0 + bw - 1, 8, 3, 26);
      r.setColor("#ffd23f");
      r.fillRect(x0 + bw + 2, 8, 14, 9);
    } else {
      // Arcade: sem linha de chegada, só a velocidade
      r.setColor("#ffffff");
      r.fillRect(x0 + bw * prog - 2, 12, 4, 22);
    }

    // vidas
    for (let i = 0; i < MAX_LIVES; i++) {
      drawPixels(r, i < s.lives ? SPR.heart : SPR.heartEmpty, W - 18 - (MAX_LIVES - i) * 33, 12, 4);
    }
    // estrelas coletadas
    const [sw] = spriteSize(SPR.star, 3);
    drawPixels(r, SPR.star, W - 22 - this.stickers.metrics.width - sw - 12, 56, 3);

    // energético (câmera lenta)
    if (s.slowT > 0) {
      drawPixels(r, SPR.can, W - 190, 104, 3);
      r.setColor("#10101c");
      r.fillRoundRect(W - 160, 110, 130, 12, 5);
      r.setColor("#4cc9f0");
      r.fillRoundRect(W - 158, 112, 126 * Math.min(1, s.slowT / 5), 8, 4);
    }
  }
}

/** quebra uma fala longa em 2 linhas (perto do meio, em um espaço) */
function wrapLine(text) {
  if (text.length <= 50) return text;
  const mid = text.length / 2;
  let best = -1;
  for (let i = 0; i < text.length; i++) if (text[i] === " " && (best < 0 || Math.abs(i - mid) < Math.abs(best - mid))) best = i;
  return best < 0 ? text : text.slice(0, best) + "\n" + text.slice(best + 1);
}

/** Faixa de título da fase / zona (nome + fala do personagem) sobre um painel escuro */
export class Banner {
  constructor(world, z) {
    this.title = new Label(" ", { size: 50, color: "#ffd23f" });
    this.line = new Label(" ", { size: 25, align: "center", lineHeight: 1.3 });
    this.title.hidden = this.line.hidden = true;
    // painel escuro atrás do texto (melhora a leitura sobre qualquer cenário)
    this.panel = new me.Renderable(0, 0, W, H);
    this.panel.anchorPoint.set(0, 0);
    this.panel.floating = true;
    this.panel.alwaysUpdate = true;
    this.panel.a = 0;
    this.panel.draw = (r) => {
      if (this.panel.a <= 0.01) return;
      r.setColor("#080814");
      r.setGlobalAlpha(0.74 * this.panel.a);
      r.fillRoundRect(W / 2 - 420, 108, 840, 138, 16);
      r.setGlobalAlpha(1);
    };
    world.addChild(this.panel, z - 1);
    world.addChild(this.title, z);
    world.addChild(this.line, z);
    this.t = 99;
    this.dur = 4;
  }
  show(title, line, dur = 4.2) {
    this.title.set(title);
    this.line.set(wrapLine(line));
    this.t = 0;
    this.dur = dur;
    this.title.hidden = this.line.hidden = false;
  }
  tick(dt) {
    if (this.t > this.dur) {
      this.title.hidden = this.line.hidden = true;
      this.panel.a = 0;
      return;
    }
    this.t += dt;
    const fin = Math.min(1, this.t / 0.45);
    const fout = Math.min(1, (this.dur - this.t) / 0.6);
    const a = Math.max(0, Math.min(fin, fout));
    const slide = (1 - fin) * 40;
    this.panel.a = a;
    this.title.setOpacity(a);
    this.line.setOpacity(a);
    this.title.place(W / 2, 146 - slide);
    this.line.place(W / 2, 206 - slide);
  }
}
