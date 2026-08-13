// components/VariableProximityText.tsx
import React, { useEffect, useMemo, useRef } from "react";

type SegmentMode = "word" | "char";

type Props = {
  text: string;
  className?: string;
  radius?: number;       // گستره اثر (px)
  minWght?: number;      // کمترین وزن برای فونت متغیر
  maxWght?: number;      // بیشترین وزن برای فونت متغیر
  maxScale?: number;     // بزرگ‌نمایی بیشینه (۱.۰ یعنی بدون اسکیل)
  fallbackWeight?: boolean; // اگر فونت Variable نداری، وزن معمولی هم ست بشه
  mode?: SegmentMode;    // "word" برای فارسی توصیه می‌شود
  nowrap?: boolean;      // اگر true، تیتر تو یک خط می‌ماند
};

const clamp = (v: number, min: number, max: number) => Math.min(max, Math.max(min, v));
const ease = (t: number) => t * t;

const VariableProximityText: React.FC<Props> = ({
  text,
  className,
  radius = 180,
  minWght = 300,
  maxWght = 900,
  maxScale = 1.12,
  fallbackWeight = true,
  mode = "word",       // پیش‌فرض: کلمه‌ای (برای فارسی)
  nowrap = false,
}) => {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const segRefs = useRef<HTMLSpanElement[]>([]);
  const rafLock = useRef<number | null>(null);
  const pointer = useRef<{ x: number; y: number } | null>(null);

  // تزریق CSS یک‌باره
  useEffect(() => {
    if (typeof document === "undefined") return;
    if (document.getElementById("vp-styles")) return;
    const style = document.createElement("style");
    style.id = "vp-styles";
    style.textContent = `
      .vp-wrapper{position:relative;display:inline-flex;flex-wrap:wrap;cursor:default;line-height:1.15;will-change:transform;}
      .vp-wrapper.nowrap{white-space:nowrap}
      .vp-seg{display:inline-block;transition:font-variation-settings 90ms linear,font-weight 90ms linear,transform 90ms linear,opacity 90ms linear;will-change:font-variation-settings,transform,opacity;font-variation-settings:"wght" 300;transform-origin:center center;}
      .vp-space{display:inline}
    `;
    document.head.appendChild(style);
  }, []);

  // توکنایز: کلمه‌ای یا حرف‌به‌حرف
  const segments = useMemo(() => {
    if (mode === "char") {
      // برای متن‌های لاتین خوبه؛ در فارسی ممکنه اتصال حروف را خراب کند
      return Array.from(text).map((t) => ({ t, isSpace: t === " " }));
    }
    // حالت کلمه‌ای: فاصله‌ها را هم جدا نگه می‌داریم تا حفظ شوند
    const parts = text.split(/(\s+)/);
    return parts.map((p) => ({ t: p, isSpace: /^\s+$/.test(p) }));
  }, [text, mode]);

  useEffect(() => {
    segRefs.current = segRefs.current.slice(0, segments.length);
  }, [segments.length]);

  useEffect(() => {
    const root = containerRef.current;
    if (!root) return;

    const onMove = (e: PointerEvent) => {
      const rect = root.getBoundingClientRect();
      pointer.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };

      if (rafLock.current == null) {
        rafLock.current = requestAnimationFrame(() => {
          rafLock.current = null;
          if (!pointer.current) return;
          const { x, y } = pointer.current;

          for (const el of segRefs.current) {
            if (!el) continue;
            if (el.dataset.space === "1") continue; // روی فاصله‌ها تغییری نده

            const r = el.getBoundingClientRect();
            const cx = (r.left + r.right) / 2 - rect.left;
            const cy = (r.top + r.bottom) / 2 - rect.top;

            const dx = x - cx;
            const dy = y - cy;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const t = clamp(1 - dist / radius, 0, 1);
            const p = ease(t);

            const wght = Math.round(minWght + (maxWght - minWght) * p);
            const scale = 1 + (maxScale - 1) * p;

            el.style.fontVariationSettings = `'wght' ${wght}`;
            if (fallbackWeight) el.style.fontWeight = String(wght);
            el.style.transform = `translateZ(0) scale(${scale})`;
            el.style.opacity = String(0.85 + 0.15 * p);
          }
        });
      }
    };

    const onLeave = () => {
      pointer.current = null;
      for (const el of segRefs.current) {
        if (!el) continue;
        el.style.fontVariationSettings = `'wght' ${minWght}`;
        if (fallbackWeight) el.style.fontWeight = String(minWght);
        el.style.transform = `translateZ(0) scale(1)`;
        el.style.opacity = "1";
      }
    };

    root.addEventListener("pointermove", onMove, { passive: true });
    root.addEventListener("pointerleave", onLeave);
    root.addEventListener("pointerdown", onMove, { passive: true });

    return () => {
      root.removeEventListener("pointermove", onMove);
      root.removeEventListener("pointerleave", onLeave);
      root.removeEventListener("pointerdown", onMove);
      if (rafLock.current != null) cancelAnimationFrame(rafLock.current);
    };
  }, [radius, minWght, maxWght, maxScale, fallbackWeight]);

  return (
    <div
      ref={containerRef}
      className={[
        "vp-wrapper",
        nowrap ? "nowrap" : "",
        className || "",
      ].join(" ").trim()}
      dir="rtl"
    >
      {segments.map((seg, i) =>
        seg.isSpace ? (
          <span
            key={`s-${i}`}
            className="vp-space"
            data-space="1"
            ref={(el) => {
              if (el) segRefs.current[i] = el as HTMLSpanElement;
            }}
          >
            {seg.t}
          </span>
        ) : (
          <span
            key={`w-${i}`}
            className="vp-seg"
            data-space="0"
            ref={(el) => {
              if (el) segRefs.current[i] = el as HTMLSpanElement;
            }}
          >
            {seg.t}
          </span>
        )
      )}
    </div>
  );
};

export default VariableProximityText;
