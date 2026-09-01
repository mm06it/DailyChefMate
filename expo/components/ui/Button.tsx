import { type ReactNode } from "react";
import {
  ActivityIndicator,
  Pressable,
  type PressableProps,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { Text } from "@/components/ui/Text";

export type ButtonVariant = "primary" | "secondary" | "ghost" | "danger";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends Omit<PressableProps, "style" | "children"> {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  loading?: boolean;
  disabled?: boolean;
  fullWidth?: boolean;
  leftIcon?: ReactNode;
  rightIcon?: ReactNode;
  style?: StyleProp<ViewStyle>;
}

const HEIGHT: Record<ButtonSize, number> = { sm: 36, md: 44, lg: 52 };
const PAD_X: Record<ButtonSize, number> = { sm: 12, md: 16, lg: 20 };

export function Button({
  label,
  variant = "primary",
  size = "md",
  loading = false,
  disabled = false,
  fullWidth = false,
  leftIcon,
  rightIcon,
  style,
  ...rest
}: ButtonProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const isDisabled = disabled || loading;

  const bg: Record<ButtonVariant, string> = {
    primary: theme.accent,
    secondary: theme.surface,
    ghost: "transparent",
    danger: theme.danger,
  };
  const fg: Record<ButtonVariant, string> = {
    primary: theme.textOnAccent,
    secondary: theme.textPrimary,
    ghost: theme.accent,
    danger: theme.textOnAccent,
  };
  const textColor =
    variant === "primary" || variant === "danger"
      ? ("onAccent" as const)
      : variant === "ghost"
        ? ("accent" as const)
        : ("primary" as const);

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityState={{ disabled: isDisabled, busy: loading }}
      disabled={isDisabled}
      style={({ pressed }) => [
        styles.base,
        {
          height: HEIGHT[size],
          paddingHorizontal: PAD_X[size],
          backgroundColor: bg[variant],
          borderColor: variant === "secondary" ? theme.border : "transparent",
          borderWidth: variant === "secondary" ? theme.borderWidth.hairline : 0,
        },
        fullWidth && styles.fullWidth,
        pressed && !isDisabled && styles.pressed,
        isDisabled && styles.disabled,
        style,
      ]}
      {...rest}
    >
      {loading ? (
        <ActivityIndicator size="small" color={fg[variant]} />
      ) : (
        <View style={styles.content}>
          {leftIcon}
          <Text
            variant="label"
            color={textColor}
            style={{ fontSize: size === "lg" ? 15 : 14 }}
          >
            {label}
          </Text>
          {rightIcon}
        </View>
      )}
    </Pressable>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      borderRadius: t.radius.md,
      alignItems: "center",
      justifyContent: "center",
      alignSelf: "flex-start",
    },
    fullWidth: { alignSelf: "stretch", width: "100%" },
    content: { flexDirection: "row", alignItems: "center", gap: t.space[3] },
    pressed: { opacity: 0.85 },
    disabled: { opacity: 0.45 },
  });

export default Button;
