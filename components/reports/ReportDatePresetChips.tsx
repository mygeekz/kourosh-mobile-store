import { useMemo } from 'react';
import moment from 'jalali-moment';

type PresetKey = 'today' | 'yesterday' | 'week' | 'month' | 'last30' | 'custom';

type Props = {
  fromDate?: Date | null;
  toDate?: Date | null;
  onChange: (range: { from: Date; to: Date; preset: PresetKey }) => void;
  className?: string;
  compact?: boolean;
  includeLast30?: boolean;
};

const normalize = (d: Date | null | undefined, edge: 'start' | 'end') => {
  if (!d) return '';
  const m = moment(d);
  return edge === 'start' ? m.startOf('day').format('YYYY-MM-DD') : m.endOf('day').format('YYYY-MM-DD');
};

const makeRange = (key: PresetKey) => {
  const now = moment();
  switch (key) {
    case 'today': return { from: now.clone().startOf('day').toDate(), to: now.clone().endOf('day').toDate() };
    case 'yesterday': return { from: now.clone().subtract(1, 'day').startOf('day').toDate(), to: now.clone().subtract(1, 'day').endOf('day').toDate() };
    case 'week': return { from: now.clone().subtract(6, 'day').startOf('day').toDate(), to: now.clone().endOf('day').toDate() };
    case 'month': return { from: now.clone().startOf('jMonth').startOf('day').toDate(), to: now.clone().endOf('day').toDate() };
    case 'last30': return { from: now.clone().subtract(29, 'day').startOf('day').toDate(), to: now.clone().endOf('day').toDate() };
    default: return { from: now.clone().startOf('jMonth').startOf('day').toDate(), to: now.clone().endOf('day').toDate() };
  }
};

const labels: Record<PresetKey, { fa: string; icon: string }> = {
  today: { fa: 'امروز', icon: 'fa-sun' },
  yesterday: { fa: 'دیروز', icon: 'fa-clock-rotate-left' },
  week: { fa: '۷ روز اخیر', icon: 'fa-calendar-week' },
  month: { fa: 'این ماه', icon: 'fa-calendar-days' },
  last30: { fa: '۳۰ روز اخیر', icon: 'fa-chart-line' },
  custom: { fa: 'سفارشی', icon: 'fa-sliders' },
};

export default function ReportDatePresetChips({ fromDate, toDate, onChange, className, compact = false, includeLast30 = false }: Props) {
  const active = useMemo<PresetKey>(() => {
    const currentFrom = normalize(fromDate, 'start');
    const currentTo = normalize(toDate, 'end');
    const keys: PresetKey[] = includeLast30 ? ['today', 'yesterday', 'week', 'month', 'last30'] : ['today', 'yesterday', 'week', 'month'];
    for (const key of keys) {
      const r = makeRange(key);
      if (normalize(r.from, 'start') === currentFrom && normalize(r.to, 'end') === currentTo) return key;
    }
    return 'custom';
  }, [fromDate, toDate, includeLast30]);

  const keys: PresetKey[] = includeLast30 ? ['today', 'yesterday', 'week', 'month', 'last30'] : ['today', 'yesterday', 'week', 'month'];

  return (
    <div className={['report-date-presets report-date-presets--modern', compact ? 'report-date-presets--compact' : '', className || ''].filter(Boolean).join(' ')} dir="rtl" aria-label="میانبر بازه زمانی گزارش" data-ui-report-date-presets="true">
      <div className="report-date-presets__chips" role="group" aria-label="انتخاب سریع بازه زمانی" data-ui-report-date-preset-group="true">
        {keys.map((key) => {
          const isActive = active === key;
          const meta = labels[key];
          return (
            <button
              key={key}
              type="button"
              aria-pressed={isActive}
              className={['report-date-preset-chip', isActive ? 'is-active' : ''].filter(Boolean).join(' ')}
              data-ui-report-date-preset="true"
              onClick={() => {
                const range = makeRange(key);
                onChange({ ...range, preset: key });
              }}
            >
              <i className={`fa-solid ${meta.icon}`} aria-hidden="true" />
              <span>{meta.fa}</span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
