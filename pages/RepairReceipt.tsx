// src/pages/RepairReceipt.tsx
import React, { useEffect, useRef, useState } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import moment from 'jalali-moment';
import { RepairDetailsPageData, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import { apiFetch } from '../utils/apiFetch';
import { useStyle } from '../contexts/StyleContext';
import { QRCodeSVG } from 'qrcode.react';
import { makeRepairQrValue } from '../utils/qr';

/* ---------- helpers ---------- */
const pickMobile = (d: any): string => {
  const c = [
    d?.customer?.phoneNumber, d?.customer?.mobile, d?.customer?.mobileNumber, d?.customer?.tel,
    d?.repair?.customerPhoneNumber, d?.repair?.customerPhone, d?.repair?.customer_phone,
    d?.repair?.customerMobile, d?.repair?.customer_mobile, d?.customerPhoneNumber,
    d?.customer_phone, d?.phoneNumber, d?.mobile,
  ];
  return (c.find(Boolean) as string) || '---';
};
const toRial = (n?: number | null) => (n != null ? n.toLocaleString('fa-IR') + ' تومان' : '---');
const ltr = (s: string | number | null | undefined) =>
  s == null || s === '' ? '---' : `<span style="direction:ltr;unicode-bidi:bidi-override">${String(s)}</span>`;

/* ---------- PRINT CSS: عین اسکرین‌شات ---------- */
const makePrintCss = (brandHsl: string) => `
@page { size: A5; margin: 0; }
html, body { background:#f3f4f6; color:#111; font-family:'Vazir', sans-serif; direction:rtl; margin:0; padding:0; }
* { box-sizing:border-box; }

.wrapper { margin: 8mm; }
.card {
  background:#fff; border:1px solid #e5e7eb; border-radius:16px;
  padding:12mm 10mm; box-shadow:0 2px 8px rgba(0,0,0,.05);
}

/* Header */
.header { display:flex; align-items:center; justify-content:space-between; margin-bottom:10px; }
.badge-print {
  width:38px; height:38px; border-radius:10px; background:#f1f5f9;
  display:grid; place-items:center; color:#64748b; font-size:16px;
}
.qrbox{
  width:78px;
  border:1px solid #e5e7eb; border-radius:12px; background:#fff;
  padding:6px;
  display:flex; flex-direction:column; align-items:center; gap:4px;
}
.qrbox .qr-cap{ font-size:9px; color:#6b7280; }
.qrbox .qr-txt{ font-size:9px; color:#111827; font-weight:700; direction:ltr; unicode-bidi:bidi-override; }
.title { text-align:center; }
.title h1 { margin:0 0 4px; font-size:20px; font-weight:800; color:${brandHsl}; }
.title p { margin:0; font-size:12px; color:#4b5563; }

/* Meta chips */
.meta { display:flex; justify-content:space-between; align-items:center; margin:12px 0 14px; }
.chip { background:#eef2f7; color:#111; border-radius:999px; padding:6px 12px; font-size:12px; }
.chip b { font-weight:700; }
.chip-muted { background:#eef2f7; }

/* Table */
.box { border:1px solid #e5e7eb; border-radius:12px; overflow:hidden; }
table { width:100%; border-collapse:collapse; font-size:12px; }
thead th {
  background:#f5f6f8; padding:9px 10px; text-align:right; font-weight:700; color:#374151;
}
tbody td { padding:9px 10px; border-top:1px solid #eceff3; vertical-align:top; }
tbody tr { background:#fff; }

/* Divider */
.hr { height:1px; background:#e5e7eb; margin:16px 0; }

/* Terms (3 bullets with red icons) */
.terms { margin-top:8px; margin-bottom:16px; }
.term { display:flex; gap:8px; align-items:flex-start; font-size:11px; color:#4b5563; line-height:1.9; }
.term .icon {
  display:inline-block; width:14px; text-align:center;
  color:#ef4444; /* قرمز مطابق اسکرین‌شات */
  margin-top:2px;
}

/* Sign lines */
.sigs { display:flex; justify-content:space-between; gap:16px; margin-top:18px; font-size:11px; color:#374151; }
.sig { width:48%; text-align:center; }
.sig .line { margin-top:18mm; border-top:1px solid #111; }
`;

const RepairReceipt: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { style } = useStyle();

  const brand = `hsl(${style.primaryHue} 90% 55%)`;

  const repairId = String(id || '').trim();

  const cardRef = useRef<HTMLDivElement>(null);
  const [data, setData] = useState<RepairDetailsPageData | null>(null);
  const [mobile, setMobile] = useState<string>('---');
  const [loading, setLoading] = useState(true);
  const [notif, setNotif] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    (async () => {
      try {
        if (!repairId) throw new Error('شناسه تعمیر معتبر نیست.');
        const res = await apiFetch(`/api/repairs/${repairId}`);
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت اطلاعات');
        setData(json.data);

        let m = pickMobile(json.data);
        if (m === '---' && json.data.repair?.customerId) {
          const cr = await apiFetch(`/api/customers/${json.data.repair.customerId}`);
          const cj = await cr.json();
          if (cr.ok && cj.success) m = pickMobile({ customer: cj.data });
        }
        setMobile(m);
      } catch (e: any) {
        setNotif({ type: 'error', text: e.message || 'خطا در عملیاتی ارتباط با سرور' });
      } finally {
        setLoading(false);
      }
    })();
  }, [repairId]);

  // auto print from ?autoPrint=1
  useEffect(() => {
    if (searchParams.get('autoPrint') === '1' && data) {
      setTimeout(handlePrint, 400);
    }
  }, [searchParams, data]);

  const handlePrint = () => {
    if (!cardRef.current) return;
    const html = `<div class="wrapper"><div class="card">${cardRef.current.innerHTML}</div></div>`;
    const win = window.open('', '_blank', 'width=900,height=700');
    if (!win) { alert('اجازه باز شدن پنجره چاپ را بدهید.'); return; }
    win.document.open();
    win.document.write(`
      <!doctype html><html dir="rtl"><head>
        <meta charset="utf-8" />
        <title>رسید پذیرش تعمیر ${id}</title>
        <style>${makePrintCss(brand)}</style>
      </head><body>${html}</body></html>
    `);
    win.document.close();
    const finalize = () => { try { win.focus(); win.print(); } finally { win.close(); } };
    setTimeout(finalize, 260);
    // @ts-ignore
    if (win.onload === null) win.onload = finalize;
  };

  if (loading) return <div data-ui-repair-page="receipt" data-ui-repair-scope="receipt" className="repair-workflow-foundation p-6 text-gray-600 dark:text-gray-300">در حال دریافت اطلاعات…</div>;
  if (!data) return <div className="p-6 text-red-600 dark:text-red-400">اطلاعاتی یافت نشد.</div>;

  const { repair, customer, storeName, storeAddress, storePhone } = data;
  const customerName = customer?.fullName ?? repair.customerFullName ?? '---';
  const shamsiDate = repair?.dateReceived
    ? moment(repair.dateReceived).locale('fa').format('YYYY/MM/DD HH:mm')
    : '---';

  // Use an http(s) URL for best compatibility with phone camera scanners (e.g. iOS).
  const qrValue = makeRepairQrValue(String(repair.id ?? ''));

  return (
    <div className="repair-workflow-foundation p-4" dir="rtl" data-ui-repair-page="receipt" data-ui-repair-scope="receipt">
      {notif && <Notification message={notif} onClose={() => setNotif(null)} />}

      {/* actions (screen only) */}
      <div className="flex gap-2 mb-4 print:hidden" data-ui-repair-receipt-actions="true">
        <button
          onClick={handlePrint}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg text-white font-semibold shadow-sm hover:opacity-90"
          style={{ backgroundColor: brand }}
        >
          <i className="fa-solid fa-print" />
          چاپ
        </button>
        <button
          onClick={() => navigate(-1)}
          className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-gray-600 text-white hover:bg-gray-700"
        >
          <i className="fa-solid fa-arrow-right" />
          بازگشت
        </button>
      </div>

      {/* screen preview — 1:1 با چاپ */}
      <div
        ref={cardRef}
        className="bg-white border border-gray-200 rounded-2xl shadow p-6 max-w-3xl mx-auto" data-ui-repair-receipt="true"
      >
        {/* header */}
        <div className="flex items-center justify-between mb-2">
          <div className="qrbox" aria-label="repair-qr">
            <div className="qr-cap">کد پیگیری</div>
            <QRCodeSVG value={qrValue} size={62} level="M" includeMargin />
            <div className="qr-txt">{String(repair.id ?? '')}</div>
          </div>
          <div className="title text-center">
            <h1 style={{ color: brand }} className="text-[20px] font-extrabold">فروشگاه موبایل کوروش</h1>
            <p className="text-xs text-gray-600">
              {storeAddress || 'تهران، خیابان مثال ۱۲'} | تلفن: {storePhone || '۰۹۱۲۳۴۵۶۷۸۹'}
            </p>
          </div>
          <div className="badge-print">
            <i className="fa-solid fa-print" />
          </div>
        </div>

        {/* meta chips */}
        <div className="meta">
          <div className="chip"><span className="text-gray-600">تاریخ پذیرش:</span> <b>{shamsiDate}</b></div>
          <div className="chip"><span className="text-gray-600">شماره رسید:</span> <b>{repair.id}</b></div>
        </div>

        {/* table */}
        <div className="box">
          <table>
            <thead>
              <tr>
                <th>شرح</th>
                <th>مقدار / توضیحات</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['نام مشتری', customerName],
                ['موبایل', pickMobile(data)],
                ['مدل دستگاه', repair.deviceModel || '---'],
                ['رنگ', repair.deviceColor || '---'],
                ['سریال / IMEI', repair.serialNumber ? repair.serialNumber : '---'],
                ['شرح مشکل', repair.problemDescription || '---'],
                ['هزینه تخمینی', toRial(repair.estimatedCost)],
              ].map(([k, v]) => (
                <tr key={k as string}>
                  <td style={{ fontWeight: 600 }}>{k}</td>
                  <td
                    dangerouslySetInnerHTML={{
                      __html:
                        k === 'سریال / IMEI'
                          ? ltr(v as string)
                          : (v as string) || '---',
                    }}
                  />
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        <div className="hr" />

        {/* terms with red exclamation icons */}
        <div className="terms">
          <div className="term">
            <span className="icon"><i className="fa-solid fa-circle-exclamation"></i></span>
            <span>دستگاه پس از ۳۰ روز از اعلام آماده بودن، مشمول هزینه انبارداری می‌شود.</span>
          </div>
          <div className="term">
            <span className="icon"><i className="fa-solid fa-circle-exclamation"></i></span>
            <span>مسئولیت اطلاعات داخل دستگاه با مشتری است؛ لطفاً از اطلاعات خود پشتیبان تهیه کنید.</span>
          </div>
          <div className="term">
            <span className="icon"><i className="fa-solid fa-circle-exclamation"></i></span>
            <span>قطعات مصرفی و هزینهٔ نهایی پس از بررسی و ادامه تکنسین مشخص می‌گردد.</span>
          </div>
        </div>

        {/* signatures */}
        <div className="sigs">
          <div className="sig">
            <div className="line" />
            امضای مشتری
          </div>
          <div className="sig">
            <div className="line" />
            امضای دریافت‌کننده
          </div>
        </div>
      </div>
    </div>
  );
};

export default RepairReceipt;
