import type { ReactNode } from 'react';
import { Link, type To } from 'react-router-dom';

export type ProfitCollectionRateTone = 'good' | 'warn' | 'bad';

const clampProfitCollectionRate = (rate: number) =>
  Math.min(100, Math.max(0, Number.isFinite(Number(rate)) ? Number(rate) : 0));

export const getProfitCollectionRateTone = (rate: number): ProfitCollectionRateTone => {
  const normalizedRate = clampProfitCollectionRate(rate);
  if (normalizedRate > 75) return 'good';
  if (normalizedRate >= 45) return 'warn';
  return 'bad';
};

export const formatProfitCollectionRate = (rate: number) =>
  `${clampProfitCollectionRate(rate).toLocaleString('fa-IR', { maximumFractionDigits: 2 })}٪`;

const toneClasses: Record<ProfitCollectionRateTone, string> = {
  good: 'border-emerald-500/30 bg-emerald-50 !text-emerald-700 dark:border-emerald-400/30 dark:bg-emerald-500/10 dark:!text-emerald-300',
  warn: 'border-amber-500/30 bg-amber-50 !text-amber-700 dark:border-amber-400/30 dark:bg-amber-500/10 dark:!text-amber-300',
  bad: 'border-rose-500/30 bg-rose-50 !text-rose-700 dark:border-rose-400/30 dark:bg-rose-500/10 dark:!text-rose-300',
};

type ProfitCollectionRateBadgeProps = {
  rate: number;
  label?: string | null;
  className?: string;
  to?: To;
  detailsLabel?: string;
};

export default function ProfitCollectionRateBadge({
  rate,
  label = 'درصد وصول سود',
  className = '',
  to,
  detailsLabel,
}: ProfitCollectionRateBadgeProps) {
  const normalizedRate = clampProfitCollectionRate(rate);
  const tone = getProfitCollectionRateTone(normalizedRate);
  const formattedRate = formatProfitCollectionRate(normalizedRate);
  const ariaLabel = detailsLabel || `${label ?? 'نرخ وصول سود'}: ${formattedRate}`;
  const badgeClassName = `inline-flex w-fit shrink-0 items-center whitespace-nowrap rounded-full border px-2 py-0.5 text-[10px] font-black leading-4 tabular-nums ${toneClasses[tone]} ${to ? 'cursor-pointer transition hover:-translate-y-0.5 hover:shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-current/30' : ''} ${className}`.trim();

  const content = <>{label ? `${label}: ` : null}{formattedRate}</>;

  if (to) {
    return (
      <Link
        to={to}
        className={badgeClassName}
        data-profit-collection-rate={normalizedRate.toFixed(2)}
        data-profit-collection-rate-tone={tone}
        aria-label={ariaLabel}
        title={detailsLabel}
      >
        {content}
      </Link>
    );
  }

  return (
    <span
      className={badgeClassName}
      data-profit-collection-rate={normalizedRate.toFixed(2)}
      data-profit-collection-rate-tone={tone}
      aria-label={ariaLabel}
    >
      {content}
    </span>
  );
}

export function ProfitCollectionRateDetails({
  rate,
  uncollectedProfit,
  realizedRevenue,
  detailsHref,
  detailsLabel,
}: {
  rate: number;
  uncollectedProfit: ReactNode;
  realizedRevenue: ReactNode;
  detailsHref?: To;
  detailsLabel?: string;
}) {
  return (
    <span className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
      <ProfitCollectionRateBadge rate={rate} to={detailsHref} detailsLabel={detailsLabel} />
      <span aria-hidden="true">•</span>
      <span>سود وصول‌نشده: {uncollectedProfit}</span>
      <span aria-hidden="true">•</span>
      <span>مبلغ وصولی: {realizedRevenue}</span>
    </span>
  );
}
