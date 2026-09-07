import React, { useEffect, useMemo, useRef, useState } from 'react';
import Select, {
  components,
  type ClassNamesConfig,
  type FormatOptionLabelMeta,
  type GroupBase,
  type InputActionMeta,
  type MenuListProps,
  type SingleValue,
  type StylesConfig,
} from 'react-select';
import CreatableSelect from 'react-select/creatable';

import { cn } from '../../utils/cn';
import ControlShell from './ControlShell';
import { DEFAULT_FORM_CONTROL_SIZE, type FormControlSize } from './formControlContract';
import { useOverlayPortalTarget } from './overlayContract';

export type SearchableSelectSize = FormControlSize;

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
  /** Optional creatable behavior. The menu stays portal-based and the created option is selected after persistence. */
  onCreateOption?: (inputValue: string) => TOption | null | void | Promise<TOption | null | void>;
  formatCreateLabel?: (inputValue: string) => React.ReactNode;
  createOptionPosition?: 'first' | 'last';
  isValidNewOption?: (inputValue: string, options: readonly TOption[]) => boolean;
  /** Mirrors the live query for workflows that intentionally accept free-form values. */
  onInputValueChange?: (inputValue: string) => void;
  /**
   * When true, an active search query visually takes precedence over the selected value.
   * This is required by free-form/creatable controls that mirror the query into their
   * parent value; otherwise react-select sees that mirrored text as a selected value and
   * can paint the SingleValue layer over the real typing input.
   */
  inputValueTakesPrecedence?: boolean;
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
  menuPortal: (base) => ({ ...base, zIndex: 11000 }),
  menu: (base) => ({
    ...base,
    backgroundColor: 'var(--ds-surface-elevated, #ffffff)',
    border: '1px solid var(--ds-border-subtle, rgba(226, 232, 240, 0.95))',
    borderRadius: 18,
    boxShadow: '0 24px 48px -28px rgba(15, 23, 42, 0.28)',
    overflow: 'hidden',
  }),
  menuList: (base) => ({
    ...base,
    paddingBlock: 8,
    backgroundColor: 'var(--ds-surface-elevated, #ffffff)',
  }),
  option: (base, state) => ({
    ...base,
    backgroundColor: state.isSelected
      ? 'rgba(180, 83, 9, 0.16)'
      : state.isFocused
        ? 'rgba(148, 163, 184, 0.12)'
        : 'var(--ds-surface-elevated, #ffffff)',
    color: 'var(--ds-text-primary, #0f172a)',
    cursor: state.isDisabled ? 'not-allowed' : 'pointer',
    textAlign: 'right',
  }),
  control: (base) => ({
    ...base,
    backgroundColor: 'var(--ds-control-bg, #ffffff)',
  }),
  // react-select sizes its native input through an internal autosizing wrapper.
  // In dense RTL layouts that wrapper can collapse to the caret width while
  // inputValue still updates correctly, making remote search work but hiding
  // the typed query. Keep the real typing layer explicitly readable here so
  // every SearchableSelectField owns the behavior without page-specific CSS.
  input: (base, state) => {
    const hasTypedValue = Boolean(state.selectProps.inputValue);
    return {
      ...base,
      // react-select puts the native input in grid column 2 and normally sizes that
      // column as `min-content`. In our RTL phone form Chrome can keep that track at
      // effectively zero width even though `data-value` contains the live query.
      // Give the editing track the remaining control width whenever text exists.
      gridTemplateColumns: hasTypedValue ? '0 minmax(0, 1fr)' : '0 min-content',
      flex: hasTypedValue ? '1 1 100%' : '0 1 auto',
      width: hasTypedValue ? '100%' : 0,
      minWidth: hasTypedValue ? '4rem' : 0,
      maxWidth: '100%',
      overflow: 'visible',
      color: 'var(--ds-control-fg, #0f172a)',
      WebkitTextFillColor: 'currentColor',
      caretColor: 'currentColor',
      opacity: 1,
      visibility: 'visible',
    };
  },
  singleValue: (base) => ({
    ...base,
    position: 'relative',
    inset: 'auto',
    minWidth: 0,
    maxWidth: '100%',
    color: 'inherit',
    opacity: 1,
    visibility: 'visible',
  }),
};

const SearchableDropdownIndicator = (props: any) => (
  <components.DropdownIndicator {...props}>
    <i className="fa-solid fa-chevron-down text-[10px]" aria-hidden="true" />
  </components.DropdownIndicator>
);

// react-select can keep its native text input in the hidden state while a
// controlled free-form value is mirrored back into the select. The query still
// changes (and filtering works) but the native input becomes opacity: 0. If a
// live query exists, it is always the layer the user is actively editing, so
// force that native input visible. This fixes creatable model/color controls
// without changing selected-value rendering for ordinary selects.
const SearchableNativeInput = (props: any) => {
  // `props.value` is the native react-select query and is the most reliable signal.
  // Keep selectProps as a compatibility fallback for older react-select behavior.
  const hasLiveQuery = Boolean(props.value || props.selectProps?.inputValue);
  return (
    <components.Input
      {...props}
      isHidden={hasLiveQuery ? false : props.isHidden}
      inputClassName={cn(props.inputClassName, 'app-searchable-select__native-input')}
    />
  );
};

