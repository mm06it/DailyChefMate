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

// ---- Week plan ----

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
  args: { day: v.string(), recipe: planRecipeValidator },
  handler: async (ctx, { day, recipe }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("mealPlanEntries", {
      userId,
      day,
      recipe,
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

// ---- Shopping list ----

export const listItems = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("shoppingListItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const addItem = mutation({
  args: { name: v.string(), amount: v.string(), source: v.string() },
  handler: async (ctx, { name, amount, source }) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("shoppingListItems", {
      userId,
      name,
      amount,
      checked: false,
      source,
      addedAt: Date.now(),
    });
  },
});

// Bulk add from the week plan. Skips names already on the list
// (case-insensitive) and returns how many were actually inserted.
export const addItemsBulk = mutation({
  args: { items: v.array(v.object({ name: v.string(), amount: v.string() })) },
  handler: async (ctx, { items }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const have = new Set(existing.map((i) => i.name.trim().toLowerCase()));

    let added = 0;
    for (const item of items) {
      const key = item.name.trim().toLowerCase();
      if (!key || have.has(key)) continue;
      have.add(key);
      await ctx.db.insert("shoppingListItems", {
        userId,
        name: item.name,
        amount: item.amount,
        checked: false,
        source: "plan",
        addedAt: Date.now(),
      });
      added++;
    }
    return { added };
  },
});

export const toggleItem = mutation({
  args: { id: v.id("shoppingListItems") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(id);
    if (!item || item.userId !== userId) throw new Error("Item not found");
    await ctx.db.patch(id, { checked: !item.checked });
  },
});

export const removeItem = mutation({
  args: { id: v.id("shoppingListItems") },
  handler: async (ctx, { id }) => {
    const userId = await requireUserId(ctx);
    const item = await ctx.db.get(id);
    if (!item || item.userId !== userId) throw new Error("Item not found");
    await ctx.db.delete(id);
  },
});

export const clearChecked = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const item of items) {
      if (item.checked) await ctx.db.delete(item._id);
    }
  },
});

export const clearAll = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const items = await ctx.db
      .query("shoppingListItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const item of items) await ctx.db.delete(item._id);
  },
});
