import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');
const checks = [];
const must = (condition, message) => {
  checks.push({ condition: Boolean(condition), message });
};

const customers = read('pages/Customers.tsx');
const customerDetail = read('pages/customerDetail/CustomerDetailController.tsx');
const customerViewModels = read('pages/customerDetail/customerDetailViewModels.ts');
const routes = read('server/routes/installments.routes.ts');
const service = read('server/services/installments.service.ts');
const repo = read('server/repositories/installments.repo.ts');
const db = read('server/db/domains/installments.db.ts');

must(customers.includes('/api/installment-sales/customer-due-overview'), 'customer directory uses compact due-overview endpoint');
must(!customers.includes("apiFetch('/api/installment-sales?ts='"), 'customer directory no longer downloads every installment sale');
must(customerDetail.includes('/api/installment-sales/customer/${customerId}'), 'customer detail uses customer-scoped installment endpoint');
must(!customerDetail.includes("apiFetch('/api/installment-sales',"), 'customer detail no longer downloads/filter all installment sales');
must(customerViewModels.includes('sale?.nextDueDate') && customerViewModels.includes('sale?.nextDueAmount'), 'customer detail due card consumes sale-level batch due metadata');
must(routes.includes("'/api/installment-sales/customer-due-overview'"), 'compact due-overview route exists');
must(routes.includes("'/api/installment-sales/customer/:customerId'"), 'customer-scoped installment route exists');
must(service.includes('listInstallmentSalesForCustomer') && service.includes('listInstallmentCustomerDueOverview'), 'service exposes optimized customer read paths');
must(repo.includes('listInstallmentSalesForCustomerFromDb') && repo.includes('listInstallmentCustomerDueOverviewFromDb'), 'repository exposes optimized customer read paths');
must(db.includes('export const listInstallmentSalesForCustomerFromDb'), 'customer-scoped DB query exists');
must(db.includes('SELECT id FROM installment_sales WHERE customerId = ?'), 'customer-scoped DB query limits the CTE before aggregation');
must(db.includes('export const listInstallmentCustomerDueOverviewFromDb'), 'customer due-overview DB query exists');
must(db.includes('COUNT(*) OVER (PARTITION BY customerId) AS openCount'), 'due overview computes per-customer open count in SQL');
must(db.includes('ROW_NUMBER() OVER (\n          PARTITION BY customerId'), 'due overview resolves nearest due contract in SQL');
must(db.includes('activeScopeSql,\n    false,'), 'due overview disables unused latest-collection scan');
must(db.includes('includeLatestCollection = true'), 'shared CTE supports lightweight read-path mode without duplicating accounting logic');

const legacyStart = db.indexOf('export const getAllInstallmentSalesFromDb');
const legacyEnd = db.indexOf('export const getInstallmentSaleByIdFromDb', legacyStart);
const legacyBody = legacyStart >= 0 && legacyEnd > legacyStart ? db.slice(legacyStart, legacyEnd) : '';
must(legacyBody.includes('buildInstallmentDirectoryCtes'), 'legacy array endpoint reuses batch CTE');
must(!legacyBody.includes('for (const saleDb'), 'legacy array endpoint has no per-sale N+1 loop');
must(!legacyBody.includes('getInstallmentSaleReceivableState('), 'legacy array endpoint has no per-sale receivable query');

const failed = checks.filter((item) => !item.condition);
if (failed.length) {
  for (const item of failed) console.error(`FAIL: ${item.message}`);
  process.exit(1);
}
console.log(`Installment customer read-path audit passed: ${checks.length} checks.`);
