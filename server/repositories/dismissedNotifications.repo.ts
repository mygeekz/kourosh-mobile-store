import { allTypedAsync, runAsync } from "../db/query";

type DismissedNotificationRow = { notificationId: string };

export const dismissNotificationForUser = async (
  userId: number,
  notificationId: string,
): Promise<void> => {
  const nid = String(notificationId || "").trim();
  if (!nid) throw new Error("notificationId خالی است.");
  await runAsync(
    `INSERT OR IGNORE INTO dismissed_notifications (userId, notificationId) VALUES (?, ?)`,
    [userId, nid],
  );
};

export const listDismissedNotificationIdsForUser = async (
  userId: number,
): Promise<string[]> => {
  const rows = await allTypedAsync<DismissedNotificationRow>(
    `SELECT notificationId FROM dismissed_notifications WHERE userId = ?`,
    [userId],
  );
  return rows.map((row) => String(row.notificationId));
};

export const restoreNotificationForUser = async (
  userId: number,
  notificationId: string,
): Promise<void> => {
  const nid = String(notificationId || "").trim();
  if (!nid) throw new Error("notificationId خالی است.");
  await runAsync(
    `DELETE FROM dismissed_notifications WHERE userId = ? AND notificationId = ?`,
    [userId, nid],
  );
};

export const dismissNotificationsForUser = async (
  userId: number,
  notificationIds: string[],
): Promise<number> => {
  const ids = Array.from(
    new Set(
      (notificationIds || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 500);
  if (!ids.length) return 0;
  let changed = 0;
  for (const id of ids) {
    const result = await runAsync(
      `INSERT OR IGNORE INTO dismissed_notifications (userId, notificationId) VALUES (?, ?)`,
      [userId, id],
    );
    changed += result.changes;
  }
  return changed;
};

export const restoreNotificationsForUser = async (
  userId: number,
  notificationIds: string[],
): Promise<number> => {
  const ids = Array.from(
    new Set(
      (notificationIds || [])
        .map((id) => String(id || "").trim())
        .filter(Boolean),
    ),
  ).slice(0, 500);
  if (!ids.length) return 0;
  let changed = 0;
  for (const id of ids) {
    const result = await runAsync(
      `DELETE FROM dismissed_notifications WHERE userId = ? AND notificationId = ?`,
      [userId, id],
    );
    changed += result.changes;
  }
  return changed;
};
