import * as me from "melonjs";
import {
  W, GROUND_Y, PLAYER_X, HIT_W, HIT_H, HIT_GRACE, METER, MAX_LIVES, TRICKS, ZONES, LEVELS,
} from "../config.js";
import { sfx, startMusic, stopMusic, startGrind, stopGrind, toggleMute } from "./audio.js";
import { Label } from "./label.js";
import { zoneIndex } from "./palette.js";
import { saveLevel, saveArcade } from "./progress.js";
import { STATE_LEVELS } from "../states.js";

const lerp = (a, b, t) => a + (b - a) * t;
const ARCADE_LINES = [
  "Mais rápido a cada metro. A polícia não desiste!",
  "Os corrimões estão chegando. Cuidado com o Grind!",
  "Você já fugiu mais longe que a maioria. Continue!",
  "A cidade não dorme... e a polícia também não!",
];
const TRICK_COLOR = { kickflip: "#4cc9f0", shoveit: "#c77dff", grab: "#ffb703" };

/**
 * Cérebro do jogo: regras, pontuação, combos, vidas, spawn e fases (countdown/play/bail/finish).
 * Fica no mundo como um Renderable "invisível" cujo update() roda a cada frame.
 */
export class Director extends me.Renderable {
  constructor(refs) {
    super(0, 0, 1, 1);
    Object.assign(this, refs); // bg, gate, field, pickups, skater, fx, popups, banner
    this.alwaysUpdate = true;
    this.floating = true;
    this.level = refs.level;
    this.endless = !!this.level.endless;
    this.goalPx = this.endless ? Infinity : this.level.meters * METER;
    this.big = new Label(" ", { size: 130, lineWidth: 10, color: "#ffd23f" });
    this.big.place(W / 2, 250);
    this.big.hidden = true;
    this.pauseLabel = new Label("PAUSADO", { size: 70, lineWidth: 8 });
    this.pauseLabel.place(W / 2, 230);
    this.pauseLabel.hidden = true;
    this.pauseHint = new Label(["P ou ESC: continuar", "ENTER: voltar ao menu"], { size: 26, lineHeight: 1.45 });
    this.pauseHint.place(W / 2, 312);
    this.pauseHint.hidden = true;
    this.s = refs.session;
    this.bindSkaterEvents();
    this.restart();
  }

  get extraLabels() {
    return [this.big, this.pauseLabel, this.pauseHint];
  }

  restart() {
    const s = this.s;
    Object.assign(s, {
      score: 0, dist: 0, speed: 0, lives: this.level.lives, combo: 0, bestCombo: 0, mult: 1, stickers: 0,
      tricks: 0, bails: 0, slowT: 0, zone: 0, obstaclesDone: 0, grinds: 0, stickersSeen: 0,
    });
    this.field.configure(this.level);
    this.phase = "countdown";
    this.phaseT = 0;
    this.cd = 4;
    this.paused = false;
    this.ended = false;
    this.iris = 0; // 0..1: o círculo preto que fecha a tela ao entrar no túnel
    this.police.reset();
    this.skater.reset();
    this.pickups.reset();
    this.fx.reset();
    this.popups.reset();
    this.big.hidden = true;
    stopGrind();
  }

  get mult() {
    return Math.min(5, 1 + Math.floor(this.s.combo / 4));
  }
  addScore(n) {
    this.s.score += n;
  }

  bindSkaterEvents() {
    const sk = this.skater;
    sk.events.jump = () => {
      sfx("ollie", 0.7);
      this.fx.dust(PLAYER_X - 10, GROUND_Y, 5);
    };
    sk.events.land = (nTricks) => {
      sfx("land", 0.8);
      this.fx.dust(PLAYER_X - 10, GROUND_Y, 7);
      if (nTricks >= 2) {
        const b = 150 * this.mult;
        this.addScore(b);
        this.popups.show(`COMBO DE MANOBRAS! +${b}`, PLAYER_X + 130, GROUND_Y - 150, "#ff8fa3", 28);
      }
    };
    sk.events.trick = (name) => {
      const t = TRICKS[name];
      sfx("trick", 0.8);
      this.s.tricks++;
      const pts = t.points * this.mult;
      this.addScore(pts);
      this.popups.show(`${t.label}  +${pts}`, PLAYER_X + 100, sk.y - 105, TRICK_COLOR[name], 30, 1.0);
    };
    sk.events.grindStart = () => {
      startGrind();
      this.s.grinds++;
      this.popups.show("GRIND!", PLAYER_X + 90, sk.y - 95, "#ffe14a", 34, 1.0);
    };
    sk.events.grindEnd = () => stopGrind();
  }