const heightClassBySize: Record<SearchableSelectSize, string> = {
  sm: 'min-h-[var(--ds-control-height-sm)]',
  md: 'min-h-[var(--ds-control-height-md)]',
  lg: 'min-h-[var(--ds-control-height-lg)]',
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
  size = DEFAULT_FORM_CONTROL_SIZE,
  className,
  wrapperClassName,
  controlClassName,
  menuClassName,
  maxMenuHeight = 280,
  dir = 'rtl',
  filterOption,
  formatOptionLabel,
  onCreateOption,
  formatCreateLabel = (nextInputValue) => `افزودن «${nextInputValue.trim()}»`,
  createOptionPosition = 'last',
  isValidNewOption,
  onInputValueChange,
  inputValueTakesPrecedence = false,
  onRemoteError,
}: SearchableSelectFieldProps<T, TOption>) => {
  const fieldInvalid = invalid || Boolean(error);
  const menuPortalTarget = useOverlayPortalTarget('popover', dir);
  const generatedId = React.useId().replace(/:/g, '');
  const fieldId = inputId || `searchable-select-${generatedId}`;
  const errorId = `${fieldId}-error`;
  const hintId = `${fieldId}-hint`;
  const describedBy = error ? errorId : hint ? hintId : undefined;
  const [inputValue, setInputValue] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const [remoteOptions, setRemoteOptions] = useState<readonly TOption[]>([]);
  const [remoteLoading, setRemoteLoading] = useState(false);
  const [remoteLoadingMore, setRemoteLoadingMore] = useState(false);
  const [remoteHasMore, setRemoteHasMore] = useState(false);
  const [remotePage, setRemotePage] = useState(0);
  const [remoteError, setRemoteError] = useState<unknown>(null);
  const [creatingOption, setCreatingOption] = useState(false);
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
      Input: SearchableNativeInput,
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
    if (meta.action === 'input-change') {
      setInputValue(nextValue);
      onInputValueChange?.(nextValue);
    }
    if (meta.action === 'clear' || meta.action === 'set-value') setInputValue('');
    return nextValue;
  };

  const defaultIsValidNewOption = (nextInputValue: string) => {
    const normalizedInput = normalizeSearchableSelectText(nextInputValue);
    if (!normalizedInput) return false;
    return !displayedOptions.some((option) => (
      normalizeSearchableSelectText(option.label) === normalizedInput ||
      normalizeSearchableSelectText(option.value) === normalizedInput
    ));
  };

  const handleCreateOption = async (nextInputValue: string) => {
    if (!onCreateOption || creatingOption) return;
    const cleanValue = nextInputValue.trim();
    if (!cleanValue) return;
    setCreatingOption(true);
    try {
      const createdOption = await onCreateOption(cleanValue);
      if (createdOption) {
        valueOptionCacheRef.current.set(String(createdOption.value), createdOption);
        onValueChange(createdOption.value, createdOption);
      }
      setInputValue('');
    } finally {
      setCreatingOption(false);
    }
  };

  const SelectRenderer: React.ComponentType<any> = onCreateOption ? CreatableSelect : Select;
  const renderedSelectedOption = inputValueTakesPrecedence && inputValue
    ? null
    : selectedOption;
  const control = (
    <SelectRenderer
      inputId={fieldId}
      name={name}
      options={displayedOptions as readonly TOption[]}
      value={renderedSelectedOption as SingleValue<TOption>}
      onChange={(option: SingleValue<TOption>) => {
        if (option) valueOptionCacheRef.current.set(String(option.value), option);
        onValueChange(option?.value ?? null, option ?? null);
      }}
      inputValue={inputValue}
      controlShouldRenderValue={!inputValueTakesPrecedence || !inputValue}
      onInputChange={handleInputChange}
      onMenuOpen={() => setMenuOpen(true)}
      onMenuClose={() => setMenuOpen(false)}
      onMenuScrollToBottom={loadNextRemotePage}
      getOptionValue={(option: TOption) => String(option.value)}
      getOptionLabel={(option: TOption) => option.label}
      isOptionDisabled={(option: TOption) => Boolean(option.disabled)}
      placeholder={effectiveLoading && !inputValue ? loadingMessage : placeholder}
      isDisabled={disabled || loading || creatingOption}
      isLoading={effectiveLoading || creatingOption}
      isSearchable
      isClearable={clearable}
      isRtl={dir === 'rtl'}
      openMenuOnFocus={openMenuOnFocus}
      menuPlacement="auto"
      menuPosition="fixed"
      menuShouldScrollIntoView={false}
      menuPortalTarget={menuPortalTarget}
      maxMenuHeight={maxMenuHeight}
      noOptionsMessage={() => effectiveNoOptionsMessage}
      loadingMessage={() => remoteLoadingMore ? 'در حال دریافت نتایج بیشتر…' : loadingMessage}
      filterOption={loadOptions ? (filterOption ?? (() => true)) : (filterOption ?? defaultFilter)}
      formatOptionLabel={formatOptionLabel}
      onCreateOption={onCreateOption ? handleCreateOption : undefined}
      formatCreateLabel={onCreateOption ? formatCreateLabel : undefined}
      createOptionPosition={createOptionPosition}
      isValidNewOption={onCreateOption
        ? (nextInputValue: string) => (isValidNewOption
          ? isValidNewOption(nextInputValue, displayedOptions)
          : defaultIsValidNewOption(nextInputValue))
        : undefined}
      styles={searchableSelectStyles}
      components={selectComponents}
      unstyled
      aria-label={ariaLabel}
      aria-required={required || undefined}
      aria-invalid={fieldInvalid || undefined}
      aria-describedby={describedBy}
      className={cn('app-searchable-select w-full min-w-0', className)}
      classNames={{
        container: () => 'w-full min-w-0',
        control: ({ isFocused }) => cn(
          heightClassBySize[size],
          'app-searchable-select__control w-full min-w-0 cursor-text rounded-[var(--ds-control-radius)] border bg-[var(--ds-control-bg)] px-1 text-right text-[var(--ds-control-fg)] shadow-[var(--ds-control-shadow)] transition-colors',
          fieldInvalid ? 'border-[var(--ds-danger)] ring-2 ring-[var(--ds-danger-soft)]' : 'border-[var(--ds-control-border)]',
          isFocused
            ? 'border-[var(--ds-focus-border)] ring-2 ring-[var(--ds-focus-ring)]'
            : 'hover:border-[var(--ds-border-strong)]',
          disabled || loading || creatingOption ? 'cursor-not-allowed opacity-60' : '',
          controlClassName,
        ),
        valueContainer: () => cn('app-searchable-select__value-container flex min-w-0 flex-1 items-center px-2.5 py-0', dir === 'ltr' ? 'text-left' : 'text-right'),
        input: () => cn('app-searchable-select__input-container m-0 min-w-[4rem] flex-1 p-0 [font-size:var(--ds-control-font-size)] font-semibold text-[var(--ds-control-fg)]', dir === 'ltr' ? 'text-left' : 'text-right'),
        singleValue: () => cn('app-searchable-select__single-value relative z-[1] block min-w-0 max-w-full flex-1 truncate [font-size:var(--ds-control-font-size)] font-black text-[var(--ds-control-fg)]', dir === 'ltr' ? 'text-left' : 'text-right'),
        placeholder: () => cn('app-searchable-select__placeholder relative z-[1] block min-w-0 max-w-full flex-1 truncate text-xs font-semibold text-[var(--ds-control-muted)]', dir === 'ltr' ? 'text-left' : 'text-right'),
        indicatorsContainer: () => 'app-searchable-select__indicators shrink-0 self-stretch',
        dropdownIndicator: ({ selectProps }) => cn(
          'flex w-8 items-center justify-center p-0 text-[var(--ds-control-muted)] transition-transform',
          selectProps.menuIsOpen ? 'rotate-180' : '',
        ),
        clearIndicator: () => 'app-searchable-select__clear-indicator flex w-8 items-center justify-center p-0 text-[var(--ds-control-muted)] hover:text-[var(--ds-control-fg)]',
        menu: () => cn(
          'mt-2 overflow-hidden rounded-[var(--ds-radius-md)] border border-[var(--ds-border-subtle)] bg-[var(--ds-surface-elevated)] p-1 shadow-[var(--ds-shadow-popover)]',
          menuClassName,
        ),
        menuList: () => 'p-0.5',
        option: ({ isFocused, isSelected, isDisabled }) => cn(
          'cursor-pointer rounded-[var(--ds-radius-xs)] px-3 py-2 text-xs font-semibold',
          dir === 'ltr' ? 'text-left' : 'text-right',
          isDisabled
            ? 'cursor-not-allowed opacity-45'
            : isSelected
              ? 'bg-[var(--ds-primary-soft)] text-primary'
              : isFocused
                ? 'bg-[var(--ds-surface-muted)] text-[var(--ds-text-primary)]'
                : 'text-[var(--ds-text-secondary)]',
        ),
        noOptionsMessage: () => 'px-3 py-4 text-center text-xs font-bold text-[var(--ds-text-muted)]',
        loadingMessage: () => 'px-3 py-4 text-center text-xs font-bold text-[var(--ds-text-muted)]',
      } satisfies ClassNamesConfig<TOption, false, GroupBase<TOption>>}
    />
  );

  if (!label && !hint && !error) return control;

  return (
    <ControlShell
      as="div"
      htmlFor={fieldId}
      label={label}
      hint={hint}
      error={error}
      errorId={errorId}
      hintId={hintId}
      required={required}
      kind="select"
      dir="rtl"
      data-ui-control-size={size}
      className={cn('app-field app-field--select', wrapperClassName)}
      controlWrapClassName="block min-w-0"
      hasTrailingIcon
    >
      {control}
    </ControlShell>
  );
};

export default SearchableSelectField;
