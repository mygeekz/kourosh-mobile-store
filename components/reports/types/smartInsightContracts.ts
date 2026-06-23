export type InsightSeverity = 'low' | 'medium' | 'high' | 'critical' | string;

export type SeverityVisualMeta = {
  label: string;
  icon: string;
  badge: string;
  border: string;
  text?: string;
  bg?: string;
  tone?: string;
  dot: string;
  soft: string;
  [key: string]: unknown;
};

export type SeverityMetaMap = Record<string, SeverityVisualMeta>;

export type DecisionStatusKey = 'open' | 'accepted' | 'rejected' | 'dismissed' | 'closed' | string;

export type DecisionStatusMeta = {
  key: string;
  label: string;
};

export type DecisionActionState = {
  isActing: boolean;
  isAccepted: boolean;
  icon: string;
  label: string;
};

export type DecisionMemoryPatch = {
  userDecision?: 'accepted' | 'rejected' | string;
  status?: DecisionStatusKey;
  outcome?: 'positive' | 'negative' | string;
  [key: string]: unknown;
};

export type MoneyFormatter = (value: unknown) => string;
export type PercentFormatter = (value: unknown) => string;
export type NumberFormatter = (value: unknown) => number;
export type ShamsiFormatter = (value: unknown) => string;
export type LocalizedNumberParser = (value: unknown) => number;

export type SmartInsightAction = {
  label: string;
  icon?: string;
  to?: string;
  [key: string]: unknown;
};

export type SmartInsightDecision = {
  decisionLabel?: string;
  statusLabel?: string;
  outcomeLabel?: string;
  occurrenceCount?: number;
  [key: string]: unknown;
};

export type SmartInsightLike = {
  id: string;
  type: string;
  category?: string;
  severity: InsightSeverity;
  score?: number;
  confidence?: number;
  title: string;
  summary: string;
  icon?: string;
  tone?: string;
  reasons: string[];
  actions: SmartInsightAction[];
  decision?: SmartInsightDecision;
  target?: unknown;
  metrics: SmartInsightMetric[];
  actionLabel?: string;
  impactLabel?: string;
  to?: string;
  priority?: number;
  [key: string]: unknown;
};

export type UpdateDecisionMemory = (
  insight: SmartInsightLike,
  patch: DecisionMemoryPatch
) => Promise<void> | void;

export type GetDecisionStatusMeta = (decision?: SmartInsightDecision) => DecisionStatusMeta;
export type GetDecisionActionState = (insight: SmartInsightLike) => DecisionActionState;

export type ReportFormatters = {
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
};

export type PricingMoneyFormatter = MoneyFormatter;

export type SmartInsightSummary = {
  totalInsights?: number;
  criticalCount?: number;
  highCount?: number;
  mediumCount?: number;
  lowCount?: number;
  [key: string]: unknown;
};

export type SmartInsightLearning = {
  level?: string;
  label?: string;
  description?: string;
  confidence?: number;
  status?: string;
  signals?: SmartInsightSignal[];
  [key: string]: unknown;
};

export type SmartInsightSignal = {
  label?: string;
  value?: unknown;
  [key: string]: unknown;
};

export type SmartInsightExecutiveBrain = {
  score?: number;
  tone?: string;
  command?: string;
  narrative?: string;
  status?: string;
  statusLabel?: string;
  confidence?: number;
  actions?: SmartInsightLike[];
  nextBestActions?: SmartInsightLike[];
  [key: string]: unknown;
};

export type SmartInsightPayload = {
  dailyBrief?: string[];
  todayActions?: TodayActionItem[];
  predictiveEngine?: PredictiveEnginePayload;
  executiveBrain?: SmartInsightExecutiveBrain;
  learning?: SmartInsightLearning;
  summary?: SmartInsightSummary & { decisionMemory?: DecisionMemoryOverviewState };
  insights?: SmartInsightLike[];
  hiddenProfit?: HiddenProfitOpportunity[];
  suspiciousAudit?: SuspiciousAuditLike[];
  customerIntelligence?: CustomerIntelligenceCard[];
  pricingRecommendations?: PricingRecommendationRow[];
  salesAgentLeads?: SalesAgentLeadRow[];
  profitEngine?: SmartInsightProfitEnginePayload;
  generatedAt?: string;
  [key: string]: unknown;
};

