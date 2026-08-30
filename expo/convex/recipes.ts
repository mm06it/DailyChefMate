import { v } from "convex/values";

import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { searchResultRecipe } from "./schema";

// Repeat searches for the same ingredient set are served from recipeCache
// so the Spoonacular free tier (150 points/day) lasts. Entries older than
// this are re-fetched.
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 5;
const RESULT_LIMIT = 8;
const NO_INSTRUCTIONS = "Keine Anleitung verfügbar.";

type SearchRecipe = {
  id: string;
  name: string;
  image: string;
  rating: number;
  cookTime: string;
  servings: number;
  category: string;
  ingredients: { id: string; name: string; amount: string; category: string }[];
  steps: string[];
  usedIngredients: string[];
  missedIngredients: string[];
};

function normalize(ingredients: string[]): string[] {
  return [...new Set(ingredients.map((i) => i.trim().toLowerCase()).filter(Boolean))];
}

function cacheKey(ingredients: string[]): string {
  return normalize(ingredients).sort().join("|");
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

export const getCache = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) =>
    ctx.db
      .query("recipeCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first(),
});

export const putCache = internalMutation({
  args: { key: v.string(), source: v.string(), recipes: v.array(searchResultRecipe) },
  handler: async (ctx, { key, source, recipes }) => {
    const existing = await ctx.db
      .query("recipeCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) await ctx.db.delete(existing._id);
    await ctx.db.insert("recipeCache", { key, source, recipes, createdAt: Date.now() });
  },
});

async function fromSpoonacular(ingredients: string[]): Promise<SearchRecipe[] | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const findUrl =
    `https://api.spoonacular.com/recipes/findByIngredients` +
    `?ingredients=${encodeURIComponent(ingredients.join(","))}` +
    `&number=${RESULT_LIMIT}&ranking=1&ignorePantry=true&apiKey=${apiKey}`;

  const findRes = await fetch(findUrl);
  if (!findRes.ok) {
    console.error("Spoonacular findByIngredients", findRes.status, await findRes.text());
    return null;
  }
  const matches = (await findRes.json()) as any[];
  if (!Array.isArray(matches) || matches.length === 0) return [];

  const ids = matches.map((m) => m.id);
  let infoById = new Map<number, any>();
  try {
    const infoRes = await fetch(
      `https://api.spoonacular.com/recipes/informationBulk?ids=${ids.join(",")}&apiKey=${apiKey}`,
    );
    if (infoRes.ok) {
      const infos = (await infoRes.json()) as any[];
      infoById = new Map(infos.map((i) => [i.id, i]));
    }
  } catch (e) {
    console.error("Spoonacular informationBulk failed", e);
  }

  return matches.map((m) => {
    const info = infoById.get(m.id) ?? {};

    const analyzed: string[] =
      info.analyzedInstructions?.[0]?.steps?.map((s: any) => String(s.step).trim()).filter(Boolean) ?? [];
    const fromHtml: string[] =
      typeof info.instructions === "string"
        ? info.instructions
            .replace(/<[^>]+>/g, " ")
            .split(/(?<=\.)\s+/)
            .map((s: string) => s.trim())
            .filter((s: string) => s.length > 8)
        : [];
    const steps = analyzed.length ? analyzed : fromHtml;

    const extended = Array.isArray(info.extendedIngredients) ? info.extendedIngredients : [];
    const ingredients = extended.length
      ? extended.map((ing: any, idx: number) => ({
          id: `${m.id}_ing_${idx}`,
          name: String(ing.nameClean || ing.name || ing.original || "").trim(),
          amount: [ing.amount, ing.unit].filter(Boolean).join(" ").trim(),
          category: "Other",
        }))
      : [...(m.usedIngredients ?? []), ...(m.missedIngredients ?? [])].map((ing: any, idx: number) => ({
          id: `${m.id}_ing_${idx}`,
          name: String(ing.name ?? "").trim(),
          amount: String(ing.original ?? "").trim(),
          category: "Other",
        }));

    return {
      id: `spoonacular_${m.id}`,
      name: String(m.title ?? info.title ?? "Recipe"),
      image: String(info.image ?? m.image ?? ""),
      rating: 4.5,
      cookTime: info.readyInMinutes ? `${info.readyInMinutes} min` : "",
      servings: typeof info.servings === "number" ? info.servings : 2,
      category: titleCase(String(info.dishTypes?.[0] ?? "Main")),
      ingredients,
      steps: steps.length ? steps : [NO_INSTRUCTIONS],
      usedIngredients: (m.usedIngredients ?? []).map((i: any) => String(i.name)).filter(Boolean),
      missedIngredients: (m.missedIngredients ?? []).map((i: any) => String(i.name)).filter(Boolean),
    };
  });
}

