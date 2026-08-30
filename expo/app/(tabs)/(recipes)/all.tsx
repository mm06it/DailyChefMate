import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { Recipe } from "@/types/recipe";
import { FlatList, StyleSheet, Text, View, ActivityIndicator, Pressable, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { ChefHat } from "lucide-react-native";
import { useFocusEffect } from "expo-router";
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

// TheMealDB "areas" (cuisines). Tokens in CUISINE_FILTERS that aren't in here
// (e.g. "Vegetarian", "Seafood", "Breakfast") are TheMealDB *categories*.
const MEALDB_AREAS = new Set([
  'Italian', 'Thai', 'Chinese', 'Japanese', 'Korean', 'Indian', 'Mexican',
  'Greek', 'American', 'British', 'French', 'Spanish', 'Turkish', 'Vietnamese',
  'Moroccan',
]);
const MAIN_CATEGORIES = ['Beef', 'Chicken', 'Pork', 'Lamb', 'Pasta', 'Seafood', 'Goat', 'Miscellaneous'];
const BROWSE_CATEGORIES = [
  'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork',
  'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat',
];

function shuffleInPlace<T>(a: T[]): T[] {
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// Recipes are API-driven (TheMealDB): browse pulls depend on the cuisine /
// course chips and the feed is shuffled; a non-empty search query switches
// to online + local name search. The bundled mock set is only a fallback
// when the API returns nothing.
export default function AllRecipesScreen() {
  const { t } = useLanguage();
  const [onlineResults, setOnlineResults] = useState<Recipe[]>([]);
  const [searchResults, setSearchResults] = useState<Recipe[]>([]);
  const [searching, setSearching] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreRecipes, setHasMoreRecipes] = useState(true);
  const [initialLoading, setInitialLoading] = useState(true);
  const emptyStreak = useRef(0);
  const reqId = useRef(0);
  const loadedKey = useRef<string | null>(null);
  const listRef = useRef<FlatList<Recipe>>(null);

  // Tapping the (already-focused) Rezepte tab scrolls this list back to top.
  useScrollToTop(listRef);
  const { search, selectedCuisine, selectedCourse } = useRecipeFilters();
  const recipes = useRecipes("");
  const { cacheRecipes, searchRecipesOnline } = useDailyChefMateStore();
  const { setProgress } = useCollapsibleHeader();
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });
  const searchQuery = search.trim();

  // Reset the collapsing search/filter bar when this sub-tab gains focus.
  useFocusEffect(useCallback(() => setProgress(0), [setProgress]));

  // Debounced online recipe search (also caches results into the store so
  // recipe-detail can resolve them).
  const searchFnRef = useRef(searchRecipesOnline);
  searchFnRef.current = searchRecipesOnline;
  useEffect(() => {
    if (searchQuery.length < 2) {
      setSearchResults([]);
      setSearching(false);
      return;
    }
    setSearching(true);
    const id = setTimeout(async () => {
      try {
        setSearchResults(await searchFnRef.current(searchQuery));
      } catch {
        setSearchResults([]);
      } finally {
        setSearching(false);
      }
    }, 400);
    return () => clearTimeout(id);
  }, [searchQuery]);

  const getRecipeCourse = useCallback((recipe: Recipe): 'starter' | 'main' | 'dessert' => {
    const course = recipe.course?.toLowerCase() ?? '';
    const cat = recipe.category?.toLowerCase() ?? '';
    if (['vorspeise', 'starter', 'entrée', 'entrada', 'antipasto', 'salad', 'side'].some(x => course.includes(x) || cat.includes(x))) return 'starter';
    if (['nachspeise', 'dessert', 'sweet'].some(x => course.includes(x) || cat.includes(x))) return 'dessert';
    return 'main';
  }, []);

  // Which TheMealDB endpoints to pull from for the current filter combo.
  const buildSources = useCallback((): Array<() => Promise<Recipe[]>> => {
    if (selectedCuisine !== 'all') {
      const cfg = CUISINE_FILTERS.find(c => c.id === selectedCuisine);
      const src = (cfg?.match ?? []).map(tok =>
        MEALDB_AREAS.has(tok)
          ? () => themealdb.getMealsByArea(tok)
          : () => themealdb.getMealsByCategory(tok),
      );
      return src.length ? src : [() => themealdb.getRandomMeals(8)];
    }
    if (selectedCourse === 'dessert') {
      return [() => themealdb.getMealsByCategory('Dessert')];
    }
    if (selectedCourse === 'starter') {
      return [
        () => themealdb.getMealsByCategory('Starter'),
        () => themealdb.getMealsByCategory('Side'),
      ];
    }
    // "main" course, or no filter → two random categories.
    const pool = selectedCourse === 'main' ? MAIN_CATEGORIES : BROWSE_CATEGORIES;
    return shuffleInPlace([...pool]).slice(0, 2).map(c => () => themealdb.getMealsByCategory(c));
  }, [selectedCuisine, selectedCourse]);

  const fetchPage = useCallback(async (append: boolean, req: number) => {
    const sources = buildSources();
    const batches = await Promise.all(sources.map(fn => fn().catch(() => [] as Recipe[])));
    let fetched = batches.flat();

    if (fetched.length === 0) {
      fetched = await themealdb.getRandomMeals(8).catch(() => [] as Recipe[]);
    }

    // Fetched by cuisine but a course is also picked → narrow it here.
    if (selectedCuisine !== 'all' && selectedCourse !== 'all') {
      fetched = fetched.filter(r => getRecipeCourse(r) === selectedCourse);
    }

    // De-dupe within the batch, then shuffle the whole thing.
    const byId = new Map<string, Recipe>();
    fetched.forEach(r => byId.set(r.id, r));
    fetched = shuffleInPlace(Array.from(byId.values()));

    if (req !== reqId.current) return; // filters changed while we were fetching
    if (fetched.length > 0) cacheRecipes(fetched);

    setOnlineResults(prev => {
      if (!append) return fetched;
      const seen = new Set(prev.map(r => r.id));
      const add = fetched.filter(r => !seen.has(r.id));
      if (add.length === 0) {
        emptyStreak.current += 1;
        if (emptyStreak.current >= 3) setHasMoreRecipes(false);
        return prev;
      }
      emptyStreak.current = 0;
      return [...prev, ...add];
    });
  }, [buildSources, selectedCuisine, selectedCourse, getRecipeCourse, cacheRecipes]);

  // (Re)load whenever the tab first mounts or the filter combo changes.
  const filterKey = `${selectedCuisine}|${selectedCourse}`;
  useEffect(() => {
    if (loadedKey.current === filterKey) return;
    loadedKey.current = filterKey;
    const myReq = ++reqId.current;
    setOnlineResults([]);
    setHasMoreRecipes(true);
    emptyStreak.current = 0;
    setInitialLoading(true);
    fetchPage(false, myReq).finally(() => {
      if (reqId.current === myReq) setInitialLoading(false);
    });
  }, [filterKey, fetchPage]);

  const loadMore = useCallback(() => {
    if (searchQuery || isLoadingMore || !hasMoreRecipes || initialLoading) return;
    setIsLoadingMore(true);
    fetchPage(true, reqId.current).finally(() => setIsLoadingMore(false));
  }, [searchQuery, isLoadingMore, hasMoreRecipes, initialLoading, fetchPage]);

  const filterRecipes = useCallback((recipesToFilter: Recipe[]) => {
    let filtered = recipesToFilter;
    if (selectedCuisine !== 'all') {
      const cfg = CUISINE_FILTERS.find(c => c.id === selectedCuisine);
      if (cfg?.match) {
        const m = cfg.match;
        filtered = filtered.filter(r => (!!r.area && m.includes(r.area)) || m.includes(r.category));
      }
    }
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(r => getRecipeCourse(r) === selectedCourse);
    }
    return filtered;
  }, [selectedCuisine, selectedCourse, getRecipeCourse]);

  const shuffledMocks = useMemo(() => shuffleInPlace([...recipes]), [recipes]);

  const displayedRecipes = useMemo(() => {
    const q = searchQuery.toLowerCase();
    const browsePool = onlineResults.length > 0 ? onlineResults : shuffledMocks;
    if (q) {
      // Local name matches from whatever's loaded + the online search results.
      const local = browsePool.filter(r => r.name.toLowerCase().includes(q));
      const byId = new Map<string, Recipe>();
      [...local, ...searchResults].forEach(r => byId.set(r.id, r));
      return filterRecipes(Array.from(byId.values()));
    }
    return filterRecipes(browsePool);
  }, [searchQuery, shuffledMocks, onlineResults, searchResults, filterRecipes]);

  const renderItem = ({ item }: { item: Recipe }) => {
    return (
      <View style={columns > 1 ? { width: itemWidth } : undefined}>
        <RecipeCard recipe={item} />
      </View>
    );
  };
  
  const renderFooter = () => {
    if (searchQuery) return null;
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
      <Pressable style={styles.loadMoreButton} onPress={loadMore}>
        <ChefHat size={20} color={Colors.white} />
        <Text style={styles.loadMoreButtonText}>
          {t('discoverMore') || 'Discover More Recipes'}
        </Text>
      </Pressable>
    );
  };
  
  const handleEndReached = () => {
    if (displayedRecipes.length > 0) loadMore();
  };

  const onScroll = useCallback((e: NativeSyntheticEvent<NativeScrollEvent>) => {
    const y = e.nativeEvent.contentOffset.y;
    const threshold = 220;
    const p = Math.max(0, Math.min(1, y / threshold));
    setProgress(p);
    onHeaderScroll(e);
  }, [setProgress]);

  const showSpinner =
    (!searchQuery && initialLoading && onlineResults.length === 0) ||
    (!!searchQuery && searching && displayedRecipes.length === 0);

  return (
    <View style={styles.container}>
      {showSpinner ? (
        <View style={styles.emptyContainer}>
          <ActivityIndicator size="large" color={Colors.primary} style={styles.emptyLoader} />
          <Text style={styles.emptyText}>
            {searchQuery
              ? (t('searching') || 'Searching...')
              : (t('loadingMoreRecipes') || 'Loading recipes...')}
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