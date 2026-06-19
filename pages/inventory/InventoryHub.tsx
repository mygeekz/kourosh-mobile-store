import React, { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import PageShell from '../../components/ui/PageShell';
import Button from '../../components/Button';
import Notification from '../../components/Notification';
import { NotificationMessage, Product } from '../../types';
import { apiFetch } from '../../utils/apiFetch';
import { useAuth } from '../../contexts/AuthContext';
import { getAuthHeaders } from '../../utils/apiUtils';

import ProductsManager from './ProductsManager';
import Purchases from '../Purchases';
import StockCounts from '../StockCounts';

// ---- Tabs ----
const TABS = [
  { id: 'products', label: 'کالاها', icon: 'fa-solid fa-cube' },
  { id: 'purchases', label: 'رسید خرید', icon: 'fa-solid fa-truck-ramp-box' },
  { id: 'adjust', label: 'اصلاح موجودی', icon: 'fa-solid fa-sliders' },
  { id: 'counts', label: 'انبارگردانی', icon: 'fa-solid fa-clipboard-list' },
  { id: 'alerts', label: 'هشدار کمبود', icon: 'fa-solid fa-triangle-exclamation' },
] as const;

type TabId = typeof TABS[number]['id'];

function TabPills({ value, onChange }: { value: TabId; onChange: (v: TabId) => void }) {
  return (
    <div className="premium-tab-pills" dir="rtl">
      {TABS.map((t) => (
        <Button
          type="button"
          key={t.id}
          onClick={() => onChange(t.id)}
          variant={value === t.id ? 'primary' : 'secondary'}
          size="sm"
          className={`premium-tab-pill ${value === t.id ? 'is-active' : ''}`}
          leftIcon={<i className={t.icon} />}
        >
          {t.label}
        </Button>
      ))}
    </div>
  );
}

// ---- Alerts Panel ----
function InventoryAlertsPanel({ onNavigateProducts }: { onNavigateProducts: () => void }) {
  const { token } = useAuth();
  const [note, setNote] = useState<NotificationMessage | null>(null);
  const [loading, setLoading] = useState(true);
  const [alerts, setAlerts] = useState<Array<{ productId: number; quantity: number; threshold: number }>>([]);
  const [products, setProducts] = useState<Product[]>([]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [aRes, pRes] = await Promise.all([apiFetch('/inventory/alerts'), apiFetch('/api/products')]);
      const aJs = await aRes.json();
      const pJs = await pRes.json();
      if (aRes.ok) setAlerts(Array.isArray(aJs) ? aJs : []);
      if (pRes.ok && pJs?.success) setProducts(pJs.data || []);
    } catch (e: any) {
      setNote({ type: 'error', text: e?.message || 'خطا در دریافت هشدارها' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  const nameById = useMemo(() => {
    const m = new Map<number, string>();
    for (const p of products) m.set(p.id, p.name);
    return m;
  }, [products]);

  const rows = useMemo(() => {
    return alerts
      .map((a) => ({
        ...a,
        name: nameById.get(Number(a.productId)) || `#${a.productId}`,
        shortage: Math.max(0, Number(a.threshold || 0) - Number(a.quantity || 0)),
      }))
      .sort((x, y) => (y.shortage - x.shortage) || (x.name.localeCompare(y.name)));
  }, [alerts, nameById]);

  return (
    <div className="inventory-shell-modern" dir="rtl">
      <Notification message={note} onClose={() => setNote(null)} />

      <div className="app-card inventory-card-premium p-4 md:p-6">
        <div className="premium-section-header">
          <div className="font-black text-gray-900 dark:text-gray-100">هشدار کمبود موجودی</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">کالاهایی که موجودی‌شان ≤ آستانه ثبت اطلاعات‌شده است</div>
          <div className="flex-1" />
          <Button onClick={load} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-rotate" />}>به‌روزرسانی</Button>
          <Button onClick={onNavigateProducts} variant="primary" size="sm" leftIcon={<i className="fa-solid fa-box-open" />}>رفتن به کالاها</Button>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">در حال دریافت اطلاعات…</div>
        ) : rows.length === 0 ? (
          <div className="premium-no-result mt-4 text-sm text-emerald-700 dark:text-emerald-300">فعلاً هشدار کمبود نداریم ✅</div>
        ) : (
          <div className="mt-4 overflow-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-right border-b border-gray-200/70 dark:border-white/10">
                  <th className="py-2">کالا</th>
                  <th className="py-2">موجودی</th>
                  <th className="py-2">آستانه</th>
                  <th className="py-2">کمبود</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.productId} className="border-b border-gray-200/50 dark:border-white/5">
                    <td className="py-2 font-semibold">{r.name}</td>
                    <td className="py-2">{Number(r.quantity || 0).toLocaleString('fa-IR')}</td>
                    <td className="py-2">{Number(r.threshold || 0).toLocaleString('fa-IR')}</td>
                    <td className="py-2 text-rose-700 dark:text-rose-300">{Number(r.shortage || 0).toLocaleString('fa-IR')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

// ---- Adjust Stock Panel ----
function StockAdjustPanel() {
  const { token } = useAuth();
  const [note, setNote] = useState<NotificationMessage | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [productId, setProductId] = useState<number | ''>('');
  const [delta, setDelta] = useState<number>(0);
  const [reason, setReason] = useState<string>('');
  const [notes, setNotes] = useState<string>('');
  const [submitting, setSubmitting] = useState(false);

  const headers = useMemo(() => (token ? getAuthHeaders(token) : {}), [token]);

  useEffect(() => {
    if (!token) return;
    (async () => {
      setLoading(true);
      try {
        const res = await apiFetch('/api/products');
        const js = await res.json();
        if (!res.ok || !js?.success) throw new Error(js?.message || 'خطا در دریافت کالاها');
        setProducts(js.data || []);
      } catch (e: any) {
        setNote({ type: 'error', text: e?.message || 'خطا در عملیات' });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const selected = useMemo(() => products.find((p) => p.id === Number(productId)), [products, productId]);

  const submit = async () => {
    if (!token) return;
    if (!productId) {
      setNote({ type: 'warning', text: 'کالا را انتخاب کنید.' });
      return;
    }
    if (!Number.isFinite(delta) || Number(delta) === 0) {
      setNote({ type: 'warning', text: 'مقدار تغییر (delta) نمی‌تواند صفر باشد.' });
      return;
    }

    setSubmitting(true);
    try {
      const res = await fetch(`/api/products/${Number(productId)}/adjust-stock`, {
        method: 'POST',
        headers: { ...headers, 'Content-Type': 'application/json' },
        body: JSON.stringify({ delta: Number(delta), reason: reason || null, notes: notes || null }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || !js?.success) throw new Error(js?.message || 'اصلاح موجودی انجام نشد.');
      setNote({ type: 'success', text: 'اصلاح موجودی ثبت اطلاعات شد.' });

      // refresh selected stock
      try {
        const pRes = await apiFetch('/api/products');
        const pJs = await pRes.json();
        if (pRes.ok && pJs?.success) setProducts(pJs.data || []);
      } catch {}

      setDelta(0);
      setReason('');
      setNotes('');
    } catch (e: any) {
      setNote({ type: 'error', text: e?.message || 'خطا در عملیات' });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-4" dir="rtl">
      <Notification message={note} onClose={() => setNote(null)} />

      <div className="app-card p-4 md:p-6">
        <div className="flex items-center gap-2">
          <div className="font-black text-gray-900 dark:text-gray-100">اصلاح دستی موجودی</div>
          <div className="text-xs text-gray-500 dark:text-gray-400">برای اختلاف موجودی، مرجوعی، شکستگی، یا ثبت اطلاعات کسری/اضافی</div>
        </div>

        {loading ? (
          <div className="mt-4 text-sm text-gray-500">در حال دریافت اطلاعات…</div>
        ) : (
          <div className="mt-4 grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
            <div className="md:col-span-5">
              <label className="app-label">کالا</label>
              <select className="app-select" value={productId} onChange={(e) => setProductId(e.target.value ? Number(e.target.value) : '')}>
                <option value="">انتخاب کنید…</option>
                {products.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.name}
                  </option>
                ))}
              </select>
              {selected ? (
                <div className="mt-2 text-xs text-gray-500 dark:text-gray-400">
                  موجودی فعلی: <span className="font-bold">{Number((selected as any).stock_quantity ?? 0).toLocaleString('fa-IR')}</span>
                </div>
              ) : null}
            </div>

            <div className="md:col-span-2">
              <label className="app-label">تغییر (delta)</label>
              <input
                type="number"
                className="app-input"
                value={delta}
                onChange={(e) => setDelta(Number(e.target.value || 0))}
                preview="مثلاً 5 یا -2"
              />
              <div className="mt-1 text-[11px] text-gray-500 dark:text-gray-400">عدد مثبت = افزایش، عدد منفی = کاهش</div>
            </div>

            <div className="md:col-span-2">
              <label className="app-label">علت (اختیاری)</label>
              <input className="app-input" value={reason} onChange={(e) => setReason(e.target.value)} preview="مثلاً مرجوعی" />
            </div>

            <div className="md:col-span-3">
              <label className="app-label">یادداشت (اختیاری)</label>
              <input className="app-input" value={notes} onChange={(e) => setNotes(e.target.value)} preview="جزئیات" />
            </div>

            <div className="md:col-span-12 flex justify-end">
              <Button
                onClick={submit}
                disabled={submitting || !token}
                loading={submitting}
                loadingText="در حال ثبت اطلاعات…"
                variant="primary"
                size="md"
                leftIcon={!submitting ? <i className="fa-solid fa-arrows-rotate" /> : undefined}
              >
                ثبت اطلاعات اصلاح موجودی
              </Button>
            </div>
          </div>
        )}
      </div>

      <div className="app-card-muted p-4 text-xs text-gray-600 dark:text-gray-300">
        نکته: این عملیات مستقیم موجودی کالا را تغییر می‌دهد و برای گزارش‌های دقیق بهتر است علت را هم ثبت اطلاعات کنید.
      </div>
    </div>
  );
}

const InventoryHub: React.FC = () => {
  const [params, setParams] = useSearchParams();
  const tab = (params.get('tab') as TabId) || 'products';

  const setTab = (t: TabId) => {
    const next = new URLSearchParams(params);
    next.set('tab', t);
    setParams(next, { replace: true });
  };

  return (
    <PageShell
      className="inventory-hub-foundation"
      title="کالا و انبار"
      description="مدیریت کالا، خرید، اصلاح موجودی، انبارگردانی و هشدارهای کمبود"
      icon={<i className="fa-solid fa-boxes-stacked" />}
    >
      <div className="max-w-7xl mx-auto px-4 space-y-4" dir="rtl" data-ui-inventory-page="hub">
        <div className="app-card inventory-navigation-card p-3 md:p-4" data-ui-inventory-tabs="true">
          <TabPills value={tab} onChange={setTab} />
        </div>

        {tab === 'products' ? <ProductsManager /> : null}
        {tab === 'purchases' ? <Purchases /> : null}
        {tab === 'adjust' ? <StockAdjustPanel /> : null}
        {tab === 'counts' ? <StockCounts /> : null}
        {tab === 'alerts' ? <InventoryAlertsPanel onNavigateProducts={() => setTab('products')} /> : null}
      </div>
    </PageShell>
  );
};

export default InventoryHub;
