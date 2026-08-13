import type { ErrorRequestHandler, Express } from "express";

const terminalApiErrorHandler: ErrorRequestHandler = (err, req, res, _next) => {
  const isMissingPublicUpload =
    String((err as any)?.code || "") === "ENOENT" &&
    req.path.startsWith("/uploads/");
  if (isMissingPublicUpload) {
    return res.status(404).json({ success: false, message: "فایل یافت نشد." });
  }
  if (req.path.startsWith("/api/miniapp")) {
    const requestId = String(res.locals.requestId || "");
    console.error(JSON.stringify({
      timestamp: new Date().toISOString(),
      event: "miniapp_backend_failure",
      requestId: requestId || undefined,
      route: req.path,
      method: req.method,
      status: 500,
    }));
    return res.status(500).json({
      success: false,
      code: "MINIAPP_INTERNAL_ERROR",
      message: "خطای داخلی رخ داد. دوباره تلاش کنید.",
      requestId: requestId || undefined,
    });
  }
  console.error("An error occurred:", err);
  res.status((err as any).statusCode || 500).json({
    success: false,
    message: err?.message || "خطا در عملیاتی داخلی سرور",
  });
};

export const registerTerminalApiHandlers = (app: Express): void => {
  app.use((_req, res) =>
    res
      .status(404)
      .json({ success: false, message: "مسیر API مورد نظر یافت نشد." }),
  );
  app.use(terminalApiErrorHandler);
};
