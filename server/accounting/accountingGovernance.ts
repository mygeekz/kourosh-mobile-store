import { createHash, randomBytes } from "node:crypto";
import { allAsync, execAsync, getAsync, runAsync } from "../db/query";
import { accountingLedgerBalanceSumSql, accountingLedgerDeltaSql, accountingMovementDelta, inspectAccountingMovementForRead } from "./accountingEngine";

export type AccountingActor = { userId?: number | null; username?: string | null; role?: string | null } | null;

const normalizeDate = (value: unknown): string => {
  const raw = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(raw) || Number.isNaN(Date.parse(`${raw}T00:00:00Z`))) {
    throw new Error("تاریخ دوره حسابداری نامعتبر است.");
  }
  return raw;
};

const canonicalJson = (value: unknown): string => JSON.stringify(value);
export const sha256Text = (value: string): string => createHash("sha256").update(value).digest("hex");

const sumRow = async (sql: string, params: any[]): Promise<number> => {
  const row = await getAsync(sql, params);
  const value = Number(row?.value || 0);
  return Number.isFinite(value) ? value : 0;
};

export const getPartnerAccountingBreakdown = async (partnerId: number) => {
  const id = Number(partnerId);
  if (!Number.isInteger(id) || id <= 0) throw new Error("شناسه همکار نامعتبر است.");
  const partner = await getAsync(`SELECT id, partnerName FROM partners WHERE id = ?`, [id]);
  if (!partner) return null;

  // The breakdown is a read model. It must remain readable on databases that
  // were created before optional ledger metadata columns existed. Startup
  // migrations should add them, but this defensive projection prevents one
  // legacy schema drift from turning the whole Partner Detail page into HTTP 500.
  const ledgerSchema = await allAsync(`PRAGMA table_info(partner_ledger)`).catch(() => [] as any[]);
  const ledgerColumns = new Set(ledgerSchema.map((row: any) => String(row?.name || "")));
  const ledgerColumn = (name: string, fallbackSql: string, alias = name) =>
    ledgerColumns.has(name) ? `"${name}" AS "${alias}"` : `${fallbackSql} AS "${alias}"`;
  const ledgerDateOrder = ledgerColumns.has("transactionDate")
    ? '"transactionDate"'
    : ledgerColumns.has("createdAt")
      ? '"createdAt"'
      : ledgerColumns.has("updatedAt")
        ? '"updatedAt"'
        : 'NULL';

  const rows = ledgerColumns.has("partnerId")
    ? await allAsync(
        `SELECT ${ledgerColumn("id", "rowid")},
                ${ledgerColumn("transactionDate", "NULL")},
                ${ledgerColumn("createdAt", "NULL")},
                ${ledgerColumn("updatedAt", "NULL")},
                ${ledgerColumn("description", "''")},
                ${ledgerColumns.has("debit") ? 'COALESCE("debit",0) AS debit' : '0 AS debit'},
                ${ledgerColumns.has("credit") ? 'COALESCE("credit",0) AS credit' : '0 AS credit'},
                ${ledgerColumn("referenceType", "NULL")},
                ${ledgerColumn("referenceId", "NULL")},
                ${ledgerColumn("settlementBatchId", "NULL")}
           FROM partner_ledger
          WHERE partnerId = ?
          ORDER BY datetime(${ledgerDateOrder}) ASC, id ASC`,
        [id],
      ).catch((error) => {
        console.error("[partner-accounting-breakdown] legacy ledger read failed", error);
        return [] as any[];
      })
    : [];

  const profitAllocations = await allAsync(
    `SELECT spa.id, spa.snapshotId, spa.sourceKind, spa.sourceId, spa.sourceItemRefType, spa.sourceItemId,
            spa.allocationType, COALESCE(spa.sharePercent,0) AS sharePercent, COALESCE(spa.amount,0) AS amount,
            spa.notes, spa.createdAt,
            sps.saleDate, sps.itemType, sps.itemId, sps.itemDescription, COALESCE(sps.totalProfitAmount,0) AS totalProfitAmount
       FROM sale_profit_allocations spa
       LEFT JOIN sale_profit_snapshots sps ON sps.id = spa.snapshotId
      WHERE spa.sourceStatus = 'active'
        AND spa.storePartnerId IN (
          SELECT storePartnerId FROM store_partner_legacy_links WHERE legacyPartnerId = ?
        )
      ORDER BY date(COALESCE(sps.saleDate, spa.createdAt)) ASC, spa.id ASC`,
    [id],
  ).catch(() => []);

  let running = 0;
  let supplierCredits = 0;
  let supplierDebits = 0;
  let explicitProfitLedger = 0;
  const entries = rows.map((row: any) => {
    const inspected = inspectAccountingMovementForRead("partner", { debit: row.debit, credit: row.credit });
    const { debit, credit } = inspected;
    const delta = inspected.issue
      ? inspected.delta
      : accountingMovementDelta("partner", { debit, credit });
    running += delta;
    const ref = String(row.referenceType || "").toLowerCase();
    const isProfit = ref.includes("profit") || ref.includes("share");
    if (isProfit) explicitProfitLedger += delta;
    else {
      supplierCredits += credit;
      supplierDebits += debit;
    }
    const direction = delta > 0 ? "increase" : delta < 0 ? "decrease" : "neutral";
    return { ...row, debit, credit, delta, movementIssue: inspected.issue, runningBalance: running, bucket: isProfit ? "profit_share" : debit > 0 ? "payment" : "supplier", direction };
  });

  // Aggregates are balances, not a single accounting movement. Feeding total
  // debit + total credit back into normalizeAccountingMovement() incorrectly
  // treats an ordinary multi-row ledger as one dual-sided journal line. The
  // canonical balance is the sum of already-inspected row deltas.
  const supplierReceivable = entries
    .filter((entry: any) => entry.bucket !== "profit_share")
    .reduce((sum: number, entry: any) => sum + Number(entry.delta || 0), 0);
  const profitShareAccrued = profitAllocations.reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const sharedProfitAccrued = profitAllocations
    .filter((row: any) => String(row.allocationType || '').toLowerCase() === 'shared_profit')
    .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const ownerGainAccrued = profitAllocations
    .filter((row: any) => String(row.allocationType || '').toLowerCase() === 'owner_gain')
    .reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0);
  const totalPayments = rows.reduce((sum: number, row: any) => sum + Number(row.debit || 0), 0);
  const totalIncreases = rows.reduce((sum: number, row: any) => sum + Number(row.credit || 0), 0);
  const canonicalBalance = entries.reduce((sum: number, entry: any) => sum + Number(entry.delta || 0), 0);

  return {
    partner: { id, partnerName: String(partner.partnerName || "") },
    summary: {
      canonicalBalance,
      supplierReceivable,
      supplierCredits,
      supplierDebits,
      totalPayments,
      totalIncreases,
      profitShareAccrued,
      sharedProfitAccrued,
      ownerGainAccrued,
      explicitProfitLedger,
      ledgerEntryCount: entries.length,
      profitAllocationCount: profitAllocations.length,
      legacyMovementIssueCount: entries.filter((entry: any) => Boolean(entry.movementIssue)).length,
    },
    entries,
    profitAllocations: profitAllocations.map((row: any) => ({
      ...row,
      amount: Number(row.amount || 0),
      sharePercent: Number(row.sharePercent || 0),
      totalProfitAmount: Number(row.totalProfitAmount || 0),
    })),
  };
};

