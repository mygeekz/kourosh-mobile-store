import type { Express } from "express";
import moment from "jalali-moment";
import { fromShamsiStringToISO } from "../database";

export type CollectionCenterReportRoutesDeps = {
  authorizeRole: (roles: string[]) => any;
  buildCollectionCenterSourceFromISO: (fromISO: string) => string;
  buildProductSalesCollectionsReport: (fromISO: string, toISO: string) => Promise<any>;
  buildProductSalesCollectionRisk: (rows: any[], docs: any[], limit?: number) => Promise<any>;
  shouldShowCollectionCenterItemForOperationalWindow: (item: any, fromISO: string, toISO: string) => boolean;
  buildDirectInstallmentCollectionItems: (fromISO: string, toISO: string) => Promise<any[]>;
  getProductSalesDocKey: (sourceType: any, orderId: any) => string;
  enrichCollectionCenterItems: (items: any[]) => Promise<any[]>;
  collectionCenterToShamsiDisplay: (value: any) => string;
  collectionCenterDateDiffInDays: (value: any, base: any) => number | null;
  collectionCenterOverdueDays: (value: any, base: any) => number;
  collectionCenterKanbanMeta: (stage: any) => { label: string; rank: number };
  summarizeCollectionCenter: (items: any[]) => any;
  collectionCenterActionMeta: (action: any) => { label: string; nextDays: number | null; icon: string };
  defaultCollectionCenterNextDate: (action: any, provided?: any) => string | null;
  buildCollectionCenterMarker: (sourceType: any, orderId: any) => string;
  formatReportMoneyText: (value: any) => string;
  addCustomerFollowupToDb: (customerId: number, payload: any, actor: any) => Promise<any>;
  recordAiFeatureImpactEvent: (moduleKey: string, eventKey: string, payload: any) => Promise<any>;
  ensureSmartInsightDecisionMemory: () => Promise<any>;
  runAsync: (sql: string, params?: any[]) => Promise<any>;
};


const normalizeCollectionItemFinancials = (item: any) => {
  const contractualTotal = Math.max(0, Number(item?.contractualTotal || 0));
  const rawReceived = Math.max(0, Number(item?.receivedAmount || 0));
  const rawOutstanding = Math.max(0, Number(item?.outstandingAmount || 0));
  const directSource = item?.directCollectionSource === true;

  const outstandingAmount = contractualTotal > 0
    ? Math.min(contractualTotal, directSource ? rawOutstanding : Math.max(0, contractualTotal - Math.min(contractualTotal, rawReceived)))
    : rawOutstanding;
  const receivedAmount = contractualTotal > 0
    ? Math.max(0, contractualTotal - outstandingAmount)
    : rawReceived;
  const collectionRate = contractualTotal > 0
    ? Math.max(0, Math.min(100, (receivedAmount / contractualTotal) * 100))
    : 0;

  const fullProfit = Number(item?.fullProfit || 0);
  const rawRealizedProfit = Number(item?.realizedProfit || 0);
  const realizedProfit = fullProfit >= 0
    ? Math.min(fullProfit, Math.max(0, rawRealizedProfit))
    : Math.max(fullProfit, Math.min(0, rawRealizedProfit));

  return {
    ...item,
    contractualTotal,
    receivedAmount,
    outstandingAmount,
    collectionRate,
    fullProfit,
    realizedProfit,
    unrecognizedProfit: fullProfit - realizedProfit,
  };
};

