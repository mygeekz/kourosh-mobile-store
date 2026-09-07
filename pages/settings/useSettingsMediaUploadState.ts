import { useRef, useState } from 'react';

export function useSettingsMediaUploadState() {
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isUploadingLogo, setIsUploadingLogo] = useState(false);
  const logoInputRef = useRef<HTMLInputElement>(null);

  const [meAvatarFile, setMeAvatarFile] = useState<File | null>(null);
  const [meAvatarPreview, setMeAvatarPreview] = useState<string | null>(null);
  const meAvatarInputRef = useRef<HTMLInputElement>(null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);

  return {
    logoFile,
    setLogoFile,
    logoPreview,
    setLogoPreview,
    isUploadingLogo,
    setIsUploadingLogo,
    logoInputRef,
    meAvatarFile,
    setMeAvatarFile,
    meAvatarPreview,
    setMeAvatarPreview,
    meAvatarInputRef,
    isUploadingAvatar,
    setIsUploadingAvatar,
  };
}
