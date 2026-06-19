import React from 'react';
import { Link } from 'react-router-dom';
import type { GetDecisionActionState, HiddenProfitOpportunity, NumberFormatter, PercentFormatter, SeverityMetaMap, ShamsiFormatter, SmartInsightLike, SmartInsightPayload, UpdateDecisionMemory } from './types/smartInsightContracts';

type HiddenProfitModalProps = {
  selected: SmartInsightLike;
  payload: SmartInsightPayload;
  actingInsightId: string | null;
  onClose: () => void;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
};

export default function HiddenProfitModal({
  selected,
  payload,
  actingInsightId,
  onClose,
  percent,
  num,
  shamsi,
  severityMeta,
  getDecisionActionState,
  updateDecisionMemory,
}: HiddenProfitModalProps) {
  const hiddenActionState = getDecisionActionState(selected);
  const activeActions = (selected.actions || []).filter((action) => action.to);
  const primaryMetric = (selected.metrics || [])[0];
  const metricCards = (selected.metrics || []).slice(0, 4);
  const memoryCards = [
    { label: 'وضعیت', value: selected.decision?.statusLabel || 'باز', icon: 'fa-circle-dot', tone: 'blue' },
    { label: 'تصمیم', value: selected.decision?.decisionLabel || 'در انتظار تصمیم', icon: 'fa-clipboard-check', tone: 'violet' },
    { label: 'دفعات تکرار', value: `${num(selected.decision?.occurrenceCount).toLocaleString('fa-IR')} بار`, icon: 'fa-rotate', tone: 'amber' },
    { label: 'آخرین شناسایی', value: selected.decision?.lastGeneratedAt ? shamsi(selected.decision.lastGeneratedAt) : shamsi(selected.createdAt || payload.generatedAt), icon: 'fa-calendar-days', tone: 'emerald' },
  ];

  return (
    <div className="hidden252-overlay" onClick={() => onClose()}>
      <section className="hidden252-surface" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="hidden252-header">
      <div className="hidden252-header__copy">
        <div className="hidden252-eyebrow">
          <span className="hidden252-kicker"><i className="fa-solid fa-sack-dollar" /> HIDDEN PROFIT ENGINE</span>
          <span className={`hidden252-badge hidden252-badge--${selected.severity || 'medium'}`}>{severityMeta[selected.severity]?.label || selected.severity}</span>
        </div>
        <h2>{selected.title}</h2>
        <p>{selected.summary}</p>
      </div>
      <div className="hidden252-hero-card">
        <small>{primaryMetric?.label || 'ارزش فرصت'}</small>
        <strong>{primaryMetric?.value ?? num(selected.score).toLocaleString('fa-IR')}</strong>
        <span>{selected.category || 'فرصت سود'}</span>
      </div>
    </header>

    <main className="hidden252-body">
      <aside className="hidden252-rail" aria-label="خلاصه فرصت سود">
        <article className="hidden252-rail-card hidden252-rail-card--emerald">
          <span className="hidden252-rail-card__icon"><i className="fa-solid fa-chart-line" /></span>
          <small>امتیاز فرصت</small>
          <strong>{num(selected.score).toLocaleString('fa-IR')}</strong>
        </article>
        <article className="hidden252-rail-card hidden252-rail-card--blue">
          <span className="hidden252-rail-card__icon"><i className="fa-solid fa-shield-halved" /></span>
          <small>اعتماد تحلیل</small>
          <strong>{percent(selected.confidence)}</strong>
        </article>
        <article className="hidden252-rail-card hidden252-rail-card--amber">
          <span className="hidden252-rail-card__icon"><i className="fa-solid fa-seedling" /></span>
          <small>دسته</small>
          <strong>{selected.category || 'فرصت سود'}</strong>
        </article>
      </aside>

      <section className="hidden252-main">
        <section className="hidden252-panel hidden252-panel--overview">
          <div className="hidden252-panel__head">
            <div>
              <h3>نقشه فرصت سود</h3>
              <p>مسیرهای کم‌ریسک برای افزایش سود، نمایش بهتر کالا یا تکمیل پیشنهاد فروش در این بخش خلاصه شده‌اند.</p>
            </div>
          </div>
          <div className="hidden252-metric-grid">
            {metricCards.length ? metricCards.map((metric, index) => (
              <article key={`${metric.label}-${index}`} className="hidden252-metric-card">
                <span className="hidden252-metric-card__icon"><i className={`fa-solid ${index === 0 ? 'fa-coins' : index === 1 ? 'fa-chart-simple' : index === 2 ? 'fa-box-open' : 'fa-lightbulb'}`} /></span>
                <small>{metric.label}</small>
                <strong>{metric.value}</strong>
              </article>
            )) : (
              <article className="hidden252-metric-card">
                <span className="hidden252-metric-card__icon"><i className="fa-solid fa-lightbulb" /></span>
                <small>فرصت</small>
                <strong>{selected.category || 'فرصت سود'}</strong>
              </article>
            )}
          </div>
        </section>

        <section className="hidden252-grid">
          <section className="hidden252-panel">
            <div className="hidden252-panel__head">
              <div>
                <h3>چرا این پیشنهاد؟</h3>
                <p>دلایلی که باعث شده سیستم این فرصت را به‌عنوان مسیر سود قابل اقدام ثبت کند.</p>
              </div>
            </div>
            <div className="hidden252-reason-list">
              {(selected.reasons || []).length ? (selected.reasons || []).slice(0, 5).map((reason, index) => (
                <div key={`${reason}-${index}`} className="hidden252-reason-item">
                  <span><i className="fa-solid fa-check" /></span>
                  <p>{reason}</p>
                </div>
              )) : <div className="hidden252-empty">دلیل تکمیلی از بک‌اند ارسال نشده است.</div>}
            </div>
          </section>

          <section className="hidden252-panel">
            <div className="hidden252-panel__head">
              <div>
                <h3>حافظه تصمیم این پیشنهاد</h3>
                <p>ثبت اقدام یا رد این فرصت باعث دقیق‌تر شدن یادگیری عملیاتی سیستم می‌شود.</p>
              </div>
            </div>
            <div className="hidden252-memory-grid">
              {memoryCards.map((card) => (
                <article key={card.label} className={`hidden252-memory-card hidden252-memory-card--${card.tone}`}>
                  <span><i className={`fa-solid ${card.icon}`} /></span>
                  <small>{card.label}</small>
                  <strong>{card.value}</strong>
                </article>
              ))}
            </div>
          </section>
        </section>

        <section className="hidden252-panel hidden252-panel--actions">
          <div className="hidden252-panel__head">
            <div>
              <h3>اقدام پیشنهادی</h3>
              <p>فقط مسیرهای واقعی ارسال‌شده از بک‌اند نمایش داده می‌شوند.</p>
            </div>
          </div>
          <div className="hidden252-action-row">
            {activeActions.length ? activeActions.slice(0, 3).map((action, index) => (
              <Link key={`${action.label}-${index}`} to={action.to || '/reports'} className={index === 0 ? 'hidden252-route hidden252-route--primary' : 'hidden252-route'}>
                <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
                <span>{action.label}</span>
              </Link>
            )) : <div className="hidden252-empty">مسیر واقعی برای این فرصت ثبت نشده است.</div>}
            <button type="button" disabled={hiddenActionState.isActing || hiddenActionState.isAccepted} onClick={() => void updateDecisionMemory(selected, { userDecision: 'accepted', status: 'open' })} className={`hidden252-btn ${hiddenActionState.isAccepted ? 'hidden252-btn--done' : 'hidden252-btn--pending'}`}>
              <i className={`fa-solid ${hiddenActionState.icon}`} />
              {hiddenActionState.label}
            </button>
            <button type="button" disabled={actingInsightId === selected.id} onClick={() => void updateDecisionMemory(selected, { userDecision: 'rejected', status: 'dismissed' })} className="hidden252-btn hidden252-btn--ghost">
              <i className="fa-solid fa-ban" />
              رد شد
            </button>
          </div>
        </section>
      </section>
    </main>
      </section>
    </div>
  );
}
