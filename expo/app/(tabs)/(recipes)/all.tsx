import { Stack } from "expo-router";
import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Recipe } from "@/types/recipe";
import { FlatList, StyleSheet, Text, View, ActivityIndicator, Pressable, Animated, NativeSyntheticEvent, NativeScrollEvent } from "react-native";
import { Search, ChefHat, Filter } from "lucide-react-native";

import RecipeCard from "@/components/RecipeCard";
import SearchBar from "@/components/SearchBar";
import { onHeaderScroll } from "@/components/CollapsingTabHeader";
import { useRecipes, useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import Colors from "@/constants/colors";
import themealdb from "@/lib/themealdb";
import { useCollapsibleHeader } from "@/hooks/use-collapsible-header";
import { useGridLayout } from "@/hooks/use-responsive";

export default function AllRecipesScreen() {
  const { t } = useLanguage();
  const [searchQuery, setSearchQuery] = useState("");
  const [isSearchingOnline, setIsSearchingOnline] = useState(false);
  const [onlineResults, setOnlineResults] = useState<Recipe[]>([]);
  const [showOnlineSearch, setShowOnlineSearch] = useState(false);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreRecipes, setHasMoreRecipes] = useState(true);
  const [currentPage, setCurrentPage] = useState(0);
  const [selectedCuisine, setSelectedCuisine] = useState<string>('all');
  const [selectedCourse, setSelectedCourse] = useState<string>('all');
  const recipes = useRecipes(searchQuery);
  const { searchRecipesOnline } = useDailyChefMateStore();
  const { setProgress, progress } = useCollapsibleHeader();
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });

  const clamp = useCallback((v: number, min = 0, max = 1) => Math.max(min, Math.min(max, v)), []);

  const courseOpacity = useMemo(() => 1 - clamp(progress / 0.33), [progress, clamp]);
  const cuisineOpacity = useMemo(() => 1 - clamp((progress - 0.33) / 0.33), [progress, clamp]);
  const searchOpacity = useMemo(() => 1 - clamp((progress - 0.66) / 0.34), [progress, clamp]);

  const yMax = 24;
  const courseTranslateY = useMemo(() => -yMax * (1 - courseOpacity), [courseOpacity]);
  const cuisineTranslateY = useMemo(() => -yMax * (1 - cuisineOpacity), [cuisineOpacity]);
  const searchTranslateY = useMemo(() => -yMax * (1 - searchOpacity), [searchOpacity]);
  
  const recipeCategories = useMemo(() => [
    'Beef', 'Chicken', 'Dessert', 'Lamb', 'Miscellaneous', 'Pasta', 'Pork', 
    'Seafood', 'Side', 'Starter', 'Vegan', 'Vegetarian', 'Breakfast', 'Goat'
  ], []);
  
  const cuisineFilters = useMemo(() => [
    { id: 'all', name: 'Alle', match: null as string[] | null },
    { id: 'italian', name: 'Italienisch', match: ['Italian'] },
    { id: 'asian', name: 'Asiatisch', match: ['Asian', 'Thai', 'Chinese', 'Japanese', 'Korean'] },
    { id: 'indian', name: 'Indisch', match: ['Indian'] },
    { id: 'mexican', name: 'Mexikanisch', match: ['Mexican'] },
    { id: 'mediterranean', name: 'Mediterran', match: ['Mediterranean', 'Greek'] },
    { id: 'american', name: 'Amerikanisch', match: ['American'] },
    { id: 'british', name: 'Britisch', match: ['British'] },
    { id: 'breakfast', name: 'Frühstück', match: ['Breakfast'] },
    { id: 'vegetarian', name: 'Vegetarisch', match: ['Vegetarian'] },
    { id: 'vegan', name: 'Vegan', match: ['Vegan'] },
    { id: 'seafood', name: 'Seafood', match: ['Seafood'] },
  ], []);

  const courseFilters = useMemo(() => [
    { id: 'all', name: 'Alle' },
    { id: 'starter', name: 'Vorspeise' },
    { id: 'main', name: 'Hauptspeise' },
    { id: 'dessert', name: 'Nachspeise' },
  ], []);
  
  const popularIngredients = useMemo(() => [
    'chicken', 'beef', 'salmon', 'pasta', 'rice', 'cheese', 'tomato', 'mushroom',
    'garlic', 'onion', 'potato', 'lemon', 'herbs', 'bacon', 'shrimp', 'avocado'
  ], []);

  // Automatically search online when user types a query
  useEffect(() => {
    const searchOnline = async () => {
      if (searchQuery.trim().length >= 2) {
        setIsSearchingOnline(true);
        setCurrentPage(0);
        setHasMoreRecipes(true);
        try {
          console.log('Auto-searching online for:', searchQuery);
          const results = await searchRecipesOnline(searchQuery);
          setOnlineResults(results);
          setShowOnlineSearch(false); // Hide manual search button since we auto-search
        } catch (error) {
          console.error('Auto online search failed:', error);
          setOnlineResults([]);
        } finally {
          setIsSearchingOnline(false);
        }
      } else {
        setOnlineResults([]);
        setShowOnlineSearch(false);
        setCurrentPage(0);
        setHasMoreRecipes(true);
      }
    };

    // Debounce the search to avoid too many API calls
    const timeoutId = setTimeout(searchOnline, 500);
    return () => clearTimeout(timeoutId);
  }, [searchQuery, searchRecipesOnline]);
  

  const handleOnlineSearch = async () => {
    if (!searchQuery.trim()) return;
    
    setIsSearchingOnline(true);
    setCurrentPage(0);
    setHasMoreRecipes(true);
    try {
      const results = await searchRecipesOnline(searchQuery);
      setOnlineResults(results);
    } catch (error) {
      console.error('Online search failed:', error);
    } finally {
      setIsSearchingOnline(false);
    }
  };
  
  const loadMoreRecipes = useCallback(async () => {
    if (isLoadingMore || !hasMoreRecipes) return;
    
    setIsLoadingMore(true);
    try {
      const nextPage = currentPage + 1;
      let newRecipes: Recipe[] = [];
      
      if (searchQuery.trim()) {
        // If searching, try to get more results for the search term
        if (nextPage === 1) {
          newRecipes = await searchRecipesOnline(searchQuery);
        }
      } else {
        // If browsing, load recipes from different categories and ingredients
        if (nextPage <= recipeCategories.length) {
          const categoryIndex = (nextPage - 1) % recipeCategories.length;
          const category = recipeCategories[categoryIndex];
          console.log(`Loading recipes from category: ${category}`);
          newRecipes = await themealdb.getMealsByCategory(category);
        } else {
          // After categories, use popular ingredients
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
  }, [isLoadingMore, hasMoreRecipes, currentPage, searchQuery, recipeCategories, popularIngredients, searchRecipesOnline]);

  // Load initial popular recipes when no search query
  useEffect(() => {
    if (!searchQuery.trim() && onlineResults.length === 0 && recipes.length < 10) {
      loadMoreRecipes();
    }
  }, [searchQuery, onlineResults.length, recipes.length, loadMoreRecipes]);

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
      const cfg = cuisineFilters.find(c => c.id === selectedCuisine);
      if (cfg?.match) {
        filtered = filtered.filter(r => cfg.match?.includes(r.category));
      }
    }
    if (selectedCourse !== 'all') {
      filtered = filtered.filter(r => getRecipeCourse(r) === selectedCourse);
    }
    return filtered;
  }, [selectedCuisine, selectedCourse, cuisineFilters, getRecipeCourse]);
  
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
    if (searchQuery.trim() && onlineResults.length === 0) {
      return null; // Don't show footer when searching and no results
    }
    
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

  const renderCuisineFilter = ({ item }: { item: typeof cuisineFilters[number] }) => (
    <Pressable
      style={[
        styles.categoryButton,
        selectedCuisine === item.id && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCuisine(item.id)}
      testID={`filter-cuisine-${item.id}`}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCuisine === item.id && styles.categoryButtonTextActive
      ]}>
        {item.name}
      </Text>
    </Pressable>
  );

  const renderCourseFilter = ({ item }: { item: typeof courseFilters[number] }) => (
    <Pressable
      style={[
        styles.categoryButton,
        selectedCourse === item.id && styles.categoryButtonActive
      ]}
      onPress={() => setSelectedCourse(item.id)}
      testID={`filter-course-${item.id}`}
    >
      <Text style={[
        styles.categoryButtonText,
        selectedCourse === item.id && styles.categoryButtonTextActive
      ]}>
        {item.name}
      </Text>
    </Pressable>
  );

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
          ListHeaderComponent={(
            <View>
              <Animated.View style={[styles.searchContainer, { opacity: searchOpacity, transform: [{ translateY: searchTranslateY }] }]} pointerEvents={searchOpacity <= 0.01 ? 'none' : 'auto'}>
                <SearchBar 
                  value={searchQuery}
                  onChangeText={setSearchQuery}
                  placeholder={t('search')}
                />
                {isSearchingOnline && searchQuery.trim() && (
                  <View style={styles.searchingIndicator}>
                    <ActivityIndicator size="small" color={Colors.primary} />
                    <Text style={styles.searchingText}>
                      {t('searching') || 'Searching online...'}
                    </Text>
                  </View>
                )}
              </Animated.View>

              <Animated.View style={[styles.filterContainer, { opacity: cuisineOpacity, transform: [{ translateY: cuisineTranslateY }] }]} pointerEvents={cuisineOpacity <= 0.01 ? 'none' : 'auto'}>
                <View style={styles.filterHeader}>
                  <Filter size={16} color={Colors.textLight} />
                  <Text style={styles.filterTitle}>Küche</Text>
                </View>
                <FlatList
                  data={cuisineFilters}
                  renderItem={renderCuisineFilter}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryList}
                />
              </Animated.View>

              <Animated.View style={[styles.filterContainer, { opacity: courseOpacity, transform: [{ translateY: courseTranslateY }] }]} pointerEvents={courseOpacity <= 0.01 ? 'none' : 'auto'}>
                <View style={styles.filterHeader}>
                  <Filter size={16} color={Colors.textLight} />
                  <Text style={styles.filterTitle}>Kurs-Art</Text>
                </View>
                <FlatList
                  data={courseFilters}
                  renderItem={renderCourseFilter}
                  keyExtractor={(item) => item.id}
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.categoryList}
                />
              </Animated.View>
            </View>
          )}
          ListFooterComponent={renderFooter}
          removeClippedSubviews={true}
          maxToRenderPerBatch={10}
          windowSize={10}
          onScroll={onScroll}
          scrollEventThrottle={16}
        />
      ) : (
        <View style={styles.emptyContainer}>
          {isSearchingOnline ? (
            <>
              <ActivityIndicator size="large" color={Colors.primary} style={styles.emptyLoader} />
              <Text style={styles.emptyText}>
                {t('searching') || 'Searching for recipes...'}
              </Text>
            </>
          ) : (
            <>
              <Text style={styles.emptyText}>
                {searchQuery ? (t('noRecipesFound') || 'No recipes found') : (t('popularRecipes') || 'Popular Recipes')}
              </Text>
              {searchQuery && (
                <Text style={styles.emptySubText}>
                  {t('tryDifferentSearch') || 'Try a different search term'}
                </Text>
              )}
            </>
          )}
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
  headerTitle: {
    fontWeight: "600",
    fontSize: 18,
  },
  searchContainer: {
    padding: 16,
    gap: 12,
  },
  onlineSearchButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
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
  searchingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.card,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  searchingText: {
    color: Colors.primary,
    fontSize: 14,
    fontWeight: '500',
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
  emptySubText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
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
  filterContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  filterHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  filterTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  categoryList: {
    gap: 8,
  },
  categoryButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  categoryButtonActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  categoryButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  categoryButtonTextActive: {
    color: Colors.white,
  },
});