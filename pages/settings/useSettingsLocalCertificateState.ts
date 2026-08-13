import { useState } from 'react';

export function useSettingsLocalCertificateState() {
  const [isGeneratingLocalCert, setIsGeneratingLocalCert] = useState(false);
  const [localCertMessage, setLocalCertMessage] = useState<string | null>(null);
  const [localCertError, setLocalCertError] = useState<string | null>(null);

  return {
    isGeneratingLocalCert,
    setIsGeneratingLocalCert,
    localCertMessage,
    setLocalCertMessage,
    localCertError,
    setLocalCertError,
  };
}
