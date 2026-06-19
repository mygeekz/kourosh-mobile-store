import React from 'react';
import ProfitSignalModal from './ProfitSignalModal';
import type {
  GetDecisionActionState,
  GetDecisionStatusMeta,
  LocalizedNumberParser,
  MoneyFormatter,
  NumberFormatter,
  PercentFormatter,
  SeverityMetaMap,
  ShamsiFormatter,
  SmartInsightLike,
  SmartInsightPayload,
  UpdateDecisionMemory,
} from './types/smartInsightContracts';

const PROFIT_MODAL_TYPES = new Set(['real_profit', 'profit_quality']);

export const isProfitInsightModalType = (type?: string) => PROFIT_MODAL_TYPES.has(String(type || ''));

type ProfitInsightModalBranchProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  actingInsightId: string | null;
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
  parseLocalizedNumber: LocalizedNumberParser;
  getDecisionStatusMeta: GetDecisionStatusMeta;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
  onClose: () => void;
};

function ProfitInsightModalBranch({
  selected,
  payload,
  actingInsightId,
  money,
  percent,
  num,
  shamsi,
  severityMeta,
  parseLocalizedNumber,
  getDecisionStatusMeta,
  getDecisionActionState,
  updateDecisionMemory,
  onClose,
}: ProfitInsightModalBranchProps) {
  if (!isProfitInsightModalType(String(selected.type))) return null;

  return (
    <ProfitSignalModal
      mode={selected.type === 'profit_quality' ? 'profit_quality' : 'real_profit'}
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

export default React.memo(ProfitInsightModalBranch);
