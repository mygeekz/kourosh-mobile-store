import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../../utils/feedback';

type LegacyPartner = {
  id: number;
  partnerName: string;
  partnerType: string;
  phoneCount: number;
  productCount: number;
  isLinked: number;
  linkedStorePartnerId?: number | null;
  linkedStorePartnerName?: string | null;
};

type StorePartner = {
  id: number;
  name: string;
  code?: string | null;
  colorTag?: string | null;
  notes?: string | null;
  isActive: number;
  legacyLinks: Array<{ legacyPartnerId: number; legacyPartnerName: string; linkType: string }>;
};

type ProfileItem = {
  storePartnerId: number;
  partnerName: string;
  sharePercent: number;
  roleLabel?: string | null;
};

type ProfitShareProfile = {
  id: number;
  title: string;
  isDefault: number;
  items: ProfileItem[];
};

type OwnershipProfile = {
  id: number;
  title: string;
  ownershipType: string;
  isDefault: number;
  items: ProfileItem[];
};

type Coverage = {
  phones: { total: number; mapped: number };
  products: { total: number; mapped: number };
  ownershipProfiles: number;
  activeStorePartners: number;
};

type BackfillMissingExample = Record<string, unknown>;

type BackfillPreview = {
  phones: { readyCount: number; missingCount: number; alreadyMappedCount: number; missingExamples: BackfillMissingExample[] };
  products: { readyCount: number; missingCount: number; alreadyMappedCount: number; missingExamples: BackfillMissingExample[] };
};

type ReviewQueueItem = {
  id: number;
  supplierId?: number | null;
  legacyPartnerName?: string | null;
  candidateOwnershipProfileId?: number | null;
  candidateReason?: string | null;
  model?: string | null;
  imei?: string | null;
  name?: string | null;
  stock_quantity?: number | null;
  purchasePrice?: number | null;
  salePrice?: number | null;
  selling_price?: number | null;
};

type ReviewQueue = {
  phones: { total: number; items: ReviewQueueItem[] };
  products: { total: number; items: ReviewQueueItem[] };
};

type ViewTab = 'overview' | 'partners' | 'rules' | 'ownership' | 'review' | 'reports';
const ownershipTabs: ViewTab[] = ['overview', 'partners', 'rules', 'ownership', 'review', 'reports'];
const normalizeOwnershipTab = (value: string | null): ViewTab => ownershipTabs.includes(value as ViewTab) ? (value as ViewTab) : 'overview';
const readInitialOwnershipTab = (): ViewTab => {
  if (typeof window === 'undefined') return 'overview';
  const params = new URLSearchParams(window.location.search);
  return normalizeOwnershipTab(params.get('tab'));
};


type PartnerCardData = {
  id: number;
  name: string;
  sharePercent: number;
  roleLabel: string;
  linkedCount: number;
  ownershipShare: number;
  note?: string | null;
};

const shellCard = 'rounded-[28px] border border-slate-200/80 bg-white/95 shadow-[0_24px_60px_-42px_rgba(15,23,42,0.28)] dark:border-slate-800/80 dark:bg-slate-900/95';
const sectionCard = `${shellCard} p-5 md:p-6`;
const softCard = 'rounded-[22px] border border-slate-200/80 bg-slate-50/90 p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950/60';
const buttonPrimary = 'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] bg-indigo-600 px-4 py-2.5 text-sm font-black text-white shadow-[0_18px_34px_-22px_rgba(79,70,229,0.7)] transition hover:-translate-y-0.5 hover:bg-indigo-500 disabled:cursor-not-allowed disabled:opacity-50';
const buttonSecondary = 'inline-flex min-h-[46px] items-center justify-center gap-2 rounded-[18px] border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-indigo-200 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:text-white';
const buttonGhost = 'inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[16px] border border-slate-200/80 bg-slate-50/90 px-3.5 py-2 text-sm font-bold text-slate-700 transition hover:border-indigo-200 hover:bg-indigo-50 hover:text-indigo-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200 dark:hover:border-slate-600 dark:hover:bg-slate-900';
const inputClass = 'w-full rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm text-slate-800 outline-none transition    dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100  ';

const numberFa = (value: number | string) => Number(value || 0).toLocaleString('fa-IR');
const percentFa = (value: number | string) => `${numberFa(Number(value || 0))}٪`;
const clamp = (value: number, min = 0, max = 100) => Math.max(min, Math.min(max, value));
const normalizeShareNumber = (value: number) => Number(Math.max(0, Math.min(100, value)).toFixed(2));
const shareInputValue = (value: number) => {
  const normalized = normalizeShareNumber(value);
  return Number.isInteger(normalized) ? String(normalized) : normalized.toFixed(2).replace(/0+$/, '').replace(/\.$/, '');
};

const ownershipTypeLabel = (value?: string) => {
  if (value === 'store') return 'مالکیت تجمیعی فروشگاه';
  if (value === 'personal') return 'مالکیت شخصی';
  if (value === 'shared') return 'مالکیت مشترک';
  return 'الگوی مالکیت';
};

const partnerRoleFallback = (index: number) => {
  const labels = ['مدیر اجرایی', 'شریک سرمایه‌گذار', 'شریک عملیاتی', 'عضو شراکت'];
  return labels[index] || 'عضو ساختار';
};

const toneClasses = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-900/60 dark:bg-blue-950/30 dark:text-blue-200',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-200',
  amber: 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200',
  violet: 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200',
  rose: 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-200',
  slate: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200',
} as const;

const ProgressRow: React.FC<{ label: string; value: number; tone?: keyof typeof toneClasses }> = ({ label, value, tone = 'emerald' }) => (
  <div className="space-y-2">
    <div className="flex items-center justify-between gap-3 text-sm">
      <span className="font-bold text-slate-600 dark:text-slate-300">{label}</span>
      <span className="font-black text-slate-900 dark:text-white">{percentFa(Math.round(value))}</span>
    </div>
    <div className="h-2.5 overflow-hidden rounded-full bg-slate-200 dark:bg-slate-800">
      <div
        className={`h-full rounded-full ${tone === 'amber' ? 'bg-amber-500' : tone === 'blue' ? 'bg-blue-500' : tone === 'violet' ? 'bg-violet-500' : 'bg-emerald-500'}`}
        style={{ width: `${clamp(value)}%` }}
      />
    </div>
  </div>
);

