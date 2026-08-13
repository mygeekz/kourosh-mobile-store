import React from 'react';
import type { LinkProps } from 'react-router-dom';
import { cn } from '../../utils/cn';
import Button from '../Button';
import ActionLink from './ActionLink';
import PortalLayer from './PortalLayer';
import type { ActionControlVariant } from './actionControlContract';
import type { RoleName } from '../../utils/rbac';

export type TableActionBase = {
  key: React.Key;
  label: string;
  icon: React.ReactNode;
  variant?: ActionControlVariant;
  disabled?: boolean;
  hidden?: boolean;
  tooltip?: string;
  requiredRoles?: RoleName[];
};

export type TableActionLinkItem = TableActionBase & {
  kind: 'link';
  to: LinkProps['to'];
  replace?: boolean;
  state?: unknown;
};

export type TableActionButtonItem = TableActionBase & {
  kind: 'button';
  onClick: () => void | Promise<void>;
  loading?: boolean;
};

export type TableActionItem = TableActionLinkItem | TableActionButtonItem;
export type TableActionCollapseBelow = 'sm' | 'md' | 'lg' | 'xl';

export type TableActionGroupProps = {
  actions: TableActionItem[];
  ariaLabel?: string;
  collapseBelow?: TableActionCollapseBelow;
  align?: 'start' | 'center' | 'end';
  className?: string;
};

const responsiveClassMap: Record<TableActionCollapseBelow, { inline: string; menu: string }> = {
  sm: { inline: 'hidden sm:flex', menu: 'sm:hidden' },
  md: { inline: 'hidden md:flex', menu: 'md:hidden' },
  lg: { inline: 'hidden lg:flex', menu: 'lg:hidden' },
  xl: { inline: 'hidden xl:flex', menu: 'xl:hidden' },
};

const alignClassMap = {
  start: 'justify-start',
  center: 'justify-center',
  end: 'justify-end',
} as const;

const inlineToneClassMap: Record<ActionControlVariant, string> = {
  primary: 'text-slate-700 hover:text-slate-950 dark:text-slate-200 dark:hover:text-white',
  success: 'text-emerald-600 hover:text-emerald-700 dark:text-emerald-300 dark:hover:text-emerald-200',
  secondary: 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100',
  danger: 'text-rose-600 hover:text-rose-700 dark:text-rose-300 dark:hover:text-rose-200',
  warning: 'text-amber-600 hover:text-amber-700 dark:text-amber-300 dark:hover:text-amber-200',
  ghost: 'text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-100',
  neutral: 'text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-slate-100',
};

const bareInlineControlClass = [
  'h-8 w-8 min-h-8 min-w-8 shrink-0 p-0',
  'rounded-none border-0 bg-transparent bg-none shadow-none',
  'transition-[color,transform,opacity] duration-150 hover:-translate-y-px',
  'focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-slate-400',
  'disabled:translate-y-0 disabled:opacity-40',
  '[&&]:!border-0 [&&]:!bg-none [&&]:!bg-transparent [&&]:!shadow-none',
  '[&&::before]:!bg-none [&&::before]:!bg-transparent [&&::before]:!shadow-none',
  '[&&::after]:!bg-none [&&::after]:!bg-transparent [&&::after]:!shadow-none',
].join(' ');

const MENU_WIDTH = 224;
const VIEWPORT_GUTTER = 10;
const MENU_GAP = 8;

