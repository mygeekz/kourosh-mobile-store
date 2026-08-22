import { customersRepo } from "../repositories/customers.repo";
import { AppError } from "../errors";
import { getInstallmentCustomerLedgerReconciliationStatus } from "../db/domains/installmentLedger.db";


const normalizeDigits = (value: unknown) => String(value ?? "")
  .replace(/[۰-۹]/g, (digit) => "0123456789"["۰۱۲۳۴۵۶۷۸۹".indexOf(digit)] || digit)
  .replace(/[٠-٩]/g, (digit) => "0123456789"["٠١٢٣٤٥٦٧٨٩".indexOf(digit)] || digit);

const normalizeCustomerPhone = (value: unknown): string | null => {
  let phone = normalizeDigits(value).trim();
  if (!phone) return null;
  phone = phone.replace(/[\s\-().]/g, "");
  if (phone.startsWith("0098")) phone = `0${phone.slice(4)}`;
  else if (phone.startsWith("+98")) phone = `0${phone.slice(3)}`;
  else if (phone.startsWith("98") && phone.length === 12) phone = `0${phone.slice(2)}`;
  if (!/^\d{10,15}$/.test(phone)) {
    throw new AppError("شماره تماس باید بین ۱۰ تا ۱۵ رقم باشد.", 400);
  }
  return phone;
};

const normalizeCustomerNationalCode = (value: unknown): string | null => {
  const nationalCode = normalizeDigits(value).replace(/\D/g, "");
  if (!nationalCode) return null;
  if (!/^\d{10}$/.test(nationalCode)) {
    throw new AppError("کد ملی مشتری باید دقیقاً ۱۰ رقم باشد.", 400);
  }
  return nationalCode;
};

const normalizeCustomerPayload = (payload: any) => {
  const fullName = String(payload?.fullName || "").trim().replace(/\s+/g, " ");
  const address = String(payload?.address || "").trim();
  const notes = String(payload?.notes || "").trim();
  const telegramChatId = String(payload?.telegramChatId || "").trim();

  if (!fullName) throw new AppError("نام کامل مشتری الزامی است.", 400);
  if (fullName.length > 120) throw new AppError("نام کامل مشتری نباید بیشتر از ۱۲۰ کاراکتر باشد.", 400);
  if (address.length > 700) throw new AppError("آدرس مشتری نباید بیشتر از ۷۰۰ کاراکتر باشد.", 400);
  if (notes.length > 2000) throw new AppError("یادداشت مشتری نباید بیشتر از ۲۰۰۰ کاراکتر باشد.", 400);
  if (telegramChatId.length > 120) throw new AppError("شناسه تلگرام مشتری نامعتبر است.", 400);

  return {
    fullName,
    nationalCode: normalizeCustomerNationalCode(payload?.nationalCode),
    phoneNumber: normalizeCustomerPhone(payload?.phoneNumber),
    address: address || null,
    notes: notes || null,
    telegramChatId: telegramChatId || null,
  };
};

const customerDependencyLabels: Record<string, string> = {
  ledgerEntries: "رکورد دفتر حساب",
  installmentSales: "فروش اقساطی",
  repairs: "پرونده تعمیر",
  salesOrders: "سفارش فروش",
  salesTransactions: "تراکنش فروش",
  salesReturns: "مرجوعی فروش",
  invoices: "فاکتور",
  followups: "پیگیری",
  managerNotes: "یادداشت مدیریتی",
  telegramLinkTokens: "درخواست اتصال تلگرام",
  reminderCaps: "سابقه محدودیت یادآوری",
  notificationOutbox: "پیام صف ارسال",
  customerScores: "سابقه امتیاز اعتباری",
};

