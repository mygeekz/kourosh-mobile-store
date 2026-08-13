import { allTypedAsync, getTypedAsync, runAsync } from "../db/query";

export interface ProductCategoryRow {
  id: number;
  name: string;
}

type CategoryIdRow = Pick<ProductCategoryRow, "id">;

const getErrorMessage = (error: unknown): string =>
  error instanceof Error ? error.message : String(error);

export const addCategoryToDb = async (
  name: string,
): Promise<ProductCategoryRow | undefined> => {
  try {
    const result = await runAsync(`INSERT INTO categories (name) VALUES (?)`, [
      name,
    ]);
    return await getTypedAsync<ProductCategoryRow>(
      "SELECT id, name FROM categories WHERE id = ?",
      [result.lastID],
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("UNIQUE constraint failed")) {
      throw new Error("نام دسته‌بندی تکراری است.");
    }
    console.error("DB Error (addCategoryToDb):", error);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${message}`);
  }
};

export const getAllCategoriesFromDb = async (): Promise<
  ProductCategoryRow[]
> => {
  try {
    return await allTypedAsync<ProductCategoryRow>(
      `SELECT id, name FROM categories ORDER BY name ASC`,
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("DB Error (getAllCategoriesFromDb):", error);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${message}`);
  }
};

export const updateCategoryInDb = async (
  id: number,
  name: string,
): Promise<ProductCategoryRow | undefined> => {
  try {
    const existing = await getTypedAsync<CategoryIdRow>(
      "SELECT id FROM categories WHERE id = ?",
      [id],
    );
    if (!existing) {
      throw new Error("دسته‌بندی برای بروزرسانی یافت نشد.");
    }
    await runAsync(`UPDATE categories SET name = ? WHERE id = ?`, [name, id]);
    return await getTypedAsync<ProductCategoryRow>(
      "SELECT id, name FROM categories WHERE id = ?",
      [id],
    );
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    if (message.includes("UNIQUE constraint failed")) {
      throw new Error("این نام دسته‌بندی قبلا ثبت شده است.");
    }
    console.error("DB Error (updateCategoryInDb):", error);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${message}`);
  }
};

export const deleteCategoryFromDb = async (id: number): Promise<boolean> => {
  try {
    const result = await runAsync(`DELETE FROM categories WHERE id = ?`, [id]);
    if (result.changes === 0) {
      // This check is a bit redundant if the calling function already checks for 404,
      // but good for direct DB function calls.
      throw new Error("دسته‌بندی برای حذف یافت نشد یا قبلا حذف شده است.");
    }
    return result.changes > 0;
  } catch (error: unknown) {
    const message = getErrorMessage(error);
    console.error("DB Error (deleteCategoryFromDb):", error);
    throw new Error(`خطا در عملیاتی پایگاه داده: ${message}`);
  }
};
