import React, { useEffect, useMemo, useRef, useState } from 'react';
import Select, {
  components,
  type FormatOptionLabelMeta,
  type GroupBase,
  type InputActionMeta,
  type MenuListProps,
  type SingleValue,
  type StylesConfig,
} from 'react-select';

import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';

export type SearchableSelectSize = 'sm' | 'md' | 'lg';

export type SearchableSelectOption<T extends string | number = string> = {
  value: T;
  label: string;
  searchText?: string;
  disabled?: boolean;
};

export type SearchableSelectLoaderResult<TOption> = readonly TOption[] | {
  options: readonly TOption[];
  hasMore?: boolean;
};

export type SearchableSelectLoader<TOption> = (
  query: string,
  signal: AbortSignal,
  page: number,
) => Promise<SearchableSelectLoaderResult<TOption>>;

const isPagedSearchableSelectLoaderResult = <TOption,>(
  value: SearchableSelectLoaderResult<TOption>,
): value is { options: readonly TOption[]; hasMore?: boolean } => !Array.isArray(value);

export type SearchableSelectFieldProps<
  T extends string | number = string,
  TOption extends SearchableSelectOption<T> = SearchableSelectOption<T>,
> = {
  value?: T | null;
  onValueChange: (value: T | null, option: TOption | null) => void;
  options?: readonly TOption[];
  /**
   * Optional server-backed loader. When supplied, the field debounces text input,
   * aborts stale requests, caches query results, and renders the returned options.
   */
  loadOptions?: SearchableSelectLoader<TOption>;
  /** Keeps a selected async option visible even when it is outside the current result window. */
  valueOption?: TOption | null;
  debounceMs?: number;
  minSearchLength?: number;
  cacheRemoteOptions?: boolean;
  /** Fetch the next server page when the menu reaches its end. */
  infiniteScroll?: boolean;
  virtualize?: boolean;
  virtualizeThreshold?: number;
  virtualItemHeight?: number;
  virtualOverscan?: number;
  inputId?: string;
  name?: string;
  label?: React.ReactNode;
  hint?: React.ReactNode;
  error?: React.ReactNode;
  invalid?: boolean;
  required?: boolean;
  ariaLabel?: string;
  placeholder?: string;
  noOptionsMessage?: string;
  loadingMessage?: string;
  searchPromptMessage?: string;
  disabled?: boolean;
  loading?: boolean;
  clearable?: boolean;
  openMenuOnFocus?: boolean;
  size?: SearchableSelectSize;
  className?: string;
  wrapperClassName?: string;
  controlClassName?: string;
  menuClassName?: string;
  maxMenuHeight?: number;
  dir?: 'rtl' | 'ltr';
  filterOption?: (candidate: SearchableSelectFilterCandidate<TOption>, inputValue: string) => boolean;
  formatOptionLabel?: (option: TOption, meta: FormatOptionLabelMeta<TOption>) => React.ReactNode;
  onRemoteError?: (error: unknown) => void;
};

type SearchableSelectFilterCandidate<TOption> = {
  data: TOption;
  label: string;
  value: string;
};

const normalizeDigits = (value: string) => value
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

export const normalizeSearchableSelectText = (value: unknown) => normalizeDigits(String(value ?? ''))
  .normalize('NFKC')
  .toLocaleLowerCase('fa-IR')
  .replace(/[أإآ]/g, 'ا')
  .replace(/ي/g, 'ی')
  .replace(/ك/g, 'ک')
  .replace(/[\u064B-\u065F]/g, '')
  .replace(/[\u200c\u200d]/g, ' ')
  .replace(/\s+/g, ' ')
  .trim();

const searchableSelectStyles: StylesConfig<any, false, GroupBase<any>> = {
  menuPortal: (base) => ({ ...base, zIndex: 'var(--kourosh-z-popover)' }),
};

const SearchableDropdownIndicator = (props: any) => (
  <components.DropdownIndicator {...props}>
    <i className="fa-solid fa-chevron-down text-[10px]" aria-hidden="true" />
  </components.DropdownIndicator>
);

