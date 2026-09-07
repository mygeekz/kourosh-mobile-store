import React from 'react';

export type ChartVariant = 'minimal' | 'glass' | 'glow' | 'aurora' | 'mesh' | 'neon';

const OPTIONS: Array<{ key: ChartVariant; label: string }> = [
  { key: 'minimal', label: 'مینیمال' },
  { key: 'glass',   label: 'گلس' },
  { key: 'glow',    label: 'گلو' },
  { key: 'aurora',  label: 'اورورا' },
  { key: 'mesh',    label: 'مش' },
  { key: 'neon',    label: 'نئون' },
];

type Props = {
  value: ChartVariant;
  onChange: (v: ChartVariant) => void;
  disabled?: boolean;
};

const ChartStylePicker: React.FC<Props> = ({ value, onChange, disabled }) => {
  return (
    <div className="inline-flex items-center gap-2" dir="rtl">
      {OPTIONS.map(opt => {
        const active = value === opt.key;
        return (
          <button
            key={opt.key}
            disabled={disabled}
            onClick={() => onChange(opt.key)}
            className={[
              'px-3 py-1.5 rounded-lg text-xs sm:text-sm font-medium transition-all',
              'border',
              active
                ? 'bg-indigo-600 text-white border-indigo-600 shadow-[0_8px_30px_rgba(79,70,229,0.35)]'
                : 'bg-gray-100 dark:bg-gray-800/60 border-gray-200 dark:border-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700',
            ].join(' ')}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
};

export default ChartStylePicker;
