import createContextHook from "@nkzw/create-context-hook";
import { useConvexAuth, useMutation, useQuery } from "convex/react";
import { useMemo } from "react";

import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";
import { Recipe } from "@/types/recipe";

export interface PlanEntry {
  id: string;
  day: string; // ISO date
  recipe: Recipe;
  servings: number;
  cookedAt: number | null;
  checkedIngredients: string[];
}

// Fields that live only at runtime on browse/search results — not part of the
// stored recipe snapshot. Mirrors the strip in use-dailychefmate-store's
// toggleFavorite.
function toRecipeSnapshot(recipe: Recipe) {
  const {
    isFavorite: _f,
    area: _a,
    usedIngredients: _u,
    missedIngredients: _m,
    ...rest
  } = recipe;
  return rest;
}

export const [MealPlanContext, useMealPlan] = createContextHook(() => {
  const { isAuthenticated } = useConvexAuth();
  const convexEntries = useQuery(api.mealPlan.list);

  const addEntryMutation = useMutation(api.mealPlan.addEntry);
  const removeEntryMutation = useMutation(api.mealPlan.removeEntry);
  const moveEntryMutation = useMutation(api.mealPlan.moveEntry);
  const setServingsMutation = useMutation(api.mealPlan.setServings);
  const setCookedMutation = useMutation(api.mealPlan.setCooked);
  const toggleIngredientMutation = useMutation(api.mealPlan.toggleIngredient);

  const isLoading = isAuthenticated && convexEntries === undefined;

  const entries: PlanEntry[] = useMemo(
    () =>
      (convexEntries ?? []).map((e) => {
        const recipe = { ...(e.recipe as Recipe), isFavorite: false };
        return {
          id: e._id,
          day: e.day,
          recipe,
          servings: e.servings ?? recipe.servings ?? 1,
          cookedAt: e.cookedAt ?? null,
          checkedIngredients: e.checkedIngredients ?? [],
        };
      }),
    [convexEntries],
  );

  const entriesByDay: Record<string, PlanEntry[]> = useMemo(() => {
    const map: Record<string, PlanEntry[]> = {};
    for (const entry of entries) {
      (map[entry.day] ??= []).push(entry);
    }
    return map;
  }, [entries]);

  const addToPlan = (recipe: Recipe, day: string, servings: number) => {
    addEntryMutation({
      day,
      recipe: toRecipeSnapshot(recipe),
      servings: Math.max(1, Math.min(20, Math.round(servings || recipe.servings || 1))),
    }).catch((e) => console.error("addToPlan failed", e));
  };

  const removeFromPlan = (entryId: string) => {
    removeEntryMutation({ id: entryId as Id<"mealPlanEntries"> }).catch((e) =>
      console.error("removeFromPlan failed", e),
    );
  };

  const moveEntry = (entryId: string, day: string) => {
    moveEntryMutation({ id: entryId as Id<"mealPlanEntries">, day }).catch((e) =>
      console.error("moveEntry failed", e),
    );
  };

  const setServings = (entryId: string, servings: number) => {
    setServingsMutation({ id: entryId as Id<"mealPlanEntries">, servings }).catch((e) =>
      console.error("setServings failed", e),
    );
  };

  const setCooked = (entryId: string, cooked: boolean) => {
    setCookedMutation({ id: entryId as Id<"mealPlanEntries">, cooked }).catch((e) =>
      console.error("setCooked failed", e),
    );
  };

  const toggleIngredient = (entryId: string, ingredientId: string) => {
    toggleIngredientMutation({
      id: entryId as Id<"mealPlanEntries">,
      ingredientId,
    }).catch((e) => console.error("toggleIngredient failed", e));
  };

  // Called from the cooking flow: mark the soonest still-uncooked planned
  // instance of this recipe as done.
  const markPlannedCooked = (recipeId: string) => {
    const next = entries
      .filter((e) => e.recipe.id === recipeId && !e.cookedAt)
      .sort((a, b) => a.day.localeCompare(b.day) || a.id.localeCompare(b.id))[0];
    if (next) setCooked(next.id, true);
  };

  return {
    entries,
    entriesByDay,
    isLoading,
    addToPlan,
    removeFromPlan,
    moveEntry,
    setServings,
    setCooked,
    toggleIngredient,
    markPlannedCooked,
  };
});
