/* eslint-disable @typescript-eslint/no-explicit-any -- Test doubles model legacy service rows. */
import assert from "node:assert/strict";
import fs from "node:fs";
import http from "node:http";
import path from "node:path";
import express from "express";
import moment from "jalali-moment";
import sqlite3 from "sqlite3";
import { setActiveDb } from "../db/connection";
import { allAsync, execAsync, getAsync, runAsync } from "../db/query";
import { createMiniAppSession } from "../miniapp/miniAppSession";
import { createMiniAppStaffRepository } from "../repositories/miniAppStaff.repo";
import { registerMiniAppRoutes } from "../routes/miniapp.routes";
import {
  MINI_APP_STAFF_CAPABILITIES,
  resolveMiniAppStaffCapabilities,
} from "../security/miniAppStaffAccessPolicy";
import {
  createMiniAppStaffService,
  normalizeMiniAppStaffSearchQuery,
} from "../services/miniAppStaff.service";
import { unlinkStaffTelegram } from "../services/telegramIdentitySecurity.service";
import {
  miniAppRouteForStartParam,
  parseMiniAppStartParam,
  resolveMiniAppLaunch,
} from "../../miniapp/startParam";

const db = new sqlite3.Database(":memory:");
setActiveDb(db);
await execAsync(`
  PRAGMA foreign_keys=ON;
  CREATE TABLE roles(id INTEGER PRIMARY KEY,name TEXT UNIQUE NOT NULL);
  CREATE TABLE users(id INTEGER PRIMARY KEY,username TEXT,passwordHash TEXT,roleId INTEGER,firstName TEXT,lastName TEXT);
  CREATE TABLE user_telegram_links(user_id INTEGER PRIMARY KEY,telegram_user_id TEXT UNIQUE,chat_id TEXT,linked_at TEXT DEFAULT CURRENT_TIMESTAMP,updated_at TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE telegram_staff_link_tokens(id INTEGER PRIMARY KEY,user_id INTEGER,status TEXT);
  CREATE TABLE audit_logs(id INTEGER PRIMARY KEY,userId INTEGER,username TEXT,role TEXT,action TEXT,entityType TEXT,entityId INTEGER,description TEXT,createdAt TEXT DEFAULT CURRENT_TIMESTAMP);
  CREATE TABLE customers(id INTEGER PRIMARY KEY,fullName TEXT,phoneNumber TEXT);
  CREATE TABLE customer_ledger(id INTEGER PRIMARY KEY,customerId INTEGER,transactionDate TEXT,createdAt TEXT,updatedAt TEXT,description TEXT,debit REAL,credit REAL,balance REAL);
  CREATE TABLE phones(id INTEGER PRIMARY KEY,model TEXT,imei TEXT,color TEXT,storage TEXT,ram TEXT,status TEXT,salePrice REAL,registerDate TEXT);
  CREATE TABLE sales_orders(id INTEGER PRIMARY KEY,customerId INTEGER,paymentMethod TEXT,transactionDate TEXT,grandTotal REAL,status TEXT);
  CREATE TABLE sales_order_items(id INTEGER PRIMARY KEY,orderId INTEGER,itemType TEXT,itemId INTEGER,description TEXT);
  CREATE TABLE sales_transactions(id INTEGER PRIMARY KEY,customerId INTEGER,itemType TEXT,itemId INTEGER,itemName TEXT,transactionDate TEXT,totalPrice REAL,paymentMethod TEXT);
  CREATE TABLE invoices(id INTEGER PRIMARY KEY,invoiceNumber TEXT,customerId INTEGER,date TEXT,grandTotal REAL);
  CREATE TABLE invoice_items(id INTEGER PRIMARY KEY,invoiceId INTEGER,description TEXT);
  CREATE TABLE installment_sales(id INTEGER PRIMARY KEY,customerId INTEGER,phoneId INTEGER,itemsSummary TEXT,saleDate TEXT,saleDateISO TEXT,dateCreated TEXT,actualSalePrice REAL,status TEXT);
  CREATE TABLE installment_sale_items(id INTEGER PRIMARY KEY,saleId INTEGER,itemType TEXT,itemId INTEGER);
`);
await runAsync("INSERT INTO roles(id,name) VALUES(1,'Admin'),(2,'Manager'),(3,'Salesperson'),(4,'Warehouse'),(5,'Technician'),(6,'Marketer')");
await runAsync("INSERT INTO users(id,username,passwordHash,roleId,firstName,lastName) VALUES(1,'admin','x',1,'Admin','One'),(2,'manager','x',2,'Manager','Two'),(3,'sales','x',3,'Sales','Three'),(4,'warehouse','x',4,'Warehouse','Four'),(5,'tech','x',5,'Tech','Five'),(6,'market','x',6,'Market','Six')");
for (let id = 1; id <= 6; id += 1) await runAsync("INSERT INTO user_telegram_links(user_id,telegram_user_id,chat_id) VALUES(?,?,?)", [id, `tg-${id}`, `chat-${id}`]);

