import React, { useEffect } from "react";

type Props = {
  className?: string;  // پدینگ/گرید و...
  children: React.ReactNode;
  tint?: string;       // رنگ لایه‌ی شیشه (rgba)
  blurPx?: number;     // شدت بلور
  borderPx?: number;   // ضخامت بوردر
};

const LiquidGlassPanel: React.FC<Props> = ({
  className = "",
  children,
  tint = "rgba(255,255,255,0.22)",
  blurPx = 22,
  borderPx = 1,
}) => {
  useEffect(() => {
    if (typeof document === "undefined") return;
    let style = document.getElementById("liquid-glass-styles") as HTMLStyleElement | null;
    const css = `
      .lgp{
        position:relative; border-radius:20px; isolation:isolate; overflow:hidden;
        background: linear-gradient(180deg, rgba(255,255,255,.18), rgba(255,255,255,.10));
        box-shadow: 0 20px 50px rgba(0,0,0,.35), inset 0 1px rgba(255,255,255,.4);
        border: var(--lgp-bw,1px) solid rgba(255,255,255,.25);
        backdrop-filter: blur(var(--lgp-blur,22px)) saturate(1.4);
        -webkit-backdrop-filter: blur(var(--lgp-blur,22px)) saturate(1.4);
      }
      /* انعکاس بالایی */
      .lgp::before{
        content:""; position:absolute; inset:0; pointer-events:none;
        background:
          linear-gradient( to bottom, rgba(255,255,255,.35), rgba(255,255,255,0) 40%),
          radial-gradient(60% 40% at 50% -10%, rgba(255,255,255,.25), transparent 70%);
        mix-blend-mode:screen;
        opacity:.9;
      }
      /* درخشش نرم کنارها */
      .lgp::after{
        content:""; position:absolute; inset:-2px; pointer-events:none; border-radius:inherit;
        background: radial-gradient(60% 80% at 50% 120%, rgba(255,255,255,.2), transparent 70%);
        mix-blend-mode:overlay; opacity:.6;
      }
    `;
    if (!style) {
      style = document.createElement("style");
      style.id = "liquid-glass-styles";
      document.head.appendChild(style);
    }
    style.textContent = css;
  }, []);

  return (
    <div
      className={`lgp ${className}`}
      style={
        {
          backgroundColor: tint,
          // @ts-ignore
          "--lgp-blur": `${blurPx}px`,
          "--lgp-bw": `${borderPx}px`,
        } as React.CSSProperties
      }
    >
      {children}
    </div>
  );
};

export default LiquidGlassPanel;
