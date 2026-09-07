import { getAsync, runAsync } from "../db/query";
import { assertReasonableAccountingDate, normalizeAccountingMovement } from "./accountingEngine";
import { recordAccountingAuditEvent, type AccountingAuditActor } from "./accountingAuditTrail";

export type ManualAccountingAccountType = "customer" | "partner";

export type ManualAccountingDocumentInput = {
  accountType: ManualAccountingAccountType;
  accountId: number;
  description: string;
  debit?: number;
  credit?: number;
  transactionDate: string;
  actor?: AccountingAuditActor | null;
  documentKind?: "standalone_adjustment" | "correction_replacement";
  replacesDocumentId?: number | null;
};

const normalizeReason = (value: unknown): string => {
  const reason = String(value || "").trim().replace(/\s+/g, " ");
  if (reason.length < 3) {
    throw new Error("برای سند مستقل، توضیح/علت حداقل ۳ کاراکتر الزامی است.");
  }
  if (reason.length > 1000) {
    throw new Error("توضیح/علت سند مستقل نباید بیشتر از ۱۰۰۰ کاراکتر باشد.");
  }
  return reason;
};

export const createManualAccountingDocument = async (
  input: ManualAccountingDocumentInput,
): Promise<any> => {
  const accountId = Number(input.accountId || 0);
  if (!Number.isInteger(accountId) || accountId <= 0) {
    throw new Error("شناسه حساب سند مستقل نامعتبر است.");
  }
  const movement = normalizeAccountingMovement(
    { debit: input.debit, credit: input.credit },
    { allowBalancedPair: false },
  );
  const transactionDate = assertReasonableAccountingDate(input.transactionDate);
  const direction = movement.debit > 0 ? "debit" : "credit";
  const amount = direction === "debit" ? movement.debit : movement.credit;
  const reason = normalizeReason(input.description);
  const now = new Date().toISOString();
  const documentKind = input.documentKind || "standalone_adjustment";
  const replacesDocumentId = Number(input.replacesDocumentId || 0) || null;

  const inserted = await runAsync(
    `INSERT INTO accounting_manual_documents (
       accountType, accountId, documentKind, direction, amount, transactionDate,
       reason, replacesDocumentId, createdByUserId, createdByUsername, createdByRole, createdAt
     ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      input.accountType,
      accountId,
      documentKind,
      direction,
      amount,
      transactionDate,
      reason,
      replacesDocumentId,
      input.actor?.userId == null ? null : Number(input.actor.userId),
      input.actor?.username || null,
      input.actor?.role || null,
      now,
    ],
  );
  const documentId = Number(inserted.lastID);
  const document = await getAsync(
    "SELECT * FROM accounting_manual_documents WHERE id = ?",
    [documentId],
  );
  await recordAccountingAuditEvent({
    eventType: "manual_accounting_document_created",
    entityType: "accounting_manual_document",
    entityId: documentId,
    accountType: input.accountType,
    accountId,
    actor: input.actor || null,
    reason,
    after: document,
    source: "manual_accounting_document",
  });
  return document;
};

export const getManualAccountingDocument = async (documentId: number): Promise<any | null> => {
  const id = Number(documentId || 0);
  if (!id) return null;
  return (await getAsync("SELECT * FROM accounting_manual_documents WHERE id = ?", [id])) || null;
};
