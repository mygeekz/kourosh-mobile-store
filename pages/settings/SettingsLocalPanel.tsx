import React from 'react';
import Button from '../../components/Button';
import type { SettingsLocalPanelProps } from './settingsPanelTypes';


const SettingsLocalPanel = ({
  tab,
  businessInfo,
  labelClass,
  inputClass,
  localHostnameValue,
  localSuffixValue,
  localDomainValue,
  localHostsLineValue,
  localCertMessage,
  localCertError,
  isGeneratingLocalCert,
  infoChanged,
  isSaving,
  handleGenerateLocalCertificate,
  handleDownloadHostsScript,
  handleBusinessInfoChange,
  handleBusinessInfoSubmit,
}: SettingsLocalPanelProps) => {
  if (tab !== 'local') return null;

  return (

            <div className="settings-panel-root settings-local-panel space-y-6" data-ui-settings-panel="local">
              <div className="settings-hero-card rounded-[28px] border border-sky-200/70 bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_32%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))] p-5 shadow-[0_24px_70px_-36px_rgba(14,165,233,0.22)] dark:border-sky-900/30 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.92),rgba(15,23,42,0.9))]">
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-white/80 px-3 py-1 text-xs font-black text-sky-700 shadow-sm dark:border-sky-900/40 dark:bg-slate-900/70 dark:text-sky-200">
                      <i className="fa-solid fa-network-wired" />
                      Local Domain · TLS Certificate
                    </div>
                    <div className="mt-3 text-2xl font-black text-slate-900 dark:text-white">دامنه محلی ثابت برای شبکه داخلی</div>
                    <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      به‌جای IP متغیر، یک hostname ثابت می‌سازیم تا کاربر فقط آدرس امن را وارد کند؛ مثلاً <span dir="ltr">kourosh.localhost</span> یا <span dir="ltr">kourosh.internal</span>. اگر suffix را روی <span dir="ltr">localhost</span> بگذارید، نام به‌صورت خودکار روی همان سیستم resolve می‌شود و دیگر نیازی به hosts نیست.
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3 min-w-[260px]">
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">دامنه فعلی</div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white truncate">{localDomainValue || '—'}</div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">وضعیت TLS</div>
                      <div className={`mt-1 text-sm font-black ${localDomainValue ? 'text-emerald-700 dark:text-emerald-300' : 'text-amber-700 dark:text-amber-300'}`}>
                        {localDomainValue ? 'آماده ساخت' : 'نیاز به hostname'}
                      </div>
                    </div>
                  </div>
                </div>
                <div className="telegram-monitor-actions">
                  <Button type="button" onClick={handleGenerateLocalCertificate} disabled={isGeneratingLocalCert || !localHostnameValue} loading={isGeneratingLocalCert} loadingText="در حال ساخت گواهی…" variant="secondary" size="sm" leftIcon={<i className="fa-solid fa-certificate" />}>
                    ساخت certificate محلی
                  </Button>
                  <Button type="button" onClick={handleDownloadHostsScript} disabled={!localHostnameValue} variant="success" size="sm" leftIcon={<i className="fa-solid fa-file-arrow-down" />}>
                    دانلود فایل hosts
                  </Button>
                  <Button type="button" onClick={() => localHostsLineValue && navigator.clipboard?.writeText(localHostsLineValue)} disabled={!localHostsLineValue} variant="ghost" size="sm" leftIcon={<i className="fa-solid fa-copy" />}>
                    کپی خط hosts
                  </Button>
                </div>
                {(localCertMessage || localCertError) && (
                  <div className={`mt-4 rounded-2xl border px-4 py-3 text-sm ${localCertError ? 'border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/20 dark:text-rose-200' : 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200'}`}>
                    {localCertError || localCertMessage}
                  </div>
                )}
              </div>

              <section className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:p-6">
                <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
                  <div className="text-right">
                    <div className="inline-flex items-center gap-2 rounded-full border border-sky-200 bg-sky-50 px-3 py-1 text-[11px] font-black text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/20 dark:text-sky-300">
                      <i className="fa-solid fa-network-wired" />
                      Local Domain · TLS Certificate
                    </div>
                    <h3 className="mt-3 text-lg font-black text-slate-950 dark:text-white">تنظیم دامنه محلی</h3>
                    <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">برای شبکه داخلی، فقط نام میزبان و suffix را مشخص کن تا آدرس محلی و hosts پیشنهادی ساخته شوند.</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-solid fa-shield-halved" />
                      فقط آدرس‌های داخلی
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-solid fa-terminal" />
                      hosts / certificate
                    </span>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-network-wired ml-2 text-sky-500" />Hostname محلی</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-server" /></span>
                      <input type="text" id="local_hostname" name="local_hostname" value={businessInfo.local_hostname || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token pr-12`} dir="ltr" preview="kourosh" />
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">فقط حروف انگلیسی، عدد و خط تیره مجاز است.</p>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-globe ml-2 text-sky-500" />Suffix محلی</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-code-branch" /></span>
                      <select id="local_domain_suffix" name="local_domain_suffix" value={localSuffixValue} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token pr-12`} dir="ltr">
                        <option value="localhost">localhost</option>
                        <option value="home.arpa">home.arpa</option>
                        <option value="internal">internal</option>
                        <option value="lan">lan</option>
                      </select>
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">برای جلوگیری از تداخل با دامنه‌های اینترنتی، فقط گزینه‌های داخلی مجاز هستند.</p>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-link ml-2 text-sky-500" />آدرس کامل</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-up-right-from-square" /></span>
                      <input type="text" readOnly value={localDomainValue ? `https://${localDomainValue}` : ''} className={`${inputClass} bg-gray-50 pr-12 dark:bg-gray-900`} dir="ltr" preview="https://kourosh.localhost" />
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-file-lines ml-2 text-sky-500" />خط hosts پیشنهادی</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-code" /></span>
                      <input type="text" readOnly value={localHostsLineValue} className={`${inputClass} bg-gray-50 pr-12 dark:bg-gray-900`} dir="ltr" preview="127.0.0.1 kourosh.localhost" />
                    </div>
                  </div>

                  <div className="rounded-[22px] border border-slate-200 bg-slate-50/70 p-4 md:col-span-2 dark:border-slate-800 dark:bg-slate-900/40">
                    <div className={labelClass}><i className="fa-solid fa-sitemap ml-2 text-sky-500" />آدرس پایه محلی</div>
                    <div className="relative">
                      <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-globe" /></span>
                      <input type="url" id="local_base_url" name="local_base_url" value={businessInfo.local_base_url || ''} onChange={handleBusinessInfoChange} className={`${inputClass} ux-ltr-token pr-12`} dir="ltr" preview="https://kourosh.localhost" />
                    </div>
                    <p className="mt-2 text-xs leading-6 text-slate-500 dark:text-slate-400">این مقدار برای لینک‌های داخلی و QR محلی استفاده می‌شود. اگر خالی باشد از hostname و suffix ساخته می‌شود.</p>
                    <p className="mt-1 text-xs leading-6 text-amber-600 dark:text-amber-300">اگر suffix روی localhost باشد، نیازی به hosts ندارید؛ برای home.arpa/internal/lan فایل bat را با دسترسی Administrator اجرا کنید.</p>
                  </div>
                </div>
              </section>

              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={handleBusinessInfoSubmit}
                  disabled={!infoChanged || isSaving}
                  className="inline-flex items-center gap-2 rounded-2xl bg-primary px-6 py-3 font-semibold text-white shadow-lg transition-colors hover:brightness-110     disabled:opacity-60"
                >
                  <i className="fa-solid fa-floppy-disk" />
                  {isSaving ? 'در حال ذخیره تغییرات...' : 'ذخیره تغییرات تنظیمات محلی'}
                </button>
              </div>

              <div className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4 text-sm leading-7 text-slate-700 dark:border-slate-800 dark:bg-slate-900/50 dark:text-slate-200">
                <div className="flex items-center gap-2 font-bold text-slate-900 dark:text-white">
                  <i className="fa-solid fa-lightbulb text-amber-500" />
                  الگوی پیشنهادی
                </div>
                <div className="mt-3 grid gap-2 md:grid-cols-3">
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-server ml-2 text-sky-500" />Hostname</div>
                    <div className="mt-1 font-black" dir="ltr">kourosh</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-globe ml-2 text-sky-500" />Suffix</div>
                    <div className="mt-1 font-black" dir="ltr">localhost</div>
                  </div>
                  <div className="rounded-2xl border border-slate-200 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                    <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400"><i className="fa-solid fa-link ml-2 text-sky-500" />نتیجه</div>
                    <div className="mt-1 font-black" dir="ltr">https://kourosh.localhost</div>
                  </div>
                </div>
              </div>
            </div>
          
  );
};

export default SettingsLocalPanel;
