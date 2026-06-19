import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import moment from 'jalali-moment';
import PageKit from '../../components/ui/PageKit';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import ReportFilterField from '../../components/reports/ReportFilterField';
import ReportDatePresetChips from '../../components/reports/ReportDatePresetChips';
import { apiFetch } from '../../utils/apiFetch';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

const money = (value: number) => formatCurrencyText(value || 0, readStoredCurrencyUnit());
const qty = (value: number) => (Number(value) || 0).toLocaleString('fa-IR', { maximumFractionDigits: 2 });

type PartnerOption = {
  storePartnerId: number;
  partnerName: string;
  colorTag?: string | null;
};

type ProfitSummaryRow = {
  storePartnerId: number;
  partnerName: string;
  colorTag?: string | null;
  ownerGainAmount: number;
  sharedProfitAmount: number;
  totalAmount: number;
  documentsCount: number;
  phoneLinesCount: number;
  accessoryLinesCount: number;
  serviceLinesCount: number;
};

type ProfitResponse = {
  partners: PartnerOption[];
  summaries: ProfitSummaryRow[];
  totals: {
    ownerGainAmount: number;
    sharedProfitAmount: number;
    totalAmount: number;
    documentsCount: number;
    phoneLinesCount: number;
    accessoryLinesCount: number;
    serviceLinesCount: number;
  };
  selectedPartner: ProfitSummaryRow | null;
};

type PartnerReportResponse = {
  partner: PartnerOption;
  summary: Record<string, number>;
  purchases: any[];
  sales: any[];
  currentInventory: any[];
};

type TabKey = 'profit' | 'accessories' | 'phones' | 'inventory' | 'assets' | 'settlement';
const partnerReportTabs: TabKey[] = ['profit', 'accessories', 'phones', 'inventory', 'assets', 'settlement'];
const normalizePartnerReportTab = (value: string | null): TabKey => partnerReportTabs.includes(value as TabKey) ? (value as TabKey) : 'profit';
const readInitialPartnerReportTab = (): TabKey => {
  if (typeof window === 'undefined') return 'profit';
  const params = new URLSearchParams(window.location.search);
  return normalizePartnerReportTab(params.get('tab'));
};


const cardCls = 'partner-premium-card rounded-[26px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900/85';
const thCls = 'px-3 py-3 text-right text-[11px] font-black tracking-[0.12em] text-slate-600 dark:text-slate-300';
const tdCls = 'px-3 py-3 align-top text-sm text-slate-800 dark:text-slate-100';
const mutedCls = 'text-xs leading-6 text-slate-500 dark:text-slate-400';

const surfaceCls = 'rounded-[30px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.98),rgba(248,250,252,0.96)_55%,rgba(238,242,255,0.95)_100%)] p-5 shadow-[0_28px_70px_-48px_rgba(15,23,42,0.26)] dark:border-slate-800 dark:bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,0.88),rgba(15,23,42,0.92)_55%,rgba(2,6,23,0.96)_100%)]';

const SectionLead = ({ kicker, title, description, tone = 'slate' }: { kicker: string; title: string; description: string; tone?: 'slate' | 'emerald' | 'blue' | 'amber' }) => {
  const toneMap = {
    slate: 'text-slate-500 dark:text-slate-400',
    emerald: 'text-emerald-700 dark:text-emerald-300',
    blue: 'text-indigo-600 dark:text-indigo-300',
    amber: 'text-amber-700 dark:text-amber-300',
  } as const;
  return (
    <div className={surfaceCls}>
      <div className={`text-[11px] font-black tracking-[0.16em] ${toneMap[tone]}`}>{kicker}</div>
      <h3 className="mt-2 text-[18px] font-black text-slate-900 dark:text-slate-50">{title}</h3>
      <p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p>
    </div>
  );
};

const TabButton = ({ active, onClick, icon, children }: { active: boolean; onClick: () => void; icon: string; children: React.ReactNode }) => (
  <button
    onClick={onClick}
    className={`partner-tab-button inline-flex min-h-[44px] items-center justify-center gap-2 rounded-[16px] px-4 text-sm font-black transition ${active
      ? 'is-active bg-indigo-600 text-white shadow-[0_18px_34px_-24px_rgba(79,70,229,0.75)]'
      : 'border border-slate-200 bg-white/80 text-slate-700 hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-800'}`}
  >
    <i className={`fa-solid ${icon}`} aria-hidden="true" />
    <span>{children}</span>
  </button>
);

const partnerMetricIcon = (title: string) => {
  if (title.includes('اصل') || title.includes('سرمایه')) return 'fa-vault';
  if (title.includes('سود') || title.includes('استحقاق')) return 'fa-chart-line';
  if (title.includes('موجودی') || title.includes('ارزش')) return 'fa-boxes-stacked';
  if (title.includes('گوشی')) return 'fa-mobile-screen-button';
  if (title.includes('لوازم')) return 'fa-cubes';
  if (title.includes('اسناد') || title.includes('تعداد')) return 'fa-receipt';
  if (title.includes('تسویه')) return 'fa-scale-balanced';
  return 'fa-circle-nodes';
};

const MetricCard = ({ title, value, hint }: { title: string; value: string; hint?: string }) => (
  <div className={cardCls}>
    <span className="partner-premium-card__icon" aria-hidden="true"><i className={`fa-solid ${partnerMetricIcon(title)}`} /></span>
    <div className="partner-premium-card__content">
      <div className="partner-premium-card__label">{title}</div>
      <div className="partner-premium-card__value">{value}</div>
      {hint ? <div className="partner-premium-card__hint">{hint}</div> : null}
    </div>
  </div>
);

