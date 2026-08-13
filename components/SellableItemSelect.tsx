import React, { useCallback, useState } from 'react';

import { SearchableSelectField } from './ui';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import type {
  SellableItem,
  SellableInventoryItem,
  SellablePhoneItem,
  Service,
} from '../types';

interface SellableItemSelectProps {
  onAddItem: (item: SellableItem) => void;
}

type SelectOption = {
  label: string;
  value: string;
  searchText: string;
  item: SellableItem;
  ownershipLabel: string;
  priceLabel: string;
  stockLabel: string;
};

const getOwnershipLabel = (item: SellableItem) => item.type === 'service'
  ? 'خدمت'
  : ((item as any).ownershipTitle || (
      (item as any).ownershipType === 'store' ? 'مالکیت مغازه'
        : (item as any).ownershipType === 'personal' ? 'مالکیت شخصی'
          : (item as any).ownershipType === 'shared' ? 'مالکیت مشترک'
            : 'مالکیت نامشخص'
    ));

const toOption = (item: SellableItem): SelectOption => {
  const ownershipLabel = getOwnershipLabel(item);
  const priceLabel = `${Number(item.price || 0).toLocaleString('fa-IR')} تومان`;
  const stockLabel = `موجودی: ${Number.isFinite(Number(item.stock)) ? Number(item.stock).toLocaleString('fa-IR') : '∞'}`;
  return {
    value: `${item.type}:${item.id}`,
    item,
    ownershipLabel,
    priceLabel,
    stockLabel,
    label: `${item.name} • ${priceLabel} • ${ownershipLabel} • ${stockLabel}`,
    searchText: [
      item.name,
      (item as any).imei,
      (item as any).serialNumber,
      (item as any).sku,
      (item as any).barcode,
      (item as any).code,
      (item as any).id,
      ownershipLabel,
    ].filter(Boolean).join(' '),
  };
};

const SellableItemSelect: React.FC<SellableItemSelectProps> = ({ onAddItem }) => {
  const { token } = useAuth();
  const [error, setError] = useState<string | null>(null);

  const loadOptions = useCallback(async (query: string, signal: AbortSignal, page = 0) => {
    if (!token) return [];
    const pageSize = 30;
    const params = new URLSearchParams({ q: query, limit: String(pageSize), offset: String(page * pageSize) });
    const response = await apiFetch(`/api/sellable-items?${params.toString()}`, { signal });
    const json = await response.json();
    if (!response.ok || !json.success) throw new Error(json.message || 'خطا در دریافت اقلام قابل فروش');

    const inventory = (json.data?.inventory ?? []).map((item: SellableInventoryItem) => ({
      ...item,
      type: 'inventory' as const,
    }));
    const phones = (json.data?.phones ?? []).map((item: SellablePhoneItem) => ({
      ...item,
      type: 'phone' as const,
    }));
    const services = (json.data?.services ?? []).map((item: Service) => ({
      ...item,
      type: 'service' as const,
      stock: Infinity,
    }));

    setError(null);
    const options = [...inventory, ...phones, ...services].map((item) => toOption(item as SellableItem));
    const hasMore = [inventory, phones, services].some((bucket) => bucket.length === pageSize);
    return { options, hasMore };
  }, [token]);

  return (
    <div className="sales-select-shell rounded-[20px] p-0.5" dir="rtl">
      <div className="mb-2.5 flex items-center gap-2.5 px-1">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-slate-600 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <i className="fa-solid fa-layer-group text-[13px]" />
        </span>
        <div className="min-w-0">
          <label htmlFor="item-search-select" className="block text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            انتخاب کالا یا خدمات
          </label>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            مدل، IMEI، نام کالا، بارکد یا SKU را تایپ کنید؛ نتایج همزمان از دیتابیس خوانده می‌شوند.
          </p>
        </div>
      </div>

      <SearchableSelectField<string, SelectOption>
        inputId="item-search-select"
        value={null}
        onValueChange={(_value, option) => {
          if (option?.item) onAddItem(option.item);
        }}
        options={[]}
        loadOptions={loadOptions}
        debounceMs={220}
        virtualizeThreshold={36}
        virtualItemHeight={58}
        placeholder="جستجو و انتخاب کالا یا خدمات…"
        noOptionsMessage="موردی مطابق جستجو پیدا نشد"
        loadingMessage="در حال جستجو در موجودی…"
        ariaLabel="جستجو و انتخاب کالا یا خدمات فروش"
        clearable={false}
        size="lg"
        controlClassName="rounded-[20px]"
        onRemoteError={() => setError('خطا در جستجوی اقلام قابل فروش؛ اتصال به سرور را بررسی کنید.')}
        formatOptionLabel={(option) => (
          <span className="grid min-w-0 gap-0.5 text-right">
            <strong className="truncate text-[12.5px]">{option.item.name}</strong>
            <small className="truncate text-[10.5px] font-semibold text-slate-400 dark:text-slate-500">
              {[option.priceLabel, option.ownershipLabel, option.stockLabel].filter(Boolean).join(' • ')}
            </small>
          </span>
        )}
      />

      {error ? (
        <p className="mt-2 px-1 text-[11px] font-bold text-rose-600 dark:text-rose-300">{error}</p>
      ) : null}
    </div>
  );
};

export default SellableItemSelect;
