import type { NewRepairData } from '../types';

export const REPAIR_INTAKE_DRAFTS_KEY = 'kourosh:repair-intake-drafts:v1';
export const REPAIR_INTAKE_LEGACY_DRAFT_KEY = 'kourosh:repair-intake-draft';
export const REPAIR_INTAKE_DRAFT_LIMIT = 20;

export type RepairIntakeDraft = {
  id: string;
  formData: NewRepairData;
  customerMobile: string;
  selectedAccessories: string[];
  otherAccessoryNote: string;
  internalNote: string;
  savedAt: string;
  customerName: string;
  deviceLabel: string;
  issuePreview: string;
};

type DraftStorage = Pick<Storage, 'setItem'>;

const asString = (value: unknown): string => {
  if (typeof value === 'string') return value;
  if (value == null) return '';
  if (typeof value === 'number' || typeof value === 'bigint' || typeof value === 'boolean') return String(value);
  return '';
};

const asCustomerId = (value: unknown): NewRepairData['customerId'] => {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') return value;
  return null;
};

const asStringArray = (value: unknown): string[] => {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => asString(item).trim())
    .filter(Boolean);
};

const asIsoDate = (value: unknown, fallback = new Date().toISOString()): string => {
  const text = asString(value).trim();
  if (!text) return fallback;
  const timestamp = Date.parse(text);
  return Number.isFinite(timestamp) ? new Date(timestamp).toISOString() : fallback;
};

export const normalizeRepairFormData = (value: unknown): NewRepairData => {
  const source = value && typeof value === 'object' ? value as Record<string, unknown> : {};
  return {
    customerId: asCustomerId(source.customerId),
    deviceModel: asString(source.deviceModel),
    deviceColor: asString(source.deviceColor),
    serialNumber: asString(source.serialNumber),
    problemDescription: asString(source.problemDescription),
    estimatedCost: typeof source.estimatedCost === 'number' && Number.isFinite(source.estimatedCost)
      ? source.estimatedCost
      : asString(source.estimatedCost),
  };
};

export const normalizeRepairIntakeDraft = (value: unknown): RepairIntakeDraft | null => {
  if (!value || typeof value !== 'object') return null;
  const source = value as Record<string, unknown>;
  const id = asString(source.id).trim();
  if (!id) return null;

  const formData = normalizeRepairFormData(source.formData);
  const internalNote = asString(source.internalNote);
  const customerName = asString(source.customerName).trim() || 'مشتری انتخاب نشده';
  const deviceLabel = asString(source.deviceLabel).trim() || formData.deviceModel.trim() || 'بدون مدل دستگاه';
  const issuePreview = asString(source.issuePreview).trim()
    || formData.problemDescription.trim()
    || internalNote.trim()
    || 'بدون شرح مشکل';

  return {
    id,
    formData,
    customerMobile: asString(source.customerMobile),
    selectedAccessories: asStringArray(source.selectedAccessories),
    otherAccessoryNote: asString(source.otherAccessoryNote),
    internalNote,
    savedAt: asIsoDate(source.savedAt),
    customerName,
    deviceLabel,
    issuePreview,
  };
};

export const parseRepairIntakeDrafts = (raw: string | null): RepairIntakeDraft[] => {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed
      .map(normalizeRepairIntakeDraft)
      .filter((draft): draft is RepairIntakeDraft => Boolean(draft));
  } catch {
    return [];
  }
};

export const sortRepairIntakeDrafts = (drafts: RepairIntakeDraft[]): RepairIntakeDraft[] => (
  [...drafts].sort((a, b) => Date.parse(b.savedAt) - Date.parse(a.savedAt))
);

export const buildRepairIntakeDraft = ({
  id,
  formData,
  customerMobile,
  selectedAccessories,
  otherAccessoryNote,
  internalNote,
  customerName,
  savedAt = new Date().toISOString(),
}: {
  id: string;
  formData: unknown;
  customerMobile?: unknown;
  selectedAccessories?: unknown;
  otherAccessoryNote?: unknown;
  internalNote?: unknown;
  customerName?: unknown;
  savedAt?: string;
}): RepairIntakeDraft => {
  const normalizedFormData = normalizeRepairFormData(formData);
  const normalizedInternalNote = asString(internalNote);
  return {
    id: asString(id).trim() || `repair-draft-${Date.now()}`,
    formData: normalizedFormData,
    customerMobile: asString(customerMobile),
    selectedAccessories: asStringArray(selectedAccessories),
    otherAccessoryNote: asString(otherAccessoryNote),
    internalNote: normalizedInternalNote,
    savedAt: asIsoDate(savedAt),
    customerName: asString(customerName).trim() || 'مشتری انتخاب نشده',
    deviceLabel: normalizedFormData.deviceModel.trim() || 'بدون مدل دستگاه',
    issuePreview: normalizedFormData.problemDescription.trim() || normalizedInternalNote.trim() || 'بدون شرح مشکل',
  };
};

export const upsertRepairIntakeDraft = (
  drafts: RepairIntakeDraft[],
  nextDraft: RepairIntakeDraft,
  limit = REPAIR_INTAKE_DRAFT_LIMIT,
): RepairIntakeDraft[] => {
  const normalizedExisting = drafts
    .map(normalizeRepairIntakeDraft)
    .filter((draft): draft is RepairIntakeDraft => Boolean(draft));
  return sortRepairIntakeDrafts([
    nextDraft,
    ...normalizedExisting.filter((draft) => draft.id !== nextDraft.id),
  ]).slice(0, Math.max(1, limit));
};

export const persistRepairIntakeDrafts = (
  storage: DraftStorage,
  drafts: RepairIntakeDraft[],
): RepairIntakeDraft[] => {
  const normalized = sortRepairIntakeDrafts(
    drafts
      .map(normalizeRepairIntakeDraft)
      .filter((draft): draft is RepairIntakeDraft => Boolean(draft)),
  );
  const serialized = JSON.stringify(normalized);
  // Persist first. The caller should update React state only after this succeeds,
  // so a quota/security failure can never look like a successful temporary save.
  storage.setItem(REPAIR_INTAKE_DRAFTS_KEY, serialized);
  return normalized;
};
