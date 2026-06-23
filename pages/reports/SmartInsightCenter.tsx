import React, { useState } from 'react';
import moment from 'jalali-moment';
import CustomerIntelligenceSection from '../../components/reports/CustomerIntelligenceSection';
import PricingRecommendationsSection from '../../components/reports/PricingRecommendationsSection';
import PredictiveEngineSection from '../../components/reports/PredictiveEngineSection';
import ExecutiveBrainHeroSection from '../../components/reports/ExecutiveBrainHeroSection';
import TodayActionsSection from '../../components/reports/TodayActionsSection';
import OverviewCardsSection from '../../components/reports/OverviewCardsSection';
import HiddenProfitSection from '../../components/reports/HiddenProfitSection';
import SuspiciousAuditSection from '../../components/reports/SuspiciousAuditSection';
import RealProfitEngineSection from '../../components/reports/RealProfitEngineSection';
import SalesAgentBoardSection from '../../components/reports/SalesAgentBoardSection';
import DailyBriefSection from '../../components/reports/DailyBriefSection';
import InsightsGridSection from '../../components/reports/InsightsGridSection';
import SelectedInsightModalRouter, { type SelectedInsightModalRouterProps } from '../../components/reports/SelectedInsightModalRouter';
import { smartInsightSeverityMeta, smartInsightTypeLabels } from '../../components/reports/smartInsightConstants';
import { getDecisionStatusMeta, getExecutiveActionOutcomeGuide } from '../../components/reports/smartInsightDecisionHelpers';
import { makeSparklinePoints } from '../../components/reports/smartInsightChartHelpers';
import useSmartInsightDerivedData from '../../components/reports/hooks/useSmartInsightDerivedData';
import useSmartInsightCollections from '../../components/reports/hooks/useSmartInsightCollections';
import useSmartInsightAlertManagementItems from '../../components/reports/hooks/useSmartInsightAlertManagementItems';
import useSmartInsightPayloadSlices from '../../components/reports/hooks/useSmartInsightPayloadSlices';
import useSmartInsightDataLoader from '../../components/reports/hooks/useSmartInsightDataLoader';
import useSmartInsightActions from '../../components/reports/hooks/useSmartInsightActions';
import useSmartInsightFormatters from '../../components/reports/hooks/useSmartInsightFormatters';
import useSmartInsightExport from '../../components/reports/hooks/useSmartInsightExport';
import useSalesAgentComposerState from '../../components/reports/hooks/useSalesAgentComposerState';
import type { AlertBoardFilter } from '../../components/reports/AlertManagementModal';
import type { SmartInsightLike, SmartInsightSeverityFilter, SmartInsightActiveTypeFilter } from '../../components/reports/types/smartInsightContracts';
import MessageComposerModal from '../../components/MessageComposerModal';
import Notification from '../../components/Notification';
import { useReportsExports } from '../../contexts/ReportsExportsContext';
import type { NotificationMessage } from '../../types';

const severityMeta = smartInsightSeverityMeta;
const typeLabels = smartInsightTypeLabels;

const startOfCurrentJalaliMonth = () => moment().locale('fa').startOf('jMonth').toDate();

const toJ = (value?: Date | null) => {
  if (!value) return '';
  return moment(value).locale('en').format('jYYYY-jMM-jDD');
};

const learningTone = (level: unknown) => {
  const value = String(level || '').toLowerCase();
  if (value.includes('master') || value.includes('excellent') || value.includes('high')) return 'emerald';
  if (value.includes('watch') || value.includes('medium')) return 'amber';
  if (value.includes('risk') || value.includes('low')) return 'rose';
  return 'indigo';
};

