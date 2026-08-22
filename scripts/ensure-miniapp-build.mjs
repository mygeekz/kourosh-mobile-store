#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const defaultRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export const validateMiniAppBuild = (rootDir = defaultRoot) => {
  const outDir = path.join(rootDir, "dist-miniapp");
  const required = [
    path.join(outDir, "miniapp.html"),
    path.join(outDir, "favicon.svg"),
    path.join(outDir, "kourosh-logo.svg"),
    path.join(outDir, "fonts", "Vazir-FD-WOL.woff2"),
  ];
  if (!required.every((filePath) => {
    try { const stat = fs.statSync(filePath); return stat.isFile() && stat.size > 0; } catch { return false; }
  })) return false;

  try {
    const html = fs.readFileSync(path.join(outDir, "miniapp.html"), "utf8");
    if (!/<script\b[^>]*\bsrc=/i.test(html)) return false;
    const refs = [...html.matchAll(/(?:src|href)=["']([^"']+)["']/gi)]
      .map((match) => String(match[1] || "").trim())
      .filter((value) => value && !/^(?:https?:|data:|#)/i.test(value));
    for (const ref of refs) {
      const clean = ref.split(/[?#]/, 1)[0].replace(/^\/+/, "");
      if (!clean) continue;
      const target = path.join(outDir, clean);
      if (!fs.existsSync(target) || !fs.statSync(target).isFile()) return false;
    }
    return true;
  } catch {
    return false;
  }
};

export const ensureMiniAppBuild = (options = {}) => {
  const rootDir = options.rootDir || defaultRoot;
  const out = options.stdout || process.stdout;
  const err = options.stderr || process.stderr;
  const force = String(options.force ?? process.env.KOUROSH_FORCE_MINIAPP_BUILD ?? "") === "1";
  const valid = (options.validate || validateMiniAppBuild)(rootDir);

  if (valid && !force) {
    out.write("[miniapp] Production bundle is ready; reusing dist-miniapp/.\n");
    return { action: "reuse", built: false };
  }

  out.write(force
    ? "[miniapp] Forced rebuild requested. Building dist-miniapp/...\n"
    : "[miniapp] Production bundle is missing or invalid. Building dist-miniapp/...\n");

  const npmExecPath = String(process.env.npm_execpath || "").trim();
  const useNpmCli = npmExecPath && fs.existsSync(npmExecPath);
  const command = useNpmCli ? process.execPath : (process.platform === "win32" ? "npm.cmd" : "npm");
  const args = useNpmCli ? [npmExecPath, "run", "build:miniapp"] : ["run", "build:miniapp"];
  const run = options.spawnSyncImpl || spawnSync;
  const result = run(command, args, {
    cwd: rootDir,
    env: process.env,
    stdio: "inherit",
    shell: !useNpmCli && process.platform === "win32",
  });
  if (result?.error) {
    err.write(`[miniapp] Failed to start build: ${String(result.error.message || result.error)}\n`);
    return { action: "error", built: false, exitCode: 1 };
  }
  const exitCode = Number.isInteger(result?.status) ? result.status : 1;
  if (exitCode !== 0) return { action: "error", built: false, exitCode };
  if (!(options.validate || validateMiniAppBuild)(rootDir)) {
    err.write("[miniapp] Build command completed but dist-miniapp validation failed.\n");
    return { action: "error", built: true, exitCode: 1 };
  }
  out.write("[miniapp] Production bundle is ready.\n");
  return { action: "built", built: true, exitCode: 0 };
};

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const result = ensureMiniAppBuild();
  if (result.action === "error") process.exitCode = result.exitCode || 1;
}
