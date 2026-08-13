import type { Express, RequestHandler } from "express";
import { partnerOwnershipService } from "../services/partnerOwnership.service";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type PartnerOwnershipRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const PARTNER_OWNERSHIP_READ_ROLES = ["Admin", "Manager"];
const STORE_OWNERSHIP_ADMIN_ROLES = ["Admin"];

const getOptionalDate = (value: unknown) =>
  typeof value === "string" ? value : undefined;

export const registerPartnerOwnershipRoutes = (
  app: Express,
  { authorizeRole }: PartnerOwnershipRouteDeps,
): void => {
  const noStore: RequestHandler = (_req, res, next) => {
    res.setHeader("Cache-Control", "no-store");
    next();
  };
  app.use("/api/store-ownership", noStore);
  app.use("/api/reports/partners", noStore);
  app.get(
    "/api/reports/partners/profit",
    authorizeRole(PARTNER_OWNERSHIP_READ_ROLES),
    async (req, res, next) => {
      try {
        const partnerId =
          req.query.partnerId != null ? Number(req.query.partnerId) : undefined;
        const data = await partnerOwnershipService.getPartnerProfitReport({
          fromDate: getOptionalDate(req.query.fromDate),
          toDate: getOptionalDate(req.query.toDate),
          partnerId,
        });
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/reports/partners/accessories",
    authorizeRole(PARTNER_OWNERSHIP_READ_ROLES),
    async (req, res, next) => {
      try {
        const partnerId = Number(req.query.partnerId);
        if (!partnerId)
          return res
            .status(400)
            .json({ success: false, message: "partnerId الزامی است." });
        const data = await partnerOwnershipService.getPartnerAccessoriesReport({
          partnerId,
          fromDate: getOptionalDate(req.query.fromDate),
          toDate: getOptionalDate(req.query.toDate),
        });
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/reports/partners/phones",
    authorizeRole(PARTNER_OWNERSHIP_READ_ROLES),
    async (req, res, next) => {
      try {
        const partnerId = Number(req.query.partnerId);
        if (!partnerId)
          return res
            .status(400)
            .json({ success: false, message: "partnerId الزامی است." });
        const data = await partnerOwnershipService.getPartnerPhonesReport({
          partnerId,
          fromDate: getOptionalDate(req.query.fromDate),
          toDate: getOptionalDate(req.query.toDate),
        });
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/reports/partners/settlement",
    authorizeRole(PARTNER_OWNERSHIP_READ_ROLES),
    async (req, res, next) => {
      try {
        const data = await partnerOwnershipService.getPartnerSettlementReport({
          fromDate: getOptionalDate(req.query.fromDate),
          toDate: getOptionalDate(req.query.toDate),
        });
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/reports/partners/settlement-transactions",
    authorizeRole(PARTNER_OWNERSHIP_READ_ROLES),
    async (req, res, next) => {
      try {
        const data = await partnerOwnershipService.listPartnerSettlementTransactions({
          fromDate: getOptionalDate(req.query.fromDate),
          toDate: getOptionalDate(req.query.toDate),
        });
        res.json({ success: true, data });
      } catch (error) {
        next(error);
      }
    },
  );


  app.post(
    "/api/reports/partners/settlement-transactions",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        const createdByUserId =
          (req as any)?.user?.id != null ? Number((req as any).user.id) : null;
        const data = await partnerOwnershipService.createPartnerSettlementTransaction({
          body: req.body || {},
          createdByUserId,
        });
        res.status(201).json({
          success: true,
          data,
          message: "ثبت تسویه با موفقیت انجام شد.",
        });
      } catch (error) {
        next(error);
      }
    },
  );

  app.delete(
    "/api/reports/partners/settlement-transactions/:id",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        await partnerOwnershipService.cancelPartnerSettlementTransaction(
          Number(req.params.id),
        );
        res.json({ success: true, message: "تسویه انتخاب‌شده باطل شد." });
      } catch (error) {
        next(error);
      }
    },
  );

  app.get(
    "/api/store-ownership/legacy-partners",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.getLegacyPartnerCandidates(),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/store-ownership/store-partners",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.listStorePartners(),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/store-ownership/store-partners",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        res.status(201).json({
          success: true,
          data: await partnerOwnershipService.createStorePartner(req.body || {}),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.put(
    "/api/store-ownership/store-partners/:id",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.updateStorePartner(
            Number(req.params.id),
            req.body || {},
          ),
        });
      } catch (e) {
        next(e);
      }
    },
  );


  app.post(
    "/api/store-ownership/bootstrap",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        res.status(201).json({
          success: true,
          data: await partnerOwnershipService.bootstrapStoreOwnershipCore(req.body || {}),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.put(
    "/api/store-ownership/configuration",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.saveStoreOwnershipConfiguration(
            req.body || {},
          ),
        });
      } catch (e) {
        next(e);
      }
    },
  );


  app.post(
    "/api/store-ownership/backfill/apply",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.applyStoreOwnershipBackfill(),
        });
      } catch (e) {
        next(e);
      }
    },
  );


  app.get(
    "/api/store-ownership/profit-share-profiles",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.listProfitShareProfiles(),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/store-ownership/profit-share-profiles",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        res.status(201).json({
          success: true,
          data: await partnerOwnershipService.createProfitShareProfile(req.body || {}),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/store-ownership/ownership-profiles",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        res.status(201).json({
          success: true,
          data: await partnerOwnershipService.createOwnershipProfile(req.body || {}),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/store-ownership/ownership-profiles",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.listOwnershipProfiles(),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/store-ownership/coverage",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.getStoreOwnershipCoverage(),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/store-ownership/backfill/preview",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.previewStoreOwnershipBackfill(),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.get(
    "/api/store-ownership/review-queue",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (_req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.listStoreOwnershipReviewQueue(),
        });
      } catch (e) {
        next(e);
      }
    },
  );

  app.post(
    "/api/store-ownership/review-queue/assign",
    authorizeRole(STORE_OWNERSHIP_ADMIN_ROLES),
    async (req, res, next) => {
      try {
        res.json({
          success: true,
          data: await partnerOwnershipService.assignStoreOwnershipReviewItems(
            req.body || {},
          ),
        });
      } catch (e) {
        next(e);
      }
    },
  );
};
