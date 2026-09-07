import type { Express, RequestHandler } from "express";
import { getAuditLogReport } from "../database";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type AuditLogRouteDeps = {
  authorizeRole: AuthorizeRole;
};

export const registerAuditLogRoutes = (
  app: Express,
  { authorizeRole }: AuditLogRouteDeps,
): void => {
  app.get(
    "/api/audit-log",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const limit = Math.min(Math.max(parseInt(String(req.query.limit || "25"), 10) || 25, 1), 100);
        const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
        const from = String(req.query.from || '').trim();
        const to = String(req.query.to || '').trim();
        const isValidDate = (value: string) => !value || !Number.isNaN(Date.parse(value));
        if (!isValidDate(from) || !isValidDate(to)) {
          return res.status(400).json({ success: false, message: 'بازه تاریخ معتبر نیست.' });
        }
        if (from && to && Date.parse(from) > Date.parse(to)) {
          return res.status(400).json({ success: false, message: 'تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.' });
        }

        const report = await getAuditLogReport({
          limit,
          offset,
          query: String(req.query.q || ''),
          action: String(req.query.action || 'ALL'),
          entityType: String(req.query.entityType || 'ALL'),
          role: String(req.query.role || 'ALL'),
          from,
          to,
        });
        res.setHeader('Cache-Control', 'no-store');
        res.json({ success: true, data: report.rows, meta: {
          pagination: report.pagination,
          stats: report.stats,
          options: report.options,
          generatedAt: new Date().toISOString(),
        } });
      } catch (e) {
        next(e);
      }
    },
  );
};
