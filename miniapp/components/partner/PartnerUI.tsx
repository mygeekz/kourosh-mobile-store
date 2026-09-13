import React from "react";
import { CompactStatCard } from "../ui/CompactStatCard";
import { ListChecks, WalletCards } from "lucide-react";
import { CompactRecord, FinancialGrid, RecordMeta } from "../ui/MiniAppRecord";
import { ReceiptText, type LucideIcon } from "lucide-react";
import { MiniAppPageHeading, MiniAppArtwork, type MiniAppArtworkKind } from "../MiniAppArtwork";
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

export const PartnerPage: React.FC<React.PropsWithChildren<{ title: string; id: string; description?: string; paginated?: boolean; artwork?: MiniAppArtworkKind; headerSummary?: React.ReactNode }>> = ({ title, id, description, paginated, artwork = "collaboration", headerSummary, children }) => (
  <div className="partner-page">
    <MiniAppPageHeading className="partner-header" id={id} title={title} context="همکاری و تأمین کالا" description={description} artwork={artwork}>{headerSummary}</MiniAppPageHeading>
    <div>{paginated && <p className="partner-muted">وضعیت دریافت نخستین صفحه</p>}<MiniAppDataAvailabilityStatus /></div>
    {children}
  </div>
);
export const PartnerSection: React.FC<React.PropsWithChildren<{ title: string; description?: string; to?: string; action?: string; artwork?: MiniAppArtworkKind }>> = ({ title, description, to, action = "مشاهده جزئیات", artwork = "receipt", children }) => (
  <section className="partner-section"><div className="partner-section-heading"><div><div className="miniapp-section-title"><MiniAppArtwork kind={artwork} className="miniapp-section-art" /><h2>{title}</h2></div>{description && <p className="partner-muted">{description}</p>}</div>{to && <Link className="partner-link" to={to}>{action} ←</Link>}</div>{children}</section>
);
export const PartnerMoney: React.FC<{ value?: number | null; field?: string }> = ({ value, field }) => typeof value === "number" ? <MiniAppFinancialValue data-field={field}>{formatToman(value)}</MiniAppFinancialValue> : <span className="partner-muted">ثبت نشده</span>;
export const PartnerAmount: React.FC<{ label: string; value?: number | null; field?: string }> = ({ label, value, field }) => <div className={`partner-amount${typeof value === "number" && formatToman(value).length > 20 ? " miniapp-record-wide" : ""}`}><span className="partner-muted">{label}</span><PartnerMoney value={value} field={field} /></div>;
export const PartnerMetric: React.FC<{ label: string; value?: number; money?: boolean; detail?: React.ReactNode; field?: string; icon?: LucideIcon }> = ({ label, value, money = true, detail, field, icon = money ? WalletCards : ListChecks }) => typeof value !== "number" ? null : <CompactStatCard className="partner-metric" label={label} icon={icon} detail={detail}>{money ? <PartnerMoney value={value} field={field} /> : <strong className="partner-number">{value.toLocaleString("fa-IR")}</strong>}</CompactStatCard>;
export const PartnerPosition: React.FC<{ account: PartnerAccountState }> = ({ account }) => (
  <MiniAppCard className="partner-position">
    <span className="partner-muted">مانده حساب با علامت دفتر</span><PartnerMoney value={account.signedBalance} field="signedBalance" />
    <div><MiniAppPill tone={account.code === "debtor" ? "warning" : account.code === "creditor" ? "primary" : "success"}>{account.label}</MiniAppPill></div>
    <p className="partner-muted">{account.code === "creditor" ? "فروشگاه به شما بدهکار است." : account.code === "debtor" ? "شما به فروشگاه بدهکار هستید." : account.code === "settled" ? "حساب شما تسویه است." : "وضعیت حساب مطابق گزارش فروشگاه"}</p>
  </MiniAppCard>
);
export const PartnerList: React.FC<React.PropsWithChildren> = ({ children }) => <ul className="partner-list">{children}</ul>;
export const PartnerRecord: React.FC<React.PropsWithChildren<{ title: string; detail?: React.ReactNode; record?: string | number; to?: string; icon?: LucideIcon; status?: React.ReactNode }>> = props => <CompactRecord role="partner" {...props} />;
export const PartnerLedgerRows: React.FC<{ items: PartnerLedgerEntry[] }> = ({ items }) => <PartnerList>{items.map(item => <PartnerRecord key={item.id} record={item.id} title={item.description} icon={ReceiptText} detail={<RecordMeta>{`${formatCustomerDate(item.transactionDate)} · رکورد ${item.id.toLocaleString("fa-IR")}`}</RecordMeta>}>
  <FinancialGrid><PartnerAmount label="بدهکار" value={item.debit} field={`ledger-${item.id}-debit`} /><PartnerAmount label="بستانکار" value={item.credit} field={`ledger-${item.id}-credit`} /><PartnerAmount label="مانده با علامت دفتر حساب" value={item.balance} field={`ledger-${item.id}-balance`} /></FinancialGrid>
</PartnerRecord>)}</PartnerList>;
export const PartnerSettlement: React.FC<{ settlement: NonNullable<PartnerPurchaseItem["settlement"]>; record: string; showStatus?: boolean }> = ({ settlement: s, record, showStatus = true }) => <>
  {showStatus && <div><MiniAppPill tone={s.code === "open" ? "warning" : "success"}>{s.label}</MiniAppPill></div>}
  <FinancialGrid><PartnerAmount label="مبلغ تسویه" value={s.amount} field={`${record}-amount`} /><PartnerAmount label="پرداخت‌شده" value={s.paidAmount} field={`${record}-paid`} /><PartnerAmount label="مانده تسویه" value={s.remainingAmount} field={`${record}-remaining`} /></FinancialGrid>
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
