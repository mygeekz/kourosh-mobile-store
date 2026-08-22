import { formatIsoToShamsiDateTime } from "../../utils/dateUtils";
import { resolveMiniAppStoreConnectivity } from "./miniAppConnectivity";

export type MiniAppDataSource = "live" | "snapshot";

export type MiniAppResponseMeta = {
  source: MiniAppDataSource;
  snapshotVersion: number | null;
  snapshotGeneratedAt: string | null;
  snapshotReceivedAt: string | null;
};

export type MiniAppSnapshotFreshness = "fresh" | "stale" | "very_stale" | "unknown";
export type MiniAppAvailabilityTone = "live" | "synced" | "saved" | "stale" | "very_stale";

export const MINIAPP_DATA_AVAILABILITY_THRESHOLDS = Object.freeze({
  freshMs: 15 * 60 * 1000,
  staleMs: 24 * 60 * 60 * 1000,
});

export const MINIAPP_DATA_AVAILABILITY_REFERENCE = Object.freeze({
  container: "mb-4 flex items-start gap-3 rounded-[var(--radius-md)] border bg-card px-3 py-3",
  iconBase: "mt-0.5 flex size-8 shrink-0 items-center justify-center rounded-[var(--radius-md)] border",
  title: "m-0 text-xs font-black text-foreground",
  detail: "mt-1 block text-[11px] leading-5 text-mutedText",
  badgeBase: "shrink-0 rounded-full border px-2 py-1 text-[10px] font-extrabold",
  live: {
    container: "border-success/30",
    icon: "border-success/25 text-success",
    badge: "border-success/25 text-success",
  },
  saved: {
    container: "border-warning/30",
    icon: "border-warning/25 text-warning",
    badge: "border-warning/25 text-warning",
  },
  stale: {
    container: "border-warning/50",
    icon: "border-warning/40 text-warning",
    badge: "border-warning/40 text-warning",
  },
  very_stale: {
    container: "border-danger/35",
    icon: "border-danger/30 text-danger",
    badge: "border-danger/30 text-danger",
  },
});

const snapshotAgeMs = (generatedAt: string | null, nowMs: number): number | null => {
  if (!generatedAt) return null;
  const parsed = Date.parse(generatedAt);
  if (!Number.isFinite(parsed)) return null;
  return Math.max(0, nowMs - parsed);
};

export const resolveMiniAppSnapshotFreshness = (
  generatedAt: string | null,
  nowMs = Date.now(),
): MiniAppSnapshotFreshness => {
  const age = snapshotAgeMs(generatedAt, nowMs);
  if (age === null) return "unknown";
  if (age <= MINIAPP_DATA_AVAILABILITY_THRESHOLDS.freshMs) return "fresh";
  if (age <= MINIAPP_DATA_AVAILABILITY_THRESHOLDS.staleMs) return "stale";
  return "very_stale";
};

export type MiniAppAvailabilityPresentation = {
  tone: MiniAppAvailabilityTone;
  title: string;
  badge: string;
  detail: string;
  freshness: MiniAppSnapshotFreshness | null;
};

export const isMiniAppAvailabilityOnlineTone = (tone: MiniAppAvailabilityTone): boolean =>
  tone === "live" || tone === "synced";

export const resolveMiniAppAvailabilityPresentation = (
  meta: MiniAppResponseMeta,
  nowMs = Date.now(),
): MiniAppAvailabilityPresentation => {
  if (meta.source === "live") {
    return {
      tone: "live",
      title: "فروشگاه آنلاین",
      badge: "اطلاعات زنده",
      detail: "اطلاعات مستقیماً از فروشگاه دریافت می‌شود.",
      freshness: null,
    };
  }

  const freshness = resolveMiniAppSnapshotFreshness(meta.snapshotGeneratedAt, nowMs);
  const updatedAt = meta.snapshotGeneratedAt
    ? formatIsoToShamsiDateTime(meta.snapshotGeneratedAt)
    : "نامشخص";
  const versionSuffix = meta.snapshotVersion ? ` · نسخه ${meta.snapshotVersion.toLocaleString("fa-IR")}` : "";
  const detail = `آخرین بروزرسانی: ${updatedAt}${versionSuffix}`;
  const storeConnectivity = resolveMiniAppStoreConnectivity(meta.source, meta.snapshotGeneratedAt, nowMs);

  if (storeConnectivity === "online") {
    return {
      tone: "synced",
      title: "فروشگاه آنلاین است",
      badge: "اطلاعات همگام‌شده",
      detail,
      freshness,
    };
  }

  if (storeConnectivity === "unknown") {
    return {
      tone: "saved",
      title: "وضعیت اتصال فروشگاه نامشخص است",
      badge: "اطلاعات ذخیره‌شده",
      detail,
      freshness,
    };
  }

  if (freshness === "very_stale") {
    return {
      tone: "very_stale",
      title: "فروشگاه آفلاین است",
      badge: "اطلاعات قدیمی",
      detail,
      freshness,
    };
  }

  if (freshness === "stale") {
    return {
      tone: "stale",
      title: "فروشگاه آفلاین است",
      badge: "اطلاعات با تأخیر",
      detail,
      freshness,
    };
  }

  return {
    tone: "saved",
    title: "فروشگاه آفلاین است",
    badge: "اطلاعات ذخیره‌شده",
    detail,
    freshness,
  };
};
