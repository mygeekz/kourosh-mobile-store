import { allAsync } from "../query";
import {
  detectLegacyAccountingHumanReviewIssues,
  type LegacyAccountingIssue,
} from "../migrations/legacyAccountingReconciliation";

export type AccountingReconciliationStatus = "needs_review" | "resolved";

export type AccountingReconciliationCenterItem = {
  issueKey: string;
  issueType: string;
  entityType: string;
  entityId: number | null;
  saleId: number | null;
  severity: "warning" | "high";
  title: string;
  details: Record<string, unknown>;
  status: AccountingReconciliationStatus;
  automaticRepairAllowed: boolean;
  firstDetectedAt: string | null;
  lastDetectedAt: string | null;
  resolvedAt: string | null;
  source: "live" | "history";
  customerId: number | null;
  customerName: string | null;
  saleType: string | null;
  saleDate: string | null;
  exposureAmount: number;
};

export type AccountingReconciliationCenterFilters = {
  q?: string;
  status?: "ALL" | AccountingReconciliationStatus;
  severity?: "ALL" | "warning" | "high";
  issueType?: string;
  limit?: number;
  offset?: number;
};

type PersistedIssueRow = {
  issueKey: string;
  issueType: string;
  entityType: string;
  entityId: number | null;
  saleId: number | null;
  severity: "warning" | "high";
  title: string;
  detailsJson: string;
  firstDetectedAt: string | null;
  lastDetectedAt: string | null;
  resolvedAt: string | null;
};

const safeParseDetails = (value: unknown): Record<string, unknown> => {
  try {
    const parsed = JSON.parse(String(value || "{}"));
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {};
  } catch {
    return {};
  }
};

const asFiniteNumber = (value: unknown): number => {
  const number = Number(value);
  return Number.isFinite(number) ? number : 0;
};

const getExposureAmount = (issueType: string, details: Record<string, unknown>): number => {
  if (issueType === "cashed_check_unknown_cash_date" || issueType === "cashed_check_missing_ledger") {
    return Math.abs(asFiniteNumber(details.amount));
  }
  if (issueType === "check_contract_total_mismatch" || issueType === "installment_schedule_total_mismatch" || issueType === "canceled_sale_receipt_ledger_gap") {
    return Math.abs(asFiniteNumber(details.delta));
  }
  if (issueType === "canceled_sale_financial_review_required") {
    return Math.abs(asFiniteNumber(details.expectedRefundDue));
  }
  return 0;
};

const normalizePersistedIssue = (row: PersistedIssueRow): Omit<AccountingReconciliationCenterItem, "customerId" | "customerName" | "saleType" | "saleDate"> => {
  const details = safeParseDetails(row.detailsJson);
  return {
    issueKey: String(row.issueKey || ""),
    issueType: String(row.issueType || ""),
    entityType: String(row.entityType || ""),
    entityId: row.entityId == null ? null : Number(row.entityId),
    saleId: row.saleId == null ? null : Number(row.saleId),
    severity: row.severity === "warning" ? "warning" : "high",
    title: String(row.title || ""),
    details,
    status: row.resolvedAt ? "resolved" : "needs_review",
    automaticRepairAllowed: Boolean(details.automaticRepairAllowed),
    firstDetectedAt: row.firstDetectedAt || null,
    lastDetectedAt: row.lastDetectedAt || null,
    resolvedAt: row.resolvedAt || null,
    source: row.resolvedAt ? "history" : "live",
    exposureAmount: getExposureAmount(String(row.issueType || ""), details),
  };
};

const normalizeLiveIssue = (
  issue: LegacyAccountingIssue,
  persisted?: PersistedIssueRow,
): Omit<AccountingReconciliationCenterItem, "customerId" | "customerName" | "saleType" | "saleDate"> => {
  const details = issue.details || {};
  return {
    issueKey: issue.issueKey,
    issueType: issue.issueType,
    entityType: issue.entityType,
    entityId: issue.entityId == null ? null : Number(issue.entityId),
    saleId: issue.saleId == null ? null : Number(issue.saleId),
    severity: issue.severity,
    title: issue.title,
    details,
    status: "needs_review",
    automaticRepairAllowed: Boolean(details.automaticRepairAllowed),
    firstDetectedAt: persisted?.firstDetectedAt || null,
    lastDetectedAt: persisted?.lastDetectedAt || null,
    resolvedAt: null,
    source: "live",
    exposureAmount: getExposureAmount(issue.issueType, details),
  };
};

