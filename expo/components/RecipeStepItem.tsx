import React from "react";
import { StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Check } from "lucide-react-native";

import Colors from "@/constants/colors";
import { translateText } from "@/constants/translations";
import { useLanguage } from "@/hooks/use-language";

interface RecipeStepItemProps {
  step: string;
  index: number;
  isCompleted: boolean;
  isActive: boolean;
  onToggle: () => void;
}

export default function RecipeStepItem({ step, index, isCompleted, isActive, onToggle }: RecipeStepItemProps) {
  const { currentLanguage } = useLanguage();
  
  return (
    <TouchableOpacity 
      style={[styles.container, !isActive && !isCompleted && styles.dimmed]} 
      onPress={onToggle}
      disabled={!isActive && !isCompleted}
      testID={`step-${index}`}
    >
      <View style={[
        styles.numberContainer,
        isCompleted && styles.completedNumberContainer
      ]}>
        {isCompleted ? (
          <Check size={16} color={Colors.white} />
        ) : (
          <Text style={[
            styles.number,
            isCompleted && styles.completedNumber
          ]}>{index + 1}</Text>
        )}
      </View>
      <Text style={[
        styles.step,
        !isActive && !isCompleted && styles.dimmedText,
        isCompleted && styles.completedText
      ]}>
        {translateText(currentLanguage, step) || step}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: "row",
    marginBottom: 16,
    paddingHorizontal: 16,
  },
  dimmed: {
    opacity: 0.4,
  },
  numberContainer: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary,
    justifyContent: "center",
    alignItems: "center",
    marginRight: 12,
    marginTop: 2,
  },
  completedNumberContainer: {
    backgroundColor: Colors.success || '#4CAF50',
  },
  number: {
    color: "#FFF",
    fontWeight: "600",
    fontSize: 14,
  },
  completedNumber: {
    color: Colors.success || '#4CAF50',
  },
  step: {
    flex: 1,
    fontSize: 16,
    lineHeight: 24,
    color: Colors.text,
  },
  dimmedText: {
    color: Colors.textLight,
  },
  completedText: {
    textDecorationLine: 'line-through',
    color: Colors.textLight,
  },
});