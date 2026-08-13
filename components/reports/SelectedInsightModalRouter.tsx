import BasicInsightModalBranch, { isBasicInsightModalType } from './BasicInsightModalBranch';
import GenericSmartInsightModal from './GenericSmartInsightModal';
import ProfitInsightModalBranch, { isProfitInsightModalType } from './ProfitInsightModalBranch';
import OverviewInsightModalBranch, { isOverviewInsightModalType } from './OverviewInsightModalBranch';
import ActionInsightModalBranch, { isActionInsightModalType, type ActionAlertBoardFilter, type ActionAlertManagementItemData } from './ActionInsightModalBranch';
import type {
  GetDecisionActionState,
  GetDecisionStatusMeta,
  LocalizedNumberParser,
  MoneyFormatter,
  NumberFormatter,
  PercentFormatter,
  PricingMoneyFormatter,
  SeverityMetaMap,
  ShamsiFormatter,
  SmartInsightExecutiveBrain,
  SmartInsightLearning,
  SmartInsightLike,
  SmartInsightSummary,
  ProfitSummaryLike,
  SuspiciousAuditLike,
  UpdateDecisionMemory,
  InsightModalPayload,
} from './types/smartInsightContracts';

export type SelectedInsightModalRouterProps = {
  selected: SmartInsightLike | null;
  payload: InsightModalPayload;
  insights: SmartInsightLike[];
  typeLabels: Record<string, string>;
  severityMeta: SeverityMetaMap;
  profitSummary: ProfitSummaryLike | null;
  summary: SmartInsightSummary;
  suspiciousAudit: SuspiciousAuditLike[];
  alertManagementItems: ActionAlertManagementItemData[];
  alertsBoardFilter: ActionAlertBoardFilter;
  alertsBoardSelectedId: string | null;
  actingInsightId: string | null;
  topExecutiveAction?: SmartInsightLike | null;
  executiveBrain: SmartInsightExecutiveBrain;
  learning: SmartInsightLearning;
  money: MoneyFormatter;
  pricingMoneyToman: PricingMoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  parseLocalizedNumber: LocalizedNumberParser;
  getDecisionStatusMeta: GetDecisionStatusMeta;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
  setAlertsBoardFilter: (value: ActionAlertBoardFilter) => void;
  setAlertsBoardSelectedId: (value: string) => void;
  onClose: () => void;
};

export default function SelectedInsightModalRouter({
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
  onClose,
}: SelectedInsightModalRouterProps) {
  if (!selected) return null;

  if (isBasicInsightModalType(String(selected.type))) {
    return (
      <BasicInsightModalBranch
        selected={selected}
        onClose={onClose}
        money={money}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
      />
    );
  }

  if (isOverviewInsightModalType(String(selected.type))) {
    return (
      <OverviewInsightModalBranch
        selected={selected}
        payload={payload}
        insights={insights}
        typeLabels={typeLabels}
        profitSummary={profitSummary}
        summary={summary}
        suspiciousAudit={suspiciousAudit}
        severityMeta={severityMeta}
        learning={learning}
        customerIntelligence={Array.isArray(payload.customerIntelligence) ? payload.customerIntelligence : []}
        salesAgentLeads={Array.isArray(payload.salesAgentLeads) ? payload.salesAgentLeads : []}
        parseLocalizedNumber={parseLocalizedNumber}
        num={num}
        percent={percent}
        shamsi={shamsi}
        getDecisionStatusMeta={getDecisionStatusMeta}
        onClose={onClose}
      />
    );
  }

  if (isProfitInsightModalType(String(selected.type))) {
    return (
      <ProfitInsightModalBranch
        selected={selected}
        payload={payload}
        actingInsightId={actingInsightId}
        onClose={onClose}
        money={money}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
        parseLocalizedNumber={parseLocalizedNumber}
        getDecisionStatusMeta={getDecisionStatusMeta}
        getDecisionActionState={getDecisionActionState}
        updateDecisionMemory={updateDecisionMemory}
      />
    );
  }

  if (isActionInsightModalType(String(selected.type))) {
    return (
      <ActionInsightModalBranch
        selected={selected}
        payload={payload}
        alertManagementItems={alertManagementItems}
        alertsBoardFilter={alertsBoardFilter}
        alertsBoardSelectedId={alertsBoardSelectedId}
        actingInsightId={actingInsightId}
        topExecutiveAction={topExecutiveAction}
        executiveBrain={executiveBrain}
        learning={learning}
        pricingMoneyToman={pricingMoneyToman}
        money={money}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
        getDecisionActionState={getDecisionActionState}
        updateDecisionMemory={updateDecisionMemory}
        setAlertsBoardFilter={setAlertsBoardFilter}
        setAlertsBoardSelectedId={setAlertsBoardSelectedId}
        onClose={onClose}
      />
    );
  }

  return (
    <GenericSmartInsightModal
      selected={selected}
      actingInsightId={actingInsightId}
      severityMeta={severityMeta}
      num={num}
      percent={percent}
      getDecisionActionState={getDecisionActionState}
      updateDecisionMemory={updateDecisionMemory}
      onClose={onClose}
    />
  );
}
