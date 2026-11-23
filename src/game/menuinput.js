// Teclado dos menus (título e opções): ouve o teclado direto no navegador, porque no jogo as
// setas/espaço já estão ligadas a ações de manobra (ex.: ↑ = ollie) e não dá para usá-las para navegar.
const MAP = {
  ArrowUp: "up", KeyW: "up",
  ArrowDown: "down", KeyS: "down",
  ArrowLeft: "left", KeyA: "left",
  ArrowRight: "right", KeyD: "right",
  Enter: "ok", Space: "ok", NumpadEnter: "ok",
  Escape: "back", Backspace: "back",
};

/** cb(acao) com acao = up | down | left | right | ok | back. Devolve a função que desliga o ouvinte. */
export function onMenuKeys(cb) {
  const h = (e) => {
    const a = MAP[e.code];
    if (!a) return;
    e.preventDefault();
    if (!e.repeat || a === "left" || a === "right") cb(a);
  };
  window.addEventListener("keydown", h);
  return () => window.removeEventListener("keydown", h);
}

/** converte o clique/toque para coordenadas do jogo (960x540) */
export function onCanvasPointer(canvas, W, H, cb) {
  const h = (e) => {
    const rect = canvas.getBoundingClientRect();
    cb(((e.clientX - rect.left) * W) / rect.width, ((e.clientY - rect.top) * H) / rect.height, e);
  };
  canvas.addEventListener("pointerdown", h);
  return () => canvas.removeEventListener("pointerdown", h);
}
