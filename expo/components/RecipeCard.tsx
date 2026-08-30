import { router } from "expo-router";
import { Star, UtensilsCrossed } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { translateText, translateIngredientName } from "@/constants/translations";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { Recipe } from "@/types/recipe";

interface RecipeCardProps {
  recipe: Recipe;
}

export default function RecipeCard({ recipe }: RecipeCardProps) {
  const { toggleFavorite } = useDailyChefMateStore();
  const { currentLanguage, t } = useLanguage();
  const [imageError, setImageError] = useState<boolean>(false);
  const showImage = !!recipe.image && !imageError;

  const handlePress = () => {
    router.push(`/recipe-detail?id=${recipe.id}`);
  };

  const handleFavoritePress = () => {
    toggleFavorite(recipe.id);
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
          <Pressable 
            onPress={handleFavoritePress} 
            hitSlop={10}
            style={styles.favoriteButton}
            testID={`recipe-card-${recipe.id}-favorite`}
          >
            <Star
              size={22}
              color={recipe.isFavorite ? Colors.primary : Colors.textLight}
              fill={recipe.isFavorite ? Colors.primary : "none"}
            />
          </Pressable>
        </View>
        <View style={styles.details}>
          <View style={styles.ratingPill}>
            <Text style={styles.ratingText}>★ {recipe.rating.toFixed(1)}</Text>
          </View>
          <View style={styles.timePill}>
            <Text style={styles.timeText}>{recipe.cookTime}</Text>
          </View>
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