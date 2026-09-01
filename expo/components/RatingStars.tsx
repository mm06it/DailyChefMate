import { Star } from "lucide-react-native";
import React from "react";
import { Pressable, StyleSheet, View } from "react-native";

import { useTheme } from "@/hooks/use-theme";

interface RatingStarsProps {
  value: number; // 0..5 (may be fractional for display)
  size?: number;
  onChange?: (v: number) => void; // when set, stars are tappable (1..5)
  gap?: number;
}

export default function RatingStars({ value, size = 18, onChange, gap = 2 }: RatingStarsProps) {
  const { theme } = useTheme();
  const rounded = Math.round(value);
  return (
    <View style={[styles.row, { gap }]}>
      {[1, 2, 3, 4, 5].map((i) => {
        const filled = i <= rounded;
        const star = (
          <Star
            size={size}
            color={filled ? theme.star : theme.textMuted}
            fill={filled ? theme.star : "none"}
          />
        );
        return onChange ? (
          <Pressable key={i} onPress={() => onChange(i)} hitSlop={6} testID={`rating-star-${i}`}>
            {star}
          </Pressable>
        ) : (
          <View key={i}>{star}</View>
        );
      })}
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center" },
});
