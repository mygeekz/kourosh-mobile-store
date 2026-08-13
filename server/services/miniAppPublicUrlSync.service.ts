import { resolveMiniAppPublicAccessMode, validateTelegramMiniAppPublicUrl } from "../connectivity/telegramPublicAccess";
import { resolveTelegramTransportMode } from "../telegram/TelegramTransport";
import { writeMiniAppGatewayRuntimeConfigFromSettings } from "../miniapp/miniAppGatewayRuntimeConfig.mjs";
import { syncTelegramMenuButton, type TelegramMenuSyncResult } from "./telegramMenuSync.service";

export type MiniAppPublicSyncPhase =
  | "IDLE"
  | "TUNNEL_STARTING"
  | "TUNNEL_READY"
  | "PUBLIC_URL_SYNCING"
  | "PUBLIC_URL_READY"
  | "MENU_SYNC_PENDING"
  | "MENU_SYNCED"
  | "ERROR";

export type MiniAppPublicSyncStatus = {
  phase: MiniAppPublicSyncPhase;
  provider: string | null;
  publicUrl: string | null;
  hostname: string | null;
  gateway: "unknown" | "ready" | "error";
  tunnel: "idle" | "starting" | "ready" | "error";
  telegramMenu: "idle" | "pending" | "synced" | "error";
  message: string | null;
  updatedAt: string;
};

type SyncInput = {
  provider?: unknown;
  publicUrl: unknown;
};

type SyncDeps = {
  getSettings: () => Promise<Record<string, string>>;
  persistSettings: (settings: Record<string, unknown>) => Promise<void>;
  writeRuntimeConfig: (settings: Record<string, unknown>) => { mode?: string; expectedPublicHost?: string | null };
  syncMenu: (settings: Record<string, unknown>) => Promise<TelegramMenuSyncResult>;
  healthCheck: (publicUrl: string) => Promise<{ ok: boolean; status?: number; contentType?: string }>;
  sleep: (ms: number) => Promise<void>;
};

const now = () => new Date().toISOString();
const sleep = (ms: number) => new Promise<void>((resolve) => setTimeout(resolve, ms));

let runtimeStatus: MiniAppPublicSyncStatus = {
  phase: "IDLE",
  provider: null,
  publicUrl: null,
  hostname: null,
  gateway: "unknown",
  tunnel: "idle",
  telegramMenu: "idle",
  message: null,
  updatedAt: now(),
};

const updateStatus = (patch: Partial<MiniAppPublicSyncStatus>) => {
  runtimeStatus = { ...runtimeStatus, ...patch, updatedAt: now() };
  return { ...runtimeStatus };
};

export const getMiniAppPublicSyncStatus = (): MiniAppPublicSyncStatus => ({ ...runtimeStatus });

export const markMiniAppTunnelStarting = (provider = "external_tunnel") => updateStatus({
  phase: "TUNNEL_STARTING",
  provider,
  tunnel: "starting",
  message: null,
});

export const markMiniAppTunnelError = (message: string) => updateStatus({
  phase: "ERROR",
  tunnel: "error",
  message: String(message || "Tunnel startup failed."),
});

const readCanonicalSettings = async (): Promise<Record<string, string>> => {
  const { getAllSettingsAsObject } = await import("../database");
  return getAllSettingsAsObject();
};

const persistSettings = async (settings: Record<string, unknown>) => {
  const { updateMultipleSettings } = await import("../database");
  const items = Object.entries(settings).map(([key, value]) => ({
    key,
    value: value == null ? "" : String(value),
  }));
  if (items.length) await updateMultipleSettings(items);
};

