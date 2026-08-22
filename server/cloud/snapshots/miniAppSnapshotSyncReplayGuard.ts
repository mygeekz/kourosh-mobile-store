import { MINIAPP_SNAPSHOT_SYNC_REPLAY_TTL_MS } from "./miniAppSnapshotSyncProtocol";

export type MiniAppSnapshotReplayDecision = "accepted" | "replay" | "capacity_rejected";

export const createMiniAppSnapshotSyncReplayGuard = (options: {
  ttlMs?: number;
  maxEntries?: number;
  now?: () => number;
} = {}) => {
  const ttlMs = Math.max(60_000, Number(options.ttlMs || MINIAPP_SNAPSHOT_SYNC_REPLAY_TTL_MS));
  const maxEntries = Math.max(128, Number(options.maxEntries || 10_000));
  const now = options.now || Date.now;
  const entries = new Map<string, number>();

  const cleanup = (at: number) => {
    for (const [key, expiresAt] of entries) if (expiresAt <= at) entries.delete(key);
  };

  return {
    consume: (installationId: string, requestId: string): MiniAppSnapshotReplayDecision => {
      const at = now();
      cleanup(at);
      const key = `${installationId}\u0000${requestId}`;
      if (entries.has(key)) return "replay";
      if (entries.size >= maxEntries) return "capacity_rejected";
      entries.set(key, at + ttlMs);
      return "accepted";
    },
    size: () => {
      cleanup(now());
      return entries.size;
    },
    clear: () => entries.clear(),
  };
};
