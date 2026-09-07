import React, { useState } from "react";
import { Bell, Check, RefreshCw } from "../../components/lucide-react";
import { postMiniAppAction } from "../apiClient";
import { MiniAppDataState } from "../components/MiniAppDataState";
import { MiniAppPill, MiniAppSectionHeading } from "../components/MiniAppVisualPrimitives";
import { useMiniAppQuery } from "../hooks/useMiniAppQuery";
import { MINIAPP_VISUAL_REFERENCE } from "../reference/miniAppVisualSystem";
import type { ManagerInAppNotification, ManagerNotificationInboxData } from "../types";

const severityClass: Record<ManagerInAppNotification["severity"], string> = {
  info: "border-sky-200 bg-sky-50 text-sky-800 dark:border-sky-900/50 dark:bg-sky-950/25 dark:text-sky-200",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800 dark:border-emerald-900/50 dark:bg-emerald-950/25 dark:text-emerald-200",
  warning: "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900/50 dark:bg-amber-950/25 dark:text-amber-200",
  danger: "border-rose-200 bg-rose-50 text-rose-900 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200",
};

const severityLabel: Record<ManagerInAppNotification["severity"], string> = {
  info: "اطلاع",
  success: "موفق",
  warning: "مهم",
  danger: "فوری",
};

const formatDateTime = (value: string): string => {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("fa-IR", { dateStyle: "short", timeStyle: "short" }).format(date);
};

export const ManagerNotifications: React.FC = () => {
  const query = useMiniAppQuery<ManagerNotificationInboxData>("/api/miniapp/manager/notifications?limit=60");
  const [busyId, setBusyId] = useState<number | "all" | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  if (!query.data) return <MiniAppDataState loading={query.loading} error={query.error} retry={query.retry} />;

  const markRead = async (id: number) => {
    setBusyId(id);
    setActionError(null);
    try {
      await postMiniAppAction(`/api/miniapp/manager/notifications/${id}/read`);
      query.retry();
    } catch (error) {
      setActionError(String((error as Error)?.message || "ثبت وضعیت اعلان انجام نشد."));
    } finally {
      setBusyId(null);
    }
  };

  const markAll = async () => {
    setBusyId("all");
    setActionError(null);
    try {
      await postMiniAppAction("/api/miniapp/manager/notifications/read-all");
      query.retry();
    } catch (error) {
      setActionError(String((error as Error)?.message || "ثبت وضعیت اعلان‌ها انجام نشد."));
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className={MINIAPP_VISUAL_REFERENCE.page} data-manager-notification-inbox="v350">
      <section className={MINIAPP_VISUAL_REFERENCE.hero}>
        <span className={MINIAPP_VISUAL_REFERENCE.heroGlow} />
        <span className={MINIAPP_VISUAL_REFERENCE.heroGlowSecondary} />
        <div className="relative z-[1]">
          <MiniAppPill tone={query.data.unreadCount > 0 ? "warning" : "success"} icon={Bell}>
            {query.data.unreadCount > 0 ? `${query.data.unreadCount.toLocaleString("fa-IR")} اعلان خوانده‌نشده` : "همه اعلان‌ها دیده شده‌اند"}
          </MiniAppPill>
          <h1 className="mb-0 mt-4 text-2xl font-black">اعلان‌های مدیریت</h1>
          <p className="mb-0 mt-2 text-xs leading-6 text-primary-foreground/80">این Inbox برای همین مدیر و همین فروشگاه نگه‌داری می‌شود و از اعلان‌های سایر مدیران مستقل است.</p>
        </div>
      </section>

      <section>
        <MiniAppSectionHeading title="Inbox" subtitle="رویدادهای عملیاتی فروشگاه" />
        <div className="mt-3 flex flex-wrap items-center gap-2">
          <button type="button" onClick={query.retry} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] border border-border bg-card px-3 text-xs font-bold text-foreground">
            <RefreshCw size={16} /> تازه‌سازی
          </button>
          {query.data.unreadCount > 0 ? (
            <button type="button" disabled={busyId !== null} onClick={() => void markAll()} className="inline-flex min-h-10 items-center gap-2 rounded-[var(--radius-md)] bg-primary px-3 text-xs font-bold text-primary-foreground disabled:opacity-60">
              <Check size={16} /> {busyId === "all" ? "در حال ثبت..." : "همه خوانده شد"}
            </button>
          ) : null}
        </div>
        {actionError ? <div className="mt-3 rounded-[var(--radius-md)] border border-rose-200 bg-rose-50 p-3 text-xs leading-6 text-rose-800 dark:border-rose-900/50 dark:bg-rose-950/25 dark:text-rose-200">{actionError}</div> : null}
      </section>

      <section className="space-y-3">
        {query.data.items.length === 0 ? (
          <MiniAppDataState empty emptyText="هنوز اعلان مدیریتی برای این حساب ثبت نشده است." />
        ) : query.data.items.map((item) => (
          <article key={item.id} className={`${MINIAPP_VISUAL_REFERENCE.card} p-4 ${item.readAt ? "opacity-75" : "ring-1 ring-primary/15"}`}>
            <div className="flex items-start gap-3">
              <span className={`inline-flex shrink-0 rounded-full border px-2 py-1 text-[10px] font-black ${severityClass[item.severity]}`}>{severityLabel[item.severity]}</span>
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <strong className="text-sm font-black text-foreground">{item.title}</strong>
                  <span className="text-[10px] text-mutedText">{formatDateTime(item.createdAt)}</span>
                </div>
                <p className="mb-0 mt-2 whitespace-pre-line text-xs leading-6 text-mutedText">{item.body}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2 text-[10px] text-mutedText">
                  {item.entityType ? <span className="rounded-full bg-muted px-2 py-1">{item.entityType}{item.entityId ? ` #${item.entityId}` : ""}</span> : null}
                  <span dir="ltr" className="rounded-full bg-muted px-2 py-1">{item.sourceEventType}</span>
                </div>
              </div>
            </div>
            {!item.readAt ? (
              <div className="mt-3 border-t border-border/60 pt-3 text-end">
                <button type="button" disabled={busyId !== null} onClick={() => void markRead(item.id)} className="inline-flex min-h-9 items-center gap-1.5 rounded-[var(--radius-md)] border border-border bg-background px-3 text-xs font-bold text-foreground disabled:opacity-60">
                  <Check size={15} /> {busyId === item.id ? "در حال ثبت..." : "خوانده شد"}
                </button>
              </div>
            ) : null}
          </article>
        ))}
      </section>
    </div>
  );
};
