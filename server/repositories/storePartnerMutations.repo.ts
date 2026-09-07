import { allAsync, getAsync, runAsync } from "../db/query";

export type StorePartnerCreatePayload = {
  name: string;
  code?: string | null;
  colorTag?: string | null;
  notes?: string | null;
  legacyPartnerId?: number | null;
  legacyPartnerIds?: number[];
  isStore?: number | boolean | null;
};

export type StorePartnerUpdatePayload = {
  name?: string;
  code?: string | null;
  colorTag?: string | null;
  notes?: string | null;
  isActive?: number | boolean;
  isStore?: number | boolean;
  legacyPartnerIds?: number[];
};

const normalizeOptionalText = (value: unknown, maxLength: number) => {
  if (value == null) return null;
  const normalized = String(value).trim();
  if (!normalized) return null;
  if (normalized.length > maxLength)
    throw new Error(`طول مقدار واردشده نباید بیشتر از ${maxLength} کاراکتر باشد.`);
  return normalized;
};

const normalizePartnerName = (value: unknown) => {
  const name = String(value || "").trim();
  if (!name) throw new Error("نام شریک الزامی است.");
  if (name.length > 120) throw new Error("نام شریک نباید بیشتر از ۱۲۰ کاراکتر باشد.");
  return name;
};

const normalizeLegacyIds = (payload: StorePartnerCreatePayload | StorePartnerUpdatePayload) => {
  const values = Array.isArray(payload.legacyPartnerIds)
    ? payload.legacyPartnerIds
    : "legacyPartnerId" in payload && payload.legacyPartnerId
      ? [payload.legacyPartnerId]
      : [];
  return Array.from(
    new Set(
      values
        .map((value) => Number(value))
        .filter((value) => Number.isInteger(value) && value > 0),
    ),
  );
};

const assertPartnerNameUnique = async (name: string, excludeId?: number) => {
  const duplicate = await getAsync(
    `SELECT id FROM store_partners WHERE lower(trim(name)) = lower(trim(?)) ${excludeId ? "AND id <> ?" : ""} LIMIT 1`,
    excludeId ? [name, excludeId] : [name],
  );
  if (duplicate?.id) throw new Error("شریکی با این نام از قبل در ساختار ثبت شده است.");
};

const assertLegacyLinksAvailable = async (legacyPartnerIds: number[], storePartnerId?: number) => {
  if (!legacyPartnerIds.length) return;
  const placeholders = legacyPartnerIds.map(() => "?").join(",");
  const existingPartners = await allAsync(
    `SELECT id FROM partners WHERE id IN (${placeholders})`,
    legacyPartnerIds,
  );
  if (existingPartners.length !== legacyPartnerIds.length)
    throw new Error("بخشی از همکاران قدیمی انتخاب‌شده پیدا نشدند.");

  const params: Array<number> = [...legacyPartnerIds];
  let sql = `SELECT spl.legacyPartnerId, sp.name as storePartnerName, spl.storePartnerId
               FROM store_partner_legacy_links spl
               JOIN store_partners sp ON sp.id = spl.storePartnerId
              WHERE spl.linkType = 'owner' AND spl.legacyPartnerId IN (${placeholders})`;
  if (storePartnerId) {
    sql += " AND spl.storePartnerId <> ?";
    params.push(storePartnerId);
  }
  const conflicts = await allAsync(sql, params);
  if (conflicts.length) {
    const conflictNames = conflicts.map((row: any) => row.storePartnerName).filter(Boolean).join("، ");
    throw new Error(`حداقل یکی از همکاران قدیمی قبلاً به شریک دیگری متصل شده است${conflictNames ? `: ${conflictNames}` : "."}`);
  }
};

export const createStorePartnerFromDb = async (
  payload: StorePartnerCreatePayload,
): Promise<any> => {
  const name = normalizePartnerName(payload.name);
  const code = normalizeOptionalText(payload.code, 64);
  const colorTag = normalizeOptionalText(payload.colorTag, 40);
  const notes = normalizeOptionalText(payload.notes, 1000);
  const legacyPartnerIds = normalizeLegacyIds(payload);

  await assertPartnerNameUnique(name);
  await assertLegacyLinksAvailable(legacyPartnerIds);

  if (payload.isStore) {
    await runAsync(`UPDATE store_partners SET isStore = 0 WHERE isStore = 1`).catch(() => undefined);
  }
  const result = await runAsync(
    `INSERT INTO store_partners (name, code, colorTag, notes, isStore) VALUES (?, ?, ?, ?, ?)`,
    [name, code, colorTag, notes, payload.isStore ? 1 : 0],
  );
  const id = Number(result.lastID);
  for (const legacyPartnerId of legacyPartnerIds) {
    await runAsync(
      `INSERT INTO store_partner_legacy_links (storePartnerId, legacyPartnerId, linkType) VALUES (?, ?, 'owner')`,
      [id, legacyPartnerId],
    );
  }
  return getAsync(`SELECT * FROM store_partners WHERE id = ?`, [id]);
};

export const updateStorePartnerFromDb = async (
  id: number,
  payload: StorePartnerUpdatePayload,
): Promise<any> => {
  if (!Number.isInteger(id) || id <= 0) throw new Error("شناسه شریک معتبر نیست.");
  const current = await getAsync(`SELECT * FROM store_partners WHERE id = ?`, [id]);
  if (!current) throw new Error("شریک موردنظر پیدا نشد.");

  const name = payload.name != null ? normalizePartnerName(payload.name) : String(current.name || "").trim();
  const code = payload.code !== undefined ? normalizeOptionalText(payload.code, 64) : current.code;
  const colorTag = payload.colorTag !== undefined ? normalizeOptionalText(payload.colorTag, 40) : current.colorTag;
  const notes = payload.notes !== undefined ? normalizeOptionalText(payload.notes, 1000) : current.notes;
  const legacyPartnerIds = payload.legacyPartnerIds ? normalizeLegacyIds(payload) : null;

  await assertPartnerNameUnique(name, id);
  if (legacyPartnerIds) await assertLegacyLinksAvailable(legacyPartnerIds, id);

  if (payload.isStore) {
    await runAsync(`UPDATE store_partners SET isStore = 0 WHERE isStore = 1 AND id <> ?`, [id]).catch(() => undefined);
  }
  await runAsync(
    `UPDATE store_partners
        SET name = ?, code = ?, colorTag = ?, notes = ?, isActive = ?, isStore = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc')
      WHERE id = ?`,
    [
      name,
      code,
      colorTag,
      notes,
      payload.isActive === undefined ? current.isActive : payload.isActive ? 1 : 0,
      payload.isStore === undefined ? current.isStore || 0 : payload.isStore ? 1 : 0,
      id,
    ],
  );
  if (legacyPartnerIds) {
    await runAsync(
      `DELETE FROM store_partner_legacy_links WHERE storePartnerId = ? AND linkType = 'owner'`,
      [id],
    );
    for (const legacyPartnerId of legacyPartnerIds) {
      await runAsync(
        `INSERT INTO store_partner_legacy_links (storePartnerId, legacyPartnerId, linkType) VALUES (?, ?, 'owner')`,
        [id, legacyPartnerId],
      );
    }
  }
  return getAsync(`SELECT * FROM store_partners WHERE id = ?`, [id]);
};
