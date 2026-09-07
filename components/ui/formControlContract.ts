export type FormControlSize = 'sm' | 'md' | 'lg';

/**
 * Kourosh is a dense operational SaaS. Compact is the canonical desktop/form
 * default; touch viewports are expanded by the token layer without page CSS.
 */
export const DEFAULT_FORM_CONTROL_SIZE: FormControlSize = 'sm';

export const mergeFieldDescribedBy = (...ids: Array<string | undefined | null | false>) => (
  ids.filter(Boolean).join(' ') || undefined
);
