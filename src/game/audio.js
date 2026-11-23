import * as me from "melonjs";
import { getSettings, saveSettings } from "./settings.js";

let muted = false;
let grindId = null;
let musicBase = 0.5; // volume "de projeto" da música atual (o ajuste do jogador multiplica)
let musicNow = 0.5; // volume real em que a música está tocando

export const ASSETS = [
  "music", "ollie", "trick", "land", "coin", "crash", "grind", "powerup", "life",
  "select", "beep", "go", "zone", "gameover", "win", "spray", "alert", "siren", "skid", "shake", "whistle", "chopper", "door", "roll",
].map((name) => ({ name, type: "audio", src: "audio/" }));

/** aplica os ajustes salvos (chamar uma vez, depois de me.audio.init) */
export function initAudio() {
  muted = !!getSettings().muted;
  if (muted) me.audio.muteAll();
}
export function sfx(name, volume = 1) {
  if (muted) return;
  me.audio.play(name, false, null, volume * getSettings().sfx);
}
export function startMusic(volume = 0.5) {
  musicBase = volume;
  musicNow = volume * getSettings().music;
  me.audio.stopTrack();
  me.audio.playTrack("music", musicNow);
}
/** aplica o volume ajustado na música que já está tocando (sem reiniciar) */
export function refreshMusic() {
  const to = musicBase * getSettings().music;
  try {
    me.audio.fade("music", musicNow, to, 60);
  } catch (e) {
    /* sem trilha ativa */
  }
  musicNow = to;
}
export function setVolumes({ music, sfx: fx }) {
  const s = getSettings();
  if (music !== undefined) s.music = music;
  if (fx !== undefined) s.sfx = fx;
  saveSettings();
}
export function stopMusic() {
  me.audio.stopTrack();
}
export function startGrind() {
  if (muted || grindId !== null) return;
  grindId = me.audio.play("grind", true, null, 0.55 * getSettings().sfx);
}
export function stopGrind() {
  if (grindId !== null) {
    me.audio.stop("grind");
    grindId = null;
  }
}
export function isMuted() {
  return muted;
}
export function toggleMute() {
  muted = !muted;
  if (muted) me.audio.muteAll();
  else me.audio.unmuteAll();
  getSettings().muted = muted;
  saveSettings();
  return muted;
}