async function fromTheMealDB(ingredients: string[]): Promise<SearchRecipe[]> {
  const base = "https://www.themealdb.com/api/json/v1/1";
  const picked = ingredients.map((i) => i.toLowerCase());
  const seen = new Set<string>();
  const out: SearchRecipe[] = [];

  for (const ing of ingredients.slice(0, 3)) {
    if (out.length >= RESULT_LIMIT) break;
    const res = await fetch(`${base}/filter.php?i=${encodeURIComponent(ing)}`);
    if (!res.ok) continue;
    const list = (await res.json()) as { meals: { idMeal: string }[] | null };
    for (const meal of list.meals ?? []) {
      if (out.length >= RESULT_LIMIT || seen.has(meal.idMeal)) continue;
      seen.add(meal.idMeal);
      const detailRes = await fetch(`${base}/lookup.php?i=${meal.idMeal}`);
      if (!detailRes.ok) continue;
      const detail = ((await detailRes.json()) as { meals: any[] | null }).meals?.[0];
      if (!detail) continue;

      const recipeIngredients: SearchRecipe["ingredients"] = [];
      for (let i = 1; i <= 20; i++) {
        const name = String(detail[`strIngredient${i}`] ?? "").trim();
        if (!name) continue;
        recipeIngredients.push({
          id: `${detail.idMeal}_ing_${i}`,
          name,
          amount: String(detail[`strMeasure${i}`] ?? "").trim(),
          category: "Other",
        });
      }
      const lowerNames = recipeIngredients.map((x) => x.name.toLowerCase());
      const used = picked.filter((p) => lowerNames.some((r) => r.includes(p) || p.includes(r)));
      const steps = String(detail.strInstructions ?? "")
        .split(/\r?\n|(?<=\.)\s+/)
        .map((s: string) => s.trim())
        .filter((s: string) => s.length > 8);

      out.push({
        id: `mealdb_${detail.idMeal}`,
        name: String(detail.strMeal ?? "Recipe"),
        image: String(detail.strMealThumb ?? ""),
        rating: 4.5,
        cookTime: "",
        servings: 4,
        category: String(detail.strCategory ?? "Main"),
        ingredients: recipeIngredients,
        steps: steps.length ? steps : [NO_INSTRUCTIONS],
        usedIngredients: used,
        missedIngredients: [],
      });
    }
  }

  return out.sort((a, b) => b.usedIngredients.length - a.usedIngredients.length);
}

// Search real recipes for a set of ingredients: Spoonacular first (cached),
// TheMealDB as the free fallback.
export const findByIngredients = action({
  args: { ingredients: v.array(v.string()) },
  returns: v.array(searchResultRecipe),
  // Explicit return type: the handler references internal.recipes.* (itself),
  // which makes inference circular without an annotation.
  handler: async (ctx, { ingredients }): Promise<SearchRecipe[]> => {
    const cleaned = normalize(ingredients).slice(0, 10);
    if (cleaned.length === 0) return [];

    const key = cacheKey(cleaned);
    const cached = (await ctx.runQuery(internal.recipes.getCache, { key })) as
      | { recipes: SearchRecipe[]; createdAt: number }
      | null;
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return cached.recipes;
    }

    let recipes: SearchRecipe[] = [];
    let source = "spoonacular";
    try {
      const spoon = await fromSpoonacular(cleaned);
      if (spoon && spoon.length > 0) {
        recipes = spoon;
      } else {
        source = "themealdb";
        recipes = await fromTheMealDB(cleaned);
      }
    } catch (e) {
      console.error("recipe search failed", e);
      source = "themealdb";
      try {
        recipes = await fromTheMealDB(cleaned);
      } catch {
        recipes = [];
      }
    }

    if (recipes.length > 0) {
      await ctx.runMutation(internal.recipes.putCache, { key, source, recipes });
    }
    return recipes;
  },
});
