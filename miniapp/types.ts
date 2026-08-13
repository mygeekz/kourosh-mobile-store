export type MiniAppIdentityKind = "customer" | "partner" | "staff";

export type MiniAppIdentity = {
  kind: MiniAppIdentityKind;
  subjectId: number;
  displayName: string;
  telegramUserId: string;
  roleName?: "Admin" | "Manager";
  capabilities: string[];
};

export type CustomerAccountState = {
  signedBalance: number;
  code: "debtor" | "creditor" | "settled";
  label: "بدهکار" | "بستانکار" | "تسویه";
  amount: number;
};

export type CustomerPurchase = {
  ref: string;
  source: "sales_order" | "installment_sale" | "legacy_sale";
  id: number;
  transactionDate: string;
  itemsSummary: string;
  quantity: number;
  totalAmount: number;
  purchaseType: "cash" | "credit" | "installment";
  purchaseTypeLabel: string;
  invoiceRef: string | null;
};

export type CustomerHomeData = {
  customer: { id: number; fullName: string };
  account: CustomerAccountState;
  installments: {
    activeCount: number;
    overdueCount: number;
    next: { saleId: number; dueDate: string; amount: number } | null;
  };
  lastPurchase: CustomerPurchase | null;
};

export type CustomerAccountData = {
  account: CustomerAccountState;
  totalDebit: number;
  totalCredit: number;
  entries: Array<{
    id: number;
    transactionDate: string;
    description: string;
    debit: number;
    credit: number;
    balance: number;
  }>;
};

export type CustomerInstallmentSummary = {
  id: number;
  saleType: "check" | "installment";
  itemsSummary: string;
  saleDate: string;
  totalAmount: number;
  downPayment: number;
  collectedAmount: number;
  remainingAmount: number;
  installmentCount: number;
  paidInstallmentCount: number;
  remainingInstallmentCount: number;
  nextDueDate: string | null;
  nextDueAmount: number;
  overdueCount: number;
  status: string;
};

export type CustomerInstallmentDetail = CustomerInstallmentSummary & {
  items: Array<{ description: string; quantity: number; unitPrice: number; totalPrice: number }>;
  timeline: Array<{
    id: number;
    installmentNumber: number;
    dueDate: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    paymentDate: string | null;
    state: "paid" | "due" | "upcoming" | "overdue";
  }>;
  checks: Array<{ id: number; dueDate: string; amount: number; bankName: string; status: string }>;
};

export type CustomerInvoiceDetail = {
  business: { name: string; logoUrl: string };
  invoiceNumber: string;
  transactionDate: string;
  paymentMethod: string | null;
  paymentMethodLabel: string | null;
  status: string;
  items: Array<{
    id: number;
    description: string;
    quantity: number;
    unitPrice: number;
    discountAmount: number;
    totalPrice: number;
  }>;
  totals: {
    subtotal: number;
    itemsDiscount: number;
    globalDiscount: number;
    taxAmount: number;
    grandTotal: number;
  };
};

export type PartnerAccountState = {
  signedBalance: number;
  code: "debtor" | "creditor" | "settled";
  label: "بدهکار به فروشگاه" | "بستانکار از فروشگاه" | "تسویه کامل";
  amount: number;
};

export type PartnerLedgerEntry = {
  id: number;
  transactionDate: string;
  description: string;
  debit: number;
  credit: number;
  balance: number;
};

export type PartnerProfile = {
  id: number;
  name: string;
  type: string | null;
  contactName: string | null;
  phoneNumber: string | null;
  email: string | null;
};

export type PartnerSupplySummary = {
  total: number;
  phones: number;
  products: number;
  totalSupplyAmount: number;
};

export type PartnerSettlementSummary = {
  total: number;
  open: number;
  settled: number;
  amount: number;
  paidAmount: number;
  remainingAmount: number;
};

export type PartnerHomeData = {
  partner: PartnerProfile;
  account: PartnerAccountState;
  ledger: { total: number; lastActivity: string | null; recent: PartnerLedgerEntry[] };
  supplied: PartnerSupplySummary;
  phoneSettlement: PartnerSettlementSummary;
};

export type PartnerAccountData = {
  partner: PartnerProfile;
  account: PartnerAccountState;
  totalDebit: number;
  totalCredit: number;
  supplied: PartnerSupplySummary;
  phoneSettlement: PartnerSettlementSummary;
};

