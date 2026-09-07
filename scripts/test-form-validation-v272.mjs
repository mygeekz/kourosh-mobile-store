#!/usr/bin/env node
import assert from 'node:assert/strict';
import {
  compactValidationErrors,
  emailAddressError,
  integerRangeError,
  matchingTextError,
  nonNegativeNumberError,
  phoneNumberError,
  positiveNumberError,
  requiredSelectionError,
  requiredTextError,
  textLengthError,
  urlAddressError,
} from '../components/ui/formValidation.ts';

const tests = [
  () => assert.equal(requiredTextError('   ', 'نام مشتری'), 'نام مشتری الزامی است.'),
  () => assert.equal(requiredSelectionError('', 'مشتری'), 'مشتری را انتخاب کنید.'),
  () => assert.equal(nonNegativeNumberError('-۱', 'هزینه', { optional: true }), 'هزینه نمی‌تواند منفی باشد.'),
  () => assert.equal(positiveNumberError('۰', 'تعداد', { integer: true }), 'تعداد باید عدد صحیح مثبت باشد.'),
  () => assert.equal(positiveNumberError('۲', 'تعداد', { integer: true }), undefined),
  () => assert.equal(integerRangeError('۳', 'روز', 1, 7), undefined),
  () => assert.equal(integerRangeError('۸', 'روز', 1, 7), 'روز باید عدد صحیح بین ۱ تا ۷ باشد.'),
  () => assert.equal(phoneNumberError('۰۹۱۲۱۲۳۴۵۶۷', { optional: false, label: 'شماره موبایل', minDigits: 11, maxDigits: 11 }), undefined),
  () => assert.equal(emailAddressError('bad-email', { optional: false, label: 'ایمیل' }), 'ایمیل نامعتبر است.'),
  () => assert.equal(urlAddressError('http://localhost:5173', { optional: false, label: 'آدرس', protocols: ['http:', 'https:'] }), undefined),
  () => assert.equal(textLengthError('12345', 'کلمه عبور', { min: 6, max: 128 }), 'کلمه عبور باید حداقل ۶ کاراکتر باشد.'),
  () => assert.equal(textLengthError('123456', 'کلمه عبور', { min: 6, max: 128 }), undefined),
  () => assert.equal(matchingTextError('abc', 'xyz', 'تکرار کلمه عبور'), 'تکرار کلمه عبور با مقدار اصلی یکسان نیست.'),
  () => assert.equal(matchingTextError('abc', 'abc', 'تکرار کلمه عبور'), undefined),
  () => assert.deepEqual(compactValidationErrors({ a: 'خطا', b: undefined, c: null, d: false }), { a: 'خطا' }),
];

tests.forEach((test) => test());
console.log(JSON.stringify({ status: 'PASS', suite: 'form-validation-v272', passed: tests.length, total: tests.length }, null, 2));
