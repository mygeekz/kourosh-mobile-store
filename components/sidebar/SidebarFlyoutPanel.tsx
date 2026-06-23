import React from 'react';
import { NavLink } from 'react-router-dom';
import { motion } from 'framer-motion';

import type { NavItem } from '../../types';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';
import { getFlyoutSubtitle, getNavSurfaceRole } from './sidebarNavUtils';

export type SidebarFlyoutLayout = {
  left: number;
  top: number;
  width: number;
};

interface SidebarFlyoutPanelProps {
  item: NavItem;
  flyoutLayout: SidebarFlyoutLayout | null;
  badgeCount: number;
  getBadgeCount: (item: NavItem) => number;
  onClose?: () => void;
  onClearHoveredGroup: () => void;
  onPointerEnter: () => void;
  onPointerLeave: () => void;
}

const closeAndMaybeCloseSidebar = (onClearHoveredGroup: () => void, onClose?: () => void): void => {
  onClearHoveredGroup();
  if (onClose) onClose();
};

export const SidebarFlyoutPanel: React.FC<SidebarFlyoutPanelProps> = ({
  item,
  flyoutLayout,
  badgeCount,
  getBadgeCount,
  onClose,
  onClearHoveredGroup,
  onPointerEnter,
  onPointerLeave,
}) => (
  <motion.div
    initial={{ opacity: 0, x: 10, scale: 0.975, filter: 'blur(2px)' }}
    animate={{ opacity: 1, x: 0, scale: 1, filter: 'blur(0px)' }}
    exit={{ opacity: 0, x: 8, scale: 0.985, filter: 'blur(1px)' }}
    transition={{ type: 'spring', stiffness: 380, damping: 32, mass: 0.7 }}
    onMouseEnter={onPointerEnter}
    onMouseLeave={onPointerLeave}
    className="ux-stable-panel ux-stable-popover fixed z-[70] origin-top-right overflow-hidden rounded-[24px] border border-slate-200/80 bg-white p-2 shadow-[0_28px_70px_-30px_rgba(15,23,42,0.34)] will-change-transform dark:border-slate-800/90 dark:bg-slate-950"
    style={{
      left: flyoutLayout?.left ?? 12,
      top: flyoutLayout?.top ?? 12,
      width: flyoutLayout?.width ?? 264,
      maxWidth: 'calc(100vw - 24px)',
      maxHeight: 'calc(100vh - 24px)',
    }}
  >
    <div className="mb-2 flex items-center gap-2 rounded-[18px] border border-slate-200/80 bg-slate-50/90 px-3 py-2 text-right dark:border-slate-800 dark:bg-slate-900/80">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-white text-slate-700 shadow-sm dark:border-slate-700 dark:bg-slate-950 dark:text-slate-100">
        <FontAwesomeIcon icon={item.icon || 'fa-solid fa-folder-tree'} />
      </span>
      <div className="min-w-0 flex-1">
        <div className="flex min-w-0 items-center gap-2">
          <div className="truncate text-[12px] font-extrabold text-slate-800 dark:text-slate-100">{item.name}</div>
          <span className="nav-surface-role-pill">{getNavSurfaceRole(item).label}</span>
        </div>
        <div className="text-[10px] text-slate-500 dark:text-slate-400">{getFlyoutSubtitle(item)}</div>
      </div>
    </div>

    <div className="max-h-[calc(100vh-132px)] space-y-1 overflow-y-auto pr-1">
      {item.path ? (
        <NavLink
          to={item.path}
          onClick={() => closeAndMaybeCloseSidebar(onClearHoveredGroup, onClose)}
          className={({ isActive }) => [
            'group/flyout flex items-center gap-3 rounded-[18px] border px-3 py-2 text-right transition-all duration-200',
            isActive
              ? 'border-[var(--sidebar-hover-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)] shadow-[0_16px_32px_-26px_rgba(15,23,42,0.3)]'
              : 'border-transparent text-slate-700 hover:-translate-y-[1px] hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-50',
          ].join(' ')}
        >
          <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 transition-all duration-200 group-hover/flyout:scale-[1.04] group-hover/flyout:border-[var(--sidebar-hover-border)] group-hover/flyout:bg-[var(--sidebar-hover-bg)] group-hover/flyout:text-[var(--sidebar-hover-fg)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
            <FontAwesomeIcon icon="fa-solid fa-grid-2" />
          </span>
          <div className="min-w-0 flex-1">
            <div className="flex items-center justify-between gap-2">
              <span className="truncate text-[12px] font-bold">نمای کلی {item.name}</span>
              <span className="nav-surface-role-pill hidden sm:inline-flex">{getNavSurfaceRole(item).label}</span>
              {badgeCount > 0 ? (
                <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full border border-current/10 bg-white/80 px-1.5 py-0.5 text-[10px] font-black leading-none text-current dark:bg-slate-950/70">
                  {badgeCount.toLocaleString('fa-IR')}
                </span>
              ) : null}
            </div>
            <div className="text-[10px] text-slate-500 dark:text-slate-400">{getFlyoutSubtitle(item)}</div>
          </div>
          <FontAwesomeIcon icon="fa-solid fa-arrow-left" className="text-[11px] opacity-60" />
        </NavLink>
      ) : null}

      {item.children!.map((child) => {
        const childBadgeCount = getBadgeCount(child);
        return (
          <NavLink
            key={child.id}
            data-flyout-child="true"
            to={child.path || item.path || '#'}
            onClick={() => closeAndMaybeCloseSidebar(onClearHoveredGroup, onClose)}
            className={({ isActive }) => [
              'group/flyout flex items-center gap-3 rounded-[18px] border px-3 py-2 text-right transition-all duration-200',
              isActive
                ? 'border-[var(--sidebar-hover-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)] shadow-[0_16px_32px_-26px_rgba(15,23,42,0.3)]'
                : 'border-transparent text-slate-700 hover:-translate-y-[1px] hover:border-slate-200 hover:bg-slate-50 hover:text-slate-900 dark:text-slate-200 dark:hover:border-slate-700 dark:hover:bg-slate-900 dark:hover:text-slate-50',
            ].join(' ')}
          >
            <span className="grid h-9 w-9 shrink-0 place-items-center rounded-2xl border border-slate-200/80 bg-white text-slate-600 transition-all duration-200 group-hover/flyout:scale-[1.04] group-hover/flyout:border-[var(--sidebar-hover-border)] group-hover/flyout:bg-[var(--sidebar-hover-bg)] group-hover/flyout:text-[var(--sidebar-hover-fg)] dark:border-slate-700 dark:bg-slate-950 dark:text-slate-300">
              <FontAwesomeIcon icon={child.icon || 'fa-solid fa-angle-left'} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2">
                <span className="truncate text-[12px] font-bold">{child.name}</span>
                <span className="nav-surface-role-pill hidden sm:inline-flex">{getNavSurfaceRole(child, item).label}</span>
                {childBadgeCount > 0 ? (
                  <span className="inline-flex min-w-[1.4rem] items-center justify-center rounded-full border border-current/10 bg-white/80 px-1.5 py-0.5 text-[10px] font-black leading-none text-current dark:bg-slate-950/70">
                    {childBadgeCount.toLocaleString('fa-IR')}
                  </span>
                ) : null}
              </div>
              <div className="text-[10px] text-slate-500 dark:text-slate-400">{getFlyoutSubtitle(child, item)}</div>
            </div>
            <FontAwesomeIcon icon="fa-solid fa-arrow-left" className="text-[11px] opacity-60" />
          </NavLink>
        );
      })}
    </div>
  </motion.div>
);
