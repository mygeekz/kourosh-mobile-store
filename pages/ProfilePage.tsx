import React, { ChangeEvent, FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import { NotificationMessage, ChangePasswordPayload, AuthUser } from "../types";
import Notification from "../components/Notification";
import Modal from "../components/Modal";
import ModalActions from "../components/ModalActions";
import Button from "../components/Button";
import { formatIsoToShamsiDateTime } from "../utils/dateUtils";
import { apiFetch } from "../utils/apiFetch";
import { useStyle } from "../contexts/StyleContext";
import { useMountedRef } from "../utils/asyncGuards";

const MAX_AVATAR_MB = 2;

const Field = ({ label, value, onChange, preview, readOnly = false, icon }: { label: string; value: string; onChange?: (v: string) => void; preview?: string; readOnly?: boolean; icon: string }) => {
  const isPassword = label.includes('کلمه عبور');

  return (
    <label className="block text-right">
      <span className="mb-2 inline-flex items-center gap-2 rounded-full bg-slate-50 px-3 py-1 text-[12px] font-black text-slate-600 dark:bg-slate-900 dark:text-slate-300">
        <i className={`${icon} text-[11px] opacity-80`} />
        <span>{label}</span>
      </span>
      <div className="relative overflow-hidden rounded-2xl border border-slate-200 bg-white transition    dark:border-slate-700 dark:bg-slate-900 ">
        <span className="pointer-events-none absolute inset-y-0 right-0 flex w-12 items-center justify-center border-l border-slate-200 bg-slate-50 text-slate-500 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300">
          <i className={`${icon} text-[13px]`} />
        </span>
        <input
          type={isPassword ? 'password' : 'text'}
          dir="rtl"
          value={value}
          onChange={(e) => onChange?.(e.target.value)}
          readOnly={readOnly}
          preview={preview}
          className={`h-12 w-full appearance-none border-0 bg-transparent pl-4 pr-16 text-center text-sm font-bold text-slate-900 outline-none ring-0 preview:text-center preview:text-slate-400   dark:text-slate-100 dark:preview:text-slate-500 ${isPassword ? 'tracking-[0.16em]' : ''} ${readOnly ? 'cursor-default text-slate-500 dark:text-slate-400' : ''}`}
        />
      </div>
    </label>
  );
};

const ProfilePage: React.FC = () => {
  const { currentUser, token, authReady, isLoading: authLoading, updateCurrentUser } = useAuth();
  const { style, setStyle } = useStyle();
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useMountedRef();

  const [profileData, setProfileData] = useState<AuthUser | null>(currentUser);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);
  const [firstName, setFirstName] = useState(currentUser?.firstName || '');
  const [lastName, setLastName] = useState(currentUser?.lastName || '');
  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(currentUser?.avatarUrl || null);
  const [isUploadingAvatar, setIsUploadingAvatar] = useState(false);
  const [avatarSaved, setAvatarSaved] = useState(false);
  const [isSavingProfile, setIsSavingProfile] = useState(false);
  const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [passwordData, setPasswordData] = useState({ oldPassword: '', newPassword: '', confirmNewPassword: '' });
  const [passwordErrors, setPasswordErrors] = useState<Partial<typeof passwordData>>({});

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
        setAvatarPreview(user.avatarUrl || null);
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
    setAvatarPreview(currentUser.avatarUrl || null);
  }, [currentUser]);

  useEffect(() => {
    if (!avatarSaved) return;
    const timeoutId = window.setTimeout(() => setAvatarSaved(false), 2200);
    return () => window.clearTimeout(timeoutId);
  }, [avatarSaved]);

  const displayName = useMemo(() => [firstName, lastName].filter(Boolean).join(' ').trim() || profileData?.username || 'کاربر سیستم', [firstName, lastName, profileData?.username]);
  const initials = useMemo(() => ((firstName || profileData?.username || 'A').trim().slice(0, 1) || 'A').toUpperCase(), [firstName, profileData?.username]);
  const joinedAt = profileData?.dateAdded ? formatIsoToShamsiDateTime(profileData.dateAdded) : 'نامشخص';
  const lastLogin = profileData?.lastLogin ? formatIsoToShamsiDateTime(profileData.lastLogin) : 'ثبت اطلاعات نشده';

  const handleAvatarFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > MAX_AVATAR_MB * 1024 * 1024) {
      setNotification({ type: 'error', text: `حجم فایل آواتار نباید بیشتر از ${MAX_AVATAR_MB} مگابایت باشد.` });
      return;
    }
    if (!['image/jpeg', 'image/png', 'image/gif', 'image/webp'].includes(file.type)) {
      setNotification({ type: 'error', text: 'فرمت فایل آواتار نامعتبر است.' });
      return;
    }
    setAvatarSaved(false);
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
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
      setAvatarPreview(nextAvatarUrl);
      setAvatarFile(null);
      setAvatarSaved(true);
      if (avatarInputRef.current) avatarInputRef.current.value = '';
      updateCurrentUser({ avatarUrl: nextAvatarUrl || null });
      setProfileData(prev => prev ? ({ ...prev, avatarUrl: nextAvatarUrl || null }) : prev);
      setNotification({ type: 'success', text: 'تصویر پروفایل ذخیره تغییرات شد.' });
    } catch (error: any) {
      if (mountedRef.current) setNotification({ type: 'error', text: error.message || 'خطا در ذخیره تغییرات آواتار' });
    } finally {
      if (mountedRef.current) setIsUploadingAvatar(false);
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
    return <div className="p-6 text-center text-slate-500 dark:text-slate-300"><i className="fas fa-spinner fa-spin ml-2" />در حال دریافت اطلاعات پروفایل...</div>;
  }

  if (!profileData) {
    return <div className="p-6 text-center text-red-500 dark:text-red-400">اطلاعات پروفایل یافت نشد.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-5 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="grid gap-5 xl:grid-cols-[320px_minmax(0,1fr)]">
        <aside className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_-38px_rgba(15,23,42,0.25)] dark:border-slate-800 dark:bg-slate-950">
          <div className="rounded-[28px] border border-slate-200 bg-[linear-gradient(180deg,#ffffff,#f8fafc)] p-5 text-center dark:border-slate-800 dark:bg-[linear-gradient(180deg,#0f172a,#020617)]">
            <button type="button" onClick={() => avatarInputRef.current?.click()} className="mx-auto block h-28 w-28 overflow-hidden rounded-[28px] border border-violet-200 bg-violet-50 p-[2px] shadow-[0_16px_50px_-24px_rgba(124,58,237,0.45)] dark:border-violet-500/20 dark:bg-violet-500/10">
              <span className="flex h-full w-full items-center justify-center overflow-hidden rounded-[26px] bg-white text-4xl font-black text-violet-700 dark:bg-slate-950 dark:text-violet-200">
                {avatarPreview ? <img src={avatarPreview} alt="آواتار" className="h-full w-full object-cover" /> : initials}
              </span>
            </button>
            <input ref={avatarInputRef} type="file" accept="image/png,image/jpeg,image/gif,image/webp" onChange={handleAvatarFileChange} hidden />

            <div className="mt-4 text-2xl font-black text-slate-900 dark:text-slate-100">{displayName}</div>
            <div className="mt-1 text-sm font-bold text-slate-500 dark:text-slate-400">@{profileData.username}</div>
            <div className="mt-3 flex flex-wrap justify-center gap-2">
              <span className="rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-[11px] font-black text-emerald-700 dark:border-emerald-500/20 dark:bg-emerald-500/10 dark:text-emerald-200">حساب فعال</span>
              <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200">شناسه {profileData.id.toLocaleString('fa-IR')}</span>
            </div>

            <button
              type="button"
              onClick={handleAvatarUpload}
              disabled={!avatarFile || isUploadingAvatar}
              className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-2xl border border-slate-200 bg-slate-50 text-sm font-black text-slate-800 transition disabled:cursor-not-allowed disabled:opacity-60 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
            >
              <i className={isUploadingAvatar ? 'fa-solid fa-spinner fa-spin' : avatarSaved ? 'fa-solid fa-circle-check text-emerald-500' : 'fa-solid fa-cloud-arrow-up'} />
              <span>{isUploadingAvatar ? 'در حال ذخیره تغییرات تصویر...' : avatarSaved ? 'تصویر پروفایل ذخیره تغییرات شد' : 'ثبت اطلاعات تصویر پروفایل'}</span>
            </button>

            <button
              type="button"
              onClick={() => setIsPasswordModalOpen(true)}
              className="mt-3 flex h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[linear-gradient(135deg,#fbbf24,#f97316)] text-sm font-black text-slate-950 shadow-[0_18px_40px_-26px_rgba(249,115,22,0.55)]"
            >
              <i className="fa-solid fa-key text-[13px]" />
              امنیت و تغییر رمز
            </button>
          </div>
        </aside>

        <section className="space-y-5">
          <div className="rounded-[32px] border border-slate-200 bg-white p-5 shadow-[0_24px_64px_-38px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-950">
            <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
              <div>
                <div className="text-2xl font-black text-slate-900 dark:text-slate-100">پروفایل کاربری</div>
                <div className="mt-1 text-xs font-medium text-slate-500 dark:text-slate-400">ویرایش اطلاعات هویت کاربر، اطلاعات پایه و ترجیحات شخصی</div>
              </div>
              <div className="grid min-w-[240px] gap-3 sm:grid-cols-2">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">تاریخ عضویت</div>
                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100">{joinedAt}</div>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 dark:border-slate-700 dark:bg-slate-900">
                  <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">آخرین ورود</div>
                  <div className="mt-1 text-sm font-black text-slate-900 dark:text-slate-100">{lastLogin}</div>
                </div>
              </div>
            </div>

            <form onSubmit={handleSaveProfile} className="grid gap-4 lg:grid-cols-2">
              <Field label="نام" icon="fa-solid fa-signature" value={firstName} onChange={setFirstName} preview="نام خود را وارد کنید" />
              <Field label="نام خانوادگی" icon="fa-solid fa-id-card" value={lastName} onChange={setLastName} preview="نام خانوادگی را وارد کنید" />
              <Field label="نام کاربری" icon="fa-solid fa-user" value={profileData.username} readOnly />
              <Field label="نقش" icon="fa-solid fa-user-shield" value={profileData.roleName} readOnly />

              <div className="lg:col-span-2 flex flex-wrap items-center justify-between gap-3 rounded-[28px] border border-slate-200 bg-slate-50 p-4 dark:border-slate-800 dark:bg-slate-900/70">
                <div className="flex flex-wrap gap-2">
                  <button type="button" onClick={() => setStyle('theme', 'light')} className={`rounded-full px-4 py-2 text-xs font-black ${style.theme === 'light' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}>روشن</button>
                  <button type="button" onClick={() => setStyle('theme', 'dark')} className={`rounded-full px-4 py-2 text-xs font-black ${style.theme === 'dark' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}>تیره</button>
                  <button type="button" onClick={() => setStyle('theme', 'system')} className={`rounded-full px-4 py-2 text-xs font-black ${style.theme === 'system' ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900' : 'border border-slate-200 bg-white text-slate-700 dark:border-slate-700 dark:bg-slate-950 dark:text-slate-200'}`}>سیستمی</button>
                </div>
                <Button
                  type="submit"
                  disabled={isSavingProfile}
                  loading={isSavingProfile}
                  loadingText="در حال ذخیره تغییرات..."
                  loadingHint="به‌روزرسانی اطلاعات پایه و ترجیحات شخصی"
                  successPulseText="پروفایل ذخیره تغییرات شد"
                  successPulseHint="اطلاعات کاربر با موفقیت به‌روزرسانی شد"
                  variant="primary"
                  size="md"
                  className="min-w-[12rem] bg-[linear-gradient(135deg,#4c1d95,#7c3aed,#a855f7)] shadow-[0_22px_48px_-28px_rgba(124,58,237,0.7)]"
                  leftIcon={<i className="fa-solid fa-floppy-disk" />}
                >
                  ذخیره تغییرات پروفایل
                </Button>
              </div>
            </form>
          </div>
        </section>
      </div>

      {isPasswordModalOpen && (
        <Modal title="تغییر کلمه عبور" onClose={() => setIsPasswordModalOpen(false)} widthClass="max-w-md">
          <form onSubmit={handleChangePassword} className="space-y-4 p-1">
            <div className="rounded-2xl border border-violet-100 bg-violet-50/70 px-4 py-3 text-xs leading-6 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
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