export type PartnerLedgerData = {
  items: PartnerLedgerEntry[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  account: PartnerAccountState;
};

export type PartnerPurchaseItem = {
  ref: string;
  type: "phone" | "product";
  name: string;
  quantity: number;
  unit: string;
  supplyAmount: number;
  purchaseDate: string | null;
  identifier: string | null;
  status: string | null;
  settlement: null | {
    code: "open" | "settled";
    label: string;
    amount: number;
    paidAmount: number;
    remainingAmount: number;
    lastPaymentDate: string | null;
  };
};

export type PartnerPurchasesData = {
  items: PartnerPurchaseItem[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PartnerPhoneData = {
  items: Array<{
    ref: string;
    name: string;
    identifier: string | null;
    status: string | null;
    purchaseDate: string | null;
    settlement: NonNullable<PartnerPurchaseItem["settlement"]>;
  }>;
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  summary: { total: number; amount: number; paidAmount: number; remainingAmount: number };
};

export type MiniAppAuthData = {
  sessionToken: string;
  expiresAt: string;
  identity: MiniAppIdentity;
  launch: {
    startParam: string | null;
    route: string;
  };
  telegram: {
    userId: string;
    firstName: string;
    startParam: string | null;
  };
};

export type MiniAppApiSuccess<T> = {
  success: true;
  data: T;
  requestId?: string;
};

export type MiniAppApiFailure = {
  success: false;
  code: string;
  message: string;
  requestId?: string;
};

export type StaffCapability =
  | "staff:executive:read"
  | "staff:sales_summary:read"
  | "staff:customer_lookup:read"
  | "staff:inventory_lookup:read"
  | "staff:installments:read"
  | "staff:invoice_lookup:read";

export type StaffHomeData = {
  today: { sales: number; grossProfit: number; transactions: number; averageSaleValue: number };
  financialPosition: { totalReceivables: number; debtorsCount: number };
  installments: { dueTodayCount: number; dueTodayAmount: number; overdueCount: number; overdueAmount: number };
  inventory: { activeItemsCount: number };
  month: { totalSales: number; phoneCashSales: number; installmentSales: number };
};

export type StaffDueItem = {
  paymentId: number;
  saleId: number;
  customerId: number;
  customerName: string;
  customerPhone: string;
  dueDate: string;
  remainingAmount: number;
  status: "overdue" | "today" | "upcoming";
  overdueDays: number;
};

export type StaffDueData = {
  scope: "overdue" | "today" | "next7";
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
  items: StaffDueItem[];
};

export type StaffPhoneListItem = {
  id: number; model: string; imei: string; color: string; storage: string; ram: string; status: string; salePrice: number;
};

export type StaffSearchData = {
  query: string;
  groups: {
    customers: Array<{ customerId: number; fullName: string; phoneNumber: string; balance: number; accountState: "debtor" | "creditor" | "settled"; accountStateLabel: string }>;
    phones: StaffPhoneListItem[];
    invoices: Array<{ invoiceRef: string; source: "order" | "legacy"; customer: string; date: string; total: number; paymentMethod: string; itemSummary: string }>;
    installments: Array<{ saleId: number; customerId: number; customerName: string; customerPhone: string; itemSummary: string; saleDate: string; actualSalePrice: number; status: string }>;
  };
};

export type StaffCustomerDetail = {
  customer: { customerId: number; fullName: string; phoneNumber: string; balance: number; accountState: "debtor" | "creditor" | "settled"; accountStateLabel: string };
  installments: { activeCount: number; overdueCount: number; nextDue: { saleId: number; dueDate: string; amount: number } | null };
  recentPurchases: Array<{ date: string; type: string; itemSummary: string; total: number; invoiceRef: string }>;
  recentLedger: Array<{ date: string; description: string; debit: number; credit: number; runningBalance: number }>;
};

export type StaffPhoneDetail = StaffPhoneListItem & {
  condition: string;
  purchasePrice: number;
  currentPurchasePrice: number;
  supplierName: string;
  purchaseDate: string;
  sale: null | { source: string; ref: string; date: string; customer: null | { id: number; fullName: string; phoneNumber: string } };
};

export type StaffInstallmentDetail = {
  saleId: number;
  customer: { id: number; fullName: string };
  saleDate: string;
  itemSummary: string;
  items: Array<{ description: string; quantity: number; unitPrice: number; total: number }>;
  actualSalePrice: number;
  downPayment: number;
  totalInstallmentCount: number;
  paidAmount: number;
  remainingAmount: number;
  paymentTimeline: Array<{ paymentId: number; installmentNumber: number; dueDate: string; amount: number; paidAmount: number; remainingAmount: number; paymentDate: string | null; status: "paid" | "overdue" | "today" | "upcoming" }>;
  checks: Array<{ checkId: number; bankName: string; dueDate: string; amount: number; status: string }>;
  status: string;
};

export type StaffInvoiceDetail = {
  ref: string;
  customer: null | { id: number; fullName: string; phoneNumber: string };
  date: string;
  paymentMethod: string;
  paymentMethodLabel: string;
  subtotal: number;
  discount: number;
  total: number;
  items: Array<{ id: number; description: string; quantity: number; unitPrice: number; discount: number; total: number }>;
  status: string;
};

export type StaffSalesSummary = {
  period: "today" | "week" | "month";
  from: string;
  to: string;
  totalRevenue: number;
  grossProfit: number;
  totalTransactions: number;
  averageSaleValue: number;
  topSellingItems: Array<{ id: number; itemType: string; itemName: string; totalRevenue: number; quantitySold: number }>;
};
