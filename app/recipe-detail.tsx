import { useLocalSearchParams, router } from "expo-router";
import React, { useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity } from "react-native";
import { Check } from "lucide-react-native";

import RecipeDetailHeader from "@/components/RecipeDetailHeader";
import RecipeStepItem from "@/components/RecipeStepItem";
import Colors from "@/constants/colors";
import { getTranslation, translateText, translateAmount } from "@/constants/translations";
import { useFridgyStore } from "@/hooks/use-fridgy-store";
import { useLanguage } from "@/hooks/use-language";

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, markRecipeAsCooked } = useFridgyStore();
  const { currentLanguage } = useLanguage();
  
  const recipe = recipes.find(r => r.id === id);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(
    recipe ? new Array(recipe.steps.length).fill(false) : []
  );
  
  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorText}>{getTranslation(currentLanguage, 'back')}</Text>
      </View>
    );
  }
  
  const handleStepToggle = (stepIndex: number) => {
    const nextActiveStep = getNextActiveStep();
    // Only allow toggling the current active step or already completed steps
    if (stepIndex === nextActiveStep || completedSteps[stepIndex]) {
      const newCompletedSteps = [...completedSteps];
      newCompletedSteps[stepIndex] = !newCompletedSteps[stepIndex];
      setCompletedSteps(newCompletedSteps);
    }
  };

  const getNextActiveStep = () => {
    return completedSteps.findIndex(completed => !completed);
  };

  const areAllStepsCompleted = () => {
    return completedSteps.every(completed => completed);
  };

  const handleMarkAsCooked = () => {
    markRecipeAsCooked(recipe.id);
    router.push('/(tabs)/');
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <RecipeDetailHeader recipe={recipe} />
      
      <View style={styles.section}>
        <Text style={styles.sectionTitle}>{getTranslation(currentLanguage, 'ingredients')}</Text>
        <View style={styles.ingredientsList}>
          {recipe.ingredients.map((ingredient, index) => (
            <View key={ingredient.id} style={[
              styles.ingredientItem,
              index === recipe.ingredients.length - 1 && styles.lastIngredientItem
            ]}>
              <Text style={styles.ingredientName}>{translateText(currentLanguage, ingredient.name) || ingredient.name}</Text>
              <Text style={styles.ingredientAmount}>{translateAmount(currentLanguage, ingredient.amount) || ingredient.amount}</Text>
            </View>
          ))}
        </View>
      </View>
      
      <View style={styles.section}>
        <View style={styles.sectionTitleContainer}>
          <Text style={styles.sectionTitle}>{getTranslation(currentLanguage, 'instructions')}</Text>
          <Text style={styles.sectionHint}>{getTranslation(currentLanguage, 'tapToComplete')}</Text>
        </View>
        <View style={styles.stepsList}>
          {recipe.steps.map((step, index) => {
            const nextActiveStep = getNextActiveStep();
            const isCompleted = completedSteps[index];
            const isActive = index === nextActiveStep || isCompleted;
            
            return (
              <RecipeStepItem 
                key={index} 
                step={step} 
                index={index}
                isCompleted={isCompleted}
                isActive={isActive}
                onToggle={() => handleStepToggle(index)}
              />
            );
          })}
        </View>
      </View>
      
      {/* Done Button */}
      <View style={styles.doneButtonContainer}>
        <TouchableOpacity 
          style={[styles.doneButton, !areAllStepsCompleted() && styles.doneButtonDisabled]} 
          onPress={handleMarkAsCooked}
          disabled={!areAllStepsCompleted()}
          testID="done-button"
        >
          <Check size={24} color={Colors.white} />
          <Text style={styles.doneButtonText}>{getTranslation(currentLanguage, 'done')}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  errorText: {
    fontSize: 18,
    color: Colors.error,
  },
  section: {
    marginTop: 24,
    paddingHorizontal: 16,
  },
  sectionTitleContainer: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: "600",
    color: Colors.text,
  },
  sectionHint: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  ingredientsList: {
    backgroundColor: Colors.card,
    borderRadius: 12,
    padding: 16,
  },
  ingredientItem: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  ingredientName: {
    fontSize: 16,
    color: Colors.text,
  },
  ingredientAmount: {
    fontSize: 16,
    color: Colors.textLight,
  },
  stepsList: {
    marginTop: 8,
  },
  lastIngredientItem: {
    borderBottomWidth: 0,
  },
  doneButtonContainer: {
    padding: 16,
    paddingBottom: 32,
  },
  doneButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  doneButtonDisabled: {
    backgroundColor: Colors.textLight,
    opacity: 0.6,
  },
  doneButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
    marginLeft: 8,
  },
});