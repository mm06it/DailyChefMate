import { createAccount, getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { internal } from "./_generated/api";
import {
  internalAction,
  internalMutation,
  mutation,
  query,
  type MutationCtx,
  type QueryCtx,
} from "./_generated/server";
import { Doc, Id } from "./_generated/dataModel";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

const NOTE_MAX = 500;
const DISPLAY_NAME_MAX = 40;
const BIO_MAX = 200;
const MSG_MAX = 2000;
const FEED_LIMIT = 50;
const PER_FRIEND = 20;
const COUNT_CAP = 99;

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
    isAdmin: user?.isAdmin === true,
  };
}

function adminEmail(): string | null {
  const e = process.env.ADMIN_EMAIL;
  return e ? e.trim().toLowerCase() : null;
}

async function getAdminUser(ctx: QueryCtx | MutationCtx): Promise<Doc<"users"> | null> {
  const email = adminEmail();
  if (!email) return null;
  const byEmail = await ctx.db
    .query("users")
    .withIndex("email", (q) => q.eq("email", email))
    .first();
  if (byEmail) return byEmail;
  const all = await ctx.db.query("users").collect();
  return all.find((u) => (u.email ?? "").trim().toLowerCase() === email || u.isAdmin === true) ?? null;
}

async function pairRow(ctx: QueryCtx | MutationCtx, owner: Id<"users">, other: Id<"users">) {
  return ctx.db
    .query("friendships")
    .withIndex("by_pair", (q) => q.eq("owner", owner).eq("other", other))
    .unique();
}

async function blockState(ctx: QueryCtx | MutationCtx, me: Id<"users">, other: Id<"users">) {
  const iBlockedRow = await ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blocker", me).eq("blocked", other))
    .unique();
  const blockedByThemRow = await ctx.db
    .query("blocks")
    .withIndex("by_pair", (q) => q.eq("blocker", other).eq("blocked", me))
    .unique();
  return { iBlocked: !!iBlockedRow, blockedByThem: !!blockedByThemRow };
}

type FriendState = "none" | "pending_out" | "pending_in" | "accepted" | "blocked";

async function friendState(
  ctx: QueryCtx | MutationCtx,
  me: Id<"users">,
  other: Id<"users">,
): Promise<FriendState> {
  const { iBlocked, blockedByThem } = await blockState(ctx, me, other);
  if (iBlocked || blockedByThem) return "blocked";
  const admin = await getAdminUser(ctx);
  if (admin && (admin._id === other || admin._id === me)) return "accepted"; // everyone is friends with admin
  const row = await pairRow(ctx, me, other);
  return (row?.status as FriendState) ?? "none";
}

// Resolve an exact username OR email to a user. Does not apply
// discoverability/block rules — callers do that.
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
    const admin = await getAdminUser(ctx);
    return {
      id: userId,
      username: user.username ?? "",
      displayName: user.displayName ?? "",
      bio: user.bio ?? "",
      discoverable: user.discoverable !== false,
      feedVisibility: user.feedVisibility ?? "friends",
      initials: initialsOf(user.displayName || user.username || "?"),
      isAdmin: admin?._id === userId,
      adminId: admin && admin._id !== userId ? admin._id : null,
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
    const admin = await getAdminUser(ctx);
    const rows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", userId).eq("status", "accepted"))
      .collect();
    const out = [];
    for (const row of rows) {
      if (admin && row.other === admin._id) continue; // hide admin from the list
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
    const { iBlocked, blockedByThem } = await blockState(ctx, me, found._id);
    if (blockedByThem) return { reason: "not_found" as const };
    if (iBlocked) {
      return { user: miniProfile(found, found._id), status: "blocked" as const };
    }
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

    const { iBlocked, blockedByThem } = await blockState(ctx, me, found._id);
    if (iBlocked || blockedByThem) throw new Error("BLOCKED");

    const admin = await getAdminUser(ctx);
    if (admin && found._id === admin._id) return { status: "accepted" as const };

    const other = found._id;
    const now = Date.now();
    const mineRow = await pairRow(ctx, me, other);
    const theirsRow = await pairRow(ctx, other, me);

    if (mineRow?.status === "accepted") throw new Error("ALREADY_FRIENDS");
    if (mineRow?.status === "pending_out") return { status: "pending_out" as const };

    if (mineRow?.status === "pending_in") {
      await ctx.db.patch(mineRow._id, { status: "accepted", updatedAt: now });
      if (theirsRow) await ctx.db.patch(theirsRow._id, { status: "accepted", updatedAt: now });
      await notifyFriendAccepted(ctx, me, other);
      return { status: "accepted" as const };
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
    return { status: "pending_out" as const };
  },
});

