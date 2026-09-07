import type { Express, RequestHandler } from "express";
import { getAccountingReconciliationCenterReadModel } from "../db/domains/accountingReconciliationCenter.db";
import { runLegacyAccountingReconciliation } from "../db/migrations/legacyAccountingReconciliation";
import { createDbBackup } from "../backup";
import { getAccountingDrilldown } from "../accounting/accountingDrilldown";
import {
  closeAccountingPeriod,
  consumeAccountingConfirmation,
  getAccountingGovernanceHealth,
  reopenAccountingPeriod,
  prepareAccountingConfirmation,
  type AccountingActor,
} from "../accounting/accountingGovernance";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

const actorFromRequest = (req: any): AccountingActor =>
  req.user
    ? {
        userId: Number(req.user.id) || null,
        username: String(req.user.username || "") || null,
        role: String(req.user.roleName || req.user.role || "") || null,
      }
    : null;

const normalizePeriodScope = (periodStart: unknown, periodEnd: unknown) => {
  const start = String(periodStart || "").trim();
  const end = String(periodEnd || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start) || !/^\d{4}-\d{2}-\d{2}$/.test(end)) {
    throw new Error("تاریخ شروع و پایان دوره حسابداری الزامی است.");
  }
  return `${start}:${end}`;
};

