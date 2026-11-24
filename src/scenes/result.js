import * as me from "melonjs";
import { W, H, METER, LEVELS, DEMO, ENDINGS, starGoals } from "../config.js";
import { Background } from "../entities/background.js";
import { FX } from "../entities/fx.js";
import { Label } from "../game/label.js";
import { sfx, startMusic, stopMusic } from "../game/audio.js";
import { drawStar } from "../game/shapes.js";
import { STATE_LEVELS, startRun } from "../states.js";
import { arcadeInfo, levelInfo } from "../game/progress.js";

const fmt = (n) => Number(n).toLocaleString("pt-BR");

/** Tela de resultado: estrelas (fases) ou distância (Arcade), pontuação e estatísticas. */
class ResultDirector extends me.Renderable {
  constructor(scene) {
    super(0, 0, W, H);
    this.anchorPoint.set(0, 0);
    this.floating = true;
    this.alwaysUpdate = true;
    this.sc = scene;
    this.t = 0;
    this.revealed = 0;
    // o fundo mostra a paleta em que a fase terminou (ex.: noite em Nova York), não a do começo
    this.dist = scene.res.arcade ? 0 : scene.res.meters * METER;
  }
  update(dtMs) {
    const d = Math.min(dtMs / 1000, 0.05);
    const { bg, fx, res, prompt } = this.sc;
    this.t += d;
    this.dist += (res.won ? 160 : 0) * d;
    bg.tick(d, res.won ? 160 : 0, this.dist);
    fx.tick(d, 0);
    if (res.won && Math.random() < d * 6) fx.confetti(4);
    // revela as estrelas uma a uma
    if (!res.arcade) {
      while (this.revealed < 3 && this.t > 0.5 + this.revealed * 0.5) {
        if (res.stars[this.revealed]) sfx(this.revealed === 2 ? "powerup" : "coin", 0.8);
        this.revealed++;
      }
    }
    prompt.setOpacity(0.6 + 0.4 * Math.abs(Math.sin(this.t * 3)));
    if (this.t > 0.8) {
      if (me.input.isKeyPressed("ollie")) {
        sfx("select");
        me.state.change(me.state.PLAY);
      } else if (me.input.isKeyPressed("menu")) {
        sfx("select");
        if (this.sc.hasNext) {
          startRun(res.levelIndex + 1); // a próxima fase começa com a sua cutscene
        } else me.state.change(STATE_LEVELS);
      } else if (me.input.isKeyPressed("pause")) {
        sfx("select");
        me.state.change(STATE_LEVELS);
      }
    }
    return true;
  }
  draw(r) {
    const { res } = this.sc;
    // painéis escuros atrás dos textos
    r.setColor("#0a0a18");
    r.setGlobalAlpha(0.72);
    r.fillRoundRect(W / 2 - 380, 18, 760, 454, 18);
    r.setGlobalAlpha(0.8);
    r.fillRect(0, H - 54, W, 54);
    r.setGlobalAlpha(1);
    if (!res.arcade) {
      for (let n = 0; n < 3; n++) {
        const k = Math.max(0, Math.min(1, (this.t - (0.5 + n * 0.5)) / 0.35));
        if (k <= 0) continue;
        const pop = k < 1 ? 1 + Math.sin(k * Math.PI) * 0.45 : 1;
        drawStar(r, W / 2 + (n - 1) * 240, 190, 34, res.stars[n], pop * (0.4 + 0.6 * k));
      }
    }
  }
}

