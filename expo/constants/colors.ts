// DEPRECATED compatibility shim.
//
// The design system now lives in `constants/theme/` and is consumed at render
// time via `useTheme()` (see hooks/use-theme.ts) so it can respond to dark mode.
// This file maps the old flat `Colors.*` keys onto the new *light* semantic
// tokens so screens that haven't been migrated yet keep compiling and render a
// coherent light theme. It is removed once every importer is migrated.
//
// Do NOT add new keys here. New code: `const { theme } = useTheme()`.

import { lightTokens } from "@/constants/theme";

const t = lightTokens;

const Colors = {
  primary: t.accent,
  primaryLight: t.accentSubtle,
  secondary: t.accent,
  accent: t.textSecondary,
  background: t.bg,
  card: t.surface,
  cardBackground: t.surface,
  cardSecondary: t.surfaceSunken,
  text: t.textPrimary,
  textLight: t.textSecondary,
  textSecondary: t.textSecondary,
  border: t.border,
  error: t.danger,
  success: t.success,
  favorite: t.accent,
  star: t.star,
  rating: t.star,
  // Fridge category dots — kept distinct until IngredientItem is migrated.
  purple: "#A78BFA",
  orange: t.star,
  green: t.success,
  blue: t.textSecondary,
  white: "#FFFFFF",
  gradientStart: "#FFDEE2",
  gradientEnd: "#D0F4FF",
  tabBarTint: t.surface,
} as const;

export default Colors;
