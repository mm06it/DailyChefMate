import { router } from "expo-router";
import { CalendarCheck, CalendarPlus, Globe, Lock, Star, UtensilsCrossed } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, View } from "react-native";

import AddToPlanModal from "@/components/AddToPlanModal";
import type { Theme } from "@/constants/theme";
import { translateText, translateIngredientName } from "@/constants/translations";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { useRatings } from "@/hooks/use-ratings";
import { useFitnessMode } from "@/hooks/use-fitness-mode";
import { useRecipeNutrition } from "@/hooks/use-recipe-nutrition";
import { useToast } from "@/components/Toast";
import { Badge } from "@/components/ui/Badge";
import { Text } from "@/components/ui/Text";
import { Nutrition, Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
  // Fitness Mode: per-serving nutrition, supplied by list screens that batch
  // the estimate. Omitted → the card estimates its own when Fitness Mode is on.
  nutrition?: Nutrition;
}

export default function RecipeCard({ recipe, nutrition }: RecipeCardProps) {
  const { toggleFavorite, favorites, cookedRecipes } = useDailyChefMateStore();
  const { entries: planEntries } = useMealPlan();
  const { getRatingStats, myRatedIds } = useRatings();
  const { currentLanguage, t } = useLanguage();
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { showToast } = useToast();
  const [imageError, setImageError] = useState<boolean>(false);
  const [planModalVisible, setPlanModalVisible] = useState<boolean>(false);
  const [justPlanned, setJustPlanned] = useState<boolean>(false);
  const planPulse = useRef(new Animated.Value(1)).current;

  const favorited = useMemo(
    () => recipe.isFavorite || favorites.some((f) => f.id === recipe.id),
    [recipe.isFavorite, recipe.id, favorites],
  );
  const inPlan = useMemo(
    () => planEntries.some((e) => e.recipe.id === recipe.id),
    [planEntries, recipe.id],
  );

  const ratingStat = getRatingStats(recipe.id);
  const displayRating = ratingStat && ratingStat.count > 0 ? ratingStat.avg : recipe.rating;
  const ratingCount = ratingStat?.count ?? 0;
  const needsRating = (cookedRecipes[recipe.id] ?? 0) > 0 && !myRatedIds.has(recipe.id);

  // Fitness Mode: kcal + protein for the recipe's stated yield.
  const { enabled: fitnessMode } = useFitnessMode();
  const ownNutrition = useRecipeNutrition(fitnessMode && !nutrition ? [recipe] : []);
  const nutri = nutrition ?? ownNutrition[recipe.id];
  const perYield = recipe.servings && recipe.servings > 0 ? recipe.servings : 1;
  const macroLine =
    fitnessMode && nutri
      ? `${nutri.estimated ? "~" : ""}${Math.round(nutri.calories * perYield)} kcal · ${Math.round(nutri.protein * perYield)} g P`
      : null;

  useEffect(() => {
    if (!justPlanned) return;
    planPulse.setValue(0.6);
    Animated.spring(planPulse, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
    const timer = setTimeout(() => setJustPlanned(false), 2200);
    return () => clearTimeout(timer);
  }, [justPlanned, planPulse]);

  const showImage = !!recipe.image && !imageError;

  const handlePress = () => router.push(`/recipe-detail?id=${recipe.id}`);

  const handleFavoritePress = () => {
    const wasFav = favorited;
    toggleFavorite(recipe.id);
    showToast(
      wasFav ? t("removedFromFavoritesToast") : t("addedToFavoritesToast"),
      { icon: "star", variant: wasFav ? "info" : "success" },
    );
  };

  const translatedName = useMemo(() => translateText(currentLanguage, recipe.name) || recipe.name, [currentLanguage, recipe.name]);
  const translatedCategory = useMemo(() => translateText(currentLanguage, recipe.category) || recipe.category, [currentLanguage, recipe.category]);

  const courseLabel = useMemo(() => {
    const lang = currentLanguage ?? "de";
    const labels: Record<string, { starter: string; main: string; dessert: string }> = {
      de: { starter: "Vorspeise", main: "Hauptspeise", dessert: "Nachspeise" },
      en: { starter: "Starter", main: "Main", dessert: "Dessert" },
    } as const;
    const cat = recipe.category?.toLowerCase() ?? "";
    let key: "starter" | "main" | "dessert" | null = null;
    if (recipe.course) {
      const c = recipe.course.toLowerCase();
      if (["vorspeise", "starter", "entrée", "entrada", "antipasto"].includes(c)) key = "starter";
      if (["hauptspeise", "main", "plat", "piatto principale"].includes(c)) key = "main";
      if (["nachspeise", "dessert", "postre"].includes(c)) key = "dessert";
    }
    if (!key) {
      if (cat === "dessert") key = "dessert";
      else if (cat === "starter" || cat === "salad" || cat === "side" || cat === "appetizer") key = "starter";
      else key = "main";
    }
    return (labels[lang] ?? labels.de)[key];
  }, [currentLanguage, recipe.category, recipe.course]);

  return (
    <>
      <Pressable
        style={({ pressed }) => [styles.card, pressed && styles.pressed]}
        onPress={handlePress}
        testID={`recipe-card-${recipe.id}`}
      >
        {showImage ? (
          <Image source={{ uri: recipe.image }} style={styles.image} onError={() => setImageError(true)} />
        ) : (
          <View style={[styles.image, styles.imageFallback]}>
            <UtensilsCrossed size={32} color={theme.textMuted} />
          </View>
        )}

        <View style={styles.body}>
          {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
            <Text variant="caption" color="success" numberOfLines={2} testID={`recipe-card-${recipe.id}-used`}>
              {(t("recipeUses") || "Vorhanden")}:{" "}
              {recipe.usedIngredients.map((i) => translateIngredientName(currentLanguage, i)).join(" · ")}
            </Text>
          )}
          {recipe.missedIngredients && recipe.missedIngredients.length > 0 && (
            <Text variant="caption" color="muted" numberOfLines={2} testID={`recipe-card-${recipe.id}-missed`}>
              {(t("recipeMissing") || "Fehlt noch")}:{" "}
              {recipe.missedIngredients.map((i) => translateIngredientName(currentLanguage, i)).join(" · ")}
            </Text>
          )}

          <View style={styles.headRow}>
            <Text variant="h3" numberOfLines={2} style={styles.name}>
              {translatedName}
            </Text>
            <View style={styles.actionsCol}>
              <View style={styles.actions}>
                <Pressable
                  onPress={() => setPlanModalVisible(true)}
                  hitSlop={10}
                  style={styles.actionBtn}
                  testID={`recipe-card-${recipe.id}-plan`}
                  accessibilityLabel={t("addToWeekPlan")}
                >
                  <Animated.View style={{ transform: [{ scale: planPulse }] }}>
                    {justPlanned || inPlan ? (
                      <CalendarCheck size={20} color={theme.success} />
                    ) : (
                      <CalendarPlus size={20} color={theme.textMuted} />
                    )}
                  </Animated.View>
                </Pressable>
                <Pressable
                  onPress={handleFavoritePress}
                  hitSlop={10}
                  style={styles.actionBtn}
                  testID={`recipe-card-${recipe.id}-favorite`}
                >
                  <Star
                    size={20}
                    color={favorited ? theme.star : theme.textMuted}
                    fill={favorited ? theme.star : "none"}
                  />
                </Pressable>
              </View>
              {macroLine && (
                <Text variant="caption" style={styles.macroLine} testID={`recipe-card-${recipe.id}-macros`}>
                  {macroLine}
                </Text>
              )}
            </View>
          </View>

          <View style={styles.metaRow}>
            <Badge label={`★ ${displayRating.toFixed(1)} (${ratingCount})`} tone="star" />
            <Badge label={recipe.cookTime} tone="neutral" />
            {needsRating && (
              <Pressable onPress={handlePress} testID={`recipe-card-${recipe.id}-rate`}>
                <Badge label={t("notRatedYet")} tone="accent" />
              </Pressable>
            )}
          </View>

          <View style={styles.metaRow}>
            <Badge label={translatedCategory} tone="neutral" testID={`recipe-card-${recipe.id}-category-badge`} />
            <Badge label={courseLabel} tone="neutral" testID={`recipe-card-${recipe.id}-course-badge`} />
            {(recipe.visibility === "private" || recipe.visibility === "public") && (
              <View style={styles.visibility}>
                {recipe.visibility === "private" ? (
                  <Lock size={11} color={theme.textMuted} />
                ) : (
                  <Globe size={11} color={theme.textMuted} />
                )}
                <Text variant="caption" color="muted">
                  {recipe.visibility === "private" ? t("visibilityPrivate") : t("visibilityPublic")}
                </Text>
              </View>
            )}
          </View>
        </View>
      </Pressable>

      <AddToPlanModal
        recipe={planModalVisible ? recipe : null}
        visible={planModalVisible}
        onClose={() => setPlanModalVisible(false)}
        onAdded={() => setJustPlanned(true)}
      />
    </>
  );
}

const makeStyles = (t: Theme) =>
  StyleSheet.create({
    card: {
      backgroundColor: t.surface,
      borderRadius: t.radius.lg,
      borderWidth: t.borderWidth.hairline,
      borderColor: t.border,
      overflow: "hidden",
      marginBottom: t.space[5],
      ...t.elevation.sm,
    },
    pressed: { opacity: 0.94 },
    image: { width: "100%", height: 184, resizeMode: "cover" },
    imageFallback: {
      alignItems: "center",
      justifyContent: "center",
      backgroundColor: t.surfaceSunken,
    },
    body: { padding: t.space[4], gap: t.space[3] },
    headRow: {
      flexDirection: "row",
      justifyContent: "space-between",
      alignItems: "flex-start",
      gap: t.space[3],
    },
    name: { flex: 1 },
    actionsCol: { alignItems: "flex-end", gap: 2 },
    actions: { flexDirection: "row", alignItems: "center", gap: t.space[1] },
    actionBtn: { padding: t.space[2] },
    macroLine: { color: t.textSecondary, fontFamily: t.font.bodySemibold },
    metaRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: t.space[2] },
    visibility: { flexDirection: "row", alignItems: "center", gap: 3 },
  });
