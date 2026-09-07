import { getAsync, runAsync } from "../db/query";

export interface PartnerPayload {
  partnerName: string;
  partnerType: string;
  contactPerson?: string | null;
  phoneNumber?: string | null;
  email?: string | null;
  address?: string | null;
  notes?: string | null;
  telegramChatId?: string | null;
}

export const addPartnerToDb = async (
  partnerData: PartnerPayload,
): Promise<any> => {
  const {
    partnerName,
    partnerType,
    contactPerson,
    phoneNumber,
    email,
    address,
    notes,
    telegramChatId,
  } = partnerData;
  try {
    const result = await runAsync(
      `INSERT INTO partners (partnerName, partnerType, contactPerson, phoneNumber, email, address, notes, telegramChatId) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        partnerName,
        partnerType,
        contactPerson || null,
        phoneNumber || null,
        email || null,
        address || null,
        notes || null,
        telegramChatId || null,
      ],
    );
    return await getAsync("SELECT * FROM partners WHERE id = ?", [
      result.lastID,
    ]);
  } catch (err: any) {
    if (
      err.message.includes("UNIQUE constraint failed: partners.phoneNumber")
    ) {
      throw new Error("این شماره تماس قبلا برای همکار دیگری ثبت شده است.");
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const updatePartnerInDb = async (
  partnerId: number,
  partnerData: PartnerPayload,
  deps: {
    getPartnerById: (partnerId: number) => Promise<any>;
  },
): Promise<any> => {
  const {
    partnerName,
    partnerType,
    contactPerson,
    phoneNumber,
    email,
    address,
    notes,
    telegramChatId,
  } = partnerData;
  try {
    await runAsync(
      `UPDATE partners SET partnerName = ?, partnerType = ?, contactPerson = ?, phoneNumber = ?, email = ?, address = ?, notes = ?, telegramChatId = ? 
       WHERE id = ?`,
      [
        partnerName,
        partnerType,
        contactPerson || null,
        phoneNumber || null,
        email || null,
        address || null,
        notes || null,
        telegramChatId || null,
        partnerId,
      ],
    );
    return await deps.getPartnerById(partnerId);
  } catch (err: any) {
    if (
      err.message.includes("UNIQUE constraint failed: partners.phoneNumber")
    ) {
      throw new Error("این شماره تماس قبلا برای همکار دیگری ثبت شده است.");
    }
    if (
      err.message.includes(
        "NOT NULL constraint failed: partners.partnerName",
      ) ||
      err.message.includes("NOT NULL constraint failed: partners.partnerType")
    ) {
      throw new Error("نام همکار و نوع همکار نمی‌توانند خالی باشند.");
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};


export const getPartnerDeleteDependenciesFromDb = async (partnerId: number): Promise<Record<string, number>> => {
  const row = await getAsync(
    `SELECT
      (SELECT COUNT(*) FROM partner_ledger WHERE partnerId = ?) AS ledgerEntries,
      (SELECT COUNT(*) FROM phones WHERE supplierId = ?) AS phones,
      (SELECT COUNT(*) FROM products WHERE supplierId = ?) AS products,
      (SELECT COUNT(*) FROM repairs WHERE technicianId = ?) AS repairs,
      (SELECT COUNT(*) FROM purchases WHERE supplierId = ?) AS purchases,
      (SELECT COUNT(*) FROM store_partner_legacy_links WHERE legacyPartnerId = ?) AS ownershipLinks,
      (SELECT COUNT(*) FROM phone_ownership_snapshots WHERE sourceLegacyPartnerId = ?) AS phoneOwnershipSnapshots,
      (SELECT COUNT(*) FROM product_ownership_snapshots WHERE sourceLegacyPartnerId = ?) AS productOwnershipSnapshots`,
    [partnerId, partnerId, partnerId, partnerId, partnerId, partnerId, partnerId, partnerId],
  );
  return {
    ledgerEntries: Number(row?.ledgerEntries || 0),
    phones: Number(row?.phones || 0),
    products: Number(row?.products || 0),
    repairs: Number(row?.repairs || 0),
    purchases: Number(row?.purchases || 0),
    ownershipLinks: Number(row?.ownershipLinks || 0),
    phoneOwnershipSnapshots: Number(row?.phoneOwnershipSnapshots || 0),
    productOwnershipSnapshots: Number(row?.productOwnershipSnapshots || 0),
  };
};

export const deletePartnerFromDb = async (
  partnerId: number,
): Promise<boolean> => {
  const result = await runAsync(`DELETE FROM partners WHERE id = ?`, [
    partnerId,
  ]);
  return result.changes > 0;
};
