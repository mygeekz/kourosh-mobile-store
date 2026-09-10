import React from "react";
import { Radio, Store } from "../../../components/lucide-react";
import { useMiniAppAvailabilityViewModel } from "../../dataAvailability/useMiniAppAvailabilityViewModel";
import { MINIAPP_PREMIUM } from "../../reference/miniAppPremiumDesignSystem";
import { PremiumPill } from "./MiniAppPremiumPrimitives";

export const PartnerCompactHeader: React.FC<{
  id: string;
  title: React.ReactNode;
  eyebrow?: React.ReactNode;
}> = ({ id, title, eyebrow }) => {
  const availability = useMiniAppAvailabilityViewModel();
  const availabilityView = availability.presentation;

  return (
    <header className={`${MINIAPP_PREMIUM.card} p-4`}>
      <div className="flex min-w-0 flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 basis-full text-start">
          {eyebrow ? <p className="m-0 text-xs font-black leading-6 text-premium-blue">{eyebrow}</p> : null}
          <h1 id={id} className="miniapp-heading m-0 text-start text-lg font-bold text-premium-navy">{title}</h1>
        </div>
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          {availabilityView ? (
            <PremiumPill
              tone={availability.premiumTone}
              icon={availability.isLive ? Radio : Store}
              compact
              className="whitespace-nowrap shadow-none"
            >
              {availabilityView.badge}
            </PremiumPill>
          ) : null}
          <PremiumPill
            tone={availability.storePremiumTone}
            icon={Store}
            compact
            className="whitespace-nowrap shadow-none"
          >
            {availabilityView ? availabilityView.title : "وضعیت اتصال"}
          </PremiumPill>
        </div>
      </div>
      {availabilityView && availability.source === "snapshot" ? (
        <p className="mb-0 mt-1.5 text-start text-xs font-bold leading-6 text-premium-orange-deep">{availabilityView.detail}</p>
      ) : null}
      {availability.refreshing ? <p className="mb-0 mt-1 text-start text-xs font-bold leading-6 text-premium-blue">در حال به‌روزرسانی…</p> : null}
    </header>
  );
};
