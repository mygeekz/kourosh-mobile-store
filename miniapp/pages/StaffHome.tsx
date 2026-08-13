import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { formatToman } from "../format";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { StaffHomeData } from "../types";

const Money: React.FC<{ value: number; tone?: string }> = ({ value, tone = "" }) => (
  <strong className={`mt-1 block min-w-0 break-words text-lg font-black tabular-nums leading-7 ${tone}`}>{formatToman(value)}</strong>
);

const Metric: React.FC<{ label: string; value: React.ReactNode; secondary?: string }> = ({ label, value, secondary }) => (
  <div className="min-w-0 border-b border-border py-3">
    <span className="block text-[11px] font-bold text-mutedText">{label}</span>
    {value}
    {secondary ? <span className="mt-1 block text-[10px] text-mutedText">{secondary}</span> : null}
  </div>
);

export const StaffHome: React.FC = () => {
  const query = useMiniAppQuery<StaffHomeData>("/api/miniapp/staff/home");
  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;
  const data = query.data;
  return (
    <div>
      <header className="mb-5">
        <p className="m-0 text-xs font-bold text-primary">نمای اجرایی امروز</p>
        <h1 className="mb-0 mt-1 text-xl font-black">وضعیت واقعی فروشگاه</h1>
      </header>

      <section aria-labelledby="today-title">
        <h2 id="today-title" className="m-0 border-b border-border pb-2 text-sm font-black">امروز</h2>
        <div className="grid grid-cols-2 gap-x-4">
          <Metric label="فروش امروز" value={<Money value={data.today.sales} />} secondary={`${data.today.transactions.toLocaleString("fa-IR")} فروش`} />
          <Metric label="سود ناخالص امروز" value={<Money value={data.today.grossProfit} tone={data.today.grossProfit < 0 ? "text-danger" : "text-success"} />} />
          <Metric label="مطالبات فعلی" value={<Money value={data.financialPosition.totalReceivables} />} secondary={`${data.financialPosition.debtorsCount.toLocaleString("fa-IR")} بدهکار`} />
          <Metric label="اقساط معوق" value={<Money value={data.installments.overdueAmount} tone="text-danger" />} secondary={`${data.installments.overdueCount.toLocaleString("fa-IR")} قسط`} />
        </div>
      </section>

      <section className="mt-6" aria-labelledby="quick-title">
        <h2 id="quick-title" className="m-0 border-b border-border pb-2 text-sm font-black">دسترسی سریع</h2>
        <div className="grid grid-cols-2 gap-2 pt-3 text-xs font-bold">
          <Link to="/search" className="flex min-h-12 items-center rounded-[var(--radius-md)] border border-border px-3 text-foreground no-underline">جستجوی مشتری</Link>
          <Link to="/inventory" className="flex min-h-12 items-center rounded-[var(--radius-md)] border border-border px-3 text-foreground no-underline">جستجوی IMEI</Link>
          <Link to="/dues?scope=today" className="flex min-h-12 items-center rounded-[var(--radius-md)] border border-border px-3 text-foreground no-underline">اقساط امروز</Link>
          <Link to="/dues?scope=overdue" className="flex min-h-12 items-center rounded-[var(--radius-md)] border border-border px-3 text-foreground no-underline">اقساط معوق</Link>
          <Link to="/sales" className="col-span-2 flex min-h-12 items-center justify-between rounded-[var(--radius-md)] border border-border px-3 text-foreground no-underline"><span>خلاصه فروش</span><span className="text-primary">مشاهده</span></Link>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="position-title">
        <h2 id="position-title" className="m-0 border-b border-border pb-2 text-sm font-black">تصویر عملیاتی</h2>
        <dl className="m-0 grid grid-cols-2 gap-x-4 text-xs">
          <Metric label="سررسید امروز" value={<Money value={data.installments.dueTodayAmount} />} secondary={`${data.installments.dueTodayCount.toLocaleString("fa-IR")} قسط`} />
          <Metric label="اقلام فعال موجود" value={<strong className="mt-2 block text-lg font-black">{data.inventory.activeItemsCount.toLocaleString("fa-IR")}</strong>} />
          <Metric label="فروش ماه جاری" value={<Money value={data.month.totalSales} />} />
          <Metric label="فروش نقدی گوشی ماه" value={<Money value={data.month.phoneCashSales} />} />
          <Metric label="فروش اقساطی ماه" value={<Money value={data.month.installmentSales} />} />
          <Metric label="میانگین فروش امروز" value={<Money value={data.today.averageSaleValue} />} />
        </dl>
      </section>
    </div>
  );
};
