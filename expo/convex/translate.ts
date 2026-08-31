import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { action, internalMutation, internalQuery, type ActionCtx } from "./_generated/server";
import { internal } from "./_generated/api";
import { rateLimiter } from "./rateLimits";

async function requireUserId(ctx: ActionCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

const MAX_RECIPES_PER_CALL = 12;

// Trim an untrusted recipe payload before it goes anywhere near the LLM.
function clampInput(r: InputRecipe): InputRecipe {
  return {
    id: String(r.id).slice(0, 200),
    name: String(r.name).slice(0, 200),
    category: String(r.category).slice(0, 80),
    ingredients: (r.ingredients ?? []).slice(0, 60).map((i) => ({
      name: String(i.name).slice(0, 120),
      amount: String(i.amount).slice(0, 60),
    })),
    steps: (r.steps ?? []).slice(0, 40).map((s) => String(s).slice(0, 800)),
  };
}

// Machine-translate browse/search recipes (English source, US measures) into
// the app language, once per recipe, cached forever in recipeTranslationCache.

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_URL = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

const LANG_NAME: Record<string, string> = { de: "German", en: "English" };

type Ingredient = { name: string; amount: string };
type Translated = {
  name: string;
  category: string;
  ingredients: Ingredient[];
  steps: string[];
};
type InputRecipe = Translated & { id: string };

const recipeInput = v.object({
  id: v.string(),
  name: v.string(),
  category: v.string(),
  ingredients: v.array(v.object({ name: v.string(), amount: v.string() })),
  steps: v.array(v.string()),
});

function pick(r: InputRecipe): Translated {
  return { name: r.name, category: r.category, ingredients: r.ingredients, steps: r.steps };
}

// Keep the LLM output only if it kept the ingredient count/order; otherwise
// the mapping to the original list would be wrong.
function coerce(raw: unknown, original: InputRecipe): Translated {
  if (!raw || typeof raw !== "object") return pick(original);
  const o = raw as Record<string, unknown>;
  const ingredients = Array.isArray(o.ingredients) ? o.ingredients : [];
  if (ingredients.length !== original.ingredients.length) return pick(original);
  return {
    name: typeof o.name === "string" && o.name.trim() ? o.name.trim() : original.name,
    category: typeof o.category === "string" && o.category.trim() ? o.category.trim() : original.category,
    ingredients: original.ingredients.map((orig, i) => {
      const it = ingredients[i] as Record<string, unknown> | undefined;
      return {
        name: typeof it?.name === "string" && it.name.trim() ? String(it.name).trim() : orig.name,
        amount: typeof it?.amount === "string" ? String(it.amount).trim() : orig.amount,
      };
    }),
    steps: Array.isArray(o.steps) && o.steps.length > 0
      ? o.steps.map((s) => String(s))
      : original.steps,
  };
}

async function translateOne(recipe: InputRecipe, lang: string, apiKey: string): Promise<Translated> {
  const target = LANG_NAME[lang] ?? "German";
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
            `Translate the recipe fields into ${target}. Convert every imperial/US ` +
            `measurement to metric: ounces/pounds -> g, cups/tbsp/tsp/fl oz -> ml or g, ` +
            `Fahrenheit -> °C, inches -> cm. Leave plain counts (e.g. "2 eggs") as counts. ` +
            `Return ONLY a JSON object of the exact same shape ` +
            `{"name":string,"category":string,"ingredients":[{"name":string,"amount":string}],"steps":[string]}. ` +
            `The ingredients array MUST keep the same length and order as the input. No commentary.`,
        },
        { role: "user", content: JSON.stringify(pick(recipe)) },
      ],
    }),
  });
  if (!res.ok) throw new Error(`AI HTTP ${res.status}`);
  const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
  const text = data?.choices?.[0]?.message?.content ?? "";
  return coerce(JSON.parse(text), recipe);
}

async function mapWithConcurrency<T, R>(items: T[], limit: number, fn: (item: T) => Promise<R>): Promise<R[]> {
  const out: R[] = new Array(items.length);
  let cursor = 0;
  async function worker() {
    while (cursor < items.length) {
      const i = cursor++;
      out[i] = await fn(items[i]);
    }
  }
  await Promise.all(Array.from({ length: Math.min(limit, items.length) }, worker));
  return out;
}

export const getCached = internalQuery({
  args: { key: v.string() },
  handler: async (ctx, { key }) =>
    ctx.db
      .query("recipeTranslationCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first(),
});

export const putCached = internalMutation({
  args: {
    key: v.string(),
    translated: v.object({
      name: v.string(),
      category: v.string(),
      ingredients: v.array(v.object({ name: v.string(), amount: v.string() })),
      steps: v.array(v.string()),
    }),
  },
  handler: async (ctx, { key, translated }) => {
    const existing = await ctx.db
      .query("recipeTranslationCache")
      .withIndex("by_key", (q) => q.eq("key", key))
      .first();
    if (existing) return;
    await ctx.db.insert("recipeTranslationCache", { key, translated, createdAt: Date.now() });
  },
});

export const translateRecipes = action({
  args: {
    lang: v.union(v.literal("de"), v.literal("en")),
    recipes: v.array(recipeInput),
  },
  // Explicit return type — the handler references internal.translate.* (itself).
  handler: async (ctx, { lang, recipes: rawRecipes }): Promise<Record<string, Translated>> => {
    const userId = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "aiTranslate", { key: userId, throws: true });

    if (rawRecipes.length > MAX_RECIPES_PER_CALL) throw new Error("TOO_MANY_RECIPES");
    const recipes = rawRecipes.map(clampInput);

    const out: Record<string, Translated> = {};

    // English is the source language: nothing to do.
    if (lang === "en") {
      for (const r of recipes) out[r.id] = pick(r);
      return out;
    }

    const misses: InputRecipe[] = [];
    for (const r of recipes) {
      const key = `${lang}:${r.id}`;
      const cached = (await ctx.runQuery(internal.translate.getCached, { key })) as
        | { translated: Translated }
        | null;
      if (cached) out[r.id] = cached.translated;
      else misses.push(r);
    }

    if (misses.length === 0) return out;

    if (!AI_API_KEY) {
      for (const r of misses) out[r.id] = pick(r);
      return out;
    }

    const results = await mapWithConcurrency(misses, 6, async (r) => {
      try {
        return { id: r.id, t: await translateOne(r, lang, AI_API_KEY!) };
      } catch (e) {
        console.error("translateOne failed", r.id, e);
        return { id: r.id, t: pick(r) };
      }
    });

    for (const { id, t } of results) {
      out[id] = t;
      await ctx.runMutation(internal.translate.putCached, { key: `${lang}:${id}`, translated: t });
    }
    return out;
  },
});
