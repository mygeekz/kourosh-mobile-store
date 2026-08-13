import React from 'react';
import Button from '../../components/Button';
import { DataTableShell, SelectField, TableActionGroup, TextField } from '@/components/ui';
import { formatIsoToShamsiDateTime } from '../../utils/dateUtils';
import type { UserForDisplay } from '../../types';
import type { SettingsUsersPanelProps } from './settingsPanelTypes';

const formatUserDate = (value?: string | null) => {
  if (!value) return 'ثبت نشده';
  return formatIsoToShamsiDateTime(value);
};

const getUserDisplayName = (user: UserForDisplay) => {
  const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
  return fullName || user.username;
};

const getInitial = (user: UserForDisplay) => getUserDisplayName(user).trim().slice(0, 1).toUpperCase() || 'ک';

const SettingsUsersPanel: React.FC<SettingsUsersPanelProps> = ({
  tab,
  userStatsCards,
  userSearchQuery,
  setUserSearchQuery,
  userRoleFilter,
  setUserRoleFilter,
  roles,
  users,
  filteredUsers,
  userRoleSummaries,
  openAddUserModal,
  refreshUsersData,
  isRefreshingUsers,
  currentUserId,
  getRoleLabelFa,
  openEditUserModal,
  openResetPasswordModal,
  openDeleteUserModal,
}) => {
  if (tab !== 'users') return null;

  const filtersActive = Boolean(userSearchQuery.trim() || userRoleFilter !== 'all');
  const clearFilters = () => {
    setUserSearchQuery('');
    setUserRoleFilter('all');
  };

  const renderAvatar = (user: UserForDisplay, compact = false) => (
    <span className={`settings-users-avatar ${compact ? 'settings-users-avatar--compact' : ''}`} aria-hidden="true">
      {user.avatarUrl ? <img src={user.avatarUrl} alt="" loading="lazy" /> : <span>{getInitial(user)}</span>}
    </span>
  );

  return (
    <div
      className="settings-inner-panel-redesign-v1 settings-users-redesign-v1 settings-users-redesign-v2 settings-panel-root space-y-4"
      data-ui-settings-panel="users"
    >
      <section className="settings-users-hero settings-section-card">
        <div className="settings-users-hero__main">
          <div className="settings-users-hero__copy">
            <div className="settings-users-kicker">
              <i className="fa-solid fa-users-gear" aria-hidden="true" />
              مدیریت دسترسی فروشگاه
            </div>
            <h3>کاربران و نقش‌ها</h3>
            <p>کاربران واقعی سیستم، نقش اختصاص‌یافته و عملیات امنیتی را از یک نمای فشرده مدیریت کن.</p>
          </div>

          <div className="settings-users-hero__actions" data-skip-global-buttons="true">
            <Button
              onClick={refreshUsersData}
              variant="secondary"
              size="sm"
              loading={isRefreshingUsers}
              loadingText="در حال تازه‌سازی..."
              leftIcon={!isRefreshingUsers ? <i className="fa-solid fa-rotate" /> : undefined}
              className="settings-users-action settings-users-action--refresh"
            >
              تازه‌سازی
            </Button>
            <Button
              onClick={openAddUserModal}
              variant="primary"
              size="sm"
              leftIcon={<i className="fa-solid fa-user-plus" />}
              className="settings-users-action settings-users-action--add"
            >
              کاربر جدید
            </Button>
          </div>
        </div>

        <div className="settings-users-stats" aria-label="خلاصه کاربران" data-ui-settings-grid="cards">
          {userStatsCards.map((card) => (
            <div key={card.label} className="settings-users-stat">
              <span className="settings-users-stat__icon"><i className={`fa-solid ${card.icon}`} /></span>
              <span className="settings-users-stat__copy">
                <span className="settings-users-stat__label">{card.label}</span>
                <strong className={card.tone}>{card.value}</strong>
              </span>
            </div>
          ))}
        </div>
      </section>

      <section className="settings-users-role-strip settings-section-card" aria-label="نقش‌های تعریف‌شده">
        <div className="settings-users-role-strip__header">
          <div>
            <strong>نقش‌های فعال سیستم</strong>
            <span>{roles.length.toLocaleString('fa-IR')} نقش تعریف شده</span>
          </div>
          <Button
            type="button"
            onClick={() => setUserRoleFilter('all')}
            variant="ghost"
            size="xs"
            autoIcon={false}
            className={`settings-users-role-chip ${userRoleFilter === 'all' ? 'is-active' : ''}`}
          >
            همه · {users.length.toLocaleString('fa-IR')}
          </Button>
        </div>
        <div className="settings-users-role-list">
          {userRoleSummaries.map((item) => (
            <Button
              key={item.roleName}
              type="button"
              onClick={() => setUserRoleFilter(item.roleName)}
              variant="ghost"
              size="xs"
              autoIcon={false}
              className={`settings-users-role-chip ${userRoleFilter === item.roleName ? 'is-active' : ''}`}
            >
              <i className="fa-solid fa-user-shield" aria-hidden="true" />
              <span>{getRoleLabelFa(item.roleName)}</span>
              <b>{item.count.toLocaleString('fa-IR')}</b>
            </Button>
          ))}
        </div>
      </section>

      <section className="settings-users-directory settings-section-card">
        <div className="settings-users-toolbar" data-ui-settings-grid="form">
          <div className="settings-users-control settings-users-control--search">
            <i className="fa-solid fa-magnifying-glass" aria-hidden="true" />
            <TextField controlOnly
              type="search"
              value={userSearchQuery}
              onChange={(event) => setUserSearchQuery(event.target.value)}
              placeholder="نام کاربری، نام، نقش یا شناسه"
              aria-label="جستجو در کاربران"
              autoComplete="off"
              dir="rtl"
            />
            {userSearchQuery ? (
              <Button type="button" onClick={() => setUserSearchQuery('')} title="پاک‌کردن جستجو" aria-label="پاک‌کردن جستجو" variant="ghost" size="icon" autoIcon={false} className="settings-users-search-clear">
                <i className="fa-solid fa-xmark" />
              </Button>
            ) : null}
          </div>

          <div className="settings-users-control settings-users-control--select">
            <i className="fa-solid fa-user-tag" aria-hidden="true" />
            <SelectField controlOnly unstyled showChevron={false} icon={false} value={userRoleFilter} onChange={(event) => setUserRoleFilter(event.target.value)} aria-label="فیلتر نقش">
              <option value="all">همه نقش‌ها</option>
              {roles.map((role) => (
                <option key={role.id} value={String(role.id)}>{getRoleLabelFa(role.name)}</option>
              ))}
            </SelectField>
          </div>

          <div className="settings-users-toolbar__summary">
            <span><b>{filteredUsers.length.toLocaleString('fa-IR')}</b> از {users.length.toLocaleString('fa-IR')} کاربر</span>
            {filtersActive ? (
              <Button type="button" onClick={clearFilters} variant="ghost" size="xs" autoIcon={false} className="settings-users-clear-filter">
                <i className="fa-solid fa-rotate-left" />
                حذف فیلتر
              </Button>
            ) : null}
          </div>
        </div>

        {filteredUsers.length === 0 ? (
          <div className="settings-users-empty">
            <span><i className="fa-solid fa-user-slash" /></span>
            <strong>کاربری پیدا نشد</strong>
            <p>عبارت جستجو یا فیلتر نقش را تغییر بده.</p>
            {filtersActive ? <Button type="button" onClick={clearFilters} variant="ghost" size="xs" autoIcon={false} className="settings-users-empty-action">نمایش همه کاربران</Button> : null}
          </div>
        ) : (
          <>
            <DataTableShell className="settings-users-table-wrap" data-settings-mode="advanced" data-ui-settings-users-table="true">
              <table className="settings-table-clean settings-users-table">
                <thead>
                  <tr>
                    <th>کاربر</th>
                    <th>نقش</th>
                    <th>فعالیت حساب</th>
                    <th className="text-center">عملیات</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user) => {
                    const isPrimaryAdmin = user.username === 'admin';
                    const isCurrentUser = Number(currentUserId || 0) === user.id;
                    const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
                    return (
                      <tr key={user.id}>
                        <td>
                          <div className="settings-users-identity">
                            {renderAvatar(user)}
                            <div>
                              <strong>{fullName || user.username}</strong>
                              <span dir="ltr">@{user.username}</span>
                              <small>شناسه {user.id.toLocaleString('fa-IR')}</small>
                            </div>
                          </div>
                        </td>
                        <td>
                          <span className={`settings-users-role-badge ${isPrimaryAdmin ? 'is-admin' : ''}`}>
                            <i className={`fa-solid ${isPrimaryAdmin ? 'fa-shield-halved' : 'fa-user-shield'}`} />
                            {getRoleLabelFa(user.roleName)}
                          </span>
                        </td>
                        <td>
                          <div className="settings-users-activity">
                            <span><i className="fa-regular fa-clock" /> آخرین ورود: {formatUserDate(user.lastLogin)}</span>
                            <span><i className="fa-regular fa-calendar-plus" /> عضویت: {formatUserDate(user.dateAdded)}</span>
                          </div>
                        </td>
                        <td>
                          <TableActionGroup
                            ariaLabel={`عملیات کاربر ${user.username}`}
                            collapseBelow="md"
                            actions={[
                              {
                                key: 'edit-role',
                                kind: 'button',
                                label: 'ویرایش نقش',
                                tooltip: isPrimaryAdmin
                                  ? 'نقش مدیر اصلی قابل تغییر نیست'
                                  : isCurrentUser
                                    ? 'نقش حساب فعلی از این صفحه قابل تغییر نیست'
                                    : 'ویرایش نقش کاربر',
                                icon: <i className="fa-solid fa-user-pen" />,
                                variant: 'secondary',
                                disabled: isPrimaryAdmin || isCurrentUser,
                                onClick: () => openEditUserModal(user),
                              },
                              {
                                key: 'reset-password',
                                kind: 'button',
                                label: 'بازنشانی رمز عبور',
                                tooltip: 'بازنشانی رمز عبور',
                                icon: <i className="fa-solid fa-key" />,
                                variant: 'warning',
                                onClick: () => openResetPasswordModal(user),
                              },
                              {
                                key: 'delete-user',
                                kind: 'button',
                                label: 'حذف کاربر',
                                tooltip: 'حذف کاربر',
                                icon: <i className="fa-solid fa-trash" />,
                                variant: 'danger',
                                hidden: isPrimaryAdmin || isCurrentUser,
                                requiredRoles: ['Admin'],
                                onClick: () => openDeleteUserModal(user),
                              },
                            ]}
                          />
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </DataTableShell>

            <div className="settings-users-mobile-list">
              {filteredUsers.map((user) => {
                const isPrimaryAdmin = user.username === 'admin';
                const isCurrentUser = Number(currentUserId || 0) === user.id;
                const fullName = [user.firstName, user.lastName].filter(Boolean).join(' ').trim();
                return (
                  <article key={user.id} className="settings-users-mobile-card">
                    <div className="settings-users-mobile-card__header">
                      <div className="settings-users-identity">
                        {renderAvatar(user, true)}
                        <div>
                          <strong>{fullName || user.username}</strong>
                          <span dir="ltr">@{user.username}</span>
                        </div>
                      </div>
                      <span className={`settings-users-role-badge ${isPrimaryAdmin ? 'is-admin' : ''}`}>
                        {getRoleLabelFa(user.roleName)}
                      </span>
                    </div>
                    <div className="settings-users-mobile-card__meta">
                      <span><i className="fa-solid fa-hashtag" /> {user.id.toLocaleString('fa-IR')}</span>
                      <span><i className="fa-regular fa-clock" /> {formatUserDate(user.lastLogin)}</span>
                      <span><i className="fa-regular fa-calendar-plus" /> {formatUserDate(user.dateAdded)}</span>
                    </div>
                    <TableActionGroup
                      ariaLabel={`عملیات کاربر ${user.username}`}
                      collapseBelow="md"
                      align="end"
                      actions={[
                        {
                          key: 'edit-role',
                          kind: 'button',
                          label: 'ویرایش نقش',
                          tooltip: isPrimaryAdmin
                            ? 'نقش مدیر اصلی قابل تغییر نیست'
                            : isCurrentUser
                              ? 'نقش حساب فعلی از این صفحه قابل تغییر نیست'
                              : 'ویرایش نقش کاربر',
                          icon: <i className="fa-solid fa-user-pen" />,
                          variant: 'secondary',
                          disabled: isPrimaryAdmin || isCurrentUser,
                          onClick: () => openEditUserModal(user),
                        },
                        {
                          key: 'reset-password',
                          kind: 'button',
                          label: 'بازنشانی رمز عبور',
                          tooltip: 'بازنشانی رمز عبور',
                          icon: <i className="fa-solid fa-key" />,
                          variant: 'warning',
                          onClick: () => openResetPasswordModal(user),
                        },
                        {
                          key: 'delete-user',
                          kind: 'button',
                          label: 'حذف کاربر',
                          tooltip: 'حذف کاربر',
                          icon: <i className="fa-solid fa-trash" />,
                          variant: 'danger',
                          hidden: isPrimaryAdmin || isCurrentUser,
                          requiredRoles: ['Admin'],
                          onClick: () => openDeleteUserModal(user),
                        },
                      ]}
                    />
                  </article>
                );
              })}
            </div>
          </>
        )}
      </section>
    </div>
  );
};

export default SettingsUsersPanel;
