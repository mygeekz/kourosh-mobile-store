import type { MiniAppIdentity } from "./miniAppSession.js";
import {
  isMiniAppStaffRole,
  resolveMiniAppStaffCapabilities,
} from "../security/miniAppStaffAccessPolicy.js";

export type MiniAppIdentityRecord = {
  id: number;
  displayName?: string | null;
  roleName?: string | null;
};

export type MiniAppIdentityLookup = {
  findCustomerIdentities: (telegramUserId: string) => Promise<MiniAppIdentityRecord[]>;
  findPartnerIdentities: (telegramUserId: string) => Promise<MiniAppIdentityRecord[]>;
  findStaffIdentities?: (telegramUserId: string) => Promise<MiniAppIdentityRecord[]>;
};

const CUSTOMER_CAPABILITIES = [
  "customer:read_own",
  "customer:account:read_own",
  "customer:installments:read_own",
  "customer:invoices:read_own",
] as const;

const PARTNER_CAPABILITIES = [
  "partner:read_own",
  "partner:ledger:read_own",
  "partner:purchases:read_own",
  "partner:phones:read_own",
] as const;

export class MiniAppIdentityResolutionError extends Error {
  readonly code = "MINIAPP_IDENTITY_AMBIGUOUS";

  constructor() {
    super("این حساب تلگرام به بیش از یک پرونده متصل است. با مدیر سیستم تماس بگیرید.");
    this.name = "MiniAppIdentityResolutionError";
  }
}

const uniqueById = (records: MiniAppIdentityRecord[]): MiniAppIdentityRecord[] => {
  const byId = new Map<number, MiniAppIdentityRecord>();
  for (const record of records || []) {
    const id = Number(record?.id || 0);
    if (!Number.isInteger(id) || id <= 0 || byId.has(id)) continue;
    const normalized: MiniAppIdentityRecord = { id, displayName: record.displayName || null };
    if (record.roleName) normalized.roleName = record.roleName;
    byId.set(id, normalized);
  }
  return [...byId.values()];
};

export const createMiniAppIdentityResolver = (
  lookup: MiniAppIdentityLookup,
) => async (telegramUserId: string): Promise<MiniAppIdentity | null> => {
  const staff = uniqueById(await (lookup.findStaffIdentities?.(telegramUserId) ?? Promise.resolve([])));
  if (staff.length > 1) throw new MiniAppIdentityResolutionError();
  if (staff[0]) {
    const roleName = staff[0].roleName;
    if (!isMiniAppStaffRole(roleName)) return null;
    return {
      kind: "staff",
      subjectId: staff[0].id,
      displayName: String(staff[0].displayName || "کاربر کوروش"),
      telegramUserId,
      roleName,
      capabilities: [...resolveMiniAppStaffCapabilities(roleName)],
    };
  }
  const [customerRecords, partnerRecords] = await Promise.all([
    lookup.findCustomerIdentities(telegramUserId),
    lookup.findPartnerIdentities(telegramUserId),
  ]);
  const customers = uniqueById(customerRecords);
  const partners = uniqueById(partnerRecords);

  if (customers.length > 1 || partners.length > 1 || (customers.length && partners.length)) {
    throw new MiniAppIdentityResolutionError();
  }

  const customer = customers[0];
  if (customer) {
    return {
      kind: "customer",
      subjectId: customer.id,
      displayName: String(customer.displayName || "مشتری کوروش"),
      telegramUserId,
      capabilities: [...CUSTOMER_CAPABILITIES],
    };
  }

  const partner = partners[0];
  if (partner) {
    return {
      kind: "partner",
      subjectId: partner.id,
      displayName: String(partner.displayName || "همکار کوروش"),
      telegramUserId,
      capabilities: [...PARTNER_CAPABILITIES],
    };
  }
  return null;
};
