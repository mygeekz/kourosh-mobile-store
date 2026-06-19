import React from 'react';
import type { SettingsUsersPanelProps } from './settingsPanelTypes';
import Button from '../../components/Button';


const SettingsUsersPanel: React.FC<SettingsUsersPanelProps> = ({
  tab,
  userStatsCards,
  labelClass,
  inputClass,
  userSearchQuery,
  setUserSearchQuery,
  userRoleFilter,
  setUserRoleFilter,
  roles,
  users,
  filteredUsers,
  userRoleSummaries,
  openAddUserModal,
  fetchData,
  getRoleLabelFa,
  openEditUserModal,
  openResetPasswordModal,
  openDeleteUserModal,
}) => {
  if (tab !== 'users') return null;

  return (
            <div className="settings-inner-panel-redesign-v1 settings-users-redesign-v1 settings-panel-root space-y-6" data-ui-settings-panel="users">
              <section className="settings-section-card rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:p-6">
                <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
                  <div className="min-w-0 max-w-3xl text-right">
                    <div className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1 text-[11px] font-black text-slate-600 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-300">
                      <i className="fa-solid fa-users-gear" />
                      مدیریت کاربران و نقش‌ها
                    </div>
                    <h3 className="mt-3 text-2xl font-black tracking-tight text-slate-950 dark:text-white">کاربران و نقش‌ها</h3>
                    <p className="mt-2 text-sm leading-7 text-slate-500 dark:text-slate-400">
                      کاربران فروشگاه، نقش‌ها و سطح دسترسی را در یک نمای ساده و قابل جستجو مدیریت کن. با جستجو و فیلتر نقش، سریع‌تر به کاربر مورد نظر می‌رسی و عملیات ویرایش، بازنشانی رمز یا حذف را از همین‌جا انجام می‌دهی.
                    </p>
                  </div>
                  <div className="w-full rounded-[26px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40 xl:max-w-[360px]">
                    <div className="flex items-start gap-3 text-right">
                      <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200"><i className="fa-solid fa-user-check" /></span>
                      <div className="min-w-0 flex-1">
                        <div className="text-sm font-black text-slate-900 dark:text-white">بازخوانی و نظم کاربران</div>
                        <p className="mt-0.5 line-clamp-1 text-[11px] leading-5 text-slate-500 dark:text-slate-400">لیست، فیلتر و عملیات کاربرها از همین صفحه انجام می‌شود.</p>
                      </div>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button onClick={openAddUserModal} variant="primary" leftIcon={<i className="fa-solid fa-plus" />}>
                        افزودن کاربر جدید
                      </Button>
                      <Button onClick={fetchData} variant="secondary" leftIcon={<i className="fa-solid fa-rotate" />}>
                        تازه‌سازی
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
                  {userStatsCards.map((card) => (
                    <div key={card.label} className="rounded-[24px] border border-slate-200 bg-slate-50/80 p-4 dark:border-slate-800 dark:bg-slate-900/40">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex h-11 w-11 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-600 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-200">
                          <i className={`fa-solid ${card.icon}`} />
                        </div>
                        <div className="text-[11px] font-black text-slate-500 dark:text-slate-400">{card.label}</div>
                      </div>
                      <div className={`mt-3 text-2xl font-black ${card.tone}`}>{card.value}</div>
                    </div>
                  ))}
                </div>
              </section>

              <section className="settings-section-card rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-950/80 md:p-6">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
                  <div className="grid flex-1 grid-cols-1 gap-3 md:grid-cols-[minmax(0,1fr)_220px]">
                    <label className="block text-right">
                      <span className={labelClass}><i className="fa-solid fa-magnifying-glass ml-2 text-slate-400" />جستجو</span>
                      <div className="relative">
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-user" /></span>
                        <input
                          type="text"
                          value={userSearchQuery}
                          onChange={(e) => setUserSearchQuery(e.target.value)}
                          className={`${inputClass} pr-12`}
                          placeholder="جستجو بر اساس نام کاربری، نقش یا شناسه"
                          dir="rtl"
                        />
                      </div>
                    </label>
                    <label className="block text-right">
                      <span className={labelClass}><i className="fa-solid fa-filter ml-2 text-slate-400" />فیلتر نقش</span>
                      <div className="relative">
                        <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-slate-400"><i className="fa-solid fa-user-tag" /></span>
                        <select value={userRoleFilter} onChange={(e) => setUserRoleFilter(e.target.value)} className={`${inputClass} pr-12`}>
                          <option value="all">همه نقش‌ها</option>
                          {roles.map((role) => (
                            <option key={role.id} value={String(role.id)}>{getRoleLabelFa(role.name)}</option>
                          ))}
                        </select>
                      </div>
                    </label>
                  </div>
                  <div className="text-xs leading-6 text-slate-500 dark:text-slate-400">
                    {filteredUsers.length.toLocaleString('fa-IR')} کاربر از {users.length.toLocaleString('fa-IR')} مورد نمایش داده می‌شود.
                  </div>
                </div>

                <div className="mt-4 flex flex-wrap gap-2">
                  <button type="button" onClick={() => setUserRoleFilter('all')} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${userRoleFilter === 'all' ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'}`}>
                    همه کاربران
                  </button>
                  {userRoleSummaries.slice(0, 5).map((item) => (
                    <button key={item.roleName} type="button" onClick={() => setUserRoleFilter(item.roleName)} className={`rounded-full border px-3 py-1.5 text-xs font-black transition ${userRoleFilter === item.roleName ? 'border-emerald-300 bg-emerald-50 text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-950/20 dark:text-emerald-200' : 'border-slate-200 bg-white text-slate-500 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-400'}`}>
                      {getRoleLabelFa(item.roleName)} · {item.count.toLocaleString('fa-IR')}
                    </button>
                  ))}
                </div>

                <div className="mt-5 overflow-hidden rounded-[24px] border border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950/70" data-settings-mode="advanced">
                  <table className="settings-table-clean min-w-full text-sm">
                    <thead className="bg-slate-50 text-slate-500 dark:bg-slate-900/60 dark:text-slate-400">
                      <tr>
                        <th className="py-3 text-right"><i className="fa-solid fa-user ml-2" />کاربر</th>
                        <th className="py-3 text-right"><i className="fa-solid fa-user-gear ml-2" />نقش</th>
                        <th className="py-3 text-center"><i className="fa-solid fa-ellipsis-vertical" />عملیات</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
                      {filteredUsers.length === 0 ? (
                        <tr>
                          <td colSpan={3} className="py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                            هیچ کاربری با این فیلتر پیدا نشد.
                          </td>
                        </tr>
                      ) : filteredUsers.map((user) => (
                        <tr key={user.id} className="align-top">
                          <td className="py-4">
                            <div className="flex items-center gap-3 text-right">
                              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-slate-100 text-slate-600 dark:bg-slate-900 dark:text-slate-200">
                                <i className="fa-solid fa-circle-user" />
                              </span>
                              <div className="min-w-0">
                                <div className="font-black text-slate-900 dark:text-white">{user.username}</div>
                                <div className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">شناسه {user.id.toLocaleString('fa-IR')}</div>
                              </div>
                            </div>
                          </td>
                          <td className="py-4">
                            <span className="inline-flex items-center gap-2 rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-black text-slate-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                              <i className="fa-solid fa-user-shield text-slate-400" />
                              {getRoleLabelFa(user.roleName)}
                            </span>
                          </td>
                          <td className="py-4 text-center">
                            <div className="flex flex-wrap items-center justify-center gap-2">
                              <Button onClick={() => openEditUserModal(user)} size="xs" variant="secondary" title="ویرایش نقش کاربر" leftIcon={<i className="fa-solid fa-user-pen" />}>ویرایش</Button>
                              <Button onClick={() => openResetPasswordModal(user)} size="xs" variant="warning" title="بازنشانی رمز عبور" leftIcon={<i className="fa-solid fa-key" />}>رمز</Button>
                              {user.username !== 'admin' && (
                                <Button onClick={() => openDeleteUserModal(user)} size="xs" variant="danger" title="حذف کاربر" leftIcon={<i className="fa-solid fa-trash" />} requiredRoles={['Admin']}>
                                  حذف
                                </Button>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </section>
            </div>
  );
};

export default SettingsUsersPanel;
