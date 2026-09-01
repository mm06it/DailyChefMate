import { Text as RNText, type TextProps as RNTextProps } from "react-native";

import type { Theme } from "@/constants/theme";
import { useTheme } from "@/hooks/use-theme";

export type TextVariant =
  | "display"
  | "h1"
  | "h2"
  | "h3"
  | "title"
  | "body"
  | "bodySm"
  | "label"
  | "caption";

export type TextColor =
  | "primary"
  | "secondary"
  | "muted"
  | "accent"
  | "danger"
  | "success"
  | "onAccent"
  | "inherit";

export interface TextProps extends RNTextProps {
  variant?: TextVariant;
  color?: TextColor;
  /** Overrides the variant's weight with the semibold face of the same family. */
  weight?: "regular" | "medium" | "semibold" | "bold";
  center?: boolean;
}

function resolveColor(theme: Theme, color: TextColor): string | undefined {
  switch (color) {
    case "primary":
      return theme.textPrimary;
    case "secondary":
      return theme.textSecondary;
    case "muted":
      return theme.textMuted;
    case "accent":
      return theme.accent;
    case "danger":
      return theme.danger;
    case "success":
      return theme.success;
    case "onAccent":
      return theme.textOnAccent;
    case "inherit":
      return undefined;
  }
}

function weightFamily(theme: Theme, w: NonNullable<TextProps["weight"]>): string {
  switch (w) {
    case "regular":
      return theme.font.body;
    case "medium":
      return theme.font.bodyMedium;
    case "semibold":
      return theme.font.bodySemibold;
    case "bold":
      return theme.font.bodyBold;
  }
}

export function Text({
  variant = "body",
  color = "primary",
  weight,
  center,
  style,
  ...rest
}: TextProps) {
  const { theme } = useTheme();
  const t = theme.type[variant];

  return (
    <RNText
      {...rest}
      style={[
        {
          fontFamily: weight ? weightFamily(theme, weight) : t.fontFamily,
          fontSize: t.fontSize,
          lineHeight: t.lineHeight,
          letterSpacing: t.letterSpacing,
          color: resolveColor(theme, color),
        },
        center && { textAlign: "center" },
        style,
      ]}
    />
  );
}

export default Text;
