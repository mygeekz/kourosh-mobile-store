import type { Express } from "express";
import {
  buildInventoryStockoutModelArtifactMetadata,
  buildInventoryStockoutModelArtifactMetadataContract,
  buildMlModelArtifactMetadataCatalogSummary,
  listInventoryStockoutModelArtifactMetadata,
  recordInventoryStockoutModelArtifactMetadata,
} from "../../intelligence/datasets/inventoryStockoutModelArtifactMetadata.service";
import {
  buildInventoryStockoutShadowInferenceAdapter,
  buildInventoryStockoutShadowInferenceAdapterContract,
  buildMlShadowInferenceAdapterCatalogSummary,
  listInventoryStockoutShadowInferenceAdapters,
  recordInventoryStockoutShadowInferenceAdapter,
} from "../../intelligence/datasets/inventoryStockoutShadowInferenceAdapter.service";
import {
  buildInventoryStockoutDisabledShadowAdapterShell,
  buildInventoryStockoutDisabledShadowAdapterShellContract,
  buildMlDisabledShadowAdapterShellCatalogSummary,
  listInventoryStockoutDisabledShadowAdapterShells,
  recordInventoryStockoutDisabledShadowAdapterShell,
} from "../../intelligence/datasets/inventoryStockoutDisabledShadowAdapterShell.service";
import {
  buildInventoryStockoutShadowRuntimeContractTestFixtures,
  buildInventoryStockoutShadowRuntimeContractTestFixturesContract,
  buildMlShadowRuntimeContractTestFixturesCatalogSummary,
  listInventoryStockoutShadowRuntimeContractTestFixtures,
  recordInventoryStockoutShadowRuntimeContractTestFixtures,
} from "../../intelligence/datasets/inventoryStockoutShadowRuntimeContractTestFixtures.service";
import {
  buildInventoryStockoutDisabledShadowRuntimeHarness,
  buildInventoryStockoutDisabledShadowRuntimeHarnessContract,
  buildMlDisabledShadowRuntimeHarnessCatalogSummary,
  listInventoryStockoutDisabledShadowRuntimeHarnesses,
  recordInventoryStockoutDisabledShadowRuntimeHarness,
} from "../../intelligence/datasets/inventoryStockoutDisabledShadowRuntimeHarness.service";
import {
  buildInventoryStockoutShadowAdapterObservationLog,
  buildInventoryStockoutShadowAdapterObservationLogContract,
  buildMlShadowAdapterObservationLogCatalogSummary,
  listInventoryStockoutShadowAdapterObservationLogContracts,
  recordInventoryStockoutShadowAdapterObservationLog,
} from "../../intelligence/datasets/inventoryStockoutShadowAdapterObservationLog.service";
import type { IntelligenceRouteDeps } from "./types";

export const registerMlShadowAdapterRoutes = (
  app: Express,
  { authorizeRole }: IntelligenceRouteDeps,
): void => {
  app.get(
    "/api/brain/ml-model-artifacts/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlModelArtifactMetadataCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/model-artifact-metadata/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutModelArtifactMetadataContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/model-artifact-metadata",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutModelArtifactMetadata(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/model-artifact-metadata-records",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const artifactMetadata = await listInventoryStockoutModelArtifactMetadata(req.params.id);
        res.json({ success: true, data: { artifactMetadata, total: artifactMetadata.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/model-artifact-metadata",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutModelArtifactMetadata({
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
    "/api/brain/ml-shadow-inference-adapters/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowInferenceAdapterCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-inference-adapter/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowInferenceAdapterContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-inference-adapter",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowInferenceAdapter(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-inference-adapters",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const shadowAdapters = await listInventoryStockoutShadowInferenceAdapters(req.params.id);
        res.json({ success: true, data: { shadowAdapters, total: shadowAdapters.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/shadow-inference-adapter",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutShadowInferenceAdapter({
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
    "/api/brain/ml-disabled-shadow-adapter-shells/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlDisabledShadowAdapterShellCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/disabled-shadow-adapter-shell/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutDisabledShadowAdapterShellContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/disabled-shadow-adapter-shell",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutDisabledShadowAdapterShell(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/disabled-shadow-adapter-shells",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const shells = await listInventoryStockoutDisabledShadowAdapterShells(req.params.id);
        res.json({ success: true, data: { shells, total: shells.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/disabled-shadow-adapter-shell",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutDisabledShadowAdapterShell({
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
    "/api/brain/ml-shadow-runtime-contract-test-fixtures/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowRuntimeContractTestFixturesCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-runtime-contract-test-fixtures/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowRuntimeContractTestFixturesContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-runtime-contract-test-fixtures",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowRuntimeContractTestFixtures(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/shadow-runtime-contract-test-fixtures",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutShadowRuntimeContractTestFixtures({
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
    "/api/brain/ml-disabled-shadow-runtime-harnesses/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlDisabledShadowRuntimeHarnessCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/disabled-shadow-runtime-harness/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutDisabledShadowRuntimeHarnessContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/disabled-shadow-runtime-harness",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutDisabledShadowRuntimeHarness(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/disabled-shadow-runtime-harnesses",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const harnesses = await listInventoryStockoutDisabledShadowRuntimeHarnesses(req.params.id);
        res.json({ success: true, data: { harnesses, total: harnesses.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/disabled-shadow-runtime-harness",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutDisabledShadowRuntimeHarness({
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
    "/api/brain/ml-shadow-adapter-observation-log-contracts/summary",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = await buildMlShadowAdapterObservationLogCatalogSummary();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-datasets/inventory-stockout/shadow-adapter-observation-log/contract",
    authorizeRole(["Admin", "Manager"]),
    async (_req, res, next) => {
      try {
        const data = buildInventoryStockoutShadowAdapterObservationLogContract();
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-adapter-observation-log",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await buildInventoryStockoutShadowAdapterObservationLog(req.params.id, req.query as Record<string, unknown>);
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-adapter-observation-log-contracts",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const observationContracts = await listInventoryStockoutShadowAdapterObservationLogContracts(req.params.id);
        res.json({ success: true, data: { observationContracts, total: observationContracts.length } });
      } catch (err) {
        next(err);
      }
    },
  );

  app.post(
    "/api/brain/ml-model-imports/:id/shadow-adapter-observation-log",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const data = await recordInventoryStockoutShadowAdapterObservationLog({
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


  // Financial Brain: executive financial decision layer
  // این endpoint مستقل است تا گزارشات فقط به متن Smart Insight وابسته نباشند و خروجی تصمیم‌ساز مالی قابل تست داشته باشند.

  app.get(
    "/api/brain/ml-model-imports/:id/shadow-runtime-contract-test-fixture-runs",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const fixtures = await listInventoryStockoutShadowRuntimeContractTestFixtures(req.params.id);
        res.json({ success: true, data: { fixtures, total: fixtures.length } });
      } catch (err) {
        next(err);
      }
    },
  );
};
