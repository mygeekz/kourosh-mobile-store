import moment from "jalali-moment";
import { getDbInstance } from "../core/runtimeBindings";
import { allAsync, execAsync, getAsync, runAsync } from "../query";
import { fromShamsiStringToISO } from "../date";
import { resolvePhoneCostBasisAmount, syncPhoneCostBasisSnapshots } from "../phoneCostBasis";
import {
  getPhoneHistoryEventClass,
  resolveHistoryWindow,
  resolvePhoneHistoryActor,
} from "./phoneHistory.db";
import { addPartnerLedgerEntryInternal, PHONE_PURCHASE_LEDGER_REFERENCE_TYPES, stringifyLedgerChangeHistory, buildPhonePurchaseDescription, fetchLatestPurchaseLedgerRowForReference } from "./ledgerSupport.db";
import { normalizePhonePurchaseLedgers } from "../core/maintenance";
import { recalcPartnerBalances } from "./partners.db";
import { safeJsonStringify, safeJsonParse, normalizeMoney } from "../core/json";
import { normalizePhoneBatteryHealth } from "../../utils/phoneSpecification";

import type {
  ProductPayload,
  UpdateProductPayload,
  PhoneEntryPayload,
  PhoneBulkPurchasePayload,
  PhoneEntryUpdatePayload,
  PhoneHistoryActor,
  PhoneInventoryEventPayload,
  SaleDataPayload,
  CustomerPayload,
  LedgerEntryPayload,
  PartnerPayload,
  OldMobilePhonePayload,
  CheckStatus,
  InstallmentPaymentStatus,
  InstallmentCheckInfo,
  InstallmentSalePayload,
  UserUpdatePayload,
  UserForDb,
  RfmItem,
  CohortRow,
  LedgerChangeHistoryEntry,
  RepairFinancialSummary,
  DashboardLayoutsPayload,
  OverallStatus,
  SavedFilterRow,
  InventoryTurnoverReport,
  DeadStockItem,
  AbcItem,
  AgingBucket,
  AgingReceivableRow,
  CashflowDay,
  CashflowReport,
  ShareInput,
  ProfitShareLine,
  ResolvedOwnershipContext,
  SaleProfitSnapshotItemInput,
} from "../core/types";

export const addPhoneInventoryEventToDb = async (
  phoneId: number | null,
  payload: PhoneInventoryEventPayload,
): Promise<any> => {
  await getDbInstance();
  const actor = resolvePhoneHistoryActor(payload.actor);
  const result = await runAsync(
    `INSERT INTO phone_inventory_events (
      phoneId, eventType, title, description, eventDate, tone, icon,
      oldStatus, newStatus, oldPurchasePrice, newPurchasePrice, oldSalePrice, newSalePrice,
      actorUserId, actorUsername, actorDisplayName, metadata
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      phoneId ?? null,
      payload.eventType,
      payload.title,
      payload.description || null,
      payload.eventDate || null,
      payload.tone || null,
      payload.icon || null,
      payload.oldStatus || null,
      payload.newStatus || null,
      normalizeMoney(payload.oldPurchasePrice),
      normalizeMoney(payload.newPurchasePrice),
      normalizeMoney(payload.oldSalePrice),
      normalizeMoney(payload.newSalePrice),
      actor.userId,
      actor.username,
      actor.displayName,
      safeJsonStringify(payload.metadata),
    ],
  );
  return await getAsync(`SELECT * FROM phone_inventory_events WHERE id = ?`, [
    result.lastID,
  ]);
};

export const listPhoneInventoryEventsFromDb = async (
  phoneId: number,
): Promise<any[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT * FROM phone_inventory_events WHERE phoneId = ? ORDER BY datetime(COALESCE(eventDate, createdAt)) DESC, id DESC`,
    [phoneId],
  );
  return (rows || []).map((row: any) => ({
    ...row,
    metadata: safeJsonParse(row.metadata),
  }));
};

export const getPhoneInventoryChangeReportFromDb = async (filters?: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  await getDbInstance();
  const { safeDays, sinceIso, untilIso, hasCustomRange } =
    resolveHistoryWindow(filters);
  const rows =
    (await allAsync(
      `SELECT * FROM phone_inventory_events
      WHERE datetime(COALESCE(eventDate, createdAt)) >= datetime(?)
        AND datetime(COALESCE(eventDate, createdAt)) <= datetime(?)
      ORDER BY datetime(COALESCE(eventDate, createdAt)) DESC, id DESC`,
      [sinceIso, untilIso],
    )) || [];
  const parsedRows = rows.map((row: any) => ({
    ...row,
    metadata: safeJsonParse(row.metadata),
  }));
  const statusChanges = parsedRows.filter(
    (row: any) =>
      row.oldStatus != null &&
      row.newStatus != null &&
      row.oldStatus !== row.newStatus,
  ).length;
  const purchasePriceChanges = parsedRows.filter(
    (row: any) =>
      normalizeMoney(row.oldPurchasePrice) !==
        normalizeMoney(row.newPurchasePrice) &&
      (row.oldPurchasePrice != null || row.newPurchasePrice != null),
  ).length;
  const salePriceChanges = parsedRows.filter(
    (row: any) =>
      normalizeMoney(row.oldSalePrice) !== normalizeMoney(row.newSalePrice) &&
      (row.oldSalePrice != null || row.newSalePrice != null),
  ).length;
  const priceChanges = parsedRows.filter(
    (row: any) =>
      (normalizeMoney(row.oldPurchasePrice) !==
        normalizeMoney(row.newPurchasePrice) ||
        normalizeMoney(row.oldSalePrice) !==
          normalizeMoney(row.newSalePrice)) &&
      (row.oldPurchasePrice != null ||
        row.newPurchasePrice != null ||
        row.oldSalePrice != null ||
        row.newSalePrice != null),
  ).length;
  const criticalEvents = parsedRows.filter(
    (row: any) =>
      ["deleted", "returned", "sale_returned"].includes(
        String(row.eventType || ""),
      ) || ["rose", "amber"].includes(String(row.tone || "")),
  ).length;
  return {
    windowDays: safeDays,
    hasCustomRange,
    startDate: sinceIso,
    endDate: untilIso,
    totalEvents: parsedRows.length,
    statusChanges,
    priceChanges,
    purchasePriceChanges,
    salePriceChanges,
    criticalEvents,
    recentEvents: parsedRows.slice(0, 12),
  };
};

