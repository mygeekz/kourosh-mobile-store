import type { Express } from "express";
import type { AuthorizeRole } from "./routes/intelligence/types";
import { allAsync, getAsync } from "./db/query";
import { buildProductPriceAdvisory, type ProductPriceRow } from "./advisory/productPricingModel";
import { getAdvisoryOnlyPolicy } from "./advisory/advisoryPolicy";

export const registerProductPriceAdvisorRoute = (app: Express, authorizeRole: AuthorizeRole): void => {
  app.get("/api/products/:id/price-advice", authorizeRole(["Admin", "Manager", "Warehouse"]), async (request, response, next) => {
    try {
      const productId = Number(request.params.id);
      if (!Number.isInteger(productId) || productId <= 0) return response.status(400).json({ success: false, message: "شناسه کالا معتبر نیست." });
      const product = await getAsync("SELECT id, name, categoryId, purchasePrice AS purchaseCost FROM products WHERE id = ?", [productId]);
      if (!product) return response.status(404).json({ success: false, message: "کالا پیدا نشد." });
      const rows = await allAsync(`SELECT soi.id, p.id AS productId, p.name, p.categoryId,
        COALESCE(NULLIF(soi.buyPrice, 0), NULLIF(p.purchasePrice, 0), 0) AS purchaseCost,
        CASE WHEN COALESCE(soi.quantity, 0) > 0 THEN soi.totalPrice / soi.quantity ELSE soi.unitPrice END AS salePrice,
        so.transactionDate AS soldAt
        FROM sales_order_items soi JOIN sales_orders so ON so.id = soi.orderId
        JOIN products p ON soi.itemType = 'inventory' AND soi.itemId = p.id
        WHERE COALESCE(so.status, 'active') = 'active' AND COALESCE(soi.totalPrice, soi.unitPrice, 0) > 0
        ORDER BY so.transactionDate ASC, soi.id ASC LIMIT 5000`) as ProductPriceRow[];
      const policy = getAdvisoryOnlyPolicy();
      const advisory = policy.advisoryInferenceEnabled
        ? buildProductPriceAdvisory(product, rows)
        : {
            status: "abstained" as const,
            suggestedSalePrice: null,
            range: null,
            reason: "ML مشاور با kill switch غیرفعال است.",
            metrics: null,
            safety: {
              advisoryOnly: true as const,
              humanReviewRequired: true as const,
              automaticPricingEnabled: false as const,
              businessMutationEnabled: false as const,
            },
          };
      return response.json({ success: true, data: advisory });
    } catch (error) { next(error); }
  });
};
