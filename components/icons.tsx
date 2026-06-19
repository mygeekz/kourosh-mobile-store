import React from "react";

export type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

function baseProps(props: IconProps) {
  const { size = 20, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    stroke: "currentColor",
    strokeWidth: 2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
    ...rest,
  };
}

// Minimal, dependency-free icon set (lucide-like stroke style).
// Only the icons used in reports are included.

export const ArrowLeft = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M15 18l-6-6 6-6" />
  </svg>
);

export const Smartphone = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <rect x="7" y="2" width="10" height="20" rx="2" />
    <path d="M11 19h2" />
  </svg>
);

export const BadgeCheck = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M12 2l2.2 1.2 2.5-.2 1.1 2.3 2 1.6-1.1 2.3.7 2.4-2.2 1.2-1.3 2.2-2.5-.3L12 22l-2.3-1.2-2.5.3-1.3-2.2-2.2-1.2.7-2.4L3 8.6l2-1.6 1.1-2.3 2.5.2L12 2z" />
    <path d="M9 12l2 2 4-4" />
  </svg>
);

export const Search = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <circle cx="11" cy="11" r="7" />
    <path d="M20 20l-3.5-3.5" />
  </svg>
);

export const RefreshCw = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M21 12a9 9 0 0 1-15.4 6.4" />
    <path d="M3 12A9 9 0 0 1 18.4 5.6" />
    <path d="M21 3v6h-6" />
    <path d="M3 21v-6h6" />
  </svg>
);

export const TrendingUp = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M3 17l6-6 4 4 7-7" />
    <path d="M14 8h6v6" />
  </svg>
);

export const Wallet = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M3 7a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7z" />
    <path d="M21 10h-6a2 2 0 0 0 0 4h6" />
    <path d="M16 12h.01" />
  </svg>
);

export const Percent = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M19 5L5 19" />
    <circle cx="7.5" cy="7.5" r="2.5" />
    <circle cx="16.5" cy="16.5" r="2.5" />
  </svg>
);

export const Calendar = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <rect x="3" y="4" width="18" height="18" rx="2" />
    <path d="M16 2v4" />
    <path d="M8 2v4" />
    <path d="M3 10h18" />
  </svg>
);
export const Users = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M17 21v-2a4 4 0 0 0-4-4H7a4 4 0 0 0-4 4v2" />
    <circle cx="9" cy="7" r="4" />
    <path d="M23 21v-2a4 4 0 0 0-3-3.87" />
    <path d="M16 3.13a4 4 0 0 1 0 7.75" />
  </svg>
);

export const Trophy = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M8 4h8v3a4 4 0 0 1-8 0V4z" />
    <path d="M6 4h2v2a2 2 0 0 1-2 2H4V6a2 2 0 0 1 2-2z" />
    <path d="M18 4h2a2 2 0 0 1 2 2v2h-2a2 2 0 0 1-2-2V4z" />
    <path d="M12 11v4" />
    <path d="M9 21h6" />
    <path d="M10 15h4l1 6H9l1-6z" />
  </svg>
);

export const Truck = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M3 7h12v10H3z" />
    <path d="M15 10h4l2 3v4h-6z" />
    <circle cx="7.5" cy="19" r="1.5" />
    <circle cx="17.5" cy="19" r="1.5" />
  </svg>
);

export const Download = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
    <path d="M7 10l5 5 5-5" />
    <path d="M12 15V3" />
  </svg>
);

export const Layers = (props: IconProps) => (
  <svg {...baseProps(props)}>
    <path d="M12 2l9 5-9 5-9-5 9-5z" />
    <path d="M3 12l9 5 9-5" />
    <path d="M3 17l9 5 9-5" />
  </svg>
);
