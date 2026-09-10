import React from "react";
import { Link, useSearchParams } from "react-router-dom";
import { MiniAppDataState } from "../MiniAppDataState";
import { MiniAppButton, MiniAppCard, MiniAppFinancialValue } from "../ui/MiniAppFoundation";
import { formatCustomerDate, formatToman } from "../../format";
import type { MiniAppResponseMeta } from "../../reference/miniAppDataAvailability";
import "./manager.css";

export const ManagerPage: React.FC<React.PropsWithChildren<{ title: string; description?: React.ReactNode; context?: string }>> = ({ title, description, context, children }) => <div className="manager-page">
  <header className="manager-header">{context && <p className="manager-context">{context}</p>}<h1>{title}</h1>{description && <p className="manager-muted">{description}</p>}</header>{children}
</div>;
export const ManagerSection: React.FC<React.PropsWithChildren<{ title: string; description?: string; to?: string; action?: string }>> = ({ title, description, to, action = "مشاهده", children }) => <section className="manager-section"><div className="manager-section-heading"><div><h2>{title}</h2>{description && <p className="manager-muted">{description}</p>}</div>{to && <Link className="manager-link" to={to}>{action} ←</Link>}</div>{children}</section>;
export const ManagerMoney: React.FC<{ value: number | undefined | null; field?: string }> = ({ value, field }) => typeof value === "number" ? <MiniAppFinancialValue data-field={field}>{formatToman(value)}</MiniAppFinancialValue> : <span className="manager-muted">ثبت نشده</span>;
export const ManagerMetric: React.FC<{ label: string; value?: number; money?: boolean; detail?: React.ReactNode; field?: string }> = ({ label, value, money = true, detail, field }) => typeof value !== "number" ? null : <MiniAppCard className="manager-metric miniapp-metric-card"><span className="manager-muted">{label}</span>{money ? <ManagerMoney value={value} field={field} /> : <strong className="manager-number" data-field={field}>{value.toLocaleString("fa-IR")}</strong>}{detail && <small className="manager-muted">{detail}</small>}</MiniAppCard>;
export const ManagerGrid: React.FC<React.PropsWithChildren> = ({ children }) => <div className="manager-grid">{children}</div>;
export const ManagerRecord: React.FC<React.PropsWithChildren<{ title: string; detail?: React.ReactNode; to?: string }>> = ({ title, detail, to, children }) => {
  const content = <><strong className="manager-record-title">{title}</strong>{detail && <div className="manager-muted">{detail}</div>}{children}</>;
  return <li className="manager-record">{to ? <Link to={to} className="manager-record-link">{content}</Link> : <div className="manager-record-body">{content}</div>}</li>;
};
export const ManagerList: React.FC<React.PropsWithChildren> = ({ children }) => <ul className="manager-list">{children}</ul>;
export const ManagerAmount: React.FC<{ label: string; value?: number | null; field?: string }> = ({ label, value, field }) => <div className="manager-amount"><span className="manager-muted">{label}</span><ManagerMoney value={value} field={field} /></div>;
export const ManagerQueryState: React.FC<React.PropsWithChildren<{ query: { loading: boolean; error: string | null; retry: () => void; data: unknown }; empty?: boolean; emptyText?: string }>> = ({ query, empty, emptyText = "موردی برای نمایش وجود ندارد.", children }) => query.loading || query.error || !query.data ? <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} empty={!query.loading && !query.error} emptyText={emptyText} /> : empty ? <MiniAppDataState empty emptyText={emptyText} /> : <>{children}</>;

/** URL state only. No sorting, filtering, or financial calculations on loaded rows. */
export const useManagerListLocation = (pageKey = "page") => {
  const [params, setParams] = useSearchParams();
  const page = Math.max(1, Math.floor(Number(params.get(pageKey)) || 1));
  const update = (key: string, value: string, replace = false, clear: string[] = []) => setParams(previous => { const next = new URLSearchParams(previous); if (value) next.set(key, value); else next.delete(key); if (key !== pageKey) next.delete(pageKey); clear.forEach(name => next.delete(name)); return next; }, { replace });
  return { params, page, update, setPage: (next: number) => update(pageKey, String(next)) };
};
export const ManagerSnapshotNote: React.FC<{ meta: MiniAppResponseMeta | null; search?: boolean }> = ({ meta, search }) => meta?.source === "snapshot" ? <p className="manager-notice" data-manager-snapshot-note>این فهرست محدود به اطلاعات همگام‌شده است.{search ? " جستجو فقط در نام‌ها و مشخصات ذخیره‌شده انجام می‌شود؛ ممکن است همه سوابق یا شناسه‌ها در دسترس نباشند." : " برای سوابق بیشتر، اتصال زنده فروشگاه لازم است."}</p> : null;
export const ManagerPager: React.FC<{ page: number; totalPages?: number; hasMore?: boolean; total?: number; onPage: (page: number) => void; meta: MiniAppResponseMeta | null; snapshotPaging?: boolean }> = ({ page, totalPages, hasMore, total, onPage, meta, snapshotPaging = false }) => {
  if (meta?.source === "snapshot" && !snapshotPaging) return <ManagerSnapshotNote meta={meta} />;
  const next = typeof totalPages === "number" ? page < totalPages : Boolean(hasMore);
  return <div className="manager-pagination" aria-label="صفحه‌بندی"><p className="manager-muted">صفحه {page.toLocaleString("fa-IR")}{typeof totalPages === "number" && totalPages > 0 ? ` از ${totalPages.toLocaleString("fa-IR")}` : ""}{typeof total === "number" ? ` · ${total.toLocaleString("fa-IR")} رکورد${meta?.source === "snapshot" ? " ذخیره‌شده" : ""}` : ""}</p>{(page > 1 || next) && <div className="manager-actions"><MiniAppButton variant="secondary" disabled={page <= 1} onClick={() => onPage(page - 1)}>صفحه قبل</MiniAppButton><MiniAppButton variant="secondary" disabled={!next} onClick={() => onPage(page + 1)}>صفحه بعد</MiniAppButton></div>}</div>;
};
export const ManagerLedgerRows: React.FC<{ items: Array<{ id: number; description: string; transactionDate: string; debit: number; credit: number; balance: number }> }> = ({ items }) => <ManagerList>{items.map(item => <ManagerRecord key={item.id} title={item.description} detail={formatCustomerDate(item.transactionDate)}><ManagerAmount label="بدهکار" value={item.debit} field={`ledger-${item.id}-debit`} /><ManagerAmount label="بستانکار" value={item.credit} field={`ledger-${item.id}-credit`} /><ManagerAmount label="مانده با علامت دفتر حساب" value={item.balance} field={`ledger-${item.id}-balance`} /></ManagerRecord>)}</ManagerList>;
