import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => { throw new Error(`[v216 installment check form audit] ${message}`); };
const expect = (source, token, label) => { if (!source.includes(token)) fail(`missing ${label}`); };
const reject = (source, token, label) => { if (source.includes(token)) fail(`unexpected ${label}`); };

if (!['v216', 'v217', 'v218', 'v219', 'v220', 'v221'].includes(read('KOUROSH_SOURCE_VERSION').trim())) fail('release marker must be v216 or a compatible successor');

const addForm = read('pages/AddInstallmentSalePage.tsx');
const detail = read('pages/InstallmentSaleDetailPage.tsx');
const db = read('server/db/domains/installments.db.ts');
const service = read('server/services/installments.service.ts');
const route = read('server/routes/installments.routes.ts');

expect(addForm, 'const validateCurrentCheck = () =>', 'field-level add-check validation');
expect(addForm, 'errors={checkFormErrors as FormErrors}', 'add-check error summary');
expect(addForm, 'چک اضافه نشد؛ ${Object.keys(errors).length} مورد', 'actionable add-check notification');
expect(addForm, '<div className="grid gap-3">', 'full-width amount and due-date stack');
expect(addForm, 'invalid={Boolean(checkFormErrors.dueDate)}', 'date invalid state');
reject(addForm, "submitDisabled={\n                !currentCheck.checkNumber.trim()", 'disabled submit validation trap');

expect(detail, 'errors={editCheckErrors as FormErrors}', 'edit-check error summary');
expect(detail, 'id="editCheckNumber"', 'editable check number');
expect(detail, 'id="editCheckBankName"', 'editable bank name');
expect(detail, 'id="editCheckDueDate"', 'editable due date');
expect(detail, 'مبلغ چک یک سند مالی تثبیت‌شده است', 'immutable amount explanation');
expect(detail, 'checkNumber,\n          bankName,\n          ownershipType:', 'complete edit payload');

expect(db, 'SET checkNumber = ?, bankName = ?, ownershipType = ?, issuerName = ?, issuerNationalCode = ?, sayadiId = ?, dueDate = ?', 'complete database update');
expect(db, 'این شماره چک قبلاً در سیستم ثبت شده است', 'server duplicate check guard');
expect(db, 'تاریخ سررسید چک نمی‌تواند قبل از تاریخ فروش باشد', 'server due-date guard');
expect(service, "if (!checkNumber) return { validationMessage: 'شماره چک الزامی است.' }", 'service check-number validation');
expect(route, 'dueDate: req.body?.dueDate', 'complete check route payload');

console.log('Installment check form v216 audit passed: compact date layout, actionable validation, complete legacy check editing, and server guards are wired.');
