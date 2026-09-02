import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { action, internalMutation, internalQuery, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { rateLimiter } from "./rateLimits";

// Fitness Mode: AI per-serving nutrition estimates for browse/search recipes,
// once per recipe, cached forever in recipeNutritionCache. Mirrors the shape
// and caching strategy of convex/translate.ts. Dormant without AI_API_KEY.

async function requireUserId(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

const MAX_RECIPES_PER_CALL = 12;
const CACHE_VERSION = "v1";

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_URL = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

type Nutrition = {
  calories: number;
  protein: number;
  carbs: number;
  fat: number;
  fiber?: number;
  estimated: boolean;
};

const recipeInput = v.object({
  id: v.string(),
  name: v.string(),
  servings: v.number(),
  ingredients: v.array(v.object({ name: v.string(), amount: v.string() })),
});
type InputRecipe = {
  id: string;
  name: string;
  servings: number;
  ingredients: { name: string; amount: string }[];
};

// Trim an untrusted payload before it goes near the LLM.
function clampInput(r: InputRecipe): InputRecipe {
  return {
    id: String(r.id).slice(0, 200),
    name: String(r.name).slice(0, 200),
    servings: Number.isFinite(r.servings) ? Math.max(1, Math.min(100, Math.round(r.servings))) : 1,
    ingredients: (r.ingredients ?? []).slice(0, 60).map((i) => ({
      name: String(i.name).slice(0, 120),
      amount: String(i.amount).slice(0, 60),
    })),
  };
}

function num(x: unknown, lo: number, hi: number): number {
  const n = Math.round(Number(x));
  return Number.isFinite(n) ? Math.max(lo, Math.min(hi, n)) : 0;
}

// Keep an estimate only if it looks like real food (has calories).
function coerceNutrition(raw: unknown): Nutrition | null {
  if (!raw || typeof raw !== "object") return null;
  const o = raw as Record<string, unknown>;
  const calories = num(o.calories, 0, 20000);
  if (calories <= 0) return null;
  const out: Nutrition = {
    calories,
    protein: num(o.protein, 0, 2000),
    carbs: num(o.carbs, 0, 2000),
    fat: num(o.fat, 0, 2000),
    estimated: true,
  };
  const fiber = num(o.fiber, 0, 500);
  if (fiber > 0) out.fiber = fiber;
  return out;
}

async function estimateBatch(recipes: InputRecipe[], apiKey: string): Promise<Map<string, Nutrition>> {
  const res = await fetch(AI_API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: AI_MODEL,
      temperature: 0.2,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You estimate the nutrition of cooked recipes. For each recipe, estimate the " +
            "nutrition of ONE serving (total divided by the serving count). Use the ingredient " +
            "list and typical portion sizes. Return ONLY " +
            '{"recipes":[{"id":string,"calories":number,"protein":number,"carbs":number,"fat":number,"fiber":number}]}. ' +
            "All numbers are integers: calories in kcal, protein/carbs/fat/fiber in grams, per single serving. " +
            "Keep the same id for each recipe. Best-effort estimate, no commentary.",
        },
        { role: "user", content: JSON.stringify({ recipes }) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content ?? "";
  const parsed = JSON.parse(text) as { recipes?: unknown };
  const list = Array.isArray(parsed?.recipes) ? parsed.recipes : [];
  const out = new Map<string, Nutrition>();
  for (const row of list) {
    const r = row as Record<string, unknown>;
    const id = typeof r.id === "string" ? r.id : "";
    const n = coerceNutrition(r);
    if (id && n) out.set(id, n);
  }
  return out;
}

export const getCached = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) =>
    ctx.db
      .query("recipeNutritionCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first(),
});

export const putCached = internalMutation({
  args: {
    key: v.string(),
    nutrition: v.object({
      calories: v.number(),
      protein: v.number(),
      carbs: v.number(),
      fat: v.number(),
      fiber: v.optional(v.number()),
      estimated: v.boolean(),
    }),
  },
  handler: async (ctx, { key, nutrition }) => {
    const existing = await ctx.db
      .query("recipeNutritionCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) return;
    await ctx.db.insert("recipeNutritionCache", { key, nutrition, createdAt: Date.now() });
  },
});

export const estimateNutrition = action({
  args: { recipes: v.array(recipeInput) },
  handler: async (ctx, { recipes: rawRecipes }): Promise<Record<string, Nutrition>> => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "aiNutrition", { key: userId, throws: true });

    if (rawRecipes.length > MAX_RECIPES_PER_CALL) throw new Error("TOO_MANY_RECIPES");
    const recipes = rawRecipes.map(clampInput);

    const out: Record<string, Nutrition> = {};
    const misses: InputRecipe[] = [];
    for (const r of recipes) {
      const key = `nutri:${CACHE_VERSION}:${r.id}`;
      const cached = (await ctx.runQuery(internal.nutrition.getCached, { key })) as
        | { nutrition: Nutrition }
        | null;
      if (cached) out[r.id] = cached.nutrition;
      else misses.push(r);
    }

    if (misses.length === 0 || !AI_API_KEY) return out;

    try {
      const estimates = await estimateBatch(misses, AI_API_KEY);
      for (const r of misses) {
        const n = estimates.get(r.id);
        if (!n) continue;
        out[r.id] = n;
        await ctx.runMutation(internal.nutrition.putCached, {
          key: `nutri:${CACHE_VERSION}:${r.id}`,
          nutrition: n,
        });
      }
    } catch (e) {
      console.error("estimateNutrition failed", e);
    }
    return out;
  },
});
