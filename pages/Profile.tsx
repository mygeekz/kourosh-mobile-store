import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { AuthUser, NotificationMessage } from '../types';
import Notification from '../components/Notification';
import { formatIsoToShamsiDateTime } from '../utils/dateUtils';

const InfoRow: React.FC<{ icon: string; label: string; value: string; subtle?: boolean }> = ({ icon, label, value, subtle }) => (
  <div className="flex items-center justify-between gap-4 rounded-2xl border border-slate-200/80 bg-white/80 px-4 py-3 shadow-sm dark:border-slate-700/70 dark:bg-slate-900/60">
    <div className="flex items-center gap-3 min-w-0">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
        <i className={icon} />
      </span>
      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</div>
        <div className={`truncate text-sm font-semibold ${subtle ? 'text-slate-500 dark:text-slate-400' : 'text-slate-900 dark:text-slate-100'}`}>{value}</div>
      </div>
    </div>
  </div>
);

const GlassStat: React.FC<{ icon: string; label: string; value: string; tint?: string }> = ({ icon, label, value, tint }) => (
  <div className={`rounded-[26px] border px-4 py-4 shadow-sm backdrop-blur ${tint || 'border-slate-200 bg-white/75 dark:border-slate-700 dark:bg-slate-900/60'}`}>
    <div className="mb-3 flex items-center justify-between">
      <span className="text-xs font-bold text-slate-500 dark:text-slate-400">{label}</span>
      <span className="grid h-10 w-10 place-items-center rounded-2xl border border-white/60 bg-white/70 text-slate-700 shadow-sm dark:border-white/10 dark:bg-slate-800/70 dark:text-slate-100">
        <i className={icon} />
      </span>
    </div>
    <div className="text-lg font-black text-slate-900 dark:text-slate-100">{value}</div>
  </div>
);

const ActionCard: React.FC<{ to?: string; href?: string; icon: string; title: string; desc: string; muted?: boolean }> = ({ to, href, icon, title, desc, muted }) => {
  const className = `group rounded-[24px] border px-4 py-4 text-right shadow-sm transition hover:-translate-y-0.5 ${muted ? 'border-slate-200 bg-white/80 dark:border-slate-700 dark:bg-slate-900/60' : 'border-violet-200/70 bg-gradient-to-br from-violet-50 via-white to-fuchsia-50 dark:border-violet-400/20 dark:from-violet-500/10 dark:via-slate-900 dark:to-fuchsia-500/10'}`;
  const body = (
    <>
      <div className="mb-3 flex items-center justify-between gap-3">
        <span className="grid h-11 w-11 place-items-center rounded-2xl border border-white/70 bg-white/80 text-violet-700 shadow-sm dark:border-white/10 dark:bg-slate-800/80 dark:text-violet-200">
          <i className={icon} />
        </span>
        <i className="fa-solid fa-chevron-left text-xs text-slate-400 transition group-hover:-translate-x-0.5" />
      </div>
      <div className="text-sm font-extrabold text-slate-900 dark:text-slate-100">{title}</div>
      <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{desc}</div>
    </>
  );
  if (to) return <Link to={to} className={className}>{body}</Link>;
  if (href) return <a href={href} className={className}>{body}</a>;
  return <div className={className}>{body}</div>;
};

