import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "convex/react";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, Text, View, TouchableOpacity, Pressable } from "react-native";
import { Check, Minus, Plus, ChefHat, Star } from "lucide-react-native";

import AddToPlanModal from "@/components/AddToPlanModal";
import ShareRecipeSheet from "@/components/ShareRecipeSheet";
import RateRecipeModal from "@/components/RateRecipeModal";
import RatingStars from "@/components/RatingStars";
import Avatar from "@/components/Avatar";
import RecipeDetailHeader from "@/components/RecipeDetailHeader";
import RecipeStepItem from "@/components/RecipeStepItem";
import Colors from "@/constants/colors";
import { api } from "@/convex/_generated/api";
import { getTranslation, translateText, translateAmount } from "@/constants/translations";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { useRatings } from "@/hooks/use-ratings";
import { useRecipeImageUpload } from "@/hooks/use-recipe-image";
import { useLocalizedRecipes } from "@/hooks/use-localized-recipes";
import ResponsiveContainer from "@/components/ResponsiveContainer";
import { scaleAmount } from "@/lib/scale-amount";

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 20;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, customRecipes, favorites, cookedRecipes, markRecipeAsCooked, recordRecipeView } =
    useDailyChefMateStore();
  const { currentLanguage, t } = useLanguage();
  const { markPlannedCooked } = useMealPlan();
  const { myRating } = useRatings();
  const { pickAndUpload, removeImage, uploading } = useRecipeImageUpload();

  // Look across every source a recipe can come from: the browse cache
  // (mocks + TheMealDB pages), the user's own recipes, and favorites.
  const recipe = useMemo(
    () =>
      recipes.find((r) => r.id === id) ??
      customRecipes.find((r) => r.id === id) ??
      favorites.find((r) => r.id === id),
    [recipes, customRecipes, favorites, id],
  );

  // Localize browse/favorite recipes (not the user's own — those keep the
  // language they were written in).
  const isCustom = !!recipe && customRecipes.some((c) => c.id === recipe.id);
  const localized = useLocalizedRecipes(recipe && !isCustom ? [recipe] : []);

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
  const [planModalVisible, setPlanModalVisible] = useState<boolean>(false);
  const [shareSheetVisible, setShareSheetVisible] = useState<boolean>(false);
  const [rateModalVisible, setRateModalVisible] = useState<boolean>(false);
  const [navigateAfterRate, setNavigateAfterRate] = useState<boolean>(false);
  const [justPlanned, setJustPlanned] = useState<boolean>(false);

  const friendRatings = useQuery(api.ratings.friendRatings, id ? { recipeId: id } : "skip");

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

  const displayRecipe = isCustom ? recipe : localized[0] ?? recipe;

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
    markPlannedCooked(recipe.id);
    setNavigateAfterRate(true);
    setRateModalVisible(true);
  };

  const closeRateModal = () => {
    setRateModalVisible(false);
    if (navigateAfterRate) {
      setNavigateAfterRate(false);
      router.push('/(tabs)/(recipes)/all');
    }
  };

  const handleDecreaseServings = () => {
    setServings(prev => Math.max(MIN_SERVINGS, prev - 1));
  };

  const handleIncreaseServings = () => {
    setServings(prev => Math.min(MAX_SERVINGS, prev + 1));
  };

  const hasCooked = (cookedRecipes[recipe.id] ?? 0) > 0;
  const myRatingValue = myRating(recipe.id);
  const friendItems = (friendRatings?.items ?? []).filter((r) => !r.isMe);

  return (
    <ScrollView 
      style={styles.container}
      showsVerticalScrollIndicator={false}
    >
      <RecipeDetailHeader
        recipe={displayRecipe}
        onAddToPlan={() => setPlanModalVisible(true)}
        onShare={() => setShareSheetVisible(true)}
        justPlanned={justPlanned}
        onChangePhoto={isCustom ? () => pickAndUpload(recipe.id) : undefined}
        onRemovePhoto={isCustom ? () => removeImage(recipe.id) : undefined}
        photoBusy={uploading}
      />

      <ResponsiveContainer maxWidth={720}>

      {(hasCooked || friendItems.length > 0) && (
        <View style={styles.section}>
          {hasCooked && myRatingValue === null && (
            <Pressable
              style={styles.rateBanner}
              onPress={() => setRateModalVisible(true)}
              testID="rate-reminder-banner"
            >
              <Star size={18} color={Colors.white} fill={Colors.white} />
              <Text style={styles.rateBannerText}>{t('rateAfterCooking')}</Text>
            </Pressable>
          )}

          {hasCooked && myRatingValue !== null && (
            <View style={styles.myRatingRow}>
              <View>
                <Text style={styles.ratingSubTitle}>{t('yourRating')}</Text>
                <RatingStars value={myRatingValue} size={22} />
              </View>
              <Pressable
                style={styles.changeRatingBtn}
                onPress={() => setRateModalVisible(true)}
                testID="change-rating"
              >
                <Text style={styles.changeRatingText}>{t('edit')}</Text>
              </Pressable>
            </View>
          )}

          {friendRatings && friendRatings.count > 0 && (
            <View style={styles.friendRatingsBox}>
              <Text style={styles.ratingSubTitle}>
                {t('friendRatings')} · ★ {friendRatings.avg.toFixed(1)} ({friendRatings.count})
              </Text>
              {friendItems.map((r) => (
                <View key={r.profile.id} style={styles.friendRatingRow}>
                  <Avatar
                    name={r.profile.displayName || r.profile.username}
                    initials={r.profile.initials}
                    color={r.profile.avatarColor ?? undefined}
                    emoji={r.profile.avatarEmoji ?? undefined}
                    size={28}
                  />
                  <View style={styles.friendRatingText}>
                    <RatingStars value={r.rating} size={13} />
                    {!!r.comment && <Text style={styles.friendRatingComment}>{r.comment}</Text>}
                  </View>
                </View>
              ))}
            </View>
          )}
        </View>
      )}

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
          {displayRecipe.ingredients.map((ingredient, index) => {
            const scaledAmount = scaleAmount(ingredient.amount, servingsRatio);
            return (
              <View key={ingredient.id} style={[
                styles.ingredientItem,
                index === displayRecipe.ingredients.length - 1 && styles.lastIngredientItem
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
              {displayRecipe.steps.map((step, index) => {
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

      <AddToPlanModal
        recipe={planModalVisible ? displayRecipe : null}
        visible={planModalVisible}
        onClose={() => setPlanModalVisible(false)}
        onAdded={() => {
          setJustPlanned(true);
          setTimeout(() => setJustPlanned(false), 2500);
        }}
      />

      <ShareRecipeSheet
        recipe={shareSheetVisible ? displayRecipe : null}
        visible={shareSheetVisible}
        onClose={() => setShareSheetVisible(false)}
      />

      <RateRecipeModal
        recipe={rateModalVisible ? displayRecipe : null}
        visible={rateModalVisible}
        onClose={closeRateModal}
        onDone={closeRateModal}
      />
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
  rateBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: Colors.star,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  rateBannerText: { color: Colors.white, fontSize: 15, fontWeight: '700', flex: 1 },
  myRatingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
  },
  ratingSubTitle: { fontSize: 13, fontWeight: '700', color: Colors.textLight, marginBottom: 6 },
  changeRatingBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: Colors.cardSecondary,
  },
  changeRatingText: { fontSize: 13, fontWeight: '700', color: Colors.text },
  friendRatingsBox: {
    marginTop: 12,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: 14,
    gap: 10,
  },
  friendRatingRow: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  friendRatingText: { flex: 1, gap: 2 },
  friendRatingComment: { fontSize: 13, color: Colors.text },
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