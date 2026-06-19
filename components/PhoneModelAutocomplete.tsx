import React, {useEffect, useId, useMemo, useRef, useState} from 'react';

type Props = {
  value: string;
  onChange: (v: string) => void;
  preview?: string;
  allowNew?: boolean;
  disabled?: boolean;
};

type PhoneModel = { brand: 'Apple'|'Samsung'|'Xiaomi'|'Other'; model: string };

// دیتای پایه مدل‌ها؛ در صورت نیاز از تنظیمات/داده‌های پروژه قابل توسعه است.
const INITIAL_MODELS: PhoneModel[] = [
  // ——— Apple ———
  { brand: 'Apple', model: 'iPhone 3G' },
  { brand: 'Apple', model: 'iPhone 3G S' },
  { brand: 'Apple', model: 'iPhone 4' },
  { brand: 'Apple', model: 'iPhone 4 S' },
  { brand: 'Apple', model: 'iPhone 5' },
  { brand: 'Apple', model: 'iPhone 5 S' },
  { brand: 'Apple', model: 'iPhone 6' },
  { brand: 'Apple', model: 'iPhone 6 S' },
  { brand: 'Apple', model: 'iPhone 7' },
  { brand: 'Apple', model: 'iPhone 7 Plus' },
  { brand: 'Apple', model: 'iPhone SE 2016' },
  { brand: 'Apple', model: 'iPhone SE 2020' },
  { brand: 'Apple', model: 'iPhone SE 2022' },
  { brand: 'Apple', model: 'iPhone 8' },
  { brand: 'Apple', model: 'iPhone 8 Plus' },
  { brand: 'Apple', model: 'iPhone X' },
  { brand: 'Apple', model: 'iPhone XR' },
  { brand: 'Apple', model: 'iPhone XS' },
  { brand: 'Apple', model: 'iPhone XS Max' },
  { brand: 'Apple', model: 'iPhone SE (2020)' },
  { brand: 'Apple', model: 'iPhone 11' },
  { brand: 'Apple', model: 'iPhone 11 Pro' },
  { brand: 'Apple', model: 'iPhone 11 Pro Max' },
  { brand: 'Apple', model: 'iPhone 12 mini' },
  { brand: 'Apple', model: 'iPhone 12' },
  { brand: 'Apple', model: 'iPhone 12 Pro' },
  { brand: 'Apple', model: 'iPhone 12 Pro Max' },
  { brand: 'Apple', model: 'iPhone 13 mini' },
  { brand: 'Apple', model: 'iPhone 13' },
  { brand: 'Apple', model: 'iPhone 13 Pro' },
  { brand: 'Apple', model: 'iPhone 13 Pro Max' },
  { brand: 'Apple', model: 'iPhone SE (2022)' },
  { brand: 'Apple', model: 'iPhone 14' },
  { brand: 'Apple', model: 'iPhone 14 Plus' },
  { brand: 'Apple', model: 'iPhone 14 Pro' },
  { brand: 'Apple', model: 'iPhone 14 Pro Max' },
  { brand: 'Apple', model: 'iPhone 15' },
  { brand: 'Apple', model: 'iPhone 15 Plus' },
  { brand: 'Apple', model: 'iPhone 15 Pro' },
  { brand: 'Apple', model: 'iPhone 15 Pro Max' },
  { brand: 'Apple', model: 'iPhone 16' },
  { brand: 'Apple', model: 'iPhone 16 Plus' },
  { brand: 'Apple', model: 'iPhone 16 Pro' },
  { brand: 'Apple', model: 'iPhone 16 Pro Max' },

  // ——— Samsung (S / Note / Z) ———
  { brand: 'Samsung', model: 'Galaxy S10e' },
  { brand: 'Samsung', model: 'Galaxy S10' },
  { brand: 'Samsung', model: 'Galaxy S10+' },
  { brand: 'Samsung', model: 'Galaxy S10 5G' },
  { brand: 'Samsung', model: 'Galaxy Note10' },
  { brand: 'Samsung', model: 'Galaxy Note10+' },
  { brand: 'Samsung', model: 'Galaxy Note20' },
  { brand: 'Samsung', model: 'Galaxy Note20 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S20' },
  { brand: 'Samsung', model: 'Galaxy S20+' },
  { brand: 'Samsung', model: 'Galaxy S20 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S21' },
  { brand: 'Samsung', model: 'Galaxy S21+' },
  { brand: 'Samsung', model: 'Galaxy S21 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S21 FE' },
  { brand: 'Samsung', model: 'Galaxy S22' },
  { brand: 'Samsung', model: 'Galaxy S22+' },
  { brand: 'Samsung', model: 'Galaxy S22 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S23' },
  { brand: 'Samsung', model: 'Galaxy S23+' },
  { brand: 'Samsung', model: 'Galaxy S23 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S23 FE' },
  { brand: 'Samsung', model: 'Galaxy S24' },
  { brand: 'Samsung', model: 'Galaxy S24+' },
  { brand: 'Samsung', model: 'Galaxy S24 Ultra' },
  { brand: 'Samsung', model: 'Galaxy S25' },
  { brand: 'Samsung', model: 'Galaxy S25+' },
  { brand: 'Samsung', model: 'Galaxy S25 Ultra' },
  { brand: 'Samsung', model: 'Galaxy Z Fold2' },
  { brand: 'Samsung', model: 'Galaxy Z Fold3' },
  { brand: 'Samsung', model: 'Galaxy Z Fold4' },
  { brand: 'Samsung', model: 'Galaxy Z Fold5' },
  { brand: 'Samsung', model: 'Galaxy Z Fold6' },
  { brand: 'Samsung', model: 'Galaxy Z Flip' },
  { brand: 'Samsung', model: 'Galaxy Z Flip3' },
  { brand: 'Samsung', model: 'Galaxy Z Flip4' },
  { brand: 'Samsung', model: 'Galaxy Z Flip5' },
  { brand: 'Samsung', model: 'Galaxy Z Flip6' },

  // ——— Samsung (A / M) ———
  { brand: 'Samsung', model: 'Galaxy A71' },
  { brand: 'Samsung', model: 'Galaxy A72' },
  { brand: 'Samsung', model: 'Galaxy A73' },
  { brand: 'Samsung', model: 'Galaxy A50' },
  { brand: 'Samsung', model: 'Galaxy A50S' },
  { brand: 'Samsung', model: 'Galaxy A51' },
  { brand: 'Samsung', model: 'Galaxy A52' },
  { brand: 'Samsung', model: 'Galaxy A52s' },
  { brand: 'Samsung', model: 'Galaxy A53' },
  { brand: 'Samsung', model: 'Galaxy A54' },
  { brand: 'Samsung', model: 'Galaxy A55' },
  { brand: 'Samsung', model: 'Galaxy A56' },
  { brand: 'Samsung', model: 'Galaxy A33' },
  { brand: 'Samsung', model: 'Galaxy A34' },
  { brand: 'Samsung', model: 'Galaxy A35' },
  { brand: 'Samsung', model: 'Galaxy A36' },
  { brand: 'Samsung', model: 'Galaxy A24' },
  { brand: 'Samsung', model: 'Galaxy A25' },
  { brand: 'Samsung', model: 'Galaxy A26' },
  { brand: 'Samsung', model: 'Galaxy A14' },
  { brand: 'Samsung', model: 'Galaxy A15' },
  { brand: 'Samsung', model: 'Galaxy A16' },
  { brand: 'Samsung', model: 'Galaxy M31' },
  { brand: 'Samsung', model: 'Galaxy M32' },
  { brand: 'Samsung', model: 'Galaxy M33' },
  { brand: 'Samsung', model: 'Galaxy M34' },
  { brand: 'Samsung', model: 'Galaxy M54' },

  // ——— Xiaomi flagships ———
  { brand: 'Xiaomi', model: 'Mi 10' },
  { brand: 'Xiaomi', model: 'Mi 10T' },
  { brand: 'Xiaomi', model: 'Mi 10T Pro' },
  { brand: 'Xiaomi', model: 'Mi 11' },
  { brand: 'Xiaomi', model: 'Mi 11 Ultra' },
  { brand: 'Xiaomi', model: 'Mi 11i' },
  { brand: 'Xiaomi', model: 'Xiaomi 12' },
  { brand: 'Xiaomi', model: 'Xiaomi 12X' },
  { brand: 'Xiaomi', model: 'Xiaomi 12 Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 12T' },
  { brand: 'Xiaomi', model: 'Xiaomi 12T Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 13' },
  { brand: 'Xiaomi', model: 'Xiaomi 13 Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 13 Ultra' },
  { brand: 'Xiaomi', model: 'Xiaomi 13T' },
  { brand: 'Xiaomi', model: 'Xiaomi 13T Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 14' },
  { brand: 'Xiaomi', model: 'Xiaomi 14 Pro' },
  { brand: 'Xiaomi', model: 'Xiaomi 14 Ultra' },
  { brand: 'Xiaomi', model: 'Xiaomi 15' },
  { brand: 'Xiaomi', model: 'Xiaomi 15 Pro' },

  // ——— Redmi Note ———
  { brand: 'Xiaomi', model: 'Redmi Note 8' },
  { brand: 'Xiaomi', model: 'Redmi Note 8 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 9' },
  { brand: 'Xiaomi', model: 'Redmi Note 9S' },
  { brand: 'Xiaomi', model: 'Redmi Note 9 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 10' },
  { brand: 'Xiaomi', model: 'Redmi Note 10S' },
  { brand: 'Xiaomi', model: 'Redmi Note 10 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 11' },
  { brand: 'Xiaomi', model: 'Redmi Note 11S' },
  { brand: 'Xiaomi', model: 'Redmi Note 11 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 12' },
  { brand: 'Xiaomi', model: 'Redmi Note 12 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 12 Pro+' },
  { brand: 'Xiaomi', model: 'Redmi Note 13' },
  { brand: 'Xiaomi', model: 'Redmi Note 13X' },
  { brand: 'Xiaomi', model: 'Redmi Note 13 5G' },
  { brand: 'Xiaomi', model: 'Redmi Note 13 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 13 Pro+' },
  { brand: 'Xiaomi', model: 'Redmi Note 14' },
  { brand: 'Xiaomi', model: 'Redmi Note 14 Pro' },
  { brand: 'Xiaomi', model: 'Redmi Note 14 Pro+' },

  // ——— POCO ———
  { brand: 'Xiaomi', model: 'POCO F2 Pro' },
  { brand: 'Xiaomi', model: 'POCO F3' },
  { brand: 'Xiaomi', model: 'POCO F4' },
  { brand: 'Xiaomi', model: 'POCO F4 GT' },
  { brand: 'Xiaomi', model: 'POCO F5' },
  { brand: 'Xiaomi', model: 'POCO F5 Pro' },
  { brand: 'Xiaomi', model: 'POCO F6' },
  { brand: 'Xiaomi', model: 'POCO F6 Pro' },
  { brand: 'Xiaomi', model: 'POCO F7' },
  { brand: 'Xiaomi', model: 'POCO X3 NFC' },
  { brand: 'Xiaomi', model: 'POCO X3 Pro' },
  { brand: 'Xiaomi', model: 'POCO X4 Pro' },
  { brand: 'Xiaomi', model: 'POCO X5' },
  { brand: 'Xiaomi', model: 'POCO X5 Pro' },
  { brand: 'Xiaomi', model: 'POCO X6' },
  { brand: 'Xiaomi', model: 'POCO X6 Pro' },
  { brand: 'Xiaomi', model: 'POCO X7 Pro' },
  { brand: 'Xiaomi', model: 'POCO M4 Pro' },
  { brand: 'Xiaomi', model: 'POCO M5' },
  { brand: 'Xiaomi', model: 'POCO M6 Pro' },
];