const ProfilePage: React.FC = () => {
  const { currentUser: contextUser, token } = useAuth();
  const [profileData, setProfileData] = useState<AuthUser | null>(contextUser);
  const [isLoading, setIsLoading] = useState(false);
  const [notification, setNotification] = useState<NotificationMessage | null>(null);

  useEffect(() => {
    if (!contextUser && token) {
      const fetchProfile = async () => {
        setIsLoading(true);
        setNotification(null);
        try {
          const response = await fetch('/api/me', {
            headers: { Authorization: `Bearer ${token}` }
          });
          const result = await response.json();
          if (!response.ok || !result.success) {
            throw new Error(result.message || 'خطا در دریافت اطلاعات پروفایل');
          }
          setProfileData(result.user);
        } catch (error: any) {
          setNotification({ type: 'error', text: error.message });
        } finally {
          setIsLoading(false);
        }
      };
      fetchProfile();
    } else {
      setProfileData(contextUser);
    }
  }, [contextUser, token]);

  const profile = profileData as (AuthUser & { lastLoginAt?: string | null; displayName?: string | null }) | null;

  const joinedAt = useMemo(() => profile?.dateAdded ? formatIsoToShamsiDateTime(profile.dateAdded) : 'نامشخص', [profile?.dateAdded]);
  const lastLogin = useMemo(() => profile?.lastLoginAt ? formatIsoToShamsiDateTime(profile.lastLoginAt) : 'ثبت اطلاعات نشده', [profile?.lastLoginAt]);
  const displayName = profile?.displayName || profile?.username || 'کاربر سیستم';
  const initials = (profile?.username || 'A').slice(0, 1).toUpperCase();

  if (isLoading) {
    return <div className="p-6 text-center text-gray-500"><i className="fas fa-spinner fa-spin text-2xl mr-2"></i> در حال دریافت اطلاعات اطلاعات پروفایل...</div>;
  }

  if (!profile) {
    return <div className="p-6 text-center text-red-500">اطلاعات پروفایل کاربر یافت نشد. لطفاً دوباره وارد شوید.</div>;
  }

  return (
    <div className="mx-auto max-w-7xl px-4 py-2 text-right" dir="rtl">
      <Notification message={notification} onClose={() => setNotification(null)} />

      <div className="relative overflow-hidden rounded-[34px] border border-slate-200/80 bg-gradient-to-br from-white via-violet-50/60 to-fuchsia-50/70 shadow-[0_24px_80px_-36px_rgba(76,29,149,0.35)] dark:border-slate-700/70 dark:from-slate-900 dark:via-slate-900 dark:to-violet-950/30">
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(139,92,246,0.16),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(59,130,246,0.12),transparent_24%)]" />

        <div className="relative grid gap-6 p-5 lg:grid-cols-[1.2fr,0.8fr] lg:p-7">
          <section className="space-y-5">
            <div className="flex flex-col gap-4 rounded-[30px] border border-white/70 bg-white/75 p-5 shadow-sm backdrop-blur xl:flex-row xl:items-center xl:justify-between dark:border-white/10 dark:bg-slate-900/70">
              <div className="flex items-center gap-4 min-w-0">
                <div className="relative h-24 w-24 shrink-0 overflow-hidden rounded-[28px] border border-violet-200/70 bg-gradient-to-br from-violet-500 via-fuchsia-500 to-indigo-500 p-[2px] shadow-lg dark:border-violet-400/20">
                  <div className="flex h-full w-full items-center justify-center rounded-[26px] bg-white text-3xl font-black text-violet-700 dark:bg-slate-950 dark:text-violet-200 overflow-hidden">
                    {profile.avatarUrl ? (
                      <img src={profile.avatarUrl} alt={profile.username} className="h-full w-full object-cover" />
                    ) : (
                      initials
                    )}
                  </div>
                </div>
                <div className="min-w-0">
                  <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-violet-200 bg-violet-50 px-3 py-1 text-[11px] font-bold text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
                    <i className="fa-solid fa-shield-halved" /> حساب کاربری فعال
                  </div>
                  <h1 className="truncate text-2xl font-black text-slate-900 dark:text-slate-100 xl:text-3xl">{displayName}</h1>
                  <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-500 dark:text-slate-400">
                    <span className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1 font-semibold dark:border-slate-700 dark:bg-slate-800/80">@{profile.username}</span>
                    <span className="rounded-full border border-slate-200 bg-white px-3 py-1 font-semibold dark:border-slate-700 dark:bg-slate-900">{profile.roleName}</span>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 xl:w-[280px]">
                <GlassStat icon="fa-solid fa-calendar-check" label="تاریخ عضویت" value={joinedAt} tint="border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70" />
                <GlassStat icon="fa-solid fa-clock-rotate-left" label="آخرین ورود" value={lastLogin} tint="border-slate-200 bg-white/90 dark:border-slate-700 dark:bg-slate-900/70" />
              </div>
            </div>

            <div className="grid gap-4 xl:grid-cols-2">
              <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">جزئیات حساب</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">اطلاعات اصلی حساب کاربری و هویت ورود</div>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-violet-200/70 bg-violet-50 text-violet-700 dark:border-violet-400/20 dark:bg-violet-500/10 dark:text-violet-200">
                    <i className="fa-solid fa-id-badge" />
                  </span>
                </div>
                <div className="space-y-3">
                  <InfoRow icon="fa-solid fa-user" label="نام کاربری" value={profile.username} />
                  <InfoRow icon="fa-solid fa-user-shield" label="نقش دسترسی" value={profile.roleName} />
                  <InfoRow icon="fa-solid fa-fingerprint" label="شناسه کاربر" value={profile.id.toLocaleString('fa-IR')} />
                  <InfoRow icon="fa-solid fa-clock" label="آخرین ورود" value={lastLogin} subtle={lastLogin === 'ثبت اطلاعات نشده'} />
                </div>
              </div>

              <div className="rounded-[28px] border border-white/70 bg-white/80 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
                <div className="mb-4 flex items-center justify-between">
                  <div>
                    <div className="text-base font-black text-slate-900 dark:text-slate-100">ابزارهای حساب</div>
                    <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">میانبرهای مهم برای مدیریت حساب و تنظیمات</div>
                  </div>
                  <span className="grid h-11 w-11 place-items-center rounded-2xl border border-emerald-200/70 bg-emerald-50 text-emerald-700 dark:border-emerald-400/20 dark:bg-emerald-500/10 dark:text-emerald-200">
                    <i className="fa-solid fa-star" />
                  </span>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  <ActionCard to="/settings" icon="fa-solid fa-gear" title="تنظیمات سیستم" desc="مدیریت تنظیمات عمومی، چاپ، پیامک، تلگرام و سایر بخش‌ها" muted />
                  <ActionCard icon="fa-solid fa-key" title="تغییر کلمه عبور" desc="مدیریت امن رمز عبور و کنترل دسترسی حساب کاربری." />
                  <ActionCard icon="fa-solid fa-star" title="علاقه‌مندی‌ها" desc="صفحات ستاره‌دار از هدر و جستجوی سریع همیشه در دسترس تو هستند." muted />
                  <ActionCard href="tel:09361583838" icon="fa-solid fa-headset" title="پشتیبانی" desc="در صورت نیاز به تغییرات سیستمی یا بازیابی دسترسی با پشتیبانی تماس بگیر." muted />
                </div>
              </div>
            </div>
          </section>

          <aside className="space-y-4">
            <div className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <div className="text-base font-black text-slate-900 dark:text-slate-100">وضعیت امنیت حساب</div>
                  <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">نمای سریع از وضعیت دسترسی و آماده بودن حساب</div>
                </div>
                <span className="grid h-11 w-11 place-items-center rounded-2xl border border-amber-200/70 bg-amber-50 text-amber-700 dark:border-amber-400/20 dark:bg-amber-500/10 dark:text-amber-200">
                  <i className="fa-solid fa-lock" />
                </span>
              </div>
              <div className="space-y-3">
                <GlassStat icon="fa-solid fa-circle-check" label="وضعیت حساب" value="فعال" tint="border-emerald-200/70 bg-emerald-50/70 dark:border-emerald-400/20 dark:bg-emerald-500/10" />
                <GlassStat icon="fa-solid fa-user-gear" label="سطح دسترسی" value={profile.roleName} tint="border-violet-200/70 bg-violet-50/70 dark:border-violet-400/20 dark:bg-violet-500/10" />
                <GlassStat icon="fa-solid fa-calendar-plus" label="عضویت" value={joinedAt} tint="border-sky-200/70 bg-sky-50/70 dark:border-sky-400/20 dark:bg-sky-500/10" />
              </div>
            </div>

            <div className="rounded-[30px] border border-white/70 bg-white/85 p-5 shadow-sm backdrop-blur dark:border-white/10 dark:bg-slate-900/70">
              <div className="mb-3 text-base font-black text-slate-900 dark:text-slate-100">یادداشت مدیریتی</div>
              <div className="rounded-[24px] border border-dashed border-slate-300 bg-slate-50/80 px-4 py-4 text-sm leading-7 text-slate-600 dark:border-slate-700 dark:bg-slate-900/60 dark:text-slate-300">
                برای تغییر سطح دسترسی، حذف مورد کاربر، تغییر اطلاعات ورود پیشرفته یا اتصال آواتار اختصاصی، بهتر است از بخش تنظیمات یا مدیر سیستم استفاده شود تا ساختار دسترسی‌ها به‌هم نخورد.
              </div>
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
};

export default ProfilePage;