await runAsync("INSERT INTO customers(id,fullName,phoneNumber) VALUES(12,'كيان رضایی','۰۹۱۲۱۲۳۴۵۶۷'),(13,'بستانکار','09120000000')");
await runAsync("INSERT INTO customer_ledger(id,customerId,transactionDate,description,debit,credit,balance) VALUES(1,12,'2026-08-10','فروش',20000000,0,20000000),(2,12,'2026-08-11','دریافت',0,5000000,15000000),(3,13,'2026-08-11','اضافه پرداخت',0,3000000,-3000000)");
await runAsync("INSERT INTO phones(id,model,imei,color,storage,ram,status,salePrice,registerDate) VALUES(7,'آیفون ۱۵','356789012345678','مشکی','256','8','موجود در انبار',70000000,'2026-08-10')");
await runAsync("INSERT INTO sales_orders(id,customerId,paymentMethod,transactionDate,grandTotal,status) VALUES(21,12,'cash','2026-08-11',70000000,'active')");
await runAsync("INSERT INTO sales_order_items(id,orderId,itemType,itemId,description) VALUES(1,21,'phone',7,'آیفون ۱۵')");
await runAsync("INSERT INTO invoices(id,invoiceNumber,customerId,date,grandTotal) VALUES(31,'INV-31',12,'2026-08-11',5000000)");
await runAsync("INSERT INTO invoice_items(id,invoiceId,description) VALUES(1,31,'قاب')");
await runAsync("INSERT INTO installment_sales(id,customerId,phoneId,itemsSummary,saleDate,saleDateISO,dateCreated,actualSalePrice,status) VALUES(41,12,7,'آیفون اقساطی','1405/05/20','2026-08-11','2026-08-11',80000000,'active')");

assert.equal(normalizeMiniAppStaffSearchQuery("  كيان ۱۲۳  "), "کیان 123");
assert.equal(normalizeMiniAppStaffSearchQuery("x".repeat(200)).length, 80);
assert.deepEqual(resolveMiniAppStaffCapabilities("Admin"), MINI_APP_STAFF_CAPABILITIES);
assert.deepEqual(resolveMiniAppStaffCapabilities("Manager"), MINI_APP_STAFF_CAPABILITIES);
for (const role of ["Salesperson", "Warehouse", "Technician", "Marketer"]) assert.deepEqual(resolveMiniAppStaffCapabilities(role), []);

