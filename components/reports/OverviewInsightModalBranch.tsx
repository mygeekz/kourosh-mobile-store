import React from 'react';
import DecisionMemoryOverviewModal from './DecisionMemoryOverviewModal';
import RepetitionOverviewModal from './RepetitionOverviewModal';
import SideKpisOverviewModal from './SideKpisOverviewModal';
import type {
  GetDecisionStatusMeta,
  NumberFormatter,
  PercentFormatter,
  ShamsiFormatter,
  SmartInsightLike,
  SmartInsightPayload,
  SmartInsightSummary,
  ProfitSummaryLike,
  SuspiciousAuditLike,
} from './types/smartInsightContracts';

const OVERVIEW_MODAL_TYPES = new Set([
  'decision_memory_overview',
  'repetition_overview',
  'side_kpis_overview',
]);

export const isOverviewInsightModalType = (type?: string) => OVERVIEW_MODAL_TYPES.has(String(type || ''));

type OverviewInsightModalBranchProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  insights: SmartInsightLike[];
  typeLabels: Record<string, string>;
  profitSummary: ProfitSummaryLike | null;
  summary: SmartInsightSummary;
  suspiciousAudit: SuspiciousAuditLike[];
  num: NumberFormatter;
  percent: PercentFormatter;
  shamsi: ShamsiFormatter;
  getDecisionStatusMeta: GetDecisionStatusMeta;
  onClose: () => void;
};

function OverviewInsightModalBranch({
  selected,
  payload,
  insights,
  typeLabels,
  profitSummary,
  summary,
  suspiciousAudit,
  num,
  percent,
  shamsi,
  getDecisionStatusMeta,
  onClose,
}: OverviewInsightModalBranchProps) {
  if (selected.type === 'decision_memory_overview') {
    return (
      <DecisionMemoryOverviewModal
        selected={selected}
        payload={payload}
        insights={insights}
        typeLabels={typeLabels}
        getDecisionStatusMeta={getDecisionStatusMeta}
        num={num}
        shamsi={shamsi}
        onClose={onClose}
      />
    );
  }

  if (selected.type === 'repetition_overview') {
    return (
      <RepetitionOverviewModal
        selected={selected}
        payload={payload}
        insights={insights}
        typeLabels={typeLabels}
        getDecisionStatusMeta={getDecisionStatusMeta}
        num={num}
        shamsi={shamsi}
        onClose={onClose}
      />
    );
  }

  if (selected.type === 'side_kpis_overview') {
    return (
      <SideKpisOverviewModal
        selected={selected}
        payload={payload}
        profitSummary={profitSummary}
        summary={summary}
        suspiciousAudit={suspiciousAudit}
        num={num}
        percent={percent}
        onClose={onClose}
      />
    );
  }

  return null;
}

export default React.memo(OverviewInsightModalBranch);
