export type MiniAppStoreConnectivity = "live" | "offline" | "recovering" | "unknown";

/**
 * Snapshot availability does not establish live backend connectivity.
 * Freshness is resolved separately in miniAppDataAvailability.ts.
 */
export const resolveMiniAppStoreConnectivity = (
  source: "live" | "snapshot" | null | undefined,
): MiniAppStoreConnectivity => {
  if (source === "live") return "live";
  if (source === "snapshot") return "offline";
  return "unknown";
};
