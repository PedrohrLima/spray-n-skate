import * as me from "melonjs";
import { LEVELS, ARCADE } from "./config.js";

export const STATE_CUTSCENE = me.state.USER + 0;
export const STATE_LEVELS = me.state.USER + 1;
export const STATE_OPTIONS = me.state.USER + 2;

/** o que vai ser jogado: { index: 0..2 } = fase, { index: -1 } = Arcade */
export const run = { index: 0 };
export const currentLevel = () => (run.index < 0 ? ARCADE : LEVELS[run.index]);

/** abre a cutscene da fase (ou do Arcade, index = -1) e, ao terminar, o jogo começa */
export function startRun(index) {
  run.index = index;
  me.state.change(STATE_CUTSCENE);
}
