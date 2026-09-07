import React from 'react';
import { DialogActions, IconGlyph } from '@/components/ui';
import {
  ModalTemplateCard,
  ModalTemplateMetric,
  ModalTemplateMetricList,
  ModalTemplateNote,
  ModalTemplateSection,
  ModalTemplateSectionHeader,
  ModalTemplateSide,
  ModalTemplateSummary,
} from '../../components/modals/ModalTemplates';

type Props = {
  phoneId: React.ReactNode;
  model: React.ReactNode;
  spec?: React.ReactNode;
  imei?: React.ReactNode;
  status?: React.ReactNode;
  purchasePrice?: React.ReactNode;
  purchaseDate?: React.ReactNode;
  notes?: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  submitDisabled?: boolean;
};

const PhoneDeleteConfirmContent: React.FC<Props> = ({
  phoneId,
  model,
  spec,
  imei,
  status,
  purchasePrice,
  purchaseDate,
  notes,
  onCancel,
  onConfirm,
  isSubmitting = false,
  submitDisabled = false,
}) => {
  const hasNotes = Boolean(String(notes || '').trim());

  return (
    <div
      className="modal-template-form modal-template-form--split mobile-phone-delete-confirm"
      data-ui-mobile-phone-delete-confirm="true"
      dir="rtl"
    >
      <ModalTemplateSide>
        <ModalTemplateSummary
          title={model || 'گوشی انتخاب‌شده'}
          subtitle="قبل از حذف، شناسنامه دستگاه و اثر این عملیات را یک بار دیگر بازبینی کنید."
          icon={<i className="fa-solid fa-mobile-screen-button" />}
          note="این عملیات رکورد دستگاه را از انبار حذف می‌کند و بازیابی خودکار برای آن وجود ندارد."
          noteIcon={<i className="fa-solid fa-shield-exclamation" />}
          className="mobile-phone-delete-confirm__summary"
        >
          <span className="modal-template-eyebrow">
            <i className="fa-solid fa-trash-can" aria-hidden="true" />
            حذف از انبار گوشی
          </span>
          <ModalTemplateMetricList>
            <ModalTemplateMetric
              icon={<i className="fa-solid fa-hashtag" />}
              label="شناسه رکورد"
              value={`#${phoneId}`}
            />
            <ModalTemplateMetric
              icon={<i className="fa-solid fa-circle-info" />}
              label="وضعیت فعلی"
              value={status || 'نامشخص'}
            />
            <ModalTemplateMetric
              icon={<i className="fa-solid fa-money-bill-wave" />}
              label="قیمت خرید"
              value={purchasePrice || 'ثبت نشده'}
            />
            <ModalTemplateMetric
              icon={<i className="fa-solid fa-calendar-days" />}
              label="تاریخ خرید"
              value={purchaseDate || 'ثبت نشده'}
            />
          </ModalTemplateMetricList>
        </ModalTemplateSummary>
      </ModalTemplateSide>

      <div className="modal-template-main">
        <ModalTemplateSection className="modal-template-section--stack">
          <div className="rounded-[24px] border border-rose-200 bg-rose-50/85 p-4 text-right shadow-[0_18px_42px_-34px_rgba(225,29,72,0.28)] dark:border-rose-900/45 dark:bg-rose-950/20 dark:shadow-none">
            <div className="flex items-start gap-3">
              <IconGlyph size="md" tone="danger" className="mt-0.5" aria-hidden="true">
                <i className="fa-solid fa-triangle-exclamation" />
              </IconGlyph>
              <div className="min-w-0">
                <strong className="block text-sm font-black text-rose-800 dark:text-rose-100">آیا از حذف این گوشی مطمئن هستی؟</strong>
                <p className="mt-1.5 text-xs font-medium leading-6 text-rose-700 dark:text-rose-200/90">
                  با تأیید این عملیات، رکورد این دستگاه از انبار حذف می‌شود و در صورت نیاز باید دوباره به‌صورت دستی ثبت شود.
                </p>
              </div>
            </div>
          </div>
        </ModalTemplateSection>

        <section className="modal-template-section modal-template-section--grid">
          <ModalTemplateCard>
            <ModalTemplateSectionHeader
              title="اطلاعات گوشی"
              subtitle="جزئیات اصلی دستگاهی که قرار است حذف شود"
              icon={<i className="fa-solid fa-mobile-screen-button" />}
              tone="info"
            />
            <div className="mt-4 space-y-3">
              <div>
                <div className="text-[11px] font-black tracking-[0.12em] text-slate-500 dark:text-slate-400">مدل دستگاه</div>
                <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">{model || 'گوشی انتخاب‌شده'}</div>
                {spec ? <div className="mt-1 text-xs font-semibold text-slate-500 dark:text-slate-400">{spec}</div> : null}
              </div>
              <ModalTemplateMetricList>
                <ModalTemplateMetric
                  icon={<i className="fa-solid fa-fingerprint" />}
                  label="IMEI"
                  value={imei || '-'}
                  valueDir="ltr"
                />
                <ModalTemplateMetric
                  icon={<i className="fa-solid fa-signal" />}
                  label="وضعیت"
                  value={status || 'نامشخص'}
                />
              </ModalTemplateMetricList>
            </div>
          </ModalTemplateCard>

          <div className="rounded-[22px] border border-amber-200 bg-amber-50/90 p-5 dark:border-amber-900/60 dark:bg-amber-950/25">
            <ModalTemplateSectionHeader
              title="قبل از حذف بررسی کن"
              subtitle="این حذف باید فقط برای رکوردهای اشتباه یا غیرقابل استفاده انجام شود"
              icon={<i className="fa-solid fa-list-check" />}
              tone="warning"
            />
            <ul className="mt-4 space-y-3 text-xs font-medium leading-7 text-amber-900/85 dark:text-amber-100/90">
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check mt-1 text-[11px]" aria-hidden="true" />
                <span>اگر فقط می‌خواهی این دستگاه از مسیر فروش خارج شود، بهتر است ابتدا وضعیت آن را بررسی یا ویرایش کنی.</span>
              </li>
              <li className="flex items-start gap-2">
                <i className="fa-solid fa-check mt-1 text-[11px]" aria-hidden="true" />
                <span>حذف این رکورد زمانی مناسب است که ثبت دستگاه اشتباه بوده یا دیگر نباید در انبار دیده شود.</span>
              </li>
            </ul>
          </div>
        </section>

        {hasNotes ? (
          <ModalTemplateNote icon={<i className="fa-solid fa-note-sticky text-amber-600 dark:text-amber-300" />}>
            یادداشت ثبت‌شده برای این دستگاه:
            <strong className="mr-1 text-slate-800 dark:text-slate-100">{notes}</strong>
          </ModalTemplateNote>
        ) : null}

        <DialogActions
          onCancel={onCancel}
          onSubmitClick={onConfirm}
          submitType="button"
          cancelText="انصراف و بازگشت"
          submitText="حذف قطعی این گوشی"
          submittingText="در حال حذف این گوشی..."
          isSubmitting={isSubmitting}
          submitDisabled={submitDisabled}
          submitVariant="danger"
          submitIconClass="fa-solid fa-trash-can"
          cancelIconClass="fa-solid fa-arrow-right"
        />
      </div>
    </div>
  );
};

export default PhoneDeleteConfirmContent;
