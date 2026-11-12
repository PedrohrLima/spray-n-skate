import * as me from "melonjs";
import { Background } from "../entities/background.js";
import { Skater } from "../entities/skater.js";
import { ObstacleField } from "../entities/obstacles.js";
import { Pickups } from "../entities/pickups.js";
import { FinishGate } from "../entities/gate.js";
import { Police } from "../entities/police.js";
import { FX, Popups } from "../entities/fx.js";
import { HUD, Banner } from "../entities/hud.js";
import { Director } from "../game/director.js";
import { stopGrind, stopMusic } from "../game/audio.js";
import { currentLevel } from "../states.js";
import { PLAYER_X } from "../config.js";

/** Cena principal do jogo. Monta o mundo e entrega o controle ao Director. */
export class PlayScreen extends me.Stage {
  onResetEvent() {
    const w = me.game.world;
    w.backgroundColor.parseCSS("#10101c");
    const level = currentLevel();
    const session = { zone: 0, mult: 1, lives: level.lives, score: 0, dist: 0, combo: 0, stickers: 0, slowT: 0 };

    const bg = new Background(level);
    const gate = new FinishGate(level.city);
    if (level.gate) gate.setName(level.gate);
    const field = new ObstacleField();
    const pickups = new Pickups();
    const skater = new Skater();
    const fx = new FX();
    const police = new Police();
    w.addChild(bg, 1);
    w.addChild(gate, 2);
    w.addChild(field, 3);
    w.addChild(pickups, 4);
    w.addChild(police, 4.5); // guardas que aparecem quando o skatista cai (atrás dele)
    w.addChild(skater, 5);
    w.addChild(fx, 8);
    w.addChild(gate.title, 9);
    field.signs.forEach((l) => w.addChild(l, 10));

    const popups = new Popups(w, 30);
    const banner = new Banner(w, 32);
    const hud = new HUD(session, level);
    w.addChild(hud, 20);
    hud.labels.forEach((l) => w.addChild(l, 21));

    const director = new Director({ level, session, bg, gate, field, pickups, skater, fx, popups, banner, police });
    w.addChild(director, 0);
    // véu escuro quando o jogo está pausado
    const veil = new me.Renderable(0, 0, 960, 540);
    veil.anchorPoint.set(0, 0);
    veil.floating = true;
    veil.alwaysUpdate = true;
    veil.draw = (r) => {
      if (!director.paused) return;
      r.setColor("#05050f");
      r.setGlobalAlpha(0.6);
      r.fillRect(0, 0, 960, 540);
      r.setGlobalAlpha(1);
    };
    w.addChild(veil, 35);
    // dentro do túnel o skatista e a pista escurecem (só à direita da boca do túnel)
    const dim = new me.Renderable(0, 0, 960, 540);
    dim.anchorPoint.set(0, 0);
    dim.floating = true;
    dim.alwaysUpdate = true;
    dim.draw = (r) => {
      if (level.endless) return;
      const k = Math.max(0, Math.min(1, (PLAYER_X - gate.x) / 380));
      if (k <= 0) return;
      const x0 = Math.max(0, Math.floor(gate.x));
      r.setColor("#04030a");
      r.setGlobalAlpha(0.45 * k);
      r.fillRect(x0, 0, 960 - x0, 540);
      r.setGlobalAlpha(1);
    };
    w.addChild(dim, 6);
    // a tela "fecha": um círculo preto vai encolhendo até o skatista e some tudo
    const iris = new me.Renderable(0, 0, 960, 540);
    iris.anchorPoint.set(0, 0);
    iris.floating = true;
    iris.alwaysUpdate = true;
    iris.draw = (r) => {
      const k = director.iris;
      if (!(k > 0)) return;
      r.setColor("#000000");
      r.setGlobalAlpha(1);
      if (k >= 1) {
        r.fillRect(0, 0, 960, 540);
        return;
      }
      const cx = PLAYER_X;
      const cy = skater.y - 44;
      const e = k * k * (3 - 2 * k); // entra devagar, fecha rápido no fim
      const R = 900 * (1 - e);
      const R2 = R * R;
      const step = 3;
      for (let y = 0; y < 540; y += step) {
        // a faixa inteira é coberta pelo menor trecho de corda dentro do círculo (evita "vazar" luz nas bordas)
        const dy = Math.max(Math.abs(y - cy), Math.abs(y + step - cy));
        const d = R2 - dy * dy;
        if (d <= 0) {
          r.fillRect(0, y, 960, step);
          continue;
        }
        const hw = Math.sqrt(d);
        if (cx - hw > 0) r.fillRect(0, y, cx - hw, step);
        if (cx + hw < 960) r.fillRect(cx + hw, y, 960 - (cx + hw), step);
      }
    };
    w.addChild(iris, 45);
    director.extraLabels.forEach((l) => w.addChild(l, 40));
    this.director = director;
    me.game.viewport.fadeOut("#10101c", 350);
    // modo depuração: abra o jogo com ?debug para inspecionar o estado pelo console (window.__radroll)
    if (new URLSearchParams(window.location.search).has("debug")) window.__radroll = { director, session, skater, field };
  }

  onDestroyEvent() {
    stopGrind();
    stopMusic();
  }
}
