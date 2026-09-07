import React from "react";

export const MiniAppBidiText: React.FC<{
  children: React.ReactNode;
  className?: string;
  direction?: "ltr" | "auto";
}> = ({ children, className, direction = "ltr" }) => (
  <bdi dir={direction} className={className}>{children}</bdi>
);
