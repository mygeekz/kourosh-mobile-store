import React from "react";
import { Link } from "react-router-dom";
import { CalendarDays, ReceiptText, type LucideIcon } from "lucide-react";

/** Shared record presentation only; callers retain their data, links and permissions. */
export const RecordIcon: React.FC<{ icon: LucideIcon }> = ({ icon: Icon }) => <span className="miniapp-record-icon" aria-hidden="true"><Icon size={18} strokeWidth={1.7} /></span>;

export const RecordMeta: React.FC<React.PropsWithChildren<{ icon?: LucideIcon }>> = ({ icon: Icon = CalendarDays, children }) => <span className="miniapp-record-meta"><Icon size={13} aria-hidden="true" /><span>{children}</span></span>;

export const CompactRecord: React.FC<React.PropsWithChildren<{
  role: "manager" | "partner" | "customer";
  title: string;
  detail?: React.ReactNode;
  record?: string | number;
  to?: string;
  icon?: LucideIcon;
  status?: React.ReactNode;
}>> = ({ role, title, detail, record, to, icon = ReceiptText, status, children }) => {
  const content = <>
    <div className="miniapp-record-heading"><RecordIcon icon={icon} /><strong className={`${role}-record-title`}>{title}</strong>{status && <div className="miniapp-record-status">{status}</div>}</div>
    {detail && <div className={`miniapp-record-details ${role}-muted`}>{detail}</div>}
    {children && <div className="miniapp-record-fields">{children}</div>}
  </>;
  return <li className={`${role}-record miniapp-compact-record`} data-record={record}>
    {to ? <Link to={to} className="manager-record-link miniapp-record-body">{content}</Link> : <div className={`${role}-record-body miniapp-record-body`}>{content}</div>}
  </li>;
};

export const FinancialGrid: React.FC<React.PropsWithChildren> = ({ children }) => <div className="miniapp-record-finances">{children}</div>;
