import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const indexPath = path.join(root, 'index.tsx');
const index = fs.readFileSync(indexPath, 'utf8');

const requiredImports = [
  'styles/system/reports-redesign/smart-insights/smart-insights.phase1-stabilized.css',
  'styles/system/reports-redesign/purchase-suggestions-action-board/purchase-suggestions-action-board.phase2-stabilized.css',
];

const removedImports = [
  'reports-stage210-purchase-suggestions-redesign.css',
  'reports-stage211-smart-insights-action-board.css',
  'reports-stage212-purchase-suggestions-compact-header-search.css',
  'reports-stage213-smart-insights-action-board-fit.css',
  'reports-stage214-purchase-search-single-box-hard-fix.css',
  'reports-stage215-smart-insights-related-cards-readability.css',
  'reports-stage216-search-table-detail-fixes.css',
  'reports-stage217-search-and-smart-table-final.css',
  'reports-stage218-smart-insights-table-column-contract.css',
  'reports-stage219-final-search-table-polish.css',
  'reports-stage220-auto-pricing-modal-redesign.css',
  'reports-stage221-orbital-board-cta-containment.css',
  'reports-stage222-active-state-predictive-density.css',
  'reports-stage223-overview-pricing-redesign.css',
  'reports-stage224-hidden-profit-customer-density.css',
  'reports-stage225-pricing-toman-icons-fix.css',
  'reports-stage226-smart-insight-money-unit-audit.css',
  'reports-stage230-brief-insight-cards-redesign.css',
  'reports-stage231-insight-card-modals-alignment.css',
  'reports-stage232-header-filters-density-polish.css',
  'reports-stage233-smart-insight-section-rhythm.css',
  'reports-stage234-css-cascade-consolidation.css',
];

for (const importPath of requiredImports) {
  assert.ok(index.includes(importPath), `Missing required consolidated CSS import: ${importPath}`);
  assert.ok(fs.existsSync(path.join(root, importPath)), `Missing consolidated CSS file: ${importPath}`);
}

for (const oldImport of removedImports) {
  assert.ok(!index.includes(oldImport), `Old stage CSS import is still present: ${oldImport}`);
}

const smartCssPath = path.join(root, requiredImports[0]);
const actionCssPath = path.join(root, requiredImports[1]);
const smartCss = fs.readFileSync(smartCssPath, 'utf8');
const actionCss = fs.readFileSync(actionCssPath, 'utf8');

const smartSelectors = [
  '.apr220-overlay',
  '.smart-orbital-board-v156',
  '.smart-predictive-v182',
  '.smart-overview-strip-v223',
  '.smart-pricing-card-v225__label',
  '.apr226-column-label',
  '.sic230-brief',
  '.sale202-dialog',
  '.smart-insights-hero-v153',
  '.smart-brain-page',
];

const actionSelectors = [
  '.purchase210-page',
  '.purchase210-hero',
  '.purchase214-search',
  '.purchase219-search',
  '.sib211-shell',
  '.sib217-cell',
  '.sib218-head-cell--title',
  '.sib219-insight-grid',
  '.sib211-related',
  '.sib211-row',
];

for (const selector of smartSelectors) {
  assert.ok(smartCss.includes(selector), `Merged SmartInsight CSS lost selector: ${selector}`);
}

for (const selector of actionSelectors) {
  assert.ok(actionCss.includes(selector), `Merged Purchase/ActionBoard CSS lost selector: ${selector}`);
}

const smartInsightTsx = fs.readFileSync(path.join(root, 'pages/reports/SmartInsightCenter.tsx'), 'utf8');
const alertManagementModalTsx = fs.existsSync(path.join(root, 'components/reports/AlertManagementModal.tsx'))
  ? fs.readFileSync(path.join(root, 'components/reports/AlertManagementModal.tsx'), 'utf8')
  : '';
const smartInsightActionBoardJsx = `${smartInsightTsx}\n${alertManagementModalTsx}`;
const purchaseTsx = fs.readFileSync(path.join(root, 'pages/reports/PurchaseSuggestionReport.tsx'), 'utf8');

assert.ok(smartInsightActionBoardJsx.includes('sib219-insight-grid'), 'SmartInsight action board grid class is missing from JSX.');
assert.ok(smartInsightActionBoardJsx.includes('sib218-head-cell--title'), 'SmartInsight table header title class is missing from JSX.');
assert.ok(purchaseTsx.includes('purchase219-search'), 'Purchase Suggestions final search wrapper class is missing from JSX.');
assert.ok(purchaseTsx.includes('purchase219-search__input'), 'Purchase Suggestions final search input class is missing from JSX.');

console.log('CSS consolidation guard passed');
