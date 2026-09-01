import { useMemo } from "react";

import type { Theme } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

// Bridge between the theme object (only available at render time via a hook)
// and RN's StyleSheet.create (normally called once at module scope). Define a
// `makeStyles = (t: Theme) => StyleSheet.create({ ... })` factory at module
// scope, then inside the component:
//
//   const styles = useThemedStyles(makeStyles);
//
// The result is memoised per theme, so it only recomputes when the scheme flips.
export function useThemedStyles<T>(factory: (theme: Theme) => T): T {
  const { theme } = useTheme();
  return useMemo(() => factory(theme), [factory, theme]);
}
