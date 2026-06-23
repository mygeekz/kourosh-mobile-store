import { useLayoutEffect, type RefObject } from 'react';

const sidebarSearchImportantStyles: Array<[string, string]> = [
  ['all', 'unset'],
  ['box-sizing', 'border-box'],
  ['display', 'block'],
  ['min-width', '0'],
  ['width', '100%'],
  ['height', 'var(--sidebar-search-h)'],
  ['line-height', 'var(--sidebar-search-h)'],
  ['background', 'transparent'],
  ['background-color', 'transparent'],
  ['border', '0'],
  ['border-radius', '0'],
  ['outline', '0'],
  ['box-shadow', 'none'],
  ['appearance', 'none'],
  ['-webkit-appearance', 'none'],
  ['color', 'inherit'],
  ['font', 'inherit'],
  ['font-size', '.78rem'],
  ['font-weight', '650'],
  ['direction', 'rtl'],
  ['text-align', 'right'],
  ['padding', '0 .55rem 0 .15rem'],
  ['white-space', 'nowrap'],
  ['overflow', 'hidden'],
  ['text-overflow', 'ellipsis'],
  ['-webkit-box-shadow', 'none'],
  ['--tw-ring-offset-width', '0px'],
  ['--tw-ring-offset-color', 'transparent'],
  ['--tw-ring-color', 'transparent'],
  ['--tw-ring-shadow', '0 0 #0000'],
  ['--tw-shadow', '0 0 #0000'],
  ['--tw-shadow-colored', '0 0 #0000'],
];

export const useSidebarSearchReset = (inputRef: RefObject<HTMLInputElement | null>): void => {
  useLayoutEffect(() => {
    const input = inputRef.current;
    if (!input) return;

    const apply = () => {
      sidebarSearchImportantStyles.forEach(([key, value]) => input.style.setProperty(key, value, 'important'));
    };

    apply();

    const events: Array<keyof HTMLElementEventMap> = ['focus', 'blur', 'input', 'change', 'mousedown', 'mouseup', 'keydown', 'keyup'];
    events.forEach((eventName) => input.addEventListener(eventName, apply));
    return () => events.forEach((eventName) => input.removeEventListener(eventName, apply));
  }, [inputRef]);
};
