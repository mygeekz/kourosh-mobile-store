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
    <header className={`${MINIAPP_PREMIUM.card} px-3.5 py-2`}>
      <div className="flex min-w-0 items-center justify-between gap-2.5">
        <div className="min-w-0 flex-1 text-start">
          {eyebrow ? <p className="m-0 text-[9px] font-black leading-4 text-premium-blue">{eyebrow}</p> : null}
          <h1 id={id} className="m-0 truncate text-start text-[1.05rem] font-black leading-6 tracking-tight text-premium-navy">{title}</h1>
        </div>
        <div className="flex shrink-0 items-center gap-1">
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
        <p className="mb-0 mt-1.5 text-start text-[9px] font-bold leading-4 text-premium-orange-deep">{availabilityView.detail}</p>
      ) : null}
      {availability.refreshing ? <p className="mb-0 mt-1 text-start text-[9px] font-bold leading-4 text-premium-blue">در حال به‌روزرسانی…</p> : null}
    </header>
  );
};
