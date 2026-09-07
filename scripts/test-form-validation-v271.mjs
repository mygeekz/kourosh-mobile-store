#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  compactValidationErrors,
  nonNegativeNumberError,
  requiredSelectionError,
  requiredTextError,
} from '../components/ui/formValidation.ts';

const tests = [
  () => assert.equal(requiredTextError('   ', 'نام مشتری'), 'نام مشتری الزامی است.'),
  () => assert.equal(requiredTextError('کوروش', 'نام مشتری'), undefined),
  () => assert.equal(requiredSelectionError(null, 'مشتری'), 'مشتری را انتخاب کنید.'),
  () => assert.equal(requiredSelectionError(12, 'مشتری'), undefined),
  () => assert.equal(nonNegativeNumberError('۱,۲۰۰,۰۰۰', 'هزینه تخمینی', { optional: true }), undefined),
  () => assert.equal(nonNegativeNumberError('-۱', 'هزینه تخمینی', { optional: true }), 'هزینه تخمینی نمی‌تواند منفی باشد.'),
  () => assert.equal(nonNegativeNumberError('abc', 'هزینه تخمینی', { optional: true }), 'هزینه تخمینی باید عدد معتبر باشد.'),
  () => assert.deepEqual(compactValidationErrors({ a: 'خطا', b: undefined, c: null, d: false }), { a: 'خطا' }),
];

tests.forEach((test) => test());
console.log(JSON.stringify({ status: 'PASS', suite: 'form-validation-v271', passed: tests.length, total: tests.length }, null, 2));
