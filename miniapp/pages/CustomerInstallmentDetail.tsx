import React, { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatCustomerDate, formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerInstallmentDetail } from "../types";

const timelineLabel: Record<CustomerInstallmentDetail["timeline"][number]["state"], string> = {
  paid: "پرداخت‌شده",
  due: "سررسید امروز",
  upcoming: "آینده",
  overdue: "عقب‌افتاده",
};

const timelineTone = (state: CustomerInstallmentDetail["timeline"][number]["state"]) =>
  state === "paid" ? "text-success" : state === "overdue" ? "text-danger" : state === "due" ? "text-warning" : "text-mutedText";

export const CustomerInstallmentDetailPage: React.FC = () => {
  const { saleId = "" } = useParams();
  const [searchParams] = useSearchParams();
  const requestedPaymentId = Number(searchParams.get("paymentId") || 0);
  const highlightedPaymentRef = useRef<HTMLLIElement | null>(null);
  const query = useMiniAppQuery<CustomerInstallmentDetail>(`/api/miniapp/customer/installments/${encodeURIComponent(saleId)}`);
  const hasMatchingPayment = Boolean(
    query.data && Number.isSafeInteger(requestedPaymentId) && requestedPaymentId > 0 &&
      query.data.timeline.some((payment) => payment.id === requestedPaymentId),
  );
  useEffect(() => {
    if (hasMatchingPayment) highlightedPaymentRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [hasMatchingPayment]);
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const sale = query.data;
  return (
    <section aria-labelledby="installment-detail-title">
      <p className="m-0 text-xs font-extrabold text-primary">قرارداد شماره {sale.id.toLocaleString("fa-IR")}</p>
      <h1 id="installment-detail-title" className="mb-1 mt-1 text-xl font-black leading-9">{sale.itemsSummary}</h1>
      <p className="m-0 text-sm text-mutedText">تاریخ فروش {formatCustomerDate(sale.saleDate)}</p>

      <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-4 rounded-[var(--radius-lg)] border border-border bg-card p-4 text-xs">
        <div><dt className="text-mutedText">مبلغ کل</dt><dd className="m-0 mt-1 text-sm font-black tabular-nums">{formatToman(sale.totalAmount)}</dd></div>
        <div><dt className="text-mutedText">پیش‌پرداخت</dt><dd className="m-0 mt-1 text-sm font-black tabular-nums">{formatToman(sale.downPayment)}</dd></div>
        <div><dt className="text-mutedText">پرداخت‌شده</dt><dd className="m-0 mt-1 text-sm font-black tabular-nums text-success">{formatToman(sale.collectedAmount)}</dd></div>
        <div><dt className="text-mutedText">مانده</dt><dd className="m-0 mt-1 text-sm font-black tabular-nums">{formatToman(sale.remainingAmount)}</dd></div>
      </dl>

      {sale.items.length ? <section className="mt-6"><h2 className="m-0 border-b border-border pb-3 text-base font-black">اقلام قرارداد</h2><ul className="m-0 list-none divide-y divide-border p-0">{sale.items.map((item, index) => <li key={`${item.description}-${index}`} className="flex items-start justify-between gap-4 py-3 text-sm"><span>{item.description}<small className="block text-xs text-mutedText">تعداد {item.quantity.toLocaleString("fa-IR")}</small></span><strong className="shrink-0 tabular-nums">{formatToman(item.totalPrice)}</strong></li>)}</ul></section> : null}

      <section className="mt-6" aria-labelledby="timeline-title">
        <h2 id="timeline-title" className="m-0 border-b border-border pb-3 text-base font-black">زمان‌بندی پرداخت</h2>
        <MiniAppDataState empty={!sale.timeline.length && !sale.checks.length} emptyText="زمان‌بندی پرداختی ثبت نشده است." />
        <ol className="m-0 list-none divide-y divide-border p-0">
          {sale.timeline.map((payment) => (
            <li
              key={payment.id}
              ref={hasMatchingPayment && payment.id === requestedPaymentId ? highlightedPaymentRef : undefined}
              className={`flex items-start justify-between gap-4 py-4 ${hasMatchingPayment && payment.id === requestedPaymentId ? "rounded-[var(--radius-md)] bg-primary/10 px-3 ring-1 ring-primary/30" : ""}`}
            >
              <div><strong className="block text-sm">قسط {payment.installmentNumber.toLocaleString("fa-IR")}</strong><span className="mt-1 block text-xs text-mutedText">سررسید {formatCustomerDate(payment.dueDate)}</span><span className={`mt-1 block text-xs font-bold ${timelineTone(payment.state)}`}>{timelineLabel[payment.state]}</span></div>
              <div className="text-left"><strong className="block text-sm tabular-nums">{formatToman(payment.amount)}</strong>{payment.remainingAmount > 0 && payment.paidAmount > 0 ? <span className="mt-1 block text-xs text-mutedText">مانده {formatToman(payment.remainingAmount)}</span> : null}</div>
            </li>
          ))}
          {sale.checks.map((check) => (
            <li key={`check-${check.id}`} className="flex items-start justify-between gap-4 py-4"><div><strong className="block text-sm">چک {check.bankName || "قرارداد"}</strong><span className="mt-1 block text-xs text-mutedText">سررسید {formatCustomerDate(check.dueDate)}</span><span className="mt-1 block text-xs font-bold text-secondaryText">{check.status}</span></div><strong className="text-sm tabular-nums">{formatToman(check.amount)}</strong></li>
          ))}
        </ol>
      </section>
    </section>
  );
};
