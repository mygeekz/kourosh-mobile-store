import React from "react";
import Orb from "./Orb";

export type OrbBackdropProps = {
  sizeVmin?: number; // قطر اورب برحسب vmin
  x?: string;        // مرکز افقی
  y?: string;        // مرکز عمودی
  hue?: number;
  className?: string;
  zIndex?: number;
  /** اگر true باشد هاور به صورت سراسری (window) شنیده می‌شود */
  hoverGlobal?: boolean;
  /** اگر true باشد همیشه در حالت hover بماند */
  forceHover?: boolean;
};

const OrbBackdrop: React.FC<OrbBackdropProps> = ({
  sizeVmin = 140, // کوچک‌تر از قبل
  x = "50%",
  y = "50%",
  hue = 0,
  className = "",
  zIndex = 0,
  hoverGlobal = true,
  forceHover = false,
}) => {
  const size = `${sizeVmin}vmin`;
  return (
    <div
      className={`fixed inset-0 ${className}`}
      style={{ zIndex, pointerEvents: "none" }}
      aria-hidden="true"
    >
      <div
        className="absolute"
        style={{
          width: size,
          height: size,
          left: x,
          top: y,
          transform: "translate(-50%, -50%)",
          // فقط برای محاسبهٔ موقعیت، نه برای گرفتن کلیک‌ها
          pointerEvents: hoverGlobal ? "none" : "auto",
        }}
      >
        <Orb
          className="w-full h-full"
          hue={hue}
          forceHoverState={forceHover}
          rotateOnHover
          hoverGlobal={hoverGlobal}
        />
      </div>
    </div>
  );
};

export default OrbBackdrop;
