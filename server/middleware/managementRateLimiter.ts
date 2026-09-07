import type { NextFunction, Request, RequestHandler, Response } from "express";

type Bucket = { count: number; resetAt: number };

const getRateLimitClientIp = (req: Pick<Request, "ip" | "socket">): string =>
  req.ip || req.socket.remoteAddress || "unknown";

export type ManagementRateLimiterOptions = {
  windowMs?: number;
  maxRequests?: number;
  scope: string;
  now?: () => number;
  key?: (req: Request) => string;
  code?: string;
  message?: string;
};

const userKey = (req: Request): string => {
  const userId = Number(req.user?.id || 0);
  const miniApp = req.miniAppIdentity;
  if (miniApp?.kind === "staff") return `tg:${miniApp.telegramUserId}|u:${miniApp.subjectId}`;
  return userId > 0 ? `u:${userId}` : `ip:${getRateLimitClientIp(req)}`;
};

export const createManagementRateLimiter = (
  options: ManagementRateLimiterOptions,
): RequestHandler => {
  const windowMs = Math.max(1_000, options.windowMs ?? 60_000);
  const maxRequests = Math.max(1, options.maxRequests ?? 60);
  const now = options.now ?? Date.now;
  const buckets = new Map<string, Bucket>();

  return (req: Request, res: Response, next: NextFunction) => {
    const currentTime = now();
    for (const [key, bucket] of buckets) if (bucket.resetAt <= currentTime) buckets.delete(key);

    const principal = (options.key ?? userKey)(req);
    const key = `${options.scope}|${principal}`;
    const existing = buckets.get(key);
    const bucket = !existing || existing.resetAt <= currentTime
      ? { count: 0, resetAt: currentTime + windowMs }
      : existing;

    if (bucket.count >= maxRequests) {
      const retryAfter = Math.max(1, Math.ceil((bucket.resetAt - currentTime) / 1000));
      res.setHeader("Retry-After", String(retryAfter));
      res.setHeader("Cache-Control", "no-store");
      return res.status(429).json({
        success: false,
        code: options.code || "MANAGEMENT_RATE_LIMITED",
        message: options.message || "تعداد درخواست‌های مدیریتی زیاد است؛ کمی بعد دوباره تلاش کنید.",
      });
    }

    bucket.count += 1;
    buckets.set(key, bucket);
    return next();
  };
};
