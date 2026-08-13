import type { NavigationEntityQuickPreviewItem } from './navigationEntityLabelResolver';

export type NavigationQuickCopyAction = {
  key: string;
  label: string;
  value: string;
  iconClass: string;
  priority: number;
};

type QuickActionStageLike = {
  key: string;
  label: string;
  detail?: string;
  preview?: {
    items?: NavigationEntityQuickPreviewItem[];
  };
};

const cleanText = (value: unknown) => String(value ?? '').replace(/\s+/g, ' ').trim();

const toAsciiDigits = (value: string) => value
  .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
  .replace(/[٠-٩]/g, (digit) => String('٠١٢٣٤٥٦٧٨٩'.indexOf(digit)));

const itemActionMeta = (labelValue: string) => {
  const label = cleanText(labelValue);
  const normalized = label.toLowerCase();

  if (/imei/i.test(normalized)) return { label: 'کپی IMEI', iconClass: 'fa-regular fa-copy', priority: 120 };
  if (/\bsku\b/i.test(normalized)) return { label: 'کپی SKU', iconClass: 'fa-regular fa-copy', priority: 118 };
  if (/بارکد/.test(label)) return { label: 'کپی بارکد', iconClass: 'fa-regular fa-copy', priority: 116 };
  if (/شماره\s*چک/.test(label)) return { label: 'کپی شماره چک', iconClass: 'fa-regular fa-copy', priority: 114 };
  if (/شناسه\s*پرداخت/.test(label)) return { label: 'کپی شناسه پرداخت', iconClass: 'fa-regular fa-copy', priority: 112 };
  if (/شناسه\s*(?:دسته|سند|مرجع)/.test(label)) return { label: 'کپی شناسه سند', iconClass: 'fa-regular fa-copy', priority: 110 };
  if (/شناسه/.test(label)) return { label: 'کپی شناسه', iconClass: 'fa-regular fa-copy', priority: 108 };
  if (/مانده/.test(label)) return { label: 'کپی مانده', iconClass: 'fa-regular fa-copy', priority: 88 };
  if (/مبلغ\s*پرداخت|پرداخت\s*این\s*رویداد/.test(label)) return { label: 'کپی مبلغ پرداخت', iconClass: 'fa-regular fa-copy', priority: 86 };
  if (/مبلغ\s*چک/.test(label)) return { label: 'کپی مبلغ چک', iconClass: 'fa-regular fa-copy', priority: 84 };
  if (/قیمت/.test(label)) return { label: 'کپی قیمت', iconClass: 'fa-regular fa-copy', priority: 82 };
  if (/سود/.test(label)) return { label: 'کپی سود', iconClass: 'fa-regular fa-copy', priority: 80 };
  if (/مبلغ|بدهی|بستانکار|وصول|سرمایه/.test(label)) return { label: 'کپی مبلغ', iconClass: 'fa-regular fa-copy', priority: 78 };
  return null;
};

const stageIdentifierAction = (stage: QuickActionStageLike): NavigationQuickCopyAction | null => {
  const labelMatch = cleanText(stage.label).match(/#\s*([\d۰-۹٠-٩]+)/);
  const keyMatch = cleanText(stage.key).match(/(?:contract|installment|payment|check|invoice|repair|customer|partner|phone|product)-(\d+)(?:$|\D)/i);
  const rawValue = labelMatch?.[1] || keyMatch?.[1] || '';
  const value = toAsciiDigits(rawValue).replace(/\D/g, '');
  if (!value) return null;

  const key = cleanText(stage.key).toLowerCase();
  const copyLabel = /phone/.test(key) ? 'کپی شناسه گوشی'
    : /product/.test(key) ? 'کپی شناسه کالا'
      : /payment/.test(key) ? 'کپی شناسه پرداخت'
        : /check/.test(key) ? 'کپی شناسه چک'
          : /(?:contract|installment)/.test(key) ? 'کپی شناسه قرارداد'
            : /repair/.test(key) ? 'کپی شناسه تعمیر'
              : /customer/.test(key) ? 'کپی شناسه مشتری'
                : /partner/.test(key) ? 'کپی شناسه همکار'
                  : 'کپی شناسه سند';

  return {
    key: `stage-id-${stage.key}`,
    label: copyLabel,
    value,
    iconClass: 'fa-regular fa-copy',
    priority: 64,
  };
};

export const deriveNavigationQuickCopyActions = (stage: QuickActionStageLike): NavigationQuickCopyAction[] => {
  const items = Array.isArray(stage.preview?.items) ? stage.preview?.items || [] : [];
  const actions: NavigationQuickCopyAction[] = [];
  const seen = new Set<string>();

  items.forEach((item, index) => {
    const meta = itemActionMeta(item?.copyLabel || item?.label || '');
    if (!meta) return;
    const value = cleanText(item?.copyValue || item?.value);
    if (!value) return;
    const dedupeKey = `${meta.label}::${value}`;
    if (seen.has(dedupeKey)) return;
    seen.add(dedupeKey);
    actions.push({
      key: `preview-copy-${stage.key}-${index}`,
      label: cleanText(item?.copyLabel) || meta.label,
      value,
      iconClass: meta.iconClass,
      priority: meta.priority,
    });
  });

  const stageIdentifier = stageIdentifierAction(stage);
  if (stageIdentifier && !actions.some((action) => /شناسه/.test(action.label))) {
    actions.push(stageIdentifier);
  }

  return actions
    .sort((left, right) => right.priority - left.priority)
    .slice(0, 3);
};
