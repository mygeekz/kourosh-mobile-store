import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const checks = [];
const check = (name, pass) => checks.push({ name, pass: Boolean(pass) });

const customers = read('pages/Customers.tsx');
const partners = read('pages/Partners.tsx');
const partnerList = read('components/people/PartnerDirectoryList.tsx');
const pageKit = read('components/ui/PageKit.tsx');
const purchaseHistory = read('pages/partnerDetail/PartnerPurchaseHistorySection.tsx');
const responsiveCss = read('styles/system/partner-detail-responsive-ledger-foundation.css');

for (const [label, source] of [['Customers', customers], ['Partners', partners]]) {
  check(`${label} keeps the controlled search value separate from the debounced query`, source.includes('searchTerm') && source.includes('debouncedSearchTerm'));
  check(`${label} performs later directory requests in background`, source.includes('fetchCustomers(hasLoadedDirectoryRef.current') || source.includes('fetchPartners(hasLoadedDirectoryRef.current'));
  check(`${label} ignores stale directory responses`, source.includes('directoryRequestIdRef') && source.includes('requestId !== directoryRequestIdRef.current'));
}

check('PageKit only substitutes the skeleton during the initial load', pageKit.includes('showInitialLoadingState') && pageKit.includes('hasPresentedContentRef'));
check('PageKit preserves mounted controls during background refresh', pageKit.includes('aria-busy={Boolean(isLoading)}') && pageKit.includes('{children}'));
check('Partner list uses the same canonical list shell as Customers', partnerList.includes('customers-directory-v73__list') && partnerList.includes('customers-directory-v73__table'));
check('Partner list keeps four customer-parity columns', ['همکار و ارتباط', 'حساب و همکاری', 'تأمین و فعالیت', 'عملیات'].every((label) => partnerList.includes(label)));
check('Purchase history cards opt into width-safe wrapping', purchaseHistory.includes('partner-purchase-history-event-card') && purchaseHistory.includes('[overflow-wrap:anywhere]'));
check('Purchase history CSS contains a defensive anywhere wrap rule', responsiveCss.includes('.partner-purchase-history-event-card :where(div, span, p)') && responsiveCss.includes('overflow-wrap: anywhere'));

const failed = checks.filter((item) => !item.pass);
for (const item of checks) console.log(`${item.pass ? 'PASS' : 'FAIL'}  ${item.name}`);
console.log(`\nKourosh v198 people directory/live search audit: ${checks.length - failed.length}/${checks.length} passed.`);
if (failed.length) process.exit(1);
