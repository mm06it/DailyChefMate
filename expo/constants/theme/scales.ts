// Scheme-independent scales: spacing, radius, borders, elevation, typography,
// layout. These never change between light and dark.

import { Platform } from "react-native";

// 4-based spacing scale, addressed by index. Body rhythm = space[5] (16).
export const space = {
  0: 0,
  1: 2,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  8: 32,
  9: 40,
  10: 48,
  11: 64,
  12: 80,
} as const;

export const radius = {
  xs: 4,
  sm: 8,
  md: 12,
  lg: 16,
  xl: 24,
  pill: 999,
} as const;

export const border = {
  hairline: 1,
  thick: 1.5,
} as const;

export type ShadowToken = {
  shadowColor: string;
  shadowOffset: { width: number; height: number };
  shadowOpacity: number;
  shadowRadius: number;
  elevation: number;
};

type ElevationSet = {
  none: ShadowToken;
  sm: ShadowToken;
  md: ShadowToken;
  lg: ShadowToken;
};

const none: ShadowToken = {
  shadowColor: "#000000",
  shadowOffset: { width: 0, height: 0 },
  shadowOpacity: 0,
  shadowRadius: 0,
  elevation: 0,
};

// Subtle, neutral shadows only — no colored glows. Dark mode leans on borders
// and surface lightness for separation, so its shadows are near-black and a
// little stronger only to hint depth on modals/popovers.
export const elevation: { light: ElevationSet; dark: ElevationSet } = {
  light: {
    none,
    sm: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.08,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.12,
      shadowRadius: 32,
      elevation: 8,
    },
  },
  dark: {
    none,
    sm: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.3,
      shadowRadius: 3,
      elevation: 1,
    },
    md: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.4,
      shadowRadius: 12,
      elevation: 3,
    },
    lg: {
      shadowColor: "#000000",
      shadowOffset: { width: 0, height: 12 },
      shadowOpacity: 0.5,
      shadowRadius: 32,
      elevation: 8,
    },
  },
};

// PostScript names from @expo-google-fonts/*. `system` is the fallback used
// until fonts load and on any platform where a face is missing.
const systemStack = Platform.select({
  ios: "System",
  android: "sans-serif",
  default:
    'system-ui, -apple-system, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
}) as string;

export const font = {
  display: "SpaceGrotesk_600SemiBold",
  displayBold: "SpaceGrotesk_700Bold",
  body: "Inter_400Regular",
  bodyMedium: "Inter_500Medium",
  bodySemibold: "Inter_600SemiBold",
  bodyBold: "Inter_700Bold",
  system: systemStack,
} as const;

export type TypeToken = {
  fontFamily: string;
  fontSize: number;
  lineHeight: number;
  letterSpacing: number;
};

export const type: Record<
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "body"
  | "bodySm"
  | "label"
  | "caption",
  TypeToken
> = {
  display: { fontFamily: font.display, fontSize: 32, lineHeight: 38, letterSpacing: -0.5 },
  h1: { fontFamily: font.display, fontSize: 26, lineHeight: 32, letterSpacing: -0.3 },
  h2: { fontFamily: font.display, fontSize: 21, lineHeight: 28, letterSpacing: -0.2 },
  h3: { fontFamily: font.display, fontSize: 17, lineHeight: 24, letterSpacing: -0.1 },
  title: { fontFamily: font.bodySemibold, fontSize: 16, lineHeight: 22, letterSpacing: 0 },
  body: { fontFamily: font.body, fontSize: 15, lineHeight: 22, letterSpacing: 0 },
  bodySm: { fontFamily: font.body, fontSize: 13, lineHeight: 18, letterSpacing: 0 },
  label: { fontFamily: font.bodyMedium, fontSize: 13, lineHeight: 16, letterSpacing: 0.1 },
  caption: { fontFamily: font.body, fontSize: 11, lineHeight: 14, letterSpacing: 0.2 },
};

export const layout = {
  breakpointMd: 900,
  containerNarrow: 460,
  containerContent: 720,
  containerWide: 1080,
  sidebarWidth: 248,
  tabBarHeight: 64,
} as const;
