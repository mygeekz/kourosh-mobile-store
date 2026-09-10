import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataAvailabilityStatus } from "../MiniAppDataAvailabilityStatus";
import { MiniAppDataState } from "../MiniAppDataState";
import { MiniAppPill } from "../MiniAppVisualPrimitives";
import { MiniAppButton, MiniAppCard, MiniAppFinancialValue } from "../ui/MiniAppFoundation";
import { formatCustomerDate, formatToman } from "../../format";
import type { PartnerAccountState, PartnerLedgerEntry, PartnerPurchaseItem } from "../../types";
import type { MiniAppResponseMeta } from "../../reference/miniAppDataAvailability";
import "./partner.css";

const snapshotTime = (value: string | null) => value && Number.isFinite(Date.parse(value))
  ? new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value))
  : "زمان نامشخص";

export const PartnerPage: React.FC<React.PropsWithChildren<{ title: string; id: string; description?: string; paginated?: boolean }>> = ({ title, id, description, paginated, children }) => (
  <div className="partner-page">
    <header className="partner-header"><p className="partner-eyebrow">همکاری و تأمین کالا</p><h1 id={id}>{title}</h1>{description && <p className="partner-muted">{description}</p>}</header>
    <div>{paginated && <p className="partner-muted">وضعیت دریافت نخستین صفحه</p>}<MiniAppDataAvailabilityStatus /></div>
    {children}
  </div>
);
export const PartnerSection: React.FC<React.PropsWithChildren<{ title: string; description?: string; to?: string; action?: string }>> = ({ title, description, to, action = "مشاهده جزئیات", children }) => (
  <section className="partner-section"><div className="partner-section-heading"><div><h2>{title}</h2>{description && <p className="partner-muted">{description}</p>}</div>{to && <Link className="partner-link" to={to}>{action} ←</Link>}</div>{children}</section>
);
export const PartnerMoney: React.FC<{ value?: number | null; field?: string }> = ({ value, field }) => typeof value === "number" ? <MiniAppFinancialValue data-field={field}>{formatToman(value)}</MiniAppFinancialValue> : <span className="partner-muted">ثبت نشده</span>;
export const PartnerAmount: React.FC<{ label: string; value?: number | null; field?: string }> = ({ label, value, field }) => <div className="partner-amount"><span className="partner-muted">{label}</span><PartnerMoney value={value} field={field} /></div>;
export const PartnerMetric: React.FC<{ label: string; value?: number; money?: boolean; field?: string }> = ({ label, value, money = true, field }) => typeof value !== "number" ? null : <MiniAppCard className="partner-metric"><span className="partner-muted">{label}</span>{money ? <PartnerMoney value={value} field={field} /> : <strong className="partner-number">{value.toLocaleString("fa-IR")}</strong>}</MiniAppCard>;
export const PartnerPosition: React.FC<{ account: PartnerAccountState }> = ({ account }) => (
  <MiniAppCard className="partner-position">
    <span className="partner-muted">مانده حساب با علامت دفتر</span><PartnerMoney value={account.signedBalance} field="signedBalance" />
    <div><MiniAppPill tone={account.code === "debtor" ? "warning" : account.code === "creditor" ? "primary" : "success"}>{account.label}</MiniAppPill></div>
    <p className="partner-muted">{account.code === "creditor" ? "فروشگاه به شما بدهکار است." : account.code === "debtor" ? "شما به فروشگاه بدهکار هستید." : account.code === "settled" ? "حساب شما تسویه است." : "وضعیت حساب مطابق گزارش فروشگاه"}</p>
  </MiniAppCard>
);
export const PartnerList: React.FC<React.PropsWithChildren> = ({ children }) => <ul className="partner-list">{children}</ul>;
export const PartnerRecord: React.FC<React.PropsWithChildren<{ title: string; detail?: React.ReactNode; record?: string | number }>> = ({ title, detail, record, children }) => <li className="partner-record" data-record={record}><strong className="partner-record-title">{title}</strong>{detail && <div className="partner-muted">{detail}</div>}{children}</li>;
export const PartnerLedgerRows: React.FC<{ items: PartnerLedgerEntry[] }> = ({ items }) => <PartnerList>{items.map(item => <PartnerRecord key={item.id} record={item.id} title={item.description} detail={`${formatCustomerDate(item.transactionDate)} · رکورد ${item.id.toLocaleString("fa-IR")}`}>
  <PartnerAmount label="بدهکار" value={item.debit} field={`ledger-${item.id}-debit`} /><PartnerAmount label="بستانکار" value={item.credit} field={`ledger-${item.id}-credit`} /><PartnerAmount label="مانده با علامت دفتر حساب" value={item.balance} field={`ledger-${item.id}-balance`} />
</PartnerRecord>)}</PartnerList>;
export const PartnerSettlement: React.FC<{ settlement: NonNullable<PartnerPurchaseItem["settlement"]>; record: string }> = ({ settlement: s, record }) => <>
  <div><MiniAppPill tone={s.code === "open" ? "warning" : "success"}>{s.label}</MiniAppPill></div>
  <PartnerAmount label="مبلغ تسویه" value={s.amount} field={`${record}-amount`} /><PartnerAmount label="پرداخت‌شده" value={s.paidAmount} field={`${record}-paid`} /><PartnerAmount label="مانده تسویه" value={s.remainingAmount} field={`${record}-remaining`} />
  {s.lastPaymentDate && <p className="partner-muted">آخرین پرداخت: {formatCustomerDate(s.lastPaymentDate)}</p>}
