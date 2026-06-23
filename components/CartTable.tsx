import React from 'react';
import type { CartItem, CartAction } from '../types';
import PriceInput from './PriceInput';
import { parseToman, formatToman } from '../utils/money';
import { formatCurrencyText, readStoredCurrencyUnit } from '../utils/currency';

interface CartTableProps {
  items: CartItem[];
  dispatch: React.Dispatch<CartAction>;
}

const ownershipToneMap: Record<string, string> = {
  personal: 'border-amber-200/80 bg-amber-50/85 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-300',
  store: 'border-emerald-200/80 bg-emerald-50/85 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-300',
  shared: 'border-sky-200/80 bg-sky-50/85 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300',
  unknown: 'border-slate-200 bg-slate-50/85 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300',
};

const getItemTypeLabel = (itemType: CartItem['itemType']) => {
  switch (itemType) {
    case 'phone':
      return 'موبایل';
    case 'inventory':
      return 'کالا';
    case 'service':
      return 'خدمت';
    default:
      return 'آیتم';
  }
};

const getOwnershipLabel = (item: CartItem) => {
  if (item.itemType === 'service') return 'خدمت';
  if (item.ownershipTitle) return item.ownershipTitle;
  if (item.ownershipType === 'store') return 'مالکیت فروشگاه';
  if (item.ownershipType === 'personal') return 'مالکیت شخصی';
  if (item.ownershipType === 'shared') return 'مالکیت مشترک';
  return 'نامشخص';
};

const getOwnershipTone = (item: CartItem) => {
  if (item.itemType === 'service') return ownershipToneMap.unknown;
  return ownershipToneMap[item.ownershipType || 'unknown'] || ownershipToneMap.unknown;
};