async function notifyFriendAccepted(ctx: MutationCtx, accepterId: Id<"users">, requesterId: Id<"users">) {
  const accepter = await ctx.db.get(accepterId);
  const name = accepter?.displayName || accepter?.username || "?";
  await ctx.db.insert("notifications", {
    userId: requesterId,
    type: "friend_accepted",
    actorId: accepterId,
    actorName: name,
    actorInitials: initialsOf(name),
    createdAt: Date.now(),
  });
}

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
      await notifyFriendAccepted(ctx, me, other);
    } else {
      await ctx.db.delete(mineRow._id);
      if (theirsRow) await ctx.db.delete(theirsRow._id);
    }
  },
});

// Covers "withdraw outgoing request" and "unfriend" (client confirms first).
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
    const admin = await getAdminUser(ctx);
    if (admin && other === admin._id) throw new Error("CANNOT_BLOCK_ADMIN");

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

// ---- admin messages ----

export const sendAdminMessage = mutation({
  args: {
    category: v.union(
      v.literal("feedback"),
      v.literal("bug"),
      v.literal("report_user"),
      v.literal("other"),
    ),
    message: v.string(),
    reportedUserId: v.optional(v.id("users")),
    reportedQuery: v.optional(v.string()), // username/email typed on the admin form
  },
  handler: async (ctx, { category, message, reportedUserId, reportedQuery }) => {
    const me = await requireUserId(ctx);
    const admin = await getAdminUser(ctx);
    if (!admin) throw new Error("ADMIN_NOT_CONFIGURED");

    const meDoc = await ctx.db.get(me);

    let reportedId = reportedUserId ?? null;
    if (!reportedId && reportedQuery) {
      const found = await resolveUser(ctx, reportedQuery);
      reportedId = found?._id ?? null;
    }
    let reportedUsername: string | undefined;
    let reportedEmail: string | undefined;
    if (reportedId) {
      const rDoc = await ctx.db.get(reportedId);
      reportedUsername = rDoc?.username;
      reportedEmail = rDoc?.email;
    }

    await ctx.db.insert("adminMessages", {
      fromUser: me,
      fromUsername: meDoc?.username,
      fromEmail: meDoc?.email,
      category,
      message: message.trim().slice(0, MSG_MAX),
      reportedUserId: reportedId ?? undefined,
      reportedUsername,
      reportedEmail,
      createdAt: Date.now(),
    });
  },
});

export const adminInbox = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return null;
    const admin = await getAdminUser(ctx);
    if (!admin || admin._id !== me) return null;
    const rows = await ctx.db
      .query("adminMessages")
      .withIndex("by_created")
      .order("desc")
      .take(100);
    return rows.map((r) => ({
      id: r._id,
      category: r.category,
      message: r.message,
      from: { username: r.fromUsername ?? "", email: r.fromEmail ?? "" },
      reported:
        r.reportedUserId != null
          ? { username: r.reportedUsername ?? "", email: r.reportedEmail ?? "" }
          : null,
      createdAt: r.createdAt,
      resolved: r.resolvedAt !== undefined,
    }));
  },
});

export const resolveAdminMessage = mutation({
  args: { id: v.id("adminMessages") },
  handler: async (ctx, { id }) => {
    const me = await requireUserId(ctx);
    const admin = await getAdminUser(ctx);
    if (!admin || admin._id !== me) throw new Error("NOT_ADMIN");
    await ctx.db.patch(id, { resolvedAt: Date.now() });
  },
});

