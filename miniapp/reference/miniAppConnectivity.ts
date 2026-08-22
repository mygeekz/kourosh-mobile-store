export type MiniAppStoreConnectivity = "online" | "offline" | "unknown";

// Snapshot sync runs every five minutes in production. Seven minutes allows a
// bounded scheduling/network margin while still changing to offline quickly
// after Local Kourosh stops publishing snapshots.
export const MINIAPP_STORE_ONLINE_GRACE_MS = 7 * 60 * 1000;
const MINIAPP_CLOCK_FUTURE_TOLERANCE_MS = 2 * 60 * 1000;

export const resolveMiniAppStoreConnectivity = (
  source: "live" | "snapshot",
  snapshotGeneratedAt: string | null,
  nowMs = Date.now(),
): MiniAppStoreConnectivity => {
  if (source === "live") return "online";
  if (!snapshotGeneratedAt) return "unknown";
  const generatedAtMs = Date.parse(snapshotGeneratedAt);
  if (!Number.isFinite(generatedAtMs)) return "unknown";
  const ageMs = nowMs - generatedAtMs;
  if (ageMs < -MINIAPP_CLOCK_FUTURE_TOLERANCE_MS) return "unknown";
  return ageMs <= MINIAPP_STORE_ONLINE_GRACE_MS ? "online" : "offline";
};
