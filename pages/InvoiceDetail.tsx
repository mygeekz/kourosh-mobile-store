import { useConfirm } from '../contexts/ConfirmContext';
// pages/InvoiceDetail.tsx
import React, { useEffect, useRef, useState } from "react";
import { useParams, useNavigate, useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import moment from "jalali-moment";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import Notification from "../components/Notification";
import Button from "../components/Button";
import Modal from "../components/Modal";
import { NotificationMessage } from "../types";
import { QRCodeSVG } from "qrcode.react";
import { makeInvoiceQrValue } from "../utils/qr";
import { Search, Save, RefreshCw } from "../components/lucide-react";

// Utility to print small thermal receipts; uses printArea helper
import { printArea } from '../utils/printArea';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
import { APP_MESSAGES, getCostBasisLabel as getSharedCostBasisLabel } from '../shared/messages';

/** CSS واحد برای چاپ و PDF — سایز A4، عرض امن 180mm، جدول fixed و ستون‌بندی درصدی */
const BASE_CSS = `
  @page{ size:A4 portrait; margin:12mm }
  *{ -webkit-print-color-adjust:exact; print-color-adjust:exact; }
  html,body{
    margin:0; padding:0; background:#fff; color:var(--brand-text, #0f172a); direction:rtl;
    font-family:"Vazir",Tahoma,system-ui,-apple-system,"Segoe UI",Roboto,"Helvetica Neue",Arial,"Noto Sans",sans-serif;
    font-size:11px; line-height:1.7;
  }
  .no-print{ display:none !important; }

  .inv{
    box-sizing:border-box;
    width:100%;
    max-width:180mm;
    margin:0 auto;
    padding:0;
  }

  .inv__sheet{
    margin-top:5mm;
    border:1px solid rgba(15,23,42,.08);
    border-radius:18px;
    background:#fff;
    box-shadow:0 20px 48px -42px rgba(15,23,42,.28);
    padding:8mm 8mm 7mm;
    overflow:hidden;
  }

  /* Top brand bar */
  .inv__brandbar{
    height:10mm;
    border-radius:10px;
    background:
      linear-gradient(135deg,
        hsl(var(--primary, 170 70% 35%) / 0.95),
        hsl(var(--primary, 200 80% 45%) / 0.55)
      );
    position:relative;
    overflow:hidden;
  }
  .inv__brandbar:after{
    content:"";
    position:absolute; inset:-20mm;
    background: radial-gradient(circle at 30% 30%, rgba(255,255,255,.22), transparent 55%);
    transform: rotate(12deg);
  }

  .inv__header{
    margin-top:4mm;
    break-inside:avoid; page-break-inside:avoid;
  }
  .inv__header-inner{
    display:grid; grid-template-columns:minmax(0,1fr) auto auto; align-items:flex-start; gap:12px;
    padding:10px 0 0;
  }
  .inv__biz{
    display:flex; gap:10px; align-items:flex-start; min-width:0;
  }
  .inv__logo{
    width:54px; height:54px; border-radius:14px;
    border:1px solid rgba(15,23,42,.12);
    background:#fff;
    object-fit:contain;
  }
  .inv__biz-text{ min-width:0; }
  .inv__title{ font-size:18px; font-weight:900; margin:0; letter-spacing:-.2px; direction:rtl; unicode-bidi:plaintext; }
  /* Spacing that survives html2canvas/PDF capture */
  .inv__word{ display:inline-block; margin-left:4px; }
  .inv__addr{ color:#475569; font-size:10px; line-height:1.55; margin-top:3px; }
  .inv__meta{
    display:flex; flex-direction:column; gap:6px;
    background:linear-gradient(180deg, #f8fafc, #ffffff);
    border:1px solid rgba(15,23,42,.10);
    border-radius:14px;
    padding:10px 12px;
    min-width:62mm;
    box-shadow: inset 0 1px 0 rgba(255,255,255,.72);
  }
  .inv__meta-row{ display:flex; justify-content:space-between; gap:10px; align-items:flex-start; padding-bottom:4px; border-bottom:1px dashed rgba(15,23,42,.08); }
  .inv__meta-row:last-child{ padding-bottom:0; border-bottom:none; }
  .inv__meta-k{ color:#64748b; }
  .inv__meta-v{ font-weight:800; color:#0f172a; }

  .inv__payment-badge{
    display:inline-flex; align-items:center; justify-content:center;
    border-radius:999px; padding:3px 9px;
    font-size:9.5px; font-weight:900; white-space:nowrap;
    border:1px solid #bbf7d0; background:#ecfdf5; color:#047857;
  }
  .inv__payment-badge--credit{ border-color:#fde68a; background:#fffbeb; color:#b45309; }
  .inv__payment-badge--installment{ border-color:#bfdbfe; background:#eff6ff; color:#1d4ed8; }

  .inv__qr{
    width:92px; flex:0 0 auto;
    border:1px solid rgba(15,23,42,.10); border-radius:12px;
    padding:8px; background:#fff;
    display:flex; flex-direction:column; align-items:center; gap:4px;
  }
  .inv__qr-label{ font-size:9px; color:#64748b; }
  .inv__qr-text{ font-size:9px; color:#0f172a; font-weight:800; direction:ltr; unicode-bidi:bidi-override; }

  /* Table */
  .inv__table{
    width:100%; border-collapse:separate; border-spacing:0;
    table-layout:fixed;
    margin-top:12px;
    border:1px solid rgba(15,23,42,.10);
    border-radius:16px;
    overflow:hidden;
    font-variant-numeric: tabular-nums;
    background:#fff;
  }
  .inv__table thead th{
    background:linear-gradient(180deg, #f8fafc, #eef2ff);
    color:#0f172a;
    border-bottom:1px solid rgba(15,23,42,.10);
    padding:10px 9px;
    font-weight:800; text-align:right;
    font-size:10.4px;
  }
  .inv__table tbody td{
    border-bottom:1px solid rgba(15,23,42,.08);
    padding:8px 9px; color:#0f172a; vertical-align:middle;
    overflow:hidden; text-overflow:ellipsis;
  }
  .inv__table tbody tr:nth-child(even){ background:#fbfdff; }
  .inv__table tbody tr:last-child td{ border-bottom:none; }

  .inv__basis-pill{
    display:inline-flex; align-items:center; gap:4px;
    margin-top:4px; padding:2px 7px; border-radius:999px;
    background:#eff6ff; color:#1d4ed8; border:1px solid #bfdbfe;
    font-size:8.8px; font-weight:800; white-space:nowrap;
  }
  .inv__basis-pill:before{ content:"●"; font-size:7px; }

  .inv__table thead th:nth-child(1), .inv__table tbody td:nth-child(1){ width:38%; }
  .inv__table thead th:nth-child(2), .inv__table tbody td:nth-child(2){ width:10%; text-align:center; }
  .inv__table thead th:nth-child(3), .inv__table tbody td:nth-child(3){ width:18%; }
  .inv__table thead th:nth-child(4), .inv__table tbody td:nth-child(4){ width:14%; }
  .inv__table thead th:nth-child(5), .inv__table tbody td:nth-child(5){ width:20%; }

  /* Summary */
  .inv__summary{
    margin-top:10px;
    background:linear-gradient(180deg,#ffffff,#f8fafc);
    border:1px solid rgba(15,23,42,.10);
    border-radius:14px;
    padding:10px 12px;
    break-inside:avoid; page-break-inside:avoid;
  }
  .inv__srow{ display:flex; justify-content:space-between; padding:4px 0; color:#0f172a; }
  .inv__srow span:first-child{ color:#64748b; }
  .inv__srow--total{
    font-weight:900;
    border-top:1px dashed rgba(15,23,42,.20);
    margin-top:6px; padding-top:8px;
    font-size:13px;
  }

  .inv__notes{
    margin-top:8mm;
    background:#ffffff;
    border:1px solid rgba(15,23,42,.10);
    border-radius:14px;
    padding:10px 12px;
    break-inside:avoid; page-break-inside:avoid;
  }
  .inv__notes-title{ font-weight:800; color:#0f172a; margin-bottom:6px; }
  .inv__notes-body{ color:#334155; white-space:pre-wrap; line-height:1.75; }

  .inv__sigs{
    display:flex; justify-content:space-between; gap:16px;
    margin:18mm 0 0;
    font-size:11px;
    break-inside:avoid; page-break-inside:avoid;
  }
  .inv__sig{ width:45%; text-align:center; color:#0f172a; }
  .inv__sig-line{ margin-top:12mm; border-top:1px solid rgba(15,23,42,.65); }

  .inv__footer{
    margin-top:8px;
    padding-top:8px;
    border-top:1px dashed rgba(15,23,42,.12);
    margin-top:10mm;
    color:#64748b;
    font-size:9px;
    text-align:center;
  }

`;

const THERMAL_CSS = BASE_CSS
  .replace(/@page\{[^}]*\}/, '@page{ size:58mm auto; margin:0 }')
  + `
    /* overrides for 58mm receipt */
    #__print_root{ text-align: initial !important; padding-top:0 !important; }
    .inv{ max-width:none !important; width:58mm !important; margin:0 !important; padding:4mm 3mm !important; }
    .inv__header{ grid-template-columns: 1fr !important; gap:3mm !important; }
    .inv__qr{ display:none !important; }
    .inv__meta{ padding:3mm !important; }
    .inv__title{ font-size:12px !important; }
    .inv__table thead{ display:none !important; }
    .inv__table tbody tr{ display:block !important; padding:2mm 0 !important; border-bottom:1px dashed rgba(0,0,0,.18) !important; }
    .inv__table tbody td{ display:block !important; padding:0 !important; border:0 !important; }
    .inv__table tbody td:last-child{ padding-top:1mm !important; }
    .inv__totals{ padding:3mm !important; }
    .inv__totals-row{ font-size:10px !important; }
    .inv__totals-final{ font-size:11px !important; }
  `;

