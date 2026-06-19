// pages/Products.tsx
import React, { useState, useEffect, useMemo } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import { Product, NewProduct, Category, NotificationMessage, Partner } from '../types';
import Notification from '../components/Notification';
import InventoryModal from '../components/InventoryModal';
import { formatIsoToShamsi } from '../utils/dateUtils';
import { useAuth } from '../contexts/AuthContext';
import { canManageProducts } from '../utils/rbac';
import { apiFetch } from '../utils/apiFetch';
import { parseApiResult, runWithFeedback } from '../utils/feedback';
import HubCard from '../components/HubCard';
import {
  createColumnHelper,
  useReactTable,
  getCoreRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  flexRender,
  SortingState,
} from '@tanstack/react-table';
import { printArea } from '../utils/printArea';
import { useStyle } from '../contexts/StyleContext';
import ExportMenu from '../components/ExportMenu';
import ColumnPicker from '../components/ColumnPicker';
import FilterChipsBar from '../components/FilterChipsBar';
import { exportToExcel, exportToPdfTable } from '../utils/exporters';
import { getImportCell, isoToday, isImportBlank, normalizeImportText, parseImportInteger, parseImportNumber, readSpreadsheetRows, ImportSheetRow, exportRoundtripExcel } from '../utils/dataImportExport';
import PageKit from '../components/ui/PageKit';
import ModalField from '../components/ModalField';
import Button from '../components/Button';
import ModalActions from '../components/ModalActions';
import TextField from '../components/ui/TextField';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';
const columnHelper = createColumnHelper<Product>();

const PRODUCT_UNIT_OPTIONS = ['عدد', 'دستگاه', 'کارتن'] as const;


type InventoryStatCardProps = {
  title: string;
  value: string;
  hint: string;
  icon: string;
  tone?: 'primary' | 'success' | 'warning' | 'neutral';
  compact?: boolean;
};

const STAT_TONES: Record<NonNullable<InventoryStatCardProps['tone']>, { card: string; iconWrap: string; icon: string; dot: string }> = {
  primary: {
    card: 'border-slate-200/80 bg-white',
    iconWrap: 'border-indigo-200 bg-white/80',
    icon: 'text-indigo-600',
    dot: 'bg-indigo-500',
  },
  success: {
    card: 'border-slate-200/80 bg-white',
    iconWrap: 'border-emerald-200 bg-white/80',
    icon: 'text-emerald-600',
    dot: 'bg-emerald-500',
  },
  warning: {
    card: 'border-amber-200/80 bg-amber-50/45',
    iconWrap: 'border-amber-200 bg-white/80',
    icon: 'text-amber-600',
    dot: 'bg-amber-500',
  },
  neutral: {
    card: 'border-slate-200/80 bg-white',
    iconWrap: 'border-slate-200 bg-white/80',
    icon: 'text-slate-600',
    dot: 'bg-slate-500',
  },
};

