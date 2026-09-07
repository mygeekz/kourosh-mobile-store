import React from "react";
import { useParams } from "react-router-dom";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import type {
  ManagerPartnerAccountingBreakdownData,
  ManagerPartnerDetailData,
  PartnerLedgerData,
  PartnerPhoneData,
  PartnerPurchasesData,
} from "../types";

export const ManagerPartnerDetail: React.FC = () => {
  const { id } = useParams();
  const { canPermission } = useMiniAppPermissions();
  const canLedger = canPermission("partners.ledger.read");
  const canProfit = canPermission("profits.read");
  const detail = useMiniAppQuery<ManagerPartnerDetailData>(`/api/miniapp/manager/partners/${id}`);
  const purchases = useMiniAppQuery<PartnerPurchasesData>(`/api/miniapp/manager/partners/${id}/purchases?page=1&pageSize=10`, { availability: "secondary" });
  const ledger = useMiniAppQuery<PartnerLedgerData>(canLedger ? `/api/miniapp/manager/partners/${id}/ledger?page=1&pageSize=20` : "/api/miniapp/manager/me", { availability: "secondary" });
  const settlements = useMiniAppQuery<PartnerPhoneData>(canLedger ? `/api/miniapp/manager/partners/${id}/settlements?page=1&pageSize=10` : "/api/miniapp/manager/me", { availability: "secondary" });
  const accounting = useMiniAppQuery<ManagerPartnerAccountingBreakdownData>(canLedger && canProfit ? `/api/miniapp/manager/partners/${id}/accounting-breakdown` : "/api/miniapp/manager/me", { availability: "secondary" });

  if (!detail.data) return <MiniAppDataState loading={detail.loading} error={detail.error} retry={detail.retry} />;
  const d = detail.data;
  const account = d.account?.account;
  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4"><p className="m-0 text-xs font-bold text-primary">همکار #{d.partner.id.toLocaleString("fa-IR")}</p><h1 className="mb-0 mt-1 text-xl font-black">{d.partner.name}</h1><p className="mb-0 mt-2 text-xs text-mutedText">{d.partner.phoneNumber ? <MiniAppBidiText>{d.partner.phoneNumber}</MiniAppBidiText> : d.partner.type || "همکار فروشگاه"}</p></header>

      <section><h2 className="m-0 text-sm font-black">خلاصه همکاری</h2><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-[var(--radius-lg)] border border-border bg-card p-3"><span className="text-[11px] text-mutedText">تأمین ثبت‌شده</span><strong className="mt-1 block text-lg font-black">{d.supplied.total.toLocaleString("fa-IR")}</strong><small className="text-mutedText">{formatToman(d.supplied.totalSupplyAmount)}</small></div>{account ? <div className="rounded-[var(--radius-lg)] border border-border bg-card p-3"><span className="text-[11px] text-mutedText">مانده حساب</span><strong className={`mt-1 block text-lg font-black ${account.code === "creditor" ? "text-success" : account.code === "debtor" ? "text-danger" : "text-foreground"}`}>{formatToman(account.amount)}</strong><small className="text-mutedText">{account.label}</small></div> : null}</div></section>

      <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">خریدها و تأمین‌های اخیر</h2>{purchases.loading ? <MiniAppDataState loading /> : purchases.error ? <MiniAppDataState error={purchases.error} retry={purchases.retry} /> : purchases.data?.items.length ? <ul className="m-0 list-none divide-y divide-border p-0">{purchases.data.items.slice(0, 8).map((item) => <li key={item.ref} className="py-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block text-sm leading-6">{item.name}</strong><small className="mt-1 block text-mutedText">{item.purchaseDate ? formatCustomerDate(item.purchaseDate) : "بدون تاریخ"} · {item.quantity.toLocaleString("fa-IR")} {item.unit}</small></span><strong className="shrink-0 text-xs">{formatToman(item.supplyAmount)}</strong></div></li>)}</ul> : <MiniAppDataState empty emptyText="تأمینی ثبت نشده است." />}</section>

      {canLedger && d.phoneSettlement ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">تسویه‌ها</h2><dl className="m-0 grid grid-cols-2 gap-x-4 text-xs"><div className="border-b border-border py-3"><dt className="text-mutedText">باز</dt><dd className="m-0 mt-1 font-black">{d.phoneSettlement.open.toLocaleString("fa-IR")}</dd></div><div className="border-b border-border py-3"><dt className="text-mutedText">مانده تسویه</dt><dd className="m-0 mt-1 font-black">{formatToman(d.phoneSettlement.remainingAmount)}</dd></div></dl>{settlements.data?.items.length ? <ul className="m-0 list-none divide-y divide-border p-0">{settlements.data.items.slice(0, 5).map((item) => <li key={item.ref} className="py-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block text-sm">{item.name}</strong><small className="mt-1 block text-mutedText">{item.settlement.label}</small></span><strong className="shrink-0 text-xs">{formatToman(item.settlement.remainingAmount)}</strong></div></li>)}</ul> : null}</section> : null}

      {canLedger && canProfit ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">سهم و سود همکار</h2>{accounting.loading ? <MiniAppDataState loading /> : accounting.error ? <MiniAppDataState error={accounting.error} retry={accounting.retry} /> : accounting.data ? <><div className="grid grid-cols-2 gap-3 py-3 text-xs"><div><span className="text-mutedText">سهم سود ثبت‌شده</span><strong className="mt-1 block text-success">{formatToman(accounting.data.summary.profitShareAccrued)}</strong></div><div><span className="text-mutedText">تعداد تخصیص سود</span><strong className="mt-1 block">{accounting.data.summary.profitAllocationCount.toLocaleString("fa-IR")}</strong></div></div>{accounting.data.profitAllocations.length ? <ul className="m-0 list-none divide-y divide-border p-0">{accounting.data.profitAllocations.slice(0, 6).map((item) => <li key={item.id} className="flex items-start justify-between gap-3 py-3"><span className="min-w-0"><strong className="block text-sm">{item.itemDescription || item.allocationType}</strong><small className="mt-1 block text-mutedText">{item.sharePercent.toLocaleString("fa-IR")}٪{item.saleDate ? ` · ${formatCustomerDate(item.saleDate)}` : ""}</small></span><strong className="shrink-0 text-xs text-success">{formatToman(item.amount)}</strong></li>)}</ul> : null}</> : null}</section> : null}

      {canLedger ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">دفتر حساب و تراکنش‌ها</h2>{ledger.loading ? <MiniAppDataState loading /> : ledger.error ? <MiniAppDataState error={ledger.error} retry={ledger.retry} /> : ledger.data ? <ul className="m-0 list-none divide-y divide-border p-0">{ledger.data.items.map((item) => <li key={item.id} className="py-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block text-sm leading-6">{item.description}</strong><small className="mt-1 block text-mutedText">{formatCustomerDate(item.transactionDate)}</small></span><span className="shrink-0 text-end text-xs font-bold">{formatToman(item.debit || item.credit)}<small className="mt-1 block font-medium text-mutedText">مانده {formatToman(Math.abs(item.balance))}</small></span></div></li>)}</ul> : null}</section> : null}
    </div>
  );
};