/** تاریخ: ISO یا جلالی ⇢ Date ⇢ jYYYY/jMM/jDD */
const parseToDate = (val?: string | null): Date | null => {
  if (!val) return null;
  if (val.includes("T") || val.includes("-")) {
    const t = Date.parse(val);
    return Number.isNaN(t) ? null : new Date(t);
  }
  const m = moment.from(val, "fa", "jYYYY/jMM/jDD");
  return m.isValid() ? m.toDate() : null;
};
const toJalali = (val?: string | null) => {
  const d = parseToDate(val);
  return d ? moment(d).locale("fa").format("jYYYY/jMM/jDD") : "—";
};
const fmt = (n?: number | null) => (n != null ? n.toLocaleString("fa-IR") : "۰");
const fmtMoney = (n?: number | null) => formatCurrencyText(n ?? 0, readStoredCurrencyUnit());


const getInvoiceCostBasisLabel = (source?: string | null) => {
  const normalized = String(source || '').trim();
  const snake = normalized
    .replace(/([a-z0-9])([A-Z])/g, '$1_$2')
    .replace(/[\s-]+/g, '_')
    .toLowerCase();

  const sharedLabel = getSharedCostBasisLabel(snake);
  if (sharedLabel) return `${APP_MESSAGES.labels.costBasis}: ${sharedLabel}`;

  if (snake === 'current_purchase_price') return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisCurrentPurchasePrice}`;
  if (snake === 'sale_item_buy_price' || snake === 'document_buy_price') return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisSaleItemBuyPrice}`;
  if (snake === 'original_purchase_price' || snake === 'purchase_price') return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisOriginalPurchasePrice}`;
  if (snake === 'product_purchase_price') return `${APP_MESSAGES.labels.costBasis}: ${APP_MESSAGES.labels.costBasisProductPurchasePrice}`;
  return '';
};

const InvoiceDetail: React.FC = () => {
  const confirmAction = useConfirm();
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { token } = useAuth();

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<NotificationMessage | null>(null);

  const [returns, setReturns] = useState<any[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
  const [refundAmount, setRefundAmount] = useState<number>(0);
  const [returnQtyMap, setReturnQtyMap] = useState<Record<string, number>>({});
  const [isSubmittingReturn, setIsSubmittingReturn] = useState(false);
const [cancelStageHint, setCancelStageHint] = useState<string>('بازگردانی موجودی و اصلاح وضعیت فاکتور');
const [returnStageHint, setReturnStageHint] = useState<string>('ثبت اطلاعات مرجوعی و به‌روزرسانی موجودی و مالی');
  const [isCanceling, setIsCanceling] = useState(false);
  const invRef = useRef<HTMLDivElement>(null);
  const didAutoPrint = useRef(false);

  useEffect(() => {
    if (!orderId) { navigate("/invoices"); return; }
    (async () => {
      try {
        setLoading(true);
        const res = await apiFetch(`/api/sales-orders/${orderId}`);
        const js = await res.json();
        if (!res.ok || !js?.success) throw new Error(js?.message || "خطا در دریافت فاکتور");
        setInvoice(js.data);
        // load returns for this invoice
        try {
          setLoadingReturns(true);
          const rRes = await apiFetch(`/api/sales-orders/${orderId}/returns`);
          const rJs = await rRes.json();
          if (rRes.ok && rJs?.success) setReturns(rJs.data || []);
        } catch {}
        finally { setLoadingReturns(false); }
      } catch (e:any) {
        setNote({ type:"error", text: e?.message || "مشکل در دریافت فاکتور" });
      } finally { setLoading(false); }
    })();
  }, [orderId, navigate]);


const refreshReturns = async () => {
  if (!orderId) return;
  try {
    setLoadingReturns(true);
    const rRes = await apiFetch(`/api/sales-orders/${orderId}/returns`);
    const rJs = await rRes.json();
    if (rRes.ok && rJs?.success) setReturns(rJs.data || []);
  } catch {}
  finally { setLoadingReturns(false); }
};

const handleCancelInvoice = async () => {
  if (!orderId || !token) return;
  const reason = window.prompt('دلیل ابطال فاکتور (اختیاری):') || '';
  const ok = await confirmAction({ title: 'ابطال فاکتور', description: 'آیا از ابطال این فاکتور مطمئن هستید؟', confirmText: 'بله، باطل شود', tone: 'danger', iconClass: 'fa-solid fa-file-circle-xmark' });
  if (!ok) return;
  setIsCanceling(true);
  setCancelStageHint('در حال اعتبارسنجی وضعیت فاکتور و امکان ابطال');
  try {
    setCancelStageHint('در حال بازگردانی موجودی و ابطال فاکتور');
    const res = await fetch(`/api/sales-orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    const js = await res.json().catch(() => ({}));
    if (!res.ok || !(js?.success ?? true)) throw new Error(js?.message || 'ابطال انجام نشد.');
    // refetch invoice
    setCancelStageHint('در حال تازه‌سازی اطلاعات فاکتور');
    const r = await apiFetch(`/api/sales-orders/${orderId}`);
    const j2 = await r.json();
    if (r.ok && j2?.success) setInvoice(j2.data);
    setNote({ type: 'success', text: 'فاکتور با موفقیت باطل شد.' });
  } catch (e: any) {
    setNote({ type: 'error', text: e?.message || 'ابطال انجام نشد.' });
  } finally {
    setCancelStageHint('بازگردانی موجودی و اصلاح وضعیت فاکتور');
    setIsCanceling(false);
  }
};

