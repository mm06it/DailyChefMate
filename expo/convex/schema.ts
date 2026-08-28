import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

const recipeIngredient = v.object({
  id: v.string(),
  name: v.string(),
  amount: v.string(),
  category: v.string(),
});

const recipeFields = {
  name: v.string(),
  image: v.string(),
  rating: v.number(),
  cookTime: v.string(),
  servings: v.number(),
  category: v.string(),
  course: v.optional(v.string()),
  ingredients: v.array(recipeIngredient),
  steps: v.array(v.string()),
  prepTime: v.optional(v.string()),
  ovenHeat: v.optional(v.string()),
  ovenTime: v.optional(v.string()),
  totalTime: v.optional(v.string()),
};

export default defineSchema({
  // Provided by @convex-dev/auth — users, sessions, auth accounts, etc.
  ...authTables,

  // Per-user fridge inventory. Mirrors types/recipe.ts's Ingredient shape,
  // with Convex's document _id standing in for Ingredient.id.
  refrigeratorItems: defineTable({
    userId: v.id("users"),
    name: v.string(),
    amount: v.string(),
    category: v.string(),
    isSelected: v.boolean(),
  }).index("by_user", ["userId"]),

  // Recipes the user created themselves (Add Recipe screen).
  customRecipes: defineTable({
    userId: v.id("users"),
    isFavorite: v.boolean(),
    ...recipeFields,
  }).index("by_user", ["userId"]),

  // Favorited recipes that came from elsewhere (TheMealDB / AI search
  // results) — snapshotted in full since the source isn't ours to persist.
  favoriteRecipes: defineTable({
    userId: v.id("users"),
    recipeId: v.string(),
    recipe: v.object({ id: v.string(), ...recipeFields }),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_recipe", ["userId", "recipeId"]),

  // How many times each recipe (custom or external) has been marked cooked.
  cookedRecipes: defineTable({
    userId: v.id("users"),
    recipeId: v.string(),
    count: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_recipe", ["userId", "recipeId"]),
});
