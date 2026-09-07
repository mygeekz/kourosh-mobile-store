import fs from "node:fs";
import path from "node:path";
import react from "@vitejs/plugin-react";
import { defineConfig, type Plugin } from "vite";
import { kouroshAliases, kouroshManualChunk } from "./vite.shared.config";

const rootDir = __dirname;

const emitMiniAppPublicFiles = (): Plugin => ({
  name: "kourosh-miniapp-public-files",
  apply: "build",
  generateBundle() {
    for (const [fileName, sourcePath] of [
      ["favicon.svg", path.resolve(rootDir, "public/favicon.svg")],
      ["kourosh-logo.svg", path.resolve(rootDir, "public/kourosh-logo.svg")],
      ["fonts/Vazir-FD-WOL.woff2", path.resolve(rootDir, "public/fonts/Vazir-FD-WOL.woff2")],
      ["miniapp/premium/store-avatar.webp", path.resolve(rootDir, "public/miniapp/premium/store-avatar.webp")],
      ["miniapp/premium/wallet-hero.webp", path.resolve(rootDir, "public/miniapp/premium/wallet-hero.webp")],
    ] as const) {
      if (!fs.existsSync(sourcePath)) throw new Error(`Mini App public dependency is missing: ${fileName}`);
      this.emitFile({ type: "asset", fileName, source: fs.readFileSync(sourcePath) });
    }
  },
});

export default defineConfig({
  publicDir: false,
  plugins: [react(), emitMiniAppPublicFiles()],
  resolve: { alias: kouroshAliases(rootDir) },
  build: {
    outDir: "dist-miniapp",
    emptyOutDir: true,
    sourcemap: false,
    chunkSizeWarningLimit: 1000,
    rollupOptions: {
      input: path.resolve(rootDir, "miniapp.html"),
      output: { manualChunks: kouroshManualChunk },
    },
  },
});
