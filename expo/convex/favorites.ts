import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { notifyRecipeInteraction } from "./social";

const ingredientValidator = v.object({
  id: v.string(),
  name: v.string(),
  amount: v.string(),
  category: v.string(),
});

const recipeValidator = v.object({
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
});

// Favorites for recipes that live elsewhere (TheMealDB / AI search results),
// not the user's own custom recipes — those track isFavorite on themselves.
export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("favoriteRecipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    return rows.map((row) => row.recipe);
  },
});

export const add = mutation({
  args: { recipe: recipeValidator },
  handler: async (ctx, { recipe }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("favoriteRecipes")
      .withIndex("by_user_and_recipe", (q) => q.eq("userId", userId).eq("recipeId", recipe.id))
      .unique();
    if (existing) return;
    await ctx.db.insert("favoriteRecipes", { userId, recipeId: recipe.id, recipe });
    await notifyRecipeInteraction(ctx, userId, recipe.id, "recipe_favorited");
  },
});

export const remove = mutation({
  args: { recipeId: v.string() },
  handler: async (ctx, { recipeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const existing = await ctx.db
      .query("favoriteRecipes")
      .withIndex("by_user_and_recipe", (q) => q.eq("userId", userId).eq("recipeId", recipeId))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});