export const buildAccountingHistoricalSnapshot = async (periodStartInput: unknown, periodEndInput: unknown) => {
  const periodStart = normalizeDate(periodStartInput);
  const periodEnd = normalizeDate(periodEndInput);
  if (periodStart > periodEnd) throw new Error("ابتدای دوره نمی‌تواند بعد از انتهای دوره باشد.");
  const p = [periodStart, periodEnd];

  const metrics = {
    partnerLedgerNet: await sumRow(`SELECT ${accountingLedgerBalanceSumSql("partner")} AS value FROM partner_ledger WHERE date(transactionDate) BETWEEN date(?) AND date(?)`, p),
    customerLedgerNet: await sumRow(`SELECT ${accountingLedgerBalanceSumSql("customer")} AS value FROM customer_ledger WHERE date(transactionDate) BETWEEN date(?) AND date(?)`, p),
    salesOrdersTotal: await sumRow(`SELECT COALESCE(SUM(COALESCE(grandTotal,0)),0) AS value FROM sales_orders WHERE COALESCE(status,'active')='active' AND date(transactionDate) BETWEEN date(?) AND date(?)`, p),
    legacySalesTotal: await sumRow(`SELECT COALESCE(SUM(COALESCE(totalPrice,0)),0) AS value FROM sales_transactions WHERE date(transactionDate) BETWEEN date(?) AND date(?)`, p),
    purchasesTotal: await sumRow(`SELECT COALESCE(SUM(COALESCE(totalCost,0)),0) AS value FROM purchases WHERE date(purchaseDate) BETWEEN date(?) AND date(?)`, p),
    expensesTotal: await sumRow(`SELECT COALESCE(SUM(COALESCE(amount,0)),0) AS value FROM expenses WHERE date(expenseDate) BETWEEN date(?) AND date(?)`, p),
    installmentSalesTotal: await sumRow(`SELECT COALESCE(SUM(COALESCE(actualSalePrice,0)),0) AS value FROM installment_sales WHERE COALESCE(status,'active')='active' AND date(COALESCE(saleDateISO,saleDate,dateCreated)) BETWEEN date(?) AND date(?)`, p),
    installmentReceiptsTotal: await sumRow(`SELECT COALESCE(SUM(COALESCE(amount_paid,0)),0) AS value FROM installment_transactions WHERE date(payment_date) BETWEEN date(?) AND date(?)`, p),
    profitAllocatedTotal: await sumRow(`SELECT COALESCE(SUM(COALESCE(spa.amount,0)),0) AS value FROM sale_profit_allocations spa JOIN sale_profit_snapshots sps ON sps.id=spa.snapshotId WHERE spa.sourceStatus='active' AND date(COALESCE(sps.saleDate,sps.createdAt)) BETWEEN date(?) AND date(?)`, p),
  };

  const partnerBalances = await allAsync(
    `SELECT p.id, p.partnerName,
            COALESCE(SUM(CASE WHEN date(l.transactionDate) <= date(?) THEN ${accountingLedgerDeltaSql("partner", "l")} ELSE 0 END),0) AS balance
       FROM partners p LEFT JOIN partner_ledger l ON l.partnerId=p.id
      GROUP BY p.id, p.partnerName ORDER BY p.id`,
    [periodEnd],
  );
  const customerBalances = await allAsync(
    `SELECT c.id, c.fullName,
            COALESCE(SUM(CASE WHEN date(l.transactionDate) <= date(?) THEN ${accountingLedgerDeltaSql("customer", "l")} ELSE 0 END),0) AS balance
       FROM customers c LEFT JOIN customer_ledger l ON l.customerId=c.id
      GROUP BY c.id, c.fullName ORDER BY c.id`,
    [periodEnd],
  );

  return { schemaVersion: 1, periodStart, periodEnd, generatedAt: new Date().toISOString(), metrics, partnerBalances, customerBalances };
};

