import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

const NOTE_MAX = 500;
const DISPLAY_NAME_MAX = 40;
const BIO_MAX = 200;
const FEED_LIMIT = 50;
const PER_FRIEND = 20;

const ingredientValidator = v.object({
  id: v.string(),
  name: v.string(),
  amount: v.string(),
  category: v.string(),
});

// Mirrors schema.ts's `{ id, ...recipeFields }`.
const shareRecipeValidator = v.object({
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

// ---- helpers ----

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
  };
}

async function pairRow(ctx: QueryCtx | MutationCtx, owner: Id<"users">, other: Id<"users">) {
  return ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("owner", owner).eq("other", other))
    .unique();
}

async function isBlockedEitherWay(ctx: QueryCtx | MutationCtx, a: Id<"users">, b: Id<"users">) {
  const ab = await ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blocker", a).eq("blocked", b))
    .unique();
  if (ab) return true;
  const ba = await ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blocker", b).eq("blocked", a))
    .unique();
  return !!ba;
}

type FriendState = "none" | "pending_out" | "pending_in" | "accepted" | "blocked";

async function friendState(
  ctx: QueryCtx | MutationCtx,
  me: Id<"users">,
  other: Id<"users">,
): Promise<FriendState> {
  if (await isBlockedEitherWay(ctx, me, other)) return "blocked";
  const row = await pairRow(ctx, me, other);
  return (row?.status as FriendState) ?? "none";
}

// Resolve an exact username OR email to a user id. Returns null if nothing
// matches. Does not apply discoverability/block rules — callers do that.
async function resolveUser(ctx: QueryCtx | MutationCtx, rawQuery: string): Promise<Doc<"users"> | null> {
  const q = rawQuery.trim().toLowerCase();
  if (!q) return null;

  const byUsername = await ctx.db
    .query("users")
    .withIndex("username", (idx) => idx.eq("username", q))
    .first();
  if (byUsername) return byUsername;

  const byEmail = await ctx.db
    .query("users")
    .withIndex("email", (idx) => idx.eq("email", q))
    .first();
  if (byEmail) return byEmail;

  // Fallback for emails stored with different casing.
  if (q.includes("@")) {
    const all = await ctx.db.query("users").collect();
    return all.find((u) => (u.email ?? "").trim().toLowerCase() === q) ?? null;
  }
  return null;
}

// ---- profile ----

export const myProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    const user = await ctx.db.get(userId);
    if (!user) return null;
    return {
      id: userId,
      username: user.username ?? "",
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      discoverable: user.discoverable !== false,
      feedVisibility: user.feedVisibility ?? "friends",
      initials: initialsOf(user.displayName || user.username || "?"),
    };
  },
});

export const setSocialProfile = mutation({
  args: {
    displayName: v.optional(v.string()),
    bio: v.optional(v.string()),
    discoverable: v.optional(v.boolean()),
    feedVisibility: v.optional(v.union(v.literal("friends"), v.literal("private"))),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const patch: Partial<Doc<"users">> = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName.trim().slice(0, DISPLAY_NAME_MAX);
    if (args.bio !== undefined) patch.bio = args.bio.trim().slice(0, BIO_MAX);
    if (args.discoverable !== undefined) patch.discoverable = args.discoverable;
    if (args.feedVisibility !== undefined) patch.feedVisibility = args.feedVisibility;
    await ctx.db.patch(userId, patch);
  },
});

// ---- friends ----

export const friends = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    const rows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", userId).eq("status", "accepted"))
      .collect();
    const out = [];
    for (const row of rows) {
      out.push(miniProfile(await ctx.db.get(row.other), row.other));
    }
    out.sort((a, b) => a.displayName.localeCompare(b.displayName));
    return out;
  },
});

export const friendRequests = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return { incoming: [], outgoing: [] };

    const incomingRows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", userId).eq("status", "pending_in"))
      .collect();
    const outgoingRows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", userId).eq("status", "pending_out"))
      .collect();

    const incoming = [];
    for (const row of incomingRows) incoming.push(miniProfile(await ctx.db.get(row.other), row.other));
    const outgoing = [];
    for (const row of outgoingRows) outgoing.push(miniProfile(await ctx.db.get(row.other), row.other));
    return { incoming, outgoing };
  },
});

export const findUser = query({
  args: { query: v.string() },
  handler: async (ctx, { query: q }) => {
    const me = await requireUserId(ctx);
    const found = await resolveUser(ctx, q);
    if (!found) return { reason: "not_found" as const };
    if (found._id === me) return { reason: "self" as const };
    if (await isBlockedEitherWay(ctx, me, found._id)) return { reason: "blocked" as const };
    if (found.discoverable === false) return { reason: "not_found" as const };
    return {
      user: miniProfile(found, found._id),
      status: await friendState(ctx, me, found._id),
    };
  },
});

