import { Link } from 'react-router-dom';
import type { SeverityVisualMeta, SmartInsightLike } from './types/smartInsightContracts';

export type SmartInsightCardInsight = SmartInsightLike;
export type SmartInsightCardMeta = SeverityVisualMeta;

export type SmartInsightCardActionState = {
  isActing: boolean;
  isAccepted: boolean;
  label: string;
  icon: string;
};

type SmartInsightCardProps = {
  insight: SmartInsightCardInsight;
  meta: SmartInsightCardMeta;
  typeLabel: string;
  confidenceLabel: string;
  actionState: SmartInsightCardActionState;
  onOpen: (insight: SmartInsightCardInsight) => void;
  onAccept: (insight: SmartInsightCardInsight) => void;
};

const metricIcons = ['fa-chart-simple', 'fa-coins', 'fa-clock', 'fa-circle-dot'];

function SmartInsightCardIcon({ name }: { name?: string }) {
  const value = String(name || 'fa-lightbulb');
  if (value.startsWith('fa-')) {
    return <i className={`fa-solid ${value}`} />;
  }
  return <i className="fa-solid fa-lightbulb" />;
}

export default function SmartInsightCard({
  insight,
  meta,
  typeLabel,
  confidenceLabel,
  actionState,
  onOpen,
  onAccept,
}: SmartInsightCardProps) {
  const primaryAction = insight.actions?.[0];

  return (
    <article className={`sic230-insight-card sic257-insight-card group rounded-[26px] border bg-white p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-[0_24px_55px_-38px_rgba(15,23,42,0.42)] dark:bg-slate-900/72 ${meta.border}`}>
      <div className="sic230-insight-card__head sic257-insight-card__head">
        <div className="sic230-insight-card__identity sic257-insight-card__identity">
          <div className={`sic230-insight-card__icon sic257-insight-card__icon ${meta.soft}`}>
            <SmartInsightCardIcon name={insight.icon || meta.icon} />
          </div>
          <div className="sic257-insight-card__copy">
            <div className="sic230-insight-card__chips sic257-insight-card__chips">
              <span className={`sic230-insight-card__chip sic230-insight-card__chip--severity inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-[11px] font-black ${meta.badge}`}>
                <span className={`h-1.5 w-1.5 rounded-full ${meta.dot}`} />
                {meta.label}
              </span>
              <span className="sic230-insight-card__chip sic257-insight-card__chip">{typeLabel}</span>
              <span className="sic230-insight-card__chip sic257-insight-card__chip">{insight.decision?.decisionLabel || 'در انتظار تصمیم'}</span>
            </div>
            <h3 className="sic230-insight-card__title sic257-insight-card__title">{insight.title}</h3>
          </div>
        </div>
        <div className="sic230-insight-card__confidence sic257-insight-card__confidence">
          <span><i className="fa-solid fa-shield-halved" /> اعتماد</span>
          <strong>{confidenceLabel}</strong>
        </div>
      </div>

      <p className="sic230-insight-card__summary sic257-insight-card__summary">{insight.summary}</p>

      <div className="sic230-insight-card__metrics sic257-insight-card__metrics">
        {(insight.metrics || []).slice(0, 4).map((metric, index) => (
          <div key={`${metric.label}-${index}`} className="sic230-insight-card__metric sic257-insight-card__metric">
            <div className="sic230-insight-card__metric-label sic257-insight-card__metric-label">
              <i className={`fa-solid ${metricIcons[index] || 'fa-circle-dot'}`} />
              {metric.label}
            </div>
            <div className="sic230-insight-card__metric-value sic257-insight-card__metric-value">{metric.value}</div>
          </div>
        ))}
      </div>

      <div className="sic230-insight-card__actions sic257-insight-card__actions">
        <button type="button" onClick={() => onOpen(insight)} className="sic230-insight-card__btn sic230-insight-card__btn--why sic257-insight-card__btn">
          <i className="fa-solid fa-circle-question" />
          چرا؟
        </button>
        <button
          type="button"
          disabled={actionState.isActing || actionState.isAccepted}
          onClick={() => onAccept(insight)}
          className={`sic230-insight-card__btn ${actionState.isAccepted ? 'sic230-insight-card__btn--done is-done' : 'sic230-insight-card__btn--pending'} sic257-insight-card__btn`}
        >
          <i className={`fa-solid ${actionState.icon}`} />
          {actionState.label}
        </button>
        {primaryAction?.to ? (
          <Link to={primaryAction.to} className="sic230-insight-card__btn sic230-insight-card__btn--link smart-action-link sic257-insight-card__btn sic257-insight-card__btn--route">
            <i className={`fa-solid ${primaryAction.icon || 'fa-arrow-left'}`} />
            {primaryAction.label}
          </Link>
        ) : null}
      </div>
    </article>
  );
}
