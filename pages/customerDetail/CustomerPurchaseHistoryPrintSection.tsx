import React from 'react';
import { DataTableShell } from '@/components/ui';
import type { CustomerLedgerEntry, SalesTransactionEntry } from '../../types';

type Props = {
  ctx: Record<string, any> & {
    purchaseHistory: SalesTransactionEntry[];
    ledger: CustomerLedgerEntry[];
  };
};

const CustomerPurchaseHistoryPrintSection: React.FC<Props> = ({ ctx }) => {
  const {
    balance,
    brandStoreName,
    cleanName,
    credit,
    customerTelegramLinked,
    debit,
    formatIsoToShamsi,
    formatLedgerCurrency,
    formatPrice,
    getLedgerEntryKind,
    id,
    imei,
    ledger,
    ledgerPrintRows,
    ledgerDirectorySummary,
    ledgerPrintStats,
    ledgerRecordedAt,
    name,
    parseLedgerMeta,
    parseSaleItemMeta,
    profile,
    purchaseHistory,
    purchaseType,
    purchaseTypeLabel,
    registeredDateLabel,
  } = ctx;

  const printableLedger = Array.isArray(ledgerPrintRows) && ledgerPrintRows.length > 0 ? ledgerPrintRows : ledger;
  const printableLedgerCount = Number(ledgerDirectorySummary?.total ?? printableLedger.length ?? 0);

  return (
    <>
{/* تاریخچه خرید */}

      <div id="customer-history-section" />
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100" aria-labelledby="customer-purchase-history-title">
        <div className="flex items-center gap-2 border-b border-slate-200 px-3 py-3 dark:border-slate-800">
          <i className="fa-solid fa-clock-rotate-left text-sky-600" aria-hidden="true" />
          <div>
            <h2 id="customer-purchase-history-title" className="text-sm font-black">تاریخچه خرید مشتری</h2>
            <p className="mt-0.5 text-xs font-semibold text-slate-500 dark:text-slate-400">فروش‌های ثبت‌شده در پرونده مشتری</p>
          </div>
        </div>
        {purchaseHistory.length === 0 ? (
          <p className="px-3 py-6 text-center text-sm text-slate-500 dark:text-slate-400">هنوز خریدی برای این مشتری ثبت نشده است.</p>
        ) : (
          <DataTableShell className="w-full" data-ui-customer-purchase-history="true">
            <table className="w-full min-w-[48rem] table-fixed divide-y divide-slate-200 text-xs dark:divide-slate-800">
              <thead className="bg-slate-50 dark:bg-slate-900/70">
                <tr className="text-right [&>th]:px-3 [&>th]:py-2 [&>th]:font-black [&>th]:text-slate-600 dark:[&>th]:text-slate-200">
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-calendar-day text-sky-500" /> تاریخ فروش</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-box text-indigo-500" /> شرح کالا</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-credit-card text-violet-500" /> نوع خرید</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-fingerprint text-slate-500" /> IMEI</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-bullseye text-amber-500" /> تعداد</span></th>
                  <th><span className="inline-flex items-center gap-2"><i className="fa-solid fa-sack-dollar text-emerald-500" /> قیمت نهایی</span></th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-transparent divide-y divide-slate-200 dark:divide-slate-800">
                {purchaseHistory.map(sale => {
                  const meta = parseSaleItemMeta(sale);
                  const typeClass = meta.purchaseType === 'installment'
                      ? 'text-sky-700 dark:text-sky-300'
                    : meta.purchaseType === 'credit'
                      ? 'text-amber-700 dark:text-amber-300'
                      : 'text-emerald-700 dark:text-emerald-300';
                  const typeIcon = meta.purchaseType === 'installment'
                    ? 'fa-calendar-days'
                    : meta.purchaseType === 'credit'
                      ? 'fa-receipt'
                      : 'fa-wallet';
                  return (
                    <tr key={sale.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-800/40">
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle text-slate-700 dark:text-slate-200">{formatIsoToShamsi(sale.transactionDate)}</td>
                      <td className="px-3 py-2.5 align-middle font-bold text-slate-900 dark:text-slate-100">{meta.cleanName}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle"><span className={`inline-flex items-center gap-1.5 font-black ${typeClass}`}><i className={`fa-solid ${typeIcon}`} /> {meta.purchaseTypeLabel}</span></td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle">{meta.imei ? <bdi dir="ltr" className="font-semibold text-slate-600 dark:text-slate-300">{meta.imei}</bdi> : <span className="text-slate-400">—</span>}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle">{sale.quantity.toLocaleString('fa-IR')}</td>
                      <td className="whitespace-nowrap px-3 py-2.5 align-middle font-black text-indigo-700 dark:text-indigo-300">{formatPrice(sale.totalPrice)}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </DataTableShell>
        )}
      </section>

      <div id="customer-ledger-print-area" className="hidden" aria-hidden="true">
        <div className="customer-print-report">
          <div className="customer-print-report__masthead">
            <div className="customer-print-report__brand">
              <span className="customer-print-report__brand-badge">
                <span>گزارش حرفه‌ای چاپ</span>
              </span>
              <h1 className="customer-print-report__brand-name">{brandStoreName}</h1>
              <p className="customer-print-report__brand-subtitle">گزارش دفتر حساب مشتری با چیدمان رسمی، مناسب چاپ و خروجی PDF.</p>
            </div>
            <div className="customer-print-report__meta">
              <div className="customer-print-report__meta-item"><span className="customer-print-report__meta-label">عنوان گزارش</span><strong>پرونده مالی مشتری</strong></div>
              <div className="customer-print-report__meta-item"><span className="customer-print-report__meta-label">تاریخ چاپ</span><strong>{formatIsoToShamsi(new Date().toISOString())}</strong></div>
              <div className="customer-print-report__meta-item"><span className="customer-print-report__meta-label">شناسه مشتری</span><strong>{profile.id ? Number(profile.id).toLocaleString('fa-IR') : '—'}</strong></div>
            </div>
          </div>

          <div className="customer-print-report__panel-grid">
            <div className="customer-print-panel">
              <div className="customer-print-panel__title">مشخصات مشتری</div>
              <div className="customer-print-profile-grid">
                <div className="customer-print-profile-item"><span>نام مشتری</span><strong>{profile.fullName}</strong></div>
                <div className="customer-print-profile-item"><span>شماره تماس</span><strong>{profile.phoneNumber || '—'}</strong></div>
                <div className="customer-print-profile-item"><span>کد ملی</span><strong>{profile.nationalCode || '—'}</strong></div>
                <div className="customer-print-profile-item"><span>تاریخ ثبت‌نام</span><strong>{registeredDateLabel}</strong></div>
                <div className="customer-print-profile-item"><span>وضعیت تلگرام</span><strong>{customerTelegramLinked ? 'متصل' : 'متصل نیست'}</strong></div>
                <div className="customer-print-profile-item"><span>آدرس</span><strong>{profile.address || '—'}</strong></div>
                <div className="customer-print-profile-item"><span>یادداشت</span><strong>{profile.notes || '—'}</strong></div>
              </div>
            </div>

            <div className={`customer-print-balance-card ${profile.currentBalance > 0 ? 'customer-print-balance-card--debit' : profile.currentBalance < 0 ? 'customer-print-balance-card--credit' : 'customer-print-balance-card--settled'}`}>
              <div className="customer-print-balance-card__eyebrow">جمع‌بندی مانده حساب</div>
              <div className="customer-print-balance-card__value">{formatLedgerCurrency(profile.currentBalance, 'balance')}</div>
              <div className="customer-print-balance-card__hint">
                {profile.currentBalance > 0
                  ? 'این مشتری بدهکار است و نیاز به پیگیری دریافت دارد.'
                  : profile.currentBalance < 0
                    ? 'این مشتری بستانکار است و در فروش یا تسویه بعدی باید لحاظ شود.'
                    : 'حساب مشتری در وضعیت تسویه قرار دارد.'}
              </div>
            </div>
          </div>

          <div className="customer-print-summary">
            <div className="customer-print-summary__item">
              <span>تعداد تراکنش‌های دفتر</span>
              <strong>{printableLedgerCount.toLocaleString('fa-IR')}</strong>
            </div>
            <div className="customer-print-summary__item">
              <span>جمع بدهکار</span>
              <strong>{ledgerPrintStats.totalDebit.toLocaleString('fa-IR')} تومان</strong>
            </div>
            <div className="customer-print-summary__item">
              <span>جمع بستانکار</span>
              <strong>{ledgerPrintStats.totalCredit.toLocaleString('fa-IR')} تومان</strong>
            </div>
            <div className="customer-print-summary__item">
              <span>آخرین تاریخ تراکنش</span>
              <strong>{ledgerPrintStats.latestTransaction ? formatIsoToShamsi(ledgerPrintStats.latestTransaction) : '—'}</strong>
            </div>
          </div>

          <div className="customer-print-table-wrap">
            <table className="customer-print-table">
              <thead>
                <tr>
                  <th style={{ width: '5%' }}>ردیف</th>
                  <th style={{ width: '9%' }}>نوع</th>
                  <th style={{ width: '10%' }}>تاریخ تراکنش</th>
                  <th style={{ width: '10%' }}>تاریخ ثبت</th>
                  <th style={{ width: '32%' }}>شرح / بابت</th>
                  <th style={{ width: '11%' }}>بدهکار</th>
                  <th style={{ width: '11%' }}>بستانکار</th>
                  <th style={{ width: '12%' }}>مانده</th>
                </tr>
              </thead>
              <tbody>
                {printableLedger.length > 0 ? printableLedger.map((entry: CustomerLedgerEntry, index: number) => {
                  const meta = parseLedgerMeta(entry.description);
                  const kind = getLedgerEntryKind(entry);
                  const rowClass = kind === 'debit' ? 'customer-print-row--debit' : kind === 'credit' ? 'customer-print-row--credit' : '';
                  return (
                    <tr key={`print-${entry.id || index}`} className={rowClass}>
                      <td>{(index + 1).toLocaleString('fa-IR')}</td>
                      <td>
                        <span className={`customer-print-type-badge customer-print-type-badge--${kind}`}>
                          {kind === 'debit' ? 'بدهکار' : kind === 'credit' ? 'بستانکار' : 'متعادل'}
                        </span>
                      </td>
                      <td>{formatIsoToShamsi(entry.transactionDate)}</td>
                      <td>{ledgerRecordedAt(entry)}</td>
                      <td>
                        <div>{meta.summary || entry.description || '—'}</div>
                        {meta.details ? <div style={{ marginTop: '4px', fontSize: '10px', color: '#64748b' }}>{meta.details}</div> : null}
                      </td>
                      <td>{Number(entry.debit || 0).toLocaleString('fa-IR')} تومان</td>
                      <td>{Number(entry.credit || 0).toLocaleString('fa-IR')} تومان</td>
                      <td>{Number(entry.balance || 0).toLocaleString('fa-IR')} تومان</td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan={8}>هنوز تراکنشی برای این مشتری ثبت نشده است.</td>
                  </tr>
                )}
              </tbody>
              {printableLedger.length > 0 ? (
                <tfoot>
                  <tr>
                    <td colSpan={5}>جمع کل گردش دفتر حساب</td>
                    <td>{ledgerPrintStats.totalDebit.toLocaleString('fa-IR')} تومان</td>
                    <td>{ledgerPrintStats.totalCredit.toLocaleString('fa-IR')} تومان</td>
                    <td>{Number(profile.currentBalance || 0).toLocaleString('fa-IR')} تومان</td>
                  </tr>
                </tfoot>
              ) : null}
            </table>
          </div>

          <p className="customer-print-footnote">این خروجی برای چاپ / PDF به‌صورت جدولی و حرفه‌ای آماده شده تا تاریخ، شرح، نوع تراکنش، بدهکار، بستانکار و مانده هر ردیف شفاف و اجرایی نمایش داده شود.</p>
        </div>
      </div>
    </>
  );
};

export default CustomerPurchaseHistoryPrintSection;