export const sendFriendRequest = mutation({
  args: { query: v.string() },
  handler: async (ctx, { query: q }) => {
    const me = await requireUserId(ctx);
    const found = await resolveUser(ctx, q);
    if (!found) throw new Error("USER_NOT_FOUND");
    if (found._id === me) throw new Error("CANNOT_ADD_SELF");
    if (found.discoverable === false) throw new Error("USER_NOT_FOUND");
    if (await isBlockedEitherWay(ctx, me, found._id)) throw new Error("BLOCKED");

    const other = found._id;
    const now = Date.now();
    const mineRow = await pairRow(ctx, me, other);
    const theirsRow = await pairRow(ctx, other, me);

    if (mineRow?.status === "accepted") throw new Error("ALREADY_FRIENDS");
    if (mineRow?.status === "pending_out") return { status: "pending_out" };

    // They already asked me — accept instead of creating a duplicate.
    if (mineRow?.status === "pending_in") {
      await ctx.db.patch(mineRow._id, { status: "accepted", updatedAt: now });
      if (theirsRow) await ctx.db.patch(theirsRow._id, { status: "accepted", updatedAt: now });
      return { status: "accepted" };
    }

    await ctx.db.insert("friendships", {
      owner: me,
      other,
      status: "pending_out",
      createdAt: now,
      updatedAt: now,
    });
    await ctx.db.insert("friendships", {
      owner: other,
      other: me,
      status: "pending_in",
      createdAt: now,
      updatedAt: now,
    });
    return { status: "pending_out" };
  },
});

export const respondFriendRequest = mutation({
  args: { userId: v.id("users"), accept: v.boolean() },
  handler: async (ctx, { userId: other, accept }) => {
    const me = await requireUserId(ctx);
    const mineRow = await pairRow(ctx, me, other);
    if (!mineRow || mineRow.status !== "pending_in") throw new Error("NO_PENDING_REQUEST");
    const theirsRow = await pairRow(ctx, other, me);
    const now = Date.now();

    if (accept) {
      await ctx.db.patch(mineRow._id, { status: "accepted", updatedAt: now });
      if (theirsRow) await ctx.db.patch(theirsRow._id, { status: "accepted", updatedAt: now });
    } else {
      await ctx.db.delete(mineRow._id);
      if (theirsRow) await ctx.db.delete(theirsRow._id);
    }
  },
});

// Covers "withdraw outgoing request" and "unfriend".
export const removeFriend = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId: other }) => {
    const me = await requireUserId(ctx);
    const mineRow = await pairRow(ctx, me, other);
    const theirsRow = await pairRow(ctx, other, me);
    if (mineRow) await ctx.db.delete(mineRow._id);
    if (theirsRow) await ctx.db.delete(theirsRow._id);
  },
});

export const block = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId: other }) => {
    const me = await requireUserId(ctx);
    if (other === me) throw new Error("CANNOT_BLOCK_SELF");
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) => q.eq("blocker", me).eq("blocked", other))
      .unique();
    if (!existing) {
      await ctx.db.insert("blocks", { blocker: me, blocked: other, createdAt: Date.now() });
    }
    const mineRow = await pairRow(ctx, me, other);
    const theirsRow = await pairRow(ctx, other, me);
    if (mineRow) await ctx.db.delete(mineRow._id);
    if (theirsRow) await ctx.db.delete(theirsRow._id);
  },
});

export const unblock = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId: other }) => {
    const me = await requireUserId(ctx);
    const existing = await ctx.db
      .query("blocks")
      .withIndex("by_pair", (q) => q.eq("blocker", me).eq("blocked", other))
      .unique();
    if (existing) await ctx.db.delete(existing._id);
  },
});

export const report = mutation({
  args: {
    targetUserId: v.id("users"),
    context: v.string(),
    refId: v.optional(v.string()),
    reason: v.string(),
  },
  handler: async (ctx, { targetUserId, context, refId, reason }) => {
    const me = await requireUserId(ctx);
    await ctx.db.insert("reports", {
      reporter: me,
      targetUser: targetUserId,
      context,
      refId,
      reason: reason.slice(0, 1000),
      createdAt: Date.now(),
    });
  },
});

// ---- recipe sharing ----

