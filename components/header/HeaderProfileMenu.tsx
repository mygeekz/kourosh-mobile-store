import React from 'react';
import { Link } from 'react-router-dom';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';

type HeaderProfileUser = {
  roleName?: string;
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
}) => (
  <div className="relative" ref={menuRef}>
    {currentUser ? (
      <>
        <button
          onClick={onToggle}
          data-skip-global-button="true"
          className="header-flat-icon-btn header-action-icon grid h-9 w-9 place-items-center rounded-[15px] border border-slate-200/80 bg-white/82 text-slate-700 shadow-[0_10px_22px_-18px_rgba(15,23,42,0.26)] ring-1 ring-white/60 transition-all duration-200 hover:-translate-y-[1px] hover:bg-white hover:shadow-[0_14px_28px_-22px_rgba(15,23,42,0.32)]    dark:border-slate-700/80 dark:bg-slate-950/70 dark:text-slate-200 dark:ring-white/5 dark:hover:bg-slate-900/88"
          aria-expanded={isOpen}
          aria-haspopup="true"
          aria-controls="profile-menu"
          aria-label="حساب کاربری"
          title="حساب کاربری"
        >
          <FontAwesomeIcon icon="fa-regular fa-user" className="text-[14px]" />
        </button>

        {isOpen ? (
          <div
            id="profile-menu"
            className="absolute left-0 mt-3 w-48 rounded-[24px] border border-slate-200/95 bg-white p-2 shadow-[0_30px_80px_-34px_rgba(15,23,42,0.34),0_16px_30px_-22px_rgba(15,23,42,0.18)] ring-1 ring-slate-950/5 z-[380] text-right dark:border-slate-700/90 dark:bg-slate-950 dark:shadow-[0_34px_90px_-38px_rgba(2,6,23,0.76),0_16px_28px_-22px_rgba(2,6,23,0.5)] dark:ring-white/5"
            role="menu"
          >
            <Link
              to="/profile"
              role="menuitem"
              className="flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-200/90 hover:bg-slate-50 hover:shadow-[0_14px_28px_-24px_rgba(15,23,42,0.22)] hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
            >
              <FontAwesomeIcon icon="fas fa-user-circle" className="text-slate-600 dark:text-slate-300" />
              پروفایل شما
            </Link>

            {currentUser.roleName === 'Admin' ? (
              <Link
                to="/settings"
                role="menuitem"
                className="mt-1 flex items-center gap-2 rounded-2xl border border-transparent px-3 py-2.5 text-sm font-bold text-slate-700 transition-all duration-200 hover:border-slate-200/90 hover:bg-slate-50 hover:shadow-[0_14px_28px_-24px_rgba(15,23,42,0.22)] hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900/70"
              >
                <FontAwesomeIcon icon="fas fa-cog" className="text-slate-600 dark:text-slate-300" />
                تنظیمات
              </Link>
            ) : null}

            <div className="my-2 border-t border-slate-200 dark:border-slate-700" />
            <button
              onClick={onLogout}
              role="menuitem"
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-slate-200/95 bg-white px-3 py-2 text-sm font-black text-slate-700 shadow-[0_14px_30px_-24px_rgba(15,23,42,0.22)] ring-1 ring-slate-950/5 transition-all duration-200 hover:-translate-y-0.5 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-700 hover:shadow-[0_18px_34px_-24px_rgba(244,63,94,0.18)] dark:border-slate-700/90 dark:bg-slate-950 dark:text-slate-200 dark:ring-white/5 dark:hover:border-rose-400/30 dark:hover:bg-rose-500/10 dark:hover:text-rose-200"
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

export default HeaderProfileMenu;