export const getAccountingReconciliationCenterReadModel = async (
  filters: AccountingReconciliationCenterFilters = {},
) => {
  const liveIssues = await detectLegacyAccountingHumanReviewIssues();
  const persistedRows = (await allAsync(`
    SELECT issueKey, issueType, entityType, entityId, saleId, severity, title,
           detailsJson, firstDetectedAt, lastDetectedAt, resolvedAt
      FROM accounting_reconciliation_issues
     ORDER BY COALESCE(lastDetectedAt, firstDetectedAt) DESC, id DESC
  `).catch(() => [])) as PersistedIssueRow[];

  const persistedByKey = new Map(persistedRows.map((row) => [String(row.issueKey), row]));
  const liveKeys = new Set(liveIssues.map((issue) => issue.issueKey));
  const baseItems = [
    ...liveIssues.map((issue) => normalizeLiveIssue(issue, persistedByKey.get(issue.issueKey))),
    ...persistedRows
      .filter((row) => Boolean(row.resolvedAt) && !liveKeys.has(String(row.issueKey)))
      .map(normalizePersistedIssue),
  ];

  const saleIds = Array.from(new Set(baseItems.map((item) => item.saleId).filter((id): id is number => Number.isFinite(id) && Number(id) > 0)));
  const saleContextRows = saleIds.length
    ? await allAsync(
        `SELECT s.id AS saleId, s.customerId, s.saleType, s.saleDate, c.fullName AS customerName
           FROM installment_sales s
           LEFT JOIN customers c ON c.id = s.customerId
          WHERE s.id IN (${saleIds.map(() => "?").join(",")})`,
        saleIds,
      ).catch(() => [] as any[])
    : [];
  const saleContext = new Map(
    (saleContextRows as any[]).map((row) => [Number(row.saleId), {
      customerId: Number(row.customerId || 0) || null,
      customerName: String(row.customerName || "").trim() || null,
      saleType: String(row.saleType || "").trim() || null,
      saleDate: String(row.saleDate || "").trim() || null,
    }]),
  );

  const items: AccountingReconciliationCenterItem[] = baseItems.map((item) => {
    const context = item.saleId ? saleContext.get(item.saleId) : undefined;
    const detailCustomerId = asFiniteNumber(item.details.customerId) || null;
    return {
      ...item,
      customerId: context?.customerId ?? detailCustomerId,
      customerName: context?.customerName ?? null,
      saleType: context?.saleType ?? null,
      saleDate: context?.saleDate ?? null,
    };
  });

  const status = filters.status || "needs_review";
  const severity = filters.severity || "ALL";
  const issueType = String(filters.issueType || "ALL").trim();
  const query = String(filters.q || "").trim().toLocaleLowerCase("fa-IR");

  const filtered = items.filter((item) => {
    if (status !== "ALL" && item.status !== status) return false;
    if (severity !== "ALL" && item.severity !== severity) return false;
    if (issueType !== "ALL" && item.issueType !== issueType) return false;
    if (!query) return true;
    const haystack = [
      item.title,
      item.issueType,
      item.entityType,
      item.issueKey,
      item.saleId != null ? String(item.saleId) : "",
      item.entityId != null ? String(item.entityId) : "",
      item.customerName || "",
      item.customerId != null ? String(item.customerId) : "",
      JSON.stringify(item.details),
    ].join(" ").toLocaleLowerCase("fa-IR");
    return haystack.includes(query);
  });

  filtered.sort((a, b) => {
    if (a.status !== b.status) return a.status === "needs_review" ? -1 : 1;
    if (a.severity !== b.severity) return a.severity === "high" ? -1 : 1;
    const aTime = Date.parse(a.lastDetectedAt || a.firstDetectedAt || "") || 0;
    const bTime = Date.parse(b.lastDetectedAt || b.firstDetectedAt || "") || 0;
    return bTime - aTime || a.issueKey.localeCompare(b.issueKey, "fa");
  });

  const activeItems = items.filter((item) => item.status === "needs_review");
  const resolvedItems = items.filter((item) => item.status === "resolved");
  const typeCounts = Array.from(
    items.reduce((map, item) => map.set(item.issueType, (map.get(item.issueType) || 0) + 1), new Map<string, number>()),
  ).map(([value, count]) => ({ value, count }));

  const limit = Math.min(Math.max(Number(filters.limit || 25), 1), 100);
  const offset = Math.max(Number(filters.offset || 0), 0);
  const pageRows = filtered.slice(offset, offset + limit);
  const persistedDetectionTimes = persistedRows
    .map((row) => row.lastDetectedAt || row.firstDetectedAt)
    .filter((value): value is string => Boolean(value))
    .sort();
  const persistedLastDetectedAt = persistedDetectionTimes.length
    ? persistedDetectionTimes[persistedDetectionTimes.length - 1]
    : null;

  return {
    rows: pageRows,
    pagination: { limit, offset, total: filtered.length },
    summary: {
      active: activeItems.length,
      high: activeItems.filter((item) => item.severity === "high").length,
      resolved: resolvedItems.length,
      unknownCashDate: activeItems.filter((item) => item.issueType === "cashed_check_unknown_cash_date").length,
      exposureAmount: activeItems.reduce((sum, item) => sum + item.exposureAmount, 0),
      liveDetected: liveIssues.length,
      lastPersistedDetectionAt: persistedLastDetectedAt,
    },
    options: { issueTypes: typeCounts },
    generatedAt: new Date().toISOString(),
    readOnly: true,
  };
};
