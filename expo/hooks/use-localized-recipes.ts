import { useAction } from "convex/react";
import { useEffect, useMemo, useRef, useState } from "react";

import { api } from "@/convex/_generated/api";
import { useLanguage } from "@/hooks/use-language";
import { Recipe } from "@/types/recipe";

// Browse/search recipes (TheMealDB, Spoonacular, AI, bundled mocks) — never
// the user's own custom recipes, whose ids are Convex document ids.
const EXTERNAL_ID = /^(mealdb_|spoonacular_|ai_|\d+$)/;

type Slice = {
  name: string;
  category: string;
  ingredients: { name: string; amount: string }[];
  steps: string[];
};

function toInput(r: Recipe) {
  return {
    id: r.id,
    name: r.name,
    category: r.category,
    ingredients: r.ingredients.map((i) => ({ name: i.name, amount: i.amount })),
    steps: r.steps,
  };
}

// When the app language is German, machine-translate (and metric-convert) the
// given browse recipes via the Convex `translate` action. Results are cached
// server-side (once per recipe) and in memory here, so this is cheap after the
// first view. English is the source language → returns the input untouched.
export function useLocalizedRecipes(recipes: Recipe[]): Recipe[] {
  const { currentLanguage } = useLanguage();
  const lang = currentLanguage === "de" ? "de" : "en";
  const translate = useAction(api.translate.translateRecipes);
  const [cache, setCache] = useState<Record<string, Slice>>({});
  const inflight = useRef<Set<string>>(new Set());

  const misses = useMemo(() => {
    if (lang !== "de") return [] as Recipe[];
    return recipes.filter((r) => EXTERNAL_ID.test(r.id) && !cache[r.id]);
  }, [recipes, lang, cache]);

  useEffect(() => {
    const todo = misses.filter((r) => !inflight.current.has(r.id));
    if (todo.length === 0) return;
    todo.forEach((r) => inflight.current.add(r.id));

    let cancelled = false;
    // Matches MAX_RECIPES_PER_CALL in convex/translate.ts — fewer, larger
    // action invocations = fewer Convex function calls.
    const BATCH = 12;
    (async () => {
      for (let i = 0; i < todo.length && !cancelled; i += BATCH) {
        const chunk = todo.slice(i, i + BATCH);
        try {
          const res = await translate({ lang: "de", recipes: chunk.map(toInput) });
          if (!cancelled && res) setCache((prev) => ({ ...prev, ...res }));
        } catch {
          // leave these recipes in English
        }
        chunk.forEach((r) => inflight.current.delete(r.id));
      }
      todo.forEach((r) => inflight.current.delete(r.id));
    })();

    return () => {
      cancelled = true;
    };
  }, [misses, translate]);

  return useMemo(() => {
    if (lang !== "de") return recipes;
    return recipes.map((r) => {
      const tr = cache[r.id];
      if (!tr) return r;
      return {
        ...r,
        name: tr.name,
        category: tr.category,
        steps: tr.steps,
        ingredients: r.ingredients.map((orig, i) => {
          const ti = tr.ingredients[i];
          return ti ? { ...orig, name: ti.name, amount: ti.amount } : orig;
        }),
      };
    });
  }, [recipes, lang, cache]);
}
