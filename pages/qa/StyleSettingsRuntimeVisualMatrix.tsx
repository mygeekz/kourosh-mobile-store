import React from 'react';
import { useSearchParams } from 'react-router-dom';

import StyleSettings from '../settings/StyleSettings';
import { STANDARD_STYLE_PALETTE_KEYS, type StandardStylePalette } from '../../config/stylePalettes';
import { useStyle } from '../../hooks/useStyle';

type RuntimeTheme = 'light' | 'dark';

const isPalette = (value: string | null): value is StandardStylePalette =>
  Boolean(value && STANDARD_STYLE_PALETTE_KEYS.includes(value as StandardStylePalette));
const isTheme = (value: string | null): value is RuntimeTheme => value === 'light' || value === 'dark';

/**
 * Browser-only QA route. It renders the real Settings > Style component inside
 * the canonical settings shell. Normal builds do not expose this route unless
 * VITE_STYLE_VISUAL_QA=1 is supplied by the visual matrix runner.
 */
const StyleSettingsRuntimeVisualMatrix: React.FC = () => {
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
      const root = document.querySelector('[data-ui-style-control-center="true"]');
      const hoverTarget = document.querySelector('[data-qa-style-hover-target="secondary"]');
      const selectedPalette = document.querySelector(`.style-palette-choice[data-palette-choice="${palette}"][aria-pressed="true"]`);
      const attributesReady = document.documentElement.dataset.palette === palette
        && document.documentElement.dataset.theme === theme
        && style.palette === palette
        && style.theme === theme;

      if (root && hoverTarget && selectedPalette && attributesReady) {
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
    <main
      className="settings-shell-page min-h-screen p-3 sm:p-5"
      data-qa-style-runtime-matrix="real-style-settings"
      data-qa-ready={ready ? 'true' : 'false'}
      data-qa-palette={palette}
      data-qa-theme={theme}
    >
      <div className="settings-shell" data-ui-settings-shell="true">
        <section
          className="settings-workspace"
          data-ui-settings-workspace="true"
          data-settings-active-tab="style"
        >
          <div className="settings-panel-frame" data-ui-settings-panel-frame="true">
            <StyleSettings />
          </div>
        </section>
      </div>
    </main>
  );
};

export default StyleSettingsRuntimeVisualMatrix;
