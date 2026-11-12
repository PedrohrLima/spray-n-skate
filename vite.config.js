import { defineConfig } from "vite";

// base relativo: o build funciona abrindo de qualquer pasta e no GitHub Pages
export default defineConfig({
  base: "./",
  build: { outDir: "dist", chunkSizeWarningLimit: 2000 },
  server: { host: true, port: 5173 },
});
