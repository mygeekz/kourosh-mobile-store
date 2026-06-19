// utils/installRootSearchSurfaceContract.ts
// Stage 92: safe module version of the DOM-backed search contract.
// This keeps index.tsx valid and only exposes a normal function import.

export const installRootSearchSurfaceContract = (): void => {
  if (typeof document === 'undefined') return;

  const surfaceStyles: Array<[string, string]> = [
    ['direction', 'ltr'],
    ['display', 'grid'],
    ['grid-template-columns', '2.15rem minmax(0, 1fr)'],
    ['align-items', 'center'],
    ['gap', '.35rem'],
    ['min-width', '0'],
    ['border-radius', '18px'],
    ['border', '1px solid rgba(226, 232, 240, .95)'],
    ['background', '#fff'],
    ['padding', '.22rem .45rem .22rem .55rem'],
    ['box-shadow', '0 12px 24px -22px rgba(15,23,42,.24)'],
    ['overflow', 'hidden'],
  ];

  const inputStyles: Array<[string, string]> = [
    ['all', 'unset'],
    ['box-sizing', 'border-box'],
    ['grid-column', '2'],
    ['display', 'block'],
    ['min-width', '0'],
    ['width', '100%'],
    ['height', '38px'],
    ['line-height', '38px'],
    ['direction', 'rtl'],
    ['text-align', 'right'],
    ['color', 'rgb(15 23 42)'],
    ['font-family', 'var(--font-sans), Tahoma, system-ui, sans-serif'],
    ['font-size', '.82rem'],
    ['font-weight', '700'],
    ['background', 'transparent'],
    ['background-color', 'transparent'],
    ['border', '0'],
    ['border-radius', '0'],
    ['outline', '0'],
    ['box-shadow', 'none'],
    ['padding', '0 .35rem'],
    ['white-space', 'nowrap'],
    ['overflow', 'hidden'],
    ['text-overflow', 'ellipsis'],
    ['appearance', 'none'],
    ['-webkit-appearance', 'none'],
    ['--tw-ring-offset-width', '0px'],
    ['--tw-ring-color', 'transparent'],
    ['--tw-ring-shadow', '0 0 #0000'],
    ['--tw-shadow', '0 0 #0000'],
    ['--tw-shadow-colored', '0 0 #0000'],
  ];

  const iconStyles: Array<[string, string]> = [
    ['grid-column', '1'],
    ['position', 'static'],
    ['inset', 'auto'],
    ['transform', 'none'],
    ['width', '2rem'],
    ['height', '2rem'],
    ['display', 'grid'],
    ['place-items', 'center'],
    ['color', 'rgb(100 116 139)'],
    ['background', 'transparent'],
    ['border', '0'],
    ['box-shadow', 'none'],
    ['pointer-events', 'none'],
  ];

  const applyStyles = (el: HTMLElement, styles: Array<[string, string]>): void => {
    styles.forEach(([key, value]) => el.style.setProperty(key, value, 'important'));
  };

  const apply = (): void => {
    document.querySelectorAll<HTMLElement>('[data-root-search-surface="true"]').forEach((surface) => {
      applyStyles(surface, surfaceStyles);
      const icon = surface.querySelector<HTMLElement>('i.fa-magnifying-glass, .fa-magnifying-glass, [class*="search-icon"], [class*="__icon"]');
      if (icon) {
        const iconHost = icon.parentElement && icon.parentElement !== surface ? (icon.parentElement as HTMLElement) : icon;
        applyStyles(iconHost, iconStyles);
      }
    });

    document.querySelectorAll<HTMLInputElement>('input[data-root-search-input="true"]').forEach((input) => {
      applyStyles(input, inputStyles);
    });
  };

  apply();

  ['focus', 'input', 'mousedown', 'mouseup', 'keydown'].forEach((eventName) => {
    window.addEventListener(eventName, apply, true);
  });

  new MutationObserver(apply).observe(document.documentElement, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ['class', 'style'],
  });
};
