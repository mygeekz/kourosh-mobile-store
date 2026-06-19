import React from 'react';
import { Link } from 'react-router-dom';
import type { AlertAction, AlertDecision, AlertManagementSource, AlertMetric, AlertReason, SeverityVisualMeta, SmartInsightLike } from './types/smartInsightContracts';

export type AlertBoardFilter = 'all' | 'critical' | 'suggestion' | 'action' | 'done';

export type AlertManagementItemData = {
  id: string;
  title: string;
  summary: string;
  severity: string;
  priority: number;
  confidence: number;
  source: AlertManagementSource;
  categoryLabel: string;
  statusKey: 'new' | 'action' | 'done';
  statusLabel: string;
  impactLabel: string;
  impactAmount: number;
  timeLabel: string;
  reasons: AlertReason[];
  actions: AlertAction[];
  metrics: AlertMetric[];
  decision?: AlertDecision;
  to?: string;
  insightId?: string;
};

type AlertManagementModalProps = {
  selected: SmartInsightLike;
  payload: Record<string, unknown>;
  alertManagementItems: AlertManagementItemData[];
  alertsBoardFilter: AlertBoardFilter;
  alertsBoardSelectedId: string | null;
  setAlertsBoardFilter: (value: AlertBoardFilter) => void;
  setAlertsBoardSelectedId: (value: string) => void;
  onClose: () => void;
  money: (value: unknown) => string;
  percent: (value: unknown) => string;
  num: (value: unknown) => number;
  shamsi: (value: unknown) => string;
  severityMeta: Record<string, SeverityVisualMeta>;
  topExecutiveAction?: SmartInsightLike | null;
  executiveBrain: Record<string, unknown>;
  learning: Record<string, unknown>;
};

