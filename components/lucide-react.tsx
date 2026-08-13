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

export type LucideIcon = React.ComponentType<IconProps>;

export const Plus = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 5v14M5 12h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const CheckCheck = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3.5 12.5l3 3 5-5.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M10 13.5l2.5 2.5L20.5 7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const CircleAlert = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 7.5v5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="16.5" r="1" fill="currentColor" />
  </svg>
);

export const CircleDollarSign = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M15.5 8.5c-.8-.7-1.9-1-3.1-1-1.8 0-3.2.9-3.2 2.3 0 3.5 6.6 1.6 6.6 5 0 1.4-1.5 2.4-3.5 2.4-1.4 0-2.7-.4-3.6-1.2M12.3 5.8v12.4" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const CloudUpload = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M7 18H6a4 4 0 0 1-.6-7.95A6.5 6.5 0 0 1 18 8.5a4.5 4.5 0 0 1 .5 8.97H17" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M12 12v8m-3-5 3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Database = (props: IconProps) => (
  <svg {...base(props)}>
    <ellipse cx="12" cy="5" rx="8" ry="3" stroke="currentColor" strokeWidth="2" />
    <path d="M4 5v6c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 11v6c0 1.7 3.6 3 8 3s8-1.3 8-3v-6" stroke="currentColor" strokeWidth="2" />
  </svg>
);

export const FileText = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M14 3v5h5M9 12h6M9 16h6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const FileCheck = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M14 3v5h5M9 15l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const FileUp = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M6 3h8l4 4v14H6z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="M14 3v5h5M12 18v-7m-3 3 3-3 3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Info = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="2" />
    <path d="M12 11v6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <circle cx="12" cy="7.5" r="1" fill="currentColor" />
  </svg>
);

export const Keyboard = (props: IconProps) => (
  <svg {...base(props)}>
    <rect x="3" y="6" width="18" height="12" rx="2" stroke="currentColor" strokeWidth="2" />
    <path d="M7 10h.01M11 10h.01M15 10h.01M18 10h.01M7 14h.01M11 14h6" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
  </svg>
);

export const ListChecks = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M10 6h10M10 12h10M10 18h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
    <path d="M3.5 6l1.2 1.2L7 4.8M3.5 12l1.2 1.2L7 10.8M3.5 18l1.2 1.2L7 16.8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const MessageCircle = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20 11.5a8 8 0 0 1-9.5 7.9L5 21l1.6-4.5A8 8 0 1 1 20 11.5Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const MessageSquare = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M5 4h14a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H9l-5 3v-15a2 2 0 0 1 2-2Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
  </svg>
);

export const PenLine = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 20h9M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Radio = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="12" cy="12" r="2" fill="currentColor" />
    <path d="M8.5 8.5a5 5 0 0 0 0 7M15.5 8.5a5 5 0 0 1 0 7M5.5 5.5a9 9 0 0 0 0 13M18.5 5.5a9 9 0 0 1 0 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const Send = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m22 2-7 20-4-9-9-4Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M22 2 11 13" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
  </svg>
);

export const ShieldCheck = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3 20 6v5c0 5-3.4 8.4-8 10-4.6-1.6-8-5-8-10V6Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <path d="m8.5 12 2.2 2.2 4.8-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ShoppingCart = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M3 4h2l2.2 10.2a2 2 0 0 0 2 1.6h7.7a2 2 0 0 0 2-1.6L20 8H7" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <circle cx="10" cy="20" r="1.5" fill="currentColor" />
    <circle cx="17" cy="20" r="1.5" fill="currentColor" />
  </svg>
);

export const Sparkles = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m12 3 1.3 3.7L17 8l-3.7 1.3L12 13l-1.3-3.7L7 8l3.7-1.3ZM18.5 14l.8 2.2 2.2.8-2.2.8-.8 2.2-.8-2.2-2.2-.8 2.2-.8ZM5 14l.7 1.8 1.8.7-1.8.7L5 18l-.7-1.8-1.8-.7 1.8-.7Z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
  </svg>
);

export const Tag = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M20 13 13 20 4 11V4h7Z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round" />
    <circle cx="8.5" cy="8.5" r="1.2" fill="currentColor" />
  </svg>
);

export const UserCheck = (props: IconProps) => (
  <svg {...base(props)}>
    <circle cx="9" cy="8" r="4" stroke="currentColor" strokeWidth="2" />
    <path d="M3 21a6 6 0 0 1 12 0M16 14l2 2 4-4" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const ArrowDownToLine = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M12 3v12m-4-4 4 4 4-4M5 21h14" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

export const Brain = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="M9.5 4.5A3.5 3.5 0 0 0 6 8a3.5 3.5 0 0 0-1 6.8A3.5 3.5 0 0 0 9 20h1V4.5ZM14.5 4.5A3.5 3.5 0 0 1 18 8a3.5 3.5 0 0 1 1 6.8A3.5 3.5 0 0 1 15 20h-1V4.5Z" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M7 9h3M14 9h3M7 15h3M14 15h3" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" />
  </svg>
);

export const Layers = (props: IconProps) => (
  <svg {...base(props)}>
    <path d="m12 3 9 5-9 5-9-5ZM3 12l9 5 9-5M3 16l9 5 9-5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
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
  Plus,
  CheckCheck,
  CircleAlert,
  CircleDollarSign,
  CloudUpload,
  Database,
  FileCheck,
  FileText,
  FileUp,
  Info,
  Keyboard,
  ListChecks,
  MessageCircle,
  MessageSquare,
  PenLine,
  Radio,
  Send,
  ShieldCheck,
  ShoppingCart,
  Sparkles,
  Tag,
  UserCheck,
  ArrowDownToLine,
  Brain,
  Layers,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  Loader2,
  Loader2Icon: Loader2,
};
