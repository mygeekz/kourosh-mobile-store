import React from 'react';
import { Link } from 'react-router-dom';
import type { NumberFormatter, PercentFormatter, SalesAgentLeadRow, SeverityMetaMap, ShamsiFormatter, SmartInsightLike, MoneyFormatter } from './types/smartInsightContracts';

type AiSalesAgentModalProps = {
  selected: SmartInsightLike;
  onClose: () => void;
  money: MoneyFormatter;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
};

export default function AiSalesAgentModal({
  selected,
  onClose,
  money,
  percent,
  num,
  shamsi,
  severityMeta,
}: AiSalesAgentModalProps) {
  const leads = Array.isArray((selected.target as Record<string, unknown>)?.salesAgent) ? ((selected.target as Record<string, unknown>).salesAgent as SalesAgentLeadRow[]) : [];
  const metricMap = new Map((selected.metrics || []).map((metric) => [String(metric.label || ''), String(metric.value ?? '—')]));
  const topLead = leads[0] || {};
  const totalOpportunity = leads.reduce((sum, lead) => sum + num(lead.opportunityValue || lead.totalSpend || lead.estimatedProfit), 0);
  const openActions = leads.filter((lead) => String(lead.status || '').toLowerCase() !== 'done').length;
  const latestInteraction = leads
    .map((lead) => lead.lastInteractionAt || lead.lastPurchaseAt || lead.updatedAt)
    .filter(Boolean)
    .sort((a, b) => String(b).localeCompare(String(a)))[0] || 'ثبت نشده';
  const assistantKpis = [
    { label: 'مشتریان آماده اقدام', value: metricMap.get('لید فعال') || leads.length.toLocaleString('fa-IR'), suffix: 'مشتری', icon: 'fa-user-check', tone: 'emerald' },
    { label: 'ارزش فرصت‌ها', value: totalOpportunity > 0 ? money(totalOpportunity) : (metricMap.get('هدف') || 'ثبت نشده'), suffix: '', icon: 'fa-coins', tone: 'violet' },
    { label: 'اقدام فوری باز', value: openActions.toLocaleString('fa-IR'), suffix: 'اقدام', icon: 'fa-circle-exclamation', tone: 'orange' },
    { label: 'آخرین تعامل', value: latestInteraction === 'ثبت نشده' ? latestInteraction : shamsi(latestInteraction), suffix: '', icon: 'fa-calendar-check', tone: 'blue' },
  ];
  const assistantReasons = (selected.reasons || []).slice(0, 4);
  const assistantActions = selected.actions || [];
  const assistantMemoryCards = [
    { label: 'وضعیت تصمیم', value: selected.decision?.decisionLabel || 'در انتظار تصمیم', icon: 'fa-hourglass-half', tone: 'blue' },
    { label: 'اولویت اصلی', value: metricMap.get('اولویت') || percent(topLead.priority || selected.score), icon: 'fa-bullseye', tone: 'violet' },
    { label: 'دفعات تکرار', value: num(selected.decision?.occurrenceCount).toLocaleString('fa-IR') + ' بار', icon: 'fa-rotate', tone: 'orange' },
    { label: 'نتیجه تصمیم', value: selected.decision?.outcomeLabel || 'نتیجه ثبت نشده', icon: 'fa-chart-line', tone: 'emerald' },
  ];

  return (
    <div className="agt203-overlay" onClick={() => onClose()}>
      <div className="agt203-dialog" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="agt203-header">
      <span className={`agt203-badge agt203-badge--${selected.severity || 'medium'}`}>
        <i className={`fa-solid ${severityMeta[selected.severity]?.icon || 'fa-headset'}`} />
        {severityMeta[selected.severity]?.label || selected.severity}
      </span>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
    </header>

    <main className="agt203-body">
      <section className="agt203-top-grid">
        {assistantKpis.map((card) => (
          <article key={card.label} className="agt203-kpi">
            <span className={`agt203-kpi__icon agt203-tone-${card.tone}`}>
              <i className={`fa-solid ${card.icon}`} />
            </span>
            <div>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
              {card.suffix ? <em>{card.suffix}</em> : null}
            </div>
          </article>
        ))}
      </section>

      <section className="agt203-content-grid">
        <article className="agt203-panel agt203-table-panel">
          <h3><i className="fa-regular fa-address-card" /> کدام مشتریان آماده اقدام هستند؟</h3>
          <div className="agt203-table">
            <div className="agt203-table-head">
              <span>مشتری</span>
              <span>نوع فرصت</span>
              <span>اولویت</span>
              <span>کانال</span>
              <span>اثر مورد انتظار</span>
              <span>اقدام</span>
            </div>
            <div className="agt203-table-body">
              {leads.slice(0, 5).map((lead, index) => {
                const priority = num(lead.priority);
                const priorityTone = priority >= 78 ? 'danger' : priority >= 62 ? 'warning' : 'ok';
                return (
                  <div key={`${lead.customerId || lead.customerName || index}`} className="agt203-row">
                    <span className="agt203-customer"><i className="fa-regular fa-user" />{lead.customerName || 'مشتری'}</span>
                    <span>{lead.title || lead.intentLabel || 'فرصت فروش'}</span>
                    <span><b className={`agt203-chip agt203-chip--${priorityTone}`}>{percent(priority)}</b></span>
                    <span>{lead.recommendedChannel || 'ثبت نشده'}</span>
                    <span>{lead.expectedImpact || 'ثبت نشده'}</span>
                    <span className="agt203-action-note">{lead.ctaLabel || lead.action || 'ثبت نشده'}</span>
                  </div>
                );
              })}
              {!leads.length ? <div className="agt203-empty">مشتری آماده اقدام در خروجی بک‌اند ارسال نشده است.</div> : null}
            </div>
          </div>
        </article>

        <article className="agt203-panel agt203-reasons">
          <h3><i className="fa-regular fa-circle-question" /> چرا این مشتری مهم است؟</h3>
          <div className="agt203-reason-list">
            {assistantReasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="agt203-reason">
                <i className="fa-solid fa-check" />
                <span>{reason}</span>
              </div>
            ))}
            {!assistantReasons.length ? <div className="agt203-empty">دلیل قابل نمایش از بک‌اند برای این پیشنهاد ارسال نشده است.</div> : null}
          </div>
        </article>
      </section>

      <section className="agt203-lower-grid">
        <article className="agt203-panel agt203-memory">
          <h3><i className="fa-solid fa-brain" /> حافظه تصمیم این پیشنهاد</h3>
          <div className="agt203-memory-grid">
            {assistantMemoryCards.map((card) => (
              <div key={card.label} className="agt203-memory-card">
                <span className={`agt203-memory-icon agt203-tone-${card.tone}`}><i className={`fa-solid ${card.icon}`} /></span>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
        </article>

        {assistantActions.length ? (
          <article className="agt203-panel agt203-actions">
            <h3><i className="fa-regular fa-paper-plane" /> اقدامات پیشنهادی</h3>
            <div className="agt203-action-grid">
              {assistantActions.slice(0, 3).map((action, index) => action.to ? (
                <Link key={`${action.label}-${index}`} to={action.to} className={index === 0 ? 'agt203-action agt203-action--primary' : 'agt203-action agt203-action--secondary'}>
                  <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
                  {action.label}
                </Link>
              ) : (
                <span key={`${action.label}-${index}`} className="agt203-action agt203-action--secondary">
                  <i className={`fa-solid ${action.icon || 'fa-circle-dot'}`} />
                  {action.label}
                </span>
              ))}
            </div>
          </article>
        ) : null}
      </section>
    </main>
      </div>
    </div>
  );
}
