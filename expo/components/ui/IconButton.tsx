import { type ReactNode } from "react";
import { Pressable, type PressableProps, StyleSheet } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";

export type IconButtonVariant = "plain" | "surface" | "accent";
export type IconButtonSize = "sm" | "md" | "lg";

export interface IconButtonProps extends Omit<PressableProps, "style" | "children"> {
  /** Accessible label — required, since there's no visible text. */
  label: string;
  children: ReactNode;
  variant?: IconButtonVariant;
  size?: IconButtonSize;
}

const DIM: Record<IconButtonSize, number> = { sm: 32, md: 40, lg: 44 };

export function IconButton({
  label,
  children,
  variant = "plain",
  size = "md",
  ...rest
}: IconButtonProps) {
  const styles = useThemedStyles(makeStyles);
  const dim = DIM[size];

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      hitSlop={8}
      style={({ pressed }) => [
        styles.base,
        { width: dim, height: dim, borderRadius: dim / 2 },
        variant === "surface" && styles.surface,
        variant === "accent" && styles.accent,
        pressed && styles.pressed,
      ]}
      {...rest}
    >
      {children}
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: { alignItems: "center", justifyContent: "center" },
    surface: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
    },
    accent: { backgroundColor: t.accentSubtle },
    pressed: { opacity: 0.6 },
  });

export default IconButton;
