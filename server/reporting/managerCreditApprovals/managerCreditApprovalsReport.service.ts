export type ManagerCreditApprovalRiskStatus =
  | "no-safe-limit"
  | "over-limit"
  | "low-trust"
  | "within-current-limit"
  | "insufficient-data";

type ReportDeps = {
  allAsync: (sql: string, params?: any[]) => Promise<any[]>;
  getCustomerById: (customerId: number) => Promise<any>;
  getCustomerTrustProfile: (customerId: number, customer?: any) => Promise<any>;
  toNumber: (value: any) => number;
  clamp: (value: number, min?: number, max?: number) => number;
};

type ReportFilters = {
  from?: string;
  to?: string;
  riskyOnly?: boolean;
};

const isIsoDate = (value: string) => /^\d{4}-\d{2}-\d{2}$/.test(value);

const resolveRiskStatus = (args: {
  hasTrustProfile: boolean;
  suggestedCreditLimit: number | null;
  currentExposure: number | null;
  trustScore: number | null;
}): ManagerCreditApprovalRiskStatus => {
  if (!args.hasTrustProfile) return "insufficient-data";
  if (Number(args.suggestedCreditLimit || 0) <= 0) return "no-safe-limit";
  if (Number(args.currentExposure || 0) > Number(args.suggestedCreditLimit || 0)) return "over-limit";
  if (args.trustScore != null && args.trustScore < 58) return "low-trust";
  return "within-current-limit";
};

export async function buildManagerCreditApprovalsReport(
  filters: ReportFilters,
  deps: ReportDeps,
) {
  const from = String(filters.from || "").trim();
  const to = String(filters.to || "").trim();
  if (from && !isIsoDate(from)) throw new Error("تاریخ شروع گزارش معتبر نیست.");
  if (to && !isIsoDate(to)) throw new Error("تاریخ پایان گزارش معتبر نیست.");
  if (from && to && from > to) throw new Error("تاریخ شروع نمی‌تواند بعد از تاریخ پایان باشد.");

  const params: any[] = [];
  let where = `WHERE LOWER(COALESCE(so.paymentMethod, '')) = 'credit'
    AND COALESCE(so.status, 'active') <> 'canceled'
    AND (
      COALESCE(so.notes, '') LIKE ?
      OR (COALESCE(so.notes, '') LIKE ? AND COALESCE(so.notes, '') LIKE ?)
      OR (COALESCE(so.notes, '') LIKE ? AND COALESCE(so.notes, '') LIKE ?)
    )`;
  params.push(
    "%[تأیید مدیر برای عبور از سقف اعتبار پیشنهادی]%",
    "%تأیید مدیر%",
    "%سقف اعتبار%",
    "%تایید مدیر%",
    "%سقف اعتبار%",
  );

  if (from) {
    where += " AND date(so.transactionDate) >= date(?)";
    params.push(from);
  }
  if (to) {
    where += " AND date(so.transactionDate) <= date(?)";
    params.push(to);
  }

  const rows = await deps.allAsync(
    `SELECT
      so.id,
      so.customerId,
      COALESCE(NULLIF(TRIM(c.fullName), ''), 'مشتری') AS customerName,
      so.grandTotal,
      so.subtotal,
      so.discount,
      so.transactionDate,
      so.notes,
      COALESCE(so.status, 'active') AS saleStatus
    FROM sales_orders so
    LEFT JOIN customers c ON c.id = so.customerId
    ${where}
    ORDER BY date(so.transactionDate) DESC, so.id DESC`,
    params,
  );

  const enriched = await Promise.all(
    (Array.isArray(rows) ? rows : []).map(async (row: any) => {
      const customerId = Number(row.customerId || 0);
      const customer = customerId > 0
        ? await deps.getCustomerById(customerId).catch(() => null)
        : null;
      const trustProfile = customerId > 0
        ? await deps.getCustomerTrustProfile(customerId, customer).catch(() => null)
        : null;
      const suggestedCreditLimit = trustProfile?.suggestedCreditLimit == null
        ? null
        : Math.max(0, deps.toNumber(trustProfile.suggestedCreditLimit));
      const currentExposure = trustProfile?.currentBalance == null
        ? null
        : Math.max(0, deps.toNumber(trustProfile.currentBalance));
      const customerTrustScore = trustProfile?.score == null
        ? null
        : deps.clamp(deps.toNumber(trustProfile.score), 0, 100);
      const riskStatus = resolveRiskStatus({
        hasTrustProfile: Boolean(trustProfile),
        suggestedCreditLimit,
        currentExposure,
        trustScore: customerTrustScore,
      });

      return {
        id: Number(row.id),
        customerId,
        customerName: row.customerName || "مشتری",
        grandTotal: deps.toNumber(row.grandTotal),
        subtotal: deps.toNumber(row.subtotal),
        discount: deps.toNumber(row.discount),
        transactionDate: row.transactionDate,
        notes: row.notes || "",
        saleStatus: row.saleStatus || "active",
        suggestedCreditLimit,
        remainingSuggestedCredit: trustProfile?.remainingSuggestedCredit == null
          ? null
          : deps.toNumber(trustProfile.remainingSuggestedCredit),
        customerTrustScore,
        customerTrustTier: trustProfile?.tierLabel ?? null,
        currentExposure,
        projectedExposure: currentExposure,
        overLimitAmount: suggestedCreditLimit != null && currentExposure != null
          ? Math.max(0, currentExposure - suggestedCreditLimit)
          : null,
        riskStatus,
        approvalMarker: "[تأیید مدیر برای عبور از سقف اعتبار پیشنهادی]",
      };
    }),
  );

  const riskyStatuses = new Set<ManagerCreditApprovalRiskStatus>([
    "no-safe-limit",
    "over-limit",
    "low-trust",
    "insufficient-data",
  ]);
  const filteredRows = filters.riskyOnly
    ? enriched.filter((row) => riskyStatuses.has(row.riskStatus))
    : enriched;
  const scoredRows = filteredRows.filter((row) => row.customerTrustScore != null);

  return {
    success: true as const,
    generatedAt: new Date().toISOString(),
    dataSource: "sqlite-business-records" as const,
    sourceTables: ["sales_orders", "customers", "customer_ledger", "installment_sales", "installment_payments"],
    filters: { from: from || null, to: to || null, riskyOnly: Boolean(filters.riskyOnly) },
    data: filteredRows,
    meta: {
      totalCount: filteredRows.length,
      rawTotalCount: enriched.length,
      riskyOnly: Boolean(filters.riskyOnly),
      totalAmount: filteredRows.reduce((sum, row) => sum + deps.toNumber(row.grandTotal), 0),
      overLimitCount: filteredRows.filter((row) => row.riskStatus === "over-limit").length,
      noLimitCount: filteredRows.filter((row) => row.riskStatus === "no-safe-limit").length,
      insufficientTrustCount: filteredRows.filter((row) => row.riskStatus === "insufficient-data").length,
      averageTrustScore: scoredRows.length
        ? deps.clamp(scoredRows.reduce((sum, row) => sum + Number(row.customerTrustScore), 0) / scoredRows.length, 0, 100)
        : null,
    },
  };
}