const StatCard: React.FC<{ title: string; value: string; helper?: string; icon: string; tone?: keyof typeof toneClasses }> = ({ title, value, helper, icon, tone = 'blue' }) => (
  <div className={`${sectionCard} p-4 md:p-5`}>
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{title}</div>
        <div className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</div>
        {helper ? <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{helper}</div> : null}
      </div>
      <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-lg ${toneClasses[tone]}`}>
        <i className={`fa-solid ${icon}`} />
      </span>
    </div>
  </div>
);

const SectionBlock: React.FC<{ id?: string; title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ id, title, description, action, children }) => (
  <section id={id} className={sectionCard}>
    <div className="mb-5 flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
      <div>
        <h2 className="text-lg font-black text-slate-900 dark:text-white">{title}</h2>
        {description ? <p className="mt-1.5 text-sm leading-7 text-slate-600 dark:text-slate-300">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    {children}
  </section>
);

const StoreOwnershipPage: React.FC = () => {
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<ViewTab>(() => readInitialOwnershipTab());

  const [legacyPartners, setLegacyPartners] = useState<LegacyPartner[]>([]);
  const [storePartners, setStorePartners] = useState<StorePartner[]>([]);
  const [profitProfiles, setProfitProfiles] = useState<ProfitShareProfile[]>([]);
  const [ownershipProfiles, setOwnershipProfiles] = useState<OwnershipProfile[]>([]);
  const [coverage, setCoverage] = useState<Coverage | null>(null);
  const [preview, setPreview] = useState<BackfillPreview | null>(null);
  const [reviewQueue, setReviewQueue] = useState<ReviewQueue | null>(null);

  const [selectedLegacyIds, setSelectedLegacyIds] = useState<number[]>([]);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerLegacyId, setNewPartnerLegacyId] = useState<string>('');
  const [shareDraft, setShareDraft] = useState<Record<number, string>>({});
  const [selectedPhoneReviewIds, setSelectedPhoneReviewIds] = useState<number[]>([]);
  const [selectedProductReviewIds, setSelectedProductReviewIds] = useState<number[]>([]);
  const [phoneAssignProfileId, setPhoneAssignProfileId] = useState<string>('');
  const [productAssignProfileId, setProductAssignProfileId] = useState<string>('');
  const [reviewNotes, setReviewNotes] = useState('');

  const fetchAll = async () => {
    setLoading(true);
    setError(null);
    try {
      const [legacyRes, storeRes, profitRes, ownershipRes, coverageRes, previewRes, reviewRes] = await Promise.all([
        apiFetch('/api/store-ownership/legacy-partners').then((r) => parseApiResult<{ success: boolean; data: LegacyPartner[] }>(r, { endpoint: '/api/store-ownership/legacy-partners', action: 'دریافت همکاران قدیمی' })),
        apiFetch('/api/store-ownership/store-partners').then((r) => parseApiResult<{ success: boolean; data: StorePartner[] }>(r, { endpoint: '/api/store-ownership/store-partners', action: 'دریافت شرکای فروشگاه' })),
        apiFetch('/api/store-ownership/profit-share-profiles').then((r) => parseApiResult<{ success: boolean; data: ProfitShareProfile[] }>(r, { endpoint: '/api/store-ownership/profit-share-profiles', action: 'دریافت پروفایل‌های سود' })),
        apiFetch('/api/store-ownership/ownership-profiles').then((r) => parseApiResult<{ success: boolean; data: OwnershipProfile[] }>(r, { endpoint: '/api/store-ownership/ownership-profiles', action: 'دریافت پروفایل‌های مالکیت' })),
        apiFetch('/api/store-ownership/coverage').then((r) => parseApiResult<{ success: boolean; data: Coverage }>(r, { endpoint: '/api/store-ownership/coverage', action: 'دریافت پوشش مالکیت' })),
        apiFetch('/api/store-ownership/backfill/preview').then((r) => parseApiResult<{ success: boolean; data: BackfillPreview }>(r, { endpoint: '/api/store-ownership/backfill/preview', action: 'پیش‌نمایش همگام‌سازی سوابق' })),
        apiFetch('/api/store-ownership/review-queue').then((r) => parseApiResult<{ success: boolean; data: ReviewQueue }>(r, { endpoint: '/api/store-ownership/review-queue', action: 'صف بازبینی مالکیت' })),
      ]);

      const storePartnerRows = storeRes.data || [];
      const defaultProfile = (profitRes.data || []).find((profile) => Number(profile.isDefault) === 1) || (profitRes.data || [])[0] || null;
      const nextDraft: Record<number, string> = {};
      storePartnerRows.forEach((partner) => {
        const item = defaultProfile?.items?.find((profileItem) => Number(profileItem.storePartnerId) === Number(partner.id));
        nextDraft[partner.id] = item ? String(item.sharePercent) : '';
      });

      setLegacyPartners(legacyRes.data || []);
      setStorePartners(storePartnerRows);
      setProfitProfiles(profitRes.data || []);
      setOwnershipProfiles(ownershipRes.data || []);
      setCoverage(coverageRes.data || null);
      setPreview(previewRes.data || null);
      setReviewQueue(reviewRes.data || null);
      setShareDraft(nextDraft);
      setSelectedLegacyIds((legacyRes.data || []).filter((item) => !item.isLinked && (item.phoneCount > 0 || item.productCount > 0)).map((item) => item.id));
    } catch (err: unknown) {
      setError(humanizeErrorMessage(err instanceof Error ? err.message : err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAll();
  }, []);

  const canBootstrap = selectedLegacyIds.length > 0;
  const mappedPctPhones = useMemo(() => coverage?.phones.total ? Math.round((coverage.phones.mapped / coverage.phones.total) * 100) : 0, [coverage]);
  const mappedPctProducts = useMemo(() => coverage?.products.total ? Math.round((coverage.products.mapped / coverage.products.total) * 100) : 0, [coverage]);
  const activeStorePartners = useMemo(() => storePartners.filter((partner) => partner.isActive), [storePartners]);
  const totalShareDraft = useMemo(() => Number(activeStorePartners.reduce((sum, partner) => sum + (Number(shareDraft[partner.id] || 0) || 0), 0).toFixed(2)), [activeStorePartners, shareDraft]);
  const shareDelta = useMemo(() => Number((100 - totalShareDraft).toFixed(2)), [totalShareDraft]);
  const isShareTotalValid = activeStorePartners.length > 0 && Math.abs(totalShareDraft - 100) <= 0.01;

  const defaultProfitProfile = useMemo(() => profitProfiles.find((item) => Number(item.isDefault) === 1) || profitProfiles[0] || null, [profitProfiles]);
  const defaultOwnershipProfile = useMemo(() => ownershipProfiles.find((item) => Number(item.isDefault) === 1) || ownershipProfiles[0] || null, [ownershipProfiles]);

  const totalReviewCount = (reviewQueue?.phones.total || 0) + (reviewQueue?.products.total || 0);
  const reviewSelectionCount = selectedPhoneReviewIds.length + selectedProductReviewIds.length;
  const totalReadyBackfill = (preview?.phones.readyCount || 0) + (preview?.products.readyCount || 0);
  const totalMissingBackfill = (preview?.phones.missingCount || 0) + (preview?.products.missingCount || 0);
  const shareIntegrity = storePartners.length ? clamp(100 - Math.round(Math.abs(100 - totalShareDraft) * 4)) : 0;
  const coverageBlend = Math.round((mappedPctPhones + mappedPctProducts) / 2);
  const assignmentHealth = totalReviewCount === 0 ? 100 : clamp(100 - Math.round(totalReviewCount * 1.8));

  const partnerCards = useMemo<PartnerCardData[]>(() => {
    return storePartners.map((partner, index) => {
      const shareItem = defaultProfitProfile?.items?.find((item) => Number(item.storePartnerId) === Number(partner.id));
      const ownershipItem = defaultOwnershipProfile?.items?.find((item) => Number(item.storePartnerId) === Number(partner.id));
      return {
        id: partner.id,
        name: partner.name,
        sharePercent: Number(shareItem?.sharePercent ?? shareDraft[partner.id] ?? 0),
        roleLabel: shareItem?.roleLabel || ownershipItem?.roleLabel || partnerRoleFallback(index),
        linkedCount: partner.legacyLinks?.length || 0,
        ownershipShare: Number(ownershipItem?.sharePercent ?? shareItem?.sharePercent ?? 0),
        note: partner.notes,
      };
    }).sort((a, b) => b.sharePercent - a.sharePercent);
  }, [storePartners, defaultProfitProfile, defaultOwnershipProfile, shareDraft]);

  const donutSegments = useMemo(() => {
    const palette = ['#2563eb', '#16a34a', '#f59e0b', '#8b5cf6', '#ec4899'];
    let start = 0;
    return partnerCards.filter((item) => item.sharePercent > 0).map((item, index) => {
      const end = start + item.sharePercent;
      const segment = { ...item, color: palette[index % palette.length], start, end };
      start = end;
      return segment;
    });
  }, [partnerCards]);

  const donutBackground = useMemo(() => {
    if (!donutSegments.length) return 'conic-gradient(#cbd5e1 0% 100%)';
    return `conic-gradient(${donutSegments.map((segment) => `${segment.color} ${segment.start}% ${segment.end}%`).join(', ')})`;
  }, [donutSegments]);

  const suggestionItems = useMemo(() => {
    const items: Array<{ text: string; tone: keyof typeof toneClasses; icon: string }> = [];
    if (!storePartners.length) items.push({ text: 'هنوز هیچ شریک فعالی ثبت اطلاعات نشده است؛ ابتدا هسته شراکت را ایجاد کنید.', tone: 'amber', icon: 'fa-user-plus' });
    if (Math.abs(100 - totalShareDraft) > 0.01) items.push({ text: 'جمع درصدهای پروفایل پیش‌فرض هنوز به ۱۰۰٪ نرسیده و نیاز به اصلاح دارد.', tone: 'violet', icon: 'fa-scale-balanced' });
    if (totalReviewCount > 0) items.push({ text: `${numberFa(totalReviewCount)} مورد در صف بازبینی منتظر تصمیم است.`, tone: 'amber', icon: 'fa-list-check' });
    if (totalMissingBackfill > 0) items.push({ text: `${numberFa(totalMissingBackfill)} سابقه قدیمی هنوز فاقد الگوی مالکیت است.`, tone: 'blue', icon: 'fa-link-slash' });
    if (items.length === 0) items.push({ text: 'ساختار شراکت پایدار است و اقدام فوری در این لحظه نیاز نیست.', tone: 'emerald', icon: 'fa-circle-check' });
    return items.slice(0, 4);
  }, [storePartners.length, totalShareDraft, totalReviewCount, totalMissingBackfill]);

  const insightTimeline = useMemo(() => {
    return [
      { title: defaultProfitProfile ? `پروفایل پیش‌فرض سود: ${defaultProfitProfile.title}` : 'پروفایل پیش‌فرض سود هنوز تعریف نشده است', time: defaultProfitProfile ? 'وضعیت جاری' : 'نیازمند تنظیم', icon: 'fa-scale-balanced' },
      { title: `${numberFa(totalReadyBackfill)} رکورد آماده همگام‌سازی خودکار شناسایی شد`, time: 'پیش‌نمایش داده', icon: 'fa-arrows-rotate' },
      { title: `${numberFa(totalReviewCount)} مورد منتظر بازبینی انسانی است`, time: reviewSelectionCount > 0 ? `${numberFa(reviewSelectionCount)} مورد انتخاب شده` : 'صف بازبینی', icon: 'fa-clock-rotate-left' },
      { title: `پوشش مالکیت موجودی اکنون ${percentFa(coverageBlend)} است`, time: 'خلاصه سلامت ساختار', icon: 'fa-chart-pie' },
    ];
  }, [defaultProfitProfile, totalReadyBackfill, totalReviewCount, reviewSelectionCount, coverageBlend]);

  const handleBootstrap = async () => {
    setSubmitting(true);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ legacyPartnerIds: selectedLegacyIds }),
        }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/bootstrap', action: 'ایجاد هسته مالکیت فروشگاه' })),
        {
          loading: 'در حال ساخت هسته شراکت و اتصال هوشمند داده‌های قبلی...',
          success: 'هسته شراکت با موفقیت ایجاد شد و انتساب‌های قابل تشخیص اعمال شدند.'
        }
      );
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleApplyBackfill = async () => {
    setSubmitting(true);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/backfill/apply', { method: 'POST' }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/backfill/apply', action: 'اعمال همگام‌سازی سوابق مالکیت' })),
        {
          loading: 'در حال اعمال همگام‌سازی مالکیت برای سوابق قبلی...',
          success: 'همگام‌سازی سوابق مالکیت با موفقیت انجام شد.'
        }
      );
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCreateStorePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPartnerName.trim()) return;
    setSubmitting(true);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/store-partners', {
          method: 'POST',
          body: JSON.stringify({ name: newPartnerName.trim(), legacyPartnerId: newPartnerLegacyId ? Number(newPartnerLegacyId) : null }),
        }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/store-partners', action: 'ایجاد شریک جدید' })),
        { loading: 'در حال ثبت اطلاعات شریک جدید...', success: 'شریک جدید با موفقیت ثبت شد.' }
      );
      setNewPartnerName('');
      setNewPartnerLegacyId('');
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  };

  const applyEqualSharePreset = () => {
    if (!activeStorePartners.length) return;
    const base = Math.floor((100 / activeStorePartners.length) * 100) / 100;
    let remainder = Number((100 - base * activeStorePartners.length).toFixed(2));
    const next: Record<number, string> = { ...shareDraft };
    activeStorePartners.forEach((partner, index) => {
      const value = index === activeStorePartners.length - 1 ? Number((base + remainder).toFixed(2)) : base;
      next[partner.id] = shareInputValue(value);
    });
    setShareDraft(next);
    setError(null);
  };

  const normalizeSharesToHundred = () => {
    if (!activeStorePartners.length) return;
    const positivePartners = activeStorePartners.filter((partner) => Number(shareDraft[partner.id] || 0) > 0);
    if (!positivePartners.length) {
      applyEqualSharePreset();
      return;
    }
    const currentTotal = positivePartners.reduce((sum, partner) => sum + (Number(shareDraft[partner.id] || 0) || 0), 0);
    if (currentTotal <= 0) {
      applyEqualSharePreset();
      return;
    }
    const next: Record<number, string> = { ...shareDraft };
    let running = 0;
    positivePartners.forEach((partner, index) => {
      const value = index === positivePartners.length - 1
        ? Number((100 - running).toFixed(2))
        : normalizeShareNumber((Number(shareDraft[partner.id] || 0) / currentTotal) * 100);
      running = Number((running + value).toFixed(2));
      next[partner.id] = shareInputValue(value);
    });
    activeStorePartners
      .filter((partner) => !positivePartners.some((item) => item.id === partner.id))
      .forEach((partner) => { next[partner.id] = ''; });
    setShareDraft(next);
    setError(null);
  };

  const handleSaveStoreConfig = async () => {
    if (!isShareTotalValid) {
      setError(`جمع سهم شرکا باید دقیقاً ۱۰۰٪ باشد؛ مقدار فعلی ${percentFa(totalShareDraft)} است.`);
      setActiveTab('rules');
      return;
    }

    const items = storePartners
      .filter((partner) => partner.isActive)
      .map((partner, index) => ({
        storePartnerId: partner.id,
        sharePercent: Number(shareDraft[partner.id] || 0),
        sortOrder: index,
      }))
      .filter((item) => item.sharePercent > 0);

    setSubmitting(true);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/configuration', {
          method: 'PUT',
          body: JSON.stringify({
            storePartnerId: null,
            items,
          }),
        }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/configuration', action: 'ذخیره تغییرات ساختار تسهیم سود' })),
        {
          loading: 'در حال ذخیره تغییرات ساختار تسهیم سود...',
          success: 'ساختار پیش‌فرض مالکیت و تسهیم سود با موفقیت ذخیره شد.'
        }
      );
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  };

  const handleAssignReviewItems = async (targetType: 'phones' | 'products') => {
    const ids = targetType === 'phones' ? selectedPhoneReviewIds : selectedProductReviewIds;
    const ownershipProfileId = Number(targetType === 'phones' ? phoneAssignProfileId : productAssignProfileId);
    if (!ids.length || !ownershipProfileId) return;
    setSubmitting(true);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/review-queue/assign', {
          method: 'POST',
          body: JSON.stringify({ targetType, ids, ownershipProfileId, notes: reviewNotes.trim() || null }),
        }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/review-queue/assign', action: 'ثبت اطلاعات انتساب دستی مالکیت' })),
        {
          loading: 'در حال ثبت اطلاعات تصمیم و انتساب دستی...',
          success: 'موارد انتخاب‌شده با موفقیت به الگوی مالکیت متصل شدند.'
        }
      );
      if (targetType === 'phones') setSelectedPhoneReviewIds([]);
      else setSelectedProductReviewIds([]);
      await fetchAll();
    } finally {
      setSubmitting(false);
    }
  };

  const jumpToTab = (tab: ViewTab) => {
    setActiveTab(tab);
    if (typeof window !== 'undefined') {
      const nextUrl = new URL(window.location.href);
      nextUrl.searchParams.set('tab', tab);
      window.history.replaceState(null, '', `${nextUrl.pathname}${nextUrl.search}${nextUrl.hash}`);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  };

  useEffect(() => {
    if (typeof window === 'undefined') return;
    const params = new URLSearchParams(window.location.search);
    const requestedTab = normalizeOwnershipTab(params.get('tab'));
    if (requestedTab !== activeTab) setActiveTab(requestedTab);
    if (window.location.hash) {
      const target = window.location.hash.slice(1);
      const timer = window.setTimeout(() => {
        document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 180);
      return () => window.clearTimeout(timer);
    }
  }, [activeTab]);

  const renderOverview = () => (
    <div className="space-y-6">
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
        <StatCard title="شرکای فعال" value={numberFa(coverage?.activeStorePartners ?? 0)} helper="اعضای حاضر در ساختار مالکیت" icon="fa-users" tone="violet" />
        <StatCard title="پوشش مالکیت موجودی" value={percentFa(coverageBlend)} helper={`${numberFa(coverage?.phones.mapped ?? 0)} گوشی + ${numberFa(coverage?.products.mapped ?? 0)} کالا`} icon="fa-chart-pie" tone="blue" />
        <StatCard title="آیتم‌های نیازمند بررسی و ادامه" value={numberFa(totalReviewCount)} helper="پرونده‌های منتظر تصمیم" icon="fa-list-check" tone="amber" />
        <StatCard title="الگوهای فعال" value={numberFa(profitProfiles.length)} helper="پروفایل‌های تسهیم سود" icon="fa-scale-balanced" tone="emerald" />
        <StatCard title="رکوردهای آماده همگام‌سازی" value={numberFa(totalReadyBackfill)} helper="سوابقی که آماده backfill هستند" icon="fa-arrows-rotate" tone="blue" />
      </section>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1.5fr)_340px]">
        <div className="space-y-6">
          <SectionBlock
            id="overview-partners"
            title="ساختار شرکا"
            description="ترکیب فعلی ساختار شراکت، سهم سود پیش‌فرض و پوشش هر شریک را در یک نمای سریع ببینید."
          >
            {partnerCards.length === 0 ? (
              <div className={`${softCard} text-sm font-bold text-slate-500 dark:text-slate-400`}>
                هنوز شریکی برای ساختار جدید ثبت اطلاعات نشده است. از میانبر «ایجاد شریک جدید» شروع کنید.
              </div>
            ) : (
              <div className="grid gap-4 lg:grid-cols-3">
                {partnerCards.map((partner, index) => {
                  const tones = ['blue', 'emerald', 'amber', 'violet'] as Array<keyof typeof toneClasses>;
                  const tone = tones[index % tones.length];
                  return (
                    <div key={partner.id} className={softCard}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-lg font-black text-slate-900 dark:text-white">{partner.name}</div>
                          <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{partner.roleLabel}</div>
                        </div>
                        <span className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl border text-lg ${toneClasses[tone]}`}>
                          <i className="fa-solid fa-user" />
                        </span>
                      </div>
                      <div className="mt-5 grid grid-cols-[auto_1fr] items-baseline gap-x-3 gap-y-2">
                        <div className="text-3xl font-black text-slate-900 dark:text-white">{percentFa(partner.sharePercent)}</div>
                        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">سهم سود پیش‌فرض</div>
                      </div>
                      <div className="mt-4 space-y-3">
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/80">
                          <span className="font-bold text-slate-500 dark:text-slate-400">اتصال‌های قدیمی</span>
                          <span className="font-black text-slate-900 dark:text-white">{numberFa(partner.linkedCount)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/80">
                          <span className="font-bold text-slate-500 dark:text-slate-400">سهم از موجودی</span>
                          <span className="font-black text-slate-900 dark:text-white">{percentFa(partner.ownershipShare)}</span>
                        </div>
                        <div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-3 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/80">
                          <span className="font-bold text-slate-500 dark:text-slate-400">وضعیت</span>
                          <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-xs font-black ${partner.sharePercent > 0 ? toneClasses.emerald : toneClasses.amber}`}>
                            <i className={`fa-solid ${partner.sharePercent > 0 ? 'fa-circle-check' : 'fa-clock'}`} />
                            {partner.sharePercent > 0 ? 'فعال' : 'نیازمند تنظیم'}
                          </span>
                        </div>
                      </div>
                      {partner.note ? <div className="mt-4 text-xs leading-6 text-slate-500 dark:text-slate-400">{partner.note}</div> : null}
                    </div>
                  );
                })}
              </div>
            )}
          </SectionBlock>

          <div className="grid gap-6 xl:grid-cols-[1.1fr_0.9fr]">
            <SectionBlock
              id="overview-distribution"
              title="پروفایل پیش‌فرض تسهیم سود"
              description={defaultProfitProfile ? `قاعده فعال فعلی با عنوان «${defaultProfitProfile.title}» اجرا می‌شود.` : 'برای ساخت تسهیم سود پیش‌فرض، ساختار درصدها را در تب قواعد ذخیره تغییرات کنید.'}
              action={<button type="button" className={buttonGhost} onClick={() => jumpToTab('rules')}><i className="fa-solid fa-sliders" /> تنظیم درصدها</button>}
            >
              <div className="grid gap-6 lg:grid-cols-[0.95fr_1.05fr] lg:items-center">
                <div className="space-y-3">
                  {donutSegments.length ? donutSegments.map((segment) => (
                    <div key={segment.id} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-white/90 px-4 py-3 text-sm dark:border-slate-800 dark:bg-slate-900/80">
                      <div className="flex items-center gap-3">
                        <span className="h-3.5 w-3.5 rounded-full" style={{ backgroundColor: segment.color }} />
                        <div>
                          <div className="font-black text-slate-900 dark:text-white">{segment.name}</div>
                          <div className="mt-0.5 text-xs font-bold text-slate-500 dark:text-slate-400">{segment.roleLabel}</div>
                        </div>
                      </div>
                      <div className="text-sm font-black text-slate-900 dark:text-white">{percentFa(segment.sharePercent)}</div>
                    </div>
                  )) : <div className={`${softCard} text-sm font-bold text-slate-500 dark:text-slate-400`}>هنوز ترکیب درصدی تعریف نشده است.</div>}
                </div>
                <div className="flex items-center justify-center">
                  <div className="relative flex h-[260px] w-[260px] items-center justify-center rounded-full border border-slate-200 bg-white shadow-inner dark:border-slate-800 dark:bg-slate-950" style={{ background: donutBackground }}>
                    <div className="flex h-[118px] w-[118px] flex-col items-center justify-center rounded-full border border-slate-200 bg-white text-center dark:border-slate-800 dark:bg-slate-950">
                      <i className="fa-solid fa-users text-xl text-slate-500 dark:text-slate-400" />
                      <div className="mt-2 text-xs font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">DEFAULT</div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{defaultProfitProfile?.title || 'تعریف نشده'}</div>
                    </div>
                  </div>
                </div>
              </div>
            </SectionBlock>

            <SectionBlock
              id="overview-rules"
              title="قواعد فعال تسهیم سود"
              description="نمای فشرده‌ای از قواعد سود و الگوهای مالکیت فعال برای تصمیم‌گیری سریع."
              action={<button type="button" className={buttonGhost} onClick={() => jumpToTab('rules')}><i className="fa-solid fa-arrow-left" /> مشاهده جزئیات</button>}
            >
              <div className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800">
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                    <thead className="bg-slate-50 dark:bg-slate-950/80">
                      <tr>
                        <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">عنوان</th>
                        <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">نوع</th>
                        <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">ترکیب سهم</th>
                        <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">وضعیت</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                      {profitProfiles.slice(0, 3).map((profile) => (
                        <tr key={`profit-profile-${profile.id}`}>
                          <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{profile.title}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">تسهیم سود</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{profile.items.map((item) => `${item.partnerName} ${item.sharePercent}%`).join('، ') || 'تعریف نشده'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${profile.isDefault ? toneClasses.violet : toneClasses.emerald}`}>
                              {profile.isDefault ? 'پیش‌فرض' : 'فعال'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {ownershipProfiles.slice(0, Math.max(0, 3 - Math.min(3, profitProfiles.length))).map((profile) => (
                        <tr key={`ownership-profile-${profile.id}`}>
                          <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{profile.title}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{ownershipTypeLabel(profile.ownershipType)}</td>
                          <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{profile.items.map((item) => `${item.partnerName} ${item.sharePercent}%`).join('، ') || 'تعریف نشده'}</td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${profile.isDefault ? toneClasses.blue : toneClasses.emerald}`}>
                              {profile.isDefault ? 'پیش‌فرض' : 'فعال'}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {!profitProfiles.length && !ownershipProfiles.length ? (
                        <tr>
                          <td colSpan={4} className="px-4 py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">
                            هنوز هیچ قاعده یا پروفایلی ثبت اطلاعات نشده است.
                          </td>
                        </tr>
                      ) : null}
                    </tbody>
                  </table>
                </div>
              </div>
            </SectionBlock>
          </div>

          <SectionBlock
            id="overview-review"
            title="صف بازبینی انتساب‌ها"
            description="اقلامی که سیستم برای آن‌ها مالکیت قطعی پیدا نکرده، قبل از نهایی‌سازی در این صف قرار می‌گیرند."
            action={<button type="button" className={buttonGhost} onClick={() => jumpToTab('review')}><i className="fa-solid fa-magnifying-glass" /> بازبینی کامل</button>}
          >
            <div className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                  <thead className="bg-slate-50 dark:bg-slate-950/80">
                    <tr>
                      <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">کالا / شناسه</th>
                      <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">منبع</th>
                      <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">پیشنهاد سیستم</th>
                      <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">وضعیت</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                    {[...(reviewQueue?.phones.items || []).slice(0, 2), ...(reviewQueue?.products.items || []).slice(0, 2)].map((item) => (
                      <tr key={`overview-review-${item.id}`}>
                        <td className="px-4 py-3">
                          <div className="font-black text-slate-900 dark:text-white">{item.model || item.name || 'شناسه نامشخص'}</div>
                          <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.imei ? `IMEI ${item.imei}` : item.name ? `ID ${numberFa(item.id)}` : `#${numberFa(item.id)}`}</div>
                        </td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.legacyPartnerName || 'بدون منبع قطعی'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{item.candidateReason || 'نیازمند بررسی و ادامه دستی'}{item.candidateOwnershipProfileId ? ` · #${item.candidateOwnershipProfileId}` : ''}</td>
                        <td className="px-4 py-3">
                          <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${toneClasses.amber}`}>در انتظار تصمیم</span>
                        </td>
                      </tr>
                    ))}
                    {totalReviewCount === 0 ? (
                      <tr>
                        <td colSpan={4} className="px-4 py-8 text-center text-sm font-bold text-emerald-600 dark:text-emerald-300">هیچ موردی در صف بازبینی وجود ندارد.</td>
                      </tr>
                    ) : null}
                  </tbody>
                </table>
              </div>
            </div>
          </SectionBlock>
        </div>

        <aside className="space-y-6">
          <SectionBlock title="سلامت ساختار شراکت" description="این شاخص‌ها به شما کمک می‌کنند ثبات ساختار، تعادل درصدها و کیفیت داده‌ها را به‌سرعت ارزیابی کنید.">
            <div className="space-y-4">
              <ProgressRow label="تعادل درصدها" value={shareIntegrity} tone={shareIntegrity >= 95 ? 'emerald' : 'amber'} />
              <ProgressRow label="پوشش سوابق" value={coverageBlend} tone="blue" />
              <ProgressRow label="تطابق انتساب‌ها" value={assignmentHealth} tone={assignmentHealth >= 85 ? 'emerald' : 'amber'} />
              <div className={`rounded-[18px] border px-4 py-3 text-sm font-bold ${Math.abs(100 - totalShareDraft) < 0.01 ? toneClasses.emerald : toneClasses.amber}`}>
                {Math.abs(100 - totalShareDraft) < 0.01
                  ? `جمع درصد پروفایل پیش‌فرض به‌درستی ${percentFa(totalShareDraft)} است.`
                  : `جمع درصد فعلی ${percentFa(totalShareDraft)} است و باید دقیقاً به ۱۰۰٪ برسد.`}
              </div>
            </div>
          </SectionBlock>

          <SectionBlock title="اقدام‌های پیشنهادی" description="سیستم بر اساس وضعیت فعلی داده‌ها، مهم‌ترین اقدام‌های مدیریتی را پیشنهاد می‌دهد.">
            <div className="space-y-3">
              {suggestionItems.map((item, index) => (
                <div key={`suggestion-${index}`} className="flex items-start justify-between gap-3 rounded-[20px] border border-slate-200/80 bg-white/90 px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                  <div className="flex min-w-0 items-start gap-3">
                    <span className={`mt-0.5 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border ${toneClasses[item.tone]}`}>
                      <i className={`fa-solid ${item.icon}`} />
                    </span>
                    <div className="text-sm font-bold leading-7 text-slate-700 dark:text-slate-200">{item.text}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>

          <SectionBlock title="نمای وضعیت اخیر" description="مرور سریع روی مهم‌ترین وضعیت‌های ساختار مالکیت و سود.">
            <div className="space-y-4">
              {insightTimeline.map((item, index) => (
                <div key={`timeline-${index}`} className="flex gap-3">
                  <div className="flex flex-col items-center">
                    <span className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-indigo-200 bg-indigo-50 text-indigo-600 dark:border-indigo-900/60 dark:bg-indigo-950/30 dark:text-indigo-200">
                      <i className={`fa-solid ${item.icon}`} />
                    </span>
                    {index !== insightTimeline.length - 1 ? <span className="mt-2 h-full w-px bg-slate-200 dark:bg-slate-700" /> : null}
                  </div>
                  <div className="pb-4">
                    <div className="text-sm font-black text-slate-900 dark:text-white">{item.title}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.time}</div>
                  </div>
                </div>
              ))}
            </div>
          </SectionBlock>

          <SectionBlock title="میانبرها" description="دسترسی سریع به عملیات پرتکرار این مرکز.">
            <div className="grid grid-cols-2 gap-3">
              <button type="button" className={buttonGhost} onClick={() => jumpToTab('partners')}><i className="fa-solid fa-user-plus" /> ثبت اطلاعات شریک</button>
              <button type="button" className={buttonGhost} onClick={() => jumpToTab('rules')}><i className="fa-solid fa-file-circle-plus" /> ایجاد پروفایل</button>
              <button type="button" className={buttonGhost} onClick={() => jumpToTab('review')}><i className="fa-solid fa-magnifying-glass" /> بررسی و ادامه سوابق</button>
              <Link to="/reports/partners-performance" className={buttonGhost}><i className="fa-solid fa-file-excel" /> گزارش شرکا</Link>
            </div>
          </SectionBlock>
        </aside>
      </div>
    </div>
  );

  const renderPartners = () => (
    <div className="space-y-6">
      <SectionBlock
        id="partners-bootstrap"
        title="راه‌اندازی هسته شراکت"
        description="همکاران قدیمی را که نقش شریک مالک دارند انتخاب کنید تا ساختار جدید روی آن‌ها سوار شود و ارتباط با داده‌های قبلی حفظ گردد."
        action={<button type="button" className={buttonPrimary} onClick={handleBootstrap} disabled={!canBootstrap || submitting}><i className="fa-solid fa-wand-magic-sparkles" /> ایجاد هسته اولیه</button>}
      >
        <div className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className={softCard}>
            <div className="mb-3 text-sm font-black text-slate-900 dark:text-white">همکاران قدیمی قابل اتصال</div>
            <div className="grid gap-3 md:grid-cols-2">
              {legacyPartners.map((item) => {
                const checked = selectedLegacyIds.includes(item.id);
                return (
                  <label key={item.id} className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <input
                      type="checkbox"
                      className="mt-1 h-4 w-4 rounded border-slate-300"
                      checked={checked}
                      onChange={() => setSelectedLegacyIds((prev) => checked ? prev.filter((value) => value !== item.id) : [...prev, item.id])}
                      disabled={item.isLinked === 1}
                    />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{item.partnerName}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{item.partnerType} · گوشی: {numberFa(item.phoneCount)} · لوازم: {numberFa(item.productCount)}</div>
                      {item.isLinked ? <div className="mt-2 text-xs font-black text-emerald-600 dark:text-emerald-300">به {item.linkedStorePartnerName || 'شریک جدید'} متصل شده</div> : null}
                    </div>
                  </label>
                );
              })}
            </div>
          </div>
          <div className={softCard}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div className="text-sm font-black text-slate-900 dark:text-white">پیش‌نمایش همگام‌سازی</div>
              <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${totalReadyBackfill > 0 ? toneClasses.blue : toneClasses.slate}`}>{numberFa(totalReadyBackfill)} آماده</span>
            </div>
            <div className="space-y-3 text-sm">
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="font-black text-slate-900 dark:text-white">گوشی‌ها</div>
                <div className="mt-2 text-slate-600 dark:text-slate-300">آماده همگام‌سازی: {numberFa(preview?.phones.readyCount ?? 0)}</div>
                <div className="text-slate-600 dark:text-slate-300">بدون لینک قطعی: {numberFa(preview?.phones.missingCount ?? 0)}</div>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="font-black text-slate-900 dark:text-white">کالاها و لوازم</div>
                <div className="mt-2 text-slate-600 dark:text-slate-300">آماده همگام‌سازی: {numberFa(preview?.products.readyCount ?? 0)}</div>
                <div className="text-slate-600 dark:text-slate-300">بدون لینک قطعی: {numberFa(preview?.products.missingCount ?? 0)}</div>
              </div>
              <button type="button" className={buttonSecondary} onClick={handleApplyBackfill} disabled={submitting}><i className="fa-solid fa-arrows-rotate" /> اعمال همگام‌سازی سوابق</button>
            </div>
          </div>
        </div>
      </SectionBlock>

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.1fr]">
        <SectionBlock
          id="partners-create"
          title="ثبت اطلاعات شریک جدید"
          description="در صورت نیاز، شریک تازه‌ای بسازید و آن را به رکوردهای قدیمی متصل کنید تا ساختار مالکیت یکپارچه بماند."
        >
          <form className="space-y-3" onSubmit={handleCreateStorePartner}>
            <input className={inputClass} value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} placeholder="نام شریک" />
            <select className={inputClass} value={newPartnerLegacyId} onChange={(e) => setNewPartnerLegacyId(e.target.value)}>
              <option value="">بدون اتصال به جدول قدیمی</option>
              {legacyPartners.map((item) => (
                <option key={item.id} value={item.id}>{item.partnerName}</option>
              ))}
            </select>
            <button type="submit" className={buttonPrimary} disabled={submitting || !newPartnerName.trim()}><i className="fa-solid fa-user-plus" /> ثبت اطلاعات شریک</button>
          </form>
        </SectionBlock>

        <SectionBlock
          id="partners-list"
          title="فهرست شرکای ساختار جدید"
          description="نمایش اعضای فعال ساختار شراکت و وضعیت اتصال آن‌ها به داده‌های قبلی سیستم."
        >
          <div className="overflow-hidden rounded-[22px] border border-slate-200 dark:border-slate-800">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200 text-sm dark:divide-slate-800">
                <thead className="bg-slate-50 dark:bg-slate-950/80">
                  <tr>
                    <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">شریک</th>
                    <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">وضعیت</th>
                    <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">اتصال‌های قدیمی</th>
                    <th className="px-4 py-3 text-right font-black text-slate-600 dark:text-slate-300">سهم فعلی</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
                  {storePartners.map((partner) => {
                    const currentShare = Number(shareDraft[partner.id] || 0);
                    return (
                      <tr key={partner.id}>
                        <td className="px-4 py-3 font-black text-slate-900 dark:text-white">{partner.name}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{partner.isActive ? 'فعال' : 'غیرفعال'}</td>
                        <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{partner.legacyLinks.length ? partner.legacyLinks.map((link) => link.legacyPartnerName).join('، ') : 'ندارد'}</td>
                        <td className="px-4 py-3 text-slate-900 dark:text-white">{currentShare > 0 ? percentFa(currentShare) : 'تعریف نشده'}</td>
                      </tr>
                    );
                  })}
                  {!storePartners.length ? (
                    <tr>
                      <td colSpan={4} className="px-4 py-8 text-center text-sm font-bold text-slate-500 dark:text-slate-400">هنوز شریکی در ساختار جدید ثبت اطلاعات نشده است.</td>
                    </tr>
                  ) : null}
                </tbody>
              </table>
            </div>
          </div>
        </SectionBlock>
      </div>
    </div>
  );

  const renderRules = () => (
    <div className="space-y-6">
      <SectionBlock
        id="rules-config"
        title="پیکربندی ساختار پیش‌فرض تسهیم سود"
        description="در این بخش درصد سهم هر شریک در پروفایل پیش‌فرض مشخص می‌شود. برای ذخیره تغییرات نهایی، جمع درصدها باید دقیقاً ۱۰۰٪ باشد."
        action={<button type="button" className={buttonPrimary} onClick={handleSaveStoreConfig} disabled={submitting || !storePartners.length || !isShareTotalValid} title={!isShareTotalValid ? `جمع سهم شرکا باید ۱۰۰٪ باشد؛ مقدار فعلی ${percentFa(totalShareDraft)} است.` : 'ذخیره ساختار تسهیم سود'}><i className="fa-solid fa-floppy-disk" /> ذخیره تغییرات ساختار</button>}
      >
        <div className="grid gap-4 xl:grid-cols-[0.92fr_1.08fr]">
          <div className={softCard}>
            <div className="mb-3 text-sm font-black text-slate-900 dark:text-white">وضعیت ساختار پیش‌فرض</div>
            <div className="space-y-4">
              <ProgressRow label="تعادل درصدها" value={shareIntegrity} tone={shareIntegrity >= 95 ? 'emerald' : 'amber'} />
              <div className={`rounded-[18px] border px-4 py-3 text-sm font-bold ${isShareTotalValid ? toneClasses.emerald : toneClasses.amber}`}>
                {isShareTotalValid
                  ? 'ساختار فعلی برای ذخیره تغییرات نهایی آماده است.'
                  : `جمع درصدها اکنون ${percentFa(totalShareDraft)} است؛ ${shareDelta > 0 ? `${percentFa(shareDelta)} کم دارد` : `${percentFa(Math.abs(shareDelta))} اضافه دارد`}.`}
              </div>
              <div className="grid gap-2 sm:grid-cols-2">
                <button type="button" className={buttonGhost} onClick={applyEqualSharePreset} disabled={submitting || !activeStorePartners.length} title="درصدها را بین شرکای فعال مساوی تقسیم می‌کند">
                  <i className="fa-solid fa-equals" /> تقسیم مساوی
                </button>
                <button type="button" className={buttonGhost} onClick={normalizeSharesToHundred} disabled={submitting || !activeStorePartners.length} title="نسبت فعلی درصدها را حفظ می‌کند و جمع را دقیقاً ۱۰۰٪ می‌کند">
                  <i className="fa-solid fa-wand-magic-sparkles" /> نرمال‌سازی تا ۱۰۰٪
                </button>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm font-bold text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                پروفایل پیش‌فرض جاری: <span className="font-black text-slate-900 dark:text-white">{defaultProfitProfile?.title || 'تعریف نشده'}</span>
              </div>
            </div>
          </div>
          <div className={softCard}>
            <div className="mb-3 text-sm font-black text-slate-900 dark:text-white">درصد سهم شرکا</div>
            <div className="space-y-3">
              {storePartners.map((partner) => (
                <div key={`share-${partner.id}`} className="grid gap-3 rounded-[18px] border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1fr_180px] lg:items-center">
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">{partner.name}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{partner.legacyLinks.length ? `متصل به ${partner.legacyLinks.map((link) => link.legacyPartnerName).join('، ')}` : 'بدون اتصال قدیمی'}</div>
                  </div>
                  <div>
                    <input
                      type="number"
                      min="0"
                      max="100"
                      step="0.01"
                      className={inputClass}
                      value={shareDraft[partner.id] ?? ''}
                      onChange={(e) => setShareDraft((prev) => ({ ...prev, [partner.id]: e.target.value }))}
                      placeholder="مثلاً 33.33"
                    />
                  </div>
                </div>
              ))}
              {!storePartners.length ? <div className="text-sm font-bold text-slate-500 dark:text-slate-400">ابتدا شریک جدید بسازید یا هسته شراکت را راه‌اندازی کنید.</div> : null}
            </div>
          </div>
        </div>
      </SectionBlock>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionBlock title="پروفایل‌های تسهیم سود" description="تمام قواعد ثبت اطلاعات‌شده برای تقسیم سود در اینجا نمایش داده می‌شوند.">
          <div className="space-y-3">
            {profitProfiles.map((profile) => (
              <div key={profile.id} className={softCard}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">{profile.title}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{profile.items.length ? `${numberFa(profile.items.length)} شریک در این قاعده` : 'بدون شریک تعریف‌شده'}</div>
                  </div>
                  {profile.isDefault ? <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${toneClasses.violet}`}>پیش‌فرض</span> : <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${toneClasses.emerald}`}>فعال</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.items.map((item) => (
                    <span key={`${profile.id}-${item.storePartnerId}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{item.partnerName}: {item.sharePercent}%</span>
                  ))}
                </div>
              </div>
            ))}
            {!profitProfiles.length ? <div className={`${softCard} text-sm font-bold text-slate-500 dark:text-slate-400`}>هنوز پروفایل تسهیم سودی ثبت اطلاعات نشده است.</div> : null}
          </div>
        </SectionBlock>

        <SectionBlock title="پروفایل‌های مالکیت" description="الگوهای مالکیت شخصی، مشترک و تجمیعی فروشگاه در این بخش نگهداری می‌شوند.">
          <div className="space-y-3">
            {ownershipProfiles.map((profile) => (
              <div key={profile.id} className={softCard}>
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">{profile.title}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{ownershipTypeLabel(profile.ownershipType)}</div>
                  </div>
                  {profile.isDefault ? <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${toneClasses.blue}`}>پیش‌فرض</span> : <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${toneClasses.emerald}`}>فعال</span>}
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  {profile.items.map((item) => (
                    <span key={`${profile.id}-${item.storePartnerId}`} className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-bold text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">{item.partnerName}: {item.sharePercent}%</span>
                  ))}
                </div>
              </div>
            ))}
            {!ownershipProfiles.length ? <div className={`${softCard} text-sm font-bold text-slate-500 dark:text-slate-400`}>هنوز پروفایل مالکیتی ثبت اطلاعات نشده است.</div> : null}
          </div>
        </SectionBlock>
      </div>
    </div>
  );

  const renderOwnership = () => (
    <div className="space-y-6">
      <SectionBlock
        title="پوشش مالکیت موجودی"
        description="این نما مشخص می‌کند چه میزان از موجودی و سوابق شما به الگوهای مالکیت متصل شده‌اند و چه بخشی هنوز نیاز به رسیدگی دارد."
      >
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <div className={softCard}>
            <div className="space-y-4">
              <ProgressRow label="پوشش مالکیت گوشی‌ها" value={mappedPctPhones} tone="blue" />
              <ProgressRow label="پوشش مالکیت کالاها" value={mappedPctProducts} tone="emerald" />
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">کل گوشی‌ها</div>
                  <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{numberFa(coverage?.phones.total ?? 0)}</div>
                </div>
                <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                  <div className="text-xs font-bold text-slate-500 dark:text-slate-400">کل کالاها</div>
                  <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{numberFa(coverage?.products.total ?? 0)}</div>
                </div>
              </div>
            </div>
          </div>
          <div className={softCard}>
            <div className="mb-3 text-sm font-black text-slate-900 dark:text-white">پیش‌نمایش همگام‌سازی و کسری‌ها</div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">رکوردهای آماده</div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{numberFa(totalReadyBackfill)}</div>
              </div>
              <div className="rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                <div className="text-xs font-bold text-slate-500 dark:text-slate-400">موارد فاقد لینک قطعی</div>
                <div className="mt-2 text-2xl font-black text-slate-900 dark:text-white">{numberFa(totalMissingBackfill)}</div>
              </div>
            </div>
            <div className="mt-4 rounded-[18px] border border-slate-200 bg-white px-4 py-3 text-sm leading-7 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
              با اجرای همگام‌سازی، سوابقی که سیستم برای آن‌ها منبع معتبر پیدا کرده است به الگوی مالکیت مناسب متصل می‌شوند؛ سایر موارد برای بررسی و ادامه دقیق‌تر در صف بازبینی باقی می‌مانند.
            </div>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock title="الگوهای مالکیت موجود" description="این الگوها مبنای تخصیص موجودی و تحلیل سود در سطح شریک هستند.">
        <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
          {ownershipProfiles.map((profile) => (
            <div key={profile.id} className={softCard}>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="font-black text-slate-900 dark:text-white">{profile.title}</div>
                  <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{ownershipTypeLabel(profile.ownershipType)}</div>
                </div>
                {profile.isDefault ? <span className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-black ${toneClasses.blue}`}>پیش‌فرض</span> : null}
              </div>
              <div className="mt-4 space-y-2">
                {profile.items.map((item) => (
                  <div key={`${profile.id}-${item.storePartnerId}`} className="flex items-center justify-between rounded-2xl border border-slate-200 bg-white px-3 py-2 dark:border-slate-800 dark:bg-slate-900">
                    <span className="font-bold text-slate-700 dark:text-slate-200">{item.partnerName}</span>
                    <span className="font-black text-slate-900 dark:text-white">{percentFa(item.sharePercent)}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
          {!ownershipProfiles.length ? <div className={`${softCard} text-sm font-bold text-slate-500 dark:text-slate-400`}>الگوی مالکیتی ثبت اطلاعات نشده است.</div> : null}
        </div>
      </SectionBlock>
    </div>
  );

  const renderReview = () => (
    <div className="space-y-6">
      <SectionBlock
        title="بازبینی انتساب‌های نیازمند تصمیم"
        description="وقتی همگام‌سازی خودکار برای یک رکورد کافی نباشد، از اینجا می‌توانید به‌صورت کنترل‌شده آن را به یک پروفایل مالکیت متصل کنید."
      >
        <div className="mb-4">
          <input className={inputClass} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="یادداشت تصمیم برای ثبت اطلاعات در اسنپ‌شات دستی، مثلاً: تایید مالکیت داده‌های قدیمی" />
        </div>
        <div className="grid gap-6 xl:grid-cols-2">
          <div className={softCard}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-white">گوشی‌های نیازمند بازبینی</div>
                <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{numberFa(reviewQueue?.phones.total ?? 0)} مورد بدون الگوی قطعی</div>
              </div>
              <div className="text-xs font-black text-amber-600 dark:text-amber-300">انتساب دستی امن</div>
            </div>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row">
              <select className={inputClass} value={phoneAssignProfileId} onChange={(e) => setPhoneAssignProfileId(e.target.value)}>
                <option value="">انتخاب پروفایل مالکیت برای گوشی‌های منتخب</option>
                {ownershipProfiles.map((profile) => (<option key={`phone-profile-${profile.id}`} value={profile.id}>{profile.title}</option>))}
              </select>
              <button type="button" className={buttonPrimary} onClick={() => handleAssignReviewItems('phones')} disabled={submitting || !selectedPhoneReviewIds.length || !phoneAssignProfileId}><i className="fa-solid fa-check-double" /> ثبت اطلاعات انتساب</button>
            </div>
            <div className="space-y-2">
              {(reviewQueue?.phones.items || []).slice(0, 40).map((item) => {
                const checked = selectedPhoneReviewIds.includes(item.id);
                return (
                  <label key={`review-phone-${item.id}`} className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" checked={checked} onChange={() => setSelectedPhoneReviewIds((prev) => checked ? prev.filter((value) => value !== item.id) : [...prev, item.id])} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{item.model || 'گوشی بدون مدل'} · {item.imei || 'IMEI نامشخص'}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">منبع قدیمی: {item.legacyPartnerName || 'ندارد'} · supplierId: {item.supplierId ?? '-'} · خرید: {numberFa(item.purchasePrice || 0)}</div>
                      <div className="mt-2 text-xs font-black text-amber-700 dark:text-amber-300">{item.candidateReason || 'نیازمند تصمیم'}{item.candidateOwnershipProfileId ? ` · پیشنهاد #${item.candidateOwnershipProfileId}` : ''}</div>
                    </div>
                  </label>
                );
              })}
              {!reviewQueue?.phones.items?.length ? <div className="text-sm font-bold text-emerald-600 dark:text-emerald-300">هیچ گوشی در صف بازبینی وجود ندارد.</div> : null}
            </div>
          </div>

          <div className={softCard}>
            <div className="mb-3 flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-white">کالاها و لوازم نیازمند بازبینی</div>
                <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{numberFa(reviewQueue?.products.total ?? 0)} مورد بدون الگوی قطعی</div>
              </div>
              <div className="text-xs font-black text-amber-600 dark:text-amber-300">برای سوابق مبهم</div>
            </div>
            <div className="mb-3 flex flex-col gap-3 lg:flex-row">
              <select className={inputClass} value={productAssignProfileId} onChange={(e) => setProductAssignProfileId(e.target.value)}>
                <option value="">انتخاب پروفایل مالکیت برای کالاهای منتخب</option>
                {ownershipProfiles.map((profile) => (<option key={`product-profile-${profile.id}`} value={profile.id}>{profile.title}</option>))}
              </select>
              <button type="button" className={buttonPrimary} onClick={() => handleAssignReviewItems('products')} disabled={submitting || !selectedProductReviewIds.length || !productAssignProfileId}><i className="fa-solid fa-check-double" /> ثبت اطلاعات انتساب</button>
            </div>
            <div className="space-y-2">
              {(reviewQueue?.products.items || []).slice(0, 40).map((item) => {
                const checked = selectedProductReviewIds.includes(item.id);
                return (
                  <label key={`review-product-${item.id}`} className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <input type="checkbox" className="mt-1 h-4 w-4 rounded border-slate-300" checked={checked} onChange={() => setSelectedProductReviewIds((prev) => checked ? prev.filter((value) => value !== item.id) : [...prev, item.id])} />
                    <div className="min-w-0 flex-1">
                      <div className="truncate text-sm font-extrabold text-slate-900 dark:text-white">{item.name || 'کالای بدون نام'}</div>
                      <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">منبع قدیمی: {item.legacyPartnerName || 'ندارد'} · supplierId: {item.supplierId ?? '-'} · موجودی: {numberFa(item.stock_quantity || 0)}</div>
                      <div className="mt-2 text-xs font-black text-amber-700 dark:text-amber-300">{item.candidateReason || 'نیازمند تصمیم'}{item.candidateOwnershipProfileId ? ` · پیشنهاد #${item.candidateOwnershipProfileId}` : ''}</div>
                    </div>
                  </label>
                );
              })}
              {!reviewQueue?.products.items?.length ? <div className="text-sm font-bold text-emerald-600 dark:text-emerald-300">هیچ کالایی در صف بازبینی وجود ندارد.</div> : null}
            </div>
          </div>
        </div>
      </SectionBlock>
    </div>
  );

  const renderReports = () => (
    <div className="space-y-6">
      <SectionBlock title="گزارش‌ها و خروجی‌ها" description="برای تحلیل عملکرد شرکا، ارزش موجودی و تصمیم‌های ثبت اطلاعات‌شده، از گزارش‌های آماده این بخش استفاده کنید.">
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          <Link to="/reports/partners-performance" className={softCard}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-white">گزارش عملکرد شرکا</div>
                <div className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">سود، خرید و فروش و ارزش موجودی هر شریک</div>
              </div>
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses.blue}`}><i className="fa-solid fa-chart-line" /></span>
            </div>
          </Link>
          <button type="button" className={softCard} onClick={() => jumpToTab('overview')}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-white">داشبورد مدیریتی</div>
                <div className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">مرور سریع سلامت ساختار، قواعد فعال و صف بازبینی</div>
              </div>
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses.violet}`}><i className="fa-solid fa-table-cells-large" /></span>
            </div>
          </button>
          <button type="button" className={softCard} onClick={() => jumpToTab('review')}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-white">صف تصمیم‌های دستی</div>
                <div className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">بازبینی و تعیین الگوی مالکیت برای سوابق مبهم</div>
              </div>
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses.amber}`}><i className="fa-solid fa-list-check" /></span>
            </div>
          </button>
          <button type="button" className={softCard} onClick={() => jumpToTab('rules')}>
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-base font-black text-slate-900 dark:text-white">پروفایل‌های سود و مالکیت</div>
                <div className="mt-1 text-sm leading-7 text-slate-600 dark:text-slate-300">کنترل مستقیم روی قواعد و درصدهای ساختار شراکت</div>
              </div>
              <span className={`inline-flex h-11 w-11 items-center justify-center rounded-2xl border ${toneClasses.emerald}`}><i className="fa-solid fa-scale-balanced" /></span>
            </div>
          </button>
        </div>
      </SectionBlock>
    </div>
  );

  const tabs: Array<{ id: ViewTab; label: string; icon: string }> = [
    { id: 'overview', label: 'نمای کلی', icon: 'fa-grid-2' },
    { id: 'partners', label: 'شرکا', icon: 'fa-users' },
    { id: 'rules', label: 'قواعد سود', icon: 'fa-scale-balanced' },
    { id: 'ownership', label: 'مالکیت موجودی', icon: 'fa-box-open' },
    { id: 'review', label: 'بازبینی انتساب‌ها', icon: 'fa-list-check' },
    { id: 'reports', label: 'گزارش‌ها', icon: 'fa-chart-column' },
  ];

  const renderActiveTab = () => {
    if (activeTab === 'partners') return renderPartners();
    if (activeTab === 'rules') return renderRules();
    if (activeTab === 'ownership') return renderOwnership();
    if (activeTab === 'review') return renderReview();
    if (activeTab === 'reports') return renderReports();
    return renderOverview();
  };

  return (
    <div className="mx-auto flex w-full max-w-[1460px] flex-col gap-6 p-4 md:p-6">
      <section className="overflow-hidden rounded-[34px] border border-slate-200/80 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.98),rgba(248,250,252,0.96)_48%,rgba(238,242,255,0.96)_100%)] p-6 shadow-[0_40px_100px_-52px_rgba(15,23,42,0.35)] dark:border-slate-800/80 dark:bg-[radial-gradient(circle_at_top_right,rgba(30,41,59,0.88),rgba(15,23,42,0.94)_50%,rgba(2,6,23,0.98)_100%)] md:p-7">
        <div className="flex flex-col gap-5 xl:flex-row xl:items-start xl:justify-between">
          <div className="space-y-4">
            <div className="inline-flex items-center gap-2 rounded-full border border-indigo-200 bg-white/85 px-3 py-1.5 text-xs font-black text-indigo-700 dark:border-indigo-900/60 dark:bg-slate-900/80 dark:text-indigo-200">
              <span className="h-2 w-2 rounded-full bg-indigo-500" />
              مدیریت پیشرفته ساختار شراکت
            </div>
            <div>
              <h1 className="text-3xl font-black tracking-tight text-slate-900 dark:text-white md:text-[2.5rem]">مرکز مالکیت و تسهیم سود</h1>
              <p className="mt-3 max-w-4xl text-sm leading-8 text-slate-600 dark:text-slate-300 md:text-[15px]">
                ساختار شراکت، الگوهای مالکیت، قواعد تقسیم سود و تصمیم‌های ثبت اطلاعات‌شده را در یک نمای متمرکز مدیریت کنید. این مرکز برای کنترل دقیق سهم هر شریک، پایش سلامت داده‌ها و رسیدگی به انتساب‌های نیازمند بررسی و ادامه طراحی شده است.
              </p>
            </div>
          </div>

          <div className="flex w-full flex-col gap-3 xl:w-auto xl:min-w-[360px] xl:items-end">
            <div className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-black ${error ? toneClasses.rose : loading ? toneClasses.blue : Math.abs(100 - totalShareDraft) < 0.01 ? toneClasses.emerald : toneClasses.amber}`}>
              <i className={`fa-solid ${error ? 'fa-triangle-exclamation' : loading ? 'fa-spinner fa-spin' : Math.abs(100 - totalShareDraft) < 0.01 ? 'fa-shield-heart' : 'fa-shield-halved'}`} />
              {error ? 'وضعیت ساختار: نیازمند رسیدگی' : loading ? 'در حال بازخوانی اطلاعات...' : Math.abs(100 - totalShareDraft) < 0.01 ? 'وضعیت ساختار: پایدار' : 'وضعیت ساختار: نیازمند تنظیم'}
            </div>
            <div className="flex flex-wrap gap-3 xl:justify-end">
              <Link to="/reports/partners-performance" className={buttonSecondary}><i className="fa-solid fa-chart-column" /> گزارش عملکرد</Link>
              <button type="button" className={buttonSecondary} onClick={() => jumpToTab('rules')}><i className="fa-solid fa-file-circle-plus" /> تعریف قاعده سود</button>
              <button type="button" className={buttonPrimary} onClick={() => jumpToTab('partners')}><i className="fa-solid fa-user-plus" /> ایجاد شریک جدید</button>
            </div>
            <div className="flex flex-wrap gap-3 xl:justify-end">
              <button type="button" className={buttonGhost} onClick={fetchAll} disabled={loading || submitting}><i className="fa-solid fa-arrows-rotate" /> بازخوانی داده‌ها</button>
              <Link to="/settings" className={buttonGhost}><i className="fa-solid fa-arrow-right" /> بازگشت به تنظیمات</Link>
            </div>
          </div>
        </div>
      </section>

      {error ? (
        <div className="rounded-[22px] border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-bold text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/40 dark:text-rose-200">
          {error}
        </div>
      ) : null}

      <section className={`${shellCard} overflow-hidden`}>
        <div className="border-b border-slate-200/80 px-3 py-2 dark:border-slate-800/80">
          <div className="flex flex-wrap items-center gap-1.5 md:gap-2">
            {tabs.map((tab) => {
              const active = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  type="button"
                  onClick={() => jumpToTab(tab.id)}
                  className={`inline-flex min-h-[42px] items-center justify-center gap-2 rounded-[16px] px-3.5 py-2 text-sm font-black transition ${active ? 'bg-indigo-600 text-white shadow-[0_18px_34px_-24px_rgba(79,70,229,0.75)]' : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'}`}
                >
                  <i className={`fa-solid ${tab.icon}`} />
                  {tab.label}
                </button>
              );
            })}
          </div>
        </div>
        <div className="p-4 md:p-6">
          {renderActiveTab()}
        </div>
      </section>
    </div>
  );
};

export default StoreOwnershipPage;
