import type { Repair as FrontendRepair } from "../../types";
import { allAsync, getAsync } from "../db/query";

export const getAllRepairsFromDb = async (
  statusFilter?: string,
): Promise<FrontendRepair[]> => {
  let sql = `
    SELECT r.*, c.fullName as customerFullName, t.partnerName as technicianName
    FROM repairs r
    JOIN customers c ON r.customerId = c.id
    LEFT JOIN partners t ON r.technicianId = t.id
  `;
  const params = [];
  if (statusFilter) {
    sql += " WHERE r.status = ?";
    params.push(statusFilter);
  }
  sql += " ORDER BY r.dateReceived DESC";
  return await allAsync(sql, params);
};

export const getRepairByIdFromDb = async (repairId: number): Promise<any> => {
  const repair = await getAsync(
    `SELECT r.*, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber, t.partnerName as technicianName 
        FROM repairs r 
        JOIN customers c ON r.customerId = c.id 
        LEFT JOIN partners t ON r.technicianId = t.id
        WHERE r.id = ?`,
    [repairId],
  );
  if (!repair) return null;

  const parts = await allAsync(
    `SELECT rp.*, p.name as productName, p.sellingPrice as pricePerItem
         FROM repair_parts rp
         JOIN products p ON rp.productId = p.id
         WHERE rp.repairId = ?`,
    [repairId],
  );

  return { repair, parts };
};

export const getRepairDetailsForSms = async (
  repairId: number,
): Promise<any> => {
  return await getAsync(
    `SELECT r.id, r.deviceModel, r.finalCost, r.estimatedCost, c.fullName as customerFullName, c.phoneNumber as customerPhoneNumber 
       FROM repairs r JOIN customers c ON r.customerId = c.id WHERE r.id = ?`,
    [repairId],
  );
};

export const getRepairsReadyForPickupFromDb = async (): Promise<any[]> => {
  const query = `
SELECT
    r.id,
    r.customerId as customerId,
    r.deviceModel,
    r.finalCost,
    r.status,
    r.dateCompleted,
    c.fullName as customerFullName,
    c.phoneNumber as customerPhoneNumber,
    c.telegram_chat_id as telegramChatId,
    c.telegram_opted_out as telegramOptedOut,
    c.telegram_invalid as telegramInvalid
FROM repairs r
JOIN customers c on r.customerId = c.id
WHERE r.status = 'آماده تحویل'
ORDER BY r.dateCompleted DESC
    `;
  return await allAsync(query);
};