const heightClassBySize: Record<SearchableSelectSize, string> = {
  sm: 'min-h-[40px]',
  md: 'min-h-[44px]',
  lg: 'min-h-[48px]',
};

type VirtualMenuListProps = MenuListProps<any, false, GroupBase<any>> & {
  itemHeight: number;
  threshold: number;
  overscan: number;
};

const VirtualMenuList = (props: VirtualMenuListProps) => {
  const { itemHeight, threshold, overscan, ...menuListProps } = props;
  const { children, maxHeight, innerRef, innerProps } = menuListProps;
  const rows = React.Children.toArray(children);
  const [scrollTop, setScrollTop] = useState(0);

  useEffect(() => {
    setScrollTop(0);
  }, [rows.length]);

  if (rows.length < threshold) {
    return <components.MenuList {...(menuListProps as any)}>{children}</components.MenuList>;
  }

  const viewportHeight = Math.min(maxHeight, rows.length * itemHeight);
  const visibleCount = Math.ceil(viewportHeight / itemHeight);
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan);
  const endIndex = Math.min(rows.length, startIndex + visibleCount + overscan * 2);
  const visibleRows = rows.slice(startIndex, endIndex);

  return (
    <div
      ref={innerRef}
      {...innerProps}
      style={{ maxHeight: viewportHeight, overflowY: 'auto', position: 'relative' }}
      onScroll={(event) => {
        innerProps?.onScroll?.(event as any);
        setScrollTop(event.currentTarget.scrollTop);
      }}
    >
      <div style={{ height: rows.length * itemHeight, position: 'relative' }}>
        {visibleRows.map((row, index) => {
          const absoluteIndex = startIndex + index;
          return (
            <div
              key={(row as any)?.key ?? absoluteIndex}
              style={{
                position: 'absolute',
                insetInline: 0,
                top: absoluteIndex * itemHeight,
                height: itemHeight,
              }}
            >
              {row}
            </div>
          );
        })}
      </div>
    </div>
  );
};

const SearchableSelectField = <
  T extends string | number = string,
  TOption extends SearchableSelectOption<T> = SearchableSelectOption<T>,
