import React from 'react';
import { Link } from 'react-router-dom';
import type { PartnerShareStatus, TabKey } from './settingsHelpers';

type SettingsSidebarProps = {
  tab: TabKey;
  setTab: (tab: TabKey) => void;
  isAdmin: boolean;
  isSettingsTabRuntimeEnabled: (tab: TabKey) => boolean;
  canManageStoreOwnership: boolean;
  partnerShareChipClass: string;
  partnerShareChipIcon: string;
  partnerShareStatus: PartnerShareStatus;
};

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({
  tab,
  setTab,
  isAdmin,
  isSettingsTabRuntimeEnabled,
  canManageStoreOwnership,
  partnerShareChipClass,
  partnerShareChipIcon,
  partnerShareStatus,
}) => (
<>
  {/* Sidebar */}
  <aside className="settings-sidebar hidden lg:block h-fit sticky top-[84px] print:hidden" data-ui-settings-sidebar="true">
    <div className="px-3 py-2">
      <div className="text-xs font-semibold text-gray-500 dark:text-gray-400">پیکربندی</div>
    </div>

    <div className="space-y-3">
      <div>
        <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">عمومی</div>
        <div className="space-y-1">
          {([
            { k: 'account', icon: 'fa-solid fa-user-shield', text: 'حساب کاربری', sub: 'پروفایل و امنیت' },
            { k: 'business', icon: 'fa-solid fa-store', text: 'اطلاعات کسب‌وکار', sub: 'نام فروشگاه، لوگو، تماس…' },
            { k: 'style', icon: 'fa-solid fa-wand-magic-sparkles', text: 'استایل', sub: 'رنگ‌ها و برندینگ' },
            { k: 'modules', icon: 'fa-solid fa-toggle-on', text: 'ماژول‌های تجاری', sub: 'فعال/غیرفعال واقعی فیچرها' },
            { k: 'local', icon: 'fa-solid fa-network-wired', text: 'دامنه محلی', sub: 'hostname، suffix، certificate' },
            { k: 'users', icon: 'fa-solid fa-users', text: 'کاربران و نقش‌ها', sub: 'مدیریت دسترسی‌ها' },
          ] as { k: TabKey; icon: string; text: string; sub: string }[]).filter(({ k }) => (isAdmin || k === 'account') && isSettingsTabRuntimeEnabled(k)).map(({ k, icon, text, sub }) => (
            <button
              key={k}
              type="button"
              data-active={tab === k ? 'true' : 'false'}
              onClick={() => setTab(k)}
              className={`settings-tab-item group w-full rounded-xl px-3 py-2 text-right transition border ${
                tab === k ? 'bg-primary/10 border-primary/30 text-text' : 'border-transparent hover:border-primary/10 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <div className="settings-tab-row flex w-full items-start justify-start gap-3 text-right">
                <div className={`settings-tab-icon h-9 w-9 rounded-xl flex shrink-0 items-center justify-center transition-colors ${
                  tab === k ? 'bg-primary text-white' : 'bg-primary/10 text-primary/75 group-hover:bg-primary/15 group-hover:text-primary'
                }`}>
                  <i className={`${icon} transition-colors`} />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="text-sm font-semibold">{text}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
                </div>
              </div>
            </button>
          ))}
          {canManageStoreOwnership && (
            <Link
              to="/settings/store-ownership"
              className="settings-tab-item group flex w-full rounded-xl border border-transparent px-3 py-2 text-right transition"
            >
              <div className="settings-tab-row flex w-full items-start justify-start gap-3 text-right">
                <div className="settings-tab-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-xl transition-colors">
                  <i className="fa-solid fa-handshake" />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="text-sm font-semibold">ساختار شرکا</div>
                    <span className={`inline-flex items-center gap-1 rounded-full border px-2.5 py-1 text-[10px] font-black ${partnerShareChipClass}`} title={partnerShareStatus.hint}>
                      <i className={`fa-solid ${partnerShareChipIcon}`} />
                      {partnerShareStatus.label}
                    </span>
                  </div>
                  <div className="mt-0.5 text-xs text-gray-500 dark:text-gray-400">سهم سود، مالکیت و اتصال به همکاران</div>
                </div>
              </div>
            </Link>
          )}
        </div>
      </div>

      {isAdmin && (
      <div>
        <div className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400">هوش مصنوعی</div>
        <div className="space-y-1">
          {([
            { k: 'pricing', icon: 'fa-solid fa-tags', text: 'هوش قیمت‌گذاری', sub: 'سیاست، یادگیری و لاگ تصمیمات' },
            { k: 'smart', icon: 'fa-solid fa-microchip', text: 'هوشمندسازی', sub: 'سوییچ واقعی AI و آموزش' },
          ] as { k: TabKey; icon: string; text: string; sub: string }[]).filter(({ k }) => isSettingsTabRuntimeEnabled(k)).map(({ k, icon, text, sub }) => (
            <button
              key={k}
              type="button"
              data-active={tab === k ? 'true' : 'false'}
              onClick={() => setTab(k)}
              className={`settings-tab-item group w-full rounded-xl px-3 py-2 text-right transition border ${
                tab === k ? 'bg-primary/10 border-primary/30 text-text' : 'border-transparent hover:border-primary/10 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <div className="settings-tab-row flex w-full items-start justify-start gap-3 text-right">
                <div className={`settings-tab-icon h-9 w-9 rounded-xl flex shrink-0 items-center justify-center transition-colors ${
                  tab === k ? 'bg-primary text-white' : 'bg-primary/10 text-primary/75 group-hover:bg-primary/15 group-hover:text-primary'
                }`}>
                  <i className={`${icon} transition-colors`} />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="text-sm font-semibold">{text}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      )}

      {isAdmin && (
      <div>
        <div className="px-3 py-2 text-right text-[11px] font-semibold text-gray-500 dark:text-gray-400">پیام‌رسانی</div>
        <div className="space-y-1">
          {([
            { k: 'sms', icon: 'fa-solid fa-message', text: 'پیامک (Pattern)', sub: 'ملی‌پیامک و الگوها' },
            { k: 'telegram', icon: 'fa-brands fa-telegram', text: 'تلگرام', sub: 'قالب‌ها و ارسال' },
            { k: 'reminders', icon: 'fa-solid fa-bell', text: 'قوانین اعلان', sub: 'Rule Builder اقساط/CRM' },
          ] as { k: TabKey; icon: string; text: string; sub: string }[]).filter(({ k }) => isSettingsTabRuntimeEnabled(k)).map(({ k, icon, text, sub }) => (
            <button
              key={k}
              type="button"
              data-active={tab === k ? 'true' : 'false'}
              onClick={() => setTab(k)}
              className={`settings-tab-item group w-full rounded-xl px-3 py-2 text-right transition border ${
                tab === k ? 'bg-primary/10 border-primary/30 text-text' : 'border-transparent hover:border-primary/10 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <div className="settings-tab-row flex w-full items-start justify-start gap-3 text-right">
                <div className={`settings-tab-icon h-9 w-9 rounded-xl flex shrink-0 items-center justify-center transition-colors ${
                  tab === k ? 'bg-primary text-white' : 'bg-primary/10 text-primary/75 group-hover:bg-primary/15 group-hover:text-primary'
                }`}>
                  <i className={`${icon} transition-colors`} />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="text-sm font-semibold">{text}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      )}

      {isAdmin && (
      <div>
        <div className="px-3 py-2 text-[11px] font-semibold text-gray-500 dark:text-gray-400">سیستم</div>
        <div className="space-y-1">
          {([
            { k: 'data', icon: 'fa-solid fa-database', text: 'مدیریت داده‌ها', sub: 'Backup/Restore و خروجی' },
          ] as { k: TabKey; icon: string; text: string; sub: string }[]).filter(({ k }) => isSettingsTabRuntimeEnabled(k)).map(({ k, icon, text, sub }) => (
            <button
              key={k}
              type="button"
              data-active={tab === k ? 'true' : 'false'}
              onClick={() => setTab(k)}
              className={`settings-tab-item group w-full rounded-xl px-3 py-2 text-right transition border ${
                tab === k ? 'bg-primary/10 border-primary/30 text-text' : 'border-transparent hover:border-primary/10 hover:bg-primary/5 hover:text-primary'
              }`}
            >
              <div className="settings-tab-row flex w-full items-start justify-start gap-3 text-right">
                <div className={`settings-tab-icon h-9 w-9 rounded-xl flex shrink-0 items-center justify-center transition-colors ${
                  tab === k ? 'bg-primary text-white' : 'bg-primary/10 text-primary/75 group-hover:bg-primary/15 group-hover:text-primary'
                }`}>
                  <i className={`${icon} transition-colors`} />
                </div>
                <div className="min-w-0 flex-1 text-right">
                  <div className="text-sm font-semibold">{text}</div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">{sub}</div>
                </div>
              </div>
            </button>
          ))}
        </div>
      </div>
      )}
    </div>


    {isAdmin && (
    <div className="mt-4 pt-3 border-t border-primary/10 px-3">
      <Link
        to="/audit-log"
        className="flex items-center justify-between px-3 py-2 rounded-xl border border-primary/10 hover:bg-primary/5 transition text-sm"
      >
        <span className="flex items-center gap-2">
          <i className="fa-solid fa-clipboard-list text-primary" />
          گزارش فعالیت‌ها
        </span>
        <i className="fa-solid fa-chevron-left text-xs opacity-60" />
      </Link>
    </div>
    )}
  </aside>
</>
);

export default SettingsSidebar;
