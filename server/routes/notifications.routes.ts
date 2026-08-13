import type { Express, RequestHandler } from "express";
import moment from "jalali-moment";
import { generatePurchaseSuggestions } from "../analysis";
import {
  addAuditLog,
  allAsync,
  computeFifoCogsForProduct,
  dismissNotificationForUserInDb,
  dismissNotificationsForUserInDb,
  getOverdueInstallmentsFromDb,
  getPendingInstallmentChecksWithCustomer,
  getPendingInstallmentPaymentsWithCustomer,
  getRepairsReadyForPickupFromDb,
  listDismissedNotificationIdsForUserFromDb,
  restoreNotificationForUserInDb,
  restoreNotificationsForUserInDb,
} from "../database";

type NotificationsRouteDeps = {
  authorizeRole: (allowed: string[]) => RequestHandler;
};

const faNum = (v: any) => Number(v ?? 0).toLocaleString("fa-IR");

export const registerNotificationsRoutes = (
  app: Express,
  { authorizeRole }: NotificationsRouteDeps,
): void => {
  app.post(
    "/api/notifications/:notificationId/dismiss",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const nid = String(req.params.notificationId || "");
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        await dismissNotificationForUserInDb(req.user.id, nid);
        try {
          addAuditLog(
            req.user.id,
            req.user.username,
            req.user.roleName,
            "update",
            "notification",
            null,
            `Dismiss notification: ${nid}`,
          );
        } catch {}
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    "/api/notifications/:notificationId/dismiss",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const nid = String(req.params.notificationId || "").trim();
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        if (!nid) return res.status(400).json({ success: false, message: "شناسه اعلان نامعتبر است." });
        await restoreNotificationForUserInDb(req.user.id, nid);
        try {
          addAuditLog(req.user.id, req.user.username, req.user.roleName, "update", "notification", null, `Restore notification: ${nid}`);
        } catch {}
        res.json({ success: true });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/notifications/dismiss-batch",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const normalizedIds: string[] = Array.from(new Set<string>(ids.map((id: unknown) => String(id || "").trim()).filter(Boolean))).slice(0, 500);
        if (!normalizedIds.length) return res.status(400).json({ success: false, message: "هیچ اعلان معتبری انتخاب نشده است." });
        const changed = await dismissNotificationsForUserInDb(req.user.id, normalizedIds);
        res.json({ success: true, data: { requested: normalizedIds.length, changed } });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/notifications/restore-batch",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        if (!req.user?.id) return res.status(401).json({ success: false, message: "Unauthorized" });
        const ids = Array.isArray(req.body?.ids) ? req.body.ids : [];
        const normalizedIds: string[] = Array.from(new Set<string>(ids.map((id: unknown) => String(id || "").trim()).filter(Boolean))).slice(0, 500);
        if (!normalizedIds.length) return res.status(400).json({ success: false, message: "هیچ اعلان معتبری انتخاب نشده است." });
        const changed = await restoreNotificationsForUserInDb(req.user.id, normalizedIds);
        res.json({ success: true, data: { requested: normalizedIds.length, changed } });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/notifications",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        res.setHeader("Cache-Control", "no-store");
        const includeDismissed = String(req.query.includeDismissed || "") === "1";
        /**
         * Unified notification list that contains both action-center items (stock alerts, overdue installments,
         * repair ready notifications) and due reminders for installments and checks. Each notification has a
         * `type` to indicate its category, a `title` and `description` for display, and optional fields for
         * further actions such as SMS triggering or navigation. The client can group notifications by `type` and
         * render an appropriate icon for each category.
         */
        let unified: any[] = [];
        // ============ Action Center Items ============
        // Suggestions / Low stock alerts
        try {
          const suggestions = await generatePurchaseSuggestions();
          (suggestions || []).forEach((item) => {
            unified.push({
              id: `stock-alert-${item.itemId}`,
              type: "StockAlert",
              title: `موجودی کم: ${item.itemName ?? "کالا"}`,
              description: `موجودی فعلی: ${faNum(item.currentStock)}. موجودی برای ${faNum(item.daysOfStockLeft)} روز آینده کافیست.`,
              priority: "High",
              actionText: "بررسی پیشنهاد خرید",
              actionLink: "/reports/analysis/suggestions",
              meta: {
                productId: Number(item.itemId || 0),
                stock: Number(item.currentStock || 0),
                daysOfStockLeft: Number(item.daysOfStockLeft || 0),
              },
            });
          });
        } catch (e) {
          console.warn("generatePurchaseSuggestions failed:", e);
        }

        // ============ Recurring Expenses Due ============
        try {
          const todayIsoDate = moment().format("YYYY-MM-DD");
          const dueRows = await allAsync(
            `SELECT id, title, category, amount, nextRunDate, vendor
               FROM recurring_expenses
              WHERE isActive = 1
                AND nextRunDate <= ?
              ORDER BY nextRunDate ASC, amount DESC
              LIMIT 50`,
            [todayIsoDate],
          );
          (dueRows || []).forEach((r: any) => {
            const isOverdue = String(r.nextRunDate) < todayIsoDate;
            unified.push({
              id: `recurring-expense-${r.id}-${r.nextRunDate}`,
              type: "RecurringExpenseDue",
              title: isOverdue
                ? `هزینه تکرارشونده عقب‌افتاده: ${r.title}`
                : `هزینه تکرارشونده سررسید: ${r.title}`,
              description:
                `تاریخ: ${r.nextRunDate} • مبلغ: ${Number(r.amount || 0).toLocaleString("fa-IR")}` +
                (r.vendor ? ` • طرف حساب: ${r.vendor}` : ""),
              priority: isOverdue ? "High" : "Medium",
              actionText: "باز کردن هزینه‌ها",
              actionLink: "/sales/expenses",
              meta: {
                amount: Number(r.amount || 0),
                dueDate: r.nextRunDate,
                recurringExpenseId: Number(r.id),
                vendor: r.vendor || undefined,
              },
            });
          });
        } catch (e) {
          console.warn("recurring expense notifications failed:", e);
        }

        // ============ Negative Margin Alerts (FIFO) ============
        try {
          const recent = await allAsync(
            `SELECT itemId, itemName, SUM(quantity) as qty, SUM(totalPrice) as revenue
               FROM sales_transactions
              WHERE itemType = 'inventory'
                AND transactionDate >= ?
              GROUP BY itemId, itemName`,
            [moment().subtract(30, "days").toDate().toISOString()],
          );
          for (const r of recent || []) {
            const pid = Number(r.itemId);
            const qty = Number(r.qty || 0);
            const revenue = Number(r.revenue || 0);
            const fifo = await computeFifoCogsForProduct(pid, qty);
            const profit = revenue - Number(fifo.cogs || 0);
            if (revenue > 0 && profit < 0) {
              unified.push({
                id: `neg-margin-${pid}-${moment().format("YYYY-MM-DD")}`,
                type: "NegativeMarginAlert",
                title: `هشدار سود منفی: ${String(r.itemName)}`,
                description: `۳۰ روز اخیر • درآمد: ${revenue.toLocaleString("fa-IR")} • سود: ${profit.toLocaleString("fa-IR")}`,
                priority: "High",
                actionText: "گزارش سود محصولات",
                actionLink: "/reports/product-margins",
                meta: { productId: pid, revenue, profit },
              });
            }
          }
        } catch (e) {
          console.warn("negative margin notifications failed:", e);
        }
        // Overdue installments (past due date)
        try {
          const allUnpaid = await getOverdueInstallmentsFromDb();
          const overdue = (allUnpaid || [])
            .filter((p) => {
              const j = moment(p?.dueDate, "jYYYY/jMM/jDD", true);
              const m = j.isValid() ? j : moment(p?.dueDate);
              return m.isBefore(moment(), "day");
            })
            .slice(0, 5);
          overdue.forEach((item) => {
            unified.push({
              id: `overdue-payment-${item.id}`,
              type: "OverdueInstallment",
              title: `قسط معوق: ${item.customerFullName ?? ""}`,
              description: `قسط به مبلغ ${faNum(item.amountDue)} تومان با سررسید ${item.dueDate} پرداخت نشده است.`,
              priority: "High",
              actionText: "مشاهده پرونده",
              actionLink: `/installment-sales/${item.saleId}`,
              // Enable reminder actions on the client
              targetId: item.id,
              eventType: "INSTALLMENT_REMINDER",
              meta: {
                customer: item.customerFullName ?? undefined,
                dueDate: item.dueDate ?? undefined,
                amount: item.amountDue ?? undefined,
              },
            });
          });
        } catch (e) {
          console.warn("getOverdueInstallmentsFromDb failed:", e);
        }
        // Repair ready notifications
        try {
          const ready = ((await getRepairsReadyForPickupFromDb()) || []).slice(
            0,
            5,
          );
          ready.forEach((item) => {
            unified.push({
              id: `repair-ready-${item.id}`,
              type: "RepairReady",
              title: `تعمیر آماده تحویل: ${item.deviceModel ?? ""}`,
              description: `دستگاه آقای/خانم ${item.customerFullName ?? ""} به مبلغ نهایی ${faNum(item.finalCost)} تومان آماده تحویل است.`,
              priority: "Medium",
              actionText: "مشاهده جزئیات",
              actionLink: `/repairs/${item.id}`,
            });
          });
        } catch (e) {
          console.warn("getRepairsReadyForPickupFromDb failed:", e);
        }
        // ============ Due Reminders for Installments & Checks ============
        try {
          // Fetch all unpaid installment payments and pending checks with customer info
          const payments = await getPendingInstallmentPaymentsWithCustomer();
          const checks = await getPendingInstallmentChecksWithCustomer();
          const today = moment().startOf("day");
          // Helper: parse due date from possible Jalali/Gregorian strings
          const parseDate = (raw: any) => {
            if (!raw) return null;
            // Try Jalali first (e.g., 1403/05/10), then ISO/Gregorian
            const j = moment(String(raw), "jYYYY/jMM/jDD", true);
            if (j.isValid()) return j.startOf("day");
            const g = moment(String(raw));
            return g.isValid() ? g.startOf("day") : null;
          };
          const faNumLocal = (v: any) => Number(v ?? 0).toLocaleString("fa-IR");
          // Installment payments: notify when due today, in 3 days or 7 days
          (payments || []).forEach((p: any) => {
            const due = parseDate(p.dueDate);
            if (!due) return;
            const diff = due.diff(today, "days");
            if (![0, 3, 7].includes(diff)) return;
            const id = `payment-${p.id}-${diff}`;
            const title =
              diff === 0
                ? "قسط امروز سررسید دارد"
                : `${faNumLocal(diff)} روز مانده به پرداخت قسط`;
            const description = `قسط به مبلغ ${faNumLocal(p.amountDue)} تومان برای ${p.customerFullName ?? ""} در تاریخ ${p.dueDate} سررسید دارد.`;
            unified.push({
              id,
              type: "InstallmentDue",
              title,
              description,
              priority: diff === 0 ? "High" : "Medium",
              daysRemaining: diff,
              targetId: p.id,
              targetType: "payment",
              eventType: "INSTALLMENT_REMINDER",
              actionText: "ارسال یادآوری",
              actionLink: `/installment-sales/${p.saleId}`,
              meta: {
                customer: p.customerFullName,
                phone: p.customerPhone,
                customerPhone: p.customerPhone,
                amount: p.amountDue,
                dueDate: p.dueDate,
              },
            });
          });
          // Checks: notify when due today, in 3 days or 7 days
          (checks || []).forEach((c: any) => {
            const due = parseDate(c.dueDate);
            if (!due) return;
            const diff = due.diff(today, "days");
            if (![0, 3, 7].includes(diff)) return;
            const id = `check-${c.id}-${diff}`;
            const title =
              diff === 0
                ? "موعد چک امروز است"
                : `${faNumLocal(diff)} روز مانده به موعد چک`;
            const description = `چک شماره ${c.checkNumber ?? ""} متعلق به ${c.customerFullName ?? ""} به مبلغ ${faNumLocal(c.amount)} تومان در تاریخ ${c.dueDate} سررسید دارد.`;
            unified.push({
              id,
              type: "CheckDue",
              title,
              description,
              priority: diff === 0 ? "High" : "Medium",
              daysRemaining: diff,
              targetId: c.id,
              targetType: "check",
              eventType: "CHECK_REMINDER",
              actionText: "ارسال یادآوری چک",
              actionLink: `/installment-sales/${c.saleId}`,
              meta: {
                customer: c.customerFullName,
                phone: c.customerPhone,
                customerPhone: c.customerPhone,
                amount: c.amount,
                dueDate: c.dueDate,
                checkNumber: c.checkNumber,
              },
            });
          });
          // Sort by priority: overdue, due today, 3 days, 7 days, then stock/repair
          unified.sort((a, b) => {
            const weight = (item: any) => {
              switch (item.type) {
                case "OverdueInstallment":
                  return 0;
                case "InstallmentDue":
                  return item.daysRemaining === 0
                    ? 1
                    : item.daysRemaining === 3
                      ? 2
                      : 3;
                case "CheckDue":
                  return item.daysRemaining === 0
                    ? 4
                    : item.daysRemaining === 3
                      ? 5
                      : 6;
                case "RepairReady":
                  return 7;
                case "StockAlert":
                  return 8;
                case "StagnantStock":
                  return 9;
                default:
                  return 10;
              }
            };
            const wA = weight(a);
            const wB = weight(b);
            return wA - wB;
          });
        } catch (e) {
          console.warn("build due notifications failed:", e);
        }
        // ============ Stagnant Stock Alerts ============
        try {
          const rows = await allAsync(
            `SELECT p.id, p.name, p.stock,
                    COALESCE(MAX(st.transactionDate), '') AS lastSaleDate
             FROM products p
             LEFT JOIN sales_transactions st ON st.itemType='inventory' AND st.itemId=p.id
             WHERE COALESCE(p.stock,0) > 0
             GROUP BY p.id, p.name, p.stock
             HAVING lastSaleDate = '' OR lastSaleDate < ?
             ORDER BY p.stock DESC
             LIMIT 30`,
            [moment().subtract(60, "days").toDate().toISOString()],
          );
          (rows || []).forEach((r: any) => {
            unified.push({
              id: `stagnant-stock-${r.id}`,
              type: "StagnantStock",
              title: `موجودی راکد: ${r.name}`,
              description: `بیش از ۶۰ روز بدون فروش • موجودی: ${Number(r.stock || 0).toLocaleString("fa-IR")}`,
              priority: "Medium",
              actionText: "بررسی محصول",
              actionLink: `/products/${r.id}`,
              meta: { productId: Number(r.id), stock: Number(r.stock || 0) } as any,
            });
          });
        } catch {}

        // ============ Customer Followups Due ============
        try {
          const todayIso = moment().startOf("day").toISOString();
          const dueFollowups = await allAsync(
            `SELECT cf.id, cf.customerId, cf.note, cf.nextFollowupDate, c.fullName
             FROM customer_followups cf
             JOIN customers c ON c.id = cf.customerId
            WHERE cf.status='open'
              AND cf.nextFollowupDate IS NOT NULL
              AND cf.nextFollowupDate <= ?
            ORDER BY cf.nextFollowupDate ASC
            LIMIT 50`,
            [todayIso],
          );
          (dueFollowups || []).forEach((f: any) => {
            unified.push({
              id: `customer-followup-${f.id}`,
              type: "CustomerFollowup",
              title: `پیگیری مشتری: ${f.fullName ?? "مشتری"}`,
              description: `موعد پیگیری رسیده است. ${f.note ? "(" + f.note + ")" : ""}`,
              priority: "Medium",
              actionText: "باز کردن مشتری",
              actionLink: `/customers/${f.customerId}`,
              meta: { customer: f.fullName, customerId: Number(f.customerId), dueDate: f.nextFollowupDate },
            });
          });
        } catch {}
        // ============ Smart Installment Alerts ============
        // هدف: هشدار هوشمند اقساط (نه فقط تقویم) با تجمیع مشتری و اولویت‌بندی
        try {
          const todayJ = moment().locale("fa").format("jYYYY/jMM/jDD");
          const soonJ = moment()
            .add(3, "day")
            .locale("fa")
            .format("jYYYY/jMM/jDD"); // ۳ روز آینده
          // Installment alerts use the same sale-level receivable projection as the
          // contract screen, so check receipts cannot leave stale nominal reminders.
          const effectivePendingInstallments =
            await getPendingInstallmentPaymentsWithCustomer();
          const groupInstallmentAlerts = (
            predicate: (row: any) => boolean,
            countKey: "overdueCount" | "dueSoonCount",
            dateKey: "earliestDueDate" | "nearestDueDate",
          ) => {
            const grouped = new Map<number, any>();
            for (const row of effectivePendingInstallments || []) {
              if (!predicate(row)) continue;
              const customerId = Number(row?.customerId || 0);
              if (!customerId) continue;
              const current = grouped.get(customerId) || {
                customerId,
                customerName: row?.customerFullName,
                customerPhone: row?.customerPhone,
                [countKey]: 0,
                [dateKey]: row?.dueDate || null,
              };
              current[countKey] = Number(current[countKey] || 0) + 1;
              if (
                !current[dateKey] ||
                String(row?.dueDate || "").localeCompare(String(current[dateKey])) < 0
              ) {
                current[dateKey] = row?.dueDate || null;
              }
              grouped.set(customerId, current);
            }
            return Array.from(grouped.values()).slice(0, 50);
          };
          const overdueByCustomer = groupInstallmentAlerts(
            (row) => String(row?.dueDate || "") < todayJ,
            "overdueCount",
            "earliestDueDate",
          );
          (overdueByCustomer || []).forEach((r: any) => {
            const overdueCount = Number(r.overdueCount || 0);
            const priority =
              overdueCount >= 3 ? "High" : overdueCount >= 1 ? "Medium" : "Low";
            unified.push({
              id: `smart-installment-overdue-${r.customerId}`,
              type: "SmartInstallmentAlert",
              meta: {
                customer: r.customerName,
                customerId: Number(r.customerId),
                customerPhone: r.customerPhone,
              },
              title: `اقساط عقب‌افتاده: ${r.customerName ?? "مشتری"}`,
              description: `تعداد اقساط عقب‌افتاده: ${overdueCount.toLocaleString("fa-IR")} • قدیمی‌ترین سررسید: ${r.earliestDueDate || "—"}`,
              priority,
              actionText: "باز کردن مشتری",
              actionLink: `/customers/${r.customerId}`,
            });
          });
          // Upcoming installments in next 3 days grouped by customer
          const upcomingByCustomer = groupInstallmentAlerts(
            (row) => {
              const due = String(row?.dueDate || "");
              return due >= todayJ && due <= soonJ;
            },
            "dueSoonCount",
            "nearestDueDate",
          );
          (upcomingByCustomer || []).forEach((r: any) => {
            const cnt = Number(r.dueSoonCount || 0);
            // if customer already overdue, skip (to avoid duplicates); overdue alerts already higher signal
            const alreadyOverdue = (overdueByCustomer || []).some(
              (o: any) => Number(o.customerId) === Number(r.customerId),
            );
            if (alreadyOverdue) return;
            unified.push({
              id: `smart-installment-upcoming-${r.customerId}`,
              type: "SmartInstallmentAlert",
              meta: {
                customer: r.customerName,
                customerId: Number(r.customerId),
                customerPhone: r.customerPhone,
              },
              title: `اقساط نزدیک سررسید: ${r.customerName ?? "مشتری"}`,
              description: `تا ۳ روز آینده: ${cnt.toLocaleString("fa-IR")} قسط • نزدیک‌ترین سررسید: ${r.nearestDueDate || "—"}`,
              priority: cnt >= 2 ? "Medium" : "Low",
              actionText: "باز کردن مشتری",
              actionLink: `/customers/${r.customerId}`,
            });
          });
          // Smart checks alerts (overdue + due soon) grouped by customer (optional but useful)
          const overdueChecks = await allAsync(
            `SELECT s.customerId,
                  c.fullName AS customerName,
                  c.phone AS customerPhone,
                  COUNT(*) AS overdueCount,
                  MIN(ic.dueDate) AS earliestDueDate
             FROM installment_checks ic
             JOIN installment_sales s ON s.id = ic.saleId
             JOIN customers c ON c.id = s.customerId
            WHERE COALESCE(s.status,'active') = 'active'
              AND TRIM(COALESCE(ic.status,'')) NOT IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed','به مشتری برگشت داده شده','باطل شده')
              AND MAX(0, COALESCE(ic.amount,0) - COALESCE((
                    SELECT SUM(it.amount_paid)
                      FROM installment_payments rp
                      JOIN installment_transactions it ON it.installment_payment_id = rp.id
                     WHERE rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id
                  ),0)) > 0.00001
              AND MAX(0,
                    COALESCE(s.actualSalePrice,0) - COALESCE(s.downPayment,0)
                    - COALESCE((
                        SELECT SUM(it.amount_paid)
                          FROM installment_payments allp
                          JOIN installment_transactions it ON it.installment_payment_id = allp.id
                         WHERE allp.saleId = s.id
                      ),0)
                    - COALESCE((
                        SELECT SUM(CASE
                          WHEN TRIM(COALESCE(ic2.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')
                          THEN MAX(0, COALESCE(ic2.amount,0) - COALESCE((
                            SELECT SUM(it2.amount_paid)
                              FROM installment_payments rp2
                              JOIN installment_transactions it2 ON it2.installment_payment_id = rp2.id
                             WHERE rp2.sourceType = 'check_recovery' AND rp2.sourceId = ic2.id
                          ),0)) ELSE 0 END)
                          FROM installment_checks ic2
                         WHERE ic2.saleId = s.id
                      ),0)
                  ) > 0.00001
              AND ic.dueDate < ?
            GROUP BY s.customerId
            ORDER BY overdueCount DESC, earliestDueDate ASC
            LIMIT 50`,
            [todayJ],
          );
          (overdueChecks || []).forEach((r: any) => {
            const overdueCount = Number(r.overdueCount || 0);
            const priority = overdueCount >= 2 ? "High" : "Medium";
            unified.push({
              id: `smart-check-overdue-${r.customerId}`,
              type: "SmartCheckAlert",
              meta: {
                customer: r.customerName,
                customerId: Number(r.customerId),
                customerPhone: r.customerPhone,
              },
              title: `چک عقب‌افتاده: ${r.customerName ?? "مشتری"}`,
              description: `تعداد چک عقب‌افتاده: ${overdueCount.toLocaleString("fa-IR")} • قدیمی‌ترین سررسید: ${r.earliestDueDate || "—"}`,
              priority,
              actionText: "باز کردن مشتری",
              actionLink: `/customers/${r.customerId}`,
            });
          });
          const upcomingChecks = await allAsync(
            `SELECT s.customerId,
                  c.fullName AS customerName,
                  c.phone AS customerPhone,
                  COUNT(*) AS dueSoonCount,
                  MIN(ic.dueDate) AS nearestDueDate
             FROM installment_checks ic
             JOIN installment_sales s ON s.id = ic.saleId
             JOIN customers c ON c.id = s.customerId
            WHERE COALESCE(s.status,'active') = 'active'
              AND TRIM(COALESCE(ic.status,'')) NOT IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed','به مشتری برگشت داده شده','باطل شده')
              AND MAX(0, COALESCE(ic.amount,0) - COALESCE((
                    SELECT SUM(it.amount_paid)
                      FROM installment_payments rp
                      JOIN installment_transactions it ON it.installment_payment_id = rp.id
                     WHERE rp.sourceType = 'check_recovery' AND rp.sourceId = ic.id
                  ),0)) > 0.00001
              AND MAX(0,
                    COALESCE(s.actualSalePrice,0) - COALESCE(s.downPayment,0)
                    - COALESCE((
                        SELECT SUM(it.amount_paid)
                          FROM installment_payments allp
                          JOIN installment_transactions it ON it.installment_payment_id = allp.id
                         WHERE allp.saleId = s.id
                      ),0)
                    - COALESCE((
                        SELECT SUM(CASE
                          WHEN TRIM(COALESCE(ic2.status,'')) IN ('نقد شد','نقدشده','وصول شده','پاس شده','تسویه شده','پرداخت شده','تکمیل شده','paid','Paid','cashed','Cashed')
                          THEN MAX(0, COALESCE(ic2.amount,0) - COALESCE((
                            SELECT SUM(it2.amount_paid)
                              FROM installment_payments rp2
                              JOIN installment_transactions it2 ON it2.installment_payment_id = rp2.id
                             WHERE rp2.sourceType = 'check_recovery' AND rp2.sourceId = ic2.id
                          ),0)) ELSE 0 END)
                          FROM installment_checks ic2
                         WHERE ic2.saleId = s.id
                      ),0)
                  ) > 0.00001
              AND ic.dueDate >= ?
              AND ic.dueDate <= ?
            GROUP BY s.customerId
            ORDER BY nearestDueDate ASC, dueSoonCount DESC
            LIMIT 50`,
            [todayJ, soonJ],
          );
          (upcomingChecks || []).forEach((r: any) => {
            const cnt = Number(r.dueSoonCount || 0);
            const alreadyOverdue = (overdueChecks || []).some(
              (o: any) => Number(o.customerId) === Number(r.customerId),
            );
            if (alreadyOverdue) return;
            unified.push({
              id: `smart-check-upcoming-${r.customerId}`,
              type: "SmartCheckAlert",
              meta: {
                customer: r.customerName,
                customerId: Number(r.customerId),
                customerPhone: r.customerPhone,
              },
              title: `چک نزدیک سررسید: ${r.customerName ?? "مشتری"}`,
              description: `تا ۳ روز آینده: ${cnt.toLocaleString("fa-IR")} چک • نزدیک‌ترین سررسید: ${r.nearestDueDate || "—"}`,
              priority: cnt >= 2 ? "Medium" : "Low",
              actionText: "باز کردن مشتری",
              actionLink: `/customers/${r.customerId}`,
            });
          });
        } catch {}
        const deduped = Array.from(
          new Map((unified || []).map((item: any) => [String(item?.id || ""), item])).values(),
        ).filter((item: any) => String(item?.id || "").trim());

        let dismissedIds: string[] = [];
        try {
          if (req.user?.id) {
            dismissedIds = await listDismissedNotificationIdsForUserFromDb(req.user.id);
          }
        } catch {}
        const dismissedSet = new Set((dismissedIds || []).map((id: any) => String(id)));
        const responseItems = includeDismissed
          ? deduped.map((item: any) => ({ ...item, isDismissed: dismissedSet.has(String(item.id)) }))
          : deduped.filter((item: any) => !dismissedSet.has(String(item.id)));

        res.json({
          success: true,
          data: responseItems,
          meta: {
            generatedAt: new Date().toISOString(),
            total: deduped.length,
            active: deduped.length - deduped.filter((item: any) => dismissedSet.has(String(item.id))).length,
            dismissed: deduped.filter((item: any) => dismissedSet.has(String(item.id))).length,
            dismissedIds: includeDismissed ? Array.from(dismissedSet) : undefined,
          },
        });
      } catch (e) {
        next(e);
      }
    },
  );
};
