import React from 'react';
import Button from '../Button';
import { cn } from '../../utils/cn';

type EmptyStateTone = 'neutral' | 'info' | 'success' | 'warning' | 'violet';

type EmptyStateProps = {
  icon?: React.ReactNode;
  title?: string;
  description?: string;
  actionLabel?: string;
  onAction?: () => void;
  className?: string;
  tone?: EmptyStateTone;
};

type InferredEmptyState = {
  icon: string;
  description?: string;
  actionLabel?: string;
  tone: EmptyStateTone;
  chipLabel: string;
  helperChip: string;
};

const inferContent = (title: string, actionLabel?: string): InferredEmptyState => {
  const normalized = title || '';

  if (/مشتری/.test(normalized)) {
    return {
      icon: 'fa-regular fa-user',
      description: 'هنوز موردی برای نمایش وجود ندارد. با ثبت اطلاعات مشتری جدید، سوابق خرید، اقساط و پیگیری‌ها از همین‌جا در دسترس خواهند بود.',
      actionLabel: actionLabel || 'افزودن مورد جدید مشتری',
      tone: 'info',
      chipLabel: 'مشتری و پیگیری',
      helperChip: 'با ثبت اطلاعات اولین مشتری، این نما فعال می‌شود',
    };
  }

  if (/همکار|تامین|تأمین/.test(normalized)) {
    return {
      icon: 'fa-regular fa-handshake',
      description: 'این بخش هنوز داده‌ای ندارد. اولین همکار یا تامین‌کننده را ثبت اطلاعات کنید تا مدیریت ارتباطات و خریدها کامل شود.',
      actionLabel: actionLabel || 'افزودن مورد جدید',
      tone: 'violet',
      chipLabel: 'شبکه همکاری',
      helperChip: 'پس از اولین ثبت اطلاعات، همکاری‌ها و خریدها اینجا دیده می‌شوند',
    };
  }

  if (/فروش اقساطی|اقساط/.test(normalized)) {
    return {
      icon: 'fa-regular fa-credit-card',
      description: 'پس از ثبت اطلاعات اولین فروش اقساطی، وضعیت سررسیدها، پرداخت‌ها و یادآوری‌ها در این صفحه دیده می‌شود.',
      actionLabel: actionLabel || 'ثبت فروش اقساطی',
      tone: 'warning',
      chipLabel: 'سررسید و وصول',
      helperChip: 'اولین فروش اقساطی، پیگیری این بخش را فعال می‌کند',
    };
  }

  if (/کالا|محصول|انبار/.test(normalized)) {
    return {
      icon: 'fa-regular fa-box-open',
      description: 'برای شروع مدیریت حرفه‌ای انبار، اولین کالا را ثبت اطلاعات کنید تا موجودی، قیمت و دسته‌بندی‌ها در همین بخش قابل کنترل باشند.',
      actionLabel: actionLabel || 'افزودن مورد جدید کالا',
      tone: 'success',
      chipLabel: 'موجودی و کالا',
      helperChip: 'با ثبت اطلاعات اولین کالا، مدیریت موجودی اینجا کامل می‌شود',
    };
  }

  if (/تعمیر/.test(normalized)) {
    return {
      icon: 'fa-regular fa-screwdriver-wrench',
      description: 'هنوز سفارشی برای این بخش ثبت اطلاعات نشده است. با ایجاد اولین پذیرش تعمیر، روند وضعیت، هزینه و تحویل از همین‌جا مدیریت می‌شود.',
      actionLabel: actionLabel || 'ثبت اطلاعات پذیرش تعمیر',
      tone: 'violet',
      chipLabel: 'پذیرش و وضعیت',
      helperChip: 'اولین پرونده تعمیر، این نما را کامل می‌کند',
    };
  }

  if (/گزارش/.test(normalized)) {
    return {
      icon: 'fa-regular fa-chart-bar',
      description: 'برای این بازه یا فیلتر، داده‌ای پیدا نشد. فیلترها را بازبینی کنید یا بازه زمانی وسیع‌تری انتخاب کنید.',
      actionLabel: actionLabel,
      tone: 'info',
      chipLabel: 'گزارش و تحلیل',
      helperChip: 'با تغییر بازه یا فیلتر، این بخش دوباره پر می‌شود',
    };
  }

  return {
    icon: 'fa-regular fa-folder-open',
    description: 'در حال حاضر موردی برای نمایش وجود ندارد. با ثبت اطلاعات اولین داده، این بخش به‌صورت خودکار کامل خواهد شد.',
    actionLabel,
    tone: 'neutral',
    chipLabel: 'بدون داده',
    helperChip: 'پس از اولین ثبت اطلاعات، این نما کامل می‌شود',
  };
};


const renderFontAwesomeIcon = (iconClassName: string): React.ReactNode => (
  <i className={cn(iconClassName, 'text-2xl')} aria-hidden="true" />
);

const EmptyState: React.FC<EmptyStateProps> = ({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
  tone,
}) => {
  const resolvedTitle = title || 'داده‌ای برای نمایش وجود ندارد';
  const inferred = inferContent(resolvedTitle, actionLabel);
  const resolvedIcon = icon || inferred.icon;
  const resolvedDescription = description || inferred.description;
  const resolvedActionLabel = actionLabel || inferred.actionLabel;
  const resolvedTone = tone || inferred.tone;

  return (
    <div className={cn('empty-state-modern premium-no-result premium-empty-state-card', `premium-empty-state-card--${resolvedTone}`, className)} data-ui-surface="empty-state" data-ui-card="true" dir="rtl">
      <div className={cn('premium-empty-state-card__icon empty-state-modern__icon', `premium-empty-state-card__icon--${resolvedTone}`)}>
        {icon ? resolvedIcon : renderFontAwesomeIcon(inferred.icon)}
      </div>
      <div className="premium-empty-state-card__body">
        <div className="premium-empty-state-card__title">{resolvedTitle}</div>
        {resolvedDescription && <div className="premium-empty-state-card__description">{resolvedDescription}</div>}
      </div>

      <div className="empty-state-modern__chips">
        <span className={cn('empty-state-modern__chip', `empty-state-modern__chip--${resolvedTone}`)}><i className="fa-regular fa-folder-open text-[10px]" />{inferred.chipLabel}</span>
        <span className="empty-state-modern__chip"><i className="fa-solid fa-star text-[10px]" />{inferred.helperChip}</span>
      </div>

      {resolvedActionLabel && onAction && (
        <div className="mt-5 flex items-center justify-center premium-empty-state-card__footer">
          <Button onClick={onAction} variant="primary" size="sm" className="empty-state-modern__action" leftIcon={<i className="fa-solid fa-plus" />}>
            {resolvedActionLabel}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmptyState;
