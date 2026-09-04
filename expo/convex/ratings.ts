import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";
import { mutation, query, type MutationCtx, type QueryCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";
import { rateLimiter } from "./rateLimits";

const RECIPE_NAME_MAX = 120;
const RECIPE_IMAGE_MAX = 500;
const RATING_NOTIFY_CAP = 300;

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new ConvexError("Not authenticated");
  return userId;
}

const COMMENT_MAX = 300;
const RECOMMEND_MIN = 4; // ratings >= this notify friends + hit the feed
const FEED_DEDUPE_MS = 6 * 60 * 60 * 1000;

function initialsOf(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function miniProfile(user: Doc<"users"> | null, id: Id<"users">) {
  const username = user?.username ?? "";
  const displayName = user?.displayName ?? username ?? "";
  return {
    id,
    username,
    displayName,
    initials: initialsOf(displayName || username || "?"),
    avatarColor: user?.avatarColor ?? null,
    avatarEmoji: user?.avatarEmoji ?? null,
  };
}

function clampRating(n: number) {
  return Math.max(1, Math.min(5, Math.round(n)));
}

// ---- rate ----

export const rate = mutation({
  args: {
    recipeId: v.string(),
    rating: v.number(),
    comment: v.optional(v.string()),
    recipeName: v.string(),
    recipeImage: v.optional(v.string()),
  },
  handler: async (ctx, { recipeId, rating: rawRating, comment, recipeName: rawName, recipeImage: rawImage }) => {
    const me = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "rateRecipe", { key: me, throws: true });
    const rating = clampRating(rawRating);
    const trimmedComment = comment ? comment.trim().slice(0, COMMENT_MAX) : undefined;
    const recipeName = String(rawName).trim().slice(0, RECIPE_NAME_MAX) || "Recipe";
    const recipeImage =
      typeof rawImage === "string" && /^https?:\/\//.test(rawImage)
        ? rawImage.slice(0, RECIPE_IMAGE_MAX)
        : undefined;

    // Must have cooked it.
    const cooked = await ctx.db
      .query("cookedRecipes")
      .withIndex("by_user_and_recipe", (q) => q.eq("userId", me).eq("recipeId", recipeId))
      .unique();
    if (!cooked) throw new ConvexError("NOT_COOKED");

    // Owner (custom recipes only).
    const customId = ctx.db.normalizeId("customRecipes", recipeId);
    const ownerDoc = customId ? await ctx.db.get(customId) : null;
    const ownerId = ownerDoc?.userId;

    const now = Date.now();
    const existing = await ctx.db
      .query("recipeRatings")
      .withIndex("by_user_and_recipe", (q) => q.eq("userId", me).eq("recipeId", recipeId))
      .unique();
    const oldRating = existing?.rating ?? null;

    if (existing) {
      await ctx.db.patch(existing._id, {
        rating,
        comment: trimmedComment,
        recipeName,
        recipeImage,
        ownerId,
        updatedAt: now,
      });
    } else {
      await ctx.db.insert("recipeRatings", {
        userId: me,
        recipeId,
        ownerId,
        rating,
        comment: trimmedComment,
        recipeName,
        recipeImage,
        createdAt: now,
        updatedAt: now,
      });
    }

    // Aggregate cache.
    const stats = await ctx.db
      .query("recipeRatingStats")
      .withIndex("by_recipe", (q) => q.eq("recipeId", recipeId))
      .unique();
    if (stats) {
      await ctx.db.patch(stats._id, {
        sum: stats.sum + rating - (oldRating ?? 0),
        count: stats.count + (oldRating === null ? 1 : 0),
      });
    } else {
      await ctx.db.insert("recipeRatingStats", { recipeId, sum: rating, count: 1 });
    }

    // ---- notifications ----
    const meDoc = await ctx.db.get(me);
    const meName = meDoc?.displayName || meDoc?.username || "?";
    const notified = new Set<string>();

    const notify = async (uid: Id<"users">) => {
      if (uid === me || notified.has(uid)) return;
      notified.add(uid);
      await ctx.db.insert("notifications", {
        userId: uid,
        type: "recipe_rated",
        actorId: me,
        actorName: meName,
        actorInitials: initialsOf(meName),
        recipeName,
        rating,
        message: trimmedComment,
        createdAt: now,
      });
    };

    // Recommendation (>= 4): tell every accepted friend.
    if (rating >= RECOMMEND_MIN) {
      const friendRows = await ctx.db
        .query("friendships")
        .withIndex("by_owner_status", (q) => q.eq("owner", me).eq("status", "accepted"))
        .take(RATING_NOTIFY_CAP);
      for (const row of friendRows) await notify(row.other);
    }
    // Creator always hears about a rating of their own recipe.
    if (ownerId) await notify(ownerId);

    // ---- feed (recommendations only) ----
    if (rating >= RECOMMEND_MIN && (!ownerDoc || ownerDoc.visibility !== "private")) {
      const recent = await ctx.db
        .query("activityEvents")
        .withIndex("by_user_created", (q) => q.eq("userId", me))
        .order("desc")
        .take(20);
      const dupe = recent.some(
        (e) =>
          e.type === "rated_recipe" &&
          e.recipe?.id === recipeId &&
          now - e.createdAt < FEED_DEDUPE_MS,
      );
      if (!dupe) {
        const snapshot = ownerDoc
          ? await stripRecipeDoc(ctx, ownerDoc)
          : {
              id: recipeId,
              name: recipeName,
              image: recipeImage ?? "",
              rating,
              cookTime: "",
              servings: 1,
              category: "",
              ingredients: [],
              steps: [],
            };
        await ctx.db.insert("activityEvents", {
          userId: me,
          type: "rated_recipe",
          recipe: snapshot,
          rating,
          createdAt: now,
        });
      }
    }
  },
});

