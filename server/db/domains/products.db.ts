import { getDbInstance } from "../core/runtimeBindings";
import {
  allTypedAsync,
  execAsync,
  getTypedAsync,
  runAsync,
} from "../query";
import type { SqliteBindValue } from "../query";
import type {
  Product,
  SellableInventoryItem,
  SellablePhoneItem,
  Service,
} from "../../../types";
import {
  getAllServicesFromDb as getAllServicesFromRepo,
  addServiceToDb as addServiceToRepo,
  updateServiceInDb as updateServiceInRepo,
  deleteServiceFromDb as deleteServiceFromRepo,
} from "../../repositories/services.repo";
import {
  addCategoryToDb as addCategoryToRepo,
  getAllCategoriesFromDb as getAllCategoriesFromRepo,
  updateCategoryInDb as updateCategoryInRepo,
  deleteCategoryFromDb as deleteCategoryInRepo,
} from "../../repositories/productCategories.repo";
import type { ProductCategoryRow } from "../../repositories/productCategories.repo";
import { addPartnerLedgerEntryInternal } from "./ledgerSupport.db";
import type { ProductPayload, UpdateProductPayload } from "../core/types";

type OwnershipType = SellablePhoneItem["ownershipType"];

interface ProductRecord extends Product {
  threshold?: number;
  ownershipProfileId?: number | null;
}

interface ProductSaleReferenceRow {
  id: number;
}

interface TableInfoRow {
  name: string;
}

interface SellableOwnershipFields {
  ownershipProfileId: number | null;
  ownershipTitle: string | null;
  ownershipType: OwnershipType;
  profitShareProfileId: number | null;
  profitShareProfileTitle: string | null;
}

interface SellablePhoneRow extends SellableOwnershipFields {
  id: number;
  model: string;
  imei: string;
  price: number;
  purchasePrice: number;
  initialPurchasePrice: number;
  currentPurchasePrice: number | null;
  buyPrice: number;
  stock: 1;
}

interface SellableInventoryRow extends SellableOwnershipFields {
  id: number;
  name: string;
  price: number;
  purchasePrice: number;
  stock: number;
}

interface SellableServiceRow {
  id: number;
  name: string;
  price: number;
}

interface SellableServiceResult extends SellableServiceRow {
  type: "service";
}

interface SellableItemsDbResult {
  phones: SellablePhoneItem[];
  inventory: SellableInventoryItem[];
  services: SellableServiceResult[];
}

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const addProductToDb = async (
  product: ProductPayload,
): Promise<ProductRecord | undefined> => {
  await getDbInstance();
  const {
    name,
    purchasePrice,
    sellingPrice,
    stock_quantity,
    categoryId,
    supplierId,
    sku,
    barcode,
    unit,
  } = product;

  try {
    await execAsync("BEGIN TRANSACTION;");
    const result = await runAsync(
      `INSERT INTO products (name, purchasePrice, sellingPrice, stock_quantity, categoryId, supplierId, saleCount, sku, barcode, unit)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?, ?)`,
      [
        name,
        purchasePrice,
        sellingPrice,
        stock_quantity,
        categoryId,
        supplierId,
        sku || null,
        barcode || null,
        unit || "عدد",
      ],
    );
    const newProductId = result.lastID;

    if (supplierId && purchasePrice > 0 && stock_quantity > 0) {
      const creditAmount = purchasePrice * stock_quantity;
      const description = `دریافت کالا: ${stock_quantity} عدد ${name} (شناسه محصول: ${newProductId}) به ارزش واحد ${purchasePrice.toLocaleString("fa-IR")}`;
      await addPartnerLedgerEntryInternal(
        supplierId,
        description,
        0,
        creditAmount,
        new Date().toISOString(),
        "product_purchase",
        newProductId,
      );
    }

    await execAsync("COMMIT;");
    return await getTypedAsync<ProductRecord>(
      `SELECT p.*, c.name as categoryName, pa.partnerName as supplierName
       FROM products p
       LEFT JOIN categories c ON p.categoryId = c.id
       LEFT JOIN partners pa ON p.supplierId = pa.id
       WHERE p.id = ?`,
      [newProductId],
    );
  } catch (error: unknown) {
    await execAsync("ROLLBACK;");
    const message = getErrorMessage(error);
    console.error("DB Error (addProductToDb):", error);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${message}`);
  }
};

export const getAllProductsFromDb = async (
  supplierIdFilter: number | null = null,
): Promise<ProductRecord[]> => {
  await getDbInstance();
  let sql = `
    SELECT p.id, p.name, p.purchasePrice, p.sellingPrice, p.stock_quantity, p.saleCount, p.date_added, p.sku, p.barcode, p.unit,
           p.categoryId, c.name as categoryName,
           p.supplierId, pa.partnerName as supplierName
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    LEFT JOIN partners pa ON p.supplierId = pa.id
  `;
  const params: SqliteBindValue[] = [];
  if (supplierIdFilter) {
    sql += " WHERE p.supplierId = ?";
    params.push(supplierIdFilter);
  }
  sql += " ORDER BY p.date_added DESC";
  try {
    return await allTypedAsync<ProductRecord>(sql, params);
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("DB Error (getAllProductsFromDb):", error);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${message}`);
  }
};


