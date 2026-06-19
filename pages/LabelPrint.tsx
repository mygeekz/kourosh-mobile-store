import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { printArea } from '../utils/printArea';
import { apiFetch } from '../utils/apiFetch';

type Product = {
  id: number;
  name: string;
  sellingPrice: number | null;
};

// --- کمک‌تابع‌ها برای گرفتن توکن و ساخت DataURL (مثل نسخه‌ی چاپ تکی) ---
function getAuthHeaders(): Record<string,string> {
  const cand = ([
    localStorage.getItem('authToken'),
    localStorage.getItem('token'),
    sessionStorage.getItem('authToken'),
    sessionStorage.getItem('token'),
  ].find(Boolean)) as string | null;
  const h: Record<string,string> = {};
  if (cand) {
    h['Authorization'] = cand.startsWith('Bearer ') ? cand : 'Bearer ' + cand;
    h['X-Auth-Token'] = cand;
  }
  return h;
}

async function fetchAsDataURL(url: string, withAuth=true): Promise<string|null> {
  try {
    const res = await fetch(url, {
      headers: withAuth ? getAuthHeaders() : undefined,
      credentials: 'include',
    });
    if (!res.ok) return null;
    const blob = await res.blob();
    return await new Promise((resolve) => {
      const r = new FileReader();
      r.onloadend = () => resolve(r.result as string);
      r.readAsDataURL(blob);
    });
  } catch {
    return null;
  }
}
// -----------------------------------------------------------------------

const LabelPrint: React.FC = () => {
  const [searchParams] = useSearchParams();
  const [items, setItems] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);
  const [showName, setShowName] = useState(true);
  const [showPrice, setShowPrice] = useState(true);

  // نقشه‌ی dataURL برای هر محصول: id -> dataUrl
  const [barcodeSrc, setBarcodeSrc] = useState<Record<number, string>>({});
  const [preloadCount, setPreloadCount] = useState(0);

  // خواندن ids از URL
  const ids = useMemo(() => {
    const s = searchParams.get('ids') || '';
    return s
      .split(',')
      .map(x => parseInt(x.trim(), 10))
      .filter(n => Number.isFinite(n) && n > 0);
  }, [searchParams]);

  useEffect(() => {
    const run = async () => {
      try {
        setLoading(true);
        setErr(null);
        setBarcodeSrc({});
        setPreloadCount(0);

        const res = await apiFetch('/api/products');
        const json = await res.json();
        if (!res.ok || !json.success) throw new Error(json.message || 'خطا در دریافت محصولات');

        const all: Product[] = json.data;
        const setIds = new Set(ids);
        const filtered = all.filter(p => setIds.has(p.id));
        setItems(filtered);
      } catch (e: any) {
        console.error(e);
        setErr(e?.message || 'خطا در عملیاتی ناشناخته');
      } finally {
        setLoading(false);
      }
    };
    run();
  }, [ids]);

  // --- پیش‌لود بارکدها به صورت DataURL با سقف هم‌زمانی ---
  useEffect(() => {
    let cancelled = false;
    if (!items.length) return;

    const concurrency = 8; // فشار زیاد به سرور نباشد
    const queue = items.map(p => p.id);
    let idx = 0;
    const next = () => (idx < queue.length ? queue[idx++] : null);

    const worker = async () => {
      for (;;) {
        const id = next();
        if (id == null || cancelled) break;
        const url = `/api/barcode/product/${id}?human=0`;
        // اول با هدر (JWT/Cookie)، اگر نشد بدون هدر
        const du = (await fetchAsDataURL(url, true)) ?? (await fetchAsDataURL(url, false));
        if (cancelled) break;
        setBarcodeSrc(prev => (du ? { ...prev, [id]: du } : prev));
        setPreloadCount(c => c + 1);
      }
    };

    Promise.all(new Array(concurrency).fill(0).map(() => worker())).catch(() => {});
    return () => { cancelled = true; };
  }, [items]);

  const formatPrice = (n: number | null) =>
    (n ?? 0) > 0 ? `${(n ?? 0).toLocaleString('fa-IR')} تومان` : '';

  const doPrint = async () => {
    // پاپ‌آپ را همین الآن باز کن تا بلاک نشود
    const win = window.open('', '_blank', 'width=620,height=820');
    if (!win) { alert('اجازهٔ پاپ‌آپ را فعال کنید.'); return; }

    // اگر هنوز بخشی از بارکدها آماده نیست، مانع چاپ نشویم؛
    // اما به کاربر اطلاع بدهیم (اختیاری)
    const ready = Object.keys(barcodeSrc).length;
    if (ready < items.length) {
      console.warn(`هنوز ${items.length - ready} بارکد dataURL نشده؛ ادامه می‌دهیم و برای بقیه از URL مستقیم استفاده می‌کنیم.`);
    }

    printArea('#print-sheet', {
      paper: '58mm',
      title: `چاپ ${items.length} برچسب`,
      targetWindow: win,
    });
  };

  return (
    <div className="p-4" dir="rtl">
      <div className="print:hidden bg-white dark:bg-gray-800 rounded-xl shadow p-4 mb-4 flex items-center gap-4">
        <h1 className="text-xl font-bold">چاپ برچسب بارکد</h1>

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={showName} onChange={e => setShowName(e.target.checked)} />
          <span>نمایش نام</span>
        </label>

        <label className="inline-flex items-center gap-2">
          <input type="checkbox" checked={showPrice} onChange={e => setShowPrice(e.target.checked)} />
          <span>نمایش قیمت</span>
        </label>

        <button
          onClick={doPrint}
          disabled={loading || !!err || items.length === 0}
          className="ml-auto px-4 py-2 rounded bg-indigo-600 text-white disabled:opacity-60"
          title={items.length ? `آماده: ${preloadCount}/${items.length}` : ''}
        >
          چاپ
        </button>
      </div>

      {loading ? (
        <div className="text-center py-10">در حال دریافت اطلاعات…</div>
      ) : err ? (
        <div className="text-center text-red-600 py-10">خطا در عملیات: {err}</div>
      ) : items.length === 0 ? (
        <div className="text-center py-10">آیتمی برای چاپ پیدا نشد.</div>
      ) : (
        // شیت قابل چاپ
        <div id="print-sheet" className="printable-barcode" style={{ width: '58mm', margin: '0 auto' }}>
          <div className="label-58 text-center">
            {items.map(p => (
              <div key={p.id} className="mb-3 pb-2 border-b">
                <img
                  src={barcodeSrc[p.id] || `/api/barcode/product/${p.id}?human=0`}
                  alt=""
                  className="mx-auto img-barcode"
                />
                {showName && <p className="mt-2 font-semibold text-lg">{p.name}</p>}
                {showPrice && <p className="text-md text-gray-600">{formatPrice(p.sellingPrice)}</p>}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LabelPrint;
