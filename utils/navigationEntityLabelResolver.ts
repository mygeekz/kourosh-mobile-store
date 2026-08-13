export type NavigationEntityQuickPreviewItem = {
  label: string;
  value: string;
  iconClass?: string;
  tone?: string;
  copyValue?: string;
  copyLabel?: string;
};

export type NavigationEntityQuickPreviewSnapshot = {
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  status?: string;
  statusTone?: string;
  items?: NavigationEntityQuickPreviewItem[];
  note?: string;
};

export type NavigationEntityBreadcrumbStageSnapshot = {
  key: string;
  label: string;
  detail?: string;
  iconClass?: string;
  path?: string;
  preview?: NavigationEntityQuickPreviewSnapshot;
};

export type NavigationEntityLabelInput = {
  targetPath: string;
  kind?: string | null;
  id?: number | string | null;
  sourceLabel?: string | null;
  contextLabel?: string | null;
  amountText?: string | null;
  entityName?: string | null;
  identifier?: string | null;
  installmentNumber?: number | string | null;
  paymentId?: number | string | null;
  checkId?: number | string | null;
  checkNumber?: string | null;
  batchId?: string | null;
  preview?: NavigationEntityQuickPreviewSnapshot | null;
};

export type NavigationEntityLabelContext = Omit<NavigationEntityLabelInput, 'targetPath' | 'contextLabel'>;

const faNumber = (value: number | string) => Number(value || 0).toLocaleString('fa-IR');

const cleanText = (value?: string | null) => String(value || '').replace(/\s+/g, ' ').trim();


const cleanPreview = (preview?: NavigationEntityQuickPreviewSnapshot | null): NavigationEntityQuickPreviewSnapshot | undefined => {
  if (!preview) return undefined;
  const items = (Array.isArray(preview.items) ? preview.items : [])
    .map((item) => ({
      label: cleanText(item?.label),
      value: cleanText(item?.value),
      iconClass: cleanText(item?.iconClass) || undefined,
      tone: cleanText(item?.tone) || undefined,
      copyValue: cleanText(item?.copyValue) || undefined,
      copyLabel: cleanText(item?.copyLabel) || undefined,
    }))
    .filter((item) => item.label && item.value)
    .slice(0, 8);
  const result: NavigationEntityQuickPreviewSnapshot = {
    eyebrow: cleanText(preview.eyebrow) || undefined,
    title: cleanText(preview.title) || undefined,
    subtitle: cleanText(preview.subtitle) || undefined,
    status: cleanText(preview.status) || undefined,
    statusTone: cleanText(preview.statusTone) || undefined,
    items,
    note: cleanText(preview.note) || undefined,
  };
  return result.eyebrow || result.title || result.subtitle || result.status || result.note || items.length ? result : undefined;
};

