import React, { useEffect, useState } from "react";
import { CircleAlert, Database, Loader2, Radio, Store } from "../../components/lucide-react";
import { useMiniAppAvailabilityViewModel } from "../dataAvailability/useMiniAppAvailabilityViewModel";
import { MINIAPP_DATA_AVAILABILITY_REFERENCE } from "../reference/miniAppDataAvailability";
import { useMiniAppDataAvailability } from "../dataAvailability/MiniAppDataAvailabilityContext";
import { MiniAppPill } from "./MiniAppVisualPrimitives";
import { PremiumPill } from "./premium/MiniAppPremiumPrimitives";

export const MiniAppDataAvailabilityStatus: React.FC = () => {
  const { meta } = useMiniAppDataAvailability();
  const [nowMs, setNowMs] = useState(() => Date.now());
  const availability = useMiniAppAvailabilityViewModel(nowMs);

  useEffect(() => {
    if (!meta || meta.source !== "snapshot") return;
    setNowMs(Date.now());
    const timer = window.setInterval(() => setNowMs(Date.now()), 30_000);
    return () => window.clearInterval(timer);
  }, [meta]);

  if (!meta || !availability.hasKnownAvailability) return null;

  // Snapshot age keeps advancing while the Mini App remains open. The shared
  // v253 view model remains the only place that resolves provenance/tone.
  const view = availability.presentation!;
  const stateTone = availability.semanticTone === "success"
    ? "success"
    : availability.semanticTone === "danger"
      ? "danger"
      : "warning";
  const titleTone = stateTone === "success" ? "primary" : stateTone;
  const StateIcon = availability.isLive ? Radio : availability.semanticTone === "danger" ? CircleAlert : Database;
  const refreshingPill = availability.refreshing ? (
    <PremiumPill tone="blue" icon={Loader2}>در حال به‌روزرسانی…</PremiumPill>
  ) : null;

  if (availability.role === "partner") {
    if (availability.isLive) {
      return (
        <section className="mb-5 flex flex-wrap items-center gap-2" aria-label="وضعیت تازگی اطلاعات" aria-busy={availability.refreshing || undefined}>
          <PremiumPill tone="mint" icon={Radio}>{view.badge}</PremiumPill>
          <PremiumPill tone="blue" icon={Store}>{view.title}</PremiumPill>
          {refreshingPill}
        </section>
      );
    }
    return (
      <section className="mb-5 rounded-[1.45rem] border border-white/95 bg-white/[0.92] p-3.5 shadow-premium-card" aria-label="وضعیت تازگی اطلاعات" role="status" aria-busy={availability.refreshing || undefined}>
        <div className="flex flex-wrap items-center gap-2">
          <PremiumPill tone={availability.premiumTone} icon={StateIcon}>{view.badge}</PremiumPill>
          <PremiumPill tone={availability.premiumTone} icon={Store}>{view.title}</PremiumPill>
          {refreshingPill}
        </div>
        <span className="mt-2.5 block text-[10px] leading-5 text-premium-muted">{view.detail}</span>
      </section>
    );
  }

  return (
    <section className="mb-4 flex flex-wrap items-center gap-2" aria-label="وضعیت تازگی اطلاعات" role={meta.source === "snapshot" ? "status" : undefined} aria-busy={availability.refreshing || undefined}>
      <MiniAppPill tone={stateTone} icon={StateIcon}>{view.badge}</MiniAppPill>
      <MiniAppPill tone={titleTone} icon={Store}>{view.title}</MiniAppPill>
      {availability.refreshing ? <MiniAppPill tone="primary" icon={Loader2}>در حال به‌روزرسانی…</MiniAppPill> : null}
      <span className={`basis-full ${MINIAPP_DATA_AVAILABILITY_REFERENCE.detail}`}>{view.detail}</span>
    </section>
  );
};
