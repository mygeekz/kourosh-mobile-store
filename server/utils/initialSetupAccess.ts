import type { Request } from "express";

import { isUsableLanIPv4 } from "./localSettingsHelpers";

const normalizeIp = (value: string): string =>
  value.trim().replace(/^::ffff:/, "").replace(/^\[|\]$/g, "");

const isLoopbackIp = (value: string): boolean => {
  const ip = normalizeIp(value);
  return ip === "127.0.0.1" || ip === "::1" || ip === "localhost";
};

const isConfiguredHostLanIp = (value: string): boolean => {
  const clientIp = normalizeIp(value);
  const publishedHostIp = normalizeIp(process.env.LOCAL_HOSTS_IP || "");
  return isUsableLanIPv4(publishedHostIp) && clientIp === publishedHostIp;
};

export const getInitialSetupClientIp = (req: Request): string => {
  const socketIp = normalizeIp(req.socket.remoteAddress || "");
  if (isLoopbackIp(socketIp)) {
    const forwarded = String(req.headers["x-forwarded-for"] || "")
      .split(",")
      .map(normalizeIp)
      .filter(Boolean);
    // The bundled loopback proxy overwrites this header with the actual peer.
    // Reading the last hop also protects against a forged loopback prefix.
    return forwarded.at(-1) || socketIp;
  }
  return socketIp || "unknown";
};

export const canInitializeFromRequest = (req: Request): boolean => {
  const clientIp = getInitialSetupClientIp(req);
  return (
    process.env.KOUROSH_ALLOW_REMOTE_INITIAL_SETUP === "true" ||
    isLoopbackIp(clientIp) ||
    isConfiguredHostLanIp(clientIp)
  );
};
