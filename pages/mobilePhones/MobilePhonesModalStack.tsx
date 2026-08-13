import { SearchableSelectField, TextareaField, SelectField } from '@/components/ui';
import React from 'react';
import PhoneBulkPurchaseModal from './PhoneBulkPurchaseModal';
import type { Partner, PhoneEntry, PhoneStatus } from '../../types';
import type { ImportSheetRow } from '../../utils/dataImportExport';
import type {
  BulkActionWarning,
  BulkDiffItem,
  BulkImpactChange,
  PhoneTimelineItem,
} from '../viewBoundaryTypes';

type PhoneImportReport = { created: number; updated: number; skipped: number; errors: string[] };
type BulkImpactSummary = { headline: string; changes: BulkImpactChange[]; summaryBadges: string[] };
type BulkDiffPreview = {
  tone: 'violet' | 'sky';
  icon: string;
  title: string;
  summary: string;
  items: BulkDiffItem[];
  changedCount: number;
  unchangedCount: number;
};

export type MobilePhonesModalStackContext = Record<string, any> & {
    detailTimeline: PhoneTimelineItem[];
    phoneImportRows: ImportSheetRow[];
    phoneImportReport: PhoneImportReport | null;
    PHONE_CONDITIONS: string[];
    PHONE_STORAGE_OPTIONS: string[];
    PHONE_RAM_OPTIONS: string[];
    PHONE_STATUSES: PhoneStatus[];
    partners: Partner[];
    phones: PhoneEntry[];
    selectedPhones: PhoneEntry[];
    setEditingPhone: React.Dispatch<React.SetStateAction<Partial<PhoneEntry>>>;
    bulkImpactSummary: BulkImpactSummary | null;
    bulkDiffPreview: BulkDiffPreview | null;
  bulkActionWarnings: BulkActionWarning[];
};

type Props = {
  ctx: MobilePhonesModalStackContext;
};