  // ------------------------------------------------------------ entrada
  readInput() {
    const k = me.input.isKeyPressed;
    return {
      ollie: k("ollie"), kickflip: k("kickflip"), shoveit: k("shoveit"), grab: k("grab"), down: k("down"),
    };
  }

  update(dtMs) {
    const real = Math.min(dtMs / 1000, 0.05);
    this.police.frozen = this.paused;
    if (me.input.isKeyPressed("mute")) toggleMute();
    if (this.ended) return true;

    if (me.input.isKeyPressed("pause") && this.phase !== "countdown") {
      this.paused = !this.paused;
      this.pauseLabel.hidden = this.pauseHint.hidden = !this.paused;
      if (this.paused) me.audio.pauseTrack();
      else me.audio.resumeTrack();
      if (this.paused) stopGrind();
    }
    if (this.paused) {
      this.readInput();
      if (me.input.isKeyPressed("menu")) this.leave();
      return true;
    }

    const s = this.s;
    // câmera lenta (energético)
    let ts = 1;
    if (s.slowT > 0) {
      s.slowT -= real;
      ts = 0.62;
      this.fx.slowTint = Math.min(1, this.fx.slowTint + real * 4);
    } else this.fx.slowTint = Math.max(0, this.fx.slowTint - real * 3);
    const d = real * ts;

    const inp = this.readInput();
    this.phaseT += real;

    switch (this.phase) {
      case "countdown":
        this.stepCountdown(real, d);
        break;
      case "play":
        this.stepPlay(d, inp);
        break;
      case "bail":
        this.stepBail(d);
        break;
      case "finish":
        this.stepFinish(d);
        break;
    }
    this.popups.tick(real);
    this.banner.tick(real);
    return true;
  }

  // ------------------------------------------------------------ fases
  stepCountdown(real, d) {
    const nums = ["3", "2", "1", "VAI!"];
    const idx = Math.min(3, Math.floor(this.phaseT / 0.8));
    if (idx !== this.cdShown) {
      this.cdShown = idx;
      this.big.set(nums[idx]);
      this.big.hidden = false;
      sfx(idx === 3 ? "go" : "beep");
      if (idx === 0) startMusic(0.5);
      if (idx === 3) this.banner.show(this.levelTitle(), this.level.line, 5);
    }
    const k = (this.phaseT % 0.8) / 0.8;
    this.big.sc = 1.5 - 0.5 * Math.min(1, k * 2.2);
    this.bg.tick(d, 0, 0);
    this.fx.tick(d, 0);
    this.skater.tick(d, {}, 0);
    this.field.tick(d, 0);
    this.gate.tick(d, 1e6);
    if (this.phaseT >= 3.2) {
      this.big.hidden = true;
      this.phase = "play";
      this.phaseT = 0;
      this.cdShown = -1;
    }
  }

  levelTitle() {
    return this.endless ? "MODO ARCADE" : `FASE ${this.level.id} · ${this.level.name}`;
  }

  /** dificuldade 0..1: a velocidade sobe e os intervalos entre obstáculos diminuem */
  progress() {
    const lv = this.level;
    const ramp = this.endless ? lv.ramp * METER : lv.meters * METER * 0.85;
    return Math.min(1, this.s.dist / ramp);
  }

  targetSpeed() {
    const sp = this.level.speed;
    return lerp(sp[0], sp[1], this.progress());
  }

