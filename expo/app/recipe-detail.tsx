import { useLocalSearchParams, router } from "expo-router";
import { useQuery } from "convex/react";
import React, { useEffect, useMemo, useState } from "react";
import { ScrollView, StyleSheet, View, Pressable } from "react-native";
import { Minus, Plus, ChefHat, Star } from "lucide-react-native";

import AddToPlanModal from "@/components/AddToPlanModal";
import ShareRecipeSheet from "@/components/ShareRecipeSheet";
import RateRecipeModal from "@/components/RateRecipeModal";
import RatingStars from "@/components/RatingStars";
import Avatar from "@/components/Avatar";
import RecipeDetailHeader from "@/components/RecipeDetailHeader";
import RecipeStepItem from "@/components/RecipeStepItem";
import type { Theme } from "@/constants/theme";
import { api } from "@/convex/_generated/api";
import { getTranslation, translateText, translateAmount } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { useRatings } from "@/hooks/use-ratings";
import { useRecipeImageUpload } from "@/hooks/use-recipe-image";
import { useRequireAuth } from "@/hooks/use-auth-gate";
import { useCookingSession } from "@/hooks/use-cooking-session";
import { useLocalizedRecipes } from "@/hooks/use-localized-recipes";
import ResponsiveContainer from "@/components/ResponsiveContainer";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Text } from "@/components/ui/Text";
import { scaleAmount } from "@/lib/scale-amount";
import { normalizeSteps } from "@/lib/normalize-steps";
import { MENGE_MAX, MENGE_MIN, MENGE_STEP, bakingBaseMenge, clampMenge, formatMengeX } from "@/lib/menge";

const MIN_SERVINGS = 1;
const MAX_SERVINGS = 20;

