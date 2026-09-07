import React from 'react';
import { Button, DialogActions, IconGlyph, Surface, type IconGlyphTone } from '@/components/ui';

type Tone = 'danger' | 'warning' | 'violet' | 'info' | 'success' | 'neutral';

type StatusKey = 'all' | 'debt' | 'credit' | 'settled' | 'debit' | 'recent' | 'today' | 'week' | 'month' | string;

export const getPeopleUiIconByTitle = (title: string = '') => {
  if (/تلگرام|Telegram/.test(title)) return 'fa-brands fa-telegram';
  if (/پیامک|SMS|OTP|پترن|الگو/.test(title)) return 'fa-solid fa-comment-dots';
  if (/پیش.?نمایش|نمای کامل|مشاهده/.test(title)) return 'fa-regular fa-eye';
  if (/بررسی و ادامه|ارسال/.test(title)) return 'fa-solid fa-paper-plane';
  if (/حذف|پاک/.test(title)) return 'fa-solid fa-trash-can';
  if (/ویرایش|تنظیم|قانون/.test(title)) return 'fa-solid fa-pen-to-square';
  if (/تراکنش|دریافت|پرداخت|دفتر|گردش/.test(title)) return 'fa-solid fa-money-bill-transfer';
  if (/مشتری/.test(title)) return 'fa-solid fa-user';
  if (/همکار|تامین|تأمین/.test(title)) return 'fa-solid fa-handshake';
  if (/جزئیات|جزییات|اطلاعات/.test(title)) return 'fa-solid fa-circle-info';
  if (/فیلتر|جستجو/.test(title)) return 'fa-solid fa-sliders';
  return 'fa-solid fa-sparkles';
};

export const getPeopleUiToneByTitle = (title: string = ''): Tone => {
  if (/حذف|پاک|مرجوعی/.test(title)) return 'danger';
  if (/ویرایش|تنظیم|قانون|جزئیات|جزییات|اطلاعات/.test(title)) return 'warning';
  if (/پیام|SMS|Telegram|تلگرام/.test(title)) return 'violet';
  if (/دریافت|پرداخت|تراکنش|دفتر|گردش/.test(title)) return 'success';
  return 'info';
};

export const getPeopleStatusIcon = (keyOrLabel: StatusKey) => {
  const value = String(keyOrLabel || '').toLowerCase();
  if (/all|همه/.test(value)) return 'fa-layer-group';
  if (/settled|تسویه|paid/.test(value)) return 'fa-circle-check';
  if (/credit|بستانکار|طلب/.test(value)) return 'fa-arrow-down';
  if (/debt|debit|بدهکار|بدهی/.test(value)) return 'fa-arrow-up';
  if (/recent|اخیر/.test(value)) return 'fa-clock-rotate-left';
  if (/today|امروز/.test(value)) return 'fa-calendar-day';
  if (/week|هفته|۷/.test(value)) return 'fa-calendar-week';
  if (/month|ماه/.test(value)) return 'fa-calendar-days';
  return 'fa-circle-dot';
};

const peopleToneToIconTone: Record<Tone, IconGlyphTone> = {
  danger: 'danger',
  warning: 'warning',
  violet: 'accent',
  info: 'info',
  success: 'success',
  neutral: 'neutral',
};

export const PeopleModalIcon: React.FC<{ title?: string; iconClass?: string; tone?: Tone }> = ({ title = '', iconClass, tone }) => {
  const resolvedTone = tone ?? getPeopleUiToneByTitle(title);
  const resolvedIcon = iconClass || getPeopleUiIconByTitle(title);
  return (
    <IconGlyph size="lg" tone={peopleToneToIconTone[resolvedTone]} aria-hidden="true">
      <i className={`${resolvedIcon} text-sm`} />
    </IconGlyph>
  );
};



type PeopleModalSummaryMetric = {
  icon: string;
  label: string;
  value: React.ReactNode;
  hint?: React.ReactNode;
};

