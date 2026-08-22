import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';

import type { InstallmentSaleDetailData } from '../types';
import { apiFetch } from '../utils/apiFetch';
import { getCheckOwnershipLabel, resolveSmartSaleContractMode } from '../utils/installmentContractMode';

const CONTRACT_VERSION = 'smart-sale-contract-v2-scenario-aware';

const clean = (value: unknown, fallback = '—'): string => {
  const text = String(value ?? '').trim();
  return text || fallback;
};

const money = (value: unknown): string => {
  const amount = Number(value || 0);
  return `${(Number.isFinite(amount) ? amount : 0).toLocaleString('fa-IR')} تومان`;
};

const contractNumber = (id: number): string => `K-INS-${String(id).padStart(6, '0')}`;

const InstallmentSaleContractPrintPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [sale, setSale] = useState<InstallmentSaleDetailData | null>(null);
  const [blockedSale, setBlockedSale] = useState<InstallmentSaleDetailData | null>(null);
  const [missingFields, setMissingFields] = useState<string[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      const saleId = Number(id || 0);
      if (!Number.isInteger(saleId) || saleId <= 0) {
        setError('شناسه قرارداد نامعتبر است.');
        return;
      }

      try {
        // prepare endpoint only fills empty snapshot fields. Existing historical snapshot values are immutable.
        const preparedResponse = await apiFetch(`/api/installment-sales/${saleId}/contract/prepare`, {
          method: 'POST',
        });
        const preparedResult = await preparedResponse.json();
        if (!preparedResponse.ok || !preparedResult?.success) {
          throw new Error(preparedResult?.message || 'آماده‌سازی قرارداد برای چاپ ناموفق بود.');
        }
        if (cancelled) return;

        if (!preparedResult.data?.ready) {
          const missing = Array.isArray(preparedResult.data?.missingFields)
            ? preparedResult.data.missingFields.map(String)
            : ['اطلاعات هویتی قرارداد'];
          setBlockedSale((preparedResult.data?.sale || null) as InstallmentSaleDetailData | null);
          setMissingFields(missing);
          setError('قرارداد هنوز آماده امضا نیست. اطلاعات زیر را از محل مربوط تکمیل کنید.');
          return;
        }

        setSale(preparedResult.data.sale as InstallmentSaleDetailData);
      } catch (err: any) {
        if (!cancelled) setError(err?.message || 'خطا در دریافت اطلاعات قرارداد.');
      }
    };

    load();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const remaining = useMemo(
    () => Math.max(0, Number(sale?.actualSalePrice || 0) - Number(sale?.downPayment || 0)),
    [sale],
  );

  if (error) {
    const hasBuyerMissing = missingFields.some((field) => /خریدار/.test(field));
    const hasSellerMissing = missingFields.some((field) => /فروشنده|فروشگاه/.test(field));
    const hasCheckMissing = missingFields.some((field) => /چک|صیادی|صادرکننده/.test(field));
    return (
      <div id="report-print-root" data-print-blocked="true" className="report-print-shell mx-auto max-w-3xl rounded-2xl border border-rose-200 bg-white p-6 text-right" dir="rtl">
        <div className="no-print flex flex-col gap-4">
          <div>
            <h1 className="text-lg font-black text-rose-800">چاپ قرارداد متوقف شد</h1>
            <p className="mt-2 text-sm leading-7 text-slate-700">{error}</p>
            {missingFields.length ? (
              <ul className="mt-3 grid gap-2 text-sm text-slate-700 sm:grid-cols-2">
                {missingFields.map((field) => (
                  <li key={field} className="flex items-start gap-2 rounded-xl bg-rose-50 px-3 py-2 leading-6">
                    <i className="fa-solid fa-circle-exclamation mt-1 text-rose-600" aria-hidden="true" />
                    <span>{field}</span>
                  </li>
                ))}
              </ul>
            ) : null}
            <p className="mt-3 text-xs leading-6 text-slate-500">
              اطلاعات خریدار در پروفایل مشتری، مشخصات نماینده قانونی در تنظیمات کسب‌وکار و اطلاعات صادرکننده در ویرایش همان چک ذخیره می‌شود.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            {hasBuyerMissing && Number(blockedSale?.customerId || 0) > 0 ? (
              <button type="button" onClick={() => navigate(`/customers/${blockedSale?.customerId}?edit=contract`)} className="rounded-xl bg-blue-600 px-4 py-2 text-sm font-bold text-white">
                تکمیل پروفایل مشتری
              </button>
            ) : null}
            {hasSellerMissing ? (
              <button type="button" onClick={() => navigate('/settings')} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
                تکمیل تنظیمات فروشگاه
              </button>
            ) : null}
            {hasCheckMissing ? (
              <button type="button" onClick={() => navigate(`/installment-sales/${id || ''}?tab=checks`)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
                تکمیل مشخصات چک‌ها
              </button>
            ) : null}
            <button type="button" onClick={() => navigate(`/installment-sales/${id || ''}`)} className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-bold text-slate-700">
              بازگشت به پرونده فروش
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div id="report-print-root" className="report-print-shell mx-auto max-w-3xl bg-white p-8 text-center text-sm font-bold text-slate-600" dir="rtl">
        در حال بارگذاری قرارداد…
      </div>
    );
  }

  const checks = sale.checks || [];
  const payments = sale.payments || [];
  const items = sale.items || [];
  const buyerName = clean(sale.buyerFullName || sale.customerFullName);
  const contractMode = resolveSmartSaleContractMode(sale.saleType, checks);
  const saleDate = clean(sale.saleDate || sale.installmentsStartDate);

  return (
    <article id="report-print-root" className="installment-contract report-print-shell" dir="rtl" lang="fa">
      <style>{`
        .installment-contract {
          --contract-ink: #111827;
          --contract-muted: #475569;
          --contract-line: #cbd5e1;
          color: var(--contract-ink);
          background: #fff;
          font-size: 12.25px;
          line-height: 1.95;
          text-align: right;
        }
        .installment-contract * { box-sizing: border-box; }
        .contract-header { text-align: center; border-bottom: 2px solid #0f172a; padding-bottom: 12px; margin-bottom: 14px; }
        .contract-title { margin: 0; font-size: 20px; line-height: 1.6; font-weight: 900; }
        .contract-subtitle { margin: 2px 0 0; color: var(--contract-muted); font-size: 11px; font-weight: 700; }
        .contract-meta { margin-top: 8px; display: flex; flex-wrap: wrap; justify-content: center; gap: 8px 22px; font-size: 11px; }
        .contract-box { border: 1px solid var(--contract-line); border-radius: 10px; padding: 10px 12px; margin: 10px 0; break-inside: avoid; page-break-inside: avoid; }
        .contract-box-title { margin: 0 0 7px; font-size: 12.5px; font-weight: 900; }
        .identity-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 5px 18px; }
        .identity-row { min-width: 0; }
        .identity-span-full { grid-column: 1 / -1; }
        .identity-label { color: var(--contract-muted); font-weight: 700; margin-left: 5px; }
        .identity-value { font-weight: 800; overflow-wrap: anywhere; }
        .contract-value-ltr { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; }
        .contract-article { margin: 12px 0; break-inside: auto; page-break-inside: auto; }
        .contract-article h2 { margin: 0 0 5px; font-size: 13px; font-weight: 900; }
        .contract-article p { margin: 3px 0; text-align: justify; }
        .contract-list { margin: 4px 0; padding-right: 19px; }
        .contract-list li { margin: 1px 0; }
        .contract-table-wrap { width: 100%; overflow: hidden; margin: 8px 0; border: 1px solid var(--contract-line); border-radius: 10px; background: #fff; }
        .contract-table { width: 100%; border-collapse: separate; border-spacing: 0; table-layout: fixed; font-size: 10.75px; line-height: 1.65; }
        .contract-table th, .contract-table td { min-width: 0; padding: 7px 8px; vertical-align: middle; text-align: right; overflow-wrap: anywhere; border: 0; border-bottom: 1px solid #e2e8f0; border-inline-start: 1px solid #eef2f7; }
        .contract-table th:first-child, .contract-table td:first-child { border-inline-start: 0; }
        .contract-table tbody tr:last-child td { border-bottom: 0; }
        .contract-table th { height: 34px; background: #f8fafc; color: #64748b; font-size: 9.75px; font-weight: 900; white-space: nowrap; }
        .contract-table tbody tr:nth-child(even) { background: #fbfdff; }
        .contract-table td { color: #334155; font-weight: 700; }
        .contract-table td.contract-row-index { text-align: center; color: #64748b; font-weight: 900; }
        .contract-cell-stack { display: flex; min-width: 0; flex-direction: column; align-items: flex-start; gap: 2px; }
        .contract-cell-primary { color: #0f172a; font-weight: 900; line-height: 1.55; }
        .contract-cell-meta { color: #64748b; font-size: 9.5px; font-weight: 700; line-height: 1.55; }
        .contract-cell-ltr { direction: ltr; unicode-bidi: isolate; font-variant-numeric: tabular-nums; text-align: left; }
        .contract-cell-nowrap { white-space: nowrap; overflow-wrap: normal; }
        .contract-note { border-right: 3px solid #64748b; padding-right: 8px; color: #334155; }
        .signature-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; margin-top: 16px; }
        .signature-box { min-height: 126px; border: 1px solid var(--contract-line); border-radius: 10px; padding: 9px 11px; break-inside: avoid; page-break-inside: avoid; }
        .signature-title { font-weight: 900; margin-bottom: 5px; }
        .signature-line { margin-top: 12px; border-bottom: 1px dotted #64748b; min-height: 20px; }
        .contract-footer { margin-top: 12px; border-top: 1px solid var(--contract-line); padding-top: 7px; display: flex; justify-content: space-between; gap: 12px; color: var(--contract-muted); font-size: 9.5px; }
        @media (max-width: 640px) {
          .identity-grid, .signature-grid { grid-template-columns: 1fr; }
          .contract-meta { justify-content: flex-start; }
        }
        @media print {
          .report-print-shell.installment-contract { padding: 0 !important; border: 0 !important; border-radius: 0 !important; box-shadow: none !important; }
          .installment-contract { font-size: 10.5pt !important; line-height: 1.72 !important; }
          .contract-header { margin-bottom: 8px !important; padding-bottom: 7px !important; }
          .contract-title { font-size: 15pt !important; }
          .contract-box { border-radius: 0 !important; padding: 6px 8px !important; margin: 6px 0 !important; }
          .contract-article { margin: 7px 0 !important; }
          .contract-article h2 { font-size: 10.5pt !important; margin-bottom: 2px !important; }
          .contract-article p { margin: 1px 0 !important; }
          .contract-table-wrap { border-radius: 0 !important; margin: 5px 0 !important; break-inside: avoid-page; page-break-inside: avoid; }
          .contract-table { font-size: 8.15pt !important; line-height: 1.48 !important; }
          .contract-table th { height: 7mm !important; font-size: 7.4pt !important; }
          .contract-table th, .contract-table td { padding: 2.2mm 2mm !important; }
          .contract-cell-primary { font-size: 8.15pt !important; line-height: 1.4 !important; }
          .contract-cell-meta { font-size: 7.15pt !important; line-height: 1.4 !important; }
          .signature-grid { gap: 8mm !important; margin-top: 8px !important; }
          .signature-box { min-height: 31mm !important; border-radius: 0 !important; padding: 5px 7px !important; }
          .contract-footer { font-size: 7.5pt !important; }
          .contract-article { break-inside: auto !important; page-break-inside: auto !important; }
          .contract-article h2 { break-after: avoid-page; page-break-after: avoid; }
          .contract-box, .signature-box { break-inside: avoid-page !important; page-break-inside: avoid !important; }
        }
      `}</style>

      <header className="contract-header">
        <h1 className="contract-title">{contractMode.title}</h1>
        <p className="contract-subtitle">{contractMode.subtitle}</p>
        <div className="contract-meta">
          <span>شماره قرارداد: <b className="contract-value-ltr">{contractNumber(Number(sale.id))}</b></span>
          <span>شناسه فروش: <b>{Number(sale.id).toLocaleString('fa-IR')}</b></span>
          <span>تاریخ قرارداد: <b className="contract-value-ltr">{saleDate}</b></span>
        </div>
      </header>

      <p>
        این قرارداد در تاریخ <b className="contract-value-ltr">{saleDate}</b> بین اشخاص زیر منعقد گردید و طرفین با قبول مفاد زیر اقدام به انعقاد قرارداد نمودند.
      </p>

      <section className="contract-box">
        <h2 className="contract-box-title">۱- فروشنده</h2>
        <div className="identity-grid">
          <div className="identity-row"><span className="identity-label">نام و نام خانوادگی:</span><span className="identity-value">{clean(sale.sellerFullName)}</span></div>
          <div className="identity-row"><span className="identity-label">نام فروشگاه:</span><span className="identity-value">{clean(sale.sellerStoreName)}</span></div>
          <div className="identity-row"><span className="identity-label">کد ملی:</span><span className="identity-value contract-value-ltr">{clean(sale.sellerNationalCode)}</span></div>
          <div className="identity-row"><span className="identity-label">شماره تماس:</span><span className="identity-value contract-value-ltr">{clean(sale.sellerPhoneNumber)}</span></div>
          <div className="identity-row identity-span-full"><span className="identity-label">آدرس:</span><span className="identity-value">{clean(sale.sellerAddress)}</span></div>
        </div>
      </section>

      <section className="contract-box">
        <h2 className="contract-box-title">۲- خریدار</h2>
        <div className="identity-grid">
          <div className="identity-row"><span className="identity-label">نام و نام خانوادگی:</span><span className="identity-value">{buyerName}</span></div>
          <div className="identity-row"><span className="identity-label">کد ملی:</span><span className="identity-value contract-value-ltr">{clean(sale.buyerNationalCode)}</span></div>
          <div className="identity-row"><span className="identity-label">شماره تماس:</span><span className="identity-value contract-value-ltr">{clean(sale.buyerPhoneNumber)}</span></div>
          <div className="identity-row identity-span-full"><span className="identity-label">آدرس:</span><span className="identity-value">{clean(sale.buyerAddress)}</span></div>
        </div>
      </section>

      <section className="contract-article">
        <h2>ماده ۱ - موضوع قرارداد</h2>
        <p>موضوع قرارداد عبارت است از فروش کالا/کالاهای زیر با مشخصات ثبت‌شده در پرونده فروش:</p>
        <div className="contract-table-wrap">
          <table className="contract-table" aria-label="مشخصات کالای موضوع قرارداد">
            <colgroup>
              <col style={{ width: '7%' }} />
              <col style={{ width: '17%' }} />
              <col style={{ width: '34%' }} />
              <col style={{ width: '18%' }} />
              <col style={{ width: '24%' }} />
            </colgroup>
            <thead>
              <tr>
                <th>ردیف</th>
                <th>نوع</th>
                <th>کالا و مدل</th>
                <th>مشخصات</th>
                <th>سریال / IMEI</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, index) => (
                <tr key={`${item.itemType}-${item.itemId ?? index}-${index}`}>
                  <td className="contract-row-index">{(index + 1).toLocaleString('fa-IR')}</td>
                  <td>
                    <span className="contract-cell-primary">{item.itemType === 'phone' ? 'گوشی موبایل' : item.itemType === 'inventory' ? 'کالا/لوازم' : 'خدمت'}</span>
                  </td>
                  <td>
                    <div className="contract-cell-stack">
                      <span className="contract-cell-primary">{clean(item.phoneModel || item.description)}</span>
                      {item.phoneModel && item.description && item.description !== item.phoneModel ? (
                        <span className="contract-cell-meta">{clean(item.description)}</span>
                      ) : null}
                    </div>
                  </td>
                  <td>
                    {item.itemType === 'phone' ? (
                      <div className="contract-cell-stack">
                        <span className="contract-cell-primary">رنگ: {clean(item.phoneColor)}</span>
                        <span className="contract-cell-meta">حافظه: {clean(item.phoneStorage)}</span>
                      </div>
                    ) : <span className="contract-cell-meta">موردی ثبت نشده</span>}
                  </td>
                  <td className="contract-cell-ltr">
                    <span className="contract-cell-primary contract-cell-nowrap">{item.itemType === 'phone' ? clean(item.phoneImei) : '—'}</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p>خریدار اقرار می‌نماید کالای موضوع قرارداد را به صورت کامل رؤیت کرده، مشخصات فنی و ظاهری آن را بررسی نموده و با رضایت کامل تحویل گرفته است.</p>
      </section>

      <section className="contract-article">
        <h2>ماده ۲ - مبلغ معامله و نحوه پرداخت</h2>
        <p>مبلغ کل معامله مبلغ <b>{money(sale.actualSalePrice)}</b> تعیین گردید.</p>
        <ul className="contract-list">
          <li>مبلغ نقدی/پیش‌پرداخت پرداخت‌شده: <b>{money(sale.downPayment)}</b></li>
          <li>مبلغ باقی‌مانده: <b>{money(remaining)}</b></li>
        </ul>

        {payments.length > 0 ? (
          <>
            <p>برنامه پرداخت مبلغ باقی‌مانده به شرح زیر مورد توافق قرار گرفت:</p>
            <div className="contract-table-wrap">
              <table className="contract-table" aria-label="برنامه اقساط قرارداد">
                <colgroup>
                  <col style={{ width: '12%' }} />
                  <col style={{ width: '44%' }} />
                  <col style={{ width: '44%' }} />
                </colgroup>
                <thead>
                  <tr><th>قسط</th><th>مبلغ قسط</th><th>تاریخ سررسید</th></tr>
                </thead>
                <tbody>
                  {payments.map((payment, index) => (
                    <tr key={payment.id ?? index}>
                      <td className="contract-row-index">{Number(payment.installmentNumber || index + 1).toLocaleString('fa-IR')}</td>
                      <td><span className="contract-cell-primary contract-cell-nowrap">{money(payment.amountDue)}</span></td>
                      <td className="contract-cell-ltr"><span className="contract-cell-primary contract-cell-nowrap">{clean(payment.dueDate)}</span></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : null}

        {contractMode.hasChecks ? (
          <>
            <p>
              خریدار بابت پرداخت تمام یا بخشی از مبلغ باقی‌مانده، {checks.length.toLocaleString('fa-IR')} فقره چک ارائه نموده است
              {contractMode.hasBuyerChecks ? `؛ ${contractMode.buyerCheckCount.toLocaleString('fa-IR')} فقره متعلق به خریدار` : ''}
              {contractMode.hasThirdPartyChecks ? ` و ${contractMode.thirdPartyCheckCount.toLocaleString('fa-IR')} فقره متعلق به شخص ثالث` : ''}:
            </p>
            <div className="contract-table-wrap">
              <table className="contract-table" aria-label="مشخصات چک‌های قرارداد">
                <colgroup>
                  <col style={{ width: '7%' }} />
                  <col style={{ width: '23%' }} />
                  <col style={{ width: '29%' }} />
                  <col style={{ width: '15%' }} />
                  <col style={{ width: '26%' }} />
                </colgroup>
                <thead>
                  <tr>
                    <th>ردیف</th>
                    <th>صادرکننده</th>
                    <th>شناسه‌های چک</th>
                    <th>بانک</th>
                    <th>مبلغ و سررسید</th>
                  </tr>
                </thead>
                <tbody>
                  {checks.map((check, index) => (
                    <tr key={check.id ?? index}>
                      <td className="contract-row-index">{(index + 1).toLocaleString('fa-IR')}</td>
                      <td>
                        <div className="contract-cell-stack">
                          <span className="contract-cell-primary">{clean(check.issuerName)}</span>
                          <span className="contract-cell-meta">{getCheckOwnershipLabel(check.ownershipType)}</span>
                          <span className="contract-cell-meta">کد ملی: <b className="contract-cell-ltr">{clean(check.issuerNationalCode)}</b></span>
                        </div>
                      </td>
                      <td>
                        <div className="contract-cell-stack">
                          <span className="contract-cell-primary">شماره: <b className="contract-cell-ltr">{clean(check.checkNumber)}</b></span>
                          <span className="contract-cell-meta">صیادی: <b className="contract-cell-ltr">{clean(check.sayadiId)}</b></span>
                        </div>
                      </td>
                      <td><span className="contract-cell-primary">{clean(check.bankName)}</span></td>
                      <td>
                        <div className="contract-cell-stack">
                          <span className="contract-cell-primary contract-cell-nowrap">{money(check.amount)}</span>
                          <span className="contract-cell-meta">سررسید: <b className="contract-cell-ltr contract-cell-nowrap">{clean(check.dueDate)}</b></span>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        ) : (
          <p className="contract-note">در زمان تنظیم و امضای این قرارداد هیچ چکی به‌عنوان ابزار پرداخت ثبت نشده است؛ پرداخت مانده ثمن صرفاً طبق جدول اقساط و رسیدهای معتبر انجام می‌شود و مواد ۳ تا ۵ این نسخه ناظر به تعهد مستقیم اقساطی خریدار است.</p>
        )}
      </section>

      <section className="contract-article">
        <h2>{contractMode.hasChecks ? 'ماده ۳ - ماهیت چک‌ها و تعهد پرداخت ثمن' : 'ماده ۳ - تعهد مستقیم پرداخت اقساط'}</h2>
        {!contractMode.hasChecks ? (
          <>
            <p>خریدار متعهد است هر قسط را در سررسید مندرج در جدول پرداخت نماید. ملاک اثبات پرداخت، رسید معتبر فروشنده یا سند بانکی قابل انتساب به این قرارداد است.</p>
            <p>عدم اخذ چک، موجب سقوط یا تعلیق تعهد خریدار به پرداخت مانده ثمن نیست و هر مبلغ صرفاً پس از وصول و ثبت در حساب قرارداد، پرداخت‌شده محسوب می‌شود.</p>
          </>
        ) : (
          <>
            {contractMode.hasBuyerChecks ? (
              <p>چک‌های مشخص‌شده با عنوان «چک خریدار» توسط خود خریدار صادر و برای پرداخت ثمن یا اقساط همین معامله تحویل فروشنده شده‌اند. طرفین توافق دارند تحویل چک تا زمان وصول قطعی، به‌تنهایی موجب برائت خریدار از مانده همان تعهد نمی‌شود.</p>
            ) : null}
            {contractMode.hasThirdPartyChecks ? (
              <p>چک‌های مشخص‌شده با عنوان «چک شخص ثالث» از سوی صادرکننده‌ای غیر از خریدار صادر شده و خریدار آنها را برای پرداخت بدهی خود ارائه کرده است. ارائه این چک‌ها تا زمان وصول قطعی، مسئولیت قراردادی خریدار نسبت به مانده ثمن را از بین نمی‌برد.</p>
            ) : null}
            <p>فروشنده فقط تا میزان طلب وصول‌نشده حق پیگیری دارد و دریافت یک مبلغ از هر مسیر، به همان میزان از مانده قرارداد و چک‌های متناظر کسر می‌شود؛ وصول مضاعف مجاز نیست.</p>
          </>
        )}
      </section>

      <section className="contract-article">
        <h2>{contractMode.hasChecks ? 'ماده ۴ - ثبت و انتقال در سامانه صیاد' : 'ماده ۴ - روش و زمان پرداخت اقساط'}</h2>
        {contractMode.hasChecks ? (
          <>
            <p>صادرکننده یا دارنده فعلی چک، حسب مورد، باید هویت ذی‌نفع، مبلغ و تاریخ چک را با اطلاعات این قرارداد در سامانه صیاد ثبت یا به فروشنده منتقل کند و فروشنده نیز پس از تطبیق اطلاعات، دریافت آن را تأیید نماید.</p>
            {contractMode.hasThirdPartyChecks ? <p>خریدار متعهد است ثبت اولیه یا زنجیره انتقال چک شخص ثالث تا فروشنده را به‌طور کامل فراهم کند؛ اختلاف خریدار با صادرکننده یا دارنده قبلی، مانع اجرای تعهد خریدار در برابر فروشنده نیست.</p> : null}
            <p>تحویل برگه بدون ثبت مالکیت فروشنده در سامانه صیاد، انجام کامل تعهد مربوط به تحویل چک محسوب نمی‌شود و مشخصات سامانه باید با مندرجات برگه و این قرارداد یکسان باشد.</p>
          </>
        ) : (
          <>
            <p>پرداخت هر قسط باید حداکثر تا پایان روز سررسید، از طریق روش اعلام‌شده فروشنده انجام و با شناسه قرارداد یا رسید معتبر ثبت شود.</p>
            <p>پرداخت جزئی از مبلغ یک قسط، فقط به همان میزان از بدهی می‌کاهد و مانده آن قسط تا تسویه کامل، بدهی حال‌شده همان سررسید باقی می‌ماند.</p>
          </>
        )}
      </section>

      <section className="contract-article">
        <h2>ماده ۵ - تأخیر یا عدم پرداخت</h2>
        {contractMode.hasChecks ? (
          <>
            <p>در صورت عدم پرداخت هر چک در سررسید، فروشنده می‌تواند پس از اخذ گواهی عدم پرداخت، حسب شرایط همان چک از راه‌های حقوقی، ثبتی یا صدور اجرائیه قانونی استفاده کند و نسبت به مانده وصول‌نشده ثمن نیز به تعهد قراردادی خریدار استناد نماید.</p>
            <p>اگر چک متعلق به شخص ثالث باشد، حقوق قانونی فروشنده نسبت به صادرکننده و سایر مسئولان سند محفوظ است؛ این امر مسئولیت قراردادی خریدار را تا میزان وصول‌نشده منتفی نمی‌کند.</p>
          </>
        ) : (
          <p>در صورت عدم پرداخت هر قسط در سررسید، فروشنده پس از مطالبه می‌تواند مانده سررسیدشده، هزینه‌های دادرسی و خسارت تأخیر تأدیه را فقط در حدود شرایط و میزان مقرر در قوانین لازم‌الاجرا مطالبه نماید.</p>
        )}
        <p>هزینه دادرسی، حق‌الوکاله طبق تعرفه قانونی و سایر خسارات فقط در صورت وجود شرایط قانونی و رأی یا دستور مرجع صالح قابل مطالبه است.</p>
      </section>

      <section className="contract-article">
        <h2>ماده ۶ - اقرار به دریافت کالا</h2>
        <p>خریدار اقرار می‌نماید کالای موضوع قرارداد را سالم، کامل و مطابق مشخصات ذکرشده تحویل گرفته و پس از تحویل کالا، مسئولیت پرداخت کامل مبلغ معامله را بر عهده دارد.</p>
      </section>

      <section className="contract-article">
        <h2>ماده ۷ - حل اختلاف</h2>
        <p>در صورت بروز اختلاف، طرفین ابتدا تلاش می‌کنند موضوع را از طریق مذاکره و تطبیق اسناد حساب حل نمایند. در صورت عدم حصول توافق، رسیدگی در صلاحیت مرجع قانونی صالح و مطابق قواعد آمره صلاحیت خواهد بود.</p>
      </section>

      <section className="contract-article">
        <h2>ماده ۸ - نسخ قرارداد</h2>
        <p>این قرارداد با رعایت قواعد عمومی قراردادها و مقررات لازم‌الاجرای صدور و انتقال چک، در دو نسخه با اعتبار یکسان تنظیم و پس از مطالعه کامل، مورد قبول و امضای طرفین قرار گرفت.</p>
      </section>

      <section className="signature-grid" aria-label="امضاهای قرارداد">
        <div className="signature-box">
          <div className="signature-title">امضای فروشنده</div>
          <div>نام و نام خانوادگی: <b>{clean(sale.sellerFullName)}</b></div>
          <div className="signature-line">امضا و اثر انگشت:</div>
          <div className="signature-line">تاریخ: <b className="contract-value-ltr">{saleDate}</b></div>
        </div>
        <div className="signature-box">
          <div className="signature-title">امضای خریدار</div>
          <div>نام و نام خانوادگی: <b>{buyerName}</b></div>
          <div className="signature-line">امضا و اثر انگشت:</div>
          <div className="signature-line">تاریخ: <b className="contract-value-ltr">{saleDate}</b></div>
        </div>
        <div className="signature-box">
          <div className="signature-title">مشخصات و امضای شاهد اول</div>
          <div className="signature-line">نام و نام خانوادگی:</div>
          <div className="signature-line">کد ملی:</div>
          <div className="signature-line">امضا:</div>
        </div>
        <div className="signature-box">
          <div className="signature-title">مشخصات و امضای شاهد دوم</div>
          <div className="signature-line">نام و نام خانوادگی:</div>
          <div className="signature-line">کد ملی:</div>
          <div className="signature-line">امضا:</div>
        </div>
      </section>

      <footer className="contract-footer">
        <span>نسخه قرارداد: {clean(sale.contractVersion || CONTRACT_VERSION)} | حالت: {contractMode.title}</span>
        <span>شماره قرارداد: <b className="contract-value-ltr">{contractNumber(Number(sale.id))}</b></span>
      </footer>
    </article>
  );
};

export default InstallmentSaleContractPrintPage;
