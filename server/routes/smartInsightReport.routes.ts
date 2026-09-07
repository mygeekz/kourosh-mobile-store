import moment from "jalali-moment";
import type { Express, RequestHandler } from "express";
import { fromShamsiStringToISO } from "../database";
import {
  ensureSmartInsightDecisionMemory,
  getAiFeatureEnabledMap,
} from "../intelligence/smartInsights/smartInsightCore.service";
import { buildSuspiciousInvoiceAudits } from "../intelligence/smartInsights/smartInsightAudit.service";
import { buildCustomerIntelligence } from "../intelligence/smartInsights/smartInsightCustomer.service";
import { buildHiddenProfitInsights } from "../intelligence/smartInsights/smartInsightHiddenProfit.service";
import { buildPricingRecommendations } from "../intelligence/smartInsights/smartInsightPricing.service";
import { buildSalesAgentLeads } from "../intelligence/smartInsights/smartInsightSalesAgent.service";
import { buildRealProfitEngine } from "../intelligence/smartInsights/smartInsightProfitEngine.service";
import {
  buildExecutiveDecisionLayer,
  buildTodayActions,
  summarizeSmartInsightMemory,
} from "../intelligence/smartInsights/smartInsightExecutive.service";
import { buildSalesTrendInsights } from "../intelligence/smartInsights/smartInsightSalesTrend.service";
import { buildSmartReorderInsight } from "../intelligence/smartInsights/smartInsightInventory.service";
import { buildDiscountAnomalyInsight } from "../intelligence/smartInsights/smartInsightDiscount.service";
import { buildHiddenLossInsight } from "../intelligence/smartInsights/smartInsightHiddenLoss.service";
import {
  buildCollectionRiskInsights,
  type SmartInsightCollectionRiskDeps,
} from "../intelligence/smartInsights/smartInsightCollectionRisk.service";
import {
  buildSmartInsightLearningPayload,
  collectSmartInsightLearningState,
} from "../intelligence/smartInsights/smartInsightLearning.service";
import { attachSmartInsightDecisionMemory } from "../intelligence/smartInsights/smartInsightDecisionMemory.service";
import {
  buildSmartInsightReportData,
  createSmartInsightCollector,
  ensureDefaultSmartInsight,
  sortSmartInsightsByPriority,
} from "../intelligence/smartInsights/smartInsightReportSummary.service";

type AuthorizeRole = (allowed: string[]) => RequestHandler;

export const SMART_INSIGHT_REPORT_PATH = "/api/reports/smart-insights";
export const SMART_INSIGHT_REPORT_ROLES = [
  "Admin",
  "Manager",
  "Salesperson",
  "Marketer",
] as const;

export type SmartInsightReportRoutesDeps = SmartInsightCollectionRiskDeps & {
  authorizeRole: AuthorizeRole;
};

