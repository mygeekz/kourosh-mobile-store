import React from 'react';
import { Link } from 'react-router-dom';

type Props = {
  title: string;
  subtitle?: string;
  icon: string;
  gradientFrom?: string;
  gradientTo?: string;
  to?: string;
  onClick?: () => void;
  active?: boolean;
};

const HubCard: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  to,
  onClick,
  active,
}) => {
  const baseClass = [
    'group rounded-2xl border p-4 text-right transition-all',
    'border-slate-200/80 bg-white hover:border-slate-300 dark:border-slate-800/80 dark:bg-slate-950 dark:hover:border-slate-700',
    active ? 'border-slate-900 shadow-[0_1px_2px_rgba(15,23,42,0.06)] dark:border-slate-200' : 'shadow-[0_1px_2px_rgba(15,23,42,0.03)]',
    '   ',
  ].join(' ');

  const inner = (
    <div className="flex items-center gap-3">
      <span className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200/80 bg-slate-50 text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
        <i className={`${icon} text-sm`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="truncate text-sm font-semibold text-slate-900 dark:text-slate-100">{title}</div>
        {subtitle ? <div className="mt-1 truncate text-xs text-slate-500 dark:text-slate-400">{subtitle}</div> : null}
      </div>
      <i className="fa-solid fa-arrow-left text-xs text-slate-400 transition-colors group-hover:text-slate-700 dark:group-hover:text-slate-200" />
    </div>
  );

  if (to) {
    return (
      <Link to={to} className={baseClass}>
        {inner}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} className={baseClass}>
      {inner}
    </button>
  );
};

export default HubCard;