export const createAccountingHistoricalSnapshot = async (periodStartInput: unknown, periodEndInput: unknown, actor: AccountingActor, lockId?: number | null) => {
  const payload = await buildAccountingHistoricalSnapshot(periodStartInput, periodEndInput);
  const payloadJson = canonicalJson(payload);
  const sha256 = sha256Text(payloadJson);
  const versionRow = await getAsync(`SELECT COALESCE(MAX(version),0)+1 AS nextVersion FROM accounting_period_snapshots WHERE periodStart=? AND periodEnd=?`, [payload.periodStart, payload.periodEnd]);
  const version = Math.max(1, Number(versionRow?.nextVersion || 1));
  const result = await runAsync(
    `INSERT INTO accounting_period_snapshots (lockId,periodStart,periodEnd,version,payloadJson,sha256,createdByUserId,createdByUsername)
     VALUES (?,?,?,?,?,?,?,?)`,
    [lockId || null, payload.periodStart, payload.periodEnd, version, payloadJson, sha256, actor?.userId || null, actor?.username || null],
  );
  return { id: Number(result.lastID), version, sha256, payload };
};

const getPeriodLockEffectiveState = async (lockId: number): Promise<"closed" | "reopened"> => {
  const row = await getAsync(
    `SELECT action FROM accounting_period_state_events WHERE lockId=? ORDER BY id DESC LIMIT 1`,
    [lockId],
  ).catch(() => null as any);
  return String(row?.action || "closed") === "reopened" ? "reopened" : "closed";
};

