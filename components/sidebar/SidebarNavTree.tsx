import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';

import type { NavItem } from '../../types';
import FontAwesomeIcon from '../ui/FontAwesomeIcon';
import { SidebarFlyoutLayout, SidebarFlyoutPanel } from './SidebarFlyoutPanel';
import { isExactRouteActive, isItemActive } from './sidebarNavUtils';

type SidebarVisualState = {
  sidebarIconPx: number;
  sidebarVariant: string;
};

interface SidebarNavTreeProps {
  items: NavItem[];
  pathname: string;
  collapsed: boolean;
  style: SidebarVisualState;
  openGroups: Record<string, boolean>;
  hoveredGroupId: string | null;
  flyoutLayout: SidebarFlyoutLayout | null;
  flyoutItemRefs: React.MutableRefObject<Record<string, HTMLLIElement | null>>;
  onToggleGroup: (id: string, parentId?: string) => void;
  onClose?: () => void;
  onCollapsedGroupEnter: (item: NavItem) => void;
  onCollapsedGroupLeave: () => void;
  onFlyoutPointerEnter: () => void;
  onFlyoutPointerLeave: () => void;
  onClearHoveredGroup: () => void;
  getBadgeCount: (item: NavItem) => number;
}

interface SidebarNavRowProps {
  item: NavItem;
  depth: number;
  parentId?: string;
}

