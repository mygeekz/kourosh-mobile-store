import { execAsync, getAsync, runAsync } from "../db/query";
import { normalizeAccountingMovement } from "./accountingEngine";
import { recordAccountingAuditEvent, type AccountingAuditActor } from "./accountingAuditTrail";
import { createManualAccountingDocument } from "./manualAccountingDocument";

export type LedgerReversalKind = "partner" | "customer";

const config = (kind: LedgerReversalKind) => kind === "partner"
  ? { table: "partner_ledger", accountColumn: "partnerId", accountType: "partner" as const }
  : { table: "customer_ledger", accountColumn: "customerId", accountType: "customer" as const };

export const getLedgerReversalLink = async (kind: LedgerReversalKind, originalLedgerId: number) =>
  getAsync(
    `SELECT * FROM accounting_reversal_links WHERE ledgerKind = ? AND originalLedgerId = ?`,
    [kind, originalLedgerId],
  );

let reversalMutationQueue: Promise<void> = Promise.resolve();

const executeLedgerReversal = async (input: {
  kind: LedgerReversalKind;
  originalLedgerId: number;
  reason: string;
  actor?: AccountingAuditActor | null;
  replacement?: {
    description: string;
    debit: number;
    credit: number;
    transactionDate: string;
    referenceType?: string | null;
    referenceId?: number | null;
    createManualDocument?: boolean;
    replacesDocumentId?: number | null;
  } | null;
}): Promise<{ reversalId: number; replacementId: number | null; original: any }> => {
  const cfg = config(input.kind);
  const original = await getAsync(`SELECT * FROM ${cfg.table} WHERE id = ?`, [input.originalLedgerId]);
  if (!original) throw new Error("رکورد دفتر یافت نشد");
  const existing = await getLedgerReversalLink(input.kind, input.originalLedgerId);
  if (existing) {
    return {
      reversalId: Number(existing.reversalLedgerId),
      replacementId: existing.replacementLedgerId == null ? null : Number(existing.replacementLedgerId),
      original,
    };
  }

  const movement = normalizeAccountingMovement({ debit: original.debit, credit: original.credit });
  const accountId = Number(original[cfg.accountColumn] || 0);
  const now = new Date().toISOString();
  const reversalDescription = `برگشت سند #${Number(original.id)} — ${String(input.reason || "اصلاح حساب")}`;

  await execAsync("BEGIN IMMEDIATE TRANSACTION;");
  try {
    // Re-check inside the transaction so two simultaneous correction requests can
    // never create two reversals for the same original row.
    const linkedInsideTx = await getLedgerReversalLink(input.kind, input.originalLedgerId);
    if (linkedInsideTx) {
      await execAsync("COMMIT;");
      return {
        reversalId: Number(linkedInsideTx.reversalLedgerId),
        replacementId: linkedInsideTx.replacementLedgerId == null ? null : Number(linkedInsideTx.replacementLedgerId),
        original,
      };
    }

    const reversal = await runAsync(
      `INSERT INTO ${cfg.table}
        (${cfg.accountColumn}, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId)
       VALUES (?, ?, ?, ?, ?, ?, ?, 0, 'accounting_reversal', ?)`,
      [
        accountId,
        String(original.transactionDate || now),
        now,
        now,
        reversalDescription,
        movement.direction === "credit" ? movement.credit : 0,
        movement.direction === "debit" ? movement.debit : 0,
        Number(original.id),
      ],
    );
    const reversalId = Number(reversal.lastID);

    let replacementId: number | null = null;
    if (input.replacement) {
      const replacementMovement = normalizeAccountingMovement(input.replacement);
      let replacementReferenceType = input.replacement.referenceType || "accounting_replacement";
      let replacementReferenceId = input.replacement.referenceId ?? Number(original.id);
      if (input.replacement.createManualDocument) {
        const manualDocument = await createManualAccountingDocument({
          accountType: cfg.accountType,
          accountId,
          description: input.replacement.description,
          debit: replacementMovement.debit,
          credit: replacementMovement.credit,
          transactionDate: input.replacement.transactionDate,
          actor: input.actor || null,
          documentKind: "correction_replacement",
          replacesDocumentId: input.replacement.replacesDocumentId ?? null,
        });
        replacementReferenceType = "manual_accounting_document";
        replacementReferenceId = Number(manualDocument.id);
      }
      const replacement = await runAsync(
        `INSERT INTO ${cfg.table}
          (${cfg.accountColumn}, transactionDate, createdAt, updatedAt, description, debit, credit, balance, referenceType, referenceId)
         VALUES (?, ?, ?, ?, ?, ?, ?, 0, ?, ?)`,
        [
          accountId,
          input.replacement.transactionDate,
          now,
          now,
          input.replacement.description,
          replacementMovement.debit,
          replacementMovement.credit,
          replacementReferenceType,
          replacementReferenceId,
        ],
      );
      replacementId = Number(replacement.lastID);
    }

    await runAsync(
      `INSERT INTO accounting_reversal_links
        (ledgerKind, originalLedgerId, reversalLedgerId, replacementLedgerId, reason, createdAt)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [input.kind, Number(original.id), reversalId, replacementId, input.reason, now],
    );

    await recordAccountingAuditEvent({
      eventType: replacementId ? "ledger_corrected_by_reversal" : "ledger_reversed",
      entityType: `${input.kind}_ledger`,
      entityId: Number(original.id),
      accountType: cfg.accountType,
      accountId,
      actor: input.actor,
      reason: input.reason,
      before: original,
      after: { reversalId, replacementId, replacement: input.replacement || null },
      source: "accounting_reversal",
    });

    await execAsync("COMMIT;");
    return { reversalId, replacementId, original };
  } catch (error) {
    await execAsync("ROLLBACK;").catch(() => undefined);
    throw error;
  }
};

export const createLedgerReversal = (
  input: Parameters<typeof executeLedgerReversal>[0],
): Promise<{ reversalId: number; replacementId: number | null; original: any }> => {
  const task = reversalMutationQueue.then(() => executeLedgerReversal(input));
  reversalMutationQueue = task.then(() => undefined, () => undefined);
  return task;
};
