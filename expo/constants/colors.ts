// DEPRECATED compatibility shim.
//
// The design system now lives in `constants/theme/` and is consumed at render
// time via `useTheme()` (see hooks/use-theme.ts) so it can respond to dark mode.
// This file maps the old flat `Colors.*` keys onto the new *light* semantic
// token values so screens that haven't been migrated yet keep compiling and
// render a coherent light theme. It is deleted once every importer is migrated.
//
// Values are hard-copied from constants/theme (light scheme) on purpose — this
// file stays import-free so it can't participate in a require cycle.
// Do NOT add new keys here. New code: `const { theme } = useTheme()`.

const Colors = {
  primary: "#D6482F", // theme.accent (light)
  primaryLight: "#FBEDE9", // theme.accentSubtle
  secondary: "#D6482F", // theme.accent
  accent: "#57554F", // theme.textSecondary
  background: "#FFFFFF", // theme.bg
  card: "#FFFFFF", // theme.surface
  cardBackground: "#FFFFFF",
  cardSecondary: "#F4F4F2", // theme.surfaceSunken
  text: "#1B1A18", // theme.textPrimary
  textLight: "#57554F", // theme.textSecondary
  textSecondary: "#57554F",
  border: "#E8E7E4", // theme.border
  error: "#C0392F", // theme.danger
  success: "#2F855A", // theme.success
  favorite: "#D6482F",
  star: "#E0A100", // theme.star
  rating: "#E0A100",
  // Fridge category dots — kept distinct until IngredientItem is migrated.
  purple: "#A78BFA",
  orange: "#E0A100",
  green: "#2F855A",
  blue: "#57554F",
  white: "#FFFFFF",
  gradientStart: "#FFDEE2",
  gradientEnd: "#D0F4FF",
  tabBarTint: "#FFFFFF",
} as const;

export default Colors;
