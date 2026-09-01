import { StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { Text } from "@/components/ui/Text";

export type BadgeTone =
  | "neutral"
  | "accent"
  | "success"
  | "warning"
  | "danger"
  | "star";
export type BadgeSize = "sm" | "md";

export interface BadgeProps {
  label: string;
  tone?: BadgeTone;
  size?: BadgeSize;
  /** Solid fill instead of the default tinted/subtle style. */
  solid?: boolean;
}

export function Badge({
  label,
  tone = "neutral",
  size = "sm",
  solid = false,
}: BadgeProps) {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);

  const tint: Record<BadgeTone, { bg: string; fg: string; solidBg: string }> = {
    neutral: {
      bg: theme.surfaceSunken,
      fg: theme.textSecondary,
      solidBg: theme.textSecondary,
    },
    accent: { bg: theme.accentSubtle, fg: theme.accent, solidBg: theme.accent },
    success: {
      bg: theme.successSubtle,
      fg: theme.success,
      solidBg: theme.success,
    },
    warning: {
      bg: theme.warningSubtle,
      fg: theme.warning,
      solidBg: theme.warning,
    },
    danger: { bg: theme.dangerSubtle, fg: theme.danger, solidBg: theme.danger },
    star: { bg: theme.warningSubtle, fg: theme.star, solidBg: theme.star },
  };
  const c = tint[tone];

  return (
    <View
      style={[
        styles.base,
        size === "md" && styles.md,
        { backgroundColor: solid ? c.solidBg : c.bg },
      ]}
    >
      <Text
        variant="caption"
        weight="semibold"
        style={{
          color: solid ? theme.textOnAccent : c.fg,
          fontSize: size === "md" ? 12 : 11,
        }}
      >
        {label}
      </Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[1],
      borderRadius: t.radius.pill,
      alignSelf: "flex-start",
    },
    md: { paddingHorizontal: t.space[4], paddingVertical: t.space[2] },
  });

export default Badge;
