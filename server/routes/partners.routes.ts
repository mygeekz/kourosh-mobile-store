import type { Express, RequestHandler } from "express";
import { partnersService } from "../services/partners.service";
import { submitPartnerSettlementAtomic } from "../services/partnerSettlementAtomicSubmitService";
import { persistPartnerSettlementManagerSignoff } from "../services/partnerSettlementManagerSignoffPersistenceService";
import type { LedgerEntryPayload, PartnerPayload } from "../repositories/partners.repo";
import { getPartnerAccountingBreakdown } from "../accounting/accountingGovernance";
import {
  actorFromRequestUser,
  buildLedgerMutationImpact,
  consumeSensitiveAccountingOperation,
  prepareSensitiveAccountingOperation,
  recordSensitiveAccountingMutation,
} from "../accounting/sensitiveAccountingOperations";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type PartnersRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const PARTNER_READ_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];
const PARTNER_MUTATION_ROLES = ["Admin"];
const PARTNER_LEDGER_EDIT_ROLES = ["Admin", "Salesperson"];
const PARTNER_LEDGER_DELETE_ROLES = ["Admin"];
const PARTNER_ATOMIC_SETTLEMENT_SUBMIT_ROLES = ["Admin", "Manager"];
const PARTNER_MANAGER_SIGNOFF_ROLES = ["Admin", "Manager"];

const handlePartnerLedgerError = (res: any, e: any, logLabel: string) => {
  const msg = String(e?.message || "");
  if (msg.includes("رکورد دفتر یافت نشد")) {
    return res.status(404).json({ success: false, message: msg });
  }
  if (msg.includes("عدم تطابق همکار")) {
    return res.status(409).json({ success: false, message: msg });
  }
  if (msg.includes("مبالغ نامعتبر") || msg.includes("مبلغ حسابداری") || msg.includes("تاریخ حسابداری") || msg.includes("شناسه مرجع") || msg.includes("مرجع سیستمی") || msg.includes("سند مستقل") || msg.includes("توضیح/علت") || msg.includes("گوشی مرجع")) {
    return res.status(400).json({ success: false, message: msg });
  }
  if (msg.includes("عملیات سیستمی") || msg.includes("سند برگشتی") || msg.includes("اصلاح شود") || msg.includes("ویرایش مستقیم")) {
    return res.status(409).json({ success: false, message: msg });
  }
  console.error(logLabel, e);
  return res
    .status(500)
    .json({ success: false, message: "خطای داخلی در پردازش درخواست رخ داد." });
};

