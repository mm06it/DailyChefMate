// Raw color ramps — the only place literal hex values live. Semantic tokens
// (see tokens.ts) reference these; screens reference the semantic tokens, never
// this file directly.

// Warm-tinted neutral ramp. 0 = pure white, 950 = near-black.
export const neutral = {
  0: "#FFFFFF",
  50: "#FAFAF9",
  100: "#F4F4F2",
  200: "#E8E7E4",
  300: "#D6D5D1",
  400: "#A8A6A0",
  500: "#78766F",
  600: "#57554F",
  700: "#3F3E39",
  800: "#2A2926",
  900: "#1B1A18",
  950: "#121110",
} as const;

// Accent — a deepened, less-saturated ember descended from the old coral
// (#FF6B6B). Used sparingly: primary CTA, active nav, focus ring, links.
export const accent = {
  light: "#D6482F",
  lightHover: "#B93D26",
  lightSubtle: "#FBEDE9",
  dark: "#F0603F",
  darkHover: "#F4795C",
  darkSubtle: "rgba(240, 96, 63, 0.16)",
} as const;

export const functional = {
  successLight: "#2F855A",
  successDark: "#5FB98A",
  successSubtleLight: "#E7F3EC",
  successSubtleDark: "rgba(95, 185, 138, 0.15)",
  warningLight: "#B45309",
  warningDark: "#E0A458",
  warningSubtleLight: "#FBF0E1",
  warningSubtleDark: "rgba(224, 164, 88, 0.15)",
  dangerLight: "#C0392F",
  dangerDark: "#E4685C",
  dangerSubtleLight: "#F8E9E7",
  dangerSubtleDark: "rgba(228, 104, 92, 0.15)",
  starLight: "#E0A100",
  starDark: "#F5C242",
} as const;

// Achievement medals (ProfileContent). Kept as a named set so the values
// aren't scattered as literals across that file.
export const metalPalette = {
  light: {
    gold: "#C99A2E",
    silver: "#9A9A9A",
    bronze: "#B06B3A",
    steel: "#6B6A64",
  },
  dark: {
    gold: "#E3B75A",
    silver: "#BFBEB9",
    bronze: "#CF8B5C",
    steel: "#9A9992",
  },
} as const;
