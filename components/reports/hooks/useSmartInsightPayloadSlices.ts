import { useMemo } from 'react';
import type { CustomerIntelligenceCard, DecisionMemoryOverviewState, HiddenProfitOpportunity, PricingRecommendationRow, ProfitSummaryLike, RealProfitQualityTone, RealProfitRiskInvoice, SalesAgentLeadRow, SmartInsightExecutiveBrain, SmartInsightLearning, SmartInsightPayload, SmartInsightPayloadSlices, SuspiciousAuditLike } from '../types/smartInsightContracts';

type UseSmartInsightPayloadSlicesArgs = {
  payload: SmartInsightPayload;
  num: (value: unknown) => number;
};

const defaultLearning: SmartInsightLearning = {
  level: 'learning',
  label: 'در حال یادگیری',
  description: 'در حال جمع‌آوری سیگنال‌ها',
  confidence: 0,
  signals: [],
};

export default function useSmartInsightPayloadSlices({
  payload,
  num,
}: UseSmartInsightPayloadSlicesArgs): SmartInsightPayloadSlices {
  return useMemo(() => {
    const learning = payload.learning || defaultLearning;
    const summary = payload.summary || {};
    const hiddenProfit = Array.isArray(payload.hiddenProfit) ? payload.hiddenProfit as HiddenProfitOpportunity[] : [];
    const suspiciousAudit = Array.isArray(payload.suspiciousAudit) ? payload.suspiciousAudit as SuspiciousAuditLike[] : [];
    const customerIntelligence = Array.isArray(payload.customerIntelligence) ? payload.customerIntelligence as CustomerIntelligenceCard[] : [];
    const pricingRecommendations = Array.isArray(payload.pricingRecommendations) ? payload.pricingRecommendations as PricingRecommendationRow[] : [];
    const salesAgentLeads = Array.isArray(payload.salesAgentLeads) ? payload.salesAgentLeads as SalesAgentLeadRow[] : [];
    const profitEngine = (payload.profitEngine || {}) as Record<string, unknown> & { summary?: ProfitSummaryLike; riskyInvoices?: RealProfitRiskInvoice[] };
    const profitSummary = (profitEngine.summary || {}) as ProfitSummaryLike;
    const profitRiskyInvoices = Array.isArray(profitEngine.riskyInvoices) ? profitEngine.riskyInvoices as RealProfitRiskInvoice[] : [];
    const profitRealizedShare = num(profitSummary.realProfit) > 0
      ? Math.round((num(profitSummary.recognizedProfit) / Math.max(1, num(profitSummary.realProfit))) * 100)
      : 0;
    const profitRiskShare = num(profitSummary.realProfit) > 0
      ? Math.round((num(profitSummary.profitAtRisk) / Math.max(1, num(profitSummary.realProfit))) * 100)
      : 0;
    const profitQualityTone: RealProfitQualityTone = num(profitSummary.qualityScore) >= 80 ? 'good' : num(profitSummary.qualityScore) >= 55 ? 'watch' : 'risk';

    const customerHighRiskCount = customerIntelligence.filter((customer) => num(customer.riskScore) >= 70).length;
    const customerVipCount = customerIntelligence.filter((customer) => {
      const segments = customer.segments?.length ? customer.segments : [customer.segment].filter(Boolean);
      return segments.some((segment) => String(segment).includes('طلایی') || String(segment).includes('VIP') || String(segment).includes('سودآور'));
    }).length;
    const customerAvgRisk = customerIntelligence.length
      ? Math.round(customerIntelligence.reduce((sum, customer) => sum + num(customer.riskScore), 0) / customerIntelligence.length)
      : 0;

    const criticalCount = num(summary.critical) + num(summary.high);
    const executiveBrain = (payload.executiveBrain || {}) as SmartInsightExecutiveBrain;
    const executiveTone = executiveBrain.status === 'excellent' ? 'emerald' : executiveBrain.status === 'healthy' ? 'indigo' : executiveBrain.status === 'watch' ? 'amber' : 'rose';
    const decisionMemory = summary.decisionMemory || {};

    return {
      learning,
      summary,
      hiddenProfit,
      suspiciousAudit,
      customerIntelligence,
      pricingRecommendations,
      salesAgentLeads,
      profitEngine,
      profitSummary,
      profitRiskyInvoices,
      profitRealizedShare,
      profitRiskShare,
      profitQualityTone,
      customerHighRiskCount,
      customerVipCount,
      customerAvgRisk,
      criticalCount,
      executiveBrain,
      executiveTone,
      decisionMemory: decisionMemory as DecisionMemoryOverviewState,
    };
  }, [num, payload]);
}
