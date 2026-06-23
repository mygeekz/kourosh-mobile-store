import { Link } from 'react-router-dom';
import type { GetDecisionActionState, NumberFormatter, PercentFormatter, PricingMoneyFormatter, PricingRecommendationRow, ShamsiFormatter, SmartInsightLike, UpdateDecisionMemory } from './types/smartInsightContracts';

type AutoPricingModalProps = {
  selected: SmartInsightLike;
  actingInsightId: string | null;
  onClose: () => void;
  pricingMoneyToman: PricingMoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  getDecisionActionState: GetDecisionActionState;
  updateDecisionMemory: UpdateDecisionMemory;
};

export default function AutoPricingModal({
  selected,
  actingInsightId,
  onClose,
  pricingMoneyToman,
  percent,
  num,
  shamsi,
  getDecisionActionState,
  updateDecisionMemory,
}: AutoPricingModalProps) {
  const pricingRows = Array.isArray((selected.target as Record<string, unknown>)?.pricing) ? ((selected.target as Record<string, unknown>).pricing as PricingRecommendationRow[]) : [];
  const topPricing = pricingRows[0] || null;
  const totalProfitDelta = pricingRows.reduce((sum, row) => sum + num(row.expectedProfitDelta), 0);
  const avgConfidence = pricingRows.length ? pricingRows.reduce((sum, row) => sum + num(row.confidence), 0) / pricingRows.length : num(selected.confidence);
  const highRiskCount = pricingRows.filter((row) => String(row.risk || '').includes('بالا')).length;
  const pricingActions = (selected.actions || []).filter((action) => action.to);
  const pricingKpis = [
    { label: 'پیشنهادهای فعال', value: pricingRows.length.toLocaleString('fa-IR'), icon: 'fa-tags', tone: 'blue' },
    { label: 'اثر سود تخمینی', value: pricingMoneyToman(totalProfitDelta), icon: 'fa-chart-line', tone: totalProfitDelta >= 0 ? 'emerald' : 'rose' },
    { label: 'میانگین اعتماد', value: percent(avgConfidence), icon: 'fa-shield-halved', tone: 'violet' },
    { label: 'ریسک بالا', value: highRiskCount.toLocaleString('fa-IR'), icon: 'fa-triangle-exclamation', tone: highRiskCount ? 'amber' : 'slate' },
  ];
  const pricingMemoryCards = [
    { label: 'وضعیت', value: selected.decision?.statusLabel || 'باز', icon: 'fa-circle-dot' },
    { label: 'تصمیم', value: selected.decision?.decisionLabel || 'در انتظار تصمیم', icon: 'fa-clipboard-check' },
    { label: 'آخرین شناسایی', value: selected.decision?.lastGeneratedAt ? shamsi(selected.decision.lastGeneratedAt) : 'ثبت نشده', icon: 'fa-calendar-check' },
    { label: 'دفعات تکرار', value: `${num(selected.decision?.occurrenceCount).toLocaleString('fa-IR')} بار`, icon: 'fa-rotate' },
  ];
  const pricingActionState = getDecisionActionState(selected);

  return (
    <div className="apr220-overlay" onClick={() => onClose()}>
      <section className="apr220-dialog" onClick={(event) => event.stopPropagation()} dir="rtl" aria-label="مودال قیمت‌گذاری هوشمند">
    <header className="apr220-header">
      <div className="apr220-header__main">
        <span className="apr220-kicker"><i className="fa-solid fa-tags" /> AUTO PRICING ENGINE</span>
        <h2>{selected.title}</h2>
        <p>{selected.summary}</p>
      </div>
      <div className="apr220-header__summary" aria-label="خلاصه قیمت پیشنهادی">
        <small>قیمت پیشنهادی اصلی</small>
        <strong>{topPricing?.optimalPrice ? pricingMoneyToman(topPricing.optimalPrice) : (selected.metrics || []).find((metric) => String(metric.label || '').includes('پیشنهادی'))?.value || '—'}</strong>
        <span>{topPricing?.productName || selected.category || 'قیمت‌گذاری هوشمند'}</span>
      </div>
    </header>

    <main className="apr220-body">
      <section className="apr220-kpi-grid" aria-label="شاخص‌های قیمت‌گذاری">
        {pricingKpis.map((card) => (
          <article key={card.label} className={`apr220-kpi apr220-tone--${card.tone}`}>
            <span className="apr220-kpi__icon"><i className={`fa-solid ${card.icon}`} /></span>
            <div>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="apr220-layout">
        <article className="apr220-panel apr220-panel--table">
          <div className="apr220-panel__head">
            <div>
              <h3><i className="fa-solid fa-list-check" /> پیشنهادهای قیمت</h3>
              <p>همه اعداد از خروجی واقعی موتور قیمت‌گذاری همین بازه خوانده می‌شود.</p>
            </div>
          </div>
          <div className="apr220-table" role="table" aria-label="جدول پیشنهادهای قیمت‌گذاری هوشمند">
            <div className="apr220-table__head" role="row">
              <span role="columnheader">کالا</span>
              <span className="apr226-column-label" role="columnheader"><i className="fa-solid fa-tag" /> فعلی</span>
              <span className="apr226-column-label" role="columnheader"><i className="fa-solid fa-wand-magic-sparkles" /> پیشنهادی</span>
              <span className="apr226-column-label" role="columnheader"><i className="fa-solid fa-shield-halved" /> حد امن</span>
              <span className="apr226-column-label" role="columnheader"><i className="fa-solid fa-chart-line" /> اثر سود</span>
              <span className="apr226-column-label" role="columnheader"><i className="fa-solid fa-triangle-exclamation" /> ریسک</span>
            </div>
            <div className="apr220-table__body">
              {pricingRows.slice(0, 6).map((row, index) => {
                const riskText = row.risk || 'کم';
                const riskTone = String(riskText).includes('بالا') ? 'danger' : String(riskText).includes('کنترل') ? 'warning' : 'ok';
                return (
                  <div key={`${row.productId || row.productName || index}`} className="apr220-table__row" role="row">
                    <span className="apr220-product" role="cell">
                      <strong>{row.productName || 'کالا'}</strong>
                      <small>{row.action || 'پایش قیمت'}</small>
                    </span>
                    <span role="cell">{pricingMoneyToman(row.currentPrice)}</span>
                    <span className="apr220-price" role="cell">{pricingMoneyToman(row.optimalPrice)}</span>
                    <span role="cell">{pricingMoneyToman(row.safeMinPrice)}</span>
                    <span className={num(row.expectedProfitDelta) >= 0 ? 'apr220-delta apr220-delta--positive' : 'apr220-delta apr220-delta--negative'} role="cell">{pricingMoneyToman(row.expectedProfitDelta)}</span>
                    <span role="cell"><b className={`apr220-risk apr220-risk--${riskTone}`}>{riskText}</b></span>
                  </div>
                );
              })}
              {!pricingRows.length ? <div className="apr220-empty">پیشنهاد قیمت قابل نمایش برای این Insight ارسال نشده است.</div> : null}
            </div>
          </div>
        </article>

        <aside className="apr220-side">
          <article className="apr220-panel apr220-panel--reasons">
            <h3><i className="fa-regular fa-lightbulb" /> دلیل پیشنهاد</h3>
            <div className="apr220-reason-list">
              {(selected.reasons || []).slice(0, 5).map((reason, index) => (
                <div key={`${reason}-${index}`} className="apr220-reason">
                  <i className="fa-solid fa-check" />
                  <span>{reason}</span>
                </div>
              ))}
              {!selected.reasons?.length ? <div className="apr220-empty">دلیل قابل نمایش از بک‌اند دریافت نشده است.</div> : null}
            </div>
          </article>

          <article className="apr220-panel apr220-panel--memory">
            <h3><i className="fa-solid fa-brain" /> حافظه تصمیم</h3>
            <div className="apr220-memory-grid">
              {pricingMemoryCards.map((card) => (
                <div key={card.label} className="apr220-memory-card">
                  <i className={`fa-solid ${card.icon}`} />
                  <small>{card.label}</small>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
            <div className="apr220-memory-actions">
              <button type="button" disabled={pricingActionState.isActing || pricingActionState.isAccepted} onClick={() => void updateDecisionMemory(selected, { userDecision: 'accepted', status: 'open' })} className={`smart-decision-action-btn ${pricingActionState.isAccepted ? 'smart-decision-action-btn--done' : 'smart-decision-action-btn--pending'}`}>
                <i className={`fa-solid ${pricingActionState.icon}`} /> {pricingActionState.label}
              </button>
              <button type="button" disabled={actingInsightId === selected.id} onClick={() => void updateDecisionMemory(selected, { userDecision: 'rejected', status: 'dismissed' })}>
                <i className="fa-solid fa-ban" /> رد شد
              </button>
            </div>
          </article>

          {pricingActions.length ? (
            <article className="apr220-panel apr220-panel--actions">
              <h3><i className="fa-solid fa-arrow-up-right-from-square" /> مسیر عملیاتی</h3>
              <div className="apr220-action-list">
                {pricingActions.slice(0, 2).map((action, index) => (
                  <Link key={`${action.label}-${index}`} to={action.to || '/products'} className="apr220-action-link">
                    <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
                    {action.label}
                  </Link>
                ))}
              </div>
            </article>
          ) : null}
        </aside>
      </section>
    </main>
      </section>
    </div>
  );
}
