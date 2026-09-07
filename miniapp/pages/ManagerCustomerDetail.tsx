import React from "react";
import { Link, useParams } from "react-router-dom";
import { MiniAppBidiText } from "../components/MiniAppBidiText";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { useMiniAppPermissions } from "../permission/MiniAppPermissionContext";
import type {
  CustomerInstallmentSummary,
  ManagerCustomerDetailData,
  ManagerCustomerLedgerData,
  ManagerCustomerPurchasesData,
} from "../types";

export const ManagerCustomerDetail: React.FC = () => {
  const { id } = useParams();
  const { canPermission } = useMiniAppPermissions();
  const canLedger = canPermission("customers.ledger.read");
  const canInstallments = canPermission("installments.read");
  const detail = useMiniAppQuery<ManagerCustomerDetailData>(`/api/miniapp/manager/customers/${id}`);
  const purchases = useMiniAppQuery<ManagerCustomerPurchasesData>(`/api/miniapp/manager/customers/${id}/purchases?page=1&pageSize=10`, { availability: "secondary" });
  const ledger = useMiniAppQuery<ManagerCustomerLedgerData>(canLedger ? `/api/miniapp/manager/customers/${id}/ledger?page=1&pageSize=20` : "/api/miniapp/manager/me", { availability: "secondary" });
  const installments = useMiniAppQuery<CustomerInstallmentSummary[]>(canInstallments ? `/api/miniapp/manager/customers/${id}/installments` : "/api/miniapp/manager/me", { availability: "secondary" });

  if (!detail.data) return <MiniAppDataState loading={detail.loading} error={detail.error} retry={detail.retry} />;
  const d = detail.data;
  const account = d.account?.account;
  return (
    <div className="space-y-6">
      <header className="border-b border-border pb-4">
        <p className="m-0 text-xs font-bold text-primary">مشتری #{d.customer.id.toLocaleString("fa-IR")}</p>
        <h1 className="mb-0 mt-1 text-xl font-black">{d.customer.fullName}</h1>
        <p className="mb-0 mt-2 text-xs text-mutedText">{d.customer.phoneNumber ? <MiniAppBidiText>{d.customer.phoneNumber}</MiniAppBidiText> : "شماره تماس ثبت نشده"}</p>
      </header>

      {account ? <section><h2 className="m-0 text-sm font-black">حساب مشتری</h2><div className="mt-3 grid grid-cols-2 gap-3"><div className="rounded-[var(--radius-lg)] border border-border bg-card p-3"><span className="text-[11px] text-mutedText">مانده فعلی</span><strong className={`mt-1 block text-lg font-black ${account.code === "debtor" ? "text-danger" : account.code === "creditor" ? "text-success" : "text-foreground"}`}>{formatToman(account.amount)}</strong><small className="text-mutedText">{account.label}</small></div><div className="rounded-[var(--radius-lg)] border border-border bg-card p-3"><span className="text-[11px] text-mutedText">کل پرداخت / بستانکار</span><strong className="mt-1 block text-lg font-black">{formatToman(d.account?.totalCredit || 0)}</strong></div></div></section> : null}

      {(d.purchases || d.installments) ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">خلاصه فعالیت</h2><dl className="m-0 grid grid-cols-2 gap-x-4 text-xs">{d.purchases ? <><div className="border-b border-border py-3"><dt className="text-mutedText">تعداد خرید</dt><dd className="m-0 mt-1 font-black">{d.purchases.count.toLocaleString("fa-IR")}</dd></div><div className="border-b border-border py-3"><dt className="text-mutedText">جمع خرید</dt><dd className="m-0 mt-1 font-black">{formatToman(d.purchases.totalAmount)}</dd></div></> : null}{d.installments ? <><div className="border-b border-border py-3"><dt className="text-mutedText">اقساط فعال</dt><dd className="m-0 mt-1 font-black">{d.installments.activeCount.toLocaleString("fa-IR")}</dd></div><div className="border-b border-border py-3"><dt className="text-mutedText">معوق</dt><dd className="m-0 mt-1 font-black text-danger">{d.installments.overdueCount.toLocaleString("fa-IR")}</dd></div></> : null}</dl></section> : null}

      <section>
        <h2 className="m-0 border-b border-border pb-2 text-sm font-black">فروش‌ها و خریدهای اخیر</h2>
        {purchases.loading ? <MiniAppDataState loading /> : purchases.error ? <MiniAppDataState error={purchases.error} retry={purchases.retry} /> : purchases.data?.items.length ? <ul className="m-0 list-none divide-y divide-border p-0">{purchases.data.items.slice(0, 8).map((item) => <li key={item.ref} className="py-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block text-sm leading-6">{item.itemsSummary}</strong><small className="mt-1 block text-mutedText">{formatCustomerDate(item.transactionDate)} · {item.purchaseTypeLabel}</small></span><strong className="shrink-0 text-xs">{formatToman(item.totalAmount)}</strong></div></li>)}</ul> : <MiniAppDataState empty emptyText="خریدی ثبت نشده است." />}
      </section>

      {canInstallments ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">اقساط فعال</h2>{installments.loading ? <MiniAppDataState loading /> : installments.error ? <MiniAppDataState error={installments.error} retry={installments.retry} /> : installments.data?.length ? <ul className="m-0 list-none divide-y divide-border p-0">{installments.data.slice(0, 8).map((item) => <li key={item.id}><Link to={`/installments/${item.id}`} className="flex items-start justify-between gap-3 py-3 text-foreground no-underline"><span className="min-w-0"><strong className="block truncate text-sm">{item.itemsSummary}</strong><small className="mt-1 block text-mutedText">{item.overdueCount ? `${item.overdueCount.toLocaleString("fa-IR")} قسط معوق` : item.nextDueDate ? `سررسید بعدی ${formatCustomerDate(item.nextDueDate)}` : item.status}</small></span><strong className={`shrink-0 text-xs ${item.overdueCount ? "text-danger" : ""}`}>{formatToman(item.remainingAmount)}</strong></Link></li>)}</ul> : <MiniAppDataState empty emptyText="قسط فعالی ثبت نشده است." />}</section> : null}

      {canLedger ? <section><h2 className="m-0 border-b border-border pb-2 text-sm font-black">دفتر حساب و تراکنش‌ها</h2>{ledger.loading ? <MiniAppDataState loading /> : ledger.error ? <MiniAppDataState error={ledger.error} retry={ledger.retry} /> : ledger.data ? <><div className="grid grid-cols-2 gap-3 py-3 text-xs"><div><span className="text-mutedText">کل بدهکار</span><strong className="mt-1 block">{formatToman(ledger.data.summary?.totalDebit || 0)}</strong></div><div><span className="text-mutedText">کل پرداخت</span><strong className="mt-1 block">{formatToman(ledger.data.summary?.totalCredit || 0)}</strong></div></div><ul className="m-0 list-none divide-y divide-border p-0">{ledger.data.items.map((item) => <li key={item.id} className="py-3"><div className="flex items-start justify-between gap-3"><span className="min-w-0"><strong className="block text-sm leading-6">{item.description}</strong><small className="mt-1 block text-mutedText">{formatCustomerDate(item.transactionDate)}</small></span><span className="shrink-0 text-end text-xs font-bold">{formatToman(item.debit || item.credit)}<small className="mt-1 block font-medium text-mutedText">مانده {formatToman(Math.abs(item.balance))}</small></span></div></li>)}</ul></> : null}</section> : null}
    </div>
  );
};
