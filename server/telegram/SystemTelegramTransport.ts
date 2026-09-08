import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { DirectTelegramTransport } from "./DirectTelegramTransport";
import type { TelegramTransportRequest, TelegramTransportResult } from "./TelegramTransport";

const execFileAsync = promisify(execFile);
const SYSTEM_ROUTE_CACHE_MS = 30_000;

type SystemRouteCandidate = {
  source: "environment" | "windows_default" | "windows_user" | "winhttp" | "system_network";
  proxyUrl?: string;
  label: string;
};

let cachedCandidates: { expiresAt: number; values: SystemRouteCandidate[] } | null = null;
let preferredCandidate: SystemRouteCandidate | null = null;
let lastResolvedCandidates: SystemRouteCandidate[] = [];

const normalizeProxyUrl = (rawValue: unknown, schemeHint = "http"): string | null => {
  const raw = String(rawValue || "").trim();
  if (!raw) return null;
  if (/^(socks5?|https?):\/\//i.test(raw)) return raw;
  if (!/^[^\s/:]+(?::\d+)$/.test(raw) && !/^\[[^\]]+\](?::\d+)$/.test(raw)) return null;
  return `${schemeHint}://${raw}`;
};

const uniqueCandidates = (items: SystemRouteCandidate[]): SystemRouteCandidate[] => {
  const seen = new Set<string>();
  const out: SystemRouteCandidate[] = [];
  for (const item of items) {
    const key = `${item.source}:${item.proxyUrl || "direct"}`;
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(item);
  }
  return out;
};

const parseWindowsProxyServer = (rawValue: unknown): string[] => {
  const raw = String(rawValue || "").trim();
  if (!raw) return [];
  if (!raw.includes("=")) {
    const normalized = normalizeProxyUrl(raw, "http");
    return normalized ? [normalized] : [];
  }
  const entries = Object.fromEntries(
    raw.split(";")
      .map((part) => part.trim())
      .filter(Boolean)
      .map((part) => {
        const idx = part.indexOf("=");
        return idx > 0 ? [part.slice(0, idx).trim().toLowerCase(), part.slice(idx + 1).trim()] : ["", ""];
      })
      .filter(([key, value]) => Boolean(key && value)),
  ) as Record<string, string>;
  const ordered: Array<[string, string]> = [
    ["https", "http"],
    ["socks", "socks5"],
    ["http", "http"],
  ];
  return ordered
    .map(([key, scheme]) => normalizeProxyUrl(entries[key], scheme))
    .filter((value): value is string => Boolean(value));
};

const queryRegistryValue = async (valueName: string): Promise<string | null> => {
  if (process.platform !== "win32") return null;
  try {
    const { stdout } = await execFileAsync("reg.exe", [
      "query",
      "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Internet Settings",
      "/v",
      valueName,
    ], { windowsHide: true, timeout: 2500 });
    const line = String(stdout || "").split(/\r?\n/).find((row) => row.toLowerCase().includes(valueName.toLowerCase()));
    if (!line) return null;
    const parts = line.trim().split(/\s{2,}/);
    return parts.length >= 3 ? parts.slice(2).join("  ").trim() : null;
  } catch {
    return null;
  }
};


const readWindowsDefaultProxyCandidate = async (): Promise<SystemRouteCandidate[]> => {
  if (process.platform !== "win32") return [];
  try {
    const script = [
      "$target = [Uri]'https://api.telegram.org'",
      "$proxy = [System.Net.WebRequest]::DefaultWebProxy",
      "if ($null -eq $proxy) { exit 0 }",
      "$resolved = $proxy.GetProxy($target)",
      "if ($null -ne $resolved -and $resolved.AbsoluteUri -ne $target.AbsoluteUri) { [Console]::Out.Write($resolved.AbsoluteUri) }",
    ].join("; ");
    const { stdout } = await execFileAsync("powershell.exe", ["-NoLogo", "-NoProfile", "-NonInteractive", "-Command", script], { windowsHide: true, timeout: 3500 });
    const proxyUrl = normalizeProxyUrl(String(stdout || "").trim(), "http");
    return proxyUrl ? [{ source: "windows_default", proxyUrl, label: "Windows system/PAC proxy" }] : [];
  } catch {
    return [];
  }
};

