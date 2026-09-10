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
export const MiniAppFinancialValue: React.FC<React.HTMLAttributes<HTMLElement>> = ({ className = "", children, ...props }) => (
  <strong {...props} className={`miniapp-money ${className}`}>
    {typeof children === "string"
      ? children.split(/(\s+)/).map((part, index) => /^\s+$/.test(part) ? part : <span key={index} className="miniapp-money-part">{part}</span>)
      : children}
  </strong>
);