const checkPublicMiniApp = async (publicUrl: string): Promise<{ ok: boolean; status?: number; contentType?: string }> => {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 8_000);
  try {
    const response = await fetch(publicUrl, {
      method: "GET",
      cache: "no-store",
      redirect: "follow",
      signal: controller.signal,
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    try { await response.body?.cancel(); } catch {}
    return { ok: response.status === 200 && contentType.includes("text/html"), status: response.status, contentType };
  } catch {
    return { ok: false };
  } finally {
    clearTimeout(timer);
  }
};

const defaultDeps: SyncDeps = {
  getSettings: readCanonicalSettings,
  persistSettings,
  writeRuntimeConfig: (settings) => writeMiniAppGatewayRuntimeConfigFromSettings(settings),
  syncMenu: syncTelegramMenuButton,
  healthCheck: checkPublicMiniApp,
  sleep,
};

const healthBackoffMs = [0, 1_000, 2_000, 3_000, 5_000];

const syncTelegramMenu = async (settings: Record<string, unknown>, deps: SyncDeps) => {
  const result = await deps.syncMenu(settings);
  if (result.state === "synced") return updateStatus({ phase: "MENU_SYNCED", telegramMenu: "synced", message: null });
  if (result.state === "pending") return updateStatus({ phase: "MENU_SYNC_PENDING", telegramMenu: "pending", message: result.message || null });
  return updateStatus({ phase: "PUBLIC_URL_READY", telegramMenu: "error", message: result.message || "Telegram Menu sync failed." });
};

export const createMiniAppPublicUrlSyncService = (overrides: Partial<SyncDeps> = {}) => {
  const deps: SyncDeps = { ...defaultDeps, ...overrides };

  const preflight = async () => {
    const settings = await deps.getSettings();
    const mode = resolveMiniAppPublicAccessMode(settings);
    if (mode === "self_hosted" || mode === "relay") {
      return { allowed: false, protectedMode: mode, reason: "MANUAL_OR_RELAY_MODE_PROTECTED" as const };
    }
    return { allowed: true, protectedMode: null, reason: null };
  };

  const sync = async (input: SyncInput) => {
    const provider = String(input.provider || "external_tunnel").trim() || "external_tunnel";
    const normalizedPublicUrl = validateTelegramMiniAppPublicUrl(input.publicUrl);
    if (!normalizedPublicUrl) {
      updateStatus({ phase: "ERROR", provider, tunnel: "error", message: "Public Mini App URL is invalid." });
      throw Object.assign(new Error("INVALID_MINIAPP_PUBLIC_URL"), { code: "INVALID_MINIAPP_PUBLIC_URL" });
    }
    const hostname = new URL(normalizedPublicUrl).hostname.toLowerCase();

    updateStatus({
      phase: "PUBLIC_URL_SYNCING",
      provider,
      publicUrl: normalizedPublicUrl,
      hostname,
      tunnel: "ready",
      gateway: "unknown",
      telegramMenu: "idle",
      message: null,
    });

    const current = await deps.getSettings();
    const currentMode = resolveMiniAppPublicAccessMode(current);
    if (currentMode === "self_hosted" || currentMode === "relay") {
      const protectedStatus = updateStatus({
        phase: "TUNNEL_READY",
        tunnel: "ready",
        publicUrl: null,
        hostname: null,
        message: `Mini App ${currentMode} configuration is protected from automatic tunnel overwrite.`,
      });
      return { success: true, skipped: true, protectedMode: currentMode, status: protectedStatus };
    }

    const patch = {
      miniapp_public_access_mode: "external_tunnel",
      telegram_miniapp_public_url: normalizedPublicUrl,
    };
    const rollback = {
      miniapp_public_access_mode: current.miniapp_public_access_mode ?? "",
      telegram_miniapp_public_url: current.telegram_miniapp_public_url ?? "",
    };

    await deps.persistSettings(patch);
    let saved = await deps.getSettings();
    if (resolveMiniAppPublicAccessMode(saved) !== "external_tunnel" || validateTelegramMiniAppPublicUrl(saved.telegram_miniapp_public_url) !== normalizedPublicUrl) {
      await deps.persistSettings(rollback).catch(() => undefined);
      updateStatus({ phase: "ERROR", gateway: "error", message: "Canonical Mini App settings did not persist." });
      throw Object.assign(new Error("MINIAPP_SETTINGS_PERSISTENCE_MISMATCH"), { code: "MINIAPP_SETTINGS_PERSISTENCE_MISMATCH" });
    }

    try {
      const runtime = deps.writeRuntimeConfig(saved);
      const expectedHost = String(runtime?.expectedPublicHost || "").toLowerCase();
      if (String(runtime?.mode || "") !== "external_tunnel" || expectedHost !== hostname) {
        throw Object.assign(new Error("MINIAPP_RUNTIME_CONFIG_MISMATCH"), { code: "MINIAPP_RUNTIME_CONFIG_MISMATCH" });
      }
      updateStatus({ gateway: "ready" });
    } catch (error) {
      await deps.persistSettings(rollback).catch(() => undefined);
      try {
        saved = await deps.getSettings();
        deps.writeRuntimeConfig(saved);
      } catch {}
      updateStatus({ phase: "ERROR", gateway: "error", message: "Mini App runtime config synchronization failed." });
      throw error;
    }

    let publicHealth: { ok: boolean; status?: number; contentType?: string } = { ok: false };
    for (const delay of healthBackoffMs) {
      if (delay > 0) await deps.sleep(delay);
      publicHealth = await deps.healthCheck(normalizedPublicUrl);
      if (publicHealth.ok) break;
    }
    if (!publicHealth.ok) {
      const pendingStatus = updateStatus({
        phase: "ERROR",
        gateway: "ready",
        tunnel: "ready",
        telegramMenu: "pending",
        message: `Public Mini App health check did not become ready${publicHealth.status ? ` (HTTP ${publicHealth.status})` : ""}.`,
      });
      return { success: false, ready: false, publicUrl: normalizedPublicUrl, hostname, publicHealth, status: pendingStatus };
    }

    updateStatus({ phase: "PUBLIC_URL_READY", gateway: "ready", tunnel: "ready", message: null });
    const menuStatus = await syncTelegramMenu(saved, deps);
    return {
      success: true,
      ready: true,
      publicUrl: normalizedPublicUrl,
      hostname,
      publicHealth,
      menuSync: menuStatus.telegramMenu,
      status: getMiniAppPublicSyncStatus(),
    };
  };

  return { preflight, sync, status: getMiniAppPublicSyncStatus };
};

export const miniAppPublicUrlSyncService = createMiniAppPublicUrlSyncService();
