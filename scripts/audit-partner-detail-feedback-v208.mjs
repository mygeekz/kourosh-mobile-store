import assert from 'node:assert/strict';
import fs from 'node:fs';

const read = (path) => fs.readFileSync(path, 'utf8');
const absent = (source, pattern, message) => assert.doesNotMatch(source, pattern, message);

const version = read('KOUROSH_SOURCE_VERSION').trim();
const risk = read('pages/partnerDetail/partnerRiskStatus.ts');
const header = read('pages/partnerDetail/PartnerDetailHeaderSection.tsx');
const capital = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const purchases = read('pages/partnerDetail/PartnerPurchaseHistorySection.tsx');
const telegram = read('pages/partnerDetail/PartnerTelegramConversationSection.tsx');
const ledger = read('pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx');
const controller = read('pages/partnerDetail/PartnerDetailController.tsx');

assert.equal(version, 'v208');

for (const tone of ['emerald', 'orange', 'rose']) assert.match(risk, new RegExp(`stroke-${tone}-500`));
assert.match(header, /<svg[\s\S]*?<circle[\s\S]*?strokeDasharray=\{riskCircleCircumference\}[\s\S]*?strokeDashoffset=\{riskCircleOffset\}/);
absent(header, /grid-cols-10/, 'risk must use the circular progress chart, not segmented bars');

assert.match(capital, /\(\{option\.count\.toLocaleString\('fa-IR'\)\}\)/);
assert.match(purchases, /\(\{tab\.count\.toLocaleString\('fa-IR'\)\}\)/);
absent(capital, /option\.count[\s\S]{0,160}bg-(?:white|slate)/, 'capital filter counts must not render as colored tags');
absent(purchases, /tab\.count[\s\S]{0,160}bg-(?:white|slate)/, 'purchase filter counts must not render as colored tags');

assert.match(capital, /min-w-\[58rem\] table-fixed/);
assert.match(purchases, /min-w-\[56rem\] table-fixed/);
assert.match(purchases, /colSpan=\{7\}/);
absent(capital, /settlementStatus\.badgeClass|saleClosureStatus\.badgeClass/, 'long capital statuses must not render as pills');
assert.match(controller, /compact \? 'break-words text-right' : 'truncate'/);

assert.match(telegram, /mt-2 flex justify-center border-t/);
absent(telegram, /absolute bottom-4 start-4/, 'new-message action must not overlap the last message');

assert.match(ledger, /getSettlementBatchLabel/);
assert.match(ledger, /همه تسویه‌های گروهی/);
absent(ledger, /\{batch\.id\}\s*·/, 'technical settlement batch ids must not be exposed as filter labels');
assert.match(ledger, /w-full min-w-0 sm:w-96/);

for (const [name, source] of Object.entries({ header, capital, purchases, telegram, ledger })) {
  absent(source, /style=\{\{/, `${name} must not add inline layout CSS`);
  absent(source, /className="[^"]*(?:fix-mobile|temp-responsive)/, `${name} must not add page-fix CSS hooks`);
}

console.log('PASS Kourosh v208 partner-detail feedback audit');
