import React from 'react';
import { useSearchParams } from 'react-router-dom';

import Dashboard from '../Dashboard';
import { STANDARD_STYLE_PALETTE_KEYS, type StandardStylePalette } from '../../config/stylePalettes';
import { useStyle } from '../../hooks/useStyle';

type RuntimeTheme = 'light' | 'dark';

const isPalette = (value: string | null): value is StandardStylePalette =>
  Boolean(value && STANDARD_STYLE_PALETTE_KEYS.includes(value as StandardStylePalette));
const isTheme = (value: string | null): value is RuntimeTheme => value === 'light' || value === 'dark';

/**
 * Browser-only QA route. It renders the real Dashboard component and its real
 * DashboardWidgetHeader/DashboardMetric consumers. The route is excluded from
 * normal builds unless VITE_DASHBOARD_VISUAL_QA=1 is supplied by the matrix runner.
 */
const DashboardRuntimeVisualMatrix: React.FC = () => {
  const [searchParams] = useSearchParams();
  const { style, setMany } = useStyle();
  const paletteParam = searchParams.get('palette');
  const themeParam = searchParams.get('theme');
  const palette: StandardStylePalette = isPalette(paletteParam) ? paletteParam : 'aurora';
  const theme: RuntimeTheme = isTheme(themeParam) ? themeParam : 'light';
  const [ready, setReady] = React.useState(false);

  React.useLayoutEffect(() => {
    setReady(false);
    setMany({
      palette,
      theme,
      reducedMotion: true,
      highContrast: false,
      uiDensity: 'compact',
    });
  }, [palette, setMany, theme]);

  React.useEffect(() => {
    let cancelled = false;
    let frame = 0;
    let attempts = 0;

    const inspect = () => {
      if (cancelled) return;
      attempts += 1;
      const root = document.querySelector('[data-ui-dashboard-page="home"]');
      const risk = Array.from(document.querySelectorAll('.app-dashboard-widget-header__title'))
        .some((node) => node.textContent?.trim() === 'کنترل اعتبار مشتریان');
      const executive = Array.from(document.querySelectorAll('.app-dashboard-widget-header__title'))
        .some((node) => node.textContent?.trim() === 'شروع روز مدیر');
      const attributesReady = document.documentElement.dataset.palette === palette
        && document.documentElement.dataset.theme === theme
        && style.palette === palette
        && style.theme === theme;

      if (root && risk && executive && attributesReady) {
        frame = window.requestAnimationFrame(() => {
          frame = window.requestAnimationFrame(() => {
            if (!cancelled) setReady(true);
          });
        });
        return;
      }

      if (attempts < 180) frame = window.requestAnimationFrame(inspect);
    };

    frame = window.requestAnimationFrame(inspect);
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frame);
    };
  }, [palette, style.palette, style.theme, theme]);

  return (
    <div
      data-qa-dashboard-runtime-matrix="real-dashboard"
      data-qa-ready={ready ? 'true' : 'false'}
      data-qa-palette={palette}
      data-qa-theme={theme}
    >
      <Dashboard />
    </div>
  );
};

export default DashboardRuntimeVisualMatrix;
