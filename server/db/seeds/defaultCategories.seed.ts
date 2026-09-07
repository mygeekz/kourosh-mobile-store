// Extracted from server/db/core/initRuntime.ts. Preserve values and messages exactly.
import { getTypedAsync, runAsync } from "../query";

export const MOBILE_PHONE_CATEGORY_NAME = "گوشی‌های موبایل";

export const DEFAULT_CATEGORIES = ["لوازم جانبی", "قطعات"];

type CategoryRow = {
  id: number;
  name: string;
};

type CategoryIdRow = Pick<CategoryRow, "id">;

export const getOrCreateMobilePhoneCategory = async (): Promise<CategoryRow> => {
  let category = await getTypedAsync<CategoryRow>(
    "SELECT id, name FROM categories WHERE name = ?",
    [MOBILE_PHONE_CATEGORY_NAME],
  );
  if (!category) {
    const result = await runAsync("INSERT INTO categories (name) VALUES (?)", [
      MOBILE_PHONE_CATEGORY_NAME,
    ]);
    category = { id: result.lastID, name: MOBILE_PHONE_CATEGORY_NAME };
    console.log(
      `Category "${MOBILE_PHONE_CATEGORY_NAME}" created with ID: ${category.id}`,
    );
  }
  return category;
};

export const seedDefaultCategories = async (): Promise<void> => {
  for (const catName of DEFAULT_CATEGORIES) {
    const existing = await getTypedAsync<CategoryIdRow>(
      "SELECT id FROM categories WHERE name = ?",
      [catName],
    );
    if (!existing) {
      await runAsync("INSERT INTO categories (name) VALUES (?)", [catName]);
      console.log(`Default category "${catName}" created.`);
    }
  }
};