export default function SmartInsightCenter() {
  const { registerReportExports } = useReportsExports();
  const [fromDate, setFromDate] = useState<Date | null>(() => startOfCurrentJalaliMonth());
  const [toDate, setToDate] = useState<Date | null>(() => new Date());
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [activeType, setActiveType] = useState<SmartInsightActiveTypeFilter>('all');
  const [severity, setSeverity] = useState<SmartInsightSeverityFilter>('all');
  const [selected, setSelected] = useState<SmartInsightLike | null>(null);
  const [alertsBoardFilter, setAlertsBoardFilter] = useState<AlertBoardFilter>('all');
  const [alertsBoardSelectedId, setAlertsBoardSelectedId] = useState<string | null>(null);
  const [actingInsightId, setActingInsightId] = useState<string | null>(null);
  const [completedExecutiveActionIds, setCompletedExecutiveActionIds] = useState<string[]>(() => {
    try {
      return JSON.parse(localStorage.getItem('smartInsightCompletedActions') || '[]');
    } catch {
      return [];
    }
  });
  const [lastResetAt, setLastResetAt] = useState<string | null>(() => localStorage.getItem('smartInsightLearningResetAt'));

  const selectInsight = (value: unknown) => setSelected(value as SmartInsightLike | null);

  const { payload, setPayload, loading, fetchData } = useSmartInsightDataLoader({
    fromDate,
    toDate,
    lastResetAt,
    toJ,
    setNotification,
  });
  const { num, money, pricingMoneyToman, percent, shamsi, parseLocalizedNumber } = useSmartInsightFormatters(payload);
  const { insights, types, filtered, todayActions, predictiveAlerts } = useSmartInsightCollections({
    payload,
    activeType,
    severity,
  });
  const {
    salesAgentComposerLead,
    setSalesAgentComposerLead,
    closeComposer,
    handleComposerQueued,
    composerInitialRecipient,
    composerInitialText,
    composerInitialChannels,
  } = useSalesAgentComposerState({ setNotification });

  const {
    learning,
    summary,
    hiddenProfit,
    suspiciousAudit,
    customerIntelligence,
    pricingRecommendations,
    salesAgentLeads,
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
    decisionMemory,
  } = useSmartInsightPayloadSlices({ payload, num });
  const activeInsightCount = filtered.length;
  useSmartInsightExport({
    filtered,
    typeLabels,
    severityMeta,
    registerReportExports,
  });

  const {
    resetLearning,
    updateDecisionMemory,
    getDecisionActionState,
  } = useSmartInsightActions({
    setPayload,
    setSelected: setSelected as React.Dispatch<React.SetStateAction<SmartInsightLike | null>>,
    setNotification,
    setLastResetAt,
    actingInsightId,
    setActingInsightId,
    completedExecutiveActionIds,
    setCompletedExecutiveActionIds,
    executiveBrain,
    learning,
    num,
    getExecutiveActionOutcomeGuide,
  });

  const openExecutiveActions = (executiveBrain.nextBestActions || []).filter((action, index) => !completedExecutiveActionIds.includes(String(action?.id || `executive-action-${index}`)));
  const derivedData = useSmartInsightDerivedData({
    summary,
    executiveBrain,
    learning,
    decisionMemory,
    filtered,
    activeInsightCount,
    criticalCount,
    openExecutiveActions,
    num,
  });
  const { scoreValue, boardFocusAreas, normalizedMicroBars, boardKpis } = derivedData;

  const topExecutiveAction = openExecutiveActions[0] || (executiveBrain.nextBestActions || [])[0];
  const alertManagementItems = useSmartInsightAlertManagementItems({
    insights,
    todayActions,
    predictiveAlerts,
    payload,
    typeLabels,
    getDecisionStatusMeta,
    num,
    shamsi,
    percent,
  });



  const selectedInsightModalRouterProps: SelectedInsightModalRouterProps = {
    selected,
    payload,
    insights,
    typeLabels,
    severityMeta,
    profitSummary,
    summary,
    suspiciousAudit,
    alertManagementItems,
    alertsBoardFilter,
    alertsBoardSelectedId,
    actingInsightId,
    topExecutiveAction,
    executiveBrain,
    learning,
    money,
    pricingMoneyToman,
    percent,
    num,
    shamsi,
    parseLocalizedNumber,
    getDecisionStatusMeta,
    getDecisionActionState,
    updateDecisionMemory,
    setAlertsBoardFilter,
    setAlertsBoardSelectedId,
    onClose: () => setSelected(null),
  };

  return (
    <div className="smart-brain-page space-y-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

            <ExecutiveBrainHeroSection
        executiveBrain={executiveBrain}
        learning={learning}
        summary={summary}
        decisionMemory={decisionMemory}
        topExecutiveAction={topExecutiveAction}
        filtered={filtered}
        activeInsightCount={activeInsightCount}
        criticalCount={criticalCount}
        boardKpis={boardKpis}
        boardFocusAreas={boardFocusAreas}
        openExecutiveActions={openExecutiveActions}
        normalizedMicroBars={normalizedMicroBars}
        scoreValue={scoreValue}
        executiveTone={executiveTone}
        fromDate={fromDate}
        toDate={toDate}
        loading={loading}
        types={types}
        typeLabels={typeLabels}
        activeType={activeType}
        severity={severity}
        severityMeta={severityMeta}
        percent={percent}
        num={num}
        learningTone={learningTone}
        getExecutiveActionOutcomeGuide={getExecutiveActionOutcomeGuide}
        makeSparklinePoints={makeSparklinePoints}
        setFromDate={setFromDate}
        setToDate={setToDate}
        fetchData={fetchData}
        resetLearning={resetLearning}
        setActiveType={setActiveType}
        setSeverity={setSeverity}
        setSelected={selectInsight}
      />

      <PredictiveEngineSection
        payload={payload}
        money={money}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
      />

      <TodayActionsSection
        payload={payload}
        insights={insights}
        alertManagementItems={alertManagementItems}
        executiveBrain={executiveBrain}
        learning={learning}
        getDecisionActionState={getDecisionActionState}
        updateDecisionMemory={updateDecisionMemory}
        setAlertsBoardFilter={(value) => setAlertsBoardFilter(value as AlertBoardFilter)}
        setAlertsBoardSelectedId={setAlertsBoardSelectedId}
        setSelected={selectInsight}
        num={num}
      />

      <OverviewCardsSection
        payload={payload}
        decisionMemory={decisionMemory}
        learning={learning}
        insights={insights}
        criticalCount={criticalCount}
        activeInsightCount={activeInsightCount}
        num={num}
        setSelected={selectInsight}
      />

      <HiddenProfitSection hiddenProfit={hiddenProfit} />

      <SuspiciousAuditSection
        suspiciousAudit={suspiciousAudit}
        insights={insights}
        severityMeta={severityMeta}
        num={num}
        setSelected={selectInsight}
      />

      <RealProfitEngineSection
        profitSummary={profitSummary}
        profitQualityTone={profitQualityTone}
        profitRealizedShare={profitRealizedShare}
        profitRiskShare={profitRiskShare}
        profitRiskyInvoices={profitRiskyInvoices}
        money={money}
        percent={percent}
        num={num}
      />


{customerIntelligence.length ? (
        <CustomerIntelligenceSection
          customers={customerIntelligence}
          highRiskCount={customerHighRiskCount}
          vipCount={customerVipCount}
          avgRiskLabel={percent(customerAvgRisk)}
          money={money}
          percent={percent}
          shamsi={shamsi}
          num={num}
        />
      ) : null}


      {pricingRecommendations.length ? (
        <PricingRecommendationsSection
          recommendations={pricingRecommendations}
          money={pricingMoneyToman}
          percent={percent}
          num={num}
        />
      ) : null}


      <SalesAgentBoardSection
        salesAgentLeads={salesAgentLeads}
        percent={percent}
        onSendMessage={setSalesAgentComposerLead}
      />

      <DailyBriefSection dailyBrief={payload.dailyBrief || []} />

      <InsightsGridSection
        loading={loading}
        filtered={filtered}
        severityMeta={severityMeta}
        typeLabels={typeLabels}
        percent={percent}
        getDecisionActionState={getDecisionActionState}
        updateDecisionMemory={updateDecisionMemory}
        setSelected={selectInsight}
      />

      <MessageComposerModal
        open={!!salesAgentComposerLead}
        onClose={closeComposer}
        onQueued={handleComposerQueued}
        initialRecipient={composerInitialRecipient}
        initialText={composerInitialText}
        initialChannels={composerInitialChannels}
      />

      <SelectedInsightModalRouter {...selectedInsightModalRouterProps} />
    </div>
  );
}