export const SidebarNavTree: React.FC<SidebarNavTreeProps> = ({
  items,
  pathname,
  collapsed,
  style,
  openGroups,
  hoveredGroupId,
  flyoutLayout,
  flyoutItemRefs,
  onToggleGroup,
  onClose,
  onCollapsedGroupEnter,
  onCollapsedGroupLeave,
  onFlyoutPointerEnter,
  onFlyoutPointerLeave,
  onClearHoveredGroup,
  getBadgeCount,
}) => {
  const navigate = useNavigate();

  const Row: React.FC<SidebarNavRowProps> = ({ item, depth, parentId }) => {
    const branchActive = isItemActive(pathname, item);
    const routeActive = isExactRouteActive(pathname, item);
    const hasChildren = !!item.children?.length;
    const isOpen = !!openGroups[item.id];

    const iconPx = depth === 0 ? style.sidebarIconPx : Math.max(22, Math.round(style.sidebarIconPx * 0.74));
    const rowMinHeight = depth === 0 ? 'var(--sidebar-item-h)' : 'var(--sidebar-subitem-h)';
    const labelClass = depth === 0 ? 'text-[11px] font-semibold tracking-tight' : 'text-[10px] font-medium text-slate-500 dark:text-slate-400';
    const indent = depth === 0 ? '' : 'pr-4';
    const showCollapsedFlyout = collapsed && depth === 0 && hasChildren && hoveredGroupId === item.id;
    const badgeCount = getBadgeCount(item);

    const handleCollapsedEnter = () => {
      if (!(collapsed && depth === 0 && hasChildren)) return;
      onCollapsedGroupEnter(item);
    };

    const handleCollapsedLeave = () => {
      if (!(collapsed && depth === 0 && hasChildren)) return;
      onCollapsedGroupLeave();
    };

    const onClick = (event: React.MouseEvent) => {
      if (hasChildren) {
        // Mini sidebar: go to group hub (or first child) instead of expanding hidden children
        if (collapsed && depth === 0) {
          const target = item.path || item.children?.find((child) => child.path)?.path;
          if (target) {
            navigate(target);
          }
          if (onClose) onClose();
          event.preventDefault();
          return;
        }

        // Normal: toggle group + optionally navigate
        onToggleGroup(item.id, parentId);
        if (item.path) {
          navigate(item.path);
        }
        event.preventDefault();
        return;
      }

      // آیتم عادی
      if (onClose) onClose();
    };

    // رندر دکمه/لینک
    // فقط route واقعی باید selected باشد. باز بودن یک گروه نباید باکس active کامل بسازد.
    const isActiveRow = routeActive;
    const isOpenRow = isOpen && hasChildren && !routeActive;
    const rowStyle = { minHeight: rowMinHeight };

    const content = (
      <div
        className={[
          'sidebar-nav-row group relative flex items-center w-full whitespace-nowrap cursor-pointer text-right overflow-hidden border transition-all duration-200 ease-out hover:-translate-y-[1px] hover:border-[var(--sidebar-hover-border)] hover:bg-[var(--sidebar-hover-bg)]/70 hover:text-[var(--sidebar-hover-fg)] hover:shadow-[0_18px_34px_-26px_rgba(15,23,42,0.35)]',
          depth === 0 ? 'rounded-[16px] px-2.5 py-1' : 'rounded-[13px] px-2 py-0.5',
          indent,
          depth === 0
            ? (
                isActiveRow
                  ? 'text-[var(--sidebar-hover-fg)] dark:text-[var(--sidebar-hover-fg-dark)]'
                  : 'border-transparent bg-transparent text-slate-600 dark:text-slate-300'
              )
            : (
                routeActive
                  ? 'text-[var(--sidebar-hover-fg)] dark:text-[var(--sidebar-hover-fg-dark)]'
                  : (branchActive
                      ? 'border-transparent bg-transparent text-slate-600 dark:text-slate-300'
                      : 'border-transparent bg-transparent text-slate-500 dark:text-slate-400')
              ),
        ].join(' ')}
        data-sidebar-active={isActiveRow ? 'true' : 'false'}
        data-sidebar-open={isOpenRow ? 'true' : 'false'}
        data-sidebar-depth={depth}
        data-sidebar-has-children={hasChildren ? 'true' : 'false'}
        title={collapsed && depth === 0 ? item.name : undefined}
        style={rowStyle}
      >
        <span
          className={[
            'icon-bubble relative shrink-0 grid place-items-center transition-all duration-200 ease-out group-hover:scale-[1.05]',
            depth === 0
              ? (isActiveRow
                  ? 'rounded-xl border border-[var(--sidebar-hover-border)] bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)] shadow-[0_14px_28px_-22px_rgba(15,23,42,0.28)]'
                  : 'rounded-xl border border-transparent bg-transparent text-current group-hover:border-[var(--sidebar-hover-border)]/70 group-hover:bg-[var(--sidebar-hover-bg)]/80')
              : (routeActive
                  ? 'rounded-lg bg-[var(--sidebar-hover-bg)] text-[var(--sidebar-hover-fg)]'
                  : (branchActive
                      ? 'rounded-lg border border-transparent bg-transparent text-slate-600 dark:text-slate-300 group-hover:bg-[var(--sidebar-hover-bg)]/70'
                      : 'rounded-lg border border-transparent bg-transparent text-current group-hover:bg-[var(--sidebar-hover-bg)]/70')),
          ].join(' ')}
          style={{ width: depth === 0 ? iconPx : Math.max(18, iconPx - 4), height: depth === 0 ? iconPx : Math.max(18, iconPx - 4) }}
        >
          {badgeCount > 0 && depth === 0 ? (
            <span className="absolute -left-1 -top-1 inline-flex min-w-[18px] items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-black text-white shadow-[0_10px_24px_-12px_rgba(244,63,94,0.65)]">
              {badgeCount > 99 ? '۹۹+' : badgeCount.toLocaleString('fa-IR')}
            </span>
          ) : null}
          {item.icon ? (
            <FontAwesomeIcon
              icon={item.icon}
              className={isActiveRow ? 'text-[var(--sidebar-hover-fg)] dark:text-[var(--sidebar-hover-fg-dark)]' : 'text-current'}
              style={{ fontSize: Math.max(10, Math.round(iconPx * 0.30)) }}
            />
          ) : (
            <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70" />
          )}
        </span>

        {!collapsed && (
          <span className={[labelClass, 'sidebar-label-cell flex items-center min-w-0 flex-1'].join(' ')}>
            <span className="ux-mixed-text">{item.name}</span>
          </span>
        )}

        {hasChildren && !collapsed && (
          <FontAwesomeIcon
            icon="fa-solid fa-chevron-down"
            className={[
              'sidebar-chevron text-[11px] opacity-70 transition-transform',
              isOpen ? 'rotate-180' : 'rotate-0',
            ].join(' ')}
          />
        )}

        {isActiveRow ? <span className="pointer-events-none absolute right-2 top-1/2 h-5 w-[2px] -translate-y-1/2 rounded-full bg-[var(--sidebar-hover-fg)] opacity-[var(--inkbar-opacity)] shadow-[0_0_14px_rgba(15,23,42,0.16)] dark:bg-[var(--sidebar-hover-fg-dark)] dark:shadow-[0_0_16px_rgba(255,255,255,0.12)]" /> : null}
      </div>
    );

    return (
      <li
        ref={(node) => { flyoutItemRefs.current[item.id] = node; }}
        data-flyout-count={item.children?.length ?? 0}
        className="relative"
        onMouseEnter={handleCollapsedEnter}
        onMouseLeave={handleCollapsedLeave}
      >
        {hasChildren ? (
          <button
            type="button"
            data-skip-global-button="true"
            onClick={onClick}
            onFocus={handleCollapsedEnter}
            className="w-full text-right"
            aria-expanded={collapsed ? showCollapsedFlyout : isOpen}
          >
            {content}
          </button>
        ) : (
          <NavLink to={item.path || '#'} onClick={onClick} className="sidebar-nav-link block">
            {content}
          </NavLink>
        )}

        {hasChildren && !collapsed && (
          <AnimatePresence initial={false}>
            {isOpen && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.18, ease: 'easeOut' }}
                className="sidebar-submenu-list mt-1 space-y-0.5 pr-2 overflow-hidden"
                data-sidebar-submenu="true"
              >
                {item.children!.map((child) => (
                  <Row key={child.id} item={child} depth={depth + 1} parentId={item.id} />
                ))}
              </motion.ul>
            )}
          </AnimatePresence>
        )}

        {showCollapsedFlyout && (
          <AnimatePresence>
            <SidebarFlyoutPanel
              item={item}
              flyoutLayout={flyoutLayout}
              badgeCount={badgeCount}
              getBadgeCount={getBadgeCount}
              onClose={onClose}
              onClearHoveredGroup={onClearHoveredGroup}
              onPointerEnter={onFlyoutPointerEnter}
              onPointerLeave={onFlyoutPointerLeave}
            />
          </AnimatePresence>
        )}
      </li>
    );
  };

  return (
    <ul
      className={[
        'ux-sidebar-list',
        style.sidebarVariant === 'pill'
          ? (collapsed ? 'space-y-1 pr-2 pl-2' : 'space-y-1 pr-2.5 pl-2')
          : (collapsed ? 'space-y-1 pr-2 pl-2' : 'space-y-1 pr-2.5 pl-2'),
      ].join(' ')}
    >
      {items.map((item) => (
        <Row key={item.id} item={item} depth={0} />
      ))}
    </ul>
  );
};
