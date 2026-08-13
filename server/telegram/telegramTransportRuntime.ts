import { disabledTelegramTransport } from "./DisabledTelegramTransport";
import { directTelegramTransport } from "./DirectTelegramTransport";
import { proxyTelegramTransport } from "./ProxyTelegramTransport";
import { relayTelegramTransport } from "./RelayTelegramTransport";
import { resolveTelegramTransportMode, type TelegramTransportMode } from "./TelegramTransport";

let mode: TelegramTransportMode = "direct";

export const configureTelegramTransportRuntime = (settings: Record<string, unknown>) => {
  mode = resolveTelegramTransportMode(settings);
  proxyTelegramTransport.setProxy(String(settings.telegram_proxy || "").trim() || undefined);
  return mode;
};

export const getTelegramTransportRuntimeMode = () => mode;
export const getActiveTelegramTransport = () => {
  if (mode === "disabled") return disabledTelegramTransport;
  if (mode === "proxy") return proxyTelegramTransport;
  if (mode === "relay") return relayTelegramTransport;
  return directTelegramTransport;
};
// Compatibility function used by older helpers; it configures Proxy mode only and never alters Direct behavior.
export const setTelegramProxyRuntime = (proxyUrl?: string | null) => proxyTelegramTransport.setProxy(proxyUrl);
export const setDirectTelegramProxy = setTelegramProxyRuntime;
