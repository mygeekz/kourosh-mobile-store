import React from 'react';
import { Link } from 'react-router-dom';
import type { NumberFormatter, PercentFormatter, SalesPerformanceMetric, SalesPerformanceRow, SeverityMetaMap, ShamsiFormatter, SmartInsightLike } from './types/smartInsightContracts';

type SalesPerformanceModalProps = {
  selected: SmartInsightLike;
  onClose: () => void;
  percent: PercentFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
};

export default function SalesPerformanceModal({
  selected,
  onClose,
  percent,
  num,
  shamsi,
  severityMeta,
}: SalesPerformanceModalProps) {
  const metricMap = new Map((selected.metrics || []).map((metric) => [String(metric.label || ''), String(metric.value ?? '—')]));
  const salesMetrics = selected.metrics || [];
  const salesActions = selected.actions || [];
  const salesReasons = (selected.reasons || []).slice(0, 5);
  const isDrop = selected.type === 'sales_drop';
  const mainDeltaLabel = metricMap.get('افت') || metricMap.get('رشد') || percent(selected.score);
  const currentAvg = metricMap.get('میانگین فعلی') || metricMap.get('فروش امروز/انتهای بازه') || '—';
  const previousAvg = metricMap.get('میانگین قبل') || '—';
  const compareRows = salesMetrics.map((metric) => ({
    label: String(metric.label || 'شاخص'),
    current: String(metric.value ?? '—'),
    previous: String(metric.label || '').includes('فعلی') ? previousAvg : '—',
    status: isDrop ? 'نیازمند بررسی' : 'مثبت',
  }));
  const salesKpis = [
    { label: isDrop ? 'شدت افت' : 'شدت رشد', value: mainDeltaLabel, suffix: '', icon: isDrop ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up', tone: isDrop ? 'rose' : 'emerald' },
    { label: 'میانگین فعلی', value: currentAvg, suffix: '', icon: 'fa-chart-line', tone: 'blue' },
    { label: 'میانگین قبل', value: previousAvg, suffix: '', icon: 'fa-clock-rotate-left', tone: 'violet' },
    { label: 'اعتماد تحلیل', value: percent(selected.confidence), suffix: '', icon: 'fa-shield-check', tone: 'orange' },
  ];
  const salesMemoryCards = [
    { label: 'وضعیت تصمیم', value: selected.decision?.decisionLabel || 'در انتظار تصمیم', icon: 'fa-hourglass-half', tone: 'blue' },
    { label: 'آخرین تولید', value: selected.decision?.lastGeneratedAt ? shamsi(selected.decision.lastGeneratedAt) : 'ثبت نشده', icon: 'fa-clock-rotate-left', tone: 'violet' },
    { label: 'دفعات تکرار', value: num(selected.decision?.occurrenceCount).toLocaleString('fa-IR') + ' بار', icon: 'fa-rotate', tone: 'orange' },
    { label: 'نتیجه تصمیم', value: selected.decision?.outcomeLabel || 'نتیجه ثبت نشده', icon: 'fa-chart-line', tone: 'emerald' },
  ];

  return (
    <div className="sale202-overlay" onClick={() => onClose()}>
      <div className="sale202-dialog" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="sale202-header">
      <span className={`sale202-badge sale202-badge--${selected.severity || 'medium'}`}>
        <i className={`fa-solid ${severityMeta[selected.severity]?.icon || (isDrop ? 'fa-arrow-trend-down' : 'fa-arrow-trend-up')}`} />
        {severityMeta[selected.severity]?.label || selected.severity}
      </span>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
    </header>

    <main className="sale202-body">
      <section className="sale202-top-grid">
        {salesKpis.map((card) => (
          <article key={card.label} className="sale202-kpi">
            <span className={`sale202-kpi__icon sale202-tone-${card.tone}`}>
              <i className={`fa-solid ${card.icon}`} />
            </span>
            <div>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="sale202-content-grid">
        <article className="sale202-panel sale202-table-panel">
          <h3><i className="fa-regular fa-table-list" /> مقایسه شاخص‌های فروش</h3>
          <div className="sale202-table">
            <div className="sale202-table-head">
              <span>شاخص</span>
              <span>مقدار گزارش‌شده</span>
              <span>مبنای مقایسه</span>
              <span>وضعیت</span>
            </div>
            <div className="sale202-table-body">
              {compareRows.map((row, index) => (
                <div key={`${row.label}-${index}`} className="sale202-row">
                  <span>{row.label}</span>
                  <span>{row.current}</span>
                  <span>{row.previous}</span>
                  <span><b className={isDrop ? 'sale202-status sale202-status--danger' : 'sale202-status sale202-status--ok'}>{row.status}</b></span>
                </div>
              ))}
              {!compareRows.length ? <div className="sale202-empty">شاخص قابل نمایش از بک‌اند برای این تحلیل ارسال نشده است.</div> : null}
            </div>
          </div>
        </article>

        <article className="sale202-panel sale202-reasons">
          <h3><i className="fa-regular fa-circle-info" /> چرا این تحلیل مهم است؟</h3>
          <div className="sale202-reason-list">
            {salesReasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="sale202-reason">
                <span>{reason}</span>
              </div>
            ))}
            {!salesReasons.length ? <div className="sale202-empty">دلیل قابل نمایش از بک‌اند برای این تحلیل ارسال نشده است.</div> : null}
          </div>
        </article>
      </section>

      <section className="sale202-panel sale202-memory">
        <h3><i className="fa-solid fa-brain" /> حافظه تصمیم</h3>
        <div className="sale202-memory-grid">
          {salesMemoryCards.map((card) => (
            <div key={card.label} className="sale202-memory-card">
              <span className={`sale202-memory-icon sale202-tone-${card.tone}`}><i className={`fa-solid ${card.icon}`} /></span>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
      </section>
    </main>

    {salesActions.length ? (
      <footer className="sale202-footer">
        {salesActions.slice(0, 3).map((action, index) => action.to ? (
          <Link key={`${action.label}-${index}`} to={action.to} className={index === 0 ? 'sale202-action sale202-action--primary' : 'sale202-action sale202-action--secondary'}>
            <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
            {action.label}
          </Link>
        ) : (
          <span key={`${action.label}-${index}`} className="sale202-action sale202-action--secondary">
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