export default function RecipeDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const { recipes, customRecipes, favorites, cookedRecipes, markRecipeAsCooked, recordRecipeView } =
    useDailyChefMateStore();
  const { currentLanguage, t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { markPlannedCooked } = useMealPlan();
  const { myRating } = useRatings();
  const { pickAndUpload, removeImage, uploading } = useRecipeImageUpload();
  const requireAuth = useRequireAuth();

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
  // Baking recipes scale by a fractional "Menge" (0.25 steps) instead of
  // integer portions.
  const isBaking = recipe?.mode === "baking";
  const localized = useLocalizedRecipes(recipe && !isCustom ? [recipe] : []);
  const localizedRecipe = isCustom ? recipe : localized[0] ?? recipe;

  // External recipe sources cram whole paragraphs into one "step"; split them
  // into short, single-action steps so the cooking view stays scannable.
  const steps = useMemo(
    () => (localizedRecipe ? normalizeSteps(localizedRecipe.steps) : []),
    [localizedRecipe?.steps],
  );

  useEffect(() => {
    if (recipe) {
      recordRecipeView(recipe.id);
    }
    // Only re-fire when the viewed recipe actually changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe?.id]);
  const cooking = useCookingSession();
  const [localCompleted, setLocalCompleted] = useState<boolean[]>([]);
  useEffect(() => {
    setLocalCompleted(new Array(steps.length).fill(false));
  }, [steps.length]);
  const [servings, setServings] = useState<number>(
    isBaking ? bakingBaseMenge(recipe ?? {}) : (recipe?.servings && recipe.servings > 0 ? recipe.servings : 1),
  );
  // Cooking state lives in the persistent session so leaving and coming back
  // (or the top progress bar's "Weiter") stays in sync.
  const sessionMatches =
    !!recipe &&
    cooking.session?.recipeId === recipe.id &&
    cooking.session.steps.length === steps.length;
  const isCooking = sessionMatches;
  const completedSteps = sessionMatches ? cooking.session!.completed : localCompleted;
  const applyCompleted = (next: boolean[]) => {
    if (sessionMatches) cooking.setCompleted(next);
    else setLocalCompleted(next);
  };
  const [planModalVisible, setPlanModalVisible] = useState<boolean>(false);
  const [shareSheetVisible, setShareSheetVisible] = useState<boolean>(false);
  const [rateModalVisible, setRateModalVisible] = useState<boolean>(false);
  const [navigateAfterRate, setNavigateAfterRate] = useState<boolean>(false);
  const [justPlanned, setJustPlanned] = useState<boolean>(false);

  const friendRatings = useQuery(api.ratings.friendRatings, id ? { recipeId: id } : "skip");

  const servingsRatio = useMemo(() => {
    const base = isBaking
      ? bakingBaseMenge(recipe ?? {})
      : (recipe?.servings && recipe.servings > 0 ? recipe.servings : 1);
    return servings / base;
  }, [servings, recipe?.servings, isBaking]);

  if (!recipe) {
    return (
      <View style={styles.errorContainer}>
        <EmptyState
          icon={<ChefHat size={24} color={theme.textMuted} />}
          title={t('recipeNotFound')}
          action={{
            label: t('back'),
            variant: 'secondary',
            onPress: () => (router.canGoBack() ? router.back() : router.replace('/(tabs)/(recipes)/all')),
          }}
        />
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
      applyCompleted(newCompletedSteps);
    }
  };

  const getNextActiveStep = () => {
    return completedSteps.findIndex(completed => !completed);
  };

  const areAllStepsCompleted = () => {
    return completedSteps.every(completed => completed);
  };

  const handleMarkAsCooked = () =>
    requireAuth(() => {
      markRecipeAsCooked(recipe.id);
      markPlannedCooked(recipe.id);
      cooking.stop();
      setNavigateAfterRate(true);
      setRateModalVisible(true);
    });

  const closeRateModal = () => {
    setRateModalVisible(false);
    if (navigateAfterRate) {
      setNavigateAfterRate(false);
      router.push('/(tabs)/(recipes)/all');
    }
  };

  const handleDecreaseServings = () => {
    setServings(prev =>
      isBaking ? clampMenge(prev - MENGE_STEP) : Math.max(MIN_SERVINGS, prev - 1),
    );
  };

  const handleIncreaseServings = () => {
    setServings(prev =>
      isBaking ? clampMenge(prev + MENGE_STEP) : Math.min(MAX_SERVINGS, prev + 1),
    );
  };

  const atMin = isBaking ? servings <= MENGE_MIN : servings <= MIN_SERVINGS;
  const atMax = isBaking ? servings >= MENGE_MAX : servings >= MAX_SERVINGS;

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
              onPress={() => requireAuth(() => setRateModalVisible(true))}
              testID="rate-reminder-banner"
            >
              <Star size={18} color={theme.star} fill={theme.star} />
              <Text variant="label" style={styles.rateBannerText}>{t('rateAfterCooking')}</Text>
            </Pressable>
          )}

          {hasCooked && myRatingValue !== null && (
            <View style={styles.myRatingRow}>
              <View>
                <Text variant="label" color="secondary" style={styles.ratingSubTitle}>{t('yourRating')}</Text>
                <RatingStars value={myRatingValue} size={22} />
              </View>
              <Button label={t('edit')} variant="secondary" size="sm" onPress={() => requireAuth(() => setRateModalVisible(true))} testID="change-rating" />
            </View>
          )}

          {friendRatings && friendRatings.count > 0 && (
            <Card style={styles.friendRatingsBox}>
              <Text variant="label" color="secondary" style={styles.ratingSubTitle}>
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
                    {!!r.comment && <Text variant="bodySm">{r.comment}</Text>}
                  </View>
                </View>
              ))}
            </Card>
          )}
        </View>
      )}

      <View style={styles.section}>
        <View style={styles.ingredientsHeaderRow}>
          <Text variant="h2">{getTranslation(currentLanguage, 'ingredients')}</Text>
          <View style={styles.servingsStepper}>
            <Pressable
              style={[styles.servingsButton, (isCooking || atMin) && styles.servingsButtonDisabled]}
              onPress={handleDecreaseServings}
              disabled={isCooking || atMin}
              testID="servings-decrease"
            >
              <Minus size={16} color={isCooking || atMin ? theme.textMuted : theme.accent} />
            </Pressable>
            <Text variant="title" style={styles.servingsValue} testID="servings-value">
              {isBaking ? formatMengeX(servings) : servings}
            </Text>
            <Pressable
              style={[styles.servingsButton, (isCooking || atMax) && styles.servingsButtonDisabled]}
              onPress={handleIncreaseServings}
              disabled={isCooking || atMax}
              testID="servings-increase"
            >
              <Plus size={16} color={isCooking || atMax ? theme.textMuted : theme.accent} />
            </Pressable>
          </View>
        </View>
        {!isCooking && (
          <Text variant="bodySm" color="muted" style={styles.sectionHint}>
            {getTranslation(currentLanguage, isBaking ? 'amountAdjustHint' : 'servingsAdjustHint')}
          </Text>
        )}
        <Card style={styles.ingredientsList}>
          {displayRecipe.ingredients.map((ingredient, index) => {
            const scaledAmount = scaleAmount(ingredient.amount, servingsRatio);
            return (
              <View key={ingredient.id} style={[
                styles.ingredientItem,
                index === displayRecipe.ingredients.length - 1 && styles.lastIngredientItem
              ]}>
                <Text variant="body" style={styles.ingredientName}>{translateText(currentLanguage, ingredient.name) || ingredient.name}</Text>
                <Text variant="body" color="secondary">{translateAmount(currentLanguage, scaledAmount) || scaledAmount}</Text>
              </View>
            );
          })}
        </Card>
      </View>

      {!isCooking ? (
        <View style={styles.startCookingContainer}>
          <Button
            label={getTranslation(currentLanguage, 'startCooking')}
            size="lg"
            fullWidth
            leftIcon={<ChefHat size={20} color={theme.textOnAccent} />}
            onPress={() =>
              requireAuth(() =>
                cooking.start({ id: recipe.id, name: displayRecipe.name, steps }),
              )
            }
            testID="start-cooking-button"
          />
        </View>
      ) : (
        <>
          <View style={styles.section}>
            <View style={styles.sectionTitleContainer}>
              <Text variant="h2">{getTranslation(currentLanguage, 'instructions')}</Text>
              <Pressable onPress={() => cooking.stop()} hitSlop={8} testID="cancel-cooking">
                <Text variant="bodySm" color="danger">{getTranslation(currentLanguage, 'cancelCooking')}</Text>
              </Pressable>
            </View>
            <Text variant="bodySm" color="muted" style={styles.sectionHint}>{getTranslation(currentLanguage, 'tapToComplete')}</Text>
            <View style={styles.stepsList}>
              {steps.map((step, index) => {
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

          <View style={styles.doneButtonContainer}>
            <Button
              label={getTranslation(currentLanguage, 'done')}
              size="lg"
              fullWidth
              disabled={!areAllStepsCompleted()}
              onPress={handleMarkAsCooked}
              testID="done-button"
            />
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

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: t.bg,
    },
    errorContainer: {
      flex: 1,
      justifyContent: "center",
      alignItems: "center",
      backgroundColor: t.bg,
    },
    section: {
      marginTop: t.space[7],
      paddingHorizontal: t.space[5],
    },
    sectionTitleContainer: {
      marginBottom: t.space[4],
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    sectionHint: {
      marginTop: 2,
    },
    rateBanner: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[3],
      backgroundColor: t.accentSubtle,
      borderRadius: t.radius.md,
      paddingVertical: t.space[4],
      paddingHorizontal: t.space[4],
    },
    rateBannerText: { color: t.accent, flex: 1 },
    myRatingRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      borderRadius: t.radius.lg,
      padding: t.space[4],
    },
    ratingSubTitle: { marginBottom: t.space[2] },
    friendRatingsBox: {
      marginTop: t.space[4],
      gap: t.space[3],
    },
    friendRatingRow: { flexDirection: "row", alignItems: "flex-start", gap: t.space[3] },
    friendRatingText: { flex: 1, gap: 2 },
    ingredientsHeaderRow: {
      flexDirection: "row",
      alignItems: "center",
      justifyContent: "space-between",
    },
    servingsStepper: {
      flexDirection: "row",
      alignItems: "center",
      gap: t.space[4],
      backgroundColor: t.surfaceSunken,
      borderRadius: t.radius.pill,
      paddingHorizontal: t.space[3],
      paddingVertical: t.space[1],
    },
    servingsButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      backgroundColor: t.surface,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      alignItems: "center",
      justifyContent: "center",
    },
    servingsButtonDisabled: { opacity: 0.5 },
    servingsValue: { minWidth: 34, textAlign: "center" },
    startCookingContainer: {
      padding: t.space[5],
      marginTop: t.space[3],
    },
    ingredientsList: {
      marginTop: t.space[3],
    },
    ingredientItem: {
      flexDirection: "row",
      justifyContent: "space-between",
      paddingVertical: t.space[3],
      borderBottomWidth: t.borderWidth.hairline,
      borderBottomColor: t.border,
    },
    ingredientName: { flex: 1, paddingRight: t.space[4] },
    stepsList: { marginTop: t.space[3] },
    lastIngredientItem: { borderBottomWidth: 0 },
    doneButtonContainer: {
      padding: t.space[5],
      paddingBottom: t.space[8],
    },
  });