export type ProductSearchFilters = {
  q?: string;
  limit?: number;
  id?: number;
  availableOnly?: boolean;
  offset?: number;
};

export const searchProductsFromDb = async (
  filters: ProductSearchFilters = {},
): Promise<ProductRecord[]> => {
  await getDbInstance();
  const safeLimit = Math.min(160, Math.max(1, Number(filters.limit) || 60));
  const safeOffset = Math.max(0, Number(filters.offset) || 0);
  const id = Number(filters.id || 0);
  const q = String(filters.q || "")
    .normalize("NFKC")
    .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)] || digit)
    .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)] || digit)
    .replace(/[أإآ]/g, "ا")
    .replace(/ي/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\u200c\u200d]/g, " ")
    .replace(/\s+/g, " ")
    .trim();

  const conditions: string[] = [];
  const params: SqliteBindValue[] = [];
  if (id > 0) {
    conditions.push("p.id = ?");
    params.push(id);
  } else {
    if (filters.availableOnly) conditions.push("COALESCE(p.stock_quantity, 0) > 0");
    if (q) {
      const like = `%${q}%`;
      const normalizedName = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(p.name, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا')";
      conditions.push(`(${normalizedName} LIKE ? COLLATE NOCASE OR COALESCE(p.sku, '') LIKE ? OR COALESCE(p.barcode, '') LIKE ? OR CAST(p.id AS TEXT) LIKE ?)`);
      params.push(like, like, like, like);
    }
  }

  const where = conditions.length ? `WHERE ${conditions.join(" AND ")}` : "";
  return await allTypedAsync<ProductRecord>(`
    SELECT p.id, p.name, p.purchasePrice, p.sellingPrice, p.stock_quantity, p.saleCount, p.date_added, p.sku, p.barcode, p.unit,
           p.categoryId, c.name as categoryName,
           p.supplierId, pa.partnerName as supplierName
    FROM products p
    LEFT JOIN categories c ON p.categoryId = c.id
    LEFT JOIN partners pa ON p.supplierId = pa.id
    ${where}
    ORDER BY p.date_added DESC, p.id DESC
    LIMIT ? OFFSET ?
  `, [...params, safeLimit, safeOffset]);
};