  stepPlay(d, inp) {
    const s = this.s;
    const sk = this.skater;
    const target = this.targetSpeed();
    s.speed = s.speed < target ? Math.min(target, s.speed + 520 * d) : target;
    const dx = s.speed * d;
    s.dist += dx;
    this.addScore(dx * 0.02);
    s.mult = this.mult;

    sk.tick(d, inp, s.speed);
    this.world_step(d, dx);

    // poeira ao andar no chão
    if (sk.state === "ride" && Math.random() < d * 14) this.fx.dust(PLAYER_X - 14, GROUND_Y, 1, -s.speed * 0.4);

    this.spawnLogic();
    this.grindLogic(inp);
    this.collideAndJudge();
    if (this.phase !== "play") return;
    this.pickupLogic();
    this.zoneLogic();

    // passou sob o portal da pista? (o skatista cruza a linha de chegada rolando)
    if (!this.endless && PLAYER_X + this.goalPx - s.dist <= PLAYER_X - 10) this.startFinish();
  }

  world_step(d, dx) {
    this.bg.tick(d, this.s.speed, this.s.dist);
    this.field.tick(d, dx);
    this.pickups.tick(d, dx);
    this.gate.tick(d, this.endless ? 1e6 : PLAYER_X + this.goalPx - this.s.dist);
    this.fx.tick(d, this.s.speed);
    this.police.speed = this.s.speed;
  }

  spawnLogic() {
    const s = this.s;
    const f = this.field;
    if (!this.endless && this.goalPx - s.dist < W + 900) return;
    const last = f.last;
    const edge = last ? last.x + last.w : -1e9;
    const ok = last ? edge + f.nextGap <= W + 60 : s.dist > 160;
    if (!ok) return;
    // o intervalo é calculado com a velocidade ALVO (não a atual): logo depois de um tombo ou da
    // largada a velocidade ainda está subindo e, com ela, os obstáculos nasceriam colados um no outro.
    const o = f.spawn(W + 60, Math.max(s.speed, this.targetSpeed()), this.progress(), s.dist / METER);
    // estrelas
    s.stickersSeen += 5;
    if (o.type === "rail") {
      for (let i = 0; i < 5; i++) this.pickups.add("coin", o.x + 30 + i * 32, GROUND_Y - 30 - 50);
    } else this.pickups.coinArc(o.x + o.w / 2, GROUND_Y - o.h);
    // power-up a cada 7 obstáculos, no meio do espaço seguinte
    if (f.spawned % 7 === 0) {
      const kind = s.lives < MAX_LIVES && Math.random() < 0.65 ? "life" : "slow";
      this.pickups.add(kind, o.x + o.w + f.nextGap * 0.5, GROUND_Y - 44);
    }
  }

  grindLogic(inp) {
    const sk = this.skater;
    const s = this.s;
    // entrar no corrimão: caindo sobre ele segurando ↓
    if (sk.state === "air" && sk.vy > 0 && sk.downBuf > 0) {
      for (const o of this.field.list) {
        if (o.type !== "rail" || o.knock) continue;
        const top = GROUND_Y - o.def.parts[0].h;
        if (PLAYER_X > o.x + 6 && PLAYER_X < o.x + o.w - 10 && sk.prevY <= top + 8 && sk.y >= top) {
          sk.startGrind(o, top);
          break;
        }
      }
    }
    if (sk.state === "grind") {
      const o = sk.grindObs;
      this.addScore(180 * this.mult * (1 / 60));
      if (Math.random() < 0.9) this.fx.sparks(PLAYER_X + 8, sk.y, 2);
      if (sk.grindT > 0.28) o.grindOk = true;
      if (!inp.down && sk.downBuf <= 0) sk.endGrind("release");
      else if (sk.ollieBuf > 0) sk.endGrind("jump");
      else if (PLAYER_X > o.x + o.w - 12) {
        o.grindOk = true;
        sk.endGrind("end");
      }
    }
  }

