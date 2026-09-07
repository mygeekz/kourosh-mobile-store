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
  density?: 'default' | 'compact';
};

const HubCard: React.FC<Props> = ({
  title,
  subtitle,
  icon,
  to,
  onClick,
  active,
  density = 'default',
}) => {
  const compact = density === 'compact';
  const baseClass = [
    `group ${compact ? 'rounded-xl p-3' : 'rounded-2xl p-4'} border text-right shadow-none transition-[transform,border-color,background-color] duration-150 hover:-translate-y-px`,
    'border-slate-200/70 bg-white hover:border-slate-300 hover:bg-slate-50 dark:border-slate-800/70 dark:bg-slate-950 dark:hover:border-slate-700 dark:hover:bg-slate-900/70',
    active ? 'border-primary/30 bg-primary/5 dark:border-primary/30 dark:bg-primary/10' : '',
  ].join(' ');

  const inner = (
    <div className={`flex items-center ${compact ? 'gap-2' : 'gap-3'}`}>
      <span className={`grid shrink-0 place-items-center border-0 bg-transparent text-slate-600 shadow-none dark:text-slate-300 ${compact ? 'h-8 w-8' : 'h-10 w-10'}`}>
        <i className={`${icon} ${compact ? 'text-xs' : 'text-sm'}`} />
      </span>
      <div className="min-w-0 flex-1">
        <div className={`truncate font-semibold text-slate-900 dark:text-slate-100 ${compact ? 'text-[13px]' : 'text-sm'}`}>{title}</div>
        {subtitle ? <div className={`truncate text-slate-500 dark:text-slate-400 ${compact ? 'mt-0.5 text-[11px]' : 'mt-1 text-xs'}`}>{subtitle}</div> : null}
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
