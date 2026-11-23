import * as me from "melonjs";

const OFFS = [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [1, 1], [-1, 1], [1, -1]];
// Fontes embutidas no jogo (@fontsource): Bungee nos títulos/números, Nunito (Black) no resto.
// Se alguma não carregar, o navegador cai para as fontes do sistema.
export const FONT_TITLE = '"Bungee", Impact, "Arial Black", sans-serif';
export const FONT_BODY = '"Nunito", Verdana, Tahoma, Arial, sans-serif';
const isTitle = (size, opts) => (opts.title === undefined ? size >= 36 : !!opts.title);
const fontFor = (size, opts) => opts.font || (isTitle(size, opts) ? FONT_TITLE : FONT_BODY);
// contorno proporcional ao tamanho: bem mais grosso que antes, para ler sobre qualquer cenário
const outlineFor = (size) => Math.max(3, Math.min(9, Math.round(size / 7)));

/** aplica família/tamanho; Nunito usa peso 900 (Black), Bungee só existe em 400 */
function applyFont(t, size, opts) {
  const title = isTitle(size, opts);
  t.setFont(fontFor(size, opts), size);
  if (!title && opts.bold !== false) t.font = "900 " + t.font;
  t.isDirty = true;
}

/**
 * Texto (me.Text) com contorno e posição "livre".
 *  - O me.Text guarda o texto numa textura; para mover sem re-renderizar, a posição fica em
 *    (0,0) e aplicamos um deslocamento (ox, oy) ao desenhar.
 *  - O contorno é um segundo me.Text escuro desenhado em 8 deslocamentos (o stroke nativo
 *    do canvas "come" o preenchimento em fontes finas).
 */
export class Label extends me.Text {
  constructor(text, opts = {}) {
    const size = opts.size || 24;
    const base = {
      font: fontFor(size, opts),
      size,
      textAlign: opts.align || "center",
      textBaseline: opts.baseline || "middle",
      lineHeight: opts.lineHeight || 1.2,
      lineWidth: 0,
      text: text === undefined ? " " : text,
    };
    super(0, 0, { ...base, fillStyle: opts.color || "#ffffff" });
    this.back = new me.Text(0, 0, { ...base, fillStyle: opts.stroke || "#0b0b16" });
    applyFont(this, size, opts);
    applyFont(this.back, size, opts);
    this.setText(base.text);
    this.back.setText(base.text);
    this.back.ancestor = this; // evita que o Text "de trás" se re-renderize a cada draw
    this.outline = opts.lineWidth === 0 ? 0 : opts.outline || outlineFor(size);
    this.opts = opts;
    this.floating = true; // não treme com a câmera e nunca é "culled"
    this.alwaysUpdate = true;
    this.ox = 0;
    this.oy = 0;
    this.sc = 1; // escala (animações sem mexer na transparência)
    this.hidden = !!opts.hidden;
    this.shown = String(text === undefined ? " " : text);
  }
  place(x, y) {
    this.ox = x;
    this.oy = y;
    return this;
  }
  setText(value) {
    super.setText(value);
    if (this.back) this.back.setText(value);
    return this;
  }
  /** só re-renderiza quando o texto realmente muda */
  set(text) {
    const s = Array.isArray(text) ? text.join("\n") : String(text);
    if (s !== this.shown) {
      this.shown = s;
      this.setText(s);
    }
    return this;
  }
  recolor(css) {
    this.fillStyle.parseCSS(css);
    this.setText(this.shown);
    return this;
  }
  /** troca tamanho e/ou cor (re-renderiza) */
  style({ size, color }) {
    if (size) {
      applyFont(this, size, this.opts);
      applyFont(this.back, size, this.opts);
      this.outline = this.opts.lineWidth === 0 ? 0 : outlineFor(size);
    }
    if (color) this.fillStyle.parseCSS(color);
    this.setText(this.shown);
    return this;
  }
  draw(renderer) {
    if (this.hidden || this.shown.trim() === "") return; // texto vazio = textura de tamanho 0
    renderer.save();
    renderer.translate(this.ox, this.oy);
    if (this.sc !== 1) renderer.scale(this.sc, this.sc);
    if (this.outline > 0) {
      for (const [dx, dy] of OFFS) {
        renderer.save();
        renderer.translate(dx * this.outline, dy * this.outline);
        this.back.draw(renderer);
        renderer.restore();
      }
    }
    super.draw(renderer);
    renderer.restore();
  }
  update() {
    return true;
  }
  // um Label que nunca chegou a ser desenhado (hidden) não tem textura na GPU:
  // o destroy() padrão do me.Text falharia ao tentar liberá-la.
  destroy() {
    try {
      this.back.ancestor = undefined;
      this.back.destroy();
    } catch (e) { /* nada a liberar */ }
    try {
      super.destroy();
    } catch (e) { /* nada a liberar */ }
  }
}
