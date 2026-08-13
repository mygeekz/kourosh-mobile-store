import React from 'react';
import type { GetDecisionActionState, PercentFormatter, SeverityMetaMap, SmartInsightLike, UpdateDecisionMemory } from './types/smartInsightContracts';

import SmartInsightCard from './SmartInsightCard';
import SmartInsightEmptyState from './SmartInsightEmptyState';

type InsightsGridSectionProps = {
  loading: boolean;
  filtered: SmartInsightLike[];
  severityMeta: SeverityMetaMap;
  typeLabels: Record<string, string>;
  percent: PercentFormatter;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
  setSelected: (value: SmartInsightLike | null) => void;
};

function InsightsGridSection({
  loading,
  filtered,
  severityMeta,
  typeLabels,
  percent,
  getDecisionActionState,
  updateDecisionMemory,
  setSelected,
}: InsightsGridSectionProps) {
  if (loading) {
    return (
      <section className="smart-insights-cards-grid sic230-insight-grid" aria-busy="true">
        {Array.from({ length: 6 }).map((_, index) => (
          <div
            key={index}
            className="smart-insights-card-skeleton h-56 animate-pulse rounded-[26px] border border-slate-200 bg-slate-100 dark:border-slate-800 dark:bg-slate-900"
          />
        ))}
      </section>
    );
  }

  if (!filtered.length) {
    return (
      <section className="smart-insights-cards-grid sic230-insight-grid">
        <SmartInsightEmptyState />
      </section>
    );
  }

  return (
    <section className="smart-insights-cards-grid sic230-insight-grid">
      {filtered.map((insight) => {
        const meta = severityMeta[insight.severity] || severityMeta.medium;
        const insightActionState = getDecisionActionState(insight);

        return (
          <SmartInsightCard
            key={insight.id}
            insight={insight}
            meta={meta}
            typeLabel={typeLabels[insight.type] || insight.category || 'Insight'}
            confidenceLabel={percent(insight.confidence)}
            actionState={insightActionState}
            onOpen={(item) => setSelected(item as SmartInsightLike)}
            onAccept={(item) => void updateDecisionMemory(item, { userDecision: 'accepted', status: 'open' })}
          />
        );
      })}
    </section>
  );
}

export default React.memo(InsightsGridSection);
