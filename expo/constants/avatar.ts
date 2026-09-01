// Choices for the customizable initials/emoji avatar (components/Avatar.tsx).
// Pure data + validators — no React Native imports, so the Convex functions
// can import this too.

// Background colours. "transparent" renders as an outlined circle with
// contrast-flipped text (Avatar.tsx). The saturated values keep white text /
// emoji readable and stay distinguishable on both light and dark surfaces.
export const AVATAR_COLORS: string[] = [
  "transparent",
  "#FF6B6B", "#F59E0B", "#10B981", "#3B82F6",
  "#8B5CF6", "#EC4899", "#14B8A6", "#F97316",
  "#EF4444", "#CA8A04", "#65A30D", "#059669",
  "#0891B2", "#0EA5E9", "#4F46E5", "#9333EA",
  "#DB2777", "#E11D48", "#A8A29E", "#0D9488",
];

// Kitchen / food themed emoji. Missing selection = fall back to initials.
export const AVATAR_EMOJIS: string[] = [
  "🍳", "🥑", "🍕", "🌮", "🍜", "🥗", "🍰", "🧀",
  "🥐", "🍤", "🥩", "🍎", "🥕", "🍄", "🌶️", "🧅",
  "🍅", "🥚", "🍞", "🍚", "🍔", "🌭", "🥞", "🧁",
  "🍪", "🍫", "🍿", "🍷", "☕", "🍯", "🍋", "🍓",
  "🍇", "🥦", "🍗", "🥘",
];

export function isAvatarColor(c: string): boolean {
  return AVATAR_COLORS.includes(c);
}

export function isAvatarEmoji(e: string): boolean {
  return AVATAR_EMOJIS.includes(e);
}
