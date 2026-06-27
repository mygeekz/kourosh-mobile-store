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
  const paymentPrefillGuardRef = useRef<string | null>(null);

  const searchParams = new URLSearchParams(location.search);
  const routePrefillPaymentMethod: 'credit' | null =
    searchParams.get('mode') === 'credit' || (location.state as any)?.prefillPaymentMethod === 'credit'
      ? 'credit'
      : null;
  const routePaymentPrefillKey = `${location.key}:${routePrefillPaymentMethod ?? 'none'}`;

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

  const checkoutStateRef = useRef<CartState>(state);
  const paymentMethodRef = useRef<CartState['paymentMethod']>(state.paymentMethod);
  const customerIdRef = useRef<number | null>(state.customerId);

  useEffect(() => {
    checkoutStateRef.current = state;
    paymentMethodRef.current = state.paymentMethod;
    customerIdRef.current = state.customerId;
  }, [state]);

  const setPaymentMethod = (method: CartState['paymentMethod']) => {
    paymentMethodRef.current = method;
    checkoutStateRef.current = { ...checkoutStateRef.current, paymentMethod: method };
    dispatch({ type: 'SET_PAYMENT_METHOD', payload: { method } });
  };

  const setCustomerId = (customerId: number | null) => {
    customerIdRef.current = customerId;
    checkoutStateRef.current = { ...checkoutStateRef.current, customerId };
    dispatch({ type: 'SET_CUSTOMER', payload: { customerId } });
  };

  const setGlobalDiscount = (discount: number) => {
    const cleanDiscount = Math.max(0, Number(discount) || 0);
    checkoutStateRef.current = { ...checkoutStateRef.current, globalDiscount: cleanDiscount };
    dispatch({ type: 'SET_GLOBAL_DISCOUNT', payload: { discount: cleanDiscount } });
  };

  const setNotes = (notes: string) => {
    checkoutStateRef.current = { ...checkoutStateRef.current, notes };
    dispatch({ type: 'SET_NOTES', payload: { notes } });
  };

  useEffect(() => {
    if (!routePrefillPaymentMethod) return;
    if (paymentPrefillGuardRef.current === routePaymentPrefillKey) return;
    paymentPrefillGuardRef.current = routePaymentPrefillKey;
    if (state.paymentMethod !== routePrefillPaymentMethod) {
      setPaymentMethod(routePrefillPaymentMethod);
    }
  }, [routePrefillPaymentMethod, routePaymentPrefillKey, state.paymentMethod]);

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
    const normalizedType = ((prefill.type as string)?.toLowerCase() === 'product' ? 'inventory' : (prefill.type as string)) as SellableItem['type'];
    const guardKey = `${location.key}:${normalizedType}:${prefill.id ?? prefill.itemId}`;
    if (prefillGuardRef.current === guardKey) return;
    prefillGuardRef.current = guardKey;

    const item = (
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
          }
    ) as SellableItem;

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
    setCustomerId(prefillCustomerId);
    navigate(location.pathname, { replace: true, state: { ...(location.state as any), prefillCustomerId: undefined, prefillCustomerName: undefined, prefillItem: (location.state as any)?.prefillItem } });
  }, [location.state, location.pathname, navigate]);

  /* افزودن مورد جدید آیتم از سرچ‌باکس */
  const handleAddItem = (item: SellableItem) => dispatch({ type: 'ADD_ITEM', payload: item });

  /* ثبت اطلاعات فروش */
  const handleCheckout = async (forcedPaymentMethod?: CartState['paymentMethod'], forcedCustomerId?: number | null) => {
    const checkoutState = {
      ...state,
      paymentMethod: forcedPaymentMethod ?? paymentMethodRef.current ?? state.paymentMethod,
      customerId: forcedCustomerId ?? customerIdRef.current ?? state.customerId,
      items: checkoutStateRef.current.items.length ? checkoutStateRef.current.items : state.items,
      globalDiscount: checkoutStateRef.current.globalDiscount ?? state.globalDiscount,
      notes: checkoutStateRef.current.notes ?? state.notes,
    };
    const checkoutPaymentMethod: CartState['paymentMethod'] = checkoutState.paymentMethod === 'credit' ? 'credit' : 'cash';
    const checkoutCustomerId = checkoutState.customerId;
    if (!checkoutState.items.length) { setNotification({ type: 'warning', text: 'سبد خرید خالی است.' }); return; }
    if (checkoutPaymentMethod === 'credit' && !checkoutCustomerId) {
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
    setCheckoutStageHint(checkoutPaymentMethod === 'credit' ? 'در حال اعتبارسنجی فروش اعتباری و حساب مشتری' : 'در حال اعتبارسنجی اقلام فروش و موجودی');

    // subtotal و تخفیف‌ها را مانند نمایش، پاک‌سازی و سقف‌گذاری می‌کنیم
    const subtotal = checkoutState.items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0);
    const itemsDiscount = checkoutState.items.reduce((sum, item) => sum + Math.min(Math.max(Number(item.discountPerItem) || 0, 0), (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)), 0);
    const afterRowDiscounts = Math.max(0, subtotal - itemsDiscount);
    const cleanGlobal = Math.min(Math.max(Number(checkoutState.globalDiscount) || 0, 0), afterRowDiscounts);

    const payload: SalesOrderPayload = {
      transactionDate: (salesDate ? moment(salesDate).locale('en').format('YYYY-MM-DD') : undefined),
      customerId: checkoutCustomerId,
      paymentMethod: checkoutPaymentMethod,
      discount: cleanGlobal, // تخفیف کل فاکتور
      tax: 0,
      notes: creditLimitManagerApproved ? `${checkoutState.notes || ''}\n[تأیید مدیر برای عبور از سقف اعتبار پیشنهادی]`.trim() : checkoutState.notes,
      items: checkoutState.items.map(i => ({
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
      setCheckoutStageHint(checkoutPaymentMethod === 'credit' ? 'در حال ثبت اطلاعات فروش اعتباری و ایجاد سند حساب مشتری' : 'در حال ثبت اطلاعات فروش و صدور فاکتور');
      const res = await apiFetch('/api/sales-orders', { method: 'POST', body: JSON.stringify(payload) });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.message);
      setCheckoutStageHint(checkoutPaymentMethod === 'credit' ? 'در حال نهایی‌سازی فاکتور و به‌روزرسانی حساب مشتری' : 'در حال نهایی‌سازی فاکتور و به‌روزرسانی موجودی');
      if (!mountedRef.current) return;
      setNotification({ type: 'success', text: checkoutPaymentMethod === 'credit' ? 'فروش اعتباری ثبت اطلاعات شد و در حساب مشتری اعمال شد.' : 'فروش ثبت اطلاعات شد!' });
      paymentMethodRef.current = initialState.paymentMethod;
      customerIdRef.current = initialState.customerId;
      checkoutStateRef.current = initialState;
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
    const subtotal = state.items.reduce((sum, item) => sum + (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0), 0);
    const itemsDiscount = state.items.reduce((sum, item) => sum + Math.min(Math.max(Number(item.discountPerItem) || 0, 0), (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0)), 0);
    const afterRowDiscounts = Math.max(0, subtotal - itemsDiscount);
    const cleanGlobal = Math.min(Math.max(Number(state.globalDiscount) || 0, 0), afterRowDiscounts);
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
  const customerTrustScore = smartSalesMeta.customerTrustProfile?.score == null ? null : Number(smartSalesMeta.customerTrustProfile.score);
  const customerLateOrOverdueCount = Number(smartSalesMeta.customerTrustProfile?.latePaymentCount || 0) + Number(smartSalesMeta.customerTrustProfile?.overdueUnpaidCount || 0);
  const customerReturnedCheckCount = Number(smartSalesMeta.customerTrustProfile?.returnedCheckCount || 0);
  const hasNegativeCreditHistory = customerLateOrOverdueCount > 0 || customerReturnedCheckCount > 0;
  // حداقل اعتبار عملیاتی: مشتری عادی و بدون سابقه بد نباید برای فروش‌های سبک فوری نیازمند تایید مدیر شود.
  const minimumRoutineCreditLimit = 5_000_000;
  const effectiveCreditLimit = suggestedCreditLimit > 0 ? Math.max(suggestedCreditLimit, minimumRoutineCreditLimit) : minimumRoutineCreditLimit;
  const isCreditLimitExceeded = state.paymentMethod === 'credit' && Boolean(state.customerId) && projectedCreditExposure > effectiveCreditLimit;
  const isCreditLimitBlocked = state.paymentMethod === 'credit' && Boolean(state.customerId) && (
    customerReturnedCheckCount > 0 ||
    (hasNegativeCreditHistory && isCreditLimitExceeded) ||
    (customerTrustScore != null && customerTrustScore < 35 && isCreditLimitExceeded)
  );
  const requiresManagerCreditApproval = isCreditLimitBlocked && !creditLimitManagerApproved;
  const formatLocalMoney = (value: number) => `${(Number(value) || 0).toLocaleString('fa-IR')} تومان`;
  const selectedCustomer = customers.find((customer) => Number(customer.id) === Number(state.customerId)) || null;
  const hasCustomerTrustRisk = Boolean(state.customerId) && (
    customerReturnedCheckCount > 0 ||
    customerLateOrOverdueCount > 0 ||
    (customerTrustScore != null && customerTrustScore < 35 && isCreditLimitExceeded) ||
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
    const previousMethod = paymentMethodRef.current;
    if (method === 'credit' && !customerIdRef.current) {
      setNotification({ type: 'warning', text: 'برای فروش اعتباری ابتدا یک مشتری واقعی انتخاب کن.' });
      return;
    }
    setPaymentMethod(method);
    if (previousMethod !== method && method === 'credit' && hasCustomerTrustRisk && customerIdRef.current) {
      logRiskPaymentMethodChange(previousMethod, method, 'بازگشت دستی اپراتور به پرداخت اعتباری برای مشتری پرریسک');
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
      className="sales-cart-foundation min-h-screen bg-slate-50/80 dark:bg-slate-950"
      dir="rtl"
      data-ui-sales-page="cart"
      data-ui-sales-mode={state.paymentMethod}
    >
      {notification && <Notification message={notification} onClose={() => setNotification(null)} />}

      <div className="w-full px-4 py-4 2xl:px-6">
        {/* بدنه اصلی فروش */}
        <div className="sales-workspace grid grid-cols-1 items-start gap-5 xl:grid-cols-[340px_minmax(0,1fr)_410px] 2xl:grid-cols-[360px_minmax(0,1fr)_430px]" dir="ltr" data-ui-sales-workspace="true">
          <aside className="space-y-4 xl:sticky xl:top-4" dir="rtl" data-ui-sales-services-sidebar="true">
            <section className="sales-section-card overflow-hidden rounded-[28px] border border-slate-200 bg-white/96 p-4 shadow-[0_24px_58px_-44px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/86">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-right">
                  <h2 className="text-[18px] font-black text-slate-950 dark:text-slate-50">لیست خدمات</h2>
                  <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500 dark:text-slate-400">خدمات فروش را سریع به فاکتور اضافه کن.</p>
                </div>
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <i className="fa-solid fa-screwdriver-wrench" />
                </span>
              </div>
              <ServiceQuickSell variant="dark" layout="list" maxVisible={8} onAddItem={handleAddItem} />
            </section>
          </aside>

          <section className="space-y-4">
            <section id="sale-step-items" dir="rtl" className="sales-section-card overflow-visible rounded-[28px] border border-slate-200 bg-white/96 p-4 shadow-[0_24px_58px_-44px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/86">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div className="text-right">
                  <h2 className="text-[16px] font-black text-slate-950 dark:text-slate-50">افزودن کالا / خدمت</h2>
                  <p className="mt-1 text-[11px] font-medium leading-5 text-slate-500 dark:text-slate-400">کمبوباکس کالاهای انبار و خدمات را نمایش می‌دهد و قابلیت جستجو دارد.</p>
                </div>
                <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 shadow-sm dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <i className="fa-solid fa-layer-group" />
                </span>
              </div>

              <div className="mb-3">
                <SellableItemSelect onAddItem={handleAddItem} />
              </div>

              <div className="rounded-[22px] border border-slate-200 bg-slate-50/80 p-3.5 dark:border-slate-800 dark:bg-slate-900/45" data-ui-sales-advisor="inline">
                <div className="mb-3 flex items-start justify-between gap-3">
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-full border border-violet-100 bg-violet-50 px-2.5 py-1 text-[10px] font-black text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/35 dark:text-violet-300">
                      <i className="fa-solid fa-sparkles" />
                      تحلیل هوشمند فروش
                    </div>
                    <h3 className="mt-2 text-[15px] font-black text-slate-950 dark:text-slate-50">کنترل هوشمند همین فاکتور</h3>
                    <p className="mt-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">ریسک مشتری، سقف اعتبار، کیفیت داده، تخفیف و پیشنهادهای لحظه‌ای اینجا نمایش داده می‌شود.</p>
                  </div>
                  <span className={`inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-2xl ${smartSalesLoading ? 'bg-blue-50 text-blue-600 dark:bg-blue-950/30 dark:text-blue-300' : customerTrustActionTone === 'risk' ? 'bg-rose-50 text-rose-600 dark:bg-rose-950/30 dark:text-rose-300' : 'bg-emerald-50 text-emerald-600 dark:bg-emerald-950/30 dark:text-emerald-300'}`}>
                    <i className={smartSalesLoading ? 'fa-solid fa-spinner fa-spin' : customerTrustActionTone === 'risk' ? 'fa-solid fa-triangle-exclamation' : 'fa-solid fa-shield-halved'} />
                  </span>
                </div>

                <div className="grid gap-2 sm:grid-cols-2 xl:grid-cols-4">
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">سطح ریسک</div>
                    <div className={`mt-1 text-[12px] font-black ${customerTrustActionTone === 'risk' ? 'text-rose-600 dark:text-rose-300' : 'text-emerald-600 dark:text-emerald-300'}`}>{!state.customerId ? 'بدون مشتری' : customerTrustActionTone === 'risk' ? 'نیازمند توجه' : 'پایین'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">امتیاز اعتماد</div>
                    <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-slate-100">{customerTrustScore == null ? '—' : `${customerTrustScore.toLocaleString('fa-IR')} از ۱۰۰`}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">سقف اعتبار</div>
                    <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-slate-100">{suggestedCreditLimit > 0 ? formatLocalMoney(suggestedCreditLimit) : 'نامشخص'}</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/70">
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">کیفیت داده</div>
                    <div className="mt-1 text-[12px] font-black text-slate-900 dark:text-slate-100">{Number(smartSalesMeta.dataQuality || 0).toLocaleString('fa-IR')}٪</div>
                  </div>
                </div>

                {customerTrustActionTone === 'risk' && state.paymentMethod === 'credit' && !isCustomerRiskControlledByCash ? (
                  <div className="sales-risk-cash-suggestion mt-3 grid gap-3 rounded-[20px] border border-rose-200 bg-rose-50/80 p-3 text-right dark:border-rose-900/60 dark:bg-rose-950/20 md:grid-cols-[minmax(0,1fr)_auto] md:items-center">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-rose-100 text-rose-700 dark:bg-rose-900/45 dark:text-rose-100">
                        <i className="fa-solid fa-triangle-exclamation" />
                      </span>
                      <div>
                        <div className="text-[13px] font-black text-rose-800 dark:text-rose-100">پیشنهاد فوری: تغییر روش پرداخت به نقدی</div>
                        <p className="mt-1 text-[11px] leading-5 text-rose-700/90 dark:text-rose-100/80">این مشتری سیگنال ریسک دارد؛ برای کنترل ریسک، سیستم پیشنهاد می‌دهد روش پرداخت نقدی شود.</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      className="sales-risk-switch-cash-btn w-full justify-center md:w-auto"
                      style={{ backgroundColor: '#fff1f2', borderColor: '#fb7185', color: '#9f1239', WebkitTextFillColor: '#9f1239' }}
                      onClick={(event) => {
                        event.preventDefault();
                        event.stopPropagation();
                        logRiskPaymentMethodChange('credit', 'cash', 'تغییر پیشنهادی سیستم از اعتباری به نقدی برای کنترل ریسک مشتری');
                        setPaymentMethod('cash');
                        setNotification({ type: 'success', text: 'روش پرداخت برای کاهش ریسک این مشتری به نقدی تغییر کرد.' });
                      }}
                    >
                      <i className="fa-solid fa-money-bill-wave" />
                      <span>تغییر به نقدی</span>
                    </button>
                  </div>
                ) : null}

                <div className="mt-3 grid gap-2 sm:grid-cols-3">
                  {customerTrustActionSuggestions.slice(0, 3).map((action) => (
                    <div key={action.title} className="rounded-2xl border border-slate-200 bg-white px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="flex items-center gap-2 text-[11px] font-black text-slate-900 dark:text-slate-100">
                        <i className={action.icon} />
                        {action.title}
                      </div>
                      <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">{action.text}</p>
                    </div>
                  ))}
                </div>

                <div className="mt-3">
                  <SmartSalesAdvisor
                    title="دستیار هوشمند فروش"
                    subtitle="پیشنهادها و هشدارهای لحظه‌ای با محاسبه سمت سرور"
                    contextLabel={state.paymentMethod === 'credit' ? 'فروش اعتباری' : 'فروش نقدی'}
                    learningStatus={smartSalesMeta.learningStatus}
                    insights={smartSalesInsights}
                  />
                </div>
              </div>
            </section>

            <section id="sale-step-cart" dir="rtl" className="sales-section-card overflow-hidden rounded-[28px] border border-slate-200 bg-white/95 p-4 shadow-[0_24px_54px_-42px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/82">
              <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[10px] font-extrabold text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    <i className="fa-solid fa-cart-shopping text-[10px]" />
                    سبد فروش
                  </div>
                  <h3 className="mt-3 text-[17px] font-extrabold text-slate-900 dark:text-slate-100">سبد فروش</h3>
                  <p className="mt-1 text-[12px] leading-6 text-slate-500 dark:text-slate-400">تعداد، قیمت واحد، تخفیف و حذف ردیف‌ها را بدون کارت‌های اضافی کنترل کن.</p>
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
                <CartTable items={state.items} dispatch={dispatch} />
              )}
            </section>
          </section>

          <aside className="space-y-4 xl:sticky xl:top-4" dir="rtl">
            <section className="rounded-[28px] border border-slate-200 bg-white/96 p-4 shadow-[0_24px_58px_-44px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/86" data-ui-sales-customer-card="true">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-right">
                  <h3 className="text-[17px] font-black text-slate-950 dark:text-slate-50">اطلاعات مشتری</h3>
                  <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500 dark:text-slate-400">برای فروش نقدی می‌توانی مشتری مهمان را نگه داری؛ برای اعتباری انتخاب مشتری الزامی است.</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <i className="fa-solid fa-user" />
                </span>
              </div>

              <select
                value={state.customerId ?? ''}
                onChange={(event) => setCustomerId(event.target.value ? Number(event.target.value) : null)}
                className="h-11 w-full rounded-2xl border border-slate-200 bg-white px-3 text-right text-[13px] font-black text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100 dark:border-slate-800 dark:bg-slate-950/80 dark:text-slate-100 dark:focus:ring-blue-950/30"
                aria-label="انتخاب مشتری"
              >
                <option value="">مشتری مهمان</option>
                {customers.map((customer) => (
                  <option key={customer.id} value={customer.id}>
                    {customer.fullName}{customer.phoneNumber ? ` — ${customer.phoneNumber}` : ''}
                  </option>
                ))}
              </select>

              <div className="mt-3 rounded-[22px] border border-slate-200 bg-slate-50/75 p-3 text-right dark:border-slate-800 dark:bg-slate-900/45">
                <div className="text-[12px] font-black text-slate-900 dark:text-slate-100">
                  {selectedCustomer?.fullName || 'مشتری مهمان'}
                </div>
                <div className="mt-2 grid gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                  <div className="flex items-center justify-between gap-3">
                    <span>شماره موبایل</span>
                    <span className="text-slate-700 dark:text-slate-200">{selectedCustomer?.phoneNumber || '—'}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>مانده حساب</span>
                    <span className="text-slate-700 dark:text-slate-200">{formatLocalMoney(Number(selectedCustomer?.currentBalance || 0))}</span>
                  </div>
                </div>
              </div>
            </section>

            <section className="rounded-[28px] border border-slate-200 bg-white/96 p-4 shadow-[0_24px_58px_-44px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-950/86" data-ui-sales-checkout-card="true">
              <div className="mb-4 flex items-center justify-between gap-3">
                <div className="text-right">
                  <h3 className="text-[17px] font-black text-slate-950 dark:text-slate-50">خلاصه مالی و ثبت نهایی</h3>
                  <p className="mt-1 text-[12px] font-medium leading-5 text-slate-500 dark:text-slate-400">جمع فاکتور، تخفیف، پرداخت و ثبت نهایی در همین ستون کنترل می‌شود.</p>
                </div>
                <span className="inline-flex h-10 w-10 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                  <i className="fa-solid fa-receipt" />
                </span>
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
                customers={[]}
                selectedCustomerId={state.customerId}
                onCustomerChange={setCustomerId}
                paymentMethod={state.paymentMethod as any}
                onPaymentChange={(m) => handlePaymentMethodChange(m as any)}
                items={state.items}
                summary={summary}
                globalDiscount={summary.globalDiscount}
                onGlobalDiscountChange={(val: unknown) => setGlobalDiscount(typeof val === 'number' ? val : parseToman(String(val)))}
                notes={state.notes}
                onNotesChange={setNotes}
                salesDate={salesDate}
                onDateChange={setSalesDate}
                onSubmit={() => handleCheckout(state.paymentMethod, state.customerId)}
                isSubmitting={isSubmitting}
                loadingHint={checkoutStageHint}
                loadingStageStep={checkoutStageProgress}
                loadingStageTotal={3}
                loadingStageIcon={checkoutStageIcon}
              />
            </section>
          </aside>
        </div>

      </div>
    </div>
    </>
  );
};

export default SalesCartPage;
