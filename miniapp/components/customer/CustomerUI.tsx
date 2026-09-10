import React from "react";
import { Link } from "react-router-dom";
import { MiniAppDataState } from "../MiniAppDataState";
import { MiniAppPill } from "../MiniAppVisualPrimitives";
import { MiniAppCard, MiniAppFinancialValue } from "../ui/MiniAppFoundation";
import { formatCustomerDate, formatToman } from "../../format";
import type { CustomerAccountState, CustomerPurchase } from "../../types";
import "./customer.css";

export const CustomerPage: React.FC<React.PropsWithChildren<{ title: React.ReactNode; id: string; description?: React.ReactNode }>> = ({ title, id, description, children }) => (
  <div className="customer-page"><header className="customer-header"><h1 id={id}>{title}</h1>{description && <p className="customer-muted">{description}</p>}</header>{children}</div>
);
export const CustomerSection: React.FC<React.PropsWithChildren<{ title: string; description?: string; to?: string; action?: string }>> = ({ title, description, to, action = "مشاهده", children }) => (
  <section className="customer-section"><div className="customer-section-heading"><div><h2>{title}</h2>{description && <p className="customer-muted">{description}</p>}</div>{to && <Link className="customer-link" to={to}>{action} ←</Link>}</div>{children}</section>
);
export const CustomerMoney: React.FC<{ value?: number | null; field?: string }> = ({ value, field }) => typeof value === "number" ? <MiniAppFinancialValue data-field={field}>{formatToman(value)}</MiniAppFinancialValue> : <span className="customer-muted">ثبت نشده</span>;
export const CustomerAmount: React.FC<{ label: string; value?: number | null; field?: string }> = ({ label, value, field }) => <div className="customer-amount"><span className="customer-muted">{label}</span><CustomerMoney value={value} field={field} /></div>;
export const CustomerCard: React.FC<React.PropsWithChildren> = ({ children }) => <MiniAppCard className="customer-card">{children}</MiniAppCard>;
export const CustomerPosition: React.FC<{ account: CustomerAccountState; signed?: boolean }> = ({ account, signed = false }) => <CustomerCard>
  <div><MiniAppPill tone={account.code === "debtor" ? "warning" : account.code === "creditor" ? "primary" : "success"}>{account.label}</MiniAppPill></div>
  <CustomerAmount label={signed ? "مانده با علامت دفتر حساب" : "مانده حساب"} value={signed ? account.signedBalance : account.amount} field={signed ? "signedBalance" : "accountAmount"} />
  <p className="customer-muted">{account.code === "debtor" ? "این مبلغ، بدهی شما به فروشگاه است." : account.code === "creditor" ? "این مبلغ، بستانکاری شما از فروشگاه است." : account.code === "settled" ? "حساب شما تسویه است." : "وضعیت مطابق گزارش حساب"}</p>
</CustomerCard>;
export const CustomerQueryState: React.FC<React.PropsWithChildren<{ query: { loading: boolean; error: string | null; retry: () => void; data: unknown } }>> = ({ query, children }) => !query.data || query.loading || query.error ? <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} empty={!query.loading && !query.error} emptyText="اطلاعات این بخش در گزارش فعلی در دسترس نیست." /> : <>{children}</>;
export const CustomerList: React.FC<React.PropsWithChildren> = ({ children }) => <ul className="customer-list">{children}</ul>;
export const CustomerRecord: React.FC<React.PropsWithChildren<{ title: string; detail?: React.ReactNode; record?: string | number }>> = ({ title, detail, record, children }) => <li className="customer-record" data-record={record}><strong className="customer-record-title">{title}</strong>{detail && <div className="customer-muted">{detail}</div>}{children}</li>;
export const CustomerPurchaseRow: React.FC<{ purchase: CustomerPurchase }> = ({ purchase }) => <CustomerRecord title={purchase.itemsSummary} record={purchase.ref} detail={`${formatCustomerDate(purchase.transactionDate)} · ${purchase.purchaseTypeLabel}`}>
  <CustomerAmount label="مبلغ خرید" value={purchase.totalAmount} field={`purchase-${purchase.id}`} />
  {purchase.invoiceRef ? <Link className="customer-link" to={`/invoices/${purchase.invoiceRef}`}>مشاهده فاکتور ←</Link> : purchase.source === "installment_sale" ? <Link className="customer-link" to={`/installments/${purchase.id}`}>مشاهده قرارداد اقساط ←</Link> : <p className="customer-muted">فاکتور این خرید در گزارش فعلی در دسترس نیست.</p>}
</CustomerRecord>;
