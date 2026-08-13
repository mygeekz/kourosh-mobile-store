import { allTypedAsync, getTypedAsync } from "../db/query";

export type ProfileItemsTable =
  | "profit_share_profile_items"
  | "ownership_profile_items";

export type OwnershipType = "personal" | "shared" | "store";

export type OwnershipShareInput = {
  storePartnerId: number;
  sharePercent: number;
  sortOrder?: number;
  roleLabel?: string | null;
};

export type NormalizedOwnershipShareInput = {
  storePartnerId: number;
  sharePercent: number;
  sortOrder: number;
  roleLabel?: string | null;
};

export type OwnershipProfileItemRow = {
  id: number;
  storePartnerId: number;
  sharePercent: number;
  sortOrder: number;
  roleLabel?: string | null;
  partnerName: string;
  colorTag: string | null;
};

export type ProfitShareProfileRow = {
  id: number;
  title: string;
  notes: string | null;
  isDefault: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

export type OwnershipProfileRow = {
  id: number;
  title: string;
  ownershipType: OwnershipType;
  notes: string | null;
  profitShareProfileId: number | null;
  profitShareProfileTitle?: string | null;
  isDefault: number;
  isActive: number;
  createdAt: string;
  updatedAt: string;
};

export type ProfitShareProfileWithItems = ProfitShareProfileRow & {
  items: OwnershipProfileItemRow[];
};

export type OwnershipProfileWithItems = OwnershipProfileRow & {
  items: OwnershipProfileItemRow[];
};

type IdRow = {
  id: number;
};

type StorePartnerStatusRow = {
  id: number;
  isActive: number;
};

const toUnknownRecord = (value: unknown): Record<string, unknown> =>
  typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : {};

export const normalizeProfileTitle = (value: unknown, label = "عنوان پروفایل") => {
  const title = String(value || "").trim();
  if (!title) throw new Error(`${label} الزامی است.`);
  if (title.length > 120)
    throw new Error(`${label} نباید بیشتر از ۱۲۰ کاراکتر باشد.`);
  return title;
};

export const normalizeProfileNotes = (value: unknown) => {
  if (value == null) return null;
  const notes = String(value).trim();
  if (!notes) return null;
  if (notes.length > 1000)
    throw new Error("یادداشت پروفایل نباید بیشتر از ۱۰۰۰ کاراکتر باشد.");
  return notes;
};

export const assertProfileTitleUnique = async (
  table: "profit_share_profiles" | "ownership_profiles",
  title: string,
) => {
  const duplicate = await getTypedAsync<IdRow>(
    `SELECT id FROM ${table} WHERE lower(trim(title)) = lower(trim(?)) LIMIT 1`,
    [title],
  );
  if (duplicate?.id)
    throw new Error("پروفایلی با این عنوان از قبل ثبت شده است.");
};

export const normalizeAndValidateShareItems = async (
  rawItems: OwnershipShareInput[] | unknown,
  normalizePercent: (value: number) => number,
  options: { requireActivePartners?: boolean; totalTolerance?: number } = {},
): Promise<NormalizedOwnershipShareInput[]> => {
  const items: unknown[] = Array.isArray(rawItems) ? rawItems : [];
  if (!items.length) throw new Error("حداقل یک شریک برای ساختار سهم لازم است.");
  if (items.length > 100)
    throw new Error("تعداد شرکای یک پروفایل نمی‌تواند بیشتر از ۱۰۰ مورد باشد.");

  const normalized = items.map((rawItem, index) => {
    const item = toUnknownRecord(rawItem);
    const storePartnerId = Number(item.storePartnerId || 0);
    const sharePercent = normalizePercent(Number(item.sharePercent));
    const roleLabel =
      item.roleLabel == null
        ? null
        : String(item.roleLabel).trim().slice(0, 120) || null;
    if (!Number.isInteger(storePartnerId) || storePartnerId <= 0)
      throw new Error("شناسه یکی از شرکا معتبر نیست.");
    if (
      !Number.isFinite(sharePercent) ||
      sharePercent <= 0 ||
      sharePercent > 100
    )
      throw new Error(
        "درصد سهم هر شریک باید بیشتر از صفر و حداکثر ۱۰۰ باشد.",
      );
    return {
      storePartnerId,
      sharePercent,
      sortOrder: Number.isInteger(Number(item.sortOrder))
        ? Number(item.sortOrder)
        : index,
      ...(roleLabel ? { roleLabel } : {}),
    };
  });

  const uniqueIds = new Set(normalized.map((item) => item.storePartnerId));
  if (uniqueIds.size !== normalized.length)
    throw new Error("هر شریک فقط یک‌بار می‌تواند در یک پروفایل سهم ثبت شود.");

  const total = Number(
    normalized.reduce((sum, item) => sum + item.sharePercent, 0).toFixed(2),
  );
  const tolerance = options.totalTolerance ?? 0.01;
  if (Math.abs(total - 100) > tolerance)
    throw new Error(
      `جمع درصد سهم شرکا باید دقیقاً ۱۰۰ باشد؛ مقدار فعلی ${total} است.`,
    );

  const ids = [...uniqueIds];
  const rows = await allTypedAsync<StorePartnerStatusRow>(
    `SELECT id, isActive FROM store_partners WHERE id IN (${ids
      .map(() => "?")
      .join(",")})`,
    ids,
  );
  if (rows.length !== ids.length)
    throw new Error("بخشی از شرکای انتخاب‌شده پیدا نشدند.");
  if (
    options.requireActivePartners !== false &&
    rows.some((row) => Number(row.isActive) !== 1)
  )
    throw new Error("شریک غیرفعال نمی‌تواند در ساختار فعال سهم داشته باشد.");

  return normalized;
};
