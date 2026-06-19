// pages/Products.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Product, NewProduct, Category, NotificationMessage, Partner } from '../../types';
import Notification from '../../components/Notification';
import Modal from '../../components/Modal';
import ModalField from '../../components/ModalField';
import ModalActions from '../../components/ModalActions';
import { formatIsoToShamsi } from '../../utils/dateUtils';
import { useAuth } from '../../contexts/AuthContext';
import { canManageProducts } from '../../utils/rbac';
import { apiFetch } from '../../utils/apiFetch';
import PriceInput from '../../components/PriceInput';
import HubCard from '../../components/HubCard';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { printArea } from '../../utils/printArea';
import { useStyle } from '../../contexts/StyleContext';
import ExportMenu from '../../components/ExportMenu';
import ColumnPicker from '../../components/ColumnPicker';
import FilterChipsBar from '../../components/FilterChipsBar';
import { exportToExcel, exportToPdfTable } from '../../utils/exporters';
import PageKit from '../../components/ui/PageKit';
import Button from '../../components/Button';

const columnHelper = createColumnHelper<Product>();

/* ───────────────────────────── جستجوی هوشمند فارسی + تصحیح املاء ───────────────────────────── */
const faDigitMap: Record<string, string> = {
  '۰': '0','۱': '1','۲': '2','۳': '3','۴': '4','۵': '5','۶': '6','۷': '7','۸': '8','۹': '9',
  '٠': '0','١': '1','٢': '2','٣': '3','٤': '4','٥': '5','٦': '6','٧': '7','٨': '8','٩': '9',
};
const faCharMap: Record<string, string> = {
  'ي':'ی','ك':'ک','ۀ':'ه','ة':'ه','ؤ':'و','أ':'ا','إ':'ا','آ':'ا','ى':'ی','‌':' ','ـ':'',
};
const normalizeFa = (s: string) => {
  if (!s) return '';
  let out = s.toLowerCase();
  out = out.replace(/[۰-۹٠-٩]/g, (m) => faDigitMap[m] ?? m);
  out = out.replace(/./g, (ch) => faCharMap[ch] ?? ch);
  // علائم و اعراب → فاصله
  out = out.replace(/[ًٌٍَُِّْ`~^'"،٬؛؟?.…,/\\\-+=(){}\[\]|:!@#$%&*<>؛٫٬]/g, ' ');
  return out.replace(/\s+/g, ' ').trim();
};
// Damerau–Levenshtein: تحمل غلط تایپی (جابجایی/حذف مورد/افزودن مورد جدید/جایگزینی یک‌حرفه)
const dl = (a: string, b: string) => {
  const al = a.length, bl = b.length;
  const INF = al + bl;
  const da: Record<string, number> = {};
  const dp = Array.from({ length: al + 2 }, () => new Array(bl + 2).fill(0));
  dp[0][0] = INF;
  for (let i = 0; i <= al; i++) { dp[i+1][1] = i; dp[i+1][0] = INF; }
  for (let j = 0; j <= bl; j++) { dp[1][j+1] = j; dp[0][j+1] = INF; }
  for (let i = 1; i <= al; i++) {
    let db = 0;
    for (let j = 1; j <= bl; j++) {
      const i1 = da[b[j-1]] ?? 0;
      const j1 = db;
      const cost = a[i-1] === b[j-1] ? (db = j, 0) : 1;
      dp[i+1][j+1] = Math.min(
        dp[i][j] + cost,                 // جایگزینی
        dp[i+1][j] + 1,                  // درج
        dp[i][j+1] + 1,                  // حذف مورد
        dp[i1][j1] + (i - i1 - 1) + 1 + (j - j1 - 1) // جابجایی
      );
    }
    da[a[i-1]] = i;
  }
  return dp[al+1][bl+1];
};
const approxIncludes = (indexed: string, token: string) => {
  if (!token) return true;
  if (indexed.includes(token)) return true;
  const maxD = token.length <= 4 ? 1 : token.length <= 7 ? 2 : 3;
  const words = indexed.split(' ');
  return words.some(w => Math.abs(w.length - token.length) <= maxD && dl(w, token) <= maxD);
};
/* ─────────────────────────────────────────────────────────────────────────────────────────── */

const Products: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const { token, authReady, currentUser } = useAuth();

  const canManage = canManageProducts(currentUser?.roleName);


  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [suppliers, setSuppliers] = useState<Partner[]>([]);
  const [allPartners, setAllPartners] = useState<Partner[]>([]);

  // Table State
  const [globalFilter, setGlobalFilter] = useState('');
  const [stockFilter, setStockFilter] = useState<'all' | 'low' | 'out'>('all');
  const [sorting, setSorting] = useState<SortingState>([]);
  const [columnVisibility, setColumnVisibility] = useState<Record<string, boolean>>(() => {
    try {
      return JSON.parse(localStorage.getItem('products.columns') || '{}');
    } catch {
      return {};
    }
  });

  useEffect(() => {
    try {
      localStorage.setItem('products.columns', JSON.stringify(columnVisibility));
    } catch {}
  }, [columnVisibility]);

  // UI State
  const [isProductModalOpen, setIsProductModalOpen] = useState(false);
  const [isManagementModalOpen, setIsManagementModalOpen] = useState(false);
  const [activeMgmtTab, setActiveMgmtTab] = useState<'categories' | 'suppliers'>('categories');
  const [modalMode, setModalMode] = useState<'add' | 'edit'>('add');
  const { style: ui } = useStyle();
  const H = ui.primaryHue; // Hue برند از ستینگ
  const brandGrad = { background: 'rgb(15 23 42)' };
  const brandColor = { color: `hsl(${H} 90% 40%)` };
  const brandBorder = { borderColor: `hsl(${H} 90% 40%)` };

  // Form & Modal State
  const initialNewProductState: NewProduct = { name: '', purchasePrice: 0, sellingPrice: 0, stock_quantity: 0, categoryId: '', supplierId: '' };
  const [newProduct, setNewProduct] = useState<NewProduct>(initialNewProductState);
  const [editingProduct, setEditingProduct] = useState<Partial<Product>>({});
  const [formErrors, setFormErrors] = useState<Partial<Record<keyof Product, string>>>({});

  // Category/Supplier Management State
  const [newCategoryName, setNewCategoryName] = useState('');
  const [newSupplierName, setNewSupplierName] = useState('');
  const [categoryFormError, setCategoryFormError] = useState<string | null>(null);
  const [supplierFormError, setSupplierFormError] = useState<string | null>(null);
  const [editingItem, setEditingItem] = useState<{ id: number; name: string; type: 'category' | 'supplier' } | null>(null);
  const [editItemName, setEditItemName] = useState('');

  // Loading & Notification State
  const [isFetching, setIsFetching] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  // Submission State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmittingCategory, setIsSubmittingCategory] = useState(false);
  const [isSubmittingSupplier, setIsSubmittingSupplier] = useState(false);
  const [isSubmittingEdit, setIsSubmittingEdit] = useState(false);

  // Delete Modal State
  const [deletingItem, setDeletingItem] = useState<{ id: number; name: string; type: 'category' | 'supplier' | 'product' } | null>(null);
  const [isSubmittingDelete, setIsSubmittingDelete] = useState(false);

  // Barcode State
  const [isBarcodeModalOpen, setIsBarcodeModalOpen] = useState(false);
  const [selectedProductForBarcode, setSelectedProductForBarcode] = useState<Product | null>(null);

  // --- Data Fetching ---
  const fetchData = async () => {
    setIsFetching(true);
    try {
      const [productsRes, categoriesRes, partnersRes] = await Promise.all([
        apiFetch('/api/products'),
        apiFetch('/api/categories'),
        apiFetch('/api/partners'),
      ]);

      const productsResult = await productsRes.json();
      if (!productsRes.ok || !productsResult.success) throw new Error(productsResult.message || 'خطا در دریافت محصولات');
      setProducts(productsResult.data);

      const categoriesResult = await categoriesRes.json();
      if (!categoriesRes.ok || !categoriesResult.success) throw new Error(categoriesResult.message || 'خطا در دریافت دسته‌بندی‌ها');
      setCategories(categoriesResult.data);

      const partnersResult = await partnersRes.json();
      if (!partnersRes.ok || !partnersResult.success) throw new Error(partnersResult.message || 'خطا در دریافت همکاران');
      setAllPartners(partnersResult.data);
      setSuppliers(partnersResult.data.filter((p: Partner) => p.partnerType === 'Supplier'));
    } catch (error) {
      displayError(error, 'خطا در دریافت اطلاعات اولیه صفحه.');
    } finally {
      setIsFetching(false);
    }
  };

  useEffect(() => {
    if (!authReady) return;
    if (!token) {
      setIsFetching(false);
      setNotification({ type: 'info', text: 'برای مشاهده اطلاعات، لطفاً ابتدا وارد شوید.' });
      return;
    }
    fetchData();
  }, [authReady, token]);

  useEffect(() => {
    const searchFromUrl = searchParams.get('search') || '';
    if (searchFromUrl !== globalFilter) {
      setGlobalFilter(searchFromUrl);
    }
  }, [searchParams]); // eslint-disable-line

  // --- Util & Formatting ---
  const displayError = (error: any, defaultMessage: string) => {
    console.error(`Error:`, error);
    let displayMessage = defaultMessage;
    if (error?.message) {
      if (String(error.message).toLowerCase().includes('failed to fetch')) displayMessage = 'خطا در ارتباط با سرور.';
      else displayMessage = error.message;
    }
    setNotification({ type: 'error', text: displayMessage });
  };

  const formatPrice = (price: number | null) => (price ?? 0).toLocaleString('fa-IR') + ' تومان';

  // --- Quick Sell ---
  const handleSellProduct = (product: Product) => {
    if ((product.stock_quantity ?? 0) <= 0) {
      setNotification({ type: 'warning', text: 'موجودی محصول برای فروش کافی نیست.' });
      return;
    }
    if (!product.sellingPrice || product.sellingPrice <= 0) {
      setNotification({ type: 'warning', text: 'این محصول قیمت فروش معتبر ندارد و قابل فروش نیست.' });
      return;
    }
    const sellable = {
      id: product.id,
      type: 'inventory',
      name: product.name,
      price: product.sellingPrice,
      stock: product.stock_quantity,
      purchasePrice: Number(product.purchasePrice) || 0,
    };
    navigate('/sales', { state: { prefillItem: sellable } });
  };

  // --- Barcode helpers ---
  const openBarcodeModal = (product: Product) => {
    setSelectedProductForBarcode(product);
    setIsBarcodeModalOpen(true);
  };
  const handlePrintBarcode = () => {
    if (!selectedProductForBarcode) return;
    printArea('#barcode-label-content', { paper: '58mm', title: selectedProductForBarcode.name });
  };
  const handlePrintAllBarcodes = () => {
    if (products.length === 0) {
      setNotification({ type: 'info', text: 'هیچ محصولی برای چاپ وجود ندارد.' });
      return;
    }
    const allProductIds = products.map(p => p.id).join(',');
    navigate(`/tools/labelprint?ids=${allProductIds}`);
  };

  // --- Product Modal Logic ---
  const openProductModal = (mode: 'add' | 'edit', product: Product | null = null) => {
    setModalMode(mode);
    setFormErrors({});
    if (mode === 'edit' && product) {
      setEditingProduct({ ...product });
    } else {
      setNewProduct(initialNewProductState);
    }
    setIsProductModalOpen(true);
  };
  const closeProductModal = () => {
    setIsProductModalOpen(false);
    setNewProduct(initialNewProductState);
    setEditingProduct({});
    setFormErrors({});
  };
  const handleProductFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement> | { target: { name: string; value: string } },
  ) => {
    const { name, value } = e.target;
    const isNumeric = ['purchasePrice', 'sellingPrice', 'stock_quantity'].includes(name);
    const processedValue = isNumeric ? (value === '' ? '' : Number(value)) : value;

    if (modalMode === 'add') setNewProduct(prev => ({ ...prev, [name]: processedValue }));
    else setEditingProduct(prev => ({ ...prev, [name]: processedValue }));

    if (formErrors[name as keyof typeof formErrors]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };
  const validateProductForm = (productData: NewProduct | Partial<Product>): boolean => {
    const errors: Partial<Record<keyof Product, string>> = {};
    if (!productData.name?.trim()) errors.name = 'نام محصول نمی‌تواند خالی باشد.';
    if (typeof productData.purchasePrice !== 'number' || productData.purchasePrice < 0) errors.purchasePrice = 'قیمت خرید باید عددی غیرمنفی باشد.';
    if ((productData.purchasePrice ?? 0) > 0 && !productData.supplierId) errors.supplierId = 'برای ثبت اطلاعات قیمت خرید، انتخاب تامین‌کننده الزامی است.';
    if (typeof productData.sellingPrice !== 'number' || productData.sellingPrice <= 0) errors.sellingPrice = 'قیمت فروش باید عددی بزرگتر از صفر باشد.';
    if (typeof productData.stock_quantity !== 'number' || productData.stock_quantity < 0 || !Number.isInteger(productData.stock_quantity)) errors.stock_quantity = 'تعداد موجودی باید یک عدد صحیح و غیرمنفی باشد.';
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };
  const handleProductFormSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const productData = modalMode === 'add' ? newProduct : editingProduct;
    if (!validateProductForm(productData)) return;

    setIsSubmitting(true);
    setNotification(null);

    try {
      const url = modalMode === 'add' ? '/api/products' : `/api/products/${editingProduct.id}`;
      const method = modalMode === 'add' ? 'POST' : 'PUT';
      const payload = {
        ...productData,
        categoryId: (productData as any).categoryId || null,
        supplierId: (productData as any).supplierId || null,
      };
      await apiFetch(url, { method, body: JSON.stringify(payload) });
      setNotification({ type: 'success', text: `محصول با موفقیت ${modalMode === 'add' ? 'اضافه' : 'ویرایش اطلاعات'} شد!` });
      closeProductModal();
      await fetchData();
    } catch (error) {
      displayError(error, `یک خطا در عملیاتی ناشناخته در هنگام ${modalMode === 'add' ? 'افزودن مورد جدید' : 'ویرایش اطلاعات'} محصول رخ داد.`);
    } finally {
      setIsSubmitting(false);
    }
  };

  // --- Category/Supplier CRUD ---
  const handleCategorySubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCategoryName.trim()) {
      setCategoryFormError('نام دسته‌بندی نمی‌تواند خالی باشد.');
      return;
    }
    setIsSubmittingCategory(true);
    try {
      await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: newCategoryName.trim() }) });
      setNotification({ type: 'success', text: 'دسته‌بندی با موفقیت اضافه شد!' });
      setNewCategoryName('');
      setCategoryFormError(null);
      await fetchData();
    } catch (error) {
      displayError(error, 'خطا در ثبت اطلاعات دسته‌بندی.');
    } finally {
      setIsSubmittingCategory(false);
    }
  };

  const handleSupplierSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSupplierName.trim()) {
      setSupplierFormError('نام تامین‌کننده نمی‌تواند خالی باشد.');
      return;
    }
    setIsSubmittingSupplier(true);
    try {
      await apiFetch('/api/partners', { method: 'POST', body: JSON.stringify({ partnerName: newSupplierName.trim(), partnerType: 'Supplier' }) });
      setNotification({ type: 'success', text: 'تامین‌کننده با موفقیت اضافه شد!' });
      setNewSupplierName('');
      setSupplierFormError(null);
      await fetchData();
    } catch (error) {
      displayError(error, 'خطا در ثبت اطلاعات تامین‌کننده.');
    } finally {
      setIsSubmittingSupplier(false);
    }
  };

  const handleStartEdit = (item: { id: number; name: string }, type: 'category' | 'supplier') => {
    setEditingItem({ id: item.id, name: item.name, type });
    setEditItemName(item.name);
  };
  const handleCancelEdit = () => {
    setEditingItem(null);
    setEditItemName('');
  };
  const handleUpdateItem = async () => {
    if (!editingItem || !editItemName.trim()) {
      setNotification({ type: 'warning', text: 'نام آیتم نمی‌تواند خالی باشد.' });
      return;
    }
    setIsSubmittingEdit(true);
    setNotification(null);
    try {
      let url = '';
      let payload: any = {};
      if (editingItem.type === 'category') {
        url = `/api/categories/${editingItem.id}`;
        payload = { name: editItemName.trim() };
      } else {
        url = `/api/partners/${editingItem.id}`;
        const partnerToUpdate = allPartners.find(p => p.id === editingItem.id);
        if (!partnerToUpdate) throw new Error('تامین‌کننده برای ویرایش اطلاعات یافت نشد.');
        payload = {
          partnerName: editItemName.trim(),
          partnerType: partnerToUpdate.partnerType,
          contactPerson: partnerToUpdate.contactPerson || '',
          phoneNumber: partnerToUpdate.phoneNumber || '',
          email: partnerToUpdate.email || '',
          address: partnerToUpdate.address || '',
          notes: partnerToUpdate.notes || '',
        };
      }
      await apiFetch(url, { method: 'PUT', body: JSON.stringify(payload) });
      setNotification({ type: 'success', text: `"${editingItem.name}" با موفقیت ویرایش شد.` });
      handleCancelEdit();
      await fetchData();
    } catch (error) {
      displayError(error, `خطا در ویرایش اطلاعات آیتم.`);
    } finally {
      setIsSubmittingEdit(false);
    }
  };

  const handleConfirmDelete = async () => {
    if (!deletingItem) return;
    setIsSubmittingDelete(true);
    try {
      const url =
        deletingItem.type === 'product'
          ? `/api/products/${deletingItem.id}`
          : deletingItem.type === 'category'
          ? `/api/categories/${deletingItem.id}`
          : `/api/partners/${deletingItem.id}`;
      await apiFetch(url, { method: 'DELETE' });
      setNotification({ type: 'success', text: `"${deletingItem.name}" با موفقیت حذف شد.` });
      setDeletingItem(null);
      await fetchData();
    } catch (error) {
      displayError(error, `خطا در حذف مورد "${deletingItem.name}".`);
    } finally {
      setIsSubmittingDelete(false);
    }
  };

  /* ───────────────────────────── ایندکس و فیلتر فازیِ فارسی ───────────────────────────── */
  // ایندکس نرمال‌شده برای هر محصول
  const indexed = useMemo(() => {
    return products.map((p) => ({
      ...p,
      __index: normalizeFa(
        `${p.name ?? ''} ${p.categoryName ?? ''} ${p.supplierName ?? ''} ${p.id ?? ''} ${p.barcode ?? ''} ${p.sku ?? ''}`
      ),
    }));
  }, [products]);

  // واژه‌نامه برای پیشنهاد «منظور شما؟»
  const corpusWords = useMemo(() => {
    const bag = new Set<string>();
    indexed.forEach((p) => p.__index.split(' ').forEach((w) => w && bag.add(w)));
    return Array.from(bag);
  }, [indexed]);

  const [suggestion, setSuggestion] = useState<string | null>(null);

  // آرایهٔ نهایی بعد از فیلتر (به جدول می‌دهیم)
  const filteredProducts = useMemo(() => {
    const q = normalizeFa(globalFilter);
    if (!q) { setSuggestion(null); return products; }

    const tokens = q.split(' ').filter(Boolean);
    const results = indexed.filter((p) => tokens.every((t) => approxIncludes(p.__index, t)));

    if (results.length === 0 && tokens.length > 0) {
      const last = tokens[tokens.length - 1];
      let best = ''; let bestD = Infinity;
      for (const w of corpusWords) {
        const d = dl(last, w);
        if (d < bestD) { bestD = d; best = w; if (d === 1) break; }
      }
      const maxD = last.length <= 4 ? 1 : 2;
      setSuggestion(best && bestD <= maxD ? best : null);
    } else {
      setSuggestion(null);
    }

    return results.map(({ __index, ...p }) => p);
  }, [globalFilter, indexed, corpusWords, products]);

  const visibleProducts = useMemo(() => {
    if (stockFilter === 'all') return filteredProducts;
    if (stockFilter === 'out') return filteredProducts.filter(p => (p.stock_quantity ?? 0) <= 0);
    // low
    return filteredProducts.filter(p => {
      const s = p.stock_quantity ?? 0;
      return s > 0 && s <= 5;
    });
  }, [filteredProducts, stockFilter]);

  const stockChipMeta = useMemo(() => {
    const all = filteredProducts.length;
    const out = filteredProducts.filter(p => (p.stock_quantity ?? 0) <= 0).length;
    const low = filteredProducts.filter(p => {
      const s = p.stock_quantity ?? 0;
      return s > 0 && s <= 5;
    }).length;
    return { all, low, out };
  }, [filteredProducts]);

  // --- Table Definition ---
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'نام محصول' }),
      columnHelper.accessor('categoryName', { header: 'دسته‌بندی', cell: info => info.getValue() || '-' }),
      columnHelper.accessor('supplierName', { header: 'تامین‌کننده', cell: info => info.getValue() || '-' }),
      columnHelper.accessor('purchasePrice', { header: 'قیمت خرید', cell: info => formatPrice(info.getValue()) }),
      columnHelper.accessor('sellingPrice', { header: 'قیمت فروش', cell: info => formatPrice(info.getValue()) }),
      columnHelper.accessor('stock_quantity', {
        header: 'موجودی',
        cell: info => {
          const stock = info.getValue();
          const color = stock <= 5 ? 'text-red-500' : stock <= 20 ? 'text-yellow-500' : 'text-green-500';
          return <span className={`font-semibold ${color}`}>{(stock ?? 0).toLocaleString('fa-IR')}</span>;
        },
      }),
      columnHelper.accessor('date_added', { header: 'تاریخ ثبت اطلاعات', cell: info => formatIsoToShamsi(info.getValue()) }),
      columnHelper.display({
        id: 'actions',
        header: 'عملیات',
        cell: ({ row }) => (
          <div className="ux-table-row-actions inventory-table-row-actions">
            <Button
              onClick={() => handleSellProduct(row.original)}
              disabled={(row.original.stock_quantity ?? 0) <= 0}
              variant="success"
              size="icon"
              className="inventory-table-action-btn"
              title="فروش محصول"
              leftIcon={<i className="fas fa-cash-register" />}
            />
            <Button
              onClick={() => openBarcodeModal(row.original)}
              variant="secondary"
              size="icon"
              className="inventory-table-action-btn"
              title="چاپ بارکد"
              leftIcon={<i className="fas fa-barcode" />}
            />
            {canManage && (
              <Button
                onClick={() => openProductModal('edit', row.original)}
                variant="warning"
                size="icon"
                className="inventory-table-action-btn"
                title="ویرایش اطلاعات محصول"
                leftIcon={<i className="fas fa-edit" />}
              />
            )}
            {canManage && (
              <Button
                onClick={() => setDeletingItem({ id: row.original.id, name: row.original.name, type: 'product' })}
                variant="danger"
                size="icon"
                className="inventory-table-action-btn"
                title="حذف مورد محصول"
                leftIcon={<i className="fas fa-trash" />}
              />
            )}
          </div>
        ),
      }),
    ],
    [suppliers, categories, canManage],
  );

  // ⚠️ دادهٔ جدول = visibleProducts (نه products). globalFilter داخلی TanStack استفاده نمی‌شود.
  const table = useReactTable({
    data: visibleProducts,
    columns,
    state: { sorting, columnVisibility },
    onSortingChange: setSorting,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  const exportFilenameBase = `products-${new Date().toISOString().slice(0, 10)}`;
  const exportRows = visibleProducts.map((p) => ({
    name: p.name,
    category: p.categoryName ?? '-',
    supplier: p.supplierName ?? '-',
    purchasePrice: p.purchasePrice ?? 0,
    sellingPrice: p.sellingPrice ?? 0,
    stock: p.stock_quantity ?? 0,
    dateAdded: formatIsoToShamsi(p.date_added),
  }));

  const doExportExcel = () => {
    exportToExcel(
      `${exportFilenameBase}.xlsx`,
      exportRows,
      [
        { header: 'نام محصول', key: 'name' },
        { header: 'دسته‌بندی', key: 'category' },
        { header: 'تامین‌کننده', key: 'supplier' },
        { header: 'قیمت خرید', key: 'purchasePrice' },
        { header: 'قیمت فروش', key: 'sellingPrice' },
        { header: 'موجودی', key: 'stock' },
        { header: 'تاریخ ثبت اطلاعات', key: 'dateAdded' },
      ],
      'Products',
    );
  };

  const doExportPdf = () => {
    exportToPdfTable({
      filename: `${exportFilenameBase}.pdf`,
      title: 'لیست محصولات',
      head: ['نام', 'دسته‌بندی', 'تامین‌کننده', 'قیمت فروش', 'موجودی'],
      body: exportRows.map((r) => [
        r.name,
        r.category,
        r.supplier,
        Number(r.sellingPrice || 0).toLocaleString('fa-IR'),
        Number(r.stock || 0).toLocaleString('fa-IR'),
      ]),
    });
  };

  // --- Render ---
  return (
    <PageKit
      className="inventory-products-foundation inventory-products-manager"
      title="کالاها"
      subtitle="مدیریت موجودی، قیمت‌گذاری، بارکد و دسته‌بندی"
      icon={<i className="fa-solid fa-cube" />}
      query={globalFilter}
      onQueryChange={(v) => setGlobalFilter(v)}
      searchPlaceholder="جستجو هوشمند فارسی… (نام، دسته، تامین‌کننده، بارکد)"
      isLoading={isFetching}
      isEmpty={!isFetching && (!token || table.getRowModel().rows.length === 0)}
      emptyTitle={!token ? "برای مشاهدهٔ محصولات باید وارد شوید" : "چیزی پیدا نشد"}
      emptyDescription={!token ? "ابتدا وارد حساب کاربری شوید تا لیست محصولات نمایش داده شود." : "هیچ محصولی مطابق فیلتر/جستجوی شما وجود ندارد."}
      emptyActionLabel={!token ? "رفتن به ورود" : undefined}
      onEmptyAction={() => {
        if (!token) navigate('/login');
      }}
      toolbarRight={
<>
              <ExportMenu
                className="whitespace-nowrap"
                items={[
                  { key: 'excel', label: 'Excel (XLSX)', icon: 'fa-file-excel', onClick: doExportExcel, disabled: visibleProducts.length === 0 },
                  { key: 'pdf', label: 'PDF (جدول)', icon: 'fa-file-pdf', onClick: doExportPdf, disabled: visibleProducts.length === 0 },
                  { key: 'print', label: 'چاپ لیست', icon: 'fa-print', onClick: () => printArea('#products-print-area', { title: 'لیست محصولات' }), disabled: visibleProducts.length === 0 },
                ]}
              />
              <ColumnPicker table={table} storageKey="products.columns" />
              <Button
                onClick={handlePrintAllBarcodes}
                variant="success"
                size="sm"
                leftIcon={<i className="fas fa-print" />}
                className="whitespace-nowrap"
              >
                چاپ بارکد همه
              </Button>
              <Button
                type="button"
                onClick={() => setIsManagementModalOpen(true)}
                variant="secondary"
                size="sm"
                leftIcon={<i className="fas fa-cogs" />}
                className="whitespace-nowrap"
              >
                مدیریت دسته‌بندی/تامین‌کننده
              </Button>

              {/* 🧪 TEST BUTTONS (debug) */}
              <Button
                type="button"
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('[TEST] open management modal');
                  setIsManagementModalOpen(true);
                }}
                variant="warning"
                size="sm"
                leftIcon={<i className="fa-solid fa-flask" />}
                className="whitespace-nowrap"
                title="دکمه بررسیی برای باز کردن مودال دسته‌بندی/تامین‌کننده"
              >
                بررسی و ادامه: باز کردن مدیریت
              </Button>

              <Button
                type="button"
                onClick={() => {
                  // eslint-disable-next-line no-console
                  console.log('[TEST] open add product modal');
                  openProductModal('add');
                }}
                variant="secondary"
                size="sm"
                leftIcon={<i className="fa-solid fa-flask" />}
                className="whitespace-nowrap"
                title="دکمه بررسیی برای باز کردن مودال افزودن مورد جدید محصول"
              >
                بررسی و ادامه: افزودن مورد جدید محصول
              </Button>
              {canManage && (
                <Button
                  type="button"
                  onClick={() => openProductModal('add')}
                  variant="primary"
                  size="sm"
                  leftIcon={<i className="fas fa-plus" />}
                  className="whitespace-nowrap"
                >
                  افزودن مورد جدید محصول
                </Button>
              )}
            </>
      }
      secondaryRow={
        <>
          <Notification message={notification} onClose={() => setNotification(null)} />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <HubCard
              title="کالاهای انبار"
              subtitle="مدیریت موجودی، قیمت، بارکد و دسته‌بندی"
              icon="fa-solid fa-cube"
              gradientFrom="from-sky-500"
              gradientTo="to-cyan-600"
              to="/products"
              active={location.pathname.startsWith('/products')}
            />
            <HubCard
              title="گوشی‌های موبایل"
              subtitle="مدیریت IMEI، وضعیت، خرید و فروش گوشی"
              icon="fa-solid fa-mobile-screen"
              gradientFrom="from-emerald-500"
              gradientTo="to-teal-600"
              to="/mobile-phones"
              active={location.pathname.startsWith('/mobile-phones')}
            />
          </div>
        </>
	  }
	>
	  <div className="app-card p-4 md:p-6">
        <div className="space-y-2">
              <FilterChipsBar
                value={stockFilter}
                onChange={(k) => setStockFilter(k as any)}
                chips={[
                  { key: 'all', label: 'همه', icon: 'fa-solid fa-list', count: stockChipMeta.all },
                  { key: 'low', label: 'کم موجودی', icon: 'fa-solid fa-triangle-exclamation', count: stockChipMeta.low },
                  { key: 'out', label: 'ناموجود', icon: 'fa-solid fa-ban', count: stockChipMeta.out },
                ]}
              />

              {suggestion ? (
                <Button
                  type="button"
                  onClick={() => {
                    const rawParts = globalFilter.trim().split(/\s+/).filter(Boolean);
                    if (rawParts.length === 0) {
                      setGlobalFilter(suggestion);
                    } else {
                      rawParts[rawParts.length - 1] = suggestion;
                      setGlobalFilter(rawParts.join(' '));
                    }
                    setSuggestion(null);
                  }}
                  variant="ghost"
                  size="xs"
                  className="w-fit rounded-full"
                  style={brandColor}
                  title="اعمال پیشنهاد و جستجو"
                  leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}
                >
                  منظور شما «{suggestion}» بود؟
                </Button>
              ) : null}
            </div>

        
          <>
            {/* Desktop: Table */}
            <div className="hidden md:block overflow-x-auto" id="products-print-area">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-100 dark:bg-gray-700">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-4 py-3 text-right font-semibold text-gray-600 dark:text-gray-300">
                          <div
                            {...{
                              className: header.column.getCanSort() ? 'w-full cursor-pointer select-none flex items-center justify-start gap-2 text-right' : 'w-full text-right',
                              onClick: header.column.getToggleSortingHandler(),
                            }}
                          >
                            {flexRender(header.column.columnDef.header, header.getContext())}
                            {{ asc: ' ↑', desc: ' ↓' }[header.column.getIsSorted() as string] ?? null}
                          </div>
                        </th>
                      ))}
                    </tr>
                  ))}
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="px-4 py-3 whitespace-nowrap text-gray-700 dark:text-gray-300">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Cards */}
            <div className="md:hidden space-y-4 p-4">
              {table.getRowModel().rows.map(row => {
                const p = row.original;
                return (
                  <div key={row.id} className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl p-4 shadow-sm space-y-3">
                    <div className="flex items-start justify-between">
                      <div className="min-w-0 flex-1">
                        <div className="font-bold text-gray-900 dark:text-gray-100 truncate">{p.name}</div>
                        <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {p.categoryName || 'بدون دسته‌بندی'} • {p.supplierName || 'بدون تامین‌کننده'}
                        </div>
                      </div>
                      <div className="mr-3">
                        <span className={`text-sm font-bold ${p.stock_quantity <= 5 ? 'text-red-500' : p.stock_quantity <= 20 ? 'text-yellow-500' : 'text-green-500'}`}>
                          {p.stock_quantity.toLocaleString('fa-IR')} عدد
                        </span>
                      </div>
                    </div>
                    
                    <div className="flex items-center justify-between py-2 border-y border-gray-100 dark:border-gray-700">
                      <div className="text-xs text-gray-500 dark:text-gray-400">قیمت فروش:</div>
                      <div className="text-sm font-black text-primary">{formatPrice(p.sellingPrice)}</div>
                    </div>

                    <div className="flex items-center justify-between gap-2 pt-1">
                      <div className="flex items-center gap-1">
                        <Button
                          onClick={() => handleSellProduct(p)}
                          disabled={(p.stock_quantity ?? 0) <= 0}
                          className="inventory-table-action-btn"
                          variant="success"
                          size="icon"
                          title="فروش محصول"
                          leftIcon={<i className="fas fa-cash-register" />}
                        />
                        <Button
                          onClick={() => openBarcodeModal(p)}
                          className="inventory-table-action-btn"
                          variant="secondary"
                          size="icon"
                          title="چاپ بارکد"
                          leftIcon={<i className="fas fa-barcode" />}
                        />
                      </div>
                      
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <Button
                            onClick={() => openProductModal('edit', p)}
                            className="inventory-table-action-btn"
                            variant="warning"
                            size="icon"
                            title="ویرایش اطلاعات محصول"
                            leftIcon={<i className="fas fa-edit" />}
                          />
                          <Button
                            onClick={() => setDeletingItem({ id: p.id, name: p.name, type: 'product' })}
                            className="inventory-table-action-btn"
                            variant="danger"
                            size="icon"
                            title="حذف مورد محصول"
                            leftIcon={<i className="fas fa-trash" />}
                          />
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>

        <div className="flex items-center justify-between p-4 border-t border-gray-200 dark:border-gray-700 text-sm">
          <div className="flex items-center gap-2">
            <Button
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="ux-pagination-btn"
              variant="secondary"
              size="xs"
              title="صفحه اول"
              leftIcon={<i className="fa-solid fa-angles-right" />}
            >
              اول
            </Button>
            <Button
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="ux-pagination-btn"
              variant="secondary"
              size="xs"
              title="صفحه قبل"
              leftIcon={<i className="fa-solid fa-chevron-right" />}
            >
              قبل
            </Button>
            <Button
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="ux-pagination-btn"
              variant="secondary"
              size="xs"
              title="صفحه بعد"
              leftIcon={<i className="fa-solid fa-chevron-left" />}
            >
              بعد
            </Button>
            <Button
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="ux-pagination-btn"
              variant="secondary"
              size="xs"
              title="صفحه آخر"
              leftIcon={<i className="fa-solid fa-angles-left" />}
            >
              آخر
            </Button>
          </div>
          <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
            <span>صفحه</span>
            <strong>
              {table.getState().pagination.pageIndex + 1} از {table.getPageCount().toLocaleString('fa')}
            </strong>
          </div>
          <select
            value={table.getState().pagination.pageSize}
            onChange={e => table.setPageSize(Number(e.target.value))}
            className="ux-select ux-pagination-select"
          >
            {[10, 20, 30, 40, 50].map(pageSize => (
              <option key={pageSize} value={pageSize}>
                نمایش {pageSize}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Modals */}
      {isProductModalOpen && (
        <Modal title={modalMode === 'add' ? 'ثبت اطلاعات محصول جدید در انبار' : `ویزایش محصول: ${editingProduct.name}`} onClose={closeProductModal} widthClass="max-w-3xl">
          <form onSubmit={handleProductFormSubmit} className="space-y-4 p-1">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-4">
              <ModalField label="نام محصول" iconClass="fa-solid fa-box" required error={formErrors.name}>
                <input
                  type="text"
                  name="name"
                  value={modalMode === 'add' ? newProduct.name : (editingProduct.name as string) || ''}
                  onChange={handleProductFormChange}
                  className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 ${formErrors.name ? 'border-red-500' : 'border-gray-300'}`}
                />
              </ModalField>
              <ModalField label="تعداد موجودی" iconClass="fa-solid fa-cubes" error={formErrors.stock_quantity}>
                <PriceInput
                  name="stock_quantity"
                  value={String(modalMode === 'add' ? newProduct.stock_quantity : (editingProduct.stock_quantity as number) || 0)}
                  onChange={handleProductFormChange}
                  className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-left ${formErrors.stock_quantity ? 'border-red-500' : 'border-gray-300'}`}
                  topLabel="موجودی"
                  suffix="عدد"
                  preview="مثلاً ۲۴"
                />
              </ModalField>
              <ModalField label="قیمت خرید (تومان)" iconClass="fa-solid fa-sack-dollar" error={formErrors.purchasePrice}>
                <PriceInput
                  name="purchasePrice"
                  value={modalMode === 'add' ? String(newProduct.purchasePrice) : String((editingProduct.purchasePrice as number) || '')}
                  onChange={handleProductFormChange}
                  className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-left ${formErrors.purchasePrice ? 'border-red-500' : 'border-gray-300'}`}
                />
              </ModalField>
              <ModalField label="قیمت فروش (تومان)" iconClass="fa-solid fa-tags" error={formErrors.sellingPrice}>
                <PriceInput
                  name="sellingPrice"
                  value={modalMode === 'add' ? String(newProduct.sellingPrice) : String((editingProduct.sellingPrice as number) || '')}
                  onChange={handleProductFormChange}
                  className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 text-left ${formErrors.sellingPrice ? 'border-red-500' : 'border-gray-300'}`}
                />
              </ModalField>
              <ModalField label="دسته‌بندی" iconClass="fa-solid fa-layer-group" error={formErrors.categoryId}>
                <select
                  name="categoryId"
                  value={modalMode === 'add' ? newProduct.categoryId || '' : (editingProduct.categoryId as string) || ''}
                  onChange={handleProductFormChange}
                  className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 ${formErrors.categoryId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">-- بدون دسته‌بندی --</option>
                  {categories.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </ModalField>
              <ModalField label="تامین‌کننده" iconClass="fa-solid fa-truck" error={formErrors.supplierId}>
                <select
                  name="supplierId"
                  value={modalMode === 'add' ? newProduct.supplierId || '' : (editingProduct.supplierId as string) || ''}
                  onChange={handleProductFormChange}
                  className={`w-full p-2 border rounded-md dark:bg-gray-700 dark:border-gray-600 ${formErrors.supplierId ? 'border-red-500' : 'border-gray-300'}`}
                >
                  <option value="">-- بدون تامین‌کننده --</option>
                  {suppliers.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.partnerName}
                    </option>
                  ))}
                </select>
              </ModalField>
            </div>
            <ModalActions onCancel={closeProductModal} submitText={modalMode === 'add' ? 'افزودن مورد جدید محصول' : 'ذخیره تغییرات تغییرات'} submittingText="در حال ذخیره تغییرات..." isSubmitting={isSubmitting} />
          </form>
        </Modal>
      )}

      {isManagementModalOpen && (
        <Modal
          title="مدیریت دسته‌بندی و تامین‌کنندگان"
          onClose={() => setIsManagementModalOpen(false)}
          widthClass="max-w-4xl"
        >
          <div className="px-4 pt-2">
            {/* Segmented Tabs */}
            <div className="flex justify-center">
              <div className="inline-flex items-center rounded-full bg-gray-100 dark:bg-gray-700 p-1">
                <Button
                  type="button"
                  onClick={() => setActiveMgmtTab('categories')}
                  variant={activeMgmtTab === 'categories' ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-full"
                  style={activeMgmtTab === 'categories' ? brandGrad : undefined}
                  leftIcon={<i className="fa-solid fa-layer-group" />}
                >
                  دسته‌بندی‌ها
                </Button>

                <Button
                  type="button"
                  onClick={() => setActiveMgmtTab('suppliers')}
                  variant={activeMgmtTab === 'suppliers' ? 'primary' : 'secondary'}
                  size="sm"
                  className="rounded-full"
                  style={activeMgmtTab === 'suppliers' ? brandGrad : undefined}
                  leftIcon={<i className="fa-solid fa-truck" />}
                >
                  تامین‌کنندگان
                </Button>
              </div>
            </div>

            <div className="mt-5 space-y-6">
              {/* =============== CATEGORIES =============== */}
              {activeMgmtTab === 'categories' && (
                <div className="space-y-4">
                  <form onSubmit={handleCategorySubmit} className="flex flex-col sm:flex-row items-stretch gap-2 app-card-muted p-3 rounded-2xl">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-folder-open ux-input-affix-icon ux-input-affix-icon--left" />
                      <input
                        value={newCategoryName}
                        onChange={(e) => setNewCategoryName(e.target.value)}
                        preview="نام دسته‌بندی"
                        className="ux-input-affix-target--left w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 text-sm outline-none   dark:border-gray-600 dark:bg-gray-700"
                        style={{ ...brandBorder }}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmittingCategory}
                      loading={isSubmittingCategory}
                      loadingText="در حال ثبت اطلاعات…"
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                      leftIcon={<i className="fas fa-plus" />}
                    >
                      افزودن مورد جدید دسته‌بندی
                    </Button>
                  </form>
                  {categoryFormError && <p className="text-xs text-red-500">{categoryFormError}</p>}

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-right text-gray-600 dark:text-gray-300">
                          <th className="py-2 w-14">#</th>
                          <th className="py-2">نام</th>
                          <th className="py-2 w-48 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {categories.map((c, idx) => {
                          const isEditing = editingItem?.type === 'category' && editingItem?.id === c.id;
                          return (
                            <tr key={c.id} className="odd:bg-gray-50/60 dark:odd:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-700/60 transition">
                              <td className="py-2 pr-2">{idx + 1}</td>
                              <td className="py-2">
                                {isEditing ? (
                                  <input
                                    value={editItemName}
                                    onChange={(e) => setEditItemName(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 outline-none "
                                    style={brandBorder}
                                  />
                                ) : (
                                  <span className="font-medium text-gray-800 dark:text-gray-200">{c.name}</span>
                                )}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center justify-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <Button
                                        onClick={handleUpdateItem}
                                        disabled={isSubmittingEdit}
                                        loading={isSubmittingEdit}
                                        loadingText="ثبت اطلاعات…"
                                        variant="primary"
                                        size="xs"
                                        className="rounded-full"
                                        style={brandGrad}
                                        leftIcon={<i className="fa-solid fa-floppy-disk" />}
                                      >
                                        ذخیره تغییرات
                                      </Button>
                                      <Button
                                        onClick={handleCancelEdit}
                                        type="button"
                                        variant="secondary"
                                        size="xs"
                                        className="rounded-full"
                                        leftIcon={<i className="fa-solid fa-xmark" />}
                                      >
                                        انصراف
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        onClick={() => handleStartEdit({ id: c.id, name: c.name }, 'category')}
                                        variant="warning"
                                        size="xs"
                                        className="rounded-full"
                                        style={{ ...brandBorder, ...brandColor }}
                                        leftIcon={<i className="fa-solid fa-pen-to-square" />}
                                      >
                                        ویرایش اطلاعات
                                      </Button>
                                      <Button
                                        onClick={() => setDeletingItem({ id: c.id, name: c.name, type: 'category' })}
                                        variant="danger"
                                        size="xs"
                                        className="rounded-full"
                                        leftIcon={<i className="fa-solid fa-trash" />}
                                      >
                                        حذف مورد
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {categories.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-gray-500">هیچ دسته‌بندی‌ای ثبت اطلاعات نشده است.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* =============== SUPPLIERS =============== */}
              {activeMgmtTab === 'suppliers' && (
                <div className="space-y-4">
                  <form onSubmit={handleSupplierSubmit} className="flex flex-col sm:flex-row items-stretch gap-2 app-card-muted p-3 rounded-2xl">
                    <div className="relative flex-1">
                      <i className="fa-solid fa-truck ux-input-affix-icon ux-input-affix-icon--left" />
                      <input
                        value={newSupplierName}
                        onChange={(e) => setNewSupplierName(e.target.value)}
                        preview="نام تامین‌کننده"
                        className="ux-input-affix-target--left w-full rounded-lg border border-gray-300 bg-white py-2 pr-3 text-sm outline-none   dark:border-gray-600 dark:bg-gray-700"
                        style={{ ...brandBorder }}
                      />
                    </div>
                    <Button
                      type="submit"
                      disabled={isSubmittingSupplier}
                      loading={isSubmittingSupplier}
                      loadingText="در حال ثبت اطلاعات…"
                      variant="primary"
                      size="sm"
                      className="shrink-0"
                      leftIcon={<i className="fas fa-plus" />}
                    >
                      افزودن مورد جدید تامین‌کننده
                    </Button>
                  </form>
                  {supplierFormError && <p className="text-xs text-red-500">{supplierFormError}</p>}

                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead>
                        <tr className="text-right text-gray-600 dark:text-gray-300">
                          <th className="py-2 w-14">#</th>
                          <th className="py-2">نام</th>
                          <th className="py-2 w-48 text-center">عملیات</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                        {suppliers.map((s, idx) => {
                          const isEditing = editingItem?.type === 'supplier' && editingItem?.id === s.id;
                          return (
                            <tr key={s.id} className="odd:bg-gray-50/60 dark:odd:bg-gray-800/40 hover:bg-gray-100/70 dark:hover:bg-gray-700/60 transition">
                              <td className="py-2 pr-2">{idx + 1}</td>
                              <td className="py-2">
                                {isEditing ? (
                                  <input
                                    value={editItemName}
                                    onChange={(e) => setEditItemName(e.target.value)}
                                    className="w-full rounded-md border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 px-2 py-1 outline-none "
                                    style={brandBorder}
                                  />
                                ) : (
                                  <span className="font-medium text-gray-800 dark:text-gray-200">
                                    {s.partnerName}
                                  </span>
                                )}
                              </td>
                              <td className="py-2">
                                <div className="flex items-center justify-center gap-2">
                                  {isEditing ? (
                                    <>
                                      <Button
                                        onClick={handleUpdateItem}
                                        disabled={isSubmittingEdit}
                                        loading={isSubmittingEdit}
                                        loadingText="ثبت اطلاعات…"
                                        variant="primary"
                                        size="xs"
                                        className="rounded-full"
                                        style={brandGrad}
                                        leftIcon={<i className="fa-solid fa-floppy-disk" />}
                                      >
                                        ذخیره تغییرات
                                      </Button>
                                      <Button
                                        onClick={handleCancelEdit}
                                        type="button"
                                        variant="secondary"
                                        size="xs"
                                        className="rounded-full"
                                        leftIcon={<i className="fa-solid fa-xmark" />}
                                      >
                                        انصراف
                                      </Button>
                                    </>
                                  ) : (
                                    <>
                                      <Button
                                        onClick={() => handleStartEdit({ id: s.id, name: s.partnerName }, 'supplier')}
                                        variant="warning"
                                        size="xs"
                                        className="rounded-full"
                                        style={{ ...brandBorder, ...brandColor }}
                                        leftIcon={<i className="fa-solid fa-pen-to-square" />}
                                      >
                                        ویرایش اطلاعات
                                      </Button>
                                      <Button
                                        onClick={() => setDeletingItem({ id: s.id, name: s.partnerName, type: 'supplier' })}
                                        variant="danger"
                                        size="xs"
                                        className="rounded-full"
                                        leftIcon={<i className="fa-solid fa-trash" />}
                                      >
                                        حذف مورد
                                      </Button>
                                    </>
                                  )}
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                        {suppliers.length === 0 && (
                          <tr>
                            <td colSpan={3} className="py-6 text-center text-gray-500">هیچ تامین‌کننده‌ای ثبت اطلاعات نشده است.</td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        </Modal>
      )}

      {deletingItem && (
        <Modal title={`تایید حذف مورد "${deletingItem.name}"`} onClose={() => setDeletingItem(null)}>
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">آیا از حذف مورد این آیتم مطمئن هستید؟ این عمل قابل بازگشت نیست.</p>
          <ModalActions
            onCancel={() => setDeletingItem(null)}
            cancelText="انصراف"
            submitText="تایید و حذف مورد"
            submittingText="در حال حذف مورد..."
            isSubmitting={isSubmittingDelete}
            submitDisabled={isSubmittingDelete}
            submitVariant="danger"
            submitType="button"
            submitIconClass="fa-solid fa-trash"
            onSubmitClick={handleConfirmDelete}
          />
        </Modal>
      )}

      {/* Barcode Modal */}
      {isBarcodeModalOpen && selectedProductForBarcode && (
        <Modal title={`بارکد برای: ${selectedProductForBarcode.name}`} onClose={() => setIsBarcodeModalOpen(false)} widthClass="max-w-sm" wrapperClassName="printable-area">
          <div id="barcode-label-content" className="label-58 text-center">
            <img src={`/api/barcode/product/${selectedProductForBarcode.id}`} alt={`Barcode for ${selectedProductForBarcode.name}`} className="mx-auto" />
            <p className="mt-2 font-semibold text-lg">{selectedProductForBarcode.name}</p>
            <p className="text-md text-gray-600">{formatPrice(selectedProductForBarcode.sellingPrice)}</p>
          </div>
          <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-700 print:hidden">
            <Button type="button" onClick={handlePrintBarcode} variant="primary" size="md" leftIcon={<i className="fas fa-print" />}>
              چاپ برچسب
            </Button>
          </div>
        </Modal>
      )}
    </PageKit>
  );
};

export default Products;