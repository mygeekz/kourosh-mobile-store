import { useEffect, useRef } from 'react';
import anime from 'animejs/lib/anime.es.js';
import logoSvgText from './assets/kourosh-final-symbol-gold.svg?raw';

type LoginLogoMotionV3Props = {
  compact?: boolean;
  size?: 'default' | 'compact' | 'mini';
};

const GOLD_BASE = ['#7a5b38', '#b48a59', '#f4deb0', '#c29a63', '#8b6841'];
const GOLD_SHEEN = ['rgba(255,255,255,0)', 'rgba(255,247,230,0.0)', 'rgba(255,245,216,0.88)', 'rgba(255,255,255,0)'];

const setFill = (root: Element, fill: string) => {
  root.setAttribute('fill', fill);
  root.removeAttribute('stroke');
  root.querySelectorAll('*').forEach((node) => {
    node.setAttribute('fill', fill);
    node.removeAttribute('stroke');
  });
};

const setStroke = (root: Element, stroke: string, strokeWidth: number, opacity = 1) => {
  root.setAttribute('fill', 'none');
  root.setAttribute('stroke', stroke);
  root.setAttribute('stroke-width', String(strokeWidth));
  root.setAttribute('stroke-linecap', 'round');
  root.setAttribute('stroke-linejoin', 'round');
  root.setAttribute('opacity', String(opacity));
  root.querySelectorAll('*').forEach((node) => {
    node.setAttribute('fill', 'none');
    node.setAttribute('stroke', stroke);
    node.setAttribute('stroke-width', String(strokeWidth));
    node.setAttribute('stroke-linecap', 'round');
    node.setAttribute('stroke-linejoin', 'round');
    node.setAttribute('opacity', String(opacity));
    node.setAttribute('vector-effect', 'non-scaling-stroke');
  });
};