const MobilePhonesModalStack: React.FC<Props> = ({ ctx }) => {
  const {
    AddableAutocomplete,
    Button,
    Modal,
    PHONE_CONDITIONS,
    PHONE_RAM_OPTIONS,
    PHONE_STATUSES,
    PHONE_STORAGE_OPTIONS,
    PriceInput,
    ShamsiDatePicker,
    Skeleton,
    addPhoneColor,
    addPhoneModel,
    batteryHealth,
    brand,
    bulkActionPreview,
    bulkActionWarnings,
    bulkDiffPreview,
    bulkImpactSummary,
    bulkSummary,
    canManage,
    changedCount,
    changes,
    color,
    condition,
    count,
    currentPurchasePrice,
    deletingPhone,
    deletingPhoneId,
    deletingPhoneSpec,
    detailAge,
    detailHistorySummary,
    detailProfit,
    detailTimeline,
    detailsHistoryError,
    detailsTab,
    doDownloadPhonesTemplate,
    doExportPhonesRoundtrip,
    editEntryContext,
    editFormErrors,
    editPurchaseDateSelected,
    editReadyForSalePulse,
    editingPhone,
    err,
    errors,
    formatHistoryDiffValue,
    formatIsoToShamsi,
    formatIsoToShamsiDateTime,
    formatPrice,
    getImportCell,
    handleBulkPurchaseCreated,
    handleConfirmBulkAction,
    handleConfirmDelete,
    handleEditInputChange,
    handleEditSubmit,
    handlePhoneImportFile,
    handleSellPhone,
    headline,
    icon,
    id,
    imei,
    inputClass,
    isBarcodeModalOpen,
    isBulkPurchaseOpen,
    isConfirmingBulkAction,
    isDeleteModalOpen,
    isDetailsHistoryLoading,
    isDetailsModalOpen,
    isEditModalOpen,
    isFetchingPartners,
    isImportingPhones,
    isPhoneImportExportOpen,
    isSubmittingDelete,
    isSubmittingEdit,
    item,
    key,
    labelClass,
    model,
    name,
    normalizeImportText,
    notes,
    openBarcodeModal,
    openEditModal,
    parseImportNumber,
    partners,
    pendingBulkAction,
    phoneColors,
    phoneImportFileName,
    phoneImportReport,
    phoneImportRows,
    phoneModels,
    phones,
    potentialProfit,
    purchaseDate,
    purchasePrice,
    ram,
    row,
    rows,
    runPhonesImport,
    salePrice,
    selectedPhoneForBarcode,
    selectedPhoneForDetails,
    selectedPhones,
    selectionContext,
    selectionPreset,
    sellerName,
    setDetailsHistory,
    setDetailsHistoryError,
    setDetailsTab,
    setEditEntryContext,
    setEditPurchaseDateSelected,
    setEditReadyForSalePulse,
    setEditingPhone,
    setIsBarcodeModalOpen,
    setIsBulkPurchaseOpen,
    setIsDeleteModalOpen,
    setIsDetailsModalOpen,
    setIsEditModalOpen,
    setIsPhoneImportExportOpen,
    setPendingBulkAction,
    setPhoneImportFileName,
    setPhoneImportReport,
    setPhoneImportRows,
    setSelectedPhoneForDetails,
    status,
    statusBadgeInfo,
    storage,
    supplierId,
    supplierName,
    target,
    text,
    toFaDigits,
    token,
    tone,
    totalPurchase,
    unchangedCount,
    value,
  } = ctx;

  return (
    <>
      <PhoneBulkPurchaseModal
        open={Boolean(isBulkPurchaseOpen)}
        onClose={() => setIsBulkPurchaseOpen(false)}
        token={token}
        partners={partners}
        phones={phones}
        phoneModels={phoneModels}
        phoneColors={phoneColors}
        addPhoneModel={addPhoneModel}
        addPhoneColor={addPhoneColor}
        onCreated={handleBulkPurchaseCreated}
      />
{/* Details Modal */}
 {isDetailsModalOpen && selectedPhoneForDetails && (
 <Modal
 title={`جزئیات دستگاه: ${selectedPhoneForDetails.model}`}
 onClose={() => { setIsDetailsModalOpen(false); setSelectedPhoneForDetails(null); setDetailsTab('overview'); setDetailsHistory([]); setDetailsHistoryError(null); }}
 widthClass="max-w-7xl"
 iconClass="fa-solid fa-mobile-screen-button"
 variant="expansive"
 size="full"
 layout="split"
 bodyClassName="mobile-phone-detail-modal-body"
 ><div className="space-y-4 p-2"><section className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-5 shadow-[0_30px_70px_-44px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]"><div className="grid gap-5 xl:grid-cols-[minmax(0,1.18fr)_minmax(19rem,0.82fr)]"><div className="space-y-4"><div className="flex flex-wrap items-center gap-2"><span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white/85 px-3 py-1.5 text-[11px] font-black tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-400"><i className="fa-solid fa-mobile-screen-button" style={{ color: brand }} /> DEVICE PROFILE</span><span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-black ${statusBadgeInfo(selectedPhoneForDetails.status).bgClass}`}><i className={`fa-solid ${statusBadgeInfo(selectedPhoneForDetails.status).icon}`}></i>{selectedPhoneForDetails.status}</span>{detailAge !== null ? <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-1.5 text-[11px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"><i className="fa-solid fa-hourglass-half" /> {detailAge.toLocaleString('fa-IR')} روز در انبار</span> : null}</div><div><h3 className="text-[1.65rem] font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.model}</h3><div className="mt-3 flex flex-wrap items-center gap-2 text-[12px] text-slate-500 dark:text-slate-400"><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 font-black dark:border-slate-700 dark:bg-slate-950/60"><i className="fa-solid fa-sim-card" /> {selectedPhoneForDetails.storage || '-'}</span><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 font-black dark:border-slate-700 dark:bg-slate-950/60"><i className="fa-solid fa-memory" /> {selectedPhoneForDetails.ram || '-'}</span><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-white/80 px-3 py-1.5 font-black dark:border-slate-700 dark:bg-slate-950/60"><i className="fa-solid fa-palette" /> {selectedPhoneForDetails.color || '-'}</span></div></div><div className="rounded-[24px] border border-slate-200/80 bg-white/82 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950/55"><div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_auto] md:items-start"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">IMEI / شناسه یکتا</div><div dir="ltr" className="mt-2 break-all font-mono text-[15px] font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.imei}</div></div><div className="flex flex-wrap justify-start gap-2 md:justify-end"><Button type="button" variant="secondary" size="sm" className="shadow-sm px-3" onClick={() => openBarcodeModal(selectedPhoneForDetails)} title="چاپ بارکد" leftIcon={<i className="fas fa-barcode" />}></Button>{canManage ? <Button type="button" variant="secondary" size="sm" onClick={() => { setIsDetailsModalOpen(false); openEditModal(selectedPhoneForDetails); }} leftIcon={<i className="fas fa-pen-to-square" />}>ویرایش اطلاعات</Button> : null}<Button type="button" variant="secondary" size="sm" onClick={() => handleSellPhone(selectedPhoneForDetails)} leftIcon={<i className="fas fa-cash-register" />}>فروش این دستگاه</Button></div></div></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: 'بهای خرید', value: formatPrice(selectedPhoneForDetails.purchasePrice), tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-bag-shopping' }, { label: 'قیمت فروش', value: formatPrice(selectedPhoneForDetails.salePrice), tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-tags' }, { label: 'سود/زیان ثبت اولیه', value: formatPrice(detailProfit), tone: detailProfit >= 0 ? 'text-emerald-600 dark:text-emerald-300' : 'text-rose-600 dark:text-rose-300', icon: 'fa-chart-line' }, { label: 'سلامت باتری', value: selectedPhoneForDetails.batteryHealth !== null && selectedPhoneForDetails.batteryHealth !== undefined ? `${Number(selectedPhoneForDetails.batteryHealth).toLocaleString('fa-IR')}٪` : 'ثبت اطلاعات نشده', tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-battery-three-quarters' }].map((item) => (<div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-white/84 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950/55"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.label}</div><div className={`mt-2 text-[15px] font-black ${item.tone}`}>{item.value}</div></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className={`fa-solid ${item.icon}`} /></span></div></div>))}</div></div><aside className="space-y-3"><div className="grid grid-cols-2 gap-3">{[{ label: 'تامین‌کننده', value: selectedPhoneForDetails.supplierName || 'ثبت اطلاعات نشده', icon: 'fa-truck-fast' }, { label: 'وضعیت ظاهری', value: selectedPhoneForDetails.condition || 'ثبت اطلاعات نشده', icon: 'fa-star' }, { label: 'تاریخ خرید', value: selectedPhoneForDetails.purchaseDate ? formatIsoToShamsi(selectedPhoneForDetails.purchaseDate) : 'ثبت اطلاعات نشده', icon: 'fa-calendar-days' }, { label: 'تاریخ فروش', value: selectedPhoneForDetails.saleDate ? formatIsoToShamsi(selectedPhoneForDetails.saleDate) : 'بدون خروج', icon: 'fa-calendar-check' }].map((item) => (<div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-white/82 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.14)] dark:border-slate-800 dark:bg-slate-950/55"><div className="flex items-center gap-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400"><i className={`fa-solid ${item.icon}`} /> {item.label}</div><div className="mt-2 text-[13px] font-black text-slate-900 dark:text-slate-50">{item.value}</div></div>))}</div><div className="rounded-[24px] border border-slate-200/80 bg-white/84 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-950/55"><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">خلاصه مدیریتی</div><p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">{selectedPhoneForDetails.status === 'موجود در انبار' ? 'این دستگاه آماده تصمیم فروش است. قیمت فروش، سود بالقوه و سن انبار را کنار هم بررسی و ادامه کن تا سریع‌تر از حالت راکد خارج شود.' : selectedPhoneForDetails.status === 'مرجوعی' || selectedPhoneForDetails.status === 'مرجوعی اقساطی' ? 'این دستگاه در چرخه بازگشت قرار دارد. قبل از فروش مجدد، وضعیت ظاهری، قیمت‌گذاری و توضیحات مرجوعی را دقیق چک کن.' : 'این دستگاه از انبار خارج شده و این نما برای رهگیری سابقه، قیمت و مسیر آن نگه داشته شده است.'}</p></div></aside></div></section><div className="rounded-[24px] border border-slate-200/80 bg-white/80 p-2 shadow-[0_22px_48px_-36px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/55"><div className="grid grid-cols-3 gap-3">{([{ key: 'overview', label: 'نمای کلی', icon: 'fa-grid-2' }, { key: 'timeline', label: 'تایم‌لاین', icon: 'fa-wave-square' }, { key: 'dossier', label: 'شناسنامه', icon: 'fa-id-card-clip' }] as const).map((tab) => { const active = detailsTab === tab.key; return (<button key={tab.key} type="button" onClick={() => setDetailsTab(tab.key)} className={`rounded-[18px] px-4 py-2.5 text-[13px] font-black transition ${active ? 'bg-slate-900 text-white shadow-[0_20px_36px_-24px_rgba(15,23,42,0.45)] dark:bg-white dark:text-slate-900' : 'bg-transparent text-slate-600 hover:bg-white dark:text-slate-300 dark:hover:bg-slate-900/60'}`}><span className="flex items-center justify-center gap-3"><i className={`fa-solid ${tab.icon}`} />{tab.label}</span></button>); })}</div></div><div className="grid grid-cols-2 gap-3 lg:grid-cols-4">{[{ label: 'سن انبار', value: detailAge !== null ? `${detailAge.toLocaleString('fa-IR')} روز` : 'نامشخص', tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-hourglass-half' }, { label: 'وضعیت', value: selectedPhoneForDetails.status, tone: 'text-slate-900 dark:text-slate-50', icon: 'fa-signal' }].map((item) => (<div key={item.label} className="rounded-[22px] border border-slate-200/80 bg-white/85 p-4 shadow-[0_20px_40px_-32px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/55"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">{item.label}</div><div className={`mt-2 text-[13px] font-black ${item.tone}`}>{item.value}</div></div><span className="inline-flex h-10 w-10 items-center justify-center rounded-2xl border border-slate-200/80 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className={`fa-solid ${item.icon}`} /></span></div></div>))}</div><div className="grid grid-cols-1 gap-3 xl:grid-cols-[minmax(0,1.14fr)_minmax(0,0.86fr)]">{detailsTab !== 'dossier' && (<section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900/85"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">LIFECYCLE TIMELINE</div><h4 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">تایم‌لاین چرخه عمر دستگاه</h4></div><span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">{detailTimeline.length.toLocaleString('fa-IR')} رویداد</span></div><div className="mt-5 space-y-3">{detailTimeline.map((event, index) => (<div key={event.key} className="relative rounded-[22px] border border-slate-200/80 bg-slate-50/70 p-4 pr-14 dark:border-slate-800 dark:bg-slate-950/50">{index !== detailTimeline.length - 1 && <span className="absolute right-[1.7rem] top-[3.3rem] h-[calc(100%+0.9rem)] w-px bg-gradient-to-b from-slate-300 to-transparent dark:from-slate-700" />}<span className={`absolute right-4 top-4 inline-flex h-9 w-9 items-center justify-center rounded-2xl ${event.tone === 'emerald' ? 'bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300' : event.tone === 'amber' ? 'bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300' : event.tone === 'violet' ? 'bg-violet-100 text-violet-700 dark:bg-violet-950/40 dark:text-violet-300' : event.tone === 'rose' ? 'bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300' : event.tone === 'sky' ? 'bg-sky-100 text-sky-700 dark:bg-sky-950/40 dark:text-sky-300' : 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300'}`}><i className={`fa-solid ${event.icon}`} /></span><div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between"><div><div className="text-[13px] font-black text-slate-900 dark:text-slate-50">{event.title}</div><p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">{event.description}</p>{Array.isArray((event as any).diffs) && (event as any).diffs.length > 0 ? (<div className="mt-3 flex flex-wrap gap-3">{(event as any).diffs.map((diff: any, idx: number) => (<span key={`${diff.key || diff.label}-${idx}`} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200"><span className="text-slate-500 dark:text-slate-400">{diff.label}</span><span>{formatHistoryDiffValue(diff.from, diff.kind)}</span><i className="fa-solid fa-arrow-left text-[10px] text-slate-400" /><span className="text-slate-900 dark:text-slate-50">{formatHistoryDiffValue(diff.to, diff.kind)}</span></span>))}</div>) : null}{(event as any).meta ? <div className="mt-3 text-xs text-slate-400 dark:text-slate-500">{(event as any).meta}</div> : null}</div><div className="text-xs font-black text-slate-500 dark:text-slate-400">{event.date ? (String(event.date).includes('T') ? formatIsoToShamsiDateTime(event.date) : formatIsoToShamsi(event.date)) : 'بدون تاریخ'}</div></div></div>))}</div></section>)}<aside className="space-y-3"><section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900/85"><div className="flex items-center justify-between gap-3"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">EVENT LOG</div><h4 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">تاریخچه واقعی ثبت اطلاعات‌شده</h4></div><span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950/50 dark:text-slate-300"><i className="fa-solid fa-database" />{detailHistorySummary.count.toLocaleString('fa-IR')} رویداد</span></div>{isDetailsHistoryLoading ? (<div className="mt-4 space-y-3"><Skeleton className="h-16 rounded-[18px]" /><Skeleton className="h-16 rounded-[18px]" /></div>) : detailsHistoryError ? (<div className="mt-4 rounded-[20px] border border-rose-200 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-700 dark:border-rose-900/50 dark:bg-rose-950/30 dark:text-rose-300">{detailsHistoryError}</div>) : (<div className="mt-4 grid grid-cols-2 gap-3 text-sm"><div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">آخرین تغییر</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{detailHistorySummary.lacheck?.title || 'هنوز ثبت اطلاعات نشده'}</div></div><div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">آخرین ثبت اطلاعات‌کننده</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{detailHistorySummary.lacheck?.actorDisplayName || detailHistorySummary.lacheck?.actorUsername || 'نامشخص'}</div></div><div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">تاچ قیمت</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{detailHistorySummary.priceTouches.toLocaleString('fa-IR')}</div></div><div className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">تاچ وضعیت</div><div className="mt-2 font-black text-slate-900 dark:text-slate-50">{detailHistorySummary.statusTouches.toLocaleString('fa-IR')}</div></div></div>)}<div className="mt-4 rounded-[22px] border border-dashed border-slate-300 bg-slate-50/70 p-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-300">این بخش از لاگ واقعی backend خوانده می‌شود. هر تغییر مهم روی قیمت، وضعیت، تامین یا شناسنامه دستگاه اینجا قابل رهگیری است.</div></section>{detailsTab !== 'timeline' && (<section className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.2)] dark:border-slate-800 dark:bg-slate-900/85"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">DEVICE DOSSIER</div><h4 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">شناسنامه کامل دستگاه</h4><div className="mt-4 space-y-3 text-sm"><div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"><span className="text-slate-500 dark:text-slate-400">فروشنده/ثبت اطلاعات‌کننده</span><span className="font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.sellerName || 'ثبت اطلاعات نشده'}</span></div><div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"><span className="text-slate-500 dark:text-slate-400">خریدار</span><span className="font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.buyerName || 'ثبت اطلاعات نشده'}</span></div><div className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"><span className="text-slate-500 dark:text-slate-400">تاریخ بازگشت</span><span className="font-black text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.returnDate || 'ندارد'}</span></div><div className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 dark:border-slate-800 dark:bg-slate-950/50"><div className="text-slate-500 dark:text-slate-400">یادداشت مدیریتی</div><div className="mt-2 text-sm font-semibold leading-7 text-slate-900 dark:text-slate-50">{selectedPhoneForDetails.notes || 'یادداشتی برای این دستگاه ثبت اطلاعات نشده است.'}</div></div></div></section>)}</aside></div></div></Modal>
 )}
 <Modal
 isOpen={isPhoneImportExportOpen}
 title="ایمپورت / اکسپورت لیست گوشی‌ها"
 onClose={() => setIsPhoneImportExportOpen(false)}
 widthClass="max-w-5xl"
 iconClass="fa-solid fa-file-import"
 tone="info"
 variant="expansive"
 layout="split"
 >
 <div className="space-y-5 p-2" dir="rtl">
 <section className="rounded-[26px] border border-slate-200 bg-white p-4 md:p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950">
 <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
 <div className="flex min-w-0 items-start gap-3">
 <span className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100"><i className="fa-solid fa-mobile-screen-button" /></span>
 <div className="min-w-0">
 <h3 className="text-base font-black text-slate-950 dark:text-white">ورود و خروج دقیق لیست گوشی‌ها</h3>
 <p className="mt-1 text-sm leading-7 text-slate-500 dark:text-slate-400">برای ورود مجدد، از «خروجی کامل قابل ایمپورت» استفاده کن؛ فایل «قالب نمونه» فقط یک ردیف راهنما دارد. رکوردها با شناسه یا IMEI بروزرسانی می‌شوند و اگر موردی پیدا نشود گوشی جدید ثبت می‌شود.</p>
 </div>
 </div>
 <div className="flex flex-col gap-2 sm:items-end">
 <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
 <Button type="button" variant="secondary" size="sm" onClick={doDownloadPhonesTemplate} leftIcon={<i className="fa-solid fa-file-lines" />}>قالب نمونه</Button>
 <Button type="button" variant="secondary" size="sm" onClick={doExportPhonesRoundtrip} disabled={phones.length === 0} leftIcon={<i className="fa-solid fa-file-export" />}>خروجی کامل قابل ایمپورت</Button>
 </div>
 <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">خروجی کامل شامل {phones.length.toLocaleString('fa-IR')} گوشی است؛ قالب نمونه فقط راهنماست.</span>
 </div>
 </div>
 </section>

 <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,0.95fr)_minmax(0,1.05fr)]">
 <label className="group flex cursor-pointer flex-col items-center justify-center rounded-[26px] border border-dashed border-slate-300 bg-slate-50 p-6 text-center transition hover:border-slate-400 hover:bg-white dark:border-slate-700 dark:bg-slate-900/60 dark:hover:border-slate-600 dark:hover:bg-slate-900">
 <span className="grid h-12 w-12 place-items-center rounded-2xl border border-slate-200 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100"><i className="fa-solid fa-cloud-arrow-up" /></span>
 <span className="mt-3 text-sm font-black text-slate-900 dark:text-white">انتخاب فایل XLSX / CSV</span>
 <span className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">ستون‌های ضروری: مدل، IMEI و قیمت خرید. ستون‌های تکمیلی مثل قیمت خرید روز، وضعیت، باتری، تامین‌کننده و یادداشت هم پشتیبانی می‌شوند.</span>
 <input type="file" accept=".xlsx,.xls,.csv" className="sr-only" onChange={handlePhoneImportFile} />
 </label>

 <section className="rounded-[26px] border border-slate-200 bg-white p-4 shadow-sm dark:border-slate-800 dark:bg-slate-950">
 <div className="flex items-center justify-between gap-3">
 <div>
 <div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">IMPORT PREVIEW</div>
 <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{phoneImportFileName || 'فایلی انتخاب نشده'}</div>
 </div>
 <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-xs font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{phoneImportRows.length.toLocaleString('fa-IR')} ردیف</span>
 </div>

 <div className="mt-4 max-h-56 space-y-2 overflow-auto pr-1">
 {phoneImportRows.slice(0, 6).map((row) => {
 const model = normalizeImportText(getImportCell(row, ['مدل', 'model'])) || 'بدون مدل';
 const imei = normalizeImportText(getImportCell(row, ['imei', 'شناسه دستگاه'])) || 'بدون IMEI';
 const purchase = parseImportNumber(getImportCell(row, ['قیمت خرید', 'purchase price', 'purchasePrice']), 0);
 return (
 <div key={row.__rowNumber} className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-xs dark:border-slate-800 dark:bg-slate-900/60">
 <span className="min-w-0 truncate font-bold text-slate-800 dark:text-slate-100">{model}</span>
 <span className="shrink-0 font-mono text-slate-500 dark:text-slate-400">{imei}</span>
 <span className="shrink-0 text-slate-500 dark:text-slate-400">{formatPrice(purchase)}</span>
 </div>
 );
 })}
 {phoneImportRows.length === 0 ? <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-400">بعد از انتخاب فایل، چند ردیف اول اینجا نمایش داده می‌شود.</div> : null}
 </div>

 {phoneImportReport ? (
 <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
 <div className="font-black text-slate-900 dark:text-white">نتیجه: {phoneImportReport.created.toLocaleString('fa-IR')} جدید، {phoneImportReport.updated.toLocaleString('fa-IR')} بروزرسانی، {phoneImportReport.skipped.toLocaleString('fa-IR')} ردشده</div>
 {phoneImportReport.errors.slice(0, 4).map((err) => <div key={err} className="mt-1 text-rose-600 dark:text-rose-300">{err}</div>)}
 </div>
 ) : null}

 <div className="mt-4 flex flex-col-reverse gap-2 sm:flex-row sm:items-center sm:justify-end">
 <Button type="button" variant="secondary" size="sm" onClick={() => { setPhoneImportRows([]); setPhoneImportFileName(''); setPhoneImportReport(null); }}>پاک‌کردن</Button>
 <Button type="button" variant="primary" size="sm" loading={isImportingPhones} loadingText="در حال ایمپورت گوشی‌ها…" disabled={!canManage || phoneImportRows.length === 0 || isImportingPhones} onClick={runPhonesImport} leftIcon={<i className="fa-solid fa-file-import" />}>شروع ایمپورت</Button>
 </div>
 </section>
 </div>
 </div>
 </Modal>

 {/* Edit Modal */}
 {isEditModalOpen && editingPhone.id && (
 <Modal
 title={`ویرایش اطلاعات گوشی: ${editingPhone.model} (IMEI: ${editingPhone.imei})`}
 onClose={() => { setIsEditModalOpen(false); setEditEntryContext(null); setEditReadyForSalePulse(null); }}
 widthClass="max-w-6xl"
 iconClass="fa-solid fa-pen-to-square"
 variant="expansive"
 layout="split"
 bodyClassName="mobile-phone-edit-modal-body"
 ><form onSubmit={handleEditSubmit} className="phone-edit-vertical-form max-h-[78vh] space-y-5 overflow-y-auto p-2 pr-1 text-sm">
 {editEntryContext ? (
 <div
 className={`rounded-2xl border px-4 py-2.5 text-xs sm:text-sm ${editEntryContext === 'pricing'
 ? 'border-violet-200 bg-violet-50/90 text-violet-800 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-200'
 : 'border-amber-200 bg-amber-50/90 text-amber-800 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-200'}`}
 ><div className="flex items-start gap-3"><span className={`mt-0.5 inline-flex h-7 w-7 items-center justify-center rounded-full ${editEntryContext === 'pricing' ? 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-200' : 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200'}`}><i className={`fa-solid ${editEntryContext === 'pricing' ? 'fa-tags' : 'fa-clipboard-check'}`} /></span><div className="min-w-0"><div className="font-black">{editEntryContext === 'pricing' ? 'ورود از مسیر قیمت‌گذاری' : 'ورود از مسیر بازبینی وضعیت'}</div><div className="mt-1 leading-6 opacity-90">
 {editEntryContext === 'pricing'
 ? 'برای باز کردن مسیر فروش، قیمت فروش این دستگاه را ثبت اطلاعات یا اصلاح کن. بعد از ذخیره تغییرات، دوباره از همان منو می‌توانی مستقیم وارد فروش شوی.'
 : 'برای باز کردن مسیر فروش، وضعیت این دستگاه را بررسی و ادامه و در صورت نیاز اصلاح کن. بعد از ذخیره تغییرات، دوباره از همان منو می‌توانی مستقیم وارد فروش شوی.'}
 </div></div></div></div>
 ) : null}
 <div className="phone-edit-horizontal-form grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]"><section className="phone-identity-block phone-identity-block--edit rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-slate-800 dark:bg-slate-950/35"><div className="phone-identity-block__header mb-4 flex flex-col gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 "><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">DEVICE IDENTITY</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">هویت دستگاه</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">شناسنامه اصلی دستگاه را اینجا تمیز و خوانا نگه دار.</div></div><div className="phone-identity-block__grid grid grid-cols-1 gap-4 md:grid-cols-2"><div className="phone-identity-block__field phone-identity-block__field--model "><label className={labelClass}><i className="fa-solid fa-tag" style={{ color: brand }} /> مدل</label><AddableAutocomplete
 value={editingPhone.model || ''}
 onChange={(v: string) => handleEditInputChange({ target: { name: 'model', value: v } })}
 options={phoneModels}
 onAdd={addPhoneModel}
 preview="Galaxy S24 Ultra"
 inputClassName={`${inputClass('model', false, editFormErrors)} text-left`}
 errorText={editFormErrors.model || null}
 dir="ltr"
 /></div><div className="phone-identity-block__field phone-identity-block__field--imei "><label className={labelClass}><i className="fa-solid fa-hashtag" style={{ color: brand }} /> IMEI</label><input
 name="imei"
 value={editingPhone.imei || ''}
 onChange={handleEditInputChange}
 dir="ltr"
 className={`${inputClass('imei', false, editFormErrors)} text-left`}
 />
 {editFormErrors.imei && <p className="mt-1 text-xs text-rose-500">{editFormErrors.imei}</p>}
 </div><div className="phone-identity-block__field phone-identity-block__field--condition "><label className={labelClass}><i className="fa-solid fa-wand-sparkles" style={{ color: brand }} /> وضعیت ظاهری</label><SelectField controlOnly unstyled showChevron={false}
 name="condition"
 value={editingPhone.condition || ''}
 onChange={handleEditInputChange}
 className={inputClass('condition', true, editFormErrors)}
 >
 {PHONE_CONDITIONS.map(c =><option key={c} value={c}>{c}</option>)}
 </SelectField></div><div className="phone-identity-block__field phone-identity-block__field--color "><label className={labelClass}><i className="fa-solid fa-droplet" style={{ color: brand }} /> رنگ</label><AddableAutocomplete
value={editingPhone.color || ''}
onChange={(v: string) => setEditingPhone((prev) => prev ? { ...prev, color: v } : prev)}
options={phoneColors}
onAdd={addPhoneColor}
preview="مثلاً مشکی یا Graphite"
inputClassName={`${inputClass('color', false, editFormErrors)} text-right`}
dir="rtl"
/></div><div className=""><label className={labelClass}><i className="fa-solid fa-sd-card" style={{ color: brand }} /> حافظه</label><SelectField controlOnly unstyled showChevron={false} name="storage" value={editingPhone.storage || ''} onChange={handleEditInputChange} className={inputClass('storage', true, editFormErrors)}>{PHONE_STORAGE_OPTIONS.map(s =><option key={s} value={s}>{s}</option>)}</SelectField></div><div className=""><label className={labelClass}><i className="fa-solid fa-microchip" style={{ color: brand }} /> رم</label><SelectField controlOnly unstyled showChevron={false} name="ram" value={editingPhone.ram || ''} onChange={handleEditInputChange} className={inputClass('ram', true, editFormErrors)}>{PHONE_RAM_OPTIONS.map(r =><option key={r} value={r}>{r}</option>)}</SelectField></div><div className="phone-identity-block__field phone-identity-block__field--purchase-date  space-y-1"><label className={labelClass}><i className="fa-solid fa-calendar-days" style={{ color: brand }} /> تاریخ خرید</label><ShamsiDatePicker
 selectedDate={editPurchaseDateSelected}
 onDateChange={setEditPurchaseDateSelected}
 invalid={Boolean(editFormErrors.purchaseDate)}
 />
 {editFormErrors.purchaseDate && <p className="mt-1 text-xs text-rose-500">{editFormErrors.purchaseDate}</p>}
 </div><div className="phone-identity-block__field phone-identity-block__field--battery  space-y-1"><label className={labelClass}><i className="fa-solid fa-battery-three-quarters" style={{ color: brand }} /> سلامت باتری</label><div className="space-y-2"><input
 name="batteryHealth"
 value={editingPhone.batteryHealth || ''}
 onChange={handleEditInputChange}
 disabled={editingPhone.condition === 'نو (آکبند)'}
 title={editingPhone.condition === 'نو (آکبند)' ? 'برای گوشی نو، سلامت باتری به‌صورت خودکار ۱۰۰٪ ثبت می‌شود.' : undefined}
 className={inputClass('batteryHealth', false, editFormErrors)}
 /></div>
 {editFormErrors.batteryHealth && <p className="mt-1 text-xs text-rose-500">{editFormErrors.batteryHealth}</p>}
 </div></div></section><section className="phone-finance-block phone-finance-block--edit rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_-32px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950/45"><div className="phone-finance-block__header mb-4 flex flex-col gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 "><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">FINANCE & SUPPLY</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">مالی و تامین</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">قیمت‌ها و تامین‌کننده را یک‌جا مدیریت کن.</div></div><div className="phone-finance-block__grid grid grid-cols-1 gap-4 md:grid-cols-2"><div className="phone-finance-block__field phone-finance-block__field--purchase  space-y-1"><label className={labelClass}><i className="fa-solid fa-sack-dollar" style={{ color: brand }} /> قیمت خرید</label><PriceInput
 name="purchasePrice"
 value={String(editingPhone.purchasePrice || '')}
 onChange={handleEditInputChange}
 className={`${inputClass('purchasePrice', false, editFormErrors)} text-left`}
 suffix="تومان"
 />
 {editFormErrors.purchasePrice && <p className="mt-1 text-xs text-rose-500">{editFormErrors.purchasePrice}</p>}
 </div><div className="phone-finance-block__field phone-finance-block__field--current-purchase space-y-1"><label className={labelClass}><i className="fa-solid fa-scale-balanced" style={{ color: brand }} /> قیمت خرید روز</label><PriceInput
 name="currentPurchasePrice"
 value={String(editingPhone.currentPurchasePrice || '')}
 onChange={handleEditInputChange}
 className={`${inputClass('currentPurchasePrice', false, editFormErrors)} text-left`}
 suffix="تومان"
 />
 {editFormErrors.currentPurchasePrice && <p className="mt-1 text-xs text-rose-500">{editFormErrors.currentPurchasePrice}</p>}
 </div><div className={`phone-finance-block__field phone-finance-block__field--sale md:col-span-2 space-y-1 rounded-[18px] border border-transparent p-2 transition-all ${editEntryContext === 'pricing' ? 'border border-violet-200/80 bg-violet-50/70 shadow-[0_10px_24px_-18px_rgba(124,58,237,0.35)] dark:border-violet-900/60 dark:bg-violet-950/20' : 'bg-slate-50/70 dark:bg-slate-950/30'}`}><div className="flex items-center justify-between gap-3"><label className={labelClass}><i className="fa-solid fa-tags" style={{ color: brand }} /> قیمت فروش</label>
 {editEntryContext === 'pricing' ? (
 <span className="inline-flex items-center gap-1 rounded-full border border-violet-200/80 bg-violet-100/80 px-2 py-1 text-[10px] font-black text-violet-700 dark:border-violet-900/60 dark:bg-violet-900/30 dark:text-violet-200"><i className="fa-solid fa-bullseye" />
 فیلد هدف
 </span>
 ) : null}
 </div><PriceInput
 id="edit-sale-price-input"
 name="salePrice"
 value={String(editingPhone.salePrice || '')}
 onChange={handleEditInputChange}
 className={`${inputClass('salePrice', false, editFormErrors)} text-left ${editEntryContext === 'pricing' ? 'ring-2 ring-violet-400/30 dark:ring-violet-500/30' : ''}`}
 topLabel="قیمت فروش"
 suffix="تومان"
 preview={editEntryContext === 'pricing' && !String(editingPhone.salePrice || '').trim() ? 'برای فعال شدن فروش، قیمت را وارد کن' : 'مثال: ۳۸۵۰۰۰۰۰'}
 />
 {editEntryContext === 'pricing' ? <p className="text-[11px] leading-5 text-violet-700 dark:text-violet-200">برای باز شدن مسیر فروش، این فیلد را ثبت اطلاعات یا اصلاح کن.</p> : null}
 {editEntryContext === 'pricing' && !String(editingPhone.salePrice || '').trim() ? <p className="text-[11px] leading-5 text-violet-600/90 dark:text-violet-300/90">بدون قیمت فروش، این دستگاه مستقیم وارد مسیر فروش نمی‌شود.</p> : null}
 {editFormErrors.salePrice && <p className="mt-1 text-xs text-rose-500">{editFormErrors.salePrice}</p>}
 </div><div className="phone-finance-block__field phone-finance-block__field--supplier min-w-0 space-y-1 rounded-[16px] border border-slate-200/70 bg-slate-50/70 p-2 dark:border-slate-800 dark:bg-slate-950/30"><label className={labelClass}><i className="fa-solid fa-truck" style={{ color: brand }} /> تامین‌کننده</label><SearchableSelectField<string>
 name="supplierId"
 value={editingPhone.supplierId ? String(editingPhone.supplierId) : null}
 onValueChange={(value) => handleEditInputChange({ target: { name: 'supplierId', value: value ?? '' } })}
 options={partners.map((partner) => ({
 value: String(partner.id),
 label: partner.partnerName,
 searchText: `${partner.partnerName} ${partner.id}`,
 }))}
 placeholder={isFetchingPartners ? 'در حال دریافت تأمین‌کنندگان…' : 'نام تأمین‌کننده را تایپ کنید…'}
 disabled={isFetchingPartners}
 loading={isFetchingPartners}
 invalid={Boolean(editFormErrors.supplierId)}
 controlClassName={`${inputClass('supplierId', true, editFormErrors)} h-11 min-w-0 text-sm`}
 noOptionsMessage="تأمین‌کننده‌ای مطابق جستجو پیدا نشد"
 ariaLabel="جستجو و انتخاب تأمین‌کننده گوشی"
 />
 {editFormErrors.supplierId && <p className="mt-1 text-xs text-rose-500">{editFormErrors.supplierId}</p>}
 </div><div className={`phone-finance-block__field phone-finance-block__field--status phone-operations-block__field phone-operations-block__field--status min-w-0 max-w-none rounded-[16px] border border-transparent p-2 transition-all ${editEntryContext === 'status-review' ? 'border border-amber-200/80 bg-amber-50/70 shadow-[0_10px_24px_-18px_rgba(245,158,11,0.35)] dark:border-amber-900/60 dark:bg-amber-950/20' : 'bg-slate-50/70 dark:bg-slate-950/30'}`}><div className="flex items-center justify-between gap-3"><label className={labelClass}><i className="fa-solid fa-check-circle" style={{ color: brand }} /> وضعیت</label>
 {editEntryContext === 'status-review' ? (
 <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-100/80 px-2 py-1 text-[10px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-900/30 dark:text-amber-200"><i className="fa-solid fa-bullseye" />
 فیلد هدف
 </span>
 ) : null}
 </div><SelectField controlOnly unstyled showChevron={false} id="edit-status-select" name="status" value={editingPhone.status || ''} onChange={handleEditInputChange} className={`${inputClass('status', true, editFormErrors)} h-11 min-w-0 text-sm ${editEntryContext === 'status-review' ? 'ring-2 ring-amber-400/30 dark:ring-amber-500/30' : ''}`}>
 {PHONE_STATUSES.map((s) => {
 const contextualLabel = editEntryContext === 'status-review'
 ? s === 'موجود در انبار'
 ? 'موجود در انبار — مسیر فروش باز'
 : s === 'مرجوعی'
 ? 'مرجوعی — نیازمند بررسی و ادامه قبل از فروش'
 : s === 'مرجوعی اقساطی'
 ? 'مرجوعی اقساطی — بررسی و ادامه ویژه قبل از فروش'
 : s === 'فروخته شده'
 ? 'فروخته شده — خارج از مسیر فروش'
 : s === 'فروخته شده (قسطی)'
 ? 'فروخته شده اقساطی — خارج از مسیر فروش'
 : s
 : s;
 return <option key={s} value={s}>{contextualLabel}</option>;
 })}
 </SelectField>
 {editEntryContext === 'status-review' ? <p className="mt-1 text-[11px] leading-5 text-amber-700 dark:text-amber-200">برای باز شدن مسیر فروش، معمولاً وضعیت «موجود در انبار» انتخاب درست‌تری است.</p> : null}
 </div></div></section><section className="phone-operations-block phone-operations-block--edit xl:col-span-2 rounded-[24px] border border-slate-200/80 bg-slate-50/75 p-4 dark:border-slate-800 dark:bg-slate-950/35"><div className="phone-operations-block__header mb-4 flex flex-col gap-2 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 "><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">NOTES & CONTEXT</div><h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">وضعیت و یادداشت</h3></div><div className="text-xs text-slate-500 dark:text-slate-400">هر توضیح مدیریتی یا نکته فروش را اینجا ثبت اطلاعات کن.</div></div><div className="phone-operations-block__grid grid grid-cols-1 gap-4"><div className="phone-operations-block__field phone-operations-block__field--notes  "><label className={labelClass}><i className="fa-solid fa-note-sticky" style={{ color: brand }} /> یادداشت</label><TextareaField controlOnly name="notes" value={editingPhone.notes || ''} onChange={handleEditInputChange} rows={4} className={inputClass('notes', false, editFormErrors)} /></div></div></section></div>

 

 {editReadyForSalePulse ? (
 <div className="rounded-2xl border border-emerald-200/80 bg-emerald-50/80 px-4 py-2.5 shadow-[0_12px_28px_-20px_rgba(16,185,129,0.45)] dark:border-emerald-900/60 dark:bg-emerald-950/25"><div className="flex items-start gap-3"><span className="mt-0.5 inline-flex h-8 w-8 items-center justify-center rounded-full bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"><i className="fa-solid fa-circle-check" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-3"><span className="text-[13px] font-black text-emerald-800 dark:text-emerald-100">الان این دستگاه آماده فروش است</span><span className="inline-flex items-center rounded-full border border-emerald-200/80 bg-white/80 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-800/70 dark:bg-emerald-900/30 dark:text-emerald-200">{editReadyForSalePulse.model}</span></div><p className="mt-1 text-[11px] leading-5 text-emerald-700/90 dark:text-emerald-200/90">
 {editReadyForSalePulse.from === 'pricing' ? 'قیمت‌گذاری کامل شد و مسیر فروش باز شده است.' : 'وضعیت و گردش اصلاح شد و حالا می‌تواند وارد فروش شود.'}
 </p><div className="mt-3 flex flex-wrap items-center gap-3"><Button
 type="button"
 variant="secondary"
 size="sm"
 className="h-8 rounded-full border-emerald-200 bg-white/90 px-3 text-[11px] font-black text-emerald-700 shadow-none hover:bg-emerald-50 dark:border-emerald-800/60 dark:bg-emerald-950/20 dark:text-emerald-200 dark:hover:bg-emerald-900/30"
 leftIcon={<i className="fa-solid fa-cash-register" />}
 onClick={() => {
 const readyPhone = phones.find((p) => p.id === editReadyForSalePulse.phoneId) || editingPhone;
 if (readyPhone) {
 setIsEditModalOpen(false);
 setEditReadyForSalePulse(null);
 setEditEntryContext(null);
 handleSellPhone(readyPhone, editReadyForSalePulse.from);
 }
 }}
 >
 فروش همین دستگاه
 </Button><span className="text-[10px] font-medium text-emerald-700/80 dark:text-emerald-200/80">بدون خروج از این مسیر مستقیم وارد فروش شو.</span></div></div><span className="inline-flex items-center gap-1 rounded-full bg-emerald-100/90 px-2 py-1 text-[10px] font-black text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200"><i className="fa-solid fa-bolt" />
 آماده فروش
 </span></div></div>
 ) : null}

 <div className="flex justify-end pt-4 gap-3 border-t border-gray-200 dark:border-gray-700"><button type="button" onClick={() => { setIsEditModalOpen(false); setEditReadyForSalePulse(null); setEditEntryContext(null); }} className="px-3.5 py-1.5 rounded-lg bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-200 dark:hover:bg-gray-600">
 انصراف
 </button><Button
 type="submit"
 disabled={isSubmittingEdit || !token}
 loading={isSubmittingEdit}
 loadingText={editEntryContext === 'pricing' ? 'در حال ذخیره تغییرات قیمت‌گذاری...' : editEntryContext === 'status-review' ? 'در حال ذخیره تغییرات بازبینی وضعیت...' : 'در حال ذخیره تغییرات...'}
 loadingHint={editEntryContext === 'pricing' ? 'ثبت اطلاعات قیمت فروش و آماده‌سازی مسیر فروش دستگاه' : editEntryContext === 'status-review' ? 'اعمال وضعیت جدید و بررسی و ادامه باز شدن مسیر فروش' : 'اعمال تغییرات گوشی و همگام‌سازی مشخصات'}
 successPulseText={editEntryContext === 'pricing' ? 'قیمت‌گذاری ذخیره تغییرات شد' : editEntryContext === 'status-review' ? 'وضعیت ذخیره تغییرات شد' : 'ویرایش اطلاعات ذخیره تغییرات شد'}
 successPulseHint={editEntryContext === 'pricing' ? 'قیمت فروش این دستگاه با موفقیت ثبت یا به‌روزرسانی شد' : editEntryContext === 'status-review' ? 'وضعیت این دستگاه با موفقیت به‌روزرسانی شد' : 'مشخصات گوشی با موفقیت به‌روزرسانی شد'}
 variant="primary"
 size="md"
 className="min-w-[11rem] text-white"
 style={{ backgroundColor: brand }}
 leftIcon={<i className="fa-solid fa-floppy-disk" />}
 >
 {editEntryContext === 'pricing'
 ? 'ذخیره تغییرات و باز کردن مسیر فروش'
 : editEntryContext === 'status-review' && editingPhone.status === 'موجود در انبار'
 ? 'ذخیره تغییرات و باز کردن مسیر فروش'
 : editEntryContext === 'status-review'
 ? 'ذخیره تغییرات بازبینی وضعیت'
 : 'ذخیره تغییرات'}
 </Button></div></form></Modal>
 )}

 {/* Delete Phone Modal */}
 {isDeleteModalOpen && deletingPhoneId !== null && (
 <Modal title="حذف این گوشی از انبار" onClose={() => setIsDeleteModalOpen(false)} widthClass="max-w-2xl" iconClass="fa-solid fa-trash-can" tone="danger" variant="compact" layout="horizontal" bodyClassName="mobile-phone-delete-modal-body"><div className="space-y-4"><div className="rounded-[24px] border border-rose-200 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(255,241,242,0.96))] p-4 shadow-[0_18px_42px_-34px_rgba(225,29,72,0.35)] dark:border-rose-900/70 dark:bg-[linear-gradient(180deg,rgba(30,41,59,0.98),rgba(76,5,25,0.3))]"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="inline-flex items-center gap-2 rounded-full border border-rose-200 bg-rose-50 px-3 py-1 text-[11px] font-black text-rose-700 dark:border-rose-900/70 dark:bg-rose-950/30 dark:text-rose-200"><i className="fa-solid fa-triangle-exclamation" /> عملیات غیرقابل بازگشت</div><h3 className="mt-3 text-[18px] font-black text-slate-900 dark:text-slate-50">آیا از حذف این گوشی مطمئن هستی؟</h3><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">با تأیید این عملیات، رکورد این دستگاه از انبار حذف می‌شود و برای بازیابی آن باید دوباره به‌صورت دستی ثبت شود.</p></div><div className="rounded-[22px] border border-rose-200/80 bg-white/90 px-4 py-3 text-center shadow-sm dark:border-rose-900/60 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.14em] text-rose-500 dark:text-rose-300">DELETE PREVIEW</div><div className="mt-2 text-[28px] font-black text-rose-600 dark:text-rose-300">#{toFaDigits(deletingPhone?.id ?? deletingPhoneId)}</div><div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">شناسه رکورد انبار</div></div></div></div><div className="grid gap-3 sm:grid-cols-2"><div className="rounded-[22px] border border-slate-200/80 bg-white/95 p-4 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">DEVICE SNAPSHOT</div><div className="mt-3 flex items-start gap-3"><span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"><i className="fa-solid fa-mobile-screen-button" /></span><div className="min-w-0"><div className="text-sm font-black text-slate-900 dark:text-slate-50">{deletingPhone?.model || 'گوشی انتخاب‌شده'}</div>{deletingPhoneSpec ? <div className="mt-1 text-xs font-bold text-slate-500 dark:text-slate-400">{deletingPhoneSpec}</div> : null}<div className="mt-2 inline-flex max-w-full items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-fingerprint" /><span className="truncate" dir="ltr">{deletingPhone?.imei || '-'}</span></div></div></div><div className="mt-4 grid gap-2.5"><div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">وضعیت فعلی</span><span className="font-black text-slate-800 dark:text-slate-100">{deletingPhone?.status || 'نامشخص'}</span></div><div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">قیمت خرید</span><span className="font-black text-slate-800 dark:text-slate-100">{formatPrice(deletingPhone?.purchasePrice)}</span></div><div className="flex items-center justify-between gap-3 rounded-2xl border border-slate-200/80 bg-slate-50/80 px-3 py-2.5 text-xs dark:border-slate-800 dark:bg-slate-900/60"><span className="text-slate-500 dark:text-slate-400">تاریخ خرید</span><span className="font-black text-slate-800 dark:text-slate-100">{deletingPhone?.purchaseDate ? formatIsoToShamsi(deletingPhone.purchaseDate) : 'ثبت نشده'}</span></div></div></div><div className="rounded-[22px] border border-amber-200/80 bg-amber-50/90 p-4 dark:border-amber-900/60 dark:bg-amber-950/20"><div className="text-[11px] font-black tracking-[0.14em] text-amber-700 dark:text-amber-300">قبل از حذف این مورد</div><ul className="mt-3 space-y-2.5 text-xs leading-7 text-amber-800 dark:text-amber-200"><li className="flex items-start gap-2"><i className="fa-solid fa-check mt-1" /> اگر فقط می‌خواهی گوشی از مسیر فروش خارج شود، بهتر است ابتدا وضعیت آن را بررسی کنی.</li><li className="flex items-start gap-2"><i className="fa-solid fa-check mt-1" /> حذف این رکورد مناسب زمانی است که ثبت اشتباه بوده یا این دستگاه دیگر نباید در انبار دیده شود.</li>{deletingPhone?.notes ? <li className="flex items-start gap-2"><i className="fa-solid fa-note-sticky mt-1" /> یادداشت این مورد: <span className="font-black text-slate-700 dark:text-slate-100">{deletingPhone.notes}</span></li> : null}</ul></div></div><div className="flex flex-col-reverse justify-end gap-3 border-t border-slate-200/80 pt-4 sm:flex-row dark:border-slate-800"><Button onClick={() => setIsDeleteModalOpen(false)} variant="secondary" size="md">انصراف و بازگشت</Button><Button
 onClick={handleConfirmDelete}
 disabled={isSubmittingDelete || !token}
 loading={isSubmittingDelete}
 loadingText="در حال حذف مورد..."
 loadingHint="در حال پاک‌سازی رکورد این گوشی از انبار"
 successPulseText="حذف مورد انجام شد"
 successPulseHint="این دستگاه با موفقیت از انبار حذف شد"
 variant="danger"
 size="md"
 className="min-w-[12rem]"
 leftIcon={<i className="fa-solid fa-trash-can" />}
 >
 حذف قطعی این گوشی
 </Button></div></div></Modal>
 )}

 {/* Bulk Confirmation Modal */}
 {pendingBulkAction && bulkActionPreview && (
 <Modal
 title={bulkActionPreview.title}
 onClose={() => !isConfirmingBulkAction && setPendingBulkAction(null)}
 widthClass="max-w-2xl"
 iconClass={`fa-solid ${bulkActionPreview.icon}`}
 tone="warning"
 variant="compact"
 layout="horizontal"
 bodyClassName="mobile-phone-bulk-confirm-modal-body"
 ><div className="space-y-3"><div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.96))] p-4 shadow-[0_16px_38px_-28px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]"><div className="flex flex-col gap-3.5 lg:flex-row lg:items-start lg:justify-between"><div><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">CONFIRMATION DRAWER</div><h4 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">خلاصه عملیات قبل از اجرا</h4><p className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">{bulkActionPreview.description}</p><div className="mt-3 rounded-[18px] border border-[color:var(--brand)]/15 bg-[color:var(--brand)]/10 px-3 py-3 text-xs leading-6 text-[color:var(--brand)]"><span className="font-black">اثر احتمالی:</span> {bulkActionPreview.impact}
 </div></div><div className="grid min-w-[15rem] grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-1"><div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3 py-3 text-xs dark:border-slate-700 dark:bg-slate-900/80"><span className="block text-slate-500 dark:text-slate-400">تعداد انتخاب</span><span className="mt-1 block text-base font-black text-slate-900 dark:text-slate-50">{bulkSummary.count.toLocaleString('fa-IR')} دستگاه</span></div><div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3 py-3 text-xs dark:border-slate-700 dark:bg-slate-900/80"><span className="block text-slate-500 dark:text-slate-400">ارزش خرید</span><span className="mt-1 block text-base font-black text-slate-900 dark:text-slate-50">{formatPrice(bulkSummary.totalPurchase)}</span></div><div className="rounded-[18px] border border-emerald-200 bg-emerald-50/90 px-3 py-3 text-xs dark:border-emerald-900/60 dark:bg-emerald-950/30"><span className="block text-emerald-700 dark:text-emerald-300">سود بالقوه</span><span className="mt-1 block text-base font-black text-emerald-700 dark:text-emerald-300">{formatPrice(bulkSummary.potentialProfit)}</span></div><div className="rounded-[18px] border border-slate-200/80 bg-white/90 px-3 py-3 text-xs dark:border-slate-700 dark:bg-slate-900/80"><span className="block text-slate-500 dark:text-slate-400">ریتم اقدام</span><span className="mt-1 block text-base font-black text-slate-900 dark:text-slate-50">{selectionContext?.label || 'انتخاب عملیاتی'}</span></div></div></div></div><div className="grid gap-3.5 lg:grid-cols-[minmax(0,1fr)_minmax(0,0.9fr)]"><div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">SELECTION SNAPSHOT</div><div className="mt-3 flex flex-wrap gap-3">
 {selectedPhones.slice(0, 6).map((phone) => (
 <span key={phone.id} className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200"><i className="fa-solid fa-mobile-screen" />
 {phone.model}
 </span>
 ))}
 {selectedPhones.length > 6 ? <span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-3 py-1.5 text-xs font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">+{(selectedPhones.length - 6).toLocaleString('fa-IR')} مورد دیگر</span> : null}
 </div>
 {selectionPreset ? (
 <div className="mt-4 rounded-[18px] border border-[color:var(--brand)]/20 bg-[color:var(--brand)]/10 px-3 py-3 text-xs leading-6 text-[color:var(--brand)]"><span className="inline-flex items-center gap-3 font-black"><i className={`fa-solid ${selectionPreset.icon}`} /> {selectionPreset.label}</span><div className="mt-1">{selectionPreset.hint}</div></div>
 ) : null}
 </div><div className="rounded-[22px] border border-slate-200/80 bg-white/90 p-4 dark:border-slate-800 dark:bg-slate-950/60"><div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">RISK CHECK, DIFF & KPI IMPACT</div>
 {bulkImpactSummary ? (
 <div className="mt-3 rounded-[20px] border border-emerald-200 bg-emerald-50/90 px-4 py-4 text-xs leading-6 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><div className="flex items-center gap-3 text-[13px] font-black"><i className="fa-solid fa-chart-mixed-up-circle-dollar" /> خلاصه اثر روی KPIها</div><p className="mt-2">{bulkImpactSummary.headline}</p><div className="mt-3 grid gap-3 sm:grid-cols-2">
 {bulkImpactSummary.changes.length > 0 ? bulkImpactSummary.changes.map((item) => (
 <div key={item.key} className="rounded-[16px] border border-white/70 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40"><div className="flex items-center gap-3 text-[11px] font-black text-slate-700 dark:text-slate-200"><i className={`fa-solid ${item.icon} text-emerald-500`} /> {item.label}</div><div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-black"><span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{item.from.toLocaleString('fa-IR')}</span><i className="fa-solid fa-arrow-left-long opacity-70" /><span className="inline-flex items-center rounded-full border border-emerald-300 bg-emerald-100 px-2.5 py-1 text-emerald-700 dark:border-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-300">{item.to.toLocaleString('fa-IR')}</span></div></div>
 )) : bulkImpactSummary.summaryBadges.map((badge) => (
 <div key={badge} className="rounded-[16px] border border-white/70 bg-white/80 px-3 py-3 font-black dark:border-slate-800/80 dark:bg-slate-950/40">{badge}</div>
 ))}
 </div></div>
 ) : null}
 {bulkDiffPreview ? (
 <div className={`mt-3 rounded-[20px] border px-4 py-4 text-xs leading-6 ${bulkDiffPreview.tone === 'violet' ? 'border-violet-200 bg-violet-50/90 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300' : 'border-sky-200 bg-sky-50/90 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300'}`}><div className="flex items-center gap-3 text-[13px] font-black"><i className={`fa-solid ${bulkDiffPreview.icon}`} /> {bulkDiffPreview.title}</div><p className="mt-2">{bulkDiffPreview.summary}</p><div className="mt-3 space-y-3">
 {bulkDiffPreview.items.map((item) => (
 <div key={item.id} className="rounded-[16px] border border-white/60 bg-white/80 px-3 py-3 dark:border-slate-800/80 dark:bg-slate-950/40"><div className="flex flex-wrap items-center gap-3 text-[11px] text-slate-500 dark:text-slate-400"><span className="font-black text-slate-900 dark:text-slate-50">{item.label}</span><span>{item.meta}</span></div><div className="mt-2 flex flex-wrap items-center gap-3 text-xs font-black"><span className="inline-flex items-center rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">{item.from}</span><i className="fa-solid fa-arrow-left-long opacity-70" /><span className="inline-flex items-center rounded-full border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/12 px-2.5 py-1 text-[color:var(--brand)]">{item.to}</span></div></div>
 ))}
 </div><div className="mt-3 flex flex-wrap gap-3 text-[11px] font-black"><span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white px-2.5 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-pen-to-square" /> {bulkDiffPreview.changedCount.toLocaleString('fa-IR')} تغییر واقعی</span>
 {bulkDiffPreview.unchangedCount > 0 ? <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2.5 py-1 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"><i className="fa-solid fa-equals" /> {bulkDiffPreview.unchangedCount.toLocaleString('fa-IR')} بدون تغییر</span> : null}
 </div></div>
 ) : null}
 <div className="mt-3 space-y-3">
 {bulkActionWarnings.length > 0 ? bulkActionWarnings.map((warning) => (
 <div key={warning.text} className={`flex items-start gap-3 rounded-[18px] border px-3 py-3 text-xs leading-6 ${warning.tone === 'rose' ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300' : warning.tone === 'amber' ? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300' : warning.tone === 'violet' ? 'border-violet-200 bg-violet-50 text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300' : 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300'}`}><span className="mt-0.5 inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white/70 dark:bg-slate-950/40"><i className={`fa-solid ${warning.icon}`} /></span><span>{warning.text}</span></div>
 )) : (
 <div className="rounded-[18px] border border-emerald-200 bg-emerald-50 px-3 py-3 text-xs leading-6 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"><span className="font-black">وضعیت خوب است:</span> ریسک برجسته‌ای در انتخاب فعلی دیده نشد و عملیات می‌تواند مستقیم اجرا شود.
 </div>
 )}
 </div></div></div><div className="flex flex-col-reverse gap-3 border-t border-slate-200/80 pt-4 dark:border-slate-800 sm:flex-row sm:items-center sm:justify-end"><button type="button" onClick={() => setPendingBulkAction(null)} disabled={isConfirmingBulkAction} className="ux-btn ux-btn-secondary h-10 rounded-2xl px-4 text-[11px] shadow-sm ux-btn-md disabled:opacity-50">انصراف</button><button type="button" onClick={handleConfirmBulkAction} disabled={isConfirmingBulkAction || bulkActionPreview.disabled} className="ux-btn ux-btn-primary h-10 rounded-2xl px-4 text-[11px] shadow-sm ux-btn-md min-w-[12rem] disabled:opacity-50"><i className={`fa-solid ${bulkActionPreview.icon}`} /><span>{isConfirmingBulkAction ? 'در حال اجرا...' : bulkActionPreview.confirmLabel}</span></button></div></div></Modal>
 )}

 {/* Barcode Modal */}
 {isBarcodeModalOpen && selectedPhoneForBarcode && (
 <Modal
 title={`بارکد برای: ${selectedPhoneForBarcode.model}`}
 onClose={() => setIsBarcodeModalOpen(false)}
 widthClass="max-w-sm"
 wrapperClassName="printable-area"
 iconClass="fa-solid fa-barcode"
 tone="info"
 variant="compact"
 ><div id="barcode-label-content" className="text-center p-4"><img src={`/api/barcode/phone/${selectedPhoneForBarcode.id}`} alt={`Barcode for ${selectedPhoneForBarcode.model}`} className="mx-auto" /><p className="mt-2 font-semibold text-lg text-gray-900 dark:text-gray-100">{selectedPhoneForBarcode.model}</p><p className="text-sm text-gray-600 dark:text-gray-300">IMEI: {selectedPhoneForBarcode.imei}</p><p className="text-sm text-gray-600 dark:text-gray-300">{formatPrice(selectedPhoneForBarcode.salePrice)}</p></div><div className="flex justify-end pt-4 mt-4 border-t border-gray-200 dark:border-gray-700 print:hidden"><button
 type="button"
 onClick={() => window.print}
 className="px-3.5 py-1.5 rounded-lg text-white"
 style={{ backgroundColor: brand }}
 ><i className="fas fa-print ml-2" /> چاپ برچسب
 </button></div></Modal>
 )}
    </>
  );
};

export default MobilePhonesModalStack;