async function stripRecipeDoc(ctx: MutationCtx, doc: Doc<"customRecipes">) {
  const { _id, _creationTime, userId, isFavorite, ...rest } = doc;
  const image = doc.imageStorageId
    ? (await ctx.storage.getUrl(doc.imageStorageId)) ?? rest.image
    : rest.image;
  return { id: _id, ...rest, image };
}

// ---- reads ----

export const myRating = query({
  args: { recipeId: v.string() },
  handler: async (ctx, { recipeId }) => {
    const me = await getAuthUserId(ctx);
    if (!me) return null;
    const row = await ctx.db
      .query("recipeRatings")
      .withIndex("by_user_and_recipe", (q) => q.eq("userId", me).eq("recipeId", recipeId))
      .unique();
    return row ? { rating: row.rating, comment: row.comment ?? "" } : null;
  },
});

export const myRatings = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("recipeRatings")
      .withIndex("by_user_and_recipe", (q) => q.eq("userId", me))
      .collect();
    return rows.map((r) => ({ recipeId: r.recipeId, rating: r.rating }));
  },
});

export const ratingStats = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return [];
    // Small table (one row per rated recipe). If it ever grows large, switch
    // callers to a batched ratingStatsFor({ recipeIds }).
    const rows = await ctx.db.query("recipeRatingStats").take(5000);
    return rows.map((r) => ({
      recipeId: r.recipeId,
      avg: r.count > 0 ? r.sum / r.count : 0,
      count: r.count,
    }));
  },
});

export const friendRatings = query({
  args: { recipeId: v.string() },
  handler: async (ctx, { recipeId }) => {
    const me = await getAuthUserId(ctx);
    if (!me) return { items: [], avg: 0, count: 0 };

    const friendRows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", me).eq("status", "accepted"))
      .collect();
    const ids: Id<"users">[] = [me, ...friendRows.map((r) => r.other)];

    const items: {
      profile: ReturnType<typeof miniProfile>;
      rating: number;
      comment: string;
      createdAt: number;
      isMe: boolean;
    }[] = [];
    for (const uid of ids) {
      const row = await ctx.db
        .query("recipeRatings")
        .withIndex("by_user_and_recipe", (q) => q.eq("userId", uid).eq("recipeId", recipeId))
        .unique();
      if (!row) continue;
      items.push({
        profile: miniProfile(await ctx.db.get(uid), uid),
        rating: row.rating,
        comment: row.comment ?? "",
        createdAt: row.createdAt,
        isMe: uid === me,
      });
    }
    items.sort((a, b) => b.createdAt - a.createdAt);
    const count = items.length;
    const avg = count > 0 ? items.reduce((s, i) => s + i.rating, 0) / count : 0;
    return { items, avg, count };
  },
});

// Aggregate over every rating left on recipes CREATED by `userId`.
export async function ratingSummaryFor(ctx: QueryCtx, ownerId: Id<"users">) {
  const rows = await ctx.db
    .query("recipeRatings")
    .withIndex("by_owner", (q) => q.eq("ownerId", ownerId))
    .collect();
  const ratingCount = rows.length;
  const avg = ratingCount > 0 ? rows.reduce((s, r) => s + r.rating, 0) / ratingCount : 0;
  const distinctRaters = new Set(rows.map((r) => r.userId as string)).size;
  return { avg, ratingCount, distinctRaters };
}

export const ratingSummary = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    await requireUserId(ctx);
    return ratingSummaryFor(ctx, userId);
  },
});