const readWindowsUserProxyCandidates = async (): Promise<SystemRouteCandidate[]> => {
  if (process.platform !== "win32") return [];
  const enabledRaw = await queryRegistryValue("ProxyEnable");
  const enabled = /^0x1$/i.test(String(enabledRaw || "")) || String(enabledRaw || "").trim() === "1";
  if (!enabled) return [];
  const server = await queryRegistryValue("ProxyServer");
  return parseWindowsProxyServer(server).map((proxyUrl) => ({
    source: "windows_user" as const,
    proxyUrl,
    label: "Windows Internet Settings",
  }));
};

const readWinHttpProxyCandidates = async (): Promise<SystemRouteCandidate[]> => {
  if (process.platform !== "win32") return [];
  try {
    const { stdout } = await execFileAsync("netsh.exe", ["winhttp", "show", "proxy"], { windowsHide: true, timeout: 2500 });
    const text = String(stdout || "");
    if (/Direct access \(no proxy server\)/i.test(text)) return [];
    const line = text.split(/\r?\n/).find((row) => /Proxy Server\(s\)|Proxy Server/i.test(row));
    const value = line?.split(":").slice(1).join(":").trim() || "";
    return parseWindowsProxyServer(value).map((proxyUrl) => ({
      source: "winhttp" as const,
      proxyUrl,
      label: "Windows WinHTTP",
    }));
  } catch {
    return [];
  }
};

const readEnvironmentProxyCandidates = (): SystemRouteCandidate[] => {
  const values = [
    // Optional Telegram-only override; does not configure the Cloudflare tunnel.
    process.env.KOUROSH_TELEGRAM_PROXY_URL,
    process.env.HTTPS_PROXY,
    process.env.https_proxy,
    process.env.ALL_PROXY,
    process.env.all_proxy,
    process.env.HTTP_PROXY,
    process.env.http_proxy,
  ];
  return values
    .map((value) => normalizeProxyUrl(value, "http"))
    .filter((value): value is string => Boolean(value))
    .map((proxyUrl) => ({ source: "environment" as const, proxyUrl, label: "Environment proxy" }));
};

const resolveSystemRouteCandidates = async (): Promise<SystemRouteCandidate[]> => {
  const now = Date.now();
  if (cachedCandidates && cachedCandidates.expiresAt > now) return cachedCandidates.values;
  const values = uniqueCandidates([
    ...readEnvironmentProxyCandidates(),
    ...(await readWindowsDefaultProxyCandidate()),
    ...(await readWindowsUserProxyCandidates()),
    ...(await readWinHttpProxyCandidates()),
    { source: "system_network", label: "System / VPN network route" },
  ]);
  cachedCandidates = { expiresAt: now + SYSTEM_ROUTE_CACHE_MS, values };
  lastResolvedCandidates = values;
  return values;
};

const redactProxy = (proxyUrl?: string) => {
  if (!proxyUrl) return null;
  try {
    const url = new URL(proxyUrl);
    const auth = url.username || url.password ? "***@" : "";
    return `${url.protocol}//${auth}${url.hostname}${url.port ? `:${url.port}` : ""}`;
  } catch {
    return "configured";
  }
};

export const getSystemTelegramTransportStatus = () => ({
  preferred: preferredCandidate ? {
    source: preferredCandidate.source,
    label: preferredCandidate.label,
    proxy: redactProxy(preferredCandidate.proxyUrl),
  } : null,
  candidates: lastResolvedCandidates.map((item) => ({
    source: item.source,
    label: item.label,
    proxy: redactProxy(item.proxyUrl),
  })),
});

export const resetSystemTelegramTransportDiscovery = () => {
  cachedCandidates = null;
  preferredCandidate = null;
  lastResolvedCandidates = [];
};

