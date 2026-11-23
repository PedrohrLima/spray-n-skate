import * as me from "melonjs";
import { LEVELS } from "../config.js";

/**
 * Progresso do jogador, salvo no navegador (localStorage via me.save).
 * Formato (JSON): { levels: { "1": { score, stars:[bool,bool,bool], meters } }, arcade: { score, meters }, unlockAll }
 */
const KEY = "progress";

function load() {
  try {
    const d = JSON.parse(me.save[KEY] || "{}");
    d.levels = d.levels || {};
    d.arcade = d.arcade || { score: 0, meters: 0 };
    return d;
  } catch (e) {
    return { levels: {}, arcade: { score: 0, meters: 0 } };
  }
}
function store(d) {
  me.save[KEY] = JSON.stringify(d);
}

export function initProgress() {
  me.save.add({ [KEY]: "{}", settings: "{}" });
}

/** dados da fase i (0..2): melhor pontuação e estrelas já conquistadas */
export function levelInfo(i) {
  const d = load();
  const r = d.levels[String(LEVELS[i].id)] || { score: 0, stars: [false, false, false], meters: 0 };
  const count = r.stars.filter(Boolean).length;
  return { score: r.score, stars: r.stars, count, meters: r.meters, done: r.stars[0] };
}
export function arcadeInfo() {
  return load().arcade;
}
export function totalStars() {
  let n = 0;
  for (let i = 0; i < LEVELS.length; i++) n += levelInfo(i).count;
  return n;
}
export function unlockAllOn() {
  return !!load().unlockAll;
}
export function toggleUnlockAll() {
  const d = load();
  d.unlockAll = !d.unlockAll;
  store(d);
  return d.unlockAll;
}
/** a fase 1 e o Arcade estão sempre abertos; as outras abrem ao completar a anterior */
export function isUnlocked(i) {
  return i === 0 || unlockAllOn() || levelInfo(i - 1).done;
}

/** guarda o resultado de uma fase; devolve { record, newStars } */
export function saveLevel(i, score, stars, meters) {
  const d = load();
  const id = String(LEVELS[i].id);
  const old = d.levels[id] || { score: 0, stars: [false, false, false], meters: 0 };
  const merged = old.stars.map((v, k) => v || !!stars[k]);
  const record = score > old.score;
  const newStars = merged.filter(Boolean).length - old.stars.filter(Boolean).length;
  d.levels[id] = { score: Math.max(old.score, score), stars: merged, meters: Math.max(old.meters, meters) };
  store(d);
  return { record, newStars };
}
export function saveArcade(score, meters) {
  const d = load();
  const record = score > d.arcade.score;
  d.arcade = { score: Math.max(d.arcade.score, score), meters: Math.max(d.arcade.meters, meters) };
  store(d);
  return { record };
}
