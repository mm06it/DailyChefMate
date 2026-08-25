import { publicProcedure } from "@/backend/trpc/create-context";
import { z } from "zod";

import themealdb from "@/lib/themealdb";
import type { Recipe } from "@/types/recipe";

const AI_API_KEY = process.env.AI_API_KEY;
const AI_API_URL = process.env.AI_API_URL ?? "https://api.openai.com/v1/chat/completions";
const AI_MODEL = process.env.AI_MODEL ?? "gpt-4o-mini";

async function enrichWithAI(query: string, base: Recipe[]): Promise<Recipe[]> {
  if (!AI_API_KEY) {
    return base;
  }

  try {
    const res = await fetch(AI_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${AI_API_KEY}`,
      },
      body: JSON.stringify({
        model: AI_MODEL,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: "You are a recipe finder. Return a JSON object with a \"recipes\" array of 5 diverse, high-quality recipes with fields: name, category (cuisine), course (starter|main|dessert when obvious), ingredients (array of {name, amount}), steps (array of strings), cookTime, image (unsplash or site image). Keep safe, common household ingredients; no allergens warnings." },
          { role: "user", content: `Find recipes for: ${query}.` },
        ],
      }),
    });
    if (!res.ok) return base;

    const data = (await res.json()) as { choices?: { message?: { content?: string } }[] };
    const text = data?.choices?.[0]?.message?.content ?? "";
    let parsed: unknown = [];
    try {
      const obj = JSON.parse(text);
      parsed = Array.isArray(obj) ? obj : obj?.recipes;
    } catch {}

    if (!Array.isArray(parsed)) return base;

    const aiRecipes: Recipe[] = (parsed as any[]).slice(0, 10).map((r: any, idx: number) => ({
      id: `ai_${Date.now()}_${idx}`,
      name: String(r.name ?? "AI Recipe"),
      image: String(r.image ?? "https://images.unsplash.com/photo-1504674900247-0877df9cc836?w=800&q=80&auto=format&fit=crop"),
      rating: 4.5,
      cookTime: String(r.cookTime ?? "30 min"),
      servings: Number(r.servings ?? 4),
      category: String(r.category ?? "Miscellaneous"),
      course: typeof r.course === "string" ? r.course : undefined,
      ingredients: Array.isArray(r.ingredients)
        ? r.ingredients.map((ing: any, i: number) => ({
            id: `ai_ing_${i}`,
            name: String(ing.name ?? "Ingredient"),
            amount: String(ing.amount ?? ""),
            category: "Other",
          }))
        : [],
      steps: Array.isArray(r.steps) ? r.steps.map((s: any) => String(s)) : [],
      isFavorite: false,
    }));

    return [...base, ...aiRecipes];
  } catch (e) {
    console.error("AI enrichment failed", e);
    return base;
  }
}

export default publicProcedure
  .input(
    z.object({
      query: z.string().min(1),
      limit: z.number().min(1).max(50).optional(),
      ai: z.boolean().optional(),
    })
  )
  .query(async ({ input }) => {
    const { query, limit = 30, ai = true } = input;

    const mealdb = await themealdb.searchMealsByName(query);

    let merged: Recipe[] = [...mealdb];

    if (ai) {
      merged = await enrichWithAI(query, merged);
    }

    const unique = new Map<string, Recipe>();
    for (const r of merged) {
      unique.set(r.id, r);
    }

    return Array.from(unique.values()).slice(0, limit);
  });