import { useWindowDimensions } from 'react-native';

export const DESKTOP_BREAKPOINT = 900;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT;
}

interface GridColumnsOptions {
  maxColumns?: number;
  horizontalPadding?: number;
  gap?: number;
}

export function useGridColumns(itemMinWidth: number, options?: GridColumnsOptions): number {
  const { width } = useWindowDimensions();
  const { maxColumns = 6, horizontalPadding = 32, gap = 16 } = options ?? {};
  const available = width - horizontalPadding;
  const columns = Math.floor((available + gap) / (itemMinWidth + gap));
  return Math.min(Math.max(columns, 1), maxColumns);
}

// Like useGridColumns, but also returns a fixed pixel width per item. Use
// this (instead of flex:1 on the grid item) whenever a row can end up with
// fewer items than `columns` — e.g. 5 items at 4 columns — so the odd one
// out keeps the same size as the rest instead of stretching to fill the row.
export function useGridLayout(itemMinWidth: number, options?: GridColumnsOptions): { columns: number; itemWidth: number } {
  const { width } = useWindowDimensions();
  const { maxColumns = 6, horizontalPadding = 32, gap = 16 } = options ?? {};
  const available = width - horizontalPadding;
  const rawColumns = Math.floor((available + gap) / (itemMinWidth + gap));
  const columns = Math.min(Math.max(rawColumns, 1), maxColumns);
  const itemWidth = (available - gap * (columns - 1)) / columns;
  return { columns, itemWidth };
}
