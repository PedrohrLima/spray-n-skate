import { Color } from "melonjs";
import { ZONES, METER } from "../config.js";

const lerp = (a, b, t) => a + (b - a) * t;
const smooth = (t) => t * t * (3 - 2 * t);
const NUM_KEYS = ["stars", "lit", "sunA", "sunY", "moonA", "moonY"];
const RGB_KEYS = ["top", "bottom", "far", "near", "ground", "line2"];

const out = { zone: 0, name: "", next: 0, k: 0 };
RGB_KEYS.forEach((k) => (out[k] = [0, 0, 0]));
NUM_KEYS.forEach((k) => (out[k] = 0));

/**
 * Cada fase atravessa uma lista de paletas (level.keys). Em fases normais, a distância total
 * da fase é dividida igualmente entre as paletas; no Arcade (loop) cada paleta dura
 * level.zoneMeters e a lista recomeça quando acaba.
 * Retorna o progresso em "zonas" (0 .. n, com fração).
 */
export function zoneProgress(level, distPx) {
  const n = level.keys.length;
  if (level.loop) return Math.max(0, distPx / (level.zoneMeters * METER));
  const total = level.meters * METER;
  return Math.max(0, Math.min(n - 0.0001, (distPx / total) * n));
}
/** índice (0..) da zona em que a distância está (no Arcade continua crescendo: 0,1,2,3,4...) */
export function zoneIndex(level, distPx) {
  return Math.floor(zoneProgress(level, distPx));
}

/** Paleta interpolada para a distância (mistura suavemente com a próxima zona). */
export function paletteAt(level, distPx) {
  const keys = level.keys;
  const n = keys.length;
  const p = zoneProgress(level, distPx);
  const i = Math.floor(p);
  const frac = p - i;
  const last = !level.loop && i >= n - 1;
  const a = ZONES[keys[i % n]];
  const b = ZONES[keys[last ? i : (i + 1) % n]];
  const k = last ? 0 : smooth(Math.max(0, (frac - 0.7) / 0.3));
  out.zone = i;
  out.k = k; // quanto da próxima zona já está misturado (0..1)
  out.name = a.name;
  for (const key of RGB_KEYS) for (let c = 0; c < 3; c++) out[key][c] = lerp(a[key][c], b[key][c], k);
  for (const key of NUM_KEYS) out[key] = lerp(a[key], b[key], k);
  return out;
}

const tmp = new Color(0, 0, 0, 1);
/**
 * setColor com array [r,g,b] sem criar strings.
 * Atenção: no renderer WebGL o alpha "global" e o alpha da cor compartilham o mesmo valor
 * (setColor multiplica!). Por isso a cor é sempre opaca e a transparência é controlada
 * só por setGlobalAlpha(a).
 */
export function setRGB(r, rgb, a = 1, mul = 1) {
  tmp.setColor(
    Math.max(0, Math.min(255, rgb[0] * mul)),
    Math.max(0, Math.min(255, rgb[1] * mul)),
    Math.max(0, Math.min(255, rgb[2] * mul)),
    1
  );
  r.setColor(tmp);
  r.setGlobalAlpha(a);
}
export const mix = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t), lerp(a[2], b[2], t)];
