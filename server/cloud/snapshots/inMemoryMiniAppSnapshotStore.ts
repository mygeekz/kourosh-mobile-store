import type { MiniAppStoredSnapshotV1 } from "./miniAppSnapshotContracts";
import { assertValidStoredMiniAppSnapshot } from "./miniAppSnapshotValidation";

export type InMemoryMiniAppSnapshotUpsertResult = {
  status: "inserted" | "updated" | "idempotent" | "stale_rejected" | "version_conflict_rejected" | "installation_conflict_rejected";
  current: MiniAppStoredSnapshotV1 | null;
};

const keyFor = (snapshot: Pick<MiniAppStoredSnapshotV1, "tenantId" | "subjectKind" | "subjectKey">): string =>
  `${snapshot.tenantId}\u0000${snapshot.subjectKind}\u0000${snapshot.subjectKey}`;

export const createInMemoryMiniAppSnapshotStore = () => {
  const records = new Map<string, MiniAppStoredSnapshotV1>();
  return {
    get: (tenantId: string, subjectKind: "customer" | "partner", subjectKey: string): MiniAppStoredSnapshotV1 | null =>
      records.get(`${tenantId}\u0000${subjectKind}\u0000${subjectKey}`) || null,

    upsert: (incoming: MiniAppStoredSnapshotV1): InMemoryMiniAppSnapshotUpsertResult => {
      assertValidStoredMiniAppSnapshot(incoming);
      const key = keyFor(incoming);
      const current = records.get(key) || null;
      if (!current) {
        records.set(key, structuredClone(incoming));
        return { status: "inserted", current: structuredClone(incoming) };
      }
      if (incoming.installationId !== current.installationId) {
        return { status: "installation_conflict_rejected", current: structuredClone(current) };
      }
      if (incoming.snapshotVersion < current.snapshotVersion) {
        return { status: "stale_rejected", current: structuredClone(current) };
      }
      if (incoming.snapshotVersion === current.snapshotVersion) {
        if (incoming.contentHash === current.contentHash) {
          return { status: "idempotent", current: structuredClone(current) };
        }
        return { status: "version_conflict_rejected", current: structuredClone(current) };
      }
      records.set(key, structuredClone(incoming));
      return { status: "updated", current: structuredClone(incoming) };
    },

    size: (): number => records.size,
    clear: (): void => records.clear(),
  };
};
