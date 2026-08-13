import type { Express } from "express";
import moment from "jalali-moment";
import { buildManagerCreditApprovalsReport } from "../reporting/managerCreditApprovals/managerCreditApprovalsReport.service";

type AuthorizeRole = (roles: string[]) => any;

type CustomerSalesTrustProfile = {
  score?: number | null;
  confidence?: number | null;
  tier?: string | null;
  tierLabel?: string | null;
  suggestedCreditLimit?: number | null;
  remainingSuggestedCredit?: number | null;
  latePaymentCount?: number | null;
  overdueUnpaidCount?: number | null;
  returnedCheckCount?: number | null;
  purchaseCount?: number | null;
  currentBalance?: number | null;
};

export type CustomerTrustRoutesDeps = {
  authorizeRole: AuthorizeRole;
  getAllCustomersWithBalanceFromDb: () => Promise<any[]>;
  getCustomerByIdFromDb: (customerId: number) => Promise<any>;
  getCustomerSalesTrustProfileFromDb: (
    customerId: number,
    customer?: any,
  ) => Promise<CustomerSalesTrustProfile>;
  allAsync: (sql: string, params?: any[]) => Promise<any[]>;
  salesAdvisorNum: (value: any) => number;
  salesAdvisorMoney: (value: number) => string;
  salesAdvisorParseDate: (value: any) => moment.Moment | null;
  salesAdvisorClamp: (value: number, min?: number, max?: number) => number;
};

const setNoStoreHeaders = (res: any) => {
  res.set(
    "Cache-Control",
    "no-store, no-cache, must-revalidate, proxy-revalidate",
  );
  res.set("Pragma", "no-cache");
  res.set("Expires", "0");
};

