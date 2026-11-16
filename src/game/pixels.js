// Mini-sprites em "pixel art" desenhados com retângulos (sem arquivos de imagem).
export const SPR = {
  heart: {
    rows: [".aa.aa.", "awaaaaa", "aaaaaaa", ".aaaaa.", "..aaa..", "...a..."],
    pal: { a: "#ff3b5c", w: "#ffc2cd" },
  },
  heartEmpty: {
    rows: [".aa.aa.", "aaaaaaa", "aaaaaaa", ".aaaaa.", "..aaa..", "...a..."],
    pal: { a: "#5b5678" },
  },
  star: {
    rows: [
      "....y....",
      "....y....",
      "...yyy...",
      "yyywyyyyy",
      ".yyyyyyo.",
      "..yyyyo..",
      "..yyyoo..",
      ".yyyooyy.",
      ".yy...oy.",
    ],
    pal: { y: "#ffd23f", w: "#fff7c2", o: "#f08c00" },
  },
  can: {
    rows: [
      "..ggggg..",
      ".wbbbbbw.",
      ".wbbybbw.",
      ".wbyybbw.",
      ".wbbyybw.",
      ".wbbybbw.",
      ".wbbbbbw.",
      "..ggggg..",
    ],
    pal: { g: "#9aa6b8", w: "#e8f0ff", b: "#2f9bff", y: "#ffe14a" },
  },
};

function prepare(spr) {
  spr._runs = [];
  spr.rows.forEach((row, j) => {
    let i = 0;
    while (i < row.length) {
      const ch = row[i];
      if (ch === "." || ch === " ") {
        i++;
        continue;
      }
      let k = i;
      while (k < row.length && row[k] === ch) k++;
      spr._runs.push([i, j, k - i, spr.pal[ch]]);
      i = k;
    }
  });
  spr.w = Math.max(...spr.rows.map((r) => r.length));
  spr.h = spr.rows.length;
}

export function drawPixels(r, spr, x, y, s = 1, flip = false) {
  if (!spr._runs) prepare(spr);
  let last = null;
  for (const [i, j, len, col] of spr._runs) {
    if (col !== last) {
      r.setColor(col);
      last = col;
    }
    const px = flip ? x + (spr.w - i - len) * s : x + i * s;
    r.fillRect(px, y + j * s, len * s, s);
  }
}
export function spriteSize(spr, s = 1) {
  if (!spr._runs) prepare(spr);
  return [spr.w * s, spr.h * s];
}
