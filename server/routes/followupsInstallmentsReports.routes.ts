import type { Express } from "express";
import moment from "jalali-moment";
import { allAsync, fromShamsiStringToISO } from "../database";

type AuthorizeRole = (roles: string[]) => any;

type RegisterFollowupsInstallmentsReportsRoutesDeps = {
  authorizeRole: AuthorizeRole;
};

export const registerFollowupsInstallmentsReportsRoutes = (
  app: Express,
  { authorizeRole }: RegisterFollowupsInstallmentsReportsRoutesDeps,
): void => {
  // ------------------------------
  // گزارش پیگیری‌ها (CRM Followups)
  // ------------------------------
  app.get(
    "/api/reports/followups",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const status = String(req.query.status || "open"); // open|closed|all
        const from = String(req.query.from || ""); // ISO date (start)
        const to = String(req.query.to || ""); // ISO date (end)
        const owner = String(req.query.owner || ""); // createdByUsername contains
        const dateField = String(req.query.dateField || "next"); // next|created
        const allowedStatus = ["open", "closed", "all"];
        if (!allowedStatus.includes(status)) {
          return res
            .status(400)
            .json({ success: false, message: "status نامعتبر است." });
        }
        const noDue = String(req.query.noDue || "") === "1"; // فقط موارد بدون موعد
        const where: string[] = [];
        const params: any[] = [];
        if (status !== "all") {
          where.push("cf.status = ?");
          params.push(status);
        }
        if (owner) {
          where.push("(cf.createdByUsername LIKE ?)");
          params.push(`%${owner}%`);
        }
        if (noDue) {
          where.push("cf.nextFollowupDate IS NULL");
        } else if (dateField === "created") {
          if (from) {
            where.push("cf.createdAt >= ?");
            params.push(from);
          }
          if (to) {
            where.push("cf.createdAt <= ?");
            params.push(to);
          }
        } else {
          // next followup date filter
          where.push("cf.nextFollowupDate IS NOT NULL");
          if (from) {
            where.push("cf.nextFollowupDate >= ?");
            params.push(from);
          }
          if (to) {
            where.push("cf.nextFollowupDate <= ?");
            params.push(to);
          }
        }
        const whereSql = where.length ? "WHERE " + where.join(" AND ") : "";
        const rows = await allAsync(
          `SELECT cf.*,
                c.fullName AS customerName,
                c.phoneNumber AS customerPhone
           FROM customer_followups cf
           JOIN customers c ON c.id = cf.customerId
           ${whereSql}
          ORDER BY (CASE WHEN cf.nextFollowupDate IS NULL THEN 1 ELSE 0 END),
                   cf.nextFollowupDate ASC,
                   cf.createdAt DESC,
                   cf.id DESC
          LIMIT 1000`,
          params,
        );
        res.json({ success: true, data: rows });
      } catch (e) {
        next(e);
      }
    },
  );

  // -------------------------------------------------
  // Installments calendar (Phase P1)
  // -------------------------------------------------
  app.get(
    "/api/reports/installments-calendar",
    authorizeRole(["Admin", "Manager", "Salesperson"]),
    async (req, res, next) => {
      try {
        const nowJ = moment().locale("fa");
        const fromJ = String(
          req.query.from ||
            nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const toJ = String(
          req.query.to || nowJ.clone().endOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        // Basic validation
        const fromIso = fromShamsiStringToISO(fromJ);
        const toIso = fromShamsiStringToISO(toJ);
        if (!fromIso || !toIso) {
          return res
            .status(400)
            .json({ success: false, message: "بازه زمانی نامعتبر است." });
        }
        const payments = await allAsync(
          `SELECT ip.id AS id, ip.saleId, ip.dueDate, ip.amountDue AS amount, ip.status,
                isale.customerId, c.fullName AS customerFullName, c.phoneNumber AS customerPhoneNumber
           FROM installment_payments ip
           JOIN installment_sales isale ON ip.saleId = isale.id
           JOIN customers c ON isale.customerId = c.id
          WHERE COALESCE(isale.status,'active') = 'active'
            AND ip.dueDate BETWEEN ? AND ?
          ORDER BY ip.dueDate ASC`,
          [fromJ, toJ],
        );
        const checks = await allAsync(
          `SELECT ic.id AS id, ic.saleId, ic.checkNumber, ic.bankName, ic.dueDate, ic.amount, ic.status,
                isale.customerId, c.fullName AS customerFullName, c.phoneNumber AS customerPhoneNumber
           FROM installment_checks ic
           JOIN installment_sales isale ON ic.saleId = isale.id
           JOIN customers c ON isale.customerId = c.id
          WHERE COALESCE(isale.status,'active') = 'active'
            AND ic.dueDate BETWEEN ? AND ?
          ORDER BY ic.dueDate ASC`,
          [fromJ, toJ],
        );
        const items = [
          ...payments.map((p: any) => ({
            type: "payment",
            id: p.id,
            saleId: p.saleId,
            dueDate: p.dueDate,
            amount: p.amount,
            status: p.status,
            customerId: p.customerId,
            customerFullName: p.customerFullName,
            customerPhoneNumber: p.customerPhoneNumber,
          })),
          ...checks.map((c: any) => ({
            type: "check",
            id: c.id,
            saleId: c.saleId,
            dueDate: c.dueDate,
            amount: c.amount,
            status: c.status,
            checkNumber: c.checkNumber,
            bankName: c.bankName,
            customerId: c.customerId,
            customerFullName: c.customerFullName,
            customerPhoneNumber: c.customerPhoneNumber,
          })),
        ].sort((a: any, b: any) =>
          String(a.dueDate).localeCompare(String(b.dueDate)),
        );
        res.json({
          success: true,
          data: { range: { from: fromJ, to: toJ }, items },
        });
      } catch (e) {
        next(e);
      }
    },
  );
};
