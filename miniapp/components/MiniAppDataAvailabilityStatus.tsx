import React from "react";
import { CircleAlert, Database, Radio, Store } from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { useMiniAppDataAvailability } from "../dataAvailability/MiniAppDataAvailabilityContext";
import { isMiniAppAvailabilityOnlineTone, MINIAPP_DATA_AVAILABILITY_REFERENCE, resolveMiniAppAvailabilityPresentation } from "../reference/miniAppDataAvailability";
import { MiniAppPill } from "./MiniAppVisualPrimitives";
import { PremiumPill } from "./premium/MiniAppPremiumPrimitives";

export const MiniAppDataAvailabilityStatus: React.FC = () => {
  const { meta, pending } = useMiniAppDataAvailability();
  const { identity } = useMiniAppAuth();
  if (pending || !meta) return null;

  const view = resolveMiniAppAvailabilityPresentation(meta);
  const storeOnline = isMiniAppAvailabilityOnlineTone(view.tone);
  const stateTone = storeOnline ? "success" : view.tone === "very_stale" ? "danger" : "warning";
  const StateIcon = storeOnline ? Radio : view.tone === "very_stale" ? CircleAlert : Database;

  if (identity?.kind === "partner") {
    if (storeOnline) {
      return (
        <section className="mb-5 flex flex-wrap items-center gap-2" aria-label="وضعیت تازگی اطلاعات">
          <PremiumPill tone="mint" icon={Radio}>{view.badge}</PremiumPill>
          <PremiumPill tone="blue" icon={Store}>{view.title}</PremiumPill>
          {meta.source === "snapshot" ? <span className="basis-full text-[10px] leading-5 text-premium-green">{view.detail}</span> : null}
        </section>
      );
    }
    const tone = view.tone === "very_stale" ? "red" : "orange";
    return (
      <section className="mb-5 rounded-[1.45rem] border border-white/95 bg-white/[0.92] p-3.5 shadow-premium-card" aria-label="وضعیت تازگی اطلاعات" role="status">
        <div className="flex flex-wrap items-center gap-2">
          <PremiumPill tone={tone} icon={StateIcon}>{view.badge}</PremiumPill>
          <PremiumPill tone={tone} icon={Store}>{view.title}</PremiumPill>
        </div>
        <span className="mt-2.5 block text-[10px] leading-5 text-premium-muted">{view.detail}</span>
      </section>
    );
  }

  return (
    <section className="mb-4 flex flex-wrap items-center gap-2" aria-label="وضعیت تازگی اطلاعات" role={meta.source === "snapshot" ? "status" : undefined}>
      <MiniAppPill tone={stateTone} icon={StateIcon}>{view.badge}</MiniAppPill>
      <MiniAppPill tone={storeOnline ? "primary" : "warning"} icon={Store}>{view.title}</MiniAppPill>
      <span className={`basis-full ${MINIAPP_DATA_AVAILABILITY_REFERENCE.detail}`}>{view.detail}</span>
    </section>
  );
};
