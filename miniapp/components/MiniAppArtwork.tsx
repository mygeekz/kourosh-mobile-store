import React from "react";

/** Local decorative illustrations; never product photos or permission indicators. */
export type MiniAppArtworkKind = "chart" | "collaboration" | "shopping" | "goods" | "calendar" | "receipt" | "accounts" | "money";
export const MiniAppArtwork: React.FC<{ kind: MiniAppArtworkKind; className?: string; eager?: boolean }> = ({ kind, className = "", eager = false }) => (
  <img className={`miniapp-artwork ${className}`} src={`/miniapp/premium/illustrations/${kind}.webp`} width={128} height={128} alt="" aria-hidden="true" decoding="async" loading={eager ? "eager" : "lazy"} />
);

export const MiniAppPageHeading: React.FC<React.PropsWithChildren<{
  className: string; title: React.ReactNode; id?: string; context?: string; description?: React.ReactNode; artwork: MiniAppArtworkKind;
}>> = ({ className, title, id, context, description, artwork, children }) => (
  <header className={`${className} miniapp-family-header`}>
    <div className="miniapp-family-header-copy">
      {context && <p className="miniapp-family-eyebrow">{context}</p>}
      <h1 id={id}>{title}</h1>
      {description && <p className="miniapp-family-description">{description}</p>}
    </div>
    <MiniAppArtwork kind={artwork} eager />
    {children && <div className="miniapp-family-header-summary">{children}</div>}
  </header>
);
