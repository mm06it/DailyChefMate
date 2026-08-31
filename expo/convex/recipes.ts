import { v } from "convex/values";

import { action, internalMutation, internalQuery } from "./_generated/server";
import { internal } from "./_generated/api";
import { searchResultRecipe } from "./schema";

// Repeat searches for the same ingredient set are served from recipeCache
// so the Spoonacular free tier (150 points/day) lasts. Entries older than
// this are re-fetched on next access and pruned daily by a cron
// (crons.ts -> pruneRecipeCache).
const CACHE_TTL_MS = 1000 * 60 * 60 * 24 * 30;
// Part of every cache key: bump it whenever the cached recipe shape or the
// parsing/enrichment below changes, so a deploy transparently invalidates
// every stale entry instead of serving an old shape for up to 30 days.
const CACHE_VERSION = "v2";
// How many recipes one "page" of results contains ("load more" fetches the
// next page).
const PAGE_SIZE = 8;
// How many recipes we fetch + enrich + cache on the first search for a given
// ingredient set. "Load more" then just slices deeper into this cached list,
// so paging costs no extra API quota until the cache expires.
const MAX_RESULTS = 24;
const NO_INSTRUCTIONS = "No instructions available.";

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
  return `${CACHE_VERSION}:${normalize(ingredients).sort().join("|")}`;
}

function titleCase(s: string): string {
  return s.replace(/\b\w/g, (c) => c.toUpperCase());
}

// Spoonacular serves the same photo at several sizes; prefer the largest
// (636x393) for the card preview. `info.image` is usually a full URL,
// `m.image` from findByIngredients is sometimes just a filename.
function bestSpoonacularImage(raw: string): string {
  if (!raw) return "";
  let url = raw;
  if (!/^https?:\/\//.test(url)) url = `https://img.spoonacular.com/recipes/${url}`;
  return url.replace(/-\d+x\d+(\.\w+)(\?|$)/, "-636x393$1$2");
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

// Manual flush — internal, so only reachable from the Convex dashboard or CLI:
//   npx convex run recipes:clearRecipeCache '{}'                (whole cache)
//   npx convex run recipes:clearRecipeCache '{"key":"v2:egg|milk"}'  (one entry)
export const clearRecipeCache = internalMutation({
  args: { key: v.optional(v.string()) },
  handler: async (ctx, { key }) => {
    if (key) {
      const row = await ctx.db
        .query("recipeCache")
        .withIndex("by_key", (q) => q.eq("key", key))
        .first();
      if (row) await ctx.db.delete(row._id);
      return { deleted: row ? 1 : 0 };
    }
    const rows = await ctx.db.query("recipeCache").collect();
    for (const r of rows) await ctx.db.delete(r._id);
    return { deleted: rows.length };
  },
});

// Daily cron (crons.ts): delete entries past the TTL so rarely-repeated
// ingredient combos don't accumulate. The read path already ignores expired
// rows; this just bounds table growth.
export const pruneRecipeCache = internalMutation({
  args: {},
  handler: async (ctx) => {
    const cutoff = Date.now() - CACHE_TTL_MS;
    const stale = await ctx.db
      .query("recipeCache")
      .withIndex("by_createdAt", (q) => q.lt("createdAt", cutoff))
      .collect();
    for (const r of stale) await ctx.db.delete(r._id);
    return { pruned: stale.length };
  },
});

async function fromSpoonacular(
  ingredients: string[],
  count: number,
): Promise<SearchRecipe[] | null> {
  const apiKey = process.env.SPOONACULAR_API_KEY;
  if (!apiKey) return null;

  const findUrl =
    `https://api.spoonacular.com/recipes/findByIngredients` +
    `?ingredients=${encodeURIComponent(ingredients.join(","))}` +
    `&number=${count}&ranking=1&ignorePantry=true&apiKey=${apiKey}`;

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
      image: bestSpoonacularImage(String(info.image ?? m.image ?? "")),
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

async function fromTheMealDB(ingredients: string[], count: number): Promise<SearchRecipe[]> {
  const base = "https://www.themealdb.com/api/json/v1/1";
  const picked = ingredients.map((i) => i.toLowerCase());
  const seen = new Set<string>();
  const out: SearchRecipe[] = [];

  for (const ing of ingredients.slice(0, 6)) {
    if (out.length >= count) break;
    const res = await fetch(`${base}/filter.php?i=${encodeURIComponent(ing)}`);
    if (!res.ok) continue;
    const list = (await res.json()) as { meals: { idMeal: string }[] | null };
    for (const meal of list.meals ?? []) {
      if (out.length >= count || seen.has(meal.idMeal)) continue;
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
// TheMealDB as the free fallback. `offset` pages through the cached result
// set — "load more" passes 8, 16, … and gets the next slice with no extra
// API calls until the cache expires.
export const findByIngredients = action({
  args: { ingredients: v.array(v.string()), offset: v.optional(v.number()) },
  returns: v.array(searchResultRecipe),
  // Explicit return type: the handler references internal.recipes.* (itself),
  // which makes inference circular without an annotation.
  handler: async (ctx, { ingredients, offset }): Promise<SearchRecipe[]> => {
    const cleaned = normalize(ingredients).slice(0, 10);
    if (cleaned.length === 0) return [];

    const start = Math.max(0, Math.floor(offset ?? 0));
    if (start >= MAX_RESULTS) return [];

    const key = cacheKey(cleaned);
    const cached = (await ctx.runQuery(internal.recipes.getCache, { key })) as
      | { recipes: SearchRecipe[]; createdAt: number }
      | null;
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return cached.recipes.slice(start, start + PAGE_SIZE);
    }

    let recipes: SearchRecipe[] = [];
    let source = "spoonacular";
    try {
      const spoon = await fromSpoonacular(cleaned, MAX_RESULTS);
      if (spoon && spoon.length > 0) {
        recipes = spoon;
      } else {
        source = "themealdb";
        recipes = await fromTheMealDB(cleaned, MAX_RESULTS);
      }
    } catch (e) {
      console.error("recipe search failed", e);
      source = "themealdb";
      try {
        recipes = await fromTheMealDB(cleaned, MAX_RESULTS);
      } catch {
        recipes = [];
      }
    }

    if (recipes.length > 0) {
      await ctx.runMutation(internal.recipes.putCache, { key, source, recipes });
    }
    return recipes.slice(start, start + PAGE_SIZE);
  },
});