const openReturnModal = () => {
  // initialize quantities to 0
  const qty: Record<string, number> = {};
  const items: any[] = (invoice?.lineItems || []);
  for (const it of items) {
    qty[`${it.itemType || (it as any).type || 'inventory'}:${it.itemId || (it as any).id || it.id}`] = 0;
  }
  setReturnQtyMap(qty);
  setRefundAmount(Number(invoice?.financialSummary?.grandTotal || 0));
  setReturnReason('');
  setReturnNotes('');
  setShowReturnModal(true);
};



const returnStageProgress = (() => {
  if (/اعتبارسنج/i.test(returnStageHint)) return 1;
  if (/ثبت اطلاعات مرجوعی|بازگردانی موجودی/i.test(returnStageHint)) return 2;
  if (/تازه‌سازی|تازه سازی|به‌روزرسانی|به روزرسانی/i.test(returnStageHint)) return 3;
  return 1;
})();

const returnStageIcon = returnStageProgress === 1
  ? <Search className="h-3.5 w-3.5" />
  : returnStageProgress === 2
    ? <Save className="h-3.5 w-3.5" />
    : <RefreshCw className="h-3.5 w-3.5" />;

const cancelStageProgress = (() => {
  if (/اعتبارسنج/i.test(cancelStageHint)) return 1;
  if (/بازگردانی موجودی|ابطال فاکتور/i.test(cancelStageHint)) return 2;
  if (/تازه‌سازی|تازه سازی|اصلاح وضعیت/i.test(cancelStageHint)) return 3;
  return 1;
})();

