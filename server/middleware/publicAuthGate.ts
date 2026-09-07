import type { RequestHandler } from "express";

export const createPublicAuthGate = (
  requireAuth: RequestHandler,
): RequestHandler => {
  return (req, _res, next) => {
    const p = req.path || "";
    // Public endpoints:
    if (
      p === "/api/login" ||
      p === "/api/setup/status" ||
      p === "/api/setup/initialize" ||
      p === "/uploads" ||
      p.startsWith("/uploads/") ||
      p.startsWith("/public") ||
      p === "/health" ||
      p.startsWith("/barcode") ||
      p.startsWith("/api/barcode")
    ) {
      return next();
    }
    return requireAuth(req, _res, next);
  };
};
