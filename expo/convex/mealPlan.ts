import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

const ingredientValidator = v.object({
  id: v.string(),
  name: v.string(),
  amount: v.string(),
  category: v.string(),
});

// Mirrors schema.ts's `{ id, ...recipeFields }` — the full recipe snapshot,
// including the custom-recipe-only `mode` / `ovenMode`.
const planRecipeValidator = v.object({
  id: v.string(),
  name: v.string(),
  image: v.string(),
  rating: v.number(),
  cookTime: v.string(),
  servings: v.number(),
  category: v.string(),
  course: v.optional(v.string()),
  ingredients: v.array(ingredientValidator),
  steps: v.array(v.string()),
  prepTime: v.optional(v.string()),
  ovenHeat: v.optional(v.string()),
  ovenTime: v.optional(v.string()),
  totalTime: v.optional(v.string()),
  mode: v.optional(v.string()),
  ovenMode: v.optional(v.string()),
});

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("mealPlanEntries")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const addEntry = mutation({
  args: { day: v.string(), recipe: planRecipeValidator, servings: v.number() },
  handler: async (ctx, { day, recipe, servings }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("mealPlanEntries", {
      userId,
      day,
      recipe,
      servings,
      checkedIngredients: [],
      addedAt: Date.now(),
    });
  },
});

export const removeEntry = mutation({
  args: { id: v.id("mealPlanEntries") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const entry = await ctx.db.get(id);
    if (!entry || entry.userId !== userId) throw new Error("Entry not found");
    await ctx.db.delete(id);
  },
});

export const moveEntry = mutation({
  args: { id: v.id("mealPlanEntries"), day: v.string() },
  handler: async (ctx, { id, day }) => {
    const userId = await requireUserId(ctx);
    const entry = await ctx.db.get(id);
    if (!entry || entry.userId !== userId) throw new Error("Entry not found");
    await ctx.db.patch(id, { day });
  },
});

export const setServings = mutation({
  args: { id: v.id("mealPlanEntries"), servings: v.number() },
  handler: async (ctx, { id, servings }) => {
    const userId = await requireUserId(ctx);
    const entry = await ctx.db.get(id);
    if (!entry || entry.userId !== userId) throw new Error("Entry not found");
    await ctx.db.patch(id, { servings: Math.max(1, Math.min(20, Math.round(servings))) });
  },
});

export const setCooked = mutation({
  args: { id: v.id("mealPlanEntries"), cooked: v.boolean() },
  handler: async (ctx, { id, cooked }) => {
    const userId = await requireUserId(ctx);
    const entry = await ctx.db.get(id);
    if (!entry || entry.userId !== userId) throw new Error("Entry not found");
    await ctx.db.patch(id, { cookedAt: cooked ? Date.now() : undefined });
  },
});

// Tick / untick one ingredient of a planned recipe on the shopping list.
export const toggleIngredient = mutation({
  args: { id: v.id("mealPlanEntries"), ingredientId: v.string() },
  handler: async (ctx, { id, ingredientId }) => {
    const userId = await requireUserId(ctx);
    const entry = await ctx.db.get(id);
    if (!entry || entry.userId !== userId) throw new Error("Entry not found");
    const current = entry.checkedIngredients ?? [];
    const next = current.includes(ingredientId)
      ? current.filter((x) => x !== ingredientId)
      : [...current, ingredientId];
    await ctx.db.patch(id, { checkedIngredients: next });
  },
});
