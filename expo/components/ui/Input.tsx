import { forwardRef, type ReactNode, useState } from "react";
import {
  Platform,
  StyleSheet,
  TextInput,
  type TextInputProps,
  View,
} from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { Text } from "@/components/ui/Text";

export interface InputProps extends TextInputProps {
  label?: string;
  error?: string;
  leftIcon?: ReactNode;
  rightSlot?: ReactNode;
  /** Pill shape + no label — for search fields. */
  search?: boolean;
}

export const Input = forwardRef<TextInput, InputProps>(function Input(
  { label, error, leftIcon, rightSlot, search = false, style, onFocus, onBlur, ...rest },
  ref,
) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [focused, setFocused] = useState(false);

  return (
    <View style={styles.wrap}>
      {label ? (
        <Text variant="label" color="secondary" style={styles.label}>
          {label}
        </Text>
      ) : null}
      <View
        style={[
          styles.field,
          search && styles.fieldSearch,
          focused && styles.fieldFocused,
          !!error && styles.fieldError,
        ]}
      >
        {leftIcon}
        <TextInput
          ref={ref}
          placeholderTextColor={theme.textMuted}
          style={[styles.input, Platform.OS === "web" && webNoOutline, style]}
          onFocus={(e) => {
            setFocused(true);
            onFocus?.(e);
          }}
          onBlur={(e) => {
            setFocused(false);
            onBlur?.(e);
          }}
          {...rest}
        />
        {rightSlot}
      </View>
      {error ? (
        <Text variant="caption" color="danger" style={styles.error}>
          {error}
        </Text>
      ) : null}
    </View>
  );
});

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: { gap: t.space[3] },
    label: { marginLeft: t.space[1] },
    field: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[3],
      backgroundColor: t.surfaceSunken,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.md,
      paddingHorizontal: t.space[4],
      minHeight: 44,
    },
    fieldSearch: {
      borderRadius: t.radius.pill,
      minHeight: 40,
      paddingHorizontal: t.space[4],
    },
    fieldFocused: { borderColor: t.focusRing },
    fieldError: { borderColor: t.danger },
    input: {
      flex: 1,
      color: t.textPrimary,
      fontFamily: t.font.body,
      fontSize: 15,
      paddingVertical: 10,
    },
    error: { marginLeft: t.space[1] },
  });

// RN-web draws its own focus ring; we show focus via the field border instead.
const webNoOutline = { outlineStyle: "none" } as unknown as { [k: string]: string };

export default Input;