function normalize(s: string) {
  return (s || '')
    .toLowerCase()
    .replaceAll('آ','ا')
    .replaceAll('ي','ی')
    .replaceAll('ك','ک')
    .trim();
}

const PhoneModelAutocomplete: React.FC<Props> = ({
  value,
  onChange,
  preview = 'مثال: iPhone 15 Pro',
  allowNew = true,
  disabled,
}) => {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState(value || '');
  const [cursor, setCursor] = useState(0);
  const [models, setModels] = useState<PhoneModel[]>(INITIAL_MODELS);
  const boxRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const listboxId = useId();

  useEffect(() => setQuery(value || ''), [value]);

  // بسته‌شدن با کلیک بیرون
  useEffect(() => {
    const onDocClick = (e: MouseEvent) => {
      if (!boxRef.current) return;
      if (!boxRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, []);

  const items = useMemo(() => {
    const q = normalize(query);
    if (!q) return models.slice(0, 15);
    return models.filter(m => normalize(`${m.brand} ${m.model}`).includes(q)).slice(0, 15);
  }, [query, models]);

  const exactExists = useMemo(() => {
    const q = normalize(query);
    return models.some(m => normalize(m.model) === q);
  }, [query, models]);

  useEffect(() => {
    if (!open) return;
    const active = listRef.current?.querySelector<HTMLElement>('[data-phone-option-active="true"]');
    active?.scrollIntoView({ block: 'nearest' });
  }, [open, cursor]);

  const select = (m: PhoneModel) => {
    onChange(m.model);
    setQuery(m.model);
    setOpen(false);
  };

  const addNew = () => {
    const trimmed = query.trim();
    if (!trimmed) return;
    const newItem: PhoneModel = { brand: 'Other', model: trimmed };
    setModels(prev => [newItem, ...prev]);
    select(newItem);
  };

  const onKeyDown: React.KeyboardEventHandler<HTMLInputElement> = e => {
    const canAdd = Boolean(allowNew && query && !exactExists);
    const maxIndex = Math.max(0, items.length - 1 + (canAdd ? 1 : 0));

    if (!open && (e.key === 'ArrowDown' || e.key === 'ArrowUp' || e.key === 'Enter')) {
      e.preventDefault();
      setOpen(true);
      setCursor(0);
      return;
    }

    if (!open) {
      if (e.key === 'Escape') setOpen(false);
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setCursor(c => Math.min(c + 1, maxIndex));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setCursor(c => Math.max(c - 1, 0));
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (cursor < items.length && items[cursor]) select(items[cursor]);
      else if (canAdd && cursor === items.length) addNew();
    } else if (e.key === 'Escape') {
      e.preventDefault();
      setOpen(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    } else if (e.key === 'Tab') {
      setOpen(false);
    }
  };

  return (
    <div ref={boxRef} className="phone-model-autocomplete-foundation relative space-y-2" dir="rtl">
      <div className="flex items-center justify-between text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
        <span>جستجوی مدل</span>
        <span className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[10px] font-black tracking-[0.18em] text-slate-500 dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300">مدل</span>
      </div>
      <input
        ref={inputRef}
        role="combobox"
        aria-autocomplete="list"
        aria-expanded={open}
        aria-controls={open ? listboxId : undefined}
        aria-activedescendant={open ? `${listboxId}-option-${cursor}` : undefined}
        type="text"
        value={query}
        disabled={disabled}
        onChange={e => {
          setQuery(e.target.value);
          onChange(e.target.value);
          setOpen(true);
          setCursor(0);
        }}
        onFocus={() => setOpen(true)}
        onKeyDown={onKeyDown}
        preview={preview}
        className="h-12 w-full rounded-2xl border border-slate-200 bg-white pl-12 pr-4 text-sm font-semibold text-slate-900 shadow-[0_16px_40px_-30px_rgba(15,23,42,0.30)] outline-none transition preview:font-medium preview:text-slate-400    dark:border-slate-700/90 dark:bg-slate-950/90 dark:text-slate-50 dark:preview:text-slate-500  "
        dir="ltr"
        autoComplete="off"
      />
      <div className="pointer-events-none absolute left-3 top-1/2 z-10 -translate-y-1/2 inline-flex h-8 w-8 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-500 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.18)] dark:border-slate-700/80 dark:bg-slate-900 dark:text-slate-300">
        <i className="fa-solid fa-chevron-down text-[11px]" />
      </div>

      {open && (
        <div id={listboxId} ref={listRef} role="listbox" className="absolute z-[80] mt-2 w-full overflow-hidden rounded-[24px] border border-slate-200/90 bg-white shadow-[0_28px_65px_-34px_rgba(15,23,42,0.35)] dark:border-slate-700/90 dark:bg-slate-950">
          <div className="border-b border-slate-100 px-4 py-3 text-[11px] font-black tracking-[0.16em] text-slate-500 dark:border-slate-800 dark:text-slate-400">
            جستجو و انتخاب مدل گوشی
          </div>
          <div className="max-h-72 overflow-auto p-2">
            {items.map((m, i) => (
              <button
                key={`${m.brand}-${m.model}-${i}`}
                id={`${listboxId}-option-${i}`}
                role="option"
                aria-selected={i === cursor}
                data-phone-option-active={i === cursor ? 'true' : 'false'}
                type="button"
                onMouseDown={e => e.preventDefault()}
                onClick={() => select(m)}
                className={`flex w-full items-center justify-between rounded-2xl px-3 py-2.5 text-right transition ${
                  i === cursor
                    ? 'bg-sky-50 text-sky-900 shadow-[0_14px_30px_-24px_rgba(14,165,233,0.45)] dark:bg-sky-500/10 dark:text-sky-100'
                    : 'text-slate-700 hover:bg-slate-50 dark:text-slate-200 dark:hover:bg-slate-900'
                }`}
              >
                <span className="truncate text-sm font-semibold">{m.model}</span>
                <span className="mr-3 inline-flex shrink-0 items-center rounded-full border border-slate-200 bg-slate-50 px-2 py-0.5 text-[10px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">{m.brand}</span>
              </button>
            ))}

            {allowNew && query && !exactExists && (
              <button
                type="button"
                id={`${listboxId}-option-${items.length}`}
                role="option"
                aria-selected={cursor === items.length}
                data-phone-option-active={cursor === items.length ? 'true' : 'false'}
                onMouseDown={e => e.preventDefault()}
                onClick={addNew}
                className={`mt-2 flex w-full items-center justify-between rounded-2xl border px-3 py-2.5 text-right text-sm font-bold transition ${
                  cursor === items.length
                    ? 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/70 dark:bg-emerald-950/30 dark:text-emerald-300'
                    : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-emerald-900/60 dark:hover:bg-emerald-950/30 dark:hover:text-emerald-300'
                }`}
              >
                <span>افزودن مورد جدید «{query}»</span>
                <span className="inline-flex h-7 w-7 items-center justify-center rounded-xl border border-current/15 bg-white/80 text-[11px] dark:bg-slate-950/60">
                  <i className="fa-solid fa-plus" />
                </span>
              </button>
            )}

            {!items.length && !(allowNew && query && !exactExists) && (
              <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-4 text-center text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                مدلی یافت نشد.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PhoneModelAutocomplete;
