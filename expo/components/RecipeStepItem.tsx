import React from "react";
import { StyleSheet, View, TouchableOpacity } from "react-native";
import { Check } from "lucide-react-native";

import type { Theme } from "@/constants/theme";
import { translateText } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useLanguage } from "@/hooks/use-language";
import { Text } from "@/components/ui/Text";

interface RecipeStepItemProps {
  step: string;
  index: number;
  isCompleted: boolean;
  isActive: boolean;
  onToggle: () => void;
}

export default function RecipeStepItem({ step, index, isCompleted, isActive, onToggle }: RecipeStepItemProps) {
  const { currentLanguage } = useLanguage();
  const styles = useThemedStyles(makeStyles);

  return (
    <TouchableOpacity
      style={[styles.container, !isActive && !isCompleted && styles.dimmed]}
      onPress={onToggle}
      disabled={!isActive && !isCompleted}
      testID={`step-${index}`}
    >
      <View style={[styles.number, isCompleted && styles.numberDone]}>
        {isCompleted ? (
          <Check size={15} color="#FFFFFF" />
        ) : (
          <Text variant="label" style={styles.numberText}>
            {index + 1}
          </Text>
        )}
      </View>
      <Text
        variant="body"
        color={isActive || isCompleted ? "primary" : "muted"}
        style={[styles.step, isCompleted && styles.stepDone]}
      >
        {translateText(currentLanguage, step) || step}
      </Text>
    </TouchableOpacity>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flexDirection: "row",
      marginBottom: t.space[4],
      paddingHorizontal: t.space[5],
    },
    dimmed: { opacity: 0.4 },
    number: {
      width: 26,
      height: 26,
      borderRadius: 13,
      backgroundColor: t.accent,
      justifyContent: "center",
      alignItems: "center",
      marginRight: t.space[4],
      marginTop: 2,
    },
    numberDone: { backgroundColor: t.success },
    numberText: { color: "#FFFFFF" },
    step: { flex: 1 },
    stepDone: { textDecorationLine: "line-through" },
  });