const normalizeCustomerPurchase = (row: any) => {
  const rawName = String(row?.itemName || "").trim();
  const imeiMatch = rawName.match(
    /(?:\(|\[|\{|\s|^)IMEI[:：\-\s]*([0-9A-Za-z\-_.]+)(?:\)|\]|\}|\s|$)/i,
  );
  const parenthesizedImei = rawName.match(
    /[\(\[\{]\s*([0-9A-Za-z\-_.]{10,20})\s*[\)\]\}]/,
  );
  const imei = String(
    row?.imei ||
      row?.identifier ||
      imeiMatch?.[1] ||
      "" ||
      parenthesizedImei?.[1] ||
      "",
  ).trim();
  const cleanName = rawName
    .replace(
      /\s*[\(\[\{]?\s*IMEI[:：\-\s]*[0-9A-Za-z\-_.]+\s*[\)\]\}]?/gi,
      "",
    )
    .replace(/\s*[\(\[\{]\s*[0-9A-Za-z\-_.]{10,20}\s*[\)\]\}]\s*/g, " ")
    .replace(/\s*[-–—|:،,]\s*IMEI[:：\-\s]*[0-9A-Za-z\-_.]+/gi, "")
    .replace(/\s{2,}/g, " ")
    .trim();
  const method = String(row?.saleType || row?.paymentMethod || "").toLowerCase();
  const purchaseType =
    method === "installment" ? "installment" : method === "credit" ? "credit" : "cash";
  const purchaseTypeLabel =
    purchaseType === "installment" ? "اقساطی" : purchaseType === "credit" ? "اعتباری" : "نقدی";
  return {
    ...row,
    itemName: cleanName || rawName || "—",
    imei,
    purchaseType,
    purchaseTypeLabel,
  };
};

