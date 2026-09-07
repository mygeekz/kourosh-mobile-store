import { DialogActions, Table, TableActionGroup, TextareaField, TextField } from '@/components/ui';
import { ModalTemplateCard, ModalTemplateMetric, ModalTemplateMetricList, ModalTemplateNote, ModalTemplateSectionHeader } from '../components/modals/ModalTemplates';
import { useConfirm } from '../contexts/ConfirmContext';
// pages/InvoiceDetail.tsx
import React, { useEffect, useRef, useState } from "react";
import { Link, useParams, useNavigate, useSearchParams } from "react-router-dom";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";
import moment from "jalali-moment";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import Notification from "../components/Notification";
import Button from "../components/Button";
import { Dialog as Modal } from '@/components/ui';
import type { InvoiceData, InvoiceLineItem, InvoiceSalesReturn, InvoiceSalesReturnItem, NotificationMessage } from "../types";
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
  /* html2canvas splits Persian glyphs when letter-spacing is non-zero.
     Invoice output must always render joined RTL text regardless of global table tracking rules. */
  .inv, .inv *{ letter-spacing:0 !important; font-synthesis:none; }
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
  .inv__title{ font-size:18px; font-weight:900; margin:0; direction:rtl; unicode-bidi:plaintext; word-spacing:4px; }
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
    position:relative; top:-2px;
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
    letter-spacing:0 !important;
    direction:rtl; unicode-bidi:isolate;
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


const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

const getErrorMessage = (error: unknown, fallback: string): string =>
  error instanceof Error && error.message ? error.message : fallback;

const readApiMessage = (payload: unknown): string | undefined =>
  isRecord(payload) && typeof payload.message === 'string' ? payload.message : undefined;

const readApiSuccess = (payload: unknown): boolean | undefined =>
  isRecord(payload) && typeof payload.success === 'boolean' ? payload.success : undefined;

const readApiData = (payload: unknown): unknown =>
  isRecord(payload) ? payload.data : undefined;

const isFiniteNumber = (value: unknown): value is number =>
  typeof value === 'number' && Number.isFinite(value);

const isInvoiceLineItem = (value: unknown): value is InvoiceLineItem =>
  isRecord(value)
  && isFiniteNumber(value.id)
  && typeof value.description === 'string'
  && isFiniteNumber(value.quantity)
  && isFiniteNumber(value.unitPrice)
  && isFiniteNumber(value.discountPerItem)
  && isFiniteNumber(value.totalPrice);

const isInvoiceData = (value: unknown): value is InvoiceData => {
  if (!isRecord(value)) return false;
  const business = value.businessDetails;
  const metadata = value.invoiceMetadata;
  const financial = value.financialSummary;

  return isRecord(business)
    && typeof business.name === 'string'
    && typeof business.addressLine1 === 'string'
    && typeof business.cityStateZip === 'string'
    && (value.customerDetails === null || isRecord(value.customerDetails))
    && isRecord(metadata)
    && typeof metadata.invoiceNumber === 'string'
    && typeof metadata.transactionDate === 'string'
    && isRecord(financial)
    && isFiniteNumber(financial.subtotal)
    && isFiniteNumber(financial.itemsDiscount)
    && isFiniteNumber(financial.globalDiscount)
    && isFiniteNumber(financial.taxableAmount)
    && isFiniteNumber(financial.taxAmount)
    && isFiniteNumber(financial.taxPercentage)
    && isFiniteNumber(financial.grandTotal)
    && Array.isArray(value.lineItems)
    && value.lineItems.every(isInvoiceLineItem);
};

const isInvoiceSalesReturnItem = (value: unknown): value is InvoiceSalesReturnItem =>
  isRecord(value)
  && isFiniteNumber(value.id)
  && isFiniteNumber(value.returnId)
  && typeof value.itemType === 'string'
  && isFiniteNumber(value.itemId)
  && (typeof value.description === 'string' || value.description === null)
  && isFiniteNumber(value.quantity)
  && isFiniteNumber(value.unitPrice)
  && isFiniteNumber(value.lineTotal);

const isInvoiceSalesReturn = (value: unknown): value is InvoiceSalesReturn =>
  isRecord(value)
  && isFiniteNumber(value.id)
  && isFiniteNumber(value.orderId)
  && (isFiniteNumber(value.customerId) || value.customerId === null)
  && typeof value.type === 'string'
  && (typeof value.reason === 'string' || value.reason === null)
  && (typeof value.notes === 'string' || value.notes === null)
  && isFiniteNumber(value.refundAmount)
  && typeof value.createdAt === 'string'
  && (isFiniteNumber(value.createdByUserId) || value.createdByUserId === null)
  && Array.isArray(value.items)
  && value.items.every(isInvoiceSalesReturnItem);