export const reopenAccountingPeriod = async (input: { lockId: unknown; reason: unknown; actor?: AccountingActor }) => {
  const lockId = Number(input.lockId || 0);
  if (!Number.isInteger(lockId) || lockId <= 0) throw new Error("شناسه دوره حسابداری نامعتبر است.");
  const reason = String(input.reason || "").trim();
  if (reason.length < 5) throw new Error("برای بازگشایی دوره، دلیل حداقل پنج حرفی الزامی است.");
  const lock = await getAsync(`SELECT * FROM accounting_period_locks WHERE id=? LIMIT 1`, [lockId]);
  if (!lock?.id) throw new Error("دوره حسابداری مورد نظر یافت نشد.");
  if (await getPeriodLockEffectiveState(lockId) !== "closed") throw new Error("این دوره حسابداری از قبل بازگشایی شده است.");

  await execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    // Snapshot right before reopening is immutable evidence of the exact state that
    // was unlocked. Historical snapshots are never rewritten.
    const snapshot = await createAccountingHistoricalSnapshot(lock.periodStart, lock.periodEnd, input.actor || null, lockId);
    const event = await runAsync(
      `INSERT INTO accounting_period_state_events (lockId,action,reason,snapshotId,actorUserId,actorUsername,actorRole) VALUES (?,'reopened',?,?,?,?,?)`,
      [lockId, reason, snapshot.id, input.actor?.userId || null, input.actor?.username || null, input.actor?.role || null],
    );
    await runAsync(
      `INSERT INTO accounting_audit_events (eventType,entityType,entityId,actorUserId,actorUsername,actorRole,reason,beforeJson,afterJson,source) VALUES ('accounting_period_reopened','accounting_period_lock',?,?,?,?,?,?,?,?, 'accounting_governance')`,
      [lockId, input.actor?.userId || null, input.actor?.username || null, input.actor?.role || null, reason, JSON.stringify({ effectiveState: 'closed', periodStart: lock.periodStart, periodEnd: lock.periodEnd }), JSON.stringify({ effectiveState: 'reopened', stateEventId: Number(event.lastID), snapshotId: snapshot.id, snapshotVersion: snapshot.version, sha256: snapshot.sha256 })],
    );
    await execAsync("COMMIT;");
    return { lockId, periodStart: lock.periodStart, periodEnd: lock.periodEnd, state: 'reopened' as const, stateEventId: Number(event.lastID), snapshot };
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};