export class SystemTelegramTransport extends DirectTelegramTransport {
  readonly mode = "system" as const;

  setProxy(_proxyUrl?: string | null): void {
    // System mode discovers OS/environment routing automatically.
  }

  async request(request: TelegramTransportRequest): Promise<TelegramTransportResult> {
    const telegramProxy = String(process.env.KOUROSH_TELEGRAM_PROXY_URL || "").trim();
    if (telegramProxy) {
      try {
        const parsed = new URL(normalizeProxyUrl(telegramProxy) || "");
        if (!/^(https?|socks5?):$/.test(parsed.protocol) || !parsed.hostname) throw new Error();
      } catch {
        return { success: false, errorCode: "TELEGRAM_PROXY_NOT_CONFIGURED", message: "KOUROSH_TELEGRAM_PROXY_URL must be a valid HTTP, HTTPS or SOCKS proxy URL." };
      }
    }
    const discovered = await resolveSystemRouteCandidates();
    let candidates = preferredCandidate
      ? uniqueCandidates([preferredCandidate, ...discovered])
      : discovered;
    let lastFailure: TelegramTransportResult | null = null;

    // Long polling may legitimately wait 30-40 seconds. Before the first getUpdates call,
    // choose a healthy route with a short getMe probe so a dead/stale system proxy cannot
    // consume the entire long-poll timeout before the next candidate is tried.
    if (!preferredCandidate && String(request.method || "").trim() === "getUpdates") {
      let selected: SystemRouteCandidate | null = null;
      for (const candidate of candidates) {
        const probe = await this.requestWithNetwork({
          botToken: request.botToken,
          method: "getMe",
          httpMethod: "GET",
          timeoutMs: Math.min(6_000, Number(request.timeoutMs || 6_000)),
        }, { proxyUrl: candidate.proxyUrl });
        if (probe.success || probe.errorCode === "TELEGRAM_API_ERROR") {
          selected = candidate;
          preferredCandidate = candidate;
          break;
        }
        lastFailure = probe;
      }
      if (!selected) {
        const routeSummary = candidates.map((item) => item.label).join(" → ");
        return {
          ...(lastFailure || { success: false, errorCode: "TELEGRAM_NETWORK_ERROR" as const }),
          success: false,
          message: `${lastFailure?.message || "Telegram system network route failed."}${routeSummary ? ` | مسیرهای بررسی‌شده: ${routeSummary}` : ""}`,
          details: {
            ...(lastFailure?.details || {}),
            transportRoute: "system",
            transportRouteLabel: routeSummary || "System / VPN network route",
          },
        };
      }
      candidates = uniqueCandidates([selected, ...candidates]);
    }

    for (const candidate of candidates) {
      const result = await this.requestWithNetwork(request, { proxyUrl: candidate.proxyUrl });
      if (result.success || result.errorCode === "TELEGRAM_API_ERROR") {
        preferredCandidate = candidate;
        return {
          ...result,
          details: {
            ...(result.details || {}),
            transportRoute: candidate.source,
            transportRouteLabel: candidate.label,
          },
        };
      }
      lastFailure = result;
      if (preferredCandidate?.source === candidate.source && preferredCandidate?.proxyUrl === candidate.proxyUrl) {
        preferredCandidate = null;
      }
    }

    const routeSummary = candidates.map((item) => item.label).join(" → ");
    return {
      ...(lastFailure || { success: false, errorCode: "TELEGRAM_NETWORK_ERROR" as const }),
      success: false,
      message: `${lastFailure?.message || "Telegram system network route failed."}${routeSummary ? ` | مسیرهای بررسی‌شده: ${routeSummary}` : ""}`,
      details: {
        ...(lastFailure?.details || {}),
        transportRoute: "system",
        transportRouteLabel: routeSummary || "System / VPN network route",
      },
    };
  }
}

export const systemTelegramTransport = new SystemTelegramTransport();
