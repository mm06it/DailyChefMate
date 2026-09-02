import { Stack, useFocusEffect } from "expo-router";
import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
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
import type { Theme } from "@/constants/theme";
import { useThemedStyles } from "@/hooks/use-themed-styles";
import { useTheme } from "@/hooks/use-theme";
import { translateIngredientName } from "@/constants/translations";
import { useDailyChefMateStore } from "@/hooks/use-dailychefmate-store";
import { useLanguage } from "@/hooks/use-language";
import { useLocalizedRecipes } from "@/hooks/use-localized-recipes";
import { useRecipeNutrition } from "@/hooks/use-recipe-nutrition";
import { useFitnessMode } from "@/hooks/use-fitness-mode";
import { proteinPer100kcal } from "@/constants/fitness-filters";
import { useGridLayout, useIsDesktop } from "@/hooks/use-responsive";

// One page of results; "load more" advances the offset by this much.
const PAGE_SIZE = 8;

export default function GeneratedRecipesScreen() {
  const { theme } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const { t, currentLanguage } = useLanguage();
  const { generateRecipesFromIngredients, getSelectedIngredients } = useDailyChefMateStore();
  const [onlineRecipes, setOnlineRecipes] = useState<Recipe[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isLoadingMore, setIsLoadingMore] = useState<boolean>(false);
  const [hasMoreRecipes, setHasMoreRecipes] = useState<boolean>(true);
  // How far into the Spoonacular/TheMealDB result set the next "load more"
  // should start (0, 8, 16, …).
  const [offset, setOffset] = useState<number>(0);
  const selectedIngredients = getSelectedIngredients();
  // Stable signature of the current selection — drives the one-shot auto search.
  const ingredientKey = selectedIngredients
    .map((i) => i.name.toLowerCase())
    .sort()
    .join("|");
  const autoSearchedKey = useRef<string>("");
  const { columns, itemWidth } = useGridLayout(280, { maxColumns: 4 });
  const isDesktop = useIsDesktop();
  const topPad = useHeaderContentPadding();

  // Keep the shared collapsing header from staying stuck-hidden when this
  // screen gains focus with a non-zero scroll position.
  useFocusEffect(useCallback(() => resetHeader(), []));

  // First search: page 0 of the ingredient-ranked Spoonacular results
  // (TheMealDB is the server-side fallback). generateRecipesFromIngredients
  // also drops each page into the shared store so recipe-detail can resolve
  // it by id.
  const handleGenerateOnlineRecipes = useCallback(async () => {
    if (selectedIngredients.length === 0) return;

    autoSearchedKey.current = ingredientKey;
    setIsLoading(true);
    setHasMoreRecipes(true);
    setOffset(0);

    try {
      const recipes = await generateRecipesFromIngredients(0);
      setOnlineRecipes(recipes);
      setOffset(recipes.length);
      setHasMoreRecipes(recipes.length >= PAGE_SIZE);
    } catch (error) {
      console.error('Error generating online recipes:', error);
    } finally {
      setIsLoading(false);
    }
  }, [selectedIngredients.length, ingredientKey, generateRecipesFromIngredients]);

  // "Load more": the next page from the same result set (offset 8, 16, …).
  const loadMoreRecipes = useCallback(async () => {
    if (isLoadingMore || isLoading || !hasMoreRecipes) return;

    setIsLoadingMore(true);
    try {
      const more = await generateRecipesFromIngredients(offset);
      setOnlineRecipes(prev => {
        const existingIds = new Set(prev.map(r => r.id));
        return [...prev, ...more.filter(r => !existingIds.has(r.id))];
      });
      setOffset(prev => prev + PAGE_SIZE);
      if (more.length < PAGE_SIZE) setHasMoreRecipes(false);
    } catch (error) {
      console.error('Error loading more recipes:', error);
      setHasMoreRecipes(false);
    } finally {
      setIsLoadingMore(false);
    }
  }, [isLoadingMore, isLoading, hasMoreRecipes, offset, generateRecipesFromIngredients]);

  // Auto-search once per distinct ingredient selection (re-runs if the user
  // changes the fridge selection and comes back). Not gated on result count,
  // so a genuinely empty result doesn't retry forever.
  useEffect(() => {
    if (ingredientKey && autoSearchedKey.current !== ingredientKey) {
      handleGenerateOnlineRecipes();
    }
  }, [ingredientKey, handleGenerateOnlineRecipes]);

  // Only the real ingredient-search results — deduped by id. (The local
  // mock-catalog matches were dropped: they made an unrelated recipe like
  // "French Omelette" show up first every time.)
  const localizedRecipes = useLocalizedRecipes(
    useMemo(() => {
      const uniqueRecipes = new Map<string, Recipe>();
      onlineRecipes.forEach((recipe) => uniqueRecipes.set(recipe.id, recipe));
      return Array.from(uniqueRecipes.values());
    }, [onlineRecipes]),
  );

  // Fitness Mode: pull macros for the whole list, then surface the
  // highest-protein-per-100kcal recipes first (point 5).
  const { enabled: fitnessMode } = useFitnessMode();
  const nutritionMap = useRecipeNutrition(fitnessMode ? localizedRecipes : []);
  const allRecipes = useMemo(() => {
    if (!fitnessMode) return localizedRecipes;
    return [...localizedRecipes].sort((a, b) => {
      const na = nutritionMap[a.id];
      const nb = nutritionMap[b.id];
      if (na && nb) return proteinPer100kcal(nb) - proteinPer100kcal(na);
      if (na) return -1;
      if (nb) return 1;
      return 0;
    });
  }, [localizedRecipes, fitnessMode, nutritionMap]);

  const renderItem = ({ item }: { item: Recipe }) => (
    <View style={columns > 1 ? { width: itemWidth } : undefined}>
      {/* "Vorhanden:" / "Fehlt noch:" lines are rendered inside RecipeCard,
          stacked above the recipe name. */}
      <RecipeCard recipe={item} nutrition={fitnessMode ? nutritionMap[item.id] : undefined} />
    </View>
  );
  
  const renderFooter = () => {
    if (!hasMoreRecipes) {
      return (
        <View style={styles.footerContainer}>
          <ChefHat size={24} color={theme.textMuted} />
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
          <ActivityIndicator size="small" color={theme.accent} />
          <Text style={styles.loadingMoreText}>
            {t('loadingMoreRecipes') || 'Loading more delicious recipes...'}
          </Text>
        </View>
      );
    }
    
    return (
      <Pressable style={styles.loadMoreButton} onPress={loadMoreRecipes}>
        <ChefHat size={20} color={theme.textOnAccent} />
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
            {t('selectedIngredients') || 'Selected ingredients'}: {selectedIngredients.map(i => translateIngredientName(currentLanguage, i.name)).join(', ')}
          </Text>
          <Pressable 
            style={styles.refreshButton}
            onPress={() => handleGenerateOnlineRecipes()}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator size="small" color={theme.textOnAccent} />
            ) : (
              <RefreshCw size={16} color={theme.textOnAccent} />
            )}
            <Text style={styles.refreshButtonText}>
              {isLoading ? (t('searching') || 'Searching...') : (t('refreshRecipes') || 'Refresh Recipes')}
            </Text>
          </Pressable>
        </View>
      )}
      
      {isLoading && allRecipes.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={theme.accent} />
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
          title: t('generatedRecipesTitle'),
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

const makeStyles = (t: Theme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: t.bg,
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
    backgroundColor: t.surface,
    borderBottomWidth: 1,
    borderBottomColor: t.border,
    gap: 12,
  },
  ingredientsText: {
    fontSize: 14,
    color: t.textSecondary,
    lineHeight: 20,
  },
  refreshButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 20,
    gap: 8,
  },
  refreshButtonText: {
    color: t.textOnAccent,
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
    color: t.textSecondary,
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
    color: t.textPrimary,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtext: {
    fontSize: 16,
    color: t.textSecondary,
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
    color: t.textSecondary,
    textAlign: 'center',
  },
  loadMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: t.accent,
    marginHorizontal: 16,
    marginVertical: 20,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 25,
    gap: 8,
  },
  loadMoreButtonText: {
    color: t.textOnAccent,
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
    color: t.textPrimary,
    textAlign: 'center',
  },
  footerSubtext: {
    fontSize: 14,
    color: t.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
});