const TableActionGroup: React.FC<TableActionGroupProps> = ({
  actions,
  ariaLabel = 'عملیات ردیف',
  collapseBelow = 'sm',
  align = 'center',
  className,
}) => {
  const visibleActions = React.useMemo(() => {
    const active = actions.filter((action) => !action.hidden);
    return [...active.filter((action) => action.variant !== 'danger'), ...active.filter((action) => action.variant === 'danger')];
  }, [actions]);
  const triggerRef = React.useRef<HTMLButtonElement | null>(null);
  const menuRef = React.useRef<HTMLDivElement | null>(null);
  const [open, setOpen] = React.useState(false);
  const [menuPosition, setMenuPosition] = React.useState({ top: 0, left: 0 });
  const responsiveClasses = responsiveClassMap[collapseBelow];

  const updatePosition = React.useCallback(() => {
    const trigger = triggerRef.current;
    if (!trigger || typeof window === 'undefined') return;
    const rect = trigger.getBoundingClientRect();
    const estimatedHeight = Math.max(72, visibleActions.length * 44 + 16);
    const belowTop = rect.bottom + MENU_GAP;
    const top = belowTop + estimatedHeight <= window.innerHeight - VIEWPORT_GUTTER
      ? belowTop
      : Math.max(VIEWPORT_GUTTER, rect.top - estimatedHeight - MENU_GAP);
    const preferredLeft = rect.right - MENU_WIDTH;
    const left = Math.min(
      Math.max(VIEWPORT_GUTTER, preferredLeft),
      Math.max(VIEWPORT_GUTTER, window.innerWidth - MENU_WIDTH - VIEWPORT_GUTTER),
    );
    setMenuPosition({ top, left });
  }, [visibleActions.length]);

  React.useLayoutEffect(() => {
    if (!open) return;
    updatePosition();
    const frame = window.requestAnimationFrame(() => {
      const firstAction = menuRef.current?.querySelector<HTMLElement>('a:not([aria-disabled="true"]), button:not(:disabled)');
      firstAction?.focus();
    });

    const handleViewportChange = () => updatePosition();
    const handlePointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && (menuRef.current?.contains(target) || triggerRef.current?.contains(target))) return;
      setOpen(false);
    };
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setOpen(false);
        triggerRef.current?.focus();
      }
    };

    window.addEventListener('resize', handleViewportChange);
    window.addEventListener('scroll', handleViewportChange, true);
    document.addEventListener('pointerdown', handlePointerDown);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      window.cancelAnimationFrame(frame);
      window.removeEventListener('resize', handleViewportChange);
      window.removeEventListener('scroll', handleViewportChange, true);
      document.removeEventListener('pointerdown', handlePointerDown);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [open, updatePosition]);

  React.useEffect(() => {
    if (visibleActions.length === 0) setOpen(false);
  }, [visibleActions.length]);

  if (visibleActions.length === 0) return null;

  const renderInlineAction = (action: TableActionItem) => {
    const commonProps = {
      variant: action.variant ?? 'secondary',
      size: 'tableIcon' as const,
      autoIcon: false,
      unstyled: true,
      leftIcon: action.icon,
      title: action.tooltip ?? action.label,
      tooltip: action.tooltip ?? action.label,
      'aria-label': action.label,
      'data-ui-table-action-control': 'true',
      disabled: action.disabled,
      className: cn(bareInlineControlClass, inlineToneClassMap[action.variant ?? 'secondary']),
    };

    if (action.kind === 'link') {
      return (
        <ActionLink
          key={action.key}
          {...commonProps}
          to={action.to}
          replace={action.replace}
          state={action.state}
        />
      );
    }

    return (
      <Button
        key={action.key}
        {...commonProps}
        type="button"
        loading={action.loading}
        requiredRoles={action.requiredRoles}
        ripple={false}
        onClick={() => void action.onClick()}
      />
    );
  };

  const renderMenuAction = (action: TableActionItem) => {
    const commonProps = {
      variant: action.variant ?? 'secondary',
      size: 'sm' as const,
      autoIcon: false,
      leftIcon: action.icon,
      title: action.tooltip ?? action.label,
      tooltip: action.tooltip ?? action.label,
      disabled: action.disabled,
      className: 'w-full justify-start',
      role: 'menuitem' as const,
    };

    if (action.kind === 'link') {
      return (
        <ActionLink
          key={action.key}
          {...commonProps}
          to={action.to}
          replace={action.replace}
          state={action.state}
          onClick={() => setOpen(false)}
        >
          {action.label}
        </ActionLink>
      );
    }

    return (
      <Button
        key={action.key}
        {...commonProps}
        type="button"
        loading={action.loading}
        requiredRoles={action.requiredRoles}
        onClick={() => {
          setOpen(false);
          void action.onClick();
        }}
      >
        {action.label}
      </Button>
    );
  };

  return (
    <div
      className={cn('relative inline-flex min-w-0 max-w-full overflow-visible', className)}
      data-ui-table-action-group="true"
      data-ui-table-actions="true"
      data-ui-collapse-below={collapseBelow}
      aria-label={ariaLabel}
    >
      <div
        className={cn('min-w-0 max-w-full flex-nowrap items-center gap-1', responsiveClasses.inline, alignClassMap[align])}
        data-ui-table-actions-inline="true"
      >
        {visibleActions.map(renderInlineAction)}
      </div>

      <div className={cn(responsiveClasses.menu, 'text-center')} data-ui-table-actions-menu="true">
        <Button
          ref={triggerRef}
          type="button"
          variant="neutral"
          size="tableIcon"
          unstyled
          autoIcon={false}
          ripple={false}
          aria-haspopup="menu"
          aria-expanded={open}
          aria-label={ariaLabel}
          data-ui-table-action-control="true"
          title={ariaLabel}
          className={cn(bareInlineControlClass, inlineToneClassMap.neutral)}
          leftIcon={<i className="fa-solid fa-ellipsis" aria-hidden="true" />}
          onClick={() => setOpen((value) => !value)}
        />
      </div>

      <PortalLayer
        isOpen={open}
        layer="popover"
        className="pointer-events-none fixed inset-0"
        attributes={{ 'data-ui-table-action-menu-layer': 'true' }}
      >
        <div
          ref={menuRef}
          role="menu"
          aria-label={ariaLabel}
          onKeyDown={(event) => {
            if (event.key !== 'ArrowDown' && event.key !== 'ArrowUp') return;
            event.preventDefault();
            const items = Array.from(menuRef.current?.querySelectorAll<HTMLElement>('a:not([aria-disabled="true"]), button:not(:disabled)') ?? []);
            if (!items.length) return;
            const currentIndex = items.indexOf(document.activeElement as HTMLElement);
            const direction = event.key === 'ArrowDown' ? 1 : -1;
            const nextIndex = currentIndex < 0
              ? 0
              : (currentIndex + direction + items.length) % items.length;
            items[nextIndex]?.focus();
          }}
          className="pointer-events-auto fixed grid gap-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_24px_70px_-34px_rgba(15,23,42,0.55)] dark:border-slate-700 dark:bg-slate-950"
          style={{ top: menuPosition.top, left: menuPosition.left, width: MENU_WIDTH }}
        >
          {visibleActions.map(renderMenuAction)}
        </div>
      </PortalLayer>
    </div>
  );
};

export default TableActionGroup;
