import React, { useState, useEffect, useMemo } from 'react';
import Select, { OnChangeValue, GroupBase, StylesConfig, components } from 'react-select';
import { useAuth } from '../contexts/AuthContext';
import { apiFetch } from '../utils/apiFetch';
import { useStyle } from '../contexts/StyleContext';
import type {
  SellableItem,
  SellableInventoryItem,
  SellablePhoneItem,
  Service
} from '../types';

interface SellableItemSelectProps {
  onAddItem: (item: SellableItem) => void;
}
interface SelectOption {
  label: string;
  value: SellableItem;
}

const SellableItemSelect: React.FC<SellableItemSelectProps> = ({ onAddItem }) => {
  const { token } = useAuth();
  const { style } = useStyle();
  const [allItems, setAllItems] = useState<SellableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState<boolean>(
    typeof document !== 'undefined' ? document.documentElement.classList.contains('dark') : false
  );

  const brand = `hsl(${style.primaryHue} 90% 55%)`;
  const brandLight = `hsl(${style.primaryHue} 95% 85%)`;
  const brandDark = `hsl(${style.primaryHue} 90% 40%)`;

  useEffect(() => {
    if (typeof document === 'undefined') return;
    const observer = new MutationObserver(() => {
      const dark = document.documentElement.classList.contains('dark');
      setIsDark(dark);
    });
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!token) return;
    setLoading(true);
    setError(null);
    apiFetch('/api/sellable-items')
      .then(res => res.json())
      .then((json) => {
        if (!json.success) throw new Error(json.message || 'خطا در دریافت اقلام');
        const inventory = (json.data.inventory ?? []).map((i: SellableInventoryItem) => ({ ...i, type: 'inventory' as const }));
        const phones = (json.data.phones ?? []).map((p: SellablePhoneItem) => ({ ...p, type: 'phone' as const }));
        const services = (json.data.services ?? []).map((s: Service) => ({ ...s, type: 'service' as const, stock: Infinity }));
        setAllItems([...inventory, ...phones, ...services]);
      })
      .catch(() => setError('خطا در بارگذاری اقلام قابل فروش.'))
      .finally(() => setLoading(false));
  }, [token]);

  const selectOptions = useMemo<SelectOption[]>(() => {
    return allItems.map(item => {
      const ownershipLabel = item.type === 'service'
        ? 'خدمت'
        : ((item as any).ownershipTitle || ((item as any).ownershipType === 'store' ? 'مالکیت مغازه' : (item as any).ownershipType === 'personal' ? 'مالکیت شخصی' : (item as any).ownershipType === 'shared' ? 'مالکیت مشترک' : 'مالکیت نامشخص'));
      return {
        value: item,
        label: `${item.name} • ${item.price.toLocaleString('fa-IR')} تومان • ${ownershipLabel} • موجودی: ${item.stock?.toLocaleString('fa-IR') ?? '∞'}`,
      };
    });
  }, [allItems]);

  const handleChange = (selectedOption: OnChangeValue<SelectOption, false>) => {
    if (selectedOption) onAddItem(selectedOption.value);
  };
  const selectComponents = {
    LoadingIndicator: () => null,
    IndicatorSeparator: () => null,
    ClearIndicator: () => null,
    DropdownIndicator: (props: any) => (
      <components.DropdownIndicator {...props}>
        <i className="fa-solid fa-chevron-down sellable-select__chevron" />
      </components.DropdownIndicator>
    ),
  };

  const customStyles: StylesConfig<SelectOption, false, GroupBase<SelectOption>> = {
    control: (base, state) => ({
      ...base,
      minHeight: 52,
      height: 52,
      backgroundColor: isDark ? '#020617' : '#ffffff',
      color: isDark ? '#e2e8f0' : '#0f172a',
      borderColor: state.isFocused ? brand : (isDark ? 'rgba(51,65,85,0.9)' : 'rgba(226,232,240,0.95)'),
      boxShadow: state.isFocused ? `0 0 0 3px ${brandLight}` : '0 16px 30px -26px rgba(15,23,42,0.24)',
      '&:hover': { borderColor: state.isFocused ? brand : (isDark ? 'rgba(71,85,105,0.95)' : 'rgba(203,213,225,0.95)') },
      borderRadius: 20,
      paddingBlock: 0,
      paddingInline: 0,
      overflow: 'hidden',
      cursor: 'text',
    }),
    container: (base) => ({
      ...base,
      width: '100%',
    }),
    menuPortal: (base) => ({
      ...base,
      zIndex: 2147483647,
      pointerEvents: 'auto',
    }),
    menu: (base) => ({
      ...base,
      zIndex: 2147483647,
      backgroundColor: isDark ? '#020617' : '#ffffff',
      color: isDark ? '#e2e8f0' : '#0f172a',
      borderRadius: 18,
      border: `1px solid ${isDark ? 'rgba(51,65,85,0.92)' : 'rgba(226,232,240,0.95)'}`,
      marginTop: 7,
      boxShadow: '0 24px 52px -34px rgba(15,23,42,0.45)',
      overflow: 'hidden',
    }),
    menuList: (base) => ({
      ...base,
      maxHeight: 248,
      paddingBlock: 6,
      paddingInline: 6,
      scrollbarWidth: 'thin',
    }),
    option: (base, state) => ({
      ...base,
      backgroundColor: state.isSelected
        ? brand
        : state.isFocused
        ? (isDark ? 'rgba(30,41,59,0.95)' : 'rgba(241,245,249,0.95)')
        : 'transparent',
      color: state.isSelected ? '#fff' : isDark ? '#e2e8f0' : '#0f172a',
      cursor: 'pointer',
      borderRadius: 14,
      paddingBlock: 8,
      paddingInline: 12,
      marginBlock: 2,
      minHeight: 38,
      fontSize: 13,
      fontWeight: 750,
      textAlign: 'right',
      direction: 'rtl',
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
    }),
    valueContainer: (base) => ({
      ...base,
      minWidth: 0,
      height: 50,
      minHeight: 50,
      paddingBlock: 0,
      paddingInlineStart: 12,
      paddingInlineEnd: 10,
      overflow: 'hidden',
      display: 'flex',
      alignItems: 'center',
      gap: 0,
      background: 'transparent',
      border: 0,
      boxShadow: 'none',
    }),
    input: (base) => ({
      ...base,
      width: 1,
      minWidth: 1,
      maxWidth: 1,
      color: 'transparent',
      caretColor: isDark ? '#e2e8f0' : '#0f172a',
      textAlign: 'right',
      direction: 'rtl',
      margin: 0,
      padding: 0,
      border: 0,
      outline: 0,
      boxShadow: 'none',
      background: 'transparent',
      minHeight: 0,
      height: 1,
      overflow: 'hidden',
    }),
    inputContainer: (base) => ({
      ...base,
      flex: '0 0 1px',
      width: 1,
      minWidth: 1,
      maxWidth: 1,
      height: 1,
      minHeight: 1,
      margin: 0,
      padding: 0,
      border: 0,
      outline: 0,
      overflow: 'hidden',
      boxShadow: 'none',
      background: 'transparent',
      opacity: 1,
    }),
    indicatorsContainer: (base) => ({
      ...base,
      display: 'flex',
      alignItems: 'center',
      alignSelf: 'stretch',
      flexShrink: 0,
      width: 38,
      minWidth: 38,
      paddingInlineStart: 0,
      paddingInlineEnd: 6,
      background: 'transparent',
      border: 0,
      boxShadow: 'none',
    }),
    dropdownIndicator: (base, state) => ({
      ...base,
      display: 'grid',
      placeItems: 'center',
      width: 30,
      height: 30,
      padding: 0,
      margin: 0,
      border: 0,
      borderRadius: 12,
      background: state.isFocused ? (isDark ? 'rgba(30,41,59,0.9)' : 'rgba(241,245,249,0.9)') : 'transparent',
      color: isDark ? '#94a3b8' : '#64748b',
      boxShadow: 'none',
      transition: 'background 120ms ease, color 120ms ease',
    }),
    clearIndicator: () => ({ display: 'none' }),
    loadingIndicator: () => ({ display: 'none' }),
    indicatorSeparator: () => ({ display: 'none' }),
    singleValue: (base) => ({
      ...base,
      color: isDark ? '#e2e8f0' : '#0f172a',
      maxWidth: '100%',
      margin: 0,
      padding: 0,
      textAlign: 'right',
      background: 'transparent',
      boxShadow: 'none',
      border: 0,
      fontSize: 13,
      fontWeight: 750,
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      whiteSpace: 'nowrap',
    }),
    placeholder: (base) => ({
      ...base,
      color: isDark ? '#94a3b8' : '#64748b',
      textAlign: 'right',
      maxWidth: '100%',
      margin: 0,
      padding: 0,
      whiteSpace: 'nowrap',
      overflow: 'hidden',
      textOverflow: 'ellipsis',
      background: 'transparent',
      boxShadow: 'none',
      border: 0,
      fontSize: 13,
      fontWeight: 650,
    }),
  };

  if (error) {
    return (
      <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-medium text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200">
        {error}
      </div>
    );
  }

  return (
    <div
      className="sales-select-shell rounded-[20px] p-0.5"
      dir="rtl"
      style={{
        backgroundColor: 'transparent',
        borderColor: 'transparent',
        transition: 'background 0.3s, border 0.3s',
      }}
    >
      <div className="mb-2.5 flex items-center gap-2.5 px-1">
        <span className="inline-flex h-9 w-9 items-center justify-center rounded-[18px] border border-slate-200 bg-slate-50 text-slate-600 shadow-[0_12px_24px_-22px_rgba(15,23,42,0.22)] dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
          <i className="fa-solid fa-layer-group text-[13px]" />
        </span>
        <div className="min-w-0">
          <label htmlFor="item-search-select" className="block text-[13px] font-extrabold tracking-tight text-slate-900 dark:text-slate-100">
            انتخاب کالا یا خدمات
          </label>
          <p className="mt-1 text-[11px] font-medium text-slate-500 dark:text-slate-400">
            جستجو، انتخاب و افزودن مورد جدید سریع آیتم به فروش
          </p>
        </div>
      </div>

      <Select
        id="item-search-select"
        classNamePrefix="sellable-select"
        options={selectOptions}
        onChange={handleChange}
        value={null}
        placeholder={loading ? "در حال دریافت اطلاعات…" : "جستجو و انتخاب کالا یا خدمات…"}
        isSearchable
        menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
        formatOptionLabel={(option) => {
          const parts = option.label.split(' • ');
          const [title, price, ownership, stock] = parts;
          return (
            <span className="sellable-select__option-content">
              <span className="ux-mixed-text sellable-select__option-title">{title}</span>
              <span className="ux-mixed-text sellable-select__option-meta">
                {[price, ownership, stock].filter(Boolean).join(' • ')}
              </span>
            </span>
          );
        }}
        isRtl
        noOptionsMessage={() => 'موردی یافت نشد'}
        styles={customStyles}
        components={selectComponents}
        theme={(theme) => ({
          ...theme,
          borderRadius: 20,
          colors: {
            ...theme.colors,
            primary: brand,
            primary75: brandLight,
            primary50: brandLight,
            primary25: isDark ? brandDark : 'rgba(148,163,184,0.16)',
          },
        })}
      />
    </div>
  );
};

export default SellableItemSelect;
