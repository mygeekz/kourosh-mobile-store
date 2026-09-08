import { formatIsoToShamsiDateTime } from "../../utils/dateUtils";
import { resolveMiniAppStoreConnectivity, type MiniAppStoreConnectivity } from "./miniAppConnectivity";
import { MINIAPP_DISPLAY_VERSION } from "./miniAppRelease";

export type MiniAppDataSource = "live" | "snapshot";

export type MiniAppResponseMeta = {
  source: MiniAppDataSource;
  snapshotVersion: number | null;
  snapshotGeneratedAt: string | null;
  snapshotReceivedAt: string | null;
};

export type MiniAppSnapshotFreshness = "fresh" | "stale" | "very_stale" | "unknown";
export type MiniAppAvailabilityTone = "live" | "saved" | "stale" | "very_stale";

export const MINIAPP_DATA_AVAILABILITY_THRESHOLDS = Object.freeze({
  freshMs: 15 * 60 * 1000,
  staleMs: 24 * 60 * 60 * 1000,
  futureToleranceMs: 2 * 60 * 1000,
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
  const ageMs = nowMs - parsed;
  if (ageMs < -MINIAPP_DATA_AVAILABILITY_THRESHOLDS.futureToleranceMs) return null;
  return Math.max(0, ageMs);
};

const formatRelativeSnapshotAge = (ageMs: number | null): string | null => {
  if (ageMs === null) return null;
  if (ageMs < 60_000) return "کمتر از یک دقیقه قبل";
  const minutes = Math.floor(ageMs / 60_000);
  if (minutes < 60) return `${minutes.toLocaleString("fa-IR")} دقیقه قبل`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours.toLocaleString("fa-IR")} ساعت قبل`;
  const days = Math.floor(hours / 24);
  return `${days.toLocaleString("fa-IR")} روز قبل`;
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
  connectivity: MiniAppStoreConnectivity;
  source: MiniAppDataSource;
  tone: MiniAppAvailabilityTone;
  title: string;
  badge: string;
  detail: string;
  freshness: MiniAppSnapshotFreshness | null;
  snapshotAgeMs: number | null;
};

export const isMiniAppAvailabilityLiveTone = (tone: MiniAppAvailabilityTone): boolean =>
  tone === "live";

/** @deprecated Prefer isMiniAppAvailabilityLiveTone; kept for compatibility with older Mini App modules. */
export const isMiniAppAvailabilityOnlineTone = isMiniAppAvailabilityLiveTone;

export const resolveMiniAppAvailabilityPresentation = (
  meta: MiniAppResponseMeta,
  nowMs = Date.now(),
): MiniAppAvailabilityPresentation => {
  const connectivity = resolveMiniAppStoreConnectivity(meta.source);
  if (meta.source === "live") {
    return {
      connectivity,
      source: "live",
      tone: "live",
      title: "اتصال زنده برقرار است",
      badge: "اطلاعات زنده",
      detail: `اطلاعات مستقیماً از فروشگاه دریافت می‌شود. · نسخه ${MINIAPP_DISPLAY_VERSION}`,
      freshness: null,
      snapshotAgeMs: null,
    };
  }

  const ageMs = snapshotAgeMs(meta.snapshotGeneratedAt, nowMs);
  const freshness = resolveMiniAppSnapshotFreshness(meta.snapshotGeneratedAt, nowMs);
  const relativeAge = formatRelativeSnapshotAge(ageMs);
  const syncedAtIso = meta.snapshotReceivedAt || meta.snapshotGeneratedAt;
  const syncedAt = syncedAtIso ? formatIsoToShamsiDateTime(syncedAtIso) : "نامشخص";
  const ageDetail = relativeAge ? `اطلاعات مربوط به ${relativeAge} است` : "زمان تولید اطلاعات مشخص نیست";
  const detail = `${ageDetail} · آخرین همگام‌سازی: ${syncedAt} · نسخه ${MINIAPP_DISPLAY_VERSION}`;

  if (freshness === "very_stale") {
    return {
      connectivity,
      source: "snapshot",
      tone: "very_stale",
      title: "اتصال زنده برقرار نیست",
      badge: "اطلاعات قدیمی",
      detail,
      freshness,
      snapshotAgeMs: ageMs,
    };
  }

  if (freshness === "stale") {
    return {
      connectivity,
      source: "snapshot",
      tone: "stale",
      title: "اتصال زنده برقرار نیست",
      badge: "اطلاعات با تأخیر",
      detail,
      freshness,
      snapshotAgeMs: ageMs,
    };
  }

  return {
    connectivity,
    source: "snapshot",
    tone: "saved",
    title: "اتصال زنده برقرار نیست",
    badge: freshness === "fresh" ? "اطلاعات همگام‌شده" : "اطلاعات ذخیره‌شده",
    detail,
    freshness,
    snapshotAgeMs: ageMs,
  };
};
