import { type ReactNode } from "react";
import {
  Pressable,
  type StyleProp,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";

export interface CardProps {
  children: ReactNode;
  /** Spacing-scale index for inner padding. Default 5 (16). Pass 0 for none. */
  padding?: number;
  /** Drop shadow instead of just a border. */
  raised?: boolean;
  onPress?: () => void;
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

export function Card({
  children,
  padding = 5,
  raised = false,
  onPress,
  style,
  testID,
}: CardProps) {
  const styles = useThemedStyles(makeStyles);
  const pad = padding > 0 ? { padding: PADDING_SCALE[padding] ?? padding } : null;
  const base = [styles.base, raised ? styles.raised : styles.flat, pad, style];

  if (onPress) {
    return (
      <Pressable
        testID={testID}
        onPress={onPress}
        style={({ pressed }) => [...base, pressed && styles.pressed]}
      >
        {children}
      </Pressable>
    );
  }
  return (
    <View testID={testID} style={base}>
      {children}
    </View>
  );
}

// Mirror of constants/theme space scale so `padding` can take an index.
const PADDING_SCALE: Record<number, number> = {
  0: 0,
  1: 2,
  2: 4,
  3: 8,
  4: 12,
  5: 16,
  6: 20,
  7: 24,
  8: 32,
};

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    base: {
      backgroundColor: t.surface,
      borderRadius: t.radius.lg,
    },
    flat: {
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
    },
    raised: {
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      ...t.elevation.md,
    },
    pressed: { opacity: 0.9 },
  });

export default Card;
