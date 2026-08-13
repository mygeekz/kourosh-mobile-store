import type { Express, Request } from "express";

import {
  createInitialAdmin,
  InitialSetupError,
  INITIAL_SETUP_PASSWORD_MAX_BYTES,
  INITIAL_SETUP_PASSWORD_MIN_LENGTH,
  isInitialSetupRequired,
} from "../auth/initialSetup";
import {
  canInitializeFromRequest,
  getInitialSetupClientIp,
} from "../utils/initialSetupAccess";

export { canInitializeFromRequest, getInitialSetupClientIp } from "../utils/initialSetupAccess";

const SETUP_RATE_WINDOW_MS = 15 * 60 * 1000;
const SETUP_RATE_MAX = 10;
type SetupRateBucket = { attempts: number; resetAt: number };
const setupRateBuckets = new Map<string, SetupRateBucket>();

const consumeSetupAttempt = (clientIp: string): number | null => {
  const now = Date.now();
  for (const [key, bucket] of setupRateBuckets) {
    if (bucket.resetAt <= now) setupRateBuckets.delete(key);
  }
  const current = setupRateBuckets.get(clientIp);
  const bucket =
    !current || current.resetAt <= now
      ? { attempts: 0, resetAt: now + SETUP_RATE_WINDOW_MS }
      : current;
  bucket.attempts += 1;
  setupRateBuckets.set(clientIp, bucket);
  if (bucket.attempts <= SETUP_RATE_MAX) return null;
  return Math.max(1, Math.ceil((bucket.resetAt - now) / 1000));
};

const setupStatusPayload = async (req: Request) => {
  const setupRequired = await isInitialSetupRequired();
  return {
    success: true,
    setupRequired,
    canInitialize: setupRequired && canInitializeFromRequest(req),
    passwordPolicy: {
      minLength: INITIAL_SETUP_PASSWORD_MIN_LENGTH,
      maxBytes: INITIAL_SETUP_PASSWORD_MAX_BYTES,
      requiresLetter: true,
      requiresNumber: true,
    },
  };
};

export const registerInitialSetupRoutes = (app: Express): void => {
  app.get("/api/setup/status", async (req, res, next) => {
    try {
      res.setHeader("Cache-Control", "no-store, max-age=0");
      res.setHeader("Pragma", "no-cache");
      return res.json(await setupStatusPayload(req));
    } catch (error) {
      return next(error);
    }
  });

  app.post("/api/setup/initialize", async (req, res, next) => {
    res.setHeader("Cache-Control", "no-store, max-age=0");
    try {
      if (!(await isInitialSetupRequired())) {
        return res.status(409).json({
          success: false,
          code: "SETUP_ALREADY_COMPLETED",
          message: "راه‌اندازی اولیه قبلاً انجام شده است.",
        });
      }
      if (!canInitializeFromRequest(req)) {
        return res.status(403).json({
          success: false,
          code: "SETUP_LOCAL_ACCESS_REQUIRED",
          message: "برای امنیت، راه‌اندازی اولیه باید روی دستگاه میزبان انجام شود.",
        });
      }
      if (!req.is("application/json")) {
        return res.status(415).json({
          success: false,
          code: "SETUP_JSON_REQUIRED",
          message: "درخواست راه‌اندازی باید با قالب JSON ارسال شود.",
        });
      }

      const clientIp = getInitialSetupClientIp(req);
      const retryAfter = consumeSetupAttempt(clientIp);
      if (retryAfter !== null) {
        res.setHeader("Retry-After", String(retryAfter));
        return res.status(429).json({
          success: false,
          code: "SETUP_RATE_LIMITED",
          message: "تعداد تلاش‌های راه‌اندازی زیاد است؛ کمی بعد دوباره تلاش کنید.",
        });
      }

      const user = await createInitialAdmin({
        username: req.body?.username,
        password: req.body?.password,
        confirmPassword: req.body?.confirmPassword,
      });
      return res.status(201).json({
        success: true,
        user,
        message: "حساب مدیر اصلی با موفقیت ایجاد شد.",
      });
    } catch (error) {
      if (error instanceof InitialSetupError) {
        return res.status(error.statusCode).json({
          success: false,
          code: error.code,
          message: error.message,
        });
      }
      return next(error);
    }
  });
};