const repo = createMiniAppStaffRepository({
  ensureDatabase: async () => undefined,
  allRows: (sql, params = []) => allAsync(sql, params),
  getRow: (sql, params = []) => getAsync(sql, params),
});
const fixedNow = () => moment("2026-08-11", "YYYY-MM-DD");
const unpaidRows = [
  { id: 1, saleId: 41, customerId: 12, dueDate: "1405/05/19", amountDue: 1000000, customerFullName: "کیان", customerPhoneNumber: "0912" },
  { id: 2, saleId: 41, customerId: 12, dueDate: "1405/05/20", amountDue: 2000000, customerFullName: "کیان", customerPhoneNumber: "0912" },
  { id: 3, saleId: 41, customerId: 12, dueDate: "1405/05/21", amountDue: 3000000, customerFullName: "کیان", customerPhoneNumber: "0912" },
  { id: 4, saleId: 41, customerId: 12, dueDate: "1405/05/25", amountDue: 4000000, customerFullName: "کیان", customerPhoneNumber: "0912" },
  { id: 5, saleId: 41, customerId: 12, dueDate: "1405/05/30", amountDue: 5000000, customerFullName: "کیان", customerPhoneNumber: "0912" },
  { id: 6, saleId: 41, customerId: 12, dueDate: "1405/05/18", amountDue: 0, customerFullName: "کیان", customerPhoneNumber: "0912" },
];
const readModels: any = {
  getDashboardKPIs: async () => ({ totalSalesMonth: 90000000, phoneSalesRevenueMonth: 70000000, installmentSalesRevenueMonth: 20000000, activeProductsCount: 8 }),
  getSalesSummaryAndProfit: async () => ({ totalRevenue: 70000000, grossProfit: 15000000, totalTransactions: 2, averageSaleValue: 35000000, topSellingItems: [{ id: 7, itemType: "phone", itemName: "آیفون", totalRevenue: 70000000, quantitySold: 1 }] }),
  listUnpaidInstallments: async () => unpaidRows,
  listInstallmentsForCustomer: async () => [{ id: 41, overallStatus: "معوق", overdueInstallmentsCount: 1, nextDueDate: "1405/05/20", nextDueAmount: 2000000 }],
  getInstallmentSaleById: async (id: number) => id === 41 ? ({ id: 41, customerId: 12, customerFullName: "کیان", saleDate: "1405/05/20", itemsSummary: "آیفون", actualSalePrice: 80000000, downPayment: 20000000, collectedAmount: 30000000, remainingAmount: 50000000, numberOfInstallments: 2, overallStatus: "در حال پرداخت", items: [{ description: "آیفون", quantity: 1, unitPrice: 80000000, totalPrice: 80000000, buyPrice: 1 }], payments: [{ id: 2, installmentNumber: 1, dueDate: "1405/05/20", amountDue: 2000000, computedPaid: 0, computedRemaining: 2000000, notes: "secret" }], checks: [] }) : null,
  listPhones: async ({ phoneId }: any) => phoneId === 7 ? [{ id: 7, model: "آیفون ۱۵", imei: "356789012345678", color: "مشکی", storage: "256", ram: "8", condition: "نو", status: "فروخته شده", purchasePrice: 60000000, currentPurchasePrice: 62000000, salePrice: 70000000, supplierName: "تأمین‌کننده", purchaseDate: "2026-08-01", notes: "secret", metadata: "secret" }] : [],
  getOrderInvoice: async () => ({ customerDetails: { id: 12, fullName: "کیان", phoneNumber: "0912", address: "secret" }, invoiceMetadata: { transactionDate: "1405/05/20", paymentMethod: "cash", paymentMethodLabel: "نقدی", status: "active" }, financialSummary: { subtotal: 70, grandTotal: 70 }, lineItems: [{ id: 1, description: "آیفون", quantity: 1, unitPrice: 70, totalPrice: 70, buyPrice: 1 }], notes: "secret" }),
  getLegacyInvoice: async () => null,
};
const service = createMiniAppStaffService({ repo, readModels, now: fixedNow });
const staffSearch = (query: unknown, limit: unknown) => service.search(query, limit, MINI_APP_STAFF_CAPABILITIES);

const statements: string[] = [];
db.on("trace", (statement) => statements.push(statement));
const ledgerBefore = await allAsync("SELECT * FROM customer_ledger ORDER BY id");
statements.length = 0;
const home = await service.getHome();
assert.equal(home.today.sales, 70000000);
assert.equal(home.today.grossProfit, 15000000);
assert.equal(home.financialPosition.totalReceivables, 15000000);
assert.equal(home.financialPosition.debtorsCount, 1);
assert.equal(home.installments.overdueCount, 1);
assert.equal(home.installments.dueTodayCount, 1);
await new Promise((resolve) => setImmediate(resolve));
assert.equal(statements.some((statement) => /^\s*(INSERT|UPDATE|DELETE)\b/i.test(statement)), false);
assert.deepEqual(await allAsync("SELECT * FROM customer_ledger ORDER BY id"), ledgerBefore);

