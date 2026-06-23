import type { InvoiceAuditRow, NumberFormatter, PercentFormatter, SeverityMetaMap, SmartInsightLike } from './types/smartInsightContracts';

type InvoiceAuditModalProps = {
  selected: SmartInsightLike;
  onClose: () => void;
  percent: PercentFormatter;
  num: NumberFormatter;
  severityMeta: SeverityMetaMap;
};

export default function InvoiceAuditModal({
  selected,
  onClose,
  percent,
  num,
  severityMeta,
}: InvoiceAuditModalProps) {
  const auditRows = Array.isArray((selected.target as Record<string, unknown>)?.rows) ? ((selected.target as Record<string, unknown>).rows as InvoiceAuditRow[]) : [];
  const metricMap = new Map((selected.metrics || []).map((metric) => [String(metric.label || ''), String(metric.value ?? '—')]));
  const reasonCountBy = (matcher: (text: string) => boolean) => auditRows.reduce((sum, row) => sum + (((row.reasons || []).some((reason) => matcher(String(reason || ''))) ? 1 : 0)), 0);
  const metricValue = (label: string, fallback: string | number = '—') => metricMap.get(label) || String(fallback);
  const indicatorCards = [
    { label: 'فاکتورهای قابل کنترل', value: metricValue('فاکتورهای قابل کنترل', auditRows.length.toLocaleString('fa-IR')), icon: 'fa-file-invoice', tone: 'blue' },
    { label: 'سود منفی', value: metricValue('سود منفی', reasonCountBy((text) => text.includes('سود منفی')).toLocaleString('fa-IR')), icon: 'fa-arrow-trend-down', tone: 'rose' },
    { label: 'اختلاف جمع', value: metricValue('اختلاف جمع', reasonCountBy((text) => text.includes('اختلاف') || text.includes('عدم تطابق')).toLocaleString('fa-IR')), icon: 'fa-chart-line', tone: 'amber' },
    { label: 'تخفیف مشکوک', value: metricValue('تخفیف مشکوک', reasonCountBy((text) => text.includes('تخفیف')).toLocaleString('fa-IR')), icon: 'fa-tags', tone: 'emerald' },
  ];
  const topCards = [
    { label: 'فاکتورهای قابل کنترل', value: metricValue('فاکتورهای قابل کنترل', auditRows.length.toLocaleString('fa-IR')), icon: 'fa-file-lines', tone: 'blue' },
    { label: 'بالاترین ریسک', value: metricValue('بالاترین ریسک', `${num(auditRows[0]?.riskScore).toLocaleString('fa-IR')} از ۱۰۰`), icon: 'fa-shield-halved', tone: 'indigo' },
    { label: 'بالاترین تخفیف', value: metricValue('بالاترین تخفیف', '—'), icon: 'fa-tags', tone: 'emerald' },
    { label: 'اعتماد', value: percent(selected.confidence), icon: 'fa-arrow-trend-up', tone: 'emerald' },
  ];
  const topCardToneClass: Record<string, string> = {
    emerald: 'bg-emerald-50 text-emerald-600 ring-emerald-100 dark:bg-emerald-500/10 dark:text-emerald-200 dark:ring-emerald-500/20',
    indigo: 'bg-indigo-50 text-indigo-600 ring-indigo-100 dark:bg-indigo-500/10 dark:text-indigo-200 dark:ring-indigo-500/20',
    blue: 'bg-blue-50 text-blue-600 ring-blue-100 dark:bg-blue-500/10 dark:text-blue-200 dark:ring-blue-500/20',
    rose: 'bg-rose-50 text-rose-600 ring-rose-100 dark:bg-rose-500/10 dark:text-rose-200 dark:ring-rose-500/20',
    amber: 'bg-amber-50 text-amber-600 ring-amber-100 dark:bg-amber-500/10 dark:text-amber-200 dark:ring-amber-500/20',
  };

  return (
    <div className="acm193-overlay" onClick={() => onClose()}>
      <div className="acm193-dialog" onClick={(e) => e.stopPropagation()} dir="rtl">
    <header className="acm193-header">
      <span className={`acm193-badge ${selected.severity === 'critical' ? 'acm193-badge--critical' : 'acm193-badge--high'}`}>
        {severityMeta[selected.severity]?.label || selected.severity}
      </span>
      <h2>{selected.title}</h2>
      <p>{selected.summary}</p>
    </header>

    <main className="acm193-body">
      <section className="acm193-top-grid">
        {topCards.map((card) => (
          <article key={card.label} className="acm193-kpi">
            <span className={`acm193-kpi__icon acm193-tone-${card.tone}`}>
              <i className={`fa-solid ${card.icon}`} />
            </span>
            <div>
              <small>{card.label}</small>
              <strong>{card.value}</strong>
            </div>
          </article>
        ))}
      </section>

      <section className="acm193-content-grid">
        <article className="acm193-panel acm193-reasons">
          <h3>چرا این مورد مشکوک است؟</h3>
          <div className="acm193-reason-list">
            {(selected.reasons || []).slice(0, 4).map((reason, index) => (
              <div key={`${reason}-${index}`} className="acm193-reason">
                <i className="fa-solid fa-circle-check" />
                <span>{reason}</span>
              </div>
            ))}
            {!(selected.reasons || []).length ? (
              <div className="acm193-empty">دلیل مشخصی برای این مورد ثبت نشده است.</div>
            ) : null}
          </div>
        </article>

        <div className="acm193-right-stack">
          <article className="acm193-panel acm193-indicators">
            <h3>شاخص‌های عددی</h3>
            <div className="acm193-indicator-grid">
              {indicatorCards.map((card) => (
                <div key={card.label} className="acm193-indicator">
                  <span className={`acm193-indicator__icon acm193-tone-${card.tone}`}>
                    <i className={`fa-solid ${card.icon}`} />
                  </span>
                  <small>{card.label}</small>
                  <strong>{card.value}</strong>
                </div>
              ))}
            </div>
          </article>

          <article className="acm193-panel acm193-memory">
            <h3>حافظه تصمیم این پیشنهاد</h3>
            <div className="acm193-memory-grid">
              <div className="acm193-memory-card">
                <span className="acm193-memory-icon"><i className="fa-regular fa-clock" /></span>
                <small>وضعیت تصمیم</small>
                <strong>{selected.decision?.decisionLabel || 'در انتظار تصمیم'}</strong>
              </div>
              <div className="acm193-memory-card">
                <span className="acm193-memory-icon"><i className="fa-solid fa-rotate" /></span>
                <small>دفعات تکرار</small>
                <strong>{num(selected.decision?.occurrenceCount).toLocaleString('fa-IR')}</strong>
              </div>
            </div>
            <p>سیستم وضعیت اجرای پیشنهاد و نتیجه آن را ثبت می‌کند تا مبنای یادگیری عملیاتی دقیق‌تری فراهم شود.</p>
          </article>
        </div>
      </section>
    </main>

      </div>
    </div>
  );
}