export const updateProductInDb = async (
  productId: number,
  productData: UpdateProductPayload,
): Promise<ProductRecord | undefined> => {
  await getDbInstance();
  const {
    name,
    purchasePrice,
    sellingPrice,
    stock_quantity,
    categoryId,
    supplierId,
    sku,
    barcode,
    unit,
  } = productData;

  const product = await getTypedAsync<ProductRecord>(
    "SELECT * FROM products WHERE id = ?",
    [productId],
  );
  if (!product) {
    throw new Error("محصول برای بروزرسانی یافت نشد.");
  }

  // Build the update query dynamically
  const fieldsToUpdate: string[] = [];
  const params: SqliteBindValue[] = [];

  if (name !== undefined) {
    fieldsToUpdate.push("name = ?");
    params.push(name);
  }
  if (purchasePrice !== undefined) {
    fieldsToUpdate.push("purchasePrice = ?");
    params.push(purchasePrice);
  }
  if (sellingPrice !== undefined) {
    fieldsToUpdate.push("sellingPrice = ?");
    params.push(sellingPrice);
  }
  if (stock_quantity !== undefined) {
    fieldsToUpdate.push("stock_quantity = ?");
    params.push(stock_quantity);
  }
  if (categoryId !== undefined) {
    fieldsToUpdate.push("categoryId = ?");
    params.push(categoryId);
  } // Handles null
  if (supplierId !== undefined) {
    fieldsToUpdate.push("supplierId = ?");
    params.push(supplierId);
  } // Handles null
  if (sku !== undefined) {
    fieldsToUpdate.push("sku = ?");
    params.push(sku || null);
  }
  if (barcode !== undefined) {
    fieldsToUpdate.push("barcode = ?");
    params.push(barcode || null);
  }
  if (unit !== undefined) {
    fieldsToUpdate.push("unit = ?");
    params.push(unit || "عدد");
  }

  if (fieldsToUpdate.length === 0) {
    return product; // No changes, return current product data
  }

  params.push(productId);
  const sql = `UPDATE products SET ${fieldsToUpdate.join(", ")} WHERE id = ?`;

  try {
    // For inventory products, direct ledger adjustment on simple edit is complex and often not standard.
    // Ledger entries are typically for acquisitions/disposals.
    // If purchase price or supplier changes AND stock_quantity changes, it could imply a new purchase or return.
    // For now, we just update the product details. Partner ledger adjustments would need more specific logic for stock changes.
    await runAsync(sql, params);
    return await getTypedAsync<ProductRecord>(
      `SELECT p.*, c.name as categoryName, pa.partnerName as supplierName
          FROM products p
          LEFT JOIN categories c ON p.categoryId = c.id
          LEFT JOIN partners pa ON p.supplierId = pa.id
          WHERE p.id = ?`,
      [productId],
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("DB Error (updateProductInDb):", error);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${message}`);
  }
};

export const deleteProductFromDb = async (
  productId: number,
): Promise<boolean> => {
  await getDbInstance();
  await execAsync("BEGIN TRANSACTION;");
  try {
    const product = await getTypedAsync<ProductRecord>(
      "SELECT * FROM products WHERE id = ?",
      [productId],
    );
    if (!product) {
      throw new Error("محصول برای حذف یافت نشد.");
    }

    const saleRecord = await getTypedAsync<ProductSaleReferenceRow>(
      "SELECT id FROM sales_transactions WHERE itemType = 'inventory' AND itemId = ? LIMIT 1",
      [productId],
    );
    if (saleRecord) {
      throw new Error("امکان حذف محصول وجود ندارد زیرا قبلاً فروخته شده است.");
    }

    if (
      product.supplierId &&
      product.purchasePrice > 0 &&
      product.stock_quantity > 0
    ) {
      const debitAmount = product.purchasePrice * product.stock_quantity;
      const description = `حذف/بازگشت کالا: ${product.stock_quantity} عدد ${product.name} (شناسه محصول: ${productId}) از انبار`;
      await addPartnerLedgerEntryInternal(
        product.supplierId,
        description,
        debitAmount,
        0,
        new Date().toISOString(),
        "product_return_on_delete",
        productId,
      );
    }

    const result = await runAsync(`DELETE FROM products WHERE id = ?`, [
      productId,
    ]);

    await execAsync("COMMIT;");
    return result.changes > 0;
  } catch (error: unknown) {
    await execAsync("ROLLBACK;").catch((rollbackError: unknown) =>
      console.error("Rollback failed in deleteProductFromDb:", rollbackError),
    );
    console.error("DB Error (deleteProductFromDb):", error);
    throw error; // Re-throw the original error
  }
};

export type SellableItemsSearchFilters = {
  q?: string;
  limit?: number;
  offset?: number;
};

export const getSellableItemsFromDb = async (
  filters: SellableItemsSearchFilters = {},
): Promise<SellableItemsDbResult> => {
  await getDbInstance();
  try {
    const q = String(filters.q || "")
      .normalize("NFKC")
      .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)] || digit)
      .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)] || digit)
      .replace(/[أإآ]/g, "ا")
      .replace(/ي/g, "ی")
      .replace(/ك/g, "ک")
      .replace(/[\u200c\u200d]/g, " ")
      .replace(/\s+/g, " ")
      .trim();
    const hasWindow = Boolean(q || filters.limit);
    const safeLimit = Math.min(120, Math.max(1, Number(filters.limit) || 60));
    const safeOffset = Math.max(0, Number(filters.offset) || 0);
    const like = `%${q}%`;
    const normalizedPhoneModel = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(ph.model, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا')";
    const normalizedProductName = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(pr.name, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا')";
    const normalizedServiceName = "REPLACE(REPLACE(REPLACE(REPLACE(REPLACE(name, 'ي', 'ی'), 'ك', 'ک'), 'أ', 'ا'), 'إ', 'ا'), 'آ', 'ا')";
    const phoneSearchClause = q ? ` AND (${normalizedPhoneModel} LIKE ? COLLATE NOCASE OR COALESCE(ph.imei, '') LIKE ? OR CAST(ph.id AS TEXT) LIKE ?)` : "";
    const productSearchClause = q ? ` AND (${normalizedProductName} LIKE ? COLLATE NOCASE OR COALESCE(pr.sku, '') LIKE ? OR COALESCE(pr.barcode, '') LIKE ? OR CAST(pr.id AS TEXT) LIKE ?)` : "";
    const serviceSearchClause = q ? ` AND (${normalizedServiceName} LIKE ? COLLATE NOCASE OR CAST(id AS TEXT) LIKE ?)` : "";
    const windowClause = hasWindow ? " LIMIT ? OFFSET ?" : "";
    const phoneParams: SqliteBindValue[] = q ? [like, like, like] : [];
    const productParams: SqliteBindValue[] = q ? [like, like, like, like] : [];
    const serviceParams: SqliteBindValue[] = q ? [like, like] : [];
    if (hasWindow) {
      phoneParams.push(safeLimit, safeOffset);
      productParams.push(safeLimit, safeOffset);
      serviceParams.push(safeLimit, safeOffset);
    }
    const getColumnNames = async (tableName: string): Promise<Set<string>> => {
      try {
        const rows = await allTypedAsync<TableInfoRow>(
          `PRAGMA table_info(${tableName})`,
        );
        return new Set(rows.map((column) => String(column.name)));
      } catch {
        return new Set<string>();
      }
    };

    const [
      phoneColNames,
      productColNames,
      ownershipProfileCols,
      profitShareCols,
    ] = await Promise.all([
      getColumnNames("phones"),
      getColumnNames("products"),
      getColumnNames("ownership_profiles"),
      getColumnNames("profit_share_profiles"),
    ]);

    const hasPhoneOwnership = phoneColNames.has("ownershipProfileId");
    const hasProductOwnership = productColNames.has("ownershipProfileId");
    const hasOwnershipProfilesTable = ownershipProfileCols.size > 0;
    const hasProfitShareProfilesTable = profitShareCols.size > 0;

    const hasOwnershipTitle = ownershipProfileCols.has("title");
    const hasOwnershipType = ownershipProfileCols.has("ownershipType");
    const hasOwnershipProfitShareProfileId = ownershipProfileCols.has(
      "profitShareProfileId",
    );
    const hasProfitShareTitle = profitShareCols.has("title");

    const phoneOwnershipSelect = hasPhoneOwnership
      ? "ph.ownershipProfileId"
      : "NULL as ownershipProfileId";
    const productOwnershipSelect = hasProductOwnership
      ? "pr.ownershipProfileId"
      : "NULL as ownershipProfileId";

    const phoneOwnershipJoin =
      hasPhoneOwnership && hasOwnershipProfilesTable
        ? "LEFT JOIN ownership_profiles op ON op.id = ph.ownershipProfileId"
        : "";
    const productOwnershipJoin =
      hasProductOwnership && hasOwnershipProfilesTable
        ? "LEFT JOIN ownership_profiles op ON op.id = pr.ownershipProfileId"
        : "";
    const profitShareJoin =
      hasOwnershipProfilesTable &&
      hasProfitShareProfilesTable &&
      hasOwnershipProfitShareProfileId
        ? "LEFT JOIN profit_share_profiles psp ON psp.id = op.profitShareProfileId"
        : "";

    const ownershipMetaSelect = [
      hasOwnershipProfilesTable && hasOwnershipTitle
        ? "op.title as ownershipTitle"
        : "NULL as ownershipTitle",
      hasOwnershipProfilesTable && hasOwnershipType
        ? "op.ownershipType as ownershipType"
        : "NULL as ownershipType",
      hasOwnershipProfilesTable && hasOwnershipProfitShareProfileId
        ? "op.profitShareProfileId as profitShareProfileId"
        : "NULL as profitShareProfileId",
      hasProfitShareProfilesTable &&
      hasProfitShareTitle &&
      hasOwnershipProfilesTable &&
      hasOwnershipProfitShareProfileId
        ? "psp.title as profitShareProfileTitle"
        : "NULL as profitShareProfileTitle",
    ].join(", ");

    const loadPhones = async (): Promise<SellablePhoneRow[]> => {
      try {
        return await allTypedAsync<SellablePhoneRow>(`
          SELECT ph.id, ph.model, ph.imei, ph.salePrice as price, ph.purchasePrice, ph.purchasePrice as initialPurchasePrice, ph.currentPurchasePrice, COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) as buyPrice, 1 as stock,
                 ${phoneOwnershipSelect},
                 ${ownershipMetaSelect}
          FROM phones ph
          ${phoneOwnershipJoin}
          ${profitShareJoin}
          WHERE ph.status = 'موجود در انبار' AND ph.salePrice IS NOT NULL AND ph.salePrice > 0
          ${phoneSearchClause}
          ORDER BY ph.registerDate DESC, ph.id DESC
          ${windowClause}
        `, phoneParams);
      } catch (err) {
        console.warn("Sellable phones query fallback activated:", err);
        return await allTypedAsync<SellablePhoneRow>(`
          SELECT ph.id, ph.model, ph.imei, ph.salePrice as price, ph.purchasePrice, ph.purchasePrice as initialPurchasePrice, ph.currentPurchasePrice, COALESCE(NULLIF(ph.currentPurchasePrice, 0), ph.purchasePrice, 0) as buyPrice, 1 as stock,
                 NULL as ownershipProfileId,
                 NULL as ownershipTitle,
                 NULL as ownershipType,
                 NULL as profitShareProfileId,
                 NULL as profitShareProfileTitle
          FROM phones ph
          WHERE ph.status = 'موجود در انبار' AND ph.salePrice IS NOT NULL AND ph.salePrice > 0
          ${phoneSearchClause}
          ORDER BY ph.registerDate DESC, ph.id DESC
          ${windowClause}
        `, phoneParams);
      }
    };

    const loadInventory = async (): Promise<SellableInventoryRow[]> => {
      try {
        return await allTypedAsync<SellableInventoryRow>(`
          SELECT pr.id, pr.name, pr.sellingPrice as price, pr.purchasePrice, pr.stock_quantity as stock, pr.sku, pr.barcode,
                 ${productOwnershipSelect},
                 ${ownershipMetaSelect}
          FROM products pr
          ${productOwnershipJoin}
          ${profitShareJoin}
          WHERE pr.stock_quantity > 0 AND pr.sellingPrice IS NOT NULL AND pr.sellingPrice > 0
          ${productSearchClause}
          ORDER BY pr.date_added DESC, pr.id DESC
          ${windowClause}
        `, productParams);
      } catch (err) {
        console.warn("Sellable inventory query fallback activated:", err);
        return await allTypedAsync<SellableInventoryRow>(`
          SELECT pr.id, pr.name, pr.sellingPrice as price, pr.purchasePrice, pr.stock_quantity as stock, pr.sku, pr.barcode,
                 NULL as ownershipProfileId,
                 NULL as ownershipTitle,
                 NULL as ownershipType,
                 NULL as profitShareProfileId,
                 NULL as profitShareProfileTitle
          FROM products pr
          WHERE pr.stock_quantity > 0 AND pr.sellingPrice IS NOT NULL AND pr.sellingPrice > 0
          ${productSearchClause}
          ORDER BY pr.date_added DESC, pr.id DESC
          ${windowClause}
        `, productParams);
      }
    };

    const [phones, inventory, services] = await Promise.all([
      loadPhones(),
      loadInventory(),
      allTypedAsync<SellableServiceRow>(`
        SELECT id, name, price
        FROM services
        WHERE price IS NOT NULL
        ${serviceSearchClause}
        ORDER BY name COLLATE NOCASE ASC, id ASC
        ${windowClause}
      `, serviceParams),
    ]);

    return {
      phones: phones.map((phone) => ({
        ...phone,
        type: "phone" as const,
        name: `${phone.model} (IMEI: ${phone.imei})`,
      })),
      inventory: inventory.map((item) => ({
        ...item,
        type: "inventory" as const,
      })),
      services: services.map((service) => ({
        ...service,
        type: "service" as const,
      })),
    };
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("DB Error (getSellableItemsFromDb):", error);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${message}`);
  }
};

