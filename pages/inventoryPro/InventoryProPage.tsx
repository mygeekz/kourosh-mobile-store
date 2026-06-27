
import { useEffect, useMemo, useState } from "react";
import { useLocation } from "react-router-dom";
import toast from "react-hot-toast";
import { apiFetch } from "../../utils/apiFetch";
import ProModal from "./ProModal";
import { useConfirm } from "../../contexts/ConfirmContext";

type Category = { id: number; name: string };
type Partner = { id: number; partnerName: string; partnerType?: string; phoneNumber?: string; notes?: string };
type Product = {
  id: number;
  name: string;
  sku?: string;
  barcode?: string;
  categoryId?: number | null;
  categoryName?: string;
  partnerId?: number | null;
  supplierName?: string;
  purchasePrice?: number | null;
  salePrice?: number | null;
  stock?: number | null;
  minStock?: number | null;
  unit?: string | null;
  description?: string | null;
};

const money = (v: any) => `${Number(v ?? 0).toLocaleString("fa-IR")} تومان`;

async function json<T>(res: Response): Promise<T> {
  const data = await res.json().catch(() => ({}));
  if (!res.ok || data?.success === false) {
    throw new Error(data?.message || "خطا در ارتباط با سرور");
  }
  return data;
}

export default function InventoryProPage() {
  const location = useLocation();
  const confirmAction = useConfirm();
  const [loading, setLoading] = useState(true);

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);

  const [q, setQ] = useState("");
  const [onlyLowStock, setOnlyLowStock] = useState(false);

  // --- Modals state (کاملاً مجزا)
  const [openProduct, setOpenProduct] = useState(false);
  const [openCats, setOpenCats] = useState(false);
  const [openSuppliers, setOpenSuppliers] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);

  // Auto-open modals via querystring: /inventory-pro?open=add|manage|suppliers
  useEffect(() => {
    const sp = new URLSearchParams(location.search);
    const open = sp.get("open");
    if (!open) return;
    if (open === "add") {
      setEditingProduct(null);
      setOpenProduct(true);
    } else if (open === "manage") {
      setOpenCats(true);
    } else if (open === "suppliers") {
      setOpenSuppliers(true);
    }
  }, [location.search]);


  // Product form
  const emptyForm = useMemo(
    () => ({
      name: "",
      sku: "",
      barcode: "",
      categoryId: "",
      partnerId: "",
      purchasePrice: "",
      salePrice: "",
      stock: "",
      minStock: "",
      unit: "عدد",
      description: "",
    }),
    []
  );
  const [form, setForm] = useState<any>(emptyForm);

  // Category form
  const [newCat, setNewCat] = useState("");
  const [catEdit, setCatEdit] = useState<Record<number, string>>({});

  // Supplier form
  const [supForm, setSupForm] = useState<any>({
    partnerName: "",
    phoneNumber: "",
    notes: "",
  });

  const kpis = useMemo(() => {
    const total = products.length;
    const totalStock = products.reduce((a, p) => a + Number(p.stock ?? 0), 0);
    const low = products.filter((p) => {
      const stock = Number(p.stock ?? 0) || 0;
      const min = Number(p.minStock ?? 0) || 0;
      return stock <= min;
    }).length;
    const noStock = products.filter((p) => Number(p.stock ?? 0) <= 0).length;
    return { total, totalStock, low, noStock };
  }, [products]);

  const filtered = useMemo(() => {
    const qq = q.trim().toLowerCase();
    return products.filter((p) => {
      const hay =
        `${p.name ?? ""} ${p.sku ?? ""} ${p.barcode ?? ""} ${p.categoryName ?? ""} ${p.supplierName ?? ""}`.toLowerCase();
      const hit = !qq || hay.includes(qq);
      const lowOk = !onlyLowStock || Number(p.stock ?? 0) <= (Number(p.minStock ?? 0) || 0);
      return hit && lowOk;
    });
  }, [products, q, onlyLowStock]);

  async function loadAll() {
    setLoading(true);
    try {
      const [pRes, cRes, sRes] = await Promise.all([
        apiFetch("/api/products"),
        apiFetch("/api/categories"),
        apiFetch("/api/partners?partnerType=Supplier"),
      ]);
      const pJson: any = await json(pRes);
      const cJson: any = await json(cRes);
      const sJson: any = await json(sRes);
      setProducts(pJson.data || []);
      setCategories(cJson.data || []);
      setSuppliers(sJson.data || []);
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "خطا در دریافت اطلاعات");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadAll();
  }, []);

  function openAddProduct() {
    setEditingProduct(null);
    setForm({ ...emptyForm });
    setOpenProduct(true);
  }

  function openEditProduct(p: Product) {
    setEditingProduct(p);
    setForm({
      name: p.name ?? "",
      sku: p.sku ?? "",
      barcode: p.barcode ?? "",
      categoryId: p.categoryId != null ? String(p.categoryId) : "",
      partnerId: (p.partnerId as any) != null ? String(p.partnerId) : "",
      purchasePrice: p.purchasePrice != null ? String(p.purchasePrice) : "",
      salePrice: p.salePrice != null ? String(p.salePrice) : "",
      stock: p.stock != null ? String(p.stock) : "",
      minStock: p.minStock != null ? String(p.minStock) : "",
      unit: p.unit ?? "عدد",
      description: p.description ?? "",
    });
    setOpenProduct(true);
  }

  async function saveProduct() {
    const payload: any = {
      name: String(form.name || "").trim(),
      sku: String(form.sku || "").trim() || null,
      barcode: String(form.barcode || "").trim() || null,
      categoryId: form.categoryId ? Number(form.categoryId) : null,
      partnerId: form.partnerId ? Number(form.partnerId) : null,
      purchasePrice: form.purchasePrice !== "" ? Number(form.purchasePrice) : null,
      salePrice: form.salePrice !== "" ? Number(form.salePrice) : null,
      stock: form.stock !== "" ? Number(form.stock) : 0,
      minStock: form.minStock !== "" ? Number(form.minStock) : 0,
      unit: String(form.unit || "عدد"),
      description: String(form.description || "") || null,
    };

    if (!payload.name) return toast.error("نام کالا الزامی است.");

    try {
      const res = editingProduct
        ? await apiFetch(`/api/products/${editingProduct.id}`, {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          })
        : await apiFetch("/api/products", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          });
      await json(res);
      toast.success(editingProduct ? "کالا ویرایش اطلاعات شد" : "کالا ثبت اطلاعات شد");
      setOpenProduct(false);
      await loadAll();
    } catch (e: any) {
      console.error(e);
      toast.error(e?.message || "ثبت اطلاعات کالا عملیات ناموفق بود");
    }
  }

  async function deleteProduct(p: Product) {
    const approved = await confirmAction({
      title: "حذف کالا",
      description: `کالای «${p.name}» از موجودی حذف شود؟ این عملیات قابل بازگشت نیست.`,
      confirmText: "حذف کالا",
      cancelText: "انصراف",
      tone: "danger",
      summaryItems: [
        { label: "نام کالا", value: p.name || "—" },
        { label: "موجودی", value: `${Number(p.stock ?? 0).toLocaleString("fa-IR")} ${p.unit || "عدد"}` },
      ],
    });
    if (!approved) return;
    try {
      const res = await apiFetch(`/api/products/${p.id}`, { method: "DELETE" });
      await json(res);
      toast.success("حذف مورد شد");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "حذف مورد عملیات ناموفق بود");
    }
  }

  async function quickAdjust(p: Product, delta: number) {
    const reason = prompt("علت اصلاح موجودی؟ (اختیاری)") || "";
    try {
      const res = await apiFetch(`/api/products/${p.id}/adjust-stock`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ delta, reason, notes: "InventoryPro" }),
      });
      await json(res);
      toast.success(`موجودی ${delta > 0 ? "افزایش" : "کاهش"} یافت`);
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "اصلاح موجودی عملیات ناموفق بود");
    }
  }

  // --- Categories
  async function addCategory() {
    const name = newCat.trim();
    if (!name) return toast.error("نام دسته‌بندی را وارد کن");
    try {
      const res = await apiFetch("/api/categories", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await json(res);
      setNewCat("");
      toast.success("دسته‌بندی اضافه شد");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "ثبت اطلاعات دسته‌بندی عملیات ناموفق بود");
    }
  }

  async function updateCategory(id: number) {
    const name = (catEdit[id] ?? "").trim();
    if (!name) return toast.error("نام دسته‌بندی خالی است");
    try {
      const res = await apiFetch(`/api/categories/${id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name }),
      });
      await json(res);
      toast.success("ویرایش اطلاعات شد");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "ویرایش اطلاعات عملیات ناموفق بود");
    }
  }

  async function deleteCategory(id: number) {
    const category = categories.find((item) => Number(item.id) === Number(id));
    const approved = await confirmAction({
      title: "حذف دسته‌بندی",
      description: "این دسته‌بندی حذف شود؟ قبل از حذف مطمئن شوید کالای وابسته‌ای به آن نیاز ندارد.",
      confirmText: "حذف دسته‌بندی",
      cancelText: "انصراف",
      tone: "warning",
      summaryItems: category ? [{ label: "دسته‌بندی", value: category.name }] : undefined,
    });
    if (!approved) return;
    try {
      const res = await apiFetch(`/api/categories/${id}`, { method: "DELETE" });
      await json(res);
      toast.success("حذف مورد شد");
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "حذف مورد عملیات ناموفق بود");
    }
  }

  // --- Suppliers (Partners)
  async function addSupplier() {
    const payload: any = {
      partnerName: String(supForm.partnerName || "").trim(),
      partnerType: "Supplier",
      phoneNumber: String(supForm.phoneNumber || "").trim() || null,
      notes: String(supForm.notes || "").trim() || null,
    };
    if (!payload.partnerName) return toast.error("نام تامین‌کننده الزامی است.");
    try {
      const res = await apiFetch("/api/partners", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      await json(res);
      toast.success("تأمین‌کننده اضافه شد");
      setSupForm({ partnerName: "", phoneNumber: "", notes: "" });
      await loadAll();
    } catch (e: any) {
      toast.error(e?.message || "ثبت اطلاعات تامین‌کننده عملیات ناموفق بود");
    }
  }

  const Card = ({ title, value }: { title: string; value: any }) => (
    <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 backdrop-blur p-4">
      <div className="text-xs opacity-70 font-bold">{title}</div>
      <div className="text-xl font-extrabold mt-1">{value}</div>
    </div>
  );

  return (
    <div className="p-4 md:p-6 space-y-4">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <div className="text-lg md:text-xl font-extrabold">انبار حرفه‌ای</div>
          <div className="text-xs opacity-70 font-bold mt-1">
            یک بخش کاملاً مجزا برای مدیریت کالا/انبار — با مودال‌های مستقل و اتصال استاندارد به API
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => setOpenCats(true)}
            className="px-3 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 font-extrabold text-xs"
          >
            مدیریت دسته‌بندی
          </button>
          <button
            type="button"
            onClick={() => setOpenSuppliers(true)}
            className="px-3 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 font-extrabold text-xs"
          >
            مدیریت تأمین‌کننده
          </button>
          <button
            type="button"
            onClick={openAddProduct}
            className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs"
          >
            + افزودن مورد جدید کالا
          </button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card title="تعداد کالاها" value={kpis.total.toLocaleString("fa-IR")} />
        <Card title="جمع موجودی" value={kpis.totalStock.toLocaleString("fa-IR")} />
        <Card title="کمبود/هشدار" value={kpis.low.toLocaleString("fa-IR")} />
        <Card title="صفر موجودی" value={kpis.noStock.toLocaleString("fa-IR")} />
      </div>

      <div className="rounded-2xl border border-black/10 dark:border-white/10 bg-white/70 dark:bg-zinc-900/60 backdrop-blur p-3">
        <div className="flex gap-2 flex-wrap items-center justify-between">
          <div className="flex items-center gap-2 flex-wrap">
            <input
              value={q}
              onChange={(e) => setQ(e.target.value)}
              className="w-[min(92vw,420px)] px-3 py-2 rounded-xl bg-white dark:bg-zinc-950 border border-black/10 dark:border-white/10 text-sm font-bold"
              preview="جستجو: نام / SKU / بارکد / دسته / تامین‌کننده"
            />
            <label className="flex items-center gap-2 text-xs font-extrabold opacity-80">
              <input type="checkbox" checked={onlyLowStock} onChange={(e) => setOnlyLowStock(e.target.checked)} />
              فقط کمبود موجودی
            </label>
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={loadAll}
              className="px-3 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 font-extrabold text-xs"
            >
              بروزرسانی
            </button>
          </div>
        </div>

        <div className="mt-3 overflow-auto">
          <table className="min-w-[980px] w-full text-sm">
            <thead>
              <tr className="text-xs opacity-70">
                <th className="text-right py-2">کالا</th>
                <th className="text-right py-2">دسته</th>
                <th className="text-right py-2">تامین‌کننده</th>
                <th className="text-right py-2">موجودی</th>
                <th className="text-right py-2">حداقل</th>
                <th className="text-right py-2">قیمت خرید</th>
                <th className="text-right py-2">قیمت فروش</th>
                <th className="text-right py-2">عملیات</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center font-extrabold opacity-70">
                    در حال دریافت اطلاعات...
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-8 text-center font-extrabold opacity-70">
                    موردی یافت نشد.
                  </td>
                </tr>
              ) : (
                filtered.map((p) => {
                  const stock = Number(p.stock ?? 0);
                  const min = Number(p.minStock ?? 0);
                  const isLow = stock <= min;
                  return (
                    <tr key={p.id} className="border-t border-black/5 dark:border-white/10">
                      <td className="py-2">
                        <div className="font-extrabold">{p.name}</div>
                        <div className="text-xs opacity-60 font-bold">
                          {p.sku ? `SKU: ${p.sku}` : ""}
                          {p.barcode ? `  •  بارکد: ${p.barcode}` : ""}
                        </div>
                      </td>
                      <td className="py-2 font-bold">{p.categoryName || "—"}</td>
                      <td className="py-2 font-bold">{p.supplierName || "—"}</td>
                      <td className="py-2">
                        <span className={`px-2 py-1 rounded-lg text-xs font-extrabold ${isLow ? "bg-rose-600 text-white" : "bg-emerald-600 text-white"}`}>
                          {stock.toLocaleString("fa-IR")} {p.unit || ""}
                        </span>
                      </td>
                      <td className="py-2 font-bold">{min.toLocaleString("fa-IR")}</td>
                      <td className="py-2 font-bold">{money(p.purchasePrice)}</td>
                      <td className="py-2 font-bold">{money(p.salePrice)}</td>
                      <td className="py-2">
                        <div className="flex gap-2 flex-wrap">
                          <button
                            type="button"
                            onClick={() => openEditProduct(p)}
                            className="px-2 py-1 rounded-lg bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 font-extrabold text-xs"
                          >
                            ویرایش اطلاعات
                          </button>
                          <button
                            type="button"
                            onClick={() => quickAdjust(p, +1)}
                            className="px-2 py-1 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-xs"
                          >
                            +1
                          </button>
                          <button
                            type="button"
                            onClick={() => quickAdjust(p, -1)}
                            className="px-2 py-1 rounded-lg bg-amber-600 hover:bg-amber-700 text-white font-extrabold text-xs"
                          >
                            -1
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteProduct(p)}
                            className="px-2 py-1 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs"
                          >
                            حذف مورد
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Product modal */}
      <ProModal
        open={openProduct}
        title={editingProduct ? "ویرایش اطلاعات کالا" : "افزودن مورد جدید کالا"}
        onClose={() => setOpenProduct(false)}
      >
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <div className="text-xs font-extrabold opacity-70 mb-1">نام کالا</div>
            <input
              value={form.name}
              onChange={(e) => setForm((s: any) => ({ ...s, name: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
            />
          </div>
          <div>
            <div className="text-xs font-extrabold opacity-70 mb-1">SKU</div>
            <input
              value={form.sku}
              onChange={(e) => setForm((s: any) => ({ ...s, sku: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
            />
          </div>

          <div>
            <div className="text-xs font-extrabold opacity-70 mb-1">بارکد</div>
            <input
              value={form.barcode}
              onChange={(e) => setForm((s: any) => ({ ...s, barcode: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
            />
          </div>

          <div>
            <div className="text-xs font-extrabold opacity-70 mb-1">دسته‌بندی</div>
            <select
              value={form.categoryId}
              onChange={(e) => setForm((s: any) => ({ ...s, categoryId: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
            >
              <option value="">—</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <div className="text-xs font-extrabold opacity-70 mb-1">تأمین‌کننده</div>
            <select
              value={form.partnerId}
              onChange={(e) => setForm((s: any) => ({ ...s, partnerId: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
            >
              <option value="">—</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.partnerName}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <div className="text-xs font-extrabold opacity-70 mb-1">قیمت خرید</div>
              <input
                value={form.purchasePrice}
                onChange={(e) => setForm((s: any) => ({ ...s, purchasePrice: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
              />
            </div>
            <div>
              <div className="text-xs font-extrabold opacity-70 mb-1">قیمت فروش</div>
              <input
                value={form.salePrice}
                onChange={(e) => setForm((s: any) => ({ ...s, salePrice: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
              />
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <div className="text-xs font-extrabold opacity-70 mb-1">موجودی</div>
              <input
                value={form.stock}
                onChange={(e) => setForm((s: any) => ({ ...s, stock: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
              />
            </div>
            <div>
              <div className="text-xs font-extrabold opacity-70 mb-1">حداقل</div>
              <input
                value={form.minStock}
                onChange={(e) => setForm((s: any) => ({ ...s, minStock: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
              />
            </div>
            <div>
              <div className="text-xs font-extrabold opacity-70 mb-1">واحد</div>
              <input
                value={form.unit}
                onChange={(e) => setForm((s: any) => ({ ...s, unit: e.target.value }))}
                className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
              />
            </div>
          </div>

          <div className="md:col-span-2">
            <div className="text-xs font-extrabold opacity-70 mb-1">توضیحات</div>
            <textarea
              value={form.description}
              onChange={(e) => setForm((s: any) => ({ ...s, description: e.target.value }))}
              className="w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold min-h-[90px]"
            />
          </div>

          <div className="md:col-span-2 flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setOpenProduct(false)}
              className="px-4 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 font-extrabold text-sm"
            >
              لغو
            </button>
            <button
              type="button"
              onClick={saveProduct}
              className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm"
            >
              ذخیره تغییرات
            </button>
          </div>
        </div>
      </ProModal>

      {/* Categories modal */}
      <ProModal open={openCats} title="مدیریت دسته‌بندی‌ها" onClose={() => setOpenCats(false)}>
        <div className="flex gap-2 flex-wrap">
          <input
            value={newCat}
            onChange={(e) => setNewCat(e.target.value)}
            className="flex-1 min-w-[220px] px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
            preview="نام دسته‌بندی جدید"
          />
          <button
            type="button"
            onClick={addCategory}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm"
          >
            افزودن مورد جدید
          </button>
        </div>

        <div className="mt-4 space-y-2">
          {categories.map((c) => (
            <div key={c.id} className="flex items-center gap-2 rounded-xl border border-black/10 dark:border-white/10 p-2">
              <input
                value={catEdit[c.id] ?? c.name}
                onChange={(e) => setCatEdit((s) => ({ ...s, [c.id]: e.target.value }))}
                className="flex-1 px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
              />
              <button
                type="button"
                onClick={() => updateCategory(c.id)}
                className="px-3 py-2 rounded-xl bg-black/5 hover:bg-black/10 dark:bg-white/10 dark:hover:bg-white/15 font-extrabold text-xs"
              >
                ذخیره تغییرات
              </button>
              <button
                type="button"
                onClick={() => deleteCategory(c.id)}
                className="px-3 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-extrabold text-xs"
              >
                حذف مورد
              </button>
            </div>
          ))}
        </div>
      </ProModal>

      {/* Suppliers modal */}
      <ProModal open={openSuppliers} title="مدیریت تأمین‌کنندگان" onClose={() => setOpenSuppliers(false)}>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <input
            value={supForm.partnerName}
            onChange={(e) => setSupForm((s: any) => ({ ...s, partnerName: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
            preview="نام تأمین‌کننده"
          />
          <input
            value={supForm.phoneNumber}
            onChange={(e) => setSupForm((s: any) => ({ ...s, phoneNumber: e.target.value }))}
            className="px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold"
            preview="شماره تماس (اختیاری)"
          />
          <button
            type="button"
            onClick={addSupplier}
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm"
          >
            افزودن مورد جدید
          </button>
        </div>

        <textarea
          value={supForm.notes}
          onChange={(e) => setSupForm((s: any) => ({ ...s, notes: e.target.value }))}
          className="mt-2 w-full px-3 py-2 rounded-xl border border-black/10 dark:border-white/10 bg-white dark:bg-zinc-950 font-bold min-h-[70px]"
          preview="یادداشت (اختیاری)"
        />

        <div className="mt-4 overflow-auto">
          <table className="min-w-[800px] w-full text-sm">
            <thead>
              <tr className="text-xs opacity-70">
                <th className="text-right py-2">نام</th>
                <th className="text-right py-2">شماره</th>
                <th className="text-right py-2">یادداشت</th>
              </tr>
            </thead>
            <tbody>
              {suppliers.map((s) => (
                <tr key={s.id} className="border-t border-black/5 dark:border-white/10">
                  <td className="py-2 font-extrabold">{s.partnerName}</td>
                  <td className="py-2 font-bold">{s.phoneNumber || "—"}</td>
                  <td className="py-2 font-bold opacity-80">{s.notes || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <div className="text-xs opacity-70 font-bold mt-2">
            نکته: افزودن مورد جدید/ویرایش اطلاعات تأمین‌کننده در API فقط برای نقش Admin مجاز است.
          </div>
        </div>
      </ProModal>
    </div>
  );
}
