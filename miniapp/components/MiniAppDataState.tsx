import React from "react";
import { CircleAlert, Database, Loader2 } from "../../components/lucide-react";
import { useMiniAppAuth } from "../auth/MiniAppAuthContext";
import { MINIAPP_PREMIUM } from "../reference/miniAppPremiumDesignSystem";
import { MINIAPP_VISUAL_REFERENCE } from "../reference/miniAppVisualSystem";
import { MiniAppIconTile } from "./MiniAppVisualPrimitives";
import { PremiumIconTile } from "./premium/MiniAppPremiumPrimitives";

export const MiniAppDataState: React.FC<{
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  retry?: () => void;
}> = ({ loading, error, empty, emptyText = "اطلاعاتی برای نمایش وجود ندارد.", retry }) => {
  const { identity } = useMiniAppAuth();
  const premium = identity?.kind === "partner";
  if (loading) {
    return (
      <div className={`${premium ? MINIAPP_PREMIUM.card : MINIAPP_VISUAL_REFERENCE.softCard} flex min-h-48 flex-col items-center justify-center gap-3 p-5 text-center ${premium ? "text-premium-muted" : "text-mutedText"}`} aria-busy="true">
        <span className={`flex size-12 items-center justify-center rounded-full border ${premium ? "border-premium-blue/15 bg-premium-blue-soft text-premium-blue" : "border-primary/15 bg-primary/10 text-primary"}`}><Loader2 className="animate-spin" size={24} aria-hidden="true" /></span>
        <p className="m-0 text-sm font-bold">در حال دریافت آخرین اطلاعات…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className={`${premium ? MINIAPP_PREMIUM.card : MINIAPP_VISUAL_REFERENCE.card} flex min-h-48 flex-col items-center justify-center gap-3 p-5 text-center`} role="alert">
        {premium ? <PremiumIconTile icon={CircleAlert} tone="red" size="lg" solid={false} /> : <MiniAppIconTile icon={CircleAlert} tone="danger" size="lg" />}
        <p className={`m-0 max-w-sm text-sm leading-7 ${premium ? "text-premium-muted" : "text-mutedText"}`}>{error}</p>
        {retry ? (
          <button type="button" onClick={retry} className={premium ? "min-h-11 rounded-[1.2rem] bg-premium-blue px-5 text-sm font-black text-white shadow-premium-active" : "min-h-11 rounded-[var(--radius-md)] bg-primary px-5 text-sm font-bold text-primary-foreground shadow-sm"}>
            تلاش دوباره
          </button>
        ) : null}
      </div>
    );
  }
  if (empty) {
    return (
      <div className={`${premium ? MINIAPP_PREMIUM.card : MINIAPP_VISUAL_REFERENCE.softCard} flex min-h-36 flex-col items-center justify-center gap-2 p-5 text-center`}>
        {premium ? <PremiumIconTile icon={Database} tone="slate" solid={false} /> : <MiniAppIconTile icon={Database} tone="muted" />}
        <p className={`m-0 text-sm leading-7 ${premium ? "text-premium-muted" : "text-mutedText"}`}>{emptyText}</p>
      </div>
    );
  }
  return null;
};
