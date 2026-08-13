import type { Express, NextFunction, Request, RequestHandler, Response } from "express";
import { addAuditLog } from "../database";
import {
  productsService,
  type ProductPayload,
  type UpdateProductPayload,
} from "../services/products.service";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type ProductsRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const PRODUCT_ROLES = ["Admin", "Manager", "Warehouse"];

export const registerProductsRoutes = (
  app: Express,
  { authorizeRole }: ProductsRouteDeps,
): void => {
  app.post(
    "/api/products",
    authorizeRole(PRODUCT_ROLES),
    async (req, res, next) => {
      try {
        const result = await productsService.createProduct(req.body as ProductPayload);
        // Log creation in audit log. Ignore errors.
        if (req.user) {
          await addAuditLog(
            req.user.id,
            req.user.username,
            req.user.roleName,
            "create",
            "product",
            result?.id || null,
            `افزودن محصول ${result?.name ?? ""}`,
          );
        }
        res.status(201).json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get("/api/products", async (req, res, next) => {
    try {
      const q = req.query.q ? String(req.query.q) : undefined;
      const limit = req.query.limit ? Number(req.query.limit) : undefined;
      const id = req.query.id ? Number(req.query.id) : undefined;
      const offset = req.query.offset ? Number(req.query.offset) : undefined;
      const availableOnly = String(req.query.status || "").toLowerCase() === "available";
      res.json({
        success: true,
        data: await productsService.listProducts({ q, limit, id, availableOnly, offset }),
      });
    } catch (e) {
      next(e);
    }
  });

  app.put(
    "/api/products/:id",
    authorizeRole(PRODUCT_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        const result = await productsService.updateProduct(
          id,
          req.body as UpdateProductPayload,
        );
        // Log update
        if (req.user) {
          await addAuditLog(
            req.user.id,
            req.user.username,
            req.user.roleName,
            "update",
            "product",
            id,
            `ویرایش محصول ${id}`,
          );
        }
        res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    },
  );

  // P0: Manual inventory adjustment for a product
  app.post(
    "/api/products/:id/adjust-stock",
    authorizeRole(PRODUCT_ROLES),
    async (req: Request, res: Response, next: NextFunction) => {
      try {
        const productId = Number(req.params.id);
        if (!productId)
          return res
            .status(400)
            .json({ success: false, message: "شناسه محصول نامعتبر است." });
        const delta = Number(req.body?.delta);
        if (!Number.isFinite(delta) || delta === 0)
          return res
            .status(400)
            .json({ success: false, message: "delta نامعتبر است." });
        // @ts-ignore
        const userId = req.user?.id;
        const result = await productsService.adjustProductStock(productId, {
          delta,
          reason: req.body?.reason,
          notes: req.body?.notes,
          createdByUserId: userId || null,
        });
        if (req.user) {
          try {
            addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              "update",
              "product",
              productId,
              `اصلاح موجودی محصول #${productId} (delta=${delta})`,
            );
          } catch {}
        }
        return res.json({ success: true, data: result });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    "/api/products/:id",
    authorizeRole(PRODUCT_ROLES),
    async (req, res, next) => {
      try {
        const id = +req.params.id;
        const ok = await productsService.deleteProduct(id);
        if (ok) {
          // Log deletion
          if (req.user) {
            await addAuditLog(
              req.user.id,
              req.user.username,
              req.user.roleName,
              "delete",
              "product",
              id,
              `حذف محصول ${id}`,
            );
          }
          res.json({ success: true, message: "محصول با موفقیت حذف شد." });
        } else {
          res
            .status(404)
            .json({ success: false, message: "محصول برای حذف یافت نشد." });
        }
      } catch (e) {
        next(e);
      }
    },
  );

  // دسته‌بندی
  app.post(
    "/api/categories",
    authorizeRole(PRODUCT_ROLES),
    async (req, res, next) => {
      try {
        const name = (req.body?.name || "").trim();
        if (!name)
          return res
            .status(400)
            .json({ success: false, message: "نام دسته‌بندی الزامی است." });
        res
          .status(201)
          .json({ success: true, data: await productsService.createCategory(name) });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get("/api/categories", async (_req, res, next) => {
    try {
      res.json({ success: true, data: await productsService.listCategories() });
    } catch (e) {
      next(e);
    }
  });

  app.put(
    "/api/categories/:id",
    authorizeRole(PRODUCT_ROLES),
    async (req, res, next) => {
      try {
        const name = (req.body?.name || "").trim();
        if (!name)
          return res
            .status(400)
            .json({ success: false, message: "نام دسته‌بندی الزامی است." });
        res.json({
          success: true,
          data: await productsService.updateCategory(+req.params.id, name),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    "/api/categories/:id",
    authorizeRole(PRODUCT_ROLES),
    async (req, res, next) => {
      try {
        const ok = await productsService.deleteCategory(+req.params.id);
        ok
          ? res.json({ success: true, message: "دسته‌بندی با موفقیت حذف شد." })
          : res
              .status(404)
              .json({ success: false, message: "دسته‌بندی برای حذف یافت نشد." });
      } catch (e) {
        next(e);
      }
    },
  );
};
