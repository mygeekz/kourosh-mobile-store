import React, { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { NotificationMessage, ChangePasswordPayload, AuthUser } from "../types";
import Notification from "../components/Notification";
import { Dialog as Modal } from '@/components/ui';
import { DialogActions as ModalActions } from '@/components/ui';
import { Button } from '@/components/ui';
import { formatIsoToShamsiDateTime } from "../utils/dateUtils";
import { apiFetch } from "../utils/apiFetch";
import { useStyle } from "../contexts/StyleContext";
import { useTheme } from "../contexts/ThemeContext";
import { useMountedRef } from "../utils/asyncGuards";
import AvatarCropDialog from "../components/profile/AvatarCropDialog";
import { QRCodeSVG } from "qrcode.react";

const MAX_AVATAR_MB = 2;

const Field = ({ label, value, onChange, preview, readOnly = false, icon }: { label: string; value: string; onChange?: (v: string) => void; preview?: string; readOnly?: boolean; icon: string }) => {
  const isPassword = label.includes('کلمه عبور');

  return (
    <label className="block text-right">
      <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-primary/5 px-3 py-1 text-[12px] font-black text-mutedText">
        <i className={`${icon} text-[11px] opacity-80`} />
        <span>{label}</span>
      </span>
      <div className="relative overflow-hidden rounded-2xl border border-primary/10 bg-surface transition-colors">
        <span className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center border-l border-primary/10 bg-bg/60 text-mutedText">
          <i className={`${icon} text-[13px]`} />
        </span>
        <input
          type={isPassword ? 'password' : 'text'}
          dir="rtl"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          placeholder={preview}
          className={`h-12 w-full appearance-none border-0 bg-transparent pl-4 pr-16 text-center text-sm font-bold text-text outline-none ring-0 placeholder:text-center placeholder:text-mutedText/70 ${isPassword ? 'tracking-[0.16em]' : ''} ${readOnly ? 'cursor-default text-mutedText' : ''}`}
        />
      </div>
    </label>
  );
};

const ProfilePage: React.FC = () => {
  const { currentUser, token, authReady, isLoading: authLoading, updateCurrentUser } = useAuth();
  const { style, setStyle } = useStyle();
  const { theme: resolvedTheme } = useTheme();
  const isDarkTheme = resolvedTheme === 'dark';
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const avatarObjectUrlRef = useRef<string | null>(null);
  const avatarCropObjectUrlRef = useRef<string | null>(null);
  const avatarSelectionPendingRef = useRef(false);
  const mountedRef = useMountedRef();

  const [profileData, setProfileData] = useState<AuthUser | null>(currentUser);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarCropSource, setAvatarCropSource] = useState<{ file: File; url: string } | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatarUrl || null);
  const [avatarImageFailed, setAvatarImageFailed] = useState(false);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [isRemovingAvatar, setIsRemovingAvatar] = useState(false);
  const [isRemoveAvatarModalOpen, setIsRemoveAvatarModalOpen] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Partial<typeof passwordData>>({});
  const [telegramState, setTelegramState] = useState<'loading' | 'not_linked' | 'pending' | 'linked'>('loading');
  const [telegramDeepLink, setTelegramDeepLink] = useState('');
  const [telegramExpiresAt, setTelegramExpiresAt] = useState('');
  const [telegramBusy, setTelegramBusy] = useState(false);

  useEffect(() => {
    if (!currentUser || !token || !authReady) return;
    let ignore = false;
    (async () => {
      try {
        const response = await apiFetch('/api/me');
        const result = await response.json();
        if (!response.ok || !result.success) throw new Error(result.message || 'خطا در دریافت پروفایل');
        if (ignore) return;
        const user = result.user as AuthUser;
        setProfileData(user);
        setFirstName(user.firstName || '');
        setLastName(user.lastName || '');
        if (!avatarSelectionPendingRef.current) setAvatarPreview(user.avatarUrl || null);
        updateCurrentUser(user);
      } catch {}
    })();
    return () => { ignore = true; };
  }, [currentUser?.id, token, authReady]);

  useEffect(() => {
    if (!currentUser) return;
    setProfileData(currentUser);
    setFirstName(currentUser.firstName || '');
    setLastName(currentUser.lastName || '');
    if (!avatarSelectionPendingRef.current) setAvatarPreview(currentUser.avatarUrl || null);
  }, [currentUser]);

  useEffect(() => {
    if (!avatarSaved) return;
    const timeoutId = window.setTimeout(() => setAvatarSaved(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [avatarSaved]);

  useEffect(() => {
    setAvatarImageFailed(false);
  }, [avatarPreview]);

  useEffect(() => () => {
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    if (avatarCropObjectUrlRef.current) URL.revokeObjectURL(avatarCropObjectUrlRef.current);
  }, []);

  const staffTelegramEligible = profileData?.roleName === 'Admin' || profileData?.roleName === 'Manager';
  useEffect(() => {
    if (!staffTelegramEligible || !token) return;
    let ignore = false;
    void apiFetch('/api/telegram/staff-link', { cache: 'no-store' }).then(async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!ignore && response.ok) setTelegramState(payload?.data?.state === 'linked' ? 'linked' : 'not_linked');
    }).catch(() => { if (!ignore) setTelegramState('not_linked'); });
    return () => { ignore = true; };
  }, [staffTelegramEligible, token]);

  const createStaffTelegramLink = async () => {
    setTelegramBusy(true);
    try {
      const response = await apiFetch('/api/telegram/staff-link-token', { method: 'POST', body: JSON.stringify({}) });
      const payload = await response.json().catch(() => ({}));
      if (!response.ok || !payload?.success) throw new Error(payload?.message || 'ساخت لینک امن انجام نشد.');
      setTelegramDeepLink(String(payload.data.deepLink || ''));
      setTelegramExpiresAt(String(payload.data.expiresAt || ''));
      setTelegramState('pending');
    } catch (error: any) { setNotification({ type: 'error', text: error?.message || 'ساخت لینک امن انجام نشد.' }); }
    finally { setTelegramBusy(false); }
  };

  const revokeStaffTelegramLink = async () => {
    setTelegramBusy(true);
    try {
      const response = await apiFetch('/api/telegram/staff-link', { method: 'DELETE' });
      if (!response.ok) throw new Error('لغو اتصال انجام نشد.');
      setTelegramState('not_linked'); setTelegramDeepLink(''); setTelegramExpiresAt('');
    } catch (error: any) { setNotification({ type: 'error', text: error?.message || 'لغو اتصال انجام نشد.' }); }
    finally { setTelegramBusy(false); }
  };

  const displayName = useMemo(() => [firstName, lastName].filter(Boolean).join(' ').trim() || profileData?.username || 'کاربر سیستم', [firstName, lastName, profileData?.username]);
  const initials = useMemo(() => {
    const firstInitial = firstName.trim().slice(0, 1);
    const lastInitial = lastName.trim().slice(0, 1);
    const fallbackInitial = (profileData?.username || 'ک').trim().slice(0, 1) || 'ک';
    return (`${firstInitial}${lastInitial}` || fallbackInitial).toUpperCase();
  }, [firstName, lastName, profileData?.username]);
  const joinedAt = profileData?.dateAdded ? formatIsoToShamsiDateTime(profileData.dateAdded) : 'نامشخص';
  const lastLogin = profileData?.lastLogin ? formatIsoToShamsiDateTime(profileData.lastLogin) : 'ثبت اطلاعات نشده';

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setNotification({ type: 'error', text: `حجم فایل آواتار نباید بیشتر از ${MAX_AVATAR_MB} مگابایت باشد.` });
      e.target.value = '';
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setNotification({ type: 'error', text: 'فرمت فایل آواتار نامعتبر است.' });
      e.target.value = '';
      return;
    }

    setNotification(null);
    setAvatarSaved(false);
    if (avatarCropObjectUrlRef.current) URL.revokeObjectURL(avatarCropObjectUrlRef.current);
    const cropUrl = URL.createObjectURL(file);
    avatarCropObjectUrlRef.current = cropUrl;
    setAvatarCropSource({ file, url: cropUrl });
  };

  const closeAvatarCrop = () => {
    if (avatarCropObjectUrlRef.current) {
      URL.revokeObjectURL(avatarCropObjectUrlRef.current);
      avatarCropObjectUrlRef.current = null;
    }
    setAvatarCropSource(null);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const applyCroppedAvatar = (file: File) => {
    closeAvatarCrop();
    if (avatarObjectUrlRef.current) URL.revokeObjectURL(avatarObjectUrlRef.current);
    const nextPreviewUrl = URL.createObjectURL(file);
    avatarObjectUrlRef.current = nextPreviewUrl;
    avatarSelectionPendingRef.current = true;
    setAvatarImageFailed(false);
    setAvatarFile(file);
    setAvatarPreview(nextPreviewUrl);
  };

  const handleAvatarUpload = async () => {
    if (!avatarFile || isUploadingAvatar) return;
    setIsUploadingAvatar(true);
    setAvatarSaved(false);
    setNotification(null);
    const formData = new FormData();
    formData.append('avatar', avatarFile);
    try {
      const response = await apiFetch('/api/me/upload-avatar', { method: 'POST', body: formData });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در آپلود آواتار');
      const nextAvatarUrl = result?.data?.avatarUrl || avatarPreview || null;
      if (!mountedRef.current) return;
      avatarSelectionPendingRef.current = false;
      setAvatarPreview(nextAvatarUrl);
      if (avatarObjectUrlRef.current && nextAvatarUrl !== avatarObjectUrlRef.current) {
        URL.revokeObjectURL(avatarObjectUrlRef.current);
        avatarObjectUrlRef.current = null;
      }
      setAvatarFile(null);
      setAvatarSaved(true);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      updateCurrentUser({ avatarUrl: nextAvatarUrl || null });
      setProfileData(prev => prev ? ({ ...prev, avatarUrl: nextAvatarUrl || null }) : prev);
      setNotification({ type: 'success', text: 'تصویر پروفایل با موفقیت ذخیره شد.' });
    } catch (error: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: error.message || 'خطا در ذخیره تغییرات آواتار' });
    } finally {
      if (mountedRef.current) setIsUploadingAvatar(false);
    }
  };

  const resetAvatarSelection = (nextPreview: string | null) => {
    if (avatarObjectUrlRef.current) {
      URL.revokeObjectURL(avatarObjectUrlRef.current);
      avatarObjectUrlRef.current = null;
    }
    avatarSelectionPendingRef.current = false;
    setAvatarFile(null);
    setAvatarSaved(false);
    setAvatarImageFailed(false);
    setAvatarPreview(nextPreview);
    if (avatarInputRef.current) avatarInputRef.current.value = '';
  };

  const handleAvatarRemove = async () => {
    if (isRemovingAvatar) return;

    const savedAvatarUrl = profileData.avatarUrl || currentUser?.avatarUrl || null;
    if (!savedAvatarUrl) {
      resetAvatarSelection(null);
      setIsRemoveAvatarModalOpen(false);
      setNotification({ type: 'info', text: 'تصویر انتخاب‌شده لغو شد.' });
      return;
    }

    setIsRemovingAvatar(true);
    setNotification(null);
    try {
      const response = await apiFetch('/api/me/avatar', { method: 'DELETE' });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در حذف تصویر پروفایل');
      if (!mountedRef.current) return;

      resetAvatarSelection(null);
      updateCurrentUser({ avatarUrl: null });
      setProfileData(prev => prev ? ({ ...prev, avatarUrl: null }) : prev);
      setIsRemoveAvatarModalOpen(false);
      setNotification({ type: 'success', text: 'تصویر پروفایل حذف شد و حروف اول نام جایگزین شد.' });
    } catch (error: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: error.message || 'خطا در حذف تصویر پروفایل' });
    } finally {
      if (mountedRef.current) setIsRemovingAvatar(false);
    }
  };

  const handleSaveProfile = async (e: FormEvent) => {
    e.preventDefault();
    setIsSavingProfile(true);
    setNotification(null);
    try {
      const response = await apiFetch('/api/me/profile', {
        method: 'PUT',
        body: JSON.stringify({ firstName, lastName }),
      });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در ذخیره تغییرات پروفایل');
      const nextUser = result.user as AuthUser;
      if (!mountedRef.current) return;
      updateCurrentUser(nextUser);
      setProfileData(nextUser);
      setFirstName(nextUser.firstName || '');
      setLastName(nextUser.lastName || '');
      setNotification({ type: 'success', text: 'اطلاعات پروفایل ذخیره تغییرات شد.' });
    } catch (error: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: error.message || 'خطا در ذخیره تغییرات پروفایل' });
    } finally {
      if (mountedRef.current) setIsSavingProfile(false);
    }
  };

  const handlePasswordInputChange = (e: ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({ ...prev, [name]: value }));
    setPasswordErrors(prev => ({ ...prev, [name]: undefined }));
  };

  const validatePasswordForm = () => {
    const errors: Partial<typeof passwordData> = {};
    if (!passwordData.oldPassword) errors.oldPassword = 'کلمه عبور فعلی الزامی است.';
    if (!passwordData.newPassword) errors.newPassword = 'کلمه عبور جدید الزامی است.';
    else if (passwordData.newPassword.length < 6) errors.newPassword = 'حداقل ۶ کاراکتر وارد کنید.';
    if (passwordData.newPassword !== passwordData.confirmNewPassword) errors.confirmNewPassword = 'تکرار کلمه عبور صحیح نیست.';
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleChangePassword = async (e: FormEvent) => {
    e.preventDefault();
    if (!validatePasswordForm()) return;
    setIsChangingPassword(true);
    setNotification(null);
    try {
      const payload: ChangePasswordPayload = { oldPassword: passwordData.oldPassword, newPassword: passwordData.newPassword };
      const response = await apiFetch('/api/me/change-password', { method: 'POST', body: JSON.stringify(payload) });
      const result = await response.json();
      if (!response.ok || !result.success) throw new Error(result.message || 'خطا در تغییر کلمه عبور');
      if (!mountedRef.current) return;
      setNotification({ type: 'success', text: 'کلمه عبور با موفقیت تغییر کرد.' });
      setPasswordData({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
      setIsPasswordModalOpen(false);
    } catch (error: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: error.message || 'خطا در تغییر کلمه عبور' });
    } finally {
      if (mountedRef.current) setIsChangingPassword(false);
    }
  };

  if (!authReady || authLoading) {
    return <div className="p-6 text-center text-mutedText"><i className="fas fa-spinner fa-spin ml-2" />در حال دریافت اطلاعات پروفایل...</div>;
  }

  if (!profileData) {
    return <div className="p-6 text-center text-rose-600 dark:text-rose-300">اطلاعات پروفایل یافت نشد.</div>;
  }

  return (
    <div className="mx-auto min-w-0 max-w-7xl overflow-x-clip px-3 py-4 text-right text-text sm:px-4 sm:py-5" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      {avatarCropSource ? (
        <AvatarCropDialog
          sourceUrl={avatarCropSource.url}
          sourceName={avatarCropSource.file.name}
          onCancel={closeAvatarCrop}
          onConfirm={applyCroppedAvatar}
        />
      ) : null}

      <div className="grid min-w-0 gap-4 sm:gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="min-w-0 rounded-[32px] border border-primary/10 bg-surface p-4 shadow-[0_24px_64px_-38px_rgba(15,23,42,0.25)] sm:p-5 dark:shadow-none">
          <div className="min-w-0 rounded-[28px] border border-primary/10 bg-bg/50 p-4 text-center sm:p-5">
            <button
              type="button"
              data-skip-global-button="true"
              onClick={() => avatarInputRef.current?.click()}
              aria-label="انتخاب تصویر پروفایل"
              title="انتخاب تصویر پروفایل"
              className="mx-auto flex h-28 w-28 items-stretch overflow-hidden rounded-[28px] border border-primary/20 bg-primary/5 p-[2px] shadow-none transition-[transform,border-color,background-color] duration-150 hover:-translate-y-px hover:border-primary/40 hover:bg-primary/10 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary"
            >
              <span className="relative flex h-full w-full items-center justify-center overflow-hidden rounded-[26px] bg-surface text-3xl font-black text-primary">
                <span aria-hidden="true">{initials}</span>
                {avatarPreview && !avatarImageFailed ? (
                  <img
                    key={avatarPreview}
                    src={avatarPreview}
                    alt="تصویر پروفایل"
                    className="absolute inset-0 h-full w-full object-cover"
                    onLoad={() => setAvatarImageFailed(false)}
                    onError={(event) => {
                      event.currentTarget.hidden = true;
                      setAvatarImageFailed(true);
                    }}
                  />
                ) : null}
              </span>
            </button>
            <input
              ref={avatarInputRef}
              type="file"
              accept="image/png,image/jpeg,image/gif,image/webp"
              onChange={handleAvatarFileChange}
              className="sr-only"
              tabIndex={-1}
            />

            <div className="mt-4 break-words text-2xl font-black text-text">{displayName}</div>
            <div className="mt-1 break-all text-sm font-bold text-mutedText">@{profileData.username}</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="rounded-full border border-emerald-500/20 bg-emerald-500/10 px-3 py-1 text-[11px] font-black text-emerald-700 dark:text-emerald-200">حساب فعال</span>
              <span className="rounded-full border border-primary/10 bg-bg/60 px-3 py-1 text-[11px] font-black text-text">شناسه {profileData.id.toLocaleString('fa-IR')}</span>
            </div>

            <Button
              type="button"
              unstyled
              autoIcon={false}
              ripple={false}
              onClick={() => avatarInputRef.current?.click()}
              className={`before:hidden mt-5 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-black leading-5 shadow-none transition-[transform,border-color,background-color,color] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isDarkTheme ? '!border-slate-700/90 !bg-slate-950/85 !bg-none !text-slate-100 hover:!border-slate-600 hover:!bg-slate-900' : 'border-primary/20 bg-surface text-text hover:border-primary/30 hover:bg-primary/5'}`}
              leftIcon={<i className="fa-solid fa-image text-[13px]" aria-hidden="true" />}
            >
              <span className="min-w-0">انتخاب تصویر پروفایل</span>
            </Button>

            <div className="mt-2 min-w-0 text-[11px] font-bold leading-5 text-mutedText" aria-live="polite">
              {avatarFile ? (
                <span className="flex min-w-0 items-start justify-center gap-1.5 text-primary">
                  <i className="fa-solid fa-eye mt-1 shrink-0 text-[10px]" aria-hidden="true" />
                  <span className="min-w-0 break-all">پیش‌نمایش «{avatarFile.name}» آماده ذخیره است.</span>
                </span>
              ) : 'فرمت‌های JPEG، PNG، GIF یا WebP تا ۲ مگابایت'}
            </div>

            <Button
              type="button"
              unstyled
              autoIcon={false}
              ripple={false}
              onClick={handleAvatarUpload}
              disabled={!avatarFile || isUploadingAvatar}
              className={`before:hidden mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-black leading-5 shadow-none transition-[transform,border-color,background-color,opacity] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-100 disabled:hover:translate-y-0 ${isDarkTheme ? '!border-slate-700/90 !bg-slate-950/85 !bg-none !text-slate-100 hover:!border-slate-600 hover:!bg-slate-900 disabled:!border-slate-800 disabled:!bg-slate-950/75 disabled:!text-slate-500' : 'border-primary bg-primary text-primary-foreground hover:opacity-90 disabled:border-primary/10 disabled:bg-bg/70 disabled:text-mutedText'}`}
              leftIcon={<i className={isUploadingAvatar ? 'fa-solid fa-spinner fa-spin' : avatarSaved ? 'fa-solid fa-circle-check text-emerald-300' : 'fa-solid fa-cloud-arrow-up'} aria-hidden="true" />}
            >
              <span className="min-w-0">{isUploadingAvatar ? 'در حال ذخیره تصویر...' : avatarSaved ? 'تصویر پروفایل ذخیره شد' : 'ذخیره تصویر پروفایل'}</span>
            </Button>

            <Button
              type="button"
              unstyled
              autoIcon={false}
              ripple={false}
              onClick={() => setIsRemoveAvatarModalOpen(true)}
              disabled={(!profileData.avatarUrl && !currentUser?.avatarUrl && !avatarFile) || isUploadingAvatar || isRemovingAvatar}
              className={`before:hidden mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-black leading-5 shadow-none transition-[transform,border-color,background-color,color] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-rose-500 disabled:cursor-not-allowed disabled:hover:translate-y-0 ${isDarkTheme ? '!border-rose-400/20 !bg-slate-950/85 !bg-none !text-rose-200 hover:!border-rose-400/35 hover:!bg-rose-950/25 disabled:!border-slate-800 disabled:!bg-slate-950/75 disabled:!text-slate-500' : 'border-rose-500/25 bg-transparent text-rose-700 hover:border-rose-500/40 hover:bg-rose-500/10 disabled:border-primary/10 disabled:text-mutedText disabled:hover:bg-transparent'}`}
              leftIcon={<i className="fa-solid fa-trash-can text-[13px]" aria-hidden="true" />}
            >
              <span className="min-w-0">حذف تصویر پروفایل</span>
            </Button>

            <Button
              type="button"
              unstyled
              autoIcon={false}
              ripple={false}
              onClick={() => setIsPasswordModalOpen(true)}
              className={`before:hidden mt-3 flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl border px-3 py-3 text-sm font-black leading-5 shadow-none transition-[transform,border-color,background-color] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${isDarkTheme ? '!border-amber-300/20 !bg-slate-950/85 !bg-none !text-amber-100 hover:!border-amber-300/35 hover:!bg-amber-950/20' : 'border-amber-500/25 bg-amber-500/10 text-amber-800 hover:border-amber-500/40 hover:bg-amber-500/20'}`}
              leftIcon={<i className="fa-solid fa-key text-[13px]" aria-hidden="true" />}
            >
              <span className="min-w-0">امنیت و تغییر رمز</span>
            </Button>
          </div>
        </aside>
        <section className="min-w-0 space-y-5">
          <div className="min-w-0 rounded-[32px] border border-primary/10 bg-surface p-4 shadow-[0_24px_64px_-38px_rgba(15,23,42,0.18)] sm:p-5 dark:shadow-none">
            <div className="mb-5 flex min-w-0 flex-wrap items-center justify-between gap-3">
              <div className="min-w-0">
                <div className="break-words text-2xl font-black text-text">پروفایل کاربری</div>
                <div className="mt-1 break-words text-xs font-medium text-mutedText">ویرایش اطلاعات هویت کاربر، اطلاعات پایه و ترجیحات شخصی</div>
              </div>
              <div className="grid w-full min-w-0 gap-3 sm:w-auto sm:min-w-[240px] sm:grid-cols-2">
                <div className="rounded-2xl border border-primary/10 bg-bg/60 px-4 py-3">
                  <div className="text-[11px] font-bold text-mutedText">تاریخ عضویت</div>
                  <div className="mt-1 text-sm font-black text-text">{joinedAt}</div>
                </div>
                <div className="rounded-2xl border border-primary/10 bg-bg/60 px-4 py-3">
                  <div className="text-[11px] font-bold text-mutedText">آخرین ورود</div>
                  <div className="mt-1 text-sm font-black text-text">{lastLogin}</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="grid gap-4 lg:grid-cols-2">
              <Field label="نام" icon="fa-solid fa-signature" value={firstName} onChange={setFirstName} preview="نام خود را وارد کنید" />
              <Field label="نام خانوادگی" icon="fa-solid fa-id-card" value={lastName} onChange={setLastName} preview="نام خانوادگی را وارد کنید" />
              <Field label="نام کاربری" icon="fa-solid fa-user" value={profileData.username} readOnly />
              <Field label="نقش" icon="fa-solid fa-user-shield" value={profileData.roleName} readOnly />

              <div className="flex min-w-0 flex-col gap-3 rounded-[28px] border border-primary/10 bg-bg/50 p-4 sm:flex-row sm:flex-wrap sm:items-center sm:justify-between lg:col-span-2">
                <div className="grid w-full min-w-0 grid-cols-3 gap-2 sm:w-auto">
                  <Button
                    type="button"
                    unstyled
                    autoIcon={false}
                    ripple={false}
                    onClick={() => setStyle('theme', 'light')}
                    aria-pressed={style.theme === 'light'}
                    className={`before:hidden min-h-10 rounded-full border px-2 py-2 text-xs font-black shadow-none transition-[transform,border-color,background-color,color,opacity] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isDarkTheme ? (style.theme === 'light' ? '!border-primary/45 !bg-slate-800 !text-slate-100' : '!border-slate-700 !bg-slate-950/85 !text-slate-300 hover:!border-slate-600 hover:!bg-slate-900') : (style.theme === 'light' ? 'border-text bg-text text-bg hover:opacity-90' : 'border-primary/10 bg-surface text-text hover:border-primary/25 hover:bg-primary/5')}`}
                  >روشن</Button>
                  <Button
                    type="button"
                    unstyled
                    autoIcon={false}
                    ripple={false}
                    onClick={() => setStyle('theme', 'dark')}
                    aria-pressed={style.theme === 'dark'}
                    className={`before:hidden min-h-10 rounded-full border px-2 py-2 text-xs font-black shadow-none transition-[transform,border-color,background-color,color,opacity] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isDarkTheme ? (style.theme === 'dark' ? '!border-primary/45 !bg-slate-800 !text-slate-100' : '!border-slate-700 !bg-slate-950/85 !text-slate-300 hover:!border-slate-600 hover:!bg-slate-900') : (style.theme === 'dark' ? 'border-text bg-text text-bg hover:opacity-90' : 'border-primary/10 bg-surface text-text hover:border-primary/25 hover:bg-primary/5')}`}
                  >تیره</Button>
                  <Button
                    type="button"
                    unstyled
                    autoIcon={false}
                    ripple={false}
                    onClick={() => setStyle('theme', 'system')}
                    aria-pressed={style.theme === 'system'}
                    className={`before:hidden min-h-10 rounded-full border px-2 py-2 text-xs font-black shadow-none transition-[transform,border-color,background-color,color,opacity] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary ${isDarkTheme ? (style.theme === 'system' ? '!border-primary/45 !bg-slate-800 !text-slate-100' : '!border-slate-700 !bg-slate-950/85 !text-slate-300 hover:!border-slate-600 hover:!bg-slate-900') : (style.theme === 'system' ? 'border-text bg-text text-bg hover:opacity-90' : 'border-primary/10 bg-surface text-text hover:border-primary/25 hover:bg-primary/5')}`}
                  >سیستمی</Button>
                </div>
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  loading={isSavingProfile}
                  loadingText="در حال ذخیره تغییرات..."
                  loadingHint="به‌روزرسانی اطلاعات پایه و ترجیحات شخصی"
                  successPulseText="پروفایل ذخیره شد"
                  successPulseHint="اطلاعات کاربر با موفقیت به‌روزرسانی شد"
                  unstyled
                  ripple={false}
                  className={`before:hidden min-h-12 w-full rounded-2xl border px-4 py-3 text-sm font-black leading-5 shadow-none transition-[transform,border-color,background-color,opacity] duration-150 hover:-translate-y-px focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-primary disabled:cursor-not-allowed disabled:opacity-60 disabled:hover:translate-y-0 sm:w-auto sm:min-w-[12rem] ${isDarkTheme ? '!border-slate-700/90 !bg-slate-950/85 !bg-none !text-slate-100 hover:!border-slate-600 hover:!bg-slate-900' : 'border-primary bg-primary text-primary-foreground hover:opacity-90'}`}
                  leftIcon={<i className="fa-solid fa-floppy-disk" />}
                >
                  ذخیره تغییرات پروفایل
                </Button>
              </div>
            </form>
          </div>
          {staffTelegramEligible ? (
            <div className="min-w-0 rounded-[28px] border border-primary/10 bg-surface p-4 sm:p-5">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2 text-base font-black text-text"><i className="fa-brands fa-telegram text-sky-500" /> هویت سازمانی تلگرام</div>
                  <p className="mt-2 text-xs leading-6 text-mutedText">اتصال مستقل و امن برای تأیید نقش {profileData.roleName}. این دسترسی هیچ داشبورد یا عملیات مالی فعال نمی‌کند.</p>
                </div>
                <span className={`rounded-full px-3 py-1 text-xs font-black ${telegramState === 'linked' ? 'bg-emerald-500/10 text-emerald-700' : telegramState === 'pending' ? 'bg-amber-500/10 text-amber-700' : 'bg-bg text-mutedText'}`}>
                  {telegramState === 'loading' ? 'در حال بررسی' : telegramState === 'linked' ? 'متصل' : telegramState === 'pending' ? 'در انتظار تأیید' : 'متصل نیست'}
                </span>
              </div>
              {telegramState === 'pending' && telegramDeepLink ? (
                <div className="mt-4 grid gap-4 rounded-2xl border border-primary/10 bg-bg/50 p-4 sm:grid-cols-[auto_1fr] sm:items-center">
                  <div className="mx-auto rounded-xl bg-white p-2"><QRCodeSVG value={telegramDeepLink} size={132} /></div>
                  <div className="space-y-3 text-center sm:text-right">
                    <p className="m-0 text-xs leading-6 text-mutedText">QR را با تلگرام خودتان اسکن کنید. لینک یک‌بارمصرف است و در {telegramExpiresAt ? formatIsoToShamsiDateTime(telegramExpiresAt) : 'چند دقیقه آینده'} منقضی می‌شود.</p>
                    <a href={telegramDeepLink} target="_blank" rel="noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-sky-500 px-4 text-sm font-black text-white">باز کردن تلگرام</a>
                  </div>
                </div>
              ) : null}
              <div className="mt-4 flex flex-wrap gap-2">
                {telegramState === 'linked' ? (
                  <Button type="button" variant="danger" disabled={telegramBusy} onClick={revokeStaffTelegramLink}>لغو اتصال</Button>
                ) : (
                  <Button type="button" disabled={telegramBusy || telegramState === 'loading'} onClick={createStaffTelegramLink}>{telegramBusy ? 'در حال ساخت...' : telegramState === 'pending' ? 'ساخت لینک تازه' : 'اتصال امن تلگرام'}</Button>
                )}
              </div>
            </div>
          ) : null}
        </section>
      </div>

      {isRemoveAvatarModalOpen && (
        <Modal title="حذف تصویر پروفایل" onClose={() => !isRemovingAvatar && setIsRemoveAvatarModalOpen(false)} widthClass="max-w-md">
          <div className="space-y-4 p-1 text-right" dir="rtl">
            <div className="rounded-2xl border border-rose-500/20 bg-rose-500/10 px-4 py-3 text-sm leading-7 text-rose-800 dark:text-rose-100">
              {profileData.avatarUrl || currentUser?.avatarUrl
                ? 'تصویر فعلی حذف می‌شود و حروف اول نام کاربر به‌عنوان تصویر جایگزین نمایش داده خواهد شد.'
                : 'پیش‌نمایش انتخاب‌شده لغو می‌شود و حروف اول نام کاربر نمایش داده خواهد شد.'}
            </div>
            <ModalActions
              onCancel={() => setIsRemoveAvatarModalOpen(false)}
              cancelText="انصراف"
              submitText={profileData.avatarUrl || currentUser?.avatarUrl ? 'حذف تصویر' : 'لغو تصویر انتخاب‌شده'}
              submittingText="در حال حذف..."
              isSubmitting={isRemovingAvatar}
              submitType="button"
              onSubmitClick={handleAvatarRemove}
              submitVariant="danger"
              submitIconClass="fa-solid fa-trash-can"
              align="end"
            />
          </div>
        </Modal>
      )}

      {isPasswordModalOpen && (
        <Modal title="تغییر کلمه عبور" onClose={() => setIsPasswordModalOpen(false)} widthClass="max-w-md">
          <form onSubmit={handleChangePassword} className="space-y-4 p-1">
            <div className="rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs leading-6 text-primary">
              یک رمز تازه و قوی ثبت اطلاعات کن.
            </div>
            <Field label="کلمه عبور فعلی" icon="fa-solid fa-lock" value={passwordData.oldPassword} onChange={(v) => handlePasswordInputChange({ target: { name: 'oldPassword', value: v } } as any)} />
            {passwordErrors.oldPassword ? <div className="text-xs font-bold text-rose-600">{passwordErrors.oldPassword}</div> : null}
            <Field label="کلمه عبور جدید" icon="fa-solid fa-key" value={passwordData.newPassword} onChange={(v) => handlePasswordInputChange({ target: { name: 'newPassword', value: v } } as any)} />
            {passwordErrors.newPassword ? <div className="text-xs font-bold text-rose-600">{passwordErrors.newPassword}</div> : null}
            <Field label="تکرار کلمه عبور جدید" icon="fa-solid fa-shield-halved" value={passwordData.confirmNewPassword} onChange={(v) => handlePasswordInputChange({ target: { name: 'confirmNewPassword', value: v } } as any)} />
            {passwordErrors.confirmNewPassword ? <div className="text-xs font-bold text-rose-600">{passwordErrors.confirmNewPassword}</div> : null}
            <ModalActions onCancel={() => setIsPasswordModalOpen(false)} submitText="ثبت اطلاعات تغییرات" submittingText="در حال تغییر..." isSubmitting={isChangingPassword} />
          </form>
        </Modal>
      )}
    </div>
  );
};

export default ProfilePage;
