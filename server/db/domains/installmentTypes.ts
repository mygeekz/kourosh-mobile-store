// Phase 1H: installment shared types and status normalization extracted from legacyRuntime.ts.

export type CheckStatus =
  | "نزد فروشنده"
  | "در جریان وصول"
  | "نقد شد"
  | "برگشت خورد"
  | "به مشتری برگشت داده شده";

export type CheckOwnershipType = "buyer" | "third_party";

export const normalizeCheckStatus = (raw: any): CheckStatus => {
  const s = String(raw || "").trim();
  if (!s || s === "نزد مشتری") return "نزد فروشنده";
  if (["نقد شد", "نقدشده", "وصول شده", "پاس شده", "تسویه شده", "پرداخت شده", "تکمیل شده", "paid", "Paid", "cashed", "Cashed"].includes(s)) return "نقد شد";
  if (["برگشت خورد", "برگشت خورده"].includes(s)) return "برگشت خورد";
  if (["به مشتری برگشت داده شده", "باطل شده"].includes(s)) return "به مشتری برگشت داده شده";
  if (s === "در جریان وصول") return "در جریان وصول";
  return "نزد فروشنده";
};

export type InstallmentPaymentStatus =
  | "پرداخت نشده"
  | "پرداخت جزئی"
  | "پرداخت شده"
  | "دیرکرد";

export interface InstallmentCheckInfo {
  id?: number;
  checkNumber: string;
  bankName: string;
  ownershipType?: CheckOwnershipType | null;
  issuerName?: string | null;
  issuerNationalCode?: string | null;
  sayadiId?: string | null;
  dueDate: string;
  amount: number;
  status: CheckStatus;
  cashPaid?: number;
  cashRemaining?: number;
  cashPaymentId?: number | null;
  cashTransactions?: Array<{
    id?: number;
    amount_paid?: number;
    amountPaid?: number;
    payment_date?: string;
    paymentDate?: string;
    notes?: string;
  }>;
}

export interface InstallmentSalePayload {
  customerId: number;
  buyerNationalCode?: string | null;
  phoneId?: number | null;
  actualSalePrice: number;
  downPayment: number;
  numberOfInstallments: number;
  installmentAmount: number;
  installmentsStartDate: string;
  saleDate?: string | null;
  saleType?: "installment" | "check";
  phones?: Array<{ phoneId: number; sellPrice: number; buyPrice?: number; title?: string; imei?: string }>;
  accessories?: Array<{ productId: number; qty: number; sellPrice: number; buyPrice?: number; name?: string }>;
  services?: Array<{ serviceId: number; qty: number; sellPrice: number; name?: string }>;
  phoneIds?: number[];
  meta?: unknown;
  checks: InstallmentCheckInfo[];
  notes?: string;
}