const mergePreview = (
  base: NavigationEntityQuickPreviewSnapshot | undefined,
  extra?: NavigationEntityQuickPreviewSnapshot | null,
): NavigationEntityQuickPreviewSnapshot | undefined => {
  const baseClean = cleanPreview(base);
  const extraClean = cleanPreview(extra);
  if (!baseClean) return extraClean;
  if (!extraClean) return baseClean;
  const seen = new Set<string>();
  const items = [...(baseClean.items || []), ...(extraClean.items || [])]
    .filter((item) => {
      const key = `${item.label}::${item.value}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 8);
  return cleanPreview({
    ...baseClean,
    ...extraClean,
    title: extraClean.title || baseClean.title,
    subtitle: extraClean.subtitle || baseClean.subtitle,
    status: extraClean.status || baseClean.status,
    statusTone: extraClean.statusTone || baseClean.statusTone,
    note: extraClean.note || baseClean.note,
    items,
  });
};

const previewItems = (...items: Array<NavigationEntityQuickPreviewItem | false | null | undefined>) =>
  items.filter(Boolean) as NavigationEntityQuickPreviewItem[];

const contextHead = (value?: string | null) => cleanText(value).split('•')[0]?.trim() || '';

const isGenericEntityText = (value: string) => {
  const text = cleanText(value);
  if (!text) return true;
  return /^(?:گوشی|کالا|محصول|فاکتور|فروش|پرونده|قرارداد|پرداخت|چک|تعمیر|سند)(?:\s*#?\s*[\d۰-۹]+)?$/i.test(text);
};

const toPositiveInt = (value: unknown) => {
  const normalized = String(value ?? '')
    .replace(/[۰-۹]/g, (digit) => String('۰۱۲۳۴۵۶۷۸۹'.indexOf(digit)))
    .replace(/[^\d-]/g, '');
  const parsed = Math.floor(Number(normalized || 0));
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
};

const installmentOrdinal = (value: number) => {
  const ordinals: Record<number, string> = {
    1: 'اول', 2: 'دوم', 3: 'سوم', 4: 'چهارم', 5: 'پنجم', 6: 'ششم', 7: 'هفتم', 8: 'هشتم', 9: 'نهم', 10: 'دهم',
    11: 'یازدهم', 12: 'دوازدهم', 13: 'سیزدهم', 14: 'چهاردهم', 15: 'پانزدهم', 16: 'شانزدهم', 17: 'هفدهم', 18: 'هجدهم', 19: 'نوزدهم', 20: 'بیستم',
  };
  return ordinals[value] || `شماره ${faNumber(value)}`;
};

const compactIdentifier = (value?: string | null, prefix = '') => {
  const raw = cleanText(value).replace(/^IMEI\s*[:：]?\s*/i, '');
  if (!raw) return '';
  const compact = raw.length > 13 ? `${raw.slice(0, 6)}…${raw.slice(-4)}` : raw;
  return `${prefix}${compact}`;
};

const parseInstallmentNumber = (sourceLabel?: string | null) => {
  const raw = cleanText(sourceLabel);
  const match = raw.match(/قسط\s*(?:شماره\s*)?([\d۰-۹]+)/i);
  return toPositiveInt(match?.[1]);
};

const parseCheckNumber = (sourceLabel?: string | null) => {
  const raw = cleanText(sourceLabel);
  const match = raw.match(/چک\s*(?!اقساطی)([^·•]+?)(?:\s*[·•]|$)/i);
  const value = cleanText(match?.[1]).replace(/^#/, '');
  return value && !/پرونده|اقساط/i.test(value) ? value : '';
};

const parseImei = (sourceLabel?: string | null) => {
  const raw = cleanText(sourceLabel);
  return cleanText(raw.match(/IMEI\s*[:：]?\s*([A-Za-z0-9-]+)/i)?.[1]);
};

const usefulSourceName = (sourceLabel?: string | null) => {
  const raw = cleanText(sourceLabel);
  if (!raw || isGenericEntityText(raw) || /یافت نشد/.test(raw)) return '';
  return raw
    .replace(/^گوشی\s*[:：]?\s*/i, '')
    .replace(/^کالا\s*[:：]?\s*/i, '')
    .replace(/\s*[·•]\s*IMEI\s*[:：]?.*$/i, '')
    .trim();
};

const safePath = (pathname: string, params?: URLSearchParams) => {
  const search = params?.toString() || '';
  return `${pathname}${search ? `?${search}` : ''}`;
};

export const resolveNavigationEntityLabels = (
  input: NavigationEntityLabelInput,
): NavigationEntityBreadcrumbStageSnapshot[] => {
  const targetPath = cleanText(input.targetPath) || '/';
  const url = new URL(targetPath, 'https://kourosh.local');
  const pathname = url.pathname;
  const params = url.searchParams;
  const sourceLabel = cleanText(input.sourceLabel);
  const contextLabel = cleanText(input.contextLabel);
  const amountText = cleanText(input.amountText);
  const entityName = cleanText(input.entityName);
  const identifier = cleanText(input.identifier);
  const kind = cleanText(input.kind).toLowerCase();
  const explicitPreview = cleanPreview(input.preview);
  const stages: NavigationEntityBreadcrumbStageSnapshot[] = [];
  const add = (
    key: string,
    label: string,
    iconClass: string,
    detail?: string,
    path?: string,
    preview?: NavigationEntityQuickPreviewSnapshot,
  ) => {
    if (!cleanText(label)) return;
    stages.push({
      key,
      label: cleanText(label),
      iconClass,
      detail: cleanText(detail) || undefined,
      path,
      preview: cleanPreview(preview),
    });
  };

  const installmentMatch = pathname.match(/^\/installment-sales\/(\d+)$/);
  if (installmentMatch?.[1]) {
    const saleId = toPositiveInt(installmentMatch[1]);
    const paymentId = toPositiveInt(input.paymentId) || toPositiveInt(params.get('paymentId'));
    const checkId = toPositiveInt(input.checkId) || toPositiveInt(params.get('checkId'));
    const installmentNumber = toPositiveInt(input.installmentNumber) || parseInstallmentNumber(sourceLabel);
    const checkNumber = cleanText(input.checkNumber) || parseCheckNumber(sourceLabel);
    const contractParams = new URLSearchParams(params);
    contractParams.delete('paymentId');
    contractParams.delete('checkId');
    contractParams.set('tab', checkId ? 'checks' : 'installments');
    const contractPath = safePath(pathname, contractParams);

    const hasEntitySnapshot = Boolean(kind || sourceLabel || amountText || entityName || input.installmentNumber || input.paymentId || input.checkId || input.checkNumber);
    const contractBaseLabel = hasEntitySnapshot ? `قرارداد #${faNumber(saleId)}` : `قرارداد اقساطی #${faNumber(saleId)}`;
    const contractLabel = entityName && !/^(?:فروش|پرونده|قرارداد)/i.test(entityName)
      ? `${contractBaseLabel} • ${entityName}`
      : contractBaseLabel;
    add(
      `entity-contract-${saleId}`,
      contractLabel,
      'fa-solid fa-file-invoice-dollar',
      entityName || contextLabel,
      paymentId || checkId ? contractPath : undefined,
      mergePreview({
        eyebrow: 'پرونده اقساط',
        title: contractLabel,
        subtitle: entityName || contextLabel || undefined,
        items: previewItems(
          kind === 'installment_sale' && amountText ? { label: 'مبلغ قرارداد', value: amountText, iconClass: 'fa-solid fa-coins' } : null,
          identifier ? { label: 'شناسه', value: compactIdentifier(identifier), iconClass: 'fa-solid fa-barcode', copyValue: identifier, copyLabel: 'کپی شناسه' } : null,
        ),
      }, !paymentId && !checkId ? explicitPreview : undefined),
    );

    if (paymentId) {
      if (installmentNumber > 0) {
        const installmentLabel = `قسط ${installmentOrdinal(installmentNumber)}`;
        add(
          `entity-installment-${saleId}-${installmentNumber}`,
          installmentLabel,
          'fa-regular fa-calendar-check',
          sourceLabel,
          undefined,
          mergePreview({
            eyebrow: 'قسط قرارداد',
            title: installmentLabel,
            subtitle: sourceLabel || undefined,
            items: previewItems(
              { label: 'شماره قسط', value: faNumber(installmentNumber), iconClass: 'fa-solid fa-list-ol' },
              amountText ? { label: 'پرداخت این رویداد', value: amountText, iconClass: 'fa-solid fa-hand-holding-dollar', copyValue: amountText, copyLabel: 'کپی مبلغ پرداخت' } : null,
            ),
          }, explicitPreview),
        );
      }
      const paymentLabel = amountText ? `پرداخت ${amountText}` : `پرداخت #${faNumber(paymentId)}`;
      add(
        `entity-payment-${paymentId}`,
        paymentLabel,
        'fa-solid fa-hand-holding-dollar',
        amountText ? `پرداخت #${faNumber(paymentId)}${sourceLabel ? ` • ${sourceLabel}` : ''}` : sourceLabel,
        undefined,
        mergePreview({
          eyebrow: 'پرداخت اقساطی',
          title: paymentLabel,
          subtitle: sourceLabel || undefined,
          items: previewItems(
            amountText ? { label: 'مبلغ پرداخت', value: amountText, iconClass: 'fa-solid fa-coins', copyValue: amountText, copyLabel: 'کپی مبلغ پرداخت' } : null,
            installmentNumber > 0 ? { label: 'قسط', value: `قسط ${installmentOrdinal(installmentNumber)}`, iconClass: 'fa-regular fa-calendar-check' } : null,
            { label: 'شناسه پرداخت', value: `#${faNumber(paymentId)}`, iconClass: 'fa-solid fa-hashtag', copyValue: String(paymentId), copyLabel: 'کپی شناسه پرداخت' },
          ),
        }, explicitPreview),
      );
      return stages;
    }

    if (checkId) {
      const checkLabel = checkNumber ? `چک ${checkNumber}` : `چک #${faNumber(checkId)}`;
      add(
        `entity-check-${checkId}`,
        checkLabel,
        'fa-solid fa-money-check-dollar',
        amountText ? `${amountText}${sourceLabel ? ` • ${sourceLabel}` : ''}` : sourceLabel,
        undefined,
        mergePreview({
          eyebrow: 'چک اقساطی',
          title: checkLabel,
          subtitle: sourceLabel || undefined,
          items: previewItems(
            amountText ? { label: 'مبلغ چک', value: amountText, iconClass: 'fa-solid fa-coins', copyValue: amountText, copyLabel: 'کپی مبلغ چک' } : null,
            checkNumber ? { label: 'شماره چک', value: checkNumber, iconClass: 'fa-solid fa-hashtag', copyValue: checkNumber, copyLabel: 'کپی شماره چک' } : null,
          ),
        }, explicitPreview),
      );
      return stages;
    }

    return stages;
  }

  const invoiceMatch = pathname.match(/^\/invoices\/(\d+)$/);
  if (invoiceMatch?.[1]) {
    const id = toPositiveInt(invoiceMatch[1]);
    const legacy = params.get('source') === 'legacy' || kind === 'legacy_sale';
    const baseLabel = `${legacy ? 'فروش نقدی' : 'فاکتور'} #${faNumber(id)}`;
    const label = entityName && !/^(?:فاکتور|فروش)/i.test(entityName) ? `${baseLabel} • ${entityName}` : baseLabel;
    add(`entity-invoice-${id}`, label, legacy ? 'fa-solid fa-cash-register' : 'fa-solid fa-file-invoice', amountText || entityName || contextLabel, undefined, mergePreview({ eyebrow: legacy ? 'فروش نقدی' : 'فاکتور فروش', title: label, subtitle: entityName || contextLabel || undefined, items: previewItems(amountText ? { label: 'مبلغ', value: amountText, iconClass: 'fa-solid fa-coins' } : null, identifier ? { label: 'شناسه کالا', value: compactIdentifier(identifier), iconClass: 'fa-solid fa-barcode' } : null) }, explicitPreview));
    return stages;
  }

  const repairMatch = pathname.match(/^\/repairs\/(\d+)$/);
  if (repairMatch?.[1]) {
    const id = toPositiveInt(repairMatch[1]);
    const repairLabel = entityName ? `تعمیر ${entityName}` : `تعمیر #${faNumber(id)}`;
    add(`entity-repair-${id}`, repairLabel, 'fa-solid fa-screwdriver-wrench', amountText || contextLabel, undefined, mergePreview({ eyebrow: 'پرونده تعمیر', title: repairLabel, subtitle: contextLabel || undefined, items: previewItems(amountText ? { label: 'مبلغ', value: amountText, iconClass: 'fa-solid fa-coins' } : null) }, explicitPreview));
    return stages;
  }

  const customerMatch = pathname.match(/^\/customers\/(\d+)$/);
  if (customerMatch?.[1]) {
    const id = toPositiveInt(customerMatch[1]);
    const head = contextHead(contextLabel);
    const name = entityName || (/مشتری/.test(head) ? head.replace(/^مشتری\s*/, '') : head);
    const customerLabel = name && !isGenericEntityText(name) ? `مشتری ${name}` : `مشتری #${faNumber(id)}`;
    add(`entity-customer-${id}`, customerLabel, 'fa-regular fa-user', contextLabel, undefined, mergePreview({ eyebrow: 'پرونده مشتری', title: customerLabel, subtitle: contextLabel || undefined }, explicitPreview));
    return stages;
  }

  const partnerMatch = pathname.match(/^\/partners\/(\d+)$/);
  if (partnerMatch?.[1]) {
    const id = toPositiveInt(partnerMatch[1]);
    const head = contextHead(contextLabel);
    const name = entityName || (/(?:همکار|تأمین|تامین)/.test(head) ? head.replace(/^(?:همکار|تأمین‌کننده|تامین‌کننده)\s*/, '') : head);
    const batchId = cleanText(input.batchId) || cleanText(params.get('settlementBatchId'));
    const partnerParams = new URLSearchParams(params);
    partnerParams.delete('settlementBatchId');
    const partnerPath = safePath(pathname, partnerParams);
    const partnerLabel = name && !isGenericEntityText(name) ? `همکار ${name}` : `همکار #${faNumber(id)}`;
    add(`entity-partner-${id}`, partnerLabel, 'fa-solid fa-handshake', contextLabel, batchId ? partnerPath : undefined, mergePreview({ eyebrow: 'پرونده همکار', title: partnerLabel, subtitle: contextLabel || undefined }, batchId ? undefined : explicitPreview));
    if (batchId) {
      const settlementLabel = `سند تسویه ${batchId}`;
      add(`entity-settlement-${batchId}`, settlementLabel, 'fa-solid fa-file-signature', amountText || sourceLabel, undefined, mergePreview({ eyebrow: 'تسویه همکار', title: settlementLabel, subtitle: sourceLabel || undefined, items: previewItems(amountText ? { label: 'مبلغ رویداد', value: amountText, iconClass: 'fa-solid fa-coins' } : null, { label: 'شناسه دسته', value: batchId, iconClass: 'fa-solid fa-link', copyValue: batchId, copyLabel: 'کپی شناسه سند' }) }, explicitPreview));
    }
    return stages;
  }

  const phoneId = toPositiveInt(params.get('phoneId')) || (kind === 'phone' ? toPositiveInt(input.id) : 0);
  if (pathname === '/mobile-phones' && phoneId) {
    const imei = compactIdentifier(identifier || parseImei(sourceLabel), 'IMEI ');
    const phoneName = entityName || usefulSourceName(sourceLabel);
    const visible = phoneName ? `گوشی ${phoneName}${imei ? ` • ${imei}` : ''}` : `گوشی #${faNumber(phoneId)}${imei ? ` • ${imei}` : ''}`;
    add(`entity-phone-${phoneId}`, visible, 'fa-solid fa-mobile-screen-button', sourceLabel || contextLabel, undefined, mergePreview({ eyebrow: 'گوشی', title: phoneName ? `گوشی ${phoneName}` : `گوشی #${faNumber(phoneId)}`, subtitle: sourceLabel || contextLabel || undefined, items: previewItems(imei ? { label: 'IMEI', value: imei.replace(/^IMEI\s*/i, ''), iconClass: 'fa-solid fa-barcode', copyValue: identifier || parseImei(sourceLabel), copyLabel: 'کپی IMEI' } : null, amountText ? { label: 'مبلغ رویداد', value: amountText, iconClass: 'fa-solid fa-coins' } : null) }, explicitPreview));
    return stages;
  }

  const productId = toPositiveInt(params.get('productId')) || (kind === 'product' ? toPositiveInt(input.id) : 0);
  if (pathname === '/products' && productId) {
    const productName = entityName || usefulSourceName(sourceLabel);
    const ref = identifier ? ` • ${compactIdentifier(identifier, 'SKU ')}` : '';
    const productLabel = productName ? `کالا ${productName}${ref}` : `کالا #${faNumber(productId)}${ref}`;
    add(`entity-product-${productId}`, productLabel, 'fa-solid fa-box', sourceLabel || contextLabel, undefined, mergePreview({ eyebrow: 'کالا', title: productName ? `کالا ${productName}` : `کالا #${faNumber(productId)}`, subtitle: sourceLabel || contextLabel || undefined, items: previewItems(identifier ? { label: 'SKU / شناسه', value: compactIdentifier(identifier), iconClass: 'fa-solid fa-barcode', copyValue: identifier, copyLabel: 'کپی SKU' } : null, amountText ? { label: 'مبلغ رویداد', value: amountText, iconClass: 'fa-solid fa-coins' } : null) }, explicitPreview));
    return stages;
  }

  if (pathname === '/products') {
    const search = cleanText(params.get('search'));
    if (search) {
      add(`entity-product-search-${search}`, `کالا ${search}`, 'fa-solid fa-box', contextLabel, undefined, mergePreview({ eyebrow: 'کالا', title: `کالا ${search}`, subtitle: contextLabel || undefined }, explicitPreview));
      return stages;
    }
  }

  return stages;
};
