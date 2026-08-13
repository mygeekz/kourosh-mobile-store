import { useState } from 'react';

type MlOperatorCopyButtonProps = {
  value: string | null;
  label?: string;
  compact?: boolean;
};

export function MlOperatorCopyButton({ value, label = 'کپی', compact = false }: MlOperatorCopyButtonProps) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    if (!value) return;
    try {
      await navigator.clipboard?.writeText(value);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1400);
    } catch {
      setCopied(false);
    }
  };

  return (
    <button
      type="button"
      onClick={() => void handleCopy()}
      disabled={!value}
      className={`inline-flex items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-950 text-xs font-black text-white transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-45 dark:border-slate-700 dark:bg-white dark:text-slate-950 ${compact ? 'min-h-[32px] px-2.5' : 'min-h-[40px] px-4'}`}
      aria-label={copied ? 'کپی شد' : label}
    >
      <i className={`fa-solid ${copied ? 'fa-check' : 'fa-copy'}`} />
      {compact ? null : copied ? 'کپی شد' : label}
    </button>
  );
}
