import type { Express } from "express";
import {
  buildInventoryStockoutProductionReadinessDesign,
  buildInventoryStockoutProductionReadinessDesignContract,
  buildMlProductionReadinessDesignCatalogSummary,
  listInventoryStockoutProductionReadinessDesignSpecs,
  recordInventoryStockoutProductionReadinessDesign,
} from "../../intelligence/datasets/inventoryStockoutProductionReadinessDesign.service";
import {
  buildInventoryStockoutProductionReadinessBacklog,
  buildInventoryStockoutProductionReadinessBacklogContract,
  buildMlProductionReadinessBacklogCatalogSummary,
  listInventoryStockoutProductionReadinessBacklogs,
  recordInventoryStockoutProductionReadinessBacklog,
} from "../../intelligence/datasets/inventoryStockoutProductionReadinessBacklog.service";
import {
  buildInventoryStockoutProductionReleaseGateSimulation,
  buildInventoryStockoutProductionReleaseGateSimulationContract,
  buildMlProductionReleaseGateSimulationCatalogSummary,
  listInventoryStockoutProductionReleaseGateSimulations,
  recordInventoryStockoutProductionReleaseGateSimulation,
} from "../../intelligence/datasets/inventoryStockoutProductionReleaseGateSimulation.service";
import {
  buildInventoryStockoutProductionImplementationCharter,
  buildInventoryStockoutProductionImplementationCharterContract,
  buildMlProductionImplementationCharterCatalogSummary,
  listInventoryStockoutProductionImplementationCharters,
  recordInventoryStockoutProductionImplementationCharter,
} from "../../intelligence/datasets/inventoryStockoutProductionImplementationCharter.service";
import {
  buildInventoryStockoutProductionImplementationWorkOrder,
  buildInventoryStockoutProductionImplementationWorkOrderContract,
  buildMlProductionImplementationWorkOrderCatalogSummary,
  listInventoryStockoutProductionImplementationWorkOrders,
  recordInventoryStockoutProductionImplementationWorkOrder,
} from "../../intelligence/datasets/inventoryStockoutProductionImplementationWorkOrder.service";
import {
  buildInventoryStockoutProductionImplementationDryRunPlan,
  buildInventoryStockoutProductionImplementationDryRunPlanContract,
  buildMlProductionImplementationDryRunPlanCatalogSummary,
  listInventoryStockoutProductionImplementationDryRunPlans,
  recordInventoryStockoutProductionImplementationDryRunPlan,
} from "../../intelligence/datasets/inventoryStockoutProductionImplementationDryRunPlan.service";
import {
  buildInventoryStockoutProductionDryRunExecution,
  buildInventoryStockoutProductionDryRunExecutionContract,
  buildMlProductionDryRunExecutionCatalogSummary,
  listInventoryStockoutProductionDryRunExecutionLogs,
  recordInventoryStockoutProductionDryRunExecution,
} from "../../intelligence/datasets/inventoryStockoutProductionDryRunExecution.service";
import {
  buildInventoryStockoutProductionDryRunCloseoutMemo,
  buildInventoryStockoutProductionDryRunCloseoutMemoContract,
  buildMlProductionDryRunCloseoutMemoCatalogSummary,
  listInventoryStockoutProductionDryRunCloseoutMemos,
  recordInventoryStockoutProductionDryRunCloseoutMemo,
} from "../../intelligence/datasets/inventoryStockoutProductionDryRunCloseoutMemo.service";
import {
  buildInventoryStockoutProductionGovernanceSignoff,
  buildInventoryStockoutProductionGovernanceSignoffContract,
  buildMlProductionGovernanceSignoffCatalogSummary,
  listInventoryStockoutProductionGovernanceSignoffs,
  recordInventoryStockoutProductionGovernanceSignoff,
} from "../../intelligence/datasets/inventoryStockoutProductionGovernanceSignoff.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlProductionReadinessRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-production-readiness-designs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionReadinessDesignCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-readiness-design/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionReadinessDesignContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-readiness-design",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionReadinessDesign(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-readiness-designs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const designSpecs = await listInventoryStockoutProductionReadinessDesignSpecs(req.params.id);
        res.json({ success: true, data: { designSpecs, total: designSpecs.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-readiness-design",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionReadinessDesign({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-production-readiness-backlogs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionReadinessBacklogCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-readiness-backlog/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionReadinessBacklogContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-readiness-backlog",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionReadinessBacklog(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-readiness-backlogs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const backlogs = await listInventoryStockoutProductionReadinessBacklogs(req.params.id);
        res.json({ success: true, data: { backlogs, total: backlogs.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-readiness-backlog",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionReadinessBacklog({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-production-release-gate-simulations/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionReleaseGateSimulationCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-release-gate-simulation/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionReleaseGateSimulationContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-release-gate-simulation",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionReleaseGateSimulation(req.params.id);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-release-gate-simulations",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const simulations = await listInventoryStockoutProductionReleaseGateSimulations(req.params.id);
        res.json({ success: true, data: { simulations, total: simulations.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-release-gate-simulation",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionReleaseGateSimulation({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-production-implementation-charters/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionImplementationCharterCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-implementation-charter/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionImplementationCharterContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-implementation-charter",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionImplementationCharter(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-implementation-charters",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const charters = await listInventoryStockoutProductionImplementationCharters(req.params.id);
        res.json({ success: true, data: { charters, total: charters.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-implementation-charter",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionImplementationCharter({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-production-work-orders/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionImplementationWorkOrderCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-work-order/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionImplementationWorkOrderContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-work-order",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionImplementationWorkOrder(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-work-orders",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const workOrders = await listInventoryStockoutProductionImplementationWorkOrders(req.params.id);
        res.json({ success: true, data: { workOrders, total: workOrders.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-work-order",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionImplementationWorkOrder({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-production-dry-run-plans/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionImplementationDryRunPlanCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-dry-run-plan/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionImplementationDryRunPlanContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-dry-run-plan",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionImplementationDryRunPlan(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-dry-run-plans",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const dryRunPlans = await listInventoryStockoutProductionImplementationDryRunPlans(req.params.id);
        res.json({ success: true, data: { dryRunPlans, total: dryRunPlans.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-dry-run-plan",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionImplementationDryRunPlan({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-production-dry-run-executions/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionDryRunExecutionCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-dry-run-execution/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionDryRunExecutionContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-dry-run-execution",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionDryRunExecution(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-dry-run-executions",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const executionLogs = await listInventoryStockoutProductionDryRunExecutionLogs(req.params.id);
        res.json({ success: true, data: { executionLogs, total: executionLogs.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-dry-run-execution",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionDryRunExecution({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-production-dry-run-closeout-memos/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionDryRunCloseoutMemoCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-dry-run-closeout-memo/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionDryRunCloseoutMemoContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-dry-run-closeout-memo",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionDryRunCloseoutMemo(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-dry-run-closeout-memos",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const closeoutMemos = await listInventoryStockoutProductionDryRunCloseoutMemos(req.params.id);
        res.json({ success: true, data: { closeoutMemos, total: closeoutMemos.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-dry-run-closeout-memo",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionDryRunCloseoutMemo({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-production-governance-signoffs/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlProductionGovernanceSignoffCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/production-governance-signoff/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutProductionGovernanceSignoffContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-governance-signoff",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutProductionGovernanceSignoff(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/production-governance-signoffs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const governanceSignoffs = await listInventoryStockoutProductionGovernanceSignoffs(req.params.id);
        res.json({ success: true, data: { governanceSignoffs, total: governanceSignoffs.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/production-governance-signoff",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutProductionGovernanceSignoff({
          ...(req.body || {}),
          importId: req.params.id,
          userId: (req as any).user?.id || null,
        });
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};
