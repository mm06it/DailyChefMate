import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query } from "./_generated/server";
import { rateLimiter } from "./rateLimits";
import { notifyRecipeInteraction } from "./social";

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("cookedRecipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const markCooked = mutation({
  args: { recipeId: v.string() },
  handler: async (ctx, { recipeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    await rateLimiter.limit(ctx, "markCooked", { key: userId, throws: true });
    const existing = await ctx.db
      .query("cookedRecipes")
      .withIndex("by_user_and_recipe", (q) => q.eq("userId", userId).eq("recipeId", recipeId))
      .unique();
    if (existing) {
      await ctx.db.patch(existing._id, { count: existing.count + 1 });
    } else {
      await ctx.db.insert("cookedRecipes", { userId, recipeId, count: 1 });
      await notifyRecipeInteraction(ctx, userId, recipeId, "recipe_cooked");
    }
  },
});