export type ProfitSummaryLike = {
  grossSales?: number;
  realProfit?: number;
  recognizedProfit?: number;
  profitAtRisk?: number;
  marginPct?: number;
  qualityScore?: number;
  [key: string]: unknown;
};

export type SuspiciousAuditLike = {
  id?: string;
  title?: string;
  severity?: InsightSeverity;
  riskScore?: number;
  [key: string]: unknown;
};

export type AlertSelectionState = {
  filter: string;
  selectedId: string | null;
};

export type UnknownRecord = Record<string, unknown>;

export type SmartInsightMetric = {
  label: string;
  value: string | number;
  icon?: string;
  tone?: string;
  [key: string]: unknown;
};

export type SmartInsightTarget = UnknownRecord | null | undefined;

export type SmartInsightActionPatch = DecisionMemoryPatch;

export type InsightModalPayload = SmartInsightPayload & UnknownRecord;

export type AlertReason = string | {
  label?: string;
  text?: string;
  value?: unknown;
  [key: string]: unknown;
};

export type AlertMetric = {
  label?: string;
  value?: unknown;
  icon?: string;
  tone?: string;
  [key: string]: unknown;
};

export type AlertAction = SmartInsightAction;

export type AlertDecision = SmartInsightDecision;

export type AlertManagementSource = 'insight' | 'predictive' | 'today_action' | string;

export type SmartInsightRawPayload = UnknownRecord;

export type InsightCategoryType = string;

export type SmartInsightTypeLabels = Record<string, string>;

export type SmartInsightSeverityFilter = 'all' | 'low' | 'medium' | 'high' | 'critical' | string;

export type SmartInsightActiveTypeFilter = 'all' | string;

export type ProfitSignalMode = 'real_profit' | 'profit_quality';

export type ProfitSignalRow = {
  label?: string;
  value?: unknown;
  amount?: number;
  percent?: number;
  tone?: string;
  icon?: string;
  [key: string]: unknown;
};

export type ProfitSignalReason = {
  label?: string;
  text?: string;
  value?: unknown;
  [key: string]: unknown;
};

export type ProfitSignalMetric = SmartInsightMetric;

export type ProfitRiskInvoice = {
  orderId?: string | number;
  customerName: string;
  label?: string;
  transactionDate?: string;
  riskScore?: number;
  to?: string;
  [key: string]: unknown;
};

export type BoardKpiItem = {
  key?: string | number;
  label?: string;
  value?: unknown;
  icon?: string;
  tone?: string;
  delta?: unknown;
  deltaTone?: string;
  trend?: number[];
  [key: string]: unknown;
};

export type BoardFocusArea = {
  key?: string | number;
  label?: string;
  value?: unknown;
  icon?: string;
  tone?: string;
  [key: string]: unknown;
};

export type ExecutiveActionGuide = {
  title?: string;
  description?: string;
  label?: string;
  metric?: string;
  icon?: string;
  [key: string]: unknown;
};

export type ExecutiveActionOutcomeGuideFactory = (action?: Partial<SmartInsightLike> | Record<string, unknown>) => ExecutiveActionGuide;

export type SparklinePointFactory = (trend?: number[]) => string;

export type LearningToneFactory = (level: unknown) => string;

export type PricingRecommendationRow = {
  productId?: string | number;
  productName: string;
  currentPrice?: number;
  purchasePrice?: number;
  safeMinPrice?: number;
  optimalPrice?: number;
  aggressivePrice?: number;
  marginPct?: number;
  elasticityScore?: number;
  sold7?: number;
  sold30?: number;
  daysToStockout?: number;
  expectedProfitDelta?: number;
  expectedVolumeDelta?: number;
  confidence?: number;
  risk?: string;
  action?: string;
  [key: string]: unknown;
};

export type CustomerRiskRow = {
  customerId?: string | number;
  title?: string;
  recommendation?: string;
  expectedImpact?: string;
  customerName: string;
  phoneNumber?: string;
  segment?: string;
  segments?: string[];
  riskScore?: number;
  profitScore?: number;
  totalSpend?: number;
  estimatedProfit?: number;
  discountRate?: number;
  creditRate?: number;
  daysSinceLast?: number;
  lastPurchaseAt?: string;
  lastPurchaseLabel?: string;
  action?: string;
  [key: string]: unknown;
};

