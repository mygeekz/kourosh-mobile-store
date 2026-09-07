import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const failures = [];
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const walk = (dir) => {
  const out = [];
  const visit = (current) => {
    for (const entry of fs.readdirSync(path.join(root, current), { withFileTypes: true })) {
      const rel = path.posix.join(current.replaceAll('\\', '/'), entry.name);
      if (entry.isDirectory()) visit(rel);
      else if (/\.tsx?$/.test(entry.name)) out.push(rel);
    }
  };
  visit(dir);
  return out;
};
const mustContain = (rel, tokens) => {
  const source = read(rel);
  for (const token of tokens) if (!source.includes(token)) failures.push(`${rel} missing ${token}`);
};
const mustNotContain = (rel, patterns) => {
  const source = read(rel);
  for (const pattern of patterns) if (pattern.test(source)) failures.push(`${rel} still matches ${pattern}`);
};

if (read('KOUROSH_SOURCE_VERSION').trim() !== 'v282') failures.push('KOUROSH_SOURCE_VERSION must be v282');

mustContain('components/people/PeopleDetailFoundation.tsx', [
  'PeopleDetailPageShell',
  'PeopleDetailSurface',
  'PeopleDetailHeroHeader',
  'PeopleDetailHeaderActions',
  'PeopleDetailQuickActionGrid',
  'PeopleDetailSegmentedActions',
  'PeopleDetailSectionHeading',
  'data-ui-people-detail-page="standard-v282"',
]);

for (const rel of ['pages/customerDetail/CustomerDetailRender.tsx', 'pages/partnerDetail/PartnerDetailRender.tsx']) {
  mustContain(rel, ['PeopleDetailPageShell', 'PeopleDetailSurface']);
}
for (const rel of ['pages/customerDetail/CustomerDetailHeroOverviewSection.tsx', 'pages/partnerDetail/PartnerDetailHeaderSection.tsx']) {
  mustContain(rel, ['PeopleDetailHeroHeader', 'FinancialStatusBadge']);
  mustNotContain(rel, [/variant=["'](?:success|warning|danger)["'][\s\S]{0,160}(?:ارسال پیام|ارسال گزارش|ویرایش پروفایل|اتصال تلگرام)/]);
}

mustContain('pages/customerDetail/CustomerDetailHeroOverviewSection.tsx', ['PeopleDetailQuickActionGrid']);

for (const rel of ['pages/customerDetail/CustomerTelegramConversationSection.tsx', 'pages/partnerDetail/PartnerTelegramConversationSection.tsx']) {
  mustContain(rel, ['PeopleDetailSectionHeading', 'PeopleDetailSegmentedActions', 'standard-v282']);
  mustNotContain(rel, [/border-blue-600\s+bg-blue-600/, /<button\b/]);
}
for (const rel of ['pages/customerDetail/CustomerLedgerRenderSection.tsx', 'pages/partnerDetail/PartnerLedgerWorkspaceSection.tsx']) {
  mustContain(rel, ['PeopleDetailSectionHeading', 'ManagementDirectoryPagination']);
  mustNotContain(rel, [/<button\b/]);
}
for (const rel of ['pages/customerDetail/CustomerPurchaseHistoryPrintSection.tsx', 'pages/partnerDetail/PartnerPurchaseHistorySection.tsx']) {
  mustContain(rel, ['PeopleDetailSectionHeading']);
}

// All detail-page actions must now use canonical Button or explicit unstyled Button,
// never native raw buttons that can escape the Style/Template contract.
for (const rel of [...walk('pages/customerDetail'), ...walk('pages/partnerDetail')]) {
  const source = read(rel);
  const rawButtons = source.match(/<button\b/g) || [];
  if (rawButtons.length) failures.push(`${rel} contains ${rawButtons.length} raw <button> controls`);
  if (/data-skip-global-buttons/.test(source)) failures.push(`${rel} still depends on global-button opt-out ownership`);
  if (/border-blue-600\s+bg-blue-600/.test(source)) failures.push(`${rel} contains hard-coded selected action blue`);
}

// The four operational header actions must be compact and share the same hierarchy.
for (const rel of ['pages/customerDetail/CustomerDetailHeroOverviewSection.tsx', 'pages/partnerDetail/PartnerDetailHeaderSection.tsx']) {
  const source = read(rel);
  const labels = ['ارسال پیام', 'ارسال گزارش', 'ویرایش پروفایل', 'اتصال تلگرام'];
  for (const label of labels) {
    const idx = source.indexOf(label);
    if (idx < 0) failures.push(`${rel} missing header action ${label}`);
    else {
      const before = source.slice(Math.max(0, idx - 450), idx + label.length);
      if (!/size="sm"/.test(before)) failures.push(`${rel}: ${label} must use compact size=sm`);
    }
  }
}

if (failures.length) {
  console.error('People detail standardization v282 audit FAILED');
  failures.forEach((item) => console.error(`- ${item}`));
  process.exit(1);
}
console.log('People detail standardization v282 audit passed.');