const getRawInitialBasis = (item: CartItem) => {
  const candidates = [
    item.initialPurchasePrice,
    (item as any).purchasePrice,
    (item as any).initialBuyPrice,
    (item as any).initialCostPerUnit,
    (item as any).baseBuyPrice,
    (item as any).costPrice,
    (item as any).costPerUnit,
    (item as any).productPurchasePrice,
    (item as any).phonePurchasePrice,
    (item as any).marketCostPerUnit,
    (item as any).marketUnitBuyPrice,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

const getCurrentBasis = (item: CartItem) => {
  const candidates = [
    (item as any).currentPurchasePrice,
    (item as any).currentBuyPrice,
    item.buyPrice,
    (item as any).marketCostPerUnit,
    (item as any).marketUnitBuyPrice,
    (item as any).baseCost,
    (item as any).costPrice,
    (item as any).costPerUnit,
  ];
  for (const value of candidates) {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) return n;
  }
  return 0;
};

const infoTone = (value: number) => {
  if (value > 0) return 'text-emerald-700 dark:text-emerald-300';
  if (value < 0) return 'text-rose-700 dark:text-rose-300';
  return 'text-slate-700 dark:text-slate-200';
};

const fieldInputClass =
  'h-9 w-full border-b border-slate-200 bg-transparent px-1 py-1.5 text-[12px] font-bold text-slate-900 outline-none transition  dark:border-slate-800 dark:text-slate-100';

const MinimalField: React.FC<{ label: string; children: React.ReactNode; caption?: string }> = ({ label, children, caption }) => (
  <label className="block min-w-0">
    <div className="mb-1.5 flex items-center justify-between gap-2">
      <span className="text-[10px] font-bold tracking-[0.08em] text-slate-500 dark:text-slate-400">{label}</span>
      {caption ? <span className="text-[9px] font-semibold text-slate-400 dark:text-slate-500">{caption}</span> : null}
    </div>
    {children}
  </label>
);

const MinimalReadonly: React.FC<{ value: string; tone?: string; className?: string }> = ({ value, tone, className = '' }) => (
  <div className={`flex min-h-[32px] items-center border-b border-slate-200 px-1 py-1 text-[12px] font-bold dark:border-slate-800 ${tone || 'text-slate-900 dark:text-slate-100'} ${className}`}>
    {value}
  </div>
);

const InlineMetric: React.FC<{ label: string; value: string; tone?: string; compact?: boolean; center?: boolean }> = ({ label, value, tone, compact = false, center = false }) => (
  <div
    className={`rounded-2xl bg-slate-50/90 dark:bg-slate-900/75 ${compact ? 'px-2.5 py-1.5' : 'px-3 py-2'} ${center ? 'text-center' : ''}`}
  >
    <div className={`text-[9px] font-black tracking-[0.08em] text-slate-500 dark:text-slate-400 ${center ? 'text-center' : ''}`}>{label}</div>
    <div className={`mt-0.5 text-[12px] font-black leading-5 ${center ? 'text-center' : ''} ${tone || 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
  </div>
);

const actionButtonClass =
  'inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-slate-300 hover:text-slate-900 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-300 dark:hover:border-slate-700 dark:hover:text-slate-100';

const CartTable: React.FC<CartTableProps> = ({ items, dispatch }) => {
  const [expandedItems, setExpandedItems] = React.useState<Record<string, boolean>>({});

  React.useEffect(() => {
    setExpandedItems((prev) => {
      const next = { ...prev };
      const ids = new Set(items.map((item) => item.cartItemId));
      Object.keys(next).forEach((key) => {
        if (!ids.has(key)) delete next[key];
      });
      items.forEach((item) => {
        if (!(item.cartItemId in next)) next[item.cartItemId] = false;
      });
      return next;
    });
  }, [items]);

  if (!items.length) {
    return (
      <div className="rounded-[20px] border border-dashed border-slate-300 bg-white/80 p-8 text-center text-sm font-medium text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400">
        سبد خرید خالی است.
      </div>
    );
  }

  const handleQuantityChange = (cartItemId: string, quantityStr: string) => {
    const q = parseInt(quantityStr, 10);
    if (Number.isFinite(q) && q > 0) {
      dispatch({ type: 'UPDATE_QUANTITY', payload: { cartItemId, quantity: q } });
    }
  };

  const handleDiscountChange = (cartItemId: string, discountStr: string, item: CartItem) => {
    const lineSubtotal = (Number(item.unitPrice) || 0) * (Number(item.quantity) || 0);
    const raw = parseToman(discountStr);
    const capped = Math.max(0, Math.min(raw, lineSubtotal));
    dispatch({ type: 'UPDATE_ITEM_DISCOUNT', payload: { cartItemId, discount: capped } });
  };

  const handleRemoveItem = (cartItemId: string) => {
    dispatch({ type: 'REMOVE_ITEM', payload: { cartItemId } });
  };

  const handleBuyPriceChange = (cartItemId: string, buyPriceStr: string) => {
    const buyPrice = Math.max(0, parseToman(buyPriceStr));
    dispatch({ type: 'UPDATE_BUY_PRICE', payload: { cartItemId, buyPrice } });
  };

  const toggleExpanded = (cartItemId: string) => {
    setExpandedItems((prev) => ({ ...prev, [cartItemId]: !prev[cartItemId] }));
  };

  return (
    <div className="sales-cart-lines space-y-3" dir="rtl" data-ui-sales-cart-lines="true">
      {items.map((item, index) => {
        const qty = Number(item.quantity) || 0;
        const unit = Number(item.unitPrice) || 0;
        const currentBasis = getCurrentBasis(item);
        const rawInitialBasis = getRawInitialBasis(item);
        const initialBasis = rawInitialBasis > 0 ? rawInitialBasis : currentBasis;
        const lineSubtotal = qty * unit;
        const rowDiscount = Math.max(0, Math.min(Number(item.discountPerItem) || 0, lineSubtotal));
        const lineNet = Math.max(0, lineSubtotal - rowDiscount);
        const initialTotal = initialBasis * qty;
        const currentBasisTotal = currentBasis * qty;
        const ownerGain = item.itemType === 'service' ? 0 : Math.max(0, currentBasisTotal - initialTotal);
        const sharedOperationalProfit = lineNet - currentBasisTotal;
        const totalSpread = lineNet - initialTotal;
        const expanded = Boolean(expandedItems[item.cartItemId]);
        const isService = item.itemType === 'service';

        return (
          <article
            key={item.cartItemId}
            className="sales-line-card overflow-hidden rounded-[20px] border border-slate-200 bg-white shadow-[0_18px_42px_-36px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950" data-ui-sales-line="true"
          >
            <div className="px-3 py-3 md:px-3.5">
              <div className="flex items-start gap-2.5">
                <div className="min-w-0 flex-1">
                  <div className="mb-2.5 flex flex-wrap items-center gap-1.5">
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-black tracking-[0.12em] text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      ردیف {Number(index + 1).toLocaleString('fa-IR')}
                    </span>
                    <span className="inline-flex items-center rounded-full border border-slate-200 bg-white px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                      {getItemTypeLabel(item.itemType)}
                    </span>
                    <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[9px] font-bold ${getOwnershipTone(item)}`}>
                      {getOwnershipLabel(item)}
                    </span>
                    {item.profitShareProfileTitle ? (
                      <span className="inline-flex items-center rounded-full border border-violet-200 bg-violet-50 px-2 py-0.5 text-[9px] font-bold text-violet-700 dark:border-violet-900/50 dark:bg-violet-950/20 dark:text-violet-300">
                        {item.profitShareProfileTitle}
                      </span>
                    ) : null}
                  </div>

                  <div className="flex flex-col gap-2 lg:flex-row lg:items-start lg:justify-between">
                    <div className="min-w-0 flex-1">
                      <h3 className="break-words text-[13px] font-extrabold leading-5 text-slate-900 dark:text-slate-100 md:text-[14px]">
                        {item.name}
                      </h3>
                      <p className="mt-1 break-words text-[11px] leading-5.5 text-slate-500 dark:text-slate-400">
                        {isService
                          ? 'این ردیف به‌صورت خدمت در فاکتور ثبت اطلاعات می‌شود.'
                          : item.description || 'اطلاعات تکمیلی این قلم ثبت اطلاعات نشده است.'}
                      </p>
                    </div>

                    <div className="grid min-w-[160px] grid-cols-2 gap-2 lg:w-[220px]">
                      <InlineMetric label="فروش خالص" value={formatCurrencyText(lineNet, readStoredCurrencyUnit())} />
                      <InlineMetric label="سود عملیاتی" value={formatCurrencyText(sharedOperationalProfit, readStoredCurrencyUnit())} tone={infoTone(sharedOperationalProfit)} />
                    </div>
                  </div>
                </div>

                <div className="sales-line-actions flex shrink-0 items-center gap-1.5" data-ui-sales-line-actions="true">
                  <button
                    type="button"
                    onClick={() => toggleExpanded(item.cartItemId)}
                    className={actionButtonClass}
                    title={expanded ? 'بستن جزئیات' : 'نمایش جزئیات'}
                    aria-label={expanded ? 'بستن جزئیات' : 'نمایش جزئیات'}
                  >
                    <span className={`inline-flex transition ${expanded ? 'rotate-180' : ''}`}>
                      <i className="fa-solid fa-chevron-down text-[10px]" />
                    </span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleRemoveItem(item.cartItemId)}
                    title="حذف مورد ردیف"
                    aria-label="حذف مورد ردیف"
                    className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-lg border border-rose-200 bg-rose-500 text-white transition hover:-translate-y-0.5 hover:border-rose-300 hover:bg-rose-600 dark:border-rose-900/50 dark:bg-rose-600 dark:text-white"
                  >
                    <i className="fa-solid fa-trash-can text-[10px]" />
                  </button>
                </div>
              </div>

              <div className="sales-line-controls mt-3 grid gap-3 lg:grid-cols-3" data-ui-sales-line-controls="true">
                <MinimalField
                  label="تعداد"
                  caption={Number.isFinite(item.stock as number) ? `حداکثر ${Number(item.stock).toLocaleString('fa-IR')}` : undefined}
                >
                  <input
                    type="number"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(item.cartItemId, e.target.value)}
                    className={`${fieldInputClass} text-center`}
                    min={1}
                    max={Number.isFinite(item.stock as number) ? (item.stock as number) : undefined}
                  />
                </MinimalField>

                <MinimalField label="قیمت فروش واحد">
                  <MinimalReadonly value={formatToman(unit)} />
                </MinimalField>

                <MinimalField label="تخفیف کل ردیف">
                  <PriceInput
                    value={rowDiscount}
                    onChange={(e) => handleDiscountChange(item.cartItemId, e.target.value, item)}
                    className={`${fieldInputClass} h-8 text-center`}
                    preview="0"
                  />
                </MinimalField>
              </div>
            </div>

            {expanded ? (
              <div className="sales-line-details border-t border-slate-100 px-3 py-3 dark:border-slate-800 md:px-3.5" data-ui-sales-line-details="true">
                <div className="mb-3 flex flex-wrap items-center gap-1.5">
                  <span className="text-[10px] font-bold tracking-[0.1em] text-slate-500 dark:text-slate-400">جزئیات قیمت مبنا و سود</span>
                  <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[9px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {isService ? 'برای خدمت، بهای اولیه صفر در نظر گرفته می‌شود' : 'این بخش برای کنترل سود و مالکیت است'}
                  </span>
                </div>

                <div className="grid gap-3 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                  <div className="grid gap-3 md:grid-cols-2">
                    <MinimalField label="قیمت خرید اولیه">
                      <MinimalReadonly
                        value={
                          initialBasis > 0
                            ? formatToman(initialBasis)
                            : isService
                              ? 'برای خدمت بهای اولیه صفر است'
                              : 'قیمت خرید ثبت اطلاعات نشده'
                        }
                        className="justify-center text-center"
                      />
                    </MinimalField>

                    <MinimalField label="قیمت خرید روز / مبنا">
                      <PriceInput
                        value={currentBasis}
                        onChange={(e) => handleBuyPriceChange(item.cartItemId, e.target.value)}
                        className={`${fieldInputClass} text-right`}
                        preview="قیمت خرید روز"
                      />
                    </MinimalField>
                  </div>

                  <div className="grid gap-2 sm:grid-cols-3">
                    <InlineMetric label="فروش قبل از تخفیف" value={formatToman(lineSubtotal)} compact center />
                    <InlineMetric label="جمع خرید روز" value={formatToman(currentBasisTotal)} compact center />
                    <InlineMetric label="جمع خرید اولیه" value={formatToman(initialTotal)} compact center />
                  </div>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                  <InlineMetric label="اختلاف کل ردیف" value={formatToman(totalSpread)} tone={infoTone(totalSpread)} />
                  <InlineMetric label="اختلاف مالکانه" value={formatToman(ownerGain)} tone={infoTone(ownerGain)} />
                  <InlineMetric label="سود عملیاتی مشترک" value={formatCurrencyText(sharedOperationalProfit, readStoredCurrencyUnit())} tone={infoTone(sharedOperationalProfit)} />
                </div>
              </div>
            ) : null}
          </article>
        );
      })}
    </div>
  );
};

export default CartTable;
