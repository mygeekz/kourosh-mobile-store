import { ControlShell, DataTableShell, IconGlyph, SearchableSelectField, SelectField, TableActionGroup, TextField, TextareaField, inferIconGlyphTone } from '@/components/ui';
import React from "react";
import EmptyState from "../../components/ui/EmptyState";
import type {
  Partner,
  PhoneEntry,
  PhoneHistoryEventClass,
  PhoneInventoryChangeReport,
  PhoneInventoryDashboardReport,
  PhoneInventoryEnterpriseReport,
  PhoneInventoryExplorerEvent,
  PhoneStatus,
} from "../../types";
import type { InventorySortMode, SavedInventoryView } from "./mobilePhonesControllerSupport";
import type {
  buildExplorerContextCard,
  buildExplorerFocusCards,
  buildInsightsActionCards,
  buildInventoryIntelligence,
} from "./mobilePhonesViewModels";
import type { DateRange, HistoryExplorerFilters, HistoryReportCard } from "../viewBoundaryTypes";
import PhoneIntakeSummaryPanel from "./PhoneIntakeSummaryPanel";
import PhoneMarketEvidenceWorkspace from "./PhoneMarketEvidenceWorkspace";
import { PhoneRegisterSubmitAction } from "../../components/actions/OperationalLoadingButtons";
export type MobilePhonesMainWorkspaceContext = Record<string, any> & {
    PHONE_STORAGE_OPTIONS: string[];
    PHONE_RAM_OPTIONS: string[];
    PHONE_CONDITIONS: string[];
    PHONE_STATUSES: PhoneStatus[];
    partners: Partner[];
    explorerFocusCards: ReturnType<typeof buildExplorerFocusCards>;
    insightsActionCards: ReturnType<typeof buildInsightsActionCards>;
    historyReportCards: HistoryReportCard[];
    historyReport: PhoneInventoryChangeReport | null;
    setHistoryExplorerFilters: React.Dispatch<React.SetStateAction<HistoryExplorerFilters>>;
    modelFilterOptions: string[];
    historyExplorerClassOptions: Array<{ key: PhoneHistoryEventClass; label: string; icon: string }>;
    historyExplorerEvents: PhoneInventoryExplorerEvent[];
    enterpriseHistoryReport: PhoneInventoryEnterpriseReport | null;
    drilldownPhones: PhoneEntry[];
    dashboardReport: PhoneInventoryDashboardReport | null;
    savedViewMeta: Array<{ key: SavedInventoryView; label: string; icon: string }>;
    setInventoryExplorerDateRange: React.Dispatch<React.SetStateAction<DateRange>>;
    explorerContextCard: ReturnType<typeof buildExplorerContextCard>;
    supplierFilterOptions: string[];
    inventoryIntelligence: ReturnType<typeof buildInventoryIntelligence>;
  inventoryExplorerPhones: PhoneEntry[];
};

type Props = {
  ctx: MobilePhonesMainWorkspaceContext;
};

