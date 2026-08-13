type SalesRiskDecisionReportDeps = {
  allAsync: (sql: string, params?: any[]) => Promise<any[]>;
};

const toLatinDigits = (value: unknown) => String(value ?? '')
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

const extractPart = (description: string, label: string) => {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return description.match(new RegExp(`${escaped}:\\s*([^|]+)`))?.[1]?.trim() || null;
};

const extractNumber = (description: string, label: string) => {
  const raw = extractPart(description, label);
  if (!raw) return null;
  const numeric = Number(toLatinDigits(raw).replace(/[^0-9.-]/g, ''));
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeDate = (value: unknown, label: string) => {
  const raw = String(value ?? '').trim();
  if (!raw) return '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
    throw new Error(`${label} نامعتبر است.`);
  }
  return raw;
};

export const buildSalesRiskDecisionsReport = async (
  input: { from?: unknown; to?: unknown; limit?: unknown },
  deps: SalesRiskDecisionReportDeps,
) => {
  const from = normalizeDate(input.from, 'تاریخ شروع');
  const to = normalizeDate(input.to, 'تاریخ پایان');
  if (from && to && from > to) throw new Error('تاریخ شروع نباید بعد از تاریخ پایان باشد.');

  const parsedLimit = Number.parseInt(String(input.limit ?? '150'), 10);
  const limit = Math.min(300, Math.max(1, Number.isFinite(parsedLimit) ? parsedLimit : 150));
  const whereParts = ['al.action = ?'];
  const params: any[] = ['sales-risk-payment-method-change'];
  if (from) { whereParts.push('date(al.createdAt) >= date(?)'); params.push(from); }
  if (to) { whereParts.push('date(al.createdAt) <= date(?)'); params.push(to); }
  const whereSql = whereParts.join(' AND ');

  const [rows, aggregateRows] = await Promise.all([
    deps.allAsync(
      `SELECT al.id, al.userId, al.username, al.role, al.action, al.entityType, al.entityId,
              al.description, al.createdAt, c.fullName AS customerName
         FROM audit_logs al
         LEFT JOIN customers c ON al.entityType = 'customer' AND c.id = al.entityId
        WHERE ${whereSql}
        ORDER BY datetime(al.createdAt) DESC, al.id DESC
        LIMIT ?`,
      [...params, limit],
    ),
    deps.allAsync(
      `SELECT COUNT(*) AS totalCount,
              SUM(CASE WHEN al.description LIKE '%به نقدی%' THEN 1 ELSE 0 END) AS cashSwitchCount,
              SUM(CASE WHEN al.description LIKE '%به اعتباری%' THEN 1 ELSE 0 END) AS creditReturnCount,
              COUNT(DISTINCT CASE WHEN al.entityType = 'customer' THEN al.entityId END) AS uniqueCustomers
         FROM audit_logs al
        WHERE ${whereSql}`,
      params,
    ),
  ]);

  const data = rows.map((row: any) => {
    const description = String(row.description || '');
    const decisionType = description.includes('به نقدی')
      ? 'switch-to-cash'
      : description.includes('به اعتباری')
        ? 'return-to-credit'
        : 'other';
    return {
      ...row,
      decisionType,
      customerName: row.customerName || extractPart(description, 'مشتری'),
      trustScore: extractNumber(description, 'امتیاز اعتماد'),
      trustTier: extractPart(description, 'سطح اعتماد'),
      grandTotal: extractNumber(description, 'مبلغ فاکتور جاری'),
      suggestedCreditLimit: extractNumber(description, 'سقف اعتبار پیشنهادی'),
      projectedCreditExposure: extractNumber(description, 'تعهد بعد از فروش'),
      reason: extractPart(description, 'علت'),
    };
  });
  const aggregate: any = aggregateRows[0] || {};

  return {
    dataSource: 'sqlite-audit-logs',
    sourceTables: ['audit_logs', 'customers'],
    generatedAt: new Date().toISOString(),
    range: { from: from || null, to: to || null },
    data,
    meta: {
      totalCount: Number(aggregate.totalCount || 0),
      cashSwitchCount: Number(aggregate.cashSwitchCount || 0),
      creditReturnCount: Number(aggregate.creditReturnCount || 0),
      uniqueCustomers: Number(aggregate.uniqueCustomers || 0),
      returnedCount: data.length,
      hasRecordedDecisions: Number(aggregate.totalCount || 0) > 0,
    },
  };
};