export const customersService = {
  createCustomer: async (payload: any, user?: any) => {
    let created: any;
    try {
      created = await customersRepo.createCustomer(normalizeCustomerPayload(payload));
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.includes("شماره تماس") && message.includes("قبلا")) throw new AppError(message, 409);
      throw error;
    }
    try {
      await customersRepo.addCustomerAuditLog({
        userId: user?.id,
        username: user?.username,
        roleName: user?.roleName,
        action: "create",
        customerId: Number(created?.id || 0),
        description: `ثبت مشتری ${created?.fullName || "جدید"}`,
      });
    } catch {}
    return created;
  },

  updateCustomer: async (id: number, payload: any, user?: any) => {
    if (!Number.isInteger(id) || id <= 0) throw new AppError("شناسه مشتری نامعتبر است.", 400);
    const existing = await customersRepo.getCustomerById(id);
    if (!existing) throw new AppError("مشتری یافت نشد.", 404);
    let updated: any;
    try {
      updated = await customersRepo.updateCustomer(id, normalizeCustomerPayload({ ...existing, ...payload }));
    } catch (error: any) {
      const message = String(error?.message || "");
      if (message.includes("شماره تماس") && message.includes("قبلا")) throw new AppError(message, 409);
      throw error;
    }
    try {
      await customersRepo.addCustomerAuditLog({
        userId: user?.id,
        username: user?.username,
        roleName: user?.roleName,
        action: "update",
        customerId: id,
        description: `ویرایش اطلاعات مشتری ${updated?.fullName || existing?.fullName || id}`,
      });
    } catch {}
    return updated;
  },

  updateCustomerTags: async (id: number, tags: any[], user?: any) => {
    const cleanTags = Array.isArray(tags) ? tags : [];
    const updated = await customersRepo.updateCustomerTags(id, cleanTags);
    if (user) {
      try {
        await customersRepo.addCustomerAuditLog({
          userId: user.id,
          username: user.username,
          roleName: user.roleName,
          action: "update",
          customerId: id,
          description: "ویرایش تگ‌های مشتری",
        });
      } catch {}
    }
    return updated;
  },

  deleteCustomer: async (id: number, user?: any) => {
    if (!Number.isInteger(id) || id <= 0) throw new AppError("شناسه مشتری نامعتبر است.", 400);
    const existing = await customersRepo.getCustomerById(id);
    if (!existing) throw new AppError("مشتری یافت نشد.", 404);

    const dependencies = await customersRepo.getCustomerDeleteDependencies(id);
    const activeDependencies = Object.entries(dependencies)
      .filter(([, count]) => Number(count) > 0)
      .map(([key, count]) => `${Number(count).toLocaleString("fa-IR")} ${customerDependencyLabels[key] || key}`);
    if (activeDependencies.length) {
      throw new AppError(
        `حذف مشتری به‌دلیل وجود سوابق وابسته مجاز نیست: ${activeDependencies.join("، ")}. برای حفظ سوابق مالی و عملیاتی، پرونده را نگه دارید.`,
        409,
      );
    }

    const deleted = await customersRepo.deleteCustomer(id);
    if (!deleted) throw new AppError("مشتری یافت نشد.", 404);
    try {
      await customersRepo.addCustomerAuditLog({
        userId: user?.id,
        username: user?.username,
        roleName: user?.roleName,
        action: "delete",
        customerId: id,
        description: `حذف پرونده بدون سابقه مشتری ${existing?.fullName || id}`,
      });
    } catch {}
    return true;
  },

  listCustomers: (filters?: { q?: string; limit?: number; id?: number; offset?: number }) =>
    filters && (filters.q || filters.limit || filters.id)
      ? customersRepo.searchCustomersWithBalance(filters)
      : customersRepo.listCustomersWithBalance(),

  listCustomersDirectory: (query: Parameters<typeof customersRepo.listCustomersDirectory>[0]) =>
    customersRepo.listCustomersDirectory(query),

  listCustomerLedgerDirectory: (id: number, query: Parameters<typeof customersRepo.listCustomerLedgerDirectory>[1]) =>
    customersRepo.listCustomerLedgerDirectory(id, query),

  getCustomerProfileBundle: async (id: number, options: { includeLedger?: boolean } = {}) => {
    const profile = await customersRepo.getCustomerById(id);
    if (!profile) return null;

    let ledgerReconciliation: Awaited<ReturnType<typeof getInstallmentCustomerLedgerReconciliationStatus>> | undefined;
    try {
      ledgerReconciliation = await getInstallmentCustomerLedgerReconciliationStatus(id);
    } catch (error) {
      console.error(`Customer installment ledger reconciliation failed for #${id}:`, error);
    }
    const ledger = options.includeLedger === false ? [] : await customersRepo.getCustomerLedger(id);
    const followups = await customersRepo.listCustomerFollowups(id);
    const legacyHistory = await customersRepo.listLegacyPurchaseHistory(id);
    const orderHistory = await customersRepo.listSalesOrderHistory(id);
    const installmentHistory = await customersRepo.listInstallmentHistory(id);
    const purchaseHistory = [
      ...legacyHistory,
      ...orderHistory,
      ...installmentHistory,
    ]
      .map(normalizeCustomerPurchase)
      .sort(
        (a: any, b: any) =>
          String(b.transactionDate || "").localeCompare(
            String(a.transactionDate || ""),
          ) || Number(b.id || 0) - Number(a.id || 0),
      );

    return { profile, ledger, followups, purchaseHistory, ledgerReconciliation };
  },

  getCustomerLedgerInsights: async (id: number) => {
    const profile = await customersRepo.getCustomerById(id);
    if (!profile) return { found: false, insights: null };
    return {
      found: true,
      insights: await customersRepo.getCustomerLedgerInsights(id),
    };
  },

  listCustomerFollowups: (id: number) => customersRepo.listCustomerFollowups(id),

  listCustomerManagerNotes: async (id: number) => {
    const customer = await customersRepo.getCustomerById(id).catch(() => null as any);
    if (!customer) return null;
    return customersRepo.listCustomerManagerNotes(id);
  },

  createCustomerFollowup: (customerId: number, body: any, user: any) =>
    customersRepo.createCustomerFollowup(customerId, {
      note: body?.note,
      nextFollowupDate: body?.nextFollowupDate ?? null,
      createdByUserId: user?.id,
      createdByUsername: user?.username,
    }),

  closeCustomerFollowup: (customerId: number, followupId: number) =>
    customersRepo.closeCustomerFollowup(customerId, followupId),

  updateCustomerFollowup: (customerId: number, followupId: number, body: any) =>
    customersRepo.updateCustomerFollowup(customerId, followupId, body || {}),

  createCustomerManagerNote: async (input: {
    customerId: number;
    context: string;
    note: string;
    user?: any;
  }) => {
    const customer = await customersRepo
      .getCustomerById(input.customerId)
      .catch(() => null as any);
    if (!customer) return null;

    const row = await customersRepo.createCustomerManagerNote({
      customerId: input.customerId,
      context: input.context,
      note: input.note,
      userId: input.user?.id || null,
      username: input.user?.username || null,
      roleName: input.user?.roleName || null,
    });

    try {
      await customersRepo.addCustomerAuditLog({
        userId: input.user?.id,
        username: input.user?.username,
        roleName: input.user?.roleName,
        action: "create",
        customerId: input.customerId,
        description: `ثبت یادداشت مدیریتی: ${input.context || "یادداشت"}`,
      });
    } catch {}

    return row;
  },

  deleteCustomerManagerNote: async (input: {
    customerId: number;
    noteId: number;
    user?: any;
  }) => {
    const result = await customersRepo.deleteCustomerManagerNote(
      input.customerId,
      input.noteId,
    );

    if (!result.changes) return { deleted: false };

    try {
      await customersRepo.addCustomerAuditLog({
        userId: input.user?.id,
        username: input.user?.username,
        roleName: input.user?.roleName,
        action: "delete",
        customerId: input.customerId,
        description: `حذف یادداشت مدیریتی #${input.noteId}`,
      });
    } catch {}

    return { deleted: true, data: { id: input.noteId, customerId: input.customerId } };
  },

  createCustomerLedgerEntry: async (input: {
    customerId: number;
    payload: any;
    user?: any;
    notifyCustomer?: (
      topic: string,
      customerId: number,
      channel: "sms" | "telegram" | "both",
      variables?: Record<string, any>,
    ) => Promise<any>;
  }) => {
    const data = await customersRepo.addCustomerLedgerEntry(
      input.customerId,
      input.payload,
    );

    try {
      await input.notifyCustomer?.(
        "ACCOUNT_BALANCE_STATUS",
        input.customerId,
        "both",
      );
      const desc = String(input.payload?.description || "");
      const debit = Number(input.payload?.debit || 0);
      const credit = Number(input.payload?.credit || 0);
      const m = desc.match(/(?:فاکتور|invoice)\s*#?\s*(\d+)/i);
      if ((credit > 0 || debit > 0) && /فاکتور|invoice/i.test(desc)) {
        await input.notifyCustomer?.(
          "INVOICE_PAYMENT_RECEIVED",
          input.customerId,
          "both",
          {
            customerId: input.customerId,
            invoiceNo: m?.[1] || "—",
            amount: credit || debit,
          },
        );
      }
    } catch {}

    try {
      if (input.user) {
        customersRepo.addCustomerLedgerAuditLog({
          userId: input.user.id,
          username: input.user.username,
          roleName: input.user.roleName,
          action: "create",
          customerId: input.customerId,
          description: `ثبت رکورد دفتر مشتری #${data?.id || "—"}`,
        });
      }
    } catch {}

    return data;
  },

  updateCustomerLedgerEntry: async (input: {
    customerId: number;
    entryId: number;
    payload: any;
    user?: any;
    notifyCustomer?: (
      topic: string,
      customerId: number,
      channel: "sms" | "telegram" | "both",
      variables?: Record<string, any>,
    ) => Promise<any>;
  }) => {
    const data = await customersRepo.updateCustomerLedgerEntry(
      input.customerId,
      input.entryId,
      input.payload,
    );

    try {
      await input.notifyCustomer?.(
        "ACCOUNT_BALANCE_STATUS",
        input.customerId,
        "both",
      );
    } catch {}

    try {
      if (input.user) {
        customersRepo.addCustomerLedgerAuditLog({
          userId: input.user.id,
          username: input.user.username,
          roleName: input.user.roleName,
          action: "update",
          customerId: input.customerId,
          description: `ویرایش رکورد دفتر مشتری #${data?.id || input.entryId}`,
        });
      }
    } catch {}

    return data;
  },

  deleteCustomerLedgerEntry: async (input: {
    customerId: number;
    entryId: number;
    user?: any;
    notifyCustomer?: (
      topic: string,
      customerId: number,
      channel: "sms" | "telegram" | "both",
      variables?: Record<string, any>,
    ) => Promise<any>;
  }) => {
    const ok = await customersRepo.deleteCustomerLedgerEntry(
      input.customerId,
      input.entryId,
    );

    try {
      await input.notifyCustomer?.(
        "ACCOUNT_BALANCE_STATUS",
        input.customerId,
        "both",
      );
    } catch {}

    try {
      if (input.user) {
        customersRepo.addCustomerLedgerAuditLog({
          userId: input.user.id,
          username: input.user.username,
          roleName: input.user.roleName,
          action: "delete",
          customerId: input.customerId,
          description: `حذف رکورد دفتر مشتری #${input.entryId}`,
        });
      }
    } catch {}

    return ok;
  },

 };
