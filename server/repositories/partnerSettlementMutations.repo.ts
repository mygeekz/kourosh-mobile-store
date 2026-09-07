import { getAsync, runAsync } from "../db/query";

export const createPartnerSettlementTransactionFromDb = async (
  payload: any,
): Promise<any> => {
  const settlementDate = String(payload?.settlementDate || "").trim();
  const fromStorePartnerId = Number(payload?.fromStorePartnerId) || 0;
  const destinationKind =
    String(payload?.destinationKind || "partner").trim() === "store"
      ? "store"
      : "partner";
  const toStorePartnerId =
    destinationKind === "partner"
      ? Number(payload?.toStorePartnerId) || 0
      : null;
  const amount = Number(payload?.amount) || 0;
  const paymentMethod = String(payload?.paymentMethod || "").trim() || null;
  const referenceNo = String(payload?.referenceNo || "").trim() || null;
  const notes = String(payload?.notes || "").trim() || null;
  const createdByUserId =
    payload?.createdByUserId != null
      ? Number(payload.createdByUserId) || null
      : null;

  if (!settlementDate) throw new Error("تاریخ تسویه الزامی است.");
  if (!fromStorePartnerId) throw new Error("شریک پرداخت‌کننده را انتخاب کنید.");
  if (!(amount > 0)) throw new Error("مبلغ تسویه باید بیشتر از صفر باشد.");

  const fromPartner = await getAsync(
    `SELECT id FROM store_partners WHERE id = ? AND isActive = 1`,
    [fromStorePartnerId],
  );
  if (!fromPartner) throw new Error("شریک پرداخت‌کننده معتبر نیست.");

  if (destinationKind === "partner") {
    if (!toStorePartnerId) throw new Error("شریک دریافت‌کننده را انتخاب کنید.");
    if (toStorePartnerId === fromStorePartnerId)
      throw new Error(
        "شریک پرداخت‌کننده و دریافت‌کننده نمی‌توانند یکسان باشند.",
      );
    const toPartner = await getAsync(
      `SELECT id FROM store_partners WHERE id = ? AND isActive = 1`,
      [toStorePartnerId],
    );
    if (!toPartner) throw new Error("شریک دریافت‌کننده معتبر نیست.");
  }

  const result: any = await runAsync(
    `INSERT INTO partner_settlement_transactions (settlementDate, fromStorePartnerId, destinationKind, toStorePartnerId, amount, paymentMethod, referenceNo, notes, createdByUserId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      settlementDate,
      fromStorePartnerId,
      destinationKind,
      toStorePartnerId,
      amount,
      paymentMethod,
      referenceNo,
      notes,
      createdByUserId,
    ],
  );
  const row = await getAsync(
    `SELECT * FROM partner_settlement_transactions WHERE id = ?`,
    [Number(result?.lastID || 0)],
  );
  return row;
};

export const cancelPartnerSettlementTransactionFromDb = async (
  transactionId: number,
): Promise<void> => {
  const id = Number(transactionId) || 0;
  if (!id) throw new Error("شناسه تسویه نامعتبر است.");
  await runAsync(
    `UPDATE partner_settlement_transactions SET status = 'canceled', updatedAt = (strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')) WHERE id = ?`,
    [id],
  );
};
