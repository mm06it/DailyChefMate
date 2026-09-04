import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";

import { action, internalMutation, internalQuery, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { rateLimiter } from "./rateLimits";
import { searchResultRecipe } from "./schema";

async function requireUserId(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  return userId;
}

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
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "recipeSearch", { key: userId, throws: true });

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

// ---- search recipes by name (TheMealDB + optional AI enrichment) ----

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_URL = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";
const NAME_QUERY_MAX = 80;
const NAME_RESULT_LIMIT = 30;

// TheMealDB's search.php returns fully-detailed meals (ingredients + steps),
// so no per-id lookup is needed.
async function fromTheMealDBByName(query: string): Promise<SearchRecipe[]> {
  const res = await fetch(
    `https://www.themealdb.com/api/json/v1/1/search.php?s=${encodeURIComponent(query)}`,
  );
  if (!res.ok) return [];
  const meals = ((await res.json()) as { meals: any[] | null }).meals ?? [];
  return meals.map((detail: any) => {
    const ingredients: SearchRecipe["ingredients"] = [];
    for (let i = 1; i <= 20; i++) {
      const name = String(detail[`strIngredient${i}`] ?? "").trim();
      if (!name) continue;
      ingredients.push({
        id: `${detail.idMeal}_ing_${i}`,
        name,
        amount: String(detail[`strMeasure${i}`] ?? "").trim(),
        category: "Other",
      });
    }
    const steps = String(detail.strInstructions ?? "")
      .split(/\r?\n|(?<=\.)\s+/)
      .map((s: string) => s.trim())
      .filter((s: string) => s.length > 8);
    return {
      id: `mealdb_${detail.idMeal}`,
      name: String(detail.strMeal ?? "Recipe"),
      image: String(detail.strMealThumb ?? ""),
      rating: 4.5,
      cookTime: "",
      servings: 4,
      category: String(detail.strCategory ?? "Main"),
      ingredients,
      steps: steps.length ? steps : [NO_INSTRUCTIONS],
      usedIngredients: [],
      missedIngredients: [],
    };
  });
}

// Ask the LLM for a handful of extra recipes matching the query. Anything that
// fails to parse is dropped — never throws.
async function enrichWithAI(query: string, base: SearchRecipe[]): Promise<SearchRecipe[]> {
  if (!AI_API_KEY) return base;
  try {
    const res = await fetch(AI_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json", Authorization: `Bearer ${AI_API_KEY}` },
      body: JSON.stringify({
        model: AI_MODEL,
        response_format: { type: "json_object" },
        messages: [
          {
            role: "system",
            content:
              'Return a JSON object with a "recipes" array of up to 5 diverse, high-quality ' +
              "recipes. Each: name, category (cuisine), course (starter|main|dessert when obvious), " +
              "ingredients (array of {name, amount}), steps (array of strings), cookTime, image " +
              "(a real https image URL). Common household ingredients, metric measures, no commentary.",
          },
          { role: "user", content: `Find recipes for: ${query}.` },
        ],
      }),
    });
    if (!res.ok) return base;
    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    let parsed: unknown = [];
    try {
      const obj = JSON.parse(data?.choices?.[0]?.message?.content ?? "");
      parsed = Array.isArray(obj) ? obj : (obj as any)?.recipes;
    } catch {
      return base;
    }
    if (!Array.isArray(parsed)) return base;

    const aiRecipes: SearchRecipe[] = (parsed as any[]).slice(0, 10).map((r: any, idx: number) => ({
      id: `ai_${Date.now()}_${idx}`,
      name: String(r.name ?? "AI Recipe").slice(0, 200),
      image: /^https?:\/\//.test(String(r.image ?? "")) ? String(r.image).slice(0, 500) : "",
      rating: 4.5,
      cookTime: String(r.cookTime ?? "").slice(0, 40),
      servings: Number.isFinite(Number(r.servings)) ? Math.max(1, Math.min(20, Number(r.servings))) : 4,
      category: String(r.category ?? "Miscellaneous").slice(0, 80),
      course: typeof r.course === "string" ? r.course.slice(0, 40) : undefined,
      ingredients: (Array.isArray(r.ingredients) ? r.ingredients : [])
        .slice(0, 60)
        .map((ing: any, i: number) => ({
          id: `ai_ing_${idx}_${i}`,
          name: String(ing?.name ?? "Ingredient").slice(0, 120),
          amount: String(ing?.amount ?? "").slice(0, 60),
          category: "Other",
        })),
      steps: (Array.isArray(r.steps) ? r.steps : []).slice(0, 40).map((s: any) => String(s).slice(0, 800)),
      usedIngredients: [],
      missedIngredients: [],
    }));

    const seen = new Set(base.map((b) => b.name.toLowerCase()));
    return [...base, ...aiRecipes.filter((r) => r.name && !seen.has(r.name.toLowerCase()))];
  } catch (e) {
    console.error("AI recipe enrichment failed", e);
    return base;
  }
}

// Text search by recipe name — authenticated, rate-limited, cached (reuses the
// recipeCache table with a `name:`-prefixed key). Replaces the old unauthed
// tRPC route (backend/trpc/routes/recipes/search).
export const searchByName = action({
  args: { query: v.string(), limit: v.optional(v.number()) },
  returns: v.array(searchResultRecipe),
  handler: async (ctx, { query, limit }): Promise<SearchRecipe[]> => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "searchByName", { key: userId, throws: true });

    const q = query.trim().slice(0, NAME_QUERY_MAX);
    if (!q) return [];
    const take = Math.max(1, Math.min(NAME_RESULT_LIMIT, Math.floor(limit ?? NAME_RESULT_LIMIT)));

    const key = `${CACHE_VERSION}:name:${q.toLowerCase()}`;
    const cached = (await ctx.runQuery(internal.recipes.getCache, { key })) as
      | { recipes: SearchRecipe[]; createdAt: number }
      | null;
    if (cached && Date.now() - cached.createdAt < CACHE_TTL_MS) {
      return cached.recipes.slice(0, take);
    }

    let base: SearchRecipe[] = [];
    try {
      base = await fromTheMealDBByName(q);
    } catch (e) {
      console.error("themealdb name search failed", e);
    }
    const recipes = await enrichWithAI(q, base);

    if (recipes.length > 0) {
      await ctx.runMutation(internal.recipes.putCache, {
        key,
        source: AI_API_KEY ? "themealdb+ai" : "themealdb",
        recipes,
      });
    }
    return recipes.slice(0, take);
  },
});