export type ModalReason = {
  label?: string;
  text?: string;
  value?: unknown;
  [key: string]: unknown;
};

export type ModalMetric = SmartInsightMetric;

export type SalesAgentLeadRow = {
  id: string;
  title: string;
  status?: string;
  intentLabel?: string;
  recommendedChannel?: string;
  expectedImpact?: string;
  ctaLabel?: string;
  action?: string;
  opportunityValue?: number;
  totalSpend?: number;
  lastInteractionAt?: string;
  updatedAt?: string;
  customerId?: string | number;
  customerName: string;
  phoneNumber?: string;
  priority?: number;
  segment?: string;
  message?: string;
  lastPurchaseAt?: string;
  expectedProfit?: number;
  [key: string]: unknown;
};

export type HiddenProfitRow = {
  productId?: string | number;
  title?: string;
  metric?: string;
  reason?: string;
  [key: string]: unknown;
};

export type HiddenProfitOpportunity = {
  id?: string;
  subtitle?: string;
  riskScore?: number;
  title?: string;
  label?: string;
  impact?: number;
  confidence?: number;
  action?: string;
  rows?: HiddenProfitRow[];
  metrics?: SmartInsightMetric[];
  [key: string]: unknown;
};

export type CollectionRiskRow = {
  customerId?: string | number;
  outstandingAmount?: number;
  dueInDays?: number;
  lastActionAt?: string;
  kanbanStageLabel?: string;
  nextFollowupDate?: string;
  sourceType?: string;
  orderId?: string | number;
  touchedToday?: boolean;
  label?: string;
  customerName: string;
  phoneNumber?: string;
  overdueAmount?: number;
  dueAmount?: number;
  dueDate?: string;
  overdueDays?: number;
  lastFollowUpAt?: string;
  nextFollowUpAt?: string;
  riskScore?: number;
  followUpLabel?: string;
  action?: string;
  to?: string;
  [key: string]: unknown;
};

export type StockReorderRow = {
  productId?: string | number;
  title?: string;
  subtitle?: string;
  productName?: string;
  sku?: string;
  stock?: number;
  currentStock?: number;
  minStock?: number;
  sold14?: number;
  daysToStockout?: number;
  suggestedQty?: number;
  estimatedProfit14?: number;
  reorderValue?: number;
  confidence?: number;
  action?: string;
  to?: string;
  [key: string]: unknown;
};

export type InvoiceAuditRow = {
  invoiceId?: string | number;
  subtitle?: string;
  riskyItems?: unknown[];
  reasons?: unknown[];
  metrics?: InvoiceAuditIndicator[];
  orderId?: string | number;
  title?: string;
  customerName?: string;
  riskScore?: number;
  severity?: InsightSeverity;
  amount?: number;
  profitImpact?: number;
  suspiciousItems?: unknown[];
  indicators?: unknown[];
  to?: string;
  [key: string]: unknown;
};

export type InvoiceAuditIndicator = {
  label?: string;
  value?: unknown;
  icon?: string;
  tone?: string;
  [key: string]: unknown;
};

export type SuspiciousAuditCard = InvoiceAuditRow & {
  id?: string;
  title?: string;
  invoiceId?: string | number;
  riskyItems?: unknown[];
  reasons?: unknown[];
  metrics?: InvoiceAuditIndicator[];
};

export type SalesPerformanceMetric = {
  label?: string;
  value?: unknown;
  delta?: number;
  trend?: 'up' | 'down' | 'flat' | string;
  icon?: string;
  tone?: string;
  [key: string]: unknown;
};

export type SalesPerformanceRow = {
  label?: string;
  current?: number;
  previous?: number;
  change?: number;
  confidence?: number;
  [key: string]: unknown;
};

export type CustomerIntelligenceCard = CustomerRiskRow & {
  lifetimeValue?: number;
  purchaseCount?: number;
  recommendation?: string;
};

export type DecisionMemoryRow = {
  id?: string;
  type?: string;
  title?: string;
  status?: string;
  statusLabel?: string;
  outcome?: string;
  outcomeLabel?: string;
  userDecision?: string;
  decisionLabel?: string;
  occurrenceCount?: number;
  lastSeenAt?: string;
  [key: string]: unknown;
};

