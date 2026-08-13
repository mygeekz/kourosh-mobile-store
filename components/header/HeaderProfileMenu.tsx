import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { FontAwesomeIcon } from '@/components/ui';
import HeaderIconButton from './HeaderIconButton';

type HeaderProfileUser = {
  roleName?: string;
  avatarUrl?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  username?: string;
} | null | undefined;

type HeaderProfileMenuProps = {
  currentUser: HeaderProfileUser;
  isOpen: boolean;
  onToggle: () => void;
  onLogout: () => void | Promise<void>;
  menuRef: React.Ref<HTMLDivElement>;
};

const HeaderProfileMenu: React.FC<HeaderProfileMenuProps> = ({
  currentUser,
  isOpen,
  onToggle,
  onLogout,
  menuRef,
}) => {
  const [failedAvatarUrl, setFailedAvatarUrl] = useState<string | null>(null);

  const avatarLabel = [currentUser?.firstName, currentUser?.lastName].filter(Boolean).join(' ').trim()
    || currentUser?.username
    || 'کاربر';
  const showAvatar = Boolean(currentUser?.avatarUrl && failedAvatarUrl !== currentUser.avatarUrl);

  return (
  <div className="app-header-profile" ref={menuRef}>
    {currentUser ? (
      <>
        <HeaderIconButton
          onClick={onToggle}
          icon="fa-regular fa-user"
          iconClassName="text-[14px]"
          content={showAvatar ? (
            <img
              src={currentUser?.avatarUrl || ''}
              alt={`تصویر پروفایل ${avatarLabel}`}
              className="h-full w-full rounded-[inherit] object-cover"
              onError={() => setFailedAvatarUrl(currentUser?.avatarUrl || null)}
            />
          ) : undefined}
          className={showAvatar ? 'overflow-hidden' : undefined}
          active={isOpen}
          aria-expanded={isOpen}
          aria-haspopup="menu"
          aria-controls="profile-menu"
          aria-label="حساب کاربری"
          title="حساب کاربری"
        />

        {isOpen ? (
          <div id="profile-menu" className="app-header-profile-menu" role="menu">
            <Link to="/profile" role="menuitem" className="app-header-profile-menu__item">
              <FontAwesomeIcon icon="fas fa-user-circle" />
              پروفایل شما
            </Link>

            {currentUser.roleName === 'Admin' ? (
              <Link to="/settings" role="menuitem" className="app-header-profile-menu__item">
                <FontAwesomeIcon icon="fas fa-cog" />
                تنظیمات
              </Link>
            ) : null}

            <div className="app-header-profile-menu__divider" />
            <button
              type="button"
              onClick={onLogout}
              role="menuitem"
              data-skip-global-button="true"
              className="app-header-profile-menu__logout unstyled-button"
            >
              <FontAwesomeIcon icon="fas fa-sign-out-alt" />
              خروج از حساب
            </button>
          </div>
        ) : null}
      </>
    ) : null}
  </div>
  );
};

export default HeaderProfileMenu;
