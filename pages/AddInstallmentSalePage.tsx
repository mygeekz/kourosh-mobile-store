// src/pages/AddInstallmentSalePage.tsx
import React, { useState, useEffect, useMemo, FormEvent, ChangeEvent } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import moment from 'jalali-moment';
import { Search, Save, RefreshCw } from '../components/lucide-react';

import {
  NewInstallmentSaleData,
  InstallmentCheckInfo,
  Customer,
  PhoneEntry,
  NotificationMessage,
  InstallmentSalePayload,
} from '../types';
import Notification from '../components/Notification';
import ShamsiDatePicker from '../components/ShamsiDatePicker';
import Modal from '../components/Modal';
import PriceInput from '../components/PriceInput';
import FormSection from '../components/FormSection';
import FormErrorSummary, { FormErrors } from '../components/FormErrorSummary';
import { focusFirstError } from '../utils/focusFirstError';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../utils/feedback';
import { useAuth } from '../contexts/AuthContext';
import { getAuthHeaders } from '../utils/apiUtils';
import WorkflowWizard, { WizardStep } from '../components/WorkflowWizard';
import Button from '../components/Button';
import SmartSalesAdvisor, { SmartSalesInsight } from '../components/SmartSalesAdvisor';
import { useMountedRef, useTimeoutGuards } from '../utils/asyncGuards';
import { useFormErgonomics } from '../hooks/useFormErgonomics';
import { formatCurrencyText, readStoredCurrencyUnit, getCurrencyUnitLabel } from '../utils/currency';
import { APP_MESSAGES } from '../shared/messages';

/* ---------------- Helpers (یک‌بار تعریف) ---------------- */
// رِند به بالا تا 100هزار
const roundUp100k = (v: number) => Math.ceil((v || 0) / 100000) * 100000;

const parseNumLoose = (val: any, def = NaN) => {
  if (val === null || val === undefined) return def;
  if (typeof val === 'number') return val;
  if (typeof val === 'string') {
    const cleaned = val.replace(/[^\d\-\.]/g, '');
    const n = Number(cleaned);
    return Number.isNaN(n) ? def : n;
  }
  return def;
};
const toNumber = (v: any) => {
  const n = parseNumLoose(v, 0);
  return Number.isNaN(n) ? 0 : n;
};
const pickFirstNumber = (obj: any, keys: string[]) => {
  for (const k of keys) {
    const n = parseNumLoose(obj?.[k]);
    if (!Number.isNaN(n)) return n;
  }
  return undefined;
};

/* ---------------- Types ---------------- */
type ProductItem = {
  id: number;
  title: string;
  buyPrice?: number;
  salePrice?: number;
  stock?: number | null; // null => نامشخص
};

type ServiceItem = {
  id: number;
  name: string;
  price?: number;
};
type AccessoryLine = {
  productId: number;
  name: string;
  buyPrice: number;
  sellPrice: number;
  qty: number;
};
type PhoneLine = {
  id: number;
  title: string;
  imei?: string | null;
  buyPrice: number;
  sellPrice: number;
  costBasisSource?: 'currentPurchasePrice' | 'purchasePrice' | 'documentBuyPrice';
};

type ServiceLine = {
  serviceId: number;
  name: string;
  sellPrice: number;
  qty: number;
};

type SaleType = 'installment' | 'check';

