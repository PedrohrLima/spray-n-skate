import * as me from "melonjs";

/** Ajustes de som salvos no navegador: volume da música/efeitos (0..1) e mudo. */
const DEFAULTS = { music: 1, sfx: 1, muted: false };
let cache = null;

export function getSettings() {
  if (!cache) {
    try {
      cache = { ...DEFAULTS, ...JSON.parse(me.save.settings || "{}") };
    } catch (e) {
      cache = { ...DEFAULTS };
    }
  }
  return cache;
}
export function saveSettings() {
  try {
    me.save.settings = JSON.stringify(getSettings());
  } catch (e) {
    /* localStorage indisponível: o ajuste vale só nesta sessão */
  }
}
