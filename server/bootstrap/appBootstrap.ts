import express, { type Express } from "express";
import cors from "cors";
import dns from "dns";
import fs from "fs";
import { join } from "path";
import { configureTrustedProxy } from "../middleware/trustedProxy";

export const KOUROSH_HTTP_PORT = 3001;

export const createKouroshExpressApp = (): Express => {
  // Prefer IPv4 first to avoid undici fetch failures on networks with broken IPv6.
  dns.setDefaultResultOrder("ipv4first");
  return express();
};

export const registerBaseHttpMiddleware = (app: Express): void => {
  // Only the bundled loopback reverse proxy may supply forwarding metadata.
  configureTrustedProxy(app);
  app.use(
    cors({
      origin: [
        /^https?:\/\/localhost:5173$/,
        /^https?:\/\/127\.0\.0\.1:5173$/,
        // Allow any 192.168.x.x:5173 for local network checking over HTTP or HTTPS.
        /^https?:\/\/192\.168\.\d{1,3}\.\d{1,3}:5173$/,
      ],
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
      credentials: true,
      optionsSuccessStatus: 204,
    }),
  );
  // Always respond to OPTIONS to satisfy CORS preflight; do not rate-limit OPTIONS.
  app.options("*", cors());
  app.use(express.json());
};

export const ensureUploadDirectories = (uploadsDir: string): { avatarsDir: string } => {
  const avatarsDir = join(uploadsDir, "avatars");
  if (!fs.existsSync(uploadsDir)) fs.mkdirSync(uploadsDir, { recursive: true });
  if (!fs.existsSync(avatarsDir)) fs.mkdirSync(avatarsDir, { recursive: true });
  return { avatarsDir };
};

export const registerUploadStaticMiddleware = (
  app: Express,
  uploadsDir: string,
): void => {
  const safePublicImagePath = /^\/(?:avatars\/)?[a-z0-9._-]+\.(?:jpe?g|png|gif|webp)$/i;
  app.use("/uploads", (req, res, next) => {
    if (!safePublicImagePath.test(req.path)) {
      return res.status(404).json({ success: false, message: "فایل یافت نشد." });
    }
    res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
    res.setHeader("X-Content-Type-Options", "nosniff");
    return next();
  });
  app.use(
    "/uploads",
    express.static(uploadsDir, {
      dotfiles: "deny",
      fallthrough: true,
      index: false,
      redirect: false,
      setHeaders: (res) => {
        res.setHeader("Cache-Control", "public, max-age=86400, immutable");
      },
    }),
  );
  app.use("/uploads", (_req, res) => {
    res.setHeader("Cache-Control", "no-store");
    return res.status(404).json({ success: false, message: "فایل یافت نشد." });
  });
};
