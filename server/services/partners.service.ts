import {
  partnersRepo,
  type LedgerEntryPayload,
  type PartnerPayload,
} from "../repositories/partners.repo";
import { AppError } from "../errors";

const partnerDependencyLabels: Record<string, string> = {
  ledgerEntries: "رکورد دفتر حساب",
  phones: "گوشی تأمین‌شده",
  products: "کالای مرتبط",
  repairs: "پرونده تعمیر",
  purchases: "سند خرید",
  ownershipLinks: "اتصال مالکیت",
  phoneOwnershipSnapshots: "سابقه مالکیت گوشی",
  productOwnershipSnapshots: "سابقه مالکیت کالا",
};

const normalizePurchasedItem = (row: any) => {
  const qty = Number(row.quantityPurchased ?? row.quantity ?? 0);
  const unitPrice = Number(row.unitPrice ?? row.purchasePrice ?? 0);
  const totalPrice = Number(
    row.totalPrice ?? (qty && unitPrice ? qty * unitPrice : 0),
  );

  return {
    ...row,
    assetKey: `${row.type || "item"}-${row.id}`,
    quantityPurchased: qty,
    quantity: qty,
    unit: String(row.unit || "عدد"),
    purchasePrice: unitPrice,
    totalPrice,
    purchaseDate: row.purchaseDate || row.soldAt || null,
  };
};

const buildProductHistoryMap = async (productIds: number[]) => {
  const productPricingHistoryById = new Map<number, any[]>();
  const pricingRows = await partnersRepo.listProductPricingHistory(productIds);

  for (const row of pricingRows || []) {
    const pid = Number(row.productId || 0);
    if (!pid) continue;
    if (!productPricingHistoryById.has(pid))
      productPricingHistoryById.set(pid, []);
    productPricingHistoryById.get(pid)!.push({ ...row });
  }

  return productPricingHistoryById;
};

const buildPhoneHistoryMap = async (phoneIds: number[]) => {
  const phoneHistoryById = new Map<number, any[]>();
  const normalizedIds = Array.from(new Set((phoneIds || []).map(Number).filter((id) => Number.isInteger(id) && id > 0)));
  normalizedIds.forEach((phoneId) => phoneHistoryById.set(phoneId, []));
  const events = await partnersRepo.listPhoneInventoryEventsBatch(normalizedIds);
  for (const event of events || []) {
    const phoneId = Number(event?.phoneId || 0);
    if (!phoneId) continue;
    if (!phoneHistoryById.has(phoneId)) phoneHistoryById.set(phoneId, []);
    phoneHistoryById.get(phoneId)!.push(event);
  }
  return phoneHistoryById;
};

const buildPurchaseHistory = (
  normalized: any[],
  productPricingHistoryById: Map<number, any[]>,
  phoneHistoryById: Map<number, any[]>,
) =>
  normalized.map((row: any) => {
    const type = String(row.type || "item").trim();
    const systemId =
      type === "phone"
        ? `ph${Number(row.id || 0) || "0"}`
        : type === "product"
          ? `p${Number(row.id || 0) || "0"}`
          : `${type}#${Number(row.id || 0) || "0"}`;

    const history =
      row.type === "product"
        ? (productPricingHistoryById.get(Number(row.id || 0)) || []).map(
            (evt: any) => ({
              kind: "price",
              title: "تغییر قیمت کالا",
              changedAt: evt.createdAt,
              oldPrice: Number(evt.oldPrice || 0),
              newPrice: Number(evt.newPrice || 0),
              source: evt.source || null,
              note: evt.note || null,
            }),
          )
        : row.type === "phone"
          ? (phoneHistoryById.get(Number(row.id || 0)) || []).map(
              (evt: any) => ({
                kind: "phone_event",
                title: evt.title || "رویداد گوشی",
                changedAt: evt.eventDate || evt.createdAt,
                oldPurchasePrice: Number(evt.oldPurchasePrice || 0),
                newPurchasePrice: Number(evt.newPurchasePrice || 0),
                oldSalePrice: Number(evt.oldSalePrice || 0),
                newSalePrice: Number(evt.newSalePrice || 0),
                tone: evt.tone || null,
                icon: evt.icon || null,
                description: evt.description || null,
                metadata: evt.metadata || null,
              }),
            )
          : [];

    return {
      ...row,
      systemId,
      history,
      historyCount: history.length,
      lastHistoryAt: history[0]?.changedAt || null,
    };
  });

