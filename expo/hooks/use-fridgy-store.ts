import AsyncStorage from "@react-native-async-storage/async-storage";
import createContextHook from "@nkzw/create-context-hook";
import { useEffect, useState } from "react";

import { recipes as initialRecipes } from "@/mocks/recipes";
import { refrigeratorItems as initialRefrigeratorItems } from "@/mocks/refrigerator";
import { Recipe, Ingredient } from "@/types/recipe";
import themealdb from "@/lib/themealdb";
import { trpcClient } from "@/lib/trpc";

export const [FridgyContext, useFridgyStore] = createContextHook(() => {
  const [recipes, setRecipes] = useState<Recipe[]>([]);
  const [customRecipes, setCustomRecipes] = useState<Recipe[]>([]);
  const [refrigeratorItems, setRefrigeratorItems] = useState<Ingredient[]>([]);
  const [cookedRecipes, setCookedRecipes] = useState<{ [recipeId: string]: number }>({});
  const [isLoading, setIsLoading] = useState<boolean>(true);

  // Load data from AsyncStorage on mount
  useEffect(() => {
    const loadData = async () => {
      try {
        const storedRecipes = await AsyncStorage.getItem("recipes");
        const storedCustomRecipes = await AsyncStorage.getItem("customRecipes");
        const storedRefrigeratorItems = await AsyncStorage.getItem("refrigeratorItems");
        const storedCookedRecipes = await AsyncStorage.getItem("cookedRecipes");
        
        if (storedRecipes) {
          setRecipes(JSON.parse(storedRecipes));
        } else {
          // For new users, ensure no recipes are favorited by default
          const recipesWithoutFavorites = initialRecipes.map(recipe => ({
            ...recipe,
            isFavorite: false
          }));
          setRecipes(recipesWithoutFavorites);
        }
        
        if (storedCustomRecipes) {
          setCustomRecipes(JSON.parse(storedCustomRecipes));
        }
        
        if (storedRefrigeratorItems) {
          setRefrigeratorItems(JSON.parse(storedRefrigeratorItems));
        } else {
          setRefrigeratorItems(initialRefrigeratorItems);
        }
        
        if (storedCookedRecipes) {
          setCookedRecipes(JSON.parse(storedCookedRecipes));
        }
        
        setIsLoading(false);
      } catch (error) {
        console.error("Error loading data:", error);
        // For new users, ensure no recipes are favorited by default
        const recipesWithoutFavorites = initialRecipes.map(recipe => ({
          ...recipe,
          isFavorite: false
        }));
        setRecipes(recipesWithoutFavorites);
        setCustomRecipes([]);
        setRefrigeratorItems(initialRefrigeratorItems);
        setCookedRecipes({});
        setIsLoading(false);
      }
    };

    loadData();
  }, []);

  // One-time repair to fix any wrong images from previous heuristic and remove AI-enriched entries
  useEffect(() => {
    if (isLoading) return;
    const repair = async () => {
      try {
        let changed = false;
        // Remove AI recipes completely
        setRecipes(prev => {
          const filtered = prev.filter(r => !r.id.startsWith('ai_'));
          if (filtered.length !== prev.length) changed = true;
          return filtered;
        });
        // Refresh images for TheMealDB items from source
        const mealdbRecipes = recipes.filter(r => r.id.startsWith('mealdb_'));
        if (mealdbRecipes.length > 0) {
          const updatedMap: Record<string, string> = {};
          for (const r of mealdbRecipes) {
            const mealId = r.id.replace('mealdb_', '');
            try {
              const res = await fetch(`https://www.themealdb.com/api/json/v1/1/lookup.php?i=${encodeURIComponent(mealId)}`);
              const data = await res.json();
              const thumb: string | undefined = data?.meals?.[0]?.strMealThumb;
              if (thumb && thumb !== r.image) {
                updatedMap[r.id] = thumb;
              }
            } catch {}
          }
          if (Object.keys(updatedMap).length > 0) {
            setRecipes(prev => prev.map(r => (updatedMap[r.id] ? { ...r, image: updatedMap[r.id] } : r)));
            changed = true;
          }
        }
        if (changed) {
          await AsyncStorage.setItem('recipes', JSON.stringify(recipes));
        }
      } catch (e) {
        console.log('Repair pass skipped', e);
      }
    };
    repair();
  }, [isLoading]);

  // Save data to AsyncStorage whenever it changes
  useEffect(() => {
    if (!isLoading) {
      AsyncStorage.setItem("recipes", JSON.stringify(recipes));
      AsyncStorage.setItem("customRecipes", JSON.stringify(customRecipes));
      AsyncStorage.setItem("refrigeratorItems", JSON.stringify(refrigeratorItems));
      AsyncStorage.setItem("cookedRecipes", JSON.stringify(cookedRecipes));
    }
  }, [recipes, customRecipes, refrigeratorItems, cookedRecipes, isLoading]);

  // Recipe functions
  const toggleFavorite = (recipeId: string) => {
    // Check if it's a custom recipe first
    const isCustomRecipe = customRecipes.some(recipe => recipe.id === recipeId);
    
    if (isCustomRecipe) {
      setCustomRecipes(prevRecipes => 
        prevRecipes.map(recipe => 
          recipe.id === recipeId 
            ? { ...recipe, isFavorite: !recipe.isFavorite } 
            : recipe
        )
      );
    } else {
      setRecipes(prevRecipes => 
        prevRecipes.map(recipe => 
          recipe.id === recipeId 
            ? { ...recipe, isFavorite: !recipe.isFavorite } 
            : recipe
        )
      );
    }
  };

  const getFavoriteRecipes = () => {
    const favoriteRegularRecipes = recipes.filter(recipe => recipe.isFavorite);
    const favoriteCustomRecipes = customRecipes.filter(recipe => recipe.isFavorite);
    return [...favoriteRegularRecipes, ...favoriteCustomRecipes];
  };

  const searchRecipes = (query: string) => {
    if (!query.trim()) return recipes;
    const lowerCaseQuery = query.toLowerCase();
    return recipes.filter(recipe => 
      recipe.name.toLowerCase().includes(lowerCaseQuery) ||
      recipe.category.toLowerCase().includes(lowerCaseQuery) ||
      recipe.ingredients.some(ingredient => 
        ingredient.name.toLowerCase().includes(lowerCaseQuery)
      )
    );
  };
  
  const searchCustomRecipes = (query: string) => {
    if (!query.trim()) return customRecipes;
    const lowerCaseQuery = query.toLowerCase();
    return customRecipes.filter(recipe => 
      recipe.name.toLowerCase().includes(lowerCaseQuery) ||
      recipe.category.toLowerCase().includes(lowerCaseQuery) ||
      recipe.ingredients.some(ingredient => 
        ingredient.name.toLowerCase().includes(lowerCaseQuery)
      )
    );
  };

  const searchRecipesOnline = async (query: string): Promise<Recipe[]> => {
    if (!query.trim()) return [];

    try {
      console.log('Online search (web + AI) for recipes:', query);

      const data = await trpcClient.recipes.search.query({ query, limit: 30, ai: false });
      const merged = addUniqueRecipes(data);

      // Fallbacks to supplement results from TheMealDB directly if needed
      if (merged.length < 5) {
        console.log('Few results from unified search, enriching with TheMealDB');
        const extra = await themealdb.searchMealsByName(query);
        return addUniqueRecipes(extra);
      }

      return merged;
    } catch (error) {
      console.error('Error searching recipes online (unified):', error);
      try {
        // Graceful degradation to TheMealDB only
        const fallback = await themealdb.searchMealsByName(query);
        if (fallback.length === 0) {
          const byCat = await themealdb.getMealsByCategory(query);
          if (byCat.length > 0) return addUniqueRecipes(byCat);
          const byIng = await themealdb.getMealsByIngredient(query);
          return addUniqueRecipes(byIng);
        }
        return addUniqueRecipes(fallback);
      } catch (inner) {
        console.error('Fallback TheMealDB search failed:', inner);
        return [];
      }
    }
  };
  
  const addUniqueRecipes = (newRecipes: Recipe[]): Recipe[] => {
    // Add to existing recipes to avoid duplicates
    setRecipes(prevRecipes => {
      const existingIds = new Set(prevRecipes.map(r => r.id));
      const existingNames = new Set(prevRecipes.map(r => r.name.toLowerCase()));
      
      const uniqueNewRecipes = newRecipes.filter(
        recipe => !existingIds.has(recipe.id) && !existingNames.has(recipe.name.toLowerCase())
      );
      
      if (uniqueNewRecipes.length > 0) {
        console.log(`Adding ${uniqueNewRecipes.length} new recipes from TheMealDB`);
        return [...prevRecipes, ...uniqueNewRecipes];
      }
      
      return prevRecipes;
    });
    
    return newRecipes;
  };

  // Refrigerator functions
  const toggleIngredientSelection = (ingredientId: string) => {
    setRefrigeratorItems(prevItems => 
      prevItems.map(item => 
        item.id === ingredientId 
          ? { ...item, isSelected: !item.isSelected } 
          : item
      )
    );
  };

  const addIngredient = (ingredient: Ingredient | Omit<Ingredient, "id" | "isSelected">) => {
    const newIngredient: Ingredient = {
      ...ingredient,
      id: 'id' in ingredient ? ingredient.id : Date.now().toString(),
      isSelected: 'isSelected' in ingredient ? ingredient.isSelected : false
    };
    setRefrigeratorItems(prevItems => [...prevItems, newIngredient]);
  };

  const removeIngredient = (_ingredientId: string) => {
    console.log('removeIngredient is disabled');
    return;
  };

  const updateIngredientAmount = (ingredientId: string, amount: string) => {
    setRefrigeratorItems(prevItems => 
      prevItems.map(item => 
        item.id === ingredientId 
          ? { ...item, amount, isSelected: true } 
          : item
      )
    );
  };

  const getSelectedIngredients = () => {
    return refrigeratorItems.filter(item => item.isSelected);
  };

  const searchRefrigeratorItems = (query: string) => {
    if (!query.trim()) return refrigeratorItems;
    const lowerCaseQuery = query.toLowerCase();
    return refrigeratorItems.filter(item => 
      item.name.toLowerCase().includes(lowerCaseQuery) ||
      item.category.toLowerCase().includes(lowerCaseQuery)
    );
  };

  // Recipe generator function
  const generateRecipes = () => {
    const selectedIngredients = getSelectedIngredients();
    const selectedIngredientNames = selectedIngredients.map(item => item.name.toLowerCase());
    
    const matchingRegularRecipes = recipes.filter(recipe => {
      // Count how many of the recipe's ingredients are in the selected ingredients
      const matchingIngredients = recipe.ingredients.filter(ingredient => 
        selectedIngredientNames.includes(ingredient.name.toLowerCase())
      );
      
      // Return recipes that have at least 2 matching ingredients or 30% of their ingredients
      const minMatches = Math.min(2, Math.ceil(recipe.ingredients.length * 0.3));
      return matchingIngredients.length >= minMatches;
    });
    
    const matchingCustomRecipes = customRecipes.filter(recipe => {
      // Count how many of the recipe's ingredients are in the selected ingredients
      const matchingIngredients = recipe.ingredients.filter(ingredient => 
        selectedIngredientNames.includes(ingredient.name.toLowerCase())
      );
      
      // Return recipes that have at least 2 matching ingredients or 30% of their ingredients
      const minMatches = Math.min(2, Math.ceil(recipe.ingredients.length * 0.3));
      return matchingIngredients.length >= minMatches;
    });
    
    return [...matchingRegularRecipes, ...matchingCustomRecipes];
  };
  
  const generateRecipesFromIngredients = async (): Promise<Recipe[]> => {
    const selectedIngredients = getSelectedIngredients();
    
    if (selectedIngredients.length === 0) {
      return [];
    }
    
    try {
      console.log('Generating recipes from selected ingredients:', selectedIngredients.map(i => i.name));
      
      // Search for recipes using the most common ingredient
      const mainIngredient = selectedIngredients[0].name;
      const onlineRecipes = await themealdb.getMealsByIngredient(mainIngredient);
      
      // Filter recipes that match multiple selected ingredients
      const matchingRecipes = onlineRecipes.filter(recipe => {
        const recipeIngredientNames = recipe.ingredients.map(ing => ing.name.toLowerCase());
        const selectedNames = selectedIngredients.map(ing => ing.name.toLowerCase());
        
        const matches = selectedNames.filter(name => 
          recipeIngredientNames.some(recipeIng => 
            recipeIng.includes(name) || name.includes(recipeIng)
          )
        );
        
        return matches.length >= Math.min(2, selectedIngredients.length);
      });
      
      return addUniqueRecipes(matchingRecipes);
    } catch (error) {
      console.error('Error generating recipes from ingredients:', error);
      return [];
    }
  };
  
  // Cooked recipes functions
  const markRecipeAsCooked = (recipeId: string) => {
    setCookedRecipes(prev => ({
      ...prev,
      [recipeId]: (prev[recipeId] || 0) + 1
    }));
  };
  
  const getTopCookedRecipes = (limit: number = 3): Array<{ recipe: Recipe; count: number }> => {
    const cookedEntries = Object.entries(cookedRecipes)
      .map(([recipeId, count]) => {
        const recipe = recipes.find(r => r.id === recipeId) || customRecipes.find(r => r.id === recipeId);
        return recipe ? { recipe, count } : null;
      })
      .filter((entry): entry is { recipe: Recipe; count: number } => entry !== null)
      .sort((a, b) => b.count - a.count)
      .slice(0, limit);
    
    return cookedEntries;
  };
  
  // Custom recipe functions
  const addCustomRecipe = (recipe: Omit<Recipe, 'id'>) => {
    const newRecipe: Recipe = {
      ...recipe,
      id: `custom_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
    };
    setCustomRecipes(prevRecipes => [...prevRecipes, newRecipe]);
    return newRecipe;
  };
  
  const updateCustomRecipe = (recipeId: string, updatedRecipe: Omit<Recipe, 'id'>) => {
    setCustomRecipes(prevRecipes => 
      prevRecipes.map(recipe => 
        recipe.id === recipeId 
          ? { ...updatedRecipe, id: recipeId }
          : recipe
      )
    );
  };
  
  const deleteCustomRecipe = (recipeId: string) => {
    setCustomRecipes(prevRecipes => 
      prevRecipes.filter(recipe => recipe.id !== recipeId)
    );
    // Also remove from cooked recipes if it exists
    setCookedRecipes(prev => {
      const updated = { ...prev };
      delete updated[recipeId];
      return updated;
    });
  };
  
  const getCustomRecipe = (recipeId: string): Recipe | undefined => {
    return customRecipes.find(recipe => recipe.id === recipeId);
  };

  return {
    recipes,
    customRecipes,
    refrigeratorItems,
    cookedRecipes,
    isLoading,
    favorites: getFavoriteRecipes(),
    toggleFavorite,
    getFavoriteRecipes,
    searchRecipes,
    searchCustomRecipes,
    searchRecipesOnline,
    generateRecipesFromIngredients,
    toggleIngredientSelection,
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
  const { recipes, searchRecipes } = useFridgyStore();
  return searchQuery ? searchRecipes(searchQuery) : recipes;
}

export function useCustomRecipes(searchQuery: string = "") {
  const { customRecipes, searchCustomRecipes } = useFridgyStore();
  return searchQuery ? searchCustomRecipes(searchQuery) : customRecipes;
}

export function useFavoriteRecipes() {
  const { getFavoriteRecipes } = useFridgyStore();
  return getFavoriteRecipes();
}

export function useRefrigeratorItems(searchQuery: string = "", categoryFilter: string = "") {
  const { refrigeratorItems, searchRefrigeratorItems } = useFridgyStore();
  const filteredBySearch = searchQuery ? searchRefrigeratorItems(searchQuery) : refrigeratorItems;
  
  return categoryFilter 
    ? filteredBySearch.filter(item => item.category === categoryFilter)
    : filteredBySearch;
}

export function useGeneratedRecipes() {
  const { generateRecipes } = useFridgyStore();
  return generateRecipes();
}