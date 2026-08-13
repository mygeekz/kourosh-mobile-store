import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const expect = (condition, message) => {
  if (!condition) throw new Error(`[installment-directory-pagination] ${message}`);
  checks.push(message);
};

const page = read('pages/InstallmentSalesPage.tsx');
const routes = read('server/routes/installments.routes.ts');
const db = read('server/db/domains/installments.db.ts');
const schema = read('server/db/schema/installments.schema.ts');

expect(page.includes("view: 'directory'"), 'directory UI opts into the paged API without changing legacy callers');
expect(page.includes('pageSize: String(targetPageSize)'), 'page size is sent to the server');
expect(page.includes('window.setTimeout') && page.includes('320'), 'search is debounced before server querying');
expect(page.includes('data-ui-installment-pagination="true"'), 'responsive pagination controls exist');
expect(page.includes("sortOrder") && page.includes("remaining_desc") && page.includes("risk_desc"), 'server-backed sort controls are exposed');
expect(page.includes('exportPageSize = 100') && page.includes('pagination?.hasMore'), 'full exports fetch bounded server pages instead of one unbounded list');

expect(routes.includes("String(req.query?.view || '') === 'directory'"), 'route has an explicit paged-directory opt-in');
expect(routes.includes('installmentsService.listInstallmentSalesDirectory'), 'route delegates paged reads to the directory service');
expect(routes.includes('installmentsService.listInstallmentSales()'), 'legacy array response remains available for existing callers');

expect(db.includes('listInstallmentSalesDirectoryFromDb'), 'database exposes a dedicated directory read path');
expect(db.includes('fastLatestPath'), 'default latest view uses the optimized fast path');
expect(db.includes('directory_scope(id)'), 'financial aggregation can be scoped to only the requested page');
expect(db.includes('VALUES ${pageIds.map'), 'page IDs are used to scope expensive payment/check aggregation');
expect(db.includes('ROW_NUMBER() OVER'), 'next-due/latest-collection selection is batched with SQLite window functions');
expect(db.includes('COUNT(*) AS total FROM installment_sales'), 'default total count avoids loading contract rows');
expect(!db.slice(db.indexOf('export const listInstallmentSalesDirectoryFromDb'), db.indexOf('export const getAllInstallmentSalesFromDb')).includes('for (const saleDb of'), 'paged directory read has no per-contract JavaScript query loop');

expect(schema.includes('idx_installment_sales_directory_date'), 'directory sale-date index is ensured after migrations');
expect(schema.includes('idx_installment_payments_sale_source_due'), 'payment due/source index remains ensured');
expect(schema.includes('idx_installment_transactions_payment_date'), 'transaction aggregation/date index remains ensured');
expect(schema.includes('idx_installment_checks_sale_due'), 'check due-date index remains ensured');

console.log(`Installment directory pagination contract audit passed: ${checks.length} checks.`);
