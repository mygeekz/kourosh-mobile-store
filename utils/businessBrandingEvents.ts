export const BUSINESS_BRANDING_UPDATED_EVENT = 'kourosh:business-branding-updated';

export type BusinessBrandingUpdatedDetail = {
  storeName?: string;
  logoPath?: string | null;
  revision?: number;
};

export const notifyBusinessBrandingUpdated = (detail: BusinessBrandingUpdatedDetail = {}) => {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent<BusinessBrandingUpdatedDetail>(BUSINESS_BRANDING_UPDATED_EVENT, { detail }));
};
