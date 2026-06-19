import assert from 'node:assert/strict';
import fs from 'node:fs';

const server = fs.readFileSync('server/index.ts', 'utf8');
const salesOrders = fs.readFileSync('server/salesOrders.ts', 'utf8');

assert.ok(server.includes('last_purchase AS'), 'Customer Intelligence must include an absolute last_purchase CTE.');
assert.ok(server.includes('absoluteLastPurchaseAt'), 'Customer Intelligence must select absoluteLastPurchaseAt from backend.');
assert.ok(server.includes('lastPurchaseAt: lastDateIso'), 'Customer Intelligence response must include lastPurchaseAt.');
assert.ok(server.includes('lastPurchaseLabel'), 'Customer Intelligence response must include lastPurchaseLabel.');
assert.ok(server.includes("r.absoluteLastPurchaseAt || r.periodLastPurchaseAt"), 'daysSinceLast must prefer absolute backend last purchase before period fallback.');
assert.ok(server.includes('lastPurchaseMoment') && server.includes("moment(lastDateIso, 'YYYY-MM-DD', true)"), 'Last purchase date must be parsed from backend ISO date safely.');

// Important business rule: last purchase must be based on the date selected in the sale form.
// In this project the selected form date is persisted as sales_orders.transactionDate by createSalesOrder.
assert.ok(
  salesOrders.includes('const { customerId, paymentMethod, discount, tax, notes, items, transactionDate } = orderPayload'),
  'createSalesOrder must read transactionDate from the sale form payload.'
);
assert.ok(
  salesOrders.includes("const isoTransDate   = transactionDate ? toISOEn(transactionDate) : moment().locale('en').format('YYYY-MM-DD')"),
  'createSalesOrder must normalize the selected transactionDate into isoTransDate.'
);
assert.ok(
  salesOrders.includes('(customerId, paymentMethod, discount, tax, subtotal, grandTotal, transactionDate, notes)') &&
  salesOrders.includes('isoTransDate,'),
  'sales_orders.transactionDate must be populated from the selected form date isoTransDate.'
);

const customerIntelStart = server.indexOf('Customer Intelligence Engine');
const customerIntelEnd = server.indexOf('AI Sales Agent', customerIntelStart);
assert.ok(customerIntelStart > -1 && customerIntelEnd > customerIntelStart, 'Customer Intelligence backend block must be identifiable.');
const customerIntelBlock = server.slice(customerIntelStart, customerIntelEnd);

assert.ok(
  /MAX\(transactionDate\)\s+AS\s+lastPurchaseAt/.test(customerIntelBlock),
  'Customer Intelligence last_purchase CTE must use MAX(transactionDate), not record creation time.'
);
assert.ok(
  !/MAX\(createdAt\)\s+AS\s+lastPurchaseAt/.test(customerIntelBlock) &&
  !/MAX\(created_at\)\s+AS\s+lastPurchaseAt/.test(customerIntelBlock),
  'Customer Intelligence last purchase must not use createdAt/created_at as the source of truth.'
);

console.log('customer intelligence last purchase guard passed');
