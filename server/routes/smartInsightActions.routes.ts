import type { Express, RequestHandler } from "express";
import { runAsync } from "../database";
import {
  AI_FEATURE_DEFINITIONS,
  buildPricingAiDecision,
  calculateAiFeatureImpactSummary,
  calculateAiFeatureProgress,
  ensureAiFeatureConfigs,
  ensureSmartInsightDecisionMemory,
  getAiFeatureEnabledMap,
  insightTypeToAiFeatureKey,
  normalizeSmartDecisionValue,
  recordAiFeatureImpactEvent,
  smartDecisionCopy,
  smartInsightMoney,
  smartInsightNum,
  smartInsightRound,
  smartInsightSafeOne,
  smartInsightSafeRows,
} from "../intelligence/smartInsights/smartInsightCore.service";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

type SmartInsightActionRouteDeps = {
  authorizeRole: AuthorizeRole;
};

const SMART_INSIGHT_ACTION_CURRENCY_CONTRACT = {
  currencyBase: "TOMAN",
  displayCurrency: "تومان",
  moneyDivisor: 1,
} as const;

const canManageAiFeatures = (request: any) =>
  ["Admin", "Manager"].includes(String(request?.user?.roleName || ""));

const parseAiControlTimestamp = (value: any) => {
  const raw = String(value || "").trim();
  if (!raw) return Number.NaN;
  const normalized = /^\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}$/.test(raw)
    ? `${raw.replace(" ", "T")}Z`
    : /^\d{4}-\d{2}-\d{2}$/.test(raw)
      ? `${raw}T12:00:00Z`
      : raw;
  const timestamp = new Date(normalized).getTime();
  return Number.isFinite(timestamp) ? timestamp : Number.NaN;
};

const buildAiFeatureControlPayload = async (request: any) => {
  const enabledMap = await getAiFeatureEnabledMap();
  const calculatedFeatures = await calculateAiFeatureProgress(enabledMap);
  const [configRows, impactSummary, decisionSummary, reviewSummary] = await Promise.all([
    smartInsightSafeRows(`SELECT key, updatedAt, userId FROM ai_feature_configs`),
    smartInsightSafeOne(`SELECT COUNT(*) AS c, MAX(createdAt) AS latestAt FROM ai_feature_impact_events`),
    smartInsightSafeOne(`SELECT COUNT(*) AS c, MAX(updatedAt) AS latestAt FROM smart_insight_decisions`),
    smartInsightSafeOne(`SELECT COUNT(*) AS c, MAX(updatedAt) AS latestAt FROM ai_feature_auto_pause_reviews WHERE dismissedUntil IS NOT NULL AND datetime(dismissedUntil) > datetime('now')`),
  ]);
  const configMap = new Map(
    (configRows || []).map((row: any) => [String(row.key), row]),
  );
  const features = calculatedFeatures.map((feature: any) => ({
    ...feature,
    configUpdatedAt: configMap.get(String(feature.key))?.updatedAt || null,
  }));
  const latestCandidates = [
    ...(configRows || []).map((row: any) => row.updatedAt),
    impactSummary?.latestAt,
    decisionSummary?.latestAt,
    reviewSummary?.latestAt,
  ]
    .map((value) => String(value || '').trim())
    .filter(Boolean)
    .sort((a, b) => parseAiControlTimestamp(a) - parseAiControlTimestamp(b));

  return {
    features,
    generatedAt: new Date().toISOString(),
    latestDataAt: latestCandidates.length ? latestCandidates[latestCandidates.length - 1] : null,
    source: "sqlite-business-records",
    permissions: {
      canManage: canManageAiFeatures(request),
    },
    safety: {
      advisoryOnly: true,
      productionInferenceEnabled: false,
      automaticDecisioningEnabled: false,
      automaticBusinessMutationEnabled: false,
    },
    currency: SMART_INSIGHT_ACTION_CURRENCY_CONTRACT,
    sourceSummary: {
      featureConfigs: configRows.length,
      impactEvents: smartInsightNum(impactSummary?.c),
      decisionMemory: smartInsightNum(decisionSummary?.c),
      activePauseReviews: smartInsightNum(reviewSummary?.c),
    },
  };
};

