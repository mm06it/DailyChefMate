// Public entry point for the design system.
//
//   import { useTheme } from "@/hooks/use-theme";
//   import type { Theme } from "@/constants/theme";
//
//   const styles = useThemedStyles(makeStyles);
//   const makeStyles = (t: Theme) => StyleSheet.create({ ... });

import { border, elevation, font, layout, radius, space, type } from "./scales";
import { buildTokens } from "./tokens";
import type { ColorTokens, Scheme } from "./tokens";

export { buildTokens, lightTokens, darkTokens } from "./tokens";
export type { ColorTokens, Scheme } from "./tokens";
export { space, radius, border, elevation, type, font, layout } from "./scales";
export type { ShadowToken, TypeToken } from "./scales";

// The full object handed to components by useTheme(): every semantic color for
// the active scheme, plus the scheme-independent scales, plus the resolved
// elevation set and a `scheme` discriminant.
export type Theme = ColorTokens & {
  scheme: Scheme;
  space: typeof space;
  radius: typeof radius;
  // `borderWidth`, not `border` — `border` is already a semantic color token.
  borderWidth: typeof border;
  type: typeof type;
  font: typeof font;
  layout: typeof layout;
  elevation: (typeof elevation)["light"];
};

export function makeTheme(scheme: Scheme): Theme {
  return {
    ...buildTokens(scheme),
    scheme,
    space,
    radius,
    borderWidth: border,
    type,
    font,
    layout,
    elevation: elevation[scheme],
  };
}