const PartnerPerformanceReport: React.FC = () => {
  const [fromDate, setFromDate] = useState<Date>(moment().subtract(30, 'day').toDate());
  const [toDate, setToDate] = useState<Date>(new Date());
  const [tab, setTab] = useState<TabKey>(() => readInitialPartnerReportTab());
  const [profitData, setProfitData] = useState<ProfitResponse | null>(null);
  const [selectedPartnerId, setSelectedPartnerId] = useState<number | null>(null);
  const [accessoriesData, setAccessoriesData] = useState<PartnerReportResponse | null>(null);
  const [phonesData, setPhonesData] = useState<PartnerReportResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [settlementData, setSettlementData] = useState<any | null>(null);
  const [settlementTransactions, setSettlementTransactions] = useState<any[]>([]);
  const [settlementForm, setSettlementForm] = useState<any>({ fromStorePartnerId: '', destinationKind: 'partner', toStorePartnerId: '', amount: '', settlementDate: moment().locale('en').format('jYYYY/jMM/jDD'), paymentMethod: '', referenceNo: '', notes: '' });
  const [isSavingSettlement, setIsSavingSettlement] = useState(false);

  const fromDateShamsi = useMemo(() => moment(fromDate).locale('en').format('jYYYY/jMM/jDD'), [fromDate]);
  const toDateShamsi = useMemo(() => moment(toDate).locale('en').format('jYYYY/jMM/jDD'), [toDate]);

  const loadProfit = async () => {
    const url = `/api/reports/partners/profit?fromDate=${encodeURIComponent(fromDateShamsi)}&toDate=${encodeURIComponent(toDateShamsi)}${selectedPartnerId ? `&partnerId=${selectedPartnerId}` : ''}`;
    const response = await apiFetch(url);
    const json = await response.json();
    if (!response.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش سود شرکا');
    return json.data as ProfitResponse;
  };

  const loadAccessories = async (partnerId: number) => {
    const response = await apiFetch(`/api/reports/partners/accessories?partnerId=${partnerId}&fromDate=${encodeURIComponent(fromDateShamsi)}&toDate=${encodeURIComponent(toDateShamsi)}`);
    const json = await response.json();
    if (!response.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش لوازم شریک');
    return json.data as PartnerReportResponse;
  };

  const loadPhones = async (partnerId: number) => {
    const response = await apiFetch(`/api/reports/partners/phones?partnerId=${partnerId}&fromDate=${encodeURIComponent(fromDateShamsi)}&toDate=${encodeURIComponent(toDateShamsi)}`);
    const json = await response.json();
    if (!response.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش گوشی شریک');
    return json.data as PartnerReportResponse;
  };

  const loadSettlement = async () => {
    const response = await apiFetch(`/api/reports/partners/settlement?fromDate=${encodeURIComponent(fromDateShamsi)}&toDate=${encodeURIComponent(toDateShamsi)}`);
    const json = await response.json();
    if (!response.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت گزارش تسویه شرکا');
    return json.data;
  };

  const loadSettlementTransactions = async () => {
    const response = await apiFetch(`/api/reports/partners/settlement-transactions?fromDate=${encodeURIComponent(fromDateShamsi)}&toDate=${encodeURIComponent(toDateShamsi)}`);
    const json = await response.json();
    if (!response.ok || !json?.success) throw new Error(json?.message || 'خطا در دریافت تراکنش‌های تسویه');
    return Array.isArray(json.data) ? json.data : [];
  };

  const loadPartnerReports = useCallback(async (partnerId: number | null) => {
    if (!partnerId) {
      setAccessoriesData(null);
      setPhonesData(null);
      return;
    }

    const [acc, phones] = await Promise.all([
      loadAccessories(partnerId),
      loadPhones(partnerId),
    ]);

    setAccessoriesData(acc);
    setPhonesData(phones);
  }, [fromDateShamsi, toDateShamsi]);

  const loadBaseReport = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [profit, settlement, transactions] = await Promise.all([
        loadProfit(),
        loadSettlement(),
        loadSettlementTransactions(),
      ]);

      setProfitData(profit);
      setSettlementData(settlement);
      setSettlementTransactions(transactions);

      const fallbackPartnerId = profit.partners?.[0]?.storePartnerId || null;
      if (!selectedPartnerId && fallbackPartnerId) {
        setSelectedPartnerId(fallbackPartnerId);
      }
    } catch (err: any) {
      setError(err?.message || 'در بارگذاری گزارش شرکا مشکلی رخ داد.');
    } finally {
      setIsLoading(false);
    }
  }, [fromDateShamsi, toDateShamsi, selectedPartnerId]);

  useEffect(() => {
    const t = window.setTimeout(() => { void loadBaseReport(); }, 180);
    return () => window.clearTimeout(t);
  }, [loadBaseReport]);

  useEffect(() => {
    const t = window.setTimeout(() => { void loadPartnerReports(selectedPartnerId); }, 120);
    return () => window.clearTimeout(t);
  }, [selectedPartnerId, loadPartnerReports]);

  const selectedProfitRow = useMemo(() => {
    if (!profitData) return null;
    return profitData.summaries.find((row) => Number(row.storePartnerId) === Number(selectedPartnerId)) || profitData.selectedPartner || null;
  }, [profitData, selectedPartnerId]);

  const inventorySummary = useMemo(() => {
    const phoneSummary = phonesData?.summary || {};
    const accessorySummary = accessoriesData?.summary || {};
    const phoneCount = Number(phoneSummary.currentInventoryCount) || 0;
    const phoneValue = Number(phoneSummary.currentInventoryValue) || 0;
    const accessoryQty = Number(accessorySummary.currentInventoryQuantity) || 0;
    const accessoryValue = Number(accessorySummary.currentInventoryValue) || 0;
    return {
      phoneCount,
      phoneValue,
      accessoryQty,
      accessoryValue,
      totalValue: phoneValue + accessoryValue,
    };
  }, [phonesData, accessoriesData]);

  const currentAssetsSummary = useMemo(() => {
    const capitalReturnAmount = Number(selectedProfitRow?.capitalReturnAmount) || 0;
    const recognizedProfit = Number(selectedProfitRow?.totalAmount) || 0;
    const ownerGainAmount = Number(selectedProfitRow?.ownerGainAmount) || 0;
    const sharedProfitAmount = Number(selectedProfitRow?.sharedProfitAmount) || 0;
    const settlementEntitlementAmount = Number(selectedProfitRow?.settlementEntitlementAmount) || (capitalReturnAmount + recognizedProfit);
    const inventoryValue = Number(inventorySummary.totalValue) || 0;
    const phoneInventoryValue = Number(inventorySummary.phoneValue) || 0;
    const accessoryInventoryValue = Number(inventorySummary.accessoryValue) || 0;
    return {
      inventoryValue,
      phoneInventoryValue,
      accessoryInventoryValue,
      capitalReturnAmount,
      recognizedProfit,
      ownerGainAmount,
      sharedProfitAmount,
      settlementEntitlementAmount,
      totalCurrentAssets: inventoryValue + recognizedProfit,
    };
  }, [inventorySummary, selectedProfitRow]);

  const switchTab = useCallback((nextTab: TabKey) => {
    setTab(nextTab);
    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('tab', nextTab);
      window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requestedTab = normalizePartnerReportTab(params.get('tab'));
    if (requestedTab !== tab) setTab(requestedTab);
  }, [tab]);

  const reconciliation = settlementData?.reconciliation || null;
  const reconciliationIssues = useMemo(() => Array.isArray(reconciliation?.issues) ? reconciliation.issues : [], [reconciliation]);
  const primaryReconciliationIssues = useMemo(() => {
    return [...reconciliationIssues]
      .sort((a: any, b: any) => {
        const severityRank = (item: any) => item?.severity === 'error' ? 0 : item?.severity === 'warning' ? 1 : 2;
        return severityRank(a) - severityRank(b) || (Number(b?.diffAmount) || 0) - (Number(a?.diffAmount) || 0);
      })
      .slice(0, 3);
  }, [reconciliationIssues]);
  const reconciliationStatusLabel = reconciliation?.status === 'error' ? 'اختلاف عددی' : reconciliation?.status === 'warning' ? 'نیازمند بررسی' : 'سالم';
  const reconciliationStatusClass = reconciliation?.status === 'error'
    ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200'
    : reconciliation?.status === 'warning'
      ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'
      : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-200';

  const submitSettlement = async () => {
    if (!settlementForm.fromStorePartnerId || !settlementForm.amount || !settlementForm.settlementDate) {
      window.alert('شریک پرداخت‌کننده، مبلغ و تاریخ تسویه را کامل کن.');
      return;
    }
    if (settlementForm.destinationKind === 'partner' && !settlementForm.toStorePartnerId) {
      window.alert('شریک دریافت‌کننده را انتخاب کن.');
      return;
    }
    try {
      setIsSavingSettlement(true);
      const response = await apiFetch('/api/reports/partners/settlement-transactions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          fromStorePartnerId: Number(settlementForm.fromStorePartnerId),
          destinationKind: settlementForm.destinationKind,
          toStorePartnerId: settlementForm.destinationKind === 'partner' ? Number(settlementForm.toStorePartnerId) : null,
          amount: Number(String(settlementForm.amount).replace(/,/g, '')),
          settlementDate: settlementForm.settlementDate,
          paymentMethod: settlementForm.paymentMethod || null,
          referenceNo: settlementForm.referenceNo || null,
          notes: settlementForm.notes || null,
        })
      });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.message || 'ثبت اطلاعات تسویه انجام نشد.');
      setSettlementForm({ fromStorePartnerId: '', destinationKind: 'partner', toStorePartnerId: '', amount: '', settlementDate: moment().locale('en').format('jYYYY/jMM/jDD'), paymentMethod: '', referenceNo: '', notes: '' });
      await loadBaseReport();
      await loadPartnerReports(selectedPartnerId || null);
    } catch (err: any) {
      window.alert(err?.message || 'ثبت اطلاعات تسویه انجام نشد.');
    } finally {
      setIsSavingSettlement(false);
    }
  };

  const cancelSettlement = async (id: number) => {
    if (!window.confirm('این ثبت اطلاعات تسویه باطل شود؟')) return;
    try {
      const response = await apiFetch(`/api/reports/partners/settlement-transactions/${id}`, { method: 'DELETE' });
      const json = await response.json();
      if (!response.ok || !json?.success) throw new Error(json?.message || 'ابطال تسویه انجام نشد.');
      await loadBaseReport();
      await loadPartnerReports(selectedPartnerId || null);
    } catch (err: any) {
      window.alert(err?.message || 'ثبت اطلاعات تسویه انجام نشد.');
    }
  };


  const htmlEscape = (value: any) => String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');

  const openPrintDocument = (title: string, body: string) => {
    const win = window.open('', '_blank', 'noopener,noreferrer,width=1080,height=780');
    if (!win) {
      window.alert('امکان باز کردن پنجره چاپ وجود ندارد. پاپ‌آپ مرورگر را بررسی و ادامه کن.');
      return;
    }
    const doc = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
<meta charset="utf-8" />
<title>${htmlEscape(title)}</title>
<style>
  body { font-family: Vazir, Tahoma, Arial, sans-serif; background: #f8fafc; color: #0f172a; margin: 0; }
  .sheet { width: 100%; max-width: 980px; margin: 0 auto; background: #fff; min-height: 100vh; padding: 32px; box-sizing: border-box; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; gap: 16px; border-bottom: 2px solid #e2e8f0; padding-bottom: 16px; margin-bottom: 20px; }
  .title { font-size: 24px; font-weight: 800; margin: 0; }
  .muted { color: #475569; font-size: 12px; }
  .grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 12px; margin: 16px 0 22px; }
  .card { border: 1px solid #e2e8f0; border-radius: 14px; padding: 12px 14px; background: #f8fafc; }
  .card .k { font-size: 12px; color: #475569; margin-bottom: 6px; }
  .card .v { font-size: 18px; font-weight: 800; }
  h2 { font-size: 15px; margin: 18px 0 10px; }
  table { width: 100%; border-collapse: collapse; }
  th, td { border: 1px solid #e2e8f0; padding: 9px 10px; text-align: right; vertical-align: top; }
  th { background: #f1f5f9; font-size: 12px; }
  td { font-size: 13px; }
  .footer { margin-top: 24px; display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 24px; }
  .sign { border-top: 1px dashed #94a3b8; padding-top: 12px; min-height: 54px; }
  .center { text-align: center; }
  .badge { display: inline-block; border-radius: 999px; padding: 4px 10px; background: #e2e8f0; font-size: 12px; font-weight: 700; }
  @media print { body { background: #fff; } .sheet { max-width: none; padding: 18px; } }
</style>
</head>
<body>
  <div class="sheet">
    <div class="header">
      <div>
        <h1 class="title">${htmlEscape(title)}</h1>
        <div class="muted">بازه گزارش: ${htmlEscape(fromDateShamsi)} تا ${htmlEscape(toDateShamsi)}</div>
      </div>
      <div class="muted center">
        <div>تاریخ چاپ</div>
        <div>${htmlEscape(moment().locale('fa').format('jYYYY/jMM/jDD HH:mm'))}</div>
      </div>
    </div>
    ${body}
  </div>
  <script>window.onload = () => { window.print(); };</script>
</body>
</html>`;
    win.document.open();
    win.document.write(doc);
    win.document.close();
  };

  const printSettlementReceipt = (tx: any) => {
    const amount = money(tx?.amount || 0);
    const fromName = tx?.fromPartnerName || 'نامشخص';
    const toName = tx?.destinationKind === 'partner' ? (tx?.toPartnerName || 'نامشخص') : 'صندوق / مغازه';
    const body = `
      <div class="grid">
        <div class="card"><div class="k">شماره رسید</div><div class="v">${htmlEscape(tx?.id || '—')}</div></div>
        <div class="card"><div class="k">مبلغ تسویه</div><div class="v">${htmlEscape(amount)}</div></div>
        <div class="card"><div class="k">از</div><div class="v">${htmlEscape(fromName)}</div></div>
        <div class="card"><div class="k">به</div><div class="v">${htmlEscape(toName)}</div></div>
        <div class="card"><div class="k">تاریخ تسویه</div><div class="v">${htmlEscape(formatIsoToShamsi(tx?.settlementDate) || tx?.settlementDate || '—')}</div></div>
        <div class="card"><div class="k">روش پرداخت</div><div class="v">${htmlEscape(tx?.paymentMethod || '—')}</div></div>
      </div>
      <h2>جزئیات ثبت اطلاعات</h2>
      <table>
        <tbody>
          <tr><th>شماره پیگیری</th><td>${htmlEscape(tx?.referenceNo || '—')}</td></tr>
          <tr><th>یادداشت</th><td>${htmlEscape(tx?.notes || '—')}</td></tr>
          <tr><th>وضعیت</th><td><span class="badge">${htmlEscape(tx?.status === 'canceled' ? 'باطل‌شده' : 'فعال')}</span></td></tr>
        </tbody>
      </table>
      <div class="footer">
        <div class="sign">امضای پرداخت‌کننده</div>
        <div class="sign">امضای دریافت‌کننده / تایید صندوق</div>
      </div>
    `;
    openPrintDocument(`رسید تسویه #${tx?.id || ''}`, body);
  };

  const printSettlementSession = () => {
    const settlements = Array.isArray(settlementData?.settlements) ? settlementData.settlements : [];
    const txRows = Array.isArray(settlementTransactions) ? settlementTransactions : [];
    const body = `
      <div class="grid">
        <div class="card"><div class="k">جمع استحقاق تسویه</div><div class="v">${htmlEscape(money(settlementData?.totals?.totalSettlementEntitlement || 0))}</div></div>
        <div class="card"><div class="k">جمع ارزش موجودی</div><div class="v">${htmlEscape(money(settlementData?.totals?.totalInventoryValue || 0))}</div></div>
        <div class="card"><div class="k">جمع سود تخصیص‌یافته</div><div class="v">${htmlEscape(money(settlementData?.totals?.totalRecognizedProfit || 0))}</div></div>
        <div class="card"><div class="k">پروفایل تقسیم سود</div><div class="v">${htmlEscape(settlementData?.profile?.title || 'تقسیم مساوی')}</div></div>
        <div class="card"><div class="k">کنترل عددی</div><div class="v">${htmlEscape(reconciliationStatusLabel)}</div></div>
        <div class="card"><div class="k">اختلاف تسویه گوشی‌محور</div><div class="v">${htmlEscape(money(settlementData?.reconciliation?.phoneLedgerDeltaAmount || 0))}</div></div>
      </div>
      <h2>جمع‌بندی تسویه شرکا</h2>
      <table>
        <thead>
          <tr>
            <th>شریک</th><th>اصل پول برگشتی</th><th>مازاد قیمت روز</th><th>سود مشترک</th><th>جمع استحقاق</th><th>موجودی فعلی</th><th>مانده قبل از تسویه</th><th>پرداختی</th><th>دریافتی</th><th>مانده بعد از تسویه</th><th>وضعیت</th>
          </tr>
        </thead>
        <tbody>
          ${settlements.length ? settlements.map((row: any) => `<tr>
            <td>${htmlEscape(row.partnerName)}</td>
            <td>${htmlEscape(money(row.capitalReturnAmount || 0))}</td>
            <td>${htmlEscape(money(row.ownerGainAmount || 0))}</td>
            <td>${htmlEscape(money(row.sharedProfitAmount || 0))}</td>
            <td>${htmlEscape(money(row.settlementEntitlement || 0))}</td>
            <td>${htmlEscape(money(row.inventoryValue || 0))}</td>
            <td>${htmlEscape(money(Math.abs(Number(row.settlementBalance) || 0)))}</td>
            <td>${htmlEscape(money(row.paidSettlementAmount || 0))}</td>
            <td>${htmlEscape(money(row.receivedSettlementAmount || 0))}</td>
            <td>${htmlEscape(money(Math.abs(Number(row.remainingSettlementBalance) || 0)))}</td>
            <td>${htmlEscape(Number(row.remainingSettlementBalance) > 0 ? 'بستانکار' : Number(row.remainingSettlementBalance) < 0 ? 'بدهکار' : 'تسویه')}</td>
          </tr>`).join('') : '<tr><td colspan="11" class="center">داده‌ای برای این بازه پیدا نشد.</td></tr>'}
        </tbody>
      </table>
      <h2>ثبت اطلاعات‌های تسویه در بازه</h2>
      <table>
        <thead>
          <tr><th>تاریخ</th><th>از</th><th>به</th><th>مبلغ</th><th>روش</th><th>پیگیری</th><th>یادداشت</th></tr>
        </thead>
        <tbody>
          ${txRows.length ? txRows.map((tx: any) => `<tr>
            <td>${htmlEscape(formatIsoToShamsi(tx?.settlementDate) || tx?.settlementDate || '—')}</td>
            <td>${htmlEscape(tx?.fromPartnerName || '—')}</td>
            <td>${htmlEscape(tx?.destinationKind === 'partner' ? (tx?.toPartnerName || '—') : 'صندوق / مغازه')}</td>
            <td>${htmlEscape(money(tx?.amount || 0))}</td>
            <td>${htmlEscape(tx?.paymentMethod || '—')}</td>
            <td>${htmlEscape(tx?.referenceNo || '—')}</td>
            <td>${htmlEscape(tx?.notes || '—')}</td>
          </tr>`).join('') : '<tr><td colspan="7" class="center">در این بازه ثبت اطلاعات فعالی وجود ندارد.</td></tr>'}
        </tbody>
      </table>
      <div class="footer">
        <div class="sign">امضای مدیر / حسابداری</div>
        <div class="sign">امضای شرکا / تایید جلسه تسویه</div>
      </div>
    `;
    openPrintDocument('صورت‌جلسه تسویه شرکا', body);
  };

  const toolbarRight = (
    <div className="flex w-full flex-wrap items-stretch gap-2 sm:gap-2.5 xl:w-auto xl:justify-end">
      <ReportDatePresetChips
            fromDate={fromDate}
            toDate={toDate}
            onChange={({ from, to }) => { setFromDate(from); setToDate(to); }}
            className="basis-full xl:basis-auto xl:min-w-[34rem]"
          />
          <ReportFilterField label="از تاریخ" icon={<i className="fa-regular fa-calendar" />} minWidthClassName="basis-full sm:basis-[11rem] sm:min-w-[11rem]">
        <ShamsiDatePicker value={fromDate} onChange={(d: any) => d && setFromDate(d)} inputClassName="w-full h-11 rounded-2xl" />
      </ReportFilterField>
      <ReportFilterField label="تا تاریخ" icon={<i className="fa-regular fa-calendar-check" />} minWidthClassName="basis-full sm:basis-[11rem] sm:min-w-[11rem]">
        <ShamsiDatePicker value={toDate} onChange={(d: any) => d && setToDate(d)} inputClassName="w-full h-11 rounded-2xl" />
      </ReportFilterField>
      <ReportFilterField label="شریک" icon={<i className="fa-solid fa-users" />} minWidthClassName="basis-full sm:basis-[13.75rem] sm:min-w-[13.75rem]">
        <select
          value={selectedPartnerId ?? ''}
          onChange={(e) => setSelectedPartnerId(e.target.value ? Number(e.target.value) : null)}
          className="ux-input h-11 w-full rounded-2xl"
          dir="rtl"
        >
          <option value="">انتخاب شریک</option>
          {(profitData?.partners || []).map((partner) => (
            <option key={partner.storePartnerId} value={partner.storePartnerId}>{partner.partnerName}</option>
          ))}
        </select>
      </ReportFilterField>
      <button
        onClick={() => void load()}
        className="report-filter-button report-filter-button--primary basis-full sm:basis-auto"
      >
        <i className={`fa-solid fa-bolt ${isLoading ? 'fa-fade' : ''}`} />
        بازخوانی
      </button>
    </div>
  );

  const secondaryRow = (
    <div className="partner-report-tabs-wrap">
      <div className="partner-tabs-shell partner-report-tabs-shell flex flex-wrap items-center gap-2 rounded-[20px] border border-slate-200/80 bg-white/85 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/75">
        <TabButton active={tab === 'profit'} onClick={() => switchTab('profit')} icon="fa-chart-line">سود شریک‌ها</TabButton>
        <TabButton active={tab === 'accessories'} onClick={() => switchTab('accessories')} icon="fa-box-open">لوازم هر شریک</TabButton>
        <TabButton active={tab === 'phones'} onClick={() => switchTab('phones')} icon="fa-mobile-screen-button">گوشی‌های هر شریک</TabButton>
        <TabButton active={tab === 'inventory'} onClick={() => switchTab('inventory')} icon="fa-boxes-stacked">موجودی و ارزش شریک</TabButton>
        <TabButton active={tab === 'assets'} onClick={() => switchTab('assets')} icon="fa-scale-balanced">استحقاق و موجودی شریک</TabButton>
        <TabButton active={tab === 'settlement'} onClick={() => switchTab('settlement')} icon="fa-handshake">تسویه شرکا</TabButton>
      </div>
    </div>
  );

  return (
    <PageKit
      title="مرکز گزارش و تسویه شرکا"
      subtitle="نمای تحلیلی یکپارچه برای سود، مالکیت، موجودی و تسویه هر شریک بر پایه داده‌های ثبت اطلاعات‌شده فروشگاه."
      icon={<i className="fa-solid fa-people-group" />}
      className="report-merged-page partner-performance-executive-page"
      toolbarRight={toolbarRight}
      secondaryRow={secondaryRow}
      isLoading={isLoading}
      error={error || undefined}
      isEmpty={!isLoading && !error && !(profitData?.partners?.length)}
      emptyTitle="هنوز شریک فعالی برای گزارش وجود ندارد"
      emptyDescription="ابتدا از بخش تنظیمات ← مرکز مالکیت و تسهیم سود، هسته شراکت را ایجاد و فعال کن."
      emptyActionLabel="بازخوانی"
      onEmptyAction={() => void load()}
    >
      {tab === 'profit' ? (
        <div className="space-y-5">
          <div className="partner-profit-hero-grid partner-profit-hero-grid--v2 grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
            <div className="partner-profit-hero-card partner-profit-hero-card--executive partner-profit-hero-card--v2 rounded-[26px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-900/85">
              <div className="partner-hero-card-heading">
                <span className="partner-hero-card-icon partner-hero-card-icon--executive"><i className="fa-solid fa-chart-pie" /></span>
                <div className="partner-hero-card-titleblock">
                  <div className="partner-hero-card-kicker">EXECUTIVE VIEW</div>
                  <h3>نمای مدیریتی شریک منتخب</h3>
                </div>
              </div>
              <p className="partner-hero-card-copy">در این نما اصل پول برگشتی، مازاد قیمت روز، سهم سود مشترک و موجودی منتسب شریک منتخب کنار هم دیده می‌شود تا تصمیم‌گیری مالی سریع‌تر و دقیق‌تر انجام شود.</p>
            </div>
            <div className="partner-profit-hero-card partner-profit-hero-card--focus partner-profit-hero-card--v2 rounded-[26px] border border-emerald-200/80 bg-emerald-50/70 p-4 shadow-[0_24px_60px_-42px_rgba(16,185,129,0.18)] dark:border-emerald-900/50 dark:bg-emerald-950/20">
              <div className="partner-hero-card-heading">
                <span className="partner-hero-card-icon partner-hero-card-icon--focus"><i className="fa-solid fa-user-tie" /></span>
                <div className="partner-hero-card-titleblock">
                  <div className="partner-hero-card-kicker partner-hero-card-kicker--focus">PARTNER FOCUS</div>
                  <h3>{selectedProfitRow?.partnerName || 'شریک انتخاب‌شده'}</h3>
                  <p>اسناد موثر: {(selectedProfitRow?.documentsCount || 0).toLocaleString('fa-IR')}</p>
                </div>
              </div>
              <div className="partner-focus-value-card">
                <div>جمع استحقاق</div>
                <strong>{money(selectedProfitRow?.settlementEntitlementAmount || 0)}</strong>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <MetricCard title="اصل پول برگشتی" value={money(selectedProfitRow?.capitalReturnAmount || 0)} hint="بهای خرید اولیه منتسب به همین شریک از اقلام فروخته‌شده" />
            <MetricCard title="مازاد قیمت روز" value={money(selectedProfitRow?.ownerGainAmount || 0)} hint="اختلاف خرید اولیه تا مبنای خرید روز فروش برای مالک کالا" />
            <MetricCard title="سهم از سود مشترک" value={money(selectedProfitRow?.sharedProfitAmount || 0)} hint="سود عملیاتی تقسیم‌شده با پروفایل سهم سود" />
            <MetricCard title="جمع استحقاق تسویه" value={money(selectedProfitRow?.settlementEntitlementAmount || 0)} hint="اصل پول + مازاد قیمت روز + سهم سود مشترک" />
            <MetricCard title="تعداد اسناد موثر" value={(selectedProfitRow?.documentsCount || 0).toLocaleString('fa-IR')} hint="اسناد فروشی که برای این شریک snapshot داشته‌اند" />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard title="ارزش موجودی فعلی" value={money(currentAssetsSummary.inventoryValue)} hint="جمع ارزش منتسبِ گوشی‌ها و لوازم موجود این شریک" />
            <MetricCard title="جمع استحقاق و موجودی" value={money(currentAssetsSummary.totalCurrentAssets)} hint="ارزش موجودی منتسب + استحقاق ثبت اطلاعات‌شده" />
            <MetricCard title="موجودی گوشی" value={money(currentAssetsSummary.phoneInventoryValue)} hint="ارزش سهم شریک از گوشی‌های موجود" />
            <MetricCard title="موجودی لوازم" value={money(currentAssetsSummary.accessoryInventoryValue)} hint="ارزش سهم شریک از لوازم موجود" />
          </div>

          <div className={`${cardCls} partner-summary-table-card`}>
            <div className="partner-summary-table-head partner-summary-table-head--v2 mb-3 flex flex-wrap items-center justify-between gap-3">
              <div className="partner-summary-table-titleblock">
                <span className="partner-summary-table-title-icon"><i className="fa-solid fa-table-list" /></span>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">جمع‌بندی همه شرکا</h3>
                  <p className={mutedCls}>این جدول جمع‌بندی عملیاتی هر شریک را از داده‌های ثبت اطلاعات‌شده و انتساب‌های معتبر نشان می‌دهد.</p>
                </div>
              </div>
              <div className="partner-summary-table-chips flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400">
                <span>گوشی: {(profitData?.totals.phoneLinesCount || 0).toLocaleString('fa-IR')}</span>
                <span>لوازم: {(profitData?.totals.accessoryLinesCount || 0).toLocaleString('fa-IR')}</span>
                <span>خدمات: {(profitData?.totals.serviceLinesCount || 0).toLocaleString('fa-IR')}</span>
              </div>
            </div>
            <div className="partner-summary-table-shell overflow-x-auto">
              <table className="partner-summary-table min-w-full divide-y divide-black/10 dark:divide-white/10">
                <thead>
                  <tr>
                    <th className={thCls}>شریک</th>
                    <th className={thCls}>اصل سرمایه قابل بازگشت</th>
                    <th className={thCls}>مازاد قیمت روز</th>
                    <th className={thCls}>سود مشترک</th>
                    <th className={thCls}>جمع استحقاق</th>
                    <th className={thCls}>اسناد</th>
                    <th className={thCls}>گوشی</th>
                    <th className={thCls}>لوازم</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {(profitData?.summaries || []).map((row) => {
                    const selected = Number(row.storePartnerId) === Number(selectedPartnerId);
                    return (
                      <tr key={row.storePartnerId} className={selected ? 'is-selected bg-slate-50 dark:bg-white/5' : ''}>
                        <td className={tdCls}>
                          <button className="partner-table-name-button font-bold hover:underline" onClick={() => setSelectedPartnerId(row.storePartnerId)}>{row.partnerName}</button>
                        </td>
                        <td className={tdCls}>{money(row.capitalReturnAmount)}</td>
                        <td className={tdCls}>{money(row.ownerGainAmount)}</td>
                        <td className={tdCls}>{money(row.sharedProfitAmount)}</td>
                        <td className={`${tdCls} font-extrabold`}>{money(row.settlementEntitlementAmount)}</td>
                        <td className={tdCls}>{row.documentsCount.toLocaleString('fa-IR')}</td>
                        <td className={tdCls}>{row.phoneLinesCount.toLocaleString('fa-IR')}</td>
                        <td className={tdCls}>{row.accessoryLinesCount.toLocaleString('fa-IR')}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'accessories' ? (
        <div className="space-y-5">
          <SectionLead
            kicker="ACCESSORIES PERFORMANCE"
            title="تحلیل لوازم منتسب به شریک منتخب"
            description="این نما سهم خرید، فروش، استحقاق تسویه و موجودی فعلی لوازم را برای شریک انتخاب‌شده به‌صورت شفاف و قابل اتکا نشان می‌دهد."
            tone="blue"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <MetricCard title="ارزش خرید ثبت اطلاعات‌شده" value={money(Number(accessoriesData?.summary?.purchasesAttributedAmount || 0))} hint="سهم همین شریک از purchaseهای ثبت اطلاعات‌شده لوازم" />
            <MetricCard title="ارزش فروش منتسب" value={money(Number(accessoriesData?.summary?.salesAttributedAmount || 0))} hint="سهم فروش بر پایه مالکیت همان لوازم" />
            <MetricCard title="اصل پول برگشتی" value={money(Number(accessoriesData?.summary?.capitalReturnAmount || 0))} hint="بهای خرید اولیه منتسب به شریک از ردیف‌های فروخته‌شده" />
            <MetricCard title="جمع استحقاق تسویه" value={money(Number(accessoriesData?.summary?.settlementEntitlementAmount || 0))} hint="اصل پول + سودهای تخصیص‌یافته" />
            <MetricCard title="موجودی فعلی شریک" value={money(Number(accessoriesData?.summary?.currentInventoryValue || 0))} hint="ارزش موجودی لوازم فعلی منتسب به شریک" />
          </div>

          <div className={cardCls}>
            <div className="mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">خریدهای ثبت اطلاعات‌شده لوازم</h3>
              <p className={mutedCls}>اگر خرید قدیمی لوازم داخل purchase ثبت اطلاعات نشده باشد، این بخش طبیعی است که خالی بماند.</p>
            </div>
            <div className="partner-summary-table-shell overflow-x-auto">
              <table className="partner-summary-table min-w-full divide-y divide-black/10 dark:divide-white/10">
                <thead>
                  <tr>
                    <th className={thCls}>سند</th>
                    <th className={thCls}>تاریخ</th>
                    <th className={thCls}>کالا</th>
                    <th className={thCls}>تعداد</th>
                    <th className={thCls}>فی</th>
                    <th className={thCls}>سهم شریک</th>
                    <th className={thCls}>ارزش منتسب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {(accessoriesData?.purchases || []).map((row, index) => (
                    <tr key={`${row.purchaseItemId}-${index}`}>
                      <td className={tdCls}>{row.documentKey}</td>
                      <td className={tdCls}>{formatIsoToShamsi(row.purchaseDate)}</td>
                      <td className={tdCls}>{row.itemName}</td>
                      <td className={tdCls}>{qty(row.attributedQuantity)}</td>
                      <td className={tdCls}>{money(row.unitCost)}</td>
                      <td className={tdCls}>{qty(row.sharePercent)}٪</td>
                      <td className={tdCls}>{money(row.attributedAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cardCls}>
            <div className="mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">فروش‌های ثبت اطلاعات‌شده لوازم</h3>
              <p className={mutedCls}>این جدول از snapshotهای سود مرحله ۵ تغذیه می‌شود و برای هر شریک سود تخصیص‌یافته را جدا نشان می‌دهد.</p>
            </div>
            <div className="partner-summary-table-shell overflow-x-auto">
              <table className="partner-summary-table min-w-full divide-y divide-black/10 dark:divide-white/10">
                <thead>
                  <tr>
                    <th className={thCls}>سند</th>
                    <th className={thCls}>تاریخ</th>
                    <th className={thCls}>شرح</th>
                    <th className={thCls}>فروش منتسب</th>
                    <th className={thCls}>اصل سرمایه قابل بازگشت</th>
                    <th className={thCls}>مازاد قیمت روز</th>
                    <th className={thCls}>سود مشترک</th>
                    <th className={thCls}>جمع استحقاق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {(accessoriesData?.sales || []).map((row, index) => (
                    <tr key={`${row.snapshotId}-${index}`}>
                      <td className={tdCls}>{row.documentKey}</td>
                      <td className={tdCls}>{formatIsoToShamsi(row.saleDate)}</td>
                      <td className={tdCls}>
                        <div className="font-semibold">{row.itemName}</div>
                        <div className={mutedCls}>تعداد: {qty(row.quantity)} | سهم مالکیت: {qty(row.ownershipSharePercent)}٪</div>
                      </td>
                      <td className={tdCls}>{money(row.attributedSaleAmount)}</td>
                      <td className={tdCls}>{money(row.capitalReturnAmount)}</td>
                      <td className={tdCls}>{money(row.ownerGainAmount)}</td>
                      <td className={tdCls}>{money(row.sharedProfitAmount)}</td>
                      <td className={`${tdCls} font-extrabold`}>{money(row.settlementEntitlementAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'phones' ? (
        <div className="space-y-5">
          <SectionLead
            kicker="PHONE PERFORMANCE"
            title="تحلیل مالکیت و فروش گوشی‌های شریک"
            description="از خرید اولیه تا فروش و استحقاق نهایی، تمام اجزای مالی دستگاه‌های منتسب به شریک در این نما کنار هم قرار گرفته‌اند."
            tone="emerald"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-5 gap-4">
            <MetricCard title="ارزش خرید گوشی" value={money(Number(phonesData?.summary?.purchasesAttributedAmount || 0))} hint="سهم خرید گوشی‌های متعلق به شریک" />
            <MetricCard title="ارزش فروش منتسب" value={money(Number(phonesData?.summary?.salesAttributedAmount || 0))} hint="سهم فروش گوشی‌ها بر پایه مالکیت" />
            <MetricCard title="اصل پول برگشتی" value={money(Number(phonesData?.summary?.capitalReturnAmount || 0))} hint="بهای خرید اولیه منتسب به شریک از گوشی‌های فروخته‌شده" />
            <MetricCard title="مازاد قیمت روز" value={money(Number(phonesData?.summary?.ownerGainAmount || 0))} hint="اختلاف خرید اولیه تا خرید روز فروش برای مالک دستگاه" />
            <MetricCard title="جمع استحقاق تسویه" value={money(Number(phonesData?.summary?.settlementEntitlementAmount || 0))} hint="اصل پول + مازاد قیمت روز + سهم سود مشترک" />
          </div>

          <div className={cardCls}>
            <div className="mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">خریدهای ثبت اطلاعات‌شده گوشی</h3>
              <p className={mutedCls}>این بخش از خود جدول دستگاه‌ها و مالکیت فعلی/تخصیص‌یافته آن‌ها خوانده می‌شود.</p>
            </div>
            <div className="partner-summary-table-shell overflow-x-auto">
              <table className="partner-summary-table min-w-full divide-y divide-black/10 dark:divide-white/10">
                <thead>
                  <tr>
                    <th className={thCls}>شناسه</th>
                    <th className={thCls}>تاریخ خرید</th>
                    <th className={thCls}>مدل</th>
                    <th className={thCls}>IMEI</th>
                    <th className={thCls}>قیمت خرید</th>
                    <th className={thCls}>سهم شریک</th>
                    <th className={thCls}>ارزش منتسب</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {(phonesData?.purchases || []).map((row, index) => (
                    <tr key={`${row.phoneId}-${index}`}>
                      <td className={tdCls}>{row.documentKey}</td>
                      <td className={tdCls}>{formatIsoToShamsi(row.purchaseDate)}</td>
                      <td className={tdCls}>{row.model}</td>
                      <td className={`${tdCls} text-left`} dir="ltr">{row.imei}</td>
                      <td className={tdCls}>{money(row.purchasePrice)}</td>
                      <td className={tdCls}>{qty(row.sharePercent)}٪</td>
                      <td className={tdCls}>{money(row.attributedPurchaseAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cardCls}>
            <div className="mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">فروش‌های ثبت اطلاعات‌شده گوشی</h3>
              <p className={mutedCls}>برای هر گوشی، قیمت خرید اولیه، مبنای خرید روز فروش و سهم سود شریک جدا دیده می‌شود.</p>
            </div>
            <div className="partner-summary-table-shell overflow-x-auto">
              <table className="partner-summary-table min-w-full divide-y divide-black/10 dark:divide-white/10">
                <thead>
                  <tr>
                    <th className={thCls}>سند</th>
                    <th className={thCls}>تاریخ</th>
                    <th className={thCls}>مدل / IMEI</th>
                    <th className={thCls}>اصل سرمایه قابل بازگشت</th>
                    <th className={thCls}>خرید اولیه</th>
                    <th className={thCls}>خرید روز فروش</th>
                    <th className={thCls}>فروش منتسب</th>
                    <th className={thCls}>مازاد قیمت روز</th>
                    <th className={thCls}>سود مشترک</th>
                    <th className={thCls}>جمع استحقاق</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {(phonesData?.sales || []).map((row, index) => (
                    <tr key={`${row.snapshotId}-${index}`}>
                      <td className={tdCls}>{row.documentKey}</td>
                      <td className={tdCls}>{formatIsoToShamsi(row.saleDate)}</td>
                      <td className={tdCls}>
                        <div className="font-semibold">{row.model}</div>
                        <div className={mutedCls} dir="ltr">{row.imei}</div>
                      </td>
                      <td className={tdCls}>{money(row.capitalReturnAmount)}</td>
                      <td className={tdCls}>{money(row.initialCostAmount)}</td>
                      <td className={tdCls}>{money(row.marketCostAmount)}</td>
                      <td className={tdCls}>{money(row.attributedSaleAmount)}</td>
                      <td className={tdCls}>{money(row.ownerGainAmount)}</td>
                      <td className={tdCls}>{money(row.sharedProfitAmount)}</td>
                      <td className={`${tdCls} font-extrabold`}>{money(row.settlementEntitlementAmount)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}


      {tab === 'assets' ? (
        <div className="space-y-5">
          <SectionLead
            kicker="CURRENT ASSETS"
            title="استحقاق، سود شناسایی‌شده و دارایی جاری شریک"
            description="این نما ارزش جاری سهم شریک از موجودی و سود شناسایی‌شده را ترکیب می‌کند تا تصویر واقعی‌تری از دارایی قابل اتکای او به دست آید."
            tone="amber"
          />
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4">
            <MetricCard title="جمع استحقاق و موجودی" value={money(currentAssetsSummary.totalCurrentAssets)} hint="ارزش موجودی منتسب + استحقاق ثبت اطلاعات‌شده" />
            <MetricCard title="ارزش موجودی فعلی" value={money(currentAssetsSummary.inventoryValue)} hint="جمع سهم منتسب این شریک از موجودی لوازم و گوشی" />
            <MetricCard title="سود شناسایی‌شده" value={money(currentAssetsSummary.recognizedProfit)} hint="از snapshotهای سود شریک‌محور" />
            <MetricCard title="ترکیب گوشی / لوازم" value={`${money(currentAssetsSummary.phoneInventoryValue)} / ${money(currentAssetsSummary.accessoryInventoryValue)}`} hint="ابتدا گوشی، سپس لوازم" />
          </div>

          <div className="grid grid-cols-1 xl:grid-cols-3 gap-4">
            <div className={cardCls}>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">سود شناسایی‌شده</div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">سود مالکانه</span>
                  <strong className="text-slate-900 dark:text-white">{money(currentAssetsSummary.ownerGainAmount)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">سود مشترک</span>
                  <strong className="text-slate-900 dark:text-white">{money(currentAssetsSummary.sharedProfitAmount)}</strong>
                </div>
                <div className="h-px bg-black/10 dark:bg-white/10" />
                <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
                  <span className="text-slate-700 dark:text-slate-200">جمع سود</span>
                  <strong className="text-slate-900 dark:text-white">{money(currentAssetsSummary.recognizedProfit)}</strong>
                </div>
              </div>
            </div>

            <div className={cardCls}>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">ارزش موجودی فعلی</div>
              <div className="mt-4 space-y-3">
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">گوشی‌های موجود</span>
                  <strong className="text-slate-900 dark:text-white">{money(currentAssetsSummary.phoneInventoryValue)}</strong>
                </div>
                <div className="flex items-center justify-between gap-3 text-sm">
                  <span className="text-slate-500 dark:text-slate-400">لوازم موجود</span>
                  <strong className="text-slate-900 dark:text-white">{money(currentAssetsSummary.accessoryInventoryValue)}</strong>
                </div>
                <div className="h-px bg-black/10 dark:bg-white/10" />
                <div className="flex items-center justify-between gap-3 text-sm font-extrabold">
                  <span className="text-slate-700 dark:text-slate-200">جمع موجودی</span>
                  <strong className="text-slate-900 dark:text-white">{money(currentAssetsSummary.inventoryValue)}</strong>
                </div>
              </div>
            </div>

            <div className={cardCls}>
              <div className="text-xs font-semibold text-slate-600 dark:text-slate-300">جمع‌بندی مدیریتی</div>
              <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/80 p-4 dark:border-emerald-400/20 dark:bg-emerald-500/10">
                <div className="text-xs font-semibold text-emerald-700 dark:text-emerald-300">جمع موجودی منتسب و استحقاق ثبت اطلاعات‌شده</div>
                <div className="mt-2 text-2xl font-extrabold text-emerald-700 dark:text-emerald-200">{money(currentAssetsSummary.totalCurrentAssets)}</div>
                <p className="mt-2 text-xs leading-6 text-emerald-800/90 dark:text-emerald-200/80">
                  این عدد از جمع دو بخش ساخته شده است: ارزش موجودی فعلی منتسب به شریک و سود شناسایی‌شده‌ی همان شریک در بازه انتخابی.
                </p>
              </div>
            </div>
          </div>

          <div className={cardCls}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">منطق محاسبه استحقاق و موجودی</h3>
                <p className={mutedCls}>این نما برای تحلیل سریع مدیریتی است و جایگزین گزارش‌های حسابداری رسمی نیست.</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">مرحله ۱</div>
                <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">ارزش موجودی فعلی</div>
                <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">{money(currentAssetsSummary.inventoryValue)}</div>
              </div>
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-50/80 dark:bg-white/5 p-4">
                <div className="text-xs font-semibold text-slate-500 dark:text-slate-400">مرحله ۲</div>
                <div className="mt-2 text-sm font-bold text-slate-900 dark:text-white">سود شناسایی‌شده</div>
                <div className="mt-2 text-xl font-extrabold text-slate-900 dark:text-white">{money(currentAssetsSummary.recognizedProfit)}</div>
              </div>
              <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-slate-900 text-white dark:bg-white dark:text-slate-900 p-4">
                <div className="text-xs font-semibold opacity-70">نتیجه</div>
                <div className="mt-2 text-sm font-bold">استحقاق و موجودی شریک</div>
                <div className="mt-2 text-xl font-extrabold">{money(currentAssetsSummary.totalCurrentAssets)}</div>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {tab === 'inventory' ? (
        <div className="space-y-5"> 
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4"> 
            <MetricCard title="تعداد گوشی‌های موجود" value={(inventorySummary.phoneCount || 0).toLocaleString('fa-IR')} hint="سهم جاری این شریک از گوشی‌های موجود" />
            <MetricCard title="ارزش موجودی گوشی" value={money(inventorySummary.phoneValue)} hint="بر پایه بهای خرید منتسب به شریک" />
            <MetricCard title="مقدار لوازم موجود" value={qty(inventorySummary.accessoryQty)} hint="مقدار منتسب از موجودی لوازم" />
            <MetricCard title="جمع ارزش موجودی" value={money(inventorySummary.totalValue)} hint="گوشی + لوازم منتسب به شریک" />
          </div>

          <div className={cardCls}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3"> 
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">خلاصه موجودی شریک</h3>
                <p className={mutedCls}>این بخش سهم جاری شریک را از موجودی فعال گوشی و لوازم نمایش می‌دهد.</p>
              </div>
              <div className="flex flex-wrap gap-2 text-xs text-slate-500 dark:text-slate-400"> 
                <span>گوشی: {(inventorySummary.phoneCount || 0).toLocaleString('fa-IR')}</span>
                <span>لوازم: {qty(inventorySummary.accessoryQty)}</span>
                <span>ارزش کل: {money(inventorySummary.totalValue)}</span>
              </div>
            </div>
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4"> 
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-black/10 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className={thCls}>مدل گوشی</th>
                      <th className={thCls}>IMEI</th>
                      <th className={thCls}>وضعیت سرمایه</th>
                      <th className={thCls}>درصد سهم</th>
                      <th className={thCls}>ارزش منتسب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {(phonesData?.currentInventory || []).length ? (phonesData?.currentInventory || []).map((row: any) => (
                      <tr key={`phone-${row.phoneId}`}>
                        <td className={tdCls}>{row.model}</td>
                        <td className={`${tdCls} font-mono text-xs`} dir="ltr">{row.imei || '-'}</td>
                        <td className={tdCls}>{row.status || '-'}</td>
                        <td className={tdCls}>{qty(row.sharePercent)}٪</td>
                        <td className={`${tdCls} font-extrabold`}>{money(row.attributedValue)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className={`${tdCls} text-center text-slate-500 dark:text-slate-400`}>برای این شریک گوشی فعالی در موجودی دیده نشد.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-black/10 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className={thCls}>نام قلم</th>
                      <th className={thCls}>موجودی کل</th>
                      <th className={thCls}>سهم منتسب</th>
                      <th className={thCls}>درصد سهم</th>
                      <th className={thCls}>ارزش منتسب</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {(accessoriesData?.currentInventory || []).length ? (accessoriesData?.currentInventory || []).map((row: any) => (
                      <tr key={`product-${row.productId}`}>
                        <td className={tdCls}>{row.itemName}</td>
                        <td className={tdCls}>{qty(row.stockQuantity)}</td>
                        <td className={tdCls}>{qty(row.attributedQuantity)}</td>
                        <td className={tdCls}>{qty(row.sharePercent)}٪</td>
                        <td className={`${tdCls} font-extrabold`}>{money(row.attributedValue)}</td>
                      </tr>
                    )) : (
                      <tr><td colSpan={5} className={`${tdCls} text-center text-slate-500 dark:text-slate-400`}>برای این شریک لوازم فعالی در موجودی دیده نشد.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      ) : null}


      {tab === 'settlement' ? (
        <div className="space-y-5">
          <SectionLead
            kicker="SETTLEMENT CONTROL"
            title="مرکز کنترل وضعیت سرمایه همکاران و پرونده‌های فروش"
            description="در این نما بازگشت سرمایه همکار از بسته‌شدن پرونده فروش مشتری جدا شده تا مشخص باشد اصل سرمایه برگشته یا فروش/اقساط هنوز باز است."
            tone="emerald"
          />
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-6">
            <MetricCard title="اصل سرمایه قابل بازگشت" value={money(settlementData?.totals?.totalCapitalReturnAmount || 0)} hint="اصل سرمایه منتسب به اقلام فروخته‌شده؛ مستقل از وضعیت اقساط مشتری" />
            <MetricCard title="جمع مازاد قیمت روز" value={money(settlementData?.totals?.totalOwnerGainAmount || 0)} hint="اختلاف خرید اولیه تا مبنای روز فروش برای مالک کالاها" />
            <MetricCard title="جمع سود مشترک" value={money(settlementData?.totals?.totalSharedProfitAmount || 0)} hint="سود عملیاتی قابل تقسیم بین همه شرکا" />
            <MetricCard title="جمع استحقاق تسویه" value={money(settlementData?.totals?.totalSettlementEntitlement || 0)} hint="اصل پول + مازاد قیمت روز + سهم سود مشترک" />
            <MetricCard title="سرمایه برگشتی گوشی‌محور" value={money(settlementData?.totals?.totalPhoneSpecificSettlements || 0)} hint="مبالغی که به هر گوشی وصل شده و اصل سرمایه همکار را کم کرده‌اند" />
            <MetricCard title="پروفایل تقسیم سود" value={settlementData?.profile?.title || 'تقسیم مساوی'} hint="فقط برای بخش سود مشترک استفاده می‌شود" />
          </div>

          <div className={cardCls}>
            <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">کنترل عددی بین گزارش، دفتر و جزئیات شریک</h3>
                <p className={mutedCls}>این کنترل بررسی می‌کند اعداد بازگشت سرمایه همکار در گزارش مرکزی، دفتر همکار و جزئیات همکار هم‌خوان باشند. وضعیت باز/بسته بودن پرونده فروش مشتری در ردیف‌های گوشی‌محور جزئیات همکار دیده می‌شود.</p>
              </div>
              <span className={`inline-flex min-h-9 items-center rounded-2xl border px-3 text-xs font-black ${reconciliationStatusClass}`}>
                {reconciliationStatusLabel}
              </span>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-2xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className={mutedCls}>شرکای کنترل‌شده</div>
                <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">{Number(reconciliation?.checkedPartnersCount || 0).toLocaleString('fa-IR')}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className={mutedCls}>هشدار / خطا</div>
                <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">{Number(reconciliation?.warningCount || 0).toLocaleString('fa-IR')} / {Number(reconciliation?.errorCount || 0).toLocaleString('fa-IR')}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className={mutedCls}>اختلاف تسویه گوشی‌محور</div>
                <div className="mt-2 text-xl font-black text-slate-900 dark:text-white">{money(reconciliation?.phoneLedgerDeltaAmount || 0)}</div>
              </div>
              <div className="rounded-2xl border border-black/10 bg-slate-50/80 p-4 dark:border-white/10 dark:bg-white/5">
                <div className={mutedCls}>گزارش مرکزی / ledger</div>
                <div className="mt-2 text-sm font-black leading-7 text-slate-900 dark:text-white">{money(reconciliation?.phoneLedgerCentralAmount || 0)} / {money(reconciliation?.phoneLedgerRangeAmount || 0)}</div>
              </div>
            </div>
            {primaryReconciliationIssues.length ? (
              <div className="mt-4 grid gap-3 xl:grid-cols-3">
                {primaryReconciliationIssues.map((issue: any, index: number) => (
                  <div key={`partner-reconciliation-action-${issue.code || index}-${index}`} className="rounded-[22px] border border-slate-200 bg-white/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-900/75">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-[11px] font-black tracking-[0.12em] text-slate-400">اقدام پیشنهادی</div>
                        <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{issue.title || issue.code}</div>
                      </div>
                      <span className={`shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-black ${issue.severity === 'error' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200' : 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/30 dark:bg-amber-500/10 dark:text-amber-200'}`}>
                        {issue.severity === 'error' ? 'اولویت بالا' : 'نیازمند بررسی'}
                      </span>
                    </div>
                    <p className="mt-3 text-xs font-bold leading-6 text-slate-600 dark:text-slate-300">{issue.recommendedAction || 'این مورد را از مسیر ثبت‌شده بررسی کن و گزارش را دوباره بازخوانی کن.'}</p>
                    <div className="mt-3 flex flex-wrap items-center justify-between gap-2">
                      <span className="text-[11px] font-black text-slate-400">{issue.affectedArea || 'سیستم شرکا'}</span>
                      {issue.actionPath ? (
                        <Link to={issue.actionPath} className="inline-flex min-h-9 items-center gap-2 rounded-2xl border border-black/10 bg-slate-50 px-3 text-xs font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
                          <i className="fa-solid fa-arrow-left" />
                          {issue.actionLabel || 'رفتن به اصلاح'}
                        </Link>
                      ) : null}
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
            {reconciliationIssues.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-black/10 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className={thCls}>سطح</th>
                      <th className={thCls}>شریک</th>
                      <th className={thCls}>مورد کنترل</th>
                      <th className={thCls}>مورد انتظار</th>
                      <th className={thCls}>مقدار فعلی</th>
                      <th className={thCls}>اختلاف</th>
                      <th className={thCls}>اقدام اصلاحی</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {reconciliationIssues.map((issue: any, index: number) => (
                      <tr key={`partner-reconciliation-issue-${issue.code || index}-${index}`}>
                        <td className={tdCls}>{issue.severity === 'error' ? 'خطا' : issue.severity === 'warning' ? 'هشدار' : 'سالم'}</td>
                        <td className={tdCls}>{issue.partnerName || '—'}</td>
                        <td className={tdCls}>
                          <div className="font-bold text-slate-800 dark:text-slate-100">{issue.title || issue.code}</div>
                          {issue.affectedArea ? <div className="mt-1 text-[11px] font-bold text-slate-400">{issue.affectedArea}</div> : null}
                        </td>
                        <td className={tdCls}>{money(issue.expectedAmount || 0)}</td>
                        <td className={tdCls}>{money(issue.actualAmount || 0)}</td>
                        <td className={`${tdCls} font-extrabold`}>{money(issue.diffAmount || 0)}</td>
                        <td className={tdCls}>
                          <div className="max-w-[280px] text-xs font-bold leading-6 text-slate-600 dark:text-slate-300">{issue.recommendedAction || 'پس از اصلاح داده، گزارش را دوباره بازخوانی کن.'}</div>
                          {issue.actionPath ? (
                            <Link to={issue.actionPath} className="mt-2 inline-flex min-h-8 items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-[11px] font-black text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
                              <i className="fa-solid fa-arrow-left" />
                              {issue.actionLabel || 'اصلاح'}
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <div className="mt-4 rounded-2xl border border-emerald-200/70 bg-emerald-50/70 p-4 text-sm font-bold text-emerald-800 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                کنترل عددی این بازه اختلاف موثری بین گزارش مرکزی، ledger و اتصال PartnerDetail پیدا نکرد.
              </div>
            )}
            {Array.isArray(reconciliation?.checks) && reconciliation.checks.length ? (
              <div className="mt-4 overflow-x-auto">
                <table className="min-w-full divide-y divide-black/10 dark:divide-white/10">
                  <thead>
                    <tr>
                      <th className={thCls}>شریک</th>
                      <th className={thCls}>لینک PartnerDetail</th>
                      <th className={thCls}>گزارش مرکزی</th>
                      <th className={thCls}>ledger</th>
                      <th className={thCls}>مانده گوشی در PartnerDetail</th>
                      <th className={thCls}>وضعیت</th>
                      <th className={thCls}>یادداشت کنترل</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-black/5 dark:divide-white/5">
                    {reconciliation.checks.map((check: any, index: number) => (
                      <tr key={`partner-reconciliation-check-${check.storePartnerId || index}`}>
                        <td className={tdCls}>{check.partnerName}</td>
                        <td className={tdCls}>{Number(check.linkedLegacyPartnersCount || 0) > 0 ? `${Number(check.linkedLegacyPartnersCount || 0).toLocaleString('fa-IR')} لینک` : 'بدون لینک'}</td>
                        <td className={tdCls}>{money(check.rangeCentralPhoneSettlementAmount || 0)}</td>
                        <td className={tdCls}>{money(check.rangeLedgerPhoneSettlementAmount || 0)}</td>
                        <td className={tdCls}>{money(check.partnerDetailLifetime?.phoneSettlementBalance || 0)}</td>
                        <td className={tdCls}>{check.status === 'error' ? 'اختلاف' : check.status === 'warning' ? 'نیازمند بررسی' : 'سالم'}</td>
                        <td className={tdCls}>{Array.isArray(check.notes) && check.notes.length ? check.notes.join('، ') : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : null}
          </div>

          <div className={cardCls}>
            <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">خلاصه مالی، بازگشت سرمایه و وضعیت شرکا</h3>
                <p className={mutedCls}>در این نما برای هر شریک اصل سرمایه، مازاد قیمت روز و سهم سود مشترک جدا نمایش داده می‌شود. مانده بعد از تسویه فقط وضعیت سرمایه همکار را نشان می‌دهد و با بسته‌شدن پرونده اقساط مشتری قاطی نمی‌شود.</p>
              </div>
              <div className="flex items-center gap-2">
                <div className="text-xs text-slate-500 dark:text-slate-400">بازه سود: {fromDateShamsi} تا {toDateShamsi}</div>
                <button onClick={printSettlementSession} className="inline-flex h-10 items-center gap-2 rounded-2xl border border-black/10 bg-white/80 px-4 text-xs font-bold text-slate-700 transition hover:bg-white dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
                  <i className="fa-solid fa-print" /> چاپ صورت‌جلسه
                </button>
              </div>
            </div>
            <div className="partner-summary-table-shell overflow-x-auto">
              <table className="partner-summary-table min-w-full divide-y divide-black/10 dark:divide-white/10">
                <thead>
                  <tr>
                    <th className={thCls}>شریک</th>
                    <th className={thCls}>اصل سرمایه قابل بازگشت</th>
                    <th className={thCls}>مازاد قیمت روز</th>
                    <th className={thCls}>سود مشترک</th>
                    <th className={thCls}>جمع استحقاق</th>
                    <th className={thCls}>موجودی فعلی</th>
                    <th className={thCls}>مانده سرمایه قبل از تسویه</th>
                    <th className={thCls}>پرداختی ثبت اطلاعات‌شده</th>
                    <th className={thCls}>دریافتی ثبت اطلاعات‌شده</th>
                    <th className={thCls}>سرمایه برگشتی گوشی‌محور</th>
                    <th className={thCls}>مانده سرمایه بعد از تسویه</th>
                    <th className={thCls}>وضعیت</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {((settlementData?.settlements || []) as any[]).length ? ((settlementData?.settlements || []) as any[]).map((row: any) => (
                    <tr key={`settlement-${row.storePartnerId}`}>
                      <td className={tdCls}><div className="font-bold">{row.partnerName}</div></td>
                      <td className={tdCls}>{money(row.capitalReturnAmount)}</td>
                      <td className={tdCls}>{money(row.ownerGainAmount)}</td>
                      <td className={tdCls}>{money(row.sharedProfitAmount)}</td>
                      <td className={`${tdCls} font-extrabold`}>{money(row.settlementEntitlement)}</td>
                      <td className={tdCls}>{money(row.inventoryValue)}</td>
                      <td className={tdCls}><span className={`font-extrabold ${Number(row.settlementBalance) > 0 ? 'text-emerald-600 dark:text-emerald-300' : Number(row.settlementBalance) < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'}`}>{money(Math.abs(Number(row.settlementBalance) || 0))}</span></td>
                      <td className={tdCls}>{money(row.paidSettlementAmount || 0)}</td>
                      <td className={tdCls}>{money(row.receivedSettlementAmount || 0)}</td>
                      <td className={tdCls}>
                        <div className="font-bold">{money(row.phoneSpecificSettlementAmount || 0)}</div>
                        {Number(row.phoneSpecificSettlementCount || 0) > 0 ? <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">{Number(row.phoneSpecificSettlementCount || 0).toLocaleString('fa-IR')} پرداخت گوشی‌محور</div> : null}
                      </td>
                      <td className={tdCls}><span className={`font-extrabold ${Number(row.remainingSettlementBalance) > 0 ? 'text-emerald-600 dark:text-emerald-300' : Number(row.remainingSettlementBalance) < 0 ? 'text-rose-600 dark:text-rose-300' : 'text-slate-800 dark:text-slate-100'}`}>{money(Math.abs(Number(row.remainingSettlementBalance) || 0))}</span></td>
                      <td className={tdCls}>{Number(row.remainingSettlementBalance) > 0 ? 'سرمایه در انتظار پرداخت' : Number(row.remainingSettlementBalance) < 0 ? 'پرداخت مازاد/طلب از شریک' : 'سرمایه تسویه‌شده'}</td>
                    </tr>
                  )) : (
                    <tr><td colSpan={12} className={`${tdCls} text-center text-slate-500 dark:text-slate-400`}>برای این بازه داده‌ای برای تسویه شرکا ثبت اطلاعات نشده است.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className={cardCls}>
            <div className="mb-3">
              <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">ثبت اطلاعات عملیات تسویه واقعی</h3>
              <p className={mutedCls}>هر پرداخت بین شرکا یا واریز به صندوق را اینجا ثبت اطلاعات کن تا مانده تسویه به‌روز شود.</p>
            </div>
            <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
              <div>
                <label className={mutedCls}>شریک پرداخت‌کننده</label>
                <select className="ux-input h-11 w-full" value={settlementForm.fromStorePartnerId} onChange={(e) => setSettlementForm((p: any) => ({ ...p, fromStorePartnerId: e.target.value }))}>
                  <option value="">انتخاب شریک</option>
                  {(profitData?.partners || []).map((partner) => <option key={`from-${partner.storePartnerId}`} value={partner.storePartnerId}>{partner.partnerName}</option>)}
                </select>
              </div>
              <div>
                <label className={mutedCls}>مقصد</label>
                <select className="ux-input h-11 w-full" value={settlementForm.destinationKind} onChange={(e) => setSettlementForm((p: any) => ({ ...p, destinationKind: e.target.value, toStorePartnerId: e.target.value === 'partner' ? p.toStorePartnerId : '' }))}>
                  <option value="partner">پرداخت به شریک دیگر</option>
                  <option value="store">واریز به صندوق / مغازه</option>
                </select>
              </div>
              {settlementForm.destinationKind === 'partner' ? <div>
                <label className={mutedCls}>شریک دریافت‌کننده</label>
                <select className="ux-input h-11 w-full" value={settlementForm.toStorePartnerId} onChange={(e) => setSettlementForm((p: any) => ({ ...p, toStorePartnerId: e.target.value }))}>
                  <option value="">انتخاب شریک</option>
                  {(profitData?.partners || []).filter((partner) => String(partner.storePartnerId) !== String(settlementForm.fromStorePartnerId)).map((partner) => <option key={`to-${partner.storePartnerId}`} value={partner.storePartnerId}>{partner.partnerName}</option>)}
                </select>
              </div> : <div>
                <label className={mutedCls}>مقصد ثبت اطلاعات</label>
                <div className="ux-input flex h-11 w-full items-center px-3 text-sm font-semibold text-slate-700 dark:text-slate-200">صندوق / حساب مغازه</div>
              </div>}
              <div>
                <label className={mutedCls}>مبلغ</label>
                <input className="ux-input h-11 w-full" value={settlementForm.amount} onChange={(e) => setSettlementForm((p: any) => ({ ...p, amount: e.target.value }))} inputMode="numeric" placeholder="مثلاً 5000000" />
              </div>
              <div>
                <label className={mutedCls}>تاریخ تسویه</label>
                <input className="ux-input h-11 w-full" value={settlementForm.settlementDate} onChange={(e) => setSettlementForm((p: any) => ({ ...p, settlementDate: e.target.value }))} placeholder="1405/01/31" />
              </div>
              <div>
                <label className={mutedCls}>روش پرداخت</label>
                <input className="ux-input h-11 w-full" value={settlementForm.paymentMethod} onChange={(e) => setSettlementForm((p: any) => ({ ...p, paymentMethod: e.target.value }))} placeholder="کارت / نقد / حواله" />
              </div>
              <div>
                <label className={mutedCls}>شماره پیگیری</label>
                <input className="ux-input h-11 w-full" value={settlementForm.referenceNo} onChange={(e) => setSettlementForm((p: any) => ({ ...p, referenceNo: e.target.value }))} placeholder="اختیاری" />
              </div>
              <div className="md:col-span-2 xl:col-span-4">
                <label className={mutedCls}>یادداشت</label>
                <textarea className="ux-input min-h-[96px] w-full py-3" value={settlementForm.notes} onChange={(e) => setSettlementForm((p: any) => ({ ...p, notes: e.target.value }))} placeholder="توضیح جلسه تسویه، مرجع سند یا توضیح حسابداری" />
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <button onClick={() => void submitSettlement()} disabled={isSavingSettlement} className="inline-flex h-11 items-center gap-2 rounded-2xl bg-primary-600 px-5 font-semibold text-white shadow-sm transition hover:bg-primary-700 disabled:opacity-60">
                <i className={`fa-solid fa-wallet ${isSavingSettlement ? 'fa-fade' : ''}`} />
                ثبت اطلاعات تسویه
              </button>
            </div>
          </div>

          <div className={cardCls}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">تاریخچه ثبت اطلاعات‌های تسویه</h3>
                <p className={mutedCls}>فقط ثبت اطلاعات‌های فعال در این بازه نمایش داده می‌شوند.</p>
              </div>
              <div className="text-xs text-slate-500 dark:text-slate-400">{(settlementTransactions || []).length.toLocaleString('fa-IR')} رکورد</div>
            </div>
            <div className="partner-summary-table-shell overflow-x-auto">
              <table className="partner-summary-table min-w-full divide-y divide-black/10 dark:divide-white/10">
                <thead>
                  <tr>
                    <th className={thCls}>تاریخ</th>
                    <th className={thCls}>از</th>
                    <th className={thCls}>به</th>
                    <th className={thCls}>مبلغ</th>
                    <th className={thCls}>روش</th>
                    <th className={thCls}>پیگیری</th>
                    <th className={thCls}>یادداشت</th>
                    <th className={thCls}>عملیات</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-black/5 dark:divide-white/5">
                  {(settlementTransactions || []).length ? settlementTransactions.map((tx: any) => (
                    <tr key={`settlement-tx-${tx.id}`}>
                      <td className={tdCls}>{formatIsoToShamsi(tx.settlementDate) || tx.settlementDate}</td>
                      <td className={tdCls}>{tx.fromPartnerName}</td>
                      <td className={tdCls}>{tx.destinationKind === 'partner' ? (tx.toPartnerName || 'نامشخص') : 'صندوق / مغازه'}</td>
                      <td className={`${tdCls} font-extrabold`}>{money(tx.amount)}</td>
                      <td className={tdCls}>{tx.paymentMethod || '—'}</td>
                      <td className={tdCls}>{tx.referenceNo || '—'}</td>
                      <td className={tdCls}>{tx.notes || '—'}</td>
                      <td className={tdCls}>
                        <div className="partner-tabs-shell flex flex-wrap items-center gap-2 rounded-[20px] border border-slate-200/80 bg-white/85 p-2 shadow-sm dark:border-slate-800 dark:bg-slate-900/75">
                          <button onClick={() => printSettlementReceipt(tx)} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs font-bold text-slate-700 transition hover:bg-slate-100 dark:border-white/10 dark:bg-white/5 dark:text-slate-100 dark:hover:bg-white/10">
                            <i className="fa-solid fa-receipt" /> رسید
                          </button>
                          <button onClick={() => void cancelSettlement(Number(tx.id))} className="inline-flex items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-700 transition hover:bg-rose-100 dark:border-rose-500/30 dark:bg-rose-500/10 dark:text-rose-200">
                            <i className="fa-solid fa-ban" /> ابطال
                          </button>
                        </div>
                      </td>
                    </tr>
                  )) : (
                    <tr><td colSpan={8} className={`${tdCls} text-center text-slate-500 dark:text-slate-400`}>هنوز هیچ عملیات تسویه‌ای در این بازه ثبت اطلاعات نشده است.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}
    </PageKit>
  );
};

export default PartnerPerformanceReport;
