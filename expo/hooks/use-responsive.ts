import { useWindowDimensions } from 'react-native';

export const DESKTOP_BREAKPOINT = 900;

// On desktop the app content sits to the right of the fixed DesktopSidebar, so
// the space a grid actually has is the viewport minus the sidebar. Mobile has
// no sidebar. Keep in sync with constants/theme layout.sidebarWidth.
const SIDEBAR_WIDTH = 248;

export function useIsDesktop(): boolean {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT;
}

// Width available to page content (viewport minus the desktop sidebar).
export function useContentWidth(): number {
  const { width } = useWindowDimensions();
  return width >= DESKTOP_BREAKPOINT ? width - SIDEBAR_WIDTH : width;
}

interface GridColumnsOptions {
  maxColumns?: number;
  horizontalPadding?: number;
  gap?: number;
}

export function useGridColumns(itemMinWidth: number, options?: GridColumnsOptions): number {
  const contentWidth = useContentWidth();
  const { maxColumns = 6, horizontalPadding = 32, gap = 16 } = options ?? {};
  const available = contentWidth - horizontalPadding;
  const columns = Math.floor((available + gap) / (itemMinWidth + gap));
  return Math.min(Math.max(columns, 1), maxColumns);
}

// Like useGridColumns, but also returns a fixed pixel width per item. Use
// this (instead of flex:1 on the grid item) whenever a row can end up with
// fewer items than `columns` — e.g. 5 items at 4 columns — so the odd one
// out keeps the same size as the rest instead of stretching to fill the row.
export function useGridLayout(itemMinWidth: number, options?: GridColumnsOptions): { columns: number; itemWidth: number } {
  const contentWidth = useContentWidth();
  const { maxColumns = 6, horizontalPadding = 32, gap = 16 } = options ?? {};
  const available = contentWidth - horizontalPadding;
  const rawColumns = Math.floor((available + gap) / (itemMinWidth + gap));
  const columns = Math.min(Math.max(rawColumns, 1), maxColumns);
  const itemWidth = (available - gap * (columns - 1)) / columns;
  return { columns, itemWidth };
}
