import { Heart, Clock, Users } from "lucide-react-native";
import React, { useMemo, useState } from "react";
import { Image, Pressable, StyleSheet, Text, View } from "react-native";

import Colors from "@/constants/colors";
import { getTranslation, translateText } from "@/constants/translations";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { Recipe } from "@/types/recipe";

interface RecipeDetailHeaderProps {
  recipe: Recipe;
}

export default function RecipeDetailHeader({ recipe }: RecipeDetailHeaderProps) {
  const { toggleFavorite } = useDailyChefMateStore();
  const { currentLanguage } = useLanguage();
  const [imageError, setImageError] = useState<boolean>(false);

  const fallbackImage = "https://images.unsplash.com/photo-1546548970-71785318a17b?ixlib=rb-1.2.1&auto=format&fit=crop&w=800&q=80";

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
    <View style={styles.container}>
      <Image 
        source={{ uri: imageError ? fallbackImage : recipe.image }} 
        style={styles.image}
        onError={() => setImageError(true)}
      />
      
      <View style={styles.content}>
        <View style={styles.titleRow}>
          <View style={styles.titleWithBadge}>
            <Text style={styles.title}>{translatedName}</Text>
            <View style={styles.badgesRow}>
              <View style={styles.categoryBadge} testID={`recipe-detail-${recipe.id}-category-badge`}>
                <Text style={styles.categoryBadgeText}>{translatedCategory}</Text>
              </View>
              <View style={styles.courseBadge} testID={`recipe-detail-${recipe.id}-course-badge`}>
                <Text style={styles.courseBadgeText}>{courseLabel}</Text>
              </View>
            </View>
          </View>
          <Pressable 
            onPress={handleFavoritePress} 
            hitSlop={10}
            style={styles.favoriteButton}
          >
            <Heart 
              size={24} 
              color={recipe.isFavorite ? Colors.favorite : Colors.textLight} 
              fill={recipe.isFavorite ? Colors.favorite : "none"} 
            />
          </Pressable>
        </View>
        
        <View style={styles.metaRow}>
          <View style={styles.ratingContainer}>
            <Text style={styles.rating}>★ {recipe.rating.toFixed(1)}</Text>
          </View>
          <Text style={styles.categoryPlain}>{translatedCategory}</Text>
        </View>
        
        <View style={styles.infoRow}>
          <View style={styles.infoItem}>
            <Clock size={18} color={Colors.textLight} />
            <Text style={styles.infoText}>{recipe.cookTime}</Text>
          </View>
          <View style={styles.infoItem}>
            <Users size={18} color={Colors.textLight} />
            <Text style={styles.infoText}>{recipe.servings} {getTranslation(currentLanguage, 'servings')}</Text>
          </View>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.background,
  },
  image: {
    width: "100%",
    height: 250,
    resizeMode: "cover",
  },
  content: {
    padding: 16,
  },
  titleRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 8,
  },
  titleWithBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    flex: 1,
  },
  badgesRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  title: {
    fontSize: 24,
    fontWeight: "700",
    color: Colors.text,
    flexShrink: 1,
  },
  categoryBadge: {
    backgroundColor: "#F1F5F9",
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  categoryBadgeText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  courseBadge: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 10,
    paddingVertical: 3,
    borderRadius: 999,
  },
  courseBadgeText: {
    fontSize: 13,
    color: Colors.white,
  },
  favoriteButton: {
    padding: 4,
  },
  metaRow: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 12,
    gap: 12,
  },
  categoryPlain: {
    fontSize: 16,
    color: Colors.textLight,
  },
  ratingContainer: {
    flexDirection: "row",
    alignItems: "center",
  },
  rating: {
    fontSize: 16,
    fontWeight: "500",
    color: Colors.rating,
  },
  infoRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  infoItem: {
    flexDirection: "row",
    alignItems: "center",
    marginRight: 16,
  },
  infoText: {
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 6,
  },
});