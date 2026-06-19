// pages/PublicInvoiceDetail.tsx
// Public invoice viewer (for QR code customers). No login required.

import React, { useEffect, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import moment from "jalali-moment";
import html2canvas from "html2canvas";
import jsPDF from "jspdf";

import Notification from "../components/Notification";
import { NotificationMessage } from "../types";
import { apiFetch } from "../utils/apiFetch";
import { printArea } from "../utils/printArea";

/** همان CSS چاپ/پی‌دی‌اف صفحهٔ داخلی؛ برای سازگاری خروجی */
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

const PublicInvoiceDetail: React.FC = () => {
  const { orderId } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState<NotificationMessage | null>(null);
  const invRef = useRef<HTMLDivElement>(null);

  const token = (searchParams.get("t") || "").trim();

  useEffect(() => {
    if (!orderId) {
      navigate("/", { replace: true });
      return;
    }
    (async () => {
      try {
        setLoading(true);
        // token is required for public access
        if (!token) throw new Error("لینک فاکتور ناقص است (توکن وجود ندارد).");
        const res = await apiFetch(`/api/public/sales-orders/${orderId}?t=${encodeURIComponent(token)}`);
        const js = await res.json().catch(() => ({}));
        if (!res.ok || !js?.success) throw new Error(js?.message || "خطا در دریافت فاکتور");
        setInvoice(js.data);
      } catch (e: any) {
        setNote({ type: "error", text: e?.message || "مشکل در دریافت فاکتور" });
      } finally {
        setLoading(false);
      }
    })();
  }, [orderId, token, navigate]);

  const handlePrint = () => {
    if (!invRef.current) return;
    printArea(invRef.current, { extraCss: BASE_CSS, title: `فاکتور ${invoice?.invoiceMetadata?.invoiceNumber ?? ""}` });
  };

  const downloadPdf = async () => {
    if (!invRef.current) return;
    try {
      // Ensure fonts are loaded before html2canvas capture (prevents Persian word-spacing glitches on some systems)
      // @ts-ignore
      if (document.fonts?.ready) { try { /* @ts-ignore */ await document.fonts.ready; } catch {} }

      const host = document.createElement("div");
      host.style.position = "fixed";
      host.style.left = "-10000px";
      host.style.top = "0";
      host.style.background = "white";
      host.style.padding = "0";
      host.style.zIndex = "-1";
      const clone = invRef.current.cloneNode(true) as HTMLElement;
      host.appendChild(clone);
      const style = document.createElement("style");
      style.innerHTML = BASE_CSS;
      host.appendChild(style);
      document.body.appendChild(host);

      const canvas = await html2canvas(clone, { scale: 2, useCORS: true, backgroundColor: "#fff" });
      const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait" });
      const pageW = pdf.internal.pageSize.getWidth();
      const pageH = pdf.internal.pageSize.getHeight();
      const margin = 12;
      const maxW = pageW - margin * 2;
      const ratio = canvas.width / canvas.height;
      const wmm = maxW;
      const hmm = wmm / ratio;
      // اگر ارتفاع خیلی زیاد شد، در همین نسخه ساده یک صفحه اول را می‌گذاریم
      const h2 = Math.min(hmm, pageH - margin * 2);
      pdf.addImage(canvas.toDataURL("image/png"), "PNG", margin, margin, wmm, h2, undefined, "FAST");
      pdf.save(`invoice-${invoice?.invoiceMetadata?.invoiceNumber ?? orderId}.pdf`);
      document.body.removeChild(host);
    } catch {
      setNote({ type: "error", text: "خطا در تولید PDF" });
    }
  };

  if (loading) {
    return <div className="p-8 text-center text-gray-500">در حال دریافت اطلاعات…</div>;
  }

  if (!invoice) {
    return (
      <div className="p-8 text-center" dir="rtl">
        <Notification message={note} onClose={() => setNote(null)} />
        <div className="text-red-600">فاکتور یافت نشد.</div>
      </div>
    );
  }

  const b = invoice.businessDetails || {};
  const c = invoice.customerDetails || {};
  const m = invoice.invoiceMetadata || {};
  const f = invoice.financialSummary || {};
  const items: any[] = invoice.lineItems || [];
  const dateFa = toJalali(m.transactionDate);

  const notesText: string = String(
    invoice?.notes ?? m?.notes ?? invoice?.extraNotes ?? invoice?.description ?? ""
  ).trim();

  return (
    <div className="p-4 md:p-6 space-y-4" dir="rtl">
      <Notification message={note} onClose={() => setNote(null)} />

      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="text-sm text-gray-500">نمایش فاکتور (بدون نیاز به ورود)</div>
        <div className="flex items-center gap-2">
          <button onClick={handlePrint} className="px-3 py-2 rounded-lg bg-gray-900 text-white text-sm">
            چاپ
          </button>
          <button onClick={downloadPdf} className="px-3 py-2 rounded-lg bg-gray-100 text-gray-900 text-sm">
            دانلود PDF
          </button>
        </div>
      </div>

      <div ref={invRef} className="bg-white rounded-2xl shadow-sm border p-4 md:p-6">
        <div className="inv">
          <div className="inv__sheet">
<div className="inv__brandbar" />
          <div className="inv__header">
            <div className="inv__header-inner">
              <div className="inv__biz">
                {b.logoUrl ? <img src={b.logoUrl} alt="logo" className="inv__logo" /> : null}
                <div className="inv__biz-text">
                  <div className="inv__title" aria-label="business-name">
                    {String(b.name || "فروشگاه")
                      .trim()
                      .split(/\s+/)
                      .filter(Boolean)
                      .map((w: string, i: number) => (
                        <span key={`${w}-${i}`} className="inv__word">{w}</span>
                      ))}
                  </div>
                  <div className="inv__addr">
                    {b.addressLine1}{b.addressLine2 ? (<><br/>{b.addressLine2}</>) : null}
                    {b.cityStateZip ? (<><br/>{b.cityStateZip}</>) : null}
                    {b.phone ? (<><br/>تلفن: {b.phone}</>) : null}
                    {b.email ? (<><br/>ایمیل: {b.email}</>) : null}
                  </div>
                </div>
              </div>

              <div className="inv__meta">
                <div className="inv__meta-row"><span className="inv__meta-k">شماره فاکتور</span><span className="inv__meta-v">{m.invoiceNumber}</span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">تاریخ</span><span className="inv__meta-v">{dateFa}</span></div>
                <div className="inv__meta-row"><span className="inv__meta-k">مشتری</span><span className="inv__meta-v">{c?.fullName ?? "مهمان"}</span></div>
              </div>
            </div>
          </div>

          <table className="inv__table">
            <thead>
              <tr>
                <th>شرح</th>
                <th>تعداد</th>
                <th>قیمت واحد</th>
                <th>تخفیف</th>
                <th>مبلغ</th>
              </tr>
            </thead>
            <tbody>
              {items.map((it, idx) => (
                <tr key={it.id ?? idx}>
                  <td title={it.description}>{it.description}</td>
                  <td>{fmt(it.quantity)}</td>
                  <td>{fmt(it.unitPrice)}</td>
                  <td>{fmt(it.discountPerItem || 0)}</td>
                  <td>{fmt(it.totalPrice)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="inv__summary">
            <div className="inv__srow"><span>جمع جزء</span><span>{fmt(f.subtotal)}</span></div>
            <div className="inv__srow"><span>تخفیف اقلام</span><span>{fmt(f.itemsDiscount)}</span></div>
            <div className="inv__srow"><span>تخفیف کلی</span><span>{fmt(f.globalDiscount)}</span></div>
            <div className="inv__srow"><span>مالیات</span><span>{fmt(f.taxAmount)}</span></div>
            <div className="inv__srow inv__srow--total"><span>مبلغ نهایی</span><span>{fmt(f.grandTotal)}</span></div>
          </div>

          {notesText ? (
            <div className="inv__notes">
              <div className="inv__notes-title">توضیحات</div>
              <div className="inv__notes-body">{notesText}</div>
            </div>
          ) : null}
        </div>
      </div>
    </div>
  </div>
  );
};

export default PublicInvoiceDetail;