export const searchPhoneInventoryEventsFromDb = async (filters?: {
  days?: number;
  startDate?: string;
  endDate?: string;
  q?: string;
  eventClass?: string;
  model?: string;
  limit?: number;
}): Promise<any[]> => {
  await getDbInstance();
  const { sinceIso, untilIso } = resolveHistoryWindow(filters);
  const safeLimit =
    Number.isFinite(Number(filters?.limit)) && Number(filters?.limit) > 0
      ? Math.min(500, Number(filters?.limit))
      : 120;
  const rows =
    (await allAsync(
      `SELECT e.*, p.model AS phoneModel, p.imei AS phoneImei, p.status AS currentStatus
       FROM phone_inventory_events e
       LEFT JOIN phones p ON p.id = e.phoneId
      WHERE datetime(COALESCE(e.eventDate, e.createdAt)) >= datetime(?)
        AND datetime(COALESCE(e.eventDate, e.createdAt)) <= datetime(?)
      ORDER BY datetime(COALESCE(e.eventDate, e.createdAt)) DESC, e.id DESC`,
      [sinceIso, untilIso],
    )) || [];

  const q = String(filters?.q || "")
    .trim()
    .toLowerCase();
  const wantedClass = String(filters?.eventClass || "all");
  const wantedModel = String(filters?.model || "all").trim();

  return rows
    .map((row: any) => {
      const parsed = { ...row, metadata: safeJsonParse(row.metadata) };
      return { ...parsed, eventClass: getPhoneHistoryEventClass(parsed) };
    })
    .filter((row: any) => {
      if (wantedClass !== "all" && row.eventClass !== wantedClass) return false;
      if (
        wantedModel !== "all" &&
        String(row.phoneModel || "").trim() !== wantedModel
      )
        return false;
      if (!q) return true;
      const haystack = [
        row.title,
        row.description,
        row.actorDisplayName,
        row.actorUsername,
        row.phoneModel,
        row.phoneImei,
        row.currentStatus,
        Array.isArray(row.metadata?.changes)
          ? row.metadata.changes.join(" ")
          : "",
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    })
    .slice(0, safeLimit);
};

export const getPhoneInventoryEnterpriseReportFromDb = async (filters?: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  const rows = await searchPhoneInventoryEventsFromDb({
    ...filters,
    limit: 500,
    eventClass: "all",
  });
  const { safeDays, sinceIso, untilIso, hasCustomRange } =
    resolveHistoryWindow(filters);
  const priceChanges = rows.filter(
    (row: any) => row.eventClass === "price",
  ).length;
  const statusChanges = rows.filter(
    (row: any) => row.eventClass === "status",
  ).length;
  const criticalEvents = rows.filter(
    (row: any) => row.eventClass === "critical",
  ).length;

  const modelMap = new Map<
    string,
    {
      model: string;
      totalChanges: number;
      priceChanges: number;
      statusChanges: number;
      criticalEvents: number;
    }
  >();
  const actorMap = new Map<string, { actor: string; totalChanges: number }>();

  for (const row of rows) {
    const model = String(row.phoneModel || "نامشخص").trim() || "نامشخص";
    const modelAgg = modelMap.get(model) || {
      model,
      totalChanges: 0,
      priceChanges: 0,
      statusChanges: 0,
      criticalEvents: 0,
    };
    modelAgg.totalChanges += 1;
    if (row.eventClass === "price") modelAgg.priceChanges += 1;
    if (row.eventClass === "status") modelAgg.statusChanges += 1;
    if (row.eventClass === "critical") modelAgg.criticalEvents += 1;
    modelMap.set(model, modelAgg);

    const actor =
      String(row.actorDisplayName || row.actorUsername || "نامشخص").trim() ||
      "نامشخص";
    const actorAgg = actorMap.get(actor) || { actor, totalChanges: 0 };
    actorAgg.totalChanges += 1;
    actorMap.set(actor, actorAgg);
  }

  return {
    windowDays: safeDays,
    hasCustomRange,
    startDate: sinceIso,
    endDate: untilIso,
    totalEvents: rows.length,
    filteredEvents: rows.length,
    priceChanges,
    statusChanges,
    criticalEvents,
    eventClassCounts: [
      { key: "price", label: "تغییر قیمت", count: priceChanges },
      { key: "status", label: "تغییر وضعیت", count: statusChanges },
      { key: "critical", label: "رویداد حساس", count: criticalEvents },
      {
        key: "audit",
        label: "ثبت/ویرایش عمومی",
        count: rows.filter((row: any) => row.eventClass === "audit").length,
      },
    ],
    topModels: Array.from(modelMap.values())
      .sort((a, b) => b.totalChanges - a.totalChanges)
      .slice(0, 6),
    topActors: Array.from(actorMap.values())
      .sort((a, b) => b.totalChanges - a.totalChanges)
      .slice(0, 6),
    recentCriticalEvents: rows
      .filter((row: any) => row.eventClass === "critical")
      .slice(0, 8),
  };
};

type PhoneEntryInsertContext = {
  actor?: PhoneHistoryActor | null;
  purchaseBatchId?: string | null;
  registerDate?: string;
};

const insertPhoneEntryWithinTransaction = async (
  phoneData: PhoneEntryPayload,
  context: PhoneEntryInsertContext = {},
): Promise<any> => {
  const {
    model,
    color,
    storage,
    ram,
    imei,
    batteryHealth,
    condition,
    purchasePrice,
    currentPurchasePrice,
    salePrice,
    sellerName,
    purchaseDate,
    supplierId,
  } = phoneData;

  const registerDate =
    context.registerDate || phoneData.registerDate || new Date().toISOString();
  const status = phoneData.status || "موجود در انبار";
  const canonicalBatteryHealth = normalizePhoneBatteryHealth(
    condition,
    batteryHealth,
  );
  const purchaseBatchId = context.purchaseBatchId || null;

  const normalizedModel = String(model || "").trim();
  const normalizedColor = String(color || "").trim();

  // Keep the searchable phone metadata lists synchronized with real inventory.
  // A model/color typed manually during registration becomes reusable immediately.
  if (normalizedModel) {
    await runAsync("INSERT OR IGNORE INTO phone_models (name) VALUES (?)", [normalizedModel]);
  }
  if (normalizedColor) {
    await runAsync("INSERT OR IGNORE INTO phone_colors (name) VALUES (?)", [normalizedColor]);
  }

  const existingPhone = await getAsync(
    "SELECT id FROM phones WHERE imei = ?",
    [imei],
  );
  if (existingPhone) {
    throw new Error(`شماره IMEI تکراری است: ${imei}`);
  }

  const result = await runAsync(
    `INSERT INTO phones (model, color, storage, ram, imei, batteryHealth, condition, purchasePrice, currentPurchasePrice, currentPurchasePriceUpdatedAt, salePrice, sellerName, purchaseDate, saleDate, registerDate, status, notes, supplierId)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      normalizedModel || model,
      normalizedColor || color,
      storage,
      ram,
      imei,
      canonicalBatteryHealth,
      condition,
      purchasePrice,
      currentPurchasePrice != null && Number(currentPurchasePrice) > 0
        ? Number(currentPurchasePrice)
        : purchasePrice,
      new Date().toISOString(),
      salePrice,
      sellerName,
      purchaseDate,
      null,
      registerDate,
      status,
      phoneData.notes,
      supplierId,
    ],
  );
  const newPhoneId = result.lastID;

  if (supplierId && purchasePrice > 0) {
    const description = buildPhonePurchaseDescription({
      model: normalizedModel || model,
      imei,
      id: newPhoneId,
      purchasePrice,
    });
    const historyJson = JSON.stringify([
      {
        changedAt: registerDate,
        reason: purchaseBatchId
          ? "bulk_phone_purchase"
          : "initial_phone_purchase",
        after: {
          partnerId: supplierId,
          debit: 0,
          credit: purchasePrice,
          transactionDate: purchaseDate || registerDate,
          description,
          phoneId: newPhoneId,
          model: normalizedModel || model,
          imei,
          purchasePrice,
          purchaseBatchId,
        },
      },
    ]);
    await addPartnerLedgerEntryInternal(
      supplierId,
      description,
      0,
      purchasePrice,
      purchaseDate || registerDate,
      "phone_purchase",
      newPhoneId,
      undefined,
      historyJson,
    );
  }

  await addPhoneInventoryEventToDb(newPhoneId, {
    eventType: "created",
    title: "ثبت اولیه دستگاه",
    description: `دستگاه ${normalizedModel || model} با وضعیت «${status}» وارد انبار شد.`,
    eventDate: registerDate,
    tone: "slate",
    icon: "fa-box-archive",
    newStatus: status,
    newPurchasePrice: purchasePrice,
    newSalePrice: salePrice ?? null,
    metadata: {
      model: normalizedModel || model,
      imei,
      condition,
      batteryHealth: batteryHealth ?? null,
      purchaseBatchId,
    },
    actor: context.actor,
  });

  if (purchaseDate || supplierId) {
    await addPhoneInventoryEventToDb(newPhoneId, {
      eventType: "acquisition_snapshot",
      title: purchaseBatchId ? "ثبت خرید گروهی و تامین" : "ثبت خرید و تامین",
      description: supplierId
        ? `ورود از تامین‌کننده${phoneData.sellerName ? ` / ثبت‌کننده: ${phoneData.sellerName}` : ""}`
        : `خرید بدون تامین‌کننده مشخص${phoneData.sellerName ? ` / ثبت‌کننده: ${phoneData.sellerName}` : ""}`,
      eventDate: purchaseDate || registerDate,
      tone: "sky",
      icon: "fa-truck-ramp-box",
      newPurchasePrice: purchasePrice,
      metadata: {
        supplierId: supplierId ?? null,
        sellerName: sellerName ?? null,
        purchaseBatchId,
      },
      actor: context.actor,
    });
  }

  if (salePrice != null && Number(salePrice) > 0) {
    await addPhoneInventoryEventToDb(newPhoneId, {
      eventType: "pricing_initialized",
      title: "ثبت قیمت فروش اولیه",
      description: `برای دستگاه یک قیمت فروش اولیه تعریف شد.`,
      eventDate: purchaseDate || registerDate,
      tone: "emerald",
      icon: "fa-tags",
      newPurchasePrice: purchasePrice,
      newSalePrice: salePrice,
      metadata: purchaseBatchId ? { purchaseBatchId } : undefined,
      actor: context.actor,
    });
  }

  if (batteryHealth != null && String(batteryHealth) !== "") {
    await addPhoneInventoryEventToDb(newPhoneId, {
      eventType: "battery_snapshot",
      title: "ثبت سلامت باتری",
      description: `سلامت باتری در زمان ورود ثبت شد.`,
      eventDate: registerDate,
      tone:
        Number(batteryHealth) >= 85
          ? "emerald"
          : Number(batteryHealth) >= 75
            ? "amber"
            : "rose",
      icon: "fa-battery-three-quarters",
      metadata: {
        batteryHealth: Number(batteryHealth),
        purchaseBatchId,
      },
      actor: context.actor,
    });
  }

  return await getAsync(
    `SELECT ph.*, pa.partnerName as supplierName
     FROM phones ph
     LEFT JOIN partners pa ON ph.supplierId = pa.id
     WHERE ph.id = ?`,
    [newPhoneId],
  );
};

export const addPhoneEntryToDb = async (
  phoneData: PhoneEntryPayload,
  actor?: PhoneHistoryActor | null,
): Promise<any> => {
  await getDbInstance();
  try {
    await execAsync("BEGIN IMMEDIATE TRANSACTION;");
    const createdPhone = await insertPhoneEntryWithinTransaction(phoneData, {
      actor,
    });
    await execAsync("COMMIT;");
    return createdPhone;
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch((rbErr) =>
      console.error("Rollback failed in addPhoneEntryToDb:", rbErr),
    );
    console.error("DB Error (addPhoneEntryToDb):", err);
    if (
      err.message.includes("UNIQUE constraint failed: phones.imei") ||
      err.message.includes("شماره IMEI تکراری است")
    ) {
      throw new Error(err.message.includes(":") ? err.message : "شماره IMEI تکراری است.");
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const addPhoneEntriesBulkToDb = async (
  bulkPayload: PhoneBulkPurchasePayload,
  actor?: PhoneHistoryActor | null,
): Promise<any> => {
  await getDbInstance();
  const supplierId = Number(bulkPayload.supplierId);
  const purchaseDate = String(bulkPayload.purchaseDate || "").trim();
  const items = Array.isArray(bulkPayload.items) ? bulkPayload.items : [];
  const purchaseBatchId = `phone-purchase-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  const registerDate = new Date().toISOString();

  try {
    await execAsync("BEGIN IMMEDIATE TRANSACTION;");

    const supplier = await getAsync(
      "SELECT id, partnerName FROM partners WHERE id = ?",
      [supplierId],
    );
    if (!supplier) {
      throw new Error("تامین‌کننده انتخاب‌شده در سیستم پیدا نشد.");
    }

    const uniqueImeis = new Set<string>();
    for (const item of items) {
      const imei = String(item.imei || "").trim();
      if (uniqueImeis.has(imei)) {
        throw new Error(`IMEI تکراری داخل فاکتور خرید: ${imei}`);
      }
      uniqueImeis.add(imei);
    }

    if (uniqueImeis.size > 0) {
      const placeholders = Array.from(uniqueImeis).map(() => "?").join(", ");
      const existing = await allAsync(
        `SELECT imei FROM phones WHERE imei IN (${placeholders})`,
        Array.from(uniqueImeis),
      );
      if (existing.length > 0) {
        throw new Error(
          `IMEI قبلاً در موجودی ثبت شده است: ${existing.map((row: any) => row.imei).join("، ")}`,
        );
      }
    }

    const createdPhones: any[] = [];
    for (const item of items) {
      const phonePayload: PhoneEntryPayload = {
        model: String(item.model || "").trim(),
        color: String(item.color || "").trim() || null,
        storage: String(item.storage || "").trim() || null,
        ram: String(item.ram || "").trim() || null,
        imei: String(item.imei || "").trim(),
        purchasePrice: Number(item.purchasePrice || 0),
        currentPurchasePrice: Number(item.purchasePrice || 0),
        supplierId,
        purchaseDate,
        registerDate,
        status: "موجود در انبار",
      };
      createdPhones.push(
        await insertPhoneEntryWithinTransaction(phonePayload, {
          actor,
          purchaseBatchId,
          registerDate,
        }),
      );
    }

    await execAsync("COMMIT;");
    return {
      purchaseBatchId,
      supplierId,
      supplierName: supplier.partnerName,
      purchaseDate,
      count: createdPhones.length,
      totalPurchase: createdPhones.reduce(
        (sum, phone) => sum + Number(phone.purchasePrice || 0),
        0,
      ),
      items: createdPhones,
    };
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch((rbErr) =>
      console.error("Rollback failed in addPhoneEntriesBulkToDb:", rbErr),
    );
    console.error("DB Error (addPhoneEntriesBulkToDb):", err);
    if (
      err.message.includes("UNIQUE constraint failed: phones.imei") ||
      err.message.includes("IMEI")
    ) {
      throw new Error(err.message);
    }
    throw new Error(`خطا در ثبت گروهی خرید گوشی: ${err.message}`);
  }
};

export const updatePhoneEntryInDb = async (
  phoneId: number,
  phoneData: PhoneEntryUpdatePayload,
  actor?: PhoneHistoryActor | null,
): Promise<any> => {
  await getDbInstance();
  const {
    model,
    color,
    storage,
    ram,
    imei,
    batteryHealth,
    condition,
    purchasePrice,
    currentPurchasePrice,
    salePrice,
    sellerName,
    purchaseDate, // purchaseDate can be Shamsi from DatePicker
    status,
    notes,
    supplierId,
  } = phoneData;

  const existingPhone = await getAsync("SELECT * FROM phones WHERE id = ?", [
    phoneId,
  ]);
  if (!existingPhone) {
    throw new Error("گوشی برای بروزرسانی یافت نشد.");
  }

  if (imei && imei !== existingPhone.imei) {
    const imeiExists = await getAsync(
      "SELECT id FROM phones WHERE imei = ? AND id != ?",
      [imei, phoneId],
    );
    if (imeiExists) {
      throw new Error("شماره IMEI جدید تکراری است.");
    }
  }

  await execAsync("BEGIN TRANSACTION;");
  const affectedPartners = new Set<number>();
  try {
    // Handle ledger adjustments if purchasePrice or supplierId changes
    const newPurchasePrice =
      purchasePrice !== undefined &&
      purchasePrice !== null &&
      String(purchasePrice).trim() !== ""
        ? Number(purchasePrice)
        : Number(existingPhone.purchasePrice || 0);
    const newSupplierId =
      supplierId !== undefined &&
      supplierId !== null &&
      String(supplierId).trim() !== ""
        ? Number(supplierId)
        : existingPhone.supplierId;
    const effectivePurchaseDate = purchaseDate
      ? fromShamsiStringToISO(purchaseDate) || new Date().toISOString()
      : existingPhone.purchaseDate || new Date().toISOString();
    const nowIso = new Date().toISOString();
    const shouldSyncPurchaseLedger =
      newPurchasePrice !== Number(existingPhone.purchasePrice || 0) ||
      newSupplierId !== existingPhone.supplierId ||
      String(model || existingPhone.model || "") !==
        String(existingPhone.model || "") ||
      String(imei || existingPhone.imei || "") !==
        String(existingPhone.imei || "");
    if (shouldSyncPurchaseLedger) {
      const previousLedgerRow = await fetchLatestPurchaseLedgerRowForReference(
        phoneId,
        PHONE_PURCHASE_LEDGER_REFERENCE_TYPES,
      );
      const syncPartnerId = Number(
        newSupplierId ||
          previousLedgerRow?.partnerId ||
          existingPhone.supplierId ||
          0,
      );
      if (!syncPartnerId) {
        throw new Error(
          "همکار تأمین‌کننده برای همگام‌سازی دفتر خرید مشخص نیست.",
        );
      }
      const phoneLabel = [
        model || existingPhone.model,
        imei || existingPhone.imei ? `IMEI: ${imei || existingPhone.imei}` : "",
        `شناسه: ${phoneId}`,
      ]
        .filter(Boolean)
        .join(" • ");
      const nextDescription = buildPhonePurchaseDescription({
        model: model || existingPhone.model,
        imei: imei || existingPhone.imei,
        id: phoneId,
        purchasePrice: newPurchasePrice,
      });
      const beforeSnapshot = previousLedgerRow
        ? {
            partnerId:
              Number(
                previousLedgerRow.partnerId || existingPhone.supplierId || 0,
              ) || null,
            debit: Number(previousLedgerRow.debit || 0),
            credit: Number(previousLedgerRow.credit || 0),
            transactionDate: String(previousLedgerRow.transactionDate || ""),
            description: String(previousLedgerRow.description || ""),
            referenceType: String(previousLedgerRow.referenceType || ""),
            referenceId:
              Number(previousLedgerRow.referenceId || phoneId) || phoneId,
            supplierId: existingPhone.supplierId ?? null,
            purchasePrice: Number(existingPhone.purchasePrice || 0),
          }
        : {
            partnerId: existingPhone.supplierId ?? null,
            debit: 0,
            credit: Number(existingPhone.purchasePrice || 0),
            transactionDate: String(existingPhone.purchaseDate || ""),
            description: buildPhonePurchaseDescription({
              model: existingPhone.model,
              imei: existingPhone.imei,
              id: phoneId,
              purchasePrice: Number(existingPhone.purchasePrice || 0),
            }),
            referenceType: "phone_purchase",
            referenceId: phoneId,
            supplierId: existingPhone.supplierId ?? null,
            purchasePrice: Number(existingPhone.purchasePrice || 0),
          };
      const historyJson = stringifyLedgerChangeHistory(
        (previousLedgerRow as any)?.changeHistoryJson,
        {
          changedAt: nowIso,
          reason: "phone_purchase_update",
          actor: actor
            ? {
                userId: actor.userId ?? null,
                username: actor.username ?? null,
                displayName: actor.displayName ?? null,
              }
            : null,
          before: beforeSnapshot,
          after: {
            partnerId: syncPartnerId ?? null,
            debit: 0,
            credit: newPurchasePrice,
            transactionDate: nowIso,
            description: nextDescription,
            referenceType: "phone_purchase",
            referenceId: phoneId,
            supplierId: syncPartnerId ?? null,
            purchasePrice: newPurchasePrice,
            phoneLabel,
          },
        },
      );

      if (previousLedgerRow) {
        await runAsync(
          `UPDATE partner_ledger
              SET partnerId = ?, transactionDate = ?, updatedAt = ?, description = ?, debit = 0, credit = ?, referenceType = 'phone_purchase', referenceId = ?, changeHistoryJson = ?
            WHERE id = ?`,
          [
            syncPartnerId,
            nowIso,
            nowIso,
            nextDescription,
            newPurchasePrice,
            phoneId,
            historyJson,
            Number(previousLedgerRow.id),
          ],
        );
      } else {
        await addPartnerLedgerEntryInternal(
          syncPartnerId,
          nextDescription,
          0,
          newPurchasePrice,
          nowIso,
          "phone_purchase",
          phoneId,
          undefined,
          historyJson,
        );
      }

      affectedPartners.add(Number(existingPhone.supplierId || 0));
      affectedPartners.add(Number(syncPartnerId || 0));
      affectedPartners.add(Number((previousLedgerRow as any)?.partnerId || 0));
    }

    const fieldsToUpdate: string[] = [];
    const params: any[] = [];

    /**
     * Pushes an update for a specific column if the new value differs from the existing one. It
     * handles numeric strings, Jalali/Gregorian dates and empty/null values gracefully. In particular:
     *   - numeric strings are converted to numbers unless blank (then become null)
     *   - date strings containing a '/' are treated as Jalali and converted to ISO using fromShamsiStringToISO()
     *   - date strings without '/' are assumed to already be ISO and are left unchanged
     *   - undefined values do not trigger an update
     *   - explicit null values will set the column to null
     */
    const updateIfChanged = (
      field: string,
      newValue: any,
      existingValue: any,
      isNumericString = false,
      isDate = false,
    ) => {
      let finalValue = newValue;
      if (isNumericString && typeof newValue === "string") {
        finalValue = newValue.trim() === "" ? null : Number(newValue);
      } else if (isDate && typeof newValue === "string") {
        // Only convert when the incoming value looks like a Jalali date (contains '/').
        // Otherwise, treat the string as an ISO date and leave it untouched. This prevents
        // ISO dates from being misinterpreted as Jalali and converted to far‑future years.
        finalValue = newValue.includes("/")
          ? fromShamsiStringToISO(newValue) || null
          : newValue;
      }
      // Only push update if value is defined and different from existing
      if (finalValue !== undefined && finalValue !== existingValue) {
        fieldsToUpdate.push(`${field} = ?`);
        // If not numeric/date and empty string, treat as null
        params.push(
          finalValue === "" && !isNumericString && !isDate ? null : finalValue,
        );
      } else if (newValue === null && existingValue !== null) {
        // Explicit null request
        fieldsToUpdate.push(`${field} = ?`);
        params.push(null);
      }
    };

    updateIfChanged("model", model, existingPhone.model);
    updateIfChanged("color", color, existingPhone.color);
    updateIfChanged("storage", storage, existingPhone.storage);
    updateIfChanged("ram", ram, existingPhone.ram);
    updateIfChanged("imei", imei, existingPhone.imei);
    const canonicalBatteryHealth = condition !== undefined || batteryHealth !== undefined
      ? normalizePhoneBatteryHealth(condition ?? existingPhone.condition, batteryHealth ?? existingPhone.batteryHealth)
      : undefined;
    updateIfChanged(
      "batteryHealth",
      canonicalBatteryHealth,
      existingPhone.batteryHealth,
      true,
    );
    updateIfChanged("condition", condition, existingPhone.condition);
    updateIfChanged(
      "purchasePrice",
      purchasePrice,
      existingPhone.purchasePrice,
      true,
    );
    updateIfChanged(
      "currentPurchasePrice",
      currentPurchasePrice,
      existingPhone.currentPurchasePrice,
      true,
    );
    if (
      currentPurchasePrice !== undefined &&
      normalizeMoney(currentPurchasePrice) !==
        normalizeMoney(existingPhone.currentPurchasePrice)
    ) {
      fieldsToUpdate.push("currentPurchasePriceUpdatedAt = ?");
      params.push(new Date().toISOString());
    }
    updateIfChanged("salePrice", salePrice, existingPhone.salePrice, true);
    updateIfChanged("sellerName", sellerName, existingPhone.sellerName);
    updateIfChanged(
      "purchaseDate",
      purchaseDate,
      existingPhone.purchaseDate,
      false,
      true,
    );
    updateIfChanged("status", status, existingPhone.status);
    updateIfChanged("notes", notes, existingPhone.notes);
    updateIfChanged("supplierId", supplierId, existingPhone.supplierId, true);

    // Determine if the phone was previously sold and whether the new status transitions it into or out of a sold state.
    const wasSoldBefore =
      existingPhone.status === "فروخته شده" ||
      existingPhone.status === "فروخته شده (قسطی)";
    // transitioningToSold: true => becoming sold, false => becoming non‑sold, null => no change or status not provided
    let transitioningToSold: boolean | null = null;
    if (status !== undefined && status !== null) {
      const newStatus = String(status);
      const isNowSold =
        newStatus === "فروخته شده" || newStatus === "فروخته شده (قسطی)";
      transitioningToSold = isNowSold;
      // If the new status is not a sold state, clear saleDate to avoid stale sale dates when a phone is returned
      if (!isNowSold) {
        fieldsToUpdate.push("saleDate = ?");
        params.push(null);
      }
    }

    // If the phone transitions from sold → non‑sold, record the return date in Shamsi. Conversely,
    // if it transitions back into a sold state, clear the return date. This avoids overwriting
    // purchaseDate when a phone is returned and ensures returnDate reflects the date of return.
    if (transitioningToSold !== null) {
      if (!transitioningToSold && wasSoldBefore) {
        fieldsToUpdate.push("returnDate = ?");
        params.push(moment().locale("fa").format("jYYYY/jMM/jDD"));
      } else if (transitioningToSold && existingPhone.returnDate) {
        fieldsToUpdate.push("returnDate = ?");
        params.push(null);
      }
    }

    if (fieldsToUpdate.length > 0) {
      params.push(phoneId);
      const sql = `UPDATE phones SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;
      await runAsync(sql, params);
    }

    const updatedPhone = await getAsync(
      "SELECT ph.*, pa.partnerName as supplierName FROM phones ph LEFT JOIN partners pa ON ph.supplierId = pa.id WHERE ph.id = ?",
      [phoneId],
    );
    const updatedCostBasis = resolvePhoneCostBasisAmount(updatedPhone);
    if (updatedCostBasis > 0) {
      await syncPhoneCostBasisSnapshots(Number(phoneId), updatedCostBasis);
    }
    const changeItems: string[] = [];
    if (updatedPhone) {
      if (existingPhone.status !== updatedPhone.status)
        changeItems.push(
          `وضعیت از «${existingPhone.status || "-"}» به «${updatedPhone.status || "-"}»`,
        );
      if (
        normalizeMoney(existingPhone.purchasePrice) !==
        normalizeMoney(updatedPhone.purchasePrice)
      )
        changeItems.push(
          `بهای خرید از ${Number(existingPhone.purchasePrice || 0).toLocaleString("fa-IR")} به ${Number(updatedPhone.purchasePrice || 0).toLocaleString("fa-IR")}`,
        );
      if (
        normalizeMoney(existingPhone.currentPurchasePrice) !==
        normalizeMoney(updatedPhone.currentPurchasePrice)
      )
        changeItems.push(
          `قیمت خرید روز از ${Number(existingPhone.currentPurchasePrice || existingPhone.purchasePrice || 0).toLocaleString("fa-IR")} به ${Number(updatedPhone.currentPurchasePrice || updatedPhone.purchasePrice || 0).toLocaleString("fa-IR")}`,
        );
      if (
        normalizeMoney(existingPhone.salePrice) !==
        normalizeMoney(updatedPhone.salePrice)
      )
        changeItems.push(
          `قیمت فروش از ${Number(existingPhone.salePrice || 0).toLocaleString("fa-IR")} به ${Number(updatedPhone.salePrice || 0).toLocaleString("fa-IR")}`,
        );
      if (
        (existingPhone.supplierId || null) !== (updatedPhone.supplierId || null)
      )
        changeItems.push(
          `تامین‌کننده ${existingPhone.supplierId ? "تغییر کرد" : "ثبت شد"}`,
        );
      if (
        (existingPhone.batteryHealth || null) !==
          (updatedPhone.batteryHealth || null) &&
        updatedPhone.batteryHealth != null
      )
        changeItems.push(
          `سلامت باتری به ${Number(updatedPhone.batteryHealth).toLocaleString("fa-IR")}٪ رسید`,
        );
      if ((existingPhone.imei || "") !== (updatedPhone.imei || ""))
        changeItems.push("IMEI بروزرسانی شد");
      if ((existingPhone.model || "") !== (updatedPhone.model || ""))
        changeItems.push("مدل یا شناسنامه دستگاه بروزرسانی شد");
      if ((existingPhone.notes || "") !== (updatedPhone.notes || ""))
        changeItems.push("یادداشت مدیریتی بروزرسانی شد");

      if (changeItems.length > 0) {
        const fieldDiffs = [
          existingPhone.status !== updatedPhone.status
            ? {
                key: "status",
                label: "وضعیت",
                from: existingPhone.status || null,
                to: updatedPhone.status || null,
                kind: "status",
              }
            : null,
          normalizeMoney(existingPhone.purchasePrice) !==
          normalizeMoney(updatedPhone.purchasePrice)
            ? {
                key: "purchasePrice",
                label: "بهای خرید",
                from: normalizeMoney(existingPhone.purchasePrice),
                to: normalizeMoney(updatedPhone.purchasePrice),
                kind: "money",
              }
            : null,
          normalizeMoney(existingPhone.currentPurchasePrice) !==
          normalizeMoney(updatedPhone.currentPurchasePrice)
            ? {
                key: "currentPurchasePrice",
                label: "قیمت خرید روز",
                from: normalizeMoney(existingPhone.currentPurchasePrice),
                to: normalizeMoney(updatedPhone.currentPurchasePrice),
                kind: "money",
              }
            : null,
          normalizeMoney(existingPhone.salePrice) !==
          normalizeMoney(updatedPhone.salePrice)
            ? {
                key: "salePrice",
                label: "قیمت فروش",
                from: normalizeMoney(existingPhone.salePrice),
                to: normalizeMoney(updatedPhone.salePrice),
                kind: "money",
              }
            : null,
          (existingPhone.supplierId || null) !==
          (updatedPhone.supplierId || null)
            ? {
                key: "supplier",
                label: "تامین‌کننده",
                from: existingPhone.supplierName || null,
                to: updatedPhone.supplierName || null,
                kind: "text",
              }
            : null,
          (existingPhone.batteryHealth || null) !==
          (updatedPhone.batteryHealth || null)
            ? {
                key: "batteryHealth",
                label: "سلامت باتری",
                from: existingPhone.batteryHealth ?? null,
                to: updatedPhone.batteryHealth ?? null,
                kind: "percent",
              }
            : null,
          (existingPhone.notes || "") !== (updatedPhone.notes || "")
            ? {
                key: "notes",
                label: "یادداشت",
                from: existingPhone.notes || null,
                to: updatedPhone.notes || null,
                kind: "text",
              }
            : null,
        ].filter(Boolean);
        await addPhoneInventoryEventToDb(phoneId, {
          eventType: "updated",
          title: "بروزرسانی اطلاعات دستگاه",
          description: changeItems.join(" • "),
          eventDate: new Date().toISOString(),
          tone:
            existingPhone.status !== updatedPhone.status
              ? "violet"
              : normalizeMoney(existingPhone.salePrice) !==
                    normalizeMoney(updatedPhone.salePrice) ||
                  normalizeMoney(existingPhone.purchasePrice) !==
                    normalizeMoney(updatedPhone.purchasePrice)
                ? "sky"
                : "slate",
          icon:
            existingPhone.status !== updatedPhone.status
              ? "fa-arrows-rotate"
              : normalizeMoney(existingPhone.salePrice) !==
                    normalizeMoney(updatedPhone.salePrice) ||
                  normalizeMoney(existingPhone.purchasePrice) !==
                    normalizeMoney(updatedPhone.purchasePrice)
                ? "fa-badge-dollar"
                : "fa-pen-ruler",
          oldStatus: existingPhone.status || null,
          newStatus: updatedPhone.status || null,
          oldPurchasePrice: existingPhone.purchasePrice ?? null,
          newPurchasePrice: updatedPhone.purchasePrice ?? null,
          oldSalePrice: existingPhone.salePrice ?? null,
          newSalePrice: updatedPhone.salePrice ?? null,
          metadata: {
            before: {
              model: existingPhone.model,
              imei: existingPhone.imei,
              supplierId: existingPhone.supplierId ?? null,
              purchaseDate: existingPhone.purchaseDate ?? null,
              batteryHealth: existingPhone.batteryHealth ?? null,
              notes: existingPhone.notes ?? null,
            },
            after: {
              model: updatedPhone.model,
              imei: updatedPhone.imei,
              supplierId: updatedPhone.supplierId ?? null,
              purchaseDate: updatedPhone.purchaseDate ?? null,
              batteryHealth: updatedPhone.batteryHealth ?? null,
              notes: updatedPhone.notes ?? null,
            },
            changes: changeItems,
            fieldDiffs,
          },
          actor,
        });
      }

      await execAsync("COMMIT;");
      for (const pid of [...affectedPartners].filter(
        (value) => Number.isFinite(value) && value > 0,
      )) {
        await recalcPartnerBalances(pid);
      }
      await normalizePhonePurchaseLedgers(true).catch((normalizeErr) =>
        console.error(
          "normalizePhonePurchaseLedgers failed after phone update:",
          normalizeErr,
        ),
      );
      return updatedPhone;
    }

    await execAsync("COMMIT;");
    for (const pid of [...affectedPartners].filter(
      (value) => Number.isFinite(value) && value > 0,
    )) {
      await recalcPartnerBalances(pid);
    }
    await normalizePhonePurchaseLedgers(true).catch((normalizeErr) =>
      console.error(
        "normalizePhonePurchaseLedgers failed after phone update:",
        normalizeErr,
      ),
    );
    return await getAsync(
      `SELECT ph.*, pa.partnerName as supplierName
       FROM phones ph
       LEFT JOIN partners pa ON ph.supplierId = pa.id
       WHERE ph.id = ?`,
      [phoneId],
    );
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch((rbErr) =>
      console.error("Rollback failed in updatePhoneEntryInDb:", rbErr),
    );
    console.error("DB Error (updatePhoneEntryInDb):", err);
    if (
      err.message.includes("UNIQUE constraint failed: phones.imei") ||
      err.message.includes("شماره IMEI جدید تکراری است")
    ) {
      throw new Error("شماره IMEI جدید تکراری است.");
    }
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const deletePhoneEntryFromDb = async (
  phoneId: number,
  actor?: PhoneHistoryActor | null,
): Promise<boolean> => {
  await getDbInstance();
  const phone = await getAsync("SELECT * FROM phones WHERE id = ?", [phoneId]);
  if (!phone) {
    throw new Error("گوشی برای حذف یافت نشد.");
  }

  // Check if phone is part of an installment sale (legacy + new items table)
  const installmentSale = await getAsync(
    "SELECT id FROM installment_sales WHERE phoneId = ?",
    [phoneId],
  );
  const installmentSaleItem = await getAsync(
    "SELECT saleId as id FROM installment_sale_items WHERE itemType = 'phone' AND itemId = ? LIMIT 1",
    [phoneId],
  ).catch(() => null);
  const found = installmentSale || installmentSaleItem;
  if (found) {
    throw new Error(
      `امکان حذف گوشی وجود ندارد. این گوشی در فروش اقساطی شماره ${found.id} ثبت شده است.`,
    );
  }

  // Check if phone is part of a regular sale
  const regularSale = await getAsync(
    "SELECT id FROM sales_transactions WHERE itemType = 'phone' AND itemId = ?",
    [phoneId],
  );
  if (regularSale) {
    throw new Error(
      `امکان حذف گوشی وجود ندارد. این گوشی در فروش نقدی/اعتباری شماره ${regularSale.id} ثبت شده است.`,
    );
  }

  await execAsync("BEGIN TRANSACTION;");
  try {
    // If phone was purchased from a supplier, reverse the ledger entry
    if (phone.supplierId && phone.purchasePrice > 0) {
      const description = `حذف گوشی: ${phone.model} (IMEI: ${phone.imei}, شناسه: ${phoneId}) - بازگشت مبلغ خرید اولیه`;
      await addPartnerLedgerEntryInternal(
        phone.supplierId,
        description,
        phone.purchasePrice,
        0,
        new Date().toISOString(),
        "phone_delete",
        phoneId,
      );
    }

    await addPhoneInventoryEventToDb(phoneId, {
      eventType: "deleted",
      title: "حذف دستگاه از انبار",
      description: `رکورد دستگاه از ماژول انبار حذف شد.`,
      eventDate: new Date().toISOString(),
      tone: "rose",
      icon: "fa-trash",
      oldStatus: phone.status || null,
      oldPurchasePrice: phone.purchasePrice ?? null,
      oldSalePrice: phone.salePrice ?? null,
      metadata: {
        model: phone.model,
        imei: phone.imei,
        supplierId: phone.supplierId ?? null,
      },
      actor,
    });

    const result = await runAsync(`DELETE FROM phones WHERE id = ?`, [phoneId]);
    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (err: any) {
    await execAsync("ROLLBACK;").catch((rbErr) =>
      console.error("Rollback failed in deletePhoneEntryFromDb:", rbErr),
    );
    console.error("DB Error (deletePhoneEntryFromDb):", err);
    throw err;
  }
};

export const getAllPhoneModelsFromDb = async (): Promise<string[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT name FROM phone_models ORDER BY name COLLATE NOCASE ASC`,
  );
  return (rows || []).map((r: any) => String(r.name));
};

export const addPhoneModelToDb = async (name: string): Promise<string[]> => {
  await getDbInstance();
  const n = String(name || "").trim();
  if (!n) throw new Error("نام مدل نامعتبر است.");
  await runAsync("INSERT OR IGNORE INTO phone_models (name) VALUES (?)", [n]);
  return getAllPhoneModelsFromDb();
};

export const getAllPhoneColorsFromDb = async (): Promise<string[]> => {
  await getDbInstance();
  const rows = await allAsync(
    `SELECT name FROM phone_colors ORDER BY name COLLATE NOCASE ASC`,
  );
  return (rows || []).map((r: any) => String(r.name));
};

export const addPhoneColorToDb = async (name: string): Promise<string[]> => {
  await getDbInstance();
  const n = String(name || "").trim();
  if (!n) throw new Error("نام رنگ نامعتبر است.");
  await runAsync("INSERT OR IGNORE INTO phone_colors (name) VALUES (?)", [n]);
  return getAllPhoneColorsFromDb();
};

export const getAllPhoneEntriesFromDb = async (
  supplierIdFilter: number | null = null,
  statusFilter?: string,
  phoneId?: number,
  searchQuery?: string,
  limit?: number,
  offset?: number,
): Promise<any[]> => {
  await getDbInstance();
  let sql = `
    SELECT ph.*, pa.partnerName as supplierName, cu.fullName as buyerName
    FROM phones ph
    LEFT JOIN partners pa ON ph.supplierId = pa.id
    -- شناسایی خریدار آخر (در صورت وجود) از فروش اقساطی، تراکنش‌های قدیمی و فروش‌های جدید
    LEFT JOIN (
      SELECT phoneId, MAX(customerId) AS customerId
      FROM (
        SELECT phoneId, customerId FROM installment_sales
        UNION ALL
        SELECT itemId AS phoneId, customerId FROM sales_transactions WHERE itemType = 'phone'
        UNION ALL
        SELECT soi.itemId AS phoneId, so.customerId
          FROM sales_order_items soi
          JOIN sales_orders so ON so.id = soi.orderId
        WHERE soi.itemType = 'phone'
      )
      GROUP BY phoneId
    ) sale ON sale.phoneId = ph.id
    LEFT JOIN customers cu ON cu.id = sale.customerId
  `;
  const params: any[] = [];
  const conditions: string[] = [];

  if (phoneId) {
    // If specific phoneId is requested
    conditions.push("ph.id = ?");
    params.push(phoneId);
  } else {
    // Apply filters if not fetching a specific phone
    if (supplierIdFilter) {
      conditions.push("ph.supplierId = ?");
      params.push(supplierIdFilter);
    }
    if (statusFilter) {
      // Allow multiple statuses separated by comma
      const statuses = String(statusFilter)
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
      if (statuses.length === 1) {
        conditions.push("ph.status = ?");
        params.push(statuses[0]);
      } else if (statuses.length > 1) {
        conditions.push(`ph.status IN (${statuses.map((_) => "?").join(",")})`);
        params.push(...statuses);
      }
    }
    const normalizedQuery = String(searchQuery || "")
      .normalize("NFKC")
      .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)] || digit)
      .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)] || digit)
      .replace(/[أإآ]/g, "ا")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[\u200c\u200d]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    if (normalizedQuery) {
      const like = `%${normalizedQuery}%`;
      const normalizedModel = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ph.model, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا')";
      conditions.push(`(${normalizedModel} LIKE ? COLLATE NOCASE OR COALESCE(ph.imei, '') LIKE ? OR CAST(ph.id AS TEXT) LIKE ?)`);
      params.push(like, like, like);
    }
  }

  if (conditions.length > 0) {
    sql += " WHERE " + conditions.join(" AND ");
  }

  sql += " ORDER BY ph.registerDate DESC";
  const safeLimit = Math.min(160, Math.max(1, Number(limit) || 0));
  const safeOffset = Math.max(0, Number(offset) || 0);
  if (safeLimit > 0) {
    sql += " LIMIT ? OFFSET ?";
    params.push(safeLimit, safeOffset);
  }
  try {
    return await allAsync(sql, params);
  } catch (err: any) {
    console.error("DB Error (getAllPhoneEntriesFromDb):", err);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${err.message}`);
  }
};

export const getPhoneInventoryDashboardReportFromDb = async (filters?: {
  days?: number;
  startDate?: string;
  endDate?: string;
}): Promise<any> => {
  await getDbInstance();
  const rows = await searchPhoneInventoryEventsFromDb({
    ...filters,
    limit: 1000,
    eventClass: "all",
  });
  const currentPhones =
    (await allAsync(`
    SELECT ph.*, pa.partnerName as supplierName
      FROM phones ph
      LEFT JOIN partners pa ON ph.supplierId = pa.id
  `)) || [];
  const { safeDays, sinceIso, untilIso, hasCustomRange } =
    resolveHistoryWindow(filters);
  const now = moment();
  const staleBuckets = [
    { key: "fresh", label: "کمتر از ۷ روز", count: 0 },
    { key: "warm", label: "۷ تا ۳۰ روز", count: 0 },
    { key: "stale", label: "۳۰ تا ۶۰ روز", count: 0 },
    { key: "critical", label: "۶۰+ روز", count: 0 },
  ];
  const supplierMap = new Map<string, any>();
  const modelMap = new Map<string, any>();

  for (const phone of currentPhones as any[]) {
    const baseDate =
      phone.purchaseDate || phone.registerDate || phone.saleDate || null;
    const ageDays = baseDate
      ? Math.max(0, now.diff(moment(baseDate), "days"))
      : 0;
    const stale = ageDays >= 30;
    const sellable = ["موجود در انبار", "مرجوعی", "مرجوعی اقساطی"].includes(
      String(phone.status || ""),
    );
    if (ageDays < 7) staleBuckets[0].count += 1;
    else if (ageDays < 30) staleBuckets[1].count += 1;
    else if (ageDays < 60) staleBuckets[2].count += 1;
    else staleBuckets[3].count += 1;

    const supplierName =
      String(phone.supplierName || "بدون تامین‌کننده").trim() ||
      "بدون تامین‌کننده";
    const supplierAgg = supplierMap.get(supplierName) || {
      name: supplierName,
      total: 0,
      staleCount: 0,
      missingSalePriceCount: 0,
      lowBatteryCount: 0,
      potentialMargin: 0,
      avgPurchasePrice: 0,
      avgSalePrice: 0,
      _purchaseSum: 0,
      _saleSum: 0,
      criticalEvents: 0,
    };
    supplierAgg.total += 1;
    if (stale) supplierAgg.staleCount += 1;
    if (!phone.salePrice || Number(phone.salePrice) <= 0)
      supplierAgg.missingSalePriceCount += 1;
    if (
      phone.batteryHealth != null &&
      Number(phone.batteryHealth) > 0 &&
      Number(phone.batteryHealth) < 80
    )
      supplierAgg.lowBatteryCount += 1;
    supplierAgg.potentialMargin += Math.max(
      0,
      Number(phone.salePrice || 0) - Number(phone.purchasePrice || 0),
    );
    supplierAgg._purchaseSum += Number(phone.purchasePrice || 0);
    supplierAgg._saleSum += Number(phone.salePrice || 0);
    supplierMap.set(supplierName, supplierAgg);

    const modelName = String(phone.model || "نامشخص").trim() || "نامشخص";
    const modelAgg = modelMap.get(modelName) || {
      name: modelName,
      total: 0,
      staleCount: 0,
      missingSalePriceCount: 0,
      lowBatteryCount: 0,
      potentialMargin: 0,
      avgPurchasePrice: 0,
      avgSalePrice: 0,
      _purchaseSum: 0,
      _saleSum: 0,
      criticalEvents: 0,
    };
    modelAgg.total += 1;
    if (stale) modelAgg.staleCount += 1;
    if (!phone.salePrice || Number(phone.salePrice) <= 0)
      modelAgg.missingSalePriceCount += 1;
    if (
      phone.batteryHealth != null &&
      Number(phone.batteryHealth) > 0 &&
      Number(phone.batteryHealth) < 80
    )
      modelAgg.lowBatteryCount += 1;
    modelAgg.potentialMargin += Math.max(
      0,
      Number(phone.salePrice || 0) - Number(phone.purchasePrice || 0),
    );
    modelAgg._purchaseSum += Number(phone.purchasePrice || 0);
    modelAgg._saleSum += Number(phone.salePrice || 0);
    modelMap.set(modelName, modelAgg);
  }

  for (const row of rows as any[]) {
    const modelName = String(row.phoneModel || "نامشخص").trim() || "نامشخص";
    const supplierCriticalTarget = modelMap.get(modelName);
    if (supplierCriticalTarget && row.eventClass === "critical")
      supplierCriticalTarget.criticalEvents += 1;
  }

  const dailyMap = new Map<string, any>();
  const priceRows = rows.filter((row: any) => row.eventClass === "price");
  let saleIncrease = 0,
    saleDecrease = 0,
    purchaseIncrease = 0,
    purchaseDecrease = 0,
    netSaleDelta = 0,
    netPurchaseDelta = 0;
  for (const row of rows as any[]) {
    const dt = moment(row.eventDate || row.createdAt);
    const dateKey = dt.format("YYYY-MM-DD");
    const point = dailyMap.get(dateKey) || {
      date: dateKey,
      label: dt.locale("fa").format("jDD jMMM"),
      total: 0,
      price: 0,
      status: 0,
      critical: 0,
    };
    point.total += 1;
    if (row.eventClass === "price") point.price += 1;
    if (row.eventClass === "status") point.status += 1;
    if (row.eventClass === "critical") point.critical += 1;
    dailyMap.set(dateKey, point);
  }
  for (const row of priceRows as any[]) {
    const oldSale = normalizeMoney(row.oldSalePrice);
    const newSale = normalizeMoney(row.newSalePrice);
    const oldPurchase = normalizeMoney(row.oldPurchasePrice);
    const newPurchase = normalizeMoney(row.newPurchasePrice);
    if (oldSale != null && newSale != null && oldSale !== newSale) {
      if (newSale > oldSale) saleIncrease += 1;
      if (newSale < oldSale) saleDecrease += 1;
      netSaleDelta += newSale - oldSale;
    }
    if (
      oldPurchase != null &&
      newPurchase != null &&
      oldPurchase !== newPurchase
    ) {
      if (newPurchase > oldPurchase) purchaseIncrease += 1;
      if (newPurchase < oldPurchase) purchaseDecrease += 1;
      netPurchaseDelta += newPurchase - oldPurchase;
    }
  }
  const finalizeHeatmap = (items: any[]) =>
    items.map((item: any) => ({
      ...item,
      avgPurchasePrice: item.total
        ? Math.round(item._purchaseSum / item.total)
        : 0,
      avgSalePrice: item.total ? Math.round(item._saleSum / item.total) : 0,
      _purchaseSum: undefined,
      _saleSum: undefined,
    }));

  const supplierHeatmap = finalizeHeatmap(Array.from(supplierMap.values()))
    .sort(
      (a: any, b: any) =>
        b.staleCount +
        b.missingSalePriceCount -
        (a.staleCount + a.missingSalePriceCount),
    )
    .slice(0, 8);
  const modelHeatmap = finalizeHeatmap(Array.from(modelMap.values()))
    .sort(
      (a: any, b: any) =>
        b.criticalEvents +
        b.staleCount +
        b.missingSalePriceCount -
        (a.criticalEvents + a.staleCount + a.missingSalePriceCount),
    )
    .slice(0, 8);
  const sellableInventory = (currentPhones as any[]).filter((phone: any) =>
    ["موجود در انبار", "مرجوعی", "مرجوعی اقساطی"].includes(
      String(phone.status || ""),
    ),
  ).length;
  const totalPotentialMargin = (currentPhones as any[]).reduce(
    (sum: number, phone: any) =>
      sum +
      Math.max(
        0,
        Number(phone.salePrice || 0) - Number(phone.purchasePrice || 0),
      ),
    0,
  );

  return {
    windowDays: safeDays,
    hasCustomRange,
    startDate: sinceIso,
    endDate: untilIso,
    totalInventory: (currentPhones as any[]).length,
    sellableInventory,
    totalPotentialMargin,
    staleBuckets,
    pricingTrend: {
      saleIncrease,
      saleDecrease,
      purchaseIncrease,
      purchaseDecrease,
      netSaleDelta,
      netPurchaseDelta,
    },
    supplierHeatmap,
    modelHeatmap,
    dailyActivity: Array.from(dailyMap.values())
      .sort((a: any, b: any) => a.date.localeCompare(b.date))
      .slice(-14),
  };
};
