import { type ReactNode } from "react";
import { Pressable, StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { Text } from "@/components/ui/Text";

export interface SegmentOption<T extends string> {
  value: T;
  label: string;
  icon?: ReactNode;
  badge?: number;
}

export interface SegmentedControlProps<T extends string> {
  options: SegmentOption<T>[];
  value: T;
  onChange: (value: T) => void;
  testID?: string;
}

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  testID,
}: SegmentedControlProps<T>) {
  const styles = useThemedStyles(makeStyles);

  return (
    <View style={styles.track} testID={testID}>
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            style={[styles.segment, active && styles.segmentActive]}
            testID={testID ? `${testID}-${opt.value}` : undefined}
          >
            {opt.icon}
            <Text
              variant="label"
              color={active ? "primary" : "secondary"}
              weight={active ? "semibold" : "medium"}
            >
              {opt.label}
            </Text>
            {opt.badge != null && opt.badge > 0 ? (
              <View style={styles.badge}>
                <Text variant="caption" style={styles.badgeText}>
                  {opt.badge > 99 ? "99+" : opt.badge}
                </Text>
              </View>
            ) : null}
          </Pressable>
        );
      })}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    track: {
      flexDirection: "row",
      backgroundColor: t.surfaceSunken,
      borderRadius: t.radius.md,
      padding: t.space[1],
      gap: t.space[1],
    },
    segment: {
      flex: 1,
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "center",
      gap: t.space[2],
      paddingVertical: t.space[3],
      borderRadius: t.radius.sm,
    },
    segmentActive: {
      backgroundColor: t.surface,
      ...t.elevation.sm,
    },
    badge: {
      minWidth: 18,
      height: 18,
      paddingHorizontal: 5,
      borderRadius: 9,
      backgroundColor: t.accent,
      alignItems: "center",
      justifyContent: "center",
    },
    badgeText: { color: t.textOnAccent, fontSize: 10 },
  });

export default SegmentedControl;