  collideAndJudge() {
    const sk = this.skater;
    const left = PLAYER_X - HIT_W / 2;
    const right = PLAYER_X + HIT_W / 2;
    const feet = sk.y;
    for (const o of this.field.list) {
      if (o.knock) continue;
      if (!(sk.state === "grind" && sk.grindObs === o) && sk.invuln <= 0 && sk.state !== "bail") {
        for (const p of o.def.parts) {
          const rx0 = o.x + p.dx;
          const rx1 = rx0 + p.w;
          const top = GROUND_Y - p.h;
          // tolerância: raspar o topo do obstáculo não conta como batida
          if (right > rx0 && left < rx1 && feet > top + HIT_GRACE) {
            this.bail("hit", o);
            return;
          }
        }
      }
      if (!o.judged && o.x + o.w < left) this.judge(o);
      if (this.phase !== "play") return;
    }
  }

  judge(o) {
    const sk = this.skater;
    const s = this.s;
    o.judged = true;
    if (sk.invuln > 0) return;
    const need = o.def.need;
    const ok = need === "ollie" ? true : need === "grind" ? o.grindOk : sk.tricks.has(need);
    if (!ok) {
      o.state = "warn";
      this.bail("sketchy", o);
      return;
    }
    o.state = "ok";
    s.combo++;
    s.obstaclesDone++;
    s.bestCombo = Math.max(s.bestCombo, s.combo);
    const before = s.mult;
    s.mult = this.mult;
    const pts = o.def.points * s.mult;
    this.addScore(pts);
    sfx("select", 0.7);
    const cx = o.x + o.w / 2;
    this.fx.burst(cx, GROUND_Y - o.h - 56, "#8dffb5", 12, 230);
    this.popups.show(`${o.def.name.toUpperCase()}! +${pts}`, Math.min(W - 190, Math.max(190, cx)), GROUND_Y - o.h - 115, "#8dffb5", 28, 1.1);
    if (s.mult > before) {
      sfx("powerup", 0.6);
      this.popups.show(`COMBO x${s.mult}!`, PLAYER_X + 150, GROUND_Y - 205, "#ffd23f", 48, 1.4);
      this.fx.confetti(30);
    }
  }

  bail(kind, o) {
    if (this.phase !== "play") return;
    const s = this.s;
    this.phase = "bail";
    this.phaseT = 0;
    s.lives--;
    s.bails++;
    s.combo = 0;
    s.mult = 1;
    stopGrind();
    this.police.show(s.lives <= 0); // os guardas correm em direção ao skatista caído
    this.skater.startBail(kind);
    if (o && kind === "hit") this.field.knockOver(o, 1);
    sfx("crash", 1);
    this.fx.doFlash("#ff2d2d", 0.5);
    this.fx.dust(PLAYER_X, GROUND_Y, 16, -50);
    try {
      me.game.viewport.shake(14, 420, me.game.viewport.AXIS.BOTH);
    } catch (e) { /* ignore */ }
    const msg = kind === "hit" ? "AI! BATEU!" : `FALTOU O ${o.def.hint}!`;
    this.popups.show(msg, PLAYER_X + 150, GROUND_Y - 170, "#ff6b81", 40, 1.5);
  }

  stepBail(d) {
    const s = this.s;
    s.speed = Math.max(0, s.speed - 1700 * d);
    const dx = s.speed * d;
    s.dist += dx;
    this.skater.tick(d, {}, s.speed);
    this.world_step(d, dx);
    this.zoneLogic();
    if (this.phaseT > 1.25) {
      if (s.lives <= 0) {
        this.endGame(false);
        return;
      }
      this.skater.respawn();
      this.police.release(); // ele foge e eles ficam para trás
      this.field.knockNear(PLAYER_X + 720); // limpa a pista à frente: respiro depois do tombo
      this.phase = "play";
      this.phaseT = 0;
    }
  }

  /** o skatista chegou à boca do túnel: segue rolando para dentro, a luz some e a tela fecha em preto */
  startFinish() {
    this.phase = "finish";
    this.phaseT = 0;
    this.skater.celebrate = true;
    this.fx.confetti(70);
    sfx("win", 1);
    this.addScore(1000 * this.s.lives);
    const last = this.level.id === LEVELS.length;
    this.popups.show(last ? "VOCÊ ESCAPOU!" : "FASE COMPLETA!", W / 2, 200, "#ffd23f", 56, 2.4);
  }
  stepFinish(d) {
    const s = this.s;
    // continua rolando túnel adentro (só perde um pouco de velocidade)
    s.speed = Math.max(300, s.speed - 140 * d);
    const dx = s.speed * d;
    s.dist += dx;
    this.skater.tick(d, {}, s.speed);
    this.world_step(d, dx);
    if (this.phaseT > 0.9) this.skater.celebrate = false;
    this.iris = Math.max(0, Math.min(1, (this.phaseT - 1.15) / 1.0));
    if (this.phaseT > 2.45) this.endGame(true);
  }

