import type { Express, Request } from "express";
import { miniAppPublicUrlSyncService, markMiniAppTunnelStarting } from "../services/miniAppPublicUrlSync.service";

const normalizeRemoteAddress = (value: unknown) => String(value || "").trim().toLowerCase().replace(/^::ffff:/, "");
const isLoopbackRequest = (req: Request) => {
  const remote = normalizeRemoteAddress(req.socket.remoteAddress);
  return remote === "127.0.0.1" || remote === "::1";
};

export const registerMiniAppPublicSyncRoutes = (app: Express): void => {
  app.get("/api/local-runtime/miniapp-public-url-sync/preflight", async (req, res, next) => {
    if (!isLoopbackRequest(req)) return res.status(403).json({ success: false, code: "LOCAL_RUNTIME_LOOPBACK_REQUIRED" });
    try {
      const result = await miniAppPublicUrlSyncService.preflight();
      if (result.allowed) markMiniAppTunnelStarting("temporary_external_tunnel");
      res.setHeader("Cache-Control", "no-store");
      return res.json({ success: true, data: result });
    } catch (error) { return next(error); }
  });

  app.post("/api/local-runtime/miniapp-public-url-sync", async (req, res, next) => {
    if (!isLoopbackRequest(req)) return res.status(403).json({ success: false, code: "LOCAL_RUNTIME_LOOPBACK_REQUIRED" });
    try {
      const result = await miniAppPublicUrlSyncService.sync({
        provider: req.body?.provider,
        publicUrl: req.body?.publicUrl,
      });
      res.setHeader("Cache-Control", "no-store");
      return res.status(result.success === false ? 503 : 200).json({ success: result.success !== false, data: result });
    } catch (error: unknown) {
      const code = typeof error === "object" && error !== null && "code" in error ? String((error as { code?: unknown }).code || "") : "";
      if (code === "INVALID_MINIAPP_PUBLIC_URL") {
        return res.status(400).json({ success: false, code, message: "Public Mini App URL نامعتبر است." });
      }
      return next(error);
    }
  });
};
