import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { resolveMiniAppPublicAccessMode } from "./telegramPublicAccess";
import { resolveMiniAppStableTunnelProvider } from "./stableTunnelProvider";

export type StableTunnelRuntimeKickResult =
  | { started: false; reason: "not_stable_tunnel" | "external_provider" | "not_windows" | "launcher_missing" }
  | { started: true; pid: number | null };

/**
 * Settings can be restored while Kourosh is already running. The normal Windows
 * startup coordinator has already completed by then, so merely persisting the
 * Live Origin does not start/reconcile cloudflared. Kick the existing hardened
 * launcher again; it only reuses/stops a process that is positively identified
 * as Kourosh's own named tunnel for the configured tunnel id.
 */
export const kickStableTunnelRuntimeAfterSettingsSave = (
  settings: Record<string, unknown>,
): StableTunnelRuntimeKickResult => {
  if (resolveMiniAppPublicAccessMode(settings) !== "stable_tunnel") return { started: false, reason: "not_stable_tunnel" };
  if (resolveMiniAppStableTunnelProvider(settings) !== "cloudflare_named") return { started: false, reason: "external_provider" };
  if (process.platform !== "win32") return { started: false, reason: "not_windows" };

  const rootDir = path.resolve(process.cwd());
  const launcher = path.join(rootDir, "scripts", "windows-miniapp-stable-tunnel-launcher.mjs");
  if (!fs.existsSync(launcher)) return { started: false, reason: "launcher_missing" };

  const child = spawn(process.execPath, [launcher], {
    cwd: rootDir,
    env: process.env,
    detached: true,
    stdio: "ignore",
    windowsHide: true,
  });
  child.unref?.();
  return { started: true, pid: child.pid || null };
};