export default function AlertManagementModal({
  selected,
  payload,
  alertManagementItems,
  alertsBoardFilter,
  alertsBoardSelectedId,
  setAlertsBoardFilter,
  setAlertsBoardSelectedId,
  onClose,
  money,
  percent,
  num,
  shamsi,
  severityMeta,
  topExecutiveAction,
  executiveBrain,
  learning,
}: AlertManagementModalProps) {

  const safeSeverityMeta = severityMeta || {};
  const safeAlertItems = Array.isArray(alertManagementItems) ? alertManagementItems : [];
  const getReasonText = (reason: AlertReason) => {
    if (typeof reason === 'string') return reason;
    const record = reason as Record<string, unknown>;
    return String(record.text || record.label || record.value || 'دلیل ثبت‌شده از بک‌اند');
  };
  const getMetricValue = (metric: AlertMetric) => {
    const label = String(metric.label || 'شاخص');
    const value = metric.value;
    if (typeof value === 'number' && /مبلغ|ارزش|اثر|سود|فروش|مانده|بدهی/.test(label)) return money(value);
    if (typeof value === 'number' && /نرخ|درصد|اعتماد|ریسک/.test(label)) return percent(value);
    return String(value ?? '—');
  };

  const visibleItems = safeAlertItems.filter((item) => {
    if (alertsBoardFilter === 'critical') return item.severity === 'critical' || item.severity === 'high';
    if (alertsBoardFilter === 'suggestion') return item.severity === 'medium' || item.severity === 'low' || item.severity === 'positive';
    if (alertsBoardFilter === 'action') return item.statusKey === 'action';
    if (alertsBoardFilter === 'done') return item.statusKey === 'done';
    return true;
  });
  const selectedBoardItem = visibleItems.find((item) => item.id === alertsBoardSelectedId) || visibleItems[0] || null;
  const alertCounts = {
    all: safeAlertItems.length,
    critical: safeAlertItems.filter((item) => item.severity === 'critical' || item.severity === 'high').length,
    suggestion: safeAlertItems.filter((item) => item.severity === 'medium' || item.severity === 'low' || item.severity === 'positive').length,
    action: safeAlertItems.filter((item) => item.statusKey === 'action').length,
    done: safeAlertItems.filter((item) => item.statusKey === 'done').length,
    impact: safeAlertItems.reduce((sum, item) => sum + Math.max(0, item.impactAmount), 0),
  };
  const recentActivities = safeAlertItems.slice(0, 4);
  const estimatedValue = alertCounts.impact > 0
    ? money(alertCounts.impact)
    : (topExecutiveAction?.impactLabel || selectedBoardItem?.impactLabel || 'ثبت نشده');
  const confidenceAvg = safeAlertItems.length
    ? Math.round(safeAlertItems.reduce((sum, item) => sum + num(item.confidence), 0) / safeAlertItems.length)
    : num(payload.predictiveEngine?.confidence || executiveBrain.confidence || learning.confidence);
  const filterTabs = [
    { key: 'all' as const, label: 'همه', count: alertCounts.all, dot: 'blue' },
    { key: 'critical' as const, label: 'فوری', count: alertCounts.critical, dot: 'rose' },
    { key: 'suggestion' as const, label: 'پیشنهادها', count: alertCounts.suggestion, dot: 'amber' },
    { key: 'action' as const, label: 'در حال بررسی', count: alertCounts.action, dot: 'emerald' },
    { key: 'done' as const, label: 'بسته‌شده', count: alertCounts.done, dot: 'slate' },
  ];
  const kpiCards = [
    {
      label: 'ارزش مالی تخمینی',
      value: estimatedValue,
      hint: alertCounts.impact > 0 ? 'جمع عددهای مالی استخراج‌شده' : 'براساس پیشنهاد انتخاب‌شده',
      icon: 'fa-money-bill-trend-up',
      tone: 'emerald',
    },
    {
      label: 'اعتماد مدل',
      value: percent(confidenceAvg),
      hint: confidenceAvg >= 80 ? 'اطمینان بالا' : 'نیازمند بررسی مدیریتی',
      icon: 'fa-bullseye',
      tone: 'violet',
    },
    {
      label: 'پیشنهادهای جدید',
      value: alertCounts.all.toLocaleString('fa-IR'),
      hint: `${alertCounts.done.toLocaleString('fa-IR')} مورد بسته‌شده`,
      icon: 'fa-file-circle-plus',
      tone: 'blue',
    },
    {
      label: 'پیشنهادهای باز',
      value: alertCounts.action.toLocaleString('fa-IR'),
      hint: `${alertCounts.critical.toLocaleString('fa-IR')} مورد فوری/مهم`,
      icon: 'fa-bolt',
      tone: 'orange',
    },
  ];

  return (
    <div className="sib211-overlay" onClick={() => onClose()}>
      <section className="sib211-shell" onClick={(event) => event.stopPropagation()} dir="rtl">
    <header className="sib211-header">
      <div className="sib211-header__copy">
        <span className="sib211-header__icon"><i className="fa-solid fa-triangle-exclamation" /></span>
        <div className="sib211-breadcrumb">
          <span>مرکز گزارش‌ها</span>
          <i className="fa-solid fa-chevron-left" />
          <strong>Smart Insights</strong>
        </div>
        <h2>{selected.title || 'Smart Insights'}</h2>
        <p>{selected.summary || 'بینش‌های هوشمند و پیشنهادهای بهبود عملکرد.'}</p>
      </div>
      <div className="sib211-header__meta">
        <span className="sib211-live-dot" />
        <span>آخرین بروزرسانی: {payload.generatedAt ? shamsi(payload.generatedAt) : 'ثبت نشده'}</span>
      </div>
    </header>

    <section className="sib211-kpis" aria-label="شاخص‌های کلیدی هشدارها">
      {kpiCards.map((card) => (
        <article key={card.label} className={`sib211-kpi sib211-kpi--${card.tone}`}>
          <span className="sib211-kpi__icon"><i className={`fa-solid ${card.icon}`} /></span>
          <div>
            <small>{card.label}</small>
            <strong>{card.value}</strong>
            <em>{card.hint}</em>
          </div>
        </article>
      ))}
    </section>

    <main className="sib211-main">
      <aside className="sib211-detail" aria-label="جزئیات مورد انتخاب‌شده">
        {selectedBoardItem ? (
          <>
            <div className="sib211-detail__head">
              <span className={`sib211-severity sib211-severity--${selectedBoardItem.severity}`}><i className={`fa-solid ${safeSeverityMeta[selectedBoardItem.severity]?.icon || 'fa-sparkles'}`} /> {safeSeverityMeta[selectedBoardItem.severity]?.label || selectedBoardItem.severity}</span>
              <button type="button" className="sib211-pin" aria-label="نشان کردن مورد"><i className="fa-regular fa-star" /></button>
            </div>
            <h3>{selectedBoardItem.title}</h3>
            <p>{selectedBoardItem.summary}</p>

            <div className="sib211-detail-grid sib217-detail-grid">
              <div>
                <span className="sib217-detail-icon sib217-detail-icon--violet"><i className="fa-solid fa-bullseye" /></span>
                <small>اعتماد</small>
                <strong>{selectedBoardItem.confidence > 0 ? percent(selectedBoardItem.confidence) : '—'}</strong>
              </div>
              <div>
                <span className="sib217-detail-icon sib217-detail-icon--orange"><i className="fa-solid fa-bolt" /></span>
                <small>اولویت</small>
                <strong>{selectedBoardItem.priority.toLocaleString('fa-IR')}</strong>
              </div>
              <div>
                <span className="sib217-detail-icon sib217-detail-icon--blue"><i className="fa-solid fa-circle-check" /></span>
                <small>وضعیت</small>
                <strong>{selectedBoardItem.statusLabel}</strong>
              </div>
              <div>
                <span className="sib217-detail-icon sib217-detail-icon--emerald"><i className="fa-solid fa-layer-group" /></span>
                <small>دسته</small>
                <strong>{selectedBoardItem.categoryLabel}</strong>
              </div>
            </div>

            <section className="sib211-impact">
              <h4><i className="fa-solid fa-money-bill-trend-up" /> تاثیر مالی تخمینی</h4>
              <div><span>اثر قابل‌اندازه‌گیری</span><strong>{selectedBoardItem.impactLabel}</strong></div>
              <div><span>زمان ثبت</span><strong>{selectedBoardItem.timeLabel}</strong></div>
            </section>


            {selectedBoardItem.metrics?.length ? (
              <section className="sib211-metrics">
                <h4><i className="fa-solid fa-chart-simple" /> شاخص‌های بک‌اند</h4>
                <div className="sib211-metrics__grid">
                  {selectedBoardItem.metrics.slice(0, 6).map((metric, index) => (
                    <article key={`${selectedBoardItem.id}-metric-${index}`}>
                      <span><i className={`fa-solid ${metric.icon || (index === 0 ? 'fa-chart-column' : index === 1 ? 'fa-credit-card' : 'fa-bolt')}`} /></span>
                      <small>{metric.label || `شاخص ${index + 1}`}</small>
                      <strong>{getMetricValue(metric)}</strong>
                    </article>
                  ))}
                </div>
              </section>
            ) : null}

            <section className="sib211-reasons">
              <h4><i className="fa-solid fa-circle-info" /> دلایل اصلی</h4>
              {(selectedBoardItem.reasons || []).slice(0, 4).map((reason, index) => (
                <div key={`${selectedBoardItem.id}-reason-${index}`}><i className="fa-solid fa-check" /><span>{getReasonText(reason)}</span></div>
              ))}
              {!selectedBoardItem.reasons?.length ? <p className="sib211-empty"><i className="fa-solid fa-database" /> دلیل مستقیمی از بک‌اند برای این مورد ثبت نشده است.</p> : null}
            </section>

            <div className="sib211-detail__actions">
              {selectedBoardItem.actions.slice(0, 2).map((action, index) => action.to ? (
                <Link key={`${selectedBoardItem.id}-action-${index}`} to={action.to} className={index === 0 ? 'sib211-action sib211-action--primary' : 'sib211-action sib211-action--secondary'}>
                  {action.label}
                  <i className={`fa-solid ${action.icon || 'fa-arrow-left'}`} />
                </Link>
              ) : (
                <span key={`${selectedBoardItem.id}-action-${index}`} className="sib211-action sib211-action--secondary">
                  {action.label}
                  <i className={`fa-solid ${action.icon || 'fa-circle-dot'}`} />
                </span>
              ))}
              {!selectedBoardItem.actions.length ? <span className="sib211-action sib211-action--disabled"><i className="fa-solid fa-database" /> اقدام مستقیمی ثبت نشده</span> : null}
            </div>
          </>
        ) : (
          <div className="sib211-empty-state">موردی برای نمایش انتخاب نشده است.</div>
        )}
      </aside>

      <section className="sib211-list" aria-label="لیست پیشنهادهای هوشمند">
        <div className="sib211-list__toolbar">
          <div>
            <h3><i className="fa-solid fa-brain" /> بینش‌های هوشمند</h3>
            <span>{visibleItems.length.toLocaleString('fa-IR')} مورد قابل نمایش</span>
          </div>
          <div className="sib211-tabs">
            {filterTabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => { setAlertsBoardFilter(tab.key); setAlertsBoardSelectedId(null); }}
                className={alertsBoardFilter === tab.key ? 'is-active' : ''}
              >
                <span className={`sib211-tab-dot sib211-tab-dot--${tab.dot}`} />
                {tab.label}
                <b>{tab.count.toLocaleString('fa-IR')}</b>
              </button>
            ))}
          </div>
        </div>

        <div className="sib211-table sib217-table">
          <div className="sib211-table__head sib217-table__head sib218-table__head sib219-insight-grid">
            <span className="sib218-head-cell sib218-head-cell--title">عنوان بینش</span>
            <span className="sib218-head-cell sib218-head-cell--category">اثر / دسته</span>
            <span className="sib218-head-cell sib218-head-cell--confidence">اعتماد</span>
            <span className="sib218-head-cell sib218-head-cell--status">وضعیت</span>
            <span className="sib218-head-cell sib218-head-cell--date">تاریخ شناسایی</span>
          </div>

          <div className="sib211-table__body">
            {visibleItems.map((item) => {
              const active = selectedBoardItem?.id === item.id;
              return (
                <button
                  key={item.id}
                  type="button"
                  className={active ? 'sib211-row sib217-row sib218-row sib219-insight-grid is-active' : 'sib211-row sib217-row sib218-row sib219-insight-grid'}
                  onClick={() => setAlertsBoardSelectedId(item.id)}
                >
                  <span className="sib211-row__title sib217-cell sib217-cell--title sib218-cell sib218-cell--title">
                    <strong>{item.title}</strong>
                    <em>{item.summary}</em>
                  </span>
                  <span className="sib217-cell sib217-cell--category sib218-cell sib218-cell--category">
                    <b className={`sib211-type sib211-type--${item.severity}`}>{item.categoryLabel}</b>
                    <small>{item.impactLabel}</small>
                  </span>
                  <span className="sib211-row__confidence sib217-cell sib217-cell--confidence sib218-cell sib218-cell--confidence">{item.confidence > 0 ? percent(item.confidence) : '—'}</span>
                  <span className="sib217-cell sib217-cell--status sib218-cell sib218-cell--status"><i className={`sib211-status-dot sib211-status-dot--${item.statusKey}`} />{item.statusLabel}</span>
                  <span className="sib217-cell sib217-cell--date sib218-cell sib218-cell--date">{item.timeLabel}</span>
                </button>
              );
            })}
            {!visibleItems.length ? <div className="sib211-empty-state">برای این فیلتر موردی وجود ندارد.</div> : null}
          </div>
        </div>

        <section className="sib211-related">
          <div className="sib211-related__title">
            <h3><i className="fa-solid fa-clock-rotate-left" /> موارد مرتبط اخیر</h3>
            
          </div>
          <div className="sib211-related__grid">
            {recentActivities.slice(0, 3).map((item) => (
              <button key={`recent-${item.id}`} type="button" onClick={() => setAlertsBoardSelectedId(item.id)}>
                <span className={`sib211-related__icon sib211-related__icon--${item.severity}`}><i className={`fa-solid ${safeSeverityMeta[item.severity]?.icon || 'fa-lightbulb'}`} /></span>
                <strong>{item.title}</strong>
                <small>{item.timeLabel}</small>
                <em>{item.categoryLabel}</em>
              </button>
            ))}
          </div>
        </section>
      </section>
    </main>
      </section>
    </div>
  );
}
