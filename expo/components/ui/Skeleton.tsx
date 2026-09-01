import { useEffect, useRef } from "react";
import {
  Animated,
  type DimensionValue,
  StyleSheet,
  View,
  type ViewStyle,
} from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";

export interface SkeletonProps {
  width?: DimensionValue;
  height?: number;
  radius?: number;
  style?: ViewStyle;
}

export function Skeleton({ width = "100%", height = 16, radius, style }: SkeletonProps) {
  const styles = useThemedStyles(makeStyles);
  const pulse = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const loop = Animated.loop(
      Animated.sequence([
        Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(pulse, { toValue: 0.4, duration: 700, useNativeDriver: true }),
      ]),
    );
    loop.start();
    return () => loop.stop();
  }, [pulse]);

  return (
    <Animated.View
      style={[
        styles.block,
        { width, height, borderRadius: radius ?? 6, opacity: pulse },
        style,
      ]}
    />
  );
}

export function SkeletonCard() {
  const styles = useThemedStyles(makeStyles);
  return (
    <View style={styles.card}>
      <Skeleton height={150} radius={12} />
      <View style={styles.cardBody}>
        <Skeleton width="70%" height={16} />
        <Skeleton width="45%" height={12} />
        <View style={styles.cardPills}>
          <Skeleton width={64} height={20} radius={999} />
          <Skeleton width={52} height={20} radius={999} />
        </View>
      </View>
    </View>
  );
}

export function SkeletonList({ count = 6, gap = 12 }: { count?: number; gap?: number }) {
  return (
    <View style={{ gap }}>
      {Array.from({ length: count }).map((_, i) => (
        <Skeleton key={i} height={64} radius={12} />
      ))}
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    block: { backgroundColor: t.surfaceSunken },
    card: {
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.lg,
      overflow: "hidden",
    },
    cardBody: { padding: t.space[4], gap: t.space[3] },
    cardPills: { flexDirection: "row", gap: t.space[3], marginTop: t.space[1] },
  });

export default Skeleton;