export const broadcastInfo = mutation({
  args: { message: v.string() },
  handler: async (ctx, { message }) => {
    const me = await requireUserId(ctx);
    const admin = await getAdminUser(ctx);
    if (!admin || admin._id !== me) throw new Error("NOT_ADMIN");
    const users = await ctx.db.query("users").collect();
    const now = Date.now();
    for (const u of users) {
      if (u._id === me) continue;
      await ctx.db.insert("notifications", {
        userId: u._id,
        type: "info",
        message: message.trim().slice(0, MSG_MAX),
        createdAt: now,
      });
    }
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

// ---- inbox (shares + notifications, merged) ----

export const inbox = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return [];

    const shares = await ctx.db
      .query("recipeShares")
      .withIndex("by_toUser_created", (q) => q.eq("toUser", me))
      .order("desc")
      .take(FEED_LIMIT);
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", me))
      .order("desc")
      .take(FEED_LIMIT);

    const items: {
      id: string;
      kind: "recipe_share" | "friend_accepted" | "info";
      createdAt: number;
      seen: boolean;
      from: ReturnType<typeof miniProfile> | null;
      recipe?: Doc<"recipeShares">["recipe"];
      note?: string;
      saved?: boolean;
      message?: string;
    }[] = [];

    for (const s of shares) {
      items.push({
        id: s._id,
        kind: "recipe_share",
        createdAt: s.createdAt,
        seen: s.seenAt !== undefined,
        from: miniProfile(await ctx.db.get(s.fromUser), s.fromUser),
        recipe: s.recipe,
        note: s.note ?? "",
        saved: s.savedAt !== undefined,
      });
    }
    for (const n of notifs) {
      items.push({
        id: n._id,
        kind: n.type,
        createdAt: n.createdAt,
        seen: n.seenAt !== undefined,
        from: n.actorId
          ? { id: n.actorId, username: "", displayName: n.actorName ?? "", initials: n.actorInitials ?? "?", isAdmin: false }
          : null,
        message: n.message ?? "",
      });
    }

    items.sort((a, b) => b.createdAt - a.createdAt);
    return items.slice(0, FEED_LIMIT);
  },
});

export const markInboxSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUserId(ctx);
    const now = Date.now();
    const shares = await ctx.db
      .query("recipeShares")
      .withIndex("by_toUser_created", (q) => q.eq("toUser", me))
      .take(FEED_LIMIT);
    for (const s of shares) if (s.seenAt === undefined) await ctx.db.patch(s._id, { seenAt: now });
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", me))
      .take(FEED_LIMIT);
    for (const n of notifs) if (n.seenAt === undefined) await ctx.db.patch(n._id, { seenAt: now });
  },
});

export const markFeedSeen = mutation({
  args: {},
  handler: async (ctx) => {
    const me = await requireUserId(ctx);
    await ctx.db.patch(me, { feedSeenAt: Date.now() });
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

// ---- counts (per social sub-tab) ----

export const socialCounts = query({
  args: {},
  handler: async (ctx) => {
    const me = await getAuthUserId(ctx);
    if (!me) return { feed: 0, friends: 0, inbox: 0 };
    const meDoc = await ctx.db.get(me);
    const feedSeenAt = meDoc?.feedSeenAt ?? 0;

    const friendRows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", me).eq("status", "accepted"))
      .collect();

    let feedCount = 0;
    for (const row of friendRows) {
      if (feedCount >= COUNT_CAP) break;
      const evs = await ctx.db
        .query("activityEvents")
        .withIndex("by_user_created", (q) => q.eq("userId", row.other).gt("createdAt", feedSeenAt))
        .take(PER_FRIEND);
      feedCount += evs.length;
    }

    const incoming = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", me).eq("status", "pending_in"))
      .collect();

    const shares = await ctx.db
      .query("recipeShares")
      .withIndex("by_toUser_created", (q) => q.eq("toUser", me))
      .take(FEED_LIMIT);
    const notifs = await ctx.db
      .query("notifications")
      .withIndex("by_user_created", (q) => q.eq("userId", me))
      .take(FEED_LIMIT);
    const inboxCount =
      shares.filter((s) => s.seenAt === undefined).length +
      notifs.filter((n) => n.seenAt === undefined).length;

    return {
      feed: Math.min(feedCount, COUNT_CAP),
      friends: incoming.length,
      inbox: inboxCount,
    };
  },
});

// ---- public profile + stats ----

function customToRecipe(doc: Doc<"customRecipes">) {
  const { _id, _creationTime, userId, ...rest } = doc;
  return { id: _id, ...rest };
}

export const userPublic = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId: other }) => {
    const me = await requireUserId(ctx);
    const doc = await ctx.db.get(other);
    if (!doc) return null;

    const admin = await getAdminUser(ctx);
    const isAdminProfile = admin?._id === other;
    const isSelf = other === me;
    const { iBlocked, blockedByThem } = await blockState(ctx, me, other);
    const status: FriendState = iBlocked || blockedByThem ? "blocked" : await friendState(ctx, me, other);
    const canSeeRecipes = isSelf || isAdminProfile === false && status === "accepted";

    // stats
    const customRecipes = await ctx.db
      .query("customRecipes")
      .withIndex("by_user", (q) => q.eq("userId", other))
      .collect();
    const favRows = await ctx.db
      .query("favoriteRecipes")
      .withIndex("by_user", (q) => q.eq("userId", other))
      .collect();
    const cookedRows = await ctx.db
      .query("cookedRecipes")
      .withIndex("by_user", (q) => q.eq("userId", other))
      .collect();
    const friendRows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", other).eq("status", "accepted"))
      .collect();

    const customFavs = customRecipes.filter((r) => r.isFavorite);
    const favoritesCount = favRows.length + customFavs.length;
    const cookedCount = cookedRows.reduce((sum, r) => sum + r.count, 0);
    const friendsCount = friendRows.filter((r) => !admin || r.other !== admin._id).length;

    const base = {
      ...miniProfile(doc, other),
      bio: doc.bio ?? "",
      status,
      isSelf,
      isAdmin: isAdminProfile,
      iBlocked,
      blockedByThem,
      memberSince: doc._creationTime,
      stats: {
        favoritesCount,
        createdCount: customRecipes.length,
        cookedCount,
        friendsCount,
      },
    };

    if (!canSeeRecipes) {
      return { ...base, recipes: [] as any[], favorites: [] as any[] };
    }
    return {
      ...base,
      recipes: customRecipes.map(customToRecipe),
      favorites: [
        ...favRows.map((r) => r.recipe),
        ...customFavs.map(customToRecipe),
      ],
    };
  },
});

