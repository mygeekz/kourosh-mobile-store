import { allAsync, getAsync, runAsync } from "../db/query";

export interface CustomerManagerNoteCreateInput {
  customerId: number;
  context: string;
  note: string;
  userId?: number | null;
  username?: string | null;
  roleName?: string | null;
}

export const listCustomerManagerNotesFromRepo = (customerId: number) =>
  allAsync(
    `SELECT id, customerId, context, note, createdByUserId, createdByUsername, createdByRole, createdAt, updatedAt
       FROM customer_manager_notes
      WHERE customerId = ? AND COALESCE(isDeleted, 0) = 0
      ORDER BY datetime(createdAt) DESC, id DESC
      LIMIT 50`,
    [customerId],
  );

export const createCustomerManagerNoteInRepo = async (
  input: CustomerManagerNoteCreateInput,
) => {
  const saved = await runAsync(
    `INSERT INTO customer_manager_notes
      (customerId, context, note, createdByUserId, createdByUsername, createdByRole)
     VALUES (?, ?, ?, ?, ?, ?)`,
    [
      input.customerId,
      input.context || "یادداشت مدیریتی",
      input.note,
      input.userId || null,
      input.username || null,
      input.roleName || null,
    ],
  );

  return getAsync(
    `SELECT id, customerId, context, note, createdByUserId, createdByUsername, createdByRole, createdAt, updatedAt
       FROM customer_manager_notes
      WHERE id = ?`,
    [saved.lastID],
  );
};

export const deleteCustomerManagerNoteInRepo = (
  customerId: number,
  noteId: number,
) =>
  runAsync(
    `UPDATE customer_manager_notes
        SET isDeleted = 1, updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
      WHERE id = ? AND customerId = ? AND COALESCE(isDeleted, 0) = 0`,
    [noteId, customerId],
  );
