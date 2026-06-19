import React from 'react';
import type { SettingsSmsPanelProps, SmsPatternAccent, SmsPatternKey } from './settingsPanelTypes';
import Button from '../../components/Button';
import FormSection from '../../components/FormSection';
import SmsLogsPanel from '../../components/SmsLogsPanel';
import SmsHealthCheckPanel from '../../components/SmsHealthCheckPanel';


const SettingsSmsPanel: React.FC<SettingsSmsPanelProps> = ({
  tab,
  businessInfo,
  inputClass,
  labelClass,
  fieldsetClass,
  fieldsetLegendClass,
  smsCoreReady,
  smsProviderMeta,
  smsConfiguredCount,
  smsTotalCount,
  smsAutomationCount,
  meliPatternDefs,
  handleBusinessInfoChange,
  handleBusinessInfoSubmit,
  scrollToSection,
  openSmsPatternPreview,
  openSmsPatternCheck,
  setSmsBulkDefaults,
  setSmsBulkOpen,
}) => {
  if (tab !== 'sms') return null;

  return (
            <div className="settings-panel-root settings-sms-panel settings-ops-panel space-y-6" data-ui-settings-panel="sms" data-ui-ops-panel="sms">
              <div className="settings-hero-card ops-command-center rounded-[30px] border border-amber-200/70 bg-[radial-gradient(circle_at_top_left,_rgba(245,158,11,0.14),_transparent_34%),linear-gradient(135deg,rgba(255,255,255,0.98),rgba(255,251,235,0.96))] p-5 shadow-[0_28px_80px_-44px_rgba(245,158,11,0.24)] dark:border-amber-900/30 dark:bg-[linear-gradient(135deg,rgba(2,6,23,0.95),rgba(15,23,42,0.92))]">
                <div className="flex flex-col gap-4 border-b border-amber-200/60 pb-4 dark:border-amber-900/25 xl:flex-row xl:items-start xl:justify-between">
                  <div className="max-w-3xl">
                    <div className="inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/85 px-3 py-1 text-xs font-black text-amber-700 shadow-sm dark:border-amber-900/40 dark:bg-slate-900/70 dark:text-amber-200">
                      <i className="fa-solid fa-message" />
                      مرکز مدیریت پیامک
                    </div>
                    <div className="mt-3 flex flex-wrap items-center gap-3">
                      <h2 className="text-2xl font-black text-slate-900 dark:text-white">تنظیمات و عملیات پیامک</h2>
                      <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${smsCoreReady ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                        <i className={`fa-solid ${smsCoreReady ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                        {smsCoreReady ? 'آماده' : 'نیاز به تکمیل'}
                      </span>
                    </div>
                    <div className="mt-2 text-sm leading-7 text-slate-600 dark:text-slate-300">
                      سرویس‌دهنده، اطلاعات اتصال، قالب‌های پترنی، سلامت پنل و لاگ‌های ارسال را در یک مسیر منظم و یکدست مدیریت کن.
                    </div>
                  </div>
                  <div className="grid min-w-[260px] grid-cols-2 gap-3 md:grid-cols-4 xl:min-w-[420px]">
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">سرویس فعال</div>
                      <div className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-white">
                        <i className={`fa-solid ${smsProviderMeta.icon} text-amber-500`} />
                        {smsProviderMeta.title}
                      </div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">پوشش قالب‌ها</div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{smsConfiguredCount.toLocaleString('fa-IR')}/{smsTotalCount.toLocaleString('fa-IR')}</div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">خودکارسازی</div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">{smsAutomationCount.toLocaleString('fa-IR')}</div>
                    </div>
                    <div className="rounded-2xl border border-white/80 bg-white/90 px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-950/70">
                      <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">الویت بعدی</div>
                      <div className="mt-1 text-sm font-black text-slate-900 dark:text-white">Health Check</div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap items-center gap-2">
                  <Button type="button" onClick={() => scrollToSection('sms-panel-settings-section')} variant="secondary" size="xs" className="rounded-full" leftIcon={<i className="fa-solid fa-sliders" />}>
                    تنظیمات پنل
                  </Button>
                  <Button type="button" onClick={() => scrollToSection('sms-health-section')} variant="success" size="xs" className="rounded-full" leftIcon={<i className="fa-solid fa-shield-heart" />}>
                    سلامت پیامک
                  </Button>
                  <Button type="button" onClick={() => scrollToSection('sms-logs-section')} variant="ghost" size="xs" className="rounded-full" leftIcon={<i className="fa-solid fa-clock-rotate-left" />}>
                    لاگ‌های ارسال
                  </Button>
                  <Button type="button" onClick={() => setSmsBulkOpen(true)} variant="secondary" size="xs" className="rounded-full" leftIcon={<i className="fa-solid fa-vials" />}>
                    بررسی گروهی
                  </Button>
                </div>
              </div>

              <fieldset id="sms-panel-settings-section" className={fieldsetClass}>
                <legend className={fieldsetLegendClass}>تنظیمات پنل پیامک</legend>

                <div className="mt-4 grid grid-cols-1 gap-4 xl:grid-cols-[minmax(0,1.05fr)_minmax(320px,0.95fr)]">
                  <div className="rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900/90">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200">
                        <i className="fa-solid fa-sim-card" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <h3 className="text-sm font-black text-slate-900 dark:text-slate-50">سرویس‌دهنده پیامک</h3>
                          <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${smsCoreReady ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200' : 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200'}`}>
                            <i className={`fa-solid ${smsCoreReady ? 'fa-circle-check' : 'fa-circle-xmark'}`} />
                            {smsCoreReady ? 'آماده' : 'نیاز به تکمیل'}
                          </span>
                        </div>
                        <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
                          پنل اصلی ارسال را انتخاب کن؛ سپس کلیدها، قالب‌ها و ارسال‌های خودکار را از همین بخش مدیریت کن.
                        </p>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px] md:items-end">
                      <div>
                        <label className={labelClass}>سرویس‌دهنده فعال</label>
                        <select
                          name="sms_provider"
                          value={businessInfo.sms_provider || 'meli_payamak'}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                        >
                          <option value="meli_payamak">ملی پیامک</option>
                          <option value="kavenegar">کاوه‌نگار</option>
                          <option value="sms_ir">SMS.ir</option>
                          <option value="ippanel">IPPANEL</option>
                        </select>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-slate-50/80 px-4 py-3 dark:border-slate-800 dark:bg-slate-950/60">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">سرویس انتخاب‌شده</div>
                        <div className="mt-1 flex items-center gap-2 text-sm font-black text-slate-900 dark:text-slate-50">
                          <i className={`fa-solid ${smsProviderMeta.icon} text-amber-500`} />
                          {smsProviderMeta.title}
                        </div>
                      </div>
                    </div>
                  </div>

                  <div className="rounded-[24px] border border-slate-200/80 bg-slate-50/70 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.12)] dark:border-slate-800 dark:bg-slate-950/55">
                    <div className="text-xs font-black tracking-[0.14em] text-slate-500 dark:text-slate-400">OVERVIEW</div>
                    <div className="mt-2 text-sm font-black text-slate-900 dark:text-slate-50">نمای کلی پنل پیامک</div>
                    <div className="mt-3 grid grid-cols-2 gap-3">
                      <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">پوشش قالب‌ها</div>
                        <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">{smsConfiguredCount.toLocaleString('fa-IR')}/{smsTotalCount.toLocaleString('fa-IR')}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">خودکارسازی</div>
                        <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">{smsAutomationCount.toLocaleString('fa-IR')}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">وضعیت پایه</div>
                        <div className={`mt-1 text-base font-black ${smsCoreReady ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>{smsCoreReady ? 'آماده' : 'نیاز به تکمیل'}</div>
                      </div>
                      <div className="rounded-2xl border border-slate-200/80 bg-white px-4 py-3 dark:border-slate-800 dark:bg-slate-900/80">
                        <div className="text-[11px] font-bold text-slate-500 dark:text-slate-400">مسیر بعدی</div>
                        <div className="mt-1 text-base font-black text-slate-900 dark:text-slate-50">Health Check</div>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="mt-4 rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_44px_-34px_rgba(15,23,42,0.16)] dark:border-slate-800 dark:bg-slate-900/90" data-settings-mode="advanced">
                  <div className="flex flex-col gap-3 border-b border-slate-200/80 pb-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
                    <div className="flex items-start gap-3">
                      <span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-100">
                        <i className="fa-solid fa-robot" />
                      </span>
                      <div>
                        <div className="text-sm font-black text-slate-900 dark:text-slate-50">ارسال خودکار یادآوری‌ها</div>
                        <div className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">هر رویداد را می‌توانی خاموش، فقط پیامک، فقط تلگرام یا هر دو تنظیم کنی. پردازش با صف و تلاش مجدد انجام می‌شود.</div>
                      </div>
                    </div>
                    <span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-regular fa-clock" />
                      اجرای روزانه ساعت ۹
                    </span>
                  </div>

                  <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-3">
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <label className={labelClass}>یادآوری اقساط (۷ / ۳ / امروز)</label>
                      <select name="auto_send_installment_due" value={businessInfo.auto_send_installment_due || 'off'} onChange={handleBusinessInfoChange} className={inputClass}>
                        <option value="off">خاموش</option>
                        <option value="sms">فقط پیامک</option>
                        <option value="telegram">فقط تلگرام</option>
                        <option value="both">هر دو</option>
                      </select>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <label className={labelClass}>یادآوری چک‌ها (۷ / ۳ / امروز)</label>
                      <select name="auto_send_check_due" value={businessInfo.auto_send_check_due || 'off'} onChange={handleBusinessInfoChange} className={inputClass}>
                        <option value="off">خاموش</option>
                        <option value="sms">فقط پیامک</option>
                        <option value="telegram">فقط تلگرام</option>
                        <option value="both">هر دو</option>
                      </select>
                    </div>
                    <div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-3 dark:border-slate-800 dark:bg-slate-950/50">
                      <label className={labelClass}>تعمیرات آماده تحویل</label>
                      <select name="auto_send_repair_ready" value={businessInfo.auto_send_repair_ready || 'off'} onChange={handleBusinessInfoChange} className={inputClass}>
                        <option value="off">خاموش</option>
                        <option value="sms">فقط پیامک</option>
                        <option value="telegram">فقط تلگرام</option>
                        <option value="both">هر دو</option>
                      </select>
                    </div>
                  </div>

                  <div className="mt-3 rounded-2xl border border-slate-200/80 bg-slate-50/70 px-4 py-3 text-xs leading-6 text-slate-500 dark:border-slate-800 dark:bg-slate-950/50 dark:text-slate-400">
                    نکته: اگر در یک روز یک رویداد برای یک مشتری چند بار تشخیص داده شود، سیستم به‌صورت خودکار تکراری‌ها را حذف می‌کند.
                  </div>
                </div>
{/* Fields for Meli Payamak */}
                {(!businessInfo.sms_provider || businessInfo.sms_provider === 'meli_payamak') && (
                  <div data-settings-mode="advanced">

						{/* --- MeliPayamak: Pattern IDs (BodyId) دسته‌بندی‌شده + ارسال بررسی و ادامه */}
						{(() => {
							const PatternRow = ({
								keyName,
								label,
								tokens,
								previewTemplate,
								description,
								accent,
								iconClass,
        reactKey,
							}: {
								keyName: SmsPatternKey;
								label: string;
								tokens: string[];
								previewTemplate: string;
								description?: string;
								accent: SmsPatternAccent;
								iconClass: string;
        reactKey: string;
							}) => {
								const val = String(businessInfo[keyName] || '');
								const active = !!val.trim();
								const statusClass = active
									? 'border border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
									: 'border border-rose-200 bg-rose-50 text-rose-700 dark:border-rose-900/40 dark:bg-rose-950/30 dark:text-rose-200';
								const iconToneClass = accent === 'emerald'
									? 'border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/30 dark:text-emerald-200'
									: accent === 'blue'
										? 'border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200'
										: accent === 'amber'
											? 'border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-900/40 dark:bg-amber-950/30 dark:text-amber-200'
											: 'border-slate-200 bg-slate-50 text-slate-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200';
								return (
									<div key={reactKey} className="flex h-full flex-col rounded-[24px] border border-slate-200/80 bg-white/95 p-4 shadow-[0_18px_40px_-34px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/90">
										<div className="flex min-h-[76px] items-start justify-between gap-3">
											<div className="min-w-0 flex items-start gap-3">
												<span className={`inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border ${iconToneClass}`}>
													<i className={iconClass} />
												</span>
												<div className="min-w-0">
													<h4 className="text-sm font-black leading-6 text-slate-900 dark:text-slate-50">{label}</h4>
													{description ? <p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">{description}</p> : null}
												</div>
											</div>
											<span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-bold ${statusClass}`}>
												<i className={active ? 'fa-solid fa-circle-check' : 'fa-solid fa-circle-xmark'} />
												{active ? 'آماده' : 'تنظیم نشده'}
											</span>
										</div>

										<div className="mt-4 flex-1">
											<label htmlFor={String(keyName)} className="mb-2 block text-xs font-bold text-slate-600 dark:text-slate-300">شناسه پترن (BodyId)</label>
											<input
												type="text"
												id={String(keyName)}
												name={String(keyName)}
												value={val}
												onChange={handleBusinessInfoChange}
												className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 text-sm font-bold text-slate-900 outline-none transition placeholder:text-slate-400    dark:border-slate-700 dark:bg-slate-900 dark:text-slate-50  "
												placeholder="مثلاً 341283"
												dir="ltr"
												inputMode="numeric"
											/>
											<div className="mt-2 space-y-1 text-xs leading-6 text-slate-500 dark:text-slate-400">
												<div>مثال کد: <span dir="ltr" className="font-bold">341283</span></div>
												<div>متغیرهای مورد استفاده: {tokens.length ? tokens.join('، ') : 'ندارد'}</div>
											</div>
										</div>

										<div className="mt-4 flex flex-wrap items-center gap-2 border-t border-slate-200/80 pt-4 dark:border-slate-800">
											<button
												type="button"
												onClick={() => openSmsPatternPreview(`پیش‌نمایش: ${label}`, previewTemplate, tokens)}
												className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-slate-600 sm:flex-none"
											>
												<i className="fa-regular fa-eye" />
												پیش‌نمایش
											</button>
											<button
												type="button"
												disabled={!val}
												onClick={() => openSmsPatternCheck(`ارسال تست پیامک: ${label}`, val, tokens)}
												className="inline-flex min-h-[38px] flex-1 items-center justify-center gap-2 rounded-xl bg-slate-900 px-3 py-2 text-xs font-bold text-white transition hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-slate-100 dark:text-slate-900 dark:hover:bg-white sm:flex-none"
											>
												<i className="fa-solid fa-paper-plane" />
												ارسال تست
											</button>
										</div>
									</div>
								);
								};

								// استفاده از پترن‌های مرکزی
							const meliPatterns = meliPatternDefs;

							return (
								<div className="mt-4 space-y-6">
									<div className="rounded-[28px] border border-slate-200/80 bg-white/95 p-5 shadow-[0_22px_52px_-40px_rgba(15,23,42,0.18)] dark:border-slate-800 dark:bg-slate-900/90">
										<div className="flex flex-col gap-4 border-b border-slate-200/80 pb-4 dark:border-slate-800 lg:flex-row lg:items-start lg:justify-between">
											<div className="flex items-start gap-3">
												<span className="inline-flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-sky-200 bg-sky-50 text-sky-700 dark:border-sky-900/40 dark:bg-sky-950/30 dark:text-sky-200">
													<i className="fa-solid fa-key" />
												</span>
												<div>
													<h3 className="text-sm font-black text-slate-900 dark:text-slate-50">اتصال پنل ملی‌پیامک</h3>
													<p className="mt-1 text-xs leading-6 text-slate-500 dark:text-slate-400">نام کاربری و رمز عبور پنل را وارد کن تا بررسی سلامت، ارسال تست و قالب‌های پترنی فعال شوند.</p>
												</div>
											</div>
											<div className="flex flex-wrap gap-2 lg:justify-end">
												<span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-link" /> SendByBaseNumber2</span>
												<span className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-slate-50 px-2.5 py-1 text-[11px] font-bold text-slate-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"><i className="fa-solid fa-brackets-curly" /> BodyId برای هر رویداد</span>
											</div>
										</div>

										<div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
											<div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
												<label className={labelClass}>نام کاربری ملی‌پیامک</label>
												<input type="text" id="meli_payamak_username" name="meli_payamak_username" value={businessInfo.meli_payamak_username || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" />
											</div>
											<div className="rounded-2xl border border-slate-200/80 bg-slate-50/70 p-4 dark:border-slate-800 dark:bg-slate-950/50">
												<label className={labelClass}>کلمه عبور ملی‌پیامک</label>
												<input type="password" id="meli_payamak_password" name="meli_payamak_password" value={businessInfo.meli_payamak_password || ''} onChange={handleBusinessInfoChange} className={inputClass} dir="ltr" />
											</div>
										</div>
									</div>
                <div id="sms-health-section">
                  <SmsHealthCheckPanel
                    patterns={meliPatterns}
                    onOpenBulkCheck={(keys) => {
                      setSmsBulkDefaults(keys);
                      setSmsBulkOpen(true);
                    }}
                  />
                </div>

									<FormSection title="اقساط" description="قالب‌های پیامکی مرتبط با سررسید، دریافت و تسویه اقساط" iconClass="fa-solid fa-money-check-dollar" iconColor="#10b981" badgeLabel={`${meliPatterns.filter((p) => p.category === 'اقساط').length.toLocaleString('fa-IR')} قالب`}>
										<div id="tg-anchor-main-route" className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
											{meliPatterns.filter((p) => p.category === 'اقساط').map((p) => PatternRow({
										reactKey: String(p.key),
										keyName: p.key as SmsPatternKey,
												label: p.label,
												tokens: p.tokens,
												previewTemplate: p.previewTemplate || '',
												accent: (p.accent || 'gray') as SmsPatternAccent,
												iconClass: p.iconClass || 'fa-solid fa-message',
											}))}
										</div>
									</FormSection>

									<FormSection title="تعمیرات" description="قالب‌های چرخه تعمیر از پذیرش تا آماده تحویل" iconClass="fa-solid fa-screwdriver-wrench" iconColor="#3b82f6" badgeLabel={`${meliPatterns.filter((p) => p.category === 'تعمیرات').length.toLocaleString('fa-IR')} قالب`}>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
											{meliPatterns.filter((p) => p.category === 'تعمیرات').map((p) => PatternRow({
										reactKey: String(p.key),
										keyName: p.key as SmsPatternKey,
												label: p.label,
												tokens: p.tokens,
												previewTemplate: p.previewTemplate || '',
												accent: (p.accent || 'gray') as SmsPatternAccent,
												iconClass: p.iconClass || 'fa-solid fa-message',
											}))}
										</div>
									</FormSection>

									<FormSection title="چک‌ها" description="قالب‌های اطلاع‌رسانی مربوط به وضعیت و سررسید چک‌ها" iconClass="fa-solid fa-file-invoice-dollar" iconColor="#f59e0b" badgeLabel={`${meliPatterns.filter((p) => p.category === 'چک‌ها').length.toLocaleString('fa-IR')} قالب`}>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
											{meliPatterns.filter((p) => p.category === 'چک‌ها').map((p) => PatternRow({
										reactKey: String(p.key),
										keyName: p.key as SmsPatternKey,
												label: p.label,
												tokens: p.tokens,
												previewTemplate: p.previewTemplate || '',
												accent: (p.accent || 'gray') as SmsPatternAccent,
												iconClass: p.iconClass || 'fa-solid fa-message',
											}))}
										</div>
									</FormSection>

									<FormSection title="حساب" description="قالب‌های مربوط به بدهی و طلب مشتری" iconClass="fa-solid fa-scale-balanced" iconColor="#64748b" badgeLabel={`${meliPatterns.filter((p) => p.category === 'حساب').length.toLocaleString('fa-IR')} قالب`}>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
											{meliPatterns.filter((p) => p.category === 'حساب').map((p) => PatternRow({ reactKey: String(p.key), keyName: p.key as SmsPatternKey, label: p.label, tokens: p.tokens, previewTemplate: p.previewTemplate || '', accent: (p.accent || 'gray') as SmsPatternAccent, iconClass: p.iconClass || 'fa-solid fa-message' }))}
										</div>
									</FormSection>

									<FormSection title="فاکتورها" description="قالب‌های ثبت و پرداخت فاکتورهای فروش" iconClass="fa-solid fa-file-invoice" iconColor="#64748b" badgeLabel={`${meliPatterns.filter((p) => p.category === 'فاکتورها').length.toLocaleString('fa-IR')} قالب`}>
										<div className="grid grid-cols-1 gap-4 md:grid-cols-2 items-stretch">
											{meliPatterns.filter((p) => p.category === 'فاکتورها').map((p) => PatternRow({ reactKey: String(p.key), keyName: p.key as SmsPatternKey, label: p.label, tokens: p.tokens, previewTemplate: p.previewTemplate || '', accent: (p.accent || 'gray') as SmsPatternAccent, iconClass: p.iconClass || 'fa-solid fa-message' }))}
										</div>
									</FormSection>
								</div>
							);
						})()}
                  </div>
                )}
                {/* Fields for Kavenegar */}
                {businessInfo.sms_provider === 'kavenegar' && (
                  <>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="kavenegar_api_key" className={labelClass}>کلید API کاوه‌نگار</label>
                        <input
                          type="text"
                          id="kavenegar_api_key"
                          name="kavenegar_api_key"
                          value={businessInfo.kavenegar_api_key || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* Kavenegar templates for installment due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="kavenegar_installment_due_7_template" className={labelClass}>نام قالب قسط - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="kavenegar_installment_due_7_template"
                          name="kavenegar_installment_due_7_template"
                          value={businessInfo.kavenegar_installment_due_7_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_installment_due_3_template" className={labelClass}>نام قالب قسط - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="kavenegar_installment_due_3_template"
                          name="kavenegar_installment_due_3_template"
                          value={businessInfo.kavenegar_installment_due_3_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_installment_due_today_template" className={labelClass}>نام قالب قسط - همان روز</label>
                        <input
                          type="text"
                          id="kavenegar_installment_due_today_template"
                          name="kavenegar_installment_due_today_template"
                          value={businessInfo.kavenegar_installment_due_today_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* Kavenegar templates for check due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="kavenegar_check_due_7_template" className={labelClass}>نام قالب چک - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="kavenegar_check_due_7_template"
                          name="kavenegar_check_due_7_template"
                          value={businessInfo.kavenegar_check_due_7_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_check_due_3_template" className={labelClass}>نام قالب چک - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="kavenegar_check_due_3_template"
                          name="kavenegar_check_due_3_template"
                          value={businessInfo.kavenegar_check_due_3_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_check_due_today_template" className={labelClass}>نام قالب چک - همان روز</label>
                        <input
                          type="text"
                          id="kavenegar_check_due_today_template"
                          name="kavenegar_check_due_today_template"
                          value={businessInfo.kavenegar_check_due_today_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="kavenegar_installment_template" className={labelClass}>نام قالب یادآوری قسط</label>
                        <input
                          type="text"
                          id="kavenegar_installment_template"
                          name="kavenegar_installment_template"
                          value={businessInfo.kavenegar_installment_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_installment_completed_template" className={labelClass}>نام قالب تسویه کامل اقساط (پرداخت نهایی)</label>
                        <input
                          type="text"
                          id="kavenegar_installment_completed_template"
                          name="kavenegar_installment_completed_template"
                          value={businessInfo.kavenegar_installment_completed_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_repair_received_template" className={labelClass}>نام قالب تحویل تعمیر</label>
                        <input
                          type="text"
                          id="kavenegar_repair_received_template"
                          name="kavenegar_repair_received_template"
                          value={businessInfo.kavenegar_repair_received_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_repair_cost_estimated_template" className={labelClass}>نام قالب برآورد هزینه تعمیر</label>
                        <input
                          type="text"
                          id="kavenegar_repair_cost_estimated_template"
                          name="kavenegar_repair_cost_estimated_template"
                          value={businessInfo.kavenegar_repair_cost_estimated_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="kavenegar_repair_ready_template" className={labelClass}>نام قالب آماده تحویل تعمیر</label>
                        <input
                          type="text"
                          id="kavenegar_repair_ready_template"
                          name="kavenegar_repair_ready_template"
                          value={businessInfo.kavenegar_repair_ready_template || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </>
                )}
                {/* Fields for SMS.ir */}
                {businessInfo.sms_provider === 'sms_ir' && (
                  <div data-settings-mode="advanced">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sms_ir_api_key" className={labelClass}>کلید API SMS.ir</label>
                        <input
                          type="text"
                          id="sms_ir_api_key"
                          name="sms_ir_api_key"
                          value={businessInfo.sms_ir_api_key || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* SMS.ir templates for installment due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sms_ir_installment_due_7_template_id" className={labelClass}>شناسه قالب قسط - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="sms_ir_installment_due_7_template_id"
                          name="sms_ir_installment_due_7_template_id"
                          value={businessInfo.sms_ir_installment_due_7_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_installment_due_3_template_id" className={labelClass}>شناسه قالب قسط - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="sms_ir_installment_due_3_template_id"
                          name="sms_ir_installment_due_3_template_id"
                          value={businessInfo.sms_ir_installment_due_3_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_installment_due_today_template_id" className={labelClass}>شناسه قالب قسط - همان روز</label>
                        <input
                          type="text"
                          id="sms_ir_installment_due_today_template_id"
                          name="sms_ir_installment_due_today_template_id"
                          value={businessInfo.sms_ir_installment_due_today_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* SMS.ir templates for check due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sms_ir_check_due_7_template_id" className={labelClass}>شناسه قالب چک - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="sms_ir_check_due_7_template_id"
                          name="sms_ir_check_due_7_template_id"
                          value={businessInfo.sms_ir_check_due_7_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_check_due_3_template_id" className={labelClass}>شناسه قالب چک - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="sms_ir_check_due_3_template_id"
                          name="sms_ir_check_due_3_template_id"
                          value={businessInfo.sms_ir_check_due_3_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_check_due_today_template_id" className={labelClass}>شناسه قالب چک - همان روز</label>
                        <input
                          type="text"
                          id="sms_ir_check_due_today_template_id"
                          name="sms_ir_check_due_today_template_id"
                          value={businessInfo.sms_ir_check_due_today_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="sms_ir_installment_template_id" className={labelClass}>شناسه قالب یادآوری قسط</label>
                        <input
                          type="text"
                          id="sms_ir_installment_template_id"
                          name="sms_ir_installment_template_id"
                          value={businessInfo.sms_ir_installment_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_installment_completed_template_id" className={labelClass}>شناسه قالب تسویه کامل اقساط (پرداخت نهایی)</label>
                        <input
                          type="text"
                          id="sms_ir_installment_completed_template_id"
                          name="sms_ir_installment_completed_template_id"
                          value={businessInfo.sms_ir_installment_completed_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_repair_received_template_id" className={labelClass}>شناسه قالب تحویل تعمیر</label>
                        <input
                          type="text"
                          id="sms_ir_repair_received_template_id"
                          name="sms_ir_repair_received_template_id"
                          value={businessInfo.sms_ir_repair_received_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_repair_cost_estimated_template_id" className={labelClass}>شناسه قالب برآورد هزینه تعمیر</label>
                        <input
                          type="text"
                          id="sms_ir_repair_cost_estimated_template_id"
                          name="sms_ir_repair_cost_estimated_template_id"
                          value={businessInfo.sms_ir_repair_cost_estimated_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="sms_ir_repair_ready_template_id" className={labelClass}>شناسه قالب آماده تحویل تعمیر</label>
                        <input
                          type="text"
                          id="sms_ir_repair_ready_template_id"
                          name="sms_ir_repair_ready_template_id"
                          value={businessInfo.sms_ir_repair_ready_template_id || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}
                {/* Fields for IPPANEL */}
                {businessInfo.sms_provider === 'ippanel' && (
                  <div data-settings-mode="advanced">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="ippanel_token" className={labelClass}>توکن IPPanel</label>
                        <input
                          type="text"
                          id="ippanel_token"
                          name="ippanel_token"
                          value={businessInfo.ippanel_token || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_from_number" className={labelClass}>شماره فرستنده IPPanel</label>
                        <input
                          type="text"
                          id="ippanel_from_number"
                          name="ippanel_from_number"
                          value={businessInfo.ippanel_from_number || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* IPPanel patterns for installment due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="ippanel_installment_due_7_pattern_code" className={labelClass}>کد الگوی قسط - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="ippanel_installment_due_7_pattern_code"
                          name="ippanel_installment_due_7_pattern_code"
                          value={businessInfo.ippanel_installment_due_7_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_installment_due_3_pattern_code" className={labelClass}>کد الگوی قسط - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="ippanel_installment_due_3_pattern_code"
                          name="ippanel_installment_due_3_pattern_code"
                          value={businessInfo.ippanel_installment_due_3_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_installment_due_today_pattern_code" className={labelClass}>کد الگوی قسط - همان روز</label>
                        <input
                          type="text"
                          id="ippanel_installment_due_today_pattern_code"
                          name="ippanel_installment_due_today_pattern_code"
                          value={businessInfo.ippanel_installment_due_today_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    {/* IPPanel patterns for check due reminders */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="ippanel_check_due_7_pattern_code" className={labelClass}>کد الگوی چک - ۷ روز قبل</label>
                        <input
                          type="text"
                          id="ippanel_check_due_7_pattern_code"
                          name="ippanel_check_due_7_pattern_code"
                          value={businessInfo.ippanel_check_due_7_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_check_due_3_pattern_code" className={labelClass}>کد الگوی چک - ۳ روز قبل</label>
                        <input
                          type="text"
                          id="ippanel_check_due_3_pattern_code"
                          name="ippanel_check_due_3_pattern_code"
                          value={businessInfo.ippanel_check_due_3_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_check_due_today_pattern_code" className={labelClass}>کد الگوی چک - همان روز</label>
                        <input
                          type="text"
                          id="ippanel_check_due_today_pattern_code"
                          name="ippanel_check_due_today_pattern_code"
                          value={businessInfo.ippanel_check_due_today_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-4">
                      <div>
                        <label htmlFor="ippanel_installment_pattern_code" className={labelClass}>کد الگوی یادآوری قسط</label>
                        <input
                          type="text"
                          id="ippanel_installment_pattern_code"
                          name="ippanel_installment_pattern_code"
                          value={businessInfo.ippanel_installment_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_installment_completed_pattern_code" className={labelClass}>کد الگوی تسویه کامل اقساط (پرداخت نهایی)</label>
                        <input
                          type="text"
                          id="ippanel_installment_completed_pattern_code"
                          name="ippanel_installment_completed_pattern_code"
                          value={businessInfo.ippanel_installment_completed_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_repair_received_pattern_code" className={labelClass}>کد الگوی تحویل تعمیر</label>
                        <input
                          type="text"
                          id="ippanel_repair_received_pattern_code"
                          name="ippanel_repair_received_pattern_code"
                          value={businessInfo.ippanel_repair_received_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_repair_cost_estimated_pattern_code" className={labelClass}>کد الگوی برآورد هزینه تعمیر</label>
                        <input
                          type="text"
                          id="ippanel_repair_cost_estimated_pattern_code"
                          name="ippanel_repair_cost_estimated_pattern_code"
                          value={businessInfo.ippanel_repair_cost_estimated_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                      <div>
                        <label htmlFor="ippanel_repair_ready_pattern_code" className={labelClass}>کد الگوی آماده تحویل تعمیر</label>
                        <input
                          type="text"
                          id="ippanel_repair_ready_pattern_code"
                          name="ippanel_repair_ready_pattern_code"
                          value={businessInfo.ippanel_repair_ready_pattern_code || ''}
                          onChange={handleBusinessInfoChange}
                          className={inputClass}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* بخش تلگرام داخل تب پیامک حذف مورد شده و در تب مستقل نمایش داده می‌شود */}

              </fieldset>

			  {/* SMS logs + retry */}
            <div id="sms-logs-section">
			  <SmsLogsPanel />
            </div>

              <div className="mt-8 flex justify-end">
                <button
                  onClick={() => handleBusinessInfoSubmit()}
                  className="px-6 py-2 bg-primary text-white rounded-lg hover:brightness-110"
                >
                  ذخیره تغییرات تنظیمات پیامک
                </button>
              </div>
            </div>
          
  );
};

export default SettingsSmsPanel;
