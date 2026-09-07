import type { NextFunction, Request, Response } from "express";

const RATE_LIMIT_WINDOW_MS = 5 * 60 * 1000; // 5 minutes
const RATE_LIMIT_MAX = 300; // Maximum allowed requests per window

type RateBucket = { count: number; resetAt: number };

const rateBuckets = new Map<string, RateBucket>();

export const createProductionRateLimiter = () => {
  return (req: Request, res: Response, next: NextFunction) => {
    // Only enforce rate limits in production
    if (process.env.NODE_ENV !== "production") return next();
    // Skip OPTIONS (CORS preflight) and HMR/SSE and static asset requests
    const isSkippable =
      req.method === "OPTIONS" ||
      req.headers.accept?.includes("text/event-stream") ||
      req.path.startsWith("/@") ||
      req.path.startsWith("/assets") ||
      req.path.startsWith("/static") ||
      req.path.startsWith("/uploads") ||
      req.path.startsWith("/health") ||
      req.path === "/";
    if (isSkippable) return next();
    // Determine IP and user id (if authenticated) to build a unique key
    const ip = req.ip || req.socket.remoteAddress || "unknown";
    // @ts-ignore user may be attached by authenticateToken middleware
    const userId = req.user?.id ? `|u${req.user.id}` : "|anon";
    const key = `${ip}${userId}`;
    const now = Date.now();
    let bucket = rateBuckets.get(key);
    if (!bucket || now > bucket.resetAt) {
      // create a new window
      bucket = { count: 0, resetAt: now + RATE_LIMIT_WINDOW_MS };
    }
    bucket.count++;
    rateBuckets.set(key, bucket);
    if (bucket.count > RATE_LIMIT_MAX) {
      const retryAfter = Math.ceil((bucket.resetAt - now) / 1000);
      res.setHeader("Retry-After", retryAfter.toString());
      return res.status(429).json({
        success: false,
        message: "تعداد درخواست‌ها زیاد است؛ چند لحظه بعد دوباره تلاش کنید.",
      });
    }
    next();
  };
};
