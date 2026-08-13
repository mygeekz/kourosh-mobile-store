import React from 'react';
import AlertManagementModal from './AlertManagementModal';
import AutoPricingModal from './AutoPricingModal';
import HiddenProfitModal from './HiddenProfitModal';
import type { AlertBoardFilter, AlertManagementItemData } from './AlertManagementModal';

export type ActionAlertBoardFilter = AlertBoardFilter;
export type ActionAlertManagementItemData = AlertManagementItemData;
import type {
  GetDecisionActionState,
  MoneyFormatter,
  NumberFormatter,
  PercentFormatter,
  PricingMoneyFormatter,
  SeverityMetaMap,
  ShamsiFormatter,
  SmartInsightExecutiveBrain,
  SmartInsightLearning,
  SmartInsightLike,
  InsightModalPayload,
  UpdateDecisionMemory,
} from './types/smartInsightContracts';

const ACTION_MODAL_TYPES = new Set(['auto_pricing', 'alert_management', 'hidden_profit']);

export const isActionInsightModalType = (type?: string) => ACTION_MODAL_TYPES.has(String(type || ''));

type ActionInsightModalBranchProps = {
  selected: SmartInsightLike;
  payload: InsightModalPayload;
  alertManagementItems: AlertManagementItemData[];
  alertsBoardFilter: AlertBoardFilter;
  alertsBoardSelectedId: string | null;
  actingInsightId: string | null;
  topExecutiveAction?: SmartInsightLike | null;
  executiveBrain: SmartInsightExecutiveBrain;
  learning: SmartInsightLearning;
  pricingMoneyToman: PricingMoneyFormatter;
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
  setAlertsBoardFilter: (value: AlertBoardFilter) => void;
  setAlertsBoardSelectedId: (value: string) => void;
  onClose: () => void;
};

function ActionInsightModalBranch({
  selected,
  payload,
  alertManagementItems,
  alertsBoardFilter,
  alertsBoardSelectedId,
  actingInsightId,
  topExecutiveAction,
  executiveBrain,
  learning,
  pricingMoneyToman,
  money,
  percent,
  num,
  shamsi,
  severityMeta,
  getDecisionActionState,
  updateDecisionMemory,
  setAlertsBoardFilter,
  setAlertsBoardSelectedId,
  onClose,
}: ActionInsightModalBranchProps) {
  if (selected.type === 'auto_pricing') {
    return (
      <AutoPricingModal
        selected={selected}
        actingInsightId={actingInsightId}
        onClose={onClose}
        pricingMoneyToman={pricingMoneyToman}
        percent={percent}
        num={num}
        shamsi={shamsi}
        getDecisionActionState={getDecisionActionState}
        updateDecisionMemory={updateDecisionMemory}
      />
    );
  }

  if (selected.type === 'alert_management') {
    return (
      <AlertManagementModal
        selected={selected}
        payload={payload}
        alertManagementItems={alertManagementItems}
        alertsBoardFilter={alertsBoardFilter}
        alertsBoardSelectedId={alertsBoardSelectedId}
        setAlertsBoardFilter={setAlertsBoardFilter}
        setAlertsBoardSelectedId={setAlertsBoardSelectedId}
        onClose={onClose}
        money={money}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
        topExecutiveAction={topExecutiveAction}
        executiveBrain={executiveBrain}
        learning={learning}
      />
    );
  }

  if (selected.type === 'hidden_profit') {
    return (
      <HiddenProfitModal
        selected={selected}
        payload={payload}
        actingInsightId={actingInsightId}
        onClose={onClose}
        percent={percent}
        num={num}
        shamsi={shamsi}
        severityMeta={severityMeta}
        getDecisionActionState={getDecisionActionState}
        updateDecisionMemory={updateDecisionMemory}
      />
    );
  }

  return null;
}

export default React.memo(ActionInsightModalBranch);
