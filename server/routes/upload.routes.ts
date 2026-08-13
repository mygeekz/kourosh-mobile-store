import path from "path";
import type { Express } from "express";

import upload, {
  finalizePrivateUpload,
  resolvePrivateUploadReference,
  SafeUploadError,
} from "../upload";

const setPrivateDownloadHeaders = (res: any, filename: string) => {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("Content-Disposition", `attachment; filename="${filename.replace(/[^a-z0-9._-]/gi, "_")}"`);
  res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
  res.setHeader("Cross-Origin-Resource-Policy", "same-origin");
  res.setHeader("X-Content-Type-Options", "nosniff");
};

export const registerUploadRoutes = (app: Express): void => {
  app.post("/api/upload", upload.single("file"), async (req, res, next) => {
    if (!req.file) return res.status(400).json({ ok: false, error: "NO_FILE" });
    try {
      const finalized = await finalizePrivateUpload(req.file);
      return res.status(201).json({
        ok: true,
        fileId: finalized.filename,
        path: `/api/uploads/${finalized.filename}`,
        mime: finalized.mimeType,
        size: finalized.size,
      });
    } catch (error) {
      if (error instanceof SafeUploadError) {
        return res.status(error.statusCode).json({ ok: false, error: "UNSUPPORTED_FILE_CONTENT" });
      }
      return next(error);
    }
  });

  app.get("/api/uploads/:filename", async (req, res, next) => {
    try {
      const absolutePath = await resolvePrivateUploadReference(req.params.filename);
      if (!absolutePath) return res.status(404).json({ success: false, message: "فایل یافت نشد." });
      setPrivateDownloadHeaders(res, path.basename(absolutePath));
      return res.sendFile(absolutePath);
    } catch (error) {
      return next(error);
    }
  });
};
