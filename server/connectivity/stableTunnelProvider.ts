export type MiniAppStableTunnelProvider = "cloudflare_named" | "external";

const STABLE_TUNNEL_PROVIDERS = new Set<MiniAppStableTunnelProvider>(["cloudflare_named", "external"]);

export const resolveMiniAppStableTunnelProvider = (settings: Record<string, unknown>): MiniAppStableTunnelProvider => {
  const raw = String(settings.miniapp_stable_tunnel_provider || "").trim();
  if (STABLE_TUNNEL_PROVIDERS.has(raw as MiniAppStableTunnelProvider)) return raw as MiniAppStableTunnelProvider;
  // v164 production default. Cloudflare-specific execution remains isolated in the adapter/launcher layer.
  return "cloudflare_named";
};

export const stableTunnelProviderIsKouroshManaged = (provider: MiniAppStableTunnelProvider): boolean => provider === "cloudflare_named";
