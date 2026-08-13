import React from "react";
import { Loader2 } from "../../components/lucide-react";

export const MiniAppDataState: React.FC<{
  loading?: boolean;
  error?: string | null;
  empty?: boolean;
  emptyText?: string;
  retry?: () => void;
}> = ({ loading, error, empty, emptyText = "اطلاعاتی برای نمایش وجود ندارد.", retry }) => {
  if (loading) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center text-mutedText" aria-busy="true">
        <Loader2 className="animate-spin" size={26} aria-hidden="true" />
        <p className="m-0 text-sm">در حال دریافت اطلاعات واقعی…</p>
      </div>
    );
  }
  if (error) {
    return (
      <div className="flex min-h-52 flex-col items-center justify-center gap-3 text-center" role="alert">
        <p className="m-0 max-w-sm text-sm leading-7 text-mutedText">{error}</p>
        {retry ? (
          <button type="button" onClick={retry} className="min-h-11 rounded-[var(--radius-md)] bg-primary px-5 text-sm font-bold text-primary-foreground">
            تلاش دوباره
          </button>
        ) : null}
      </div>
    );
  }
  if (empty) {
    return <p className="py-16 text-center text-sm leading-7 text-mutedText">{emptyText}</p>;
  }
  return null;
};
