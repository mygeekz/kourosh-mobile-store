// pages/SalesCartPage.tsx
import React, { useState, useEffect, useReducer, useRef, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useStyle } from '../contexts/StyleContext';
import { apiFetch } from '../utils/apiFetch';
import Notification from '../components/Notification';
import SellableItemSelect from '../components/SellableItemSelect';
import CartTable from '../components/CartTable';
import CartSummary from '../components/CartSummary';
import { ServiceQuickSell } from '../components/ServiceQuickSell';
import type { NotificationMessage, SellableItem, Customer, CartItem, SalesOrderPayload } from '../types';
import { v4 as uuidv4 } from 'uuid';
import moment from 'jalali-moment';
import { parseToman } from '../utils/money';
import Button from '../components/Button';
import SmartSalesAdvisor, { SmartSalesInsight } from '../components/SmartSalesAdvisor';
import { Search, Save, RefreshCw } from '../components/lucide-react';
import { useMountedRef, useTimeoutGuards } from '../utils/asyncGuards';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

/* ---------- reducer ---------- */
interface CartState {
  items: CartItem[];
  customerId: number | null;
  paymentMethod: 'cash' | 'credit';
  globalDiscount: number;   // تخفیف کل فاکتور (عدد ثابت روی کل)
  notes: string;
}
type CartAction =
  | { type: 'ADD_ITEM'; payload: SellableItem }
  | { type: 'REMOVE_ITEM'; payload: { cartItemId: string } }
  | { type: 'UPDATE_QUANTITY'; payload: { cartItemId: string; quantity: number } }
  | { type: 'UPDATE_ITEM_DISCOUNT'; payload: { cartItemId: string; discount: number } } // تخفیف ردیفی = عدد ثابت برای کل ردیف
  | { type: 'UPDATE_BUY_PRICE'; payload: { cartItemId: string; buyPrice: number } }
  | { type: 'SET_CUSTOMER'; payload: { customerId: number | null } }
  | { type: 'SET_PAYMENT_METHOD'; payload: { method: 'cash' | 'credit' } }
  | { type: 'SET_GLOBAL_DISCOUNT'; payload: { discount: number } }
  | { type: 'SET_NOTES'; payload: { notes: string } }
  | { type: 'CLEAR_CART' };

const initialState: CartState = { items: [], customerId: null, paymentMethod: 'cash', globalDiscount: 0, notes: '' };

