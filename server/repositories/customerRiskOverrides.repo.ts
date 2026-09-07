import { getAsync, runAsync } from "../db/query";

export type CustomerRiskOverride = "low" | "medium" | "high" | null;

export const setCustomerRiskOverrideInDb = async (
  customerId: number,
  risk: CustomerRiskOverride,
): Promise<any> => {
  await runAsync(`UPDATE customers SET riskOverride = ? WHERE id = ?`, [
    risk,
    customerId,
  ]);
  return await getAsync(`SELECT * FROM customers WHERE id = ?`, [customerId]);
};
