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
