import type { Express } from "express";
import type { AuthorizeRole } from "../routes/intelligence/types";
import { advisoryPolicyPublicSnapshot, getAdvisoryOnlyPolicy } from "./advisoryPolicy";

export const registerAdvisoryPolicyRoutes = (
  app: Express,
  authorizeRole: AuthorizeRole,
): void => {
  app.get(
    "/api/intelligence/advisory/policy",
    authorizeRole(["Admin", "Manager", "Warehouse"]),
    (_request, response) => response.json({
      success: true,
      data: advisoryPolicyPublicSnapshot(getAdvisoryOnlyPolicy()),
    }),
  );
};
