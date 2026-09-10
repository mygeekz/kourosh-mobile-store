import React, { useEffect, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppPill } from "../components/MiniAppVisualPrimitives";
import { CustomerAmount, CustomerCard, CustomerList, CustomerPage, CustomerQueryState, CustomerRecord, CustomerSection } from "../components/customer/CustomerUI";
import { formatCustomerDate } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { CustomerInstallmentDetail } from "../types";

const timelineLabel: Record<CustomerInstallmentDetail["timeline"][number]["state"], string> = {
  paid: "پرداخت‌شده", due: "سررسید امروز", upcoming: "آینده", overdue: "عقب‌افتاده",
};
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
  const sale = query.data;
  return <CustomerPage id="installment-detail-title" title={sale?.itemsSummary || "جزئیات قرارداد"} description={sale ? `قرارداد ${sale.id.toLocaleString("fa-IR")} · تاریخ فروش ${formatCustomerDate(sale.saleDate)}` : undefined}>
    <CustomerQueryState query={query}>{sale && <>
      <div><MiniAppPill>{sale.status}</MiniAppPill></div>
      <CustomerSection title="خلاصه قرارداد"><CustomerCard>
        <CustomerAmount label="مبلغ کل" value={sale.totalAmount} field="totalAmount" /><CustomerAmount label="پیش‌پرداخت" value={sale.downPayment} field="downPayment" /><CustomerAmount label="پرداخت‌شده ثبت‌شده" value={sale.collectedAmount} field="collectedAmount" /><CustomerAmount label="مانده قرارداد" value={sale.remainingAmount} field="remainingAmount" />
      </CustomerCard></CustomerSection>
      {sale.items.length > 0 && <CustomerSection title="اقلام قرارداد"><CustomerList>{sale.items.map((item, index) => <CustomerRecord key={`${item.description}-${index}`} title={item.description} detail={`تعداد ${item.quantity.toLocaleString("fa-IR")}`}><CustomerAmount label="قیمت هر واحد" value={item.unitPrice} /><CustomerAmount label="مبلغ ردیف" value={item.totalPrice} /></CustomerRecord>)}</CustomerList></CustomerSection>}
      <CustomerSection title="زمان‌بندی پرداخت" description="وضعیت و مبالغ هر قسط مطابق گزارش فروشگاه">
        {!sale.timeline.length && !sale.checks.length && <MiniAppDataState empty emptyText="زمان‌بندی پرداخت در این گزارش ثبت نشده است." />}
        {sale.timeline.length > 0 && <ol className="customer-list">{sale.timeline.map(payment => {
          const selected = hasMatchingPayment && payment.id === requestedPaymentId;
          return <li key={payment.id} ref={selected ? highlightedPaymentRef : undefined} className="customer-record" data-payment-id={payment.id} data-highlighted={selected || undefined} aria-current={selected ? "true" : undefined}>
            {selected && <p className="customer-selection">قسط انتخاب‌شده از پیوند شما</p>}
            <strong className="customer-record-title">قسط {payment.installmentNumber.toLocaleString("fa-IR")}</strong><p className="customer-muted">سررسید {formatCustomerDate(payment.dueDate)}</p>
            <div><MiniAppPill tone={payment.state === "paid" ? "success" : payment.state === "overdue" || payment.state === "due" ? "warning" : "muted"}>{timelineLabel[payment.state]}</MiniAppPill></div>
            <CustomerAmount label="مبلغ قسط" value={payment.amount} field={`payment-${payment.id}-amount`} /><CustomerAmount label="پرداخت‌شده" value={payment.paidAmount} field={`payment-${payment.id}-paid`} /><CustomerAmount label="مانده قسط" value={payment.remainingAmount} field={`payment-${payment.id}-remaining`} />
            {payment.paymentDate && <p className="customer-muted">تاریخ پرداخت: {formatCustomerDate(payment.paymentDate)}</p>}
          </li>;
        })}</ol>}
      </CustomerSection>
      {sale.checks.length > 0 && <CustomerSection title="چک‌های قرارداد"><CustomerList>{sale.checks.map(check => <CustomerRecord key={check.id} record={`check-${check.id}`} title={`چک ${check.bankName || "قرارداد"}`} detail={`سررسید ${formatCustomerDate(check.dueDate)} · ${check.status}`}><CustomerAmount label="مبلغ چک" value={check.amount} field={`check-${check.id}`} /></CustomerRecord>)}</CustomerList></CustomerSection>}
    </>}</CustomerQueryState>
  </CustomerPage>;
};
