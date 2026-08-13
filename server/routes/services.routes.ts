import type { Express, RequestHandler } from "express";
import {
  addServiceToDb,
  deleteServiceFromDb,
  getAllServicesFromDb,
  updateServiceInDb,
  type Service,
} from "../database";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type ServicesRouteDeps = {
  authorizeRole: AuthorizeRole;
};

export const registerServicesRoutes = (
  app: Express,
  { authorizeRole }: ServicesRouteDeps,
): void => {
  app.get("/api/services", async (_req, res, next) => {
    try {
      res.json({ success: true, data: await getAllServicesFromDb() });
    } catch (e) {
      next(e);
    }
  });

  app.post(
    "/api/services",
    authorizeRole(["Admin", "Manager", "Technician"]),
    async (req, res, next) => {
      try {
        res.status(201).json({
          success: true,
          data: await addServiceToDb(req.body as Omit<Service, "id">),
          message: "خدمت با موفقیت اضافه شد.",
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.put(
    "/api/services/:id",
    authorizeRole(["Admin", "Manager", "Technician"]),
    async (req, res, next) => {
      try {
        res.json({
          success: true,
          data: await updateServiceInDb(
            +req.params.id,
            req.body as Omit<Service, "id">,
          ),
          message: "خدمت با موفقیت ویرایش شد.",
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.delete(
    "/api/services/:id",
    authorizeRole(["Admin", "Manager", "Technician"]),
    async (req, res, next) => {
      try {
        await deleteServiceFromDb(+req.params.id);
        res.json({ success: true, message: "خدمت با موفقیت حذف شد." });
      } catch (e) {
        next(e);
      }
    },
  );
};
