import React, { useEffect, useRef } from "react";

type Props = {
  className?: string;   // مثلا rounded-2xl
  ring?: number;        // ضخامت رینگ نئونی (px)
  radius?: number;      // گوشه‌ها (px) – اگر با کلاس Tailwind می‌دهی، لازم نیست
  glow?: number;        // شدت درخشش روی لبه (0..1)
  palette?: "violet" | "indigo" | "cyanish";
  children: React.ReactNode;
};

const PALETTES: Record<NonNullable<Props["palette"]>, string> = {
  violet:
    "conic-gradient(from 180deg at 50% 50%, #7c3aed, #8b5cf6, #22d3ee, #8b5cf6, #7c3aed)",
  indigo:
    "conic-gradient(from 180deg at 50% 50%, #4338ca, #6366f1, #22d3ee, #6366f1, #4338ca)",
  cyanish:
    "conic-gradient(from 180deg at 50% 50%, #06b6d4, #22d3ee, #8b5cf6, #22d3ee, #06b6d4)",
};

const MagicBentoEdge: React.FC<Props> = ({
  className = "",
  ring = 2,
  radius,
  glow = 0.45,
  palette = "violet",
  children,
}) => {
  const ref = useRef<HTMLDivElement | null>(null);

  // CSS یک‌بار
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("mbento2-styles")) return;
    const style = document.createElement("style");
    style.id = "mbento2-styles";
    style.textContent = `
      .mb2{position:relative;display:block;isolation:isolate;overflow:visible}
      /* لایه‌ی رینگ: inner-stroke واقعی با ماسک مرسوم */
      .mb2::before{
        content:"";position:absolute;inset:0;border-radius:inherit;
        padding:var(--mb2-ring,2px);
        background: var(--mb2-palette) border-box;
        /* فقط ناحیه‌ی حاشیه دیده شود */
        -webkit-mask: linear-gradient(#000 0 0) content-box, linear-gradient(#000 0 0);
        -webkit-mask-composite: xor; mask-composite: exclude;
        pointer-events:none;z-index:0;opacity:.95;
      }
      /* درخشش باریک که روی لبه‌ها حرکت می‌کند */
      .mb2::after{
        content:"";position:absolute;inset:-12%;
        border-radius:inherit;pointer-events:none;z-index:0;
        background:
          radial-gradient(120px 60px at var(--mb2-x,50%) var(--mb2-y,50%), rgba(139,92,246,.8), transparent 45%);
        filter: blur(18px);
        opacity: var(--mb2-glow,.45);
      }
      /* لایه‌ی محتوا */
      .mb2-inner{position:relative;z-index:1;border-radius:inherit;background-clip:padding-box}
      @media (prefers-reduced-motion: reduce){
        .mb2::after{display:none}
      }
    `;
    document.head.appendChild(style);
  }, []);

  // دنبال‌کردن موس (فقط برای درخشش روی لبه‌ها – خود محتوا دست‌نخورده است)
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const setPos = (x: number, y: number) => {
      el.style.setProperty("--mb2-x", `${x}px`);
      el.style.setProperty("--mb2-y", `${y}px`);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      setPos(e.clientX - r.left, e.clientY - r.top);
    };
    const onLeave = () => {
      const r = el.getBoundingClientRect();
      setPos(r.width / 2, r.height / 2);
    };
    el.addEventListener("pointermove", onMove, { passive: true });
    el.addEventListener("pointerleave", onLeave);
    onLeave();
    return () => {
      el.removeEventListener("pointermove", onMove);
      el.removeEventListener("pointerleave", onLeave);
    };
  }, []);

  return (
    <div
      ref={ref}
      className={`mb2 ${className}`}
      style={
        {
          borderRadius: radius ? `${radius}px` : undefined,
          // @ts-ignore
          "--mb2-ring": `${ring}px`,
          "--mb2-glow": glow,
          "--mb2-palette": PALETTES[palette],
        } as React.CSSProperties
      }
    >
      <div className="mb2-inner">{children}</div>
    </div>
  );
};

export default MagicBentoEdge;
