import { SearchableSelectField, TableActionGroup } from '@/components/ui';
import React, { useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { apiFetch } from "../utils/apiFetch";
import { getAuthHeaders } from "../utils/apiUtils";
import { humanizeErrorMessage, parseApiResult, runWithFeedback } from "../utils/feedback";
import Notification from "../components/Notification";
import Button from '../components/Button';
import PriceInput from '../components/PriceInput';
import { NotificationMessage } from "../types";
import { Search, Save, RefreshCw } from '../components/lucide-react';

interface Partner {
  id: number;
  partnerName: string;
  partnerType?: string;
}

interface Product {
  id: number;
  name: string;
  stock_quantity?: number;
  purchasePrice?: number;
}

interface LineItem {
  productId: number | "";
  quantity: number;
  unitCost: number;
}

const Purchases: React.FC = () => {
  const { token } = useAuth();
  const [note, setNote] = useState<NotificationMessage | null>(null);
  const [partners, setPartners] = useState<Partner[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const [supplierId, setSupplierId] = useState<number | "">("");
  const [invoiceNumber, setInvoiceNumber] = useState<string>("");
  const [notes, setNotes] = useState<string>("");
  const [items, setItems] = useState<LineItem[]>([{ productId: "", quantity: 1, unitCost: 0 }]);
  const [submitting, setSubmitting] = useState(false);
  const [submitStageHint, setSubmitStageHint] = useState<string>('ثبت اطلاعات خرید، به‌روزرسانی موجودی و دفتر تأمین‌کننده');

  useEffect(() => {
    if (!token) return;
    (async () => {
      try {
        setLoading(true);
        const [p1, p2] = await Promise.all([
          apiFetch("/api/partners"),
          apiFetch("/api/products"),
        ]);
        const j1 = await p1.json();
        const j2 = await p2.json();
        if (p1.ok && j1?.success) setPartners(j1.data || []);
        if (p2.ok && j2?.success) setProducts(j2.data || []);
      } catch (e: any) {
        setNote({ type: "error", text: e?.message || "خطا در دریافت اطلاعات" });
      } finally {
        setLoading(false);
      }
    })();
  }, [token]);

  const supplierOptions = useMemo(() => {
    // اگر partnerType دارید می‌توانید اینجا فیلتر کنید
    return partners;
  }, [partners]);

  const productMap = useMemo(() => {
    const m = new Map<number, Product>();
    for (const pr of products) m.set(pr.id, pr);
    return m;
  }, [products]);

  const totalCost = useMemo(() => {
    return items.reduce((sum, it) => {
      const q = Number(it.quantity || 0);
      const c = Number(it.unitCost || 0);
      return sum + q * c;
    }, 0);
  }, [items]);

  const updateItem = (idx: number, patch: Partial<LineItem>) => {
    setItems((prev) => prev.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  };

  const addRow = () => setItems((prev) => [...prev, { productId: "", quantity: 1, unitCost: 0 }]);
  const removeRow = (idx: number) => setItems((prev) => prev.filter((_, i) => i !== idx));

  const submit = async () => {
    if (!token) return;
    if (!supplierId) {
      setNote({ type: "warning", text: "تامین‌کننده را انتخاب کنید." });
      return;
    }
    const cleanItems = items
      .filter((it) => it.productId && Number(it.quantity) > 0)
      .map((it) => ({
        productId: Number(it.productId),
        quantity: Math.floor(Number(it.quantity)),
        unitCost: Number(it.unitCost || 0),
      }));

    if (!cleanItems.length) {
      setNote({ type: "warning", text: "حداقل یک کالا برای خرید اضافه کنید." });
      return;
    }

    setSubmitting(true);
    setSubmitStageHint('در حال اعتبارسنجی تامین‌کننده و اقلام خرید');
    try {
      setSubmitStageHint('در حال ثبت اطلاعات خرید و افزایش موجودی کالاها');
      const js: any = await runWithFeedback(
        apiFetch("/api/purchases", {
          method: "POST",
          headers: { ...getAuthHeaders(token), "Content-Type": "application/json" },
          body: JSON.stringify({
            supplierId: Number(supplierId),
            invoiceNumber: invoiceNumber || null,
            notes,
            items: cleanItems,
          }),
        }).then((response) => parseApiResult(response, { endpoint: '/api/purchases', action: 'ثبت اطلاعات خرید' })),
        {
          kind: 'create',
          loading: 'در حال ثبت اطلاعات رسید خرید و افزایش موجودی…',
          success: 'خرید با موفقیت ثبت شد و موجودی کالاها به‌روزرسانی شد.',
          endpoint: '/api/purchases',
        }
      );
      setNote({ type: "success", text: `رسید خرید ثبت اطلاعات شد. شماره: ${js?.data?.id}` });
      setItems([{ productId: "", quantity: 1, unitCost: 0 }]);
      setInvoiceNumber("");
      setNotes("");
      // Refresh products to show new stock
      try {
        setSubmitStageHint('در حال همگام‌سازی موجودی و تازه‌سازی لیست کالاها');
        const p2 = await apiFetch("/api/products");
        const j2 = await p2.json();
        if (p2.ok && j2?.success) setProducts(j2.data || []);
      } catch {}
    } catch (e: any) {
      setNote({ type: "error", text: humanizeErrorMessage(e?.message || "ثبت اطلاعات خرید انجام نشد.", { endpoint: '/api/purchases', action: 'ثبت اطلاعات خرید' }) });
    } finally {
      setSubmitStageHint('ثبت اطلاعات خرید، به‌روزرسانی موجودی و دفتر تأمین‌کننده');
      setSubmitting(false);
    }
  };


const submitStageProgress = (() => {
  if (/اعتبارسنج/i.test(submitStageHint)) return 1;
  if (/ثبت اطلاعات خرید|افزایش موجودی/i.test(submitStageHint)) return 2;
  if (/همگام‌سازی|همگام سازی|تازه‌سازی/i.test(submitStageHint)) return 3;
  return 1;
})();

const submitStageIcon = submitStageProgress === 1
  ? <Search className="h-3.5 w-3.5" />
  : submitStageProgress === 2
    ? <Save className="h-3.5 w-3.5" />
    : <RefreshCw className="h-3.5 w-3.5" />;

  if (loading) {
    return (
      <div className="p-6" dir="rtl">
        <div className="app-card p-4">
          <div className="text-sm text-gray-500">در حال دریافت اطلاعات…</div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 inventory-shell-modern" dir="rtl">
      <Notification message={note} onClose={() => setNote(null)} />

      <div className="app-card inventory-card-premium p-4 md:p-6 space-y-4">
        <div className="premium-section-header">
          <div className="text-sm md:text-base font-black text-gray-900 dark:text-gray-100">رسید خرید / افزایش موجودی</div>
          <div className="premium-section-header__meta">ماژول اختیاری برای خریدهای بعدی از تأمین‌کننده؛ نه ثبت اولیه کالا</div>
          <div className="flex-1" />
          <div className="premium-inline-stats">
            <span className="premium-inline-stat"><i className="fa-solid fa-receipt" /> {items.length.toLocaleString("fa-IR")} ردیف</span>
            <span className="premium-inline-stat"><i className="fa-solid fa-wallet" /> {totalCost.toLocaleString("fa-IR")} تومان</span>
          </div>
        </div>

        <div className="purchase-purpose-note" role="note">
          <span className="purchase-purpose-note__icon"><i className="fa-solid fa-circle-info" /></span>
          <div className="purchase-purpose-note__copy">
            <strong>این صفحه فقط برای زمانی است که کالای موجود را دوباره از تأمین‌کننده می‌خری و باید موجودی انبار افزایش پیدا کند.</strong>
            <p>اگر کالا را برای اولین‌بار در بخش «کالاها» با تأمین‌کننده و موجودی اولیه ثبت می‌کنی، استفاده از این صفحه لازم نیست؛ استفاده همزمان از هر دو مسیر می‌تواند موجودی و حساب همکار را دوباره ثبت کند.</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="app-label">تامین‌کننده</label>
            <SearchableSelectField<number>
              value={supplierId || null}
              onValueChange={(value) => setSupplierId(value ?? "")}
              options={supplierOptions.map((partner) => ({
                value: partner.id,
                label: partner.partnerName,
                searchText: `${partner.partnerName} ${partner.id}`,
              }))}
              placeholder="نام تأمین‌کننده را تایپ کنید…"
              noOptionsMessage="تأمین‌کننده‌ای مطابق جستجو پیدا نشد"
              ariaLabel="جستجو و انتخاب تأمین‌کننده"
            />
          </div>

          <div>
            <label className="app-label">شماره فاکتور تامین‌کننده (اختیاری)</label>
            <input
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="app-input"
              preview="مثلاً ۱۲۳۴۵"
            />
          </div>

          <div>
            <label className="app-label">یادداشت (اختیاری)</label>
            <input
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="app-input"
              preview="مثلاً ارسال با پیک"
            />
          </div>
        </div>
        <div className="premium-section-separator" />
        <div className="text-sm font-bold text-slate-700 dark:text-slate-200">جمع کل: {totalCost.toLocaleString("fa-IR")} تومان</div>
      </div>

      <div className="app-card inventory-card-premium p-4 md:p-6">
        <div className="premium-section-header mb-3">
          <div className="text-sm font-black text-gray-900 dark:text-gray-100">اقلام خرید</div>
          <Button type="button" onClick={addRow} variant="primary" size="sm" leftIcon={<i className="fa-solid fa-plus" />}>افزودن مورد جدید ردیف</Button>
        </div>

        <div className="space-y-3">
          {items.map((it, idx) => {
            const p = it.productId ? productMap.get(Number(it.productId)) : undefined;
            return (
              <div key={idx} className="app-card-muted p-3">
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <div className="md:col-span-5">
                    <label className="app-label">کالا</label>
                    <SearchableSelectField<number>
                      value={it.productId || null}
                      onValueChange={(value) => {
                        const v = value ?? "";
                        const pr = typeof v === 'number' ? productMap.get(v) : undefined;
                        updateItem(idx, {
                          productId: v,
                          unitCost: pr?.purchasePrice != null ? Number(pr.purchasePrice) : it.unitCost,
                        });
                      }}
                      options={products.map((product) => ({
                        value: product.id,
                        label: `${product.name}${typeof product.stock_quantity === 'number' ? ` • موجودی: ${product.stock_quantity}` : ''}`,
                        searchText: `${product.name} ${product.id}`,
                      }))}
                      placeholder="نام یا کد کالا را تایپ کنید…"
                      noOptionsMessage="کالایی مطابق جستجو پیدا نشد"
                      ariaLabel="جستجو و انتخاب کالا"
                    />
                    {p ? (
                      <div className="app-help">قیمت خرید پیش‌فرض: {Number(p.purchasePrice ?? 0).toLocaleString('fa-IR')}</div>
                    ) : null}
                  </div>

                  <div className="md:col-span-2">
                    <label className="app-label">تعداد</label>
                    <PriceInput
                      name={`quantity-${idx}`}
                      value={String(it.quantity ?? '')}
                      onChange={(e) => updateItem(idx, { quantity: Number(e.target.value || 0) })}
                      className="app-input text-left"
                      topLabel="تعداد"
                      suffix="عدد"
                      preview="مثلاً ۲"
                    />
                  </div>

                  <div className="md:col-span-3">
                    <label className="app-label">قیمت واحد</label>
                    <PriceInput
                      name={`unitCost-${idx}`}
                      value={String(it.unitCost ?? '')}
                      onChange={(e) => updateItem(idx, { unitCost: Number(e.target.value || 0) })}
                      className="app-input text-left"
                      topLabel="فی"
                      suffix="تومان"
                      preview="مثلاً ۸۵۰۰۰۰"
                    />
                  </div>

                  <div className="md:col-span-2 flex items-center justify-between gap-2">
                    <div className="text-xs text-gray-500 dark:text-gray-400">
                      جمع: <span className="font-black text-gray-900 dark:text-gray-100">{(Number(it.quantity || 0) * Number(it.unitCost || 0)).toLocaleString('fa-IR')}</span>
                    </div>
                    <TableActionGroup
                      ariaLabel={`عملیات ردیف خرید ${idx + 1}`}
                      collapseBelow="sm"
                      actions={[
                        {
                          key: `remove-purchase-row-${idx}`,
                          kind: "button",
                          label: "حذف ردیف خرید",
                          tooltip: "حذف ردیف خرید",
                          variant: "danger",
                          icon: <i className="fa-solid fa-trash" />,
                          disabled: items.length === 1,
                          onClick: () => removeRow(idx),
                        },
                      ]}
                    />
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Mobile-friendly sticky submit bar */}
      <div className="sticky bottom-0 z-20 -mx-4 md:-mx-6 px-4 md:px-6 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3">
        <div className="app-card ux-sticky-action-bar p-3 flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-gray-500 dark:text-gray-400">جمع کل خرید</div>
            <div className="text-base font-black text-gray-900 dark:text-gray-100 truncate">
              {totalCost.toLocaleString('fa-IR')} تومان
            </div>
          </div>
          <Button type="button" onClick={submit} disabled={submitting} loading={submitting} loadingText="در حال ثبت اطلاعات…" loadingHint={submitStageHint} loadingStageStep={submitStageProgress} loadingStageTotal={3} loadingStageIcon={submitStageIcon} successPulseText="خرید ثبت اطلاعات شد" successPulseHint="موجودی و حساب تأمین‌کننده با موفقیت به‌روزرسانی شد" variant="primary" size="md" leftIcon={!submitting ? <i className="fa-solid fa-check" /> : undefined}>ثبت اطلاعات خرید</Button>
        </div>
      </div>
    </div>
  );
};

export default Purchases;
