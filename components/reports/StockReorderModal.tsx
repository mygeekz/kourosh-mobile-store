import React from 'react';
import { Link } from 'react-router-dom';
import type { MoneyFormatter, NumberFormatter, SeverityMetaMap, ShamsiFormatter, SmartInsightLike, StockReorderRow } from './types/smartInsightContracts';

type StockReorderModalProps = {
  selected: SmartInsightLike;
  onClose: () => void;
  money: MoneyFormatter;
  num: NumberFormatter;
  shamsi: ShamsiFormatter;
  severityMeta: SeverityMetaMap;
};

export default function StockReorderModal({
  selected,
  onClose,
  money,
  num,
  shamsi,
  severityMeta,
}: StockReorderModalProps) {
  const stockRows = Array.isArray((selected.target as Record<string, unknown>)?.rows) ? ((selected.target as Record<string, unknown>).rows as StockReorderRow[]) : [];
  const metricMap = new Map((selected.metrics || []).map((metric) => [String(metric.label || ''), String(metric.value ?? '—')]));
  const totalSoldAmount = stockRows.reduce((sum, row) => sum + num(row.soldAmount), 0);
  const totalEstimatedProfit = stockRows.reduce((sum, row) => sum + num(row.estimatedProfit), 0);
  const dangerRows = stockRows.filter((row) => num(row.stockQuantity) <= num(row.thresholdQty) || num(row.stockQuantity) <= num(row.soldQty));
  const averageDaysToEnd = stockRows.length
    ? Math.round(stockRows.reduce((sum, row) => {
      const daily = num(row.soldQty) / 14;
      const days = daily > 0 ? num(row.stockQuantity) / daily : 999;
      return sum + Math.min(999, days);
    }, 0) / stockRows.length)
    : 0;
  const stockKpis = [
    { label: 'کالاهای در خطر', value: dangerRows.length.toLocaleString('fa-IR'), suffix: 'کالا', icon: 'fa-triangle-exclamation', tone: 'rose' },
    { label: 'ارزش فروش ۱۴ روز', value: metricMap.get('فروش ۱۴ روز') || money(totalSoldAmount), suffix: '', icon: 'fa-coins', tone: 'violet' },
    { label: 'میانگین روز تا اتمام', value: stockRows.length ? averageDaysToEnd.toLocaleString('fa-IR') : '—', suffix: stockRows.length ? 'روز' : '', icon: 'fa-hourglass-half', tone: 'orange' },
    { label: 'پیشنهادهای خرید', value: metricMap.get('تعداد پیشنهاد') || stockRows.length.toLocaleString('fa-IR'), suffix: 'پیشنهاد', icon: 'fa-cart-shopping', tone: 'emerald' },
  ];
  const stockMemoryCards = [
    { label: 'وضعیت تصمیم', value: selected.decision?.decisionLabel || 'در انتظار تصمیم', icon: 'fa-hourglass-half', tone: 'blue' },
    { label: 'آخرین تولید', value: selected.decision?.lastGeneratedAt ? shamsi(selected.decision.lastGeneratedAt) : 'ثبت نشده', icon: 'fa-clock-rotate-left', tone: 'violet' },
    { label: 'دفعات تکرار', value: num(selected.decision?.occurrenceCount).toLocaleString('fa-IR') + ' بار', icon: 'fa-rotate', tone: 'orange' },
    { label: 'نتیجه تصمیم', value: selected.decision?.outcomeLabel || 'نتیجه ثبت نشده', icon: 'fa-chart-line', tone: 'emerald' },
  ];
  const stockActions = selected.actions || [];
  const stockReasons = (selected.reasons || []).slice(0, 4);

  return (
    <div className="stk200-overlay" onClick={() => onClose()}>
      <div className="stk200-dialog" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="stk200-header">
      <span className={`stk200-badge stk200-badge--${selected.severity || 'medium'}`}>
        <i className={`fa-solid ${severityMeta[selected.severity]?.icon || 'fa-bolt'}`} />
        {severityMeta[selected.severity]?.label || selected.severity}
      </span>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
    </header>

    <main className="stk200-body">
      <section className="stk200-top-grid">
        {stockKpis.map((card) => (
          <article key={card.label} className="stk200-kpi">
            <span className={`stk200-kpi__icon stk200-tone-${card.tone}`}>
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

      <section className="stk200-table-panel">
        <h3><i className="fa-regular fa-table-list" /> کالاهای در خطر</h3>
        <div className="stk200-table">
          <div className="stk200-table-head">
            <span>کالا</span>
            <span>کد کالا</span>
            <span>موجودی فعلی</span>
            <span>فروش ۱۴ روز</span>
            <span>روز تا اتمام</span>
            <span>وضعیت</span>
            <span>ارزش ۱۴ روز</span>
          </div>
          <div className="stk200-table-body">
            {stockRows.slice(0, 6).map((row, index) => {
              const daily = num(row.soldQty) / 14;
              const daysToEnd = daily > 0 ? Math.round(num(row.stockQuantity) / daily) : null;
              const isCritical = num(row.stockQuantity) <= num(row.thresholdQty);
              const isWarning = !isCritical && num(row.stockQuantity) <= num(row.soldQty);
              const statusLabel = isCritical ? 'بحرانی' : isWarning ? 'هشدار' : 'قابل پایش';
              return (
                <div key={`${row.productId || row.productName || index}`} className="stk200-row">
                  <span className="stk200-product">{row.productName || 'کالا'}</span>
                  <span className="stk200-code">{row.productId || '—'}</span>
                  <span>{num(row.stockQuantity).toLocaleString('fa-IR')}</span>
                  <span>{num(row.soldQty).toLocaleString('fa-IR')}</span>
                  <span className={isCritical ? 'stk200-danger-text' : isWarning ? 'stk200-warning-text' : ''}>{daysToEnd == null ? '—' : daysToEnd.toLocaleString('fa-IR')}</span>
                  <span><b className={isCritical ? 'stk200-status stk200-status--danger' : isWarning ? 'stk200-status stk200-status--warning' : 'stk200-status stk200-status--ok'}>{statusLabel}</b></span>
                  <span>{money(row.soldAmount)}</span>
                </div>
              );
            })}
            {!stockRows.length ? <div className="stk200-empty">کالای دارای سیگنال خرید در خروجی بک‌اند ارسال نشده است.</div> : null}
          </div>
        </div>
      </section>

      <section className="stk200-lower-grid">
        <article className="stk200-panel stk200-memory">
          <h3><i className="fa-solid fa-brain" /> حافظه تصمیم این پیشنهاد</h3>
          <div className="stk200-memory-grid">
            {stockMemoryCards.map((card) => (
              <div key={card.label} className="stk200-memory-card">
                <span className={`stk200-memory-icon stk200-tone-${card.tone}`}><i className={`fa-solid ${card.icon}`} /></span>
                <small>{card.label}</small>
                <strong>{card.value}</strong>
              </div>
            ))}
          </div>
        </article>

        <article className="stk200-panel stk200-reasons">
          <h3><i className="fa-regular fa-circle-info" /> چرا این پیشنهاد مهم است؟</h3>
          <div className="stk200-reason-list">
            {stockReasons.map((reason, index) => (
              <div key={`${reason}-${index}`} className="stk200-reason">
                <span>{reason}</span>
              </div>
            ))}
            <div className="stk200-reason stk200-reason--soft">
              <span>سود تخمینی ۱۴ روز: {metricMap.get('سود تخمینی ۱۴ روز') || money(totalEstimatedProfit)}</span>
            </div>
            {!stockReasons.length && totalEstimatedProfit <= 0 ? <div className="stk200-empty">دلیل قابل نمایش از بک‌اند برای این پیشنهاد ارسال نشده است.</div> : null}
          </div>
        </article>
      </section>
    </main>

    {stockActions.length ? (
      <footer className="stk200-footer">
        {stockActions.slice(0, 3).map((action, index) => action.to ? (
          <Link key={`${action.label}-${index}`} to={action.to} className={index === 0 ? 'stk200-action stk200-action--primary' : 'stk200-action stk200-action--secondary'}>
            <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
            {action.label}
          </Link>
        ) : (
          <span key={`${action.label}-${index}`} className="stk200-action stk200-action--secondary">
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