>({
  value,
  onValueChange,
  options = [],
  loadOptions,
  valueOption = null,
  debounceMs = 260,
  minSearchLength = 0,
  cacheRemoteOptions = true,
  infiniteScroll = true,
  virtualize = true,
  virtualizeThreshold = 40,
  virtualItemHeight = 52,
  virtualOverscan = 5,
  inputId,
  name,
  label,
  hint,
  error,
  invalid = false,
  required = false,
  ariaLabel = 'جستجو و انتخاب',
  placeholder = 'برای جستجو تایپ کنید…',
  noOptionsMessage = 'موردی مطابق جستجو پیدا نشد',
  loadingMessage = 'در حال دریافت اطلاعات…',
  searchPromptMessage = 'برای جستجو حداقل چند حرف وارد کنید',
  disabled = false,
  loading = false,
  clearable = true,
  openMenuOnFocus = true,
  size = 'md',
  className,
  wrapperClassName,
  controlClassName,
  menuClassName,
  maxMenuHeight = 280,
  dir = 'rtl',
  filterOption,
  formatOptionLabel,
  onRemoteError,
}: SearchableSelectFieldProps<T, TOption>) => {
  const fieldInvalid = invalid || Boolean(error);
  const [inputValue, setInputValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [remoteOptions, setRemoteOptions] = useState<readonly TOption[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteLoadingMore, setRemoteLoadingMore] = useState(false);
  const [remoteHasMore, setRemoteHasMore] = useState(false);
  const [remotePage, setRemotePage] = useState(0);
  const [remoteError, setRemoteError] = useState<unknown>(null);
  const cacheRef = useRef(new Map<string, { options: readonly TOption[]; hasMore: boolean; page: number }>());
  const valueOptionCacheRef = useRef(new Map<string, TOption>());
  const requestSequenceRef = useRef(0);
  const onRemoteErrorRef = useRef(onRemoteError);

  useEffect(() => {
    onRemoteErrorRef.current = onRemoteError;
  }, [onRemoteError]);

  useEffect(() => {
    cacheRef.current.clear();
    setRemoteOptions([]);
    setRemoteHasMore(false);
    setRemotePage(0);
    setRemoteError(null);
  }, [loadOptions]);

  useEffect(() => {
    options.forEach((option) => valueOptionCacheRef.current.set(String(option.value), option));
  }, [options]);

  useEffect(() => {
    if (valueOption) valueOptionCacheRef.current.set(String(valueOption.value), valueOption);
  }, [valueOption]);

  useEffect(() => {
    if (!loadOptions || !menuOpen || disabled) return undefined;

    const normalizedQuery = normalizeSearchableSelectText(inputValue);
    if (normalizedQuery.length < minSearchLength) {
      setRemoteOptions([]);
      setRemoteHasMore(false);
      setRemotePage(0);
      setRemoteLoading(false);
      setRemoteError(null);
      return undefined;
    }

    const cacheKey = normalizedQuery;
    if (cacheRemoteOptions && cacheRef.current.has(cacheKey)) {
      const cached = cacheRef.current.get(cacheKey)!;
      setRemoteOptions(cached.options);
      setRemoteHasMore(cached.hasMore);
      setRemotePage(cached.page);
      setRemoteLoading(false);
      setRemoteError(null);
      return undefined;
    }

    const sequence = ++requestSequenceRef.current;
    const controller = new AbortController();
    const delay = normalizedQuery ? Math.max(0, debounceMs) : 0;
    const timer = window.setTimeout(async () => {
      setRemoteLoading(true);
      setRemoteError(null);
      try {
        const loaded = await loadOptions(inputValue, controller.signal, 0);
        if (controller.signal.aborted || sequence !== requestSequenceRef.current) return;
        const stableOptions = isPagedSearchableSelectLoaderResult(loaded) ? loaded.options : loaded;
        const hasMore = isPagedSearchableSelectLoaderResult(loaded) ? Boolean(loaded.hasMore) : false;
        stableOptions.forEach((option) => valueOptionCacheRef.current.set(String(option.value), option));
        if (cacheRemoteOptions) cacheRef.current.set(cacheKey, { options: stableOptions, hasMore, page: 0 });
        setRemoteOptions(stableOptions);
        setRemoteHasMore(hasMore);
        setRemotePage(0);
      } catch (loadError) {
        if (controller.signal.aborted || sequence !== requestSequenceRef.current) return;
        setRemoteOptions([]);
        setRemoteError(loadError);
        onRemoteErrorRef.current?.(loadError);
      } finally {
        if (!controller.signal.aborted && sequence === requestSequenceRef.current) {
          setRemoteLoading(false);
        }
      }
    }, delay);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [
    cacheRemoteOptions,
    debounceMs,
    disabled,
    inputValue,
    loadOptions,
    menuOpen,
    minSearchLength,
  ]);

  const loadNextRemotePage = async () => {
    if (!loadOptions || !infiniteScroll || !menuOpen || disabled || remoteLoading || remoteLoadingMore || !remoteHasMore) return;
    const normalizedQuery = normalizeSearchableSelectText(inputValue);
    if (normalizedQuery.length < minSearchLength) return;

    const nextPage = remotePage + 1;
    const sequence = requestSequenceRef.current;
    const controller = new AbortController();
    setRemoteLoadingMore(true);
    setRemoteError(null);
    try {
      const loaded = await loadOptions(inputValue, controller.signal, nextPage);
      if (sequence !== requestSequenceRef.current) return;
      const nextOptions = isPagedSearchableSelectLoaderResult(loaded) ? loaded.options : loaded;
      const hasMore = isPagedSearchableSelectLoaderResult(loaded) ? Boolean(loaded.hasMore) : false;
      const byValue = new Map<string, TOption>();
      remoteOptions.forEach((option) => byValue.set(String(option.value), option));
      nextOptions.forEach((option) => {
        byValue.set(String(option.value), option);
        valueOptionCacheRef.current.set(String(option.value), option);
      });
      const merged = Array.from(byValue.values());
      setRemoteOptions(merged);
      setRemoteHasMore(hasMore);
      setRemotePage(nextPage);
      if (cacheRemoteOptions) cacheRef.current.set(normalizedQuery, { options: merged, hasMore, page: nextPage });
    } catch (loadError) {
      setRemoteError(loadError);
      onRemoteErrorRef.current?.(loadError);
    } finally {
      setRemoteLoadingMore(false);
    }
  };

  const displayedOptions = loadOptions ? remoteOptions : options;

  const selectedOption = useMemo(() => {
    const valueKey = String(value ?? '');
    if (!valueKey) return null;
    return (
      displayedOptions.find((option) => String(option.value) === valueKey) ??
      options.find((option) => String(option.value) === valueKey) ??
      (valueOption && String(valueOption.value) === valueKey ? valueOption : null) ??
      valueOptionCacheRef.current.get(valueKey) ??
      null
    );
  }, [displayedOptions, options, value, valueOption]);

  const defaultFilter = (candidate: SearchableSelectFilterCandidate<TOption>, nextInputValue: string) => {
    const query = normalizeSearchableSelectText(nextInputValue);
    if (!query) return true;
    const haystack = normalizeSearchableSelectText(candidate.data.searchText || candidate.data.label);
    return haystack.includes(query);
  };

  const selectComponents = useMemo(() => {
    const base = {
      IndicatorSeparator: () => null,
      DropdownIndicator: SearchableDropdownIndicator,
    } as any;
    if (!virtualize) return base;
    base.MenuList = (props: MenuListProps<TOption, false, GroupBase<TOption>>) => (
      <VirtualMenuList
        {...(props as any)}
        itemHeight={virtualItemHeight}
        threshold={virtualizeThreshold}
        overscan={virtualOverscan}
      />
    );
    return base;
  }, [virtualItemHeight, virtualize, virtualizeThreshold, virtualOverscan]);

  const effectiveLoading = loading || remoteLoading;
  const belowMinSearchLength = Boolean(loadOptions) && normalizeSearchableSelectText(inputValue).length < minSearchLength;
  const effectiveNoOptionsMessage = remoteError
    ? 'دریافت نتایج جستجو انجام نشد؛ دوباره تلاش کنید.'
    : belowMinSearchLength
      ? searchPromptMessage
      : noOptionsMessage;

  const handleInputChange = (nextValue: string, meta: InputActionMeta) => {
    if (meta.action === 'input-change') setInputValue(nextValue);
    if (meta.action === 'clear' || meta.action === 'set-value') setInputValue('');
    return nextValue;
  };

  const control = (
    <Select<TOption, false, GroupBase<TOption>>
      inputId={inputId}
      name={name}
      options={displayedOptions as readonly TOption[]}
      value={selectedOption as SingleValue<TOption>}
      onChange={(option: SingleValue<TOption>) => {
        if (option) valueOptionCacheRef.current.set(String(option.value), option);
        onValueChange(option?.value ?? null, option ?? null);
      }}
      inputValue={inputValue}
      onInputChange={handleInputChange}
      onMenuOpen={() => setMenuOpen(true)}
      onMenuClose={() => setMenuOpen(false)}
      onMenuScrollToBottom={loadNextRemotePage}
      getOptionValue={(option) => String(option.value)}
      getOptionLabel={(option) => option.label}
      isOptionDisabled={(option) => Boolean(option.disabled)}
      placeholder={effectiveLoading && !inputValue ? loadingMessage : placeholder}
      isDisabled={disabled || loading}
      isLoading={effectiveLoading}
      isSearchable
      isClearable={clearable}
      isRtl={dir === 'rtl'}
      openMenuOnFocus={openMenuOnFocus}
      menuPlacement="auto"
      menuPosition="fixed"
      menuShouldScrollIntoView={false}
      menuPortalTarget={typeof document !== 'undefined' ? document.body : null}
      maxMenuHeight={maxMenuHeight}
      noOptionsMessage={() => effectiveNoOptionsMessage}
      loadingMessage={() => remoteLoadingMore ? 'در حال دریافت نتایج بیشتر…' : loadingMessage}
      filterOption={loadOptions ? (filterOption ?? (() => true)) : (filterOption ?? defaultFilter)}
      formatOptionLabel={formatOptionLabel}
      styles={searchableSelectStyles}
      components={selectComponents}
      unstyled
      aria-label={ariaLabel}
      className={cn('w-full min-w-0', className)}
      classNames={{
        container: () => 'w-full min-w-0',
        control: ({ isFocused }) => cn(
          heightClassBySize[size],
          'w-full min-w-0 cursor-text rounded-[15px] border bg-white px-1 text-right transition-colors dark:bg-slate-950',
          fieldInvalid ? 'border-rose-400 dark:border-rose-500/80' : 'border-slate-200 dark:border-slate-700',
          isFocused
            ? 'border-primary/45 ring-2 ring-primary/10 dark:border-primary/55 dark:ring-primary/15'
            : 'hover:border-slate-300 dark:hover:border-slate-600',
          disabled || loading ? 'cursor-not-allowed opacity-60' : '',
          controlClassName,
        ),
        valueContainer: () => cn('min-w-0 flex-1 px-2.5 py-0', dir === 'ltr' ? 'text-left' : 'text-right'),
        input: () => cn('m-0 min-w-0 p-0 text-[13px] font-semibold text-slate-900 dark:text-slate-100', dir === 'ltr' ? 'text-left' : 'text-right'),
        singleValue: () => cn('min-w-0 truncate text-[13px] font-black text-slate-900 dark:text-slate-100', dir === 'ltr' ? 'text-left' : 'text-right'),
        placeholder: () => cn('min-w-0 truncate text-[12.5px] font-semibold text-slate-400 dark:text-slate-500', dir === 'ltr' ? 'text-left' : 'text-right'),
        indicatorsContainer: () => 'shrink-0 self-stretch',
        dropdownIndicator: ({ selectProps }) => cn(
          'flex w-8 items-center justify-center p-0 text-slate-500 transition-transform dark:text-slate-300',
          selectProps.menuIsOpen ? 'rotate-180' : '',
        ),
        clearIndicator: () => 'flex w-8 items-center justify-center p-0 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200',
        menu: () => cn(
          'mt-2 overflow-hidden rounded-[16px] border border-slate-200 bg-white p-1 shadow-[0_22px_52px_-30px_rgba(15,23,42,0.38)] dark:border-slate-700 dark:bg-slate-950',
          menuClassName,
        ),
        menuList: () => 'p-0.5',
        option: ({ isFocused, isSelected, isDisabled }) => cn(
          'cursor-pointer rounded-[11px] px-3 py-2.5 text-[12px] font-semibold',
          dir === 'ltr' ? 'text-left' : 'text-right',
          isDisabled
            ? 'cursor-not-allowed opacity-45'
            : isSelected
              ? 'bg-primary/10 text-primary'
              : isFocused
                ? 'bg-slate-100 text-slate-950 dark:bg-slate-800 dark:text-white'
                : 'text-slate-700 dark:text-slate-200',
        ),
        noOptionsMessage: () => 'px-3 py-4 text-center text-[12px] font-bold text-slate-500 dark:text-slate-400',
        loadingMessage: () => 'px-3 py-4 text-center text-[12px] font-bold text-slate-500 dark:text-slate-400',
      }}
    />
  );

  if (!label && !hint && !error) return control;

  return (
    <ControlShell
      as="div"
      htmlFor={inputId}
      label={label}
      hint={hint}
      error={error}
      required={required}
      kind="select"
      dir={dir}
      className={cn('app-field app-field--select', wrapperClassName)}
      controlWrapClassName="block min-w-0"
      hasTrailingIcon
    >
      {control}
    </ControlShell>
  );
};

export default SearchableSelectField;