const pickPositiveNumber = (values: any[]) => {
  for (const value of values) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

const resolveInitialBuyPrice = (payload: any) => pickPositiveNumber([
  payload?.initialPurchasePrice,
  payload?.purchasePrice,
  payload?.baseBuyPrice,
  payload?.productPurchasePrice,
  payload?.phonePurchasePrice,
  payload?.initialCostPerUnit,
]);

const resolveCurrentBuyPrice = (payload: any) => pickPositiveNumber([
  payload?.currentPurchasePrice,
  payload?.currentBuyPrice,
  payload?.buyPrice,
  payload?.marketCostPerUnit,
  payload?.marketUnitBuyPrice,
  payload?.costPrice,
  payload?.baseCost,
  payload?.purchasePrice,
]);


const cartReducer = (state: CartState, action: CartAction): CartState => {
  switch (action.type) {
    case 'ADD_ITEM': {
      const normalizedType =
        (action.payload.type as string)?.toLowerCase() === 'product' ? 'inventory' : (action.payload.type as string);
      const existing = state.items.find(i => i.itemId === action.payload.id && i.itemType === normalizedType);
      if (existing) {
        const resolvedInitial = resolveInitialBuyPrice(action.payload as any);
        const resolvedCurrent = resolveCurrentBuyPrice(action.payload as any);
        return {
          ...state,
          items: state.items.map(i =>
            i.cartItemId === existing.cartItemId
              ? {
                  ...i,
                  quantity: Math.min(i.quantity + 1, i.stock),
                  buyPrice: i.buyPrice > 0 ? i.buyPrice : (resolvedCurrent || resolvedInitial),
                  initialPurchasePrice: (Number(i.initialPurchasePrice) || 0) > 0 ? i.initialPurchasePrice : resolvedInitial,
                  ownershipProfileId: i.ownershipProfileId ?? (Number((action.payload as any).ownershipProfileId) || null),
                  ownershipTitle: i.ownershipTitle || (action.payload as any).ownershipTitle || null,
                  ownershipType: i.ownershipType || (action.payload as any).ownershipType || null,
                  profitShareProfileId: i.profitShareProfileId ?? (Number((action.payload as any).profitShareProfileId) || null),
                  profitShareProfileTitle: i.profitShareProfileTitle || (action.payload as any).profitShareProfileTitle || null,
                }
              : i
          ),
        };
      }
      const newItem: CartItem = {
        cartItemId: uuidv4(),
        itemId: action.payload.id,
        itemType: normalizedType as any,
        name: action.payload.name,
        description: action.payload.name,
        quantity: 1,
        unitPrice: Number(action.payload.price) || 0,
        // نکته: از همین فیلد موجود استفاده می‌کنیم ولی معنای آن «تخفیف کل ردیف» است (نه تخفیف هر-واحد)
        discountPerItem: 0,
        buyPrice: resolveCurrentBuyPrice(action.payload as any) || resolveInitialBuyPrice(action.payload as any),
        initialPurchasePrice: resolveInitialBuyPrice(action.payload as any),
        ownershipProfileId: Number((action.payload as any).ownershipProfileId) || null,
        ownershipTitle: (action.payload as any).ownershipTitle || null,
        ownershipType: (action.payload as any).ownershipType || null,
        profitShareProfileId: Number((action.payload as any).profitShareProfileId) || null,
        profitShareProfileTitle: (action.payload as any).profitShareProfileTitle || null,
        stock: normalizedType === 'service' ? Infinity : Number(action.payload.stock ?? 0),
      };
      return { ...state, items: [...state.items, newItem] };
    }
    case 'REMOVE_ITEM':
      return { ...state, items: state.items.filter(i => i.cartItemId !== action.payload.cartItemId) };
    case 'UPDATE_QUANTITY':
      return {
        ...state,
        items: state.items.map(i =>
          i.cartItemId === action.payload.cartItemId
            ? { ...i, quantity: Math.max(1, Math.min(Number(action.payload.quantity) || 1, i.stock)) }
            : i
        ),
      };
    case 'UPDATE_ITEM_DISCOUNT':
      // تخفیف ردیف = عدد ثابت که از مجموع (qty*unitPrice) کم می‌شود، نه ضربدر تعداد
      return {
        ...state,
        items: state.items.map(i =>
          i.cartItemId === action.payload.cartItemId ? { ...i, discountPerItem: Math.max(0, Math.min(Number(action.payload.discount) || 0, (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0))) } : i
        ),
      };
    case 'UPDATE_BUY_PRICE':
      return {
        ...state,
        items: state.items.map(i =>
          i.cartItemId === action.payload.cartItemId ? { ...i, buyPrice: Math.max(0, Number(action.payload.buyPrice) || 0) } : i
        ),
      };
    case 'SET_CUSTOMER': return { ...state, customerId: action.payload.customerId };
    case 'SET_PAYMENT_METHOD': return { ...state, paymentMethod: action.payload.method };
    case 'SET_GLOBAL_DISCOUNT': return { ...state, globalDiscount: Math.max(0, Number(action.payload.discount) || 0) };
    case 'SET_NOTES': return { ...state, notes: action.payload.notes };
    case 'CLEAR_CART': return initialState;
    default: return state;
  }
};

/* --------------------------- Component --------------------------- */
const SalesCartPage: React.FC = () => {
  const navigate = useNavigate();
  const mountedRef = useMountedRef();
  const { scheduleTimeout } = useTimeoutGuards();
  const { token, currentUser } = useAuth();
  const { style } = useStyle();

  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandAccent = `hsl(${style.primaryHue} 95% 62%)`;

  const location = useLocation();
  const prefillGuardRef = useRef<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const prefillPaymentMethod = searchParams.get('mode') === 'credit' || (location.state as any)?.prefillPaymentMethod === 'credit'
    ? 'credit'
    : 'cash';

  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [checkoutStageHint, setCheckoutStageHint] = useState<string>('ثبت اطلاعات فروش، کسر موجودی و صدور فاکتور');
  const [customers, setCustomers] = useState<Customer[]>([]);
  const CART_STORAGE_KEY = 'sales_cart_v1';

  const [state, dispatch] = useReducer(
    cartReducer,
    initialState,
    (init) => {
      try {
        const raw = sessionStorage.getItem(CART_STORAGE_KEY);
        if (!raw) return init;
        const parsed = JSON.parse(raw);
        // حداقل اعتبارسنجی
        if (!parsed || !Array.isArray(parsed.items)) return init;
        return { ...init, ...parsed } as CartState;
      } catch {
        return init;
      }
    }
  );


  useEffect(() => {
    if (state.paymentMethod !== prefillPaymentMethod) {
      dispatch({ type: 'SET_PAYMENT_METHOD', payload: { method: prefillPaymentMethod } });
    }
  }, [prefillPaymentMethod]);

  // Persist cart across navigations (برای افزودن مورد جدید چند کالا از صفحات مختلف)
  useEffect(() => {
    try {
      sessionStorage.setItem(CART_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // ignore
    }
  }, [state]);
  const [salesDate, setSalesDate] = useState<Date | null>(new Date());
  const [dismissedSaleEntryHint, setDismissedSaleEntryHint] = useState(false);
  const f = (n: number) => (Number(n) || 0).toLocaleString('fa-IR');

  const saleEntrySource = (location.state as any)?.saleEntrySource as 'pricing' | 'status-review' | undefined;

  useEffect(() => {
    setDismissedSaleEntryHint(false);
  }, [saleEntrySource]);

  const showSaleEntryHint = Boolean(saleEntrySource) && !dismissedSaleEntryHint;

  /* دریافت آیتم از صفحه قبل */
  useEffect(() => {
    const prefill = (location.state as any)?.prefillItem;
    if (!prefill) return;
    const normalizedType =
      (prefill.type as string)?.toLowerCase() === 'product' ? 'inventory' : (prefill.type as string);
    const guardKey = `${location.key}:${normalizedType}:${prefill.id ?? prefill.itemId}`;
    if (prefillGuardRef.current === guardKey) return;
    prefillGuardRef.current = guardKey;

    const item: SellableItem =
      'id' in prefill
        ? {
            id: prefill.id,
            type: normalizedType,
            name: prefill.name,
            price: prefill.price,
            stock: prefill.stock ?? 0,
            purchasePrice: prefill.purchasePrice ?? prefill.initialPurchasePrice ?? 0,
            currentPurchasePrice: prefill.currentPurchasePrice ?? null,
            buyPrice: prefill.currentPurchasePrice ?? prefill.buyPrice ?? prefill.purchasePrice ?? 0,
            initialPurchasePrice: prefill.initialPurchasePrice ?? prefill.purchasePrice ?? 0,
            ownershipProfileId: prefill.ownershipProfileId ?? null,
            ownershipTitle: prefill.ownershipTitle ?? null,
            ownershipType: prefill.ownershipType ?? null,
            profitShareProfileId: prefill.profitShareProfileId ?? null,
            profitShareProfileTitle: prefill.profitShareProfileTitle ?? null,
          }
        : {
            id: prefill.itemId,
            type: normalizedType,
            name: prefill.description,
            price: prefill.unitPrice,
            stock: prefill.stock ?? 0,
            purchasePrice: prefill.purchasePrice ?? prefill.initialPurchasePrice ?? 0,
            currentPurchasePrice: prefill.currentPurchasePrice ?? null,
            buyPrice: prefill.currentPurchasePrice ?? prefill.buyPrice ?? prefill.purchasePrice ?? 0,
            initialPurchasePrice: prefill.initialPurchasePrice ?? prefill.purchasePrice ?? 0,
            ownershipProfileId: prefill.ownershipProfileId ?? null,
            ownershipTitle: prefill.ownershipTitle ?? null,
            ownershipType: prefill.ownershipType ?? null,
            profitShareProfileId: prefill.profitShareProfileId ?? null,
            profitShareProfileTitle: prefill.profitShareProfileTitle ?? null,
          };

    const exists = state.items.some(i => i.itemId === item.id && i.itemType === normalizedType);
    if (!exists) dispatch({ type: 'ADD_ITEM', payload: item });
    navigate(location.pathname, { replace: true, state: {} });
  }, [location.state, location.key, location.pathname, navigate, state.items]);

  /* مشتریان */
  useEffect(() => {
    if (!token) return;
    apiFetch('/api/customers')
      .then(r => r.json())
      .then(j => j.success && setCustomers(j.data))
      .catch(() => setNotification({ type: 'error', text: 'خطا در دریافت لیست مشتریان.' }));
  }, [token]);

  useEffect(() => {
    const prefillCustomerId = Number((location.state as any)?.prefillCustomerId || 0);
    if (!prefillCustomerId) return;
    dispatch({ type: 'SET_CUSTOMER', payload: { customerId: prefillCustomerId } });
    navigate(location.pathname, { replace: true, state: { ...(location.state as any), prefillCustomerId: undefined, prefillCustomerName: undefined, prefillItem: (location.state as any)?.prefillItem } });
  }, [location.state, location.pathname, navigate]);

  /* افزودن مورد جدید آیتم از سرچ‌باکس */
  const handleAddItem = (item: SellableItem) => dispatch({ type: 'ADD_ITEM', payload: item });

  /* ثبت اطلاعات فروش */
  const handleCheckout = async () => {
    if (!state.items.length) { setNotification({ type: 'warning', text: 'سبد خرید خالی است.' }); return; }
    if (state.paymentMethod === 'credit' && !state.customerId) {
      setNotification({ type: 'warning', text: 'برای فروش اعتباری باید مشتری را انتخاب کنید تا بدهی/بستانکاری در حساب او ثبت اطلاعات شود.' });
      return;
    }
    if (requiresManagerCreditApproval) {
      setNotification({
        type: 'warning',
        text: isManagerOrAdmin
          ? 'این فروش از سقف اعتبار پیشنهادی مشتری عبور کرده است. ابتدا تأیید مدیر را از پنل کنترل نهایی ثبت کنید.'
          : 'این فروش از سقف اعتبار پیشنهادی مشتری عبور کرده و نیازمند تأیید مدیر است.',
      });
      return;
    }
    setIsSubmitting(true); setNotification(null);
    setCheckoutStageHint(state.paymentMethod === 'credit' ? 'در حال اعتبارسنجی فروش اعتباری و حساب مشتری' : 'در حال اعتبارسنجی اقلام فروش و موجودی');

    // subtotal و تخفیف‌ها را مانند نمایش، پاک‌سازی و سقف‌گذاری می‌کنیم
    const subtotal = state.items.reduce((s, i) => s + (Number(i.unitPrice)||0) * (Number(i.quantity)||0), 0);
    const itemsDiscount = state.items.reduce((s, i) => s + Math.min(Math.max(Number(i.discountPerItem) || 0, 0), (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0)), 0); // تخفیف کل ردیف‌ها با سقف مبلغ همان ردیف
    const afterRowDiscounts = Math.max(0, subtotal - itemsDiscount);
    const cleanGlobal = Math.min(Math.max(Number(state.globalDiscount)||0, 0), afterRowDiscounts);

    const payload: SalesOrderPayload = {
      transactionDate: (salesDate ? moment(salesDate).locale('en').format('YYYY-MM-DD') : undefined),
      customerId: state.customerId,
      paymentMethod: state.paymentMethod,
      discount: cleanGlobal, // تخفیف کل فاکتور
      tax: 0,
      notes: creditLimitManagerApproved ? `${state.notes || ''}\n[تأیید مدیر برای عبور از سقف اعتبار پیشنهادی]`.trim() : state.notes,
      items: state.items.map(i => ({
        itemId: i.itemId,
        itemType: (i.itemType as string).toLowerCase() === 'product' ? 'inventory' : (i.itemType as any),
        description: i.description,
        quantity: Number(i.quantity) || 1,
        unitPrice: Number(i.unitPrice) || 0,
        // مهم: این فیلد اکنون «تخفیف کلِ ردیف» است، نه تخفیف هر-واحد
        discountPerItem: Math.min(Math.max(Number(i.discountPerItem) || 0, 0), (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0)),
        buyPrice: Math.max(0, Number(i.buyPrice) || 0),
      })),
    };

    try {
      setCheckoutStageHint(state.paymentMethod === 'credit' ? 'در حال ثبت اطلاعات فروش اعتباری و ایجاد سند حساب مشتری' : 'در حال ثبت اطلاعات فروش و صدور فاکتور');
      const res = await apiFetch('/api/sales-orders', { method: 'POST', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      setCheckoutStageHint(state.paymentMethod === 'credit' ? 'در حال نهایی‌سازی فاکتور و به‌روزرسانی حساب مشتری' : 'در حال نهایی‌سازی فاکتور و به‌روزرسانی موجودی');
      if (!mountedRef.current) return;
      setNotification({ type: 'success', text: state.paymentMethod === 'credit' ? 'فروش اعتباری ثبت اطلاعات شد و در حساب مشتری اعمال شد.' : 'فروش ثبت اطلاعات شد!' });
      dispatch({ type: 'CLEAR_CART' });
      scheduleTimeout(() => navigate(`/invoices/${json.data.orderId}`), 600);
    } catch (err: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: err?.message || 'خطا در عملیاتی ناشناخته.' });
    } finally { if (mountedRef.current) { setCheckoutStageHint('ثبت اطلاعات فروش، کسر موجودی و صدور فاکتور'); setIsSubmitting(false); } }
  };


const checkoutStageProgress = (() => {
  if (/اعتبارسنج/i.test(checkoutStageHint)) return 1;
  if (/ثبت اطلاعات فروش|ایجاد سند|صدور فاکتور/i.test(checkoutStageHint)) return 2;
  if (/نهایی‌سازی|نهایی سازی|به‌روزرسانی/i.test(checkoutStageHint)) return 3;
  return 1;
})();

const checkoutStageIcon = checkoutStageProgress === 1
  ? <Search className="h-3.5 w-3.5" />
  : checkoutStageProgress === 2
    ? <Save className="h-3.5 w-3.5" />
    : <RefreshCw className="h-3.5 w-3.5" />;

  /* جمع‌ها (منطق واحد نمایش) */
  const summary = useMemo(() => {
    const subtotal = state.items.reduce((s, i) => s + (Number(i.unitPrice)||0) * (Number(i.quantity)||0), 0);
    const itemsDiscount = state.items.reduce((s, i) => s + Math.min(Math.max(Number(i.discountPerItem) || 0, 0), (Number(i.unitPrice) || 0) * (Number(i.quantity) || 0)), 0); // تخفیف کل ردیف‌ها با سقف مبلغ همان ردیف
    const afterRowDiscounts = Math.max(0, subtotal - itemsDiscount);
    const cleanGlobal = Math.min(Math.max(Number(state.globalDiscount)||0, 0), afterRowDiscounts);
    const grandTotal = Math.max(0, afterRowDiscounts - cleanGlobal);
    return { subtotal, itemsDiscount, globalDiscount: cleanGlobal, grandTotal };
  }, [state.items, state.globalDiscount]);


  const [smartSalesInsights, setSmartSalesInsights] = useState<SmartSalesInsight[]>([]);
  const [smartSalesMeta, setSmartSalesMeta] = useState<{
    learningStatus: 'empty' | 'learning' | 'trusted' | 'excellent';
    confidence: number | null;
    dataQuality: number;
    suggestedCreditLimit: number | null;
    remainingSuggestedCredit: number | null;
    customerTrustProfile: any | null;
  }>({ learningStatus: 'empty', confidence: null, dataQuality: 0, suggestedCreditLimit: null, remainingSuggestedCredit: null, customerTrustProfile: null });
  const [smartSalesLoading, setSmartSalesLoading] = useState(false);
  const [creditLimitManagerApproved, setCreditLimitManagerApproved] = useState(false);

  useEffect(() => {
    if (!token) return;
    let cancelled = false;
    const timer = window.setTimeout(async () => {
      try {
        setSmartSalesLoading(true);
        const payload = {
          customerId: state.customerId,
          paymentMethod: state.paymentMethod,
          discount: summary.globalDiscount,
          items: state.items.map((item) => ({
            cartItemId: item.cartItemId,
            itemId: item.itemId,
            itemType: item.itemType,
            name: item.name,
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountPerItem: item.discountPerItem,
            buyPrice: item.buyPrice,
            stock: Number.isFinite(Number(item.stock)) ? Number(item.stock) : 'Infinity',
          })),
        };
        const response = await apiFetch('/api/sales-orders/smart-advisor', {
          method: 'POST',
          body: JSON.stringify(payload),
        });
        const json = await response.json();
        if (!response.ok || !json?.success) throw new Error(json?.message || 'خطا در تحلیل هوشمند فروش.');
        if (cancelled) return;
        setSmartSalesInsights(Array.isArray(json.data) ? json.data : []);
        setSmartSalesMeta({
          learningStatus: json?.meta?.learningStatus || 'empty',
          confidence: typeof json?.meta?.confidence === 'number' ? json.meta.confidence : null,
          dataQuality: typeof json?.meta?.dataQuality === 'number' ? json.meta.dataQuality : 0,
          suggestedCreditLimit: typeof json?.meta?.suggestedCreditLimit === 'number' ? json.meta.suggestedCreditLimit : null,
          remainingSuggestedCredit: typeof json?.meta?.remainingSuggestedCredit === 'number' ? json.meta.remainingSuggestedCredit : null,
          customerTrustProfile: json?.meta?.customerTrustProfile || null,
        });
      } catch {
        if (cancelled) return;
        setSmartSalesInsights([]);
        setSmartSalesMeta({ learningStatus: 'empty', confidence: null, dataQuality: 0, suggestedCreditLimit: null, remainingSuggestedCredit: null, customerTrustProfile: null });
      } finally {
        if (!cancelled) setSmartSalesLoading(false);
      }
    }, 250);

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [token, state.customerId, state.items, state.paymentMethod, summary.globalDiscount]);

  const isManagerOrAdmin = ['Admin', 'Manager'].includes(String(currentUser?.roleName || ''));
  const suggestedCreditLimit = Math.max(0, Number(smartSalesMeta.suggestedCreditLimit || 0));
  const trustCurrentBalance = Math.max(0, Number(smartSalesMeta.customerTrustProfile?.currentBalance || 0));
  const projectedCreditExposure = trustCurrentBalance + Math.max(0, Number(summary.grandTotal) || 0);
  const isCreditLimitExceeded = state.paymentMethod === 'credit' && Boolean(state.customerId) && suggestedCreditLimit > 0 && projectedCreditExposure > suggestedCreditLimit;
  const isCreditLimitBlocked = state.paymentMethod === 'credit' && Boolean(state.customerId) && (
    isCreditLimitExceeded ||
    (smartSalesMeta.customerTrustProfile && suggestedCreditLimit <= 0)
  );
  const requiresManagerCreditApproval = isCreditLimitBlocked && !creditLimitManagerApproved;
  const formatLocalMoney = (value: number) => `${(Number(value) || 0).toLocaleString('fa-IR')} تومان`;
  const selectedCustomer = customers.find((customer) => Number(customer.id) === Number(state.customerId)) || null;
  const customerTrustScore = smartSalesMeta.customerTrustProfile?.score == null ? null : Number(smartSalesMeta.customerTrustProfile.score);
  const customerLateOrOverdueCount = Number(smartSalesMeta.customerTrustProfile?.latePaymentCount || 0) + Number(smartSalesMeta.customerTrustProfile?.overdueUnpaidCount || 0);
  const customerReturnedCheckCount = Number(smartSalesMeta.customerTrustProfile?.returnedCheckCount || 0);
  const hasCustomerTrustRisk = customerTrustScore != null && (
    customerTrustScore < 50 ||
    customerLateOrOverdueCount > 0 ||
    customerReturnedCheckCount > 0 ||
    isCreditLimitBlocked
  );
  const customerTrustActionTone = !state.customerId
    ? 'neutral'
    : hasCustomerTrustRisk ? 'risk'
      : customerTrustScore != null && customerTrustScore >= 68 ? 'positive'
        : 'neutral';
  const isCustomerRiskControlledByCash = customerTrustActionTone === 'risk' && state.paymentMethod === 'cash';

  const customerTrustActionSuggestions = !state.customerId
    ? []
    : customerTrustActionTone === 'risk'
      ? [
          {
            title: 'محدودیت فروش اعتباری',
            text: customerReturnedCheckCount > 0
              ? 'به‌دلیل سابقه چک برگشتی، فروش اعتباری فقط با تأیید مدیر و بررسی پرونده انجام شود.'
              : customerTrustScore != null && customerTrustScore < 50
                ? 'امتیاز اعتماد پایین است؛ فروش اعتباری سنگین برای این مشتری مناسب نیست.'
                : 'به‌دلیل دیرکرد، معوق یا عبور از سقف اعتبار، ادامه فروش اعتباری نیازمند کنترل مدیریتی است.',
            icon: 'fa-solid fa-ban',
          },
          {
            title: 'پیگیری وصول قبل از فروش',
            text: customerLateOrOverdueCount > 0
              ? 'قبل از ثبت فروش جدید، وضعیت اقساط معوق یا دیرکردهای قبلی پیگیری شود.'
              : 'مانده و سابقه پرداخت مشتری قبل از ثبت فروش جدید مرور شود.',
            icon: 'fa-solid fa-phone-volume',
          },
          {
            title: 'بررسی سقف اعتبار',
            text: suggestedCreditLimit > 0
              ? `سقف پیشنهادی ${formatLocalMoney(suggestedCreditLimit)} است و تعهد بعد از فروش ${formatLocalMoney(projectedCreditExposure)} می‌شود.`
              : 'برای این مشتری سقف امنی محاسبه نشده است؛ تصمیم فروش اعتباری باید با احتیاط باشد.',
            icon: 'fa-solid fa-gauge-high',
          },
        ]
      : customerTrustActionTone === 'positive'
        ? [
            {
              title: 'مشتری قابل اتکا',
              text: 'سابقه مشتری برای فروش اعتباری مناسب‌تر است؛ فروش در محدوده سقف پیشنهادی قابل بررسی است.',
              icon: 'fa-solid fa-user-check',
            },
            {
              title: 'حفظ سقف پیشنهادی',
              text: `ظرفیت باقی‌مانده پیشنهادی ${formatLocalMoney(Math.max(0, Number(smartSalesMeta.remainingSuggestedCredit || 0)))} است.`,
              icon: 'fa-solid fa-shield-alt',
            },
            {
              title: 'پیشنهاد فروش هدفمند',
              text: 'برای این مشتری می‌توان پیشنهاد مکمل یا فروش بعدی را با ریسک کنترل‌شده مطرح کرد.',
              icon: 'fa-solid fa-handshake',
            },
          ]
        : [
            {
              title: 'تصمیم با احتیاط',
              text: 'سابقه مشتری خنثی یا محدود است؛ فروش اعتباری بهتر است در مبلغ کنترل‌شده انجام شود.',
              icon: 'fa-solid fa-scale-balanced',
            },
            {
              title: 'ثبت دقیق پرداخت',
              text: 'برای دقیق‌تر شدن امتیاز اعتماد، پرداخت‌ها و سررسیدها باید کامل ثبت شوند.',
              icon: 'fa-solid fa-clipboard-check',
            },
            {
              title: 'کنترل مانده حساب',
              text: `مانده فعلی مشتری ${formatLocalMoney(trustCurrentBalance)} است؛ قبل از فروش جدید به آن توجه شود.`,
              icon: 'fa-solid fa-wallet',
            },
          ];

  useEffect(() => {
    setCreditLimitManagerApproved(false);
  }, [state.customerId, state.paymentMethod, summary.grandTotal, smartSalesMeta.suggestedCreditLimit]);

  const logRiskPaymentMethodChange = async (fromMethod: 'cash' | 'credit', toMethod: 'cash' | 'credit', reason: string) => {
    if (!state.customerId || !hasCustomerTrustRisk) return;
    try {
      await apiFetch('/api/sales-orders/risk-payment-log', {
        method: 'POST',
        body: JSON.stringify({
          customerId: state.customerId,
          customerName: selectedCustomer?.fullName || '',
          fromMethod,
          toMethod,
          reason,
          score: customerTrustScore,
          tierLabel: smartSalesMeta.customerTrustProfile?.tierLabel || '',
          grandTotal: summary.grandTotal,
          suggestedCreditLimit,
          projectedCreditExposure,
          paymentMethod: state.paymentMethod,
        }),
      });
    } catch (error) {
      console.warn('risk payment log failed:', error);
    }
  };

  const handlePaymentMethodChange = (method: 'cash' | 'credit') => {
    const previousMethod = state.paymentMethod;
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: { method } });
    if (method === 'credit' && hasCustomerTrustRisk && state.customerId) {
      logRiskPaymentMethodChange(previousMethod, method, 'بازگشت دستی اپراتور به پرداخت اعتباری برای مشتری پرریسک');
      setNotification({
        type: 'warning',
        text: 'روش پرداخت دوباره اعتباری شد؛ هشدار ریسک مشتری و دکمه تغییر به نقدی دوباره فعال شد.',
      });
    }
  };

  return (
    <>
      {showSaleEntryHint ? (
        <div className="mb-4 flex items-start gap-3 rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-3 shadow-[0_10px_24px_-18px_rgba(16,185,129,0.45)] dark:border-emerald-900/60 dark:bg-emerald-950/25">
          <span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200">
            <i className="fa-solid fa-circle-check" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="text-[13px] font-extrabold text-emerald-800 dark:text-emerald-100">
                {saleEntrySource === 'pricing' ? 'این دستگاه بعد از قیمت‌گذاری وارد فروش شده' : 'این دستگاه بعد از بازبینی وضعیت وارد فروش شده'}
              </span>
              <span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-bold text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-900/30 dark:text-emerald-200">
                {saleEntrySource === 'pricing' ? 'از مسیر قیمت‌گذاری' : 'از مسیر بازبینی وضعیت'}
              </span>
            </div>
            <p className="mt-1 text-[11px] leading-5.5 text-emerald-700/90 dark:text-emerald-200/90">
              {saleEntrySource === 'pricing' ? 'مانع قیمت‌گذاری برطرف شده و الان می‌توانی فروش این دستگاه را ادامه بدهی.' : 'وضعیت دستگاه اصلاح شده و حالا می‌توانی فروش آن را نهایی کنی.'}
            </p>
          </div>
          <button
            type="button"
            onClick={() => setDismissedSaleEntryHint(true)}
            className="inline-flex h-8 w-8 items-center justify-center rounded-full text-emerald-700/80 transition hover:bg-emerald-100 hover:text-emerald-900 dark:text-emerald-200/80 dark:hover:bg-emerald-900/40 dark:hover:text-emerald-100"
            title="بستن این پیام"
            aria-label="بستن این پیام"
          >
            <i className="fa-solid fa-xmark" />
          </button>
        </div>
      ) : null}
    <div
      className="sales-cart-foundation min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-950 dark:to-slate-950"
      dir="rtl"
      data-ui-sales-page="cart"
      data-ui-sales-mode={state.paymentMethod}
    >
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}

      <div className="max-w-7xl mx-auto px-4 py-5">
        {/* هدر */}
        <header className="sales-hero-panel relative overflow-hidden rounded-[30px] border border-slate-200 bg-white/95 p-3 shadow-[0_28px_64px_-50px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/92 md:p-3 xl:p-3" data-ui-sales-surface="hero">
          <div className="pointer-events-none absolute inset-y-0 left-0 w-40 bg-gradient-to-r from-emerald-100/50 to-transparent blur-2xl dark:from-emerald-500/10" />
          <div className="pointer-events-none absolute inset-y-0 right-0 w-40 bg-gradient-to-l from-sky-100/60 to-transparent blur-2xl dark:from-sky-500/10" />
          <div className="relative flex flex-col gap-3 xl:flex-row xl:items-start xl:justify-between">
            <div className="min-w-0 flex-1">
              <div className="flex items-start gap-3">
                <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-[16px] bg-slate-900 text-white shadow-[0_18px_38px_-26px_rgba(15,23,42,0.48)] dark:bg-white dark:text-slate-900">
                  <i className="fa-solid fa-cash-register text-[0.9rem]" />
                </span>
                <div className="min-w-0 flex-1 text-right">
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <span className="inline-flex h-2 w-2 rounded-full" style={{ backgroundColor: brandAccent }} />
                    صندوق هوشمند فروش
                  </div>
                  <h1 className="mt-3 text-xl font-extrabold tracking-tight text-slate-900 dark:text-slate-100 md:text-[30px]">
                    فروش را سریع، تمیز و حرفه‌ای ثبت اطلاعات کن
                  </h1>
                  <p className="mt-2 max-w-3xl text-[13px] leading-6 text-slate-500 dark:text-slate-300 md:text-sm">
                    {state.paymentMethod === 'credit'
                      ? 'در حالت اعتباری، همزمان با ثبت اطلاعات اقلام می‌توانی مشتری را انتخاب کنی، قیمت مبنا را کنترل کنی و فروش را با اثر مالی دقیق در حساب مشتری نهایی کنی.'
                      : 'در حالت نقدی، جریان فروش از انتخاب قلم تا بررسی و ادامه سود و ثبت اطلاعات نهایی فاکتور، به‌صورت یکپارچه و بدون شلوغی در اختیارت است.'}
                  </p>
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    <Button
                      type="button"
                      onClick={() => dispatch({ type: 'SET_PAYMENT_METHOD', payload: { method: state.paymentMethod === 'cash' ? 'credit' : 'cash' } })}
                      variant="primary"
                      size="xs"
                      className="sales-toolbar-btn"
                      leftIcon={<i className={state.paymentMethod === 'credit' ? 'fa-solid fa-file-invoice-dollar' : 'fa-solid fa-money-bill-wave'} />}
                    >
                      {state.paymentMethod === 'credit' ? 'تغییر به فروش نقدی' : 'تغییر به فروش اعتباری'}
                    </Button>
                    <Button
                      type="button"
                      onClick={() => navigate('/sales')}
                      variant="secondary"
                      size="xs"
                      className="sales-toolbar-btn"
                      leftIcon={<i className="fa-solid fa-house" />}
                    >
                      هاب فروش
                    </Button>
                    <Button
                      type="button"
                      onClick={() => navigate('/invoices')}
                      variant="secondary"
                      size="xs"
                      className="sales-toolbar-btn"
                      leftIcon={<i className="fa-solid fa-file-invoice" />}
                    >
                      فاکتورها
                    </Button>
                  </div>
                </div>
              </div>
            </div>

            <div className="sales-hero-metrics grid gap-2.5 sm:grid-cols-2 xl:w-[320px]" data-ui-sales-metrics="hero">
              <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-[10px] font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400">حالت فروش</div>
                <div className="mt-1.5 flex items-center gap-2 text-[15px] font-extrabold text-slate-900 dark:text-slate-100">
                  <span className={`inline-flex h-7 w-7 items-center justify-center rounded-xl ${state.paymentMethod === 'credit' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300' : 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                    <i className={state.paymentMethod === 'credit' ? 'fa-solid fa-file-invoice-dollar' : 'fa-solid fa-money-bill-wave'} />
                  </span>
                  <span>{state.paymentMethod === 'credit' ? 'اعتباری' : 'نقدی'}</span>
                </div>
                <div className="mt-1.5 text-[11px] leading-5.5 text-slate-500 dark:text-slate-400">{state.paymentMethod === 'credit' ? 'ثبت اطلاعات فروش همراه با کنترل حساب مشتری' : 'تسویه مستقیم و آماده برای صدور فاکتور'}</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="text-[10px] font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400">اقلام سبد</div>
                <div className="mt-1.5 text-xl font-black text-slate-900 dark:text-slate-100">{state.items.length.toLocaleString('fa-IR')}</div>
                <div className="mt-2 text-[11px] text-slate-500 dark:text-slate-400">قلم قابل ثبت اطلاعات در فاکتور</div>
              </div>
              <div className="rounded-[20px] border border-slate-200 bg-slate-50/90 p-3 dark:border-slate-800 dark:bg-slate-900/70 sm:col-span-2">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[10px] font-bold tracking-[0.14em] text-slate-500 dark:text-slate-400">جمع نهایی</div>
                    <div className="mt-1.5 text-xl font-black text-slate-900 dark:text-slate-100">{f(summary.grandTotal)}</div>
                  </div>
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-lg bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    <i className="fa-solid fa-chart-line text-[12px]" />
                  </span>
                </div>
                <div className="mt-1.5 text-[11px] leading-5.5 text-slate-500 dark:text-slate-400">بعد از اعمال تخفیف‌های ردیفی و تخفیف کل فاکتور</div>
              </div>
            </div>
          </div>
        </header>
        {/* بدنه اصلی فروش */}
        <div className="sales-workspace mt-5 grid grid-cols-1 gap-4 xl:grid-cols-12" dir="ltr" data-ui-sales-workspace="true">
          <section className="space-y-4 xl:col-span-8 xl:col-start-1">
            <section id="sale-step-items" dir="rtl" className="sales-section-card overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/82">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-extrabold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <i className="fa-solid fa-layer-group text-[10px]" />
                    انتخاب کالا یا خدمات
                  </div>
                  <h2 className="mt-3 text-[17px] font-extrabold text-slate-900 dark:text-slate-100">انتخاب اقلام برای فاکتور</h2>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">کالا یا خدمت را جست‌وجو کن، مستقیم به سبد اضافه کن و ثبت فروش را بدون شلوغی ادامه بده.</p>
                </div>
                <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <i className="fa-solid fa-cubes-stacked" />
                </span>
              </div>

              <div className="mb-4">
                <SellableItemSelect onAddItem={handleAddItem} />
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/75 p-3.5 dark:border-slate-800 dark:bg-slate-900/40">
                <div className="mb-3 flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[13px] font-extrabold text-slate-900 dark:text-slate-100">میانبر خدمات پرکاربرد</div>
                    <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">خدمت‌های پرتکرار را با سرعت بیشتر به همین فاکتور اضافه کن.</div>
                  </div>
                  <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl bg-slate-900 text-white dark:bg-white dark:text-slate-900">
                    <i className="fa-solid fa-bolt text-[12px]" />
                  </span>
                </div>
                <ServiceQuickSell variant="dark" onAddItem={handleAddItem} />
              </div>
            </section>

            <section id="sale-step-cart" dir="rtl" className="sales-section-card overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/82">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-extrabold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <i className="fa-solid fa-cart-shopping text-[10px]" />
                    سبد فروش
                  </div>
                  <h3 className="mt-3 text-[17px] font-extrabold text-slate-900 dark:text-slate-100">کنترل کامل سبد فروش</h3>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">تعداد، قیمت مبنا، تخفیف، سود و جزئیات هر ردیف را در همین بخش کنترل کن.</p>
                </div>
                {state.items.length > 0 && (
                  <Button
                    type="button"
                    onClick={() => dispatch({ type: 'CLEAR_CART' })}
                    variant="danger"
                    size="xs"
                    title="پاک کردن سبد"
                    className="sales-page-btn"
                    leftIcon={<i className="fa-solid fa-trash-can" />}
                  >
                    حذف همه
                  </Button>
                )}
              </div>

              {state.items.length === 0 ? (
                <div className="sales-empty-cart rounded-[24px] border border-dashed border-slate-300 bg-[linear-gradient(180deg,rgba(248,250,252,0.88),rgba(255,255,255,0.98))] py-14 text-center text-slate-400 dark:border-slate-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.52),rgba(2,6,23,0.72))]" data-ui-sales-empty="cart">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-900 dark:text-slate-500">
                    <i className="fa-solid fa-cart-shopping text-2xl opacity-75" />
                  </div>
                  <p className="font-black text-[20px] text-slate-800 dark:text-slate-100">سبد فروش شما خالی است</p>
                  <p className="mt-2 text-[13px] text-slate-500 dark:text-slate-400">برای شروع، کالا یا خدمت مورد نظر را از بخش انتخاب بالا به سبد اضافه کن.</p>
                </div>
              ) : (
                <>
                  <div className="sales-control-tips mb-4 grid gap-3 md:grid-cols-3" data-ui-sales-tips="true">
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/45">
                      <div className="flex items-start gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          <i className="fa-solid fa-chart-line text-[12px]" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">قیمت مبنا</div>
                          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-800 dark:text-slate-100">بهای اولیه و قیمت خرید روز هر قلم را دقیق کنترل کن.</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/45">
                      <div className="flex items-start gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          <i className="fa-solid fa-sliders text-[12px]" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">کنترل سبد</div>
                          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-800 dark:text-slate-100">مقدار، تخفیف و جزئیات هر ردیف را بدون شلوغی تنظیم کن.</div>
                        </div>
                      </div>
                    </div>
                    <div className="rounded-[20px] border border-slate-200 bg-slate-50/80 px-3.5 py-3 dark:border-slate-800 dark:bg-slate-900/45">
                      <div className="flex items-start gap-2.5">
                        <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                          <i className="fa-solid fa-chart-line text-[12px]" />
                        </span>
                        <div className="min-w-0">
                          <div className="text-[10px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">کنترل سود</div>
                          <div className="mt-1 text-[12px] font-bold leading-5 text-slate-800 dark:text-slate-100">پیش از ثبت، سود و وضعیت هر قلم را شفاف بررسی کن.</div>
                        </div>
                      </div>
                    </div>
                  </div>
                  <CartTable items={state.items} dispatch={dispatch} />
                </>
              )}
            </section>
          </section>

          <aside className="space-y-4 xl:col-span-4 xl:col-start-9" dir="rtl">
            <section className="rounded-[28px] border border-slate-200 bg-white/96 p-4 shadow-[0_24px_56px_-44px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/82">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-extrabold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <i className="fa-solid fa-file-circle-check text-[10px]" />
                    کنترل نهایی فاکتور
                  </div>
                  <h4 className="mt-3 text-[17px] font-extrabold text-slate-900 dark:text-slate-100">خلاصه مالی و ثبت نهایی</h4>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">در این ستون جمع اقلام، تخفیف کل، روش پرداخت، تاریخ و ثبت نهایی فاکتور را کنترل کن.</p>
                </div>
                <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl bg-slate-900 text-white shadow-sm dark:bg-white dark:text-slate-900">
                  <i className="fa-solid fa-receipt" />
                </span>
              </div>

              <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
                <div className="rounded-[22px] border border-slate-200 bg-slate-50/75 p-3.5 dark:border-slate-800 dark:bg-slate-900/45">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">وضعیت فاکتور</div>
                      <div className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[12px] font-black ${state.items.length > 0 ? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/35 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                        <span className={`inline-flex h-2 w-2 rounded-full ${state.items.length > 0 ? 'bg-emerald-500' : 'bg-slate-300 dark:bg-slate-600'}`} />
                        {state.items.length > 0 ? 'آماده ثبت' : 'در انتظار انتخاب قلم'}
                      </div>
                    </div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200">
                      <i className="fa-solid fa-circle-check" />
                    </span>
                  </div>
                </div>

                <div className="rounded-[22px] border border-slate-200 bg-slate-50/75 p-3.5 dark:border-slate-800 dark:bg-slate-900/45">
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-extrabold text-slate-500 dark:text-slate-400">خلاصه سریع</div>
                      <div className="mt-2 text-[19px] font-black text-slate-900 dark:text-slate-100">{f(summary.grandTotal)} تومان</div>
                      <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">مبلغ قابل پرداخت بعد از تخفیف‌ها</div>
                    </div>
                    <span className="inline-flex h-8 w-8 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300">
                      <i className="fa-solid fa-wallet" />
                    </span>
                  </div>
                </div>
              </div>

              {isCreditLimitBlocked ? (
                <div className={`mb-4 rounded-[22px] border p-3.5 ${
                  creditLimitManagerApproved
                    ? 'border-emerald-200 bg-emerald-50/85 text-emerald-800 dark:border-emerald-900/60 dark:bg-emerald-950/25 dark:text-emerald-200'
                    : 'border-amber-200 bg-amber-50/85 text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-200'
                }`}>
                  <div className="flex items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${
                      creditLimitManagerApproved
                        ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-200'
                        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-200'
                    }`}>
                      <i className={creditLimitManagerApproved ? 'fa-solid fa-check' : 'fa-solid fa-user-lock'} />
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="text-[13px] font-black">
                        {creditLimitManagerApproved ? 'تأیید مدیر ثبت شد' : 'نیازمند تأیید مدیر'}
                      </div>
                      <p className="mt-1 text-[12px] leading-6 opacity-90">
                        {suggestedCreditLimit > 0
                          ? `تعهد مشتری پس از این فروش ${formatLocalMoney(projectedCreditExposure)} می‌شود و از سقف پیشنهادی ${formatLocalMoney(suggestedCreditLimit)} عبور می‌کند.`
                          : 'برای این مشتری سقف اعتبار امن محاسبه نشده است؛ فروش اعتباری باید با تأیید مدیر انجام شود.'}
                      </p>
                      <div className="mt-3 grid gap-2 sm:grid-cols-3">
                        <div className="rounded-2xl bg-white/65 px-3 py-2 dark:bg-slate-950/30">
                          <div className="text-[10px] font-bold opacity-70">سقف پیشنهادی</div>
                          <div className="mt-1 text-[12px] font-black">{formatLocalMoney(suggestedCreditLimit)}</div>
                        </div>
                        <div className="rounded-2xl bg-white/65 px-3 py-2 dark:bg-slate-950/30">
                          <div className="text-[10px] font-bold opacity-70">تعهد پس از ثبت</div>
                          <div className="mt-1 text-[12px] font-black">{formatLocalMoney(projectedCreditExposure)}</div>
                        </div>
                        <div className="rounded-2xl bg-white/65 px-3 py-2 dark:bg-slate-950/30">
                          <div className="text-[10px] font-bold opacity-70">سطح مشتری</div>
                          <div className="mt-1 text-[12px] font-black">{smartSalesMeta.customerTrustProfile?.tierLabel || 'نامشخص'}</div>
                        </div>
                      </div>
                      {isManagerOrAdmin ? (
                        <Button
                          type="button"
                          onClick={() => setCreditLimitManagerApproved(true)}
                          variant={creditLimitManagerApproved ? 'success' : 'warning'}
                          size="xs"
                          className="mt-3 w-full justify-center"
                          leftIcon={<i className={creditLimitManagerApproved ? 'fa-solid fa-check' : 'fa-solid fa-user-tie'} />}
                        >
                          {creditLimitManagerApproved ? 'تأیید مدیر فعال است' : 'تأیید مدیر برای ادامه ثبت'}
                        </Button>
                      ) : (
                        <div className="mt-3 rounded-2xl border border-current/20 px-3 py-2 text-[12px] font-bold">
                          کاربر فعلی مجوز تأیید این فروش را ندارد. تأیید باید توسط مدیر انجام شود.
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : null}

              <CartSummary
                customers={customers}
                selectedCustomerId={state.customerId}
                onCustomerChange={(id) => dispatch({ type: 'SET_CUSTOMER', payload: { customerId: id } })}
                paymentMethod={state.paymentMethod as any}
                onPaymentChange={(m) => handlePaymentMethodChange(m as any)}
                items={state.items}
                summary={summary}
                globalDiscount={summary.globalDiscount}
                onGlobalDiscountChange={(val: unknown) =>
                  dispatch({
                    type: 'SET_GLOBAL_DISCOUNT',
                    payload: { discount: typeof val === 'number' ? val : parseToman(String(val)) },
                  })
                }
                notes={state.notes}
                onNotesChange={(t) => dispatch({ type: 'SET_NOTES', payload: { notes: t } })}
                salesDate={salesDate}
                onDateChange={setSalesDate}
                onSubmit={handleCheckout}
                isSubmitting={isSubmitting}
                loadingHint={checkoutStageHint}
                loadingStageStep={checkoutStageProgress}
                loadingStageTotal={3}
                loadingStageIcon={checkoutStageIcon}
              />
            </section>
          </aside>
        </div>

        <section className="mt-4 rounded-[28px] border border-slate-200 bg-white/96 p-4 shadow-[0_24px_56px_-44px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-slate-950/82" dir="rtl" data-ui-sales-surface="advisor">
          <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-3 py-1 text-[10px] font-extrabold text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300">
                <i className="fa-solid fa-sparkles text-[10px]" />
                بخش هوش مصنوعی فروش
              </div>
              <h4 className="mt-3 text-[17px] font-extrabold text-slate-900 dark:text-slate-100">دستیار هوشمند همین فاکتور</h4>
              <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">تحلیل سود، ریسک تخفیف، وضعیت مشتری و موجودی از بک‌اند محاسبه می‌شود و عدد اعتماد از داده‌های واقعی همین فاکتور می‌آید.</p>
            </div>
            <div className="grid grid-cols-2 gap-2 sm:min-w-[260px]">
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/75 px-3 py-2.5 text-right dark:border-slate-800 dark:bg-slate-900/45">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">تعداد تحلیل‌ها</div>
                    <div className="mt-1 text-[16px] font-black text-slate-900 dark:text-slate-100">{smartSalesLoading ? '...' : smartSalesInsights.length.toLocaleString('fa-IR')}</div>
                  </div>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-violet-100 bg-violet-50 text-violet-600 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300">
                    <i className="fa-solid fa-chart-line text-[12px]" />
                  </span>
                </div>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-slate-50/75 px-3 py-2.5 text-right dark:border-slate-800 dark:bg-slate-900/45">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <div className="text-[10px] font-extrabold text-slate-500 dark:text-slate-400">نوع فروش</div>
                    <div className="mt-1 text-[16px] font-black text-slate-900 dark:text-slate-100">{state.paymentMethod === 'credit' ? 'اعتباری' : 'نقدی'}</div>
                  </div>
                  <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-xl border border-blue-100 bg-blue-50 text-blue-600 dark:border-blue-900/60 dark:bg-blue-950/35 dark:text-blue-300">
                    <i className={state.paymentMethod === 'credit' ? 'fa-solid fa-file-invoice-dollar text-[12px]' : 'fa-solid fa-money-bill-wave text-[12px]'} />
                  </span>
                </div>
              </div>
            </div>
          </div>

          {state.customerId && smartSalesMeta.customerTrustProfile ? (
            <div className={[
              'mb-4 rounded-[24px] border p-4 text-right shadow-[0_18px_42px_-34px_rgba(15,23,42,0.24)]',
              isCustomerRiskControlledByCash
                ? 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                : customerTrustActionTone === 'risk'
                  ? 'border-rose-200 bg-rose-50/75 dark:border-rose-900/60 dark:bg-rose-950/20'
                  : customerTrustActionTone === 'positive'
                    ? 'border-emerald-200 bg-emerald-50/75 dark:border-emerald-900/60 dark:bg-emerald-950/20'
                    : 'border-slate-200 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/45',
            ].join(' ')}>
              <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[13px] font-black text-slate-900 dark:text-slate-50">
                    <i className={isCustomerRiskControlledByCash ? 'fa-solid fa-circle-check text-emerald-500' : customerTrustActionTone === 'risk' ? 'fa-solid fa-triangle-exclamation text-rose-500' : customerTrustActionTone === 'positive' ? 'fa-solid fa-user-check text-emerald-500' : 'fa-solid fa-lightbulb text-amber-500'} />
                    {isCustomerRiskControlledByCash ? 'ریسک با پرداخت نقدی کنترل شد' : 'پیشنهاد اقدام مدیریتی قبل از ثبت فاکتور'}
                  </div>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">
                    {selectedCustomer?.fullName ? `مشتری انتخاب‌شده: ${selectedCustomer.fullName} · ` : ''}
                    امتیاز اعتماد: {customerTrustScore == null ? 'نامشخص' : `${customerTrustScore.toLocaleString('fa-IR')} از ۱۰۰`}
                    {smartSalesMeta.customerTrustProfile?.tierLabel ? ` · ${smartSalesMeta.customerTrustProfile.tierLabel}` : ''}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2 text-[11px] font-black">
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    سقف اعتبار: {suggestedCreditLimit > 0 ? formatLocalMoney(suggestedCreditLimit) : 'نامشخص'}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    دیرکرد/معوق: {customerLateOrOverdueCount.toLocaleString('fa-IR')}
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-2.5 py-1 text-slate-700 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                    چک برگشتی: {customerReturnedCheckCount.toLocaleString('fa-IR')}
                  </span>
                </div>
              </div>

              {customerTrustActionTone === 'risk' && state.paymentMethod === 'credit' && !isCustomerRiskControlledByCash ? (
                <div className="mt-3 flex flex-col gap-3 rounded-[22px] border border-rose-300 bg-white p-3 shadow-[0_18px_42px_-30px_rgba(225,29,72,0.45)] ring-2 ring-rose-100 dark:border-rose-800 dark:bg-rose-950/20 dark:ring-rose-900/40 md:flex-row md:items-center md:justify-between">
                  <div className="flex items-start gap-3">
                    <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/45 dark:text-rose-100">
                      <i className="fa-solid fa-arrow-right-arrow-left" />
                    </span>
                    <div>
                      <div className="text-[13px] font-black text-rose-800 dark:text-rose-100">پیشنهاد فوری: تغییر روش پرداخت به نقدی</div>
                      <p className="mt-1 text-[11px] leading-5 text-rose-700/90 dark:text-rose-100/80">
                        این مشتری سیگنال ریسک دارد. برای ثبت امن‌تر، می‌توانی همین‌جا روش پرداخت را از اعتباری به نقدی تغییر بدهی.
                      </p>
                    </div>
                  </div>
                  <Button
                    type="button"
                    variant="danger"
                    size="sm"
                    className="w-full justify-center !rounded-2xl !px-4 !py-2.5 !text-[12px] !font-black md:w-auto"
                    leftIcon={<i className="fa-solid fa-money-bill-wave" />}
                    onClick={() => {
                      logRiskPaymentMethodChange('credit', 'cash', 'تغییر پیشنهادی سیستم از اعتباری به نقدی برای کنترل ریسک مشتری');
                      dispatch({ type: 'SET_PAYMENT_METHOD', payload: { method: 'cash' } });
                      setNotification({
                        type: 'success',
                        text: 'روش پرداخت برای کاهش ریسک این مشتری به نقدی تغییر کرد.',
                      });
                    }}
                  >
                    تغییر به نقدی
                  </Button>
                </div>
              ) : null}

              {isCustomerRiskControlledByCash ? (
                <div className="mt-3 flex items-start gap-3 rounded-[22px] border border-emerald-200 bg-white p-3 shadow-[0_18px_42px_-34px_rgba(16,185,129,0.35)] ring-1 ring-emerald-100 dark:border-emerald-900/55 dark:bg-emerald-950/20 dark:ring-emerald-900/30">
                  <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-emerald-100 text-emerald-700 dark:bg-emerald-900/45 dark:text-emerald-100">
                    <i className="fa-solid fa-circle-check" />
                  </span>
                  <div>
                    <div className="text-[12px] font-black text-emerald-800 dark:text-emerald-100">اقدام اصلاحی انجام شد</div>
                    <p className="mt-1 text-[11px] leading-5 text-emerald-700/90 dark:text-emerald-100/80">
                      روش پرداخت نقدی شده است؛ ریسک اعتباری این فاکتور کنترل شده، بدهی جدید برای مشتری ثبت نمی‌شود و دکمه تغییر به نقدی دیگر نمایش داده نمی‌شود.
                    </p>
                  </div>
                </div>
              ) : null}

              <div className="mt-3 grid gap-2 md:grid-cols-3">
                {customerTrustActionSuggestions.map((action) => (
                  <div key={action.title} className="rounded-2xl border border-white/70 bg-white/80 px-3 py-2.5 shadow-sm dark:border-slate-800 dark:bg-slate-950/55">
                    <div className="flex items-center gap-2 text-[11px] font-black text-slate-900 dark:text-slate-100">
                      <i className={action.icon} />
                      {action.title}
                    </div>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">{action.text}</p>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <SmartSalesAdvisor
            title="دستیار هوشمند فروش"
            subtitle="پیشنهادها و هشدارهای لحظه‌ای با محاسبه سمت سرور"
            contextLabel={state.paymentMethod === 'credit' ? 'فروش اعتباری' : 'فروش نقدی'}
            learningStatus={smartSalesMeta.learningStatus}
            insights={smartSalesInsights}
          />
        </section>
      </div>
    </div>
    </>
  );
};

export default SalesCartPage;
