import React, { useEffect, useMemo, useRef } from "react";
import {
  NativeScrollEvent,
  NativeSyntheticEvent,
  ScrollView,
  StyleSheet,
  View,
} from "react-native";

import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { Text } from "@/components/ui/Text";
import { clampMenge, formatMenge, mengeSteps } from "@/lib/menge";

const ITEM_H = 38;
const VISIBLE = 3; // odd: centre value + one above + one below

// Vertical wheel picker for the baking "Menge" (0.25 steps). Plain ScrollView
// snapping — no reanimated dependency. Works with touch and trackpad/wheel.
export default function MengeWheel({
  value,
  onChange,
  testID,
}: {
  value: number;
  onChange: (v: number) => void;
  testID?: string;
}) {
  const styles = useThemedStyles(makeStyles);
  const steps = useMemo(() => mengeSteps(), []);
  const ref = useRef<ScrollView>(null);
  const settle = useRef<ReturnType<typeof setTimeout> | null>(null);

  const selected = clampMenge(value);
  const idx = Math.max(0, steps.findIndex((s) => Math.abs(s - selected) < 1e-6));
  const pad = ((VISIBLE - 1) / 2) * ITEM_H;

  useEffect(() => {
    ref.current?.scrollTo({ y: idx * ITEM_H, animated: false });
  }, [idx]);

  useEffect(() => () => {
    if (settle.current) clearTimeout(settle.current);
  }, []);

  const commit = (y: number) => {
    const i = Math.min(steps.length - 1, Math.max(0, Math.round(y / ITEM_H)));
    const next = steps[i];
    ref.current?.scrollTo({ y: i * ITEM_H, animated: true });
    if (next !== undefined && Math.abs(next - value) > 1e-6) onChange(next);
  };

  const onEnd = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    if (settle.current) clearTimeout(settle.current);
    commit(e.nativeEvent.contentOffset.y);
  };

  // Web wheel-scroll doesn't reliably fire the momentum/drag-end events.
  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    if (settle.current) clearTimeout(settle.current);
    settle.current = setTimeout(() => commit(y), 140);
  };

  return (
    <View style={styles.wrap} testID={testID}>
      <View style={styles.centerBand} pointerEvents="none" />
      <ScrollView
        ref={ref}
        showsVerticalScrollIndicator={false}
        snapToInterval={ITEM_H}
        decelerationRate="fast"
        scrollEventThrottle={16}
        onScroll={onScroll}
        onMomentumScrollEnd={onEnd}
        onScrollEndDrag={onEnd}
        contentContainerStyle={{ paddingVertical: pad }}
      >
        {steps.map((s, i) => (
          <View key={s} style={styles.item}>
            <Text
              variant={i === idx ? "title" : "body"}
              color={i === idx ? "primary" : "muted"}
              style={i === idx ? styles.active : styles.dim}
            >
              {formatMenge(s)}
            </Text>
          </View>
        ))}
      </ScrollView>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    wrap: {
      height: ITEM_H * VISIBLE,
      width: 96,
      overflow: "hidden",
      borderRadius: t.radius.md,
      backgroundColor: t.surfaceSunken,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
    },
    centerBand: {
      position: "absolute",
      left: 0,
      right: 0,
      top: ITEM_H * ((VISIBLE - 1) / 2),
      height: ITEM_H,
      borderTopWidth: t.borderWidth.hairline,
      borderBottomWidth: t.borderWidth.hairline,
      borderColor: t.borderStrong,
      backgroundColor: t.accentSubtle,
    },
    item: { height: ITEM_H, alignItems: "center", justifyContent: "center" },
    active: { fontFamily: t.font.bodyBold },
    dim: { opacity: 0.55 },
  });
