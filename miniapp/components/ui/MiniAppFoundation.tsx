import React from "react";

export const MiniAppButton: React.FC<React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: "primary" | "secondary";
}> = ({ variant = "primary", className = "", type = "button", ...props }) => (
  <button {...props} type={type} className={`miniapp-button miniapp-button-${variant} ${className}`} />
);

export const MiniAppCard: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className = "", ...props }) => (
  <div {...props} className={`miniapp-card ${className}`} />
);

/** Presentation only: callers supply already-formatted values and units. */
export const MiniAppFinancialValue: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className = "", children, ...props }) => {
  if (typeof children === "string" && children.endsWith(" تومان")) {
    const number = children.slice(0, -6);
    return <strong {...props} className={`miniapp-money miniapp-family-money ${className}`} style={{ ...props.style, "--miniapp-number-length": number.length } as React.CSSProperties}>
      <bdi dir="ltr" className="miniapp-money-part">{number}</bdi>{" "}<span className="miniapp-family-currency">تومان</span>
    </strong>;
  }
  return <strong {...props} className={`miniapp-money ${className}`}>
    {typeof children === "string"
      ? children.split(/(\s+)/).map((part, index) => /^\s+$/.test(part) ? part : <span key={index} className="miniapp-money-part">{part}</span>)
      : children}
  </strong>;
};
