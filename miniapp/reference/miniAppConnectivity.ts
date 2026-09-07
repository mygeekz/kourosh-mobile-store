export type MiniAppStoreConnectivity = "live" | "offline" | "recovering" | "unknown";

/**
 * Snapshot data is an Edge-backed synchronized source. A healthy active
 * snapshot represents an available store state even when the direct live path
 * is not used. Freshness is resolved separately in miniAppDataAvailability.ts.
 */
export const resolveMiniAppStoreConnectivity = (
  source: "live" | "snapshot" | null | undefined,
): MiniAppStoreConnectivity => {
  if (source === "live") return "live";
  if (source === "snapshot") return "live";
  return "unknown";
};
