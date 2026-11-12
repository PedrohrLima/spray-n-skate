import * as me from "melonjs";
import "@fontsource/bungee/latin-400.css";
import "@fontsource/nunito/latin-700.css";
import "@fontsource/nunito/latin-900.css";
import { W, H } from "./config.js";
import { ASSETS, initAudio } from "./game/audio.js";
import { STATE_CUTSCENE, STATE_LEVELS, STATE_OPTIONS, run } from "./states.js";
import { initProgress } from "./game/progress.js";
import { LevelSelect } from "./scenes/levels.js";
import { TitleScreen } from "./scenes/title.js";
import { CutsceneScreen } from "./scenes/cutscene.js";
import { OptionsScreen } from "./scenes/options.js";
import { PlayScreen } from "./scenes/play.js";
import { ResultScreen } from "./scenes/result.js";

me.device.onReady(() => {
  // 1) vídeo: canvas 960x540, escala automática mantendo a proporção
  if (!me.video.init(W, H, { parent: "screen", scale: "auto", scaleMethod: "fit" })) {
    alert("Seu navegador não suporta HTML5 canvas :(");
    return;
  }
  me.game.isAlwaysDirty = true;

  // 2) áudio (arquivos .wav gerados em public/audio)
  me.audio.init("wav");

  // 3) teclado: ações do jogo
  const K = me.input.KEY;
  const bind = (keys, action, lock = true) => keys.forEach((k) => me.input.bindKey(k, action, lock, true));
  bind([K.SPACE, K.UP, K.W], "ollie");
  bind([K.Z, K.J], "kickflip");
  bind([K.X, K.K], "shoveit");
  bind([K.C, K.L], "grab");
  bind([K.DOWN, K.S], "down", false);
  bind([K.P, K.ESC], "pause");
  bind([K.M], "mute");
  bind([K.ENTER], "menu");
  bind([K.LEFT, K.A], "left");
  bind([K.RIGHT, K.D], "right");
  bind([K.U], "unlock");

  // 4) progresso (fases, estrelas e recordes) salvo no navegador (localStorage)
  initProgress();
  initAudio();

  // 5) fontes embutidas precisam estar prontas antes de qualquer texto ser desenhado
  const fontsReady = Promise.race([
    Promise.all([
      document.fonts.load('400 40px "Bungee"'),
      document.fonts.load('700 20px "Nunito"'),
      document.fonts.load('900 20px "Nunito"'),
    ]).catch(() => {}),
    new Promise((ok) => setTimeout(ok, 3000)),
  ]);

  // 6) carrega os sons e registra as telas
  me.loader.preload(ASSETS, () => {
    fontsReady.then(() => {
      me.state.set(me.state.MENU, new TitleScreen());
      me.state.set(STATE_CUTSCENE, new CutsceneScreen());
      me.state.set(STATE_LEVELS, new LevelSelect());
      me.state.set(STATE_OPTIONS, new OptionsScreen());
      me.state.set(me.state.PLAY, new PlayScreen());
      me.state.set(me.state.GAMEOVER, new ResultScreen());
      me.state.transition("fade", "#10101c", 220);
      // atalhos para testes/apresentação: ?play=1|2|3|arcade abre direto a fase; ?cutscene=... abre a cutscene
      const params = new URLSearchParams(window.location.search);
      const q = params.get("play") || params.get("cutscene");
      if (q) {
        run.index = q === "arcade" ? -1 : Math.max(0, Math.min(2, Number(q) - 1 || 0));
        me.state.change(params.has("cutscene") ? STATE_CUTSCENE : me.state.PLAY);
      } else me.state.change(me.state.MENU);
    });
  });

  // 7) botões de toque (celular/tablet) disparam as mesmas teclas
  const press = (code, down) => me.input.triggerKeyEvent(code, down);
  document.querySelectorAll("[data-key]").forEach((btn) => {
    const code = K[btn.dataset.key];
    const on = (e) => { e.preventDefault(); btn.classList.add("on"); press(code, true); };
    const off = (e) => { e.preventDefault(); btn.classList.remove("on"); press(code, false); };
    btn.addEventListener("pointerdown", on);
    ["pointerup", "pointerleave", "pointercancel"].forEach((ev) => btn.addEventListener(ev, off));
  });
});
