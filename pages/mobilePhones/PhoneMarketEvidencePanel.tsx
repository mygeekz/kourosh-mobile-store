import React, { useMemo, useRef, useState } from 'react';
import { Check, CheckCheck, CircleAlert, CircleDollarSign, CloudUpload, Database, FileCheck, FileText, Info, ListChecks, Plus, Radio, ShieldCheck, ShoppingCart, Sparkles, Tag, UserCheck } from 'lucide-react';
import Button from '../../components/Button';
import ToggleSwitch from '../../components/ToggleSwitch';
import ShamsiDatePicker from '../../components/ShamsiDatePicker';
import TextField from '../../components/ui/TextField';
import { SelectField } from '@/components/ui';
import TextareaField from '../../components/ui/TextareaField';

export type MarketEvidenceSide = {
  referencePrice: number | null;
  range: { min: number; max: number } | null;
  sampleCount: number;
  sourceCount: number;
  latestObservedAt: string | null;
  freshness: 'fresh' | 'aging' | 'unavailable';
  specificationMatch: 'exact-model-storage-ram' | 'exact-model-storage' | 'none';
  outliersExcluded: number;
};

export type PhoneMarketEvidence = {
  mode: 'operator-approved-manual-snapshots';
  purchase: MarketEvidenceSide;
  sale: MarketEvidenceSide;
};

export type MarketSnapshotDraft = {
  priceType: 'purchase' | 'sale';
  price: number;
  sourceName: string;
  sourceReference?: string;
  observedAt: string;
};

export type SupplierFeedDraft = {
  platform: 'telegram' | 'whatsapp' | 'bale' | 'manual';
  sourceName: string;
  sourceReference?: string;
  observedAt: string;
  defaultCurrency: 'toman' | 'rial';
  defaultPriceType: 'purchase' | 'sale';
  rawText: string;
};

export type SupplierFeedReviewItem = {
  id: number;
  lineNumber: number;
  rawLine: string;
  model: string;
  storage: string | null;
  ram: string | null;
  color: string | null;
  condition: string | null;
  registrationStatus: 'registered' | 'unregistered' | 'unknown';
  activationStatus: 'active' | 'not-activated' | 'unknown';
  partNumber: string | null;
  priceType: 'purchase' | 'sale';
  priceToman: number | null;
  priceRial: number | null;
  confidence: 'high' | 'medium' | 'low';
  reviewReasons: string[];
  approved?: boolean;
};

export type SupplierFeedReview = {
  id: number;
  platform: SupplierFeedDraft['platform'];
  sourceName: string;
  inputKind: 'text' | 'image' | 'pdf' | 'mixed';
  originalFileName?: string | null;
  extractionStatus: 'not-required' | 'extracted' | 'needs-manual-review' | 'failed';
  reviewStatus: string;
  items: SupplierFeedReviewItem[];
};

type Props = {
  evidence: PhoneMarketEvidence;
  canRecord: boolean;
  formatPrice: (value: number) => string;
  onRecord: (draft: MarketSnapshotDraft) => Promise<void>;
  onCreateSupplierFeed: (draft: SupplierFeedDraft, attachment: File | null) => Promise<SupplierFeedReview>;
  onApproveSupplierFeed: (feedId: number, items: SupplierFeedReviewItem[]) => Promise<number>;
};

