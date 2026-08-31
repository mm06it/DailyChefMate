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
  mode: v.optional(v.string()),
  ovenMode: v.optional(v.string()),
};

// A recipe from the ingredient search (convex/recipes.ts) with per-search
// match info attached. Also the shape stored in recipeCache below.
export const searchResultRecipe = v.object({
  id: v.string(),
  ...recipeFields,
  usedIngredients: v.array(v.string()),
  missedIngredients: v.array(v.string()),
});

export default defineSchema({
  // Provided by @convex-dev/auth — sessions, auth accounts, etc.
  ...authTables,

  // Same as authTables.users, plus `username` (set at sign-up, see
  // convex/auth.ts's Password profile(); editable later via
  // convex/users.ts's updateUsername). Keep the same indexes; `username`
  // is indexed so uniqueness checks stay a point lookup.
  users: defineTable({
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    username: v.optional(v.string()),
  })
    .index("email", ["email"])
    .index("phone", ["phone"])
    .index("username", ["username"]),

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

  // Profile-stat counters that aren't already derivable from another table
  // (favorites/cooked totals are). Starts empty for a brand-new account, so
  // every stat genuinely reads 0 until the matching action happens.
  userStats: defineTable({
    userId: v.id("users"),
    viewedRecipeIds: v.array(v.string()),
    generatedCount: v.number(),
  }).index("by_user", ["userId"]),

  // Shared cache for the ingredient recipe search so repeat queries don't
  // burn the Spoonacular free-tier quota. `key` is the sorted, lowercased
  // ingredient list; entries are refreshed after a few days (see
  // convex/recipes.ts).
  recipeCache: defineTable({
    key: v.string(),
    source: v.string(),
    recipes: v.array(searchResultRecipe),
    createdAt: v.number(),
  }).index("by_key", ["key"]),

  // Recipes assigned to a day of a real calendar week (planner tab). The
  // recipe is snapshotted in full (like favoriteRecipes) so external results
  // survive. `day` is the ISO date (YYYY-MM-DD).
  mealPlanEntries: defineTable({
    userId: v.id("users"),
    day: v.string(),
    recipe: v.object({ id: v.string(), ...recipeFields }),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_day", ["userId", "day"]),

  // The user's shopping list. Filled by hand or aggregated from the ingredients
  // of the week's planned recipes ("Fill from plan").
  shoppingListItems: defineTable({
    userId: v.id("users"),
    name: v.string(),
    amount: v.string(),
    checked: v.boolean(),
    source: v.string(), // "manual" | "plan"
    addedAt: v.number(),
  }).index("by_user", ["userId"]),

  // Shared cache of machine translations for browse/search recipes so each
  // recipe is only ever sent to the LLM once per language. `key` is
  // `${lang}:${recipeId}`. See convex/translate.ts.
  recipeTranslationCache: defineTable({
    key: v.string(),
    translated: v.object({
      name: v.string(),
      category: v.string(),
      ingredients: v.array(v.object({ name: v.string(), amount: v.string() })),
      steps: v.array(v.string()),
    }),
    createdAt: v.number(),
  }).index("by_key", ["key"]),
});