export const closeAccountingPeriod = async (input: { periodStart: unknown; periodEnd: unknown; reason?: unknown; actor?: AccountingActor }) => {
  const periodStart = normalizeDate(input.periodStart);
  const periodEnd = normalizeDate(input.periodEnd);
  if (periodStart > periodEnd) throw new Error("ابتدای دوره نمی‌تواند بعد از انتهای دوره باشد.");
  const reason = String(input.reason || "").trim() || "بستن دوره حسابداری";
  const existing = await getAsync(`SELECT * FROM accounting_period_locks WHERE periodStart=? AND periodEnd=? LIMIT 1`, [periodStart, periodEnd]);
  if (existing?.id && await getPeriodLockEffectiveState(Number(existing.id)) === "closed") {
    throw new Error("این دوره حسابداری در حال حاضر بسته است.");
  }

  await execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    let lockId = Number(existing?.id || 0);
    const reclosed = lockId > 0;
    if (!lockId) {
      const lockResult = await runAsync(
        `INSERT INTO accounting_period_locks (periodStart,periodEnd,closeReason,closedByUserId,closedByUsername,closedByRole) VALUES (?,?,?,?,?,?)`,
        [periodStart, periodEnd, reason, input.actor?.userId || null, input.actor?.username || null, input.actor?.role || null],
      );
      lockId = Number(lockResult.lastID);
    }
    const snapshot = await createAccountingHistoricalSnapshot(periodStart, periodEnd, input.actor || null, lockId);
    await runAsync(`UPDATE accounting_period_locks SET snapshotId=? WHERE id=?`, [snapshot.id, lockId]);
    const stateEvent = await runAsync(
      `INSERT INTO accounting_period_state_events (lockId,action,reason,snapshotId,actorUserId,actorUsername,actorRole) VALUES (?,'closed',?,?,?,?,?)`,
      [lockId, reason, snapshot.id, input.actor?.userId || null, input.actor?.username || null, input.actor?.role || null],
    );
    await runAsync(
      `INSERT INTO accounting_audit_events (eventType,entityType,entityId,actorUserId,actorUsername,actorRole,reason,beforeJson,afterJson,source) VALUES ('accounting_period_closed','accounting_period_lock',?,?,?,?,?,?,?,?, 'accounting_governance')`,
      [lockId, input.actor?.userId || null, input.actor?.username || null, input.actor?.role || null, reason, JSON.stringify({ effectiveState: reclosed ? 'reopened' : 'new', periodStart, periodEnd }), JSON.stringify({ effectiveState: 'closed', reclosed, stateEventId: Number(stateEvent.lastID), snapshotId: snapshot.id, snapshotVersion: snapshot.version, sha256: snapshot.sha256 }),],
    );
    await execAsync("COMMIT;");
    return { lockId, periodStart, periodEnd, state: 'closed' as const, reclosed, stateEventId: Number(stateEvent.lastID), snapshot };
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};

export const getAccountingGovernanceHealth = async () => {
  const one = async (sql: string, params: any[] = []) => (await getAsync(sql, params).catch(() => null)) || {};
  const openIssues = await one(`SELECT COUNT(*) AS count FROM accounting_reconciliation_issues WHERE resolvedAt IS NULL`);
  const locks = await one(`SELECT COUNT(*) AS count, MAX(apl.closedAt) AS latest FROM accounting_period_locks apl WHERE apl.status='closed' AND COALESCE((SELECT e.action FROM accounting_period_state_events e WHERE e.lockId=apl.id ORDER BY e.id DESC LIMIT 1),'closed')='closed'`);
  const totalLocks = await one(`SELECT COUNT(*) AS count FROM accounting_period_locks`);
  const reopened = await one(`SELECT COUNT(*) AS count, MAX(createdAt) AS latest FROM accounting_period_state_events WHERE action='reopened'`);
  const activeClosedPeriods = await allAsync(`
    SELECT apl.id, apl.periodStart, apl.periodEnd, apl.closeReason, apl.closedAt, apl.snapshotId,
           COALESCE((SELECT e.action FROM accounting_period_state_events e WHERE e.lockId=apl.id ORDER BY e.id DESC LIMIT 1),'closed') AS effectiveState
      FROM accounting_period_locks apl
     WHERE apl.status='closed'
       AND COALESCE((SELECT e.action FROM accounting_period_state_events e WHERE e.lockId=apl.id ORDER BY e.id DESC LIMIT 1),'closed')='closed'
     ORDER BY date(apl.periodEnd) DESC, apl.id DESC LIMIT 12
  `).catch(() => [] as any[]);
  const snapshots = await one(`SELECT COUNT(*) AS count, MAX(createdAt) AS latest FROM accounting_period_snapshots`);
  const migrations = await one(`SELECT COUNT(*) AS total,
                                            SUM(CASE WHEN COALESCE(sha256,'')='' THEN 1 ELSE 0 END) AS missingChecksum,
                                            COALESCE(SUM(COALESCE(affectedRows,0)),0) AS affectedRows,
                                            SUM(CASE WHEN COALESCE(backupSha256,'')<>'' THEN 1 ELSE 0 END) AS withSafetyBackup
                                       FROM schema_migrations`);
  const latestMigration = await one(`SELECT id,result,affectedRows,appliedAt,backupFileName,backupSha256 FROM schema_migrations ORDER BY datetime(appliedAt) DESC,rowid DESC LIMIT 1`);
  const accountingAudit = await one(`SELECT COUNT(*) AS count, MAX(createdAt) AS latest FROM accounting_audit_events`);
  const guardRows = await allAsync(`SELECT name FROM sqlite_master WHERE type='trigger' AND name LIKE '%period_lock_%' ORDER BY name`).catch(() => []);
  return {
    openReconciliationIssues: Number(openIssues.count || 0),
    closedPeriods: Number(locks.count || 0),
    totalPeriodLocks: Number(totalLocks.count || 0),
    reopenedPeriodEvents: Number(reopened.count || 0),
    latestPeriodReopenedAt: reopened.latest || null,
    activeClosedPeriods,
    latestPeriodClosedAt: locks.latest || null,
    historicalSnapshots: Number(snapshots.count || 0),
    latestSnapshotAt: snapshots.latest || null,
    migrationRegistryEntries: Number(migrations.total || 0),
    migrationsMissingChecksum: Number(migrations.missingChecksum || 0),
    migrationAffectedRows: Number(migrations.affectedRows || 0),
    migrationsWithSafetyBackup: Number(migrations.withSafetyBackup || 0),
    latestMigration: latestMigration?.id ? latestMigration : null,
    accountingAuditEvents: Number(accountingAudit.count || 0),
    latestAccountingAuditAt: accountingAudit.latest || null,
    periodLockTriggerCount: guardRows.length,
    periodLockActive: guardRows.length >= 30,
  };
};

