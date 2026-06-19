// components/LoginLogoDrawable.tsx — anime.js v3.2.1
import { useEffect, useRef } from "react";
import anime from "animejs/lib/anime.es.js";
import logoSvgText from "./assets/logo_outlined.svg?raw";

// پارامترها
const SIZE_W = 420, SIZE_H = 150;
const BASE_STROKE = 3;               // ضخامت خطوط ثابت
const GLOW_STROKE = 5;               // ضخامت نوار نور
const SEGMENT_RATIO = 0.30;          // طول نوار (۳۰٪ از مسیر)
const SPEED = 1800;                  // سرعت حرکت (ms)
const COLOR = "#22d3ee";

export default function LoginLogoDrawable() {
  const hostRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;
    let cleanups: Array<() => void> = [];

    (async () => {
      const doc = new DOMParser().parseFromString(logoSvgText, "image/svg+xml");
      const svg = doc.querySelector("svg") as SVGSVGElement | null;
      if (!svg) return;

      // mount
      host.innerHTML = "";
      host.appendChild(svg);
      svg.style.width = "100%";
      svg.style.height = "100%";
      svg.setAttribute("preserveAspectRatio","xMidYMid meet");

      // defs با id یکتا
      const uid = "pulse-" + Math.random().toString(36).slice(2);
      const NS = "http://www.w3.org/2000/svg";
      const defs = svg.querySelector("defs") || document.createElementNS(NS,"defs");
      if (!defs.parentNode) svg.prepend(defs);
      const extra = document.createElementNS(NS,"g");
      extra.innerHTML = `
        <filter id="${uid}-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="4" result="b"/><feMerge>
            <feMergeNode in="b"/><feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="${uid}-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="${COLOR}" stop-opacity="0"/>
          <stop offset="50%"  stop-color="${COLOR}" stop-opacity="1"/>
          <stop offset="100%" stop-color="${COLOR}" stop-opacity="0"/>
        </linearGradient>`;
      defs.appendChild(extra);

      // همه‌ی شکل‌های drawable
      const geoms = svg.querySelectorAll<SVGGeometryElement>(
        "path, line, polyline, polygon, circle, ellipse, rect"
      );

      geoms.forEach((el) => {
        // لایه‌ی پایه
        (el as any).style.fill = "none";
        (el as any).style.stroke = "#a5b4fc";
        (el as any).style.strokeWidth = String(BASE_STROKE);
        (el as any).style.strokeLinecap = "round";
        (el as any).style.strokeLinejoin = "round";
        (el as any).style.opacity = "0.5";
        (el as any).setAttribute("vector-effect","non-scaling-stroke");

        // کلون نورانی
        const glow = el.cloneNode(true) as SVGGeometryElement;
        const L = typeof (el as any).getTotalLength === "function" ? (el as any).getTotalLength() : 600;

        // همواره کسری از L و کمتر از L
        const seg = Math.max( L * 0.12, Math.min(L * SEGMENT_RATIO, L * 0.5) );

        (glow as any).style.fill = "none";
        (glow as any).style.stroke = `url(#${uid}-grad)`;
        (glow as any).style.strokeWidth = String(GLOW_STROKE);
        (glow as any).style.strokeLinecap = "round";
        (glow as any).style.strokeLinejoin = "round";
        (glow as any).style.filter = `url(#${uid}-glow)`;
        (glow as any).style.mixBlendMode = "screen";
        glow.setAttribute("vector-effect","non-scaling-stroke");
        glow.setAttribute("stroke-dasharray", `${seg} ${L}`);
        glow.setAttribute("stroke-dashoffset", "0");

        el.parentNode?.appendChild(glow);

        // انیمیشن صریح 0 → -L
        const anim = anime({
          targets: glow,
          strokeDashoffset: [0, -L],
          duration: SPEED,
          easing: "linear",
          loop: true,
          autoplay: true,
        });
        cleanups.push(() => anim.pause());
      });
    })();

    return () => {
      cleanups.forEach(fn => fn());
      if (host) host.innerHTML = "";
    };
  }, []);

  return (
    <div className="mx-auto mb-4" style={{ width: SIZE_W, height: SIZE_H }}>
      <div ref={hostRef} className="w-full h-full" />
    </div>
  );
}
