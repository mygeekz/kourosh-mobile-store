import type { Express, RequestHandler } from "express";
import { customersService } from "../services/customers.service";
import {
  actorFromRequestUser,
  buildLedgerMutationImpact,
  consumeSensitiveAccountingOperation,
  prepareSensitiveAccountingOperation,
  recordSensitiveAccountingMutation,
} from "../accounting/sensitiveAccountingOperations";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type NotifyCustomer = (
  topic: string,
  customerId: number,
  channel: "sms" | "telegram" | "both",
  variables?: Record<string, any>,
) => Promise<any>;

type CustomersRouteDeps = {
  authorizeRole: AuthorizeRole;
  notifyCustomer?: NotifyCustomer;
};

const CUSTOMER_ROLES = ["Admin", "Manager", "Salesperson", "Marketer"];

export const registerCustomersRoutes = (
  app: Express,
  { authorizeRole, notifyCustomer }: CustomersRouteDeps,
): void => {
  app.post(
    "/api/customers",
    authorizeRole(CUSTOMER_ROLES),
    async (req: any, res, next) => {
      try {
        res.status(201).json({
          success: true,
          data: await customersService.createCustomer(req.body as any, req.user),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.put(
    "/api/customers/:id",
    authorizeRole(CUSTOMER_ROLES),
    async (req: any, res, next) => {
      try {
        res.json({
          success: true,
          data: await customersService.updateCustomer(
            +req.params.id,
            req.body as any,
            req.user,
          ),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.patch(
    "/api/customers/:id/tags",
    authorizeRole(CUSTOMER_ROLES),
    async (req: any, res, next) => {
      try {
        const id = +req.params.id;
        const tags = Array.isArray(req.body?.tags) ? req.body.tags : [];
        const updated = await customersService.updateCustomerTags(
          id,
          tags,
          req.user,
        );
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    "/api/customers/:id",
    authorizeRole(["Admin", "Manager"]),
    async (req: any, res, next) => {
      try {
        const ok = await customersService.deleteCustomer(+req.params.id, req.user);
        res.json({ success: true, data: ok });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/customers",
    authorizeRole(CUSTOMER_ROLES),
    async (req, res, next) => {
      try {
        res.setHeader("Cache-Control", "no-store");
        if (String(req.query.view || '') === 'directory') {
          const data = await customersService.listCustomersDirectory({
            page: Number(req.query.page || 1),
            pageSize: Number(req.query.pageSize || 25),
            search: String(req.query.search || ''),
            tag: String(req.query.tag || ''),
            balance: String(req.query.balance || 'all') as any,
            sort: String(req.query.sort || 'name') as any,
            risk: String(req.query.risk || 'all') as any,
            includeSummary: String(req.query.includeSummary || '') === '1',
          });
          return res.json({ success: true, data });
        }
        const q = req.query.q ? String(req.query.q) : undefined;
        const limit = req.query.limit ? Number(req.query.limit) : undefined;
        const id = req.query.id ? Number(req.query.id) : undefined;
        const offset = req.query.offset ? Number(req.query.offset) : undefined;
        res.json({
          success: true,
          data: await customersService.listCustomers({ q, limit, id, offset }),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/customers/:id",
    authorizeRole(CUSTOMER_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        const data = await customersService.getCustomerProfileBundle(id, { includeLedger: String(req.query.includeLedger || '1') !== '0' });
        if (!data)
          return res
            .status(404)
            .json({ success: false, message: "مشتری یافت نشد." });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/customers/:id/ledger/insights",
    authorizeRole(CUSTOMER_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        const result = await customersService.getCustomerLedgerInsights(id);
        if (!result.found)
          return res
            .status(404)
            .json({ success: false, message: "مشتری یافت نشد." });
        res.json({ success: true, data: result.insights });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/customers/:id/followups",
    authorizeRole(CUSTOMER_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        const rows = await customersService.listCustomerFollowups(id);
        res.json({ success: true, data: rows });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/customers/:id/manager-notes",
    authorizeRole(CUSTOMER_ROLES),
    async (req, res, next) => {
      try {
        const customerId = Number(req.params.id || 0);
        if (!customerId)
          return res
            .status(400)
            .json({ success: false, message: "شناسه مشتری نامعتبر است." });

        const rows = await customersService.listCustomerManagerNotes(customerId);
        if (!rows)
          return res
            .status(404)
            .json({ success: false, message: "مشتری یافت نشد." });

        res.json({ success: true, data: rows });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/customers/:id/followups",
    authorizeRole(CUSTOMER_ROLES),
    async (req: any, res, next) => {
      try {
        const id = +req.params.id;
        const created = await customersService.createCustomerFollowup(
          id,
          req.body as any,
          req.user,
        );
        res.status(201).json({ success: true, data: created });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/customers/:id/followups/:followupId/close",
    authorizeRole(CUSTOMER_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        const followupId = +req.params.followupId;
        const updated = await customersService.closeCustomerFollowup(
          id,
          followupId,
        );
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    },
  );

  app.patch(
    "/api/customers/:id/followups/:followupId",
    authorizeRole(CUSTOMER_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        const followupId = +req.params.followupId;
        const updated = await customersService.updateCustomerFollowup(
          id,
          followupId,
          req.body || {},
        );
        res.json({ success: true, data: updated });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/customers/:id/manager-notes",
    authorizeRole(CUSTOMER_ROLES),
    async (req: any, res, next) => {
      try {
        const customerId = Number(req.params.id || 0);
        const context = String(req.body?.context || "")
          .trim()
          .slice(0, 120);
        const note = String(req.body?.note || "").trim();

        if (!customerId)
          return res
            .status(400)
            .json({ success: false, message: "شناسه مشتری نامعتبر است." });
        if (!note)
          return res.status(400).json({
            success: false,
            message: "متن یادداشت مدیریتی الزامی است.",
          });

        const saved = await customersService.createCustomerManagerNote({
          customerId,
          context,
          note,
          user: req.user,
        });
        if (!saved)
          return res
            .status(404)
            .json({ success: false, message: "مشتری یافت نشد." });

        res.status(201).json({ success: true, data: saved });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    "/api/customers/:id/manager-notes/:noteId",
    authorizeRole(["Admin", "Manager"]),
    async (req: any, res, next) => {
      try {
        const customerId = Number(req.params.id || 0);
        const noteId = Number(req.params.noteId || 0);
        if (!customerId || !noteId)
          return res
            .status(400)
            .json({ success: false, message: "شناسه یادداشت نامعتبر است." });

        const result = await customersService.deleteCustomerManagerNote({
          customerId,
          noteId,
          user: req.user,
        });

        if (!result.deleted)
          return res.status(404).json({
            success: false,
            message: "یادداشت مدیریتی یافت نشد.",
          });

        res.json({ success: true, data: result.data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/customers/:id/ledger",
    authorizeRole(CUSTOMER_ROLES),
    async (req, res, next) => {
      try {
        const customerId = Number(req.params.id || 0);
        if (!customerId) return res.status(400).json({ success: false, message: "شناسه مشتری نامعتبر است." });
        res.setHeader("Cache-Control", "no-store");
        const data = await customersService.listCustomerLedgerDirectory(customerId, {
          page: Number(req.query.page || 1),
          pageSize: Number(req.query.pageSize || 25),
          search: String(req.query.search || ""),
          direction: String(req.query.direction || "all") as any,
          range: String(req.query.range || "all") as any,
          includeSummary: String(req.query.includeSummary || "") === "1",
        });
        res.json({ success: true, data });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/customers/:id/ledger",
    authorizeRole(["Admin", "Manager", "Salesperson"]),
    async (req: any, res) => {
      try {
        const data = await customersService.createCustomerLedgerEntry({
          customerId: +req.params.id,
          payload: req.body as any,
          user: req.user,
          notifyCustomer,
        });
        res.status(201).json({ success: true, data });
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("مبالغ نامعتبر") || msg.includes("مبلغ حسابداری") || msg.includes("تاریخ حسابداری") || msg.includes("مرجع سیستمی") || msg.includes("شناسه مرجع") || msg.includes("سند مستقل") || msg.includes("توضیح/علت")) {
          return res.status(400).json({ success: false, message: msg });
        }
        if (msg.includes("یافت نشد") || msg.toLowerCase().includes("not found")) {
          return res.status(404).json({ success: false, message: msg });
        }
        console.error("POST /customers ledger error", e);
        res
          .status(500)
          .json({ success: false, message: "خطای داخلی در پردازش درخواست رخ داد." });
      }
    },
  );

  app.post(
    "/api/customers/:id/ledger/:entryId/correction/prepare",
    authorizeRole(["Admin", "Manager", "Salesperson"]),
    async (req: any, res) => {
      try {
        const customerId = +req.params.id;
        const entryId = +req.params.entryId;
        const payload = { ...(req.body || {}) };
        delete payload.confirmationToken;
        const actor = actorFromRequestUser(req.user);
        const impact = await buildLedgerMutationImpact({ kind: "customer", accountId: customerId, entryId, action: "correct", replacement: payload });
        const data = prepareSensitiveAccountingOperation({ action: "customer_ledger_correction", scopeKey: `customer-ledger:${entryId}`, actor, payload, impact });
        return res.json({ success: true, data });
      } catch (e: any) { return res.status(String(e?.message || '').includes('یافت نشد') ? 404 : 400).json({ success: false, message: String(e?.message || 'خطا در پیش‌نمایش اصلاح سند') }); }
    },
  );

  app.post(
    "/api/customers/:id/ledger/:entryId/reversal/prepare",
    authorizeRole(["Admin", "Manager"]),
    async (req: any, res) => {
      try {
        const customerId = +req.params.id;
        const entryId = +req.params.entryId;
        const reason = String(req.body?.reason || '').trim();
        if (reason.length < 3) return res.status(400).json({ success: false, message: 'علت برگشت سند حداقل ۳ کاراکتر الزامی است.' });
        const actor = actorFromRequestUser(req.user);
        const impact = await buildLedgerMutationImpact({ kind: "customer", accountId: customerId, entryId, action: "reverse" });
        const data = prepareSensitiveAccountingOperation({ action: "customer_ledger_reversal", scopeKey: `customer-ledger:${entryId}`, actor, payload: { reason }, impact });
        return res.json({ success: true, data });
      } catch (e: any) { return res.status(String(e?.message || '').includes('یافت نشد') ? 404 : 400).json({ success: false, message: String(e?.message || 'خطا در پیش‌نمایش برگشت سند') }); }
    },
  );

  app.put(
    "/api/customers/:id/ledger/:entryId",
    authorizeRole(["Admin", "Manager", "Salesperson"]),
    async (req: any, res) => {
      try {
        const customerId = +req.params.id;
        const entryId = +req.params.entryId;
        const payload = { ...(req.body || {}) };
        const confirmationToken = payload.confirmationToken;
        delete payload.confirmationToken;
        const actor = actorFromRequestUser(req.user);
        const impact = await buildLedgerMutationImpact({ kind: "customer", accountId: customerId, entryId, action: "correct", replacement: payload });
        consumeSensitiveAccountingOperation({ token: confirmationToken, action: "customer_ledger_correction", scopeKey: `customer-ledger:${entryId}`, actor, payload });
        const data = await customersService.updateCustomerLedgerEntry({ customerId, entryId, payload, user: req.user, notifyCustomer });
        await recordSensitiveAccountingMutation({ action: "customer_ledger_correction", entityType: "customer_ledger", entityId: entryId, accountType: "customer", accountId: customerId, actor, reason: String(payload.description || 'اصلاح سند دفتر مشتری'), before: impact, after: data });
        res.json({ success: true, data });
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("رکورد دفتر یافت نشد")) {
          return res.status(404).json({ success: false, message: msg });
        }
        if (msg.includes("عدم تطابق مشتری")) {
          return res.status(409).json({ success: false, message: msg });
        }
        if (msg.includes("مبالغ نامعتبر") || msg.includes("مبلغ حسابداری") || msg.includes("تاریخ حسابداری") || msg.includes("شناسه مرجع")) {
          return res.status(400).json({ success: false, message: msg });
        }
        if (msg.includes("عملیات سیستمی") || msg.includes("سند برگشتی") || msg.includes("عملیات منبع") || msg.includes("فسخ")) {
          return res.status(409).json({ success: false, message: msg });
        }
        console.error("PUT /customers ledger error", e);
        res
          .status(500)
          .json({ success: false, message: "خطای داخلی در پردازش درخواست رخ داد." });
      }
    },
  );

  app.delete(
    "/api/customers/:id/ledger/:entryId",
    authorizeRole(["Admin", "Manager"]),
    async (req: any, res) => {
      try {
        const customerId = +req.params.id;
        const entryId = +req.params.entryId;
        const reason = String(req.body?.reason || '').trim();
        if (reason.length < 3) return res.status(400).json({ success: false, message: 'علت برگشت سند حداقل ۳ کاراکتر الزامی است.' });
        const actor = actorFromRequestUser(req.user);
        const impact = await buildLedgerMutationImpact({ kind: "customer", accountId: customerId, entryId, action: "reverse" });
        consumeSensitiveAccountingOperation({ token: req.body?.confirmationToken, action: "customer_ledger_reversal", scopeKey: `customer-ledger:${entryId}`, actor, payload: { reason } });
        const ok = await customersService.deleteCustomerLedgerEntry({ customerId, entryId, user: req.user, notifyCustomer });
        await recordSensitiveAccountingMutation({ action: "customer_ledger_reversal", entityType: "customer_ledger", entityId: entryId, accountType: "customer", accountId: customerId, actor, reason, before: impact, after: { reversed: true } });
        res.json({ success: true, data: ok });
      } catch (e: any) {
        const msg = String(e?.message || "");
        if (msg.includes("رکورد دفتر یافت نشد")) {
          return res.status(404).json({ success: false, message: msg });
        }
        if (msg.includes("عدم تطابق مشتری")) {
          return res.status(409).json({ success: false, message: msg });
        }
        if (msg.includes("عملیات سیستمی") || msg.includes("سند برگشتی") || msg.includes("عملیات منبع") || msg.includes("فسخ")) {
          return res.status(409).json({ success: false, message: msg });
        }
        console.error("DELETE /customers ledger error", e);
        res
          .status(500)
          .json({ success: false, message: "خطای داخلی در پردازش درخواست رخ داد." });
      }
    },
  );

};
