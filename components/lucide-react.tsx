import React from "react";

type IconProps = React.SVGProps<SVGSVGElement> & { size?: number };

const base = (props: IconProps) => {
  const { size = 20, ...rest } = props;
  return {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    xmlns: "http://www.w3.org/2000/svg",
    ...rest,
  };
};

// Minimal "lucide-react" compatible exports used in this project.
// These are lightweight inline SVGs to avoid external dependencies.

export const ArrowLeft = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowRight = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Check = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20 6L9 17l-5-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const X = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M18 6L6 18" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M6 6l12 12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Minus = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Circle = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const ChevronDown = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 9l6 6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ChevronUp = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M18 15l-6-6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ChevronLeft = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M15 18l-6-6 6-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);
export const ChevronRight = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M9 6l6 6-6 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MoreHorizontal = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="5" cy="12" r="1.8" fill="currentColor" />
    <circle cx="12" cy="12" r="1.8" fill="currentColor" />
    <circle cx="19" cy="12" r="1.8" fill="currentColor" />
  </svg>
);

export const Search = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="11" cy="11" r="7" stroke="currentColor" strokeWidth="2" />
    <path d="M20 20l-3.5-3.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const GripVertical = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="9" cy="7" r="1.2" fill="currentColor" />
    <circle cx="15" cy="7" r="1.2" fill="currentColor" />
    <circle cx="9" cy="12" r="1.2" fill="currentColor" />
    <circle cx="15" cy="12" r="1.2" fill="currentColor" />
    <circle cx="9" cy="17" r="1.2" fill="currentColor" />
    <circle cx="15" cy="17" r="1.2" fill="currentColor" />
  </svg>
);

export const PanelLeft = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="4" width="18" height="16" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M9 4v16" stroke="currentColor" strokeWidth="2" />
  </svg>
);


export const RefreshCw = (props: IconProps) => (
  <svg {...base(props)} className={props.className}>
    <path d="M21 12a9 9 0 1 1-2.64-6.36" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M21 3v6h-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Save = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 4h11l3 3v13H5z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 4v5h6V4" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M9 17h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CheckCircle2 = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M8.5 12.5l2.2 2.2 4.8-5.2" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// aliases used by some shadcn components
export const ChevronDownIcon = ChevronDown;
export const ChevronLeftIcon = ChevronLeft;
export const ChevronRightIcon = ChevronRight;

// Spinner
export const Loader2 = (props: IconProps) => (
  <svg {...base(props)} className={["animate-spin", props.className].filter(Boolean).join(" ")}>
    <path
      d="M12 2a10 10 0 1 0 10 10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      opacity="0.35"
    />
    <path
      d="M22 12a10 10 0 0 0-10-10"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);

export const Loader2Icon = Loader2;

export default {
  ArrowLeft,
  ArrowRight,
  Check,
  X,
  Minus,
  Circle,
  ChevronDown,
  ChevronUp,
  ChevronLeft,
  ChevronRight,
  MoreHorizontal,
  Search,
  GripVertical,
  PanelLeft,
  RefreshCw,
  Save,
  CheckCircle2,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2,
  Loader2Icon: Loader2,
};
