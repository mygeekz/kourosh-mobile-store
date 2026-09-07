
import { Router } from "express";
import { salesSummary } from "./reports";

export const dashboardRouter = Router();

dashboardRouter.get("/", async (_req, res) => {
  const summary = await salesSummary();
  res.json({
    summary
  });
});