export class ResultScreen extends me.Stage {
  onResetEvent(res) {
    res = res || {
      won: false, arcade: false, levelIndex: 0, score: 0, meters: 0, stickers: 0, bestCombo: 0, tricks: 0,
      obstacles: 0, bails: 0, zones: 1, record: false, newStars: 0, stars: [false, false, false],
    };
    this.res = res;
    const lv = res.arcade ? null : LEVELS[res.levelIndex];
    this.hasNext = !!(res.won && !res.arcade && res.levelIndex < LEVELS.length - 1);
    const w = me.game.world;
    this.bg = new Background(lv || DEMO);
    this.fx = new FX();
    w.addChild(this.bg, 1);
    w.addChild(this.fx, 8);

    const add = (text, size, x, y, o = {}) => {
      const lb = new Label(text, { size, ...o });
      lb.place(x, y);
      w.addChild(lb, 20);
      return lb;
    };

    let head;
    if (res.arcade || !res.won) head = "PEGARAM VOCÊ!";
    else head = res.levelIndex === LEVELS.length - 1 ? "VOCÊ ESCAPOU!" : `FASE ${lv.id} COMPLETA!`;
    add(head, res.won || res.arcade ? 50 : 60, W / 2, 68, { color: res.won ? "#ffd23f" : res.arcade ? "#c77dff" : "#ff5d73" });

    const stars = res.stars.filter(Boolean).length;
    let sub;
    if (res.arcade) sub = "A polícia te alcançou, mas você fugiu até onde deu!";
    else if (res.won) sub = ENDINGS[Math.max(1, stars)];
    else sub = "A polícia te pegou... mas a rua ainda é sua. Tente de novo!";
    add(sub, 22, W / 2, 112, { color: "#ffffff" });

    if (res.arcade) {
      add("DISTÂNCIA (METROS)", 20, W / 2, 168, { color: "#9fe8ff" });
      add(fmt(res.meters), 70, W / 2, 218, { color: "#ffffff" });
      add(`Zona ${res.zones} alcançada  ·  ${res.obstacles} obstáculos vencidos`, 22, W / 2, 268, { color: "#c9d1ff" });
    } else {
      const goals = starGoals(lv);
      const have = [
        res.won ? "" : "(não completou)",
        `você: ${res.stickers}`,
        `você: ${res.bails}`,
      ];
      goals.forEach((g, n) => {
        add([g, have[n] || " "], 19, W / 2 + (n - 1) * 240, 250, {
          color: res.stars[n] ? "#ffe9a8" : "#9aa3d6", lineHeight: 1.3,
        });
      });
    }

    add("PONTOS", 18, W / 2, 304, { color: "#9fe8ff" });
    add(fmt(res.score), 58, W / 2, 344, { color: "#ffffff" });
    const best = res.arcade ? arcadeInfo().score : levelInfo(res.levelIndex).score;
    const recText = res.record ? "★ NOVO RECORDE! ★" : `Melhor pontuação: ${fmt(best)}`;
    add(recText, 24, W / 2, 390, { color: res.record ? "#8dffb5" : "#c9d1ff" });
    if (res.arcade) {
      add([`Estrelas: ${res.stickers}   ·   Manobras: ${res.tricks}`, `Maior combo: ${res.bestCombo} seguidos   ·   Tombos: ${res.bails}`], 20, W / 2, 436, { color: "#ffffff", lineHeight: 1.45 });
    } else {
      add(
        [`Distância: ${res.meters} m   ·   Estrelas: ${res.stickers}   ·   Manobras: ${res.tricks}`, `Maior combo: ${res.bestCombo} seguidos   ·   Tombos: ${res.bails}`],
        20, W / 2, 436, { color: "#ffffff", lineHeight: 1.45 }
      );
    }
    this.prompt = add(
      this.hasNext ? "ESPAÇO: de novo     ENTER: próxima fase     ESC: menu" : "ESPAÇO: jogar de novo     ENTER ou ESC: menu de fases",
      23, W / 2, H - 27, { color: "#ffffff" }
    );
    w.addChild(new ResultDirector(this), 15);
    me.game.viewport.fadeOut("#10101c", 300);
    if (res.won) {
      this.fx.confetti(120);
      startMusic(0.35);
    }
  }
  onDestroyEvent() {
    stopMusic();
  }
}
