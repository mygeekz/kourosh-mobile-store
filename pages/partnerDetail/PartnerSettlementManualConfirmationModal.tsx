import React from 'react';
import { formatCurrencyText, readStoredCurrencyUnit } from '../../utils/currency';

type Props = {
  ctx: Record<string, any>;
};

const roleIsManager = (roleName: unknown): boolean => {
  const normalized = String(roleName || '').trim().toLowerCase();
  return normalized === 'admin' || normalized === 'manager' || normalized === 'مدیر' || normalized === 'ادمین';
};

const toneClass: Record<string, string> = {
  success: 'border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200',
  warning: 'border-amber-200 bg-amber-50 text-amber-800 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200',
  danger: 'border-rose-200 bg-rose-50 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200',
  neutral: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200',
};

const PartnerSettlementManualConfirmationModal: React.FC<Props> = ({ ctx }) => {
  const {
    Modal,
    ModalActions,
    currentUser,
    isSettlementManualConfirmationModalOpen,
    partnerBusinessReadModel,
    setIsFullPhoneSettlementModalOpen,
    setIsSettlementManualConfirmationModalOpen,
    setSoldPhoneSettlementFilter,
  } = ctx;

  const manualConfirmation = partnerBusinessReadModel?.manualConfirmation;
  if (!isSettlementManualConfirmationModalOpen || !manualConfirmation) return null;

  const currencyUnit = readStoredCurrencyUnit();
  const formatMoney = (value: number | null | undefined) => (
    value == null ? 'نیازمند تکمیل اطلاعات' : formatCurrencyText(Number(value || 0), currencyUnit)
  );
  const isManager = roleIsManager(currentUser?.roleName);
  const canOpenManualWorkspace = Boolean(isManager && manualConfirmation.canOpenExistingManualWorkspace);

  const closeModal = () => setIsSettlementManualConfirmationModalOpen(false);
  const openExistingManualWorkspace = () => {
    if (!canOpenManualWorkspace) return;
    if (typeof setSoldPhoneSettlementFilter === 'function') setSoldPhoneSettlementFilter('open');
    closeModal();
    if (typeof setIsFullPhoneSettlementModalOpen === 'function') setIsFullPhoneSettlementModalOpen(true);
  };

  return (
    <Modal
      title="تایید دستی تسویه همکار"
      onClose={closeModal}
      widthClass="max-w-5xl"
      iconClass="fa-solid fa-user-shield"
      tone="info"
      variant="expansive"
      layout="split"
      bodyClassName="partner-settlement-manual-confirmation-modal-body"
      ariaDescription="مرور دستی مدیر برای تسویه همکار بدون ثبت خودکار"
    >
      <div className="space-y-5" data-partner-settlement-manual-confirmation-modal="true">
        <div className="rounded-[28px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/60">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-[11px] font-black text-slate-600 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
                <i className="fa-solid fa-lock text-slate-400" />
                فقط مدیر / بدون ثبت خودکار
              </div>
              <h3 className="mt-3 text-xl font-black text-slate-950 dark:text-slate-50">بازبینی نهایی قبل از ورود به کنترل دستی موجود</h3>
              <p className="mt-2 text-sm font-semibold leading-7 text-slate-500 dark:text-slate-400">
                این پنجره فقط خلاصه تایید دستی را نشان می‌دهد. هیچ پرداختی ثبت نمی‌شود، هیچ دفتر حسابی تغییر نمی‌کند و هیچ مسیر جدیدی برای تسویه ساخته نشده است.
              </p>
            </div>
            <div className={`inline-flex min-h-[42px] items-center gap-2 rounded-2xl border px-4 text-sm font-black shadow-sm ${toneClass[manualConfirmation.tone] || toneClass.neutral}`}>
              <i className="fa-solid fa-clipboard-check" />
              {manualConfirmation.statusLabel}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
          <article className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">مبلغ قابل بازبینی</div>
            <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{formatMoney(manualConfirmation.confirmationAmount)}</div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">فقط از مانده‌های واقعی ردیف‌های کاندید.</p>
          </article>
          <article className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">ردیف‌های تایید دستی</div>
            <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{manualConfirmation.confirmationLineCount.toLocaleString('fa-IR')}</div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">هیچ ردیف جدیدی ساخته یا ذخیره نمی‌شود.</p>
          </article>
          <article className="rounded-[22px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <div className="text-[13px] font-black text-slate-800 dark:text-slate-100">نقش مجاز</div>
            <div className="mt-3 text-lg font-black text-slate-950 dark:text-slate-50">{isManager ? 'مدیر / ادمین' : 'غیرمجاز برای اقدام'}</div>
            <p className="mt-2 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">مشاهده وضعیت خواندنی است؛ ورود به کنترل دستی فقط برای مدیر فعال می‌شود.</p>
          </article>
        </div>

        <div className="grid grid-cols-1 gap-4 xl:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
            <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">ردیف‌های داخل تایید دستی</h4>
            <p className="mt-1 text-xs font-semibold leading-6 text-slate-500 dark:text-slate-400">این لیست از پیش‌نویس خواندنی ساخته شده و عددی را حدس نمی‌زند.</p>
            <div className="mt-4 max-h-[360px] space-y-2 overflow-y-auto pr-1">
              {manualConfirmation.confirmationLines.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-300 bg-slate-50 p-4 text-center text-sm font-bold text-slate-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-400">
                  ردیفی برای تایید دستی وجود ندارد.
                </div>
              ) : manualConfirmation.confirmationLines.map((line: any) => (
                <article key={line.id || line.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-900/60">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                    <div className="min-w-0">
                      <div className="text-sm font-black text-slate-900 dark:text-slate-50">{line.label}</div>
                      <div className="mt-1 flex flex-wrap items-center gap-2 text-[11px] font-bold text-slate-500 dark:text-slate-400">
                        {line.identifier ? <span>شناسه: {line.identifier}</span> : <span>شناسه کالا ناقص</span>}
                        <span>{line.sourceLabel || 'منبع فروش نیازمند بررسی'}</span>
                      </div>
                    </div>
                    <div className="text-left sm:min-w-[160px]">
                      <div className="text-xs font-bold text-slate-500 dark:text-slate-400">مبلغ قابل تایید</div>
                      <div className="mt-1 text-sm font-black text-slate-950 dark:text-slate-50">{formatMoney(line.amount)}</div>
                    </div>
                  </div>
                  <div className="mt-3 grid grid-cols-1 gap-2 text-[11px] font-bold text-slate-600 dark:text-slate-300 sm:grid-cols-3">
                    <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">مبنای قیمت: {formatMoney(line.costBasis)}</span>
                    <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">پرداخت ثبت‌شده: {formatMoney(line.paidAmount)}</span>
                    <span className="rounded-2xl bg-white px-3 py-2 dark:bg-slate-950">{line.managerReviewRequired ? 'نیازمند بررسی مدیر' : 'آماده اقدام دستی'}</span>
                  </div>
                </article>
              ))}
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">قفل‌های ایمنی</h4>
              <div className="mt-3 space-y-2">
                {manualConfirmation.safeguards.map((item: string) => (
                  <div key={item} className="rounded-2xl border border-slate-200 bg-slate-50 p-3 text-xs font-semibold leading-6 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                    <i className="fa-solid fa-shield-halved ml-1 text-slate-400" />
                    {item}
                  </div>
                ))}
              </div>
            </div>

            <div className="rounded-[24px] border border-slate-200 bg-white p-4 dark:border-slate-800 dark:bg-slate-950/70">
              <h4 className="text-sm font-black text-slate-900 dark:text-slate-50">دلایل توقف یا بررسی</h4>
              {manualConfirmation.blockingReasons.length ? (
                <div className="mt-3 space-y-2">
                  {manualConfirmation.blockingReasons.map((reason: string) => (
                    <div key={reason} className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-xs font-semibold leading-6 text-amber-800 dark:border-amber-900/40 dark:bg-amber-950/20 dark:text-amber-200">
                      <i className="fa-solid fa-triangle-exclamation ml-1" />
                      {reason}
                    </div>
                  ))}
                </div>
              ) : (
                <p className="mt-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold leading-6 text-emerald-800 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200">
                  مانع اصلی برای ورود مدیر به کنترل دستی موجود دیده نمی‌شود؛ ثبت همچنان جداگانه و دستی است.
                </p>
              )}
            </div>
          </aside>
        </div>

        <ModalActions
          onCancel={closeModal}
          cancelText="بستن"
          submitText="رفتن به کنترل دستی موجود"
          submitType="button"
          onSubmitClick={openExistingManualWorkspace}
          submitDisabled={!canOpenManualWorkspace}
          submitIconClass="fa-solid fa-arrow-left"
          helperTitle="بدون ثبت خودکار"
          helperText={isManager ? 'این دکمه فقط نمای دستی موجود را باز می‌کند و خودش پرداخت یا تسویه ثبت نمی‌کند.' : manualConfirmation.managerOnlyReason}
          hideHelper={false}
        />
      </div>
    </Modal>
  );
};

export default PartnerSettlementManualConfirmationModal;
