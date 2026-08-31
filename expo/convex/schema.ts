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
    // Social profile (all optional — no migration for existing rows).
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    discoverable: v.optional(v.boolean()), // missing = findable
    feedVisibility: v.optional(v.union(v.literal("friends"), v.literal("private"))),
    isAdmin: v.optional(v.boolean()),
    feedSeenAt: v.optional(v.number()), // last time the user opened the feed
    // When true, this user's accepted friends are shown on their profile to
    // their other friends, and those friends-of-friends may send a request.
    friendListVisible: v.optional(v.boolean()),
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
  // survive. `day` is the ISO date (YYYY-MM-DD). `servings` is the planned
  // portion size (drives shopping-list amount scaling); `cookedAt` marks the
  // meal as done; `checkedIngredients` are the ingredient ids ticked off on
  // the shopping list. All three are optional so entries created before this
  // schema keep validating.
  mealPlanEntries: defineTable({
    userId: v.id("users"),
    day: v.string(),
    recipe: v.object({ id: v.string(), ...recipeFields }),
    servings: v.optional(v.number()),
    cookedAt: v.optional(v.number()),
    checkedIngredients: v.optional(v.array(v.string())),
    addedAt: v.number(),
  })
    .index("by_user", ["userId"])
    .index("by_user_and_day", ["userId", "day"]),

  // Friendship as two rows (one per direction), kept in sync inside a single
  // transactional mutation, so "my friends" / "my requests" are one index scan.
  friendships: defineTable({
    owner: v.id("users"),
    other: v.id("users"),
    status: v.union(
      v.literal("pending_out"), // owner sent, awaiting `other`
      v.literal("pending_in"), // `other` sent, owner must respond
      v.literal("accepted"),
      v.literal("declined"), // owner's request was declined by `other`
    ),
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_owner", ["owner"])
    .index("by_owner_status", ["owner", "status"])
    .index("by_pair", ["owner", "other"]),

  // "Send a recipe to a friend" — the only message type. Recipe snapshotted
  // in full like favoriteRecipes.
  recipeShares: defineTable({
    fromUser: v.id("users"),
    toUser: v.id("users"),
    recipe: v.object({ id: v.string(), ...recipeFields }),
    note: v.optional(v.string()),
    createdAt: v.number(),
    seenAt: v.optional(v.number()),
    savedAt: v.optional(v.number()),
  })
    .index("by_toUser_created", ["toUser", "createdAt"])
    .index("by_fromUser", ["fromUser"]),

  // Friend-feed source, append-only. Carries a full recipe snapshot so the
  // feed can render and open it without access to the actor's private tables.
  activityEvents: defineTable({
    userId: v.id("users"), // actor
    type: v.union(v.literal("created_recipe"), v.literal("shared_recipe")),
    recipe: v.optional(v.object({ id: v.string(), ...recipeFields })),
    createdAt: v.number(),
  }).index("by_user_created", ["userId", "createdAt"]),

  blocks: defineTable({
    blocker: v.id("users"),
    blocked: v.id("users"),
    createdAt: v.number(),
  })
    .index("by_blocker", ["blocker"])
    .index("by_pair", ["blocker", "blocked"]),

  // Inbox notifications that aren't recipe shares (friend-request accepted,
  // admin broadcasts, …). Recipe shares live in recipeShares and are merged
  // into the inbox at query time.
  notifications: defineTable({
    userId: v.id("users"), // recipient
    type: v.union(
      v.literal("friend_accepted"),
      v.literal("info"),
      v.literal("recipe_favorited"),
      v.literal("recipe_cooked"),
    ),
    actorId: v.optional(v.id("users")),
    actorName: v.optional(v.string()),
    actorInitials: v.optional(v.string()),
    recipeName: v.optional(v.string()),
    message: v.optional(v.string()),
    createdAt: v.number(),
    seenAt: v.optional(v.number()),
  }).index("by_user_created", ["userId", "createdAt"]),

  // Messages from users to the admin account: feedback, bug reports, user
  // reports ("report_user" carries the reported user + email), other.
  adminMessages: defineTable({
    fromUser: v.id("users"),
    fromUsername: v.optional(v.string()),
    fromEmail: v.optional(v.string()),
    category: v.union(
      v.literal("feedback"),
      v.literal("bug"),
      v.literal("report_user"),
      v.literal("other"),
    ),
    message: v.string(),
    reportedUserId: v.optional(v.id("users")),
    reportedUsername: v.optional(v.string()),
    reportedEmail: v.optional(v.string()),
    createdAt: v.number(),
    // "new" | "seen" | "in_progress" | "done" (missing = "new")
    status: v.optional(v.string()),
    resolvedAt: v.optional(v.number()),
  }).index("by_created", ["createdAt"]),

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
