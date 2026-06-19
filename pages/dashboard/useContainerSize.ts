import { useEffect, useRef, useState } from 'react';

export type ContainerSize = { width: number; height: number };

/**
 * Observe the size of an element (useful for responsive widgets inside a resizable dashboard).
 */
export function useContainerSize<T extends HTMLElement>(): [React.RefObject<T>, ContainerSize] {
  const ref = useRef<T>(null);
  const [size, setSize] = useState<ContainerSize>({ width: 0, height: 0 });

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    const update = (w: number, h: number) => setSize({ width: w, height: h });

    // Initial size
    const r = el.getBoundingClientRect();
    update(r.width, r.height);

    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const cr = entry?.contentRect;
      if (!cr) return;
      update(cr.width, cr.height);
    });

    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  return [ref, size];
}
