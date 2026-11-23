import * as me from "melonjs";

// Formas vetoriais usadas nos menus (estrela e cadeado), desenhadas com a API do renderer.
const cache = new Map();

function starPoly(R) {
  let p = cache.get(R);
  if (!p) {
    const pts = [];
    for (let i = 0; i < 10; i++) {
      const a = -Math.PI / 2 + (i * Math.PI) / 5;
      const rad = i % 2 === 0 ? R : R * 0.46;
      pts.push(new me.Vector2d(Math.cos(a) * rad, Math.sin(a) * rad));
    }
    p = new me.Polygon(0, 0, pts);
    cache.set(R, p);
  }
  return p;
}

/** estrela de 5 pontas com contorno escuro. on = conquistada (dourada) / apagada (cinza) */
export function drawStar(r, cx, cy, R, on = true, scale = 1) {
  r.save();
  r.translate(cx, cy);
  if (scale !== 1) r.scale(scale, scale);
  r.setColor(on ? "#7a4a00" : "#0b0b16");
  r.setGlobalAlpha(1);
  r.fillPolygon(starPoly(R + 4));
  r.setColor(on ? "#ffd23f" : "#3b3f63");
  r.fillPolygon(starPoly(R));
  if (on) {
    r.setColor("#fff4b0");
    r.fillPolygon(starPoly(Math.round(R * 0.5)));
  }
  r.restore();
}

/** cadeado em "pixel art" centrado em (cx, cy) */
export function drawLock(r, cx, cy, s = 1) {
  const x = cx - 18 * s;
  const y = cy - 20 * s;
  r.setColor("#c9d1ff");
  r.fillRect(x + 6 * s, y, 24 * s, 6 * s); // arco do cadeado
  r.fillRect(x + 6 * s, y, 6 * s, 20 * s);
  r.fillRect(x + 24 * s, y, 6 * s, 20 * s);
  r.setColor("#ffd23f");
  r.fillRoundRect(x, y + 16 * s, 36 * s, 28 * s, 5 * s);
  r.setColor("#10101c");
  r.fillRect(x + 15 * s, y + 24 * s, 6 * s, 10 * s);
}