export const registerAccountingReconciliationRoutes = (
  app: Express,
  { authorizeRole }: { authorizeRole: AuthorizeRole },
): void => {
  app.get(
    "/api/accounting-reconciliation/drilldown/:kind/:id",
    authorizeRole(["Admin", "Manager", "Salesperson"]),
    async (req, res, next) => {
      try {
        const data = await getAccountingDrilldown(req.params.kind, req.params.id);
        res.setHeader("Cache-Control", "no-store");
        return res.json({ success: true, data });
      } catch (error) { next(error); }
    },
  );

  app.get(
    "/api/accounting-reconciliation",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const limit = Math.min(Math.max(parseInt(String(req.query.limit || "25"), 10) || 25, 1), 100);
        const offset = Math.max(parseInt(String(req.query.offset || "0"), 10) || 0, 0);
        const statusRaw = String(req.query.status || "needs_review");
        const severityRaw = String(req.query.severity || "ALL");
        const status = ["ALL", "needs_review", "resolved"].includes(statusRaw) ? statusRaw as "ALL" | "needs_review" | "resolved" : "needs_review";
        const severity = ["ALL", "warning", "high"].includes(severityRaw) ? severityRaw as "ALL" | "warning" | "high" : "ALL";
        const [data, governanceHealth] = await Promise.all([
          getAccountingReconciliationCenterReadModel({
            q: String(req.query.q || ""),
            status,
            severity,
            issueType: String(req.query.issueType || "ALL"),
            limit,
            offset,
          }),
          getAccountingGovernanceHealth(),
        ]);
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, data: data.rows, meta: {
          pagination: data.pagination,
          summary: data.summary,
          options: data.options,
          generatedAt: data.generatedAt,
          readOnly: data.readOnly,
          capabilities: data.capabilities,
          governanceHealth,
        } });
      } catch (error) {
        next(error);
      }
    },
  );

  // Two-step challenge. Preparing a challenge never performs the irreversible action.
  app.post(
    "/api/accounting-reconciliation/prepare-action",
    authorizeRole(["Admin", "Manager"]),
    async (req: any, res, next) => {
      try {
        const action = String(req.body?.action || "").trim();
        if (!['safe_repair', 'close_period', 'reopen_period'].includes(action)) {
          return res.status(400).json({ success: false, message: "عملیات حسابداری برای تأیید شناخته‌شده نیست." });
        }
        const actor = actorFromRequest(req);
        if (action === 'reopen_period' && String(actor?.role || '').toLowerCase() !== 'admin') {
          return res.status(403).json({ success: false, message: 'بازگشایی دوره فقط توسط مدیر سیستم مجاز است.' });
        }
        const reason = String(req.body?.reason || '').trim();
        const scopeKey = action === 'safe_repair'
          ? 'safe_repair'
          : action === 'reopen_period'
            ? `accounting-period-lock:${Number(req.body?.lockId || 0)}`
            : normalizePeriodScope(req.body?.periodStart, req.body?.periodEnd);
        const confirmationPayload = action === 'close_period'
          ? { periodStart: String(req.body?.periodStart || '').trim(), periodEnd: String(req.body?.periodEnd || '').trim(), reason }
          : action === 'reopen_period'
            ? { lockId: Number(req.body?.lockId || 0), reason }
            : undefined;
        const confirmation = prepareAccountingConfirmation(action, scopeKey, actor, confirmationPayload === undefined ? undefined : { payload: confirmationPayload });
        res.setHeader("Cache-Control", "no-store");
        return res.json({
          success: true,
          message: "مرحله اول تأیید ثبت شد. برای اجرا باید درخواست دوم با توکن یک‌بارمصرف ارسال شود.",
          data: { action, scopeKey, ...confirmation },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/accounting-reconciliation/repair-safe",
    authorizeRole(["Admin", "Manager"]),
    async (req: any, res, next) => {
      try {
        const actor = actorFromRequest(req);
        consumeAccountingConfirmation(req.body?.confirmationToken, 'safe_repair', 'safe_repair', actor);

        // v337 hard gate: a verified SHA256 backup must exist BEFORE repair starts.
        const safetyBackup = await createDbBackup({ prefix: 'pre-accounting-repair' });
        if (!safetyBackup.checksumVerified || !/^[a-f0-9]{64}$/i.test(String(safetyBackup.sha256 || ''))) {
          throw new Error("بکاپ ایمنی Repair ساخته شد اما اعتبار SHA256 آن تأیید نشد؛ Repair متوقف شد.");
        }

        const result = await runLegacyAccountingReconciliation({
          audit: true,
          actor,
          source: "accounting_reconciliation_center",
        });
        const [refreshed, governanceHealth] = await Promise.all([
          getAccountingReconciliationCenterReadModel({ status: "needs_review", limit: 1, offset: 0 }),
          getAccountingGovernanceHealth(),
        ]);
        res.setHeader("Cache-Control", "no-store");
        res.json({
          success: true,
          data: result,
          meta: {
            summary: refreshed.summary,
            generatedAt: refreshed.generatedAt,
            safetyBackup: {
              fileName: safetyBackup.fileName,
              size: safetyBackup.size,
              sha256: safetyBackup.sha256,
              checksumVerified: safetyBackup.checksumVerified,
            },
            governanceHealth,
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.post(
    "/api/accounting-reconciliation/close-period",
    authorizeRole(["Admin", "Manager"]),
    async (req: any, res, next) => {
      try {
        const actor = actorFromRequest(req);
        const periodStart = String(req.body?.periodStart || "").trim();
        const periodEnd = String(req.body?.periodEnd || "").trim();
        const scopeKey = normalizePeriodScope(periodStart, periodEnd);
        const reason = String(req.body?.reason || '').trim();
        consumeAccountingConfirmation(req.body?.confirmationToken, 'close_period', scopeKey, actor, { payload: { periodStart, periodEnd, reason } });
        const data = await closeAccountingPeriod({ periodStart, periodEnd, reason, actor });
        const governanceHealth = await getAccountingGovernanceHealth();
        res.setHeader("Cache-Control", "no-store");
        return res.json({
          success: true,
          message: "دوره حسابداری بسته و Snapshot نسخه‌بندی‌شده ثبت شد.",
          data,
          meta: { governanceHealth },
        });
      } catch (error) {
        next(error);
      }
    },
  );
  app.post(
    "/api/accounting-reconciliation/reopen-period",
    authorizeRole(["Admin"]),
    async (req: any, res, next) => {
      try {
        const actor = actorFromRequest(req);
        const lockId = Number(req.body?.lockId || 0);
        const reason = String(req.body?.reason || '').trim();
        const scopeKey = `accounting-period-lock:${lockId}`;
        consumeAccountingConfirmation(req.body?.confirmationToken, 'reopen_period', scopeKey, actor, { payload: { lockId, reason } });
        const data = await reopenAccountingPeriod({ lockId, reason, actor });
        const governanceHealth = await getAccountingGovernanceHealth();
        res.setHeader("Cache-Control", "no-store");
        return res.json({ success: true, message: "دوره حسابداری با ثبت Snapshot و Audit Event بازگشایی شد.", data, meta: { governanceHealth } });
      } catch (error) {
        next(error);
      }
    },
  );

};