</>;
export const PartnerQueryState: React.FC<React.PropsWithChildren<{ query: { data: unknown; loading: boolean; error: string | null; retry: () => void } }>> = ({ query, children }) => !query.data || query.loading ? <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} empty={!query.loading && !query.error} emptyText="اطلاعات این بخش در دسترس نیست." /> : <>{children}</>;
export const PartnerSearch: React.FC<{ value: string; onChange: (value: string) => void; label: string }> = ({ value, onChange, label }) => <label className="partner-search">{label}<input aria-label={label} dir="auto" value={value} maxLength={100} onChange={e => onChange(e.target.value)} placeholder={label} /></label>;
export const PartnerLoadedScope: React.FC<{ loaded: number; visible: number; total?: number; pageMeta: Array<{ page: number; meta: MiniAppResponseMeta }> }> = ({ loaded, visible, total, pageMeta }) => <div className="partner-notice">
  <p>جستجو و فیلتر فقط روی {loaded.toLocaleString("fa-IR")} رکورد دریافت‌شده اعمال می‌شود؛ {visible.toLocaleString("fa-IR")} نتیجه.</p>
  {typeof total === "number" && <p>تعداد رکورد در پاسخ سرویس: {total.toLocaleString("fa-IR")}</p>}
  {pageMeta.some(item => item.meta.source === "snapshot") && <p data-partner-snapshot-note>بخشی یا همه این فهرست از اطلاعات همگام‌شده است و ممکن است شامل تمام سوابق نباشد.</p>}
  {pageMeta.map(item => <p key={item.page} className="partner-muted">صفحه {item.page.toLocaleString("fa-IR")}: {item.meta.source === "live" ? "اطلاعات زنده" : `اطلاعات همگام‌شده · ${snapshotTime(item.meta.snapshotGeneratedAt)}`}</p>)}
</div>;
export const PartnerLoadMore: React.FC<{ query: { error: string | null; hasMore: boolean; loadingMore: boolean; loadMore: () => void } }> = ({ query }) => <div className="partner-section">
  {query.error && <p role="alert" className="partner-notice">{query.error} رکوردهای دریافت‌شده حفظ شده‌اند.</p>}
  {query.hasMore && <MiniAppButton variant="secondary" disabled={query.loadingMore} onClick={query.loadMore}>{query.loadingMore ? "در حال دریافت…" : query.error ? "تلاش دوباره برای موارد بیشتر" : "نمایش موارد بیشتر"}</MiniAppButton>}
</div>;