export const shareRecipe = mutation({
  args: { toUserId: v.id("users"), recipe: shareRecipeValidator, note: v.optional(v.string()) },
  handler: async (ctx, { toUserId, recipe, note }) => {
    const me = await requireUserId(ctx);
    if (toUserId === me) throw new Error("CANNOT_SHARE_WITH_SELF");
    if ((await friendState(ctx, me, toUserId)) !== "accepted") throw new Error("NOT_FRIENDS");

    const now = Date.now();
    await ctx.db.insert("recipeShares", {
      fromUser: me,
      toUser: toUserId,
      recipe,
      note: note ? note.trim().slice(0, NOTE_MAX) : undefined,
      createdAt: now,
    });

    const meDoc = await ctx.db.get(me);
    if (meDoc?.feedVisibility !== "private") {
      await ctx.db.insert("activityEvents", {
        userId: me,
        type: "shared_recipe",
        recipe,
        createdAt: now,
      });
    }
  },
});

export const shareInbox = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return [];
    const rows = await ctx.db
      .query("recipeShares")
      .withIndex("by_toUser_created", (q) => q.eq("toUser", me))
      .order("desc")
      .take(FEED_LIMIT);
    const out = [];
    for (const row of rows) {
      out.push({
        id: row._id,
        recipe: row.recipe,
        note: row.note ?? "",
        createdAt: row.createdAt,
        seen: row.seenAt !== undefined,
        saved: row.savedAt !== undefined,
        from: miniProfile(await ctx.db.get(row.fromUser), row.fromUser),
      });
    }
    return out;
  },
});

export const markAllSharesSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUserId(ctx);
    const rows = await ctx.db
      .query("recipeShares")
      .withIndex("by_toUser_created", (q) => q.eq("toUser", me))
      .take(FEED_LIMIT);
    const now = Date.now();
    for (const row of rows) {
      if (row.seenAt === undefined) await ctx.db.patch(row._id, { seenAt: now });
    }
  },
});

export const saveSharedRecipe = mutation({
  args: { id: v.id("recipeShares") },
  handler: async (ctx, { id }) => {
    const me = await requireUserId(ctx);
    const share = await ctx.db.get(id);
    if (!share || share.toUser !== me) throw new Error("SHARE_NOT_FOUND");

    const existing = await ctx.db
      .query("favoriteRecipes")
      .withIndex("by_user_and_recipe", (q) =>
        q.eq("userId", me).eq("recipeId", share.recipe.id),
      )
      .unique();
    if (!existing) {
      await ctx.db.insert("favoriteRecipes", {
        userId: me,
        recipeId: share.recipe.id,
        recipe: share.recipe,
      });
    }
    await ctx.db.patch(id, { savedAt: Date.now() });
  },
});

// ---- feed ----

export const feed = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return [];

    const friendRows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", me).eq("status", "accepted"))
      .collect();

    const profileCache = new Map<string, ReturnType<typeof miniProfile>>();
    const events = [];

    for (const row of friendRows) {
      const evs = await ctx.db
        .query("activityEvents")
        .withIndex("by_user_created", (q) => q.eq("userId", row.other))
        .order("desc")
        .take(PER_FRIEND);
      if (evs.length === 0) continue;
      let actor = profileCache.get(row.other);
      if (!actor) {
        actor = miniProfile(await ctx.db.get(row.other), row.other);
        profileCache.set(row.other, actor);
      }
      for (const e of evs) {
        events.push({
          id: e._id,
          type: e.type,
          recipe: e.recipe ?? null,
          createdAt: e.createdAt,
          actor,
        });
      }
    }

    events.sort((a, b) => b.createdAt - a.createdAt);
    return events.slice(0, FEED_LIMIT);
  },
});

export const badgeCount = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return 0;
    const incoming = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", me).eq("status", "pending_in"))
      .collect();
    const shares = await ctx.db
      .query("recipeShares")
      .withIndex("by_toUser_created", (q) => q.eq("toUser", me))
      .take(FEED_LIMIT);
    const unseen = shares.filter((s) => s.seenAt === undefined).length;
    return incoming.length + unseen;
  },
});

export const userPublic = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId: other }) => {
    const me = await requireUserId(ctx);
    const doc = await ctx.db.get(other);
    if (!doc) return null;
    const status = await friendState(ctx, me, other);
    const base = {
      ...miniProfile(doc, other),
      bio: doc.bio ?? "",
      status,
      isSelf: other === me,
    };
    if (status !== "accepted" && other !== me) {
      return { ...base, recipes: [] as Doc<"customRecipes">[] };
    }
    const recipes = await ctx.db
      .query("customRecipes")
      .withIndex("by_user", (q) => q.eq("userId", other))
      .collect();
    return { ...base, recipes };
  },
});
