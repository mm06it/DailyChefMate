import { ChefHat } from "lucide-react-native";
import { useNavigation } from "expo-router";
import React from "react";
import { type StyleProp, type ViewStyle } from "react-native";

import { useTheme } from "@/hooks/use-theme";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { Button } from "@/components/ui/Button";

export default function GenerateRecipesButton({ style }: { style?: StyleProp<ViewStyle> }) {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const navigation = useNavigation();
  const { getSelectedIngredients } = useDailyChefMateStore();
  const selectedIngredients = getSelectedIngredients();
  const isDisabled = selectedIngredients.length < 2;

  return (
    <Button
      label={`${t('generateRecipes')} (${selectedIngredients.length})`}
      size="lg"
      fullWidth
      disabled={isDisabled}
      leftIcon={<ChefHat size={18} color={theme.textOnAccent} />}
      onPress={() => {
        if (!isDisabled) navigation.navigate("generated-recipes" as never);
      }}
      style={style}
    />
  );
}