const isInvoiceSalesReturnList = (value: unknown): value is InvoiceSalesReturn[] =>
  Array.isArray(value) && value.every(isInvoiceSalesReturn);

const getInvoiceItemType = (item: InvoiceLineItem): string =>
  item.itemType || item.type || 'inventory';

const getInvoiceItemId = (item: InvoiceLineItem): number =>
  item.itemId ?? item.id;

const getInvoiceItemKey = (item: InvoiceLineItem): string =>
  `${getInvoiceItemType(item)}:${getInvoiceItemId(item)}`;

interface SalesReturnRequestItem {
  itemType: string;
  itemId: number;
  quantity: number;
}

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
  const isLegacySource = searchParams.get('source') === 'legacy';
  const { token } = useAuth();

  const [invoice, setInvoice] = useState<InvoiceData | null>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<NotificationMessage | null>(null);

  const [returns, setReturns] = useState<InvoiceSalesReturn[]>([]);
  const [loadingReturns, setLoadingReturns] = useState(false);
  const [expandedReturnId, setExpandedReturnId] = useState<number | null>(null);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [returnReason, setReturnReason] = useState('');
  const [returnNotes, setReturnNotes] = useState('');
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
        const invoiceEndpoint = isLegacySource ? `/api/invoice-data/${orderId}` : `/api/sales-orders/${orderId}`;
        const res = await apiFetch(invoiceEndpoint);
        const js: unknown = await res.json();
        const invoiceData = readApiData(js);
        if (!res.ok || readApiSuccess(js) !== true || !isInvoiceData(invoiceData)) {
          throw new Error(readApiMessage(js) || "خطا در دریافت فاکتور");
        }
        setInvoice(invoiceData);
        // Legacy cash-sale invoices are read-only; sales-order returns only exist for the newer order flow.
        if (!isLegacySource) {
          try {
            setLoadingReturns(true);
            const rRes = await apiFetch(`/api/sales-orders/${orderId}/returns`);
            const rJs: unknown = await rRes.json();
            const returnData = readApiData(rJs);
            if (rRes.ok && readApiSuccess(rJs) === true && isInvoiceSalesReturnList(returnData)) {
              setReturns(returnData);
            }
          } catch {}
          finally { setLoadingReturns(false); }
        } else {
          setReturns([]);
          setLoadingReturns(false);
        }
      } catch (error: unknown) {
        setNote({ type:"error", text: getErrorMessage(error, "مشکل در دریافت فاکتور") });
      } finally { setLoading(false); }
    })();
  }, [orderId, navigate, isLegacySource]);


const refreshReturns = async () => {
  if (!orderId) return;
  try {
    setLoadingReturns(true);
    const rRes = await apiFetch(`/api/sales-orders/${orderId}/returns`);
    const rJs: unknown = await rRes.json();
    const returnData = readApiData(rJs);
    if (rRes.ok && readApiSuccess(rJs) === true && isInvoiceSalesReturnList(returnData)) {
      setReturns(returnData);
    }
  } catch {}
  finally { setLoadingReturns(false); }
};

