// SidebarItem.tsx
import React from 'react';
import clsx from 'clsx';

type AccentKey = 'indigo' | 'purple' | 'emerald' | 'blue' | 'orange' | 'rose';

const ACCENTS: Record<AccentKey, { active: string; subtle: string; icon: string; ring: string; dot: string }> = {
  indigo:  { active: 'bg-indigo-50 text-indigo-900', subtle: 'group-hover:bg-indigo-50/70', icon: 'text-indigo-600', ring: 'ring-indigo-100', dot: 'bg-indigo-500' },
  purple:  { active: 'bg-fuchsia-50 text-fuchsia-900', subtle: 'group-hover:bg-fuchsia-50/70', icon: 'text-fuchsia-600', ring: 'ring-fuchsia-100', dot: 'bg-fuchsia-500' },
  emerald: { active: 'bg-emerald-50 text-emerald-900', subtle: 'group-hover:bg-emerald-50/70', icon: 'text-emerald-600', ring: 'ring-emerald-100', dot: 'bg-emerald-500' },
  blue:    { active: 'bg-sky-50 text-sky-900', subtle: 'group-hover:bg-sky-50/70', icon: 'text-sky-600', ring: 'ring-sky-100', dot: 'bg-sky-500' },
  orange:  { active: 'bg-amber-50 text-amber-900', subtle: 'group-hover:bg-amber-50/70', icon: 'text-amber-600', ring: 'ring-amber-100', dot: 'bg-amber-500' },
  rose:    { active: 'bg-rose-50 text-rose-900', subtle: 'group-hover:bg-rose-50/70', icon: 'text-rose-600', ring: 'ring-rose-100', dot: 'bg-rose-500' },
};

export interface SidebarItemProps {
  label: string;
  icon: string;
  active?: boolean;
  accent?: AccentKey;
  onClick?: () => void;
}

const SidebarItem: React.FC<SidebarItemProps> = ({
  label, icon, active = false, accent = 'indigo', onClick,
}) => {
  const a = ACCENTS[accent];

  return (
    <button
      onClick={onClick}
      aria-current={active ? 'page' : undefined}
      className={clsx(
        'group relative w-full rounded-2xl px-3 py-2.5 text-right transition-all duration-200',
        'flex items-center gap-3 border border-transparent',
        active
          ? `${a.active} shadow-sm ring-1 ${a.ring}`
          : `text-slate-700 hover:text-slate-900 hover:border-slate-200/80 hover:bg-white dark:text-slate-300 dark:hover:text-white dark:hover:border-slate-800 dark:hover:bg-slate-900`,
      )}
    >
      <span
        className={clsx(
          'inline-flex h-10 w-10 items-center justify-center rounded-2xl border text-[15px] transition-all duration-200',
          active
            ? `border-white/70 bg-white/80 ${a.icon} shadow-sm dark:border-white/10 dark:bg-slate-950/70`
            : `border-slate-200 bg-slate-50 text-slate-500 ${a.subtle} dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400`,
        )}
        aria-hidden
      >
        <i className={clsx(icon, 'fa-fw')} />
      </span>

      <span className="min-w-0 flex-1 truncate text-sm font-medium">{label}</span>

      <span className="ms-auto flex items-center pl-1">
        <span
          className={clsx(
            'h-2 w-2 rounded-full transition-all duration-200',
            active ? a.dot : 'bg-transparent group-hover:bg-slate-300 dark:group-hover:bg-slate-600',
          )}
        />
      </span>
    </button>
  );
};

export default SidebarItem;
