import fs from 'node:fs';

const read = (file) => fs.readFileSync(file, 'utf8');
const fail = (message) => { throw new Error(`[v215 customer contract audit] ${message}`); };
const expect = (source, token, label) => { if (!source.includes(token)) fail(`missing ${label}`); };

if (read('KOUROSH_SOURCE_VERSION').trim() !== 'v215') fail('release marker must be v215');

const schema = read('server/db/schema/customers.schema.ts');
const service = read('server/services/customers.service.ts');
const mutation = read('server/repositories/customerMutations.repo.ts');
const reads = read('server/repositories/customerReads.repo.ts');
const customerModal = read('pages/customerDetail/CustomerProfileEditModal.tsx');
const customerController = read('pages/customerDetail/CustomerDetailController.tsx');
const createCustomer = read('pages/Customers.tsx');
const installmentDb = read('server/db/domains/installments.db.ts');
const installmentForm = read('pages/AddInstallmentSalePage.tsx');
const checkDetail = read('pages/InstallmentSaleDetailPage.tsx');
const contractPage = read('pages/InstallmentSaleContractPrintPage.tsx');

expect(schema, 'ADD COLUMN nationalCode TEXT', 'safe nationalCode migration');
expect(service, 'کد ملی مشتری باید دقیقاً ۱۰ رقم باشد', 'server national-code validation');
expect(mutation, 'INSERT INTO customers (fullName, nationalCode', 'customer identity persistence');
expect(reads, "COALESCE(c.nationalCode, '') LIKE ?", 'national-code search');
expect(createCustomer, 'name="nationalCode"', 'customer creation identity field');
expect(customerModal, 'id="editNationalCode"', 'customer profile identity field');
expect(customerController, "params.get('edit') !== 'contract'", 'direct contract-completion profile route');
expect(installmentDb, 'buyerNationalCode = CASE WHEN buyerNationalCode IS NULL', 'legacy empty-snapshot backfill');
expect(installmentDb, 'buyerNationalCode || customerSnapshot.nationalCode', 'new-sale profile fallback');
expect(installmentForm, "buyerNationalCode: String(customer.nationalCode || '')", 'sale-form profile prefill');
expect(checkDetail, 'name="issuerNationalCode"', 'legacy check issuer editor');
expect(checkDetail, 'name="sayadiId"', 'legacy check Sayad editor');
expect(contractPage, 'تکمیل پروفایل مشتری', 'actionable buyer completion');
expect(contractPage, 'تکمیل تنظیمات فروشگاه', 'actionable seller completion');
expect(contractPage, 'تکمیل مشخصات چک‌ها', 'actionable check completion');

console.log('Customer contract profile v215 audit passed: persistent customer identity, immutable snapshot fallback, actionable readiness routing, and legacy check identity editing are wired.');
