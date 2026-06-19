import React from 'react';
import { Link } from 'react-router-dom';
import type { CollectionRiskRow, MoneyFormatter, NumberFormatter, SeverityMetaMap, ShamsiFormatter, SmartInsightLike } from './types/smartInsightContracts';

type CollectionRiskModalProps = {
  selected: SmartInsightLike;
  onClose: () => void;
  money: MoneyFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
};

export default function CollectionRiskModal({
  selected,
  onClose,
  money,
  num,
  shamsi,
  severityMeta,
}: CollectionRiskModalProps) {
  const collectionRows = Array.isArray((selected.target as Record<string, unknown>)?.rows) ? ((selected.target as Record<string, unknown>).rows as CollectionRiskRow[]) : [];
  const metricMap = new Map((selected.metrics || []).map((metric) => [String(metric.label || ''), String(metric.value ?? '—')]));
  const totalOutstanding = collectionRows.reduce((sum, row) => sum + num(row.outstandingAmount), 0);
  const involvedCustomers = new Set(collectionRows.map((row) => String(row.customerId || row.customerName || '')).filter(Boolean)).size;
  const sortedByDue = collectionRows
    .filter((row) => row.dueDate || typeof row.dueInDays === 'number')
    .sort((a, b) => {
      const aDays = typeof a.dueInDays === 'number' ? Number(a.dueInDays) : 9999;
      const bDays = typeof b.dueInDays === 'number' ? Number(b.dueInDays) : 9999;
      return aDays - bDays;
    });
  const nearest = sortedByDue[0] || collectionRows[0] || {};
  const nearestDueLabel = typeof nearest.dueInDays === 'number'
    ? nearest.dueInDays < 0
      ? `${Math.abs(Number(nearest.dueInDays)).toLocaleString('fa-IR')} روز معوق`
      : nearest.dueInDays === 0
    ? 'امروز'
    : `${Number(nearest.dueInDays).toLocaleString('fa-IR')} روز دیگر`
    : nearest.dueDate
      ? shamsi(nearest.dueDate)
      : 'ثبت نشده';
  const latestAction = collectionRows
    .filter((row) => row.lastActionAt)
    .sort((a, b) => String(b.lastActionAt).localeCompare(String(a.lastActionAt)))[0] || null;
  const nextFollowups = collectionRows.filter((row) => row.nextFollowupDate).sort((a, b) => String(a.nextFollowupDate).localeCompare(String(b.nextFollowupDate)));
  const nextFollowup = nextFollowups[0]?.nextFollowupDate ? shamsi(nextFollowups[0].nextFollowupDate) : 'ثبت نشده';
  const latestActionLabel = latestAction
    ? `${latestAction.kanbanStageLabel || 'پیگیری ثبت‌شده'} · ${shamsi(latestAction.lastActionAt)}`
    : 'ثبت نشده';
  const collectionKpis = [
    { label: 'سندهای نیازمند پیگیری', value: metricMap.get('پرونده فوری') || collectionRows.length.toLocaleString('fa-IR'), icon: 'fa-file-lines', tone: 'blue' },
    { label: 'مجموع مبلغ معوق', value: metricMap.get('مانده فوری') || money(totalOutstanding), icon: 'fa-money-bill-wave', tone: 'emerald' },
    { label: 'نزدیک‌ترین سررسید', value: nearestDueLabel, icon: 'fa-calendar-days', tone: 'violet' },
    { label: 'مشتریان درگیر', value: involvedCustomers.toLocaleString('fa-IR'), icon: 'fa-users', tone: 'orange' },
  ];
  const collectionReasons = (selected.reasons || []).slice(0, 3);
  const collectionMemoryCards = [
    { label: 'وضعیت تصمیم', value: selected.decision?.decisionLabel || 'در انتظار تصمیم', icon: 'fa-hourglass-half', tone: 'blue' },
    { label: 'آخرین پیگیری', value: latestActionLabel, icon: 'fa-phone', tone: 'violet' },
    { label: 'دفعات تکرار', value: num(selected.decision?.occurrenceCount).toLocaleString('fa-IR') + ' بار', icon: 'fa-rotate', tone: 'orange' },
    { label: 'پیگیری بعدی', value: nextFollowup, icon: 'fa-calendar-check', tone: 'emerald' },
  ];
  const modalActions = selected.actions || [];

  return (
    <div className="crm197-overlay" onClick={() => onClose()}>
      <div className="crm197-dialog" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="crm197-header">
      <span className={`crm197-badge crm197-badge--${selected.severity || 'high'}`}><i className={`fa-solid ${severityMeta[selected.severity]?.icon || 'fa-bolt'}`} /> {severityMeta[selected.severity]?.label || selected.severity}</span>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
    </header>

    <main className="crm197-body">
      <section className="crm197-top-grid">
        {collectionKpis.map((card) => (
          <article key={card.label} className="crm197-kpi">
            <span className={`crm197-kpi__icon crm197-tone-${card.tone}`}><i className={`fa-solid ${card.icon}`} /></span>
            <div>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="crm197-content-grid">
        <article className="crm197-panel crm197-table-panel">
          <h3><i className="fa-regular fa-file-lines" /> کدام موارد نیازمند اقدام هستند؟</h3>
          <div className="crm197-table">
            <div className="crm197-table-head">
              <span>مشتری</span>
              <span>نوع</span>
              <span>مبلغ</span>
              <span>سررسید / معوق</span>
              <span>وضعیت پیگیری</span>
            </div>
            <div className="crm197-table-body">
              {collectionRows.slice(0, 4).map((row, index) => {
                const sourceLabel = String(row.sourceType || row.paymentType || '').includes('installment') ? 'قسط' : String(row.sourceType || '').includes('check') ? 'چک' : 'فاکتور';
                const dueLabel = typeof row.dueInDays === 'number'
                  ? row.dueInDays < 0
                    ? `${Math.abs(Number(row.dueInDays)).toLocaleString('fa-IR')} روز معوق`
                    : row.dueInDays === 0 ? 'امروز' : `${Number(row.dueInDays).toLocaleString('fa-IR')} روز دیگر`
                  : row.dueDate ? shamsi(row.dueDate) : 'ثبت نشده';
                const statusLabel = row.kanbanStageLabel || (row.touchedToday ? 'پیگیری شده' : row.label || 'نیازمند پیگیری');
                return (
                  <div key={`${row.sourceType || 'doc'}-${row.orderId || index}`} className="crm197-row">
                    <span className="crm197-customer"><i className="fa-regular fa-user" />{row.customerName || 'مشتری'}</span>
                    <span><b className={sourceLabel === 'چک' ? 'crm197-chip crm197-chip--green' : 'crm197-chip crm197-chip--blue'}>{sourceLabel}</b></span>
                    <span>{money(row.outstandingAmount)}</span>
                    <span className={String(dueLabel).includes('معوق') ? 'crm197-overdue' : ''}><i className="fa-regular fa-clock" />{dueLabel}</span>
                    <span><b className={row.touchedToday ? 'crm197-status crm197-status--done' : 'crm197-status'}>{statusLabel}</b></span>
                  </div>
                );
              })}
              {!collectionRows.length ? <div className="crm197-empty">سند نیازمند اقدام در این بازه وجود ندارد.</div> : null}
            </div>
          </div>
        </article>

        <article className="crm197-panel crm197-reasons">
          <h3><i className="fa-regular fa-lightbulb" /> چرا این پیشنهاد مهم است؟</h3>
          <div className="crm197-reason-list">
            {collectionReasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="crm197-reason">
                <i className="fa-solid fa-check" />
                <span>{reason}</span>
              </div>
            ))}
            {!collectionReasons.length ? <div className="crm197-empty">دلیل قابل نمایش از بک‌اند برای این پیشنهاد ارسال نشده است.</div> : null}
          </div>
        </article>
      </section>

      <section className="crm197-panel crm197-memory">
        <h3><i className="fa-solid fa-brain" /> حافظه تصمیم این پیشنهاد</h3>
        <div className="crm197-memory-grid">
          {collectionMemoryCards.map((card) => (
            <div key={card.label} className="crm197-memory-card">
              <span className={`crm197-memory-icon crm197-tone-${card.tone}`}><i className={`fa-solid ${card.icon}`} /></span>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
            </div>
          ))}
        </div>
        <p><i className="fa-solid fa-circle-info" /> با ثبت نتیجه پیگیری، وضعیت این پیشنهاد و مرکز وصول به‌روزرسانی می‌شود.</p>
      </section>
    </main>

    <footer className="crm197-footer">
      {modalActions.slice(0, 2).map((action, index) => action.to ? (
        <Link key={`${action.label}-${index}`} to={action.to} className={index === 0 ? 'crm197-action crm197-action--primary' : 'crm197-action crm197-action--secondary'}>
          <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
          {action.label}
        </Link>
      ) : (
        <span key={`${action.label}-${index}`} className="crm197-action crm197-action--secondary">
          <i className={`fa-solid ${action.icon || 'fa-circle-dot'}`} />
          {action.label}
        </span>
      ))}
    </footer>
      </div>
    </div>
  );
}