// One-time, short-lived confirmation challenges. A second HTTP request is
// required before destructive/irreversible accounting actions can execute.
type Confirmation = {
  action: string;
  scopeKey: string;
  actorKey: string;
  expiresAt: number;
  payloadSha256?: string | null;
  impact?: unknown;
};
const confirmations = new Map<string, Confirmation>();
const actorKeyOf = (actor: AccountingActor) => String(actor?.userId || actor?.username || "anonymous");

const stableCanonicalJson = (value: unknown): string => {
  if (Array.isArray(value)) return `[${value.map(stableCanonicalJson).join(",")}]`;
  if (!value || typeof value !== "object") return JSON.stringify(value);
  const row = value as Record<string, unknown>;
  return `{${Object.keys(row).sort().map((key) => `${JSON.stringify(key)}:${stableCanonicalJson(row[key])}`).join(",")}}`;
};

export const fingerprintAccountingConfirmationPayload = (payload: unknown): string =>
  sha256Text(stableCanonicalJson(payload ?? null));

export const prepareAccountingConfirmation = (
  action: string,
  scopeKey: string,
  actor: AccountingActor,
  options?: { payload?: unknown; impact?: unknown },
) => {
  const token = randomBytes(24).toString("hex");
  const expiresAt = Date.now() + 5 * 60_000;
  const payloadSha256 = options && Object.prototype.hasOwnProperty.call(options, "payload")
    ? fingerprintAccountingConfirmationPayload(options.payload)
    : null;
  confirmations.set(token, { action, scopeKey, actorKey: actorKeyOf(actor), expiresAt, payloadSha256, impact: options?.impact });
  return { token, expiresAt: new Date(expiresAt).toISOString(), payloadSha256, impact: options?.impact };
};

export const consumeAccountingConfirmation = (
  tokenInput: unknown,
  action: string,
  scopeKey: string,
  actor: AccountingActor,
  options?: { payload?: unknown },
) => {
  const token = String(tokenInput || "").trim();
  const row = confirmations.get(token);
  confirmations.delete(token);
  const payloadMatches = !row?.payloadSha256 || (options && Object.prototype.hasOwnProperty.call(options, "payload")
    ? row.payloadSha256 === fingerprintAccountingConfirmationPayload(options.payload)
    : false);
  if (!row || row.expiresAt < Date.now() || row.action !== action || row.scopeKey !== scopeKey || row.actorKey !== actorKeyOf(actor) || !payloadMatches) {
    throw new Error("تأیید دومرحله‌ای معتبر نیست، منقضی شده یا Payload پس از پیش‌نمایش تغییر کرده است.");
  }
  return true;
};
