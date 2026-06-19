import fs from 'node:fs';
import assert from 'node:assert/strict';

const decisionEngine = fs.readFileSync('components/reports/ReportsDecisionEngine.tsx', 'utf8');
const auditReport = fs.readFileSync('pages/reports/FinancialAuditReport.tsx', 'utf8');

assert.match(decisionEngine, /Financial Trust Layer/, 'Reports decision engine must expose the financial trust layer.');
assert.match(decisionEngine, /\/api\/reports\/financial-audit/, 'Decision engine must consume real financial audit data.');
assert.match(decisionEngine, /دقت گزارش/, 'Decision engine must show report confidence.');
assert.match(decisionEngine, /to=\{auditHref\}/, 'Trust KPI must drill down into financial audit.');
assert.match(auditReport, /FINANCIAL TRUST LAYER/, 'Financial audit page must show trust summary.');
assert.match(auditReport, /areaDrilldown/, 'Audit rows must provide drill-down routes.');
assert.match(auditReport, /fromISODate/, 'Audit page must read date range from query params.');

console.log('reports financial trust layer guards passed');