const MobilePhonesMainWorkspace: React.FC<Props> = ({ ctx }) => {
  const {
    AddableAutocomplete,
    Button,
    FormErrorSummary,
    PHONE_CONDITIONS,
    PHONE_RAM_OPTIONS,
    PHONE_STATUSES,
    PHONE_STORAGE_OPTIONS,
    PriceInput,
    ShamsiDatePicker,
    Skeleton,
    activeFilterCount,
    addPhoneColor,
    addPhoneModel,
    ageDays,
    alerts,
    allVisibleSelected,
    applyDashboardDrilldown,
    batteryBadge,
    batteryFilter,
    baseInput,
    batteryHealth,
    batteryValue,
    brand,
    bulkStatusTarget,
    bulkSummary,
    bulkSupplierTarget,
    canManage,
    clearDashboardDrilldown,
    clearExplorerFilters,
    color,
    condition,
    count,
    currentPurchasePrice,
    dashboardDrilldown,
    dashboardDrilldownSummary,
    dashboardReport,
    drilldownPhones,
    duplicateImeiPhone,
    enterpriseHistoryReport,
    errors,
    explorerContextCard,
    explorerFocusCards,
    explorerRef,
    exportExplorerContextCsv,
    exportHistoryExplorerCsv,
    exportHistoryExplorerPrintReport,
    eventToneClasses,
    fastMoving,
    flags,
    formErrors,
    formatIsoToShamsi,
    formatIsoToShamsiDateTime,
    formatPrice,
    formatShortPrice,
    getEventClassMeta,
    getPhoneCostBasisAmount,
    getPhoneOperationalFlags,
    getSellAvailability,
    handleInputChange,
    handleSelectionPresetAction,
    handleSellPhone,
    handleSubmit,
    hasPhoneFormErrors,
    historyExplorerClassOptions,
    historyExplorerEvents,
    historyExplorerFilters,
    historyReport,
    historyReportCards,
    icon,
    id,
    imei,
    initialNewPhoneState,
    inputClass,
    insightsActionCards,
    inventoryAIPrompt,
    inventoryExplorerDateRange,
    inventoryExplorerDateRangeLabel,
    inventoryExplorerDateRangeTone,
    inventoryExplorerPhones,
    inventoryIntelligence,
    inventoryViewMode,
    isBulkSubmitting,
    isFetching,
    isFetchingPartners,
    isHistoryExplorerLoading,
    isHistoryReportLoading,
    isLoading,
    item,
    key,
    labelClass,
    model,
    modelFilter,
    modelFilterOptions,
    moment,
    name,
    newPhone,
    notes,
    openBarcodeModal,
    openDeleteModal,
    openDetailsModal,
    openEditModal,
    openExplorerContextHistory,
    partners,
    phoneColors,
    phoneFormErrorLabels,
    phoneFormFieldIdMap,
    phoneInventoryDrilldownEnabled,
    phoneModels,
    phones,
    potentialProfit,
    pressureLabel,
    purchaseDate,
    purchaseDateSelected,
    purchasePrice,
    ram,
    requestBulkAction,
    row,
    rows,
    salePrice,
    savedView,
    savedViewMeta,
    searchTerm,
    selectedPhoneIds,
    selectedPhones,
    selectionContext,
    selectionPreset,
    setBatteryFilter,
    setBulkStatusTarget,
    setBulkSupplierTarget,
    setFormErrors,
    setHistoryExplorerFilters,
    setInventoryExplorerDateRange,
    setInventoryViewMode,
    setIsBulkPurchaseOpen,
    setIsPhoneImportExportOpen,
    setModelFilter,
    setNewPhone,
    setPurchaseDateSelected,
    setSavedView,
    setSearchTerm,
    setSelectedPhoneIds,
    setSortMode,
    setStatusFilter,
    setSupplierFilter,
    sortMode,
    staleCount,
    status,
    statusBadgeInfo,
    statusFilter,
    storage,
    supplierFilter,
    supplierFilterOptions,
    supplierId,
    supplierName,
    target,
    text,
    toFaDigits,
    togglePhoneSelection,
    toggleSelectAllVisible,
    token,
    tone,
    topAction,
    total,
    totalPurchase,
    value,
    width,
    workspace,
  } = ctx;

  return (
    <>
      <section className="grid grid-cols-1 gap-3">
        <div className="space-y-3">
          <div className="rounded-[28px] border border-slate-200/80 bg-white p-6 shadow-[0_26px_60px_-40px_rgba(15,23,42,0.28)] dark:border-slate-800 dark:bg-slate-900/85">
            <div className="mb-6 flex flex-col gap-3 border-b border-slate-200 pb-4 dark:border-slate-800">
              <div className="inline-flex w-fit items-center gap-3 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-[11px] font-black tracking-[0.16em] text-slate-500 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <i
                  className="fa-solid fa-mobile-screen-button"
                  style={{ color: brand }}
                />
                ثبت کالای جدید
              </div>
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex flex-col gap-1">
                  <h2 className="text-xl font-black text-slate-900 dark:text-slate-50">
                    افزودن گوشی به موجودی
                  </h2>
                  <p className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                    ثبت تکی برای یک دستگاه یا ثبت گروهی شبیه فاکتور خرید برای چند گوشی.
                  </p>
                </div>
                {canManage ? (
                  <Button
                    type="button"
                    variant="secondary"
                    size="md"
                    autoIcon={false}
                    className="w-full shrink-0 sm:w-auto"
                    onClick={() => setIsBulkPurchaseOpen(true)}
                  >
                    <span className="inline-flex items-center gap-2">
                      <i className="fa-solid fa-file-invoice-dollar" style={{ color: brand }} />
                      افزودن گروهی گوشی
                    </span>
                  </Button>
                ) : null}
              </div>
            </div>
            <form onSubmit={handleSubmit} className="space-y-3">
              {hasPhoneFormErrors ? (
                <FormErrorSummary
                  errors={formErrors as any}
                  labels={phoneFormErrorLabels}
                  fieldIdMap={phoneFormFieldIdMap}
                />
              ) : null}
              <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_21.5rem]">
                <div className="order-1 space-y-3 xl:order-1">
                  <section className="phone-identity-block rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-[1.125rem] dark:border-slate-800 dark:bg-slate-950/45">
                    <div className="phone-identity-block__header mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          مشخصات کالا
                        </div>
                        <h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">
                          مشخصات دستگاه
                        </h3>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        مدل، شناسه و ویژگی‌های اصلی دستگاه
                      </div>
                    </div>
                    <div className="phone-identity-block__grid grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-6 xl:grid-cols-12">
                      <div className="phone-identity-block__field phone-identity-block__field--model md:col-span-3 xl:col-span-6">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-mobile-screen"
                            style={{ color: brand }}
                          />{" "}
                          مدل <span className="text-rose-500">*</span>
                        </label>
                        <AddableAutocomplete
                          value={newPhone.model}
                          onChange={(v: string) =>
                            handleInputChange({
                              target: { name: "model", value: v },
                            })
                          }
                          options={phoneModels}
                          onAdd={addPhoneModel}
                          preview="iPhone 13 Pro"
                          inputClassName={`${inputClass("model")} text-left`}
                          errorText={formErrors.model}
                          dir="ltr"
                        />
                      </div>
                      <div className="phone-identity-block__field phone-identity-block__field--imei md:col-span-3 xl:col-span-6">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-sim-card"
                            style={{ color: brand }}
                          />{" "}
                          IMEI <span className="text-rose-500">*</span>
                        </label>
                        <div className="space-y-3">
                          <TextField controlOnly unstyled
                            id="imei"
                            name="imei"
                            value={newPhone.imei}
                            onChange={handleInputChange}
                            className={inputClass("imei")}
                            placeholder="۱۵ یا ۱۶ رقم"
                            dir="ltr"
                          />
                          <div
                            className={`rounded-2xl border px-3 py-2 text-xs ${duplicateImeiPhone ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"}`}
                          >
                            {duplicateImeiPhone
                              ? `IMEI تکراری است؛ دستگاه مشابه با مدل «${duplicateImeiPhone.model}» قبلاً ثبت اطلاعات شده.`
                              : "IMEI فعلاً در لیست فعلی تکراری دیده نشد."}
                          </div>
                        </div>
                        {formErrors.imei && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.imei}
                          </p>
                        )}
                      </div>
                      <div className="phone-identity-block__field phone-identity-block__field--color md:col-span-2 md:row-start-2 xl:col-span-4 xl:row-start-2">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-palette"
                            style={{ color: brand }}
                          />{" "}
                          رنگ
                        </label>
                        <AddableAutocomplete
                          value={newPhone.color || ""}
                          onChange={(v: string) =>
                            handleInputChange({
                              target: { name: "color", value: v },
                            })
                          }
                          options={phoneColors}
                          onAdd={addPhoneColor}
                          preview="مثلاً مشکی یا Graphite"
                          inputClassName={`${inputClass("color")} text-right`}
                          dir="rtl"
                        />
                      </div>
                      <div className="md:col-span-2 md:row-start-2 xl:col-span-4 xl:row-start-2">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-memory"
                            style={{ color: brand }}
                          />{" "}
                          حافظه
                        </label>
                        <SelectField controlOnly unstyled showChevron={false}
                          name="storage"
                          value={newPhone.storage}
                          onChange={handleInputChange}
                          className={inputClass("storage", true)}
                        >
                          {PHONE_STORAGE_OPTIONS.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </SelectField>
                      </div>
                      <div className="md:col-span-2 md:row-start-2 xl:col-span-4 xl:row-start-2">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-microchip"
                            style={{ color: brand }}
                          />{" "}
                          رم
                        </label>
                        <SelectField controlOnly unstyled showChevron={false}
                          name="ram"
                          value={newPhone.ram}
                          onChange={handleInputChange}
                          className={inputClass("ram", true)}
                        >
                          {PHONE_RAM_OPTIONS.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </SelectField>
                      </div>
                    </div>
                  </section>
                  <section className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-[1.125rem] dark:border-slate-800 dark:bg-slate-950/45">
                    <div className="mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 sm:flex-row sm:items-center sm:justify-between">
                      <div>
                        <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          ارزیابی خرید
                        </div>
                        <h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">
                          وضعیت فنی و ظاهری دستگاه
                        </h3>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        ارزیابی سلامت دستگاه برای خرید و فروش مطمئن
                      </div>
                    </div>
                    <div className="grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-6 xl:grid-cols-12">
                      <div className="md:col-span-3 xl:col-span-4">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-shield-heart"
                            style={{ color: brand }}
                          />{" "}
                          وضعیت ظاهری
                        </label>
                        <SelectField controlOnly unstyled showChevron={false}
                          name="condition"
                          value={newPhone.condition}
                          onChange={handleInputChange}
                          className={inputClass("condition", true)}
                        >
                          {PHONE_CONDITIONS.map((c) => (
                            <option key={c} value={c}>
                              {c}
                            </option>
                          ))}
                        </SelectField>
                      </div>
                      <div className="md:col-span-2 xl:col-span-2">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-battery-three-quarters"
                            style={{ color: brand }}
                          />{" "}
                          سلامت باتری
                        </label>
                        <div className="space-y-3">
                          <TextField controlOnly unstyled
                            id="batteryHealth"
                            type="number"
                            name="batteryHealth"
                            value={newPhone.batteryHealth}
                            onChange={handleInputChange}
                            className={inputClass("batteryHealth")}
                            placeholder="مثال: ۹۵"
                            min={0}
                            max={100}
                            disabled={newPhone.condition === "نو (آکبند)"}
                            title={
                              newPhone.condition === "نو (آکبند)"
                                ? "برای گوشی نو، سلامت باتری به‌صورت خودکار ۱۰۰٪ ثبت می‌شود."
                                : undefined
                            }
                          />
                          <div
                            className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-xs font-black ${batteryBadge.tone}`}
                          >
                            <i className="fa-solid fa-battery-half" />
                            {batteryBadge.label}
                          </div>
                        </div>
                        {formErrors.batteryHealth && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.batteryHealth}
                          </p>
                        )}
                      </div>
                      <div className="md:col-span-3 xl:col-span-6">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-calendar-days"
                            style={{ color: brand }}
                          />{" "}
                          تاریخ خرید
                        </label>
                        <div id="purchaseDate" data-field-key="purchaseDate">
                          <ShamsiDatePicker
                            selectedDate={purchaseDateSelected}
                            onDateChange={setPurchaseDateSelected}
                            invalid={Boolean(formErrors.purchaseDate)}
                          />
                        </div>
                        {formErrors.purchaseDate && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.purchaseDate}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                  <section className="phone-finance-block rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-[1.125rem] dark:border-slate-800 dark:bg-slate-950/45">
                    <div className="phone-finance-block__header mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          قیمت‌گذاری
                        </div>
                        <h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">
                          قیمت و تأمین
                        </h3>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        بهای خرید، قیمت فروش و تأمین‌کننده دستگاه
                      </div>
                    </div>
                    <div className="phone-finance-block__grid grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-6 xl:grid-cols-12">
                      <div className="phone-finance-block__field phone-finance-block__field--purchase md:col-span-2 xl:col-span-3">
                        <PriceInput
                          id="purchasePrice"
                          name="purchasePrice"
                          value={String(newPhone.purchasePrice)}
                          onChange={handleInputChange}
                          className={`${inputClass("purchasePrice")} text-left`}
                          preview="مثال: ۳۵۰۰۰۰۰۰"
                          topLabel="بهای خرید"
                          suffix="تومان"
                        />
                        {formErrors.purchasePrice && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.purchasePrice}
                          </p>
                        )}
                      </div>
                      <div className="phone-finance-block__field phone-finance-block__field--sale md:col-span-2 xl:col-span-3">
                        <PriceInput
                          id="salePrice"
                          name="salePrice"
                          value={String(newPhone.salePrice || "")}
                          onChange={handleInputChange}
                          className={`${inputClass("salePrice")} text-left`}
                          preview="مثال: ۳۸۵۰۰۰۰۰"
                          topLabel="قیمت فروش"
                          suffix="تومان"
                        />
                        {formErrors.salePrice && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.salePrice}
                          </p>
                        )}
                      </div>
                      <div className="phone-finance-block__field phone-finance-block__field--supplier md:col-span-2 xl:col-span-6">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-people-carry-box"
                            style={{ color: brand }}
                          />{" "}
                          تامین‌کننده
                        </label>
                        <SearchableSelectField<string>
                          inputId="supplierId"
                          name="supplierId"
                          value={newPhone.supplierId ? String(newPhone.supplierId) : null}
                          onValueChange={(value) => handleInputChange({ target: { name: 'supplierId', value: value ?? '' } })}
                          options={partners.map((partner) => ({
                            value: String(partner.id),
                            label: partner.partnerName,
                            searchText: `${partner.partnerName} ${partner.id}`,
                          }))}
                          placeholder={isFetchingPartners ? 'در حال دریافت تأمین‌کنندگان…' : 'نام تأمین‌کننده را تایپ کنید…'}
                          disabled={isFetchingPartners}
                          loading={isFetchingPartners}
                          invalid={Boolean(formErrors.supplierId)}
                          controlClassName={inputClass("supplierId", true)}
                          noOptionsMessage="تأمین‌کننده‌ای مطابق جستجو پیدا نشد"
                          ariaLabel="جستجو و انتخاب تأمین‌کننده گوشی"
                        />
                        {isFetchingPartners && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            درحال بارگذاری…
                          </p>
                        )}
                        {formErrors.supplierId && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.supplierId}
                          </p>
                        )}
                      </div>
                    </div>
                  </section>
                  <section className="phone-operations-block rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-[1.125rem] dark:border-slate-800 dark:bg-slate-950/45">
                    <div className="phone-operations-block__header mb-4 flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800/90 sm:flex-row sm:items-start sm:justify-between">
                      <div>
                        <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          آماده فروش
                        </div>
                        <h3 className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">
                          وضعیت فروش
                        </h3>
                      </div>
                      <div className="text-xs text-slate-500 dark:text-slate-400">
                        وضعیت عرضه و توضیحات موردنیاز تیم فروش
                      </div>
                    </div>
                    <div className="phone-operations-block__grid grid grid-cols-1 gap-x-4 gap-y-5 md:grid-cols-6 xl:grid-cols-12">
                      <div className="phone-operations-block__field phone-operations-block__field--status md:col-span-2 xl:col-span-3">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-check-circle"
                            style={{ color: brand }}
                          />{" "}
                          وضعیت
                        </label>
                        <SelectField controlOnly unstyled showChevron={false}
                          id="status"
                          name="status"
                          value={newPhone.status}
                          onChange={handleInputChange}
                          className={inputClass("status", true)}
                        >
                          {PHONE_STATUSES.map((s) => (
                            <option key={s} value={s}>
                              {s}
                            </option>
                          ))}
                        </SelectField>
                        {formErrors.status && (
                          <p className="mt-1 text-xs text-rose-500">
                            {formErrors.status}
                          </p>
                        )}
                      </div>
                      <div className="phone-operations-block__field phone-operations-block__field--notes md:col-span-4 xl:col-span-9">
                        <label className={labelClass}>
                          <i
                            className="fa-solid fa-note-sticky"
                            style={{ color: brand }}
                          />{" "}
                          یادداشت مدیریتی
                        </label>
                        <TextareaField controlOnly
                          name="notes"
                          value={newPhone.notes || ""}
                          onChange={handleInputChange}
                          rows={5}
                          className={`${inputClass("notes")} resize-y leading-7`}
                          placeholder="نکات ظاهری، رجیستری، ایراد خاص یا توضیح فروش"
                        />
                      </div>
                    </div>
                  </section>
                  <div className="phone-register-submitbar flex flex-col gap-3 rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/50 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">
                        ثبت در موجودی فروش
                      </div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        اطلاعات دستگاه را ثبت و به موجودی فروش اضافه کنید.
                      </div>
                    </div>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                      <PhoneRegisterSubmitAction
                        loading={isLoading}
                        disabled={
                          isLoading ||
                          isFetching ||
                          isFetchingPartners ||
                          !token ||
                          !!duplicateImeiPhone
                        }
                      />
                      <Button
                        type="button"
                        variant="secondary"
                        size="md"
                        autoIcon={false}
                        className="phone-register-submitbar__reset w-full sm:w-auto"
                        onClick={() => {
                          setNewPhone(initialNewPhoneState);
                          setPurchaseDateSelected(null);
                          setFormErrors({});
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <i
                            className="fa-solid fa-rotate-left text-[13px]"
                            aria-hidden="true"
                          />
                          پاک‌سازی فرم
                        </span>
                      </Button>
                    </div>
                  </div>
                </div>
                <PhoneIntakeSummaryPanel ctx={ctx} />
              </div>
            </form>
          </div>
        </div>
        <PhoneMarketEvidenceWorkspace ctx={ctx} />
        <div ref={explorerRef} className="space-y-3 scroll-mt-24">
          <div className="sticky top-20 z-20 -mt-3">
            <div
              className={`rounded-[18px] border px-3 py-2 shadow-[0_14px_30px_-28px_rgba(15,23,42,0.24)] backdrop-blur transition ${selectedPhones.length > 0 ? "border-[color:var(--brand)]/20 bg-[linear-gradient(180deg,rgba(255,255,255,0.94),rgba(248,250,252,0.9))] dark:border-[color:var(--brand)]/25 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.9),rgba(2,6,23,0.88))]" : "border-slate-200/80 bg-white/80 dark:border-slate-800 dark:bg-slate-950/78"}`}
            >
              <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                <div className="flex flex-wrap items-center gap-1">
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/90 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                    <i className="fa-solid fa-layer-group" />{" "}
                    {inventoryExplorerPhones.length.toLocaleString("fa-IR")}{" "}
                    نتیجه
                  </span>
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/90 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                    <i className="fa-solid fa-eye" /> نمای{" "}
                    {inventoryViewMode === "table" ? "جدولی" : "کارتی"}
                  </span>
                  {dashboardDrilldown.kind !== "none" ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-sky-200 bg-sky-50 px-2 py-0.5 text-[10px] font-black text-sky-700 dark:border-sky-900/60 dark:bg-sky-950/30 dark:text-sky-300">
                      <i className="fa-solid fa-bullseye" /> فیلتر هدفمند
                    </span>
                  ) : null}
                  {activeFilterCount > 0 ? (
                    <span className="inline-flex items-center gap-1 rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-[10px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                      <i className="fa-solid fa-filter" />{" "}
                      {activeFilterCount.toLocaleString("fa-IR")} فیلتر
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                      <i className="fa-solid fa-star" /> پاک
                    </span>
                  )}
                  {selectedPhones.length > 0 ? (
                    <>
                      <span className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/10 px-2 py-0.5 text-[10px] font-black text-[color:var(--brand)]">
                        <i className="fa-solid fa-check-double" />{" "}
                        {bulkSummary.count.toLocaleString("fa-IR")} انتخاب
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-2 py-0.5 text-[10px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900/80 dark:text-slate-200">
                        <i className="fa-solid fa-sack-dollar" /> خرید{" "}
                        {formatPrice(bulkSummary.totalPurchase)}
                      </span>
                      <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                        <i className="fa-solid fa-chart-line-up" /> سود{" "}
                        {formatPrice(bulkSummary.potentialProfit)}
                      </span>
                      {selectionContext ? (
                        <span
                          className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${selectionContext.tone}`}
                        >
                          <i className={`fa-solid ${selectionContext.icon}`} />
                          <span className="truncate">
                            {selectionContext.label}
                          </span>
                        </span>
                      ) : null}
                    </>
                  ) : null}
                </div>
                <div className="flex flex-wrap items-center gap-1.5">
                  {selectedPhones.length > 0 ? (
                    <>
                      {selectionContext ? (
                        <span
                          className={`inline-flex max-w-full items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${selectionContext.tone}`}
                          title={selectionContext.hint}
                        >
                          <i className={`fa-solid ${selectionContext.icon}`} />
                          <span className="truncate">
                            {selectionContext.hint}
                          </span>
                        </span>
                      ) : null}
                      {selectionPreset ? (
                        <button
                          type="button"
                          onClick={handleSelectionPresetAction}
                          className="inline-flex max-w-full items-center gap-1 rounded-full border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/10 px-2 py-0.5 text-[10px] font-black text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/15"
                          title={selectionPreset.hint}
                        >
                          <i className={`fa-solid ${selectionPreset.icon}`} />
                          <span className="truncate">
                            {selectionPreset.label}
                          </span>
                        </button>
                      ) : null}
                      {selectionContext?.recommendedAction === "export" ? (
                        <button
                          type="button"
                          onClick={() => requestBulkAction("export")}
                          className="inline-flex items-center gap-1 rounded-full border border-[color:var(--brand)]/25 bg-[color:var(--brand)]/10 px-2 py-0.5 text-[10px] font-black text-[color:var(--brand)] transition hover:bg-[color:var(--brand)]/15"
                        >
                          <i className="fa-solid fa-star" /> خروجی CSV
                        </button>
                      ) : null}
                      <button
                        type="button"
                        onClick={() => requestBulkAction("export")}
                        className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-[10px] font-black text-emerald-700 transition hover:bg-emerald-100 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300 dark:hover:bg-emerald-950/50"
                      >
                        <i className="fa-solid fa-file-export" /> خروجی CSV
                      </button>
                      <button
                        type="button"
                        onClick={() => setSelectedPhoneIds([])}
                        className="inline-flex items-center gap-1.5 rounded-full border border-rose-200 bg-rose-50 px-3 py-1.5 text-xs font-black text-rose-700 transition hover:bg-rose-100 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300 dark:hover:bg-rose-950/50"
                      >
                        <i className="fa-solid fa-xmark" /> پاک‌کردن انتخاب
                      </button>
                    </>
                  ) : null}
                </div>
              </div>
            </div>
          </div>
          <div className="grid grid-cols-1 gap-3.5 md:grid-cols-2">
            {explorerFocusCards.map((card) => (
              <div
                key={card.key}
                className="relative overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-4 shadow-[0_1px_2px_rgba(15,23,42,0.04)] dark:border-slate-800 dark:bg-slate-950"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      {card.label}
                    </div>
                    <div className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                      {card.value}
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                      {card.hint}
                    </p>
                  </div>
                  <IconGlyph size="lg" tone="neutral" aria-hidden="true">
                    <i className={`fa-solid ${card.icon}`} />
                  </IconGlyph>
                </div>
              </div>
            ))}
          </div>

          {phoneInventoryDrilldownEnabled && workspace === "insights" ? (
            <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    بررسی هدفمند
                  </div>
                  <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                    گروه انتخاب‌شده
                  </h3>
                  <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                    جزئیات این گروه را در موجودی ببینید و اقدام بعدی را انجام
                    دهید.
                  </p>
                </div>
                {dashboardDrilldown.kind !== "none" ? (
                  <button
                    type="button"
                    onClick={clearDashboardDrilldown}
                    className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                  >
                    <i className="fa-solid fa-xmark" /> بستن فیلتر
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                {insightsActionCards.map((card) => {
                  const active =
                    dashboardDrilldown.kind === card.drilldown.kind;
                  return (
                    <button
                      type="button"
                      key={card.key}
                      onClick={() => applyDashboardDrilldown(card.drilldown)}
                      className={`relative overflow-hidden rounded-[22px] border bg-white p-4 text-right shadow-[0_1px_2px_rgba(15,23,42,0.04)] transition hover:-translate-y-0.5 hover:border-slate-300 dark:bg-slate-950 dark:border-slate-800 ${active ? "border-slate-900 ring-2 ring-slate-900/10 dark:border-white dark:ring-white/10" : "border-slate-200/80"}`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            {card.label}
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">
                            {card.value.toLocaleString("fa-IR")}
                          </div>
                          <p className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                            {card.hint}
                          </p>
                        </div>
                        <IconGlyph size="lg" tone="neutral" aria-hidden="true">
                          <i className={`fa-solid ${card.icon}`} />
                        </IconGlyph>
                      </div>
                      <div className="mt-3 inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/70 px-3 py-1 text-[11px] font-black text-slate-700 dark:border-slate-700/70 dark:bg-slate-900/70 dark:text-slate-200">
                        <i className="fa-solid fa-arrow-down-and-arrow-up-right-to-center" />{" "}
                        مشاهده در موجودی
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : null}

          {workspace === "insights" && historyReport && (
            <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,1.05fr)_minmax(0,0.95fr)]">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      گردش موجودی
                    </div>
                    <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                      گزارش گردش انبار گوشی
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      تغییرات قیمت، وضعیت و رویدادهای مهم ۳۰ روز اخیر.
                    </p>
                  </div>
                  <div className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                    <i
                      className={`fa-solid ${isHistoryReportLoading ? "fa-spinner fa-spin" : "fa-clock-rotate-left"}`}
                    />{" "}
                    {historyReport.windowDays.toLocaleString("fa-IR")} روز اخیر
                  </div>
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-4">
                  {historyReportCards.map((card) => (
                    <div
                      key={card.key}
                      className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
                            {card.label}
                          </div>
                          <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">
                            {card.value}
                          </div>
                        </div>
                        <IconGlyph size="lg" tone={inferIconGlyphTone(card.tone)} aria-hidden="true">
                          <i className={`fa-solid ${card.icon}`} />
                        </IconGlyph>
                      </div>
                      <div className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">
                        {card.hint}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                  تغییرات اخیر
                </div>
                <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                  آخرین تغییرات مهم
                </h3>
                <div className="mt-4 space-y-3">
                  {historyReport.recentEvents.length === 0 ? (
                    <div className="rounded-[18px] border border-dashed border-slate-200 px-3 py-4 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      در این بازه تغییری ثبت نشده است.
                    </div>
                  ) : (
                    historyReport.recentEvents.slice(0, 5).map((event) => (
                      <div
                        key={`report-${event.id}`}
                        className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                      >
                        <div className="flex items-start justify-between gap-3">
                          <div>
                            <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">
                              {event.title}
                            </div>
                            <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                              {formatIsoToShamsiDateTime(
                                event.eventDate || event.createdAt,
                              )}
                            </div>
                          </div>
                          <span
                            className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${event.tone === "rose" ? "bg-rose-50 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300" : event.tone === "amber" ? "bg-amber-50 text-amber-700 dark:bg-amber-950/30 dark:text-amber-300" : event.tone === "violet" ? "bg-violet-50 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300" : event.tone === "sky" ? "bg-sky-50 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300" : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"}`}
                          >
                            <i
                              className={`fa-solid ${event.icon || "fa-clock-rotate-left"}`}
                            />
                          </span>
                        </div>
                        {event.description ? (
                          <div className="mt-2 text-xs leading-6 text-slate-600 dark:text-slate-300">
                            {event.description}
                          </div>
                        ) : null}
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {workspace === "insights" && (
            <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div>
                    <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      سوابق و کنترل
                    </div>
                    <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                      سوابق تغییرات موجودی
                    </h3>
                    <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                      جستجو، بازه زمانی و خروجی گزارش تغییرات دستگاه‌ها.
                    </p>
                  </div>
                  {canManage ? (
                    <div className="flex flex-wrap items-center gap-3">
                      <button
                        type="button"
                        onClick={exportHistoryExplorerCsv}
                        className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-1.5 shadow-sm text-[11px] font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <i className="fa-solid fa-file-export" /> خروجی گزارش
                      </button>
                      <button
                        type="button"
                        onClick={exportHistoryExplorerPrintReport}
                        className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm px-3 py-1.5 shadow-sm text-[11px] font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                      >
                        <i className="fa-solid fa-print" /> خروجی گزارشات
                      </button>
                    </div>
                  ) : (
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-amber-200 bg-amber-50 px-3 py-2 text-[11px] font-black text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300">
                      <i className="fa-solid fa-shield-halved" /> خروجی‌ها محدود
                      به مدیر انبار است
                    </span>
                  )}
                </div>
                <div className="mt-4 grid grid-cols-1 gap-3 lg:grid-cols-[minmax(0,1fr)_18rem]">
                  <TextField controlOnly unstyled
                    value={historyExplorerFilters.q}
                    onChange={(e) =>
                      setHistoryExplorerFilters((prev) => ({
                        ...prev,
                        q: e.target.value,
                      }))
                    }
                    placeholder="جستجو در مدل، IMEI، عنوان رویداد، توضیح یا کاربر..."
                    className="w-full rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-sm font-semibold text-slate-900 outline-none transition   dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-50"
                  />
                  <SelectField controlOnly unstyled showChevron={false}
                    value={historyExplorerFilters.model}
                    onChange={(e) =>
                      setHistoryExplorerFilters((prev) => ({
                        ...prev,
                        model: e.target.value,
                      }))
                    }
                    className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-2.5 text-[13px] font-black text-slate-900 outline-none transition   dark:border-slate-700 dark:bg-slate-900/70 dark:text-slate-50"
                  >
                    <option value="all">همه مدل‌ها</option>
                    {modelFilterOptions.map((model) => (
                      <option key={`history-model-${model}`} value={model}>
                        {model}
                      </option>
                    ))}
                  </SelectField>
                </div>
                <div className="mt-3 grid grid-cols-1 gap-3 lg:grid-cols-2">
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="mb-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      شروع بازه
                    </div>
                    <ShamsiDatePicker
                      selectedDate={
                        historyExplorerFilters.startDate
                          ? new Date(historyExplorerFilters.startDate)
                          : null
                      }
                      onDateChange={(d: Date | null) =>
                        setHistoryExplorerFilters((prev) => ({
                          ...prev,
                          startDate: d ? moment(d).format("YYYY-MM-DD") : "",
                        }))
                      }
                      size="compact"
                    />
                  </div>
                  <div className="rounded-[18px] border border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-slate-700 dark:bg-slate-900/70">
                    <div className="mb-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
                      پایان بازه
                    </div>
                    <ShamsiDatePicker
                      selectedDate={
                        historyExplorerFilters.endDate
                          ? new Date(historyExplorerFilters.endDate)
                          : null
                      }
                      onDateChange={(d: Date | null) =>
                        setHistoryExplorerFilters((prev) => ({
                          ...prev,
                          endDate: d ? moment(d).format("YYYY-MM-DD") : "",
                        }))
                      }
                      size="compact"
                    />
                  </div>
                </div>
                <div className="mt-3 flex flex-wrap gap-3">
                  {historyExplorerClassOptions.map((item) => {
                    const active =
                      historyExplorerFilters.eventClass === item.key;
                    return (
                      <button
                        key={item.key}
                        type="button"
                        onClick={() =>
                          setHistoryExplorerFilters((prev) => ({
                            ...prev,
                            eventClass: item.key,
                          }))
                        }
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-2 text-xs font-black transition ${active ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"}`}
                      >
                        <i className={`fa-solid ${item.icon}`} /> {item.label}
                      </button>
                    );
                  })}
                </div>
                <div className="mt-4 space-y-3">
                  {isHistoryExplorerLoading ? (
                    <>
                      <Skeleton className="h-20 rounded-[18px]" />
                      <Skeleton className="h-20 rounded-[18px]" />
                    </>
                  ) : historyExplorerEvents.length === 0 ? (
                    <div className="rounded-[20px] border border-dashed border-slate-200 px-4 py-8 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                      برای این فیلترها رویدادی پیدا نشد.
                    </div>
                  ) : (
                    historyExplorerEvents.slice(0, 8).map((event) => {
                      const classMeta = getEventClassMeta(
                        event.eventClass || "audit",
                      );
                      return (
                        <div
                          key={`hx-${event.id}`}
                          className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="min-w-0">
                              <div className="flex flex-wrap items-center gap-3">
                                <span
                                  className={`inline-flex h-9 w-9 items-center justify-center rounded-2xl ${eventToneClasses(event.tone || classMeta.tone)}`}
                                >
                                  <i
                                    className={`fa-solid ${event.icon || classMeta.icon}`}
                                  />
                                </span>
                                <div>
                                  <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">
                                    {event.title}
                                  </div>
                                  <div className="mt-1 flex flex-wrap items-center gap-3 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                    <span>
                                      {event.phoneModel || "مدل نامشخص"}
                                    </span>
                                    {event.phoneImei ? (
                                      <span className="rounded-full bg-white px-2 py-1 dark:bg-slate-950/70">
                                        IMEI: {event.phoneImei}
                                      </span>
                                    ) : null}
                                    <span className="rounded-full bg-white px-2 py-1 dark:bg-slate-950/70">
                                      {classMeta.label}
                                    </span>
                                  </div>
                                </div>
                              </div>
                              {event.description ? (
                                <div className="mt-3 text-xs leading-6 text-slate-600 dark:text-slate-300">
                                  {event.description}
                                </div>
                              ) : null}
                            </div>
                            <div className="text-left text-[11px] font-black text-slate-500 dark:text-slate-400">
                              {formatIsoToShamsiDateTime(
                                event.eventDate || event.createdAt,
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    تغییرات مدل‌ها
                  </div>
                  <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                    مدل‌های پرتغییر و پرریسک
                  </h3>
                  <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
                    {(enterpriseHistoryReport?.topModels || [])
                      .slice(0, 4)
                      .map((item) => (
                        <button
                          type="button"
                          key={`top-model-${item.model}`}
                          onClick={() =>
                            setHistoryExplorerFilters((prev) => ({
                              ...prev,
                              model: item.model,
                            }))
                          }
                          className="rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 text-right transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div>
                              <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">
                                {item.model}
                              </div>
                              <div className="mt-1 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                                {item.totalChanges.toLocaleString("fa-IR")}{" "}
                                تغییر ثبت‌شده
                              </div>
                            </div>
                            <IconGlyph size="lg" tone="neutral" aria-hidden="true">
                              <i className="fa-solid fa-mobile-screen-button" />
                            </IconGlyph>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-3 text-[11px] font-black">
                            <span className="rounded-full bg-sky-50 px-2.5 py-1 text-sky-700 dark:bg-sky-950/30 dark:text-sky-300">
                              قیمت: {item.priceChanges.toLocaleString("fa-IR")}
                            </span>
                            <span className="rounded-full bg-violet-50 px-2.5 py-1 text-violet-700 dark:bg-violet-950/30 dark:text-violet-300">
                              وضعیت:{" "}
                              {item.statusChanges.toLocaleString("fa-IR")}
                            </span>
                            <span className="rounded-full bg-rose-50 px-2.5 py-1 text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">
                              حساس:{" "}
                              {item.criticalEvents.toLocaleString("fa-IR")}
                            </span>
                          </div>
                        </button>
                      ))}
                  </div>
                </div>

                {historyExplorerFilters.model !== "all" ? (
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                          جزئیات مدل
                        </div>
                        <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                          جزئیات مدل {historyExplorerFilters.model}
                        </h3>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setHistoryExplorerFilters((prev) => ({
                            ...prev,
                            model: "all",
                          }))
                        }
                        className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-2.5 py-1 shadow-sm text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                      >
                        <i className="fa-solid fa-xmark" /> انصراف
                      </button>
                    </div>
                    <div className="mt-4 space-y-3">
                      {drilldownPhones.length === 0 ? (
                        <div className="rounded-[18px] border border-dashed border-slate-200 px-4 py-6 text-center text-sm font-semibold text-slate-500 dark:border-slate-700 dark:text-slate-400">
                          دستگاهی از این مدل در موجودی فعلی پیدا نشد.
                        </div>
                      ) : (
                        drilldownPhones.map((phone) => (
                          <button
                            type="button"
                            key={`drill-${phone.id}`}
                            onClick={() => openDetailsModal(phone)}
                            className="flex w-full items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-right transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-800 dark:bg-slate-900/60"
                          >
                            <div>
                              <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">
                                {phone.model}
                              </div>
                              <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">
                                IMEI: <span dir="ltr">{phone.imei}</span>
                              </div>
                            </div>
                            <div className="text-left">
                              <div className="text-xs font-black text-slate-600 dark:text-slate-300">
                                {phone.status}
                              </div>
                              <div className="mt-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400">
                                {formatPrice(phone.salePrice)}
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </div>
                ) : null}

                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    گزارش فعالیت کاربران
                  </div>
                  <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                    خلاصه حسابرسی و اپراتورها
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {(enterpriseHistoryReport?.eventClassCounts || []).map(
                      (item) => (
                        <div
                          key={`class-count-${item.key}`}
                          className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-3 dark:border-slate-800 dark:bg-slate-900/60"
                        >
                          <div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">
                            {item.label}
                          </div>
                          <div className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                            {item.count.toLocaleString("fa-IR")}
                          </div>
                        </div>
                      ),
                    )}
                  </div>
                  <div className="mt-4 space-y-3">
                    {(enterpriseHistoryReport?.topActors || [])
                      .slice(0, 4)
                      .map((actor) => (
                        <div
                          key={`actor-${actor.actor}`}
                          className="flex items-center justify-between gap-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-4 py-2.5 text-sm dark:border-slate-800 dark:bg-slate-900/60"
                        >
                          <span className="font-black text-slate-900 dark:text-slate-50">
                            {actor.actor}
                          </span>
                          <span className="text-xs font-black text-slate-500 dark:text-slate-400">
                            {actor.totalChanges.toLocaleString("fa-IR")} تغییر
                          </span>
                        </div>
                      ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {workspace === "insights" && dashboardReport ? (
            <div className="grid grid-cols-1 gap-3.5 xl:grid-cols-[minmax(0,0.92fr)_minmax(0,1.08fr)]">
              <div className="space-y-3">
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                        گردش و راکدی موجودی
                      </div>
                      <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                        روند راکدی و نبض فعالیت
                      </h3>
                      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                        هر گروه را انتخاب کنید تا دستگاه‌های همان بازه در
                        موجودی نمایش داده شوند.
                      </p>
                    </div>
                    <span className="inline-flex items-center gap-1.5 rounded-full border border-slate-200/80 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">
                      <i className="fa-solid fa-chart-mixed" />{" "}
                      {dashboardReport.windowDays.toLocaleString("fa-IR")} روز
                    </span>
                  </div>
                  <div className="mt-4 grid grid-cols-2 gap-3 xl:grid-cols-4">
                    {dashboardReport.staleBuckets.map((bucket) => (
                      <button
                        type="button"
                        key={`bucket-${bucket.key}`}
                        onClick={() =>
                          applyDashboardDrilldown({
                            kind: "staleBucket",
                            value: bucket.key,
                            label: bucket.label,
                          })
                        }
                        className={`rounded-[20px] border p-4 text-right transition hover:-translate-y-0.5 hover:border-slate-300 ${dashboardDrilldown.kind === "staleBucket" && dashboardDrilldown.value === bucket.key ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60"}`}
                      >
                        <div className="text-[11px] font-black tracking-[0.12em] opacity-80">
                          {bucket.label}
                        </div>
                        <div className="mt-2 text-2xl font-black">
                          {bucket.count.toLocaleString("fa-IR")}
                        </div>
                        <div className="mt-2 text-[11px] font-bold opacity-80">
                          در انبار موجود و قابل پیگیری
                        </div>
                      </button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
                    <div className="flex items-center justify-between gap-3">
                      <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">
                        نبض فعالیت ۱۴ روز اخیر
                      </div>
                      <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">
                        بیشترین روز:{" "}
                        {dashboardReport.dailyActivity.reduce(
                          (max, point) =>
                            point.total > max.total ? point : max,
                          dashboardReport.dailyActivity[0] || {
                            label: "-",
                            total: 0,
                          },
                        ).label || "-"}
                      </div>
                    </div>
                    <div className="mt-4 flex items-end gap-3 overflow-x-auto pb-1 inventory-premium-scroll">
                      {dashboardReport.dailyActivity.map((point) => {
                        const height = Math.max(
                          20,
                          Math.round(
                            (point.total /
                              Math.max(
                                1,
                                ...dashboardReport.dailyActivity.map(
                                  (item) => item.total || 0,
                                ),
                              )) *
                              92,
                          ),
                        );
                        return (
                          <div
                            key={`activity-${point.date}`}
                            className="flex min-w-[42px] flex-col items-center gap-3"
                          >
                            <div className="text-[10px] font-black text-slate-400 dark:text-slate-500">
                              {point.total.toLocaleString("fa-IR")}
                            </div>
                            <div className="relative flex h-28 w-8 items-end overflow-hidden rounded-full bg-slate-200/70 dark:bg-slate-800/80">
                              <div
                                className="w-full rounded-full bg-[linear-gradient(180deg,rgba(56,189,248,0.35),rgba(14,165,233,0.95))]"
                                style={{ height }}
                              />
                            </div>
                            <div className="text-[10px] font-black text-slate-500 dark:text-slate-400">
                              {point.label}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    تغییرات قیمت
                  </div>
                  <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                    روند تغییر قیمت‌ها
                  </h3>
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {[
                      {
                        label: "افزایش فروش",
                        value: dashboardReport.pricingTrend.saleIncrease,
                        tone: "text-emerald-600 dark:text-emerald-300",
                      },
                      {
                        label: "کاهش فروش",
                        value: dashboardReport.pricingTrend.saleDecrease,
                        tone: "text-rose-600 dark:text-rose-300",
                      },
                      {
                        label: "افزایش خرید",
                        value: dashboardReport.pricingTrend.purchaseIncrease,
                        tone: "text-sky-600 dark:text-sky-300",
                      },
                      {
                        label: "کاهش خرید",
                        value: dashboardReport.pricingTrend.purchaseDecrease,
                        tone: "text-amber-600 dark:text-amber-300",
                      },
                    ].map((item) => (
                      <div
                        key={item.label}
                        className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60"
                      >
                        <div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">
                          {item.label}
                        </div>
                        <div className={`mt-2 text-xl font-black ${item.tone}`}>
                          {item.value.toLocaleString("fa-IR")}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    عملکرد مدل‌ها
                  </div>
                  <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                    مقایسه مدل‌های موجودی
                  </h3>
                  <div className="mt-4 space-y-3">
                    {dashboardReport.modelHeatmap.slice(0, 6).map((item) => (
                      <button
                        type="button"
                        key={`model-heat-${item.name}`}
                        onClick={() =>
                          applyDashboardDrilldown({
                            kind: "model",
                            value: item.name,
                            label: item.name,
                          })
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-2.5 text-right transition hover:-translate-y-0.5 hover:border-slate-300 ${dashboardDrilldown.kind === "model" && dashboardDrilldown.value === item.name ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60"}`}
                      >
                        <div>
                          <div className="text-[13px] font-black">
                            {item.name}
                          </div>
                          <div className="mt-1 text-[11px] font-bold opacity-80">
                            سود بالقوه: {formatPrice(item.potentialMargin)}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-[17px] font-black">
                            {item.total.toLocaleString("fa-IR")}
                          </div>
                          <div className="mt-1 text-[11px] font-bold opacity-80">
                            راکد: {item.staleCount.toLocaleString("fa-IR")}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
                <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                  <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                    عملکرد تأمین‌کنندگان
                  </div>
                  <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                    مقایسه تأمین‌کنندگان
                  </h3>
                  <div className="mt-4 space-y-3">
                    {dashboardReport.supplierHeatmap.slice(0, 6).map((item) => (
                      <button
                        type="button"
                        key={`supplier-heat-${item.name}`}
                        onClick={() =>
                          applyDashboardDrilldown({
                            kind: "supplier",
                            value: item.name,
                            label: item.name,
                          })
                        }
                        className={`flex w-full items-center justify-between gap-3 rounded-[18px] border px-4 py-2.5 text-right transition hover:-translate-y-0.5 hover:border-slate-300 ${dashboardDrilldown.kind === "supplier" && dashboardDrilldown.value === item.name ? "border-slate-900 bg-slate-900 text-white dark:border-white dark:bg-white dark:text-slate-950" : "border-slate-200/80 bg-slate-50/80 dark:border-slate-800 dark:bg-slate-900/60"}`}
                      >
                        <div>
                          <div className="text-[13px] font-black">
                            {item.name}
                          </div>
                          <div className="mt-1 text-[11px] font-bold opacity-80">
                            بدون قیمت فروش:{" "}
                            {item.missingSalePriceCount.toLocaleString("fa-IR")}
                          </div>
                        </div>
                        <div className="text-left">
                          <div className="text-[17px] font-black">
                            {item.total.toLocaleString("fa-IR")}
                          </div>
                          <div className="mt-1 text-[11px] font-bold opacity-80">
                            باتری پایین:{" "}
                            {item.lowBatteryCount.toLocaleString("fa-IR")}
                          </div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          <div className="app-card overflow-hidden p-0">
            <div className="border-b border-slate-200/80 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70 md:p-6">
              <div className="flex flex-col gap-3.5">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
                  <div>
                    <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                      مدیریت فروش و موجودی
                    </div>
                    <div className="mt-1 text-[17px] font-black text-slate-900 dark:text-slate-50">
                      انبار گوشی
                    </div>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {(
                      [
                        ["cards", "fa-grid-2", "کارتی"],
                        ["table", "fa-table-columns", "جدولی"],
                      ] as const
                    ).map(([mode, icon, label]) => {
                      const active = inventoryViewMode === mode;
                      return (
                        <Button
                          key={mode}
                          type="button"
                          size="sm"
                          variant={active ? "primary" : "secondary"}
                          autoIcon={false}
                          leftIcon={<i className={`fa-solid ${icon}`} aria-hidden="true" />}
                          onClick={() => setInventoryViewMode(mode)}
                          aria-pressed={active}
                        >
                          {label}
                        </Button>
                      );
                    })}
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      autoIcon={false}
                      leftIcon={<i className="fa-solid fa-rotate" aria-hidden="true" />}
                      onClick={clearExplorerFilters}
                    >
                      پاک‌سازی فیلترها
                    </Button>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  {savedViewMeta.map((view) => {
                    const active = savedView === view.key;
                    return (
                      <Button
                        key={view.key}
                        type="button"
                        size="sm"
                        variant={active ? "primary" : "secondary"}
                        autoIcon={false}
                        leftIcon={<i className={`fa-solid ${view.icon}`} aria-hidden="true" />}
                        onClick={() => setSavedView(view.key)}
                        aria-pressed={active}
                        className="rounded-full"
                      >
                        {view.label}
                      </Button>
                    );
                  })}
                </div>
                {explorerContextCard ? (
                  <div
                    className={`grid grid-cols-1 gap-3.5 rounded-[28px] border px-4 py-4 md:grid-cols-[minmax(0,1fr)_auto] md:px-5 ${explorerContextCard.tone === "violet" ? "border-violet-200/80 bg-violet-50/80 dark:border-violet-900/60 dark:bg-violet-950/20" : "border-sky-200/80 bg-sky-50/80 dark:border-sky-900/60 dark:bg-sky-950/20"}`}
                  >
                    <div>
                      <div
                        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1 text-[11px] font-black ${explorerContextCard.tone === "violet" ? "border-violet-200 bg-white/80 text-violet-700 dark:border-violet-800 dark:bg-slate-950/50 dark:text-violet-300" : "border-sky-200 bg-white/80 text-sky-700 dark:border-sky-800 dark:bg-slate-950/50 dark:text-sky-300"}`}
                      >
                        <i className={`fa-solid ${explorerContextCard.icon}`} />
                        {explorerContextCard.kicker}
                      </div>
                      <h3 className="mt-3 text-[17px] font-black text-slate-900 dark:text-slate-50">
                        {explorerContextCard.title}
                      </h3>
                      <p className="mt-1 text-sm text-slate-600 dark:text-slate-300">
                        {explorerContextCard.description}
                      </p>
                      <div className="mt-4 flex flex-wrap items-center gap-3">
                        <button
                          type="button"
                          onClick={openExplorerContextHistory}
                          className={`inline-flex items-center gap-3 rounded-2xl border px-3 py-2 text-xs font-black transition hover:-translate-y-0.5 ${explorerContextCard.tone === "violet" ? "border-violet-200 bg-white/85 text-violet-700 hover:border-violet-300 dark:border-violet-800 dark:bg-slate-950/60 dark:text-violet-300" : "border-sky-200 bg-white/85 text-sky-700 hover:border-sky-300 dark:border-sky-800 dark:bg-slate-950/60 dark:text-sky-300"}`}
                        >
                          <i className="fa-solid fa-timeline" /> تاریخچه همین
                          نما
                        </button>
                        <button
                          type="button"
                          onClick={exportExplorerContextCsv}
                          className="inline-flex items-center gap-3 rounded-2xl border border-slate-200 bg-white shadow-sm/85 px-3 py-2 text-xs font-black text-slate-700 transition hover:-translate-y-0.5 hover:border-slate-300 dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                        >
                          <i className="fa-solid fa-file-export" /> خروجی CSV
                          همین نما
                        </button>
                        <button
                          type="button"
                          onClick={clearDashboardDrilldown}
                          className="inline-flex items-center gap-3 rounded-2xl border border-rose-200 bg-white/85 px-3 py-2 text-xs font-black text-rose-700 transition hover:-translate-y-0.5 hover:border-rose-300 dark:border-rose-900/60 dark:bg-slate-950/60 dark:text-rose-300"
                        >
                          <i className="fa-solid fa-xmark" /> پاک‌کردن تمرکز
                        </button>
                      </div>
                    </div>
                    <div className="flex flex-wrap items-center gap-3 md:justify-end">
                      {explorerContextCard.chips.map((chip) => (
                        <span
                          key={chip}
                          className="inline-flex items-center gap-1.5 rounded-full border border-white/70 bg-white/80 px-3 py-1.5 text-xs font-black text-slate-700 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.35)] dark:border-slate-700 dark:bg-slate-950/60 dark:text-slate-200"
                        >
                          {chip}
                        </span>
                      ))}
                    </div>
                  </div>
                ) : null}
                <div className="phone-inventory-filter-grid" data-ui-phone-filter-grid="true">
                  <SelectField
                    label="وضعیت"
                    icon={<i className="fa-solid fa-arrows-rotate" aria-hidden="true" />}
                    size="sm"
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    wrapperClassName="phone-inventory-filter-field"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    {PHONE_STATUSES.map((status) => (
                      <option key={status} value={status}>
                        {status}
                      </option>
                    ))}
                  </SelectField>
                  <SearchableSelectField<string>
                    label={<span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-truck" aria-hidden="true" />تأمین‌کننده</span>}
                    size="sm"
                    value={supplierFilter === 'all' ? null : supplierFilter}
                    onValueChange={(value) => setSupplierFilter(value ?? 'all')}
                    options={supplierFilterOptions.map((supplier) => ({
                      value: supplier,
                      label: supplier,
                      searchText: supplier,
                    }))}
                    placeholder="همه تأمین‌کنندگان"
                    noOptionsMessage="تأمین‌کننده‌ای مطابق جستجو پیدا نشد"
                    ariaLabel="فیلتر تأمین‌کننده موجودی گوشی"
                    wrapperClassName="phone-inventory-filter-field"
                  />
                  <SearchableSelectField<string>
                    label={<span className="inline-flex items-center gap-1.5"><i className="fa-solid fa-mobile-screen-button" aria-hidden="true" />مدل</span>}
                    size="sm"
                    value={modelFilter === 'all' ? null : modelFilter}
                    onValueChange={(value) => setModelFilter(value ?? 'all')}
                    options={modelFilterOptions.map((model) => ({
                      value: model,
                      label: model,
                      searchText: model,
                    }))}
                    placeholder="همه مدل‌ها"
                    noOptionsMessage="مدلی مطابق جستجو پیدا نشد"
                    ariaLabel="فیلتر مدل موجودی گوشی"
                    wrapperClassName="phone-inventory-filter-field"
                  />
                  <SelectField
                    label="سلامت باتری"
                    icon={<i className="fa-solid fa-battery-half" aria-hidden="true" />}
                    size="sm"
                    value={batteryFilter}
                    onChange={(e) => setBatteryFilter(e.target.value as any)}
                    wrapperClassName="phone-inventory-filter-field"
                  >
                    <option value="all">همه وضعیت‌ها</option>
                    <option value="good">۸۰٪ و بالاتر</option>
                    <option value="low">کمتر از ۸۰٪</option>
                  </SelectField>
                  <SelectField
                    label="مرتب‌سازی"
                    icon={<i className="fa-solid fa-arrow-down-wide-short" aria-hidden="true" />}
                    size="sm"
                    value={sortMode}
                    onChange={(e) =>
                      setSortMode(e.target.value as InventorySortMode)
                    }
                    wrapperClassName="phone-inventory-filter-field"
                  >
                    <option value="newest">جدیدترین ثبت اطلاعات</option>
                    <option value="oldest">قدیمی‌ترین ثبت اطلاعات</option>
                    <option value="purchaseHigh">بیشترین قیمت خرید</option>
                    <option value="purchaseLow">کمترین قیمت خرید</option>
                    <option value="saleHigh">بیشترین قیمت فروش</option>
                    <option value="saleLow">کمترین قیمت فروش</option>
                    <option value="marginHigh">بیشترین حاشیه سود</option>
                    <option value="staleMost">راکدترین</option>
                  </SelectField>
                  <ControlShell
                    as="div"
                    kind="custom"
                    label="تاریخ ورود از"
                    htmlFor="phone-inventory-date-from"
                    className="phone-inventory-filter-field phone-inventory-filter-field--date"
                  >
                    <ShamsiDatePicker
                      id="phone-inventory-date-from"
                      selectedDate={
                        inventoryExplorerDateRange.startDate
                          ? new Date(inventoryExplorerDateRange.startDate)
                          : null
                      }
                      onDateChange={(d: Date | null) =>
                        setInventoryExplorerDateRange((prev) => ({
                          ...prev,
                          startDate: d ? moment(d).format("YYYY-MM-DD") : "",
                        }))
                      }
                      preview="انتخاب تاریخ شروع"
                      size="compact"
                    />
                  </ControlShell>
                  <ControlShell
                    as="div"
                    kind="custom"
                    label="تاریخ ورود تا"
                    htmlFor="phone-inventory-date-to"
                    className="phone-inventory-filter-field phone-inventory-filter-field--date"
                  >
                    <ShamsiDatePicker
                      id="phone-inventory-date-to"
                      selectedDate={
                        inventoryExplorerDateRange.endDate
                          ? new Date(inventoryExplorerDateRange.endDate)
                          : null
                      }
                      onDateChange={(d: Date | null) =>
                        setInventoryExplorerDateRange((prev) => ({
                          ...prev,
                          endDate: d ? moment(d).format("YYYY-MM-DD") : "",
                        }))
                      }
                      preview="انتخاب تاریخ پایان"
                      size="compact"
                    />
                  </ControlShell>
                </div>
                {(inventoryExplorerDateRange.startDate || inventoryExplorerDateRange.endDate) ? (
                  <div className="flex flex-wrap items-center gap-2 text-xs">
                    <span
                      className={`inline-flex min-h-9 max-w-full items-center gap-2 rounded-full border px-3 font-black ${
                        inventoryExplorerDateRangeTone === "empty"
                          ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300"
                          : inventoryExplorerDateRangeTone === "narrow"
                            ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300"
                            : "border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                      }`}
                    >
                      <i className="fa-solid fa-calendar-range" aria-hidden="true" />
                      <span className="truncate">{inventoryExplorerDateRangeLabel}</span>
                    </span>
                    <Button
                      type="button"
                      size="xs"
                      variant="secondary"
                      autoIcon={false}
                      leftIcon={<i className="fa-solid fa-xmark" aria-hidden="true" />}
                      onClick={() =>
                        setInventoryExplorerDateRange({
                          startDate: "",
                          endDate: "",
                        })
                      }
                    >
                      حذف محدودیت تاریخ
                    </Button>
                  </div>
                ) : null}
                <div className="flex flex-wrap items-center gap-3 text-xs">
                  <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 font-black text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                    {inventoryExplorerPhones.length.toLocaleString("fa-IR")}{" "}
                    نتیجه
                  </span>
                  <span className="rounded-full border border-slate-200 bg-white px-3 py-1.5 font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-400">
                    {activeFilterCount.toLocaleString("fa-IR")} فیلتر فعال
                  </span>
                  {dashboardDrilldownSummary ? (
                    <button
                      type="button"
                      onClick={clearDashboardDrilldown}
                      className="inline-flex items-center gap-1.5 rounded-full border border-violet-200 bg-violet-50 px-3 py-1.5 font-black text-violet-700 dark:border-violet-900/60 dark:bg-violet-950/30 dark:text-violet-300"
                    >
                      <i className="fa-solid fa-compass-drafting" />{" "}
                      {dashboardDrilldownSummary}
                      <i className="fa-solid fa-xmark" />
                    </button>
                  ) : null}
                </div>
              </div>
            </div>
            <div className="phone-list-shell__toolbar p-3 md:p-4">
              <section className="phone-list-apple-head">
                <div className="phone-list-apple-head__title">
                  <span className="phone-list-apple-head__icon">
                    <i className="fa-solid fa-list-check" />
                  </span>
                  <div className="phone-list-apple-head__copy">
                    <h3>
                      {workspace === "stale"
                        ? "گوشی‌های راکد"
                        : workspace === "returns"
                          ? "گوشی‌های مرجوعی"
                          : workspace === "insights"
                            ? "فرصت‌های فروش موجودی"
                            : "موجودی گوشی‌ها"}
                    </h3>
                    <p>
                      {workspace === "stale"
                        ? "گوشی‌های بدون گردش را برای قیمت‌گذاری و فروش سریع‌تر بررسی کنید."
                        : workspace === "returns"
                          ? "گوشی‌های مرجوعی را برای ارزیابی، قیمت‌گذاری و فروش مجدد مدیریت کنید."
                          : workspace === "insights"
                            ? "مدل‌های سودده، راکد و نیازمند بازبینی را یک‌جا مقایسه کنید."
                            : "موجودی، قیمت‌ها و وضعیت فروش گوشی‌ها را یک‌جا مدیریت کنید."}
                    </p>
                  </div>
                </div>
                <div className="phone-list-apple-head__controls">
                  <div className="phone-list-apple-head__search">
                    <IconGlyph size="sm" tone="neutral" className="phone-list-apple-head__search-icon" aria-hidden="true">
                      <i className="fa-solid fa-magnifying-glass" />
                    </IconGlyph>
                    <TextField controlOnly unstyled
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="جستجو بر اساس مدل، IMEI، تأمین‌کننده…"
                      data-tooltip="جستجو بر اساس مدل، IMEI، تأمین‌کننده…"
                      type="text"
                      dir="rtl"
                      className="phone-list-apple-head__search-input"
                    />
                  </div>
                  <div className="phone-list-apple-head__actions">
                    <Button
                      type="button"
                      variant="secondary"
                      size="sm"
                      className="phone-list-apple-head__action-btn whitespace-nowrap"
                      onClick={() => setIsPhoneImportExportOpen(true)}
                      leftIcon={<i className="fa-solid fa-file-import" />}
                    >
                      ورود / خروجی فایل
                    </Button>
                    <span className="phone-list-apple-head__count">
                      {isFetching
                        ? "در حال دریافت اطلاعات…"
                        : `${inventoryExplorerPhones.length.toLocaleString("fa-IR")} گوشی`}
                    </span>
                  </div>
                </div>
              </section>
            </div>

            {isFetching ? (
              <div className="p-4 md:p-6">
                <div className="grid grid-cols-1 gap-4 xl:grid-cols-12">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div
                      key={i}
                      className="rounded-2xl border border-gray-200 bg-white p-4 shadow-sm dark:border-gray-800 dark:bg-gray-900/40"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1 space-y-3">
                          <Skeleton className="h-5 w-2/3" rounded="lg" />
                          <Skeleton className="h-4 w-1/2" rounded="lg" />
                        </div>
                        <Skeleton className="h-6 w-20" rounded="full" />
                      </div>
                      <div className="mt-4 grid grid-cols-2 gap-3">
                        {Array.from({ length: 6 }).map((__, j) => (
                          <Skeleton key={j} className="h-4" rounded="lg" />
                        ))}
                      </div>
                      <div className="mt-4 flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <Skeleton className="h-9 w-9" rounded="xl" />
                          <Skeleton className="h-9 w-20" rounded="xl" />
                        </div>
                        <Skeleton className="h-9 w-24" rounded="xl" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : phones.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={
                    <i
                      className="fa-solid fa-mobile-screen"
                      aria-hidden="true"
                    />
                  }
                  title="هنوز گوشی‌ای در موجودی ثبت نشده است"
                  description="برای شروع، از فرم بالای صفحه یک گوشی جدید به موجودی اضافه کنید."
                />
              </div>
            ) : inventoryExplorerPhones.length === 0 && searchTerm ? (
              <div className="p-6">
                <EmptyState
                  icon={
                    <i
                      className="fa-solid fa-magnifying-glass"
                      aria-hidden="true"
                    />
                  }
                  title="چیزی پیدا نشد"
                  description="عبارت جستجو را تغییر دهید یا پاک کنید."
                />
              </div>
            ) : inventoryExplorerPhones.length === 0 ? (
              <div className="p-6">
                <EmptyState
                  icon={
                    <i
                      className={
                        workspace === "stale"
                          ? "fa-solid fa-hourglass-half"
                          : workspace === "returns"
                            ? "fa-solid fa-rotate-left"
                            : "fa-solid fa-box-open"
                      }
                      aria-hidden="true"
                    />
                  }
                  title={
                    workspace === "stale"
                      ? "فعلاً گوشی راکدی دیده نمی‌شود"
                      : workspace === "returns"
                        ? "مرجوعی فعالی پیدا نشد"
                        : "موردی برای نمایش نیست"
                  }
                  description="با تغییر فضای کاری یا جستجو، نماهای دیگری را بررسی و ادامه کنید."
                />
              </div>
            ) : (
              <div className="phone-list-shell__content p-4 sm:p-6 space-y-3">
                <div className="space-y-4">
                  {selectedPhones.length > 0 ? (
                    <div className="phone-list-shell__controlbar rounded-[24px] border border-slate-200/80 bg-slate-50/90 p-4 dark:border-slate-800 dark:bg-slate-950/50">
                      <div className="phone-list-shell__controlbar-layout">
                        <div className="phone-list-shell__selection-summary">
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            autoIcon={false}
                            leftIcon={
                              <i
                                className={`fa-solid ${allVisibleSelected ? "fa-square-check" : "fa-square"}`}
                                aria-hidden="true"
                              />
                            }
                            onClick={toggleSelectAllVisible}
                          >
                            {allVisibleSelected
                              ? "لغو انتخاب همه"
                              : "انتخاب همه موارد نمایان"}
                          </Button>
                          <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs font-black text-slate-700 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-200">
                            {bulkSummary.count.toLocaleString("fa-IR")} دستگاه در انتخاب
                          </div>
                          <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                            ارزش خرید:{" "}
                            <span className="font-black text-slate-900 dark:text-slate-50">
                              {formatPrice(bulkSummary.totalPurchase)}
                            </span>
                          </div>
                          <div className="rounded-2xl border border-slate-200/80 bg-white px-3 py-2 text-xs text-slate-600 dark:border-slate-700 dark:bg-slate-950/70 dark:text-slate-300">
                            سود بالقوه:{" "}
                            <span className="font-black text-slate-900 dark:text-slate-50">
                              {formatPrice(bulkSummary.potentialProfit)}
                            </span>
                          </div>
                          {selectionPreset ? (
                            <Button
                              type="button"
                              size="sm"
                              variant="secondary"
                              autoIcon={false}
                              leftIcon={<i className={`fa-solid ${selectionPreset.icon}`} aria-hidden="true" />}
                              onClick={handleSelectionPresetAction}
                              tooltip={selectionPreset.hint}
                            >
                              {selectionPreset.label}
                            </Button>
                          ) : null}
                        </div>

                        <Button
                          type="button"
                          size="sm"
                          variant="secondary"
                          autoIcon={false}
                          leftIcon={<i className="fa-solid fa-xmark" aria-hidden="true" />}
                          onClick={() => setSelectedPhoneIds([])}
                        >
                          لغو انتخاب‌ها
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {workspace === "insights" && (
                    <div className="mb-4 grid gap-3.5 xl:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)]">
                      <div className="rounded-[24px] border border-slate-200/80 bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(248,250,252,0.95))] p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.24)] dark:border-slate-800 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.96),rgba(2,6,23,0.96))]">
                        <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-3 dark:border-slate-800">
                          <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            فرصت‌های فروش
                          </div>
                          <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                            <div>
                              <h3 className="text-[17px] font-black text-slate-900 dark:text-slate-50">
                                اولویت‌های فروش و موجودی
                              </h3>
                              <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
                                مدل‌های کم‌گردش، بدون قیمت یا نیازمند بازبینی را
                                برای اقدام سریع‌تر ببینید.
                              </p>
                            </div>
                            <div
                              className={`inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[10px] font-black ${inventoryIntelligence.pressureScore >= 65 ? "border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" : inventoryIntelligence.pressureScore >= 35 ? "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/60 dark:bg-amber-950/30 dark:text-amber-300" : "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300"}`}
                            >
                              <i className="fa-solid fa-radar" />{" "}
                              {inventoryIntelligence.pressureLabel}
                            </div>
                          </div>
                        </div>
                        <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3">
                          {inventoryIntelligence.alerts.length === 0 ? (
                            <div className="md:col-span-2 xl:col-span-3 rounded-[20px] border border-emerald-200 bg-emerald-50 px-4 py-4 text-sm text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                              هشدار بحرانی فعالی دیده نشد؛ تمرکز را روی حفظ ریتم
                              ورود و قیمت‌گذاری منظم نگه دار.
                            </div>
                          ) : (
                            inventoryIntelligence.alerts.map((alert) => (
                              <div
                                key={alert.key}
                                className="rounded-[20px] border border-slate-200/80 bg-white/80 p-4 dark:border-slate-800 dark:bg-slate-950/50"
                              >
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <div className="text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
                                      {alert.label}
                                    </div>
                                    <div className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-50">
                                      {alert.value.toLocaleString("fa-IR")}
                                    </div>
                                  </div>
                                  <IconGlyph size="lg" tone={inferIconGlyphTone(alert.tone)} aria-hidden="true">
                                    <i className={`fa-solid ${alert.icon}`} />
                                  </IconGlyph>
                                </div>
                                <div className="mt-3 text-xs leading-6 text-slate-500 dark:text-slate-400">
                                  {alert.hint}
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </div>
                      <div className="space-y-3">
                        <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                          <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            پیشنهاد فروش
                          </div>
                          <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                            اقدام پیشنهادی
                          </h3>
                          <p className="mt-3 text-sm leading-7 text-slate-600 dark:text-slate-300">
                            {inventoryAIPrompt}
                          </p>
                          <div className="mt-3 rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-3 py-3 text-xs text-slate-600 dark:border-slate-800 dark:bg-slate-900/60 dark:text-slate-300">
                            تمرکز امروز:{" "}
                            <span className="font-black text-slate-900 dark:text-slate-50">
                              {inventoryIntelligence.topAction}
                            </span>
                          </div>
                        </div>
                        <div className="rounded-[24px] border border-slate-200/80 bg-white/90 p-4 shadow-[0_22px_50px_-38px_rgba(15,23,42,0.22)] dark:border-slate-800 dark:bg-slate-950/60">
                          <div className="text-[11px] font-black tracking-[0.16em] text-slate-500 dark:text-slate-400">
                            فروش سریع‌تر
                          </div>
                          <h3 className="mt-2 text-[17px] font-black text-slate-900 dark:text-slate-50">
                            مدل‌های با گردش بهتر
                          </h3>
                          <div className="mt-4 space-y-3">
                            {inventoryIntelligence.fastMoving.length === 0 ? (
                              <div className="rounded-[18px] border border-dashed border-slate-200 px-3 py-3 text-sm text-slate-500 dark:border-slate-700 dark:text-slate-400">
                                هنوز سابقه فروش کافی برای مقایسه گردش مدل‌ها
                                وجود ندارد.
                              </div>
                            ) : (
                              inventoryIntelligence.fastMoving.map((item) => (
                                <div
                                  key={item.model}
                                  className="rounded-[18px] border border-slate-200/80 bg-slate-50/80 px-3 py-3 dark:border-slate-800 dark:bg-slate-900/60"
                                >
                                  <div className="flex items-center justify-between gap-3">
                                    <div>
                                      <div className="text-[13px] font-black text-slate-900 dark:text-slate-50">
                                        {item.model}
                                      </div>
                                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                                        فروخته‌شده:{" "}
                                        {item.sold.toLocaleString("fa-IR")} •
                                        موجود فعال:{" "}
                                        {item.active.toLocaleString("fa-IR")}
                                      </div>
                                    </div>
                                    <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-2.5 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-900/60 dark:bg-emerald-950/30 dark:text-emerald-300">
                                      <i className="fa-solid fa-bolt" /> فروش
                                      مناسب
                                    </span>
                                  </div>
                                </div>
                              ))
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                  {selectedPhones.length > 0 && (
                    <div className="mt-4 grid gap-3 xl:grid-cols-[1.2fr_1.2fr_auto_auto]">
                      <div className="rounded-[20px] border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/70">
                        <div className="mb-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          وضعیت
                        </div>
                        <div className="flex gap-3">
                          <SelectField controlOnly unstyled showChevron={false}
                            value={bulkStatusTarget}
                            onChange={(e) =>
                              setBulkStatusTarget(
                                e.target.value as PhoneStatus | "all",
                              )
                            }
                            className={`${baseInput} h-11`}
                          >
                            <option value="all">انتخاب وضعیت</option>
                            {PHONE_STATUSES.map((status) => (
                              <option key={status} value={status}>
                                {status}
                              </option>
                            ))}
                          </SelectField>
                          <button
                            type="button"
                            onClick={() => requestBulkAction("status")}
                            disabled={
                              bulkStatusTarget === "all" || isBulkSubmitting
                            }
                            className="ux-btn ux-btn-primary h-10 rounded-2xl px-4 text-[11px] shadow-sm ux-btn-sm h-11 px-4 disabled:opacity-50"
                          >
                            اعمال
                          </button>
                        </div>
                      </div>
                      <div className="rounded-[20px] border border-slate-200/80 bg-white p-3 dark:border-slate-700 dark:bg-slate-950/70">
                        <div className="mb-2 text-[11px] font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">
                          تخصیص تامین‌کننده
                        </div>
                        <div className="flex gap-3">
                          <SearchableSelectField<string>
                            value={bulkSupplierTarget === 'all' ? null : bulkSupplierTarget}
                            onValueChange={(value) => setBulkSupplierTarget(value ?? 'all')}
                            options={partners.map((partner) => ({
                              value: String(partner.id),
                              label: partner.partnerName,
                              searchText: `${partner.partnerName} ${partner.id}`,
                            }))}
                            placeholder="نام تأمین‌کننده را تایپ کنید…"
                            noOptionsMessage="تأمین‌کننده‌ای مطابق جستجو پیدا نشد"
                            ariaLabel="جستجو و انتخاب تأمین‌کننده برای تخصیص گروهی"
                            controlClassName={`${baseInput} h-11`}
                          />
                          <button
                            type="button"
                            onClick={() => requestBulkAction("supplier")}
                            disabled={
                              bulkSupplierTarget === "all" || isBulkSubmitting
                            }
                            className="ux-btn ux-btn-secondary h-10 rounded-2xl px-4 text-[11px] shadow-sm ux-btn-sm h-11 px-4 disabled:opacity-50"
                          >
                            اعمال تأمین‌کننده
                          </button>
                        </div>
                      </div>
                      <button
                        type="button"
                        onClick={() => requestBulkAction("export")}
                        className="ux-btn ux-btn-success h-[4.5rem] rounded-[20px] px-5 text-[13px] font-black"
                      >
                        <i className="fa-solid fa-file-export ml-2" /> خروجی CSV
                      </button>
                    </div>
                  )}
                </div>
                {inventoryViewMode === "table" ? (
                  <DataTableShell
                    className="phone-list-shell__table phone-list-shell__table--fit"
                    data-ui-mobile-phone-inventory-table="true"
                  >
                    <table
                      className="phone-inventory-table"
                      data-ui-table="true"
                      data-ui-table-layout="managed"
                      data-ui-table-density="compact"
                      data-ui-bidi-scope="rtl-table"
                      dir="rtl"
                    >
                      <colgroup>
                        <col data-phone-column="selection" />
                        <col data-phone-column="device" />
                        <col data-phone-column="finance" />
                        <col data-phone-column="actions" />
                      </colgroup>
                      <thead>
                          <tr>
                            <th data-phone-column="selection">
                              <button
                                type="button"
                                role="checkbox"
                                aria-checked={allVisibleSelected}
                                onClick={toggleSelectAllVisible}
                                className={`phone-table-selection-control ${allVisibleSelected ? "is-selected" : ""}`}
                                title={
                                  allVisibleSelected
                                    ? "لغو انتخاب همه"
                                    : "انتخاب همه"
                                }
                                aria-label={
                                  allVisibleSelected
                                    ? "لغو انتخاب همه گوشی‌های قابل مشاهده"
                                    : "انتخاب همه گوشی‌های قابل مشاهده"
                                }
                              >
                                {allVisibleSelected ? (
                                  <i
                                    className="fa-solid fa-check"
                                    aria-hidden="true"
                                  />
                                ) : null}
                              </button>
                            </th>
                            <th data-phone-column="device">دستگاه</th>
                            <th data-phone-column="finance">مالی</th>
                            <th data-phone-column="actions">عملیات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {inventoryExplorerPhones.map((phone) => {
                            const ageDays =
                              phone.purchaseDate || phone.registerDate
                                ? moment().diff(
                                    moment(
                                      phone.purchaseDate || phone.registerDate,
                                    ),
                                    "days",
                                  )
                                : null;
                            const info = statusBadgeInfo(phone.status);
                            const flags = getPhoneOperationalFlags(phone);
                            const topFlag = flags[0] ?? null;
                            const extraFlagsCount = Math.max(
                              0,
                              flags.length - (topFlag ? 1 : 0),
                            );
                            const isSelected = selectedPhoneIds.includes(
                              phone.id,
                            );
                            const profit =
                              Number(phone.salePrice || 0) -
                              getPhoneCostBasisAmount(phone);
                            const batteryValue = Number(
                              phone.batteryHealth || 0,
                            );
                            const batteryLabel = phone.batteryHealth
                              ? batteryValue < 70
                                ? "وضعیت باتری بحرانی"
                                : batteryValue <= 75
                                  ? "باتری تعویض باید بشود"
                                  : `باتری ${toFaDigits(String(batteryValue))}%`
                              : null;
                            const isSoldPhone =
                              phone.status === "فروخته شده" ||
                              phone.status === "فروخته شده (قسطی)";
                            const sellAvailability = getSellAvailability(phone);
                            return (
                              <tr
                                key={phone.id}
                                className={`phone-table-row ${isSelected ? "is-selected" : ""}`}
                              >
                                <td data-phone-column="selection">
                                  <button
                                    type="button"
                                    role="checkbox"
                                    aria-checked={isSelected}
                                    onClick={() =>
                                      togglePhoneSelection(phone.id)
                                    }
                                    className={`phone-table-selection-control ${isSelected ? "is-selected" : ""}`}
                                    title={isSelected ? "لغو انتخاب" : "انتخاب"}
                                    aria-label={
                                      isSelected
                                        ? "لغو انتخاب گوشی"
                                        : "انتخاب گوشی"
                                    }
                                  >
                                    {isSelected ? (
                                      <i
                                        className="fa-solid fa-check"
                                        aria-hidden="true"
                                      />
                                    ) : null}
                                  </button>
                                </td>
                                <td data-phone-column="device">
                                  <div className="phone-table-device-stack">
                                    <div className="phone-table-device-heading">
                                      <div className="phone-table-device-identity">
                                        <div
                                          className="phone-table-model-name truncate text-[14px] font-black leading-6 text-slate-900 dark:text-slate-50"
                                          dir="rtl"
                                          title={phone.model}
                                        >
                                          {phone.model}
                                        </div>
                                        <span
                                          className="phone-table-imei min-w-0 truncate font-mono text-[11px] tracking-[0.04em] text-slate-500 dark:text-slate-400"
                                          dir="ltr"
                                          title={phone.imei || "IMEI نامشخص"}
                                        >
                                          {phone.imei || "-"}
                                        </span>
                                      </div>
                                      <span
                                        className={`phone-table-status shrink-0 rounded-full px-2 py-1 text-[9px] font-black leading-none ${info.bgClass}`}
                                        title={phone.status}
                                      >
                                        {phone.status}
                                      </span>
                                    </div>
                                    <div className="phone-table-specs flex min-w-0 flex-wrap gap-1.5 text-[9.5px]">
                                      <span
                                        dir="ltr"
                                        data-phone-meta="storage"
                                        className="phone-table-spec-pill phone-table-spec-pill--numeric inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/95 px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300"
                                      >
                                        <i className="fa-solid fa-memory text-[9px]" />
                                        <span className="phone-table-spec-pill__value">
                                          {phone.storage
                                            ? `${toFaDigits(String(phone.storage))} GB`
                                            : "-"}
                                        </span>
                                      </span>
                                      <span
                                        dir="ltr"
                                        data-phone-meta="ram"
                                        className="phone-table-spec-pill phone-table-spec-pill--numeric inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/95 px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300"
                                      >
                                        <i className="fa-solid fa-microchip text-[9px]" />
                                        <span className="phone-table-spec-pill__value">
                                          {phone.ram
                                            ? `${toFaDigits(String(phone.ram))} GB`
                                            : "-"}
                                        </span>
                                      </span>
                                      <span data-phone-meta="color" className="phone-table-spec-pill inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-slate-50/95 px-2 py-1 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300">
                                        <i className="fa-solid fa-droplet text-[9px]" />
                                        <span className="truncate">
                                          {phone.color || "نامشخص"}
                                        </span>
                                      </span>
                                      <span
                                        data-phone-meta="supplier"
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${phone.supplierName ? "border border-slate-200/80 bg-slate-50/95 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300" : "border border-slate-200/70 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500"}`}
                                        title={
                                          phone.supplierName ||
                                          "بدون تامین‌کننده"
                                        }
                                      >
                                        <i className="fa-solid fa-user text-[9px]" />
                                        {phone.supplierName || "بدون تامین"}
                                      </span>
                                      <span
                                        data-phone-meta="age"
                                        className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${ageDays === null ? "border border-slate-200/70 bg-slate-50/70 text-slate-400 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-500" : ageDays >= 45 ? "border border-amber-200/80 bg-amber-50 text-amber-700 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-300" : "border border-slate-200/80 bg-slate-50/95 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300"}`}
                                        title={
                                          ageDays === null
                                            ? "سن انبار نامشخص"
                                            : `${ageDays.toLocaleString("fa-IR")} روز`
                                        }
                                      >
                                        <i className="fa-solid fa-hourglass-half text-[9px]" />
                                        {ageDays === null
                                          ? "سن نامشخص"
                                          : `${ageDays.toLocaleString("fa-IR")} روز`}
                                      </span>
                                      {batteryLabel ? (
                                        <span
                                          data-phone-meta="battery"
                                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 ${batteryValue <= 75 ? "border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/60 dark:bg-rose-950/30 dark:text-rose-300" : "border border-slate-200/80 bg-slate-50/95 text-slate-600 dark:border-slate-700 dark:bg-slate-900/75 dark:text-slate-300"}`}
                                        >
                                          <i className="fa-solid fa-battery-half text-[9px]" />
                                          {batteryLabel}
                                        </span>
                                      ) : null}
                                      {topFlag && (
                                        <span
                                          key={topFlag.label}
                                          data-phone-meta="flag"
                                          className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[9px] font-black ${topFlag.tone}`}
                                        >
                                          <i
                                            className={`fa-solid ${topFlag.icon}`}
                                          />
                                          {topFlag.label}
                                        </span>
                                      )}
                                      {extraFlagsCount > 0 && (
                                        <span data-phone-meta="extra-flags" className="inline-flex items-center rounded-full border border-slate-200 bg-slate-50 px-1.5 py-1 text-[8.5px] font-black text-slate-500 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-400">
                                          +
                                          {extraFlagsCount.toLocaleString(
                                            "fa-IR",
                                          )}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </td>
                                <td data-phone-column="finance">
                                  <div className="phone-table-finance-stack">
                                    <div className="phone-table-finance-row">
                                      <span>خرید</span>
                                      <strong
                                        dir="ltr"
                                        className="phone-table-finance-value font-black text-slate-900 dark:text-slate-50"
                                        title={formatPrice(
                                          Number(
                                            phone.currentPurchasePrice || 0,
                                          ) > 0
                                            ? Number(
                                                phone.currentPurchasePrice || 0,
                                              )
                                            : Number(phone.purchasePrice || 0),
                                        )}
                                      >
                                        {formatShortPrice(
                                          Number(
                                            phone.currentPurchasePrice || 0,
                                          ) > 0
                                            ? Number(
                                                phone.currentPurchasePrice || 0,
                                              )
                                            : Number(phone.purchasePrice || 0),
                                        )}
                                      </strong>
                                    </div>
                                    <div className="phone-table-finance-row">
                                      <span>فروش</span>
                                      <strong
                                        dir="ltr"
                                        className="phone-table-finance-value font-black text-slate-900 dark:text-slate-50"
                                        title={formatPrice(phone.salePrice)}
                                      >
                                        {formatShortPrice(phone.salePrice)}
                                      </strong>
                                    </div>
                                    <div
                                      className={`phone-table-finance-row ${profit > 0 ? "is-positive" : ""}`}
                                    >
                                      <span>سود</span>
                                      <strong
                                        dir="ltr"
                                        className="phone-table-finance-value font-black"
                                        title={formatPrice(profit)}
                                      >
                                        {formatShortPrice(profit)}
                                      </strong>
                                    </div>
                                  </div>
                                </td>
                                <td className="phone-table-actions-cell" data-phone-column="actions">
                                  <div className="phone-table-actions-wrap">
                                    <TableActionGroup
                                      ariaLabel={`عملیات گوشی ${phone.model || phone.imei || phone.id}`}
                                      collapseBelow="sm"
                                      className="phone-table-action-group"
                                      actions={[
                                      {
                                        key: 'details',
                                        kind: 'button',
                                        onClick: () => openDetailsModal(phone),
                                        label: 'مشاهده جزئیات گوشی',
                                        tooltip: 'جزئیات',
                                        variant: 'secondary',
                                        icon: <i className="fas fa-eye" aria-hidden="true" />,
                                      },
                                      {
                                        key: 'barcode',
                                        kind: 'button',
                                        onClick: () => openBarcodeModal(phone),
                                        label: 'چاپ بارکد گوشی',
                                        tooltip: 'بارکد',
                                        variant: 'secondary',
                                        icon: <i className="fas fa-barcode" aria-hidden="true" />,
                                      },
                                      {
                                        key: 'sell',
                                        kind: 'button',
                                        onClick: () => {
                                          if (sellAvailability.canSell) handleSellPhone(phone);
                                          else if (!isSoldPhone && sellAvailability.hint === 'اول قیمت‌گذاری کن') openEditModal(phone, 'pricing');
                                          else if (!isSoldPhone && sellAvailability.hint === 'نیاز به بازبینی وضعیت') openEditModal(phone, 'status-review');
                                        },
                                        label: sellAvailability.canSell
                                          ? 'فروش گوشی'
                                          : sellAvailability.hint === 'اول قیمت‌گذاری کن'
                                            ? 'قیمت‌گذاری گوشی'
                                            : 'بازبینی وضعیت گوشی',
                                        tooltip: sellAvailability.hint,
                                        variant: sellAvailability.canSell ? 'success' : 'warning',
                                        icon: <i className={`fas ${sellAvailability.canSell ? 'fa-cash-register' : sellAvailability.hint === 'اول قیمت‌گذاری کن' ? 'fa-tags' : 'fa-clipboard-check'}`} aria-hidden="true" />,
                                      },
                                      {
                                        key: 'edit',
                                        kind: 'button',
                                        onClick: () => openEditModal(phone),
                                        label: 'ویرایش اطلاعات گوشی',
                                        tooltip: 'ویرایش',
                                        variant: 'secondary',
                                        hidden: !canManage,
                                        icon: <i className="fas fa-pen-to-square" aria-hidden="true" />,
                                      },
                                      {
                                        key: 'delete',
                                        kind: 'button',
                                        onClick: () => openDeleteModal(phone.id),
                                        label: 'حذف گوشی',
                                        tooltip: 'حذف',
                                        variant: 'danger',
                                        hidden: !canManage,
                                        requiredRoles: ['Admin', 'Manager'],
                                        icon: <i className="fas fa-trash" aria-hidden="true" />,
                                      },
                                      ]}
                                    />
                                  </div>
                                </td>{" "}
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                  </DataTableShell>
                ) : (
                  <div className="phone-list-shell__cards grid gap-3.5">
                    {inventoryExplorerPhones.map((phone) => {
                      const ageDays =
                        phone.purchaseDate || phone.registerDate
                          ? moment().diff(
                              moment(phone.purchaseDate || phone.registerDate),
                              "days",
                            )
                          : null;
                      const profit =
                        Number(phone.salePrice || 0) -
                        getPhoneCostBasisAmount(phone);
                      const info = statusBadgeInfo(phone.status);
                      const flags = getPhoneOperationalFlags(phone);
                      const topFlag = flags[0] ?? null;
                      const cardMetaItems = [
                        phone.purchaseDate
                          ? {
                              key: "purchaseDate",
                              label: "تاریخ خرید",
                              value: formatIsoToShamsi(phone.purchaseDate),
                              title: formatIsoToShamsi(phone.purchaseDate),
                              valueClassName:
                                "text-slate-800 dark:text-slate-200",
                              labelClassName:
                                "text-slate-500 dark:text-slate-400",
                            }
                          : null,
                        phone.saleDate
                          ? {
                              key: "saleDate",
                              label: "تاریخ فروش",
                              value: formatIsoToShamsi(phone.saleDate),
                              title: formatIsoToShamsi(phone.saleDate),
                              valueClassName:
                                "text-slate-800 dark:text-slate-200",
                              labelClassName:
                                "text-slate-500 dark:text-slate-400",
                            }
                          : {
                              key: "saleDate",
                              label: "تاریخ فروش",
                              value: "ثبت نشده",
                              title: "تاریخ فروش ثبت نشده",
                              valueClassName:
                                "text-slate-500 dark:text-slate-400",
                              labelClassName:
                                "text-slate-500 dark:text-slate-400",
                            },
                        phone.registerDate
                          ? {
                              key: "register",
                              label: "ثبت اطلاعات",
                              value: formatIsoToShamsi(phone.registerDate),
                              title: formatIsoToShamsi(phone.registerDate),
                              valueClassName:
                                "text-slate-800 dark:text-slate-200",
                              labelClassName:
                                "text-slate-500 dark:text-slate-400",
                            }
                          : null,
                        phone.batteryHealth !== null &&
                        phone.batteryHealth !== undefined
                          ? {
                              key: "battery",
                              label: "باتری",
                              value: `${Number(phone.batteryHealth).toLocaleString("fa-IR")}٪`,
                              title: `${Number(phone.batteryHealth).toLocaleString("fa-IR")}٪`,
                              valueClassName: `${Number(phone.batteryHealth) < 75 ? "text-rose-700 dark:text-rose-300" : Number(phone.batteryHealth) < 80 ? "text-amber-700 dark:text-amber-300" : "text-slate-800 dark:text-slate-200"}`,
                              labelClassName: `${Number(phone.batteryHealth) < 75 ? "text-rose-600/90 dark:text-rose-400" : Number(phone.batteryHealth) < 80 ? "text-amber-600/90 dark:text-amber-400" : "text-slate-500 dark:text-slate-400"}`,
                            }
                          : null,
                      ]
                        .filter(Boolean)
                        .slice(0, 4) as Array<{
                        key: string;
                        label: string;
                        value: string;
                        title: string;
                        dir?: "ltr";
                        valueClassName?: string;
                        labelClassName?: string;
                      }>;
                      const isSelected = selectedPhoneIds.includes(phone.id);
                      const isSoldPhone =
                        phone.status === "فروخته شده" ||
                        phone.status === "فروخته شده (قسطی)";
                      const selectedCardTone = !isSelected
                        ? isSoldPhone
                          ? "border-rose-200 bg-rose-50/80 dark:border-rose-900/40 dark:bg-rose-950/18"
                          : "border-slate-200/80 dark:border-slate-800"
                        : phone.status === "مرجوعی اقساطی"
                          ? "border-rose-200 ring-2 ring-rose-200/70 bg-rose-50/70 dark:border-rose-900/40 dark:ring-rose-900/35 dark:bg-rose-950/16"
                          : phone.status === "مرجوعی"
                            ? "border-amber-200 ring-2 ring-amber-200/70 bg-amber-50/70 dark:border-amber-900/40 dark:ring-amber-900/35 dark:bg-amber-950/16"
                            : topFlag?.label === "فروش فوری"
                              ? "border-amber-200 ring-2 ring-amber-200/70 bg-amber-50/65 dark:border-amber-900/35 dark:ring-amber-900/30 dark:bg-amber-950/14"
                              : topFlag?.label === "سود ضعیف"
                                ? "border-rose-200 ring-2 ring-rose-200/70 bg-rose-50/65 dark:border-rose-900/35 dark:ring-rose-900/30 dark:bg-rose-950/14"
                                : topFlag?.label === "بی‌قیمت"
                                  ? "border-sky-200 ring-2 ring-sky-200/70 bg-sky-50/65 dark:border-sky-900/35 dark:ring-sky-900/30 dark:bg-sky-950/14"
                                  : "border-[color:var(--brand)] ring-2 ring-[color:var(--brand)]/15 bg-[color:var(--brand)]/5 dark:border-[color:var(--brand)]/35 dark:ring-[color:var(--brand)]/25 dark:bg-[color:var(--brand)]/10";
                      const cardHoverTone = !isSelected
                        ? isSoldPhone
                          ? "hover:border-rose-300/90 hover:bg-rose-100/75 dark:hover:border-rose-800/50 dark:hover:bg-rose-950/22"
                          : phone.status === "مرجوعی اقساطی"
                            ? "hover:border-rose-200/90 hover:bg-rose-50/60 dark:hover:border-rose-900/40 dark:hover:bg-rose-950/12"
                            : phone.status === "مرجوعی"
                              ? "hover:border-amber-200/90 hover:bg-amber-50/60 dark:hover:border-amber-900/40 dark:hover:bg-amber-950/12"
                              : topFlag?.label === "فروش فوری"
                                ? "hover:border-amber-200/80 hover:bg-amber-50/55 dark:hover:border-amber-900/35 dark:hover:bg-amber-950/10"
                                : topFlag?.label === "سود ضعیف"
                                  ? "hover:border-rose-200/80 hover:bg-rose-50/55 dark:hover:border-rose-900/35 dark:hover:bg-rose-950/10"
                                  : topFlag?.label === "بی‌قیمت"
                                    ? "hover:border-sky-200/80 hover:bg-sky-50/55 dark:hover:border-sky-900/35 dark:hover:bg-sky-950/10"
                                    : "hover:border-slate-300/90 dark:hover:border-slate-700"
                        : phone.status === "مرجوعی اقساطی"
                          ? "hover:border-rose-300 hover:bg-rose-100/80 hover:ring-rose-200/90 dark:hover:border-rose-800/55 dark:hover:bg-rose-950/24 dark:hover:ring-rose-900/45"
                          : phone.status === "مرجوعی"
                            ? "hover:border-amber-300 hover:bg-amber-100/80 hover:ring-amber-200/90 dark:hover:border-amber-800/55 dark:hover:bg-amber-950/24 dark:hover:ring-amber-900/45"
                            : topFlag?.label === "فروش فوری"
                              ? "hover:border-amber-300 hover:bg-amber-100/75 hover:ring-amber-200/80 dark:hover:border-amber-800/50 dark:hover:bg-amber-950/22 dark:hover:ring-amber-900/40"
                              : topFlag?.label === "سود ضعیف"
                                ? "hover:border-rose-300 hover:bg-rose-100/75 hover:ring-rose-200/80 dark:hover:border-rose-800/50 dark:hover:bg-rose-950/22 dark:hover:ring-rose-900/40"
                                : topFlag?.label === "بی‌قیمت"
                                  ? "hover:border-sky-300 hover:bg-sky-100/75 hover:ring-sky-200/80 dark:hover:border-sky-800/50 dark:hover:bg-sky-950/22 dark:hover:ring-sky-900/40"
                                  : "hover:border-[color:var(--brand)]/90 hover:bg-[color:var(--brand)]/8 hover:ring-[color:var(--brand)]/20 dark:hover:border-[color:var(--brand)]/45 dark:hover:bg-[color:var(--brand)]/14 dark:hover:ring-[color:var(--brand)]/28";
                      const cardMenuTone =
                        phone.status === "مرجوعی اقساطی"
                          ? {
                              button:
                                "border-rose-200/80 bg-rose-50/80 text-rose-700 hover:bg-rose-100/90 dark:border-rose-900/40 dark:bg-rose-950/25 dark:text-rose-200 dark:hover:bg-rose-950/40",
                              shell:
                                "border-rose-200/80 bg-white/95 dark:border-rose-900/40 dark:bg-slate-950/95",
                            }
                          : phone.status === "مرجوعی"
                            ? {
                                button:
                                  "border-amber-200/80 bg-amber-50/85 text-amber-700 hover:bg-amber-100/90 dark:border-amber-900/40 dark:bg-amber-950/25 dark:text-amber-200 dark:hover:bg-amber-950/40",
                                shell:
                                  "border-amber-200/80 bg-white/95 dark:border-amber-900/40 dark:bg-slate-950/95",
                              }
                            : topFlag?.label === "فروش فوری"
                              ? {
                                  button:
                                    "border-amber-200/80 bg-amber-50/80 text-amber-700 hover:bg-amber-100/90 dark:border-amber-900/35 dark:bg-amber-950/20 dark:text-amber-200 dark:hover:bg-amber-950/35",
                                  shell:
                                    "border-amber-200/70 bg-white/95 dark:border-amber-900/35 dark:bg-slate-950/95",
                                }
                              : topFlag?.label === "سود ضعیف"
                                ? {
                                    button:
                                      "border-rose-200/80 bg-rose-50/80 text-rose-700 hover:bg-rose-100/90 dark:border-rose-900/35 dark:bg-rose-950/20 dark:text-rose-200 dark:hover:bg-rose-950/35",
                                    shell:
                                      "border-rose-200/70 bg-white/95 dark:border-rose-900/35 dark:bg-slate-950/95",
                                  }
                                : topFlag?.label === "بی‌قیمت"
                                  ? {
                                      button:
                                        "border-sky-200/80 bg-sky-50/80 text-sky-700 hover:bg-sky-100/90 dark:border-sky-900/35 dark:bg-sky-950/20 dark:text-sky-200 dark:hover:bg-sky-950/35",
                                      shell:
                                        "border-sky-200/70 bg-white/95 dark:border-sky-900/35 dark:bg-slate-950/95",
                                    }
                                  : {
                                      button:
                                        "border-slate-200/80 bg-white/85 text-slate-600 hover:bg-slate-100/90 dark:border-slate-800 dark:bg-slate-950/45 dark:text-slate-200 dark:hover:bg-slate-900/85",
                                      shell:
                                        "border-slate-200/80 bg-white/95 dark:border-slate-800 dark:bg-slate-950/95",
                                    };
                      const sellAvailability = getSellAvailability(phone);
                      return (
                        <div
                          key={phone.id}
                          className={`phone-card-surface rounded-[22px] border ${isSoldPhone ? "border-rose-200 bg-rose-50/85 dark:border-rose-900/45 dark:bg-rose-950/18" : selectedCardTone} ${cardHoverTone} overflow-hidden bg-[linear-gradient(180deg,rgba(255,255,255,0.99),rgba(248,250,252,0.97))] shadow-[0_16px_38px_-32px_rgba(15,23,42,0.18)] transition hover:-translate-y-[1px] hover:shadow-[0_20px_40px_-30px_rgba(15,23,42,0.24)] dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.98),rgba(2,6,23,0.96))]`}
                        >
                          <div className="p-3.5">
                            <div className="flex items-start justify-between gap-3">
                              <div className="flex min-w-0 items-start gap-3">
                                <button
                                  type="button"
                                  onClick={() => togglePhoneSelection(phone.id)}
                                  className={`phone-card-select-btn mt-1 text-[13px] transition ${isSelected ? "text-[color:var(--brand)] dark:text-[color:var(--brand)]" : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-50"}`}
                                  title="انتخاب این گوشی"
                                >
                                  <i
                                    className={`fa-solid ${isSelected ? "fa-square-check" : "fa-square"}`}
                                  />
                                </button>
                                <div className="min-w-0">
                                  <div className="flex flex-wrap items-center gap-1.5">
                                    <h4 className="truncate text-[15px] font-extrabold leading-5 text-slate-900 dark:text-slate-50">
                                      {phone.model}
                                    </h4>
                                  </div>
                                  <div
                                    dir="ltr"
                                    className="mt-1 flex items-center gap-1.5 font-mono text-[11px] tracking-[0.03em] text-slate-500 dark:text-slate-400"
                                    title={phone.imei || "IMEI نامشخص"}
                                  >
                                    <span className="truncate">
                                      {phone.imei || "—"}
                                    </span>
                                    <span className="inline-flex items-center rounded-full border border-[color:var(--brand)]/18 bg-[color:var(--brand)]/8 px-1.5 py-0.5 text-[8.5px] font-black text-[color:var(--brand)]">
                                      IMEI
                                    </span>
                                  </div>
                                  <div className="phone-card-specs-row mt-1.5 grid grid-cols-3 gap-1.5 text-[10px]">
                                    <span
                                      dir="ltr"
                                      className="phone-card-spec-pill phone-card-spec-pill--numeric inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"
                                    >
                                      <i className="fa-solid fa-memory shrink-0 text-[9px]" />
                                      <span className="phone-card-spec-pill__value">
                                        {phone.storage
                                          ? `${toFaDigits(String(phone.storage))} GB`
                                          : "-"}
                                      </span>
                                    </span>
                                    <span
                                      dir="ltr"
                                      className="phone-card-spec-pill phone-card-spec-pill--numeric inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300"
                                    >
                                      <i className="fa-solid fa-microchip shrink-0 text-[9px]" />
                                      <span className="phone-card-spec-pill__value">
                                        {phone.ram
                                          ? `${toFaDigits(String(phone.ram))} GB`
                                          : "-"}
                                      </span>
                                    </span>
                                    <span className="phone-card-spec-pill inline-flex min-w-0 items-center justify-center gap-1 rounded-full border border-slate-200/80 bg-white/80 px-1.5 py-0.5 text-slate-600 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-300">
                                      <i className="fa-solid fa-palette shrink-0 text-[9px]" />
                                      <span className="phone-card-spec-pill__value phone-card-spec-pill__value--text">
                                        {phone.color || "-"}
                                      </span>
                                    </span>
                                  </div>
                                </div>
                              </div>
                              <div className="flex shrink-0 flex-col items-end gap-1.5">
                                <span
                                  className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-bold ${info.bgClass}`}
                                >
                                  <i className={`fa-solid ${info.icon}`}></i>
                                  {phone.status}
                                </span>
                                {topFlag && (
                                  <span
                                    className={`inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[9px] font-black ${topFlag.tone}`}
                                  >
                                    <i className={`fa-solid ${topFlag.icon}`} />
                                    {topFlag.label}
                                  </span>
                                )}
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-3 gap-3 text-[11px]">
                              <div className="rounded-[16px] border border-slate-200/80 bg-white/85 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="text-[10px] font-black tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                  خرید
                                </div>
                                <div
                                  dir="ltr"
                                  title={formatPrice(
                                    Number(phone.currentPurchasePrice || 0) > 0
                                      ? Number(phone.currentPurchasePrice || 0)
                                      : Number(phone.purchasePrice || 0),
                                  )}
                                  className="mt-1 font-mono tabular-nums text-[12px] font-black text-slate-900 dark:text-slate-50"
                                >
                                  {formatShortPrice(
                                    Number(phone.currentPurchasePrice || 0) > 0
                                      ? Number(phone.currentPurchasePrice || 0)
                                      : Number(phone.purchasePrice || 0),
                                  )}
                                </div>
                              </div>
                              <div className="rounded-[16px] border border-slate-200/80 bg-white/85 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="text-[10px] font-black tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                  فروش
                                </div>
                                <div
                                  dir="ltr"
                                  title={formatPrice(phone.salePrice)}
                                  className="mt-1 font-mono tabular-nums text-[12px] font-black text-slate-900 dark:text-slate-50"
                                >
                                  {formatShortPrice(phone.salePrice)}
                                </div>
                              </div>
                              <div className="rounded-[16px] border border-slate-200/80 bg-white/85 p-2.5 dark:border-slate-800 dark:bg-slate-950/40">
                                <div className="text-[10px] font-black tracking-[0.1em] text-slate-500 dark:text-slate-400">
                                  سود
                                </div>
                                <div
                                  dir="ltr"
                                  title={formatPrice(
                                    Number(phone.salePrice || 0) -
                                      (Number(phone.currentPurchasePrice || 0) >
                                      0
                                        ? Number(
                                            phone.currentPurchasePrice || 0,
                                          )
                                        : Number(phone.purchasePrice || 0)),
                                  )}
                                  className={`mt-1 font-mono tabular-nums text-[12px] font-black ${Number(phone.salePrice || 0) - (Number(phone.currentPurchasePrice || 0) > 0 ? Number(phone.currentPurchasePrice || 0) : Number(phone.purchasePrice || 0)) > 0 ? "text-emerald-600 dark:text-emerald-300" : "text-slate-700 dark:text-slate-200"}`}
                                >
                                  {formatShortPrice(
                                    Number(phone.salePrice || 0) -
                                      (Number(phone.currentPurchasePrice || 0) >
                                      0
                                        ? Number(
                                            phone.currentPurchasePrice || 0,
                                          )
                                        : Number(phone.purchasePrice || 0)),
                                  )}
                                </div>
                              </div>
                            </div>
                            <div className="mt-3 grid grid-cols-2 gap-2.5 text-[11px] sm:grid-cols-3">
                              {cardMetaItems.map((item) => (
                                <div
                                  key={item.key}
                                  className="rounded-[14px] border border-slate-200/70 bg-slate-50/75 px-2.5 py-2 dark:border-slate-800 dark:bg-slate-950/35"
                                >
                                  <div
                                    className={`text-[9.5px] font-black tracking-[0.08em] ${item.labelClassName || "text-slate-500 dark:text-slate-400"}`}
                                  >
                                    {item.label}
                                  </div>
                                  <div
                                    dir={item.dir}
                                    className={`mt-1 truncate text-[11px] font-bold ${item.valueClassName || "text-slate-800 dark:text-slate-200"}`}
                                    title={item.title}
                                  >
                                    {item.value}
                                  </div>
                                </div>
                              ))}
                            </div>
                            {inventoryViewMode !== "compact" && phone.notes && (
                              <div className="mt-3 rounded-[16px] border border-dashed border-slate-200/90 bg-slate-50/75 px-3 py-2 text-[11px] text-slate-600 dark:border-slate-800 dark:bg-slate-950/30 dark:text-slate-300">
                                <span className="font-black text-slate-500 dark:text-slate-400">
                                  یادداشت:
                                </span>{" "}
                                <span className="line-clamp-2 align-middle">
                                  {phone.notes}
                                </span>
                              </div>
                            )}
                          </div>
                          <div className="phone-card-footer flex flex-wrap items-center justify-between gap-3 border-t border-slate-200/80 bg-white/60 px-4 py-4 dark:border-slate-800 dark:bg-slate-950/40">
                            <div className="phone-card-supplier flex items-center gap-2 text-[10.5px] text-slate-500 dark:text-slate-400">
                              <IconGlyph size="sm" tone="neutral" aria-hidden="true">
                                <i className="fa-solid fa-user text-[10px]" />
                              </IconGlyph>
                              <span className="font-semibold">
                                {phone.supplierName || "بدون تامین‌کننده"}
                              </span>
                            </div>
                            <div className="phone-card-actions flex items-center justify-end">
                              <TableActionGroup
                                ariaLabel={`عملیات گوشی ${phone.model || phone.imei || phone.id}`}
                                collapseBelow="md"
                                align="end"
                                actions={[
                                  {
                                    key: 'sell',
                                    kind: 'button',
                                    onClick: () => handleSellPhone(phone),
                                    disabled: !sellAvailability.canSell,
                                    label: 'فروش گوشی',
                                    tooltip: sellAvailability.canSell ? 'فروش این گوشی' : sellAvailability.hint,
                                    variant: 'success',
                                    icon: <i className="fas fa-cash-register" aria-hidden="true" />,
                                  },
                                  {
                                    key: 'details',
                                    kind: 'button',
                                    onClick: () => openDetailsModal(phone),
                                    label: 'مشاهده جزئیات',
                                    variant: 'secondary',
                                    icon: <i className="fas fa-eye" aria-hidden="true" />,
                                  },
                                  {
                                    key: 'barcode',
                                    kind: 'button',
                                    onClick: () => openBarcodeModal(phone),
                                    label: 'چاپ بارکد',
                                    variant: 'secondary',
                                    icon: <i className="fas fa-barcode" aria-hidden="true" />,
                                  },
                                  {
                                    key: 'pricing',
                                    kind: 'button',
                                    onClick: () => openEditModal(phone, 'pricing'),
                                    label: 'قیمت‌گذاری گوشی',
                                    variant: 'warning',
                                    hidden: isSoldPhone || sellAvailability.canSell || sellAvailability.hint !== 'اول قیمت‌گذاری کن',
                                    icon: <i className="fas fa-tags" aria-hidden="true" />,
                                  },
                                  {
                                    key: 'status-review',
                                    kind: 'button',
                                    onClick: () => openEditModal(phone, 'status-review'),
                                    label: 'بازبینی وضعیت',
                                    variant: 'warning',
                                    hidden: sellAvailability.canSell || sellAvailability.hint !== 'نیاز به بازبینی وضعیت',
                                    icon: <i className="fas fa-clipboard-check" aria-hidden="true" />,
                                  },
                                  {
                                    key: 'edit',
                                    kind: 'button',
                                    onClick: () => openEditModal(phone),
                                    label: 'ویرایش اطلاعات گوشی',
                                    variant: 'secondary',
                                    hidden: !canManage,
                                    icon: <i className="fas fa-pen-to-square" aria-hidden="true" />,
                                  },
                                  {
                                    key: 'delete',
                                    kind: 'button',
                                    onClick: () => openDeleteModal(phone.id),
                                    label: 'حذف گوشی',
                                    variant: 'danger',
                                    hidden: !canManage,
                                    requiredRoles: ['Admin', 'Manager'],
                                    icon: <i className="fas fa-trash" aria-hidden="true" />,
                                  },
                                ]}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </section>
    </>
  );
};

export default MobilePhonesMainWorkspace;