export const PeopleModalSummaryCard: React.FC<{
  eyebrow: string;
  title: React.ReactNode;
  description: React.ReactNode;
  metrics?: PeopleModalSummaryMetric[];
  icon?: string;
}> = ({ eyebrow, title, description, metrics = [], icon = 'fa-address-card' }) => (
  <div className="modal-template-card modal-template-summary people-modal-summary-card">
    <span className="modal-template-eyebrow"><i className={`fa-solid ${icon}`} /> {eyebrow}</span>
    <div className="modal-template-title">{title}</div>
    <p className="modal-template-text">{description}</p>
    {metrics.length > 0 ? (
      <div className="modal-template-metric-list">
        {metrics.map((metric, index) => (
          <div className="modal-template-metric" key={`${metric.label}-${index}`}>
            <span className="modal-template-metric__icon"><i className={`fa-solid ${metric.icon}`} /></span>
            <div className="modal-template-metric__copy">
              <span>{metric.label}</span>
              <strong>{metric.value}</strong>
              {metric.hint ? <small>{metric.hint}</small> : null}
            </div>
          </div>
        ))}
      </div>
    ) : null}
  </div>
);

export const PeopleDeleteConfirmContent: React.FC<{
  entityLabel: string;
  name: string;
  identifier?: React.ReactNode;
  statusLabel?: React.ReactNode;
  warningTitle: string;
  warningText: React.ReactNode;
  onCancel: () => void;
  onConfirm: () => void;
  isSubmitting?: boolean;
  confirmText?: string;
  submittingText?: string;
}> = ({
  entityLabel,
  name,
  identifier,
  statusLabel,
  warningTitle,
  warningText,
  onCancel,
  onConfirm,
  isSubmitting = false,
  confirmText = 'بررسی و حذف',
  submittingText = 'در حال بررسی و حذف...',
}) => (
  <div className="modal-template-form modal-template-form--split modal-template-form--people-delete" data-ui-people-delete-confirm="true">
    <aside className="modal-template-side">
      <PeopleModalSummaryCard
        eyebrow={`حذف ${entityLabel}`}
        title={name}
        description="قبل از حذف، هویت پرونده و اثر این عملیات را بازبینی کنید."
        icon="fa-user-shield"
        metrics={[
          ...(identifier ? [{ icon: 'fa-hashtag', label: 'شناسه پرونده', value: identifier }] : []),
          ...(statusLabel ? [{ icon: 'fa-circle-info', label: 'وضعیت فعلی', value: statusLabel }] : []),
        ]}
      />
    </aside>
    <div className="modal-template-main">
      <div className="modal-template-section modal-template-section--stack">
        <div className="rounded-[22px] border border-rose-200 bg-rose-50/80 p-4 text-right dark:border-rose-900/45 dark:bg-rose-950/20">
          <div className="flex items-start gap-3">
            <IconGlyph size="md" tone="danger" className="shrink-0" aria-hidden="true"><i className="fa-solid fa-triangle-exclamation" /></IconGlyph>
            <div className="min-w-0">
              <strong className="block text-sm font-black text-rose-800 dark:text-rose-100">{warningTitle}</strong>
              <p className="mt-1.5 text-xs font-medium leading-6 text-rose-700 dark:text-rose-200/90">{warningText}</p>
            </div>
          </div>
        </div>
      </div>
      <DialogActions
        onCancel={onCancel}
        cancelText="انصراف"
        submitText={confirmText}
        submittingText={submittingText}
        isSubmitting={isSubmitting}
        submitDisabled={isSubmitting}
        submitVariant="danger"
        submitType="button"
        submitIconClass="fa-solid fa-trash"
        onSubmitClick={onConfirm}
      />
    </div>
  </div>
);

