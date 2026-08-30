import { Stack, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Recipe } from "@/types/recipe";
import { Animated, FlatList, StyleSheet, Text, View, ActivityIndicator, Pressable, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { RefreshCw, ChefHat } from "lucide-react-native";

import RecipeCard from "@/components/RecipeCard";
import CollapsingTabHeader, {
  headerTranslateY,
  onHeaderScroll,
  resetHeader,
  useHeaderContentPadding,
} from "@/components/CollapsingTabHeader";
import Colors from "@/constants/colors";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import themealdb from "@/lib/themealdb";
import { useGridLayout, useIsDesktop } from "@/hooks/use-responsive";

export default function GeneratedRecipesScreen() {
  const { t } = useLanguage();
  const { generateRecipesFromIngredients, getSelectedIngredients } = useDailyChefMateStore();
  const [onlineRecipes, setOnlineRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreRecipes, setHasMoreRecipes] = useState<boolean>(true);
  const [currentPage, setCurrentPage] = useState<number>(0);
  const selectedIngredients = getSelectedIngredients();
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();

  // Keep the shared collapsing header from staying stuck-hidden when this
  // screen gains focus with a non-zero scroll position.
  useFocusEffect(useCallback(() => resetHeader(), []));
  
  // Categories to cycle through for endless recipes
  const recipeCategories = useMemo(() => [
    'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork', 
    'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat'
  ], []);
  
  // Common ingredients to search by
  const commonIngredients = useMemo(() => [
    'chicken', 'beef', 'pork', 'fish', 'rice', 'pasta', 'tomato', 'onion',
    'garlic', 'cheese', 'potato', 'carrot', 'mushroom', 'pepper', 'lemon',
    'butter', 'egg', 'milk', 'flour', 'oil', 'salt', 'sugar', 'herbs'
  ], []);

  const handleGenerateOnlineRecipes = useCallback(async (reset: boolean = false) => {
    if (selectedIngredients.length === 0) return;
    
    if (reset) {
      setIsLoading(true);
      setCurrentPage(0);
      setHasMoreRecipes(true);
    }
    
    try {
      const recipes = await generateRecipesFromIngredients();
      if (reset) {
        setOnlineRecipes(recipes);
      } else {
        setOnlineRecipes(prev => {
          const existingIds = new Set(prev.map(r => r.id));
          const newRecipes = recipes.filter(r => !existingIds.has(r.id));
          return [...prev, ...newRecipes];
        });
      }
    } catch (error) {
      console.error('Error generating online recipes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIngredients.length, generateRecipesFromIngredients]);
  
  const loadMoreRecipes = useCallback(async () => {
    if (isLoadingMore || !hasMoreRecipes) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      let newRecipes: Recipe[] = [];
      
      // Strategy 1: Use selected ingredients if available
      if (selectedIngredients.length > 0 && nextPage <= 3) {
        const ingredientIndex = (nextPage - 1) % selectedIngredients.length;
        const ingredient = selectedIngredients[ingredientIndex].name;
        console.log(`Loading more recipes with ingredient: ${ingredient}`);
        newRecipes = await themealdb.getMealsByIngredient(ingredient);
      }
      
      // Strategy 2: Use random categories
      if (newRecipes.length === 0) {
        const categoryIndex = nextPage % recipeCategories.length;
        const category = recipeCategories[categoryIndex];
        console.log(`Loading more recipes from category: ${category}`);
        newRecipes = await themealdb.getMealsByCategory(category);
      }
      
      // Strategy 3: Use common ingredients as fallback
      if (newRecipes.length === 0) {
        const ingredientIndex = nextPage % commonIngredients.length;
        const ingredient = commonIngredients[ingredientIndex];
        console.log(`Loading more recipes with common ingredient: ${ingredient}`);
        newRecipes = await themealdb.getMealsByIngredient(ingredient);
      }
      
      // Strategy 4: Get random recipes as last resort
      if (newRecipes.length === 0) {
        console.log('Loading random recipes as fallback');
        newRecipes = await themealdb.getRandomMeals(8);
      }
      
      if (newRecipes.length > 0) {
        setOnlineRecipes(prev => {
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
  }, [isLoadingMore, hasMoreRecipes, currentPage, selectedIngredients, recipeCategories, commonIngredients]);

  useEffect(() => {
    if (selectedIngredients.length > 0 && onlineRecipes.length === 0) {
      handleGenerateOnlineRecipes(true);
    }
  }, [selectedIngredients.length, onlineRecipes.length, handleGenerateOnlineRecipes]);

  // Only the real ingredient-search results — deduped by id. (The local
  // mock-catalog matches were dropped: they made an unrelated recipe like
  // "French Omelette" show up first every time.)
  const allRecipes = (() => {
    const uniqueRecipes = new Map<string, Recipe>();
    onlineRecipes.forEach((recipe) => uniqueRecipes.set(recipe.id, recipe));
    return Array.from(uniqueRecipes.values());
  })();
  const renderItem = ({ item }: { item: Recipe }) => (
    <View style={columns > 1 ? { width: itemWidth } : undefined}>
      {/* "Vorhanden:" / "Fehlt noch:" lines are rendered inside RecipeCard,
          stacked above the recipe name. */}
      <RecipeCard recipe={item} />
    </View>
  );
  
  const renderFooter = () => {
    if (!hasMoreRecipes) {
      return (
        <View style={styles.footerContainer}>
          <ChefHat size={24} color={Colors.textLight} />
          <Text style={styles.footerText}>
            {t('allRecipesLoaded') || 'You\'ve seen all available recipes!'}
          </Text>
          <Text style={styles.footerSubtext}>
            {t('tryDifferentIngredients') || 'Try selecting different ingredients for more suggestions'}
          </Text>
        </View>
      );
    }
    
    if (isLoadingMore) {
      return (
        <View style={styles.loadingMoreContainer}>
          <ActivityIndicator size="small" color={Colors.primary} />
          <Text style={styles.loadingMoreText}>
            {t('loadingMoreRecipes') || 'Loading more delicious recipes...'}
          </Text>
        </View>
      );
    }
    
    return (
      <Pressable style={styles.loadMoreButton} onPress={loadMoreRecipes}>
        <ChefHat size={20} color={Colors.white} />
        <Text style={styles.loadMoreButtonText}>
          {t('loadMoreRecipes') || 'Load More Recipes'}
        </Text>
      </Pressable>
    );
  };
  
  const handleEndReached = () => {
    if (hasMoreRecipes && !isLoadingMore && allRecipes.length > 0) {
      loadMoreRecipes();
    }
  };

  const handleScroll = useCallback(
    (e: NativeSyntheticEvent<NativeScrollEvent>) => {
      if (!isDesktop) onHeaderScroll(e);
    },
    [isDesktop],
  );

  const content = (
    <>
      {selectedIngredients.length > 0 && (
        <View style={styles.ingredientsInfo}>
          <Text style={styles.ingredientsText}>
            {t('selectedIngredients') || 'Selected ingredients'}: {selectedIngredients.map(i => i.name).join(', ')}
          </Text>
          <Pressable 
            style={styles.refreshButton}
            onPress={() => handleGenerateOnlineRecipes(true)}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.white} />
            ) : (
              <RefreshCw size={16} color={Colors.white} />
            )}
            <Text style={styles.refreshButtonText}>
              {isLoading ? (t('searching') || 'Searching...') : (t('refreshRecipes') || 'Refresh Recipes')}
            </Text>
          </Pressable>
        </View>
      )}
      
      {isLoading && allRecipes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>
            {t('searchingRecipes') || 'Searching for recipes with your ingredients...'}
          </Text>
        </View>
      ) : allRecipes.length > 0 ? (
        <FlatList
          key={columns}
          data={allRecipes}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          numColumns={columns}
          columnWrapperStyle={columns > 1 ? styles.gridRow : undefined}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
          testID="generated-recipes-list"
          onEndReached={handleEndReached}
          onEndReachedThreshold={0.3}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          ListFooterComponent={renderFooter}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
        />
      ) : (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>
            {selectedIngredients.length === 0
              ? (t('selectIngredients') || 'Select ingredients from your refrigerator')
              : (t('noMatchingRecipes') || 'No matching recipes found')
            }
          </Text>
          <Text style={styles.emptySubtext}>
            {selectedIngredients.length === 0
              ? (t('selectIngredientsHint') || 'Go to the refrigerator tab and select at least 2 ingredients')
              : (t('tryDifferentIngredients') || 'Try selecting different ingredients or search for recipes manually')
            }
          </Text>
        </View>
      )}
    </>
  );

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: "Generated Recipes",
          headerTitleStyle: styles.headerTitle,
          headerShown: isDesktop,
        }}
      />

      {!isDesktop && <CollapsingTabHeader showBack />}

      {isDesktop ? (
        <View style={styles.body}>{content}</View>
      ) : (
        // Ride the content up with the header as it collapses on scroll-down.
        <Animated.View
          style={[
            styles.body,
            { paddingTop: topPad, marginBottom: -topPad, transform: [{ translateY: headerTranslateY }] },
          ]}
        >
          {content}
        </Animated.View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  body: {
    flex: 1,
  },
  headerTitle: {
    fontWeight: "600",
    fontSize: 18,
  },
  ingredientsInfo: {
    padding: 16,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    gap: 12,
  },
  ingredientsText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  refreshButtonText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: '600',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    gap: 16,
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
  },
  listContent: {
    padding: 16,
  },
  gridRow: {
    gap: 16,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 32,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: "center",
    lineHeight: 22,
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