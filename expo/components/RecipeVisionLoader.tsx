import { ChefHat, Flame, Soup, UtensilsCrossed } from "lucide-react-native";
import React, { useEffect, useRef } from "react";
import { Animated, StyleSheet, View } from "react-native";

import type { Theme } from "@/constants/theme";
import { Text } from "@/components/ui/Text";
import { useLanguage } from "@/hooks/use-language";
import { useTheme } from "@/hooks/use-theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";

const RING = 120;
const R = 42;
const BOX = 40;
const ICONS = [ChefHat, Soup, UtensilsCrossed, Flame];
// Static base positions for 4 icons at 0/90/180/270°.
const SLOTS = ICONS.map((_, i) => {
  const a = (i * Math.PI) / 2;
  return {
    left: RING / 2 + R * Math.cos(a) - BOX / 2,
    top: RING / 2 + R * Math.sin(a) - BOX / 2,
  };
});

// Full-screen "reading your recipe" state: cooking icons orbiting a ring
// (PlayStation-button style) + an estimated progress bar.
export default function RecipeVisionLoader({ progress }: { progress: Animated.Value }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const spin = useRef(new Animated.Value(0)).current;
  const pulse = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const loops = [
      Animated.loop(
        Animated.timing(spin, { toValue: 1, duration: 2400, useNativeDriver: true }),
      ),
      Animated.loop(
        Animated.timing(pulse, { toValue: 1, duration: 1800, useNativeDriver: true }),
      ),
    ];
    loops.forEach((l) => l.start());
    return () => loops.forEach((l) => l.stop());
  }, [spin, pulse]);

  const rotate = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "360deg"] });
  const counter = spin.interpolate({ inputRange: [0, 1], outputRange: ["0deg", "-360deg"] });
  const barWidth = progress.interpolate({
    inputRange: [0, 1],
    outputRange: ["4%", "100%"],
    extrapolate: "clamp",
  });

  return (
    <View style={styles.container}>
      <Animated.View style={[styles.ring, { transform: [{ rotate }] }]}>
        {SLOTS.map((slot, i) => {
          const Icon = ICONS[i];
          const scale = pulse.interpolate({
            inputRange: [0, 0.5, 1],
            outputRange: i % 2 === 0 ? [1, 1.22, 1] : [1.22, 1, 1.22],
          });
          return (
            <Animated.View
              key={i}
              style={[styles.slot, slot, { transform: [{ rotate: counter }, { scale }] }]}
            >
              <Icon size={26} color={i === 0 ? theme.accent : theme.textSecondary} />
            </Animated.View>
          );
        })}
      </Animated.View>

      <View style={styles.track}>
        <Animated.View style={[styles.fill, { width: barWidth }]} />
      </View>
      <Text variant="bodySm" color="muted" style={styles.caption}>
        {t("visionReading")}
      </Text>
    </View>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.bg,
      padding: t.space[6],
      gap: t.space[7],
    },
    ring: { width: RING, height: RING },
    slot: {
      position: "absolute",
      width: BOX,
      height: BOX,
      alignItems: "center",
      justifyContent: "center",
    },
    track: {
      width: "100%",
      maxWidth: 260,
      height: 6,
      borderRadius: 3,
      backgroundColor: t.surfaceSunken,
      overflow: "hidden",
    },
    fill: { height: "100%", borderRadius: 3, backgroundColor: t.accent },
    caption: { marginTop: -t.space[4] },
  });
