import { createHash } from "node:crypto";
import type { Express, Request, Response } from "express";
import { allAsync, getAsync, runAsync } from "../db/query";
import { readPhonePriceComparables } from "../phonePriceEstimate";
import { readInventoryTrainingRows } from "../kouroshAdvisor";
import type { AuthorizeRole } from "../routes/intelligence/types";
import { advisoryArtifactRegistry, phoneArtifactDrift } from "./phoneArtifactRuntime";
import { trainPhoneModelBundle } from "./phonePricingModel";
import { approveArtifact, type PortableRegressionArtifact } from "./portableModel";
import { approveLogisticArtifact } from "./portableModel";
import { inventoryArtifactRegistry } from "./inventoryArtifactRuntime";
import { trainInventoryStockoutArtifact } from "./inventoryStockoutModel";
import { advisoryPolicyPublicSnapshot, getAdvisoryOnlyPolicy } from "./advisoryPolicy";

const PHONE_MINIMUM = 24;
type AdvisoryTask = PortableRegressionArtifact["task"] | "inventory-stockout-risk";

const ensureOperationsTables = async (): Promise<void> => {
  await runAsync(`CREATE TABLE IF NOT EXISTS advisory_model_training_runs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    run_key TEXT NOT NULL UNIQUE,
    dataset_version TEXT NOT NULL,
    dataset_fingerprint TEXT NOT NULL,
    status TEXT NOT NULL,
    artifacts_json TEXT NOT NULL,
    metrics_json TEXT NOT NULL,
    row_counts_json TEXT NOT NULL,
    synthetic_training_data INTEGER NOT NULL DEFAULT 0,
    created_by INTEGER,
    created_at TEXT NOT NULL
  )`);
  await runAsync(`CREATE TABLE IF NOT EXISTS advisory_model_audit_events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_type TEXT NOT NULL,
    task TEXT,
    artifact_id TEXT,
    details_json TEXT NOT NULL,
    user_id INTEGER,
    created_at TEXT NOT NULL
  )`);
};

const audit = async (eventType: string, request: Request, details: Record<string, unknown>, task?: string, artifactId?: string): Promise<void> => {
  await ensureOperationsTables();
  await runAsync(`INSERT INTO advisory_model_audit_events
    (event_type, task, artifact_id, details_json, user_id, created_at) VALUES (?, ?, ?, ?, ?, ?)`, [
    eventType, task || null, artifactId || null, JSON.stringify(details), Number(request.user?.id || 0) || null, new Date().toISOString(),
  ]);
};

const datasetFingerprint = (purchases: unknown[], sales: unknown[]): string =>
  createHash("sha256").update(JSON.stringify({ version: "phone-pricing-v1", purchases, sales })).digest("hex");

export const readAdvisoryReadiness = async () => {
  const { purchases, sales } = await readPhonePriceComparables();
  const distinctPhoneModels = new Set([...purchases, ...sales].map((row) => String(row.model || "").trim()).filter(Boolean)).size;
  const timeToSellRows = sales.filter((row) => row.purchaseDate && row.eventDate).length;
  const inventoryRows = await readInventoryTrainingRows();
  const inventoryPositiveRows = inventoryRows.filter((row) => row.actualStockoutWithinHorizon === 1).length;
  const inventoryNegativeRows = inventoryRows.length - inventoryPositiveRows;
  const productSaleCount = Number((await getAsync("SELECT COUNT(*) AS count FROM sales_order_items WHERE itemType = 'product'").catch(() => ({ count: 0 })))?.count || 0);
  return {
    datasetContractVersion: "advisory-dataset-contract-v1",
    generatedAt: new Date().toISOString(),
    phonePricing: {
      purchaseRows: purchases.length,
      saleRows: sales.length,
      timeToSellRows,
      distinctModels: distinctPhoneModels,
      eligibleForOfflineTraining: purchases.length >= PHONE_MINIMUM && sales.length >= PHONE_MINIMUM,
      blockers: [
        ...(purchases.length < PHONE_MINIMUM ? [`حداقل ${PHONE_MINIMUM} خرید معتبر لازم است.`] : []),
        ...(sales.length < PHONE_MINIMUM ? [`حداقل ${PHONE_MINIMUM} فروش واقعی معتبر لازم است.`] : []),
      ],
    },
    inventory: { labeledOutcomeRows: inventoryRows.length, positiveRows: inventoryPositiveRows, negativeRows: inventoryNegativeRows, eligibleForOfflineTraining: inventoryRows.length >= 60 && inventoryPositiveRows >= 12 && inventoryNegativeRows >= 12 },
    productPricing: { saleRows: productSaleCount, eligibleForOfflineTraining: productSaleCount >= 24 },
    policy: advisoryPolicyPublicSnapshot(getAdvisoryOnlyPolicy()),
    safety: { advisoryOnly: true, automaticTrainingEnabled: false, automaticActivationEnabled: false, businessMutationEnabled: false },
  };
};

