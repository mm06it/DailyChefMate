import createContextHook from "@nkzw/create-context-hook";
import { useAction, useConvexAuth, useMutation, useQuery } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { recipes as initialRecipes } from "@/mocks/recipes";
import { refrigeratorItems as initialRefrigeratorItems } from "@/mocks/refrigerator";
import { Recipe, Ingredient } from "@/types/recipe";
import themealdb from "@/lib/themealdb";
import { trpcClient } from "@/lib/trpc";

export const [DailyChefMateContext, useDailyChefMateStore] = createContextHook(() => {
  // Transient browse/search cache (mock catalog + TheMealDB/AI results).
  // This is *not* persisted anywhere — only whether one of these recipes is
  // favorited is real, durable data, tracked in Convex (favoriteRecipes).
  const [recipes, setRecipes] = useState<Recipe[]>(() =>
    initialRecipes.map((recipe) => ({ ...recipe, isFavorite: false }))
  );

  const { isAuthenticated } = useConvexAuth();
  const convexRefrigeratorItems = useQuery(api.refrigerator.list);
  const convexCustomRecipes = useQuery(api.customRecipes.list);
  const convexFavorites = useQuery(api.favorites.list);
  const convexCooked = useQuery(api.cooked.list);
  const convexUserStats = useQuery(api.userStats.get);

  const dataStillLoading =
    convexRefrigeratorItems === undefined ||
    convexCustomRecipes === undefined ||
    convexFavorites === undefined ||
    convexCooked === undefined ||
    convexUserStats === undefined;

  const seedRefrigerator = useMutation(api.refrigerator.seedIfEmpty);
  const selectItemMutation = useMutation(api.refrigerator.selectItem);
  const toggleSelectionMutation = useMutation(api.refrigerator.toggleSelection);
  const updateAmountMutation = useMutation(api.refrigerator.updateAmount);
  const addItemMutation = useMutation(api.refrigerator.addItem);

  const addCustomRecipeMutation = useMutation(api.customRecipes.add);
  const updateCustomRecipeMutation = useMutation(api.customRecipes.update);
  const removeCustomRecipeMutation = useMutation(api.customRecipes.remove);
  const toggleCustomFavoriteMutation = useMutation(api.customRecipes.toggleFavorite);

  const addFavoriteMutation = useMutation(api.favorites.add);
  const removeFavoriteMutation = useMutation(api.favorites.remove);

  const markCookedMutation = useMutation(api.cooked.markCooked);

  const recordViewMutation = useMutation(api.userStats.recordView);
  const recordGeneratedMutation = useMutation(api.userStats.recordGenerated);
  const findByIngredientsAction = useAction(api.recipes.findByIngredients);

  // Seed a brand-new account's fridge once, right after we can see (while
  // actually authenticated) that it's empty. Gated on isAuthenticated rather
  // than just the query's loading state, since the query resolves to an
  // empty array for signed-out users too (not "undefined") — seeding off of
  // that alone would fire before sign-up/sign-in ever completes.
  const hasSeededRef = useRef(false);
  useEffect(() => {
    if (!isAuthenticated) return;
    if (convexRefrigeratorItems === undefined) return;
    if (convexRefrigeratorItems.length > 0) return;
    if (hasSeededRef.current) return;

    hasSeededRef.current = true;
    seedRefrigerator({
      items: initialRefrigeratorItems.map(({ name, amount, category }) => ({ name, amount, category })),
    }).catch((e) => {
      console.error("Failed to seed refrigerator", e);
      hasSeededRef.current = false;
    });
  }, [isAuthenticated, convexRefrigeratorItems, seedRefrigerator]);

  const refrigeratorItems: Ingredient[] = useMemo(() => {
    return (convexRefrigeratorItems ?? []).map((item) => ({
      id: item._id,
      name: item.name,
      amount: item.amount,
      category: item.category,
      isSelected: item.isSelected,
    }));
  }, [convexRefrigeratorItems]);

  const customRecipes: Recipe[] = useMemo(() => {
    return (convexCustomRecipes ?? []).map((r) => ({
      id: r._id,
      name: r.name,
      image: r.image,
      rating: r.rating,
      cookTime: r.cookTime,
      servings: r.servings,
      category: r.category,
      course: r.course,
      ingredients: r.ingredients,
      steps: r.steps,
      isFavorite: r.isFavorite,
      prepTime: r.prepTime,
      ovenHeat: r.ovenHeat,
      ovenTime: r.ovenTime,
      totalTime: r.totalTime,
    }));
  }, [convexCustomRecipes]);

  const favoriteExternalRecipes: Recipe[] = useMemo(() => {
    return (convexFavorites ?? []).map((r) => ({ ...r, isFavorite: true }));
  }, [convexFavorites]);

  const favoriteExternalIds = useMemo(
    () => new Set((convexFavorites ?? []).map((r) => r.id)),
    [convexFavorites]
  );

  const cookedRecipes: { [recipeId: string]: number } = useMemo(() => {
    const map: { [recipeId: string]: number } = {};
    for (const row of convexCooked ?? []) {
      map[row.recipeId] = row.count;
    }
    return map;
  }, [convexCooked]);

  const viewedRecipesCount = convexUserStats?.viewedRecipeIds.length ?? 0;
  const generatedRecipesCount = convexUserStats?.generatedCount ?? 0;

  const recordRecipeView = (recipeId: string) => {
    recordViewMutation({ recipeId }).catch((e) => console.error("recordRecipeView failed", e));
  };

  // Merge the live favorite flag from Convex into the local browse cache.
  const displayedRecipes: Recipe[] = useMemo(() => {
    return recipes.map((r) => ({ ...r, isFavorite: favoriteExternalIds.has(r.id) }));
  }, [recipes, favoriteExternalIds]);

  // Recipe functions
  const toggleFavorite = (recipeId: string) => {
    const customRecipe = customRecipes.find((recipe) => recipe.id === recipeId);
    if (customRecipe) {
      toggleCustomFavoriteMutation({ id: recipeId as Id<"customRecipes"> }).catch((e) =>
        console.error("toggleFavorite (custom) failed", e)
      );
      return;
    }

    if (favoriteExternalIds.has(recipeId)) {
      removeFavoriteMutation({ recipeId }).catch((e) => console.error("removeFavorite failed", e));
      return;
    }

    const recipe = displayedRecipes.find((r) => r.id === recipeId);
    if (recipe) {
      const { isFavorite: _unused, ...recipeSnapshot } = recipe;
      addFavoriteMutation({ recipe: recipeSnapshot }).catch((e) => console.error("addFavorite failed", e));
    }
  };

  const getFavoriteRecipes = () => {
    return [...favoriteExternalRecipes, ...customRecipes.filter((recipe) => recipe.isFavorite)];
  };

  const searchRecipes = (query: string) => {
    if (!query.trim()) return displayedRecipes;
    const lowerCaseQuery = query.toLowerCase();
    return displayedRecipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(lowerCaseQuery) ||
        recipe.category.toLowerCase().includes(lowerCaseQuery) ||
        recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(lowerCaseQuery))
    );
  };

  const searchCustomRecipes = (query: string) => {
    if (!query.trim()) return customRecipes;
    const lowerCaseQuery = query.toLowerCase();
    return customRecipes.filter(
      (recipe) =>
        recipe.name.toLowerCase().includes(lowerCaseQuery) ||
        recipe.category.toLowerCase().includes(lowerCaseQuery) ||
        recipe.ingredients.some((ingredient) => ingredient.name.toLowerCase().includes(lowerCaseQuery))
    );
  };

  const addUniqueRecipes = (newRecipes: Recipe[]): Recipe[] => {
    setRecipes((prevRecipes) => {
      const existingIds = new Set(prevRecipes.map((r) => r.id));
      const existingNames = new Set(prevRecipes.map((r) => r.name.toLowerCase()));

      const uniqueNewRecipes = newRecipes.filter(
        (recipe) => !existingIds.has(recipe.id) && !existingNames.has(recipe.name.toLowerCase())
      );

      if (uniqueNewRecipes.length > 0) {
        return [...prevRecipes, ...uniqueNewRecipes];
      }

      return prevRecipes;
    });

    return newRecipes;
  };

  const searchRecipesOnline = async (query: string): Promise<Recipe[]> => {
    if (!query.trim()) return [];

    try {
      console.log("Online search (web + AI) for recipes:", query);

      const data = await trpcClient.recipes.search.query({ query, limit: 30, ai: false });
      const merged = addUniqueRecipes(data);

      if (merged.length < 5) {
        console.log("Few results from unified search, enriching with TheMealDB");
        const extra = await themealdb.searchMealsByName(query);
        return addUniqueRecipes(extra);
      }

      return merged;
    } catch (error) {
      console.error("Error searching recipes online (unified):", error);
      try {
        const fallback = await themealdb.searchMealsByName(query);
        if (fallback.length === 0) {
          const byCat = await themealdb.getMealsByCategory(query);
          if (byCat.length > 0) return addUniqueRecipes(byCat);
          const byIng = await themealdb.getMealsByIngredient(query);
          return addUniqueRecipes(byIng);
        }
        return addUniqueRecipes(fallback);
      } catch (inner) {
        console.error("Fallback TheMealDB search failed:", inner);
        return [];
      }
    }
  };

  // Refrigerator functions
  const toggleIngredientSelection = (ingredientId: string) => {
    toggleSelectionMutation({ id: ingredientId as Id<"refrigeratorItems"> }).catch((e) =>
      console.error("toggleIngredientSelection failed", e)
    );
  };

  // Selecting an ingredient always starts with the amount hidden/empty,
  // regardless of any preset catalog amount — quantity is opt-in via the
  // amount pill / IngredientQuantityModal.
  const selectIngredient = (ingredientId: string) => {
    selectItemMutation({ id: ingredientId as Id<"refrigeratorItems"> }).catch((e) =>
      console.error("selectIngredient failed", e)
    );
  };

  const addIngredient = (ingredient: Ingredient | Omit<Ingredient, "id" | "isSelected">) => {
    addItemMutation({
      name: ingredient.name,
      amount: ingredient.amount,
      category: ingredient.category,
      isSelected: "isSelected" in ingredient ? ingredient.isSelected : false,
    }).catch((e) => console.error("addIngredient failed", e));
  };

  const removeIngredient = (_ingredientId: string) => {
    console.log("removeIngredient is disabled");
    return;
  };

  const updateIngredientAmount = (ingredientId: string, amount: string) => {
    updateAmountMutation({ id: ingredientId as Id<"refrigeratorItems">, amount }).catch((e) =>
      console.error("updateIngredientAmount failed", e)
    );
  };

  const getSelectedIngredients = () => {
    return refrigeratorItems.filter((item) => item.isSelected);
  };

  const searchRefrigeratorItems = (query: string) => {
    if (!query.trim()) return refrigeratorItems;
    const lowerCaseQuery = query.toLowerCase();
    return refrigeratorItems.filter(
      (item) =>
        item.name.toLowerCase().includes(lowerCaseQuery) || item.category.toLowerCase().includes(lowerCaseQuery)
    );
  };

  // Recipe generator function
  const generateRecipes = () => {
    const selectedIngredients = getSelectedIngredients();
    const selectedIngredientNames = selectedIngredients.map((item) => item.name.toLowerCase());

    const matchesRecipe = (recipe: Recipe) => {
      const matchingIngredients = recipe.ingredients.filter((ingredient) =>
        selectedIngredientNames.includes(ingredient.name.toLowerCase())
      );
      const minMatches = Math.min(2, Math.ceil(recipe.ingredients.length * 0.3));
      return matchingIngredients.length >= minMatches;
    };

    return [...displayedRecipes.filter(matchesRecipe), ...customRecipes.filter(matchesRecipe)];
  };

  const generateRecipesFromIngredients = async (): Promise<Recipe[]> => {
    const selectedIngredients = getSelectedIngredients();

    if (selectedIngredients.length === 0) {
      return [];
    }

    try {
      const names = selectedIngredients.map((i) => i.name);
      console.log("Searching recipes for ingredients:", names);

      // Convex action: Spoonacular (cached) with a TheMealDB fallback.
      const found = await findByIngredientsAction({ ingredients: names });
      const matchingRecipes: Recipe[] = found.map((r) => ({ ...r, isFavorite: false }));

      const existingIds = new Set(recipes.map((r) => r.id));
      const existingNames = new Set(recipes.map((r) => r.name.toLowerCase()));
      const newCount = matchingRecipes.filter(
        (r) => !existingIds.has(r.id) && !existingNames.has(r.name.toLowerCase())
      ).length;
      if (newCount > 0) {
        recordGeneratedMutation({ count: newCount }).catch((e) =>
          console.error("recordGenerated failed", e)
        );
      }

      return addUniqueRecipes(matchingRecipes);
    } catch (error) {
      console.error("Error generating recipes from ingredients:", error);
      // Last-ditch: hit TheMealDB straight from the client with the first ingredient.
      try {
        const fallback = await themealdb.getMealsByIngredient(selectedIngredients[0].name);
        return addUniqueRecipes(fallback);
      } catch {
        return [];
      }
    }
  };

  // Cooked recipes functions
  const markRecipeAsCooked = (recipeId: string) => {
    markCookedMutation({ recipeId }).catch((e) => console.error("markRecipeAsCooked failed", e));
  };

  const getTopCookedRecipes = (limit: number = 3): Array<{ recipe: Recipe; count: number }> => {
    const cookedEntries = Object.entries(cookedRecipes)
      .map(([recipeId, count]) => {
        const recipe = displayedRecipes.find((r) => r.id === recipeId) || customRecipes.find((r) => r.id === recipeId);
        return recipe ? { recipe, count } : null;
      })
      .filter((entry): entry is { recipe: Recipe; count: number } => entry !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);

    return cookedEntries;
  };

  // Custom recipe functions
  const addCustomRecipe = (recipe: Omit<Recipe, "id">) => {
    addCustomRecipeMutation({
      name: recipe.name,
      image: recipe.image,
      rating: recipe.rating,
      cookTime: recipe.cookTime,
      servings: recipe.servings,
      category: recipe.category,
      course: recipe.course,
      ingredients: recipe.ingredients,
      steps: recipe.steps,
      prepTime: recipe.prepTime,
      ovenHeat: recipe.ovenHeat,
      ovenTime: recipe.ovenTime,
      totalTime: recipe.totalTime,
    }).catch((e) => console.error("addCustomRecipe failed", e));
  };

  const updateCustomRecipe = (recipeId: string, updatedRecipe: Omit<Recipe, "id">) => {
    updateCustomRecipeMutation({
      id: recipeId as Id<"customRecipes">,
      name: updatedRecipe.name,
      image: updatedRecipe.image,
      rating: updatedRecipe.rating,
      cookTime: updatedRecipe.cookTime,
      servings: updatedRecipe.servings,
      category: updatedRecipe.category,
      course: updatedRecipe.course,
      ingredients: updatedRecipe.ingredients,
      steps: updatedRecipe.steps,
      prepTime: updatedRecipe.prepTime,
      ovenHeat: updatedRecipe.ovenHeat,
      ovenTime: updatedRecipe.ovenTime,
      totalTime: updatedRecipe.totalTime,
    }).catch((e) => console.error("updateCustomRecipe failed", e));
  };

  const deleteCustomRecipe = (recipeId: string) => {
    removeCustomRecipeMutation({ id: recipeId as Id<"customRecipes"> }).catch((e) =>
      console.error("deleteCustomRecipe failed", e)
    );
  };

  const getCustomRecipe = (recipeId: string): Recipe | undefined => {
    return customRecipes.find((recipe) => recipe.id === recipeId);
  };

  return {
    recipes: displayedRecipes,
    customRecipes,
    refrigeratorItems,
    cookedRecipes,
    isLoading: dataStillLoading,
    favorites: getFavoriteRecipes(),
    viewedRecipesCount,
    generatedRecipesCount,
    recordRecipeView,
    toggleFavorite,
    getFavoriteRecipes,
    searchRecipes,
    searchCustomRecipes,
    searchRecipesOnline,
    generateRecipesFromIngredients,
    toggleIngredientSelection,
    selectIngredient,
    addIngredient,
    removeIngredient,
    getSelectedIngredients,
    searchRefrigeratorItems,
    generateRecipes,
    markRecipeAsCooked,
    getTopCookedRecipes,
    updateIngredientAmount,
    addCustomRecipe,
    updateCustomRecipe,
    deleteCustomRecipe,
    getCustomRecipe,
  };
});

// Custom hooks for specific use cases
export function useRecipes(searchQuery: string = "") {
  const { recipes, searchRecipes } = useDailyChefMateStore();
  return searchQuery ? searchRecipes(searchQuery) : recipes;
}

export function useCustomRecipes(searchQuery: string = "") {
  const { customRecipes, searchCustomRecipes } = useDailyChefMateStore();
  return searchQuery ? searchCustomRecipes(searchQuery) : customRecipes;
}

export function useFavoriteRecipes() {
  const { getFavoriteRecipes } = useDailyChefMateStore();
  return getFavoriteRecipes();
}

export function useRefrigeratorItems(searchQuery: string = "", categoryFilter: string = "") {
  const { refrigeratorItems, searchRefrigeratorItems } = useDailyChefMateStore();
  const filteredBySearch = searchQuery ? searchRefrigeratorItems(searchQuery) : refrigeratorItems;

  return categoryFilter
    ? filteredBySearch.filter((item) => item.category === categoryFilter)
    : filteredBySearch;
}

export function useGeneratedRecipes() {
  const { generateRecipes } = useDailyChefMateStore();
  return generateRecipes();
}