const handleCancelInvoice = async () => {
  if (!orderId || !token) return;
  const reasonInput = window.prompt('دلیل ابطال فاکتور را وارد کنید:');
  if (reasonInput == null) return;
  const reason = reasonInput.trim();
  if (!reason) {
    setNote({ type: 'warning', text: 'برای ابطال فاکتور، ثبت دلیل ابطال الزامی است.' });
    return;
  }
  let confirmationToken = '';
  try {
    const prepareRes = await apiFetch(`/api/sales-orders/${orderId}/cancel/prepare`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason, confirmationToken }),
    });
    const prepareJs: any = await prepareRes.json().catch(() => null);
    if (!prepareRes.ok || !prepareJs?.success || !prepareJs?.data?.token) throw new Error(prepareJs?.message || 'پیش‌نمایش اثر مالی ساخته نشد.');
    confirmationToken = String(prepareJs.data.token);
    const ok = await confirmAction({ title: 'تأیید اثر مالی ابطال', description: String(prepareJs.data?.impact?.summaryText || 'آیا از ابطال این فاکتور مطمئن هستید؟'), confirmText: 'تأیید و اجرای ابطال', tone: 'danger', iconClass: 'fa-solid fa-file-circle-xmark' });
    if (!ok) return;
  } catch (error: unknown) {
    setNote({ type: 'error', text: getErrorMessage(error, 'آماده‌سازی ابطال انجام نشد.') });
    return;
  }
  setIsCanceling(true);
  setCancelStageHint('در حال اعتبارسنجی وضعیت فاکتور و امکان ابطال');
  try {
    setCancelStageHint('در حال بازگردانی موجودی و ابطال فاکتور');
    const res = await apiFetch(`/api/sales-orders/${orderId}/cancel`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ reason }),
    });
    const js: unknown = await res.json().catch(() => ({}));
    if (!res.ok || readApiSuccess(js) === false) throw new Error(readApiMessage(js) || 'ابطال انجام نشد.');
    // refetch invoice
    setCancelStageHint('در حال تازه‌سازی اطلاعات فاکتور');
    const r = await apiFetch(`/api/sales-orders/${orderId}`);
    const j2: unknown = await r.json();
    const refreshedInvoice = readApiData(j2);
    if (r.ok && readApiSuccess(j2) === true && isInvoiceData(refreshedInvoice)) {
      setInvoice(refreshedInvoice);
    }
    window.dispatchEvent(new CustomEvent('kourosh:sales-data-changed', {
      detail: { action: 'canceled', orderId },
    }));
    window.dispatchEvent(new CustomEvent('kourosh:header-quick-refresh'));
    setNote({ type: 'success', text: `فاکتور با دلیل «${reason}» با موفقیت باطل شد.` });
  } catch (error: unknown) {
    setNote({ type: 'error', text: getErrorMessage(error, 'ابطال انجام نشد.') });
  } finally {
    setCancelStageHint('بازگردانی موجودی و اصلاح وضعیت فاکتور');
    setIsCanceling(false);
  }
};

