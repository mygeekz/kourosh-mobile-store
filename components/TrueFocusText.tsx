import React, { useEffect, useMemo, useRef } from "react";

type Props = {
  text: string;
  className?: string;

  // ظاهر
  boxSize?: number;     // px
  radius?: number;      // px  (معمولاً ≈ 0.6 × boxSize)
  color?: string;
  corner?: number;      // px
  thickness?: number;   // px
  blur?: number;        // px
  dim?: number;         // 0..1

  // رفتار
  autoCycle?: boolean;      // چرخه خودکار بین کلمات
  cycleHoldMs?: number;     // مکث روی هر کلمه
  cycleAnimMs?: number;     // زمان حرکت بین دو کلمه
  pauseOnHover?: boolean;   // روی هاور، کنترل به ماوس
  lockAxis?: "none" | "x" | "y"; // قفل حرکت روی یک محور (برای ما: "x")
};

const TrueFocusText: React.FC<Props> = ({
  text,
  className,
  boxSize = 140,
  radius = 85,
  color = "#8b5cf6",
  corner = 12,
  thickness = 2,
  blur = 2.2,
  dim = 0.42,
  autoCycle = true,
  cycleHoldMs = 1100,
  cycleAnimMs = 420,
  pauseOnHover = true,
  lockAxis = "none",
}) => {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const wordRefs = useRef<HTMLSpanElement[]>([]);
  const animRaf = useRef<number | null>(null);
  const cycleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const manualMode = useRef(false);
  const current = useRef<{ x: number; y: number } | null>(null);
  const fixedYRef = useRef<number | null>(null); // ارتفاع ثابت وقتی lockAxis="x"

  // CSS تزریق/به‌روزرسانی
  useEffect(() => {
    if (typeof document === "undefined") return;
    let style = document.getElementById("true-focus-styles") as HTMLStyleElement | null;
    const css = `
      .tf-wrap{position:relative;display:inline-block;line-height:1.2;contain:layout style;overflow:visible;direction:inherit}
      .tf-layer{white-space:inherit}
      .tf-base{position:relative;z-index:1;filter:blur(var(--tf-blur,2.2px));opacity:var(--tf-dim,0.42);transition:opacity .2s ease, filter .2s ease}
      .tf-reveal{position:absolute;inset:0;z-index:2;pointer-events:none;
        --tf-clip: circle(var(--tf-radius,85px) at var(--tf-x,50%) var(--tf-y,50%));
        clip-path: var(--tf-clip); -webkit-clip-path: var(--tf-clip);
        -webkit-mask-image: radial-gradient(circle var(--tf-radius,85px) at var(--tf-x,50%) var(--tf-y,50%), #000 0 70%, transparent 85%);
                mask-image: radial-gradient(circle var(--tf-radius,85px) at var(--tf-x,50%) var(--tf-y,50%), #000 0 70%, transparent 85%);
      }
      .tf-corners{position:absolute;z-index:3;pointer-events:none;will-change:transform;width:var(--tf-size);height:var(--tf-size);left:0;top:0;
        transform: translate(calc(var(--tf-x,50%) - var(--tf-size)/2), calc(var(--tf-y,50%) - var(--tf-size)/2));
        filter: drop-shadow(0 0 8px rgba(0,0,0,.25));
      }
      .tf-corner{position:absolute;width:var(--tf-corner);height:var(--tf-corner)}
      .tf-corner.tl{top:0;left:0;border-top:var(--tf-thickness) solid var(--tf-color);border-left:var(--tf-thickness) solid var(--tf-color);border-top-left-radius:6px}
      .tf-corner.tr{top:0;right:0;border-top:var(--tf-thickness) solid var(--tf-color);border-right:var(--tf-thickness) solid var(--tf-color);border-top-right-radius:6px}
      .tf-corner.bl{bottom:0;left:0;border-bottom:var(--tf-thickness) solid var(--tf-color);border-left:var(--tf-thickness) solid var(--tf-color);border-bottom-left-radius:6px}
      .tf-corner.br{bottom:0;right:0;border-bottom:var(--tf-thickness) solid var(--tf-color);border-right:var(--tf-thickness) solid var(--tf-color);border-bottom-right-radius:6px}
      .tf-measure{position:absolute;inset:0;visibility:hidden;pointer-events:none;white-space:inherit;direction:inherit}
      .tf-word{display:inline}
      @media (prefers-reduced-motion: reduce){
        .tf-reveal{-webkit-mask-image:none;mask-image:none;clip-path:none}
        .tf-base{filter:none;opacity:1}
        .tf-corners{display:none}
      }
    `;
    if (!style) {
      style = document.createElement("style");
      style.id = "true-focus-styles";
      document.head.appendChild(style);
    }
    style.textContent = css;
  }, []);

  const tokens = useMemo(() => text.split(/(\s+)/), [text]);

  // تنظیمات و چرخه
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;

    // ظاهر
    el.style.setProperty("--tf-size", `${boxSize}px`);
    el.style.setProperty("--tf-radius", `${radius}px`);
    el.style.setProperty("--tf-color", color);
    el.style.setProperty("--tf-corner", `${corner}px`);
    el.style.setProperty("--tf-thickness", `${thickness}px`);
    el.style.setProperty("--tf-blur", `${blur}px`);
    el.style.setProperty("--tf-dim", `${dim}`);

    // مراکز کلمات
    const words = wordRefs.current.filter(Boolean);
    const rootRect = el.getBoundingClientRect();
    const centers = words.map((w) => {
      const r = w.getBoundingClientRect();
      return { x: r.left + r.width / 2 - rootRect.left, y: r.top + r.height / 2 - rootRect.top };
    });

    // y ثابت: میانهٔ yها، یا وسط باکس اگر کلمه‌ای نبود
    if (lockAxis === "x") {
      if (centers.length) {
        const ys = centers.map(c => c.y).sort((a,b)=>a-b);
        fixedYRef.current = ys[Math.floor(ys.length/2)];
      } else {
        fixedYRef.current = rootRect.height / 2;
      }
      // y همهٔ نقاط هدف را همسان کن
      centers.forEach(c => (c.y = fixedYRef.current!));
      // مقدار اولیه
      el.style.setProperty("--tf-y", `${fixedYRef.current}px`);
    }

    const setXY = (x: number, y: number) => {
      if (lockAxis === "x" && fixedYRef.current != null) y = fixedYRef.current;
      if (lockAxis === "y") x = rootRect.width / 2;
      el.style.setProperty("--tf-x", `${x}px`);
      el.style.setProperty("--tf-y", `${y}px`);
      current.current = { x, y };
    };

    // شروع از وسط
    setXY(rootRect.width / 2, (fixedYRef.current ?? rootRect.height / 2));

    // انیمیشن نرم
    const easeInOut = (t: number) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
    const animateTo = (nx: number, ny: number, ms: number) => {
      if (!current.current) current.current = { x: nx, y: ny };
      const sx = current.current.x, sy = current.current.y;
      const start = performance.now();
      if (animRaf.current) cancelAnimationFrame(animRaf.current);
      const step = (now: number) => {
        const t = Math.min(1, (now - start) / ms);
        const k = easeInOut(t);
        const x = sx + (nx - sx) * k;
        const y = sy + (ny - sy) * k;
        setXY(x, y);
        if (t < 1) animRaf.current = requestAnimationFrame(step);
      };
      animRaf.current = requestAnimationFrame(step);
    };

    // چرخه خودکار
    let idx = 0;
    const stopCycle = () => {
      if (cycleTimer.current) { clearTimeout(cycleTimer.current); cycleTimer.current = null; }
    };
    const loop = () => {
      if (!autoCycle) return;
      const c = centers[idx % Math.max(centers.length, 1)] || { x: rootRect.width / 2, y: (fixedYRef.current ?? rootRect.height / 2) };
      animateTo(c.x, c.y, cycleAnimMs);
      idx++;
      cycleTimer.current = setTimeout(loop, cycleHoldMs + cycleAnimMs);
    };

    // رویدادهای هاور/ماوس
    const onEnter = () => { if (pauseOnHover) { manualMode.current = true; stopCycle(); } };
    const onLeave = () => {
      if (!pauseOnHover) return;
      manualMode.current = false;
      stopCycle();
      setTimeout(loop, 150);
    };
    const onMove = (e: PointerEvent) => {
      if (!pauseOnHover) return;
      manualMode.current = true;
      let x = Math.max(0, Math.min(e.clientX - rootRect.left, rootRect.width));
      let y = Math.max(0, Math.min(e.clientY - rootRect.top, rootRect.height));
      if (lockAxis === "x" && fixedYRef.current != null) y = fixedYRef.current;
      if (lockAxis === "y") x = rootRect.width / 2;
      setXY(x, y);
    };

    el.addEventListener("pointerenter", onEnter);
    el.addEventListener("pointerleave", onLeave);
    el.addEventListener("pointermove", onMove, { passive: true });

    // استارت چرخه
    stopCycle(); if (autoCycle) loop();

    return () => {
      el.removeEventListener("pointerenter", onEnter);
      el.removeEventListener("pointerleave", onLeave);
      el.removeEventListener("pointermove", onMove);
      stopCycle();
      if (animRaf.current) cancelAnimationFrame(animRaf.current);
    };
  }, [
    text, boxSize, radius, color, corner, thickness, blur, dim,
    autoCycle, cycleHoldMs, cycleAnimMs, pauseOnHover, lockAxis
  ]);

  useEffect(() => {
    wordRefs.current = wordRefs.current.slice(0, tokens.length);
  }, [tokens.length]);

  return (
    <div ref={wrapRef} className={["tf-wrap", className || ""].join(" ").trim()} dir="rtl">
      <span className="tf-layer tf-base">{text}</span>
      <span className="tf-layer tf-reveal">{text}</span>
      <span className="tf-corners" aria-hidden="true">
        <span className="tf-corner tl" />
        <span className="tf-corner tr" />
        <span className="tf-corner bl" />
        <span className="tf-corner br" />
      </span>
      {/* لایهٔ اندازه‌گیری کلمات */}
      <span className="tf-measure" aria-hidden="true">
        {tokens.map((tk, i) =>
          /\s+/.test(tk) ? (
            <span key={`s-${i}`}>{tk}</span>
          ) : (
            <span
              key={`w-${i}`}
              className="tf-word"
              ref={(el) => { if (el) wordRefs.current[i] = el; }}
            >
              {tk}
            </span>
          )
        )}
      </span>
    </div>
  );
};

export default TrueFocusText;
