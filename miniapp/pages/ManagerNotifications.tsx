import React, { useState } from "react";
import { postMiniAppAction } from "../apiClient";
import { MiniAppPill } from "../components/MiniAppVisualPrimitives";
import { MiniAppButton } from "../components/ui/MiniAppFoundation";
import { ManagerList, ManagerPage, ManagerQueryState, ManagerRecord, ManagerSection } from "../components/manager/ManagerUI";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import type { ManagerInAppNotification, ManagerNotificationInboxData } from "../types";
const severityLabel: Record<ManagerInAppNotification["severity"], string> = { info: "اطلاع", success: "موفق", warning: "مهم", danger: "فوری" };
const formatDateTime = (value: string) => Number.isNaN(Date.parse(value)) ? "—" : new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(new Date(value));
export const ManagerNotifications: React.FC = () => {
  const query = useMiniAppQuery<ManagerNotificationInboxData>("/api/miniapp/manager/notifications?limit=60");
  const [busyId, setBusyId] = useState<number | "all" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);
  const [feedback, setFeedback] = useState("");
  const mark = async (id: number | "all") => {
    setBusyId(id); setActionError(null); setFeedback("");
    try {
      await postMiniAppAction(id === "all" ? "/api/miniapp/manager/notifications/read-all" : `/api/miniapp/manager/notifications/${id}/read`);
      setFeedback(id === "all" ? "همه اعلان‌ها به‌عنوان خوانده‌شده ثبت شدند." : "اعلان به‌عنوان خوانده‌شده ثبت شد.");
      query.retry();
    } catch (error) { setActionError(String((error as Error)?.message || "ثبت وضعیت اعلان انجام نشد.")); }
    finally { setBusyId(null); }
  };
  const d = query.data;
  return <ManagerPage title="اعلان‌های مدیریت" description="پیام‌های مربوط به حساب شما در این فروشگاه">
    <div className="manager-actions"><MiniAppButton variant="secondary" disabled={query.loading || busyId !== null} onClick={query.retry}>تازه‌سازی</MiniAppButton>{d && d.unreadCount > 0 && <MiniAppButton disabled={busyId !== null || query.loading} onClick={() => void mark("all")}>{busyId === "all" ? "در حال ثبت…" : "خواندن همه اعلان‌ها"}</MiniAppButton>}</div>
    {actionError && <div role="alert" className="manager-notice">{actionError}</div>}
    <div role="status" aria-live="polite">{feedback}</div>
    <ManagerQueryState query={query}>{d && <ManagerSection title={`${d.unreadCount.toLocaleString("fa-IR")} اعلان خوانده‌نشده`} description="حداکثر ۶۰ اعلان اخیر؛ تعداد خوانده‌نشده‌ها ممکن است شامل اعلان‌های قدیمی‌تر باشد">
      <ManagerQueryState query={query} empty={!d.items.length} emptyText="هنوز اعلانی برای این حساب ثبت نشده است."><ManagerList>{d.items.map(item => <ManagerRecord key={item.id} title={item.title} detail={formatDateTime(item.createdAt)}>
        <div className="manager-actions"><MiniAppPill tone={item.severity}>{severityLabel[item.severity]}</MiniAppPill><MiniAppPill>{item.readAt ? "خوانده‌شده" : "خوانده‌نشده"}</MiniAppPill></div>
        <p className="manager-muted whitespace-pre-line">{item.body}</p>
        {!item.readAt && <div><MiniAppButton variant="secondary" disabled={busyId !== null || query.loading} onClick={() => void mark(item.id)}>{busyId === item.id ? "در حال ثبت…" : "خوانده شد"}</MiniAppButton></div>}
      </ManagerRecord>)}</ManagerList></ManagerQueryState>
    </ManagerSection>}</ManagerQueryState>
  </ManagerPage>;
};