const AddInstallmentSalePage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { token } = useAuth();
  const mountedRef = useMountedRef();
  const { scheduleTimeout } = useTimeoutGuards();

  const initialFormState: NewInstallmentSaleData = {
    customerId: null,
    phoneId: null, // اگر فقط ۱ گوشی بود همچنان پر می‌شود
    actualSalePrice: '',
    downPayment: '',
    numberOfInstallments: '',
    installmentAmount: '',
    installmentsStartDate: moment().locale('fa').format('jYYYY/jMM/jDD'),
    saleDate: moment().locale('fa').format('jYYYY/jMM/jDD'),
    checks: [],
    notes: '',
  };

  const [formData, setFormData] = useState<NewInstallmentSaleData>(initialFormState);
  const [wizardStep, setWizardStep] = useState(0);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [availablePhones, setAvailablePhones] = useState<PhoneEntry[]>([]);
  const [availableProducts, setAvailableProducts] = useState<ProductItem[]>([]);
  const [availableServices, setAvailableServices] = useState<ServiceItem[]>([]);
  const prefillCustomerId = Number((location.state as any)?.prefillCustomerId || 0);


  // انتخاب چند گوشی
  const [phoneLines, setPhoneLines] = useState<PhoneLine[]>([]);
  const [phoneToAddId, setPhoneToAddId] = useState<number | ''>('');

  // لوازم
  const [accessories, setAccessories] = useState<AccessoryLine[]>([]);
  const [isAccessoryModalOpen, setIsAccessoryModalOpen] = useState(false);
  const [accessoryProductId, setAccessoryProductId] = useState<number | ''>('');
  const [accessoryQty, setAccessoryQty] = useState<number>(1);
  const [modalSellPrice, setModalSellPrice] = useState<number>(0);
  const [modalBuyPrice, setModalBuyPrice] = useState<number>(0);
  const [modalStock, setModalStock] = useState<number | null>(0);
  const [modalProductName, setModalProductName] = useState<string>('');

  // خدمات
  const [serviceLines, setServiceLines] = useState<ServiceLine[]>([]);
  const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
  const [serviceToAddId, setServiceToAddId] = useState<number | ''>('');
  const [serviceQty, setServiceQty] = useState<number>(1);
  const [serviceModalPrice, setServiceModalPrice] = useState<number>(0);
  const [serviceModalName, setServiceModalName] = useState<string>('');

  // نوع فروش
  const [saleType, setSaleType] = useState<SaleType>('installment');
  const [checkMonths, setCheckMonths] = useState<number>(1); // وقتی فروش چکی است

  // درصد سود ماهانه + تخفیف تومانی
  const [profitPercent, setProfitPercent] = useState<number>(0);
  const [discountToman, setDiscountToman] = useState<number>(0);

  // چک‌ها
  const [isCheckModalOpen, setIsCheckModalOpen] = useState(false);
  const initialCheckState: Omit<InstallmentCheckInfo, 'id' | 'status'> = {
    checkNumber: '',
    bankName: '',
    dueDate: moment().locale('fa').format('YYYY/MM/DD'),
    amount: 0,
  };
  const [currentCheck, setCurrentCheck] = useState(initialCheckState);
  const [currentCheckDueDate, setCurrentCheckDueDate] = useState<Date | null>(new Date());

  // تاریخ واقعی فروش/خرید اقساطی و تاریخ شروع اقساط
  const [saleDatePicker, setSaleDatePicker] = useState<Date | null>(new Date());
  const [installmentsStartDatePicker, setInstallmentsStartDatePicker] = useState<Date | null>(new Date());

  // UI/Loading
  const [isLoading, setIsLoading] = useState(false);
  const [submitStageHint, setSubmitStageHint] = useState<string>('اعتبارسنجی اقساط و ثبت اطلاعات در حساب مشتری');
  const [isLoadingCustomers, setIsLoadingCustomers] = useState(true);
  const [isLoadingPhones, setIsLoadingPhones] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);
  const [isLoadingServices, setIsLoadingServices] = useState(true);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [formErrors, setFormErrors] = useState<
    Partial<Record<keyof NewInstallmentSaleData | 'checks' | 'discount' | 'saleType' | 'checkMonths' | 'items', string>>
  >({});

  // ergonomic form wiring for keyboard flow + first-error focus
  const { formRef, onKeyDownCapture } = useFormErgonomics({
    errorCount: Object.keys(formErrors).length,
    submitOnLastField: true,
  });

  const fieldIdMap: Record<string, string> = {
    customerId: 'customerId',
    items: 'items-section',
    actualSalePrice: 'actualSalePrice',
    downPayment: 'downPayment',
    discount: 'discountToman',
    numberOfInstallments: 'numberOfInstallments',
    installmentAmount: 'installmentAmount',
    checkMonths: 'checkMonths',
  };

  const errorLabels: Record<string, string> = {
    customerId: 'مشتری',
    items: 'اقلام فروش',
    actualSalePrice: 'قیمت نهایی',
    downPayment: 'پیش‌پرداخت',
    discount: 'تخفیف',
    numberOfInstallments: 'تعداد اقساط',
    installmentAmount: 'مبلغ هر قسط',
    checkMonths: 'ماه‌های چک',
  };

  /* ---------------- Derived sums ---------------- */
  const phonesSellTotal = phoneLines.reduce((s, p) => s + (p.sellPrice || 0), 0);
  const phonesBuyTotal  = phoneLines.reduce((s, p) => s + (p.buyPrice  || 0), 0);

  const accessoriesSellTotal = accessories.reduce((s, a) => s + a.sellPrice * (a.qty || 0), 0);
  const accessoriesBuyTotal  = accessories.reduce((s, a) => s + a.buyPrice  * (a.qty || 0), 0);

  const servicesSellTotal = serviceLines.reduce((s, sv) => s + (sv.sellPrice || 0) * (sv.qty || 0), 0);

  /* ---------------- Fetchers ---------------- */
  const fetchCustomers = async () => {
    if (!token) return;
    setIsLoadingCustomers(true);
    try {
      const r = await fetch('/api/customers', { headers: getAuthHeaders(token) });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'خطا در دریافت مشتریان');
      setCustomers(j.data || []);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingCustomers(false);
    }
  };
  const fetchAvailablePhones = async () => {
    if (!token) return;
    setIsLoadingPhones(true);
    try {
      const r = await fetch('/api/phones?status=موجود%20در%20انبار,مرجوعی,مرجوعی%20اقساطی', { headers: getAuthHeaders(token) });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'خطا در دریافت لیست گوشی‌ها');
      setAvailablePhones(j.data || []);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingPhones(false);
    }
  };
  const fetchAvailableProducts = async () => {
    if (!token) return;
    setIsLoadingProducts(true);
    try {
      const r = await fetch('/api/products?status=available', { headers: getAuthHeaders(token) });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'خطا در دریافت محصولات');

      const items: ProductItem[] = (j.data || []).map((p: any) => {
        const buy  = pickFirstNumber(p, ['buyPrice','purchasePrice','baseBuyPrice']);
        const sell = pickFirstNumber(p, ['salePrice','price','baseSalePrice','sellingPrice','unit_price']);
        const stockKeys = [
          'stock','inventory','quantity','qty','available','remain','remainingStock',
          'count','onHand','inStock','stock_count','current_stock','balance','storeCount'
        ];
        const rawStock = pickFirstNumber(p, stockKeys);
        const stock: number | null = (rawStock === undefined || Number.isNaN(rawStock)) ? null : Number(rawStock);
        return {
          id: Number(p.id),
          title: p.title || p.name || `#${p.id}`,
          buyPrice: buy ?? 0,
          salePrice: sell ?? 0,
          stock,
        };
      });
      setAvailableProducts(items);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const fetchAvailableServices = async () => {
    // این endpoint عمومی است ولی برای یکپارچگی هدر احراز هویت را (در صورت وجود) می‌فرستیم.
    setIsLoadingServices(true);
    try {
      const r = await fetch('/api/services', { headers: token ? getAuthHeaders(token) : undefined });
      const j = await r.json();
      if (!r.ok || !j.success) throw new Error(j.message || 'خطا در دریافت خدمات');
      const items: ServiceItem[] = (j.data || []).map((s: any) => ({
        id: Number(s.id),
        name: String(s.name || `#${s.id}`),
        price: toNumber(s.price ?? 0),
      }));
      setAvailableServices(items);
    } catch (e: any) {
      setNotification({ type: 'error', text: e.message });
    } finally {
      setIsLoadingServices(false);
    }
  };

  useEffect(() => {
    if (!prefillCustomerId || customers.length === 0) return;
    const exists = customers.some((c) => c.id === prefillCustomerId);
    if (!exists) return;
    setFormData((prev) => ({ ...prev, customerId: prefillCustomerId as any }));
  }, [prefillCustomerId, customers]);

  useEffect(() => {
    if (token) {
      fetchCustomers();
      fetchAvailablePhones();
      fetchAvailableProducts();
      fetchAvailableServices();
    }
  }, [token]);

  useEffect(() => {
    if (saleDatePicker) {
      setFormData(prev => ({
        ...prev,
        saleDate: moment(saleDatePicker).locale('fa').format('jYYYY/jMM/jDD'),
      }));
    }
  }, [saleDatePicker]);

  useEffect(() => {
    if (installmentsStartDatePicker) {
      setFormData(prev => ({
        ...prev,
        installmentsStartDate: moment(installmentsStartDatePicker).locale('fa').format('jYYYY/jMM/jDD'),
      }));
    }
  }, [installmentsStartDatePicker]);

  useEffect(() => {
    if (currentCheckDueDate) {
      setCurrentCheck(prev => ({ ...prev, dueDate: moment(currentCheckDueDate).locale('fa').format('jYYYY/jMM/jDD') }));
    }
  }, [currentCheckDueDate]);

  /* ---------------- Form handlers ---------------- */
  const handleFormInputChange = (
    e:
      | ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>
      | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;

    if (name === 'downPayment' || name === 'numberOfInstallments' || name === 'installmentAmount' || name === 'notes') {
      setFormData(prev => ({ ...prev, [name]: value }));
    }

    if (name === 'customerId') {
      setFormData(prev => ({ ...prev, customerId: value ? (Number(value) as any) : null }));
    }

    if ((formErrors as any)[name]) {
      setFormErrors(prev => ({ ...prev, [name]: undefined }));
    }
  };

  /* ---------------- Phones (multi) ---------------- */
  const addPhoneLine = () => {
    if (!phoneToAddId) return;
    const p = availablePhones.find(x => x.id === Number(phoneToAddId));
    if (!p) return;

    if (phoneLines.some(l => l.id === p.id)) {
      setNotification({ type: 'error', text: 'این موبایل قبلاً افزوده شده است.' });
      return;
    }

    const currentPurchasePrice = toNumber((p as any).currentPurchasePrice);
    const documentBuyPrice = toNumber((p as any).buyPrice);
    const originalPurchasePrice = toNumber((p as any).purchasePrice);
    const hasCurrentPurchasePrice = currentPurchasePrice > 0;
    const nextLine: PhoneLine = {
      id: p.id,
      title: (p as any).title || p.model || `#${p.id}`,
      imei: (p as any).imei || null,
      buyPrice: hasCurrentPurchasePrice ? currentPurchasePrice : (documentBuyPrice > 0 ? documentBuyPrice : originalPurchasePrice),
      sellPrice: toNumber((p as any).salePrice),
      costBasisSource: hasCurrentPurchasePrice ? 'currentPurchasePrice' : (documentBuyPrice > 0 ? 'documentBuyPrice' : 'purchasePrice'),
    };

    setPhoneLines(prev => {
      const next = [...prev, nextLine];
      setFormData(formPrev => ({ ...formPrev, phoneId: next.length === 1 ? (next[0].id as any) : null }));
      return next;
    });

    setPhoneToAddId('');
  };
  const removePhoneLine = (id: number) => {
    const next = phoneLines.filter(p => p.id !== id);
    setPhoneLines(next);
    setFormData(prev => ({ ...prev, phoneId: next.length === 1 ? (next[0].id as any) : null }));
  };

  /* ---------------- Checks handlers ---------------- */
  const handleCheckInputChange = (
    e: ChangeEvent<HTMLInputElement> | { target: { name: string; value: string } }
  ) => {
    const { name, value } = e.target;
    if (name === 'amount') {
      setCurrentCheck(prev => ({ ...prev, amount: toNumber(value) }));
    } else {
      setCurrentCheck(prev => ({ ...prev, [name]: value }));
    }
  };
  const addCheckToList = () => {
    if (!currentCheck.checkNumber.trim() || !currentCheck.bankName.trim() || Number(currentCheck.amount) <= 0) {
      setNotification({ type: 'error', text: 'اطلاعات چک ناقص یا نامعتبر است.' });
      return;
    }
    setFormData(prev => ({
      ...prev,
      checks: [...prev.checks, { ...currentCheck, status: 'نزد فروشنده' as const }],
    }));
    setCurrentCheck(initialCheckState);
    setCurrentCheckDueDate(new Date());
    setIsCheckModalOpen(false);
  };

  /* ---------------- Accessories ---------------- */
  const openAccessoryModal = () => {
    setAccessoryProductId('');
    setAccessoryQty(1);
    setModalSellPrice(0);
    setModalBuyPrice(0);
    setModalStock(0);
    setModalProductName('');
    setIsAccessoryModalOpen(true);
  };
  const onChangeAccessoryProduct = (e: ChangeEvent<HTMLSelectElement>) => {
    const pid = Number(e.target.value);
    setAccessoryProductId(pid || '');
    const p = availableProducts.find(x => x.id === pid);
    if (p) {
      setModalSellPrice(toNumber(p.salePrice));
      setModalBuyPrice(toNumber(p.buyPrice));
      setModalStock(p.stock === null ? null : Number(p.stock)); // null => نامشخص
      setModalProductName(p.title);
    } else {
      setModalSellPrice(0);
      setModalBuyPrice(0);
      setModalStock(null);
      setModalProductName('');
    }
  };
  const addAccessoryLine = () => {
    if (!accessoryProductId) { setNotification({ type: 'error', text: 'محصول را انتخاب کنید.' }); return; }
    if (accessoryQty <= 0) { setNotification({ type: 'error', text: 'تعداد معتبر نیست.' }); return; }
    if (modalStock !== null && accessoryQty > (modalStock || 0)) {
      setNotification({ type: 'error', text: 'تعداد درخواستی بیشتر از موجودی انبار است.' }); return;
    }
    const existsIdx = accessories.findIndex(a => a.productId === accessoryProductId);
    if (existsIdx >= 0) {
      const updated = [...accessories];
      updated[existsIdx].qty = updated[existsIdx].qty + accessoryQty;
      setAccessories(updated);
    } else {
      setAccessories(prev => [...prev, {
        productId: accessoryProductId as number,
        name: modalProductName || `#${accessoryProductId}`,
        buyPrice: modalBuyPrice || 0,
        sellPrice: modalSellPrice || 0,
        qty: accessoryQty,
      }]);
    }
    setIsAccessoryModalOpen(false);
  };
  const removeAccessory = (idx: number) => setAccessories(prev => prev.filter((_, i) => i !== idx));

  /* ---------------- Services helpers ---------------- */
  const openServiceModal = () => {
    setIsServiceModalOpen(true);
    setServiceToAddId('');
    setServiceQty(1);
    setServiceModalPrice(0);
    setServiceModalName('');
  };

  const onChangeServiceToAdd = (e: ChangeEvent<HTMLSelectElement>) => {
    const id = Number(e.target.value) || '';
    setServiceToAddId(id);
    if (id) {
      const sv = availableServices.find(s => s.id === id);
      setServiceModalName(sv?.name || `#${id}`);
      setServiceModalPrice(toNumber(sv?.price || 0));
    } else {
      setServiceModalName('');
      setServiceModalPrice(0);
    }
  };

  const addServiceLine = () => {
    if (!serviceToAddId) { setNotification({ type: 'error', text: 'خدمت را انتخاب کنید.' }); return; }
    if (serviceQty <= 0) { setNotification({ type: 'error', text: 'تعداد معتبر نیست.' }); return; }
    const existsIdx = serviceLines.findIndex(s => s.serviceId === serviceToAddId);
    if (existsIdx >= 0) {
      const updated = [...serviceLines];
      updated[existsIdx].qty = updated[existsIdx].qty + serviceQty;
      // اگر کاربر قیمت را تغییر داده باشد، قیمت را هم بروزرسانی می‌کنیم
      updated[existsIdx].sellPrice = toNumber(serviceModalPrice);
      setServiceLines(updated);
    } else {
      setServiceLines(prev => [...prev, {
        serviceId: serviceToAddId as number,
        name: serviceModalName || `#${serviceToAddId}`,
        sellPrice: toNumber(serviceModalPrice),
        qty: serviceQty,
      }]);
    }
    setIsServiceModalOpen(false);
  };

  const removeService = (idx: number) => setServiceLines(prev => prev.filter((_, i) => i !== idx));

  /* ---------------- Pricing (ماهانه ساده) ---------------- */
  const baseSum = phonesSellTotal + accessoriesSellTotal + servicesSellTotal; // جمع قیمت گوشی‌ها + لوازم + خدمات
  const downPaymentNum = toNumber(formData.downPayment);

  // اعمال تخفیف روی مبلغ پایه
  const baseAfterDiscount = Math.max(0, baseSum - (discountToman || 0));

  // اصل مانده پس از پیش‌پرداخت
  const principal = Math.max(0, baseAfterDiscount - downPaymentNum);

  // نرخ ماهانه
  const monthlyRate = Math.max(0, toNumber(profitPercent)) / 100;

  // تعداد ماه‌هایی که سود روی مانده اعمال می‌شود
  const monthsForInterest = saleType === 'installment'
    ? Math.max(1, toNumber(formData.numberOfInstallments))
    : Math.max(1, toNumber(checkMonths));

  // سود کل ساده
  const totalInterest = principal * monthlyRate * monthsForInterest;

  // جمع کل قبل از رِند
  // (پیش‌پرداخت + اصل مانده + سود) = (baseAfterDiscount + سود)
  const totalBeforeRound = baseAfterDiscount + totalInterest;

  // رِند به ۱۰۰k بالا
  const finalPrice = roundUp100k(totalBeforeRound);
  const totalSellAmount = finalPrice;

  // باقیمانده برای پرداخت‌های بعدی (اقساط یا تسویه با چک)
  const remainingAfterDownPayment = Math.max(0, finalPrice - downPaymentNum);

  // تلرانس پویا برای اختلاف اقساط
  const dynamicTolRaw = remainingAfterDownPayment * 0.01; // ۱٪
  const TOL = Math.max(200000, roundUp100k(dynamicTolRaw));

  // سینک فیلد نمایشی قیمت نهایی
  useEffect(() => {
    if (toNumber(formData.actualSalePrice) !== finalPrice) {
      setFormData(prev => ({ ...prev, actualSalePrice: String(finalPrice) }));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finalPrice]);

  /* ---------------- Validation ---------------- */
  const validateForm = (): boolean => {
    const errors: Partial<Record<keyof NewInstallmentSaleData | 'checks' | 'discount' | 'saleType' | 'checkMonths' | 'items', string>> = {};

    if (!formData.customerId) errors.customerId = 'انتخاب مشتری الزامی است.';
    if (phoneLines.length === 0 && accessories.length === 0 && serviceLines.length === 0) {
      errors.items = 'حداقل یک قلم (موبایل/لوازم/خدمات) را انتخاب کنید.';
    }
    if (finalPrice <= 0) errors.actualSalePrice = 'قیمت نهایی نامعتبر است.';
    if (discountToman < 0) errors.discount = 'تخفیف نمی‌تواند منفی باشد.';
    if (downPaymentNum < 0 || downPaymentNum > finalPrice) errors.downPayment = 'پیش‌پرداخت نامعتبر است.';

    if (saleType === 'installment') {
      const months = Math.max(1, toNumber(formData.numberOfInstallments));
      if (months <= 0 || !Number.isInteger(months)) errors.numberOfInstallments = 'تعداد اقساط باید عدد صحیح مثبت باشد.';
      if (toNumber(formData.installmentAmount) <= 0) errors.installmentAmount = 'مبلغ هر قسط باید مثبت باشد.';
      const totalInstallmentValue = months * (toNumber(formData.installmentAmount) || 0);
      const diff = Math.abs(totalInstallmentValue - remainingAfterDownPayment);
      if (diff > TOL) {
        errors.installmentAmount = `مجموع اقساط (${totalInstallmentValue.toLocaleString('fa-IR')}) با بدهی (${remainingAfterDownPayment.toLocaleString('fa-IR')}) بیش از ${TOL.toLocaleString('fa-IR')} تومان اختلاف دارد.`;
      }
    } else {
      // فروش چکی
      if (toNumber(checkMonths) <= 0 || !Number.isInteger(toNumber(checkMonths))) {
        errors.checkMonths = 'تعداد ماه تا نقد شدن چک صحیح نیست.';
      }
    }

    setFormErrors(errors);
    if (Object.keys(errors).length > 0) {
      focusFirstError(errors as any, fieldIdMap);
    }
    return Object.keys(errors).length === 0;
  };

  /* ---------------- Submit ---------------- */
  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!validateForm() || !token) return;

    setIsLoading(true);
    setNotification(null);
    setSubmitStageHint('در حال اعتبارسنجی اطلاعات فروش و اقساط');

    const accessoryPayload = accessories.map(a => ({
      productId: a.productId,
      name: a.name,
      buyPrice: a.buyPrice,
      sellPrice: a.sellPrice,
      qty: a.qty,
      lineTotal: a.sellPrice * a.qty,
    }));

    const phonesPayload = phoneLines.map(p => ({
      phoneId: p.id,
      title: p.title,
      imei: p.imei || undefined,
      buyPrice: p.buyPrice,
      costBasisSource: p.costBasisSource,
      sellPrice: p.sellPrice,
    }));

    const servicesPayload = serviceLines.map(s => ({
      serviceId: s.serviceId,
      name: s.name,
      sellPrice: s.sellPrice,
      qty: s.qty,
      lineTotal: s.sellPrice * s.qty,
    }));

    const monthsInstallments = Math.max(1, toNumber(formData.numberOfInstallments));
    const payload: InstallmentSalePayload & any = {
      ...formData,
      // سازگاری با بک‌اندِ قبلی:
      phoneId: phoneLines.length === 1 ? (phoneLines[0].id as any) : null,
      // داده‌ی جدید:
      phones: phonesPayload,
      phoneIds: phonesPayload.map(p => p.phoneId),
      saleType,
      saleDate: formData.saleDate,
      checkMonths: saleType === 'check' ? monthsForInterest : undefined,

      actualSalePrice: finalPrice,
      downPayment: downPaymentNum,
      numberOfInstallments: saleType === 'installment' ? monthsInstallments : 0,
      installmentAmount: saleType === 'installment' ? toNumber(formData.installmentAmount) : 0,

      discountToman,
      profitPercent, // ماهانه

      checks: formData.checks.map(chk => ({ ...chk, status: 'نزد فروشنده' as const })),
      accessories: accessoryPayload,
      services: servicesPayload,

      meta: {
        phonesBuyTotal,
        phonesSellTotal,
        accessoriesBuyTotal,
        accessoriesSellTotal,
        servicesSellTotal,
        baseSum,
        baseAfterDiscount,
        principal,
        monthlyRate,
        monthsForInterest,
        totalInterest,
        totalBeforeRound,
        finalPrice,
        remainingAfterDownPayment,
      },

      // کاهش موجودی لوازم (بک‌آپ اگر سمت سرور انجام نشد)
      inventoryAdjustments: accessoryPayload.map((l: any) => ({ productId: l.productId, delta: -Number(l.qty || 0) })),
    };

    try {
      setSubmitStageHint('در حال آماده‌سازی اقلام، مبالغ و برنامه اقساط');
      await runWithFeedback(
        parseApiResult<any>(
          await (() => {
            setSubmitStageHint('در حال ثبت اطلاعات فروش و ایجاد اقساط');
            return fetch('/api/installment-sales', {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify(payload),
          });
          })(),
          { endpoint: '/api/installment-sales', action: 'ثبت فروش اقساطی' }
        ),
        {
          kind: 'create',
          endpoint: '/api/installment-sales',
          loading: 'در حال ثبت فروش اقساطی و محاسبه اقلام…',
          success: APP_MESSAGES.success.created,
          error: 'ثبت اطلاعات فروش انجام نشد؛ اطلاعات مشتری، مبلغ پیش‌پرداخت و اقساط را بررسی و ادامه کنید.',
        }
      );

      // بک‌آپ کم کردن موجودی لوازم
      for (const line of accessoryPayload) {
        try {
          let r = await fetch(`/api/products/${line.productId}/adjust-stock`, {
            method: 'POST',
            headers: getAuthHeaders(token),
            body: JSON.stringify({ delta: -Number(line.qty || 0) }),
          });
          if (!r.ok) {
            r = await fetch(`/api/products/${line.productId}/decrement`, {
              method: 'POST',
              headers: getAuthHeaders(token),
              body: JSON.stringify({ qty: Number(line.qty || 0) }),
            });
          }
        } catch {}
      }

      if (!mountedRef.current) return;
      setNotification({ type: 'success', text: 'فروش اقساطی با موفقیت ثبت شد و اقساط این مشتری آماده پیگیری است.' });
      scheduleTimeout(() => navigate('/installment-sales'), 1500);
    } catch (error: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: humanizeErrorMessage(error.message || 'خطا در ثبت فروش اقساطی', { endpoint: '/api/installment-sales', action: 'ثبت فروش اقساطی' }) });
    } finally {
      if (mountedRef.current) {
        setSubmitStageHint('اعتبارسنجی اقساط و ثبت اطلاعات در حساب مشتری');
        setIsLoading(false);
      }
    }
  };

  /* ---------------- UI helpers ---------------- */

