import type { ReactNode } from 'react';
import { useContainerSize } from './useContainerSize';

type FixedWidgetFrameProps = {
  children: (container: { width: number; height: number }) => ReactNode;
};

/**
 * Canonical host for fixed operational dashboard widgets.
 * It is the only owner of the visible outer surface.
 */
export default function FixedWidgetFrame({ children }: FixedWidgetFrameProps) {
  const [ref, size] = useContainerSize<HTMLDivElement>();

  return (
    <section ref={ref} dir="rtl" data-ui-dashboard-fixed-frame="true" className="app-dashboard-widget-frame">
      <div data-ui-dashboard-fixed-content="true" className="app-dashboard-widget-frame__content">
        {children({
          width: Math.max(0, size.width),
          height: Math.max(0, size.height),
        })}
      </div>
    </section>
  );
}