assert.deepEqual((await service.listDueInstallments({ scope: "overdue" })).items.map((item) => item.paymentId), [1]);
assert.deepEqual((await service.listDueInstallments({ scope: "today" })).items.map((item) => item.paymentId), [2]);
assert.deepEqual((await service.listDueInstallments({ scope: "next7" })).items.map((item) => item.paymentId), [3, 4]);

for (const value of ["كيان", "کیان", "۰۹۱۲۱۲۳۴۵۶۷", "356789012345678", "INV-31", "41", "", "x".repeat(500), "%_' OR 1=1 --"]) {
  const result = await staffSearch(value, 20);
  assert.ok(Object.values(result.groups).flat().length <= 20);
}
assert.equal((await staffSearch("كيان", 20)).groups.customers[0]?.fullName, "كيان رضایی");
assert.equal((await staffSearch("356789012345678", 20)).groups.phones[0]?.id, 7);
assert.equal((await staffSearch("INV-31", 20)).groups.invoices[0]?.invoiceRef, "legacy-31");
assert.equal((await staffSearch("", 20)).groups.customers.length, 0);

const forbiddenKeys = new Set(["notes", "password", "passwordHash", "telegram_user_id", "telegram_chat_id", "telegramChatId", "managerNotes", "audit", "metadata"]);
const assertSafeKeys = (value: unknown): void => {
  if (Array.isArray(value)) return value.forEach(assertSafeKeys);
  if (!value || typeof value !== "object") return;
  for (const [key, child] of Object.entries(value)) {
    assert.equal(forbiddenKeys.has(key), false, `unsafe key leaked: ${key}`);
    assertSafeKeys(child);
  }
};
assertSafeKeys(await staffSearch("کیان", 20));
assertSafeKeys(await service.getCustomerDetail(12));
assertSafeKeys(await service.getPhoneDetail(7));
assertSafeKeys(await service.getInstallmentDetail(41));
assertSafeKeys(await service.getInvoiceDetail("order-21"));

for (const [label, operation] of [
  ["search", () => staffSearch("کیان", 20)],
  ["customer detail", () => service.getCustomerDetail(12)],
  ["sales summary", () => service.getSalesSummary("month")],
  ["due list", () => service.listDueInstallments({ scope: "today" })],
  ["phone lookup", () => service.listPhones({ q: "356789012345678", page: 1, limit: 20 })],
  ["phone detail", () => service.getPhoneDetail(7)],
  ["installment detail", () => service.getInstallmentDetail(41)],
  ["invoice detail", () => service.getInvoiceDetail("order-21")],
] as Array<[string, () => Promise<unknown>]>) {
  statements.length = 0;
  await operation();
  await new Promise((resolve) => setImmediate(resolve));
  assert.equal(
    statements.some((statement) => /^\s*(INSERT|UPDATE|DELETE)\b/i.test(statement)),
    false,
    `${label} must remain read-only`,
  );
}

assert.deepEqual(parseMiniAppStartParam("v1_s_customer_12"), { version: "v1", role: "staff", page: "customer", entityId: 12 });
assert.equal(miniAppRouteForStartParam("v1_s_customer_12", "staff"), "/customers/12");
assert.equal(miniAppRouteForStartParam("v1_s_inv_legacy_31", "staff"), "/invoices/legacy-31");
assert.equal(miniAppRouteForStartParam("v1_s_customer_12", "customer"), "/");
assert.equal(resolveMiniAppLaunch("v1_s_customer_bad", "staff").route, "/");