export const PeopleFilterButton: React.FC<{
  active?: boolean;
  label: string;
  icon?: string;
  onClick?: () => void;
  className?: string;
}> = ({ active, label, icon, onClick, className }) => (
  <Button
    type="button"
    onClick={onClick}
    variant={active ? 'primary' : 'secondary'}
    size="xs"
    className={['people-filter-chip people-filter-chip--unified', active ? 'is-active' : '', className || ''].join(' ')}
    leftIcon={<i className={`fa-solid ${icon || getPeopleStatusIcon(label)}`} aria-hidden="true" />}
  >
    {label}
  </Button>
);



type PeopleZeroStateProps = {
  entity: 'partner' | 'customer';
  title?: string;
  description?: string;
  primaryLabel: string;
  onPrimaryAction?: () => void;
  secondaryLabel?: string;
  onSecondaryAction?: () => void;
  searchTerm?: string;
  onClearSearch?: () => void;
};

export const PeopleZeroStateLanding: React.FC<PeopleZeroStateProps> = ({
  entity,
  title,
  description,
  primaryLabel,
  onPrimaryAction,
  secondaryLabel,
  onSecondaryAction,
  searchTerm,
  onClearSearch,
}) => {
  const isPartner = entity === 'partner';
  const resolvedTitle = title || (isPartner ? 'هنوز هیچ همکاری ثبت اطلاعات نشده' : 'هنوز هیچ مشتری ثبت اطلاعات نشده');
  const resolvedDescription = description || (isPartner
    ? 'برای شروع شبکه همکاران، اولین پرونده همکار را ثبت کنید تا خرید، مانده حساب، تسویه‌ها و پیگیری‌های بعدی در مسیر درست قرار بگیرد.'
    : 'برای شروع مدیریت اشخاص، اولین مشتری را ثبت کنید تا فروش، مانده حساب، اقساط و پیگیری‌های ارتباطی به‌صورت منظم در سیستم شکل بگیرد.');
  const features = isPartner
    ? [
        { icon: 'fa-handshake', title: 'پرونده همکاری', text: 'ثبت نام، نوع همکاری، رابط و راه‌های تماس در یک کارت تمیز و قابل پیگیری.' },
        { icon: 'fa-mobile-screen-button', title: 'خرید و تسویه گوشی', text: 'مدیریت گوشی‌های دریافتی، فروش‌شده، تسویه محصولی و مانده بر مبنای قیمت روز.' },
        { icon: 'fa-scale-balanced', title: 'دفتر و گزارش', text: 'ثبت دریافت/پرداخت، مانده حساب، گزارش تلگرام و نمای کامل پرونده همکار.' },
      ]
    : [
        { icon: 'fa-user-plus', title: 'پرونده مشتری', text: 'ثبت مشخصات پایه، شماره تماس، یادداشت و دسته‌بندی برای شروع سریع.' },
        { icon: 'fa-wallet', title: 'مانده و پیگیری', text: 'کنترل بدهی، بستانکاری، وضعیت تسویه و پرونده‌های نیازمند پیگیری.' },
        { icon: 'fa-comments', title: 'تعامل و فروش', text: 'آماده‌سازی مشتری برای فروش، اقساط، پیام‌ها و پیگیری‌های بعدی از یک نقطه.' },
      ];
  const steps = isPartner
    ? ['ثبت همکار', 'اتصال خرید/فروش', 'پیگیری مانده و تسویه']
    : ['ثبت مشتری', 'ثبت فروش/اقساط', 'پیگیری مانده و ارتباط'];
  const hasActiveSearch = Boolean(searchTerm && searchTerm.trim());
  const emptyModeLabel = hasActiveSearch ? 'نتیجه‌ای برای جستجوی فعلی نیست' : 'آماده شروع ثبت اطلاعات';
  const emptyModeIcon = hasActiveSearch ? 'fa-magnifying-glass-chart' : (isPartner ? 'fa-handshake-angle' : 'fa-user-plus');

  return (
    <section className="people-zero-state">
      <Surface surface="glass" variant="panel" scheme="adaptive" wrapContent={false} className="people-zero-state__hero">
        <div className="people-zero-state__hero-copy">
          <div className="people-zero-state__eyebrow">{isPartner ? 'مرکز همکاری‌ها' : 'مرکز مدیریت مشتریان'}</div>
          <div className="people-zero-state__title-row">
            <div className="people-zero-state__title-wrap">
              <h3 className="people-zero-state__title">{resolvedTitle}</h3>
              <p className="people-zero-state__description">{resolvedDescription}</p>
            </div>
            <IconGlyph size="lg" tone="accent" className="people-zero-state__hero-icon" aria-hidden="true">
              <i className={`fa-solid ${isPartner ? 'fa-handshake-angle' : 'fa-user-group'}`} />
            </IconGlyph>
          </div>

          <div className="people-zero-state__reason-card">
            <IconGlyph size="lg" tone="info" className="people-zero-state__reason-icon" aria-hidden="true">
              <i className={`fa-solid ${emptyModeIcon}`} />
            </IconGlyph>
            <div className="people-zero-state__reason-copy">
              <strong>{emptyModeLabel}</strong>
              <span>{hasActiveSearch ? `عبارت «${searchTerm}» در این نما پیدا نشد. فیلترها را پاک کن یا مورد جدید ثبت کن.` : 'با ثبت اولین پرونده، گزارش‌ها، مانده حساب و پیگیری‌ها از همین بخش قابل مدیریت می‌شوند.'}</span>
            </div>
          </div>

          <div className="people-zero-state__actions">
            <Button
              type="button"
              onClick={onPrimaryAction}
              variant="primary"
              className="people-zero-state__primary"
              leftIcon={<i className={`fa-solid ${hasActiveSearch ? 'fa-rotate-left' : isPartner ? 'fa-plus' : 'fa-user-plus'}`} />}
            >
              {primaryLabel}
            </Button>
            {secondaryLabel ? (
              <Button
                type="button"
                onClick={onSecondaryAction}
                variant="secondary"
                className="people-zero-state__secondary"
                leftIcon={<i className={`fa-solid ${isPartner ? 'fa-users' : 'fa-building'}`} />}
              >
                {secondaryLabel}
              </Button>
            ) : null}
            {searchTerm && onClearSearch ? (
              <Button
                type="button"
                onClick={onClearSearch}
                variant="ghost"
                className="people-zero-state__ghost"
                leftIcon={<i className="fa-solid fa-filter-circle-xmark" />}
              >
                پاک‌سازی فیلترها
              </Button>
            ) : null}
          </div>
        </div>

        <div className="people-zero-state__steps">
          {steps.map((step, index) => (
            <div key={step} className="people-zero-state__step">
              <span className="people-zero-state__step-index">{(index + 1).toLocaleString('fa-IR')}</span>
              <span className="people-zero-state__step-label">{step}</span>
            </div>
          ))}
        </div>
      </Surface>

      <div className="people-zero-state__grid">
        {features.map((item) => (
          <Surface key={item.title} surface="glass" variant="subtle" scheme="adaptive" wrapContent={false} className="people-zero-state__card">
            <IconGlyph size="lg" tone="accent" className="people-zero-state__card-icon" aria-hidden="true">
              <i className={`fa-solid ${item.icon}`} />
            </IconGlyph>
            <div className="people-zero-state__card-copy">
              <h4>{item.title}</h4>
              <p>{item.text}</p>
            </div>
          </Surface>
        ))}
      </div>
    </section>
  );
};
export const PeopleLedgerTimelineIndex: React.FC<{ index: number; total?: number }> = ({ index, total = 4 }) => (
  <div className="people-ledger-timeline-index" aria-label={`گردش شماره ${(index + 1).toLocaleString('fa-IR')}`}>
    <span className="people-ledger-timeline-index__number">{(index + 1).toLocaleString('fa-IR')}</span>
    {index < total - 1 ? <span className="people-ledger-timeline-index__line" /> : null}
  </div>
);

export default PeopleFilterButton;
