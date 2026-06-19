// components/LoginLogoGlow.tsx — anime.js v3.2.1
import { useEffect, useRef } from "react";
import anime from "animejs/lib/anime.es.js";
import logoSvgText from "./assets/logo_outlined.svg?raw";

// تنظیم‌ها
const MAX_W = 620;          // حداکثر عرض لوگو (px)
const SIZE_H = 170;         // ارتفاع قاب؛ لوگو بزرگ می‌ماند ولی فضای خالی کم می‌شود
const BASE_STROKE = 3.2;    // ضخامت خطوط ثابت
const GLOW_STROKE = 5;      // ضخامت لاین نوری
const SEGMENT_RATIO = 0.22; // طول لاین نوری نسبت به مسیر (زیر 0.45 بماند)
const SPEED = 68000;         // سرعت(ms)
const COLOR = "#22d3ee";    // رنگ نور

export default function LoginLogoGlow() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    const cleanups: Array<() => void> = [];

    (async () => {
      // 1) لود SVG و mount داخل DOM (برای getBBox لازم است در DOM باشد)
      const doc = new DOMParser().parseFromString(logoSvgText, "image/svg+xml");
      const svg = doc.querySelector("svg") as SVGSVGElement | null;
      if (!svg) return;

      host.innerHTML = "";
      host.appendChild(svg);

      // 2) بریدن فضای خالی: viewBox = bounding box واقعی گرافیک
      try {
        const bbox = svg.getBBox(); // ابعاد واقعی محتوا
        svg.setAttribute("viewBox", `${bbox.x} ${bbox.y} ${bbox.width} ${bbox.height}`);
      } catch {
        // اگر مرورگر اجازه نداد، ادامه می‌دهیم؛ فقط trimming انجام نمی‌شود
      }

      // 3) اندازه و نسبت نمایش
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.setAttribute("preserveAspectRatio", "xMidYMid meet"); // وسط‌چین

      // 4) defs با id یکتا (گرادیان + گلو)
      const uid = "lg-" + Math.random().toString(36).slice(2);
      const NS = "http://www.w3.org/2000/svg";
      let defs = svg.querySelector("defs");
      if (!defs) {
        defs = document.createElementNS(NS, "defs");
        svg.prepend(defs);
      }
      const extra = document.createElementNS(NS, "g");
      extra.innerHTML = `
        <filter id="${uid}-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="3.5" result="b"/>
          <feMerge><feMergeNode in="b"/><feMergeNode in="SourceGraphic"/></feMerge>
        </filter>
        <linearGradient id="${uid}-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="${COLOR}" stop-opacity="0"/>
          <stop offset="50%"  stop-color="${COLOR}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${COLOR}" stop-opacity="0"/>
        </linearGradient>`;
      defs.appendChild(extra);

      // 5) روی همه‌ی مسیرها: لایه‌ی پایه + لاین نوری متحرک
      const geoms = svg.querySelectorAll<SVGGeometryElement>(
        "path, line, polyline, polygon, circle, ellipse, rect"
      );

      geoms.forEach((el) => {
        // استروکِ ثابت لوگو
        el.setAttribute("fill", "none");
        el.setAttribute("stroke", "#a5b4fc");
        el.setAttribute("stroke-width", String(BASE_STROKE));
        el.setAttribute("stroke-linecap", "round");
        el.setAttribute("stroke-linejoin", "round");
        el.setAttribute("vector-effect", "non-scaling-stroke");
        (el as any).style.opacity = "0.55";

        // کلون نورانی
        const glow = el.cloneNode(true) as SVGGeometryElement;
        const L = typeof (el as any).getTotalLength === "function"
          ? (el as any).getTotalLength()
          : 600;

        const seg = Math.max(12, Math.min(L * SEGMENT_RATIO, L * 0.45));
        glow.setAttribute("fill", "none");
        glow.setAttribute("stroke", `url(#${uid}-grad)`);
        glow.setAttribute("stroke-width", String(GLOW_STROKE));
        glow.setAttribute("stroke-linecap", "round");
        glow.setAttribute("stroke-linejoin", "round");
        glow.setAttribute("vector-effect", "non-scaling-stroke");
        glow.setAttribute("stroke-dasharray", `${seg} ${L}`);
        glow.setAttribute("stroke-dashoffset", "0");
        (glow as any).style.filter = `url(#${uid}-glow)`;
        (glow as any).style.mixBlendMode = "screen";

        el.parentNode?.appendChild(glow);

        // 6) لوپ پیوسته بدون پرش (با مقدار مدولویی)
        const state = { t: 0 };
        const anim = anime({
          targets: state,
          t: L,
          duration: SPEED,
          easing: "linear",
          loop: true,
          autoplay: true,
          update: () => {
            const v = -(state.t % L);
            glow.setAttribute("stroke-dashoffset", String(v));
          }
        });
        cleanups.push(() => anim.pause());
      });
    })();

    return () => {
      cleanups.forEach(fn => fn());
      if (host) host.innerHTML = "";
    };
  }, []);

  // وسط‌چین و بزرگ؛ ارتفاع کنترل‌شده برای حذف مورد فضای خالی عمودی
  return (
    <div className="mx-auto mb-4 w-full flex justify-center">
      <div ref={hostRef} style={{ width: "100%", maxWidth: MAX_W, height: SIZE_H }} />
    </div>
  );
}