export const registerSmartInsightReportRoutes = (
  app: Express,
  {
    authorizeRole,
    buildProductSalesCollectionsReport,
    buildProductSalesCollectionRisk,
    enrichCollectionCenterItems,
  }: SmartInsightReportRoutesDeps,
): void => {
  app.get(
    SMART_INSIGHT_REPORT_PATH,
    authorizeRole([...SMART_INSIGHT_REPORT_ROLES]),
    async (req, res, next) => {
      try {
        await ensureSmartInsightDecisionMemory();
        const nowJ = moment().locale("fa");
        const fromJ = String(
          req.query.fromDate ||
            req.query.from ||
            nowJ.clone().startOf("jMonth").format("jYYYY/jMM/jDD"),
        );
        const toJ = String(
          req.query.toDate ||
            req.query.to ||
            nowJ.clone().format("jYYYY/jMM/jDD"),
        );
        const resetAt = String(req.query.resetAt || "").trim() || null;
        const fromISO = fromShamsiStringToISO(fromJ);
        const toISO = fromShamsiStringToISO(toJ);
        if (!fromISO || !toISO)
          return res
            .status(400)
            .json({ success: false, message: "بازه زمانی نامعتبر است." });

        const toMoment = moment(toISO, "YYYY-MM-DD", true).isValid()
          ? moment(toISO, "YYYY-MM-DD")
          : moment();
        const fromMoment = moment(fromISO, "YYYY-MM-DD", true).isValid()
          ? moment(fromISO, "YYYY-MM-DD")
          : toMoment.clone().subtract(30, "day");
        const previousStartISO = fromMoment
          .clone()
          .subtract(Math.max(7, toMoment.diff(fromMoment, "day") + 1), "day")
          .format("YYYY-MM-DD");
        const recent14ISO = toMoment
          .clone()
          .subtract(14, "day")
          .format("YYYY-MM-DD");
        const todayISO = toMoment.format("YYYY-MM-DD");
        const aiEnabled = await getAiFeatureEnabledMap();
        const aiIsEnabled = (key: string) => aiEnabled[key] !== false;

        const { addInsight, insights } = createSmartInsightCollector();

        const { salesStats, activeDays, avgDaily, trendPct, prevAvgDaily } =
          await buildSalesTrendInsights({
            fromISO,
            toISO,
            previousStartISO,
            previousEndISO: fromMoment
              .clone()
              .subtract(1, "day")
              .format("YYYY-MM-DD"),
            todayISO,
            addInsight,
          });

        await buildSmartReorderInsight({
          recent14ISO,
          toISO,
          aiIsEnabled,
          addInsight,
        });

        await buildDiscountAnomalyInsight({
          fromISO,
          toISO,
          aiIsEnabled,
          addInsight,
        });
        const suspiciousInvoiceAudits = await buildSuspiciousInvoiceAudits({
          fromISO,
          toISO,
          aiIsEnabled,
          addInsight,
          salesStats,
          activeDays,
        });

        const hiddenProfitCards = await buildHiddenProfitInsights({
          fromISO,
          toISO,
          aiIsEnabled,
          addInsight,
        });

        await buildHiddenLossInsight({
          fromISO,
          toISO,
          aiIsEnabled,
          addInsight,
        });

        await buildCollectionRiskInsights({
          fromISO,
          toISO,
          addInsight,
          collectionRiskDeps: {
            buildProductSalesCollectionsReport,
            buildProductSalesCollectionRisk,
            enrichCollectionCenterItems,
          },
        });

        ensureDefaultSmartInsight({
          addInsight,
          fromJ,
          insights,
          salesStats,
          toJ,
        });

        const customerIntelligence = await buildCustomerIntelligence({
          fromISO,
          toISO,
          toMoment,
          aiIsEnabled,
          addInsight,
        });

        const pricingRecommendations = await buildPricingRecommendations({
          fromISO,
          toISO,
          fromMoment,
          toMoment,
          aiIsEnabled,
          addInsight,
        });

        const salesAgentLeads = await buildSalesAgentLeads({
          customerIntelligence,
          pricingRecommendations,
          aiIsEnabled,
          addInsight,
        });

        const profitEngine = await buildRealProfitEngine({
          fromISO,
          toISO,
          userId: req.user?.id || null,
          aiIsEnabled,
          addInsight,
        });

        sortSmartInsightsByPriority(insights);

        const learningState = await collectSmartInsightLearningState({
          fromISO,
          toISO,
          activeDays,
          salesStats,
        });

        const memoryRows = await attachSmartInsightDecisionMemory({
          aiIsEnabled,
          insights,
        });
        const todayActions = buildTodayActions({
          aiIsEnabled,
          insights,
        });
        const memorySummary = summarizeSmartInsightMemory(memoryRows);
        const learning = buildSmartInsightLearningPayload({
          learningState,
          memorySummary,
          fromJ,
          toJ,
          resetAt,
          activeDays,
        });

        const {
          summaryCounts,
          executiveBrain,
          dailyBrief,
        } = buildExecutiveDecisionLayer({
          insights,
          todayActions,
          memorySummary,
          memoryRows,
          profitEngine,
          suspiciousInvoiceAudits,
          signalsScore: learningState.signalsScore,
          salesStats,
          trendPct,
          previousAvgDaily: prevAvgDaily,
        });

        const data = buildSmartInsightReportData({
          avgDaily,
          customerIntelligence,
          dailyBrief,
          executiveBrain,
          fromJ,
          hiddenProfitCards,
          insights,
          learning,
          memorySummary,
          pricingRecommendations,
          profitEngine,
          salesAgentLeads,
          salesStats,
          summaryCounts,
          suspiciousInvoiceAudits,
          toJ,
          todayActions,
          trendPct,
        });

        res.json({ success: true, data });
      } catch (err) {
        next(err);
      }
    },
  );
};

// Backward-compatible type aliases for older imports.
export type SmartInsightReportRouteDeps = SmartInsightReportRoutesDeps;
