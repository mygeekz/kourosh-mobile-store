// components/LoginLogoDrawable.tsx  — anime.js v3.2.1
import { useEffect, useRef } from "react";
import anime from "animejs/lib/anime.es.js";
import logoSvgText from "./assets/logo_outlined.svg?raw";

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

      // defs (ID یکتا)
      const uid = "pulse-" + Math.random().toString(36).slice(2);
      const NS = "http://www.w3.org/2000/svg";
      const defs = svg.querySelector("defs") || document.createElementNS(NS,"defs");
      if (!defs.parentNode) svg.prepend(defs);
      const add = document.createElementNS(NS,"g");
      add.innerHTML = `
        <filter id="${uid}-glow" x="-50%" y="-50%" width="200%" height="200%">
          <feGaussianBlur stdDeviation="2.5" result="b"/><feMerge>
            <feMergeNode in="b"/><feMergeNode in="SourceGraphic"/>
          </feMerge>
        </filter>
        <linearGradient id="${uid}-grad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%"   stop-color="#22d3ee" stop-opacity="0"/>
          <stop offset="50%"  stop-color="#22d3ee" stop-opacity="1"/>
          <stop offset="100%" stop-color="#22d3ee" stop-opacity="0"/>
        </linearGradient>`;
      defs.appendChild(add);

      // همه‌ی مسیرها/اشکال قابل رسم
      const geoms = svg.querySelectorAll<SVGGeometryElement>(
        "path, line, polyline, polygon, circle, ellipse, rect"
      );

      geoms.forEach((el) => {
        // لایه‌ی پایه: Outline ثابت (بدون Fill)
        (el as any).style.fill = "none";
        (el as any).style.stroke = "#a5b4fc";
        (el as any).style.strokeWidth = "2.2";
        (el as any).style.strokeLinecap = "round";
        (el as any).style.strokeLinejoin = "round";
        (el as any).style.opacity = "0.45";
        (el as any).setAttribute("vector-effect","non-scaling-stroke"); // مهم

        // لایه‌ی نورانی متحرک
        const glow = el.cloneNode(true) as SVGGeometryElement;
        const hasLen = typeof (el as any).getTotalLength === "function";
        const L = hasLen ? (el as any).getTotalLength() : 600;
        const seg = Math.max(10, L * 0.18);

        (glow as any).style.fill = "none";
        (glow as any).style.stroke = `url(#${uid}-grad)`;
        (glow as any).style.strokeWidth = "3.4";
        (glow as any).style.filter = `url(#${uid}-glow)`;
        (glow as any).style.strokeDasharray = `${seg} ${L}`;
        (glow as any).style.strokeDashoffset = "0";
        (glow as any).setAttribute("vector-effect","non-scaling-stroke");

        el.parentNode?.appendChild(glow);

        const anim = anime({
          targets: glow,
          strokeDashoffset: [-L],
          duration: 2800,
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
    <div className="mx-auto mb-4 w-[300px] h-[110px]">
      <div ref={hostRef} className="w-full h-full" />
    </div>
  );
}