const evidenceMatchLabel = { 'exact-model-storage-ram': 'مدل، حافظه و RAM دقیق', 'exact-model-storage': 'مدل و حافظه دقیق', none: 'بدون شاهد منطبق' };
const platformMeta = {
  telegram: { label: 'تلگرام', iconClass: 'fa-brands fa-telegram' },
  whatsapp: { label: 'واتساپ', iconClass: 'fa-brands fa-whatsapp' },
  bale: { label: 'بله', iconClass: 'fa-solid fa-message' },
  manual: { label: 'دستی', iconClass: 'fa-solid fa-keyboard' },
};
const confidenceMeta = {
  high: { label: 'آماده بررسی', cls: 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/25 dark:text-emerald-300 dark:border-emerald-900/60' },
  medium: { label: 'نیازمند دقت', cls: 'bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/25 dark:text-amber-300 dark:border-amber-900/60' },
  low: { label: 'اطلاعات ناقص', cls: 'bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/25 dark:text-rose-300 dark:border-rose-900/60' },
};

const nowTime = () => {
  const date = new Date();
  return `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
};

const combineObservedDateTime = (date: Date | null, time: string): string => {
  if (!date || !/^\d{2}:\d{2}$/.test(time)) return '';
  const [hours, minutes] = time.split(':').map(Number);
  if (!Number.isInteger(hours) || !Number.isInteger(minutes) || hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return '';
  const local = new Date(date);
  local.setHours(hours, minutes, 0, 0);
  const pad = (value: number) => String(value).padStart(2, '0');
  return `${local.getFullYear()}-${pad(local.getMonth() + 1)}-${pad(local.getDate())}T${pad(hours)}:${pad(minutes)}`;
};

const createManualReviewItem = (id: number, lineNumber: number, priceType: 'purchase' | 'sale'): SupplierFeedReviewItem => ({
  id,
  lineNumber,
  rawLine: 'ورودی دستی',
  model: '',
  storage: null,
  ram: null,
  color: null,
  condition: null,
  registrationStatus: 'unknown',
  activationStatus: 'unknown',
  partNumber: null,
  priceType,
  priceToman: null,
  priceRial: null,
  confidence: 'low',
  reviewReasons: ['ردیف دستی است؛ مدل، حافظه و مبلغ تومان را کامل کنید.'],
  approved: false,
});

const isReviewItemComplete = (item: SupplierFeedReviewItem): boolean => Boolean(
  String(item.model || '').trim() && String(item.storage || '').trim() && Number(item.priceToman) > 0,
);

const PhoneMarketEvidencePanel: React.FC<Props> = ({ evidence, canRecord, formatPrice, onRecord, onCreateSupplierFeed, onApproveSupplierFeed }) => {
  const [mode, setMode] = useState<'closed' | 'single' | 'channel'>('closed');
  const [priceType, setPriceType] = useState<'purchase' | 'sale'>('sale');
  const [price, setPrice] = useState('');
  const [sourceName, setSourceName] = useState('');
  const [sourceReference, setSourceReference] = useState('');
  const [observedDate, setObservedDate] = useState<Date | null>(() => new Date());
  const [observedTime, setObservedTime] = useState(nowTime);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [platform, setPlatform] = useState<SupplierFeedDraft['platform']>('bale');
  const [defaultCurrency, setDefaultCurrency] = useState<'toman' | 'rial'>('toman');
  const [defaultPriceType, setDefaultPriceType] = useState<'purchase' | 'sale'>('purchase');
  const [rawText, setRawText] = useState('');
  const [attachment, setAttachment] = useState<File | null>(null);
  const [feedReview, setFeedReview] = useState<SupplierFeedReview | null>(null);
  const manualItemSequenceRef = useRef(-1);

  const observedAt = useMemo(() => combineObservedDateTime(observedDate, observedTime), [observedDate, observedTime]);
  const selectedCount = useMemo(() => feedReview?.items.filter((item) => item.approved).length ?? 0, [feedReview]);
  const incompleteSelectedCount = useMemo(() => feedReview?.items.filter((item) => item.approved && !isReviewItemComplete(item)).length ?? 0, [feedReview]);
  const completeItemCount = useMemo(() => feedReview?.items.filter(isReviewItemComplete).length ?? 0, [feedReview]);
  const updateReviewItem = (id: number, patch: Partial<SupplierFeedReviewItem>) => setFeedReview((current) => current ? ({ ...current, items: current.items.map((item) => item.id === id ? { ...item, ...patch } : item) }) : current);
  const addManualReviewItem = () => setFeedReview((current) => {
    if (!current) return current;
    const nextLineNumber = current.items.reduce((max, item) => Math.max(max, item.lineNumber), 0) + 1;
    const item = createManualReviewItem(manualItemSequenceRef.current, nextLineNumber, defaultPriceType);
    manualItemSequenceRef.current -= 1;
    return { ...current, items: [...current.items, item] };
  });
  const selectCompleteItems = () => {
    setFeedReview((current) => current ? ({
      ...current,
      items: current.items.map((item) => ({ ...item, approved: isReviewItemComplete(item) })),
    }) : current);
    setMessage(completeItemCount
      ? `${completeItemCount.toLocaleString('fa-IR')} ردیف کامل انتخاب شد؛ مبلغ‌ها و مشخصات را کنترل و سپس ثبت نهایی کنید.`
      : 'هنوز ردیف کاملی وجود ندارد؛ مدل، حافظه و مبلغ تومان حداقل یک ردیف را کامل کنید.');
  };
  const clearReviewSelection = () => setFeedReview((current) => current ? ({
    ...current,
    items: current.items.map((item) => ({ ...item, approved: false })),
  }) : current);

  const submitSingle = async () => {
    const numericPrice = Number(String(price).replace(/,/g, ''));
    if (!(numericPrice > 0) || !sourceName.trim() || !observedAt) return setMessage('مبلغ، نام منبع و زمان مشاهده را کامل کنید.');
    setSaving(true); setMessage(null);
    try {
      await onRecord({ priceType, price: numericPrice, sourceName: sourceName.trim(), sourceReference: sourceReference.trim() || undefined, observedAt });
      setPrice(''); setMessage('قیمت تأییدشده به مرجع تأمین‌کنندگان اضافه شد.');
    } catch (error: any) { setMessage(error?.message || 'ثبت قیمت مرجع انجام نشد.'); }
    finally { setSaving(false); }
  };

  const analyzeFeed = async () => {
    if (!sourceName.trim() || (!rawText.trim() && !attachment) || !observedAt) return setMessage('نام منبع، تاریخ مشاهده و حداقل یک متن، تصویر یا PDF را وارد کنید.');
    setSaving(true); setMessage(null); setFeedReview(null);
    try {
      const review = await onCreateSupplierFeed({ platform, sourceName: sourceName.trim(), sourceReference: sourceReference.trim() || undefined, observedAt, defaultCurrency, defaultPriceType, rawText }, attachment);
      const extractedItems = review.items.map((item) => ({ ...item, approved: item.confidence !== 'low' && isReviewItemComplete(item) }));
      const items = extractedItems.length
        ? extractedItems
        : [createManualReviewItem(manualItemSequenceRef.current--, 1, defaultPriceType)];
      setFeedReview({ ...review, items });
      setMessage(extractedItems.length
        ? `${extractedItems.length.toLocaleString('fa-IR')} ردیف استخراج شد؛ قبل از ثبت نهایی همه موارد را بررسی کنید.`
        : 'استخراج خودکار ردیفی نساخت؛ یک ردیف دستی آماده شد. مدل، حافظه و مبلغ را کامل و سپس آن را انتخاب کنید.');
    } catch (error: any) { setMessage(error?.message || 'پردازش ورودی کانال انجام نشد.'); }
    finally { setSaving(false); }
  };

  const approveFeed = async () => {
    if (!feedReview || !selectedCount) return setMessage('حداقل یک ردیف کامل را انتخاب کنید.');
    if (incompleteSelectedCount) return setMessage('مدل، حافظه و مبلغ تومان ردیف‌های انتخاب‌شده را کامل کنید.');
    setSaving(true); setMessage(null);
    try {
      const approved = await onApproveSupplierFeed(feedReview.id, feedReview.items.filter((item) => item.approved));
      setMessage(`${approved.toLocaleString('fa-IR')} ردیف به مرجع قیمت تأمین‌کنندگان اضافه شد؛ هیچ قیمتی خودکار روی فرم اعمال نشد.`);
      setFeedReview((current) => {
        if (!current) return current;
        const remainingItems = current.items.filter((item) => !item.approved);
        return { ...current, reviewStatus: remainingItems.length ? 'partially-approved' : 'approved', items: remainingItems };
      });
    } catch (error: any) { setMessage(error?.message || 'تأیید ردیف‌ها انجام نشد.'); }
    finally { setSaving(false); }
  };

  const sides = [
    { label: 'مرجع خرید تأییدشده', Icon: ShoppingCart, side: evidence.purchase },
    { label: 'مرجع فروش تأییدشده', Icon: Tag, side: evidence.sale },
  ];
  const fieldClass = 'app-form-control w-full text-right text-xs font-bold';
  const compactFieldClass = 'app-form-control w-full text-center text-[11px] font-bold';
  const fieldLabelClass = 'ux-field-label mb-1.5 block text-[11px] font-black';

  return (
    <section
      className="phone-market-evidence ux-panel-card mt-3 overflow-hidden"
      aria-label="مرجع قیمت تأمین‌کنندگان"
    >
      <div className="border-b border-slate-200/80 p-4 dark:border-slate-800 sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div className="flex min-w-0 items-start gap-3">
            <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300">
              <Database className="h-5 w-5" strokeWidth={2.3} aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <h3 className="text-[15px] font-black text-slate-900 dark:text-slate-50">مرجع قیمت تأمین‌کنندگان</h3>
                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-1 text-[9px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                  <UserCheck className="h-3 w-3 shrink-0" strokeWidth={2.4} aria-hidden="true" /> تأیید انسانی
                </span>
              </div>
              <p className="mt-1.5 max-w-3xl text-xs leading-6 text-slate-500 dark:text-slate-400">
                قیمت‌های فایل‌ها و کانال‌های تأمین‌کنندگان، بدون دریافت اینترنتی و پس از بازبینی شما، به‌عنوان ورودی کمکی پیشنهاد هوشمند استفاده می‌شوند.
              </p>
            </div>
          </div>

          {canRecord ? (
            <div className="grid w-full grid-cols-2 gap-2 lg:w-auto lg:min-w-[19rem]" role="group" aria-label="روش ورود مرجع قیمت">
              <Button
                type="button"
                size="sm"
                variant={mode === 'single' ? 'primary' : 'secondary'}
                aria-pressed={mode === 'single'}
                onClick={() => setMode(mode === 'single' ? 'closed' : 'single')}
                autoIcon={false}
                className="w-full justify-center font-black"
              >
                <span className="inline-flex items-center gap-2"><i className="fa-solid fa-pen-line" aria-hidden="true" />ورود قیمت تکی</span>
              </Button>
              <Button
                type="button"
                size="sm"
                variant={mode === 'channel' ? 'primary' : 'secondary'}
                aria-pressed={mode === 'channel'}
                onClick={() => setMode(mode === 'channel' ? 'closed' : 'channel')}
                autoIcon={false}
                className="w-full justify-center font-black"
              >
                <span className="inline-flex items-center gap-2"><i className="fa-solid fa-file-arrow-up" aria-hidden="true" />فایل یا کانال</span>
              </Button>
            </div>
          ) : null}
        </div>

        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
          {sides.map(({ label, Icon, side }) => (
            <div key={label} className="rounded-[20px] border border-slate-200/80 bg-slate-50/70 p-3.5 dark:border-slate-800 dark:bg-slate-900/45">
              <div className="flex items-start justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2.5">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                    <Icon className="h-4 w-4" strokeWidth={2.35} aria-hidden="true" />
                  </span>
                  <div className="min-w-0">
                    <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">{label}</div>
                    <div className="mt-1 truncate text-[15px] font-black text-slate-900 dark:text-slate-50">
                      {side.referencePrice ? formatPrice(side.referencePrice) : 'هنوز داده‌ای ثبت نشده'}
                    </div>
                  </div>
                </div>
                {side.referencePrice ? (
                  <span className={`mt-1 inline-flex h-2.5 w-2.5 shrink-0 rounded-full ${side.freshness === 'fresh' ? 'bg-emerald-500' : 'bg-amber-500'}`} title={side.freshness === 'fresh' ? 'داده تازه' : 'نیازمند به‌روزرسانی'} />
                ) : null}
              </div>
              {side.referencePrice ? (
                <div className="mt-3 flex flex-wrap gap-1.5 text-[9px] font-bold text-slate-500 dark:text-slate-400">
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950">{side.sampleCount.toLocaleString('fa-IR')} قیمت</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950">{side.sourceCount.toLocaleString('fa-IR')} منبع</span>
                  <span className="rounded-full border border-slate-200 bg-white px-2 py-1 dark:border-slate-700 dark:bg-slate-950">{evidenceMatchLabel[side.specificationMatch]}</span>
                </div>
              ) : null}
            </div>
          ))}
        </div>
      </div>

      {mode === 'single' && canRecord ? (
        <div className="bg-slate-50/45 p-4 dark:bg-slate-950/35 sm:p-5">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300"><CircleDollarSign className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /></span>
            <div>
              <h4 className="text-[13px] font-black text-slate-900 dark:text-slate-100">ثبت یک قیمت تأییدشده</h4>
              <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">برای قیمت‌هایی که از تماس، پیام یا فاکتور دریافت کرده‌اید.</p>
            </div>
          </div>

          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
            <SelectField label="نوع قیمت" icon={<Tag className="h-4 w-4" />} value={priceType} onChange={(event) => setPriceType(event.target.value as 'purchase' | 'sale')} className={fieldClass}>
                <option value="purchase">قیمت همکاری / خرید</option>
                <option value="sale">قیمت فروش</option>
            </SelectField>
            <TextField label="مبلغ به تومان" icon={<i className="fa-solid fa-money-bill-wave" />} inputMode="numeric" value={price} onChange={(event) => setPrice(event.target.value)} placeholder="مثلاً ۷۷٬۲۰۰٬۰۰۰" className={fieldClass} />
            <TextField label="نام تأمین‌کننده یا کانال" icon={<i className="fa-solid fa-store" />} value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="مثلاً تهران پخش" className={fieldClass} />
            <TextField label="لینک یا شناسه پیام" icon={<i className="fa-solid fa-link" />} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="اختیاری" className={fieldClass} />
            <div>
              <span className={fieldLabelClass}>تاریخ مشاهده</span>
              <ShamsiDatePicker selectedDate={observedDate} onDateChange={setObservedDate} preview="تاریخ مشاهده" size="compact" />
            </div>
            <TextField label="ساعت مشاهده" icon={<i className="fa-regular fa-clock" />} type="time" value={observedTime} onChange={(event) => setObservedTime(event.target.value)} aria-label="زمان مشاهده" className={`${fieldClass} text-center`} />
          </div>

          <Button type="button" size="sm" onClick={submitSingle} disabled={saving} autoIcon={false} className="mt-4 w-full justify-center sm:w-auto">
            <span className="inline-flex items-center gap-2"><Check className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />{saving ? 'در حال ثبت…' : 'ثبت قیمت تأییدشده'}</span>
          </Button>
        </div>
      ) : null}

      {mode === 'channel' && canRecord ? (
        <div className="space-y-4 bg-slate-50/45 p-4 dark:bg-slate-950/35 sm:p-5">
          <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/65">
            <div className="flex items-center gap-3">
              <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300"><Radio className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /></span>
              <div>
                <h4 className="text-[13px] font-black text-slate-900 dark:text-slate-100">مشخصات منبع</h4>
                <p className="mt-0.5 text-[10px] text-slate-500 dark:text-slate-400">کانال یا تأمین‌کننده‌ای که لیست قیمت را ارسال کرده است.</p>
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-4" role="radiogroup" aria-label="منبع پیام">
              {(Object.keys(platformMeta) as SupplierFeedDraft['platform'][]).map((key) => {
                const meta = platformMeta[key];
                const active = platform === key;
                return (
                  <Button
                    key={key}
                    type="button"
                    role="radio"
                    aria-label={meta.label}
                    aria-checked={active}
                    aria-pressed={active}
                    onClick={() => setPlatform(key)}
                    variant={active ? 'primary' : 'secondary'}
                    size="sm"
                    autoIcon={false}
                    className="min-h-11 w-full justify-center font-black"
                  >
                    <span className="inline-flex items-center gap-2 font-black">
                      <i className={meta.iconClass} aria-hidden="true" />
                      {meta.label}
                    </span>
                  </Button>
                );
              })}
            </div>

            <div className="mt-3 grid grid-cols-1 gap-3 md:grid-cols-2">
              <TextField label="نام کانال یا تأمین‌کننده" icon={<i className="fa-solid fa-store" />} value={sourceName} onChange={(event) => setSourceName(event.target.value)} placeholder="مثلاً تهران پخش" className={fieldClass} />
              <TextField label="لینک، نام کاربری یا شناسه پیام" icon={<i className="fa-solid fa-link" />} value={sourceReference} onChange={(event) => setSourceReference(event.target.value)} placeholder="اختیاری" className={fieldClass} />
            </div>
          </div>

          <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/65 sm:p-5">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><FileText className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /></span>
                <div>
                  <h4 className="text-[13px] font-black text-slate-900 dark:text-slate-100">ورود لیست قیمت</h4>
                  <p className="mt-0.5 text-[10px] leading-5 text-slate-500 dark:text-slate-400">متن پیام را وارد کنید یا فایل تأمین‌کننده را بارگذاری کنید.</p>
                </div>
              </div>
              <span className="w-fit rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[9px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">PDF، PNG، JPG و WEBP</span>
            </div>

            <div className="mt-4 grid items-start gap-3 lg:grid-cols-[minmax(0,1.9fr)_minmax(13rem,0.55fr)]">
              <TextareaField
                  label="متن لیست قیمت"
                  icon={<FileText className="h-4 w-4" />}
                  value={rawText}
                  onChange={(event) => setRawText(event.target.value)}
                  rows={5}
                  placeholder={'متن یا لیست قیمت را اینجا وارد کنید…\nنمونه: A57 256G R12 VIT 108000 MIX'}
                  className="min-h-[9.5rem] resize-none text-right text-xs leading-7"
                />
              <div className="min-w-0">
                <span className={`${fieldLabelClass} inline-flex items-center gap-1.5`}><CloudUpload className="h-3.5 w-3.5" aria-hidden="true" /> فایل قیمت</span>
                <Button
                  type="button"
                  onClick={() => document.getElementById('supplier-feed-attachment')?.click()}
                  title="فرمت‌های مجاز: PDF، PNG، JPG و WEBP — حداکثر حجم ۴۰ مگابایت"
                  aria-label={attachment ? `تغییر فایل ${attachment.name}` : 'بارگذاری فایل قیمت؛ فرمت‌های مجاز PDF، PNG، JPG و WEBP تا ۴۰ مگابایت'}
                  variant="secondary"
                  autoIcon={false}
                  className="min-h-[6.5rem] w-full flex-col justify-center border-dashed px-3 py-3 text-center"
                >
                  <span className={`flex h-11 w-11 items-center justify-center rounded-2xl border ${attachment ? 'border-emerald-200 bg-emerald-50 text-emerald-600 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300' : 'border-slate-200 bg-white text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300'}`}>
                    {attachment ? <FileCheck className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" /> : <CloudUpload className="h-5 w-5" strokeWidth={2.35} aria-hidden="true" />}
                  </span>
                  <span className="mt-2.5 max-w-full truncate text-xs font-black text-slate-800 dark:text-slate-100">{attachment ? attachment.name : 'انتخاب فایل قیمت'}</span>
                  <span className="mt-1 text-[9px] leading-5 text-slate-500 dark:text-slate-400">{attachment ? 'برای جایگزینی دوباره کلیک کنید' : 'حداکثر حجم ۴۰ مگابایت'}</span>
                </Button>
                <TextField id="supplier-feed-attachment" type="file" accept="image/png,image/jpeg,image/webp,application/pdf" wrapperClassName="hidden" className="hidden" onChange={(event) => setAttachment(event.target.files?.[0] || null)} />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 md:grid-cols-2 xl:grid-cols-4">
              <SelectField label="واحد مبالغ فایل" icon={<CircleDollarSign className="h-4 w-4" />} value={defaultCurrency} onChange={(event) => setDefaultCurrency(event.target.value as 'toman' | 'rial')} className={fieldClass}>
                  <option value="toman">تومان</option>
                  <option value="rial">ریال</option>
              </SelectField>
              <SelectField label="نوع قیمت پیش‌فرض" icon={<ShoppingCart className="h-4 w-4" />} value={defaultPriceType} onChange={(event) => setDefaultPriceType(event.target.value as 'purchase' | 'sale')} className={fieldClass}>
                  <option value="purchase">همکاری / خرید</option>
                  <option value="sale">فروش</option>
              </SelectField>
              <div>
                <span className={fieldLabelClass}>تاریخ دریافت</span>
                <ShamsiDatePicker selectedDate={observedDate} onDateChange={setObservedDate} preview="تاریخ دریافت" size="compact" />
              </div>
              <TextField label="ساعت دریافت" icon={<i className="fa-regular fa-clock" />} type="time" value={observedTime} onChange={(event) => setObservedTime(event.target.value)} aria-label="زمان مشاهده" className={`${fieldClass} text-center`} />
            </div>

            <div className="mt-4 flex flex-col gap-3 border-t border-slate-100 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-[10px] leading-5 text-slate-500 dark:text-slate-400">متن و فایل فقط برای استخراج ردیف‌های قابل بازبینی استفاده می‌شوند.</p>
              <Button type="button" size="sm" onClick={analyzeFeed} disabled={saving} autoIcon={false} className="w-full justify-center sm:w-auto sm:min-w-[15rem]">
                <span className="inline-flex items-center gap-2"><Sparkles className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />{saving ? 'در حال استخراج و تحلیل…' : 'استخراج و آماده‌سازی قیمت‌ها'}</span>
              </Button>
            </div>
          </div>

          {feedReview ? (
            <div className="rounded-[22px] border border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/65">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="flex items-start gap-3">
                  <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/35 dark:text-sky-300"><ListChecks className="h-4 w-4" strokeWidth={2.4} aria-hidden="true" /></span>
                  <div>
                    <h4 className="text-[13px] font-black text-slate-900 dark:text-slate-100">بازبینی و تأیید انسانی قیمت‌ها</h4>
                    <p className="mt-1 text-[10px] leading-5 text-slate-500 dark:text-slate-400">
                      {feedReview.originalFileName ? `فایل: ${feedReview.originalFileName} • ` : ''}
                      {feedReview.extractionStatus === 'needs-manual-review' || feedReview.extractionStatus === 'failed'
                        ? 'بعضی اطلاعات کامل تشخیص داده نشده‌اند؛ فقط همان ردیف‌ها را اصلاح کنید.'
                        : 'قبل از ثبت نهایی، مدل، مشخصات، رنگ و مبلغ هر ردیف را کنترل کنید.'}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  <Button type="button" size="xs" variant="secondary" onClick={selectCompleteItems} disabled={saving || completeItemCount === 0} autoIcon={false}>
                    <span className="inline-flex items-center gap-1.5"><ListChecks className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />انتخاب ردیف‌های کامل</span>
                  </Button>
                  {selectedCount > 0 ? (
                    <Button type="button" size="xs" variant="ghost" onClick={clearReviewSelection} disabled={saving} autoIcon={false}>لغو انتخاب‌ها</Button>
                  ) : null}
                  <Button type="button" size="xs" variant="secondary" onClick={addManualReviewItem} autoIcon={false}>
                    <span className="inline-flex items-center gap-1.5"><Plus className="h-3.5 w-3.5 shrink-0" strokeWidth={2.5} aria-hidden="true" />افزودن ردیف دستی</span>
                  </Button>
                  <span className="rounded-full border border-sky-200 bg-sky-50 px-2.5 py-1.5 text-[10px] font-black text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                    {selectedCount.toLocaleString('fa-IR')} ردیف انتخاب‌شده
                  </span>
                </div>
              </div>

              <div className="mt-4 max-h-[36rem] space-y-3 overflow-y-auto pl-1">
                {feedReview.items.map((item) => {
                  const confidence = confidenceMeta[item.confidence];
                  return (
                    <div key={item.id} className={`rounded-[20px] border p-3.5 transition ${item.approved ? 'border-sky-300 bg-sky-50/45 dark:border-sky-800 dark:bg-sky-950/15' : 'border-slate-200 bg-slate-50/55 dark:border-slate-800 dark:bg-slate-900/35'}`}>
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="flex min-w-0 items-start gap-2.5">
                          <ToggleSwitch checked={Boolean(item.approved)} onCheckedChange={(checked) => updateReviewItem(item.id, { approved: checked })} size="sm" ariaLabel={`انتخاب ردیف ${item.lineNumber}`} />
                          <span className="min-w-0">
                            <span className="block text-[11px] font-black text-slate-800 dark:text-slate-200">ردیف {item.lineNumber.toLocaleString('fa-IR')}</span>
                            <span className="mt-0.5 block truncate text-[9px] text-slate-500 dark:text-slate-400" title={item.rawLine}>{item.rawLine}</span>
                          </span>
                        </div>
                        <span className={`w-fit rounded-full border px-2.5 py-1 text-[9px] font-black ${confidence.cls}`}>{confidence.label}</span>
                      </div>

                      <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-6">
                        <TextField label="مدل گوشی" icon={<i className="fa-solid fa-mobile-screen" />} wrapperClassName="sm:col-span-2 xl:col-span-2" value={item.model || ''} onChange={(event) => updateReviewItem(item.id, { model: event.target.value })} placeholder="مثلاً A57" className={compactFieldClass} />
                        <TextField label="حافظه" icon={<i className="fa-solid fa-hard-drive" />} value={item.storage || ''} onChange={(event) => updateReviewItem(item.id, { storage: event.target.value })} placeholder="256G" className={compactFieldClass} />
                        <TextField label="RAM" icon={<i className="fa-solid fa-microchip" />} value={item.ram || ''} onChange={(event) => updateReviewItem(item.id, { ram: event.target.value })} placeholder="R8" className={compactFieldClass} />
                        <SelectField label="نوع قیمت" icon={<Tag className="h-4 w-4" />} value={item.priceType} onChange={(event) => updateReviewItem(item.id, { priceType: event.target.value as 'purchase' | 'sale' })} className={compactFieldClass}>
                            <option value="purchase">خرید</option>
                            <option value="sale">فروش</option>
                        </SelectField>
                        <TextField label="مبلغ تومان" icon={<i className="fa-solid fa-money-bill-wave" />} inputMode="numeric" value={item.priceToman ?? ''} onChange={(event) => updateReviewItem(item.id, { priceToman: Number(event.target.value.replace(/,/g, '')) || null })} placeholder="77200000" className={compactFieldClass} />
                      </div>

                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-4">
                        <TextField label="رنگ" icon={<i className="fa-solid fa-palette" />} value={item.color || ''} onChange={(event) => updateReviewItem(item.id, { color: event.target.value || null })} placeholder="تمام رنگ‌ها" className={compactFieldClass} />
                        <SelectField label="رجیستری" icon={<ShieldCheck className="h-4 w-4" />} value={item.registrationStatus} onChange={(event) => updateReviewItem(item.id, { registrationStatus: event.target.value as SupplierFeedReviewItem['registrationStatus'] })} className={compactFieldClass}>
                            <option value="unknown">نامشخص</option>
                            <option value="unregistered">بدون کد/رجیستر نشده</option>
                            <option value="registered">رجیستر شده</option>
                        </SelectField>
                        <SelectField label="فعال‌سازی" icon={<i className="fa-solid fa-power-off" />} value={item.activationStatus} onChange={(event) => updateReviewItem(item.id, { activationStatus: event.target.value as SupplierFeedReviewItem['activationStatus'] })} className={compactFieldClass}>
                            <option value="unknown">نامشخص</option>
                            <option value="not-activated">نات اکتیو</option>
                            <option value="active">اکتیو</option>
                        </SelectField>
                        <TextField label="کشور / کد" icon={<Radio className="h-4 w-4" />} value={item.partNumber || ''} onChange={(event) => updateReviewItem(item.id, { partNumber: event.target.value || null })} placeholder="VIT یا CH" className={`${compactFieldClass} uppercase`} />
                      </div>

                      {item.reviewReasons.length > 0 ? (
                        <div className="mt-2 rounded-[12px] border border-amber-200 bg-amber-50 px-2.5 py-2 text-[9px] leading-5 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/25 dark:text-amber-300">
                          <CircleAlert className="ml-1.5 inline h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
                          {item.reviewReasons.join(' • ')}
                        </div>
                      ) : null}
                    </div>
                  );
                })}
              </div>

              <Button type="button" size="sm" onClick={approveFeed} disabled={saving || feedReview.items.length === 0} autoIcon={false} className="mt-4 w-full justify-center">
                <span className="inline-flex items-center gap-2"><CheckCheck className="h-4 w-4 shrink-0" strokeWidth={2.4} aria-hidden="true" />{saving ? 'در حال ثبت…' : `تأیید و ثبت ${selectedCount.toLocaleString('fa-IR')} ردیف قیمت`}</span>
              </Button>
            </div>
          ) : null}
        </div>
      ) : null}

      {message ? (
        <div className="border-t border-slate-200 bg-sky-50/70 px-4 py-3 text-[11px] leading-6 text-sky-800 dark:border-slate-800 dark:bg-sky-950/20 dark:text-sky-200 sm:px-5">
          <Info className="ml-1.5 inline h-3.5 w-3.5" strokeWidth={2.4} aria-hidden="true" />
          {message}
        </div>
      ) : null}

      <div className="border-t border-slate-200/80 bg-slate-50/60 px-4 py-3 text-[10px] leading-5 text-slate-500 dark:border-slate-800 dark:bg-slate-900/40 dark:text-slate-400 sm:px-5">
        <ShieldCheck className="ml-1.5 inline h-3.5 w-3.5 text-slate-600 dark:text-slate-300" strokeWidth={2.4} aria-hidden="true" />
        فایل و متن اصلی برای ردگیری نگهداری می‌شوند؛ فقط قیمت‌های تأییدشده وارد مرجع تأمین‌کنندگان می‌شوند و قیمت فرم را خودکار تغییر نمی‌دهد.
      </div>
    </section>
  );
};

export default PhoneMarketEvidencePanel;
