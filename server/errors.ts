import { Request, Response, NextFunction } from "express";
import { logger } from "./logger";

export class AppError extends Error {
  statusCode: number;
  constructor(message: string, statusCode = 400) {
    super(message);
    this.statusCode = statusCode;
  }
}

const humanizeServerError = (err: Error) => {
  const raw = String(err?.message || '').trim();
  const lower = raw.toLowerCase();

  if (!raw) {
    return 'در پردازش درخواست مشکلی پیش آمد. لطفاً دوباره تلاش کنید.';
  }

  if (/internal server error|unexpected token|cannot read properties/.test(lower)) {
    return 'در پردازش درخواست روی سرور مشکلی پیش آمد. لطفاً اطلاعات را بررسی کرده و دوباره تلاش کنید.';
  }

  if (/sqlite|foreign key|constraint failed/.test(lower)) {
    return 'عملیات به‌دلیل خطا در عملیاتی پایگاه‌داده کامل نشد. یک‌بار اطلاعات را بررسی کرده و دوباره تلاش کنید.';
  }

  return raw;
};

export function errorHandler(
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
) {
  logger.error(err.stack || err.message);
  if (err instanceof AppError) {
    return res.status(err.statusCode).json({ error: humanizeServerError(err), message: humanizeServerError(err), success: false });
  }
  const message = humanizeServerError(err);
  return res.status(500).json({ error: message, message, success: false });
}
