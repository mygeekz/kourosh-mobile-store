import React from 'react';
import { IconGlyph, PanelCard } from '@/components/ui';

type Props = { ctx: Record<string, any> };

const PartnerAccountingBreakdownSection: React.FC<Props> = ({ ctx }) => {
  const {
    formatCurrencyText,
    formatLedgerTransactionDate,
    partnerAccountingBreakdown,
    partnerAccountingBreakdownError,
    readStoredCurrencyUnit,
  } = ctx;

  if (!partnerAccountingBreakdown?.summary) {
    if (!partnerAccountingBreakdownError) return null;
    return (
      <section data-partner-accounting-breakdown="degraded">
        <PanelCard
          density="compact"
          title="تفکیک حساب همکار"
          subtitle="اطلاعات اصلی همکار در دسترس است؛ فقط Drill-down حسابداری موقتاً بارگذاری نشد."
          icon={<i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />}
        >
          <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-bold leading-7 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/30 dark:text-amber-200">
            {String(partnerAccountingBreakdownError || 'خطا در دریافت تفکیک حساب همکار')}
          </div>
        </PanelCard>
      </section>
    );
  }

  const summary = partnerAccountingBreakdown.summary;
  const ledgerEntries = Array.isArray(partnerAccountingBreakdown.entries)
    ? partnerAccountingBreakdown.entries.filter((entry: any) => entry?.bucket !== 'profit_share')
    : [];
  const profitAllocations = Array.isArray(partnerAccountingBreakdown.profitAllocations)
    ? partnerAccountingBreakdown.profitAllocations
    : [];
  const money = (value: unknown) => formatCurrencyText(Number(value || 0), readStoredCurrencyUnit());

  const metricCards = [
    {
      label: 'طلب تأمین‌کنندگی همکار',
      value: money(summary.supplierReceivable),
      detail: 'خریدها و افزایش‌های دفتر منهای پرداخت‌ها و کاهش‌ها؛ سهم سود داخل این عدد نیست.',
      icon: 'fa-solid fa-boxes-stacked',
    },
    {
      label: 'سهم سود / مالکیت',
      value: money(summary.profitShareAccrued),
      detail: `${Number(summary.profitAllocationCount || 0).toLocaleString('fa-IR')} تخصیص فعال؛ جدا از طلب تأمین‌کنندگی.`,
      icon: 'fa-solid fa-chart-pie',
    },
    {
      label: 'کل کاهش‌ها و پرداخت‌های دفتر',
      value: money(summary.totalPayments),
      detail: 'تمام Debitهای ثبت‌شده در دفتر همکار؛ در Drill-down قابل مشاهده‌اند.',
      icon: 'fa-solid fa-money-bill-transfer',
    },
    {
      label: 'مانده قطعی Ledger',
      value: money(summary.canonicalBalance),
      detail: `${Number(summary.ledgerEntryCount || 0).toLocaleString('fa-IR')} گردش؛ جمع Credit منهای Debit.${Number(summary.legacyMovementIssueCount || 0) ? ` ${Number(summary.legacyMovementIssueCount || 0).toLocaleString('fa-IR')} ردیف Legacy نیازمند بررسی.` : ''}`,
      icon: 'fa-solid fa-scale-balanced',
    },
  ];

  return (
    <section data-partner-accounting-breakdown="true">
      <PanelCard
        density="compact"
        title="تفکیک حساب همکار"
        subtitle="طلب تأمین‌کنندگی، سهم سود و پرداخت‌ها از هم جدا هستند؛ هر عدد از روی اسناد تشکیل‌دهنده قابل بازشدن است."
        icon={<i className="fa-solid fa-diagram-project" aria-hidden="true" />}
      >
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {metricCards.map((metric) => (
            <article key={metric.label} className="rounded-[20px] border border-slate-200 bg-slate-50/65 p-4 dark:border-slate-800 dark:bg-slate-900/45">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="text-xs font-black text-slate-600 dark:text-slate-300">{metric.label}</div>
                  <div className="mt-2 break-words text-base font-black text-slate-950 dark:text-slate-50 sm:text-lg">{metric.value}</div>
                  <div className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">{metric.detail}</div>
                </div>
                <IconGlyph tone="neutral" className="h-9 w-9 shrink-0" aria-hidden="true"><i className={metric.icon} /></IconGlyph>
              </div>
            </article>
          ))}
        </div>

        <div className="mt-4 grid gap-3 xl:grid-cols-2">
          <details className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <summary className="cursor-pointer select-none text-sm font-black text-slate-900 dark:text-slate-100">
              Drill-down طلب تأمین‌کنندگی — {ledgerEntries.length.toLocaleString('fa-IR')} گردش افزایش/کاهش
            </summary>
            <div className="mt-3 space-y-2">
              {ledgerEntries.length ? ledgerEntries.map((entry: any) => {
                const delta = Number(entry.delta || 0);
                return (
                  <div key={`ledger-${entry.id}`} className="grid gap-2 rounded-xl border border-slate-200/80 px-3 py-3 text-xs dark:border-slate-800 sm:grid-cols-[minmax(120px,0.7fr)_minmax(0,1.7fr)_minmax(130px,0.8fr)] sm:items-center">
                    <div className="font-bold text-slate-500 dark:text-slate-400">
                      {formatLedgerTransactionDate?.(entry.transactionDate) || entry.transactionDate || '—'}
                      <div className="mt-1 text-[11px]">#{entry.id} · {entry.referenceType || 'بدون مرجع'}</div>
                    </div>
                    <div className="min-w-0">
                      <div className="break-words font-black text-slate-900 dark:text-slate-100">{entry.description || 'بدون شرح'}</div>
                      <div className="mt-1 text-[11px] font-bold text-slate-500">مانده پس از سند: {money(entry.runningBalance)}</div>
                    </div>
                    <div className="text-left sm:text-right">
                      <div className={`font-black ${delta >= 0 ? 'text-amber-700 dark:text-amber-300' : 'text-emerald-700 dark:text-emerald-300'}`}>
                        {delta >= 0 ? 'افزایش طلب' : 'کاهش / پرداخت'}: {money(Math.abs(delta))}
                      </div>
                      <div className="mt-1 text-[11px] font-bold text-slate-500">Credit {money(entry.credit)} · Debit {money(entry.debit)}</div>
                    </div>
                  </div>
                );
              }) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm font-bold text-slate-500 dark:border-slate-700">گردشی برای طلب تأمین‌کنندگی ثبت نشده است.</div>
              )}
            </div>
          </details>

          <details className="rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-950">
            <summary className="cursor-pointer select-none text-sm font-black text-slate-900 dark:text-slate-100">
              Drill-down سهم سود / مالکیت — {profitAllocations.length.toLocaleString('fa-IR')} تخصیص فعال
            </summary>
            <div className="mt-3 space-y-2">
              {profitAllocations.length ? profitAllocations.map((row: any) => (
                <div key={`profit-${row.id}`} className="grid gap-2 rounded-xl border border-slate-200/80 px-3 py-3 text-xs dark:border-slate-800 sm:grid-cols-[minmax(120px,0.7fr)_minmax(0,1.7fr)_minmax(130px,0.8fr)] sm:items-center">
                  <div className="font-bold text-slate-500 dark:text-slate-400">
                    {formatLedgerTransactionDate?.(row.saleDate || row.createdAt) || row.saleDate || row.createdAt || '—'}
                    <div className="mt-1 text-[11px]">Snapshot #{row.snapshotId} · {row.sourceKind || '—'} #{row.sourceId || '—'}</div>
                  </div>
                  <div className="min-w-0">
                    <div className="break-words font-black text-slate-900 dark:text-slate-100">{row.itemDescription || row.notes || 'تخصیص سود'}</div>
                    <div className="mt-1 text-[11px] font-bold text-slate-500">{row.allocationType === 'shared_profit' ? 'سهم سود مشترک' : row.allocationType === 'owner_gain' ? 'سهم مالکیت' : row.allocationType || 'تخصیص'} · {Number(row.sharePercent || 0).toLocaleString('fa-IR')}٪</div>
                  </div>
                  <div className="font-black text-slate-900 dark:text-slate-100">{money(row.amount)}</div>
                </div>
              )) : (
                <div className="rounded-xl border border-dashed border-slate-300 px-3 py-4 text-sm font-bold text-slate-500 dark:border-slate-700">تخصیص سود فعالی برای این همکار ثبت نشده است.</div>
              )}
            </div>
          </details>
        </div>
      </PanelCard>
    </section>
  );
};

export default PartnerAccountingBreakdownSection;