export const registerCollectionCenterReportRoutes = (
  app: Express,
  {
    authorizeRole,
    buildCollectionCenterSourceFromISO,
    buildProductSalesCollectionsReport,
    buildProductSalesCollectionRisk,
    shouldShowCollectionCenterItemForOperationalWindow,
    buildDirectInstallmentCollectionItems,
    getProductSalesDocKey,
    enrichCollectionCenterItems,
    collectionCenterToShamsiDisplay,
    collectionCenterDateDiffInDays,
    collectionCenterOverdueDays,
    collectionCenterKanbanMeta,
    summarizeCollectionCenter,
    collectionCenterActionMeta,
    defaultCollectionCenterNextDate,
    buildCollectionCenterMarker,
    formatReportMoneyText,
    addCustomerFollowupToDb,
    recordAiFeatureImpactEvent,
    ensureSmartInsightDecisionMemory,
    runAsync,
  }: CollectionCenterReportRoutesDeps,
): void => {
app.get(
  "/api/reports/collection-center",
  authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
  async (req, res, next) => {
    try {
      const nowJ = moment().locale("fa");
      const fromJ = String(
        req.query.from ||
          nowJ.clone().subtract(6, "jMonth").format("jYYYY/jMM/jDD"),
      );
      const toJ = String(req.query.to || nowJ.clone().format("jYYYY/jMM/jDD"));
      const fromISO = fromShamsiStringToISO(fromJ);
      const toISO = fromShamsiStringToISO(toJ);
      if (!fromISO || !toISO)
        return res
          .status(400)
          .json({ success: false, message: "بازه زمانی نامعتبر است." });

      const level = String(req.query.level || "all").trim();
      const query = String(req.query.q || req.query.query || "")
        .trim()
        .toLowerCase();
      const onlyUntouched = String(req.query.onlyUntouched || "") === "1";
      const sourceFromISO = buildCollectionCenterSourceFromISO(fromISO);
      let report = await buildProductSalesCollectionsReport(
        sourceFromISO,
        toISO,
      );
      let risk = await buildProductSalesCollectionRisk(
        report.rows,
        report.docs,
        500,
      );

      const riskItems = (risk.items || []).filter((item: any) =>
        shouldShowCollectionCenterItemForOperationalWindow(
          item,
          fromISO,
          toISO,
        ),
      );
      const directInstallmentItems =
        await buildDirectInstallmentCollectionItems(fromISO, toISO);

      const mergedItemMap = new Map<string, any>();
      for (const item of [...riskItems, ...directInstallmentItems]) {
        const key = getProductSalesDocKey(
          String(item?.sourceType || "invoice"),
          Number(item?.orderId || 0),
        );
        const existing = mergedItemMap.get(key);
        if (!existing) {
          mergedItemMap.set(key, item);
          continue;
        }

        const incomingPriority =
          Number(item?.score || 0) * 1_000_000_000 +
          Number(item?.outstandingAmount || 0);
        const existingPriority =
          Number(existing?.score || 0) * 1_000_000_000 +
          Number(existing?.outstandingAmount || 0);
        const primary = incomingPriority > existingPriority ? item : existing;
        const secondary = primary === item ? existing : item;
        const financialSource = [existing, item].find(
          (candidate) =>
            candidate?.directCollectionSource !== true &&
            (Number(candidate?.fullProfit || 0) !== 0 ||
              Number(candidate?.realizedProfit || 0) !== 0),
        );
        const operationalSource = [existing, item].find(
          (candidate) => candidate?.directCollectionSource === true,
        );

        mergedItemMap.set(key, {
          ...secondary,
          ...primary,
          ...(operationalSource
            ? {
                dueDate: operationalSource.dueDate,
                dueInDays: operationalSource.dueInDays,
                overdueDays: operationalSource.overdueDays,
                overdueCount: operationalSource.overdueCount,
                overdueAmount: operationalSource.overdueAmount,
                outstandingAmount: operationalSource.outstandingAmount,
                directCollectionSource: true,
              }
            : {}),
          ...(financialSource
            ? {
                contractualTotal: financialSource.contractualTotal,
                receivedAmount: financialSource.receivedAmount,
                fullProfit: financialSource.fullProfit,
                realizedProfit: financialSource.realizedProfit,
                unrecognizedProfit: financialSource.unrecognizedProfit,
              }
            : {}),
          reasons: Array.from(
            new Set([...(existing.reasons || []), ...(item.reasons || [])]),
          ).slice(0, 8),
        });
      }

      let items = await enrichCollectionCenterItems(
        Array.from(mergedItemMap.values()).map(normalizeCollectionItemFinancials),
      );
      items = items.map((item: any) => {
        const normalizedFinancials = normalizeCollectionItemFinancials(item);
        const normalizedTransactionDate =
          collectionCenterToShamsiDisplay(item?.transactionDate) ||
          item?.transactionDate ||
          "";
        const normalizedDueDate =
          collectionCenterToShamsiDisplay(item?.dueDate) || item?.dueDate || "";
        const dueForDelay =
          item?.earliestOverdueDate ||
          item?.overdueDate ||
          item?.dueDate ||
          null;
        const fixedDueInDays = item?.dueDate
          ? collectionCenterDateDiffInDays(
              item.dueDate,
              moment().startOf("day"),
            )
          : item?.dueInDays;
        const fixedOverdueDays = dueForDelay
          ? collectionCenterOverdueDays(dueForDelay, moment().startOf("day"))
          : Number(item?.overdueDays || 0);
        return {
          ...normalizedFinancials,
          transactionDate: normalizedTransactionDate,
          dueDate: normalizedDueDate,
          dueInDays:
            typeof fixedDueInDays === "number"
              ? fixedDueInDays
              : item?.dueInDays,
          overdueDays: Math.max(0, Number(fixedOverdueDays || 0)),
        };
      });

      if (["critical", "urgent", "followup", "low"].includes(level))
        items = items.filter((item) => String(item.level) === level);
      if (onlyUntouched) items = items.filter((item) => !item.touchedToday);
      if (query) {
        items = items.filter((item) =>
          [
            item.customerName,
            item.customerPhone,
            item.orderId,
            item.label,
            item.paymentType,
            item.reasons?.join(" "),
            item.automation?.recommendedActionLabel,
            item.automation?.smsText,
            item.automation?.reason,
          ].some((v) =>
            String(v || "")
              .toLowerCase()
              .includes(query),
          ),
        );
      }

      const levelRank: any = { critical: 4, urgent: 3, followup: 2, low: 1 };
      items = items.sort(
        (a: any, b: any) =>
          Number(b.automation?.shouldEscalate || 0) -
            Number(a.automation?.shouldEscalate || 0) ||
          (collectionCenterKanbanMeta(b.kanbanStage).rank || 0) -
            (collectionCenterKanbanMeta(a.kanbanStage).rank || 0) ||
          levelRank[b.level] - levelRank[a.level] ||
          Number(b.score || 0) - Number(a.score || 0) ||
          Number(b.outstandingAmount || 0) - Number(a.outstandingAmount || 0),
      );

      res.json({
        success: true,
        data: {
          from: fromJ,
          to: toJ,
          filters: {
            level,
            query,
            onlyUntouched,
            operationalWindow: true,
            sourceFrom: sourceFromISO,
          },
          summary: summarizeCollectionCenter(items),
          sourceSummary: {
            status: risk.status,
            totalDocs: risk.totalDocs,
            directInstallmentDocs: directInstallmentItems.length,
            counts: risk.counts,
            totalOutstanding: risk.totalOutstanding,
            totalUnrecognizedProfit: risk.totalUnrecognizedProfit,
            highestScore: risk.highestScore,
          },
          items,
        },
      });
    } catch (err) {
      next(err);
    }
  },
);

app.post(
  "/api/reports/collection-center/actions",
  authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
  async (req, res, next) => {
    try {
      const body = req.body || {};
      const customerId = Number(body.customerId || 0);
      const orderId = Number(body.orderId || 0);
      const sourceType =
        String(body.sourceType || "invoice") === "installment"
          ? "installment"
          : "invoice";
      const action = String(body.action || "reviewed");
      const user = (req as any).user || {};
      if (!customerId || !orderId)
        return res
          .status(400)
          .json({ success: false, message: "شناسه مشتری یا سند نامعتبر است." });

      const meta = collectionCenterActionMeta(action);
      const nextFollowupDate = defaultCollectionCenterNextDate(
        action,
        body.nextFollowupDate,
      );
      const noteText = String(body.note || "").trim();
      const contextParts = [
        buildCollectionCenterMarker(sourceType, orderId),
        `[action:${action}]`,
        `مرکز وصول: ${meta.label}`,
        noteText ? `یادداشت: ${noteText}` : "",
        body.outstandingAmount != null
          ? `مانده: ${formatReportMoneyText(body.outstandingAmount)}`
          : "",
        body.riskLabel ? `سطح ریسک: ${String(body.riskLabel)}` : "",
      ]
        .filter(Boolean)
        .join(" | ");

      const created = await addCustomerFollowupToDb(
        customerId,
        { note: contextParts, nextFollowupDate },
        {
          userId: Number(user.id || user.userId || 0),
          username: user.username || user.email || null,
        },
      );

      await recordAiFeatureImpactEvent(
        "customer_intelligence",
        "collection_action_recorded",
        {
          success: true,
          impactAmount: Number(body.outstandingAmount || 0),
          userId: Number(user.id || user.userId || 0) || null,
          context: {
            action,
            actionLabel: meta.label,
            customerId,
            orderId,
            sourceType,
            outstandingAmount: Number(body.outstandingAmount || 0),
            riskLabel: body.riskLabel || "",
            nextFollowupDate,
          },
        },
      );

      await ensureSmartInsightDecisionMemory();
      await runAsync(
        `
      INSERT INTO smart_insight_decisions
        (insightId, type, title, severity, score, confidence, status, userDecision, outcome, note, actionLabel, occurrenceCount, decidedAt, updatedAt, userId)
      VALUES
        (?, 'collection_risk', 'پرونده وصول پیگیری شد', ?, ?, 88, 'in_progress', 'accepted', 'neutral', ?, ?, 1, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'), strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'), ?)
      ON CONFLICT(insightId) DO UPDATE SET
        status = 'in_progress',
        userDecision = 'accepted',
        outcome = 'neutral',
        note = excluded.note,
        actionLabel = excluded.actionLabel,
        occurrenceCount = COALESCE(smart_insight_decisions.occurrenceCount, 0) + 1,
        decidedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'),
        updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'),
        userId = excluded.userId
    `,
        [
          `collection-action:${sourceType}:${orderId}`,
          String(body.riskLabel || "").includes("بحرانی") ? "critical" : "high",
          Number(body.outstandingAmount || 0) > 0
            ? Math.min(
                100,
                Math.max(
                  35,
                  Number(body.outstandingAmount || 0) / 1000000,
                ),
              )
            : 50,
          contextParts,
          meta.label,
          Number(user.id || user.userId || 0) || null,
        ],
      );

      res.status(201).json({
        success: true,
        data: {
          ...(created || {}),
          action,
          actionLabel: meta.label,
          sourceType,
          orderId,
          customerId,
          nextFollowupDate,
          note: contextParts,
          createdAt:
            (created && (created.createdAt || created.created_at)) ||
            new Date().toISOString(),
        },
        message:
          "اقدام پیگیری ثبت شد و روی مرکز وصول و Smart Insights اعمال می‌شود.",
      });
    } catch (err) {
      next(err);
    }
  },
);
};

// Backward-compatible type aliases for older imports.
export type RegisterCollectionCenterReportRoutesDeps = CollectionCenterReportRoutesDeps;