const cancelStageIcon = cancelStageProgress === 1
  ? <Search className="h-3.5 w-3.5" />
  : cancelStageProgress === 2
    ? <Save className="h-3.5 w-3.5" />
    : <RefreshCw className="h-3.5 w-3.5" />;

const submitReturn = async () => {
  if (!orderId || !token) return;
  const items: any[] = (invoice?.lineItems || []);
  const payloadItems: any[] = [];
  for (const it of items) {
    const itemType = (it as any).itemType || (it as any).type || 'inventory';
    const itemId = (it as any).itemId || (it as any).id;
    const key = `${itemType}:${itemId}`;
    const q = Number(returnQtyMap[key] || 0);
    if (q > 0) {
      payloadItems.push({
        itemType,
        itemId,
        quantity: q,
        description: it.description,
        unitPrice: Number(it.unitPrice || 0),
      });
    }
  }
  if (!payloadItems.length) {
    setNote({ type:'warning', text:'حداقل یک آیتم را برای مرجوعی انتخاب کنید.' });
    return;
  }

  setIsSubmittingReturn(true);
  setReturnStageHint('در حال اعتبارسنجی آیتم‌های مرجوعی');
  try {
    setReturnStageHint('در حال ثبت اطلاعات مرجوعی و بازگردانی موجودی');
    const res = await fetch(`/api/sales-orders/${orderId}/returns`, {
      method:'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({
        type: 'refund',
        reason: returnReason,
        notes: returnNotes,
        refundAmount,
        items: payloadItems,
      }),
    });
    const js = await res.json().catch(() => ({}));
    if (!res.ok || !(js?.success ?? true)) throw new Error(js?.message || 'ثبت اطلاعات مرجوعی انجام نشد.');
    setShowReturnModal(false);
    setNote({ type:'success', text:'مرجوعی ثبت اطلاعات شد.' });
    setReturnStageHint('در حال تازه‌سازی سوابق مرجوعی و فاکتور');
    await refreshReturns();
  } catch (e:any) {
    setNote({ type:'error', text: e?.message || 'ثبت اطلاعات مرجوعی انجام نشد.' });
  } finally {
    setReturnStageHint('ثبت اطلاعات مرجوعی و به‌روزرسانی موجودی و مالی');
    setIsSubmittingReturn(false);
  }
};


  /** چاپ با همان استایل */
  const handlePrint = () => {
    if (!invRef.current || !invoice) return;
    const html = `
      <html lang="fa" dir="rtl">
        <head><meta charSet="utf-8"/><title>چاپ فاکتور</title><style>${BASE_CSS}</style></head>
        <body><div class="inv">${invRef.current.innerHTML}</div>
        <script>window.onload=()=>setTimeout(()=>window.print(),60)</script></body>
      </html>`;
    const w = window.open("", "_blank", "width=900,height=700");
    if (w){ w.document.open(); w.document.write(html); w.document.close(); }
  };

  // Print thermal (58mm) using printArea helper
  const handleThermalPrint = () => {
    // We'll clone the invoice HTML into a temporary div, hide elements that don't fit small width, then print.
    if (!invRef.current || !invoice) return;
    // Create a temporary wrapper containing the invoice content; we reuse printArea which opens a hidden iframe
    const clone = invRef.current.cloneNode(true) as HTMLElement;
    // Remove notes and large headers for thermal print to save space
    const notes = clone.querySelector('.inv__notes');
    if (notes) notes.remove();
    const brandbar = clone.querySelector('.inv__brandbar');
    if (brandbar) brandbar.remove();
    const header = clone.querySelector('.inv__header');
    // header can stay; but we can shrink fonts via extra CSS
    const tmp = document.createElement('div');
    tmp.style.display = 'none';
    tmp.id = 'thermal-print-temp';
    tmp.appendChild(clone);
    document.body.appendChild(tmp);
    // Use printArea with 58mm paper; pass extra CSS to scale down fonts if needed
    printArea('#thermal-print-temp', {
      paper: '58mm',
      title: `رسید ${invoice?.invoiceMetadata?.invoiceNumber || ''}`,
      extraCss: THERMAL_CSS,
    });
    // Clean up temp after slight delay (printArea cleans up iframe, but not the temp wrapper)
    setTimeout(() => {
      try { document.body.removeChild(tmp); } catch {}
    }, 1000);
  };

  // auto print from query params
  useEffect(() => {
    if (!invoice || didAutoPrint.current) return;
    const autoThermal = searchParams.get('autoThermal') === '1';
    const autoPrint = searchParams.get('autoPrint') === '1';
    if (!autoThermal && !autoPrint) return;
    didAutoPrint.current = true;
    setTimeout(() => {
      try {
        if (autoThermal) handleThermalPrint();
        else handlePrint();
      } catch {}
    }, 250);
  }, [invoice, searchParams]);

  /** PDF: کلون با همان CSS + فیتِ A4 بدون بریدگی */
  const handlePDF = async () => {
    if (!invRef.current || !invoice) return;
    try{
      // Ensure webfonts are loaded before we render to canvas (fixes Persian spacing/shaping issues in some browsers)
      // @ts-ignore
      if (document.fonts?.ready) { try { /* @ts-ignore */ await document.fonts.ready; } catch {} }

      const clone = invRef.current.cloneNode(true) as HTMLElement;
      const host = document.createElement("div");
      host.style.position="fixed"; host.style.left="-10000px"; host.style.top="0"; host.style.background="#fff";
      const style = document.createElement("style"); style.innerHTML = BASE_CSS;
      host.appendChild(style); host.appendChild(clone); document.body.appendChild(host);

      const canvas = await html2canvas(clone, {
        scale: 2, useCORS: true, backgroundColor:"#ffffff", logging:false,
        windowWidth: clone.scrollWidth, windowHeight: clone.scrollHeight,
        scrollX: 0, scrollY: 0
      });
      const pdf = new jsPDF({ orientation:"p", unit:"mm", format:"a4", compress:true });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const availW = pageW - margin*2;
      const availH = pageH - margin*2;

      const ratio = Math.min(availW / canvas.width, availH / canvas.height);
      const wmm = canvas.width * ratio;
      const hmm = canvas.height * ratio;

      const x = pageW - margin - wmm;  // چسبیده به راست (RTL)
      const y = margin;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, wmm, hmm, undefined, "FAST");
      pdf.save(`faktor-${invoice?.invoiceMetadata?.invoiceNumber}.pdf`);
      document.body.removeChild(host);
    }catch{
      setNote({ type:"error", text:"خطا در تولید PDF" });
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">در حال دریافت اطلاعات…</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">فاکتور یافت نشد.</div>;

  const b = invoice.businessDetails || {};
  const c = invoice.customerDetails || {};
  const m = invoice.invoiceMetadata || {};
  const f = invoice.financialSummary || {};
  const invoicePaymentMethod = String((m as any).paymentMethod || '').toLowerCase();
  const invoicePaymentLabel = String((m as any).paymentMethodLabel || '').trim()
    || (invoicePaymentMethod === 'credit' ? 'فروش اعتباری' : invoicePaymentMethod === 'installment' ? 'فروش اقساطی' : 'فروش نقدی');
  const invoicePaymentBadgeClass = invoicePaymentMethod === 'credit'
    ? 'inv__payment-badge inv__payment-badge--credit'
    : invoicePaymentMethod === 'installment'
      ? 'inv__payment-badge inv__payment-badge--installment'
      : 'inv__payment-badge';
  const items: any[] = invoice.lineItems || [];
  const dateFa = toJalali(m.transactionDate);

  // توضیحات/یادداشت‌ها با اولویتِ چند فیلد رایج
  const notesText: string = String(
    invoice?.notes ??
    m?.notes ??
    invoice?.extraNotes ??
    invoice?.description ??
    ""
  ).trim();

  // Use an http(s) URL for best compatibility with phone camera scanners (e.g. iOS).
  // Also keep payload short to improve scan reliability on printed receipts.
  const qrValue = makeInvoiceQrValue(String(orderId ?? ""), m.invoiceNumber);

  return (
    <div className="sales-invoice-detail-foundation p-6 space-y-4" dir="rtl" data-ui-sales-page="invoice-detail">
      <Notification message={note} onClose={() => setNote(null)} />

      <Modal isOpen={showReturnModal} onClose={() => setShowReturnModal(false)} title="ثبت اطلاعات مرجوعی">
        <div className="space-y-3 text-sm">
          <div className="text-xs text-gray-500">تعداد مرجوعی را برای هر آیتم وارد کنید. (برای گوشی‌ها معمولاً ۱)</div>
          <div className="max-h-64 overflow-auto border rounded p-2 space-y-2">
            {(invoice?.lineItems || []).map((it: any, idx: number) => {
              const itemType = it.itemType || it.type || "inventory";
              const itemId = it.itemId || it.id;
              const key = `${itemType}:${itemId}`;
              const maxQty = Number(it.quantity || 1);
              return (
                <div key={key} className="flex items-center gap-2">
                  <div className="flex-1">
                    <div className="font-medium">{it.description}</div>
                    <div className="text-xs text-gray-500">حداکثر: {maxQty.toLocaleString("fa-IR")}</div>
                  </div>
                  <input
                    type="number"
                    min={0}
                    max={maxQty}
                    value={returnQtyMap[key] ?? 0}
                    onChange={(e) => {
                      const v = Math.max(0, Math.min(maxQty, Number(e.target.value || 0)));
                      setReturnQtyMap((m) => ({ ...m, [key]: v }));
                    }}
                    className="w-20 border rounded px-2 py-1"
                  />
                </div>
              );
            })}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="md:col-span-2">
              <label className="block text-xs mb-1">دلیل مرجوعی</label>
              <input value={returnReason} onChange={(e) => setReturnReason(e.target.value)} className="w-full border rounded px-2 py-1" preview="مثلاً: مشکل کالا / اشتباه در ثبت اطلاعات" />
            </div>
            <div>
              <label className="block text-xs mb-1">مبلغ برگشتی</label>
              <input type="number" value={refundAmount} onChange={(e) => setRefundAmount(Number(e.target.value || 0))} className="w-full border rounded px-2 py-1" />
            </div>
          </div>
          <div>
            <label className="block text-xs mb-1">توضیحات</label>
            <textarea value={returnNotes} onChange={(e) => setReturnNotes(e.target.value)} className="w-full border rounded px-2 py-1" rows={2} />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" onClick={() => setShowReturnModal(false)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-xmark" />}>انصراف</Button>
            <Button type="button" onClick={submitReturn} disabled={isSubmittingReturn} loading={isSubmittingReturn} loadingText="در حال ثبت اطلاعات…" loadingHint={returnStageHint} loadingStageStep={returnStageProgress} loadingStageTotal={3} loadingStageIcon={returnStageIcon} successPulseText="مرجوعی ثبت اطلاعات شد" successPulseHint="سوابق مرجوعی و موجودی با موفقیت تازه‌سازی شد" variant="warning" size="xs" leftIcon={<i className="fa-solid fa-rotate-left" />}>
              ثبت اطلاعات مرجوعی
            </Button>
          </div>
        </div>
      </Modal>
      <div className="sales-invoice-actions sticky top-[68px] z-10 rounded-2xl border border-primary/10 bg-white/80 dark:bg-black/30 backdrop-blur px-3 py-2.5 flex flex-wrap gap-2 items-center shadow-sm" data-ui-sales-invoice-actions="true">
        <Button
          type="button"
          onClick={() => navigate("/invoices")}
          variant="secondary"
          size="sm"
          leftIcon={<i className="fa-solid fa-arrow-right" />}
        >
          برگشت
        </Button>

        <Button
          type="button"
          onClick={openReturnModal}
          disabled={invoice?.invoiceMetadata?.status === "canceled"}
          variant="warning"
          size="sm"
          leftIcon={<i className="fa-solid fa-rotate-left" />}
        >
          ثبت اطلاعات مرجوعی
        </Button>

        <Button
          type="button"
          onClick={handleCancelInvoice}
          disabled={isCanceling || invoice?.invoiceMetadata?.status === "canceled"}
          loading={isCanceling}
          loadingText="در حال ابطال…"
          loadingHint={cancelStageHint} loadingStageStep={cancelStageProgress} loadingStageTotal={3} loadingStageIcon={cancelStageIcon}
          successPulseText="فاکتور باطل شد"
          successPulseHint="وضعیت فاکتور و موجودی با موفقیت اصلاح شد"
          variant="danger"
          size="sm"
          leftIcon={<i className="fa-solid fa-ban" />}
        >
          {invoice?.invoiceMetadata?.status === "canceled" ? "باطل شده" : "ابطال فاکتور"}
        </Button>

        <div className="flex-1" />

        <Button
          type="button"
          onClick={handlePrint}
          variant="primary"
          size="sm"
          leftIcon={<i className="fa-solid fa-print" />}
        >
          چاپ
        </Button>
        <Button
          type="button"
          onClick={handlePDF}
          variant="primary"
          size="sm"
          leftIcon={<i className="fa-solid fa-file-pdf" />}
        >
          PDF
        </Button>
        <Button
          type="button"
          onClick={handleThermalPrint}
          variant="primary"
          size="sm"
          leftIcon={<i className="fa-solid fa-receipt" />}
        >
          چاپ ۵۸ میلیمتری
        </Button>
      </div>

      <style>{BASE_CSS}</style>

      <div className="inv sales-invoice-document" ref={invRef} data-ui-sales-invoice-document="true">
        <div className="inv__sheet">
<div className="inv__brandbar" />
        <div className="inv__header">
          <div className="inv__header-inner">
            <div className="inv__biz">
              {b.logoUrl ? (
                <img src={b.logoUrl} alt="logo" className="inv__logo" />
              ) : null}
              <div className="inv__biz-text">
                <div className="inv__title" aria-label="business-name">
                  {String(b.name || "")
                    .trim()
                    .split(/\s+/)
                    .filter(Boolean)
                    .map((w: string, i: number) => (
                      <span key={`${w}-${i}`} className="inv__word">{w}</span>
                    ))}
                </div>
                <div className="inv__addr">
                  {b.addressLine1}{b.addressLine2 ? (<><br/>{b.addressLine2}</>) : null}
                  <br/>{b.cityStateZip}
                  {b.phone ? (<><br/>تلفن: {b.phone}</>) : null}
                  {b.email ? (<><br/>ایمیل: {b.email}</>) : null}
                </div>
              </div>
            </div>

            <div style={{ display: "flex", gap: "10px", alignItems: "stretch" }}>
              <div className="inv__meta">
                <div className="inv__meta-row"><span className="inv__meta-k">شماره فاکتور</span><span className="inv__meta-v">{m.invoiceNumber}</span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">نوع فروش</span><span className="inv__meta-v"><span className={invoicePaymentBadgeClass}>{invoicePaymentLabel}</span></span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">تاریخ</span><span className="inv__meta-v">{dateFa}</span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">مشتری</span><span className="inv__meta-v">{c?.fullName ?? "مهمان"}</span></div>
              </div>

              <div className="inv__qr" aria-label="invoice-qr">
                <div className="inv__qr-label">کد پیگیری</div>
                <QRCodeSVG value={qrValue} size={80} level="M" includeMargin />
                <div className="inv__qr-text">{String(m.invoiceNumber ?? "")}</div>
              </div>
            </div>
          </div>
        </div>

        <table className="inv__table">
          <thead>
            <tr>
              <th>شرح کالا/خدمات</th>
              <th>تعداد</th>
              <th>قیمت واحد</th>
              <th>تخفیف</th>
              <th>مبلغ کل</th>
            </tr>
          </thead>
          <tbody>
            {items.map((it:any, idx:number) => (
              <tr key={it.id ?? `row-${idx}`}>
                <td title={it.description}>
                  <div>{it.description}</div>
                  {getInvoiceCostBasisLabel((it as any).costBasisSource) ? (
                    <span className="inv__basis-pill no-print">{getInvoiceCostBasisLabel((it as any).costBasisSource)}</span>
                  ) : null}
                </td>
                <td style={{textAlign:"center"}}>{fmt(it.quantity)}</td>
                <td>{fmt(it.unitPrice)}</td>
                <td>{fmt(it.discountPerItem)}</td>
                <td>{fmt(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </table>

        <div className="inv__summary">
          <div className="inv__srow"><span>جمع کل موارد:</span><span>{fmtMoney(f.subtotal)}</span></div>
          {(f.itemsDiscount>0 || f.globalDiscount>0) && (
            <div className="inv__srow"><span>مجموع تخفیف‌ها:</span><span>({fmt(f.itemsDiscount + f.globalDiscount)}) تومان</span></div>
          )}
          <div className="inv__srow"><span>مبلغ پس از تخفیف:</span><span>{fmtMoney(f.taxableAmount)}</span></div>
          {f.taxAmount>0 && (
            <div className="inv__srow"><span>مالیات ({fmt(f.taxPercentage)}٪):</span><span>{fmtMoney(f.taxAmount)}</span></div>
          )}
          <div className="inv__srow inv__srow--total"><span>مبلغ نهایی:</span><span>{fmtMoney(f.grandTotal)}</span></div>
        
        </div>

        <div className="mt-6 no-print rounded-2xl border border-primary/10 bg-white dark:bg-black/20 p-4 text-sm shadow-sm">
  <div className="font-bold mb-2 flex items-center justify-between">
    <span>مرجوعی‌ها</span>
    {loadingReturns ? <span className="text-xs text-gray-500">در حال دریافت اطلاعات…</span> : null}
  </div>
  {(!returns || returns.length === 0) ? (
    <div className="text-gray-500 text-xs">مرجوعی ثبت اطلاعات نشده است.</div>
  ) : (
    <div className="space-y-2">
      {returns.map((r: any) => (
        <div key={r.id} className="border rounded p-2">
          <div className="flex flex-wrap gap-2 justify-between">
            <div className="font-medium">کد مرجوعی: {String(r.id)}</div>
            <div className="text-xs text-gray-500">{String(r.createdAt || '')}</div>
          </div>
          <div className="text-xs text-gray-600">مبلغ برگشتی: {fmtMoney(Number(r.refundAmount || 0))}</div>
          {r.reason ? <div className="text-xs text-gray-600">دلیل: {r.reason}</div> : null}
          {Array.isArray(r.items) && r.items.length ? (
            <ul className="mt-2 text-xs list-disc pr-5 space-y-1">
              {r.items.map((it: any) => (
                <li key={it.id}>{it.description} × {Number(it.quantity || 0).toLocaleString('fa-IR')}</li>
              ))}
            </ul>
          ) : null}
        </div>
      ))}
    </div>
  )}
</div>

        {notesText && (
          <div className="inv__notes">
            <div className="inv__notes-title">توضیحات</div>
            <div className="inv__notes-body">{notesText}</div>
          </div>
        )}

        <div className="inv__sigs">
          <div className="inv__sig"><div className="inv__sig-line" />فروشنده</div>
          <div className="inv__sig"><div className="inv__sig-line" />خریدار</div>
        </div>
      </div>
    </div>
  </div>
  );
};

export default InvoiceDetail;
