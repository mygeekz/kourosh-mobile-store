import React from 'react';

import { applyDocumentBranding, readStoredBranding } from '../../utils/branding';

/** Applies persisted store branding to the document once at app boot. */
export const BrandingBootstrap: React.FC = () => {
  React.useEffect(() => {
    applyDocumentBranding(readStoredBranding()?.storeName);
  }, []);

  return null;
};