export const registerSmartInsightActionRoutes = (
  app: Express,
  { authorizeRole }: SmartInsightActionRouteDeps,
): void => {
  app.get(
    "/api/ai/features",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const data = await buildAiFeatureControlPayload(req);
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );



  app.get(
    "/api/ai/features/impact",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (_req, res, next) => {
      try {
        const impact = await calculateAiFeatureImpactSummary();
        res.json({ success: true, data: { impact } });
      } catch (err) {
        next(err);
      }
    },
  );



  app.get(
    "/api/ai/pricing/decision-log",
    authorizeRole(["Admin", "Manager", "Salesperson", "Warehouse"]),
    async (_req, res, next) => {
      try {
        const phoneOrderRows = await smartInsightSafeRows(`
        SELECT 'phone-order-' || soi.id AS id, 'sales-order-phone' AS source, ph.model AS model,
          COALESCE(ph.condition, ph.status, 'فروش گوشی') AS condition,
          COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) AS purchasePrice,
          COALESCE(NULLIF(soi.unitPrice, 0), NULLIF(soi.totalPrice, 0) / MAX(1, COALESCE(soi.quantity, 1)), ph.salePrice, 0) AS finalSale,
          so.transactionDate AS createdAt, so.paymentMethod AS paymentMethod,
          'manual' AS action
        FROM sales_order_items soi
        JOIN sales_orders so ON so.id = soi.orderId
        LEFT JOIN phones ph ON soi.itemType = 'phone' AND soi.itemId = ph.id
        WHERE soi.itemType = 'phone' AND COALESCE(so.status, 'active') = 'active'
          AND COALESCE(NULLIF(soi.unitPrice, 0), NULLIF(soi.totalPrice, 0), ph.salePrice, 0) > 0
          AND COALESCE(NULLIF(ph.currentPurchasePrice, 0), NULLIF(soi.buyPrice, 0), ph.purchasePrice, 0) > 0
      `);
        const standalonePhoneRows = await smartInsightSafeRows(`
        SELECT 'phone-history-' || phones.id AS id, 'phone-sales-history' AS source, phones.model,
          COALESCE(phones.condition, phones.status, 'فروش گوشی') AS condition,
          COALESCE(NULLIF(phones.currentPurchasePrice, 0), phones.purchasePrice, 0) AS purchasePrice,
          COALESCE(phones.salePrice, 0) AS finalSale,
          COALESCE(phones.saleDate, phones.registerDate, phones.purchaseDate) AS createdAt,
          'manual' AS action
        FROM phones
        WHERE COALESCE(phones.salePrice, 0) > 0
          AND COALESCE(NULLIF(phones.currentPurchasePrice, 0), phones.purchasePrice, 0) > 0
          AND (phones.saleDate IS NOT NULL OR phones.status LIKE 'فروخته%')
          AND NOT EXISTS (
            SELECT 1
            FROM sales_order_items soi
            JOIN sales_orders so ON so.id = soi.orderId
            WHERE soi.itemType = 'phone'
              AND soi.itemId = phones.id
              AND COALESCE(so.status, 'active') = 'active'
          )
      `);
        const seen = new Set<string>();
        const items = [
          ...phoneOrderRows,
          ...standalonePhoneRows,
        ]
          .map((row, index) => buildPricingAiDecision(row, index))
          .filter(
            (item) =>
              item.purchasePrice > 0 && item.finalSale > 0 && item.createdAt,
          )
          .filter((item) => {
            const key = `${item.source}-${item.id}-${item.finalSale}`;
            if (seen.has(key)) return false;
            seen.add(key);
            return true;
          })
          .sort(
            (a, b) =>
              new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
          )
          .slice(-500);
        res.setHeader('Cache-Control', 'no-store');
        res.json({
          success: true,
          data: {
            items,
            total: items.length,
            generatedAt: new Date().toISOString(),
            sourceBreakdown: {
              salesOrders: phoneOrderRows.length,
              standalonePhones: standalonePhoneRows.length,
            },
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );


  app.post(
    "/api/ai/features/auto-pause/dismiss",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureAiFeatureConfigs();
        const key = String(req.body?.key || "").trim();
        const def = AI_FEATURE_DEFINITIONS.find((f) => f.key === key);
        if (!def)
          return res
            .status(400)
            .json({ success: false, message: "ماژول هوشمندسازی نامعتبر است." });
        const days = Math.max(1, Math.min(90, Number(req.body?.days) || 14));
        await runAsync(
          `
        INSERT INTO ai_feature_auto_pause_reviews (featureKey, dismissedAt, dismissedUntil, note, updatedAt, userId)
        VALUES (?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'), datetime('now', ?), ?, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'), ?)
        ON CONFLICT(featureKey) DO UPDATE SET dismissedAt = excluded.dismissedAt, dismissedUntil = excluded.dismissedUntil, note = excluded.note, updatedAt = excluded.updatedAt, userId = excluded.userId
      `,
          [
            key,
            `+${days} days`,
            String(req.body?.note || "auto_pause_review_dismissed"),
            (req as any).user?.id || null,
          ],
        );
        const data = await buildAiFeatureControlPayload(req);
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );



  app.post(
    "/api/ai/features/toggle",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureAiFeatureConfigs();
        const key = String(req.body?.key || "").trim();
        const def = AI_FEATURE_DEFINITIONS.find((f) => f.key === key);
        if (!def)
          return res
            .status(400)
            .json({ success: false, message: "ماژول هوشمندسازی نامعتبر است." });
        const enabled =
          req.body?.enabled === true ||
          req.body?.enabled === 1 ||
          req.body?.enabled === "true"
            ? 1
            : 0;
        await runAsync(
          `
        UPDATE ai_feature_configs
        SET enabled = ?, updatedAt = strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'), userId = ?
        WHERE key = ?
      `,
          [enabled, req.user?.id || null, key],
        );
        const data = await buildAiFeatureControlPayload(req);
        res.setHeader("Cache-Control", "no-store");
        res.json({ success: true, data: { ...data, key, enabled: !!enabled } });
      } catch (err) {
        next(err);
      }
    },
  );



  app.post(
    "/api/reports/smart-insights/decisions",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const featureMap = await getAiFeatureEnabledMap();
        if (featureMap.decision_memory === false)
          return res.status(409).json({
            success: false,
            message: "حافظه تصمیمات در تنظیمات هوشمندسازی خاموش است.",
          });
        await ensureSmartInsightDecisionMemory();
        const body = req.body || {};
        const insightId = String(body.insightId || "").trim();
        if (!insightId)
          return res
            .status(400)
            .json({ success: false, message: "شناسه Insight نامعتبر است." });
        const userDecision = normalizeSmartDecisionValue(
          body.userDecision,
          ["pending", "accepted", "rejected", "snoozed"],
          "pending",
        );
        const outcome = normalizeSmartDecisionValue(
          body.outcome,
          ["unknown", "positive", "negative", "neutral"],
          "unknown",
        );
        const status = normalizeSmartDecisionValue(
          body.status,
          ["open", "closed", "dismissed", "snoozed"],
          userDecision === "rejected"
            ? "dismissed"
            : userDecision === "snoozed"
              ? "snoozed"
              : "open",
        );
        const note = String(body.note || "")
          .trim()
          .slice(0, 1000);
        const actionLabel = String(body.actionLabel || "")
          .trim()
          .slice(0, 180);
        await runAsync(
          `
        INSERT INTO smart_insight_decisions (insightId, type, title, severity, score, confidence, status, userDecision, outcome, note, actionLabel, decidedAt, outcomeAt, updatedAt, userId)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, CASE WHEN ? != 'pending' THEN strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc') ELSE NULL END, CASE WHEN ? != 'unknown' THEN strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc') ELSE NULL END, strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc'), ?)
        ON CONFLICT(insightId) DO UPDATE SET
          type = COALESCE(NULLIF(excluded.type, ''), smart_insight_decisions.type), title = COALESCE(NULLIF(excluded.title, ''), smart_insight_decisions.title),
          severity = COALESCE(NULLIF(excluded.severity, ''), smart_insight_decisions.severity), score = excluded.score, confidence = excluded.confidence,
          status = excluded.status, userDecision = excluded.userDecision, outcome = excluded.outcome, note = excluded.note, actionLabel = excluded.actionLabel,
          decidedAt = CASE WHEN excluded.userDecision != 'pending' THEN strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc') ELSE smart_insight_decisions.decidedAt END,
          outcomeAt = CASE WHEN excluded.outcome != 'unknown' THEN strftime('%Y-%m-%dT%H:%M:%SZ', 'now', 'utc') ELSE smart_insight_decisions.outcomeAt END,
          updatedAt = excluded.updatedAt, userId = excluded.userId
      `,
          [
            insightId,
            String(body.type || "")
              .trim()
              .slice(0, 80),
            String(body.title || "")
              .trim()
              .slice(0, 240),
            String(body.severity || "")
              .trim()
              .slice(0, 40),
            smartInsightNum(body.score),
            smartInsightNum(body.confidence),
            status,
            userDecision,
            outcome,
            note,
            actionLabel,
            userDecision,
            outcome,
            req.user?.id || null,
          ],
        );
        const featureKey = insightTypeToAiFeatureKey(
          body.type || "decision_memory",
        );
        await recordAiFeatureImpactEvent(
          featureKey,
          outcome === "positive"
            ? "positive_outcome"
            : outcome === "negative"
              ? "negative_outcome"
              : userDecision === "accepted"
                ? "accepted_decision"
                : userDecision === "rejected"
                  ? "rejected_decision"
                  : "decision_update",
          {
            impactAmount:
              outcome === "positive"
                ? smartInsightNum(body.score) * 10000
                : outcome === "negative"
                  ? -smartInsightNum(body.score) * 10000
                  : 0,
            success: outcome !== "negative",
            context: { insightId, title: body.title, actionLabel },
            userId: req.user?.id || null,
          },
        );
        const row = await smartInsightSafeOne(
          `SELECT * FROM smart_insight_decisions WHERE insightId = ?`,
          [insightId],
        );
        res.json({ success: true, data: { ...row, ...smartDecisionCopy(row) } });
      } catch (err) {
        next(err);
      }
    },
  );


  app.post(
    "/api/reports/smart-insights/reset-learning",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        await ensureSmartInsightDecisionMemory();
        await runAsync(`DELETE FROM smart_insight_decisions`);
        res.json({
          success: true,
          data: { resetAt: new Date().toISOString() },
          message: "حافظه تصمیمات مغز هوشمند پاک شد.",
        });
      } catch (err) {
        next(err);
      }
    },
  );



  app.post(
    "/api/ai/pricing/apply",
    authorizeRole(["Admin", "Manager"]),
    async (req, res, next) => {
      try {
        const featureMap = await getAiFeatureEnabledMap();
        if (featureMap.auto_pricing === false)
          return res.status(409).json({
            success: false,
            message: "قیمت‌گذاری هوشمند در تنظیمات خاموش است.",
          });
        await ensureSmartInsightDecisionMemory();
        const productId = Number(req.body?.productId);
        const newPrice = Number(req.body?.newPrice);
        const note = String(
          req.body?.note || "اعمال قیمت پیشنهادی مغز هوشمند",
        ).slice(0, 500);
        if (
          !Number.isFinite(productId) ||
          productId <= 0 ||
          !Number.isFinite(newPrice) ||
          newPrice <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "شناسه کالا یا قیمت جدید نامعتبر است.",
          });
        }
        const product = await smartInsightSafeOne(
          `SELECT id, name, sellingPrice, purchasePrice FROM products WHERE id = ?`,
          [productId],
        );
        if (!product?.id)
          return res
            .status(404)
            .json({ success: false, message: "کالا پیدا نشد." });
        const safeMinPrice = Math.max(
          smartInsightNum(product.purchasePrice) * 1.08,
          smartInsightNum(product.sellingPrice) * 0.88,
        );
        if (newPrice < safeMinPrice) {
          return res.status(422).json({
            success: false,
            message: `قیمت پیشنهادی پایین‌تر از حد امن فروش است. حد امن: ${smartInsightMoney(safeMinPrice)}`,
          });
        }
        await runAsync(`UPDATE products SET sellingPrice = ? WHERE id = ?`, [
          newPrice,
          productId,
        ]);
        await runAsync(
          `
        INSERT INTO pricing_history (productId, oldPrice, newPrice, source, note, userId)
        VALUES (?, ?, ?, 'ai_brain', ?, ?)
      `,
          [
            productId,
            smartInsightNum(product.sellingPrice),
            newPrice,
            note,
            req.user?.id || null,
          ],
        );
        await recordAiFeatureImpactEvent("auto_pricing", "price_applied", {
          impactAmount: newPrice - smartInsightNum(product.sellingPrice),
          success: true,
          context: {
            productId,
            productName: product.name,
            oldPrice: smartInsightNum(product.sellingPrice),
            newPrice,
          },
          userId: req.user?.id || null,
        });
        res.json({
          success: true,
          data: {
            productId,
            oldPrice: smartInsightNum(product.sellingPrice),
            newPrice,
          },
          message: "قیمت کالا با گارد حد امن اعمال شد.",
        });
      } catch (err) {
        next(err);
      }
    },
  );



  app.post(
    "/api/ai/pricing/simulate",
    authorizeRole(["Admin", "Manager", "Salesperson", "Marketer"]),
    async (req, res, next) => {
      try {
        const featureMap = await getAiFeatureEnabledMap();
        if (featureMap.auto_pricing === false)
          return res.status(409).json({
            success: false,
            message: "شبیه‌سازی قیمت‌گذاری هوشمند خاموش است.",
          });
        const currentPrice = Number(req.body?.currentPrice || 0);
        const purchasePrice = Number(req.body?.purchasePrice || 0);
        const sold30 = Math.max(1, Number(req.body?.sold30 || 1));
        const candidatePrice = Number(req.body?.candidatePrice || currentPrice);
        if (
          !Number.isFinite(currentPrice) ||
          !Number.isFinite(candidatePrice) ||
          currentPrice <= 0 ||
          candidatePrice <= 0
        ) {
          return res.status(400).json({
            success: false,
            message: "قیمت برای شبیه‌سازی نامعتبر است.",
          });
        }
        const lift = (candidatePrice - currentPrice) / currentPrice;
        const elasticityScore = Math.max(
          -2.5,
          Math.min(0.5, Number(req.body?.elasticityScore ?? -0.8)),
        );
        const expectedVolumeDelta = Math.round(elasticityScore * lift * 100);
        const expectedUnits = Math.max(
          0,
          sold30 * (1 + expectedVolumeDelta / 100),
        );
        const currentProfit = (currentPrice - purchasePrice) * sold30;
        const expectedProfit = (candidatePrice - purchasePrice) * expectedUnits;
        res.json({
          success: true,
          data: {
            currencyBase: SMART_INSIGHT_ACTION_CURRENCY_CONTRACT.currencyBase,
            displayCurrency: SMART_INSIGHT_ACTION_CURRENCY_CONTRACT.displayCurrency,
            moneyDivisor: SMART_INSIGHT_ACTION_CURRENCY_CONTRACT.moneyDivisor,
            currentProfit: smartInsightRound(currentProfit),
            expectedProfit: smartInsightRound(expectedProfit),
            expectedProfitDelta: smartInsightRound(
              expectedProfit - currentProfit,
            ),
            expectedVolumeDelta,
            expectedUnits: smartInsightRound(expectedUnits),
          },
        });
      } catch (err) {
        next(err);
      }
    },
  );

};
