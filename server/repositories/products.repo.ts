import {
  addCategoryToDb,
  addProductToDb,
  adjustProductStockInDb,
  deleteCategoryFromDb,
  deleteProductFromDb,
  getAllCategoriesFromDb,
  getAllProductsFromDb,
  searchProductsFromDb,
  type ProductSearchFilters,
  updateCategoryInDb,
  updateProductInDb,
  type AdjustStockPayload,
  type ProductPayload,
  type UpdateProductPayload,
} from "../database";

export const productsRepo = {
  createProduct: (payload: ProductPayload) => addProductToDb(payload),
  listProducts: () => getAllProductsFromDb(),
  searchProducts: (filters: ProductSearchFilters) => searchProductsFromDb(filters),
  updateProduct: (id: number, payload: UpdateProductPayload) =>
    updateProductInDb(id, payload),
  adjustProductStock: (
    productId: number,
    payload: AdjustStockPayload,
  ) => adjustProductStockInDb(productId, payload),
  deleteProduct: (id: number) => deleteProductFromDb(id),

  createCategory: (name: string) => addCategoryToDb(name),
  listCategories: () => getAllCategoriesFromDb(),
  updateCategory: (id: number, name: string) => updateCategoryInDb(id, name),
  deleteCategory: (id: number) => deleteCategoryFromDb(id),
};

export type { AdjustStockPayload, ProductPayload, UpdateProductPayload };
