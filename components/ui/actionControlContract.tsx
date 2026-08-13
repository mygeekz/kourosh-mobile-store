import React from 'react';

export type ActionControlVariant = 'primary' | 'success' | 'secondary' | 'danger' | 'warning' | 'ghost' | 'neutral';
export type ActionControlSize = 'xs' | 'sm' | 'md' | 'lg' | 'icon' | 'tableIcon';

export const actionControlVariantClassMap: Record<ActionControlVariant, string> = {
  primary: 'ux-btn-primary',
  success: 'ux-btn-success',
  secondary: 'ux-btn-secondary',
  danger: 'ux-btn-danger',
  warning: 'ux-btn-warning',
  ghost: 'ux-btn-ghost',
  neutral: 'ux-btn-neutral',
};

export const actionControlSizeClassMap: Record<ActionControlSize, string> = {
  xs: 'ux-btn-xs',
  sm: 'ux-btn-sm',
  md: 'ux-btn-md',
  lg: 'ux-btn-lg',
  icon: 'ux-btn-xs',
  tableIcon: 'ux-btn-table-icon',
};

export const normalizeActionControlIcon = (icon: React.ReactNode): React.ReactNode => {
  if (typeof icon !== 'string') return icon;
  const trimmed = icon.trim();
  if (!trimmed) return null;
  const looksLikeFaClass = /^(fa|fa-solid|fa-regular|fa-brands|fas|far|fab|fal|fad)\b/.test(trimmed)
    || /^fa-[a-z0-9-]+$/i.test(trimmed);
  return <i className={looksLikeFaClass ? trimmed : 'fa-solid fa-circle-dot'} aria-hidden="true" />;
};

export const inferActionControlIcon = (label: string): React.ReactNode => {
  const normalized = String(label || '').trim();
  if (!normalized) return null;
  if (/(حذف مورد|پاک|trash|delete)/i.test(normalized)) return <i className="fa-solid fa-trash" aria-hidden="true" />;
  if (/(ویرایش اطلاعات|اصلاح|edit)/i.test(normalized)) return <i className="fa-solid fa-pen-to-square" aria-hidden="true" />;
  if (/(بستن|انصراف|بازگشت|close|cancel)/i.test(normalized)) return <i className="fa-solid fa-xmark" aria-hidden="true" />;
  if (/(دانلود|download|نصب|install)/i.test(normalized)) return <i className="fa-solid fa-download" aria-hidden="true" />;
  if (/(بروزرسانی|به\s?روزرسانی|refresh|reload|sync)/i.test(normalized)) return <i className="fa-solid fa-rotate" aria-hidden="true" />;
  if (/(جستجو|فیلتر|search)/i.test(normalized)) return <i className="fa-solid fa-sliders" aria-hidden="true" />;
  if (/(چاپ|pdf|print)/i.test(normalized)) return <i className="fa-solid fa-print" aria-hidden="true" />;
  if (/(مشاهده|جزئیات|نمایش|view)/i.test(normalized)) return <i className="fa-solid fa-eye" aria-hidden="true" />;
  if (/(پرداخت|ثبت قسط|وصول)/i.test(normalized)) return <i className="fa-solid fa-hand-holding-dollar" aria-hidden="true" />;
  if (/(ارسال|بررسی و ادامه|همگام|send|run|check)/i.test(normalized)) return <i className="fa-solid fa-bolt" aria-hidden="true" />;
  if (/(ثبت اطلاعات|ذخیره تغییرات|ایجاد|افزودن مورد جدید|جدید|submit|save|create|add)/i.test(normalized)) return <i className="fa-solid fa-plus" aria-hidden="true" />;
  return null;
};
