/*
 * Basic input validators for API payloads. While the original requirement
 * requested using Zod, the library is not available in this environment.
 * Instead we implement lightweight validators that check the presence and
 * types of essential fields. These functions return an array of error messages;
 * if the array is empty the payload is considered valid.
 */

import type { SalesOrderPayload, CartItem, InstallmentSalePayload } from '../types';

/**
 * Validate a sales order payload. It must contain an array of items, each
 * specifying itemId, itemType, quantity and unitPrice. Optional fields such
 * as discountPerItem and notes are allowed. The customerId may be null.
 */
export function validateSalesOrderPayload(payload: any): string[] {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('درخواست نامعتبر است.');
    return errors;
  }
  const { items, paymentMethod } = payload as SalesOrderPayload;
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('سبد خرید نمی‌تواند خالی باشد.');
  }
  if (paymentMethod !== 'cash' && paymentMethod !== 'credit' && paymentMethod !== 'installment') {
    errors.push('روش پرداخت نامعتبر است.');
  }
  if (Array.isArray(items)) {
    items.forEach((it: any, idx: number) => {
      if (!it || typeof it !== 'object') {
        errors.push(`آیتم ${idx + 1} نامعتبر است.`);
        return;
      }
      if (typeof it.itemId !== 'number' || Number.isNaN(it.itemId)) {
        errors.push(`شناسه کالا/خدمت در آیتم ${idx + 1} نامعتبر است.`);
      }
      if (!['phone', 'inventory', 'service'].includes(String(it.itemType))) {
        errors.push(`نوع کالا/خدمت در آیتم ${idx + 1} نامعتبر است.`);
      }
      if (typeof it.quantity !== 'number' || it.quantity <= 0) {
        errors.push(`تعداد در آیتم ${idx + 1} باید عددی مثبت باشد.`);
      }
      if (typeof it.unitPrice !== 'number' || it.unitPrice < 0) {
        errors.push(`قیمت واحد در آیتم ${idx + 1} نامعتبر است.`);
      }
      if (it.discountPerItem != null && (typeof it.discountPerItem !== 'number' || it.discountPerItem < 0)) {
        errors.push(`تخفیف در آیتم ${idx + 1} نامعتبر است.`);
      }
    });
  }
  return errors;
}

/**
 * Validate an installment sale payload. Fields must be numbers and present.
 */
export function validateInstallmentSalePayload(payload: any): string[] {
  const errors: string[] = [];
  if (!payload || typeof payload !== 'object') {
    errors.push('درخواست نامعتبر است.');
    return errors;
  }
  const p = payload as InstallmentSalePayload;
  if (typeof p.customerId !== 'number' || Number.isNaN(p.customerId)) {
    errors.push('مشتری نامعتبر است.');
  }
  // در نسخه جدید: فروش اقساطی می‌تواند شامل خدمات/لوازم بدون گوشی هم باشد.
  // phoneId می‌تواند NULL باشد؛ اما باید حداقل یک قلم (موبایل/لوازم/خدمات) وجود داشته باشد.
  const phoneIdProvided = p.phoneId !== undefined && p.phoneId !== null;
  if (phoneIdProvided && (typeof p.phoneId !== 'number' || !Number.isInteger(p.phoneId) || p.phoneId <= 0)) {
    errors.push('شناسه موبایل نامعتبر است.');
  }
  const phonesArr = Array.isArray((payload as any).phones) ? (payload as any).phones : [];
  const accessoriesArr = Array.isArray((payload as any).accessories) ? (payload as any).accessories : [];
  const servicesArr = Array.isArray((payload as any).services) ? (payload as any).services : [];
  const hasAnyItems = Boolean(phoneIdProvided) || phonesArr.length > 0 || accessoriesArr.length > 0 || servicesArr.length > 0;
  if (!hasAnyItems) {
    errors.push('حداقل یک قلم (موبایل/لوازم/خدمات) برای فروش اقساطی الزامی است.');
  }
  if (typeof p.actualSalePrice !== 'number' || p.actualSalePrice <= 0) {
    errors.push('قیمت فروش نهایی باید عددی مثبت باشد.');
  }
  if (typeof p.downPayment !== 'number' || p.downPayment < 0) {
    errors.push('پیش پرداخت باید عددی غیرمنفی باشد.');
  }
  const saleType: 'installment' | 'check' = (payload as any).saleType === 'check' ? 'check' : 'installment';
  if (saleType === 'installment') {
    if (typeof p.numberOfInstallments !== 'number' || p.numberOfInstallments <= 0 || !Number.isInteger(p.numberOfInstallments)) {
      errors.push('تعداد اقساط باید عدد صحیح مثبت باشد.');
    }
    if (typeof p.installmentAmount !== 'number' || p.installmentAmount <= 0) {
      errors.push('مبلغ هر قسط باید عددی مثبت باشد.');
    }
  } else {
    // فروش چکی: تعداد اقساط و مبلغ قسط می‌تواند صفر باشد؛ اما چک‌ها باید حداقل یکی باشد
    if (typeof p.numberOfInstallments !== 'number' || p.numberOfInstallments < 0 || !Number.isInteger(p.numberOfInstallments)) {
      errors.push('تعداد اقساط نامعتبر است.');
    }
    if (typeof p.installmentAmount !== 'number' || p.installmentAmount < 0) {
      errors.push('مبلغ هر قسط نامعتبر است.');
    }
  }

  // Validate checks array
  const checks = Array.isArray((payload as any).checks) ? (payload as any).checks : null;
  if (!Array.isArray(checks)) {
    errors.push('لیست چک‌ها نامعتبر است.');
  } else {
    checks.forEach((chk: any, idx: number) => {
      if (!chk || typeof chk !== 'object') {
        errors.push(`چک شماره ${idx + 1} نامعتبر است.`);
        return;
      }
      if (typeof chk.checkNumber !== 'string' || !chk.checkNumber.trim()) {
        errors.push(`شماره چک در چک شماره ${idx + 1} الزامی است.`);
      }
      if (typeof chk.bankName !== 'string' || !chk.bankName.trim()) {
        errors.push(`نام بانک در چک شماره ${idx + 1} الزامی است.`);
      }
      if (typeof chk.dueDate !== 'string' || !chk.dueDate.trim()) {
        errors.push(`تاریخ سررسید در چک شماره ${idx + 1} الزامی است.`);
      }
      if (typeof chk.amount !== 'number' || chk.amount <= 0) {
        errors.push(`مبلغ چک در چک شماره ${idx + 1} نامعتبر است.`);
      }
    });
  }

  if (saleType === 'check' && Array.isArray(checks) && checks.length === 0) {
    errors.push('در فروش چکی، حداقل یک چک باید ثبت شود.');
  }
  return errors;
}