// ---- admin seed ----
// Run once per deployment after setting env vars ADMIN_EMAIL and ADMIN_PASSWORD:
//   npx convex run social:seedAdmin '{}'
// Creates the admin auth account (email+password) if missing, else flags the
// existing account as admin. The account is pre-verified so no email OTP is
// needed to sign in.

export const markAdminByEmail = internalMutation({
  args: {},
  handler: async (ctx) => {
    const email = adminEmail();
    if (!email) return "no-admin-email";
    const existing = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (!existing) return "no-user";
    await ctx.db.patch(existing._id, {
      isAdmin: true,
      username: existing.username ?? "admin",
      displayName: existing.displayName ?? "Admin",
      emailVerificationTime: existing.emailVerificationTime ?? Date.now(),
      discoverable: existing.discoverable ?? false,
    });
    return "patched";
  },
});

// Mark the admin account's email as verified so sign-in skips the OTP step.
// Convex Auth gates this on authAccounts.emailVerified (see
// @convex-dev/auth Password.js: `config.verify && !account.emailVerified`).
// Run: npx convex run social:verifyAdmin '{}'   (add --prod for production)
export const verifyAdmin = internalMutation({
  args: {},
  handler: async (ctx) => {
    const email = adminEmail();
    if (!email) return "no-admin-email";

    const user = await ctx.db
      .query("users")
      .withIndex("email", (q) => q.eq("email", email))
      .first();
    if (user && user.emailVerificationTime === undefined) {
      await ctx.db.patch(user._id, { emailVerificationTime: Date.now() });
    }

    const accounts = await ctx.db.query("authAccounts").collect();
    let patched = 0;
    for (const acc of accounts as any[]) {
      const matches =
        acc.provider === "password" &&
        (acc.providerAccountId === email ||
          (user && acc.userId === user._id));
      if (matches && !acc.emailVerified) {
        await ctx.db.patch(acc._id, { emailVerified: email });
        patched++;
      }
    }
    return { user: !!user, accountsPatched: patched };
  },
});

export const seedAdmin = internalAction({
  args: {},
  handler: async (ctx): Promise<string> => {
    const email = adminEmail();
    const password = process.env.ADMIN_PASSWORD;
    if (!email || !password) throw new Error("Set ADMIN_EMAIL and ADMIN_PASSWORD env vars first");

    try {
      await createAccount(ctx, {
        provider: "password",
        account: { id: email, secret: password },
        profile: {
          email,
          emailVerified: email, // skips the OTP gate on sign-in
          username: "admin",
          displayName: "Admin",
          isAdmin: true,
          discoverable: false,
        } as any,
      });
    } catch (e) {
      // Account already exists — flag it and mark verified.
      await ctx.runMutation(internal.social.markAdminByEmail, {});
      await ctx.runMutation(internal.social.verifyAdmin, {});
      return `existing (${e instanceof Error ? e.message : "exists"})`;
    }
    await ctx.runMutation(internal.social.markAdminByEmail, {});
    await ctx.runMutation(internal.social.verifyAdmin, {});
    return "created";
  },
});
