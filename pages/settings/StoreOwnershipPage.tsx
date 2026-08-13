import React, { useEffect, useMemo, useState } from 'react';
import { useConfirm } from '../../contexts/ConfirmContext';
import { Link } from 'react-router-dom';
import { apiFetch } from '../../utils/apiFetch';
import { parseApiResult, runWithFeedback, humanizeErrorMessage } from '../../utils/feedback';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import { Button, CheckboxField, SearchableSelectField, TextField, TextareaField } from '@/components/ui';

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
  createdAt?: string | null;
  updatedAt?: string | null;
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
  notes?: string | null;
  isDefault: number;
  isActive?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
  items: ProfileItem[];
};

type OwnershipProfile = {
  id: number;
  title: string;
  ownershipType: string;
  notes?: string | null;
  profitShareProfileId?: number | null;
  isDefault: number;
  isActive?: number;
  createdAt?: string | null;
  updatedAt?: string | null;
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

type ReviewAssignmentResult = {
  targetType: 'phones' | 'products';
  ownershipProfileId: number;
  ownershipProfileTitle: string;
  updated: number;
  skipped: number;
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

const shellCard = 'store-ownership-surface';
const sectionCard = 'store-ownership-section';
const softCard = 'store-ownership-soft';
const buttonPrimary = 'store-ownership-btn store-ownership-btn--primary';
const buttonSecondary = 'store-ownership-btn store-ownership-btn--secondary';
const buttonGhost = 'store-ownership-btn store-ownership-btn--ghost';
const inputClass = 'store-ownership-field';

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
  <div className="store-ownership-stat">
    <div className="flex items-start justify-between gap-3">
      <div>
        <div className="text-sm font-bold text-slate-500 dark:text-slate-400">{title}</div>
        <div className="mt-3 text-3xl font-black tracking-tight text-slate-900 dark:text-white">{value}</div>
        {helper ? <div className="mt-2 text-sm font-bold text-slate-500 dark:text-slate-400">{helper}</div> : null}
      </div>
      <span className={`store-ownership-stat__icon ${toneClasses[tone]}`}>
        <i className={`fa-solid ${icon}`} />
      </span>
    </div>
  </div>
);

const SectionBlock: React.FC<{ id?: string; title: string; description?: string; action?: React.ReactNode; children: React.ReactNode }> = ({ id, title, description, action, children }) => (
  <section id={id} className={sectionCard}>
    <div className="store-ownership-section__head">
      <div>
        <h2 className="store-ownership-section__title">{title}</h2>
        {description ? <p className="store-ownership-section__description">{description}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
    {children}
  </section>
);

const StoreOwnershipPage: React.FC = () => {
  const confirmAction = useConfirm();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [lastSyncedAt, setLastSyncedAt] = useState<Date | null>(null);
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
  const [editingPartnerId, setEditingPartnerId] = useState<number | null>(null);
  const [newPartnerName, setNewPartnerName] = useState('');
  const [newPartnerCode, setNewPartnerCode] = useState('');
  const [newPartnerNotes, setNewPartnerNotes] = useState('');
  const [partnerLegacyIds, setPartnerLegacyIds] = useState<number[]>([]);
  const [newProfitProfileTitle, setNewProfitProfileTitle] = useState('');
  const [newOwnershipProfileTitle, setNewOwnershipProfileTitle] = useState('');
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
      const selectableLegacyIds = new Set((legacyRes.data || []).filter((item) => !item.isLinked && (item.phoneCount > 0 || item.productCount > 0)).map((item) => item.id));
      setSelectedLegacyIds((previous) => previous.filter((id) => selectableLegacyIds.has(id)));
      setLastSyncedAt(new Date());
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
  const activeStorePartners = useMemo(() => storePartners.filter((partner) => Number(partner.isActive) === 1), [storePartners]);
  const activeProfitProfiles = useMemo(() => profitProfiles.filter((profile) => Number(profile.isActive ?? 1) === 1), [profitProfiles]);
  const activeOwnershipProfiles = useMemo(() => ownershipProfiles.filter((profile) => Number(profile.isActive ?? 1) === 1), [ownershipProfiles]);
  const totalShareDraft = useMemo(() => Number(activeStorePartners.reduce((sum, partner) => sum + (Number(shareDraft[partner.id] || 0) || 0), 0).toFixed(2)), [activeStorePartners, shareDraft]);
  const shareDelta = useMemo(() => Number((100 - totalShareDraft).toFixed(2)), [totalShareDraft]);
  const isShareTotalValid = activeStorePartners.length > 0 && Math.abs(totalShareDraft - 100) <= 0.01;

  const defaultProfitProfile = useMemo(() => activeProfitProfiles.find((item) => Number(item.isDefault) === 1) || activeProfitProfiles[0] || null, [activeProfitProfiles]);
  const defaultOwnershipProfile = useMemo(() => activeOwnershipProfiles.find((item) => Number(item.isDefault) === 1) || activeOwnershipProfiles[0] || null, [activeOwnershipProfiles]);

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

  const resetPartnerForm = () => {
    setEditingPartnerId(null);
    setNewPartnerName('');
    setNewPartnerCode('');
    setNewPartnerNotes('');
    setPartnerLegacyIds([]);
  };

  const startPartnerEdit = (partner: StorePartner) => {
    setEditingPartnerId(partner.id);
    setNewPartnerName(partner.name || '');
    setNewPartnerCode(partner.code || '');
    setNewPartnerNotes(partner.notes || '');
    setPartnerLegacyIds((partner.legacyLinks || []).map((link) => Number(link.legacyPartnerId)).filter(Boolean));
    setError(null);
    window.setTimeout(() => document.getElementById('partners-create')?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 40);
  };

  const handleBootstrap = async () => {
    if (!selectedLegacyIds.length) return;
    const approved = await confirmAction({
      title: 'ایجاد هسته ساختار شراکت',
      description: 'برای همکاران انتخاب‌شده شریک ساختاری و پروفایل‌های مالکیت لازم ایجاد می‌شود. سوابق قابل تشخیص نیز به‌صورت کنترل‌شده همگام می‌شوند.',
      confirmText: 'ایجاد هسته شراکت',
      tone: 'warning',
      iconClass: 'fa-solid fa-diagram-project',
      summaryItems: [
        { label: 'همکاران انتخاب‌شده', value: numberFa(selectedLegacyIds.length) },
        { label: 'رکورد آماده همگام‌سازی', value: numberFa(totalReadyBackfill) },
      ],
    });
    if (!approved) return;
    setSubmitting(true);
    setBusyAction('bootstrap');
    setError(null);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/bootstrap', {
          method: 'POST',
          body: JSON.stringify({ legacyPartnerIds: selectedLegacyIds }),
        }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/bootstrap', action: 'ایجاد هسته مالکیت فروشگاه' })),
        {
          loading: 'در حال ساخت هسته شراکت و اتصال کنترل‌شده داده‌های قبلی...',
          success: 'هسته شراکت با موفقیت ایجاد شد و انتساب‌های قابل تشخیص اعمال شدند.'
        }
      );
      setSelectedLegacyIds([]);
      await fetchAll();
    } catch (err: unknown) {
      setError(humanizeErrorMessage(err instanceof Error ? err.message : err));
    } finally {
      setBusyAction(null);
      setSubmitting(false);
    }
  };

  const handleApplyBackfill = async () => {
    if (totalReadyBackfill <= 0) return;
    const approved = await confirmAction({
      title: 'همگام‌سازی سوابق مالکیت',
      description: 'فقط رکوردهایی که ارتباط معتبر با شریک قدیمی دارند به پروفایل مالکیت متناظر متصل می‌شوند. موارد مبهم در صف بازبینی باقی می‌مانند.',
      confirmText: 'اعمال همگام‌سازی',
      tone: 'info',
      iconClass: 'fa-solid fa-arrows-rotate',
      summaryItems: [
        { label: 'آماده همگام‌سازی', value: numberFa(totalReadyBackfill) },
        { label: 'نیازمند بررسی دستی', value: numberFa(totalMissingBackfill) },
      ],
    });
    if (!approved) return;
    setSubmitting(true);
    setBusyAction('backfill');
    setError(null);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/backfill/apply', { method: 'POST' }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/backfill/apply', action: 'اعمال همگام‌سازی سوابق مالکیت' })),
        {
          loading: 'در حال اعمال همگام‌سازی مالکیت برای سوابق قبلی...',
          success: 'همگام‌سازی سوابق مالکیت با موفقیت انجام شد.'
        }
      );
      await fetchAll();
    } catch (err: unknown) {
      setError(humanizeErrorMessage(err instanceof Error ? err.message : err));
    } finally {
      setBusyAction(null);
      setSubmitting(false);
    }
  };

  const handleCreateStorePartner = async (e: React.FormEvent) => {
    e.preventDefault();
    const normalizedName = newPartnerName.trim();
    if (!normalizedName) {
      setError('نام شریک را وارد کنید.');
      return;
    }
    setSubmitting(true);
    setBusyAction(editingPartnerId ? `partner-update-${editingPartnerId}` : 'partner-create');
    setError(null);
    try {
      const endpoint = editingPartnerId
        ? `/api/store-ownership/store-partners/${editingPartnerId}`
        : '/api/store-ownership/store-partners';
      const method = editingPartnerId ? 'PUT' : 'POST';
      await runWithFeedback(
        apiFetch(endpoint, {
          method,
          body: JSON.stringify({
            name: normalizedName,
            code: newPartnerCode.trim() || null,
            notes: newPartnerNotes.trim() || null,
            legacyPartnerIds: partnerLegacyIds,
          }),
        }).then((r) => parseApiResult(r, { endpoint, action: editingPartnerId ? 'ویرایش شریک' : 'ایجاد شریک جدید' })),
        {
          loading: editingPartnerId ? 'در حال ذخیره تغییرات شریک...' : 'در حال ثبت شریک جدید...',
          success: editingPartnerId ? 'اطلاعات شریک با موفقیت به‌روزرسانی شد.' : 'شریک جدید با موفقیت ثبت شد.',
        }
      );
      resetPartnerForm();
      await fetchAll();
    } catch (err: unknown) {
      setError(humanizeErrorMessage(err instanceof Error ? err.message : err));
    } finally {
      setBusyAction(null);
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

  const getDraftShareItems = () => activeStorePartners
    .map((partner, index) => ({
      storePartnerId: partner.id,
      sharePercent: Number(shareDraft[partner.id] || 0),
      sortOrder: index,
    }))
    .filter((item) => item.sharePercent > 0);

  const handleSaveStoreConfig = async () => {
    if (!isShareTotalValid) {
      setError(`جمع سهم شرکا باید دقیقاً ۱۰۰٪ باشد؛ مقدار فعلی ${percentFa(totalShareDraft)} است.`);
      setActiveTab('rules');
      return;
    }

    const items = getDraftShareItems();
    setSubmitting(true);
    setBusyAction('save-default-shares');
    setError(null);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/configuration', {
          method: 'PUT',
          body: JSON.stringify({ storePartnerId: null, items }),
        }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/configuration', action: 'ذخیره تغییرات ساختار تسهیم سود' })),
        {
          loading: 'در حال ذخیره ساختار پیش‌فرض تسهیم سود...',
          success: 'ساختار پیش‌فرض مالکیت و تسهیم سود با موفقیت ذخیره شد.'
        }
      );
      await fetchAll();
    } catch (err: unknown) {
      setError(humanizeErrorMessage(err instanceof Error ? err.message : err));
    } finally {
      setBusyAction(null);
      setSubmitting(false);
    }
  };

  const handleCreateProfitProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newProfitProfileTitle.trim() || !isShareTotalValid) return;
    setSubmitting(true);
    setBusyAction('create-profit-profile');
    setError(null);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/profit-share-profiles', {
          method: 'POST',
          body: JSON.stringify({ title: newProfitProfileTitle.trim(), isDefault: false, items: getDraftShareItems() }),
        }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/profit-share-profiles', action: 'ایجاد پروفایل تسهیم سود' })),
        { loading: 'در حال ایجاد پروفایل تسهیم سود...', success: 'پروفایل تسهیم سود جدید ایجاد شد.' },
      );
      setNewProfitProfileTitle('');
      await fetchAll();
    } catch (err: unknown) {
      setError(humanizeErrorMessage(err instanceof Error ? err.message : err));
    } finally {
      setBusyAction(null);
      setSubmitting(false);
    }
  };

  const handleCreateOwnershipProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newOwnershipProfileTitle.trim() || !isShareTotalValid) return;
    setSubmitting(true);
    setBusyAction('create-ownership-profile');
    setError(null);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/ownership-profiles', {
          method: 'POST',
          body: JSON.stringify({
            title: newOwnershipProfileTitle.trim(),
            ownershipType: 'shared',
            isDefault: false,
            profitShareProfileId: defaultProfitProfile?.id || null,
            items: getDraftShareItems().map((item) => ({ ...item, roleLabel: 'مالک مشترک' })),
          }),
        }).then((r) => parseApiResult(r, { endpoint: '/api/store-ownership/ownership-profiles', action: 'ایجاد پروفایل مالکیت مشترک' })),
        { loading: 'در حال ایجاد پروفایل مالکیت مشترک...', success: 'پروفایل مالکیت مشترک جدید ایجاد شد.' },
      );
      setNewOwnershipProfileTitle('');
      await fetchAll();
    } catch (err: unknown) {
      setError(humanizeErrorMessage(err instanceof Error ? err.message : err));
    } finally {
      setBusyAction(null);
      setSubmitting(false);
    }
  };

  const handleAssignReviewItems = async (targetType: 'phones' | 'products') => {
    const ids = targetType === 'phones' ? selectedPhoneReviewIds : selectedProductReviewIds;
    const ownershipProfileId = Number(targetType === 'phones' ? phoneAssignProfileId : productAssignProfileId);
    if (!ids.length || !ownershipProfileId) return;
    const profile = activeOwnershipProfiles.find((item) => Number(item.id) === ownershipProfileId);
    const approved = await confirmAction({
      title: 'ثبت انتساب مالکیت',
      description: `موارد انتخاب‌شده به پروفایل «${profile?.title || `#${ownershipProfileId}`}» متصل می‌شوند و یک snapshot تصمیم دستی ثبت خواهد شد.`,
      confirmText: 'ثبت انتساب',
      tone: 'warning',
      iconClass: 'fa-solid fa-link',
      summaryItems: [
        { label: 'نوع رکورد', value: targetType === 'phones' ? 'گوشی' : 'کالا' },
        { label: 'تعداد انتخاب‌شده', value: numberFa(ids.length) },
      ],
    });
    if (!approved) return;
    setSubmitting(true);
    setBusyAction(`assign-${targetType}`);
    setError(null);
    try {
      await runWithFeedback(
        apiFetch('/api/store-ownership/review-queue/assign', {
          method: 'POST',
          body: JSON.stringify({ targetType, ids, ownershipProfileId, notes: reviewNotes.trim() || null }),
        }).then((r) => parseApiResult<{ success: boolean; data: ReviewAssignmentResult }>(r, { endpoint: '/api/store-ownership/review-queue/assign', action: 'ثبت انتساب دستی مالکیت' })),
        {
          loading: 'در حال ثبت تصمیم و انتساب دستی...',
          success: (result) => {
            const updated = Number(result.data?.updated || 0);
            const skipped = Number(result.data?.skipped || 0);
            return skipped > 0
              ? `${numberFa(updated)} مورد متصل شد و ${numberFa(skipped)} مورد به‌دلیل تغییر هم‌زمان یا انتساب قبلی رد شد.`
              : `${numberFa(updated)} مورد با موفقیت به الگوی مالکیت متصل شد.`;
          }
        }
      );
      if (targetType === 'phones') setSelectedPhoneReviewIds([]);
      else setSelectedProductReviewIds([]);
      await fetchAll();
    } catch (err: unknown) {
      setError(humanizeErrorMessage(err instanceof Error ? err.message : err));
    } finally {
      setBusyAction(null);
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
                        <span className={`store-ownership-stat__icon ${toneClasses[tone]}`}>
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
            <div className="store-ownership-shortcuts grid grid-cols-1 gap-3">
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

  const renderPartners = () => {
    const availableLegacyPartners = legacyPartners.filter((item) => {
      if (!item.isLinked) return true;
      return editingPartnerId != null && Number(item.linkedStorePartnerId) === editingPartnerId;
    });

    return (
      <div className="store-ownership-tab-stack">
        <SectionBlock
          id="partners-bootstrap"
          title="راه‌اندازی هسته شراکت"
          description="فقط همکاران قدیمیِ مالک را انتخاب کنید. ساختار جدید ارتباط سوابق قبلی را حفظ می‌کند و داده مبهم را برای بازبینی کنار می‌گذارد."
          action={(
            <Button type="button" variant="primary" size="xs" className={buttonPrimary} onClick={handleBootstrap} disabled={!canBootstrap || submitting} leftIcon={<i className={`fa-solid ${busyAction === 'bootstrap' ? 'fa-spinner fa-spin' : 'fa-diagram-project'}`} />}>
              {busyAction === 'bootstrap' ? 'در حال ایجاد...' : 'ایجاد هسته'}
            </Button>
          )}
        >
          <div className="store-ownership-bootstrap-grid">
            <div className={softCard}>
              <div className="store-ownership-subhead">
                <div>
                  <div className="store-ownership-subhead__title">همکاران قدیمی قابل اتصال</div>
                  <div className="store-ownership-subhead__meta">{numberFa(selectedLegacyIds.length)} مورد انتخاب شده</div>
                </div>
                <Button
                  type="button"
                  variant="ghost"
                  size="xs"
                  className={buttonGhost}
                  onClick={() => {
                    const selectable = legacyPartners.filter((item) => !item.isLinked && (item.phoneCount > 0 || item.productCount > 0)).map((item) => item.id);
                    setSelectedLegacyIds(selectedLegacyIds.length === selectable.length ? [] : selectable);
                  }}
                  disabled={submitting}
                  leftIcon={<i className="fa-solid fa-check-double" />}
                >
                  انتخاب همه
                </Button>
              </div>
              <div className="store-ownership-choice-list">
                {legacyPartners.map((item) => {
                  const checked = selectedLegacyIds.includes(item.id);
                  const disabled = item.isLinked === 1;
                  return (
                    <label key={item.id} className={`store-ownership-choice ${disabled ? 'is-disabled' : ''}`}>
                      <CheckboxField
                        controlOnly
                        checked={checked}
                        onChange={() => setSelectedLegacyIds((prev) => checked ? prev.filter((value) => value !== item.id) : [...prev, item.id])}
                        disabled={disabled}
                      />
                      <span className="store-ownership-choice__body">
                        <span className="store-ownership-choice__title">{item.partnerName}</span>
                        <span className="store-ownership-choice__meta">{item.partnerType} · گوشی {numberFa(item.phoneCount)} · کالا {numberFa(item.productCount)}</span>
                        {disabled ? <span className="store-ownership-choice__status">متصل به {item.linkedStorePartnerName || 'ساختار جدید'}</span> : null}
                      </span>
                    </label>
                  );
                })}
                {!legacyPartners.length ? <div className="store-ownership-empty-inline">همکار قدیمی قابل اتصال وجود ندارد.</div> : null}
              </div>
            </div>

            <div className={softCard}>
              <div className="store-ownership-subhead">
                <div>
                  <div className="store-ownership-subhead__title">پیش‌نمایش همگام‌سازی</div>
                  <div className="store-ownership-subhead__meta">هیچ رکوردی بدون تطبیق معتبر تغییر نمی‌کند.</div>
                </div>
                <span className={`store-ownership-badge ${totalReadyBackfill > 0 ? 'is-info' : 'is-neutral'}`}>{numberFa(totalReadyBackfill)} آماده</span>
              </div>
              <div className="store-ownership-mini-stats">
                <div><span>گوشی آماده</span><strong>{numberFa(preview?.phones.readyCount ?? 0)}</strong></div>
                <div><span>کالای آماده</span><strong>{numberFa(preview?.products.readyCount ?? 0)}</strong></div>
                <div><span>نیازمند بررسی</span><strong>{numberFa(totalMissingBackfill)}</strong></div>
                <div><span>قبلاً متصل</span><strong>{numberFa((preview?.phones.alreadyMappedCount ?? 0) + (preview?.products.alreadyMappedCount ?? 0))}</strong></div>
              </div>
              <Button type="button" variant="secondary" size="xs" className={buttonSecondary} onClick={handleApplyBackfill} disabled={submitting || totalReadyBackfill <= 0} leftIcon={<i className={`fa-solid ${busyAction === 'backfill' ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`} />}>
                {busyAction === 'backfill' ? 'در حال همگام‌سازی...' : 'اعمال همگام‌سازی امن'}
              </Button>
            </div>
          </div>
        </SectionBlock>

        <div className="store-ownership-two-column">
          <SectionBlock
            id="partners-create"
            title={editingPartnerId ? 'ویرایش شریک ساختاری' : 'ثبت شریک ساختاری'}
            description={editingPartnerId ? 'نام، کد، توضیحات و اتصال به همکاران قدیمی را اصلاح کنید.' : 'شریک جدید را بدون ایجاد رکورد موازی به ساختار موجود اضافه کنید.'}
            action={editingPartnerId ? <Button type="button" variant="ghost" size="xs" className={buttonGhost} onClick={resetPartnerForm} leftIcon={<i className="fa-solid fa-xmark" />}>لغو ویرایش</Button> : null}
          >
            <form className="store-ownership-form" onSubmit={handleCreateStorePartner}>
              <div className="store-ownership-field-group">
                <span>نام شریک</span>
                <TextField className={inputClass} value={newPartnerName} onChange={(e) => setNewPartnerName(e.target.value)} placeholder="مثلاً علیرضا هلیلی" maxLength={120} />
              </div>
              <div className="store-ownership-field-group">
                <span>کد داخلی اختیاری</span>
                <TextField className={inputClass} value={newPartnerCode} onChange={(e) => setNewPartnerCode(e.target.value)} placeholder="مثلاً P-001" maxLength={64} dir="ltr" />
              </div>
              <div className="store-ownership-field-group store-ownership-field-group--wide">
                <span>یادداشت</span>
                <TextareaField className={`${inputClass} store-ownership-textarea`} value={newPartnerNotes} onChange={(e) => setNewPartnerNotes(e.target.value)} placeholder="توضیح کوتاه درباره نقش یا قرارداد شریک" maxLength={1000} />
              </div>
              <div className="store-ownership-field-group store-ownership-field-group--wide">
                <span>اتصال به همکاران قدیمی</span>
                <div className="store-ownership-legacy-link-grid">
                  {availableLegacyPartners.map((item) => {
                    const checked = partnerLegacyIds.includes(item.id);
                    return (
                      <label key={`partner-link-${item.id}`} className="store-ownership-link-chip">
                        <CheckboxField controlOnly checked={checked} onChange={() => setPartnerLegacyIds((prev) => checked ? prev.filter((id) => id !== item.id) : [...prev, item.id])} />
                        <span>{item.partnerName}</span>
                      </label>
                    );
                  })}
                  {!availableLegacyPartners.length ? <span className="store-ownership-empty-inline">رکورد قدیمی آزاد برای اتصال وجود ندارد.</span> : null}
                </div>
              </div>
              <div className="store-ownership-form__actions store-ownership-field-group--wide">
                <Button type="submit" variant="primary" size="xs" className={buttonPrimary} disabled={submitting || !newPartnerName.trim()} leftIcon={<i className={`fa-solid ${busyAction?.startsWith('partner-') ? 'fa-spinner fa-spin' : editingPartnerId ? 'fa-floppy-disk' : 'fa-user-plus'}`} />}>
                  {busyAction?.startsWith('partner-') ? 'در حال ذخیره...' : editingPartnerId ? 'ذخیره تغییرات' : 'ثبت شریک'}
                </Button>
                {editingPartnerId ? <Button type="button" variant="secondary" size="xs" className={buttonSecondary} onClick={resetPartnerForm} disabled={submitting}>انصراف</Button> : null}
              </div>
            </form>
          </SectionBlock>

          <SectionBlock
            id="partners-list"
            title="شرکای ساختار جدید"
            description={`${numberFa(storePartners.length)} شریک ثبت‌شده؛ ویرایش فقط روی همین رکوردهای واقعی انجام می‌شود.`}
          >
            <div className="store-ownership-table-wrap">
              <table className="store-ownership-table">
                <thead>
                  <tr>
                    <th>شریک</th>
                    <th>وضعیت</th>
                    <th>اتصال قدیمی</th>
                    <th>سهم پیش‌فرض</th>
                    <th>آخرین تغییر</th>
                    <th aria-label="عملیات" />
                  </tr>
                </thead>
                <tbody>
                  {storePartners.map((partner) => {
                    const currentShare = Number(shareDraft[partner.id] || 0);
                    return (
                      <tr key={partner.id}>
                        <td>
                          <div className="store-ownership-table__primary">{partner.name}</div>
                          <div className="store-ownership-table__secondary">{partner.code || `شناسه #${partner.id}`}</div>
                        </td>
                        <td><span className={`store-ownership-badge ${partner.isActive ? 'is-success' : 'is-neutral'}`}>{partner.isActive ? 'فعال' : 'غیرفعال'}</span></td>
                        <td>{partner.legacyLinks.length ? partner.legacyLinks.map((link) => link.legacyPartnerName).join('، ') : 'ندارد'}</td>
                        <td>{currentShare > 0 ? percentFa(currentShare) : 'بدون سهم'}</td>
                        <td>{partner.updatedAt || partner.createdAt ? formatIsoToShamsiDateTime(partner.updatedAt || partner.createdAt) : 'ثبت نشده'}</td>
                        <td>
                          <Button type="button" variant="secondary" size="icon" className="store-ownership-icon-btn" onClick={() => startPartnerEdit(partner)} title={`ویرایش ${partner.name}`} aria-label={`ویرایش ${partner.name}`} leftIcon={<i className="fa-solid fa-pen-to-square" />} />
                        </td>
                      </tr>
                    );
                  })}
                  {!storePartners.length ? <tr><td colSpan={6} className="store-ownership-table__empty">هنوز شریکی در ساختار جدید ثبت نشده است.</td></tr> : null}
                </tbody>
              </table>
            </div>
          </SectionBlock>
        </div>
      </div>
    );
  };

  const renderRules = () => (
    <div className="space-y-6">
      <SectionBlock
        id="rules-config"
        title="پیکربندی ساختار پیش‌فرض تسهیم سود"
        description="در این بخش درصد سهم هر شریک در پروفایل پیش‌فرض مشخص می‌شود. برای ذخیره تغییرات نهایی، جمع درصدها باید دقیقاً ۱۰۰٪ باشد."
        action={<button type="button" className={buttonPrimary} onClick={handleSaveStoreConfig} disabled={submitting || !activeStorePartners.length || !isShareTotalValid} title={!isShareTotalValid ? `جمع سهم شرکای فعال باید ۱۰۰٪ باشد؛ مقدار فعلی ${percentFa(totalShareDraft)} است.` : 'ذخیره ساختار تسهیم سود'}><i className={`fa-solid ${busyAction === 'save-default-shares' ? 'fa-spinner fa-spin' : 'fa-floppy-disk'}`} /> {busyAction === 'save-default-shares' ? 'در حال ذخیره...' : 'ذخیره ساختار'}</button>}
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
              {activeStorePartners.map((partner) => (
                <div key={`share-${partner.id}`} className="grid gap-3 rounded-[18px] border border-slate-200 bg-white p-3.5 dark:border-slate-800 dark:bg-slate-900 lg:grid-cols-[1fr_180px] lg:items-center">
                  <div>
                    <div className="font-black text-slate-900 dark:text-white">{partner.name}</div>
                    <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{partner.legacyLinks.length ? `متصل به ${partner.legacyLinks.map((link) => link.legacyPartnerName).join('، ')}` : 'بدون اتصال قدیمی'}</div>
                  </div>
                  <div>
                    <TextField controlOnly
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
              {!activeStorePartners.length ? <div className="text-sm font-bold text-slate-500 dark:text-slate-400">ابتدا شریک فعال بسازید یا هسته شراکت را راه‌اندازی کنید.</div> : null}
            </div>
          </div>
        </div>
      </SectionBlock>

      <div className="grid gap-6 xl:grid-cols-2">
        <SectionBlock title="پروفایل‌های تسهیم سود" description="قواعد ثبت‌شده واقعی و یک الگوی جدید بر پایه درصدهای فعلی.">
          <form className="store-ownership-inline-create" onSubmit={handleCreateProfitProfile}>
            <TextField className={inputClass} value={newProfitProfileTitle} onChange={(event) => setNewProfitProfileTitle(event.target.value)} placeholder="عنوان پروفایل سود جدید" maxLength={120} />
            <button type="submit" className={buttonSecondary} disabled={submitting || !isShareTotalValid || !newProfitProfileTitle.trim()}>
              <i className={`fa-solid ${busyAction === 'create-profit-profile' ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
              ساخت پروفایل
            </button>
          </form>
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

        <SectionBlock title="پروفایل‌های مالکیت" description="الگوهای شخصی، مشترک و تجمیعی؛ الگوی جدید به‌صورت مالکیت مشترک ساخته می‌شود.">
          <form className="store-ownership-inline-create" onSubmit={handleCreateOwnershipProfile}>
            <TextField className={inputClass} value={newOwnershipProfileTitle} onChange={(event) => setNewOwnershipProfileTitle(event.target.value)} placeholder="عنوان مالکیت مشترک جدید" maxLength={120} />
            <button type="submit" className={buttonSecondary} disabled={submitting || !isShareTotalValid || !newOwnershipProfileTitle.trim()}>
              <i className={`fa-solid ${busyAction === 'create-ownership-profile' ? 'fa-spinner fa-spin' : 'fa-plus'}`} />
              ساخت الگو
            </button>
          </form>
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
          <TextField className={inputClass} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} placeholder="یادداشت تصمیم برای ثبت در اسنپ‌شات دستی؛ حداکثر ۱۰۰۰ کاراکتر" maxLength={1000} />
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
              <SearchableSelectField
                value={phoneAssignProfileId || null}
                onValueChange={(value) => setPhoneAssignProfileId(value ? String(value) : '')}
                options={activeOwnershipProfiles.map((profile) => ({
                  value: String(profile.id),
                  label: profile.title,
                  searchText: `${profile.title} ${profile.ownershipType || ''} ${profile.id}`,
                }))}
                placeholder="جستجو و انتخاب پروفایل مالکیت گوشی‌ها…"
                noOptionsMessage="پروفایل مالکیتی مطابق جستجو پیدا نشد"
                ariaLabel="جستجو و انتخاب پروفایل مالکیت گوشی"
                controlClassName={inputClass}
                clearable
              />
              <button type="button" className={buttonPrimary} onClick={() => handleAssignReviewItems('phones')} disabled={submitting || !selectedPhoneReviewIds.length || !phoneAssignProfileId}><i className={`fa-solid ${busyAction === 'assign-phones' ? 'fa-spinner fa-spin' : 'fa-check-double'}`} /> {busyAction === 'assign-phones' ? 'در حال ثبت...' : `ثبت ${numberFa(selectedPhoneReviewIds.length)} انتساب`}</button>
            </div>
            <div className="space-y-2">
              {(reviewQueue?.phones.items || []).slice(0, 40).map((item) => {
                const checked = selectedPhoneReviewIds.includes(item.id);
                return (
                  <label key={`review-phone-${item.id}`} className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <CheckboxField controlOnly className="mt-1 h-4 w-4 rounded border-slate-300" checked={checked} onChange={() => setSelectedPhoneReviewIds((prev) => checked ? prev.filter((value) => value !== item.id) : [...prev, item.id])} />
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
              <SearchableSelectField
                value={productAssignProfileId || null}
                onValueChange={(value) => setProductAssignProfileId(value ? String(value) : '')}
                options={activeOwnershipProfiles.map((profile) => ({
                  value: String(profile.id),
                  label: profile.title,
                  searchText: `${profile.title} ${profile.ownershipType || ''} ${profile.id}`,
                }))}
                placeholder="جستجو و انتخاب پروفایل مالکیت کالاها…"
                noOptionsMessage="پروفایل مالکیتی مطابق جستجو پیدا نشد"
                ariaLabel="جستجو و انتخاب پروفایل مالکیت کالا"
                controlClassName={inputClass}
                clearable
              />
              <button type="button" className={buttonPrimary} onClick={() => handleAssignReviewItems('products')} disabled={submitting || !selectedProductReviewIds.length || !productAssignProfileId}><i className={`fa-solid ${busyAction === 'assign-products' ? 'fa-spinner fa-spin' : 'fa-check-double'}`} /> {busyAction === 'assign-products' ? 'در حال ثبت...' : `ثبت ${numberFa(selectedProductReviewIds.length)} انتساب`}</button>
            </div>
            <div className="space-y-2">
              {(reviewQueue?.products.items || []).slice(0, 40).map((item) => {
                const checked = selectedProductReviewIds.includes(item.id);
                return (
                  <label key={`review-product-${item.id}`} className="flex cursor-pointer items-start gap-3 rounded-[18px] border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900">
                    <CheckboxField controlOnly className="mt-1 h-4 w-4 rounded border-slate-300" checked={checked} onChange={() => setSelectedProductReviewIds((prev) => checked ? prev.filter((value) => value !== item.id) : [...prev, item.id])} />
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
    <div className="store-ownership-redesign-v2" data-ui-store-ownership-redesign="v2">
      <section className="store-ownership-hero">
        <div className="store-ownership-hero__main">
          <div className="store-ownership-kicker"><i className="fa-solid fa-handshake" /> مدیریت پیشرفته ساختار شراکت</div>
          <div>
            <h1>مرکز مالکیت و تسهیم سود</h1>
            <p>شرکا، درصدها، مالکیت موجودی و انتساب سوابق را با داده واقعی فروشگاه و بدون تغییر خودکار موارد مبهم مدیریت کنید.</p>
          </div>
          <div className="store-ownership-hero__meta">
            <span><i className="fa-solid fa-database" /> SQLite واقعی</span>
            <span><i className="fa-solid fa-shield-halved" /> فقط مدیر سیستم</span>
            <span><i className="fa-regular fa-clock" /> آخرین همگام‌سازی: {lastSyncedAt ? lastSyncedAt.toLocaleTimeString('fa-IR', { hour: '2-digit', minute: '2-digit' }) : 'در انتظار'}</span>
          </div>
        </div>

        <div className="store-ownership-hero__side">
          <div className={`store-ownership-status ${error ? 'is-error' : loading ? 'is-loading' : isShareTotalValid ? 'is-ready' : 'is-warning'}`}>
            <i className={`fa-solid ${error ? 'fa-triangle-exclamation' : loading ? 'fa-spinner fa-spin' : isShareTotalValid ? 'fa-circle-check' : 'fa-scale-unbalanced'}`} />
            <span>{error ? 'نیازمند رسیدگی' : loading ? 'در حال دریافت داده' : isShareTotalValid ? 'ساختار پایدار' : 'جمع سهم نیازمند تنظیم'}</span>
          </div>
          <div className="store-ownership-hero__quick-stats">
            <div><span>شرکای فعال</span><strong>{numberFa(coverage?.activeStorePartners ?? 0)}</strong></div>
            <div><span>پوشش موجودی</span><strong>{percentFa(coverageBlend)}</strong></div>
            <div><span>صف بازبینی</span><strong>{numberFa(totalReviewCount)}</strong></div>
          </div>
          <div className="store-ownership-hero__actions">
            <button type="button" className={buttonPrimary} onClick={() => jumpToTab('partners')}><i className="fa-solid fa-user-plus" /> شریک</button>
            <button type="button" className={buttonSecondary} onClick={() => jumpToTab('rules')}><i className="fa-solid fa-scale-balanced" /> درصدها</button>
            <Link to="/reports/partners-performance" className={buttonSecondary}><i className="fa-solid fa-chart-column" /> گزارش</Link>
            <button type="button" className={buttonGhost} onClick={fetchAll} disabled={loading || submitting}><i className={`fa-solid ${loading ? 'fa-spinner fa-spin' : 'fa-arrows-rotate'}`} /> تازه‌سازی</button>
            <Link to="/settings" className={buttonGhost}><i className="fa-solid fa-arrow-right" /> تنظیمات</Link>
          </div>
        </div>
      </section>

      {error ? (
        <div className="store-ownership-alert" role="alert">
          <i className="fa-solid fa-triangle-exclamation" />
          <span>{error}</span>
          <button type="button" onClick={() => setError(null)} aria-label="بستن پیام"><i className="fa-solid fa-xmark" /></button>
        </div>
      ) : null}

      <section className="store-ownership-workspace">
        <div className="store-ownership-tabs" role="tablist" aria-label="بخش‌های مدیریت شراکت">
          {tabs.map((tab) => {
            const active = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => jumpToTab(tab.id)}
                className={active ? 'is-active' : ''}
              >
                <i className={`fa-solid ${tab.icon}`} />
                <span>{tab.label}</span>
                {tab.id === 'review' && totalReviewCount > 0 ? <b>{numberFa(totalReviewCount)}</b> : null}
              </button>
            );
          })}
        </div>
        <div className="store-ownership-workspace__body">
          {loading && !storePartners.length && !coverage ? (
            <div className="store-ownership-loading">
              <i className="fa-solid fa-spinner fa-spin" />
              <span>در حال خواندن ساختار واقعی شراکت...</span>
            </div>
          ) : renderActiveTab()}
        </div>
      </section>
    </div>
  );

};

export default StoreOwnershipPage;