// --- Services (Phase 1E residual wrapper extraction) ---
export const getAllServicesFromDb = async (): Promise<Service[]> => {
  await getDbInstance();
  return await getAllServicesFromRepo();
};

export const addServiceToDb = async (
  service: Omit<Service, "id">,
): Promise<Service> => {
  await getDbInstance();
  return await addServiceToRepo(service);
};

export const updateServiceInDb = async (
  id: number,
  service: Omit<Service, "id">,
): Promise<Service> => {
  await getDbInstance();
  return await updateServiceInRepo(id, service);
};

export const deleteServiceFromDb = async (id: number): Promise<boolean> => {
  await getDbInstance();
  return await deleteServiceFromRepo(id);
};

// --- Categories (Phase 1E residual wrapper extraction) ---
export const addCategoryToDb = async (
  name: string,
): Promise<ProductCategoryRow | undefined> => {
  await getDbInstance();
  return await addCategoryToRepo(name);
};

export const getAllCategoriesFromDb = async (): Promise<
  ProductCategoryRow[]
> => {
  await getDbInstance();
  return await getAllCategoriesFromRepo();
};

export const updateCategoryInDb = async (
  id: number,
  name: string,
): Promise<ProductCategoryRow | undefined> => {
  await getDbInstance();
  return await updateCategoryInRepo(id, name);
};

export const deleteCategoryFromDb = async (id: number): Promise<boolean> => {
  await getDbInstance();
  return await deleteCategoryInRepo(id);
};
