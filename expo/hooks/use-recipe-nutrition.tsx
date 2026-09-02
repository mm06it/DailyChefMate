import { useAction } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import { useFitnessMode } from "@/hooks/use-fitness-mode";
import { Nutrition, Recipe } from "@/types/recipe";

// Per-serving nutrition for the given recipes. Does nothing until Fitness Mode
// is on. Recipes that already carry `nutrition` (user-entered on a custom
// recipe) are used as-is; the rest are estimated once via the Convex
// `nutrition.estimateNutrition` action and cached server-side + in memory here.
// Mirrors hooks/use-localized-recipes.ts.
export function useRecipeNutrition(recipes: Recipe[]): Record<string, Nutrition> {
  const { enabled } = useFitnessMode();
  const estimate = useAction(api.nutrition.estimateNutrition);
  const [cache, setCache] = useState<Record<string, Nutrition>>({});
  const inflight = useRef<Set<string>>(new Set());

  // Recipes that carry their own nutrition — used directly, never estimated.
  const own = useMemo(() => {
    const m: Record<string, Nutrition> = {};
    for (const r of recipes) if (r.nutrition) m[r.id] = r.nutrition;
    return m;
  }, [recipes]);

  const misses = useMemo(() => {
    if (!enabled) return [] as Recipe[];
    return recipes.filter((r) => !r.nutrition && !cache[r.id]);
  }, [recipes, enabled, cache]);

  useEffect(() => {
    const todo = misses.filter((r) => !inflight.current.has(r.id));
    if (todo.length === 0) return;
    todo.forEach((r) => inflight.current.add(r.id));

    let cancelled = false;
    const BATCH = 6;
    (async () => {
      for (let i = 0; i < todo.length && !cancelled; i += BATCH) {
        const chunk = todo.slice(i, i + BATCH);
        try {
          const res = await estimate({
            recipes: chunk.map((r) => ({
              id: r.id,
              name: r.name,
              servings: r.servings && r.servings > 0 ? r.servings : 1,
              ingredients: r.ingredients.map((ing) => ({ name: ing.name, amount: ing.amount })),
            })),
          });
          if (!cancelled && res) setCache((prev) => ({ ...prev, ...res }));
        } catch {
          // no estimate for these recipes this round
        }
        chunk.forEach((r) => inflight.current.delete(r.id));
      }
      todo.forEach((r) => inflight.current.delete(r.id));
    })();

    return () => {
      cancelled = true;
    };
  }, [misses, estimate]);

  return useMemo(() => ({ ...cache, ...own }), [cache, own]);
}