const artifactSummary = (artifact: PortableRegressionArtifact) => ({
  artifactId: artifact.artifactId,
  task: artifact.task,
  trainedAt: artifact.trainedAt,
  approval: artifact.approval,
  metrics: artifact.metrics,
  trainingDataFingerprint: artifact.trainingDataFingerprint,
});

export const registerAdvisoryOperationsRoutes = (app: Express, authorizeRole: AuthorizeRole): void => {
  app.get("/api/intelligence/advisory/operations/readiness", authorizeRole(["Admin", "Manager"]), async (_request, response, next) => {
    try { return response.json({ success: true, data: await readAdvisoryReadiness() }); }
    catch (error) { return next(error); }
  });

  app.post("/api/intelligence/advisory/operations/train-phone-candidate", authorizeRole(["Admin", "Manager"]), async (request, response, next) => {
    try {
      const { purchases, sales } = await readPhonePriceComparables();
      const readiness = await readAdvisoryReadiness();
      if (!readiness.phonePricing.eligibleForOfflineTraining) {
        return response.status(409).json({ success: false, message: "داده واقعی برای آموزش آفلاین کافی نیست.", data: readiness.phonePricing });
      }
      const now = new Date();
      const bundle = trainPhoneModelBundle(purchases, sales, { trainedAt: now, syntheticTrainingData: false });
      const artifacts = [bundle.purchase, bundle.sale, ...(bundle.timeToSell ? [bundle.timeToSell] : [])];
      const registry = advisoryArtifactRegistry();
      for (const artifact of artifacts) await registry.put(artifact);
      const fingerprint = datasetFingerprint(purchases, sales);
      const runKey = `phone-pricing-${now.toISOString().replace(/[^0-9]/g, "")}`;
      await ensureOperationsTables();
      await runAsync(`INSERT INTO advisory_model_training_runs
        (run_key, dataset_version, dataset_fingerprint, status, artifacts_json, metrics_json, row_counts_json, synthetic_training_data, created_by, created_at)
        VALUES (?, ?, ?, 'shadow-candidate', ?, ?, ?, 0, ?, ?)`, [
        runKey, "phone-pricing-v1", fingerprint, JSON.stringify(artifacts.map(artifactSummary)),
        JSON.stringify(artifacts.map((item) => ({ artifactId: item.artifactId, metrics: item.metrics }))),
        JSON.stringify({ purchases: purchases.length, sales: sales.length }), Number(request.user?.id || 0) || null, now.toISOString(),
      ]);
      await audit("offline-candidate-trained", request, { runKey, artifactIds: artifacts.map((item) => item.artifactId), datasetFingerprint: fingerprint });
      return response.status(201).json({ success: true, data: { runKey, status: "shadow-candidate", artifacts: artifacts.map(artifactSummary), activated: false } });
    } catch (error) { return next(error); }
  });

  app.post("/api/intelligence/advisory/operations/train-inventory-candidate", authorizeRole(["Admin", "Manager"]), async (request, response, next) => {
    try {
      const rows = await readInventoryTrainingRows();
      const readiness = await readAdvisoryReadiness();
      if (!readiness.inventory.eligibleForOfflineTraining) return response.status(409).json({ success: false, message: "برچسب واقعی برای آموزش مدل کمبود موجودی کافی نیست.", data: readiness.inventory });
      const now = new Date();
      const artifact = trainInventoryStockoutArtifact(rows, now, false);
      await inventoryArtifactRegistry().put(artifact);
      const runKey = `inventory-stockout-${now.toISOString().replace(/[^0-9]/g, "")}`;
      await ensureOperationsTables();
      await runAsync(`INSERT INTO advisory_model_training_runs
        (run_key, dataset_version, dataset_fingerprint, status, artifacts_json, metrics_json, row_counts_json, synthetic_training_data, created_by, created_at)
        VALUES (?, 'inventory-stockout-v1', ?, 'shadow-candidate', ?, ?, ?, 0, ?, ?)`, [
        runKey, artifact.trainingDataFingerprint, JSON.stringify([{ artifactId: artifact.artifactId, task: artifact.task, approval: artifact.approval }]),
        JSON.stringify(artifact.metrics), JSON.stringify({ labeledRows: rows.length }), Number(request.user?.id || 0) || null, now.toISOString(),
      ]);
      await audit("offline-inventory-candidate-trained", request, { runKey, artifactId: artifact.artifactId, datasetFingerprint: artifact.trainingDataFingerprint }, artifact.task, artifact.artifactId);
      return response.status(201).json({ success: true, data: { runKey, status: "shadow-candidate", artifact: { artifactId: artifact.artifactId, task: artifact.task, metrics: artifact.metrics, approval: artifact.approval }, activated: false } });
    } catch (error) { return next(error); }
  });

  app.post("/api/intelligence/advisory/operations/artifacts/:id/approve-activate", authorizeRole(["Admin"]), async (request, response, next) => {
    try {
      const registry = advisoryArtifactRegistry();
      const actor = request.user?.username || `user-${request.user?.id || "unknown"}`;
      const artifactId = String(request.params.id);
      try {
        const candidate = await registry.get(artifactId);
        const approved = approveArtifact(candidate, actor, new Date().toISOString());
        await registry.replace(approved);
        const pointer = await registry.activate(approved.task, approved.artifactId, actor);
        await audit("artifact-approved-and-activated", request, { pointer }, approved.task, approved.artifactId);
        return response.json({ success: true, data: { artifact: artifactSummary(approved), pointer } });
      } catch (phoneError: any) {
        if (!/ENOENT|checksum validation failed/i.test(String(phoneError?.message || phoneError))) throw phoneError;
        const inventoryRegistry = inventoryArtifactRegistry();
        const candidate = await inventoryRegistry.get(artifactId);
        const approved = approveLogisticArtifact(candidate, actor, new Date().toISOString());
        await inventoryRegistry.put(approved, true);
        const pointer = await inventoryRegistry.activate(approved.artifactId, actor);
        await audit("artifact-approved-and-activated", request, { pointer }, approved.task, approved.artifactId);
        return response.json({ success: true, data: { artifact: { artifactId: approved.artifactId, task: approved.task, trainedAt: approved.trainedAt, approval: approved.approval, metrics: approved.metrics }, pointer } });
      }
    } catch (error: any) {
      const message = String(error?.message || error);
      if (/Synthetic|invalid|checksum|eligible|approved/i.test(message)) return response.status(409).json({ success: false, message });
      return next(error);
    }
  });

  app.post("/api/intelligence/advisory/operations/tasks/:task/rollback", authorizeRole(["Admin"]), async (request, response, next) => {
    try {
      const task = String(request.params.task) as AdvisoryTask;
      if (!["phone-purchase-price", "phone-sale-price", "phone-days-to-sell", "product-sale-price"].includes(task)) {
        return response.status(400).json({ success: false, message: "وظیفه مدل معتبر نیست." });
      }
      const actor = request.user?.username || `user-${request.user?.id || "unknown"}`;
      const pointer = task === "inventory-stockout-risk"
        ? await inventoryArtifactRegistry().rollback(actor)
        : await advisoryArtifactRegistry().rollback(task, actor);
      await audit("artifact-rollback", request, { pointer }, task, pointer.activeArtifactId || undefined);
      return response.json({ success: true, data: pointer });
    } catch (error) { return next(error); }
  });

  app.get("/api/intelligence/advisory/operations/status", authorizeRole(["Admin", "Manager"]), async (_request: Request, response: Response, next) => {
    try {
      await ensureOperationsTables();
      const registry = advisoryArtifactRegistry();
      const artifacts = await registry.list();
      const { purchases, sales } = await readPhonePriceComparables();
      const feedback = await getAsync(`SELECT COUNT(*) AS total,
        SUM(CASE WHEN action = 'accepted' THEN 1 ELSE 0 END) AS accepted,
        SUM(CASE WHEN action = 'adjusted' THEN 1 ELSE 0 END) AS adjusted,
        SUM(CASE WHEN action = 'rejected' THEN 1 ELSE 0 END) AS rejected
        FROM advisory_model_feedback`).catch(() => ({ total: 0, accepted: 0, adjusted: 0, rejected: 0 }));
      const recentRuns = await allAsync("SELECT run_key AS runKey, status, dataset_version AS datasetVersion, created_at AS createdAt FROM advisory_model_training_runs ORDER BY id DESC LIMIT 10");
      const activeInventoryArtifact = await inventoryArtifactRegistry().active();
      return response.json({ success: true, data: {
        mode: "human-approved-advisory-only",
        policy: advisoryPolicyPublicSnapshot(getAdvisoryOnlyPolicy()),
        readiness: await readAdvisoryReadiness(),
        artifacts: artifacts.map(artifactSummary),
        inventoryArtifact: activeInventoryArtifact ? { artifactId: activeInventoryArtifact.artifactId, task: activeInventoryArtifact.task, trainedAt: activeInventoryArtifact.trainedAt, approval: activeInventoryArtifact.approval, metrics: activeInventoryArtifact.metrics } : null,
        pointers: { ...Object.fromEntries(await Promise.all(["phone-purchase-price", "phone-sale-price", "phone-days-to-sell"].map(async (task) => [task, await registry.pointer(task as PortableRegressionArtifact["task"])]))), "inventory-stockout-risk": await inventoryArtifactRegistry().pointer() },
        feedback,
        quality: { realizedOutcomeCoverage: false, note: "بازخورد کاربر ثبت می‌شود؛ اتصال قطعی پیشنهاد به فروش نهایی هنوز نیازمند شناسه تراکنش است." },
        drift: await phoneArtifactDrift([...purchases, ...sales], registry),
        recentRuns,
        safety: { automaticDecisioningEnabled: false, automaticActivationEnabled: false, businessMutationEnabled: false, externalAiCallsEnabled: false },
      } });
    } catch (error) { return next(error); }
  });
};
