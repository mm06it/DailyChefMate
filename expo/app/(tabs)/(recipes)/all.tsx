import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Recipe } from "@/types/recipe";
import { FlatList, StyleSheet, Text, View, ActivityIndicator, Pressable, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { ChefHat } from "lucide-react-native";

import RecipeCard from "@/components/RecipeCard";
import { onHeaderScroll } from "@/components/CollapsingTabHeader";
import { useRecipes } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import Colors from "@/constants/colors";
import themealdb from "@/lib/themealdb";
import { CUISINE_FILTERS } from "@/constants/recipe-filters";
import { useCollapsibleHeader } from "@/hooks/use-collapsible-header";
import { useRecipeFilters } from "@/hooks/use-recipe-filters";
import { useGridLayout } from "@/hooks/use-responsive";

// This tab is browse-only — the search field was removed. Recipes come from
// the local set plus lazily-loaded TheMealDB pages, narrowed by the cuisine /
// course chips in the tab bar.
export default function AllRecipesScreen() {
  const { t } = useLanguage();
  const [onlineResults, setOnlineResults] = useState<Recipe[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreRecipes, setHasMoreRecipes] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const { selectedCuisine, selectedCourse } = useRecipeFilters();
  const recipes = useRecipes("");
  const { setProgress } = useCollapsibleHeader();
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });

  const recipeCategories = useMemo(() => [
    'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork',
    'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat'
  ], []);

  const popularIngredients = useMemo(() => [
    'chicken', 'beef', 'salmon', 'pasta', 'rice', 'cheese', 'tomato', 'mushroom',
    'garlic', 'onion', 'potato', 'lemon', 'herbs', 'bacon', 'shrimp', 'avocado'
  ], []);

  const loadMoreRecipes = useCallback(async () => {
    if (isLoadingMore || !hasMoreRecipes) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      let newRecipes: Recipe[] = [];

      // Load recipes from different categories, then popular ingredients.
      if (nextPage <= recipeCategories.length) {
        const categoryIndex = (nextPage - 1) % recipeCategories.length;
        const category = recipeCategories[categoryIndex];
        console.log(`Loading recipes from category: ${category}`);
        newRecipes = await themealdb.getMealsByCategory(category);
      } else {
        const ingredientIndex = (nextPage - recipeCategories.length - 1) % popularIngredients.length;
        const ingredient = popularIngredients[ingredientIndex];
        console.log(`Loading recipes with ingredient: ${ingredient}`);
        newRecipes = await themealdb.getMealsByIngredient(ingredient);
      }

      // Fallback to random recipes
      if (newRecipes.length === 0) {
        console.log('Loading random recipes as fallback');
        newRecipes = await themealdb.getRandomMeals(6);
      }

      if (newRecipes.length > 0) {
        setOnlineResults(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const uniqueNewRecipes = newRecipes.filter(r => !existingIds.has(r.id));
          return [...prev, ...uniqueNewRecipes];
        });
        setCurrentPage(nextPage);
      } else {
        setHasMoreRecipes(false);
      }
    } catch (error) {
      console.error('Error loading more recipes:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreRecipes, currentPage, recipeCategories, popularIngredients]);

  // Load an initial page of recipes if the local set is thin.
  useEffect(() => {
    if (onlineResults.length === 0 && recipes.length < 10) {
      loadMoreRecipes();
    }
  }, [onlineResults.length, recipes.length, loadMoreRecipes]);

  const getRecipeCourse = useCallback((recipe: Recipe): 'starter' | 'main' | 'dessert' => {
    const course = recipe.course?.toLowerCase() ?? '';
    const cat = recipe.category?.toLowerCase() ?? '';
    if (['vorspeise', 'starter', 'entrée', 'entrada', 'antipasto', 'salad', 'side'].some(x => course.includes(x) || cat.includes(x))) return 'starter';
    if (['nachspeise', 'dessert', 'sweet'].some(x => course.includes(x) || cat.includes(x))) return 'dessert';
    return 'main';
  }, []);

  const filterRecipes = useCallback((recipesToFilter: Recipe[]) => {
    let filtered = recipesToFilter;
    if (selectedCuisine !== 'all') {
      const cfg = CUISINE_FILTERS.find(c => c.id === selectedCuisine);
      if (cfg?.match) {
        filtered = filtered.filter(r => cfg.match?.includes(r.category));
      }
    }
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(r => getRecipeCourse(r) === selectedCourse);
    }
    return filtered;
  }, [selectedCuisine, selectedCourse, getRecipeCourse]);
  
  const displayedRecipes = useMemo(() => {
    const baseRecipes = onlineResults.length > 0 
      ? (() => {
          const combined = [...recipes, ...onlineResults];
          const uniqueRecipes = new Map<string, Recipe>();
          combined.forEach(recipe => {
            uniqueRecipes.set(recipe.id, recipe);
          });
          return Array.from(uniqueRecipes.values());
        })()
      : recipes;
    
    return filterRecipes(baseRecipes);
  }, [recipes, onlineResults, filterRecipes]);

  const renderItem = ({ item }: { item: Recipe }) => {
    return (
      <View style={columns > 1 ? { width: itemWidth } : undefined}>
        <RecipeCard recipe={item} />
      </View>
    );
  };
  
  const renderFooter = () => {
    if (!hasMoreRecipes) {
      return (
        <View style={styles.footerContainer}>
          <ChefHat size={24} color={Colors.textLight} />
          <Text style={styles.footerText}>
            {t('allRecipesLoaded') || 'You\'ve discovered all available recipes!'}
          </Text>
          <Text style={styles.footerSubtext}>
            {t('trySearching') || 'Try searching for specific dishes or ingredients'}
          </Text>
        </View>
      );
    }
    
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingMoreText}>
            {t('loadingMoreRecipes') || 'Discovering more delicious recipes...'}
          </Text>
        </View>
      );
    }
    
    return (
      <Pressable style={styles.loadMoreButton} onPress={loadMoreRecipes}>
        <ChefHat size={20} color={Colors.white} />
        <Text style={styles.loadMoreButtonText}>
          {t('discoverMore') || 'Discover More Recipes'}
        </Text>
      </Pressable>
    );
  };
  
  const handleEndReached = () => {
    if (hasMoreRecipes && !isLoadingMore && displayedRecipes.length > 0) {
      loadMoreRecipes();
    }
  };

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const threshold = 220;
    const p = Math.max(0, Math.min(1, y / threshold));
    setProgress(p);
    onHeaderScroll(e);
  }, [setProgress]);

  return (
    <View style={styles.container}>
      {displayedRecipes.length > 0 ? (
        <FlatList
          key={columns}
          data={displayedRecipes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          testID="recipes-list"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          ListFooterComponent={renderFooter}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} style={styles.emptyLoader} />
          <Text style={styles.emptyText}>
            {t('popularRecipes') || 'Popular Recipes'}
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  emptyLoader: {
    marginBottom: 16,
  },
  listContent: {
    padding: 16,
    paddingTop: 0,
  },
  gridRow: {
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 32,
  },
  emptyText: {
    fontSize: 18,
    color: Colors.text,
    textAlign: 'center',
    fontWeight: '600',
    marginBottom: 8,
  },
  loadingMoreContainer: {
    padding: 20,
    alignItems: 'center',
    gap: 8,
  },
  loadingMoreText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  loadMoreButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: '600',
  },
  footerContainer: {
    padding: 32,
    alignItems: 'center',
    gap: 8,
  },
  footerText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
});