const submitStageProgress = (() => {
  if (/اعتبارسنج/i.test(submitStageHint)) return 1;
  if (/آماده‌سازی|آماده سازی/i.test(submitStageHint)) return 2;
  if (/ثبت اطلاعات فروش|ایجاد اقساط/i.test(submitStageHint)) return 3;
  return 1;
})();

const submitStageIcon = submitStageProgress === 1
  ? <Search className="h-3.5 w-3.5" />
  : submitStageProgress === 2
    ? <RefreshCw className="h-3.5 w-3.5" />
    : <Save className="h-3.5 w-3.5" />;

  const inputClass = (
    fieldName?: keyof NewInstallmentSaleData | keyof InstallmentCheckInfo | 'amount' | 'discount' | 'checkMonths' | 'saleType',
    isSelect = false
  ) => {
    const hasErr = fieldName && (formErrors as any)[fieldName];
    const base = isSelect ? 'app-select installment-clean-select appearance-none bg-none' : 'app-input';
    return `${base} ${hasErr ? 'border-red-500 ' : ''}`;
  };

  const labelClass = 'app-label';

  // اقساط
  const monthsInstallments = Math.max(1, toNumber(formData.numberOfInstallments));
  const totalInstallments = monthsInstallments * toNumber(formData.installmentAmount);
  const overallTotal = totalInstallments + downPaymentNum;

  // محاسبه خودکار قسط ماهانه
  const autofillInstallmentAmount = () => {
    const m = Math.max(1, toNumber(formData.numberOfInstallments));
    // اگر بدهی دقیقاً بر تعداد اقساط بخش‌پذیر نباشد، با «رو به بالا» محاسبه می‌کنیم
    // تا مجموع اقساط از بدهی کمتر نشود. (اختلاف معمولاً ۱ تا چند تومان است)
    const per = m > 0 ? Math.ceil(remainingAfterDownPayment / m) : 0;
    setFormData(prev => ({ ...prev, installmentAmount: String(per) }));
    setFormErrors(prev => ({ ...prev, installmentAmount: undefined }));
  };
  // محاسبه خودکار تعداد اقساط از روی مبلغ هر قسط
  const autofillInstallmentsCount = () => {
    const amt = toNumber(formData.installmentAmount);
    if (amt > 0) {
      const cnt = Math.max(1, Math.ceil(remainingAfterDownPayment / amt));
      setFormData(prev => ({ ...prev, numberOfInstallments: String(cnt) }));
      setFormErrors(prev => ({ ...prev, numberOfInstallments: undefined }));
    }
  };

  const renderNumberField = ({
    label,
    icon,
    value,
    onChange,
    preview,
    suffix,
    topLabel,
    min,
    fieldClassName,
    id,
    name,
  }: {
    label: React.ReactNode;
    icon?: string;
    value: string | number;
    onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
    preview?: string;
    suffix?: string;
    topLabel?: string;
    min?: number;
    fieldClassName?: string;
    id?: string;
    name?: string;
  }) => (
    <div className="space-y-1">
      <label htmlFor={id} className="block text-sm font-medium text-gray-700 dark:text-gray-200">
        {icon ? <i className={`${icon} ml-2`} /> : null}
        {label}
      </label>
      {(topLabel || suffix) ? (
        <div className="ux-field-meta-row">
          <span>{topLabel ?? ''}</span>
          {suffix ? <span className="ux-field-meta-chip">{suffix}</span> : <span />}
        </div>
      ) : null}
      <div className="group relative">
        <input
          type="number"
          id={id}
          name={name}
          min={min}
          value={value}
          onChange={onChange}
          className={fieldClassName || inputClass()}
          preview={preview}
          inputMode="numeric"
          dir="ltr"
        />
      </div>
    </div>
  );

  const onInstallmentBlur = () => {
    // PriceInput خودش عدد را پاکسازی/گرد می‌کند؛ اینجا عمداً رِند بزرگ انجام نمی‌دهیم
    // تا جمع اقساط به بدهی نزدیک بماند.
  };

  const sellerProfit = finalPrice - (phonesBuyTotal + accessoriesBuyTotal);


  const selectedInstallmentCustomer = useMemo(
    () => customers.find((customer) => customer.id === Number(formData.customerId || 0)) || null,
    [customers, formData.customerId]
  );

  const installmentSystemProposal = useMemo(() => {
    const money = (value: number) => formatCurrencyText(value, readStoredCurrencyUnit());
    const customerBalance = Number(selectedInstallmentCustomer?.currentBalance || 0);
    const hasItems = phoneLines.length > 0 || accessories.length > 0 || serviceLines.length > 0;
    const hasPhones = phoneLines.length > 0;
    const discountRate = baseSum > 0 ? (discountToman / baseSum) * 100 : 0;
    const currentProfitRate = finalPrice > 0 ? (sellerProfit / finalPrice) * 100 : 0;

    const downPaymentRate = Math.min(65, Math.max(
      hasPhones ? 35 : 25,
      customerBalance > 0 ? 40 : 0,
      discountRate >= 10 ? 42 : 0,
      currentProfitRate < 6 ? 38 : 0,
    ));

    const suggestedMonthsBase = baseAfterDiscount >= 90000000 ? 6 : baseAfterDiscount >= 45000000 ? 5 : baseAfterDiscount >= 20000000 ? 4 : 3;
    const suggestedMonths = Math.max(2, Math.min(customerBalance > 0 ? 4 : 6, suggestedMonthsBase));
    const suggestedProfitPercent = Math.max(toNumber(profitPercent), hasPhones ? 4 : 3);
    const suggestedDownPayment = Math.min(baseAfterDiscount, roundUp100k(baseAfterDiscount * downPaymentRate / 100));
    const suggestedPrincipal = Math.max(0, baseAfterDiscount - suggestedDownPayment);
    const suggestedInterest = suggestedPrincipal * (suggestedProfitPercent / 100) * suggestedMonths;
    const suggestedFinalPrice = roundUp100k(baseAfterDiscount + suggestedInterest);
    const suggestedRemaining = Math.max(0, suggestedFinalPrice - suggestedDownPayment);
    const suggestedInstallmentAmount = suggestedMonths > 0 ? Math.ceil(suggestedRemaining / suggestedMonths) : 0;

    const reasons = [
      `حداقل پیش‌پرداخت پیشنهادی ${downPaymentRate.toLocaleString('fa-IR')}٪ از مبلغ پایه است.`,
      customerBalance > 0 ? 'مشتری مانده قبلی دارد؛ برنامه اقساط محافظه‌کارانه‌تر تنظیم شد.' : 'برای مشتری بدون مانده قبلی، برنامه متعادل فروشگاهی پیشنهاد شد.',
      hasPhones ? 'به‌خاطر فروش گوشی، مبنا روی ریسک افت ارزش و وصول سریع‌تر تنظیم شد.' : 'اقلام غیرگوشی با فشار وصول کمتر محاسبه شدند.',
      discountRate >= 10 ? 'تخفیف قرارداد قابل توجه است؛ پیش‌پرداخت بالاتر پیشنهاد شد.' : 'تخفیف قرارداد در محدوده کنترل‌شده است.',
    ];

    return {
      canApply: hasItems && baseAfterDiscount > 0 && Boolean(selectedInstallmentCustomer),
      downPaymentRate,
      suggestedDownPayment,
      suggestedMonths,
      suggestedProfitPercent,
      suggestedFinalPrice,
      suggestedRemaining,
      suggestedInstallmentAmount,
      reasons,
      summary: hasItems
        ? `پیشنهاد سیستم: ${money(suggestedDownPayment)} پیش‌پرداخت، ${suggestedMonths.toLocaleString('fa-IR')} قسط ${money(suggestedInstallmentAmount)}، سود ماهانه ${suggestedProfitPercent.toLocaleString('fa-IR')}٪`
        : 'برای ساخت پیشنهاد، ابتدا مشتری و حداقل یک قلم فروش را انتخاب کن.',
    };
  }, [accessories.length, baseAfterDiscount, baseSum, discountToman, finalPrice, formData.customerId, phoneLines.length, profitPercent, selectedInstallmentCustomer, sellerProfit, serviceLines.length]);

  const installmentProposalComparison = useMemo(() => {
    const money = (value: number) => formatCurrencyText(value, readStoredCurrencyUnit());
    const percentText = (value: number) => `${(Number(value) || 0).toFixed(1).replace('.', '٫')}٪`;
    const customerBalance = Number(selectedInstallmentCustomer?.currentBalance || 0);
    const currentMonths = Math.max(1, toNumber(formData.numberOfInstallments));
    const currentInstallmentAmount = toNumber(formData.installmentAmount);
    const currentDownPaymentRate = finalPrice > 0 ? (downPaymentNum / finalPrice) * 100 : 0;
    const suggestedDownPaymentRate = installmentSystemProposal.suggestedFinalPrice > 0
      ? (installmentSystemProposal.suggestedDownPayment / installmentSystemProposal.suggestedFinalPrice) * 100
      : 0;
    const currentInstallmentsTotal = currentMonths * currentInstallmentAmount;
    const currentMismatch = Math.abs(currentInstallmentsTotal - remainingAfterDownPayment);
    const currentProfit = sellerProfit;
    const suggestedProfit = installmentSystemProposal.suggestedFinalPrice - (phonesBuyTotal + accessoriesBuyTotal);
    const currentProjectedBalance = customerBalance + remainingAfterDownPayment;
    const suggestedProjectedBalance = customerBalance + installmentSystemProposal.suggestedRemaining;

    const riskScore = ({ downRate, remaining, mismatch, profit, profitPercentValue }: { downRate: number; remaining: number; mismatch: number; profit: number; profitPercentValue: number }) => {
      let score = 18;
      if (remaining > 0 && downRate < 20) score += 34;
      else if (remaining > 0 && downRate < 30) score += 24;
      else if (remaining > 0 && downRate < 40) score += 12;
      if (customerBalance > 0) score += customerBalance > 75000000 ? 22 : 12;
      if (phoneLines.length > 0 && remaining > 60000000) score += 16;
      if (mismatch > TOL) score += 20;
      if (profit < 0) score += 25;
      else if (finalPrice > 0 && profit / finalPrice < 0.06) score += 12;
      if (profitPercentValue <= 0 && remaining > 0) score += 8;
      return Math.min(100, Math.max(0, Math.round(score)));
    };

    const currentRisk = riskScore({
      downRate: currentDownPaymentRate,
      remaining: remainingAfterDownPayment,
      mismatch: currentMismatch,
      profit: currentProfit,
      profitPercentValue: toNumber(profitPercent),
    });
    const suggestedRisk = riskScore({
      downRate: suggestedDownPaymentRate,
      remaining: installmentSystemProposal.suggestedRemaining,
      mismatch: 0,
      profit: suggestedProfit,
      profitPercentValue: installmentSystemProposal.suggestedProfitPercent,
    });

    const riskLabel = (score: number) => {
      if (score >= 75) return 'بحرانی';
      if (score >= 55) return 'پرریسک';
      if (score >= 35) return 'قابل پیگیری';
      return 'کنترل‌شده';
    };

    const rows = [
      {
        label: 'پیش‌پرداخت',
        current: money(downPaymentNum),
        suggested: money(installmentSystemProposal.suggestedDownPayment),
        impact: `${percentText(currentDownPaymentRate)} ← ${percentText(suggestedDownPaymentRate)}`,
      },
      {
        label: 'تعداد اقساط',
        current: `${currentMonths.toLocaleString('fa-IR')} ماه`,
        suggested: `${installmentSystemProposal.suggestedMonths.toLocaleString('fa-IR')} ماه`,
        impact: installmentSystemProposal.suggestedMonths < currentMonths ? 'فشار زمانی کمتر برای وصول' : 'برنامه متعادل‌تر',
      },
      {
        label: 'مبلغ هر قسط',
        current: money(currentInstallmentAmount),
        suggested: money(installmentSystemProposal.suggestedInstallmentAmount),
        impact: currentInstallmentAmount > 0
          ? `${money(Math.abs(installmentSystemProposal.suggestedInstallmentAmount - currentInstallmentAmount))} اختلاف با وضعیت فعلی`
          : 'مبلغ قسط پیشنهادی آماده اعمال است',
      },
      {
        label: 'قیمت نهایی قرارداد',
        current: money(finalPrice),
        suggested: money(installmentSystemProposal.suggestedFinalPrice),
        impact: money(installmentSystemProposal.suggestedFinalPrice - finalPrice),
      },
      {
        label: 'مانده وصول',
        current: money(remainingAfterDownPayment),
        suggested: money(installmentSystemProposal.suggestedRemaining),
        impact: `مانده تجمیعی مشتری: ${money(currentProjectedBalance)} ← ${money(suggestedProjectedBalance)}`,
      },
      {
        label: 'سود قرارداد',
        current: money(currentProfit),
        suggested: money(suggestedProfit),
        impact: money(suggestedProfit - currentProfit),
      },
      {
        label: 'سطح ریسک',
        current: `${riskLabel(currentRisk)} (${currentRisk.toLocaleString('fa-IR')})`,
        suggested: `${riskLabel(suggestedRisk)} (${suggestedRisk.toLocaleString('fa-IR')})`,
        impact: suggestedRisk < currentRisk ? `کاهش ${Math.abs(currentRisk - suggestedRisk).toLocaleString('fa-IR')} امتیاز ریسک` : 'ریسک نیازمند کنترل دستی',
      },
    ];

    return {
      currentRisk,
      suggestedRisk,
      riskDelta: currentRisk - suggestedRisk,
      rows,
      canCompare: installmentSystemProposal.canApply,
      summary: installmentSystemProposal.canApply
        ? (suggestedRisk < currentRisk
          ? `پیشنهاد سیستم حدود ${Math.abs(currentRisk - suggestedRisk).toLocaleString('fa-IR')} امتیاز ریسک را کمتر می‌کند و برنامه وصول را منظم‌تر می‌کند.`
          : 'پیشنهاد سیستم آماده است؛ قبل از اعمال، اختلاف عددی با شرایط فعلی را بررسی کن.')
        : 'برای مقایسه شرایط فعلی و پیشنهادی، ابتدا مشتری و اقلام فروش را انتخاب کن.',
    };
  }, [accessoriesBuyTotal, downPaymentNum, finalPrice, formData.installmentAmount, formData.numberOfInstallments, installmentSystemProposal, phoneLines.length, phonesBuyTotal, profitPercent, remainingAfterDownPayment, selectedInstallmentCustomer, sellerProfit, TOL]);

  const applyInstallmentSystemProposal = () => {
    if (!installmentSystemProposal.canApply) {
      setNotification({ type: 'error', text: 'برای اعمال پیشنهاد سیستم، ابتدا مشتری و حداقل یک قلم فروش را انتخاب کنید.' });
      return;
    }

    setSaleType('installment');
    setProfitPercent(installmentSystemProposal.suggestedProfitPercent);
    setFormData(prev => ({
      ...prev,
      downPayment: String(installmentSystemProposal.suggestedDownPayment),
      numberOfInstallments: String(installmentSystemProposal.suggestedMonths),
      installmentAmount: String(installmentSystemProposal.suggestedInstallmentAmount),
      actualSalePrice: String(installmentSystemProposal.suggestedFinalPrice),
    }));
    setFormErrors(prev => ({
      ...prev,
      downPayment: undefined,
      numberOfInstallments: undefined,
      installmentAmount: undefined,
      saleType: undefined,
    }));
    setWizardStep(2);
    setNotification({ type: 'success', text: 'پیشنهاد سیستم روی پیش‌پرداخت، سود ماهانه، تعداد اقساط و مبلغ هر قسط اعمال شد.' });
  };

  const installmentAdvisorInsights = useMemo<SmartSalesInsight[]>(() => {
    const insights: SmartSalesInsight[] = [];
    const money = (value: number) => formatCurrencyText(value, readStoredCurrencyUnit());
    const percent = (part: number, total: number) => total > 0 ? (part / total) * 100 : 0;
    const customerBalance = Number(selectedInstallmentCustomer?.currentBalance || 0);
    const downPaymentRate = percent(downPaymentNum, finalPrice);
    const discountRate = percent(discountToman, baseSum);
    const profitRate = percent(sellerProfit, finalPrice);
    const totalInstallmentValue = Math.max(1, toNumber(formData.numberOfInstallments)) * toNumber(formData.installmentAmount);
    const installmentDiff = Math.abs(totalInstallmentValue - remainingAfterDownPayment);

    if (!selectedInstallmentCustomer) {
      insights.push({
        id: 'installment-no-customer',
        title: 'مشتری هنوز انتخاب نشده',
        summary: 'برای فروش اقساطی، امتیاز ریسک و برنامه پیگیری بدون مشتری قابل اعتماد نیست.',
        severity: 'critical',
        confidence: 95,
        icon: 'fa-solid fa-user-lock',
        reasons: ['اقساط، چک‌ها و مانده وصول باید به پرونده مشتری وصل شوند.', 'بعد از انتخاب مشتری، دستیار مانده قبلی و ریسک جدید را هم تحلیل می‌کند.'],
        metrics: [{ label: 'وضعیت مشتری', value: 'انتخاب نشده' }],
      });
    }

    if (phoneLines.length === 0 && accessories.length === 0 && serviceLines.length === 0) {
      insights.push({
        id: 'installment-no-items',
        title: 'اقلام فروش کامل نیست',
        summary: 'حداقل یک گوشی، لوازم یا خدمت انتخاب شود تا قیمت نهایی و سود واقعی تحلیل شود.',
        severity: 'info',
        confidence: 68,
        icon: 'fa-solid fa-boxes-stacked',
        reasons: ['مبنای پیشنهاد پیش‌پرداخت و اقساط، جمع اقلام انتخاب‌شده است.', 'برای گوشی‌ها، قیمت خرید روز در سود واقعی اثر مستقیم دارد.'],
      });
    }

    if (selectedInstallmentCustomer && customerBalance > 0) {
      const projectedBalance = customerBalance + remainingAfterDownPayment;
      insights.push({
        id: 'installment-customer-balance',
        title: 'این مشتری مانده قبلی دارد',
        summary: `مانده قبلی ${money(customerBalance)} است و با این قرارداد مانده درگیر به ${money(projectedBalance)} می‌رسد.`,
        severity: projectedBalance > 75000000 ? 'critical' : 'warning',
        confidence: 88,
        icon: 'fa-solid fa-user-shield',
        reasons: ['مانده قبلی، احتمال فشار وصول را بالا می‌برد.', 'برای فروش جدید بهتر است پیش‌پرداخت بالاتر یا برنامه پیگیری نزدیک‌تر تعیین شود.'],
        metrics: [{ label: 'مانده قبلی', value: money(customerBalance) }, { label: 'مانده قرارداد جدید', value: money(remainingAfterDownPayment) }, { label: 'مانده تجمیعی', value: money(projectedBalance) }],
        actionLabel: 'دیدن پرونده مشتری',
        actionTo: `/customers/${selectedInstallmentCustomer.id}`,
      });
    }

    if (finalPrice > 0 && downPaymentRate < 30 && remainingAfterDownPayment > 0) {
      insights.push({
        id: 'low-down-payment',
        title: 'پیش‌پرداخت برای فروش اقساطی پایین است',
        summary: `پیش‌پرداخت فعلی ${downPaymentRate.toFixed(1).replace('.', '٫')}٪ است؛ برای گوشی معمولاً کمتر از ۳۰٪ ریسک وصول را بالا می‌برد.`,
        severity: downPaymentRate < 20 ? 'critical' : 'warning',
        confidence: 86,
        icon: 'fa-solid fa-hand-holding-dollar',
        reasons: ['در فروش گوشی، ارزش کالا سریع تغییر می‌کند و پیش‌پرداخت کم، ریسک مانده را بالا می‌برد.', 'اگر مشتری سابقه مانده دارد، حداقل پیش‌پرداخت پیشنهادی باید سخت‌گیرانه‌تر باشد.'],
        metrics: [{ label: 'قیمت نهایی', value: money(finalPrice) }, { label: 'پیش‌پرداخت', value: money(downPaymentNum) }, { label: 'درصد پیش‌پرداخت', value: `${downPaymentRate.toFixed(1).replace('.', '٫')}٪` }],
      });
    }

    if (baseSum > 0 && discountRate >= 8) {
      insights.push({
        id: 'installment-high-discount',
        title: 'تخفیف قرارداد قابل توجه است',
        summary: `تخفیف حدود ${discountRate.toFixed(1).replace('.', '٫')}٪ مبلغ پایه است و روی سود واقعی اثر مستقیم دارد.`,
        severity: discountRate >= 15 ? 'critical' : 'warning',
        confidence: 82,
        icon: 'fa-solid fa-percent',
        reasons: ['تخفیف اقساطی هم سود را کم می‌کند و هم ممکن است ریسک وصول را توجیه‌ناپذیر کند.', 'قبل از ثبت، سود فروش و پیش‌پرداخت را کنار هم بررسی کن.'],
        metrics: [{ label: 'مبلغ پایه', value: money(baseSum) }, { label: 'تخفیف', value: money(discountToman) }, { label: 'درصد تخفیف', value: `${discountRate.toFixed(1).replace('.', '٫')}٪` }],
      });
    }

    if (finalPrice > 0 && sellerProfit < 0) {
      insights.push({
        id: 'installment-negative-profit',
        title: 'سود واقعی قرارداد منفی است',
        summary: `با قیمت خرید روز/مبنای خرید، این قرارداد حدود ${money(Math.abs(sellerProfit))} زیان نشان می‌دهد.`,
        severity: 'critical',
        confidence: 93,
        icon: 'fa-solid fa-arrow-trend-down',
        reasons: ['قیمت نهایی پس از تخفیف و سود اقساط با بهای گوشی/لوازم مقایسه شده است.', 'برای واقعی شدن سود گوشی، قیمت خرید روز باید دقیق وارد شده باشد.'],
        metrics: [{ label: 'قیمت نهایی', value: money(finalPrice) }, { label: 'بهای اقلام', value: money(phonesBuyTotal + accessoriesBuyTotal) }, { label: 'زیان احتمالی', value: money(Math.abs(sellerProfit)) }],
      });
    } else if (finalPrice > 0 && sellerProfit > 0 && profitRate < 6) {
      insights.push({
        id: 'installment-low-profit-rate',
        title: 'حاشیه سود فروش اقساطی پایین است',
        summary: `حاشیه سود حدود ${profitRate.toFixed(1).replace('.', '٫')}٪ است؛ با ریسک وصول، این قرارداد باید دقیق‌تر بررسی شود.`,
        severity: 'warning',
        confidence: 78,
        icon: 'fa-solid fa-scale-balanced',
        reasons: ['فروش اقساطی علاوه بر سود، ریسک زمان وصول دارد.', 'اگر حاشیه سود کم باشد، تأخیر پرداخت می‌تواند کیفیت سود را کاهش دهد.'],
        metrics: [{ label: 'سود قرارداد', value: money(sellerProfit) }, { label: 'حاشیه سود', value: `${profitRate.toFixed(1).replace('.', '٫')}٪` }],
      });
    }

    if (saleType === 'installment' && remainingAfterDownPayment > 0 && installmentDiff > TOL) {
      insights.push({
        id: 'installment-plan-mismatch',
        title: 'برنامه اقساط با مانده بدهی هم‌خوان نیست',
        summary: `اختلاف برنامه اقساط با مانده قرارداد ${money(installmentDiff)} است.`,
        severity: 'critical',
        confidence: 90,
        icon: 'fa-solid fa-calculator',
        reasons: ['جمع تعداد اقساط ضربدر مبلغ هر قسط باید نزدیک به مانده قرارداد باشد.', 'برای اصلاح سریع می‌توانی از محاسبه خودکار مبلغ قسط استفاده کنی.'],
        metrics: [{ label: 'مانده پس از پیش‌پرداخت', value: money(remainingAfterDownPayment) }, { label: 'جمع برنامه اقساط', value: money(totalInstallmentValue) }, { label: 'اختلاف', value: money(installmentDiff) }],
      });
    }

    if (saleType === 'check' && formData.checks.length === 0 && remainingAfterDownPayment > 0) {
      insights.push({
        id: 'check-sale-without-checks',
        title: 'فروش چکی بدون ثبت چک',
        summary: 'برای فروش با چک، بهتر است مشخصات چک قبل از ثبت نهایی وارد شود.',
        severity: 'warning',
        confidence: 84,
        icon: 'fa-solid fa-money-check-dollar',
        reasons: ['بدون ثبت چک، کنترل سررسید و پیگیری وصول ناقص می‌شود.', 'چک‌های ثبت‌شده وارد مرکز پیگیری وصول و اعلان‌های سررسید می‌شوند.'],
        metrics: [{ label: 'مانده چکی', value: money(remainingAfterDownPayment) }, { label: 'چک ثبت‌شده', value: formData.checks.length.toLocaleString('fa-IR') }],
      });
    }

    if (saleType === 'installment' && remainingAfterDownPayment > 0 && toNumber(profitPercent) <= 0) {
      insights.push({
        id: 'zero-installment-profit-percent',
        title: 'درصد سود ماهانه صفر است',
        summary: 'اگر این فروش اقساطی است، سود ماهانه صفر می‌تواند کیفیت سود را پایین بیاورد.',
        severity: 'info',
        confidence: 70,
        icon: 'fa-solid fa-chart-line',
        reasons: ['اقساط بدون سود ماهانه از نظر جریان نقدی شبیه فروش اعتباری بلندمدت می‌شود.', 'اگر سیاست فروشگاه این است، این هشدار فقط جهت یادآوری است.'],
        metrics: [{ label: 'درصد سود ماهانه', value: `${toNumber(profitPercent).toLocaleString('fa-IR')}٪` }, { label: 'مانده اقساط', value: money(remainingAfterDownPayment) }],
      });
    }

    if (finalPrice > 0 && insights.every((item) => item.severity !== 'critical' && item.severity !== 'warning')) {
      insights.push({
        id: 'installment-healthy-contract',
        title: 'قرارداد از نظر اولیه قابل قبول است',
        summary: 'پیش‌پرداخت، سود و برنامه پرداخت در محدوده بدون هشدار جدی قرار دارند.',
        severity: 'success',
        confidence: 80,
        icon: 'fa-solid fa-shield-check',
        reasons: ['مانده قرارداد با برنامه پرداخت تضاد جدی ندارد.', 'سود منفی و تخفیف غیرعادی در شرایط فعلی دیده نشد.'],
        metrics: [{ label: 'قیمت نهایی', value: money(finalPrice) }, { label: 'مانده وصول', value: money(remainingAfterDownPayment) }, { label: 'سود قرارداد', value: money(sellerProfit) }],
      });
    }

    return insights;
  }, [accessories.length, baseSum, customers, discountToman, downPaymentNum, finalPrice, formData.checks.length, formData.customerId, formData.installmentAmount, formData.numberOfInstallments, phoneLines.length, phonesBuyTotal, profitPercent, remainingAfterDownPayment, saleType, selectedInstallmentCustomer, sellerProfit, serviceLines.length, TOL]);

  /* ---------------- Render ---------------- */
  return (
    <div className="installment-form-page space-y-6 text-right max-w-7xl mx-auto px-4" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <form ref={formRef} onKeyDownCapture={onKeyDownCapture} onSubmit={handleSubmit} className="max-w-6xl mx-auto" aria-busy={isLoading} data-ergonomic-form="true">
        <FormErrorSummary
          errors={Object.fromEntries(Object.entries(formErrors as any).filter(([,v]) => Boolean(v))) as FormErrors}
          labels={errorLabels}
          fieldIdMap={fieldIdMap}
          className="mb-4"
        />

        <div className="mb-5">
          <WorkflowWizard
            steps={([
              { id: 'base', title: 'اطلاعات پایه', description: 'مشتری و نوع فروش', icon: 'fa-solid fa-user', anchorId: 'installment-step-base' },
              { id: 'items', title: 'اقلام', description: 'گوشی/لوازم/خدمات', icon: 'fa-solid fa-boxes-stacked', anchorId: 'installment-step-items' },
              { id: 'finance', title: 'اقساط و قیمت', description: 'پیش‌پرداخت و برنامه پرداخت', icon: 'fa-solid fa-calculator', anchorId: 'installment-step-finance' },
              { id: 'final', title: 'ثبت اطلاعات نهایی', description: 'یادداشت و ثبت اطلاعات', icon: 'fa-solid fa-check', anchorId: 'installment-step-final' },
            ] as WizardStep[])}
            stepIndex={wizardStep}
            onStepChange={setWizardStep}
          />
        </div>

        <div className="mb-5">
          <SmartSalesAdvisor
            title="دستیار هوشمند فروش اقساطی"
            subtitle="همزمان با تکمیل فرم، پیش‌پرداخت، سود واقعی، مانده وصول و ریسک مشتری را کنترل می‌کند."
            contextLabel={saleType === 'check' ? 'فروش چکی' : 'اقساط ماهانه'}
            learningStatus={phoneLines.length + accessories.length + serviceLines.length >= 2 ? 'trusted' : 'learning'}
            insights={installmentAdvisorInsights}
          />
        </div>

        <div className="mb-5 rounded-[24px] border border-slate-200 bg-white/95 p-4 shadow-[0_22px_46px_-42px_rgba(15,23,42,0.35)] dark:border-slate-800 dark:bg-slate-950/88">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
            <div className="min-w-0 text-right">
              <div className="inline-flex items-center gap-2 rounded-full border border-indigo-100 bg-indigo-50 px-3 py-1 text-[11px] font-black text-indigo-700 dark:border-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-200">
                <i className="fa-solid fa-wand-magic-sparkles" />
                پیشنهاد قابل اعمال سیستم
              </div>
              <h3 className="mt-2 text-base font-black text-slate-950 dark:text-white">چیدمان پیشنهادی اقساط برای همین قرارداد</h3>
              <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">{installmentSystemProposal.summary}</p>
            </div>
            <Button
              type="button"
              variant="primary"
              size="sm"
              onClick={applyInstallmentSystemProposal}
              disabled={!installmentSystemProposal.canApply}
              leftIcon={<i className="fa-solid fa-check-double" />}
            >
              اعمال پیشنهاد سیستم
            </Button>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            {[
              ['پیش‌پرداخت پیشنهادی', `${installmentSystemProposal.suggestedDownPayment.toLocaleString('fa-IR')} تومان`],
              ['تعداد اقساط', `${installmentSystemProposal.suggestedMonths.toLocaleString('fa-IR')} ماه`],
              ['مبلغ هر قسط', `${installmentSystemProposal.suggestedInstallmentAmount.toLocaleString('fa-IR')} تومان`],
              ['سود ماهانه', `${installmentSystemProposal.suggestedProfitPercent.toLocaleString('fa-IR')}٪`],
            ].map(([label, value]) => (
              <div key={label} className="rounded-2xl border border-slate-100 bg-slate-50/80 px-3 py-3 text-right dark:border-slate-800 dark:bg-slate-900/55">
                <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">{label}</div>
                <div className="mt-1 text-[13px] font-black text-slate-900 dark:text-slate-100">{value}</div>
              </div>
            ))}
          </div>

          <div className="mt-4 rounded-[22px] border border-slate-200 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-900/45">
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
              <div className="text-right">
                <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1 text-[10px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                  <i className="fa-solid fa-scale-balanced" />
                  مقایسه قبل از اعمال
                </div>
                <h4 className="mt-2 text-[13px] font-black text-slate-950 dark:text-white">شرایط فعلی در برابر پیشنهاد سیستم</h4>
                <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">{installmentProposalComparison.summary}</p>
              </div>
              <div className={["inline-flex items-center justify-center gap-2 rounded-2xl px-3 py-2 text-[11px] font-black", installmentProposalComparison.riskDelta > 0 ? 'border border-emerald-100 bg-emerald-50 text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200' : 'border border-amber-100 bg-amber-50 text-amber-700 dark:border-amber-500/20 dark:bg-amber-500/10 dark:text-amber-200'].join(' ')}>
                <i className={installmentProposalComparison.riskDelta > 0 ? 'fa-solid fa-arrow-trend-down' : 'fa-solid fa-triangle-exclamation'} />
                {installmentProposalComparison.riskDelta > 0
                  ? `کاهش ریسک: ${installmentProposalComparison.riskDelta.toLocaleString('fa-IR')} امتیاز`
                  : 'بدون کاهش قطعی ریسک'}
              </div>
            </div>

            <div className="mt-3 overflow-hidden rounded-2xl border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/55">
              <div className="grid grid-cols-4 gap-0 border-b border-slate-100 bg-slate-50 text-[10px] font-black text-slate-400 dark:border-slate-800 dark:bg-slate-900/70 dark:text-slate-500">
                <div className="px-3 py-2 text-right">شاخص</div>
                <div className="px-3 py-2 text-right">فعلی</div>
                <div className="px-3 py-2 text-right">پیشنهادی</div>
                <div className="px-3 py-2 text-right">اثر</div>
              </div>
              {installmentProposalComparison.rows.map((row) => (
                <div key={row.label} className="grid grid-cols-4 gap-0 border-b border-slate-100 text-[11px] last:border-b-0 dark:border-slate-800/80">
                  <div className="px-3 py-2 font-black text-slate-700 dark:text-slate-200">{row.label}</div>
                  <div className="px-3 py-2 font-semibold text-slate-500 dark:text-slate-400">{row.current}</div>
                  <div className="px-3 py-2 font-black text-slate-900 dark:text-white">{row.suggested}</div>
                  <div className="px-3 py-2 text-slate-500 dark:text-slate-400">{row.impact}</div>
                </div>
              ))}
            </div>
          </div>

          <div className="mt-3 grid gap-2 lg:grid-cols-2">
            {installmentSystemProposal.reasons.slice(0, 4).map((reason) => (
              <div key={reason} className="flex items-start gap-2 rounded-2xl border border-slate-100 bg-white px-3 py-2 text-[11px] leading-5 text-slate-600 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-300">
                <i className="fa-solid fa-circle-check mt-1 text-[10px] text-emerald-500" />
                <span>{reason}</span>
              </div>
            ))}
          </div>
        </div>

        {/* اطلاعات پایه */}
        <div id="installment-step-base" className={["app-card p-4 md:p-6 mb-6", wizardStep === 0 ? '' : 'hidden lg:block'].join(' ')}>
          <div className="flex items-center gap-2 mb-4 border-b dark:border-gray-700 pb-3">
            <i className="fa-solid fa-user-plus text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">اطلاعات پایه فروش اقساطی</h2>
          </div>

          <FormSection title="اطلاعات پایه" description="مشتری، نوع فروش و تاریخ شروع را مشخص کنید." className="mt-4">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* مشتری */}
            <div>
              <label htmlFor="customerId" className={labelClass}>
                انتخاب مشتری <span className="text-red-500">*</span>
              </label>
              <select
                id="customerId"
                name="customerId"
                value={formData.customerId || ''}
                onChange={handleFormInputChange}
                className={`${inputClass('customerId', true)} border-indigo-200`}
                disabled={isLoadingCustomers}
              >
                <option value="">-- انتخاب کنید --</option>
                {customers.map(c => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phoneNumber || 'بی‌نام'})
                  </option>
                ))}
              </select>
              {isLoadingCustomers && <p className="text-xs text-gray-500 mt-1">درحال بارگذاری مشتریان...</p>}
              {formErrors.customerId && <p className="app-error">{formErrors.customerId}</p>}
            </div>

            {/* نوع فروش */}
            <div>
              <label className={labelClass}>نوع فروش</label>
              <select
                value={saleType}
                onChange={(e) => setSaleType(e.target.value as SaleType)}
                className={inputClass('saleType', true)}
              >
                <option value="installment">اقساط ماهانه</option>
                <option value="check">فروش با چک (بدون اقساط ماهانه)</option>
              </select>
            </div>

            {/* تاریخ واقعی فروش/خرید اقساطی */}
            <div>
              <label className={labelClass}>تاریخ خرید اقساطی *</label>
              <ShamsiDatePicker
                id="saleDate"
                selectedDate={saleDatePicker}
                onDateChange={setSaleDatePicker}
                inputClassName={inputClass()}
              />
              <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">اگر امروز ثبت می‌کنی اما فروش واقعی قبلاً انجام شده، تاریخ واقعی فروش را اینجا بزن.</p>
            </div>

            {/* تاریخ شروع اقساط */}
            <div>
              <label className={labelClass}>تاریخ شروع اقساط *</label>
              <ShamsiDatePicker
                id="installmentsStartDate"
                selectedDate={installmentsStartDatePicker}
                onDateChange={setInstallmentsStartDatePicker}
                inputClassName={inputClass()}
              />
            </div>
            </div>
          </FormSection>
        </div>

        {/* انتخاب موبایل‌ها */}
        <div id="installment-step-items" className={["space-y-6", wizardStep === 1 ? '' : 'hidden lg:block'].join(' ')}>
          <div className="app-card p-4 md:p-6 mb-6">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-mobile-screen-button text-indigo-600" />
              <h3 className="font-bold">موبایل‌های فروخته‌شده</h3>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
              <select
                value={phoneToAddId}
                onChange={(e) => setPhoneToAddId(Number(e.target.value) || '')}
                className={`${inputClass(undefined, true)} min-w-[18rem] sm:min-w-[22rem]`}
              >
                <option value="">انتخاب گوشی برای افزودن</option>
                {availablePhones.map(p => (
                  <option key={p.id} value={p.id}>
                    {(p as any).title || p.model} {(p as any).imei ? `• IMEI: ${(p as any).imei}` : ''} • فروش: {toNumber((p as any).salePrice).toLocaleString('fa-IR')}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                onClick={addPhoneLine}
                variant="primary"
                size="xs"
                className="min-w-[12.5rem] whitespace-nowrap justify-center"
                leftIcon={<i className="fa-solid fa-plus" />}
              >
                افزودن گوشی به فروش
              </Button>
            </div>
          </div>

          {phoneLines.length === 0 ? (
            <p className="text-sm text-gray-500">هنوز موبایلی انتخاب نشده است.</p>
          ) : (
            <>
              <div className="rounded border border-gray-200 dark:border-gray-700 max-h-48 overflow-auto">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-1 text-right">نام/مدل</th>
                      <th className="px-2 py-1 text-right">IMEI</th>
                      <th className="px-2 py-1 text-right">قیمت خرید</th>
                      <th className="px-2 py-1 text-right">مبنای بها</th>
                      <th className="px-2 py-1 text-right">قیمت فروش</th>
                      <th className="px-2 py-1 text-center">حذف مورد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {phoneLines.map(p => (
                      <tr key={p.id} className="border-t dark:border-gray-700">
                        <td className="px-2 py-1">{p.title}</td>
                        <td className="px-2 py-1">{p.imei || '—'}</td>
                        <td className="px-2 py-1">{toNumber(p.buyPrice).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">
                          <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                            <i className="fa-solid fa-scale-balanced text-[9px]" />
                            {p.costBasisSource === 'currentPurchasePrice' ? 'قیمت خرید روز' : p.costBasisSource === 'documentBuyPrice' ? 'قیمت خرید سند' : 'قیمت خرید اصلی'}
                          </span>
                        </td>
                        <td className="px-2 py-1">{toNumber(p.sellPrice).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1 text-center">
                          <Button type="button" variant="danger" size="xs" onClick={() => removePhoneLine(p.id)}>
                            حذف مورد
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-3 text-sm mt-2">
                <i className="fa-solid fa-sum text-indigo-600" />
                <span>جمع قیمت گوشی‌ها:</span>
                <strong className="mr-1">{formatCurrencyText(phonesSellTotal, readStoredCurrencyUnit())}</strong>
              </div>
            </>
          )}
          {/* خطا در عملیاتی اقلام (اگر هیچ آیتمی انتخاب نشود) پایین‌تر نمایش داده می‌شود */}
        </div>

        {/* لوازم جانبی از محصولات */}
        <div className="app-card p-4 md:p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-cart-plus text-indigo-600" />
              <h3 className="font-bold">لوازم جانبی فروخته‌شده</h3>
            </div>
            <Button
              type="button"
              onClick={openAccessoryModal}
              variant="primary"
              size="xs"
              leftIcon={<i className="fa-solid fa-plus" />}
            >
              افزودن مورد جدید از محصولات
            </Button>
          </div>

          {isLoadingProducts ? (
            <p className="text-xs text-gray-500 mt-2">درحال بارگذاری محصولات...</p>
          ) : accessories.length === 0 ? (
            <p className="text-gray-500 text-sm mt-2">آیتمی افزوده نشده است.</p>
          ) : (
            <>
              <div className="rounded border border-gray-200 dark:border-gray-700 max-h-40 overflow-auto mt-2">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-1 text-right">نام</th>
                      <th className="px-2 py-1 text-right">قیمت خرید</th>
                      <th className="px-2 py-1 text-right">مبنای بها</th>
                      <th className="px-2 py-1 text-right">قیمت فروش</th>
                      <th className="px-2 py-1 text-right">تعداد</th>
                      <th className="px-2 py-1 text-right">جمع فروش</th>
                      <th className="px-2 py-1 text-center">حذف مورد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accessories.map((a, i) => (
                      <tr key={i} className="border-t dark:border-gray-700">
                        <td className="px-2 py-1">{a.name}</td>
                        <td className="px-2 py-1">{a.buyPrice.toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{a.sellPrice.toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{a.qty}</td>
                        <td className="px-2 py-1">{(a.sellPrice * a.qty).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1 text-center">
                          <Button type="button" variant="danger" size="xs" onClick={() => removeAccessory(i)}>
                            حذف مورد
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 text-sm mt-2">
                <i className="fa-solid fa-basket-shopping text-indigo-600" />
                <span>قیمت لوازم:</span>
                <strong className="mr-1">{formatCurrencyText(accessoriesSellTotal, readStoredCurrencyUnit())}</strong>
              </div>
            </>
          )}
        </div>

        {/* خدمات */}
        <div className="app-card p-4 md:p-6 mb-6">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-wrench text-indigo-600" />
              <h3 className="font-bold">خدمات فروخته‌شده</h3>
            </div>
            <Button
              type="button"
              onClick={openServiceModal}
              variant="primary"
              size="xs"
              leftIcon={<i className="fa-solid fa-plus" />}
            >
              افزودن مورد جدید خدمت
            </Button>
          </div>

          {isLoadingServices ? (
            <p className="text-xs text-gray-500 mt-2">درحال بارگذاری خدمات...</p>
          ) : serviceLines.length === 0 ? (
            <p className="text-gray-500 text-sm mt-2">آیتمی افزوده نشده است.</p>
          ) : (
            <>
              <div className="rounded border border-gray-200 dark:border-gray-700 max-h-40 overflow-auto mt-2">
                <table className="min-w-full text-xs">
                  <thead className="bg-gray-50 dark:bg-gray-700/50">
                    <tr>
                      <th className="px-2 py-1 text-right">نام</th>
                      <th className="px-2 py-1 text-right">قیمت</th>
                      <th className="px-2 py-1 text-right">تعداد</th>
                      <th className="px-2 py-1 text-right">جمع</th>
                      <th className="px-2 py-1 text-center">حذف مورد</th>
                    </tr>
                  </thead>
                  <tbody>
                    {serviceLines.map((s, i) => (
                      <tr key={i} className="border-t dark:border-gray-700">
                        <td className="px-2 py-1">{s.name}</td>
                        <td className="px-2 py-1">{toNumber(s.sellPrice).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{toNumber(s.qty).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1">{(toNumber(s.sellPrice) * toNumber(s.qty)).toLocaleString('fa-IR')}</td>
                        <td className="px-2 py-1 text-center">
                          <Button type="button" variant="danger" size="xs" onClick={() => removeService(i)}>
                            حذف مورد
                          </Button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="flex items-center gap-2 text-sm mt-2">
                <i className="fa-solid fa-screwdriver-wrench text-indigo-600" />
                <span>قیمت خدمات:</span>
                <strong className="mr-1">{formatCurrencyText(servicesSellTotal, readStoredCurrencyUnit())}</strong>
              </div>
            </>
          )}

          {(formErrors as any).items && (
            <p className="app-error">{(formErrors as any).items}</p>
          )}
        </div>
        </div>

        {/* مودال لوازم */}
        {isAccessoryModalOpen && (
          <Modal title="افزودن مورد جدید لوازم از محصولات" onClose={() => setIsAccessoryModalOpen(false)} widthClass="max-w-md">
            <div className="space-y-3 p-1 text-sm">
              <div>
                <label className={labelClass}>انتخاب محصول</label>
                <select value={accessoryProductId} onChange={onChangeAccessoryProduct} className={inputClass(undefined, true)}>
                  <option value="">-- انتخاب کنید --</option>
                  {availableProducts.map(p => (
                    <option key={p.id} value={p.id}>
                      {p.title} • فروش: {toNumber(p.salePrice).toLocaleString('fa-IR')} • موجودی: {p.stock === null ? '—' : toNumber(p.stock)}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div>
                  <label className={labelClass}>قیمت خرید</label>
                  <input type="text" readOnly value={modalBuyPrice.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50`} />
                </div>
                <div>
                  <label className={labelClass}>قیمت فروش</label>
                  <input type="text" readOnly value={modalSellPrice.toLocaleString('fa-IR')} className={`${inputClass()} bg-gray-50`} />
                </div>
                <div>
                  <label className={labelClass}>تعداد</label>
                  <input type="number" min={1} value={accessoryQty} onChange={(e) => setAccessoryQty(Number(e.target.value || 1))} className={inputClass()} />
                  <p className="text-[11px] text-gray-500 mt-1">موجودی: {modalStock === null ? 'نامشخص' : modalStock}</p>
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-2">
                <Button type="button" onClick={() => setIsAccessoryModalOpen(false)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-xmark" />}>
                  انصراف
                </Button>
                <Button type="button" onClick={addAccessoryLine} variant="primary" size="xs" leftIcon={<i className="fa-solid fa-plus" />}>
                  افزودن مورد جدید
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* مودال خدمات */}
        {isServiceModalOpen && (
          <Modal title="افزودن مورد جدید خدمت" onClose={() => setIsServiceModalOpen(false)} widthClass="max-w-md">
            <div className="space-y-3 p-1 text-sm">
              <div>
                <label className={labelClass}>انتخاب خدمت</label>
                <select value={serviceToAddId} onChange={onChangeServiceToAdd} className={inputClass(undefined, true)}>
                  <option value="">-- انتخاب کنید --</option>
                  {availableServices.map(s => (
                    <option key={s.id} value={s.id}>
                      {s.name} • قیمت: {toNumber(s.price || 0).toLocaleString('fa-IR')}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>قیمت خدمت ({getCurrencyUnitLabel(readStoredCurrencyUnit())})</label>
                  <PriceInput
                    name="serviceModalPrice"
                    value={String(serviceModalPrice || '')}
                    onChange={(e: any) => setServiceModalPrice(toNumber(e.target.value))}
                    className={inputClass()}
                    preview="مثال: ۳۵۰٬۰۰۰"
                  />
                </div>
                <div>
                  <label className={labelClass}>تعداد</label>
                  <input type="number" min={1} value={serviceQty} onChange={(e) => setServiceQty(Number(e.target.value || 1))} className={inputClass()} />
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-2">
                <Button type="button" onClick={() => setIsServiceModalOpen(false)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-xmark" />}>
                  انصراف
                </Button>
                <Button type="button" onClick={addServiceLine} variant="primary" size="xs" leftIcon={<i className="fa-solid fa-plus" />}>
                  افزودن مورد جدید
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* جزئیات قیمت و اقساط */}
        <div id="installment-step-finance" className={["bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-6 mb-8 border border-gray-100 dark:border-gray-700", wizardStep === 2 ? '' : 'hidden lg:block'].join(' ')}>
          <div className="flex items-center gap-2 mb-5 border-b dark:border-gray-700 pb-3">
            <i className="fa-solid fa-calculator text-indigo-600 text-lg" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">جزئیات قیمت و اقساط</h2>
          </div>

          {/* قیمت‌ها */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-mobile-screen ml-2 text-indigo-600" />
                جمع قیمت گوشی‌ها ({getCurrencyUnitLabel(readStoredCurrencyUnit())})
              </label>
              <input type="text" readOnly value={formatCurrencyText(phonesSellTotal, readStoredCurrencyUnit())} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-headphones ml-2 text-indigo-600" />
                قیمت لوازم
              </label>
              <input type="text" readOnly value={formatCurrencyText(accessoriesSellTotal, readStoredCurrencyUnit())} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-wrench ml-2 text-indigo-600" />
                قیمت خدمات
              </label>
              <input type="text" readOnly value={formatCurrencyText(servicesSellTotal, readStoredCurrencyUnit())} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
            </div>

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-sack-dollar ml-2 text-indigo-600" />
                قیمت نهایی (پس از تخفیف و سود)
              </label>
              <input id="actualSalePrice" type="text" readOnly value={formatCurrencyText(finalPrice, readStoredCurrencyUnit())} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
            </div>
          </div>

          {/* پیش‌پرداخت، سود ماهانه، تخفیف */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-2">
            <div className="space-y-1">
              <label htmlFor="downPayment" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-hand-holding-dollar ml-2 text-teal-600" />
                پیش‌پرداخت ({getCurrencyUnitLabel(readStoredCurrencyUnit())}) *
              </label>
              <PriceInput
                id="downPayment"
                name="downPayment"
                value={String(formData.downPayment)}
                onChange={handleFormInputChange}
                className={inputClass('downPayment')}
                preview="مثال: ۱۰٬۰۰۰٬۰۰۰"
              />
              {formErrors.downPayment && <p className="app-error">{formErrors.downPayment}</p>}
            </div>

            {renderNumberField({
              label: 'درصد سود «ماهانه»',
              icon: 'fa-solid fa-percent text-fuchsia-600',
              value: profitPercent,
              onChange: (e) => setProfitPercent(Number(e.target.value || 0)),
              preview: 'مثال: ۷',
              suffix: '٪',
              topLabel: 'درصد',
            })}

            <div className="space-y-1">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                <i className="fa-solid fa-ticket ml-2 text-amber-600" />
                تخفیف ({getCurrencyUnitLabel(readStoredCurrencyUnit())})
              </label>
              <PriceInput
                id="discountToman"
                name="discountToman"
                value={String(discountToman)}
                onChange={(e: any) => setDiscountToman(toNumber(e.target.value))}
                className={inputClass('discount')}
                preview="مثال: ۵۰۰٬۰۰۰"
              />
              {(formErrors as any).discount && <p className="app-error">{(formErrors as any).discount}</p>}
            </div>
          </div>

          {/* حالت‌های اقساط/چک */}
          {saleType === 'installment' ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="numberOfInstallments" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    <i className="fa-solid fa-calendar-days ml-2 text-indigo-600" />
                    تعداد اقساط (ماه) *
                  </label>
                  <Button type="button" onClick={autofillInstallmentsCount} variant="ghost" size="xs" leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}>
                    محاسبه خودکار
                  </Button>
                </div>
                <div className="ux-field-meta-row">
                  <span>تعداد</span>
                  <span className="ux-field-meta-chip">ماه</span>
                </div>
                <div className="group relative">
                  <input
                    type="number"
                    id="numberOfInstallments"
                    name="numberOfInstallments"
                    value={formData.numberOfInstallments}
                    onChange={handleFormInputChange}
                    className={inputClass('numberOfInstallments')}
                    preview="مثال: ۱۲"
                    inputMode="numeric"
                    dir="ltr"
                  />
                </div>
                {formErrors.numberOfInstallments && (
                  <p className="app-error">{formErrors.numberOfInstallments}</p>
                )}
              </div>

              <div>
                <div className="flex items-center justify-between">
                  <label htmlFor="installmentAmount" className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                    <i className="fa-solid fa-money-check-pen ml-2 text-indigo-600" />
                    مبلغ هر قسط ({getCurrencyUnitLabel(readStoredCurrencyUnit())}) *
                  </label>
                  <Button type="button" onClick={autofillInstallmentAmount} variant="ghost" size="xs" leftIcon={<i className="fa-solid fa-wand-magic-sparkles" />}>
                    محاسبه خودکار
                  </Button>
                </div>
                <PriceInput
                  id="installmentAmount"
                  name="installmentAmount"
                  value={String(formData.installmentAmount)}
                  onChange={handleFormInputChange}
                  onBlur={onInstallmentBlur}
                  className={inputClass('installmentAmount')}
                  preview="مثال: ۳٬۸۰۰٬۰۰۰"
                />
                <p className="text-[11px] text-gray-500 mt-1">
                  * با دکمه «محاسبه خودکار»، مبلغ هر قسط از تقسیم بدهی بر تعداد اقساط <b>رو به بالا</b> محاسبه می‌شود.
                  (اگر بدهی دقیقاً بر تعداد اقساط بخش‌پذیر نباشد، اختلاف مجموع اقساط معمولاً ۱ تا چند تومان است.)
                </p>
                {formErrors.installmentAmount && (
                  <p className="app-error">{formErrors.installmentAmount}</p>
                )}
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  <i className="fa-solid fa-lock ml-2 text-indigo-600" />
                  بدهی پس از پیش‌پرداخت
                </label>
                <input type="text" readOnly value={formatCurrencyText(remainingAfterDownPayment, readStoredCurrencyUnit())} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {renderNumberField({
                label: 'چک چند ماه دیگر نقد می‌شود؟',
                icon: 'fa-regular fa-clock text-indigo-600',
                value: checkMonths,
                onChange: (e) => setCheckMonths(Math.max(1, Number(e.target.value || 1))),
                preview: 'مثال: ۹',
                suffix: 'ماه',
                topLabel: 'زمان',
                fieldClassName: inputClass('checkMonths'),
                id: 'checkMonths',
              })}
              {formErrors.checkMonths && <p className="app-error">{formErrors.checkMonths}</p>}

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  <i className="fa-solid fa-percent ml-2 text-indigo-600" />
                  سود کل ({profitPercent || 0}% × {monthsForInterest} ماه)
                </label>
                <input type="text" readOnly value={formatCurrencyText(totalInterest, readStoredCurrencyUnit())} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
              </div>

              <div className="space-y-1">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-200">
                  <i className="fa-solid fa-lock ml-2 text-indigo-600" />
                  بدهی پس از پیش‌پرداخت
                </label>
                <input type="text" readOnly value={formatCurrencyText(remainingAfterDownPayment, readStoredCurrencyUnit())} className={`${inputClass()} bg-gray-50 dark:bg-gray-900`} />
              </div>
            </div>
          )}

          {/* خلاصه پایین کارت */}
          <div className="mt-5 bg-indigo-50 dark:bg-indigo-900/20 rounded-xl p-4 text-sm grid grid-cols-1 md:grid-cols-3 gap-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-wallet text-indigo-600" />
              <span>اصل مانده پس از پیش‌پرداخت:</span>
              <strong className="mr-1">{formatCurrencyText(principal, readStoredCurrencyUnit())}</strong>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-percent text-indigo-600" />
              <span>سود کل ({profitPercent || 0}% × {monthsForInterest} ماه):</span>
              <strong className="mr-1">{formatCurrencyText(totalInterest, readStoredCurrencyUnit())}</strong>
            </div>
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-receipt text-indigo-600" />
              <span>مبلغ نهایی کل پرداخت:</span>
              <strong className="mr-1">{formatCurrencyText(finalPrice, readStoredCurrencyUnit())}</strong>
            </div>

            {saleType === 'installment' &&
              Math.abs((monthsInstallments * toNumber(formData.installmentAmount)) - remainingAfterDownPayment) > TOL && (
                <p className="md:col-span-3 mt-1 text-red-600 font-semibold">
                  <i className="fa-solid fa-triangle-exclamation ml-1" />
                  هشدار: اختلاف بیش از {TOL.toLocaleString('fa-IR')} تومان بین مجموع اقساط و بدهی!
                </p>
              )}
          </div>
        </div>

        {/* چک‌ها */}
        <div className="app-card p-4 md:p-6 mb-6">
          <div className="flex justify-between items-center mb-4 border-b dark:border-gray-700 pb-3">
            <div className="flex items-center gap-2">
              <i className="fa-solid fa-money-check-dollar text-indigo-600" />
              <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">اطلاعات چک‌ها (اختیاری)</h2>
            </div>
            <Button
              type="button"
              onClick={() => {
                setCurrentCheck(initialCheckState);
                setCurrentCheckDueDate(new Date());
                setIsCheckModalOpen(true);
              }}
              variant="primary"
              size="xs"
              leftIcon={<i className="fa-solid fa-plus" />}
            >
              افزودن مورد جدید چک
            </Button>
          </div>

          {formData.checks.length === 0 ? (
            <p className="text-gray-500 text-sm">چکی برای این فروش ثبت اطلاعات نشده است.</p>
          ) : (
            <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
              <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-sm">
                <thead className="bg-gray-50 dark:bg-gray-700/50">
                  <tr>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">شماره چک</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">بانک</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">مبلغ</th>
                    <th className="px-3 py-2 text-right font-medium text-gray-600 dark:text-gray-300">سررسید</th>
                    <th className="px-3 py-2 text-center font-medium text-gray-600 dark:text-gray-300">عملیات</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {formData.checks.map((check, index) => (
                    <tr key={index} className="hover:bg-gray-50 dark:hover:bg-gray-700/40">
                      <td className="px-3 py-2 whitespace-nowrap">{check.checkNumber}</td>
                      <td className="px-3 py-2 whitespace-nowrap">{check.bankName}</td>
                      <td className="px-3 py-2 whitespace-nowrap">
                        {formatCurrencyText(Number(check.amount), readStoredCurrencyUnit())}
                      </td>
                      <td className="px-3 py-2 whitespace-nowrap">{check.dueDate}</td>
                      <td className="px-3 py-2 text-center">
                        <Button
                          type="button"
                          onClick={() =>
                            setFormData(prev => ({ ...prev, checks: prev.checks.filter((_, i) => i !== index) }))
                          }
                          variant="danger"
                          size="xs"
                          leftIcon={<i className="fa-solid fa-trash-can" />}
                        >
                          حذف مورد
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* مودال افزودن مورد جدید چک */}
        {isCheckModalOpen && (
          <Modal title="افزودن مورد جدید اطلاعات چک" onClose={() => setIsCheckModalOpen(false)} widthClass="max-w-md">
            <div className="space-y-3 p-1 text-sm">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className={labelClass}>شماره چک</label>
                  <input
                    type="text"
                    name="checkNumber"
                    value={currentCheck.checkNumber}
                    onChange={handleCheckInputChange}
                    className={inputClass('checkNumber')}
                  />
                </div>
                <div>
                  <label className={labelClass}>نام بانک</label>
                  <input
                    type="text"
                    name="bankName"
                    value={currentCheck.bankName}
                    onChange={handleCheckInputChange}
                    className={inputClass('bankName')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>مبلغ چک ({getCurrencyUnitLabel(readStoredCurrencyUnit())})</label>
                  <PriceInput
                    id="checkAmount"
                    name="amount"
                    value={String(currentCheck.amount || '')}
                    onChange={handleCheckInputChange}
                    className={inputClass('amount')}
                  />
                </div>
                <div className="sm:col-span-2">
                  <label className={labelClass}>تاریخ سررسید</label>
                  <ShamsiDatePicker
                    id="checkDueDate"
                    selectedDate={currentCheckDueDate}
                    onDateChange={setCurrentCheckDueDate}
                    inputClassName={inputClass()}
                  />
                </div>
              </div>

              <div className="flex justify-end pt-2 gap-2">
                <Button type="button" onClick={() => setIsCheckModalOpen(false)} variant="secondary" size="xs" leftIcon={<i className="fa-solid fa-xmark" />}>
                  انصراف
                </Button>
                <Button type="button" onClick={addCheckToList} variant="success" size="xs" leftIcon={<i className="fa-solid fa-circle-plus" />}>
                  افزودن مورد جدید چک به لیست
                </Button>
              </div>
            </div>
          </Modal>
        )}

        {/* یادداشت و ثبت اطلاعات نهایی + سود */}
        <div id="installment-step-final" className={["app-card p-4 md:p-6 relative", wizardStep === 3 ? '' : 'hidden lg:block'].join(' ')}>
          <div className="flex items-center gap-2 mb-4 border-b dark:border-gray-700 pb-3">
            <i className="fa-regular fa-note-sticky text-indigo-600" />
            <h2 className="text-xl font-bold text-gray-800 dark:text-gray-100">یادداشت‌ها و ثبت اطلاعات نهایی</h2>
          </div>

          <div className="flex items-center gap-2 bg-emerald-50 dark:bg-emerald-900/20 p-3 rounded mb-4 text-sm">
            <i className="fa-solid fa-money-bill-trend-up text-emerald-600" />
            <span>سود کل فروشنده (گوشی + لوازم + خدمات):</span>
            <strong className="mr-1">{sellerProfit.toLocaleString('fa-IR')} تومان</strong>
          </div>

          <label htmlFor="notes" className={labelClass}>یادداشت (اختیاری)</label>
          <textarea
            id="notes"
            name="notes"
            value={formData.notes || ''}
            onChange={handleFormInputChange}
            rows={3}
            className={inputClass('notes')}
          />
        </div>

        {/* Spacer so sticky bar doesn't cover content */}
        <div className="h-20" />

        {/* Sticky submit bar */}
        <div className="sticky bottom-0 z-20 -mx-4 px-4 pb-[calc(env(safe-area-inset-bottom)+12px)] pt-3 bg-white/70 dark:bg-gray-950/50 backdrop-blur">
          <div className="ux-form-actions">
            <div className="min-w-0">
              <div className="text-[11px] text-gray-500 dark:text-gray-400">مبلغ نهایی</div>
              <div className="text-base font-black text-gray-900 dark:text-gray-100 truncate">
                {formatCurrencyText(finalPrice, readStoredCurrencyUnit())}
              </div>
              <div className="text-[11px] text-gray-500 dark:text-gray-400">
                پیش‌پرداخت: {downPaymentNum.toLocaleString('fa-IR')} — باقیمانده: {remainingAfterDownPayment.toLocaleString('fa-IR')}
              </div>
            </div>

            <div className="flex items-center gap-2">
              <Button
                type="button"
                onClick={() => navigate('/installment-sales')}
                variant="secondary"
                leftIcon={<i className="fa-solid fa-xmark" />}
              >
                انصراف
              </Button>

              <Button
                type="submit"
                disabled={isLoading || isLoadingCustomers || isLoadingPhones || !token}
                variant="primary"
                loading={isLoading}
                loadingText="در حال ثبت اطلاعات..."
                loadingHint={submitStageHint}
                loadingStageStep={submitStageProgress}
                loadingStageTotal={3}
                loadingStageIcon={submitStageIcon}
                successPulseText={APP_MESSAGES.success.created}
                successPulseHint="فاکتور و برنامه اقساط با موفقیت ایجاد شد"
                leftIcon={<i className="fa-solid fa-check" />}
              >
                ثبت اطلاعات نهایی
              </Button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};

export default AddInstallmentSalePage;
