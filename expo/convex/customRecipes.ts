import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

const ingredientValidator = v.object({
  id: v.string(),
  name: v.string(),
  amount: v.string(),
  category: v.string(),
});

const recipeArgs = {
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
  visibility: v.optional(v.union(v.literal("private"), v.literal("public"))),
};

async function requireOwnRecipe(ctx: MutationCtx, id: Id<"customRecipes">) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  const recipe = await ctx.db.get(id);
  if (!recipe || recipe.userId !== userId) {
    throw new Error("Recipe not found");
  }
  return recipe;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("customRecipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

export const add = mutation({
  args: recipeArgs,
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    const id = await ctx.db.insert("customRecipes", {
      userId,
      isFavorite: false,
      ...args,
    });

    // Friend-feed event — only for public recipes, and only if the user
    // hasn't hidden their activity globally.
    const user = await ctx.db.get(userId);
    if (args.visibility === "public" && user?.feedVisibility !== "private") {
      await ctx.db.insert("activityEvents", {
        userId,
        type: "created_recipe",
        recipe: { id, ...args },
        createdAt: Date.now(),
      });
    }
    return id;
  },
});

export const update = mutation({
  args: { id: v.id("customRecipes"), ...recipeArgs },
  handler: async (ctx, { id, ...rest }) => {
    const recipe = await requireOwnRecipe(ctx, id);
    await ctx.db.patch(id, { ...rest, isFavorite: recipe.isFavorite });
  },
});

export const remove = mutation({
  args: { id: v.id("customRecipes") },
  handler: async (ctx, { id }) => {
    await requireOwnRecipe(ctx, id);
    await ctx.db.delete(id);

    const userId = await getAuthUserId(ctx);
    const cooked = await ctx.db
      .query("cookedRecipes")
      .withIndex("by_user_and_recipe", (q) => q.eq("userId", userId!).eq("recipeId", id))
      .unique();
    if (cooked) await ctx.db.delete(cooked._id);
  },
});

export const toggleFavorite = mutation({
  args: { id: v.id("customRecipes") },
  handler: async (ctx, { id }) => {
    const recipe = await requireOwnRecipe(ctx, id);
    await ctx.db.patch(id, { isFavorite: !recipe.isFavorite });
  },
});
