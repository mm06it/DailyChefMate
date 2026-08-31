import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";
import { clampRecipeSnapshot } from "./lib/recipeLimits";

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
    const rows = await ctx.db
      .query("customRecipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    // Resolve an uploaded photo to a served URL — it wins over `image`.
    return await Promise.all(
      rows.map(async (r) =>
        r.imageStorageId
          ? { ...r, image: (await ctx.storage.getUrl(r.imageStorageId)) ?? r.image }
          : r,
      ),
    );
  },
});

// Client uploads the file to this URL (POST), then calls setRecipeImage.
export const generateImageUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");
    return await ctx.storage.generateUploadUrl();
  },
});

export const setRecipeImage = mutation({
  args: { id: v.id("customRecipes"), storageId: v.id("_storage") },
  handler: async (ctx, { id, storageId }) => {
    const recipe = await requireOwnRecipe(ctx, id);
    if (recipe.imageStorageId && recipe.imageStorageId !== storageId) {
      await ctx.storage.delete(recipe.imageStorageId);
    }
    await ctx.db.patch(id, { imageStorageId: storageId, image: "" });

    // The recipe's feed event was emitted at create time with an empty image
    // (the photo is uploaded a moment later). Backfill it so friends see the
    // photo in their feed.
    const url = await ctx.storage.getUrl(storageId);
    if (url) {
      const events = await ctx.db
        .query("activityEvents")
        .withIndex("by_user_created", (q) => q.eq("userId", recipe.userId))
        .order("desc")
        .take(30);
      for (const e of events) {
        if (e.recipe?.id === id && e.recipe.image !== url) {
          await ctx.db.patch(e._id, { recipe: { ...e.recipe, image: url } });
        }
      }
    }
  },
});

export const clearRecipeImage = mutation({
  args: { id: v.id("customRecipes") },
  handler: async (ctx, { id }) => {
    const recipe = await requireOwnRecipe(ctx, id);
    if (recipe.imageStorageId) await ctx.storage.delete(recipe.imageStorageId);
    await ctx.db.patch(id, { imageStorageId: undefined, image: "" });
  },
});

export const add = mutation({
  args: recipeArgs,
  handler: async (ctx, rawArgs) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new Error("Not authenticated");

    const args = clampRecipeSnapshot(rawArgs);

    // Guard against a double-submit (rapid taps on the save button): if this
    // user just created a recipe with the same name, return that one instead
    // of inserting a duplicate.
    const name = args.name.trim();
    const mine = await ctx.db
      .query("customRecipes")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    const recent = mine.find(
      (r) => r.name.trim() === name && Date.now() - r._creationTime < 20_000,
    );
    if (recent) return recent._id;

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
    await ctx.db.patch(id, { ...clampRecipeSnapshot(rest), isFavorite: recipe.isFavorite });
  },
});

export const remove = mutation({
  args: { id: v.id("customRecipes") },
  handler: async (ctx, { id }) => {
    const recipe = await requireOwnRecipe(ctx, id);
    if (recipe.imageStorageId) await ctx.storage.delete(recipe.imageStorageId);
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
