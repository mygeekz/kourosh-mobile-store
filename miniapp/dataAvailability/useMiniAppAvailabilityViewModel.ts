import { useMemo } from "react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import {
  isMiniAppAvailabilityLiveTone,
  resolveMiniAppAvailabilityPresentation,
  type MiniAppAvailabilityPresentation,
  type MiniAppDataSource,
  type MiniAppSnapshotFreshness,
} from "../reference/miniAppDataAvailability";
import type { MiniAppIdentityKind } from "../types";
import { useMiniAppDataAvailability } from "./MiniAppDataAvailabilityContext";

export type MiniAppAvailabilityPhase = "unknown" | "loading" | "refreshing" | "ready";
export type MiniAppAvailabilitySemanticTone = "success" | "warning" | "danger" | "neutral";
export type MiniAppAvailabilityPremiumTone = "mint" | "orange" | "red" | "blue";
export type MiniAppIdentityAvailabilityState = "ready" | "syncing" | "failed" | "unknown";

export type MiniAppAvailabilityViewModel = {
  role: MiniAppIdentityKind | null;
  identityState: MiniAppIdentityAvailabilityState;
  phase: MiniAppAvailabilityPhase;
  pending: boolean;
  refreshing: boolean;
  hasKnownAvailability: boolean;
  presentation: MiniAppAvailabilityPresentation | null;
  source: MiniAppDataSource | null;
  freshness: MiniAppSnapshotFreshness | null;
  isLive: boolean;
  semanticTone: MiniAppAvailabilitySemanticTone;
  premiumTone: MiniAppAvailabilityPremiumTone;
  storePremiumTone: MiniAppAvailabilityPremiumTone;
  refreshLabel: string | null;
};

const resolveIdentityState = (authStatus: ReturnType<typeof useMiniAppAuth>["status"]): MiniAppIdentityAvailabilityState => {
  if (authStatus === "authenticated") return "ready";
  if (authStatus === "syncing") return "syncing";
  if (authStatus === "error" || authStatus === "unlinked") return "failed";
  return "unknown";
};

export const useMiniAppAvailabilityViewModel = (nowMs = Date.now()): MiniAppAvailabilityViewModel => {
  const { meta, pending } = useMiniAppDataAvailability();
  const auth = useMiniAppAuth();

  return useMemo(() => {
    const presentation = meta ? resolveMiniAppAvailabilityPresentation(meta, nowMs) : null;
    const isLive = presentation ? isMiniAppAvailabilityLiveTone(presentation.tone) : false;
    const semanticTone: MiniAppAvailabilitySemanticTone = !presentation
      ? "neutral"
      : isLive
        ? "success"
        : presentation.tone === "very_stale"
          ? "danger"
          : "warning";
    const premiumTone: MiniAppAvailabilityPremiumTone = !presentation
      ? "blue"
      : isLive
        ? "mint"
        : presentation.tone === "very_stale"
          ? "red"
          : "orange";
    const phase: MiniAppAvailabilityPhase = pending
      ? meta
        ? "refreshing"
        : "loading"
      : meta
        ? "ready"
        : "unknown";

    return {
      role: auth.identity?.kind || null,
      identityState: resolveIdentityState(auth.status),
      phase,
      pending,
      refreshing: phase === "refreshing",
      hasKnownAvailability: Boolean(presentation),
      presentation,
      source: presentation?.source || null,
      freshness: presentation?.freshness || null,
      isLive,
      semanticTone,
      premiumTone,
      storePremiumTone: isLive ? "blue" : premiumTone,
      refreshLabel: phase === "refreshing" ? "در حال به‌روزرسانی…" : null,
    };
  }, [auth.identity?.kind, auth.status, meta, nowMs, pending]);
};
