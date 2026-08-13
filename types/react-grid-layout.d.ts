declare module 'react-grid-layout' {
  export type Layout = {
    i: string;
    x: number;
    y: number;
    w: number;
    h: number;
    minW?: number;
    maxW?: number;
    minH?: number;
    maxH?: number;
    static?: boolean;
    isDraggable?: boolean;
    isResizable?: boolean;
    moved?: boolean;
  };

  export const Responsive: any;
  export function WidthProvider<T>(component: T): T;
}
