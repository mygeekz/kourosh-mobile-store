import React, { useMemo, useState } from 'react';
import Modal from './Modal';
import Button from './Button';

type Props = {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  tokenLabels: string[];
  previewTemplate: string;
};

// Note: For MeliPayamak patterns, the real message text lives on the provider panel.
// This modal helps operators verify token ordering and see a local "sample" preview.
const SmsPatternPreviewModal: React.FC<Props> = ({ isOpen, onClose, title, tokenLabels, previewTemplate }) => {
  const [values, setValues] = useState<string[]>(() => tokenLabels.map(() => ''));

  const onChangeValue = (idx: number, v: string) => {
    setValues((prev) => {
      const next = [...prev];
      next[idx] = v;
      return next;
    });
  };

  const previewText = useMemo(() => {
    // Replace {1}..{n} previews with provided values
    let out = String(previewTemplate || '');
    values.forEach((v, idx) => {
      const tokenIndex = idx + 1;
      const re = new RegExp(`\\{${tokenIndex}\\}`, 'g');
      out = out.replace(re, String(v ?? ''));
    });
    return out;
  }, [previewTemplate, values]);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} iconClass="fa-regular fa-eye" widthClass="max-w-6xl">
      <div className="sms-pattern-preview-modal">
        <div className="sms-pattern-preview-modal__intro rounded-2xl border border-violet-200/70 dark:border-violet-900/40 bg-violet-50/80 dark:bg-violet-950/20 p-4 text-sm text-violet-900 dark:text-violet-200">
          <div className="flex items-start gap-3">
            <span className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl border border-violet-200/70 bg-white/80 text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/30 dark:text-violet-200">
              <i className="fa-solid fa-wand-magic-sparkles" />
            </span>
            <div className="space-y-1">
              <div className="font-semibold">پیش‌نمایش محلی پترن</div>
              <div>این پیش‌نمایش فقط برای کنترل <b>ترتیب متغیرها</b> است. متن واقعی پترن در پنل سرویس‌دهنده ذخیره تغییرات می‌شود.</div>
            </div>
          </div>
        </div>

        <div className="sms-pattern-preview-modal__tokens rounded-2xl border border-slate-200/80 dark:border-slate-700 bg-white/80 dark:bg-slate-900/40 p-4">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <i className="fa-solid fa-code text-violet-500" />
            <span>متغیرهای پترن</span>
          </div>
          <div className="mb-4 flex flex-wrap gap-2">
            {tokenLabels.map((lbl, idx) => (
              <span key={idx} className="inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-violet-50 px-3 py-1 text-xs font-semibold text-violet-700 dark:border-violet-900/40 dark:bg-violet-900/20 dark:text-violet-200">
                <span className="inline-flex h-5 min-w-5 items-center justify-center rounded-full bg-white/90 px-1 text-[11px] dark:bg-violet-950/40">{idx + 1}</span>
                {lbl}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {tokenLabels.map((lbl, idx) => (
              <div key={idx}>
                <label className="app-label flex items-center gap-2">
                  <i className="fa-solid fa-tag text-violet-500" />
                  <span>{idx + 1}) {lbl}</span>
                </label>
                <input
                  className="app-input"
                  value={values[idx] || ''}
                  onChange={(e) => onChangeValue(idx, e.target.value)}
                />
              </div>
            ))}
          </div>
        </div>

        <div className="sms-pattern-preview-modal__preview rounded-2xl border border-slate-200 dark:border-slate-700 p-4 bg-white/80 dark:bg-slate-900/40">
          <div className="mb-3 flex items-center gap-2 text-sm font-bold text-slate-900 dark:text-slate-100">
            <i className="fa-solid fa-message-lines text-sky-500" />
            <span>پیش‌نمایش پیش‌نمایش پیام</span>
          </div>
          <div className="whitespace-pre-wrap rounded-2xl border border-dashed border-slate-200 bg-slate-50/80 p-4 text-sm leading-7 text-slate-800 dark:border-slate-700 dark:bg-slate-950/40 dark:text-slate-200">
            {previewText || '—'}
          </div>
        </div>

        <div className="sms-pattern-preview-modal__footer flex items-center justify-end gap-2">
          <Button onClick={onClose} variant="secondary" leftIcon={<i className="fa-solid fa-xmark" />}>
            بستن
          </Button>
        </div>
      </div>
    </Modal>
  );
};

export default SmsPatternPreviewModal;
