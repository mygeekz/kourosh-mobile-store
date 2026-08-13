import type { NextFunction, Request, RequestHandler, Response } from "express";

const DEFAULT_LOGIN_WINDOW_MS = 15 * 60 * 1000;
const DEFAULT_LOGIN_MAX_ATTEMPTS = 10;

type LoginRateBucket = {
  attempts: number;
  resetAt: number;
};

export type LoginRateLimiterOptions = {
  windowMs?: number;
  maxAttempts?: number;
  now?: () => number;
  onLimited?: (req: Request, res: Response) => void;
};

export const getRateLimitClientIp = (
  req: Pick<Request, "ip" | "socket">,
): string => req.ip || req.socket.remoteAddress || "unknown";

export const createLoginRateLimiter = (
  options: LoginRateLimiterOptions = {},
): RequestHandler => {
  const windowMs = options.windowMs ?? DEFAULT_LOGIN_WINDOW_MS;
  const maxAttempts = options.maxAttempts ?? DEFAULT_LOGIN_MAX_ATTEMPTS;
  const now = options.now ?? Date.now;
  const onLimited = options.onLimited;
  const buckets = new Map<string, LoginRateBucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const currentTime = now();
    for (const [key, bucket] of buckets) {
      if (bucket.resetAt <= currentTime) buckets.delete(key);
    }

    const key = getRateLimitClientIp(req);
    const existing = buckets.get(key);
    const bucket =
      !existing || existing.resetAt <= currentTime
        ? { attempts: 0, resetAt: currentTime + windowMs }
        : existing;

    if (bucket.attempts >= maxAttempts) {
      const retryAfter = Math.max(
        1,
        Math.ceil((bucket.resetAt - currentTime) / 1000),
      );
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("Cache-Control", "no-store");
      onLimited?.(req, res);
      return res.status(429).json({
        success: false,
        code: "AUTH_LOGIN_RATE_LIMITED",
        message: "تعداد تلاش‌های ورود زیاد است؛ کمی بعد دوباره تلاش کنید.",
      });
    }

    bucket.attempts += 1;
    buckets.set(key, bucket);
    res.once("finish", () => {
      if (res.statusCode >= 200 && res.statusCode < 300) buckets.delete(key);
    });
    return next();
  };
};