export type RepetitionOverviewRow = DecisionMemoryRow & {
  type?: string;
  category?: string;
  title?: string;
  occurrenceCount?: number;
  lastSeenAt?: string;
  confidence?: number;
  [key: string]: unknown;
};

export type DecisionMemoryOverviewState = {
  accepted?: number;
  rejected?: number;
  dismissed?: number;
  pending?: number;
  repeated?: number;
  total?: number;
  [key: string]: unknown;
};

export type SideKpisOverviewData = {
  activeInsightCount?: number;
  criticalCount?: number;
  profitQuality?: unknown;
  suspiciousAuditCount?: number;
  [key: string]: unknown;
};

export type TodayActionItem = {
  id?: string;
  insightId?: string;
  title?: string;
  summary?: string;
  label?: string;
  action?: string;
  actionLabel?: string;
  icon?: string;
  to?: string;
  linkedInsightId?: string;
  confidence?: number;
  priority?: number;
  severity?: InsightSeverity;
  type?: string;
  decision?: SmartInsightDecision;
  [key: string]: unknown;
};

export type RealProfitRiskInvoice = ProfitRiskInvoice & {
  invoiceId?: string | number;
  profitAtRisk?: number;
  amount?: number;
  riskLabel?: string;
};

export type RealProfitQualityTone = string;

export type DailyBriefItem = string;

export type PredictiveCollectionRisk = {
  overdueAmount?: number;
  overdueCount?: number;
  dueSoonCount?: number;
  [key: string]: unknown;
};

export type PredictiveRiskBuckets = {
  collection?: PredictiveCollectionRisk;
  stockout?: PredictiveStockoutItem[];
  [key: string]: unknown;
};

export type PredictiveForecastPayload = {
  label?: string;
  warning?: string;
  [key: string]: unknown;
};

export type PredictiveEnginePayload = {
  confidence?: number;
  forecast?: PredictiveForecastPayload;
  risks?: PredictiveRiskBuckets;
  alerts?: PredictiveAlertItem[];
  salesForecast?: unknown;
  stockoutItems?: StockReorderRow[];
  futureAlerts?: unknown[];
  updatedAt?: string;
  method?: { label?: string; warning?: string } | string;
  [key: string]: unknown;
};

export type SmartInsightProfitEnginePayload = {
  summary?: ProfitSummaryLike;
  riskyInvoices?: RealProfitRiskInvoice[];
  [key: string]: unknown;
};

export type SmartInsightApiResponse = {
  success?: boolean;
  data?: SmartInsightPayload;
  [key: string]: unknown;
};

export type FinancialAuditApiResponse = {
  success?: boolean;
  data?: unknown;
  [key: string]: unknown;
};

export type SmartInsightSelection = SmartInsightLike | TodayActionItem | SuspiciousAuditCard | Record<string, unknown> | null;

export type SmartInsightSetSelected = (value: SmartInsightSelection) => void;

export type PredictiveStockoutItem = StockReorderRow & {
  stockQuantity?: number;
  soldQty14?: number;
  suggestedBuyQty?: number;
};

export type PredictiveAlertItem = {
  id?: string;
  severity?: InsightSeverity;
  title?: string;
  summary?: string;
  actionLabel?: string;
  to?: string;
  [key: string]: unknown;
};

export type SmartInsightPayloadSlices = {
  learning: SmartInsightLearning;
  summary: SmartInsightSummary;
  hiddenProfit: HiddenProfitOpportunity[];
  suspiciousAudit: SuspiciousAuditLike[];
  customerIntelligence: CustomerIntelligenceCard[];
  pricingRecommendations: PricingRecommendationRow[];
  salesAgentLeads: SalesAgentLeadRow[];
  profitEngine: Record<string, unknown>;
  profitSummary: ProfitSummaryLike;
  profitRiskyInvoices: RealProfitRiskInvoice[];
  profitRealizedShare: number;
  profitRiskShare: number;
  profitQualityTone: RealProfitQualityTone;
  customerHighRiskCount: number;
  customerVipCount: number;
  customerAvgRisk: number;
  criticalCount: number;
  executiveBrain: SmartInsightExecutiveBrain;
  executiveTone: string;
  decisionMemory: DecisionMemoryOverviewState;
};
