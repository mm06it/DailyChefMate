import { router } from "expo-router";
import { CalendarCheck, CalendarPlus, Globe, Lock, Star, UtensilsCrossed } from "lucide-react-native";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Animated, Image, Pressable, StyleSheet, Text, View } from "react-native";

import AddToPlanModal from "@/components/AddToPlanModal";
import Colors from "@/constants/colors";
import { translateText, translateIngredientName } from "@/constants/translations";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useMealPlan } from "@/hooks/use-meal-plan";
import { useRatings } from "@/hooks/use-ratings";
import { useToast } from "@/components/Toast";
import { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const { toggleFavorite, favorites, cookedRecipes } = useDailyChefMateStore();
  const { entries: planEntries } = useMealPlan();
  const { getRatingStats, myRatedIds } = useRatings();
  const { currentLanguage, t } = useLanguage();
  const { showToast } = useToast();
  const [imageError, setImageError] = useState<boolean>(false);
  const [planModalVisible, setPlanModalVisible] = useState<boolean>(false);
  const [justPlanned, setJustPlanned] = useState<boolean>(false);
  const planPulse = useRef(new Animated.Value(1)).current;

  // Live state (don't trust the prop's isFavorite — browse-tab cards carry a
  // stale flag): the star and the plan icon reflect the real data.
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

  useEffect(() => {
    if (!justPlanned) return;
    planPulse.setValue(0.6);
    Animated.spring(planPulse, { toValue: 1, useNativeDriver: true, friction: 4 }).start();
    const timer = setTimeout(() => setJustPlanned(false), 2200);
    return () => clearTimeout(timer);
  }, [justPlanned, planPulse]);

  const showImage = !!recipe.image && !imageError;

  const handlePress = () => {
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

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
    const lang = currentLanguage ?? 'de';
    const labels: Record<string, { starter: string; main: string; dessert: string }> = {
      de: { starter: 'Vorspeise', main: 'Hauptspeise', dessert: 'Nachspeise' },
      en: { starter: 'Starter', main: 'Main', dessert: 'Dessert' },
    } as const;
    const cat = recipe.category?.toLowerCase() ?? '';
    let key: 'starter' | 'main' | 'dessert' | null = null;
    if (recipe.course) {
      const c = recipe.course.toLowerCase();
      if (['vorspeise', 'starter', 'entrée', 'entrada', 'antipasto'].includes(c)) key = 'starter';
      if (['hauptspeise', 'main', 'plat', 'piatto principale'].includes(c)) key = 'main';
      if (['nachspeise', 'dessert', 'postre'].includes(c)) key = 'dessert';
    }
    if (!key) {
      if (cat === 'dessert') key = 'dessert';
      else if (cat === 'starter' || cat === 'salad' || cat === 'side' || cat === 'appetizer') key = 'starter';
      else key = 'main';
    }
    const bundle = labels[lang] ?? labels.de;
    return bundle[key];
  }, [currentLanguage, recipe.category, recipe.course]);

  return (
    <>
    <Pressable
      style={styles.container}
      onPress={handlePress}
      testID={`recipe-card-${recipe.id}`}
    >
      {showImage ? (
        <Image
          source={{ uri: recipe.image }}
          style={styles.image}
          onError={() => setImageError(true)}
        />
      ) : (
        <View style={[styles.image, styles.imageFallback]}>
          <UtensilsCrossed size={36} color={Colors.textLight} />
        </View>
      )}
      <View style={styles.infoContainer}>
        {recipe.usedIngredients && recipe.usedIngredients.length > 0 && (
          <Text
            style={styles.usedIngredients}
            numberOfLines={2}
            testID={`recipe-card-${recipe.id}-used`}
          >
            {(t('recipeUses') || 'Vorhanden')}:{' '}
            {recipe.usedIngredients
              .map((i) => translateIngredientName(currentLanguage, i))
              .join(' · ')}
          </Text>
        )}
        {recipe.missedIngredients && recipe.missedIngredients.length > 0 && (
          <Text
            style={styles.missedIngredients}
            numberOfLines={2}
            testID={`recipe-card-${recipe.id}-missed`}
          >
            {(t('recipeMissing') || 'Fehlt noch')}:{' '}
            {recipe.missedIngredients
              .map((i) => translateIngredientName(currentLanguage, i))
              .join(' · ')}
          </Text>
        )}
        <View style={styles.header}>
          <View style={styles.titleWithBadge}>
            <Text style={styles.name}>{translatedName}</Text>
          </View>
          <View style={styles.cardActions}>
            <View style={styles.cardActionIcons}>
              <Pressable
                onPress={() => setPlanModalVisible(true)}
                hitSlop={10}
                style={styles.favoriteButton}
                testID={`recipe-card-${recipe.id}-plan`}
                accessibilityLabel={t('addToWeekPlan')}
              >
                <Animated.View style={{ transform: [{ scale: planPulse }] }}>
                  {justPlanned || inPlan ? (
                    <CalendarCheck size={22} color={Colors.success} />
                  ) : (
                    <CalendarPlus size={22} color={Colors.textLight} />
                  )}
                </Animated.View>
              </Pressable>
              <Pressable
                onPress={handleFavoritePress}
                hitSlop={10}
                style={styles.favoriteButton}
                testID={`recipe-card-${recipe.id}-favorite`}
              >
                <Star
                  size={22}
                  color={favorited ? Colors.star : Colors.textLight}
                  fill={favorited ? Colors.star : "none"}
                />
              </Pressable>
            </View>
            {(recipe.visibility === "private" || recipe.visibility === "public") && (
              <View style={styles.visibilityRow}>
                {recipe.visibility === "private" ? (
                  <Lock size={12} color={Colors.textLight} />
                ) : (
                  <Globe size={12} color={Colors.textLight} />
                )}
                <Text style={styles.visibilityText}>
                  {recipe.visibility === "private" ? t("visibilityPrivate") : t("visibilityPublic")}
                </Text>
              </View>
            )}
          </View>
        </View>
        <View style={styles.details}>
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>
              ★ {displayRating.toFixed(1)} ({ratingCount})
            </Text>
          </View>
          <View style={styles.timePill}>
            <Text style={styles.timeText}>{recipe.cookTime}</Text>
          </View>
          {needsRating && (
            <Pressable style={styles.ratePill} onPress={handlePress} testID={`recipe-card-${recipe.id}-rate`}>
              <Text style={styles.ratePillText}>{t("notRatedYet")}</Text>
            </Pressable>
          )}
        </View>
        <View style={styles.badgesRow}>
          <View style={styles.categoryBadge} testID={`recipe-card-${recipe.id}-category-badge`}>
            <Text style={styles.categoryBadgeText}>{translatedCategory}</Text>
          </View>
          <View style={styles.courseBadge} testID={`recipe-card-${recipe.id}-course-badge`}>
            <Text style={styles.courseBadgeText}>{courseLabel}</Text>
          </View>
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

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    overflow: "hidden",
    marginBottom: 16,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 3,
  },
  image: {
    width: "100%",
    height: 190,
    resizeMode: "cover",
  },
  imageFallback: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.cardSecondary,
  },
  infoContainer: {
    padding: 14,
    gap: 6,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
    gap: 8,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  name: {
    fontSize: 18,
    fontWeight: "700",
    color: Colors.text,
    flexShrink: 1,
  },
  usedIngredients: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.success,
    lineHeight: 16,
    marginBottom: 2,
  },
  missedIngredients: {
    fontSize: 12,
    fontWeight: "600",
    color: Colors.textLight,
    lineHeight: 16,
    marginBottom: 2,
  },
  categoryBadge: {
    backgroundColor: Colors.cardSecondary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  courseBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  courseBadgeText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '600',
  },
  cardActions: {
    alignItems: "flex-end",
  },
  cardActionIcons: {
    flexDirection: "row",
    alignItems: "center",
    gap: 2,
  },
  visibilityRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 3,
    marginTop: 2,
  },
  visibilityText: {
    fontSize: 11,
    fontWeight: "600",
    color: Colors.textLight,
  },
  favoriteButton: {
    padding: 6,
    backgroundColor: Colors.card,
    borderRadius: 16,
  },
  details: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginTop: 6,
  },
  ratingPill: {
    backgroundColor: '#FFF7ED',
    borderColor: '#FFE4CC',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratingText: {
    fontSize: 12,
    color: Colors.orange,
    fontWeight: '700',
  },
  ratePill: {
    backgroundColor: Colors.star,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  ratePillText: {
    fontSize: 12,
    color: Colors.white,
    fontWeight: '700',
  },
  timePill: {
    backgroundColor: '#F0F7FF',
    borderColor: '#D8EBFF',
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
  },
  timeText: {
    fontSize: 12,
    color: Colors.accent,
    fontWeight: '700',
  },
  category: {
    fontSize: 14,
    color: Colors.textLight,
  },
});