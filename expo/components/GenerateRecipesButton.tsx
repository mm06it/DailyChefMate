import { ChefHat } from "lucide-react-native";
import { useNavigation } from "expo-router";
import React from "react";
import { Pressable, StyleSheet, Text } from "react-native";

import Colors from "@/constants/colors";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";

export default function GenerateRecipesButton() {
  const { t } = useLanguage();
  const navigation = useNavigation();
  const { getSelectedIngredients } = useDailyChefMateStore();
  const selectedIngredients = getSelectedIngredients();
  const isDisabled = selectedIngredients.length < 2;

  const handlePress = () => {
    if (!isDisabled) {
      navigation.navigate("generated-recipes" as never);
    }
  };

  return (
    <Pressable
      style={[styles.button, isDisabled && styles.buttonDisabled]}
      onPress={handlePress}
      disabled={isDisabled}
    >
      <ChefHat size={20} color="#FFF" />
      <Text style={styles.buttonText}>
        {t('generateRecipes')} ({selectedIngredients.length})
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.secondary,
    borderRadius: 25,
    paddingVertical: 16,
    paddingHorizontal: 24,
    marginHorizontal: 16,
    marginVertical: 16,
    shadowColor: Colors.secondary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  buttonDisabled: {
    backgroundColor: Colors.textLight,
  },
  buttonText: {
    color: "#FFF",
    fontSize: 16,
    fontWeight: "600",
    marginLeft: 8,
  },
});