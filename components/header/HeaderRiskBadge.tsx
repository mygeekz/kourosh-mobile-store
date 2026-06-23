import React from 'react';
import { Link } from 'react-router-dom';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';
import type { FontAwesomeIconClass } from '../../types/iconMetadata';
import type { HeaderRiskyCustomers } from './useHeaderQuickData';

type HeaderRiskLevel = 'critical' | 'high' | 'watch' | 'clear';

type HeaderRiskBadgeProps = {
  headerRiskyCustomers: HeaderRiskyCustomers;
};

const getHeaderRiskLevel = (headerRiskyCustomers: HeaderRiskyCustomers): HeaderRiskLevel => {
  if (headerRiskyCustomers.totalRisky >= 8 || headerRiskyCustomers.returnedChecks >= 2) return 'critical';
  if (headerRiskyCustomers.totalRisky >= 5 || headerRiskyCustomers.lateOrOverdue >= 3) return 'high';
  if (headerRiskyCustomers.totalRisky > 0) return 'watch';
  return 'clear';
};

const getHeaderRiskLevelLabel = (riskLevel: HeaderRiskLevel) => {
  if (riskLevel === 'critical') return 'بحرانی';
  if (riskLevel === 'high') return 'بالا';
  if (riskLevel === 'watch') return 'قابل پیگیری';
  return 'سالم';
};

const getHeaderRiskLevelClass = (riskLevel: HeaderRiskLevel) => {
  if (riskLevel === 'critical') {
    return 'border-rose-300/90 bg-rose-50 text-rose-800 ring-rose-100 dark:border-rose-800/70 dark:bg-rose-950/30 dark:text-rose-100 dark:ring-rose-900/35 animate-pulse';
  }

  if (riskLevel === 'high') {
    return 'border-amber-300/90 bg-amber-50 text-amber-800 ring-amber-100 dark:border-amber-800/70 dark:bg-amber-950/25 dark:text-amber-100 dark:ring-amber-900/35';
  }

  if (riskLevel === 'watch') {
    return 'border-orange-200/90 bg-orange-50 text-orange-800 ring-orange-100 dark:border-orange-800/60 dark:bg-orange-950/22 dark:text-orange-100 dark:ring-orange-900/30';
  }

  return 'border-slate-200/85 bg-white text-slate-700 ring-slate-200/70 dark:border-slate-700/80 dark:bg-slate-950 dark:text-slate-100 dark:ring-slate-800/70';
};

const getHeaderRiskBadgeClass = (riskLevel: HeaderRiskLevel) => {
  if (riskLevel === 'critical') return 'bg-rose-600 text-white';
  if (riskLevel === 'high') return 'bg-amber-500 text-slate-950';
  if (riskLevel === 'watch') return 'bg-orange-500 text-white';
  return 'bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-300';
};

const getHeaderRiskIcon = (riskLevel: HeaderRiskLevel): FontAwesomeIconClass => {
  if (riskLevel === 'clear') return 'fa-solid fa-user-check';
  if (riskLevel === 'critical') return 'fa-solid fa-circle-exclamation';
  return 'fa-solid fa-triangle-exclamation';
};

const HeaderRiskBadge: React.FC<HeaderRiskBadgeProps> = ({ headerRiskyCustomers }) => {
  const riskLevel = getHeaderRiskLevel(headerRiskyCustomers);
  const riskLevelLabel = getHeaderRiskLevelLabel(riskLevel);

  return (
    <Link
      to="/customers?risk=risky"
      data-skip-global-button="true"
      className={[
        'hidden xl:inline-flex h-10 min-w-[124px] items-center justify-between gap-2 rounded-[16px] border px-3 py-1.5 text-[11px] font-black transition-all duration-200',
        'shadow-[0_10px_24px_-20px_rgba(15,23,42,0.18)] ring-1 hover:-translate-y-[1px] hover:shadow-[0_14px_28px_-22px_rgba(15,23,42,0.24)]',
        getHeaderRiskLevelClass(riskLevel),
      ].join(' ')}
      title={headerRiskyCustomers.totalRisky > 0 ? `سطح هشدار: ${riskLevelLabel} • دیرکرد/معوق: ${headerRiskyCustomers.lateOrOverdue.toLocaleString('fa-IR')} • چک برگشتی: ${headerRiskyCustomers.returnedChecks.toLocaleString('fa-IR')}` : 'مشتری پرریسک فعالی دیده نشد'}
    >
      <span className="inline-flex items-center gap-2">
        <FontAwesomeIcon icon={getHeaderRiskIcon(riskLevel)} />
        مشتریان پرریسک
        {riskLevel !== 'clear' ? (
          <span className="rounded-full bg-white/45 px-1.5 py-0.5 text-[9px] font-black dark:bg-black/20">
            {riskLevelLabel}
          </span>
        ) : null}
      </span>
      <span className={[
        'inline-flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black',
        getHeaderRiskBadgeClass(riskLevel),
      ].join(' ')}>
        {headerRiskyCustomers.totalRisky.toLocaleString('fa-IR')}
      </span>
    </Link>
  );
};

export default HeaderRiskBadge;