export const registerCustomerTrustRoutes = (
  app: Express,
  {
    authorizeRole,
    getAllCustomersWithBalanceFromDb,
    getCustomerByIdFromDb,
    getCustomerSalesTrustProfileFromDb,
    allAsync,
    salesAdvisorNum,
    salesAdvisorMoney,
    salesAdvisorParseDate,
    salesAdvisorClamp,
  }: CustomerTrustRoutesDeps,
): void => {
  app.get(
    "/api/customers/trust-profiles",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      setNoStoreHeaders(res);
      try {
        const requestedIds = [...new Set(String(req.query.ids || '')
          .split(',')
          .map((value) => Number(value))
          .filter((value) => Number.isInteger(value) && value > 0))]
          .slice(0, 100);
        const customers = requestedIds.length
          ? (await Promise.all(requestedIds.map((customerId) => getCustomerByIdFromDb(customerId).catch(() => null)))).filter(Boolean)
          : await getAllCustomersWithBalanceFromDb();
        const rows = await Promise.all(
          (Array.isArray(customers) ? customers : []).map(
            async (customer: any) => {
              const customerId = Number(customer?.id || 0);
              if (!customerId) return null;
              const profile = await getCustomerSalesTrustProfileFromDb(
                customerId,
                customer,
              ).catch(() => null);
              if (!profile) return null;
              return {
                customerId,
                score: profile.score,
                confidence: profile.confidence,
                tier: profile.tier,
                tierLabel: profile.tierLabel,
                suggestedCreditLimit: profile.suggestedCreditLimit,
                remainingSuggestedCredit: profile.remainingSuggestedCredit,
                latePaymentCount: profile.latePaymentCount,
                overdueUnpaidCount: profile.overdueUnpaidCount,
                returnedCheckCount: profile.returnedCheckCount,
                purchaseCount: profile.purchaseCount,
              };
            },
          ),
        );

        res.json({ success: true, data: rows.filter(Boolean) });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/customers/:id/trust-profile",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      setNoStoreHeaders(res);
      try {
        const customerId = Number(req.params.id);
        if (!customerId)
          return res
            .status(400)
            .json({ success: false, message: "شناسه مشتری نامعتبر است." });

        const customer = await getCustomerByIdFromDb(customerId).catch(
          () => null as any,
        );
        if (!customer)
          return res
            .status(404)
            .json({ success: false, message: "مشتری یافت نشد." });

        const trustProfile = await getCustomerSalesTrustProfileFromDb(
          customerId,
          customer,
        );
        return res.json({ success: true, data: trustProfile });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/customers/:id/trust-profile/history",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      setNoStoreHeaders(res);
      try {
        const customerId = Number(req.params.id);
        if (!customerId)
          return res
            .status(400)
            .json({ success: false, message: "شناسه مشتری نامعتبر است." });

        const customer = await getCustomerByIdFromDb(customerId).catch(
          () => null as any,
        );
        if (!customer)
          return res
            .status(404)
            .json({ success: false, message: "مشتری یافت نشد." });

        const currentProfile = await getCustomerSalesTrustProfileFromDb(
          customerId,
          customer,
        );

        const salesOrders = await allAsync(
          `SELECT id, paymentMethod, grandTotal, transactionDate
           FROM sales_orders
          WHERE customerId = ?
          ORDER BY transactionDate ASC, id ASC`,
          [customerId],
        ).catch(() => [] as any[]);

        const installmentSales = await allAsync(
          `SELECT id, actualSalePrice, downPayment, saleDate, dateCreated
           FROM installment_sales
          WHERE customerId = ?
            AND COALESCE(status,'active') = 'active'
          ORDER BY COALESCE(saleDate, dateCreated) ASC, id ASC`,
          [customerId],
        ).catch(() => [] as any[]);

        const installmentPayments = await allAsync(
          `SELECT p.id, p.saleId, p.dueDate, p.paymentDate, p.status, p.amountDue
           FROM installment_payments p
           INNER JOIN installment_sales s ON s.id = p.saleId
          WHERE s.customerId = ?
            AND COALESCE(s.status,'active') = 'active'
          ORDER BY COALESCE(p.paymentDate, p.dueDate) ASC, p.id ASC`,
          [customerId],
        ).catch(() => [] as any[]);

        const installmentChecks = await allAsync(
          `SELECT c.id, c.saleId, c.dueDate, c.status, c.amount
           FROM installment_checks c
           INNER JOIN installment_sales s ON s.id = c.saleId
          WHERE s.customerId = ?
            AND COALESCE(s.status,'active') = 'active'
          ORDER BY c.dueDate ASC, c.id ASC`,
          [customerId],
        ).catch(() => [] as any[]);

        const ledgerRows = await allAsync(
          `SELECT id, transactionDate, description, debit, credit, referenceType, referenceId
           FROM customer_ledger
          WHERE customerId = ?
          ORDER BY COALESCE(transactionDate, createdAt, updatedAt) ASC, id ASC`,
          [customerId],
        ).catch(() => [] as any[]);

        const historyEvents: Array<{
          date: string;
          type:
            | "purchase"
            | "installment_sale"
            | "payment_on_time"
            | "payment_late"
            | "overdue"
            | "returned_check"
            | "balance"
            | "ledger_payment"
            | "credit_balance";
          title: string;
          description: string;
          impact: number;
          amount?: number;
        }> = [];

        salesOrders.forEach((row: any) => {
          const date = String(row.transactionDate || row.dateCreated || "").slice(
            0,
            10,
          );
          if (!date) return;
          const amount = salesAdvisorNum(row.grandTotal);
          historyEvents.push({
            date,
            type: "purchase",
            title:
              String(row.paymentMethod || "").toLowerCase() === "credit"
                ? "خرید اعتباری ثبت شد"
                : "خرید نقدی ثبت شد",
            description: `فاکتور #${Number(row.id).toLocaleString("fa-IR")} به مبلغ ${salesAdvisorMoney(amount)} در سابقه مشتری ثبت شد.`,
            impact: Math.min(
              6,
              Math.max(1, Math.log10(amount / 1_000_000 + 1) * 2),
            ),
            amount,
          });
        });

        installmentSales.forEach((row: any) => {
          const date = String(row.saleDate || row.dateCreated || "").slice(0, 10);
          if (!date) return;
          const amount = salesAdvisorNum(row.actualSalePrice);
          historyEvents.push({
            date,
            type: "installment_sale",
            title: "فروش اقساطی ثبت شد",
            description: `فروش اقساطی #${Number(row.id).toLocaleString("fa-IR")} به مبلغ ${salesAdvisorMoney(amount)} به سوابق اعتباری اضافه شد.`,
            impact: 3,
            amount,
          });
        });

        installmentPayments.forEach((payment: any) => {
          const status = String(payment.status || "");
          const due = salesAdvisorParseDate(payment.dueDate);
          const paid = salesAdvisorParseDate(payment.paymentDate);
          const eventDate =
            (paid || due)?.format("YYYY-MM-DD") ||
            String(payment.paymentDate || payment.dueDate || "").slice(0, 10);
          if (!eventDate) return;
          const amount = salesAdvisorNum(payment.amountDue);
          const isPaid = /پرداخت شده/.test(status) || Boolean(paid);
          const isLate =
            /دیرکرد/.test(status) ||
            (isPaid &&
              due &&
              paid &&
              paid.startOf("day").isAfter(due.startOf("day")));

          if (isPaid && !isLate) {
            historyEvents.push({
              date: eventDate,
              type: "payment_on_time",
              title: "پرداخت به‌موقع قسط",
              description: `یک تعهد اقساطی به مبلغ ${salesAdvisorMoney(amount)} به‌موقع پرداخت شد.`,
              impact: 6,
              amount,
            });
          } else if (isPaid && isLate) {
            historyEvents.push({
              date: eventDate,
              type: "payment_late",
              title: "پرداخت با دیرکرد",
              description: `یک تعهد اقساطی به مبلغ ${salesAdvisorMoney(amount)} با تأخیر پرداخت شد.`,
              impact: -7,
              amount,
            });
          } else if (
            !isPaid &&
            due &&
            due.startOf("day").isBefore(moment().startOf("day"))
          ) {
            historyEvents.push({
              date: eventDate,
              type: "overdue",
              title: "قسط معوق شد",
              description: `یک تعهد اقساطی به مبلغ ${salesAdvisorMoney(amount)} از سررسید عبور کرده و هنوز بسته نشده است.`,
              impact: -10,
              amount,
            });
          }
        });

        installmentChecks.forEach((check: any) => {
          const status = String(check.status || "");
          const due = salesAdvisorParseDate(check.dueDate);
          const eventDate =
            due?.format("YYYY-MM-DD") || String(check.dueDate || "").slice(0, 10);
          if (!eventDate) return;
          const amount = salesAdvisorNum(check.amount);
          if (/برگشت/.test(status)) {
            historyEvents.push({
              date: eventDate,
              type: "returned_check",
              title: "چک برگشتی ثبت شد",
              description: `چک به مبلغ ${salesAdvisorMoney(amount)} برگشت خورده و اثر منفی جدی روی اعتماد مشتری دارد.`,
              impact: -14,
              amount,
            });
          }
        });

        ledgerRows.forEach((row: any) => {
          const debit = salesAdvisorNum(row.debit);
          const credit = salesAdvisorNum(row.credit);
          const desc = String(row.description || "");
          const refType = String(row.referenceType || "").toLowerCase();
          const isCashBalancedPurchase =
            debit > 0 && credit > 0 && /نقدی|cash/i.test(desc);
          const isPayment =
            credit > 0 &&
            !isCashBalancedPurchase &&
            (debit <= 0 ||
              /payment|receipt|installment/i.test(refType) ||
              /دریافت|واریز|پرداخت|تسویه|قسط/i.test(desc));
          if (!isPayment) return;
          const date = String(row.transactionDate || "").slice(0, 10);
          if (!date) return;
          const amount = Math.max(0, credit);
          historyEvents.push({
            date,
            type: "ledger_payment",
            title:
              /قسط/i.test(desc) || /installment/i.test(refType)
                ? "پرداخت/تسویه قسط ثبت شد"
                : "پرداخت/تسویه بدهی ثبت شد",
            description: `پرداخت به مبلغ ${salesAdvisorMoney(amount)} در دفتر حساب مشتری ثبت شد و اثر مثبت روی امتیاز اعتماد دارد.`,
            impact: Math.min(
              10,
              Math.max(3, Math.log10(amount / 1_000_000 + 1) * 4),
            ),
            amount,
          });
        });

        const currentBalanceForHistory = salesAdvisorNum(
          currentProfile.currentBalance ?? customer?.currentBalance,
        );
        if (currentBalanceForHistory > 0) {
          historyEvents.push({
            date: moment().format("YYYY-MM-DD"),
            type: "balance",
            title: "مانده بدهی فعال",
            description: `مانده فعلی مشتری ${salesAdvisorMoney(currentBalanceForHistory)} بدهکاری است.`,
            impact: -Math.min(
              14,
              Math.max(3, currentBalanceForHistory / 8_000_000),
            ),
            amount: currentBalanceForHistory,
          });
        } else if (currentBalanceForHistory < 0) {
          const creditBalance = Math.abs(currentBalanceForHistory);
          historyEvents.push({
            date: moment().format("YYYY-MM-DD"),
            type: "credit_balance",
            title: "مشتری بستانکار است",
            description: `مشتری ${salesAdvisorMoney(creditBalance)} بستانکار است؛ این وضعیت اثر مثبت روی اعتبار دارد.`,
            impact: Math.min(
              12,
              Math.max(4, Math.log10(creditBalance / 1_000_000 + 1) * 5),
            ),
            amount: creditBalance,
          });
        }

        const sortedEvents = historyEvents
          .filter((event) => event.date)
          .sort((a, b) => String(a.date).localeCompare(String(b.date)));

        let score = 45;
        const timeline = sortedEvents.map((event) => {
          score = salesAdvisorClamp(score + event.impact, 5, 95);
          return {
            ...event,
            scoreAfter: Math.round(score),
            impact: Math.round(event.impact),
          };
        });

        const finalTimeline = timeline.length
          ? timeline.map((event, index, arr) => {
              if (index !== arr.length - 1) return event;
              return { ...event, scoreAfter: currentProfile.score };
            })
          : [
              {
                date: moment().format("YYYY-MM-DD"),
                type: "balance",
                title: "شروع پایش اعتبار",
                description:
                  "هنوز رویداد کافی برای ساخت تاریخچه تغییر امتیاز ثبت نشده است.",
                impact: 0,
                scoreAfter: currentProfile.score,
              },
            ];

        res.json({
          success: true,
          data: {
            currentScore: currentProfile.score,
            currentTier: currentProfile.tierLabel,
            timeline: finalTimeline.slice(-18).reverse(),
            summary: {
              totalEvents: finalTimeline.length,
              positiveEvents: finalTimeline.filter(
                (event: any) => Number(event.impact) > 0,
              ).length,
              negativeEvents: finalTimeline.filter(
                (event: any) => Number(event.impact) < 0,
              ).length,
              lastChange: finalTimeline.length
                ? finalTimeline[finalTimeline.length - 1]
                : null,
            },
          },
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/reports/manager-credit-approvals",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      setNoStoreHeaders(res);
      try {
        const q = req.query || {};
        const from = String(q.from || q.startDate || "").trim();
        const to = String(q.to || q.endDate || "").trim();
        const riskyOnly = ["1", "true", "yes"].includes(
          String(q.riskyOnly || "").toLowerCase(),
        );
        const payload = await buildManagerCreditApprovalsReport(
          { from, to, riskyOnly },
          {
            allAsync,
            getCustomerById: getCustomerByIdFromDb,
            getCustomerTrustProfile: getCustomerSalesTrustProfileFromDb,
            toNumber: salesAdvisorNum,
            clamp: salesAdvisorClamp,
          },
        );
        res.json(payload);
      } catch (error) {
        next(error);
      }
    },
  );
};

// Backward-compatible type aliases for older imports.
export type RegisterCustomerTrustRoutesDeps = CustomerTrustRoutesDeps;