export const registerPartnersRoutes = (
  app: Express,
  { authorizeRole }: PartnersRouteDeps,
): void => {
  app.get(
    "/api/partners",
    authorizeRole(PARTNER_READ_ROLES),
    async (req, res, next) => {
      try {
        if (String(req.query.view || '') === 'directory') {
          const data = await partnersService.listPartnersDirectory({
            page: Number(req.query.page || 1),
            pageSize: Number(req.query.pageSize || 25),
            search: String(req.query.search || ''),
            balance: String(req.query.balance || 'all') as any,
            sort: String(req.query.sort || 'name') as any,
            includeSummary: String(req.query.includeSummary || '') === '1',
          });
          return res.json({ success: true, data });
        }
        res.json({
          success: true,
          data: await partnersService.listPartners(
            req.query.partnerType as string | undefined,
          ),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/partners/:id",
    authorizeRole(PARTNER_READ_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        const data = String(req.query.view || '') === 'profile'
          ? await partnersService.getPartnerProfileShell(id)
          : await partnersService.getPartnerProfileBundle(id);
        if (!data)
          return res
            .status(404)
            .json({ success: false, message: "همکار یافت نشد." });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );


  const handlePartnerAccountingBreakdown: RequestHandler = async (req, res, next) => {
    try {
      const data = await getPartnerAccountingBreakdown(+req.params.id);
      if (!data) {
        return res.status(404).json({ success: false, message: "همکار یافت نشد." });
      }
      res.setHeader("Cache-Control", "no-store");
      return res.json({ success: true, data });
    } catch (e) {
      console.error("[partner-accounting-breakdown] request failed", { partnerId: req.params.id, error: e });
      next(e);
    }
  };

  app.get(
    "/api/partners/:id/accounting-breakdown",
    authorizeRole(PARTNER_READ_ROLES),
    handlePartnerAccountingBreakdown,
  );

  // Compatibility alias for a stale PWA asset observed in the field. Keeping
  // this read-only alias lets an older cached client recover after deploy while
  // the service worker refreshes to the canonical accounting-breakdown route.
  app.get(
    "/api/partners/:id/counting-breakdown",
    authorizeRole(PARTNER_READ_ROLES),
    handlePartnerAccountingBreakdown,
  );

  app.get(
    "/api/partners/:id/phone-settlements",
    authorizeRole(PARTNER_READ_ROLES),
    async (req, res, next) => {
      try {
        const data = await partnersService.listPartnerPhoneSettlementDirectory(+req.params.id, {
          page: Number(req.query.page || 1),
          pageSize: Number(req.query.pageSize || 25),
          search: String(req.query.search || ''),
          status: String(req.query.status || 'all') as any,
          sort: String(req.query.sort || 'newest') as any,
          includeMeta: String(req.query.includeMeta ?? '1') !== '0',
        });
        return res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/partners/:id/phone-settlements/:phoneId/timeline",
    authorizeRole(PARTNER_READ_ROLES),
    async (req, res, next) => {
      try {
        const data = await partnersService.getPartnerPhoneSettlementTimeline(
          +req.params.id,
          +req.params.phoneId,
          {
            page: Number(req.query.page || 1),
            pageSize: Number(req.query.pageSize || 20),
            includeMeta: String(req.query.includeMeta ?? '1') !== '0',
          },
        );
        if (!data) {
          return res.status(404).json({ success: false, message: "گوشی فروخته‌شده برای این همکار یافت نشد." });
        }
        return res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/partners/:id/ledger",
    authorizeRole(PARTNER_READ_ROLES),
    async (req, res, next) => {
      try {
        const data = await partnersService.listPartnerLedgerDirectory(+req.params.id, {
          page: Number(req.query.page || 1),
          pageSize: Number(req.query.pageSize || 25),
          search: String(req.query.search || ''),
          direction: String(req.query.direction || 'all') as any,
          range: String(req.query.range || 'all') as any,
          systemId: String(req.query.systemId || 'all'),
          settlementBatchId: String(req.query.settlementBatchId || ''),
          includeMeta: String(req.query.includeMeta ?? '1') !== '0',
          includeRelated: String(req.query.includeRelated ?? '1') !== '0',
        });
        return res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/partners/:id/purchases",
    authorizeRole(PARTNER_READ_ROLES),
    async (req, res, next) => {
      try {
        const data = await partnersService.listPartnerPurchaseDirectory(+req.params.id, {
          page: Number(req.query.page || 1),
          pageSize: Number(req.query.pageSize || 25),
          type: String(req.query.type || 'all') as any,
        });
        return res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );


  app.post(
    "/api/partners/:id/settlement/atomic-submit",
    authorizeRole(PARTNER_ATOMIC_SETTLEMENT_SUBMIT_ROLES),
    async (req, res, next) => {
      try {
        const result = await submitPartnerSettlementAtomic(
          +req.params.id,
          req.body,
          req.user || {},
        );

        if (result.ok) {
          return res.status(result.status === "already-submitted" ? 200 : 201).json(result);
        }

        const statusByReason: Record<string, number> = {
          unauthorized: 401,
          forbidden: 403,
          "missing-confirmation": 400,
          "missing-idempotency-key": 400,
          "dry-run-not-found": 409,
          "dry-run-stale": 409,
          "blocking-validation-errors": 422,
          "idempotency-conflict": 409,
          "missing-settlement-data": 422,
          "transaction-rolled-back": 500,
        };

        return res.status(statusByReason[result.reason] || 400).json(result);
      } catch (error) {
        return next(error);
      }
    },
  );


  app.post(
    "/api/partners/:id/settlement/manager-signoff",
    authorizeRole(PARTNER_MANAGER_SIGNOFF_ROLES),
    async (req, res, next) => {
      try {
        const result = await persistPartnerSettlementManagerSignoff(
          +req.params.id,
          req.body,
          req.user || {},
        );

        if (result.ok) {
          return res.status(result.status === "already-signed" ? 200 : 201).json(result);
        }

        const statusByReason: Record<string, number> = {
          unauthorized: 401,
          forbidden: 403,
          "missing-signoff-confirmation": 400,
          "missing-signoff-data": 400,
          "settlement-not-found": 409,
          "signoff-idempotency-conflict": 409,
          "transaction-rolled-back": 500,
        };

        return res.status(statusByReason[result.reason] || 400).json(result);
      } catch (error) {
        return next(error);
      }
    },
  );

  app.post(
    "/api/partners/:id/phone-settlements/:phoneId/payments",
    authorizeRole(PARTNER_LEDGER_DELETE_ROLES),
    async (req: any, res, next) => {
      try {
        const data = await partnersService.createPhoneSettlementPayment(
          +req.params.id,
          +req.params.phoneId,
          req.body as LedgerEntryPayload,
          req.user,
        );
        return res.status(201).json({ success: true, data });
      } catch (e: any) {
        const status = Number(e?.statusCode || e?.status || 0);
        if (status >= 400 && status < 600) return res.status(status).json({ success: false, message: String(e?.message || "خطا در ثبت پرداخت گوشی") });
        return handlePartnerLedgerError(res, e, "POST /partners phone settlement payment error");
      }
    },
  );

  app.post(
    "/api/partners",
    authorizeRole(PARTNER_MUTATION_ROLES),
    async (req, res, next) => {
      try {
        res.status(201).json({
          success: true,
          data: await partnersService.createPartner(req.body as PartnerPayload),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.put(
    "/api/partners/:id",
    authorizeRole(PARTNER_MUTATION_ROLES),
    async (req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnersService.updatePartner(
            +req.params.id,
            req.body as PartnerPayload,
          ),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    "/api/partners/:id",
    authorizeRole(PARTNER_MUTATION_ROLES),
    async (req, res, next) => {
      try {
        const ok = await partnersService.deletePartner(+req.params.id);
        res.json({ success: true, data: ok });
      } catch (e) {
        next(e);
      }
    },
  );


  app.post(
    "/api/partners/:id/ledger/:entryId/correction/prepare",
    authorizeRole(PARTNER_LEDGER_EDIT_ROLES),
    async (req: any, res) => {
      try {
        const partnerId = +req.params.id; const entryId = +req.params.entryId;
        const payload = { ...(req.body || {}) }; delete payload.confirmationToken;
        const actor = actorFromRequestUser(req.user);
        const impact = await buildLedgerMutationImpact({ kind: "partner", accountId: partnerId, entryId, action: "correct", replacement: payload });
        const data = prepareSensitiveAccountingOperation({ action: "partner_ledger_correction", scopeKey: `partner-ledger:${entryId}`, actor, payload, impact });
        return res.json({ success: true, data });
      } catch (e: any) { return handlePartnerLedgerError(res, e, "POST /partners ledger correction prepare error"); }
    },
  );

  app.post(
    "/api/partners/:id/ledger/:entryId/reversal/prepare",
    authorizeRole(PARTNER_LEDGER_DELETE_ROLES),
    async (req: any, res) => {
      try {
        const partnerId = +req.params.id; const entryId = +req.params.entryId;
        const reason = String(req.body?.reason || '').trim();
        if (reason.length < 3) return res.status(400).json({ success: false, message: 'علت برگشت سند حداقل ۳ کاراکتر الزامی است.' });
        const actor = actorFromRequestUser(req.user);
        const impact = await buildLedgerMutationImpact({ kind: "partner", accountId: partnerId, entryId, action: "reverse" });
        const data = prepareSensitiveAccountingOperation({ action: "partner_ledger_reversal", scopeKey: `partner-ledger:${entryId}`, actor, payload: { reason }, impact });
        return res.json({ success: true, data });
      } catch (e: any) { return handlePartnerLedgerError(res, e, "POST /partners ledger reversal prepare error"); }
    },
  );

  app.put(
    "/api/partners/:id/ledger/:entryId",
    authorizeRole(PARTNER_LEDGER_EDIT_ROLES),
    async (req: any, res) => {
      try {
        const partnerId = +req.params.id; const entryId = +req.params.entryId;
        const payload: any = { ...(req.body || {}) }; const confirmationToken = payload.confirmationToken; delete payload.confirmationToken;
        const actor = actorFromRequestUser(req.user);
        const impact = await buildLedgerMutationImpact({ kind: "partner", accountId: partnerId, entryId, action: "correct", replacement: payload });
        consumeSensitiveAccountingOperation({ token: confirmationToken, action: "partner_ledger_correction", scopeKey: `partner-ledger:${entryId}`, actor, payload });
        const data = await partnersService.updateLedgerEntry(partnerId, entryId, payload as Partial<LedgerEntryPayload>, req.user);
        await recordSensitiveAccountingMutation({ action: "partner_ledger_correction", entityType: "partner_ledger", entityId: entryId, accountType: "partner", accountId: partnerId, actor, reason: String(payload.description || 'اصلاح سند دفتر همکار'), before: impact, after: data });
        res.json({ success: true, data });
      } catch (e: any) {
        return handlePartnerLedgerError(res, e, "PUT /partners ledger error");
      }
    },
  );

  app.delete(
    "/api/partners/:id/ledger/:entryId",
    authorizeRole(PARTNER_LEDGER_DELETE_ROLES),
    async (req: any, res) => {
      try {
        const partnerId = +req.params.id; const entryId = +req.params.entryId;
        const reason = String(req.body?.reason || '').trim();
        if (reason.length < 3) return res.status(400).json({ success: false, message: 'علت برگشت سند حداقل ۳ کاراکتر الزامی است.' });
        const actor = actorFromRequestUser(req.user);
        const impact = await buildLedgerMutationImpact({ kind: "partner", accountId: partnerId, entryId, action: "reverse" });
        consumeSensitiveAccountingOperation({ token: req.body?.confirmationToken, action: "partner_ledger_reversal", scopeKey: `partner-ledger:${entryId}`, actor, payload: { reason } });
        const ok = await partnersService.deleteLedgerEntry(partnerId, entryId, req.user);
        await recordSensitiveAccountingMutation({ action: "partner_ledger_reversal", entityType: "partner_ledger", entityId: entryId, accountType: "partner", accountId: partnerId, actor, reason, before: impact, after: { reversed: true } });
        res.json({ success: true, data: ok });
      } catch (e: any) {
        return handlePartnerLedgerError(res, e, "DELETE /partners ledger error");
      }
    },
  );

  app.post(
    "/api/partners/:id/ledger",
    authorizeRole(PARTNER_LEDGER_DELETE_ROLES),
    async (req: any, res, next) => {
      try {
        res.status(201).json({
          success: true,
          data: await partnersService.createLedgerEntry(
            +req.params.id,
            req.body as LedgerEntryPayload,
            req.user,
          ),
        });
      } catch (e: any) {
        return handlePartnerLedgerError(res, e, "POST /partners ledger error");
      }
    },
  );

};
