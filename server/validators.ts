/*
 * Basic input validators for API payloads. While the original requirement
 * requested using Zod, the library is not available in this environment.
 * Instead we implement lightweight validators that check the presence and
 * types of essential fields. These functions return an array of error messages;
 * if the array is empty the payload is considered valid.
 */

import moment from 'jalali-moment';
import { fromShamsiStringToISO } from './db/date';
import type { InstallmentSalePayload } from '../types';

/**
 * Validate a sales order payload. It must contain an array of items, each
 * specifying itemId, itemType, quantity and unitPrice. Optional fields such
 * as discountPerItem and notes are allowed. The customerId may be null.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === 'object' && value !== null && !Array.isArray(value);

export function validateSalesOrderPayload(payload: unknown): string[] {
  const errors: string[] = [];
  if (!isRecord(payload)) {
    errors.push('درخواست نامعتبر است.');
    return errors;
  }

  const items = payload.items;
  const paymentMethod = payload.paymentMethod;
  const customerId = payload.customerId;

  if (
    paymentMethod === 'credit' &&
    (!Number(customerId) || Number(customerId) <= 0)
  ) {
    errors.push('برای فروش اعتباری انتخاب مشتری الزامی است.');
  }
  if (!Array.isArray(items) || items.length === 0) {
    errors.push('سبد خرید نمی‌تواند خالی باشد.');
  }
  if (
    paymentMethod !== 'cash' &&
    paymentMethod !== 'credit' &&
    paymentMethod !== 'installment'
  ) {
    errors.push('روش پرداخت نامعتبر است.');
  }
  if (Array.isArray(items)) {
    items.forEach((item: unknown, idx: number) => {
      if (!isRecord(item)) {
        errors.push(`آیتم ${idx + 1} نامعتبر است.`);
        return;
      }
      if (typeof item.itemId !== 'number' || Number.isNaN(item.itemId)) {
        errors.push(`شناسه کالا/خدمت در آیتم ${idx + 1} نامعتبر است.`);
      }
      if (!['phone', 'inventory', 'service'].includes(String(item.itemType))) {
        errors.push(`نوع کالا/خدمت در آیتم ${idx + 1} نامعتبر است.`);
      }
      if (typeof item.quantity !== 'number' || item.quantity <= 0) {
        errors.push(`تعداد در آیتم ${idx + 1} باید عددی مثبت باشد.`);
      }
      if (typeof item.unitPrice !== 'number' || item.unitPrice < 0) {
        errors.push(`قیمت واحد در آیتم ${idx + 1} نامعتبر است.`);
      }
      if (
        item.discountPerItem != null &&
        (typeof item.discountPerItem !== 'number' || item.discountPerItem < 0)
      ) {
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
  const normalizeIdentityDigits = (value: unknown) => String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/\D/g, '');
  if (!payload || typeof payload !== 'object') {
    errors.push('درخواست نامعتبر است.');
    return errors;
  }
  const p = payload as InstallmentSalePayload;
  if (typeof p.customerId !== 'number' || Number.isNaN(p.customerId)) {
    errors.push('مشتری نامعتبر است.');
  }
  const buyerNationalCode = normalizeIdentityDigits((payload as any).buyerNationalCode);
  if ((payload as any).buyerNationalCode && buyerNationalCode.length !== 10) {
    errors.push('کد ملی خریدار باید دقیقاً ۱۰ رقم باشد.');
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
  if (
    typeof p.actualSalePrice === 'number' &&
    typeof p.downPayment === 'number' &&
    p.downPayment > p.actualSalePrice
  ) {
    errors.push('پیش پرداخت نمی‌تواند بیشتر از مبلغ کل قرارداد باشد.');
  }
  const saleType: 'installment' | 'check' = (payload as any).saleType === 'check' ? 'check' : 'installment';
  const parseJalaliContractDate = (value: unknown) => {
    const raw = String(value ?? '').trim();
    const iso = fromShamsiStringToISO(raw);
    if (!iso) return null;
    const parsed = moment(iso, 'YYYY-MM-DD', true);
    return parsed?.isValid?.() ? parsed : null;
  };
  const saleDateMoment = parseJalaliContractDate((p as any).saleDate || p.installmentsStartDate);
  const installmentsStartMoment = parseJalaliContractDate(p.installmentsStartDate);
  if (!saleDateMoment) errors.push('تاریخ فروش نامعتبر است.');
  if (!installmentsStartMoment) errors.push('تاریخ شروع اقساط نامعتبر است.');
  if (saleDateMoment?.clone().startOf('day').isAfter(moment().startOf('day'))) {
    errors.push('تاریخ فروش نمی‌تواند در آینده باشد.');
  }
  if (
    saleType === 'installment' &&
    saleDateMoment &&
    installmentsStartMoment &&
    installmentsStartMoment.clone().startOf('day').isBefore(saleDateMoment.clone().startOf('day'))
  ) {
    errors.push('تاریخ شروع اقساط نمی‌تواند قبل از تاریخ فروش باشد.');
  }
  if (saleType === 'installment') {
    if (typeof p.numberOfInstallments !== 'number' || p.numberOfInstallments <= 0 || !Number.isInteger(p.numberOfInstallments)) {
      errors.push('تعداد اقساط باید عدد صحیح مثبت باشد.');
    }
    if (typeof p.installmentAmount !== 'number' || p.installmentAmount <= 0) {
      errors.push('مبلغ هر قسط باید عددی مثبت باشد.');
    }
    if (
      typeof p.actualSalePrice === 'number' &&
      typeof p.downPayment === 'number' &&
      typeof p.numberOfInstallments === 'number' &&
      typeof p.installmentAmount === 'number' &&
      p.numberOfInstallments > 0 &&
      p.installmentAmount > 0
    ) {
      const remainingDebt = Math.max(0, p.actualSalePrice - p.downPayment);
      const scheduledTotal = p.numberOfInstallments * p.installmentAmount;
      const dynamicTolerance = Math.max(
        200000,
        Math.ceil((remainingDebt * 0.01) / 100000) * 100000,
      );
      if (Math.abs(scheduledTotal - remainingDebt) > dynamicTolerance) {
        errors.push('مجموع برنامه اقساط با مانده قرارداد هم‌خوان نیست.');
      } else {
        const adjustedLastInstallment = remainingDebt - (p.installmentAmount * Math.max(0, p.numberOfInstallments - 1));
        if (!Number.isFinite(adjustedLastInstallment) || adjustedLastInstallment <= 0) {
          errors.push('مبلغ قسط با تعداد اقساط انتخاب‌شده سازگار نیست.');
        }
      }
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
    const seenCheckNumbers = new Set<string>();
    checks.forEach((chk: any, idx: number) => {
      if (!chk || typeof chk !== 'object') {
        errors.push(`چک شماره ${idx + 1} نامعتبر است.`);
        return;
      }
      if (typeof chk.checkNumber !== 'string' || !chk.checkNumber.trim()) {
        errors.push(`شماره چک در چک شماره ${idx + 1} الزامی است.`);
      } else {
        const normalizedCheckNumber = chk.checkNumber.trim();
        if (seenCheckNumbers.has(normalizedCheckNumber)) {
          errors.push(`شماره چک «${normalizedCheckNumber}» تکراری است.`);
        }
        seenCheckNumbers.add(normalizedCheckNumber);
      }
      if (typeof chk.bankName !== 'string' || !chk.bankName.trim()) {
        errors.push(`نام بانک در چک شماره ${idx + 1} الزامی است.`);
      }
      if (!['buyer', 'third_party'].includes(String(chk.ownershipType || '').trim())) {
        errors.push(`مالک چک شماره ${idx + 1} باید خریدار یا شخص ثالث باشد.`);
      }
      if (chk.issuerNationalCode && normalizeIdentityDigits(chk.issuerNationalCode).length !== 10) {
        errors.push(`کد ملی صادرکننده در چک شماره ${idx + 1} باید دقیقاً ۱۰ رقم باشد.`);
      }
      const issuerNationalCode = normalizeIdentityDigits(chk.issuerNationalCode);
      if (chk.ownershipType === 'buyer' && issuerNationalCode && issuerNationalCode !== buyerNationalCode) {
        errors.push(`کد ملی صادرکننده چک شماره ${idx + 1} با کد ملی خریدار یکسان نیست.`);
      }
      if (chk.ownershipType === 'third_party' && issuerNationalCode && issuerNationalCode === buyerNationalCode) {
        errors.push(`چک شماره ${idx + 1} متعلق به خریدار است و نباید شخص ثالث انتخاب شود.`);
      }
      if (chk.sayadiId && normalizeIdentityDigits(chk.sayadiId).length !== 16) {
        errors.push(`شناسه صیادی در چک شماره ${idx + 1} باید دقیقاً ۱۶ رقم باشد.`);
      }
      if (typeof chk.dueDate !== 'string' || !chk.dueDate.trim()) {
        errors.push(`تاریخ سررسید در چک شماره ${idx + 1} الزامی است.`);
      } else {
        const checkDueMoment = parseJalaliContractDate(chk.dueDate);
        if (!checkDueMoment) {
          errors.push(`تاریخ سررسید در چک شماره ${idx + 1} نامعتبر است.`);
        } else if (saleDateMoment && checkDueMoment.clone().startOf('day').isBefore(saleDateMoment.clone().startOf('day'))) {
          errors.push(`تاریخ سررسید چک شماره ${idx + 1} نمی‌تواند قبل از تاریخ فروش باشد.`);
        }
      }
      if (typeof chk.amount !== 'number' || chk.amount <= 0) {
        errors.push(`مبلغ چک در چک شماره ${idx + 1} نامعتبر است.`);
      }
    });
  }

  if (
    saleType === 'check' &&
    Array.isArray(checks) &&
    checks.length === 0 &&
    typeof p.actualSalePrice === 'number' &&
    typeof p.downPayment === 'number' &&
    p.actualSalePrice - p.downPayment > 0
  ) {
    errors.push('در فروش چکی با مانده بدهی، حداقل یک چک باید ثبت شود.');
  }
  if (
    saleType === 'check' &&
    Array.isArray(checks) &&
    checks.length > 0 &&
    typeof p.actualSalePrice === 'number' &&
    typeof p.downPayment === 'number'
  ) {
    const remainingDebt = Math.max(0, p.actualSalePrice - p.downPayment);
    const checkTotal = checks.reduce((sum: number, check: any) => sum + Number(check?.amount || 0), 0);
    if (Math.abs(checkTotal - remainingDebt) > 0.00001) {
      errors.push('جمع مبلغ چک‌ها باید دقیقاً با مانده قرارداد برابر باشد.');
    }
  }
  return errors;
}