const openReturnModal = () => {
  // initialize quantities to 0
  const qty: Record<string, number> = {};
  const items = invoice?.lineItems ?? [];
  for (const it of items) {
    qty[getInvoiceItemKey(it)] = 0;
  }
  setReturnQtyMap(qty);
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
  const items = invoice?.lineItems ?? [];
  const payloadItems: SalesReturnRequestItem[] = [];
  for (const it of items) {
    const itemType = getInvoiceItemType(it);
    const itemId = getInvoiceItemId(it);
    const key = `${itemType}:${itemId}`;
    const q = Number(returnQtyMap[key] || 0);
    if (q > 0) {
      payloadItems.push({ itemType, itemId, quantity: q });
    }
  }
  if (!payloadItems.length) {
    setNote({ type:'warning', text:'حداقل یک آیتم را برای مرجوعی انتخاب کنید.' });
    return;
  }
  if (!returnReason.trim()) {
    setNote({ type:'warning', text:'ثبت دلیل مرجوعی الزامی است.' });
    return;
  }

  setIsSubmittingReturn(true);
  setReturnStageHint('در حال اعتبارسنجی آیتم‌های مرجوعی');
  try {
    setReturnStageHint('در حال ثبت اطلاعات مرجوعی و بازگردانی موجودی');
    const res = await apiFetch(`/api/sales-orders/${orderId}/returns`, {
      method:'POST',
      headers: { 'Content-Type':'application/json', Authorization:`Bearer ${token}` },
      body: JSON.stringify({
        type: 'refund',
        reason: returnReason.trim(),
        notes: returnNotes.trim(),
        items: payloadItems,
      }),
    });
    const js: unknown = await res.json().catch(() => ({}));
    if (!res.ok || readApiSuccess(js) === false) throw new Error(readApiMessage(js) || 'ثبت اطلاعات مرجوعی انجام نشد.');
    setShowReturnModal(false);
    setNote({ type:'success', text:'مرجوعی با موفقیت ثبت شد.' });
    setReturnStageHint('در حال تازه‌سازی سوابق مرجوعی و فاکتور');
    await refreshReturns();
  } catch (error: unknown) {
    setNote({ type:'error', text: getErrorMessage(error, 'ثبت اطلاعات مرجوعی انجام نشد.') });
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
    // Header can stay; thermal CSS shrinks it for the narrow paper width.
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
    let host: HTMLDivElement | null = null;
    try{
      // Wait for the real app font before capture. Persian shaping must be completed by the browser,
      // not reconstructed later by jsPDF.
      // @ts-ignore
      if (document.fonts?.ready) { try { /* @ts-ignore */ await document.fonts.ready; } catch {} }

      const clone = invRef.current.cloneNode(true) as HTMLElement;
      clone.classList.add('inv--pdf-capture');
      host = document.createElement("div");
      host.dir = 'rtl';
      host.style.position="fixed";
      host.style.left="-12000px";
      host.style.top="0";
      host.style.width="794px";
      host.style.background="#fff";
      host.style.direction="rtl";
      const style = document.createElement("style");
      style.innerHTML = BASE_CSS;
      host.appendChild(style);
      host.appendChild(clone);
      document.body.appendChild(host);

      // Let images (logo/QR fallbacks) settle before raster capture.
      await Promise.all(Array.from(clone.querySelectorAll('img')).map((img) => {
        if (img.complete) return Promise.resolve();
        return new Promise<void>((resolve) => {
          const done = () => resolve();
          img.addEventListener('load', done, { once: true });
          img.addEventListener('error', done, { once: true });
        });
      }));
      await new Promise<void>((resolve) => requestAnimationFrame(() => requestAnimationFrame(() => resolve())));

      const canvas = await html2canvas(clone, {
        scale: 2.5,
        useCORS: true,
        backgroundColor:"#ffffff",
        logging:false,
        windowWidth: 794,
        windowHeight: Math.max(clone.scrollHeight, 1123),
        scrollX: 0,
        scrollY: 0,
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

      const x = pageW - margin - wmm;
      const y = margin;

      pdf.addImage(canvas.toDataURL("image/png"), "PNG", x, y, wmm, hmm, undefined, "FAST");
      pdf.save(`faktor-${invoice?.invoiceMetadata?.invoiceNumber}.pdf`);
    }catch(error: unknown){
      setNote({ type:"error", text:getErrorMessage(error, "خطا در تولید PDF") });
    } finally {
      if (host?.parentNode) host.parentNode.removeChild(host);
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">در حال دریافت اطلاعات…</div>;
  if (!invoice) return <div className="p-8 text-center text-red-500">فاکتور یافت نشد.</div>;

  const b = invoice.businessDetails;
  const invoiceLogoUrl = String(b?.logoUrl || '/kourosh-logo.svg');
  const c = invoice.customerDetails;
  const m = invoice.invoiceMetadata;
  const f = invoice.financialSummary;
  const invoicePaymentMethod = String(m.paymentMethod || '').toLowerCase();
  const invoicePaymentLabel = String(m.paymentMethodLabel || '').trim()
    || (invoicePaymentMethod === 'credit' ? 'فروش اعتباری' : invoicePaymentMethod === 'installment' ? 'فروش اقساطی' : 'فروش نقدی');
  const invoicePaymentBadgeClass = invoicePaymentMethod === 'credit'
    ? 'inv__payment-badge inv__payment-badge--credit'
    : invoicePaymentMethod === 'installment'
      ? 'inv__payment-badge inv__payment-badge--installment'
      : 'inv__payment-badge';
  const items = invoice.lineItems;
  const dateFa = toJalali(m.transactionDate);

  const alreadyReturnedQtyByKey = new Map<string, number>();
  for (const salesReturn of returns) {
    for (const returnItem of salesReturn.items || []) {
      const key = `${String(returnItem.itemType || '')}:${Number(returnItem.itemId || 0)}`;
      alreadyReturnedQtyByKey.set(
        key,
        (alreadyReturnedQtyByKey.get(key) || 0) + Math.max(0, Number(returnItem.quantity || 0)),
      );
    }
  }
  const returnableQtyForItem = (item: InvoiceLineItem) => {
    const soldQty = Math.max(0, Number(item.quantity || 0));
    const returnedQty = Math.max(0, alreadyReturnedQtyByKey.get(getInvoiceItemKey(item)) || 0);
    return Math.max(0, soldQty - returnedQty);
  };
  const invoiceItemsNetTotal = items.reduce((sum, item) => {
    const quantity = Math.max(0, Number(item.quantity || 0));
    const fallback = Math.max(0, quantity * Number(item.unitPrice || 0) - Number(item.discountPerItem || 0));
    return sum + Math.max(0, Number(item.totalPrice ?? fallback) || 0);
  }, 0);
  const selectedReturnNetTotal = items.reduce((sum, item) => {
    const soldQty = Math.max(0, Number(item.quantity || 0));
    const requestedQty = Math.max(0, Math.min(returnableQtyForItem(item), Number(returnQtyMap[getInvoiceItemKey(item)] || 0)));
    if (soldQty <= 0 || requestedQty <= 0) return sum;
    const lineNet = Math.max(0, Number(item.totalPrice || 0));
    return sum + (lineNet / soldQty) * requestedQty;
  }, 0);
  const previousRefundAmount = returns.reduce((sum, salesReturn) => sum + Math.max(0, Number(salesReturn.refundAmount || 0)), 0);
  const remainingInvoiceRefund = Math.max(0, Number(f.grandTotal || 0) - previousRefundAmount);
  const returnsAllRemainingItems = items.every((item) => {
    const remainingQty = returnableQtyForItem(item);
    const requestedQty = Math.max(0, Number(returnQtyMap[getInvoiceItemKey(item)] || 0));
    return requestedQty === remainingQty;
  });
  const invoiceAdjustmentRatio = invoiceItemsNetTotal > 0 ? Math.max(0, Number(f.grandTotal || 0)) / invoiceItemsNetTotal : 1;
  const computedRefundAmount = returnsAllRemainingItems
    ? remainingInvoiceRefund
    : Math.min(remainingInvoiceRefund, Math.max(0, Math.round(selectedReturnNetTotal * invoiceAdjustmentRatio)));
  const selectedReturnItemCount = items.filter((item) => Number(returnQtyMap[getInvoiceItemKey(item)] || 0) > 0).length;
  const hasReturnableItems = items.some((item) => returnableQtyForItem(item) > 0);

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

      <Modal
        isOpen={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        title="ثبت مرجوعی فاکتور"
        kicker={`فاکتور #${String(m.invoiceNumber || orderId || '')} · سند اصلی فقط خواندنی`}
        ariaDescription="اقلام مرجوعی را از روی فاکتور ثبت‌شده انتخاب کنید. مبلغ برگشتی به‌صورت خودکار از داده‌های فاکتور محاسبه می‌شود."
        iconClass="fa-solid fa-rotate-left"
        tone="warning"
        variant="expansive"
        widthClass="max-w-6xl"
        hideCloseButton
        closeOnBackdrop={false}
        mobileBehavior="fullscreen"
        bodyClassName="!p-0"
      >
        <div className="flex max-h-[min(82vh,860px)] min-h-0 flex-col" dir="rtl">
          <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4 sm:px-5 lg:px-6">
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
              <div className="space-y-4">
                <ModalTemplateCard className="space-y-4" tone="neutral">
                  <ModalTemplateSectionHeader
                    title="انتخاب اقلام مرجوعی"
                    subtitle="فقط تعداد مرجوعی هر ردیف را مشخص کنید؛ قیمت و مبلغ فاکتور قابل ویرایش نیست."
                    icon={<i className="fa-solid fa-box-open" />}
                    tone="accent"
                  />

                  {!hasReturnableItems ? (
                    <ModalTemplateNote icon={<i className="fa-solid fa-circle-check text-emerald-600" />}>
                      تمام اقلام این فاکتور قبلاً مرجوع شده‌اند و مورد قابل مرجوعی دیگری وجود ندارد.
                    </ModalTemplateNote>
                  ) : (
                    <div className="space-y-2">
                      {items.map((it, index) => {
                        const key = getInvoiceItemKey(it);
                        const soldQty = Math.max(0, Number(it.quantity || 0));
                        const alreadyReturned = Math.max(0, alreadyReturnedQtyByKey.get(key) || 0);
                        const remainingQty = returnableQtyForItem(it);
                        const requestedQty = Math.max(0, Math.min(remainingQty, Number(returnQtyMap[key] || 0)));
                        const selected = requestedQty > 0;
                        return (
                          <div
                            key={key}
                            className={`grid grid-cols-1 gap-3 rounded-2xl border p-3 sm:grid-cols-[minmax(0,1fr)_150px] sm:items-center ${selected ? 'border-amber-300 bg-amber-50/60 dark:border-amber-800 dark:bg-amber-950/20' : 'border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/30'}`}
                          >
                            <div className="min-w-0">
                              <div className="flex min-w-0 items-start gap-3">
                                <span className="grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-slate-100 text-xs font-black text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                                  {(index + 1).toLocaleString('fa-IR')}
                                </span>
                                <div className="min-w-0 flex-1">
                                  <div className="truncate text-sm font-black text-slate-900 dark:text-white" title={it.description}>{it.description}</div>
                                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                    <span>خریداری‌شده: {soldQty.toLocaleString('fa-IR')}</span>
                                    <span>قبلاً مرجوع: {alreadyReturned.toLocaleString('fa-IR')}</span>
                                    <span className={remainingQty > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-slate-400'}>قابل مرجوعی: {remainingQty.toLocaleString('fa-IR')}</span>
                                  </div>
                                </div>
                              </div>
                            </div>
                            <TextField
                              label="تعداد مرجوعی"
                              controlSize="sm"
                              type="number"
                              inputMode="numeric"
                              min={0}
                              max={remainingQty}
                              step={1}
                              disabled={remainingQty <= 0}
                              value={requestedQty}
                              onChange={(event) => {
                                const next = Math.max(0, Math.min(remainingQty, Math.floor(Number(event.target.value || 0))));
                                setReturnQtyMap((current) => ({ ...current, [key]: next }));
                              }}
                              hint={remainingQty > 0 ? `حداکثر ${remainingQty.toLocaleString('fa-IR')} عدد` : 'این ردیف دیگر قابل مرجوعی نیست'}
                              icon={<i className="fa-solid fa-arrow-rotate-left" />}
                            />
                          </div>
                        );
                      })}
                    </div>
                  )}

                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    <TextField
                      label="دلیل مرجوعی"
                      required
                      controlSize="sm"
                      value={returnReason}
                      onChange={(event) => setReturnReason(event.target.value)}
                      preview="مثلاً: مشکل کالا / اشتباه در ثبت اطلاعات"
                      icon={<i className="fa-solid fa-message" />}
                    />
                    <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 dark:border-emerald-900/60 dark:bg-emerald-950/20">
                      <div className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">مبلغ برگشتی محاسبه‌شده</div>
                      <div className="mt-1 text-xl font-black text-emerald-800 dark:text-emerald-200">{fmtMoney(computedRefundAmount)}</div>
                      <div className="mt-1 text-[10px] font-semibold leading-5 text-emerald-700/80 dark:text-emerald-300/80">مبلغ از قیمت ثبت‌شده فاکتور، تخفیف‌ها و مبلغ نهایی محاسبه می‌شود و قابل ویرایش نیست.</div>
                    </div>
                  </div>

                  <TextareaField
                    label="توضیحات"
                    hint="اختیاری · فقط برای توضیح تکمیلی این مرجوعی"
                    value={returnNotes}
                    onChange={(event) => setReturnNotes(event.target.value)}
                    rows={3}
                    maxLength={500}
                    icon={<i className="fa-solid fa-note-sticky" />}
                  />

                  <ModalTemplateNote icon={<i className="fa-solid fa-circle-info text-sky-600" />}>
                    با ثبت مرجوعی، یک سند مستقل به فاکتور متصل می‌شود؛ فاکتور اصلی تغییر نمی‌کند. موجودی اقلام واجد موجودی و دفتر حساب مشتری بر اساس مبلغ محاسبه‌شده به‌روزرسانی می‌شوند.
                  </ModalTemplateNote>
                </ModalTemplateCard>
              </div>

              <div className="space-y-4">
                <ModalTemplateCard className="space-y-4" tone="accent">
                  <ModalTemplateSectionHeader
                    title="مشخصات فاکتور"
                    subtitle="این اطلاعات فقط خواندنی هستند و در فرآیند مرجوعی ویرایش نمی‌شوند."
                    icon={<i className="fa-solid fa-file-invoice" />}
                    tone="accent"
                  />
                  <ModalTemplateMetricList>
                    <ModalTemplateMetric label="شماره فاکتور" value={String(m.invoiceNumber || orderId || '—')} icon={<i className="fa-solid fa-hashtag" />} />
                    <ModalTemplateMetric label="نوع فروش" value={invoicePaymentLabel} icon={<i className="fa-solid fa-wallet" />} />
                    <ModalTemplateMetric label="تاریخ" value={dateFa} icon={<i className="fa-solid fa-calendar-day" />} />
                    <ModalTemplateMetric label="مشتری" value={c?.fullName || 'مهمان'} icon={<i className="fa-solid fa-user" />} />
                    <ModalTemplateMetric label="جمع نهایی فاکتور" value={fmtMoney(f.grandTotal)} icon={<i className="fa-solid fa-coins" />} />
                  </ModalTemplateMetricList>

                  <div className="border-t border-slate-200 pt-3 dark:border-slate-800">
                    <div className="mb-2 text-xs font-black text-slate-700 dark:text-slate-200">اقلام ثبت‌شده فاکتور</div>
                    <div className="max-h-64 space-y-2 overflow-y-auto pe-1">
                      {items.map((it, index) => (
                        <div key={`summary-${getInvoiceItemKey(it)}`} className="flex items-start justify-between gap-3 rounded-xl bg-slate-50 px-3 py-2.5 dark:bg-slate-900/60">
                          <div className="min-w-0">
                            <div className="truncate text-xs font-black text-slate-800 dark:text-slate-100" title={it.description}>{it.description}</div>
                            <div className="mt-1 text-[10px] font-semibold text-slate-500">ردیف {(index + 1).toLocaleString('fa-IR')} · {Number(it.quantity || 0).toLocaleString('fa-IR')} عدد</div>
                          </div>
                          <strong className="shrink-0 text-xs text-slate-700 dark:text-slate-200">{fmtMoney(Number(it.totalPrice || 0))}</strong>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/50">
                    <div className="flex items-center justify-between gap-3 text-xs font-bold text-slate-500">
                      <span>تعداد ردیف انتخاب‌شده</span>
                      <strong className="text-slate-900 dark:text-white">{selectedReturnItemCount.toLocaleString('fa-IR')}</strong>
                    </div>
                    <div className="mt-2 flex items-center justify-between gap-3 text-sm font-black text-slate-700 dark:text-slate-200">
                      <span>جمع مبلغ مرجوعی</span>
                      <strong className="text-amber-700 dark:text-amber-300">{fmtMoney(computedRefundAmount)}</strong>
                    </div>
                  </div>
                </ModalTemplateCard>
              </div>
            </div>
          </div>

          <DialogActions
            onCancel={() => setShowReturnModal(false)}
            cancelText="انصراف"
            cancelIconClass="fa-solid fa-arrow-right"
            submitText="ثبت مرجوعی"
            submittingText="در حال ثبت مرجوعی…"
            isSubmitting={isSubmittingReturn}
            submitDisabled={!hasReturnableItems || selectedReturnItemCount === 0 || !returnReason.trim()}
            submitType="button"
            onSubmitClick={submitReturn}
            submitVariant="warning"
            submitIconClass="fa-solid fa-rotate-left"
            className="shrink-0 border-t border-slate-200 bg-white/95 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/95 sm:px-5 lg:px-6"
            submitButtonProps={{
              loadingHint: returnStageHint,
              loadingStageStep: returnStageProgress,
              loadingStageTotal: 3,
              loadingStageIcon: returnStageIcon,
              successPulseText: 'مرجوعی ثبت شد',
              successPulseHint: 'سوابق مرجوعی و موجودی با موفقیت تازه‌سازی شد',
            }}
          />
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

        {!isLegacySource ? <Button
          type="button"
          onClick={openReturnModal}
          disabled={invoice?.invoiceMetadata?.status === "canceled"}
          variant="warning"
          size="sm"
          leftIcon={<i className="fa-solid fa-rotate-left" />}
        >
          ثبت مرجوعی
        </Button> : null}

        {!isLegacySource ? <Button
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
        </Button> : null}

        {isLegacySource ? (
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-slate-50 px-2.5 py-1.5 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
            <i className="fa-solid fa-clock-rotate-left" aria-hidden="true" />
            فروش نقدی قدیمی · فقط خواندنی
          </span>
        ) : null}

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
              <img
                src={invoiceLogoUrl}
                alt="لوگوی فروشگاه"
                className="inv__logo"
                onError={(event) => {
                  const image = event.currentTarget;
                  if (!image.src.endsWith('/kourosh-logo.svg')) image.src = '/kourosh-logo.svg';
                }}
              />
              <div className="inv__biz-text">
                <div className="inv__title" aria-label="business-name">
                  {String(b.name || "").trim()}
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
                <div className="inv__meta-row inv__meta-row--payment"><span className="inv__meta-k">نوع فروش</span><span className="inv__meta-v"><span className={invoicePaymentBadgeClass}>{invoicePaymentLabel}</span></span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">تاریخ</span><span className="inv__meta-v">{dateFa}</span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">مشتری</span><span className="inv__meta-v">{c?.fullName ?? "مهمان"}</span></div>
                {String(m.status || '').toLowerCase() === 'canceled' ? (
                  <>
                    <div className="inv__meta-row"><span className="inv__meta-k">وضعیت</span><span className="inv__meta-v">باطل شده</span></div>
                    {String(m.cancelReason || '').trim() ? (
                      <div className="inv__meta-row"><span className="inv__meta-k">دلیل ابطال</span><span className="inv__meta-v">{String(m.cancelReason).trim()}</span></div>
                    ) : null}
                  </>
                ) : null}
              </div>

              <div className="inv__qr" aria-label="invoice-qr">
                <div className="inv__qr-label">کد پیگیری</div>
                <QRCodeSVG value={qrValue} size={80} level="M" includeMargin />
                <div className="inv__qr-text">{String(m.invoiceNumber ?? "")}</div>
              </div>
            </div>
          </div>
        </div>

        {String(m.status || '').toLowerCase() === 'canceled' && String(m.cancelReason || '').trim() ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-3 text-sm font-bold leading-7 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-100">
            دلیل ابطال فاکتور: {String(m.cancelReason).trim()}
          </div>
        ) : null}

        <Table className="inv__table">
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
            {items.map((it, idx) => (
              <tr key={it.id ?? `row-${idx}`}>
                <td title={it.description}>
                  <div>{it.description}</div>
                  {getInvoiceCostBasisLabel(it.costBasisSource) ? (
                    <span className="inv__basis-pill no-print">{getInvoiceCostBasisLabel(it.costBasisSource)}</span>
                  ) : null}
                </td>
                <td style={{textAlign:"center"}}>{fmt(it.quantity)}</td>
                <td>{fmt(it.unitPrice)}</td>
                <td>{fmt(it.discountPerItem)}</td>
                <td>{fmt(it.totalPrice)}</td>
              </tr>
            ))}
          </tbody>
        </Table>

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
          <div className="no-print mt-2 text-left"><Link to={`/accounting-drilldown/sale/${invoice.id}`} className="inline-flex items-center gap-1 text-xs font-black text-sky-700 hover:underline"><i className="fa-solid fa-route" /> مسیر رسیدن به مبلغ و سود</Link></div>
        
        </div>

        <div className="mt-6 no-print rounded-2xl border border-primary/10 bg-white dark:bg-black/20 p-4 text-sm shadow-sm">
  <div className="font-bold mb-2 flex items-center justify-between">
    <span>مرجوعی‌ها</span>
    {loadingReturns ? <span className="text-xs text-gray-500">در حال دریافت اطلاعات…</span> : null}
  </div>
  {(!returns || returns.length === 0) ? (
    <div className="text-gray-500 text-xs">مرجوعی ثبت‌شده‌ای وجود ندارد.</div>
  ) : (
    <div className="space-y-2">
      {returns.map((r) => {
        const expanded = expandedReturnId === r.id;
        return (
          <div key={r.id} className="rounded-2xl border border-slate-200 p-3 dark:border-slate-800">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <div className="font-medium">کد مرجوعی: {String(r.id)}</div>
                <div className="mt-1 text-xs text-gray-500">{String(r.createdAt || '')}</div>
              </div>
              <TableActionGroup
                ariaLabel={`عملیات مرجوعی ${r.id}`}
                collapseBelow="sm"
                actions={[
                  {
                    key: `return-details-${r.id}`,
                    kind: "button",
                    label: expanded ? "بستن جزئیات" : "مشاهده جزئیات",
                    tooltip: expanded ? "بستن جزئیات مرجوعی" : "مشاهده جزئیات مرجوعی",
                    variant: "secondary",
                    icon: <i className={`fa-solid ${expanded ? 'fa-chevron-up' : 'fa-chevron-down'}`} />,
                    onClick: () => setExpandedReturnId((prev) => prev === r.id ? null : r.id),
                  },
                ]}
              />
            </div>
            <div className="mt-2 text-xs text-gray-600">مبلغ برگشتی: {fmtMoney(Number(r.refundAmount || 0))}</div>
            {r.reason ? <div className="text-xs text-gray-600">دلیل: {r.reason}</div> : null}
            {expanded && Array.isArray(r.items) && r.items.length ? (
              <ul className="mt-2 space-y-1 border-t border-slate-200 pt-2 text-xs dark:border-slate-800">
                {r.items.map((it) => (
                  <li key={it.id} className="flex items-center justify-between gap-3">
                    <span>{it.description}</span>
                    <strong>{Number(it.quantity || 0).toLocaleString('fa-IR')} عدد</strong>
                  </li>
                ))}
              </ul>
            ) : null}
          </div>
        );
      })}
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