export default function LoginLogoMotionV3({ compact = false, size }: LoginLogoMotionV3Props) {
  const hostRef = useRef<HTMLDivElement>(null);
  const resolvedSize = size || (compact ? 'compact' : 'default');

  useEffect(() => {
    const host = hostRef.current;
    if (!host) return;

    host.innerHTML = '';
    const cleanups: Array<() => void> = [];

    const doc = new DOMParser().parseFromString(logoSvgText, 'image/svg+xml');
    const svg = doc.querySelector('svg') as SVGSVGElement | null;
    if (!svg) return;

    host.appendChild(svg);

    svg.style.width = '100%';
    svg.style.height = '100%';
    svg.style.display = 'block';
    svg.style.overflow = 'visible';
    svg.style.opacity = '0';
    svg.setAttribute('preserveAspectRatio', 'xMidYMid meet');

    const symbol = (svg.querySelector('#kourosh-symbol') || svg.querySelector('g') || svg.querySelector('path')) as SVGGraphicsElement | null;
    if (!symbol) return;

    try {
      const bbox = symbol.getBBox();
      const padX = Math.max(16, bbox.width * 0.045);
      const padY = Math.max(18, bbox.height * 0.12);
      svg.setAttribute(
        'viewBox',
        `${bbox.x - padX} ${bbox.y - padY} ${bbox.width + padX * 2} ${bbox.height + padY * 2}`,
      );
    } catch {
      // keep the asset's original viewBox if the browser blocks getBBox during hydration
    }

    const [vbX, vbY, vbWidth, vbHeight] = (svg.getAttribute('viewBox') || '0 0 1350 1000')
      .split(/\s+/)
      .map((value) => Number(value));

    const sheenBandWidth = vbWidth * 0.24;
    const sheenBandHeight = vbHeight * 1.8;
    const sheenBandStartX = vbX - sheenBandWidth * 1.5;
    const sheenBandEndX = vbX + vbWidth + sheenBandWidth * 1.7;
    const sheenBandY = vbY - vbHeight * 0.35;

    const uid = `kourosh-login-logo-${Math.random().toString(36).slice(2, 10)}`;
    const NS = 'http://www.w3.org/2000/svg';
    let defs = svg.querySelector('defs');
    if (!defs) {
      defs = document.createElementNS(NS, 'defs');
      svg.prepend(defs);
    }

    const defsGroup = document.createElementNS(NS, 'g');
    defsGroup.innerHTML = `
      <linearGradient id="${uid}-base" x1="0%" y1="8%" x2="100%" y2="92%">
        <stop offset="0%" stop-color="${GOLD_BASE[0]}" />
        <stop offset="18%" stop-color="${GOLD_BASE[1]}" />
        <stop offset="48%" stop-color="${GOLD_BASE[2]}" />
        <stop offset="74%" stop-color="${GOLD_BASE[3]}" />
        <stop offset="100%" stop-color="${GOLD_BASE[4]}" />
      </linearGradient>
      <linearGradient id="${uid}-sheen" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="${GOLD_SHEEN[0]}" />
        <stop offset="34%" stop-color="${GOLD_SHEEN[1]}" />
        <stop offset="50%" stop-color="${GOLD_SHEEN[2]}" />
        <stop offset="100%" stop-color="${GOLD_SHEEN[3]}" />
      </linearGradient>
      <filter id="${uid}-ambient" x="-30%" y="-40%" width="160%" height="190%">
        <feGaussianBlur stdDeviation="18" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="1 0 0 0 0.94
                  0 1 0 0 0.82
                  0 0 1 0 0.56
                  0 0 0 0.26 0"
          result="tint"
        />
      </filter>
      <filter id="${uid}-depth" x="-20%" y="-28%" width="140%" height="170%">
        <feDropShadow dx="0" dy="18" stdDeviation="14" flood-color="#0f172a" flood-opacity="0.34" />
        <feDropShadow dx="0" dy="0" stdDeviation="5.5" flood-color="#f8e2af" flood-opacity="0.20" />
      </filter>
      <mask id="${uid}-sheen-mask" maskUnits="userSpaceOnUse">
        <rect x="${vbX - vbWidth}" y="${vbY - vbHeight}" width="${vbWidth * 3}" height="${vbHeight * 3}" fill="black" />
        <rect id="${uid}-sheen-band" x="${sheenBandStartX}" y="${sheenBandY}" width="${sheenBandWidth}" height="${sheenBandHeight}" rx="32" fill="white" transform="skewX(-18)" opacity="0.94" />
      </mask>
    `;
    defs.appendChild(defsGroup);

    const symbolParent = symbol.parentNode;
    if (!symbolParent) return;

    const ambient = symbol.cloneNode(true) as SVGElement;
    const base = symbol.cloneNode(true) as SVGElement;
    const outline = symbol.cloneNode(true) as SVGElement;
    const sheen = symbol.cloneNode(true) as SVGElement;

    setFill(ambient, '#f6d38f');
    ambient.setAttribute('opacity', '0.16');
    ambient.setAttribute('filter', `url(#${uid}-ambient)`);
    ambient.setAttribute('transform', 'translate(0 8)');

    setFill(base, `url(#${uid}-base)`);
    base.setAttribute('filter', `url(#${uid}-depth)`);

    setStroke(outline, '#fff7e5', 2.6, 0.18);

    setFill(sheen, `url(#${uid}-sheen)`);
    sheen.setAttribute('mask', `url(#${uid}-sheen-mask)`);
    sheen.setAttribute('opacity', '0.8');
    (sheen as unknown as HTMLElement).style.mixBlendMode = 'screen';

    (symbol as Element).setAttribute('opacity', '0');
    symbolParent.appendChild(ambient);
    symbolParent.appendChild(base);
    symbolParent.appendChild(outline);
    symbolParent.appendChild(sheen);

    const sheenBand = svg.querySelector(`#${uid}-sheen-band`) as SVGRectElement | null;
    if (!sheenBand) return;

    const intro = anime({
      targets: svg,
      opacity: [0, 1],
      translateY: [14, 0],
      scale: [0.965, 1],
      duration: 980,
      easing: 'easeOutExpo',
      autoplay: true,
    });

    const ambientPulse = anime({
      targets: ambient,
      opacity: [0.1, 0.2, 0.1],
      duration: 3600,
      easing: 'easeInOutSine',
      loop: true,
      autoplay: true,
    });

    const outlinePulse = anime({
      targets: outline,
      opacity: [0.12, 0.24, 0.12],
      duration: 3600,
      easing: 'easeInOutSine',
      loop: true,
      autoplay: true,
      delay: 240,
    });

    const sheenTravel = { x: sheenBandStartX };
    const sheenMove = anime({
      targets: sheenTravel,
      x: [sheenBandStartX, sheenBandEndX],
      duration: 3300,
      delay: 850,
      easing: 'easeInOutSine',
      loop: true,
      autoplay: true,
      update: () => {
        sheenBand.setAttribute('x', String(sheenTravel.x));
      },
    });

    const sheenGlow = anime({
      targets: sheen,
      opacity: [0.48, 0.86, 0.48],
      duration: 3300,
      delay: 850,
      easing: 'easeInOutSine',
      loop: true,
      autoplay: true,
    });

    cleanups.push(() => intro.pause());
    cleanups.push(() => ambientPulse.pause());
    cleanups.push(() => outlinePulse.pause());
    cleanups.push(() => sheenMove.pause());
    cleanups.push(() => sheenGlow.pause());

    return () => {
      cleanups.forEach((stop) => stop());
      if (host) host.innerHTML = '';
    };
  }, []);

  return (
    <div
      className={
        resolvedSize === 'default'
          ? 'mx-auto mb-2 flex w-full justify-center sm:mb-4 [@media(max-height:820px)]:mb-1 [@media(max-height:700px)]:mb-0'
          : 'mx-auto flex w-full justify-center'
      }
    >
      <div
        ref={hostRef}
        className={
          resolvedSize === 'mini'
            ? 'h-[52px] w-full max-w-[220px] sm:h-[64px] sm:max-w-[270px]'
            : resolvedSize === 'compact'
              ? 'h-[80px] w-full max-w-[360px] sm:h-[94px] sm:max-w-[420px]'
              : 'h-[clamp(110px,18svh,176px)] w-full max-w-[660px] [@media(max-height:820px)]:h-[132px] [@media(max-height:820px)]:max-w-[520px] [@media(max-height:700px)]:h-[104px] [@media(max-height:700px)]:max-w-[430px] [@media(max-height:620px)]:h-[88px] [@media(max-height:620px)]:max-w-[370px]'
        }
      />
    </div>
  );
}