const InventoryStatCard: React.FC<InventoryStatCardProps> = ({ title, value, hint, icon, tone = 'neutral', compact = false }) => {
  const toneStyle = STAT_TONES[tone];
  return (
    <div className={`inventory-apple-stat inventory-pastel-card ${compact ? 'inventory-pastel-card-compact' : ''} ${toneStyle.card} dark:border-slate-800 dark:bg-slate-950`}>
      <div className={`flex ${compact ? 'items-center justify-between gap-3' : 'items-start justify-between gap-3'}`}>
        <div className="min-w-0 flex-1">
          <div className={`flex items-center gap-2 ${compact ? 'text-[10px] tracking-[0.12em]' : 'text-[11px] tracking-[0.14em]'} font-semibold text-slate-500 dark:text-slate-400`}>
            <span className={`h-2 w-2 rounded-full ${toneStyle.dot}`} />
            <span>{title}</span>
          </div>
          <div className={`${compact ? 'mt-1 text-[24px]' : 'mt-3 text-[28px]'} font-semibold tracking-tight text-slate-950 dark:text-white`}>{value}</div>
          <div className={`${compact ? 'mt-1 text-[11px] leading-5' : 'mt-2 text-xs leading-6'} text-slate-500 dark:text-slate-400`}>{hint}</div>
        </div>
        <div className={`grid ${compact ? 'h-10 w-10 rounded-xl' : 'h-11 w-11 rounded-2xl'} shrink-0 place-items-center border shadow-sm ${toneStyle.iconWrap} dark:border-slate-800 dark:bg-slate-900`}>
          <i className={`${icon} ${compact ? 'text-[13px]' : 'text-sm'} ${toneStyle.icon}`} />
        </div>
      </div>
    </div>
  );
};

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
  const H = ui.primaryHue;
  const brandGrad = { background: 'rgb(15 23 42)' };
  const brandColor = { color: `hsl(${H} 90% 40%)` };
  const brandBorder = { borderColor: `hsl(${H} 90% 40%)` };

  // Form & Modal State
  const initialNewProductState: NewProduct = { name: '', purchasePrice: 0, sellingPrice: 0, stock_quantity: 0, categoryId: '', supplierId: '', unit: 'عدد' };
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

  // Import / Export State
  const [isImportExportOpen, setIsImportExportOpen] = useState(false);
  const [productImportRows, setProductImportRows] = useState<ImportSheetRow[]>([]);
  const [productImportFileName, setProductImportFileName] = useState('');
  const [productImportReport, setProductImportReport] = useState<{ created: number; updated: number; skipped: number; errors: string[] } | null>(null);
  const [isImportingProducts, setIsImportingProducts] = useState(false);

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

  const formatPrice = (price: number | null) => formatCurrencyText(price ?? 0, readStoredCurrencyUnit());

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
      setEditingProduct({ ...product, unit: (product as any).unit || 'عدد' });
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
    const processedValue = isNumeric ? (value === '' ? '' : Number(String(value).replace(/,/g, ''))) : value;

    if (modalMode === 'add') setNewProduct(prev => ({ ...prev, [name]: processedValue }));
    else setEditingProduct(prev => ({ ...prev, [name]: processedValue }));

    if (formErrors[name as keyof typeof formErrors]) setFormErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const handleProductNumericFocus = (fieldName: 'purchasePrice' | 'sellingPrice' | 'stock_quantity') => {
    const currentValue = modalMode === 'add' ? (newProduct as any)[fieldName] : (editingProduct as any)[fieldName];
    if (Number(currentValue || 0) !== 0) return;
    handleProductFormChange({ target: { name: fieldName, value: '' } });
  };

  const handleProductNumericBlur = (fieldName: 'purchasePrice' | 'sellingPrice' | 'stock_quantity') => {
    const currentValue = modalMode === 'add' ? (newProduct as any)[fieldName] : (editingProduct as any)[fieldName];
    if (currentValue === '' || currentValue == null || Number.isNaN(Number(currentValue))) {
      handleProductFormChange({ target: { name: fieldName, value: '0' } });
    }
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
      await runWithFeedback(
        apiFetch(url, { method, body: JSON.stringify(payload) }).then((response) =>
          parseApiResult(response, { endpoint: url, action: modalMode === 'add' ? 'افزودن کالا' : 'ویرایش اطلاعات محصول' })
        ),
        {
          kind: modalMode === 'add' ? 'create' : 'update',
          loading: modalMode === 'add' ? 'در حال ثبت اطلاعات کالای جدید…' : 'در حال ذخیره تغییرات تغییرات کالا…',
          success: modalMode === 'add' ? 'کالا با موفقیت ثبت شد و به فهرست انبار اضافه شد.' : 'تغییرات کالا با موفقیت ذخیره شد.',
          endpoint: url,
        }
      );
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
      await runWithFeedback(
        apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name: newCategoryName.trim() }) }).then((response) =>
          parseApiResult(response, { endpoint: '/api/categories', action: 'افزودن مورد جدید دسته‌بندی' })
        ),
        {
          kind: 'create',
          loading: 'در حال ثبت اطلاعات دسته‌بندی جدید…',
          success: 'دسته‌بندی جدید با موفقیت ثبت شد.',
          endpoint: '/api/categories',
        }
      );
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
      await runWithFeedback(
        apiFetch('/api/partners', { method: 'POST', body: JSON.stringify({ partnerName: newSupplierName.trim(), partnerType: 'Supplier' }) }).then((response) =>
          parseApiResult(response, { endpoint: '/api/partners', action: 'افزودن مورد جدید تامین‌کننده' })
        ),
        {
          kind: 'create',
          loading: 'در حال ثبت اطلاعات تامین‌کننده…',
          success: 'تامین‌کننده جدید با موفقیت ثبت شد.',
          endpoint: '/api/partners',
        }
      );
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
      await runWithFeedback(
        apiFetch(url, { method: 'PUT', body: JSON.stringify(payload) }).then((response) =>
          parseApiResult(response, { endpoint: url, action: editingItem.type === 'category' ? 'ویرایش اطلاعات دسته‌بندی' : 'ویرایش اطلاعات تامین‌کننده' })
        ),
        {
          kind: 'update',
          loading: editingItem.type === 'category' ? 'در حال ذخیره تغییرات تغییرات دسته‌بندی…' : 'در حال ذخیره تغییرات تغییرات تامین‌کننده…',
          success: editingItem.type === 'category' ? 'دسته‌بندی با موفقیت ویرایش شد.' : 'اطلاعات تامین‌کننده با موفقیت ویرایش شد.',
          endpoint: url,
        }
      );
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
      await runWithFeedback(
        apiFetch(url, { method: 'DELETE' }).then((response) =>
          parseApiResult(response, { endpoint: url, action: deletingItem.type === 'product' ? 'حذف مورد کالا' : deletingItem.type === 'category' ? 'حذف مورد دسته‌بندی' : 'حذف مورد تامین‌کننده' })
        ),
        {
          kind: 'delete',
          loading: deletingItem.type === 'product' ? 'در حال حذف مورد کالا…' : deletingItem.type === 'category' ? 'در حال حذف مورد دسته‌بندی…' : 'در حال حذف مورد تامین‌کننده…',
          success: deletingItem.type === 'product' ? 'کالا با موفقیت از انبار حذف مورد شد.' : deletingItem.type === 'category' ? 'دسته‌بندی با موفقیت حذف شد.' : 'تامین‌کننده با موفقیت حذف شد.',
          endpoint: url,
        }
      );
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


  const inventoryStats = useMemo(() => {
    const totalProducts = products.length;
    const totalUnits = products.reduce((sum, p) => sum + Number(p.stock_quantity ?? 0), 0);
    const inventoryValue = products.reduce((sum, p) => sum + (Number(p.purchasePrice ?? 0) * Number(p.stock_quantity ?? 0)), 0);
    const activeCategories = new Set(products.map((p) => p.categoryName).filter(Boolean)).size;
    return { totalProducts, totalUnits, inventoryValue, activeCategories };
  }, [products]);

  // --- Table Definition ---
  const columns = useMemo(
    () => [
      columnHelper.accessor('name', { header: 'نام محصول', cell: info => <span className="product-table-name-cell" title={String(info.getValue() || '')}>{String(info.getValue() || '-')}</span> }),
      columnHelper.accessor('categoryName', { header: 'دسته‌بندی', cell: info => <span className="product-table-meta-cell" title={String(info.getValue() || '-')}>{String(info.getValue() || '-')}</span> }),
      columnHelper.accessor('supplierName', { header: 'تامین‌کننده', cell: info => <span className="product-table-meta-cell" title={String(info.getValue() || '-')}>{String(info.getValue() || '-')}</span> }),
      columnHelper.accessor('purchasePrice', { header: 'قیمت خرید', cell: info => <span className="product-table-money-cell">{formatPrice(info.getValue())}</span> }),
      columnHelper.accessor('sellingPrice', { header: 'قیمت فروش', cell: info => <span className="product-table-money-cell">{formatPrice(info.getValue())}</span> }),
      columnHelper.accessor('stock_quantity', {
        header: 'موجودی',
        cell: info => {
          const stock = info.getValue();
          const color = stock <= 5 ? 'text-red-500' : stock <= 20 ? 'text-yellow-500' : 'text-green-500';
          return <span className={`product-table-stock-cell font-semibold ${color}`}>{(stock ?? 0).toLocaleString('fa-IR')}</span>;
        },
      }),
      columnHelper.accessor('date_added', { header: 'تاریخ ثبت اطلاعات', cell: info => <span className="product-table-date-cell">{formatIsoToShamsi(info.getValue())}</span> }),
      columnHelper.display({
        id: 'actions',
        header: 'عملیات',
        cell: ({ row }) => (
          <div className="product-table-actions flex items-center justify-center gap-1">
            <Button type="button"
              onClick={() => handleSellProduct(row.original)}
              disabled={(row.original.stock_quantity ?? 0) <= 0}
              variant="success"
              size="xs"
              className="inventory-table-action-btn product-row-action-btn !px-0"
              title="فروش محصول"
              leftIcon={<i className="fas fa-cash-register" />}
            />
            <Button type="button"
              onClick={() => openBarcodeModal(row.original)}
              variant="secondary"
              size="xs"
              className="inventory-table-action-btn product-row-action-btn !px-0"
              title="چاپ بارکد"
              leftIcon={<i className="fas fa-barcode" />}
            />
            {canManage && (
              <Button type="button"
                onClick={() => openProductModal('edit', row.original)}
                variant="secondary"
                size="xs"
                className="inventory-table-action-btn product-row-action-btn !px-0"
                title="ویرایش اطلاعات محصول"
                leftIcon={<i className="fas fa-edit" />}
              />
            )}
            {canManage && (
              <Button type="button"
                onClick={() => setDeletingItem({ id: row.original.id, name: row.original.name, type: 'product' })}
                variant="danger"
                size="xs"
                className="inventory-table-action-btn product-row-action-btn !px-0"
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

  const productRoundtripColumns = [
    { header: 'شناسه', key: 'id' },
    { header: 'نام محصول', key: 'name' },
    { header: 'دسته‌بندی', key: 'category' },
    { header: 'تامین‌کننده', key: 'supplier' },
    { header: 'قیمت خرید', key: 'purchasePrice' },
    { header: 'قیمت فروش', key: 'sellingPrice' },
    { header: 'موجودی', key: 'stock' },
    { header: 'SKU', key: 'sku' },
    { header: 'بارکد', key: 'barcode' },
  ];

  const productRoundtripRows = products.map((p) => ({
    id: p.id,
    name: p.name,
    category: p.categoryName ?? '',
    supplier: p.supplierName ?? '',
    purchasePrice: Number(p.purchasePrice ?? 0),
    sellingPrice: Number(p.sellingPrice ?? 0),
    stock: Number(p.stock_quantity ?? 0),
    sku: (p as any).sku ?? '',
    barcode: (p as any).barcode ?? '',
  }));

  const doExportProductsRoundtrip = () => {
    exportRoundtripExcel(`products-roundtrip-${isoToday()}.xlsx`, productRoundtripRows, productRoundtripColumns, 'Products Import Export');
  };

  const doDownloadProductsTemplate = () => {
    exportRoundtripExcel(
      `products-import-template-${isoToday()}.xlsx`,
      [{ id: '', name: 'مثال: بادام هندی ۲۴۰', category: 'آجیل', supplier: 'تامین‌کننده نمونه', purchasePrice: 1000000, sellingPrice: 1250000, stock: 10, sku: '', barcode: '' }],
      productRoundtripColumns,
      'Products Import Template',
    );
  };

  const handleProductImportFile = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const rows = await readSpreadsheetRows(file);
      setProductImportRows(rows);
      setProductImportFileName(file.name);
      setProductImportReport(null);
      setNotification({ type: 'info', text: `${rows.length.toLocaleString('fa-IR')} ردیف از فایل خوانده شد. قبل از ثبت، پیش‌نمایش را بررسی کن.` });
    } catch (error) {
      setProductImportRows([]);
      setProductImportFileName('');
      displayError(error, 'فایل انتخاب‌شده قابل خواندن نیست. فرمت XLSX یا CSV خروجی همین بخش را انتخاب کن.');
    } finally {
      event.target.value = '';
    }
  };

  const ensureProductCategoryId = async (name: string, cache: Map<string, number>) => {
    const key = normalizeImportText(name).toLowerCase();
    if (!key) return null;
    if (cache.has(key)) return cache.get(key) ?? null;
    const response = await apiFetch('/api/categories', { method: 'POST', body: JSON.stringify({ name }) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || `خطا در ساخت دسته‌بندی «${name}»`);
    const id = Number(result.data?.id);
    if (id) cache.set(key, id);
    return id || null;
  };

  const ensureProductSupplierId = async (name: string, cache: Map<string, number>) => {
    const key = normalizeImportText(name).toLowerCase();
    if (!key) return null;
    if (cache.has(key)) return cache.get(key) ?? null;
    const response = await apiFetch('/api/partners', { method: 'POST', body: JSON.stringify({ partnerName: name, partnerType: 'Supplier' }) });
    const result = await response.json();
    if (!response.ok || !result.success) throw new Error(result.message || `خطا در ساخت تامین‌کننده «${name}»`);
    const id = Number(result.data?.id);
    if (id) cache.set(key, id);
    return id || null;
  };

  const runProductsImport = async () => {
    if (!canManage) {
      setNotification({ type: 'warning', text: 'برای ایمپورت کالا به دسترسی مدیریت انبار نیاز داری.' });
      return;
    }
    if (productImportRows.length === 0) {
      setNotification({ type: 'warning', text: 'ابتدا فایل ایمپورت کالا را انتخاب کن.' });
      return;
    }

    setIsImportingProducts(true);
    const report = { created: 0, updated: 0, skipped: 0, errors: [] as string[] };
    const categoryCache = new Map<string, number>();
    categories.forEach((c) => categoryCache.set(normalizeImportText(c.name).toLowerCase(), c.id));
    const supplierCache = new Map<string, number>();
    suppliers.forEach((sp) => supplierCache.set(normalizeImportText(sp.partnerName).toLowerCase(), sp.id));
    const byId = new Map(products.map((p) => [Number(p.id), p]));
    const byName = new Map(products.map((p) => [normalizeImportText(p.name).toLowerCase(), p]));

    for (const row of productImportRows) {
      const rowNumber = row.__rowNumber ?? 0;
      try {
        const id = parseImportInteger(getImportCell(row, ['شناسه', 'id', 'product id']), 0);
        const name = normalizeImportText(getImportCell(row, ['نام محصول', 'نام', 'product name', 'name']));
        const categoryName = normalizeImportText(getImportCell(row, ['دسته‌بندی', 'دسته بندی', 'category']));
        const supplierName = normalizeImportText(getImportCell(row, ['تامین‌کننده', 'تامین کننده', 'supplier']));
        const purchasePrice = parseImportNumber(getImportCell(row, ['قیمت خرید', 'purchase price', 'purchasePrice']), 0);
        const sellingPrice = parseImportNumber(getImportCell(row, ['قیمت فروش', 'selling price', 'sellingPrice', 'sale price']), 0);
        const stock = parseImportInteger(getImportCell(row, ['موجودی', 'stock', 'quantity', 'stock quantity']), 0);
        const sku = normalizeImportText(getImportCell(row, ['sku', 'کد کالا']));
        const barcode = normalizeImportText(getImportCell(row, ['بارکد', 'barcode']));

        if (!name) throw new Error('نام محصول خالی است.');
        if (purchasePrice < 0 || sellingPrice <= 0 || stock < 0) throw new Error('قیمت‌ها یا موجودی نامعتبر است.');

        const categoryId = isImportBlank(categoryName) ? null : await ensureProductCategoryId(categoryName, categoryCache);
        const supplierId = isImportBlank(supplierName) ? null : await ensureProductSupplierId(supplierName, supplierCache);
        const existing = (id && byId.get(id)) || byName.get(normalizeImportText(name).toLowerCase());
        const payload = { name, purchasePrice, sellingPrice, stock_quantity: stock, categoryId, supplierId, sku: sku || null, barcode: barcode || null };
        const url = existing ? `/api/products/${existing.id}` : '/api/products';
        const method = existing ? 'PUT' : 'POST';
        const response = await apiFetch(url, { method, body: JSON.stringify(payload) });
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'خطای نامشخص در ثبت کالا.');
        if (existing) report.updated += 1; else report.created += 1;
      } catch (error: any) {
        report.skipped += 1;
        report.errors.push(`ردیف ${rowNumber.toLocaleString('fa-IR')}: ${error?.message || 'خطای نامشخص'}`);
      }
    }

    setIsImportingProducts(false);
    setProductImportReport(report);
    await fetchData();
    setNotification({
      type: report.errors.length ? 'warning' : 'success',
      text: `ایمپورت کالا تمام شد: ${report.created.toLocaleString('fa-IR')} جدید، ${report.updated.toLocaleString('fa-IR')} بروزرسانی، ${report.skipped.toLocaleString('fa-IR')} ردشده.`,
    });
  };

  // --- Render ---
  return (
    <>
    <PageKit className="products-page products-services-redesign-v1 products-redesign-v1 inventory-products-foundation inventory-products-legacy"
      title="کالاها"
      subtitle="مدیریت موجودی، قیمت‌گذاری، بارکد و دسته‌بندی"
      icon={<i className="fa-solid fa-cube" />}
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
          <Button
            type="button"
            onClick={() => setIsImportExportOpen(true)}
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            leftIcon={<i className="fa-solid fa-file-import" />}
          >
            ورود / خروجی
          </Button>
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
            type="button"
            onClick={handlePrintAllBarcodes}
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            leftIcon={<i className="fas fa-print" />}
          >
            چاپ بارکد
          </Button>
          <Button
            type="button"
            onClick={() => setIsManagementModalOpen(true)}
            variant="secondary"
            size="sm"
            className="whitespace-nowrap"
            leftIcon={<i className="fas fa-cogs" />}
          >
            دسته‌بندی و تأمین‌کننده
          </Button>
          {canManage && (
            <Button
              type="button"
              onClick={() => openProductModal('add')}
              variant="primary"
              size="sm"
              className="whitespace-nowrap"
              leftIcon={<i className="fas fa-plus" />}
            >
              افزودن کالا
            </Button>
          )}
        </>
      }
      secondaryRow={
        <>
          <Notification message={notification} onClose={() => setNotification(null)} />
          <div className="products-commerce-hero">
            <div className="products-commerce-hero__summary">
              <span className="products-commerce-hero__icon"><i className="fa-solid fa-box-archive" /></span>
              <div className="min-w-0">
                <div className="products-commerce-hero__eyebrow">کنترل تجاری کالا</div>
                <h2>مدیریت موجودی، قیمت و دسته‌بندی</h2>
                <p>نمای فشرده برای تصمیم‌های روزانه انبار؛ بدون تکرار و بدون شلوغی عملیاتی.</p>
              </div>
            </div>

            <div className="products-commerce-hero__links">
              <HubCard
                title="کالاهای انبار"
                subtitle="مدیریت و جستجوی کالاها"
                icon="fa-solid fa-cube"
                to="/products"
                active={location.pathname.startsWith('/products')}
              />
              <HubCard
                title="گوشی‌های موبایل"
                subtitle="مدیریت IMEI و وضعیت"
                icon="fa-solid fa-mobile-screen"
                to="/mobile-phones"
                active={location.pathname.startsWith('/mobile-phones')}
              />
            </div>

            <div className="products-commerce-hero__stats">
              <InventoryStatCard title="تنوع کالا" value={inventoryStats.totalProducts.toLocaleString('fa-IR')} hint="محصولات ثبت‌شده" icon="fa-solid fa-boxes-stacked" tone="primary" compact />
              <InventoryStatCard title="موجودی کل" value={inventoryStats.totalUnits.toLocaleString('fa-IR')} hint="جمع واحدهای انبار" icon="fa-solid fa-layer-group" tone="success" compact />
            </div>
          </div>
        </>
      }
    >
	  <div className="products-commerce-table-card overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-slate-950">
        <div className="space-y-5 p-4 md:p-6">
          <div className="products-commerce-kpi-grid grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
            <InventoryStatCard compact title="ارزش موجودی" value={formatPrice(inventoryStats.inventoryValue)} hint="بر پایه قیمت خرید × موجودی" icon="fa-solid fa-wallet" tone="warning" />
            <InventoryStatCard compact title="دسته‌بندی‌های فعال" value={inventoryStats.activeCategories.toLocaleString('fa-IR')} hint="دسته‌های در حال استفاده" icon="fa-solid fa-tags" tone="neutral" />
            <InventoryStatCard compact title="در آستانه اتمام" value={stockChipMeta.low.toLocaleString('fa-IR')} hint="محصولات با موجودی پایین" icon="fa-solid fa-triangle-exclamation" tone="warning" />
            <InventoryStatCard compact title="ناموجود" value={stockChipMeta.out.toLocaleString('fa-IR')} hint="کالاهای صفر یا منفی" icon="fa-solid fa-ban" tone="neutral" />
          </div>
        <div className="products-commerce-control-row">
              <div className="products-commerce-stock-filters">
                <FilterChipsBar
                  value={stockFilter}
                  onChange={(k) => setStockFilter(k as any)}
                  chips={[
                    { key: 'all', label: 'همه', icon: 'fa-solid fa-list', count: stockChipMeta.all },
                    { key: 'low', label: 'کم موجودی', icon: 'fa-solid fa-triangle-exclamation', count: stockChipMeta.low },
                    { key: 'out', label: 'ناموجود', icon: 'fa-solid fa-ban', count: stockChipMeta.out },
                  ]}
                />
              </div>

              <div className="products-commerce-search-block">
                <label className="sr-only" htmlFor="products-local-search">جستجوی کالا</label>
                <div className="products-commerce-local-search">
                  <input
                    id="products-local-search"
                    type="search"
                    dir="rtl"
                    value={globalFilter}
                    onChange={(e) => setGlobalFilter(e.target.value)}
                    placeholder="جستجو در کالاها، دسته، تأمین‌کننده یا بارکد"
                    className="products-commerce-local-search__input"
                  />
                  <span className="products-commerce-local-search__icon" aria-hidden="true"><i className="fa-solid fa-magnifying-glass" /></span>
                </div>
                {suggestion ? (
                  <button
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
                    className="products-commerce-search-suggestion"
                    title="اعمال پیشنهاد و جستجو"
                  >
                    منظور شما «{suggestion}» بود؟
                  </button>
                ) : null}
              </div>
            </div>

        
          <>
            {/* Desktop: Table */}
            <div className="products-commerce-table-wrap hidden overflow-x-auto rounded-2xl border border-slate-200/80 dark:border-slate-800/80 md:block" id="products-print-area">
              <table className="product-list-table min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-slate-50/80 dark:bg-slate-900/80">
                  {table.getHeaderGroups().map(headerGroup => (
                    <tr key={headerGroup.id}>
                      {headerGroup.headers.map(header => (
                        <th key={header.id} className="px-4 py-3 text-right text-xs font-semibold uppercase tracking-[0.08em] text-slate-500 dark:text-slate-400">
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
                <tbody className="divide-y divide-slate-200 dark:divide-slate-800 bg-white dark:bg-slate-950">
                  {table.getRowModel().rows.map(row => (
                    <tr key={row.id} className="transition-colors hover:bg-slate-50/80 dark:hover:bg-slate-900/60">
                      {row.getVisibleCells().map(cell => (
                        <td key={cell.id} className="whitespace-nowrap px-4 py-3.5 text-sm text-slate-700 dark:text-slate-300">
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile: Cards */}
            <div className="space-y-4 p-4 md:hidden">
              {table.getRowModel().rows.map(row => {
                const p = row.original;
                return (
                  <div key={row.id} className="space-y-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800/80 dark:bg-slate-950">
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
                        <button type="button"
                          onClick={() => handleSellProduct(p)}
                          disabled={(p.stock_quantity ?? 0) <= 0}
                          className="flex items-center justify-center w-9 h-9 rounded-xl bg-green-500/10 text-green-600 dark:text-green-400 disabled:opacity-50"
                        >
                          <i className="fas fa-cash-register" />
                        </button>
                        <button type="button"
                          onClick={() => openBarcodeModal(p)}
                          className="flex items-center justify-center w-9 h-9 rounded-xl bg-gray-500/10 text-gray-600 dark:text-gray-400"
                        >
                          <i className="fas fa-barcode" />
                        </button>
                      </div>
                      
                      {canManage && (
                        <div className="flex items-center gap-1">
                          <button type="button"
                            onClick={() => openProductModal('edit', p)}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-blue-500/10 text-blue-600 dark:text-blue-400"
                          >
                            <i className="fas fa-edit" />
                          </button>
                          <button type="button"
                            onClick={() => setDeletingItem({ id: p.id, name: p.name, type: 'product' })}
                            className="flex items-center justify-center w-9 h-9 rounded-xl bg-red-500/10 text-red-600 dark:text-red-400"
                          >
                            <i className="fas fa-trash" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>

        <div className="ux-pagination-bar">
          <div className="flex items-center gap-2">
            <button type="button"
              onClick={() => table.setPageIndex(0)}
              disabled={!table.getCanPreviousPage()}
              className="ux-pagination-btn"
            >
              «
            </button>
            <button type="button"
              onClick={() => table.previousPage()}
              disabled={!table.getCanPreviousPage()}
              className="ux-pagination-btn"
            >
              ‹
            </button>
            <button type="button"
              onClick={() => table.nextPage()}
              disabled={!table.getCanNextPage()}
              className="ux-pagination-btn"
            >
              ›
            </button>
            <button type="button"
              onClick={() => table.setPageIndex(table.getPageCount() - 1)}
              disabled={!table.getCanNextPage()}
              className="ux-pagination-btn"
            >
              »
            </button>
          </div>
          <div className="flex items-center gap-2 text-slate-600 dark:text-slate-400">
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
      </div>

    </PageKit>

      {/* Modals */}
      <InventoryModal open={isImportExportOpen} title="ورود / خروجی لیست کالاها" onClose={() => setIsImportExportOpen(false)} widthClassName="max-w-[980px]" iconClassName="fa-solid fa-file-import" eyebrow="کالا و انبار">
        <div className="space-y-5" dir="rtl">
          <div className="rounded-[26px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex min-w-0 items-start gap-3">
                <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100">
                  <i className="fa-solid fa-table-list" />
                </span>
                <div className="min-w-0">
                  <h3 className="text-base font-black text-slate-950 dark:text-white">ورود و خروج دقیق لیست کالاها</h3>
                  <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">برای ورود مجدد، از «خروجی کامل قابل ایمپورت» استفاده کن؛ فایل «قالب نمونه» فقط یک ردیف راهنما دارد. شناسه اگر وجود داشته باشد بروزرسانی می‌شود؛ در غیر این‌صورت بر اساس نام محصول تطبیق داده می‌شود.</p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:items-end">
                <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Button type="button" variant="secondary" size="sm" onClick={doDownloadProductsTemplate} leftIcon={<i className="fa-solid fa-file-lines" />}>قالب نمونه</Button>
                  <Button type="button" variant="secondary" size="sm" onClick={doExportProductsRoundtrip} disabled={products.length === 0} leftIcon={<i className="fa-solid fa-file-export" />}>خروجی کامل قابل ایمپورت</Button>
                </div>
                <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">خروجی کامل شامل {products.length.toLocaleString('fa-IR')} محصول است؛ قالب نمونه فقط راهنماست.</span>
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
            <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-900">
              <span className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
                <i className="fa-solid fa-cloud-arrow-up" />
              </span>
              <span className="mt-3 text-sm font-black text-slate-900 dark:text-white">انتخاب فایل XLSX / CSV</span>
              <span className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">ستون‌های فارسی و انگلیسی پشتیبانی می‌شوند: نام، دسته‌بندی، تامین‌کننده، قیمت خرید، قیمت فروش، موجودی، SKU و بارکد.</span>
              <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handleProductImportFile} />
            </label>

            <div className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">IMPORT PREVIEW</div>
                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{productImportFileName || 'فایلی انتخاب نشده'}</div>
                </div>
                <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{productImportRows.length.toLocaleString('fa-IR')} ردیف</span>
              </div>

              <div className="mt-4 max-h-52 space-y-2 overflow-auto pr-1">
                {productImportRows.slice(0, 6).map((row) => {
                  const name = normalizeImportText(getImportCell(row, ['نام محصول', 'نام', 'name'])) || 'بدون نام';
                  const selling = parseImportNumber(getImportCell(row, ['قیمت فروش', 'selling price', 'sellingPrice']), 0);
                  const stock = parseImportInteger(getImportCell(row, ['موجودی', 'stock']), 0);
                  return (
                    <div key={row.__rowNumber} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/60">
                      <span className="min-w-0 truncate font-bold text-slate-800 dark:text-slate-100">{name}</span>
                      <span className="shrink-0 text-slate-500 dark:text-slate-400">{formatPrice(selling)} • {stock.toLocaleString('fa-IR')} عدد</span>
                    </div>
                  );
                })}
                {productImportRows.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">بعد از انتخاب فایل، چند ردیف اول اینجا نمایش داده می‌شود.</div> : null}
              </div>

              {productImportReport ? (
                <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                  <div className="font-black text-slate-900 dark:text-white">نتیجه: {productImportReport.created.toLocaleString('fa-IR')} جدید، {productImportReport.updated.toLocaleString('fa-IR')} بروزرسانی، {productImportReport.skipped.toLocaleString('fa-IR')} ردشده</div>
                  {productImportReport.errors.slice(0, 4).map((err) => <div key={err} className="mt-1 text-rose-600 dark:text-rose-300">{err}</div>)}
                </div>
              ) : null}

              <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
                <Button type="button" variant="secondary" size="sm" onClick={() => { setProductImportRows([]); setProductImportFileName(''); setProductImportReport(null); }}>پاک‌کردن</Button>
                <Button type="button" variant="primary" size="sm" loading={isImportingProducts} disabled={!canManage || productImportRows.length === 0 || isImportingProducts} onClick={runProductsImport} leftIcon={<i className="fa-solid fa-file-import" />}>شروع ایمپورت</Button>
              </div>
            </div>
          </div>
        </div>
      </InventoryModal>

      {/* Product Modal */}
      <InventoryModal open={isProductModalOpen} title={modalMode === 'add' ? 'ثبت اطلاعات محصول جدید در انبار' : `ویرایش اطلاعات محصول: ${editingProduct.name}`} onClose={closeProductModal} widthClassName="max-w-[1180px]" iconClassName={modalMode === 'add' ? 'fa-solid fa-cube' : 'fa-solid fa-pen-to-square'} eyebrow="کالا و انبار">
        <form onSubmit={handleProductFormSubmit} className="product-modal-apple space-y-5">
          <div className="product-modal-apple-shell space-y-5">
            <div className="product-modal-apple-hero">
              <div className="product-modal-apple-hero__top">
                <div>
                  <div className="product-modal-apple-badge">
                    <i className="fa-solid fa-cube" />
                    {modalMode === 'add' ? 'ثبت محصول جدید' : 'ویرایش محصول'}
                  </div>
                  <h3 className="product-modal-apple-title">{modalMode === 'add' ? 'ثبت محصول جدید' : `ویرایش محصول: ${editingProduct.name}`}</h3>
                  <p className="product-modal-apple-subtitle">اطلاعات اصلی کالا، قیمت و تأمین را ثبت کن تا محصول با ساختار دقیق و خوانا در انبار ذخیره شود.</p>
                </div>
                <div className="product-modal-apple-summary">
                  <span className="product-modal-apple-summary__item">
                    <span className="product-modal-apple-summary__icon" aria-hidden="true"><i className="fa-solid fa-layer-group" /></span>
                    <strong>{categories.length.toLocaleString('fa')}</strong>
                    <span>دسته‌بندی فعال</span>
                  </span>
                  <span className="product-modal-apple-summary__item">
                    <span className="product-modal-apple-summary__icon" aria-hidden="true"><i className="fa-solid fa-building-user" /></span>
                    <strong>{suppliers.length.toLocaleString('fa')}</strong>
                    <span>تأمین‌کننده</span>
                  </span>
                </div>
              </div>
            </div>

            <div className="product-modal-apple-grid">
              <section className="product-modal-apple-section product-modal-apple-section--base">
                <div className="product-modal-apple-section__head">
                  <span className="product-modal-apple-section__icon"><i className="fa-solid fa-box-open" /></span>
                  <div>
                    <h4>اطلاعات پایه محصول</h4>
                    <p>نام، موجودی و هویت اصلی کالا را مشخص کن.</p>
                  </div>
                </div>

                <div className="product-modal-apple-fields">
                  <ModalField label="نام محصول" iconClass="fa-solid fa-box" required error={formErrors.name}>
                    <input type="text" name="name" value={modalMode === 'add' ? newProduct.name : (editingProduct.name as string) || ''} onChange={handleProductFormChange} className={`inventory-premium-input ${formErrors.name ? 'border-red-300 ' : ''}`} preview="مثلاً کابل شارژر اصلی آیفون" />
                  </ModalField>

                  <div className="product-modal-apple-inline-grid">
                    <ModalField label="تعداد موجودی" iconClass="fa-solid fa-cubes" error={formErrors.stock_quantity} hint="موجودی فعلی یا موجودی اولیه‌ای که می‌خواهی در انبار ثبت شود.">
                      <input
                        type="number"
                        name="stock_quantity"
                        value={modalMode === 'add' ? newProduct.stock_quantity : (editingProduct.stock_quantity as number) || 0}
                        onChange={handleProductFormChange}
                        onFocus={() => handleProductNumericFocus('stock_quantity')}
                        onBlur={() => handleProductNumericBlur('stock_quantity')}
                        className={`inventory-premium-input ${formErrors.stock_quantity ? 'border-red-300 ' : ''}`}
                        preview="تعداد فعلی در انبار"
                      />
                    </ModalField>

                    <ModalField label="واحد" iconClass="fa-solid fa-scale-balanced">
                      <select
                        name="unit"
                        value={(modalMode === 'add' ? newProduct.unit : ((editingProduct as any).unit || 'عدد')) || 'عدد'}
                        onChange={handleProductFormChange}
                        className="inventory-premium-select"
                      >
                        {PRODUCT_UNIT_OPTIONS.map((option) => (
                          <option key={option} value={option}>{option}</option>
                        ))}
                      </select>
                    </ModalField>
                  </div>

                  <div className="product-modal-apple-note">
                    <i className="fa-solid fa-circle-info" />
                    <span>نام محصول را واضح و استاندارد وارد کن تا جستجو، گزارش‌گیری و چاپ بارکد دقیق‌تر شود.</span>
                  </div>
                </div>
              </section>

              <section className="product-modal-apple-section product-modal-apple-section--finance">
                <div className="product-modal-apple-section__head">
                  <span className="product-modal-apple-section__icon"><i className="fa-solid fa-coins" /></span>
                  <div>
                    <h4>قیمت‌گذاری و تأمین</h4>
                    <p>قیمت‌ها و ارتباط محصول با دسته‌بندی و تأمین‌کننده را مشخص کن.</p>
                  </div>
                </div>

                <div className="product-modal-apple-fields">
                  <div className="product-modal-apple-inline-grid">
                    <ModalField label="قیمت خرید" iconClass="fa-solid fa-sack-dollar" error={formErrors.purchasePrice}>
                      <input
                        type="text"
                        inputMode="numeric"
                        data-number-field="true"
                        dir="ltr"
                        name="purchasePrice"
                        value={modalMode === 'add' ? String(newProduct.purchasePrice) : String((editingProduct.purchasePrice as number) || 0)}
                        onChange={handleProductFormChange}
                        onFocus={() => handleProductNumericFocus('purchasePrice')}
                        onBlur={() => handleProductNumericBlur('purchasePrice')}
                        className={`inventory-premium-input text-left ${formErrors.purchasePrice ? 'border-red-300 ' : ''}`}
                        preview="مثال: ۴۸۰۰۰۰"
                      />
                    </ModalField>

                    <ModalField label="قیمت فروش" iconClass="fa-solid fa-tags" error={formErrors.sellingPrice}>
                      <input
                        type="text"
                        inputMode="numeric"
                        data-number-field="true"
                        dir="ltr"
                        name="sellingPrice"
                        value={modalMode === 'add' ? String(newProduct.sellingPrice) : String((editingProduct.sellingPrice as number) || 0)}
                        onChange={handleProductFormChange}
                        onFocus={() => handleProductNumericFocus('sellingPrice')}
                        onBlur={() => handleProductNumericBlur('sellingPrice')}
                        className={`inventory-premium-input text-left ${formErrors.sellingPrice ? 'border-red-300 ' : ''}`}
                        preview="مثال: ۵۸۰۰۰۰"
                      />
                    </ModalField>
                  </div>

                  <ModalField className="product-modal-apple-field--category" label="دسته‌بندی" iconClass="fa-solid fa-layer-group" error={formErrors.categoryId}>
                    <select name="categoryId" value={modalMode === 'add' ? newProduct.categoryId || '' : (editingProduct.categoryId as string) || ''} onChange={handleProductFormChange} className={`inventory-premium-select ${formErrors.categoryId ? 'border-red-300 ' : ''}`}>
                      <option value="">بدون دسته‌بندی</option>
                      {categories.map(c => (<option key={c.id} value={c.id}>{c.name}</option>))}
                    </select>
                  </ModalField>

                  <ModalField label="تأمین‌کننده" iconClass="fa-solid fa-truck" error={formErrors.supplierId} hint="اگر برای کالا قیمت خرید وارد می‌کنی، بهتر است تأمین‌کننده را هم مشخص کنی.">
                    <select name="supplierId" value={modalMode === 'add' ? newProduct.supplierId || '' : (editingProduct.supplierId as string) || ''} onChange={handleProductFormChange} className={`inventory-premium-select ${formErrors.supplierId ? 'border-red-300 ' : ''}`}>
                      <option value="">بدون تأمین‌کننده</option>
                      {suppliers.map(s => (<option key={s.id} value={s.id}>{s.partnerName}</option>))}
                    </select>
                  </ModalField>
                </div>
              </section>
            </div>
            <ModalActions
              className="product-modal-apple-actions"
              onCancel={closeProductModal}
              helperTitle={modalMode === 'add' ? 'ثبت محصول در انبار' : 'به‌روزرسانی اطلاعات محصول'}
              helperText={modalMode === 'add' ? 'پس از تأیید، محصول با همین اطلاعات در موجودی انبار ثبت می‌شود.' : 'پس از تأیید، تغییرات همین محصول در کل سیستم ذخیره می‌شود.'}
              helperIconClass={modalMode === 'add' ? 'fa-solid fa-box-circle-check' : 'fa-solid fa-pen-ruler'}
              submitText={modalMode === 'add' ? 'ثبت محصول' : 'ذخیره تغییرات'}
              submittingText="در حال ذخیره تغییرات..."
              isSubmitting={isSubmitting}
            />
          </div>
        </form>
      </InventoryModal>

      <InventoryModal open={isManagementModalOpen} title="مدیریت دسته‌بندی و تأمین‌کننده" onClose={() => setIsManagementModalOpen(false)} widthClassName="max-w-5xl" iconClassName="fa-solid fa-sitemap" eyebrow="مدیریت پایه">
        <div className="product-management-apple space-y-5">
          <section className="product-management-apple-hero">
            <div className="product-management-apple-hero__top">
              <div className="product-management-apple-hero__copy">
                <div className="product-management-apple-badge"><i className="fa-solid fa-sitemap" /> ساختار کالا</div>
                <h3>مدیریت دسته‌بندی و تأمین‌کننده</h3>
                <p>دسته‌بندی‌ها و تأمین‌کننده‌های محصولات را در همین پنل نگه دار تا فرم ثبت کالا، گزارش‌ها و موجودی همیشه منظم بمانند.</p>
              </div>
              <div className="product-management-apple-hero__aside">
                <div className="product-management-apple-stats">
                  <span><strong>{categories.length.toLocaleString('fa')}</strong><small>دسته‌بندی</small></span>
                  <span><strong>{suppliers.length.toLocaleString('fa')}</strong><small>تأمین‌کننده</small></span>
                </div>
                <div className="product-management-tabs product-management-tabs--hero" role="tablist" aria-label="مدیریت ساختار کالا">
                  <button type="button" role="tab" aria-selected={activeMgmtTab === 'categories'} onClick={() => setActiveMgmtTab('categories')} className={activeMgmtTab === 'categories' ? 'is-active' : ''}>
                    <i className="fa-solid fa-layer-group" />
                    <span>دسته‌بندی‌ها</span>
                  </button>
                  <button type="button" role="tab" aria-selected={activeMgmtTab === 'suppliers'} onClick={() => setActiveMgmtTab('suppliers')} className={activeMgmtTab === 'suppliers' ? 'is-active' : ''}>
                    <i className="fa-solid fa-truck" />
                    <span>تأمین‌کنندگان</span>
                  </button>
                </div>
              </div>
            </div>
          </section>

          {activeMgmtTab === 'categories' && (
            <section className="product-management-panel">
              <div className="product-management-panel__head">
                <div>
                  <h4><i className="fa-solid fa-layer-group" /> <span>دسته‌بندی‌های کالا</span></h4>
                  <p>برای مرتب‌سازی موجودی، گزارش فروش و جستجوی سریع کالا استفاده می‌شود.</p>
                </div>
              </div>

              <form onSubmit={handleCategorySubmit} className="product-management-form">
                <ModalField label="نام دسته‌بندی" iconClass="fa-solid fa-folder-tree" error={categoryFormError}>
                  <TextField value={newCategoryName} onChange={(e) => setNewCategoryName(e.target.value)} preview="مثلاً لوازم جانبی" />
                </ModalField>
                <Button type="submit" disabled={isSubmittingCategory} loading={isSubmittingCategory} loadingText="در حال ثبت…" variant="primary" className="product-management-submit" leftIcon={<i className="fa-solid fa-plus" />}>
                  افزودن دسته‌بندی
                </Button>
              </form>

              <div className="product-management-table-shell">
                <table className="product-management-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>نام دسته‌بندی</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {categories.map((c, idx) => {
                      const isEditing = editingItem?.type === 'category' && editingItem?.id === c.id;
                      return (
                        <tr key={c.id}>
                          <td>{idx + 1}</td>
                          <td>
                            {isEditing ? (
                              <TextField value={editItemName} onChange={(e) => setEditItemName(e.target.value)} className="h-10" />
                            ) : (
                              <div className="product-management-name-cell">
                                <span><i className="fa-solid fa-folder" /></span>
                                <strong>{c.name}</strong>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="product-management-row-actions">
                              {isEditing ? (<>
                                <Button type="button" onClick={handleUpdateItem} disabled={isSubmittingEdit} loading={isSubmittingEdit} loadingText="در حال ذخیره…" variant="primary" size="sm" className="product-management-row-btn" title="ذخیره" aria-label="ذخیره" leftIcon={<i className="fa-solid fa-floppy-disk" />} />
                                <Button type="button" onClick={handleCancelEdit} variant="ghost" size="sm" className="product-management-row-btn" title="انصراف" aria-label="انصراف" leftIcon={<i className="fa-solid fa-xmark" />} />
                              </>) : (<>
                                <Button type="button" onClick={() => handleStartEdit({ id: c.id, name: c.name }, 'category')} variant="secondary" size="sm" className="product-management-row-btn" title="ویرایش" aria-label="ویرایش" leftIcon={<i className="fa-solid fa-pen-to-square" />} />
                                <Button type="button" onClick={() => setDeletingItem({ id: c.id, name: c.name, type: 'category' })} variant="danger" size="sm" className="product-management-row-btn" title="حذف" aria-label="حذف" leftIcon={<i className="fa-solid fa-trash" />} requiredRoles={['Admin','Manager']} />
                              </>)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {categories.length === 0 && <tr><td colSpan={3} className="product-management-empty">هنوز دسته‌بندی ثبت نشده است.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}

          {activeMgmtTab === 'suppliers' && (
            <section className="product-management-panel">
              <div className="product-management-panel__head">
                <div>
                  <h4><i className="fa-solid fa-truck" /> <span>تأمین‌کنندگان کالا</span></h4>
                  <p>برای ثبت دقیق قیمت خرید، سابقه تأمین و گزارش‌های مالی کالا استفاده می‌شود.</p>
                </div>
              </div>

              <form onSubmit={handleSupplierSubmit} className="product-management-form">
                <ModalField label="نام تأمین‌کننده" iconClass="fa-solid fa-truck" error={supplierFormError}>
                  <TextField value={newSupplierName} onChange={(e) => setNewSupplierName(e.target.value)} preview="مثلاً مغازه یا همکار تأمین‌کننده" />
                </ModalField>
                <Button type="submit" disabled={isSubmittingSupplier} loading={isSubmittingSupplier} loadingText="در حال ثبت…" variant="success" className="product-management-submit" leftIcon={<i className="fa-solid fa-plus" />}>
                  افزودن تأمین‌کننده
                </Button>
              </form>

              <div className="product-management-table-shell">
                <table className="product-management-table">
                  <thead>
                    <tr>
                      <th>#</th>
                      <th>نام تأمین‌کننده</th>
                      <th>عملیات</th>
                    </tr>
                  </thead>
                  <tbody>
                    {suppliers.map((s, idx) => {
                      const isEditing = editingItem?.type === 'supplier' && editingItem?.id === s.id;
                      return (
                        <tr key={s.id}>
                          <td>{idx + 1}</td>
                          <td>
                            {isEditing ? (
                              <TextField value={editItemName} onChange={(e) => setEditItemName(e.target.value)} className="h-10" />
                            ) : (
                              <div className="product-management-name-cell product-management-name-cell--supplier">
                                <span><i className="fa-solid fa-truck" /></span>
                                <strong>{s.partnerName}</strong>
                              </div>
                            )}
                          </td>
                          <td>
                            <div className="product-management-row-actions">
                              {isEditing ? (<>
                                <Button type="button" onClick={handleUpdateItem} disabled={isSubmittingEdit} loading={isSubmittingEdit} loadingText="در حال ذخیره…" variant="success" size="sm" className="product-management-row-btn" title="ذخیره" aria-label="ذخیره" leftIcon={<i className="fa-solid fa-floppy-disk" />} />
                                <Button type="button" onClick={handleCancelEdit} variant="ghost" size="sm" className="product-management-row-btn" title="انصراف" aria-label="انصراف" leftIcon={<i className="fa-solid fa-xmark" />} />
                              </>) : (<>
                                <Button type="button" onClick={() => handleStartEdit({ id: s.id, name: s.partnerName }, 'supplier')} variant="secondary" size="sm" className="product-management-row-btn" title="ویرایش" aria-label="ویرایش" leftIcon={<i className="fa-solid fa-pen-to-square" />} />
                                <Button type="button" onClick={() => setDeletingItem({ id: s.id, name: s.partnerName, type: 'supplier' })} variant="danger" size="sm" className="product-management-row-btn" title="حذف" aria-label="حذف" leftIcon={<i className="fa-solid fa-trash" />} requiredRoles={['Admin','Manager']} />
                              </>)}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                    {suppliers.length === 0 && <tr><td colSpan={3} className="product-management-empty">هنوز تأمین‌کننده ثبت نشده است.</td></tr>}
                  </tbody>
                </table>
              </div>
            </section>
          )}
        </div>
      </InventoryModal>

      <InventoryModal open={!!deletingItem} title={deletingItem ? `تایید حذف مورد "${deletingItem.name}"` : ''} onClose={() => setDeletingItem(null)} iconClassName="fa-solid fa-trash-can" eyebrow="حذف امن">
          <p className="text-sm text-gray-700 dark:text-gray-300 mb-4">آیا از حذف مورد این آیتم مطمئن هستید؟ این عمل قابل بازگشت نیست.</p>
          <div className="flex justify-end pt-3 space-x-3 space-x-reverse">
            <Button type="button" onClick={() => setDeletingItem(null)} variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-xmark" />}>
              انصراف
            </Button>
            <Button type="button" onClick={handleConfirmDelete} disabled={isSubmittingDelete} loading={isSubmittingDelete} loadingText="در حال حذف مورد..." variant="danger" size="sm" leftIcon={<i className="fa-solid fa-trash" />}>
              تایید و حذف مورد
            </Button>
          </div>
        </InventoryModal>

      {/* Barcode Modal */}
      <InventoryModal open={isBarcodeModalOpen && !!selectedProductForBarcode} title={selectedProductForBarcode ? `بارکد برای: ${selectedProductForBarcode.name}` : ''} onClose={() => setIsBarcodeModalOpen(false)} widthClassName="max-w-sm" iconClassName="fa-solid fa-barcode" eyebrow="چاپ بارکد">          {selectedProductForBarcode ? (
            <>
              <div id="barcode-label-content" className="label-58 text-center printable-area">
                <img
                  src={`/api/barcode/product/${selectedProductForBarcode.id}`}
                  alt={`Barcode for ${selectedProductForBarcode.name}`}
                  className="mx-auto"
                />
                <p className="mt-2 font-semibold text-lg">{selectedProductForBarcode.name}</p>
                <p className="text-md text-gray-600">{formatPrice(selectedProductForBarcode.sellingPrice)}</p>
              </div>
              <div className="flex justify-end pt-4 mt-4 border-t dark:border-gray-700 print:hidden">
                <Button type="button" onClick={handlePrintBarcode} variant="primary" leftIcon={<i className="fas fa-print" />}>
                  چاپ برچسب
                </Button>
              </div>
            </>
          ) : (
            <div className="text-sm text-gray-600 dark:text-gray-300">محصولی انتخاب نشده است.</div>
          )}
        </InventoryModal>
    </>
  );
};

export default Products;
