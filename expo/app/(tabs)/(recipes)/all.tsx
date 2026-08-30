import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Recipe } from "@/types/recipe";
import { FlatList, StyleSheet, Text, View, ActivityIndicator, Pressable, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { ChefHat } from "lucide-react-native";
import { useScrollToTop } from "@react-navigation/native";

import RecipeCard from "@/components/RecipeCard";
import { onHeaderScroll } from "@/components/CollapsingTabHeader";
import { useRecipes, useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import Colors from "@/constants/colors";
import themealdb from "@/lib/themealdb";
import { CUISINE_FILTERS } from "@/constants/recipe-filters";
import { useCollapsibleHeader } from "@/hooks/use-collapsible-header";
import { useRecipeFilters } from "@/hooks/use-recipe-filters";
import { useGridLayout } from "@/hooks/use-responsive";

// This tab is browse-only — the search field was removed. Recipes are
// API-driven (TheMealDB, loaded on mount and paged on scroll); the bundled
// mock set is only a fallback when the API returns nothing. The cuisine /
// course chips in the tab bar narrow the list.
export default function AllRecipesScreen() {
  const { t } = useLanguage();
  const [onlineResults, setOnlineResults] = useState<Recipe[]>([]);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreRecipes, setHasMoreRecipes] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const didInitialLoad = useRef(false);
  const emptyStreak = useRef(0);
  const listRef = useRef<FlatList<Recipe>>(null);

  // Tapping the (already-focused) Rezepte tab scrolls this list back to top.
  useScrollToTop(listRef);
  const { selectedCuisine, selectedCourse } = useRecipeFilters();
  const recipes = useRecipes("");
  const { cacheRecipes } = useDailyChefMateStore();
  const { setProgress } = useCollapsibleHeader();
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });

  const recipeCategories = useMemo(() => [
    'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork',
    'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat'
  ], []);

  const loadMoreRecipes = useCallback(async () => {
    if (isLoadingMore || !hasMoreRecipes) return;

    setIsLoadingMore(true);
    try {
      // Two *randomly chosen* categories per pull, unioned and shuffled, so
      // the feed is genuinely mixed — not "all beef, then all chicken" — and
      // not the same set on every visit.
      const cats = [...recipeCategories].sort(() => Math.random() - 0.5).slice(0, 2);
      const batches = await Promise.all(
        cats.map((c) => themealdb.getMealsByCategory(c).catch(() => [] as Recipe[]))
      );
      let fetched = batches.flat();

      if (fetched.length === 0) {
        fetched = await themealdb.getRandomMeals(8).catch(() => [] as Recipe[]);
      }

      // Shuffle the whole batch before it enters the list.
      for (let i = fetched.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [fetched[i], fetched[j]] = [fetched[j], fetched[i]];
      }

      const seen = new Set(onlineResults.map((r) => r.id));
      const unique = fetched.filter((r) => !seen.has(r.id));

      if (unique.length > 0) {
        // Put them in the shared cache so tapping a card / favouriting works
        // (recipe-detail resolves recipes by id from the store).
        cacheRecipes(fetched);
        setOnlineResults((prev) => {
          const prevIds = new Set(prev.map((r) => r.id));
          return [...prev, ...fetched.filter((r) => !prevIds.has(r.id))];
        });
        emptyStreak.current = 0;
      } else {
        // Nothing new after a couple of tries → we've likely seen the catalog.
        emptyStreak.current += 1;
        if (emptyStreak.current >= 3) setHasMoreRecipes(false);
      }
    } catch (error) {
      console.error('Error loading more recipes:', error);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, hasMoreRecipes, recipeCategories, onlineResults, cacheRecipes]);

  // Pull the first page from the API as soon as the tab mounts.
  useEffect(() => {
    if (didInitialLoad.current) return;
    didInitialLoad.current = true;
    loadMoreRecipes().finally(() => setInitialLoading(false));
  }, [loadMoreRecipes]);

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
    // API results drive the tab; the bundled mock set is only used when the
    // API returned nothing (offline / down / empty).
    const baseRecipes = onlineResults.length > 0 ? onlineResults : recipes;
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
      {initialLoading && onlineResults.length === 0 ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} style={styles.emptyLoader} />
          <Text style={styles.emptyText}>
            {t('loadingMoreRecipes') || 'Loading recipes...'}
          </Text>
        </View>
      ) : displayedRecipes.length > 0 ? (
        <FlatList
          ref={listRef}
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
          <Text style={styles.emptyText}>
            {t('noRecipesFound') || 'No recipes found'}
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