import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const EMPTY_STATS = { viewedRecipeIds: [] as string[], generatedCount: 0 };

export const get = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return EMPTY_STATS;
    const row = await ctx.db
      .query("userStats")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .unique();
    if (!row) return EMPTY_STATS;
    return { viewedRecipeIds: row.viewedRecipeIds, generatedCount: row.generatedCount };
  },
});

async function getOrCreateRow(ctx: MutationCtx, userId: Id<"users">) {
  const existing = await ctx.db
    .query("userStats")
    .withIndex("by_user", (q) => q.eq("userId", userId))
    .unique();
  if (existing) return existing;
  const id = await ctx.db.insert("userStats", { userId, viewedRecipeIds: [], generatedCount: 0 });
  return await ctx.db.get(id);
}

// Marks a recipe as viewed at most once per user — re-viewing something
// already seen doesn't inflate the count.
export const recordView = mutation({
  args: { recipeId: v.string() },
  handler: async (ctx, { recipeId }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await getOrCreateRow(ctx, userId);
    if (!row || row.viewedRecipeIds.includes(recipeId)) return;
    await ctx.db.patch(row._id, { viewedRecipeIds: [...row.viewedRecipeIds, recipeId] });
  },
});

export const recordGenerated = mutation({
  args: { count: v.number() },
  handler: async (ctx, { count }) => {
    if (count <= 0) return;
    const userId = await getAuthUserId(ctx);
    if (!userId) return;
    const row = await getOrCreateRow(ctx, userId);
    if (!row) return;
    await ctx.db.patch(row._id, { generatedCount: row.generatedCount + count });
  },
});
