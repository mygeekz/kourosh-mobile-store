import {
  productsRepo,
  type AdjustStockPayload,
  type ProductPayload,
  type UpdateProductPayload,
} from "../repositories/products.repo";

export const productsService = {
  createProduct: (payload: ProductPayload) => productsRepo.createProduct(payload),
  listProducts: (filters?: { q?: string; limit?: number; id?: number; availableOnly?: boolean; offset?: number }) =>
    filters && (filters.q || filters.limit || filters.id || filters.availableOnly || filters.offset)
      ? productsRepo.searchProducts(filters)
      : productsRepo.listProducts(),
  updateProduct: (id: number, payload: UpdateProductPayload) =>
    productsRepo.updateProduct(id, payload),
  adjustProductStock: (productId: number, payload: AdjustStockPayload) =>
    productsRepo.adjustProductStock(productId, payload),
  deleteProduct: (id: number) => productsRepo.deleteProduct(id),

  createCategory: (name: string) => productsRepo.createCategory(name),
  listCategories: () => productsRepo.listCategories(),
  updateCategory: (id: number, name: string) =>
    productsRepo.updateCategory(id, name),
  deleteCategory: (id: number) => productsRepo.deleteCategory(id),
};

export type { ProductPayload, UpdateProductPayload };
