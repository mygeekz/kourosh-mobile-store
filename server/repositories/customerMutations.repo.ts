import { getAsync, runAsync } from "../db/query";

export interface CustomerMutationPayload {
  fullName: string;
  nationalCode?: string | null;
  phoneNumber?: string | null;
  address?: string | null;
  notes?: string | null;
  telegramChatId?: string | null;
}

type CustomerLookup = (customerId: number) => Promise<any>;

export const addCustomerToDb = async (
  customerData: CustomerMutationPayload,
): Promise<any> => {
  const { fullName, nationalCode, phoneNumber, address, notes, telegramChatId } =
    customerData;
  try {
    const result = await runAsync(
      `INSERT INTO customers (fullName, nationalCode, phoneNumber, address, notes, telegramChatId) VALUES (?, ?, ?, ?, ?, ?)`,
      [
        fullName,
        nationalCode || null,
        phoneNumber || null,
        address || null,
        notes || null,
        telegramChatId || null,
      ],
    );
    return await getAsync("SELECT * FROM customers WHERE id = ?", [
      result.lastID,
    ]);
  } catch (err: any) {
    if (
      err.message.includes("UNIQUE constraint failed: customers.phoneNumber")
    ) {
      throw new Error("این شماره تماس قبلا برای مشتری دیگری ثبت شده است.");
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const updateCustomerInDb = async (
  customerId: number,
  customerData: CustomerMutationPayload,
  deps: { getCustomerById: CustomerLookup },
): Promise<any> => {
  const { fullName, nationalCode, phoneNumber, address, notes, telegramChatId } =
    customerData;
  try {
    await runAsync(
      `UPDATE customers SET fullName = ?, nationalCode = ?, phoneNumber = ?, address = ?, notes = ?, telegramChatId = ? WHERE id = ?`,
      [
        fullName,
        nationalCode || null,
        phoneNumber || null,
        address || null,
        notes || null,
        telegramChatId || null,
        customerId,
      ],
    );
    return await deps.getCustomerById(customerId);
  } catch (err: any) {
    if (
      err.message.includes("UNIQUE constraint failed: customers.phoneNumber")
    ) {
      throw new Error("این شماره تماس قبلا برای مشتری دیگری ثبت شده است.");
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const updateCustomerTagsInDb = async (
  customerId: number,
  tags: string[],
  deps: { getCustomerById: CustomerLookup },
): Promise<any> => {
  const clean = (tags || [])
    .map((t) => String(t || "").trim())
    .filter(Boolean)
    .slice(0, 50);
  await runAsync(`UPDATE customers SET tags = ? WHERE id = ?`, [
    JSON.stringify(clean),
    customerId,
  ]);
  return await deps.getCustomerById(customerId);
};

export const deleteCustomerFromDb = async (
  customerId: number,
): Promise<boolean> => {
  const result = await runAsync(`DELETE FROM customers WHERE id = ?`, [
    customerId,
  ]);
  return result.changes > 0;
};
