import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const page = read('pages/Partners.tsx');
const list = read('components/people/PartnerDirectoryList.tsx');
const partnerCss = read('styles/pages/partners.css');

const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });
const has = (text, needle) => text.includes(needle);

const retiredContracts = [
  'partners-page-shell',
  'partners-shell',
  'partners-table-shell',
  'partners-table--people',
  'partners-table-head',
  'partners-table-row',
  'partners-row-avatar',
  'partners-mobile-card',
  'partners-mobile-actions',
  'partners-action-btn',
  'partner-balance-chip',
  'partner-col-name',
  'partner-col-type',
  'partner-col-phone',
  'partner-col-balance',
  'partner-col-actions',
  'people-mobile-card__',
  'customers-directory-v73__pagination',
];

check('Partner directory list is extracted into a focused component', has(page, "import PartnerDirectoryList from '../components/people/PartnerDirectoryList'") && has(page, '<PartnerDirectoryList'));
check('Partner directory list uses standard DataTableShell', has(list, '<DataTableShell'));
check('Partner directory mobile cards use standard Surface primitive', has(list, '<Surface'));
check('Partner directory uses standard TableActionGroup actions', has(list, '<TableActionGroup'));
check('Partner directory pagination uses standard SelectField and Button primitives', has(list, '<SelectField') && has(list, '<Button'));
check('Partner directory component imports no CSS', !/import\s+['"][^'"]+\.css['"]/.test(list));
check('Partner page no longer references retired directory custom CSS contracts', retiredContracts.every((name) => !has(page, name)));
check('Partner list component no longer references retired directory custom CSS contracts', retiredContracts.every((name) => !has(list, name)));
check('Active partner page stylesheet no longer owns retired directory selectors', retiredContracts.filter((name) => !name.includes('__') && !name.includes('partner-col-')).every((name) => !has(partnerCss, `.${name}`)));
check('Desktop table uses customer-style four-column information architecture', ['همکار و ارتباط', 'حساب و همکاری', 'تأمین و فعالیت', 'عملیات'].every((label) => has(list, label)));
check('Desktop/tablet breakpoint avoids compressed table layout', has(list, '@container min-w-0') && has(list, 'hidden min-w-0 @[900px]:block') && has(list, '@[900px]:hidden'));
check('Mobile partner view is utility-only and responsive', has(list, 'grid min-w-0 gap-3 p-3 @[520px]:p-4 @[900px]:hidden') && has(list, '@[520px]:grid-cols-2'));
check('Partner row keeps phone and address context', has(list, 'partner.phoneNumber') && has(list, 'partner.address'));
check('Partner row keeps cooperation type and contact person', has(list, 'getPartnerTypeLabel') && has(list, 'partner.contactPerson'));
check('Partner row keeps supply operational context', has(list, 'partner.totalPhonesSupplied') && has(list, 'partner.unsoldPhonesCount') && has(list, 'partner.openInstallmentSalesCount'));
check('Balance remains semantic without bespoke CSS classes', has(list, 'بدهی به همکار') && has(list, 'طلب از همکار') && has(list, 'حساب تسویه است') && !has(list, 'getBalanceBadgeClass'));
check('High-balance follow-up state remains visible', has(list, '50_000_000') && has(list, 'نیازمند پیگیری'));
check('Partner list action routes are preserved', has(list, 'to: `/partners/${partner.id}`') && has(list, 'onSendReport(partner)') && has(list, 'onDelete(partner)'));
check('Delete action keeps Admin/Manager guard', has(list, "requiredRoles: ['Admin', 'Manager']"));
check('Server-side pagination contract is preserved by parent page', has(page, 'view: \'directory\'') && has(page, 'pageSize: String(targetPageSize)') && has(page, 'onPageChange={setPage}') && has(page, 'onPageSizeChange={setPageSize}'));
check('No partner list-specific CSS file was added', !fs.existsSync(path.join(root, 'styles/pages/partner-directory.css')) && !fs.existsSync(path.join(root, 'styles/system/partner-directory-v140.css')));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nPartner directory list v140 audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
