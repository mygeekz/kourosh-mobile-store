import React from 'react';
import { NavLink, useNavigate } from 'react-router-dom';

import type { NavItem } from '../../types';
import { SIDEBAR_NAV_SECTIONS } from '../../config/ui/sidebar-sections';
import { FontAwesomeIcon } from '@/components/ui';
import { isExactRouteActive, isItemActive } from './sidebarNavUtils';
import type { StyleQualityBadgeBreakdown } from './useSidebarBadges';

interface SidebarNavTreeProps {
  items: NavItem[];
  pathname: string;
  openGroups: Record<string, boolean>;
  onToggleGroup: (id: string, parentId?: string) => void;
  onClose?: () => void;
  getBadgeCount: (item: NavItem) => number;
  styleQualityBadges: StyleQualityBadgeBreakdown;
  expandSections?: boolean;
}

interface SidebarNavRowProps {
  item: NavItem;
  depth: number;
  parentId?: string;
}

export const SidebarNavTree: React.FC<SidebarNavTreeProps> = ({
  items,
  pathname,
  openGroups,
  onToggleGroup,
  onClose,
  getBadgeCount,
  styleQualityBadges,
  expandSections = false,
}) => {
  const navigate = useNavigate();
  const [openSections, setOpenSections] = React.useState<Record<string, boolean>>(() =>
    Object.fromEntries(SIDEBAR_NAV_SECTIONS.map((section) => [section.id, true])),
  );

  const groupedSections = React.useMemo(() => {
    const itemById = new Map(items.map((item) => [item.id, item]));
    const configuredIds = new Set<string>();

    const configured = SIDEBAR_NAV_SECTIONS.map((section) => {
      const sectionItems = section.itemIds
        .map((itemId) => {
          configuredIds.add(itemId);
          return itemById.get(itemId);
        })
        .filter(Boolean) as NavItem[];
      return { ...section, items: sectionItems };
    }).filter((section) => section.items.length > 0);

    const unassigned = items.filter((item) => !configuredIds.has(item.id));
    return unassigned.length > 0
      ? [...configured, { id: 'other', label: 'سایر', itemIds: unassigned.map((item) => item.id), items: unassigned }]
      : configured;
  }, [items]);

  React.useEffect(() => {
    const activeSection = groupedSections.find((section) =>
      section.items.some((item) => isItemActive(pathname, item)),
    );
    if (!activeSection) return;
    setOpenSections((current) => current[activeSection.id] === false
      ? { ...current, [activeSection.id]: true }
      : current);
  }, [groupedSections, pathname]);

  const Row: React.FC<SidebarNavRowProps> = ({ item, depth, parentId }) => {
    const branchActive = isItemActive(pathname, item);
    const routeActive = isExactRouteActive(pathname, item);
    const hasChildren = Boolean(item.children?.length);
    const isOpen = Boolean(openGroups[item.id]);
    const badgeCount = getBadgeCount(item);
    const isStyleQualityItem = item.id === 'settings-style';
    const showStyleBreakdown = isStyleQualityItem && styleQualityBadges.total > 0;
    const styleQualityTooltip = showStyleBreakdown
      ? `کنترل کیفیت استایل — داشبورد: ${styleQualityBadges.dashboard.toLocaleString('fa-IR')} خطا؛ دکمه‌های Loading: ${styleQualityBadges.loadingButton.toLocaleString('fa-IR')} خطا؛ نصب PWA: ${styleQualityBadges.pwaPlatformInstall.toLocaleString('fa-IR')} خطا`
      : undefined;

    const handleGroupClick = () => {
      onToggleGroup(item.id, parentId);
      if (item.path) navigate(item.path);
    };

    const rowActive = routeActive || branchActive;
    const rowClassName = [
      'app-sidebar-row group',
      depth === 0 ? 'px-2.5' : '',
      rowActive ? 'text-slate-950 dark:text-slate-100' : '',
    ].filter(Boolean).join(' ');

    const content = (
      <>
        <span
          className={[
            'app-sidebar-row__icon transition-opacity',
            rowActive ? 'opacity-100' : 'opacity-70 group-hover:opacity-100',
          ].join(' ')}
          aria-hidden="true"
        >
          <FontAwesomeIcon icon={item.icon || 'fa-solid fa-circle'} />
        </span>
        <span className="app-sidebar-row__label">{item.name}</span>
        {showStyleBreakdown ? (
          <span
            className="app-sidebar-row__badge-group"
            aria-label={`${styleQualityBadges.total.toLocaleString('fa-IR')} خطای کنترل کیفیت استایل`}
          >
            {styleQualityBadges.dashboard > 0 ? (
              <span className="app-sidebar-row__badge app-sidebar-row__badge--dashboard" aria-label="خطاهای ماتریس داشبورد">
                <i className="fa-solid fa-chart-line" aria-hidden="true" />
                {styleQualityBadges.dashboard > 99 ? '۹۹+' : styleQualityBadges.dashboard.toLocaleString('fa-IR')}
              </span>
            ) : null}
            {styleQualityBadges.loadingButton > 0 ? (
              <span className="app-sidebar-row__badge app-sidebar-row__badge--loading" aria-label="خطاهای ماتریس دکمه‌های Loading">
                <i className="fa-solid fa-spinner" aria-hidden="true" />
                {styleQualityBadges.loadingButton > 99 ? '۹۹+' : styleQualityBadges.loadingButton.toLocaleString('fa-IR')}
              </span>
            ) : null}
            {styleQualityBadges.pwaPlatformInstall > 0 ? (
              <span className="app-sidebar-row__badge app-sidebar-row__badge--pwa" aria-label="خطاهای ماتریس نصب PWA">
                <i className="fa-solid fa-display" aria-hidden="true" />
                {styleQualityBadges.pwaPlatformInstall > 99 ? '۹۹+' : styleQualityBadges.pwaPlatformInstall.toLocaleString('fa-IR')}
              </span>
            ) : null}
          </span>
        ) : badgeCount > 0 ? (
          <span className="app-sidebar-row__badge" aria-label={`${badgeCount.toLocaleString('fa-IR')} مورد`}>
            {badgeCount > 99 ? '۹۹+' : badgeCount.toLocaleString('fa-IR')}
          </span>
        ) : hasChildren ? (
          <FontAwesomeIcon
            icon="fa-solid fa-chevron-down"
            className="app-sidebar-row__chevron"
            data-open={isOpen ? 'true' : 'false'}
          />
        ) : (
          <span className="app-sidebar-row__end" aria-hidden="true" />
        )}
      </>
    );

    return (
      <li className="app-sidebar-menu__item" data-depth={depth}>
        {hasChildren ? (
          <button
            type="button"
            data-skip-global-button="true"
            className={rowClassName}
            data-depth={depth}
            data-branch-active={branchActive ? 'true' : 'false'}
            data-open={isOpen ? 'true' : 'false'}
            onClick={handleGroupClick}
            aria-expanded={isOpen}
            data-tooltip={styleQualityTooltip}
          >
            {content}
          </button>
        ) : (
          <NavLink
            to={item.path || '#'}
            onClick={onClose}
            className={rowClassName}
            data-depth={depth}
            data-active={routeActive ? 'true' : 'false'}
            aria-current={routeActive ? 'page' : undefined}
            data-tooltip={styleQualityTooltip}
          >
            {content}
          </NavLink>
        )}

        {hasChildren && isOpen ? (
          <ul className="app-sidebar-submenu" data-depth={depth + 1}>
            {item.children!.map((child) => (
              <Row key={child.id} item={child} depth={depth + 1} parentId={item.id} />
            ))}
          </ul>
        ) : null}
      </li>
    );
  };

  return (
    <nav className="app-sidebar-navigation" aria-label="منوی بخش‌ها">
      {groupedSections.map((section, sectionIndex) => {
        const isOpen = expandSections || openSections[section.id] !== false;
        const sectionActive = section.items.some((item) => isItemActive(pathname, item));
        const headingId = `sidebar-section-${section.id}-title`;
        const menuId = `sidebar-section-${section.id}-menu`;

        return (
          <section
            key={section.id}
            data-sidebar-section={section.id}
            data-sidebar-section-active={sectionActive ? 'true' : 'false'}
            className={sectionIndex === 0 ? undefined : 'mt-4 pt-1'}
            aria-labelledby={headingId}
          >
            <button
              type="button"
              data-skip-global-button="true"
              data-sidebar-section-toggle={section.id}
              className={[
                'app-sidebar-section-heading group w-full cursor-pointer border-0 bg-transparent px-2 text-right transition-colors shadow-none',
                'hover:text-slate-700 dark:hover:text-slate-200',
                sectionActive ? 'text-slate-950 dark:text-slate-100' : '',
              ].filter(Boolean).join(' ')}
              onClick={() => setOpenSections((current) => ({
                ...current,
                [section.id]: !(current[section.id] !== false),
              }))}
              aria-expanded={isOpen}
              aria-controls={menuId}
            >
              <span
                id={headingId}
                className={[
                  'app-sidebar-section-heading__label transition-colors',
                  sectionActive ? 'text-slate-950 dark:text-slate-100' : '',
                ].filter(Boolean).join(' ')}
              >
                {section.label}
              </span>
              <FontAwesomeIcon
                icon="fa-solid fa-chevron-down"
                className="app-sidebar-row__chevron opacity-60 transition-opacity group-hover:opacity-100"
                data-open={isOpen ? 'true' : 'false'}
              />
            </button>

            {isOpen ? (
              <ul id={menuId} className="app-sidebar-menu mt-1">
                {section.items.map((item) => (
                  <Row key={item.id} item={item} depth={0} />
                ))}
              </ul>
            ) : null}
          </section>
        );
      })}
    </nav>
  );
};
