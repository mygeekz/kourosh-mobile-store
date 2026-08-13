import { allAsync } from "../db/query";

export type PartnerSettlementReportRange = {
  fromDateIso?: string | null;
  toDateIso?: string | null;
  partnerId?: number | null;
};

type PartnerSettlementFilter = {
  sql: string;
  params: any[];
};

type PartnerSettlementReadDeps = {
  tableExists: (tableName: string) => Promise<boolean>;
  buildDateRangeSql: (
    field: string,
    range?: PartnerSettlementReportRange,
  ) => PartnerSettlementFilter;
};

export const listPartnerSettlementTransactionsFromDb = async (
  range: PartnerSettlementReportRange = {},
  deps: PartnerSettlementReadDeps,
): Promise<any[]> => {
  if (!(await deps.tableExists("partner_settlement_transactions"))) return [];
  const filter = deps.buildDateRangeSql("pst.settlementDate", range);
  const rows = await allAsync(
    `SELECT pst.*, fp.name as fromPartnerName, fp.colorTag as fromPartnerColorTag, tp.name as toPartnerName, tp.colorTag as toPartnerColorTag
       FROM partner_settlement_transactions pst
       JOIN store_partners fp ON fp.id = pst.fromStorePartnerId
       LEFT JOIN store_partners tp ON tp.id = pst.toStorePartnerId
      WHERE pst.status = 'active'${filter.sql}
      ORDER BY pst.settlementDate DESC, pst.id DESC`,
    filter.params as any,
  );
  return (rows as any[]).map((row) => ({
    id: Number(row.id),
    settlementDate: row.settlementDate,
    fromStorePartnerId: Number(row.fromStorePartnerId),
    fromPartnerName: row.fromPartnerName,
    fromPartnerColorTag: row.fromPartnerColorTag || null,
    destinationKind: row.destinationKind || "partner",
    toStorePartnerId:
      row.toStorePartnerId != null ? Number(row.toStorePartnerId) : null,
    toPartnerName: row.toPartnerName || null,
    toPartnerColorTag: row.toPartnerColorTag || null,
    amount: Number(row.amount) || 0,
    paymentMethod: row.paymentMethod || null,
    referenceNo: row.referenceNo || null,
    notes: row.notes || null,
    status: row.status || "active",
    createdByUserId:
      row.createdByUserId != null ? Number(row.createdByUserId) : null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));
};
