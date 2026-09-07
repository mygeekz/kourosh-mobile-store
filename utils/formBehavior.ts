import type { Dispatch, SetStateAction } from 'react';
import type { FormErrors } from '../components/FormErrorSummary';
import { focusFirstError } from './focusFirstError';

export const normalizeNumericInput = (value: unknown) =>
  String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)))
    .replace(/[,،\s]/g, '')
    .trim();

export const toSafeNumber = (value: unknown, fallback = 0) => {
  const normalized = normalizeNumericInput(value);
  if (!normalized) return fallback;
  const parsed = Number(normalized);
  return Number.isFinite(parsed) ? parsed : fallback;
};

export const hasErrors = (errors: FormErrors | Record<string, unknown>) =>
  Object.values(errors || {}).some(Boolean);

export const focusErrorsSoon = (errors: FormErrors, fieldIdMap?: Record<string, string>, delay = 40) => {
  if (!hasErrors(errors)) return;
  window.setTimeout(() => focusFirstError(errors, fieldIdMap), delay);
};

export const clearFieldError = <T extends Record<string, any>>(setErrors: Dispatch<SetStateAction<T>>, name: string, extraKeys: string[] = []) => {
  setErrors((prev) => {
    const next = { ...prev };
    delete next[name];
    extraKeys.forEach((key) => delete next[key]);
    return next;
  });
};

export const isDuplicateMessage = (message: string) =>
  /(تکراری|قبلا|قبلاً|duplicate|unique constraint|already exists)/i.test(message || '');
