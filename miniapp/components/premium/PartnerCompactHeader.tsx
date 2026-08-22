import React from "react";
import { Radio, Store } from "../../../components/lucide-react";
import { useMiniAppDataAvailability } from "../../dataAvailability/MiniAppDataAvailabilityContext";
import { isMiniAppAvailabilityOnlineTone, resolveMiniAppAvailabilityPresentation } from "../../reference/miniAppDataAvailability";
import { MINIAPP_PREMIUM } from "../../reference/miniAppPremiumDesignSystem";
import { PremiumPill } from "./MiniAppPremiumPrimitives";

export const PartnerCompactHeader: React.FC<{
  id: string;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
}> = ({ id, title, eyebrow }) => {
  const { meta, pending } = useMiniAppDataAvailability();
  const availabilityView = !pending && meta ? resolveMiniAppAvailabilityPresentation(meta) : null;
  const availabilityOnline = availabilityView ? isMiniAppAvailabilityOnlineTone(availabilityView.tone) : false;
  const availabilityTone = availabilityOnline
    ? "mint"
    : availabilityView?.tone === "very_stale"
      ? "red"
      : availabilityView
        ? "orange"
        : "blue";
  const storeTone = availabilityOnline ? "blue" : availabilityTone;

  return (
    <header className={`${MINIAPP_PREMIUM.card} px-3.5 py-2`}>
      <div dir="ltr" className="flex min-w-0 items-center justify-between gap-2.5">
        <div className="flex shrink-0 items-center gap-1">
          {availabilityView ? (
            <PremiumPill
              tone={availabilityTone}
              icon={availabilityOnline ? Radio : Store}
              compact
              className="whitespace-nowrap shadow-none"
            >
              {availabilityView.badge}
            </PremiumPill>
          ) : null}
          <PremiumPill
            tone={storeTone}
            icon={Store}
            compact
            className="whitespace-nowrap shadow-none"
          >
            {availabilityView ? availabilityView.title : "فروشگاه آنلاین"}
          </PremiumPill>
        </div>
        <div dir="rtl" className="min-w-0 flex-1 text-right">
          {eyebrow ? <p className="m-0 text-[9px] font-black leading-4 text-premium-blue">{eyebrow}</p> : null}
          <h1 id={id} className="m-0 truncate text-right text-[1.05rem] font-black leading-6 tracking-tight text-premium-navy">{title}</h1>
        </div>
      </div>
      {availabilityView && meta?.source === "snapshot" ? (
        <p dir="rtl" className={`mb-0 mt-1.5 text-right text-[9px] font-bold leading-4 ${availabilityOnline ? "text-premium-green" : "text-premium-orange-deep"}`}>{availabilityView.detail}</p>
      ) : null}
    </header>
  );
};