  pickupLogic() {
    const sk = this.skater;
    const s = this.s;
    const x0 = PLAYER_X - 16;
    const x1 = PLAYER_X + 16;
    const y0 = sk.y - HIT_H - 8;
    const y1 = sk.y + 6;
    for (const p of this.pickups.list) {
      if (p.taken) continue;
      const rad = p.kind === "coin" ? 16 : 28;
      if (p.x + rad > x0 && p.x - rad < x1 && p.y + rad > y0 && p.y - rad < y1) {
        p.taken = true;
        if (p.kind === "coin") {
          s.stickers++;
          this.addScore(25);
          sfx("coin", 0.55);
          this.fx.burst(p.x, p.y, "#ffd23f", 6, 150);
        } else if (p.kind === "life") {
          sfx("life", 0.9);
          if (s.lives < MAX_LIVES) {
            s.lives++;
            this.popups.show("+1 VIDA!", p.x, p.y - 30, "#ff8fa3", 30, 1.3);
          } else {
            this.addScore(500);
            this.popups.show("+500", p.x, p.y - 30, "#ff8fa3", 30, 1.3);
          }
          this.fx.burst(p.x, p.y, "#ff3b5c", 16, 260);
        } else {
          sfx("powerup", 0.9);
          s.slowT = 5;
          this.popups.show("CÂMERA LENTA!", p.x, p.y - 30, "#4cc9f0", 30, 1.3);
          this.fx.burst(p.x, p.y, "#4cc9f0", 16, 260);
        }
      }
    }
  }

  zoneLogic() {
    const z = zoneIndex(this.level, this.s.dist);
    if (z <= this.s.zone) return;
    this.s.zone = z;
    sfx("zone", 0.9);
    const key = this.level.keys[z % this.level.keys.length];
    if (this.endless) this.banner.show(`ZONA ${z + 1} · ${ZONES[key].name}`, ARCADE_LINES[(z - 1) % ARCADE_LINES.length], 4.2);
    else this.banner.show(`${ZONES[key].name} · METADE!`, this.level.midLine, 4.2);
  }

  /** sai para o menu de fases (pelo menu de pausa) */
  leave() {
    if (this.ended) return;
    this.ended = true;
    stopGrind();
    stopMusic();
    sfx("select");
    me.state.change(STATE_LEVELS);
  }

  // ------------------------------------------------------------ fim
  endGame(won) {
    if (this.ended) return;
    this.ended = true;
    stopGrind();
    stopMusic();
    const s = this.s;
    const lv = this.level;
    const score = Math.floor(s.score);
    const meters = Math.floor(s.dist / METER);
    const result = {
      won, score, meters, arcade: this.endless, levelIndex: this.endless ? -1 : lv.id - 1,
      stickers: s.stickers, bestCombo: s.bestCombo, tricks: s.tricks, obstacles: s.obstaclesDone, bails: s.bails,
      zones: s.zone + 1, record: false, newStars: 0, stars: [false, false, false],
    };
    if (this.endless) {
      result.record = saveArcade(score, meters).record;
    } else {
      // 3 estrelas: terminar a fase, juntar as estrelas da meta, errar pouco
      const stars = [won, won && s.stickers >= lv.stickerGoal, won && s.bails <= lv.maxBails];
      const saved = saveLevel(lv.id - 1, score, stars, Math.min(lv.meters, meters));
      Object.assign(result, { stars, record: saved.record, newStars: saved.newStars });
      result.meters = Math.min(lv.meters, meters);
    }
    if (!won) sfx("gameover", 1);
    setTimeout(() => me.state.change(me.state.GAMEOVER, false, result), won ? 0 : 900);
  }
}
