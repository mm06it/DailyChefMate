import { useLocalSearchParams, router } from "expo-router";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Pressable } from "react-native";
import { Check, Minus, Plus, ChefHat } from "lucide-react-native";

import RecipeDetailHeader from "@/components/RecipeDetailHeader";
import RecipeStepItem from "@/components/RecipeStepItem";
import Colors from "@/constants/colors";
import { getTranslation, translateText, translateAmount } from "@/constants/translations";
import { useFridgyStore } from "@/hooks/use-fridgy-store";
import { useLanguage } from "@/hooks/use-language";
import ResponsiveContainer from "@/components/ResponsiveContainer";
import { scaleAmount } from "@/lib/scale-amount";

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 20;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, markRecipeAsCooked, recordRecipeView } = useFridgyStore();
  const { currentLanguage } = useLanguage();

  const recipe = recipes.find(r => r.id === id);

  useEffect(() => {
    if (recipe) {
      recordRecipeView(recipe.id);
    }
    // Only re-fire when the viewed recipe actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id]);
  const [completedSteps, setCompletedSteps] = useState<boolean[]>(
    recipe ? new Array(recipe.steps.length).fill(false) : []
  );
  const [servings, setServings] = useState<number>(recipe?.servings && recipe.servings > 0 ? recipe.servings : 1);
  const [isCooking, setIsCooking] = useState<boolean>(false);

  const servingsRatio = useMemo(() => {
    const base = recipe?.servings && recipe.servings > 0 ? recipe.servings : 1;
    return servings / base;
  }, [servings, recipe?.servings]);

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
    router.push('/(tabs)/(recipes)/all');
  };

  const handleDecreaseServings = () => {
    setServings(prev => Math.max(MIN_SERVINGS, prev - 1));
  };

  const handleIncreaseServings = () => {
    setServings(prev => Math.min(MAX_SERVINGS, prev + 1));
  };

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <RecipeDetailHeader recipe={recipe} />

      <ResponsiveContainer maxWidth={720}>
      <View style={styles.section}>
        <View style={styles.ingredientsHeaderRow}>
          <Text style={styles.sectionTitle}>{getTranslation(currentLanguage, 'ingredients')}</Text>
          <View style={styles.servingsStepper}>
            <Pressable
              style={[styles.servingsButton, (isCooking || servings <= MIN_SERVINGS) && styles.servingsButtonDisabled]}
              onPress={handleDecreaseServings}
              disabled={isCooking || servings <= MIN_SERVINGS}
              testID="servings-decrease"
            >
              <Minus size={16} color={isCooking || servings <= MIN_SERVINGS ? Colors.textLight : Colors.primary} />
            </Pressable>
            <Text style={styles.servingsValue} testID="servings-value">{servings}</Text>
            <Pressable
              style={[styles.servingsButton, (isCooking || servings >= MAX_SERVINGS) && styles.servingsButtonDisabled]}
              onPress={handleIncreaseServings}
              disabled={isCooking || servings >= MAX_SERVINGS}
              testID="servings-increase"
            >
              <Plus size={16} color={isCooking || servings >= MAX_SERVINGS ? Colors.textLight : Colors.primary} />
            </Pressable>
          </View>
        </View>
        {!isCooking && (
          <Text style={styles.sectionHint}>{getTranslation(currentLanguage, 'servingsAdjustHint')}</Text>
        )}
        <View style={styles.ingredientsList}>
          {recipe.ingredients.map((ingredient, index) => {
            const scaledAmount = scaleAmount(ingredient.amount, servingsRatio);
            return (
              <View key={ingredient.id} style={[
                styles.ingredientItem,
                index === recipe.ingredients.length - 1 && styles.lastIngredientItem
              ]}>
                <Text style={styles.ingredientName}>{translateText(currentLanguage, ingredient.name) || ingredient.name}</Text>
                <Text style={styles.ingredientAmount}>{translateAmount(currentLanguage, scaledAmount) || scaledAmount}</Text>
              </View>
            );
          })}
        </View>
      </View>

      {!isCooking ? (
        <View style={styles.startCookingContainer}>
          <TouchableOpacity
            style={styles.startCookingButton}
            onPress={() => setIsCooking(true)}
            testID="start-cooking-button"
          >
            <ChefHat size={22} color={Colors.white} />
            <Text style={styles.startCookingButtonText}>{getTranslation(currentLanguage, 'startCooking')}</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
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
        </>
      )}
      </ResponsiveContainer>
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
  ingredientsHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  servingsStepper: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    backgroundColor: Colors.card,
    borderRadius: 999,
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  servingsButton: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.cardSecondary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  servingsButtonDisabled: {
    opacity: 0.5,
  },
  servingsValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    minWidth: 20,
    textAlign: 'center',
  },
  startCookingContainer: {
    padding: 16,
    marginTop: 8,
  },
  startCookingButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  startCookingButtonText: {
    color: Colors.white,
    fontSize: 18,
    fontWeight: '600',
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