// Semantic color tokens, resolved per color scheme. Screens consume these via
// useTheme() — never palette.ts directly.

import { accent, functional, metalPalette, neutral } from "./palette";

export type Scheme = "light" | "dark";

export type ColorTokens = {
  // Backgrounds / surfaces
  bg: string;
  bgSubtle: string;
  surface: string;
  surfaceRaised: string;
  surfaceSunken: string;
  // Lines
  border: string;
  borderStrong: string;
  // Text
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
  textOnAccent: string;
  // Accent
  accent: string;
  accentHover: string;
  accentSubtle: string;
  // Status
  success: string;
  successSubtle: string;
  warning: string;
  warningSubtle: string;
  danger: string;
  dangerSubtle: string;
  // Misc
  star: string;
  focusRing: string;
  overlay: string;
  // Achievement medals
  metal: { gold: string; silver: string; bronze: string; steel: string };
};

const light: ColorTokens = {
  bg: neutral[0],
  bgSubtle: neutral[50],
  surface: neutral[0],
  surfaceRaised: neutral[0],
  surfaceSunken: neutral[100],
  border: neutral[200],
  borderStrong: neutral[300],
  textPrimary: neutral[900],
  textSecondary: neutral[600],
  textMuted: neutral[400],
  textOnAccent: "#FFFFFF",
  accent: accent.light,
  accentHover: accent.lightHover,
  accentSubtle: accent.lightSubtle,
  success: functional.successLight,
  successSubtle: functional.successSubtleLight,
  warning: functional.warningLight,
  warningSubtle: functional.warningSubtleLight,
  danger: functional.dangerLight,
  dangerSubtle: functional.dangerSubtleLight,
  star: functional.starLight,
  focusRing: accent.light,
  overlay: "rgba(20, 17, 16, 0.45)",
  metal: metalPalette.light,
};

const dark: ColorTokens = {
  bg: neutral[950],
  bgSubtle: neutral[900],
  surface: "#201E1C",
  surfaceRaised: "#2A2926",
  surfaceSunken: "#171614",
  border: "#322F2C",
  borderStrong: "#423E3A",
  textPrimary: "#F5F4F1",
  textSecondary: "#B5B2AC",
  textMuted: neutral[500],
  textOnAccent: "#FFFFFF",
  accent: accent.dark,
  accentHover: accent.darkHover,
  accentSubtle: accent.darkSubtle,
  success: functional.successDark,
  successSubtle: functional.successSubtleDark,
  warning: functional.warningDark,
  warningSubtle: functional.warningSubtleDark,
  danger: functional.dangerDark,
  dangerSubtle: functional.dangerSubtleDark,
  star: functional.starDark,
  focusRing: accent.dark,
  overlay: "rgba(0, 0, 0, 0.6)",
  metal: metalPalette.dark,
};

export function buildTokens(scheme: Scheme): ColorTokens {
  return scheme === "dark" ? dark : light;
}

export const lightTokens = light;
export const darkTokens = dark;