export const partnersService = {
  listPartners: (partnerType?: string) =>
    partnersRepo.listPartnersWithBalance(partnerType),

  listPartnersDirectory: (query: Parameters<typeof partnersRepo.listPartnersDirectory>[0]) =>
    partnersRepo.listPartnersDirectory(query),

  createPartner: (payload: PartnerPayload) => partnersRepo.createPartner(payload),

  updatePartner: (id: number, payload: PartnerPayload) =>
    partnersRepo.updatePartner(id, payload),

  deletePartner: async (id: number) => {
    if (!Number.isInteger(id) || id <= 0) throw new AppError("شناسه همکار نامعتبر است.", 400);
    const existing = await partnersRepo.getPartnerById(id);
    if (!existing) throw new AppError("همکار یافت نشد.", 404);
    const dependencies = await partnersRepo.getPartnerDeleteDependencies(id);
    const activeDependencies = Object.entries(dependencies)
      .filter(([, count]) => Number(count) > 0)
      .map(([key, count]) => `${Number(count).toLocaleString("fa-IR")} ${partnerDependencyLabels[key] || key}`);
    if (activeDependencies.length) {
      throw new AppError(
        `حذف همکار به‌دلیل وجود سوابق وابسته مجاز نیست: ${activeDependencies.join("، ")}. برای حفظ تاریخچه مالی و مالکیت، پرونده را نگه دارید.`,
        409,
      );
    }
    const deleted = await partnersRepo.deletePartner(id);
    if (!deleted) throw new AppError("همکار یافت نشد.", 404);
    return true;
  },

  createLedgerEntry: (partnerId: number, payload: LedgerEntryPayload) =>
    partnersRepo.addPartnerLedgerEntry(partnerId, payload),

  updateLedgerEntry: (
    partnerId: number,
    entryId: number,
    payload: Partial<LedgerEntryPayload>,
  ) => partnersRepo.updatePartnerLedgerEntry(partnerId, entryId, payload),

  deleteLedgerEntry: (partnerId: number, entryId: number) =>
    partnersRepo.deletePartnerLedgerEntry(partnerId, entryId),

  getPartnerProfileShell: async (id: number) => {
    const profile = await partnersRepo.getPartnerById(id);
    if (!profile) return null;
    const [ledgerSnapshot, phoneSettlementProfile, purchaseSummary] = await Promise.all([
      partnersRepo.getPartnerLedgerProfileSnapshot(id, 10),
      partnersRepo.getPartnerPhoneSettlementProfileData(id),
      partnersRepo.getPartnerPurchaseSummary(id),
    ]);
    return {
      profile,
      ledgerPreview: ledgerSnapshot.items || [],
      ledgerSummary: ledgerSnapshot.summary || { total: 0, totalDebit: 0, totalCredit: 0, latestBalance: 0 },
      purchaseSummary,
      soldPhoneSettlementSummary: phoneSettlementProfile.summary,
      // Bounded preview only. Full settlement rows are fetched from the paginated directory endpoint.
      soldPhoneSettlementItems: (phoneSettlementProfile.previewItems || []).map(normalizePurchasedItem),
    };
  },

  listPartnerPhoneSettlementDirectory: async (id: number, query: Parameters<typeof partnersRepo.listPartnerPhoneSettlementDirectory>[1]) => {
    const page = await partnersRepo.listPartnerPhoneSettlementDirectory(id, query);
    return { ...page, items: (page.items || []).map(normalizePurchasedItem) };
  },

  getPartnerPhoneSettlementTimeline: async (id: number, phoneId: number, query: Parameters<typeof partnersRepo.getPartnerPhoneSettlementTimeline>[2]) =>
    partnersRepo.getPartnerPhoneSettlementTimeline(id, phoneId, query),

  listPartnerLedgerDirectory: async (id: number, query: Parameters<typeof partnersRepo.listPartnerLedgerDirectory>[1]) => {
    const page = await partnersRepo.listPartnerLedgerDirectory(id, query);
    if (query.includeRelated === false) return { ...page, relatedPurchases: [] };
    const phoneReferenceTypes = new Set([
      "phone_purchase", "phone_purchase_edit", "phone_purchase_reversal_on_edit",
      "phone_settlement_payment", "phone_payment", "product_settlement_phone", "partner_settlement_atomic_submit",
    ]);
    const productReferenceTypes = new Set(["product_purchase", "product_purchase_edit"]);
    const phoneIds = Array.from(new Set((page.items || [])
      .filter((row: any) => phoneReferenceTypes.has(String(row?.referenceType || "")))
      .map((row: any) => Number(row?.referenceId || 0))
      .filter((value: number) => Number.isInteger(value) && value > 0)));
    const productIds = Array.from(new Set((page.items || [])
      .filter((row: any) => productReferenceTypes.has(String(row?.referenceType || "")))
      .map((row: any) => Number(row?.referenceId || 0))
      .filter((value: number) => Number.isInteger(value) && value > 0)));

    if (!phoneIds.length && !productIds.length) return { ...page, relatedPurchases: [] };

    const [relatedRows, productPricingHistoryById, phoneHistoryById] = await Promise.all([
      partnersRepo.getPurchasedItemsScoped(id, {
        includeProducts: productIds.length > 0,
        includePhones: phoneIds.length > 0,
        productIds,
        phoneIds,
      }),
      buildProductHistoryMap(productIds),
      buildPhoneHistoryMap(phoneIds),
    ]);
    const normalized = (relatedRows || []).map(normalizePurchasedItem);
    return {
      ...page,
      relatedPurchases: buildPurchaseHistory(normalized, productPricingHistoryById, phoneHistoryById),
    };
  },

  listPartnerPurchaseDirectory: async (id: number, query: Parameters<typeof partnersRepo.listPartnerPurchaseDirectory>[1]) => {
    const page = await partnersRepo.listPartnerPurchaseDirectory(id, query);
    const normalized = (page.items || []).map(normalizePurchasedItem);
    const productIds = normalized.filter((row: any) => row.type === "product").map((row: any) => Number(row.id)).filter(Boolean);
    const phoneIds = normalized.filter((row: any) => row.type === "phone").map((row: any) => Number(row.id)).filter(Boolean);
    const [productPricingHistoryById, phoneHistoryById] = await Promise.all([
      buildProductHistoryMap(productIds),
      buildPhoneHistoryMap(phoneIds),
    ]);
    return {
      ...page,
      items: buildPurchaseHistory(normalized, productPricingHistoryById, phoneHistoryById),
    };
  },

  getPartnerProfileBundle: async (id: number) => {
    const profile = await partnersRepo.getPartnerById(id);
    if (!profile) return null;

    const ledger = await partnersRepo.getPartnerLedger(id);
    const normalized = (await partnersRepo.getPurchasedItems(id)).map(
      normalizePurchasedItem,
    );

    const productIds = [
      ...new Set(
        normalized
          .filter((r: any) => r.type === "product")
          .map((r: any) => Number(r.id))
          .filter((n: number) => Number.isFinite(n) && n > 0),
      ),
    ];
    const phoneIds = [
      ...new Set(
        normalized
          .filter((r: any) => r.type === "phone")
          .map((r: any) => Number(r.id))
          .filter((n: number) => Number.isFinite(n) && n > 0),
      ),
    ];

    const productPricingHistoryById = await buildProductHistoryMap(productIds);
    const phoneHistoryById = await buildPhoneHistoryMap(phoneIds);
    const purchaseHistory = buildPurchaseHistory(
      normalized,
      productPricingHistoryById,
      phoneHistoryById,
    );

    return { profile, ledger, purchaseHistory };
  },
};
