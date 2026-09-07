#!/usr/bin/env node
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (rel) => fs.readFileSync(path.join(root, rel), 'utf8');
const version = read('KOUROSH_SOURCE_VERSION').trim();
const source = read('pages/partnerDetail/PartnerPhoneCapitalSection.tsx');
const controller = read('pages/partnerDetail/PartnerDetailController.tsx');
const pkg = JSON.parse(read('package.json'));

const versionNumber = Number(version.replace(/^v/, ''));
assert.ok(Number.isInteger(versionNumber) && versionNumber >= 292, `KOUROSH_SOURCE_VERSION must be v292 or a compatible successor; found ${version || '(missing)'}`);
assert.match(source, /data-ui-partner-capital-responsive-cards="true"/, 'tablet/mobile partner capital card view is required');
assert.match(source, /data-ui-partner-capital-desktop-table="true"/, 'desktop partner capital table boundary is required');
assert.match(source, /className="hidden xl:block"/, 'wide table must not render as the primary layout below xl');
assert.match(source, /className="grid gap-3 px-3 pb-3 xl:hidden"/, 'responsive cards must own sub-xl widths');
assert.doesNotMatch(source, /min-w-\[58rem\] table-fixed/, 'old fixed 58rem table layout must be removed');
assert.match(source, /<ManagementDirectoryPagination/, 'partner capital section must use shared pagination');
assert.doesNotMatch(source, /تعداد در صفحه[\s\S]{0,500}<SelectField controlOnly/, 'legacy custom page-size select footer must be removed');
assert.doesNotMatch(controller, /fa-arrow-up-right-from-square/, 'redundant external-arrow icon must not remain in partner sale source link');
assert.match(String(pkg.scripts?.['audit:release'] || ''), /audit:partner-capital-responsive-v292/, 'audit:release must enforce v292 partner capital responsive audit');

console.log('v292 partner capital responsive table audit passed.');
