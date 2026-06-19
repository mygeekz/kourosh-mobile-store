import React from 'react';
import { Link } from 'react-router-dom';
import type { CustomerRiskRow, NumberFormatter, PercentFormatter, SeverityMetaMap, ShamsiFormatter, SmartInsightLike } from './types/smartInsightContracts';

type CustomerRiskModalProps = {
  selected: SmartInsightLike;
  onClose: () => void;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
};

export default function CustomerRiskModal({
  selected,
  onClose,
  percent,
  num,
  shamsi,
  severityMeta,
}: CustomerRiskModalProps) {
  const customerRows = Array.isArray((selected.target as Record<string, unknown>)?.customers)
    ? ((selected.target as Record<string, unknown>).customers as CustomerRiskRow[])
    : Array.isArray((selected.target as Record<string, unknown>)?.rows)
      ? ((selected.target as Record<string, unknown>).rows as CustomerRiskRow[])
      : [];
  const metricMap = new Map((selected.metrics || []).map((metric) => [String(metric.label || ''), String(metric.value ?? '—')]));
  const primaryCustomer = customerRows[0] || {};
  const avgRisk = customerRows.length
    ? Math.round(customerRows.reduce((sum, row) => sum + num(row.riskScore), 0) / customerRows.length)
    : num(selected.score);
  const avgProfitScore = customerRows.length
    ? Math.round(customerRows.reduce((sum, row) => sum + num(row.profitScore), 0) / customerRows.length)
    : 0;
  const maxDaysSinceLast = customerRows.length
    ? Math.max(...customerRows.map((row) => num(row.daysSinceLast)))
    : 0;
  const highRiskCount = customerRows.filter((row) => num(row.riskScore) >= 62 || String(row.segment || '').includes('ریزش') || String(row.segment || '').includes('پرریسک')).length;
  const customerKpis = [
    { label: 'ریسک مشتری', value: metricMap.get('ریسک') || percent(primaryCustomer.riskScore || avgRisk), suffix: primaryCustomer.riskScore || avgRisk ? 'نیازمند توجه' : '', icon: 'fa-triangle-exclamation', tone: 'rose' },
    { label: 'آخرین خرید', value: primaryCustomer.daysSinceLast != null ? num(primaryCustomer.daysSinceLast).toLocaleString('fa-IR') : maxDaysSinceLast ? maxDaysSinceLast.toLocaleString('fa-IR') : '—', suffix: primaryCustomer.daysSinceLast != null || maxDaysSinceLast ? 'روز قبل' : '', icon: 'fa-clock', tone: 'blue' },
    { label: 'سودآوری', value: metricMap.get('سودآوری') || percent(primaryCustomer.profitScore || avgProfitScore), suffix: '', icon: 'fa-arrow-trend-up', tone: 'orange' },
    { label: 'مشتریان پرریسک', value: highRiskCount.toLocaleString('fa-IR'), suffix: 'مورد', icon: 'fa-users', tone: 'emerald' },
  ];
  const customerMemoryCards = [
    { label: 'وضعیت تصمیم', value: selected.decision?.decisionLabel || 'در انتظار تصمیم', icon: 'fa-hourglass-half', tone: 'blue' },
    { label: 'آخرین تولید', value: selected.decision?.lastGeneratedAt ? shamsi(selected.decision.lastGeneratedAt) : 'ثبت نشده', icon: 'fa-clock-rotate-left', tone: 'violet' },
    { label: 'دفعات تکرار', value: num(selected.decision?.occurrenceCount).toLocaleString('fa-IR') + ' بار', icon: 'fa-rotate', tone: 'orange' },
    { label: 'نتیجه تصمیم', value: selected.decision?.outcomeLabel || 'نتیجه ثبت نشده', icon: 'fa-chart-line', tone: 'emerald' },
  ];
  const customerActions = selected.actions || [];
  const customerReasons = (selected.reasons || []).slice(0, 4);

  return (
    <div className="cust201-overlay" onClick={() => onClose()}>
      <div className="cust201-dialog" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="cust201-header">
      <span className={`cust201-badge cust201-badge--${selected.severity || 'medium'}`}>
        <i className={`fa-solid ${severityMeta[selected.severity]?.icon || 'fa-circle-info'}`} />
        {severityMeta[selected.severity]?.label || selected.severity}
      </span>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
    </header>

    <main className="cust201-body">
      <section className="cust201-top-grid">
        {customerKpis.map((card) => (
          <article key={card.label} className="cust201-kpi">
            <span className={`cust201-kpi__icon cust201-tone-${card.tone}`}>
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

      <section className="cust201-table-panel">
        <h3><i className="fa-regular fa-address-card" /> وضعیت مشتری‌های نیازمند توجه</h3>
        <div className="cust201-table">
          <div className="cust201-table-head">
            <span>مشتری</span>
            <span>سگمنت</span>
            <span>ریسک</span>
            <span>سودآوری</span>
            <span>آخرین خرید</span>
            <span>اقدام پیشنهادی</span>
          </div>
          <div className="cust201-table-body">
            {customerRows.slice(0, 6).map((row, index) => {
              const risk = num(row.riskScore);
              const segment = row.segment || (Array.isArray(row.segments) ? row.segments[0] : '') || 'ثبت نشده';
              const isHighRisk = risk >= 72 || String(segment).includes('پرریسک') || String(segment).includes('ریزش');
              const isWatch = !isHighRisk && risk >= 55;
              return (
                <div key={`${row.customerId || row.customerName || index}`} className="cust201-row">
                  <span className="cust201-customer"><i className="fa-regular fa-user" />{row.customerName || 'مشتری'}</span>
                  <span><b className={isHighRisk ? 'cust201-chip cust201-chip--danger' : isWatch ? 'cust201-chip cust201-chip--warning' : 'cust201-chip cust201-chip--ok'}>{segment}</b></span>
                  <span className={isHighRisk ? 'cust201-danger-text' : isWatch ? 'cust201-warning-text' : ''}>{percent(risk)}</span>
                  <span>{percent(row.profitScore)}</span>
                  <span>{row.daysSinceLast != null ? `${num(row.daysSinceLast).toLocaleString('fa-IR')} روز قبل` : 'ثبت نشده'}</span>
                  <span className="cust201-action-note">{row.action || 'ثبت نشده'}</span>
                </div>
              );
            })}
            {!customerRows.length ? <div className="cust201-empty">مشتری نیازمند توجه در خروجی بک‌اند ارسال نشده است.</div> : null}
          </div>
        </div>
      </section>

      <section className="cust201-lower-grid">
        <article className="cust201-panel cust201-memory">
          <h3><i className="fa-solid fa-brain" /> حافظه تصمیم</h3>
          <div className="cust201-memory-grid">
            {customerMemoryCards.map((card) => (
              <div key={card.label} className="cust201-memory-card">
                <span className={`cust201-memory-icon cust201-tone-${card.tone}`}><i className={`fa-solid ${card.icon}`} /></span>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="cust201-panel cust201-reasons">
          <h3><i className="fa-regular fa-circle-info" /> چرا این پیشنهاد مهم است؟</h3>
          <div className="cust201-reason-list">
            {customerReasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="cust201-reason">
                <span>{reason}</span>
              </div>
            ))}
            {!customerReasons.length ? <div className="cust201-empty">دلیل قابل نمایش از بک‌اند برای این پیشنهاد ارسال نشده است.</div> : null}
          </div>
        </article>
      </section>
    </main>

    {customerActions.length ? (
      <footer className="cust201-footer">
        {customerActions.slice(0, 3).map((action, index) => action.to ? (
          <Link key={`${action.label}-${index}`} to={action.to} className={index === 0 ? 'cust201-action cust201-action--primary' : 'cust201-action cust201-action--secondary'}>
            <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
            {action.label}
          </Link>
        ) : (
          <span key={`${action.label}-${index}`} className="cust201-action cust201-action--secondary">
            <i className={`fa-solid ${action.icon || 'fa-circle-dot'}`} />
            {action.label}
          </span>
        ))}
      </footer>
    ) : null}
      </div>
    </div>
  );
}