const fakeCustomerService = { getHome: async () => ({}), getAccount: async () => ({}), listInstallments: async () => [], getInstallmentDetail: async () => null, listPurchases: async () => [], listInvoices: async () => [], getInvoiceDetail: async () => null };
const fakePartnerService = { getHome: async () => ({}), getAccount: async () => ({}), listLedger: async () => ({ items: [] }), listPurchases: async () => ({ items: [] }), listPhones: async () => ({ items: [] }) };
const routeStaffService: any = { getHome: async () => ({ ok: true }), getSalesSummary: async () => ({}), search: async () => ({}), getCustomerDetail: async () => null, listPhones: async () => ({ items: [] }), getPhoneDetail: async () => null, listDueInstallments: async () => ({ items: [] }), getInstallmentDetail: async () => null, getInvoiceDetail: async () => null };
const app = express();
app.use(express.json());
registerMiniAppRoutes(app, { customerService: fakeCustomerService, partnerService: fakePartnerService, staffService: routeStaffService } as any);
app.use((_error: unknown, _req: any, res: any, _next: any) => res.status(500).json({ success: false }));
const server = http.createServer(app);
await new Promise<void>((resolve) => server.listen(0, "127.0.0.1", resolve));
const address = server.address();
assert.ok(address && typeof address === "object");
const base = `http://127.0.0.1:${address.port}`;
const requestHome = async (token: string) => {
  const response = await fetch(`${base}/api/miniapp/staff/home`, { headers: { authorization: `Bearer ${token}` } });
  return { status: response.status, body: await response.json() as any };
};
const sessionFor = (kind: "staff" | "customer" | "partner", subjectId: number, telegramUserId: string, roleName?: "Admin" | "Manager") => createMiniAppSession({ kind, subjectId, telegramUserId, displayName: "test", roleName, capabilities: [...MINI_APP_STAFF_CAPABILITIES] });
for (const [id, role] of [[1, "Admin"], [2, "Manager"]] as const) {
  const session = sessionFor("staff", id, `tg-${id}`, role);
  assert.equal((await requestHome(session.token)).status, 200);
}
for (const id of [3, 4, 5, 6]) {
  const session = sessionFor("staff", id, `tg-${id}`, "Manager");
  assert.equal((await requestHome(session.token)).status, 401);
}
const customerSession = sessionFor("customer", 12, "customer-tg");
const customerDenied = await requestHome(customerSession.token);
assert.equal(customerDenied.status, 403);
assert.equal(customerDenied.body.code, "MINIAPP_STAFF_ACCESS_REQUIRED");
const partnerSession = sessionFor("partner", 99, "partner-tg");
assert.equal((await requestHome(partnerSession.token)).status, 403);

const downgrade = sessionFor("staff", 2, "tg-2", "Manager");
await runAsync("UPDATE users SET roleId=3 WHERE id=2");
assert.equal((await requestHome(downgrade.token)).status, 401);
assert.equal((await requestHome(downgrade.token)).status, 401, "downgraded session must remain revoked");
await runAsync("UPDATE users SET roleId=2 WHERE id=2");

const unlink = sessionFor("staff", 1, "tg-1", "Admin");
await unlinkStaffTelegram(1, { id: 1, username: "admin", roleName: "Admin" });
assert.equal((await requestHome(unlink.token)).status, 401);
await new Promise<void>((resolve, reject) => server.close((error) => error ? reject(error) : resolve()));

const serviceSource = fs.readFileSync(path.join(process.cwd(), "server/services/miniAppStaff.service.ts"), "utf8");
const importBlock = serviceSource.split("type StaffRepo")[0];
assert.doesNotMatch(importBlock, /\b(?:create|update|delete|record|add|cancel|settle|complete|adjust)\w*\b/i);
assert.doesNotMatch(serviceSource, /fetch\s*\(|localhost|\/api\/search|\/api\/dashboard\/summary/);
assert.doesNotMatch(serviceSource, /getDebtorsList|getAgingReceivablesReport|reconcileInstallmentCustomerLedger/);
const routeSource = fs.readFileSync(path.join(process.cwd(), "server/routes/miniapp.routes.ts"), "utf8");
assert.doesNotMatch(routeSource, /activeSessions/);
const css = fs.readFileSync(path.join(process.cwd(), "miniapp/tailwind.css"), "utf8");
assert.doesNotMatch(css, /@apply|[{}]/);

await new Promise<void>((resolve, reject) => db.close((error) => error ? reject(error) : resolve()));
setActiveDb(null);
console.log("Mini App Staff v149 capability, business, DTO, read-only, role, unlink, search, due and startParam tests passed");
