import { allAsync, getAsync, runAsync } from "../db/query";

export type CustomerFollowupPayload = {
  note: string;
  nextFollowupDate?: string | null; // ISO
};

export const addCustomerFollowupToDb = async (
  customerId: number,
  payload: CustomerFollowupPayload,
  actor?: { userId?: number; username?: string },
): Promise<any> => {
  const note = String(payload.note || "").trim();
  if (!note) throw new Error("یادداشت پیگیری خالی است.");
  const nextDate = payload.nextFollowupDate || null;

  const result = await runAsync(
    `INSERT INTO customer_followups (customerId, createdByUserId, createdByUsername, note, nextFollowupDate, status)
     VALUES (?, ?, ?, ?, ?, 'open')`,
    [
      customerId,
      actor?.userId || null,
      actor?.username || null,
      note,
      nextDate,
    ],
  );
  return await getAsync(`SELECT * FROM customer_followups WHERE id = ?`, [
    result.lastID,
  ]);
};

export const listCustomerFollowupsFromDb = async (
  customerId: number,
): Promise<any[]> => {
  return await allAsync(
    `SELECT * FROM customer_followups WHERE customerId = ? ORDER BY createdAt DESC, id DESC`,
    [customerId],
  );
};

export const closeCustomerFollowupInDb = async (
  customerId: number,
  followupId: number,
): Promise<any> => {
  await runAsync(
    `UPDATE customer_followups SET status = 'closed' WHERE id = ? AND customerId = ?`,
    [followupId, customerId],
  );
  return await getAsync(`SELECT * FROM customer_followups WHERE id = ?`, [
    followupId,
  ]);
};

export const updateCustomerFollowupInDb = async (
  customerId: number,
  followupId: number,
  payload: {
    note?: string;
    nextFollowupDate?: string | null;
    status?: "open" | "closed";
  },
): Promise<any> => {
  const updates: string[] = [];
  const params: any[] = [];

  if (payload.note != null) {
    const note = String(payload.note).trim();
    if (!note) throw new Error("یادداشت پیگیری خالی است.");
    updates.push("note = ?");
    params.push(note);
  }

  if (payload.nextFollowupDate !== undefined) {
    updates.push("nextFollowupDate = ?");
    params.push(payload.nextFollowupDate ?? null);
  }

  if (payload.status != null) {
    updates.push("status = ?");
    params.push(payload.status);
  }

  if (updates.length === 0) {
    return await getAsync(
      `SELECT * FROM customer_followups WHERE id = ? AND customerId = ?`,
      [followupId, customerId],
    );
  }

  params.push(followupId, customerId);

  await runAsync(
    `UPDATE customer_followups SET ${updates.join(", ")} WHERE id = ? AND customerId = ?`,
    params,
  );

  return await getAsync(
    `SELECT * FROM customer_followups WHERE id = ? AND customerId = ?`,
    [followupId, customerId],
  );
};
