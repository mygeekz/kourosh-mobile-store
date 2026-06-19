import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import { getAuthHeaders } from "../utils/apiUtils";
import Notification from "../components/Notification";
import Skeleton from "../components/ui/Skeleton";
import EmptyState from "../components/ui/EmptyState";
import { NotificationMessage } from "../types";
import { useConfirm } from '../contexts/ConfirmContext';

interface Product {
  id: number;
  name: string;
  stock_quantity: number;
}

interface StockCount {
  id: number;
  title: string;
  status: "open" | "completed" | string;
  createdAt: string;
  completedAt?: string | null;
  notes?: string | null;
  items?: Array<{ productId: number; expectedQty: number; countedQty: number }>;
}

const StockCounts: React.FC = () => {
  const confirmAction = useConfirm();
  const { token } = useAuth();
  const [note, setNote] = useState<NotificationMessage | null>(null);
  const [counts, setCounts] = useState<StockCount[]>([]);
  const [activeId, setActiveId] = useState<number | null>(null);
  const [active, setActive] = useState<StockCount | null>(null);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const headers = useMemo(() => (token ? getAuthHeaders(token) : {}), [token]);

  const load = async () => {
    if (!token) return;
    setLoading(true);
    try {
      const [cRes, pRes] = await Promise.all([apiFetch("/api/stock-counts"), apiFetch("/api/products")]);
      const cJs = await cRes.json();
      const pJs = await pRes.json();
      if (cRes.ok && cJs?.success) setCounts(cJs.data || []);
      if (pRes.ok && pJs?.success) setProducts(pJs.data || []);
    } catch (e: any) {
      setNote({ type: "error", text: e?.message || "خطا در دریافت داده‌ها" });
    } finally {
      setLoading(false);
    }
  };

  const loadActive = async (id: number) => {
    if (!token) return;
    try {
      const res = await apiFetch(`/api/stock-counts/${id}`);
      const js = await res.json();
      if (!res.ok || !js?.success) throw new Error(js?.message || "خطا در دریافت انبارگردانی");
      setActive(js.data);
      setActiveId(id);
    } catch (e: any) {
      setNote({ type: "error", text: e?.message || "خطا در عملیات" });
    }
  };

  useEffect(() => {
    load();
  }, [token]);

  const createNew = async () => {
    if (!token) return;
    const title = window.prompt("عنوان انبارگردانی:")?.trim();
    if (!title) return;
    try {
      const res = await fetch("/api/stock-counts", {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ title }),
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || !(js?.success ?? true)) throw new Error(js?.message || "ایجاد نشد");
      setNote({ type: "success", text: `انبارگردانی #${js.data.id} ایجاد شد.` });
      await load();
      await loadActive(js.data.id);
    } catch (e: any) {
      setNote({ type: "error", text: e?.message || "خطا در عملیات" });
    }
  };

  const setCounted = async (productId: number, countedQty: number) => {
    if (!token || !activeId) return;
    try {
      await fetch(`/api/stock-counts/${activeId}/items`, {
        method: "POST",
        headers: { ...headers, "Content-Type": "application/json" },
        body: JSON.stringify({ productId, countedQty }),
      });
    } catch {}
  };

  const complete = async () => {
    if (!token || !activeId) return;
    const ok = await confirmAction({ title: 'اتمام انبارگردانی', description: 'اصلاحات موجودی روی انبار اعمال شود؟', confirmText: 'بله، اعمال شود', tone: 'warning', iconClass: 'fa-solid fa-boxes-stacked' });
    if (!ok) return;
    setSaving(true);
    try {
      const res = await fetch(`/api/stock-counts/${activeId}/complete`, {
        method: "POST",
        headers,
      });
      const js = await res.json().catch(() => ({}));
      if (!res.ok || !(js?.success ?? true)) throw new Error(js?.message || "اتمام نشد");
      setNote({ type: "success", text: "انبارگردانی تکمیل شد." });
      await load();
      await loadActive(activeId);
    } catch (e: any) {
      setNote({ type: "error", text: e?.message || "خطا در عملیات" });
    } finally {
      setSaving(false);
    }
  };

  const activeItemsMap = useMemo(() => {
    const m = new Map<number, { expectedQty: number; countedQty: number }>();
    (active?.items || []).forEach((it: any) => m.set(Number(it.productId), { expectedQty: Number(it.expectedQty), countedQty: Number(it.countedQty) }));
    return m;
  }, [active]);

  return (
    <div className="p-6 space-y-4" dir="rtl">
      <Notification message={note} onClose={() => setNote(null)} />

      <div className="flex items-center gap-2 flex-wrap">
        <h1 className="text-xl font-bold">انبارگردانی</h1>
        <div className="flex-1" />
        <button onClick={createNew} className="ux-btn ux-btn-primary ux-btn-md">ایجاد انبارگردانی</button>
      </div>

      {loading ? <div className="p-3"><Skeleton className="h-10 w-full" rounded="xl" /></div> : null}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="app-card p-3">
          <div className="font-bold mb-2">لیست انبارگردانی‌ها</div>
          <div className="space-y-2 max-h-[65vh] overflow-auto">
            {counts.map((c) => (
              <button
                key={c.id}
                onClick={() => loadActive(c.id)}
                className={`w-full text-right border rounded p-2 hover:bg-gray-50 ${activeId === c.id ? "bg-gray-50" : ""}`}
              >
                <div className="flex justify-between gap-2">
                  <div className="font-medium">#{c.id} - {c.title}</div>
                  <div className={`text-xs ${c.status === "completed" ? "text-green-600" : "text-amber-600"}`}>{c.status === "completed" ? "تکمیل" : "باز"}</div>
                </div>
                <div className="text-xs text-gray-500">{String(c.createdAt || "")}</div>
              </button>
            ))}
            {counts.length === 0 ? <div className="p-3"><EmptyState title="انبارگردانی‌ای ثبت اطلاعات نشده" description="برای شروع، یک انبارگردانی جدید ایجاد کنید." /></div> : null}
          </div>
        </div>

        <div className="lg:col-span-2 app-card p-3">
          {!active ? (
            <div className="p-6"><EmptyState title="یک انبارگردانی را انتخاب کنید" description="از لیست سمت راست، یک مورد را باز کنید یا یک مورد جدید بسازید." /></div>
          ) : (
            <>
              <div className="flex items-center gap-2 mb-3 flex-wrap">
                <div className="font-bold">#{active.id} - {active.title}</div>
                <div className={`text-xs px-2 py-0.5 rounded-full ${active.status === "completed" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"}`}>{active.status === "completed" ? "تکمیل" : "باز"}</div>
                <div className="flex-1" />
                <button
                  onClick={complete}
                  disabled={saving || active.status === "completed"}
                  className="px-4 py-2 rounded bg-amber-600 text-white hover:bg-amber-700 disabled:opacity-60 text-sm"
                >
                  {active.status === "completed" ? "تکمیل شده" : (saving ? "در حال اعمال…" : "اتمام و اعمال")}
                </button>
              </div>

              <div className="max-h-[60vh] overflow-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-right border-b">
                      <th className="py-2">محصول</th>
                      <th className="py-2">موجودی فعلی</th>
                      <th className="py-2">شمارش‌شده</th>
                      <th className="py-2">اختلاف</th>
                    </tr>
                  </thead>
                  <tbody>
                    {products.map((p) => {
                      const rec = activeItemsMap.get(p.id);
                      const expected = rec ? rec.expectedQty : p.stock_quantity;
                      const counted = rec ? rec.countedQty : p.stock_quantity;
                      const diff = counted - expected;
                      return (
                        <tr key={p.id} className="border-b">
                          <td className="py-2">{p.name}</td>
                          <td className="py-2">{Number(expected).toLocaleString("fa-IR")}</td>
                          <td className="py-2">
                            <input
                              type="number"
                              min={0}
                              disabled={active.status === "completed"}
                              defaultValue={Number(counted)}
                              onBlur={(e) => {
                                const v = Math.max(0, Number(e.target.value || 0));
                                setCounted(p.id, v);
                              }}
                              className="w-28 border rounded px-2 py-1"
                            />
                          </td>
                          <td className={`py-2 ${diff === 0 ? "text-gray-500" : diff > 0 ? "text-green-700" : "text-rose-700"}`}>
                            {diff === 0 ? "-" : diff.toLocaleString("fa-IR")}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
              <div className="text-xs text-gray-500 mt-2">* مقدار شمارش‌شده با خروج از فیلد (Blur) ذخیره تغییرات می‌شود.</div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default StockCounts;
