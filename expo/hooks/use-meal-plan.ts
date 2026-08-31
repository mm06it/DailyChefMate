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
}

export interface ShoppingItem {
  id: string;
  name: string;
  amount: string;
  checked: boolean;
  source: string;
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
  const convexItems = useQuery(api.mealPlan.listItems);

  const addEntryMutation = useMutation(api.mealPlan.addEntry);
  const removeEntryMutation = useMutation(api.mealPlan.removeEntry);
  const moveEntryMutation = useMutation(api.mealPlan.moveEntry);
  const addItemMutation = useMutation(api.mealPlan.addItem);
  const addItemsBulkMutation = useMutation(api.mealPlan.addItemsBulk);
  const toggleItemMutation = useMutation(api.mealPlan.toggleItem);
  const removeItemMutation = useMutation(api.mealPlan.removeItem);
  const clearCheckedMutation = useMutation(api.mealPlan.clearChecked);
  const clearAllMutation = useMutation(api.mealPlan.clearAll);

  const isLoading =
    isAuthenticated && (convexEntries === undefined || convexItems === undefined);

  const entries: PlanEntry[] = useMemo(
    () =>
      (convexEntries ?? []).map((e) => ({
        id: e._id,
        day: e.day,
        recipe: { ...(e.recipe as Recipe), isFavorite: false },
      })),
    [convexEntries],
  );

  const entriesByDay: Record<string, PlanEntry[]> = useMemo(() => {
    const map: Record<string, PlanEntry[]> = {};
    for (const entry of entries) {
      (map[entry.day] ??= []).push(entry);
    }
    return map;
  }, [entries]);

  const shoppingList: ShoppingItem[] = useMemo(
    () =>
      (convexItems ?? [])
        .map((i) => ({
          id: i._id,
          name: i.name,
          amount: i.amount,
          checked: i.checked,
          source: i.source,
        }))
        .sort((a, b) => Number(a.checked) - Number(b.checked)),
    [convexItems],
  );

  const addToPlan = (recipe: Recipe, day: string) => {
    addEntryMutation({ day, recipe: toRecipeSnapshot(recipe) }).catch((e) =>
      console.error("addToPlan failed", e),
    );
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

  const addShoppingItem = (name: string, amount: string = "") => {
    const trimmed = name.trim();
    if (!trimmed) return;
    addItemMutation({ name: trimmed, amount: amount.trim(), source: "manual" }).catch((e) =>
      console.error("addShoppingItem failed", e),
    );
  };

  const toggleShoppingItem = (id: string) => {
    toggleItemMutation({ id: id as Id<"shoppingListItems"> }).catch((e) =>
      console.error("toggleShoppingItem failed", e),
    );
  };

  const removeShoppingItem = (id: string) => {
    removeItemMutation({ id: id as Id<"shoppingListItems"> }).catch((e) =>
      console.error("removeShoppingItem failed", e),
    );
  };

  const clearChecked = () => {
    clearCheckedMutation({}).catch((e) => console.error("clearChecked failed", e));
  };

  const clearShoppingList = () => {
    clearAllMutation({}).catch((e) => console.error("clearShoppingList failed", e));
  };

  // Collect every ingredient of the recipes planned on the given days, dedupe
  // by lowercased name, join differing amounts ("200 g + 1 cup"). Returns the
  // number of items actually added (duplicates already on the list are skipped
  // server-side).
  const buildShoppingListFromWeek = async (days: string[]): Promise<number> => {
    const wanted = new Set(days);
    const byName = new Map<string, { name: string; amounts: Set<string> }>();
    for (const entry of entries) {
      if (!wanted.has(entry.day)) continue;
      for (const ing of entry.recipe.ingredients ?? []) {
        const key = ing.name.trim().toLowerCase();
        if (!key) continue;
        const bucket = byName.get(key) ?? { name: ing.name.trim(), amounts: new Set<string>() };
        if (ing.amount && ing.amount.trim()) bucket.amounts.add(ing.amount.trim());
        byName.set(key, bucket);
      }
    }
    const items = [...byName.values()].map((b) => ({
      name: b.name,
      amount: [...b.amounts].join(" + "),
    }));
    if (items.length === 0) return 0;
    try {
      const res = await addItemsBulkMutation({ items });
      return res?.added ?? 0;
    } catch (e) {
      console.error("buildShoppingListFromWeek failed", e);
      return 0;
    }
  };

  return {
    entries,
    entriesByDay,
    shoppingList,
    isLoading,
    addToPlan,
    removeFromPlan,
    moveEntry,
    addShoppingItem,
    toggleShoppingItem,
    removeShoppingItem,
    clearChecked,
    clearShoppingList,
    buildShoppingListFromWeek,
  };
});
