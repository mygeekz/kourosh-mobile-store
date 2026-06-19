import assert from 'node:assert/strict';
import fs from 'node:fs';

const databaseTs = fs.readFileSync(new URL('../database.ts', import.meta.url), 'utf8');
const indexTs = fs.readFileSync(new URL('../index.ts', import.meta.url), 'utf8');

assert.match(
  databaseTs,
  /WHEN soi\.itemType = 'phone' THEN COALESCE\(NULLIF\(soi\.buyPrice, 0\), NULLIF\(ph\.currentPurchasePrice, 0\), ph\.purchasePrice, 0\)/,
  'Sales summary COGS must prefer phone currentPurchasePrice over initial purchasePrice.'
);

assert.match(
  indexTs,
  /WHEN soi\.itemType='phone' THEN COALESCE\(NULLIF\(soi\.buyPrice,0\), NULLIF\(ph\.currentPurchasePrice,0\), ph\.purchasePrice,0\)/,
  'Financial overview COGS must prefer phone currentPurchasePrice over initial purchasePrice.'
);

assert.match(
  databaseTs,
  /GROUP BY saleDate/,
  'Daily sales must group by normalized saleDate, not full timestamp.'
);

assert.match(
  databaseTs,
  /order_bases AS[\s\S]*il\.orderDiscount \* \(il\.lineNet \/ ob\.orderBase\)/,
  'Product profit/top item reports must allocate invoice-level discount proportionally to item lines.'
);

assert.match(
  indexTs,
  /buildDiscountAwareInvoiceLines\(invoiceAllLinesRaw as any\[\]\)/,
  'Product sales report must keep using the discount-aware invoice line normalizer.'
);

assert.match(
  indexTs,
  /COALESCE\(SUM\(COALESCE\(NULLIF\(currentPurchasePrice, 0\), purchasePrice, 0\)\), 0\) AS total FROM phones/,
  'Financial overview inventory value must use phone replacement/current purchase price where available.'
);

console.log('reports financial guards passed');
