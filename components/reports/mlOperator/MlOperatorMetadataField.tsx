import { MlOperatorCopyButton } from './MlOperatorCopyButton';

type MlOperatorMetadataFieldProps = {
  label: string;
  value: string;
  copyValue?: string | null;
};

export function MlOperatorMetadataField({ label, value, copyValue = null }: MlOperatorMetadataFieldProps) {
  return (
    <div className="min-w-0 rounded-2xl bg-slate-50 p-3 ring-1 ring-slate-200 dark:bg-slate-950/40 dark:ring-slate-800">
      <div className="flex items-center justify-between gap-2">
        <div className="text-[11px] font-black text-slate-400">{label}</div>
        {copyValue ? <MlOperatorCopyButton value={copyValue} compact /> : null}
      </div>
      <div className="mt-2 break-words text-sm font-bold leading-6 text-slate-800 dark:text-slate-100">{value}</div>
    </div>
  );
}
