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
import { isAvatarColor, isAvatarEmoji } from "../constants/avatar";
import { clampRecipeSnapshot } from "./lib/recipeLimits";
import { rateLimiter } from "./rateLimits";
import { ratingSummaryFor } from "./ratings";

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
    avatarColor: user?.avatarColor ?? null,
    avatarEmoji: user?.avatarEmoji ?? null,
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
  // Fallback scan by email only — never trust a stray `isAdmin` flag on some
  // other row as proof of admin.
  const all = await ctx.db.query("users").collect();
  return all.find((u) => (u.email ?? "").trim().toLowerCase() === email) ?? null;
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

type FriendState =
  | "none"
  | "pending_out"
  | "pending_in"
  | "accepted"
  | "declined"
  | "blocked";

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

// Notify the owner of a custom recipe that someone favorited / cooked it.
// Called from convex/favorites.ts and convex/cooked.ts.
export async function notifyRecipeInteraction(
  ctx: MutationCtx,
  actorId: Id<"users">,
  recipeStringId: string,
  kind: "recipe_favorited" | "recipe_cooked",
) {
  const rid = ctx.db.normalizeId("customRecipes", recipeStringId);
  if (!rid) return;
  const recipe = await ctx.db.get(rid);
  if (!recipe || recipe.userId === actorId) return;
  const actor = await ctx.db.get(actorId);
  const name = actor?.displayName || actor?.username || "?";
  await ctx.db.insert("notifications", {
    userId: recipe.userId,
    type: kind,
    actorId,
    actorName: name,
    actorInitials: initialsOf(name),
    recipeName: recipe.name,
    createdAt: Date.now(),
  });
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
      friendListVisible: user.friendListVisible === true,
      initials: initialsOf(user.displayName || user.username || "?"),
      avatarColor: user.avatarColor ?? null,
      avatarEmoji: user.avatarEmoji ?? null,
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
    friendListVisible: v.optional(v.boolean()),
    avatarColor: v.optional(v.string()),
    avatarEmoji: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    const patch: Partial<Doc<"users">> = {};
    if (args.displayName !== undefined) patch.displayName = args.displayName.trim().slice(0, DISPLAY_NAME_MAX);
    if (args.bio !== undefined) patch.bio = args.bio.trim().slice(0, BIO_MAX);
    if (args.discoverable !== undefined) patch.discoverable = args.discoverable;
    if (args.feedVisibility !== undefined) patch.feedVisibility = args.feedVisibility;
    if (args.friendListVisible !== undefined) patch.friendListVisible = args.friendListVisible;
    // Avatar: only accept values from the predefined sets; "" clears the emoji.
    if (args.avatarColor !== undefined && isAvatarColor(args.avatarColor)) {
      patch.avatarColor = args.avatarColor;
    }
    if (args.avatarEmoji !== undefined) {
      patch.avatarEmoji = isAvatarEmoji(args.avatarEmoji) ? args.avatarEmoji : undefined;
    }
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
    const pendingOutRows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", userId).eq("status", "pending_out"))
      .collect();
    const declinedRows = await ctx.db
      .query("friendships")
      .withIndex("by_owner_status", (q) => q.eq("owner", userId).eq("status", "declined"))
      .collect();

    const incoming = [];
    for (const row of incomingRows) incoming.push(miniProfile(await ctx.db.get(row.other), row.other));
    const outgoing = [];
    for (const row of pendingOutRows)
      outgoing.push({ ...miniProfile(await ctx.db.get(row.other), row.other), status: "pending_out" as const });
    for (const row of declinedRows)
      outgoing.push({ ...miniProfile(await ctx.db.get(row.other), row.other), status: "declined" as const });
    return { incoming, outgoing };
  },
});

export const findUser = query({
  args: { query: v.string() },
  handler: async (ctx, { query: q }) => {
    const me = await requireUserId(ctx);
    // Note: findUser is a reactive query (AddFriendSheet), so it can't consume
    // a rate-limit token. It's auth-gated and read-only; the abuse vector
    // (sendFriendRequest) is rate-limited instead.
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

// Core request logic shared by the username/email path and the
// friend-of-friend (by id) path.
async function doSendRequest(ctx: MutationCtx, me: Id<"users">, other: Id<"users">) {
  const { iBlocked, blockedByThem } = await blockState(ctx, me, other);
  if (iBlocked || blockedByThem) throw new Error("BLOCKED");

  const admin = await getAdminUser(ctx);
  if (admin && other === admin._id) return { status: "accepted" as const };

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

  // Fresh request, or re-send after a previous decline.
  if (mineRow && (mineRow.status === "declined")) {
    await ctx.db.patch(mineRow._id, { status: "pending_out", updatedAt: now });
  } else {
    await ctx.db.insert("friendships", {
      owner: me,
      other,
      status: "pending_out",
      createdAt: now,
      updatedAt: now,
    });
  }
  if (theirsRow) {
    await ctx.db.patch(theirsRow._id, { status: "pending_in", updatedAt: now });
  } else {
    await ctx.db.insert("friendships", {
      owner: other,
      other: me,
      status: "pending_in",
      createdAt: now,
      updatedAt: now,
    });
  }
  return { status: "pending_out" as const };
}

export const sendFriendRequest = mutation({
  args: { query: v.string() },
  handler: async (ctx, { query: q }) => {
    const me = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "friendRequest", { key: me, throws: true });
    const found = await resolveUser(ctx, q);
    if (!found) throw new Error("USER_NOT_FOUND");
    if (found._id === me) throw new Error("CANNOT_ADD_SELF");
    if (found.discoverable === false) throw new Error("USER_NOT_FOUND");
    return doSendRequest(ctx, me, found._id);
  },
});

// Friend-of-friend: send a request straight to a user id (from a friend's
// visible friend list). Only allowed when the target opted in.
export const sendFriendRequestTo = mutation({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId: other }) => {
    const me = await requireUserId(ctx);
    await rateLimiter.limit(ctx, "friendRequest", { key: me, throws: true });
    if (other === me) throw new Error("CANNOT_ADD_SELF");
    const target = await ctx.db.get(other);
    if (!target) throw new Error("USER_NOT_FOUND");
    // This path is only reachable from a friend's visible friend list, so the
    // target must have opted in — unless they're generally discoverable anyway.
    if (target.friendListVisible !== true && target.discoverable === false) {
      throw new Error("USER_NOT_FOUND");
    }
    return doSendRequest(ctx, me, other);
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
      // Keep a "declined" marker on the sender's row so they can see the
      // outcome; drop my (recipient) row.
      await ctx.db.delete(mineRow._id);
      if (theirsRow) await ctx.db.patch(theirsRow._id, { status: "declined", updatedAt: now });
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
    await rateLimiter.limit(ctx, "adminMessage", { key: me, throws: true });
    const admin = await getAdminUser(ctx);
    if (!admin) throw new Error("ADMIN_NOT_CONFIGURED");

    const trimmed = message.trim();
    if (category === "report_user" && trimmed.length < 10) throw new Error("REASON_TOO_SHORT");
    if (trimmed.length === 0) throw new Error("MESSAGE_EMPTY");

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
      message: trimmed.slice(0, MSG_MAX),
      reportedUserId: reportedId ?? undefined,
      reportedUsername,
      reportedEmail,
      createdAt: Date.now(),
      status: "new",
    });
  },
});

const ADMIN_PRIORITY: Record<string, number> = {
  bug: 3,
  report_user: 2,
  feedback: 0,
  other: 0,
};

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
      .take(200);
    return rows
      .map((r) => ({
        id: r._id,
        category: r.category,
        message: r.message,
        from: { username: r.fromUsername ?? "", email: r.fromEmail ?? "" },
        reported:
          r.reportedUserId != null
            ? { username: r.reportedUsername ?? "", email: r.reportedEmail ?? "" }
            : null,
        createdAt: r.createdAt,
        status: r.status ?? (r.resolvedAt !== undefined ? "done" : "new"),
        priority: ADMIN_PRIORITY[r.category] ?? 0,
      }))
      .sort((a, b) => {
        // open first, then closed (done / read), then by priority, then newest
        const closed = (s: string) => (s === "done" || s === "read" ? 1 : 0);
        const ac = closed(a.status);
        const bc = closed(b.status);
        if (ac !== bc) return ac - bc;
        if (a.priority !== b.priority) return b.priority - a.priority;
        return b.createdAt - a.createdAt;
      });
  },
});

export const setAdminMessageStatus = mutation({
  args: {
    id: v.id("adminMessages"),
    status: v.union(
      v.literal("new"),
      v.literal("seen"),
      v.literal("in_progress"),
      v.literal("done"),
      v.literal("read"), // feedback / other: single "read" state, no workflow
    ),
  },
  handler: async (ctx, { id, status }) => {
    const me = await requireUserId(ctx);
    const admin = await getAdminUser(ctx);
    if (!admin || admin._id !== me) throw new Error("NOT_ADMIN");
    await ctx.db.patch(id, {
      status,
      resolvedAt: status === "done" || status === "read" ? Date.now() : undefined,
    });
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
  handler: async (ctx, { toUserId, recipe: rawRecipe, note }) => {
    const me = await requireUserId(ctx);
    if (toUserId === me) throw new Error("CANNOT_SHARE_WITH_SELF");
    if ((await friendState(ctx, me, toUserId)) !== "accepted") throw new Error("NOT_FRIENDS");

    const recipe = clampRecipeSnapshot(rawRecipe);
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
      kind:
        | "recipe_share"
        | "friend_accepted"
        | "info"
        | "recipe_favorited"
        | "recipe_cooked"
        | "recipe_rated";
      createdAt: number;
      seen: boolean;
      from: ReturnType<typeof miniProfile> | null;
      recipe?: Doc<"recipeShares">["recipe"];
      note?: string;
      saved?: boolean;
      message?: string;
      recipeName?: string;
      rating?: number;
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
      // Name/initials stay from the snapshot; pull the actor's *current*
      // avatar (colour/emoji) live so it reflects later changes.
      const actor = n.actorId ? await ctx.db.get(n.actorId) : null;
      items.push({
        id: n._id,
        kind: n.type,
        createdAt: n.createdAt,
        seen: n.seenAt !== undefined,
        from: n.actorId
          ? {
              id: n.actorId,
              username: "",
              displayName: n.actorName ?? "",
              initials: n.actorInitials ?? initialsOf(n.actorName ?? "?"),
              avatarColor: actor?.avatarColor ?? null,
              avatarEmoji: actor?.avatarEmoji ?? null,
              isAdmin: false,
            }
          : null,
        message: n.message ?? "",
        recipeName: n.recipeName ?? "",
        rating: n.rating,
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

    const dismissed = new Set(
      (
        await ctx.db
          .query("feedDismissals")
          .withIndex("by_user", (q) => q.eq("userId", me))
          .collect()
      ).map((d) => d.eventId as string),
    );

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
        if (dismissed.has(e._id as string)) continue;
        events.push({
          id: e._id,
          type: e.type,
          recipe: e.recipe ?? null,
          rating: e.rating ?? null,
          createdAt: e.createdAt,
          actor,
        });
      }
    }

    events.sort((a, b) => b.createdAt - a.createdAt);
    return events.slice(0, FEED_LIMIT);
  },
});

// Hide one feed entry for the current user only.
export const dismissFeedEvent = mutation({
  args: { eventId: v.id("activityEvents") },
  handler: async (ctx, { eventId }) => {
    const me = await requireUserId(ctx);
    const existing = await ctx.db
      .query("feedDismissals")
      .withIndex("by_user", (q) => q.eq("userId", me))
      .collect();
    if (existing.some((d) => d.eventId === eventId)) return;
    await ctx.db.insert("feedDismissals", { userId: me, eventId, createdAt: Date.now() });
  },
});

// Delete one inbox entry (recipe share or notification) — it belongs to the
// current user, so a real delete is fine.
export const deleteInboxItem = mutation({
  args: {
    kind: v.union(v.literal("share"), v.literal("notification")),
    id: v.string(),
  },
  handler: async (ctx, { kind, id }) => {
    const me = await requireUserId(ctx);
    if (kind === "share") {
      const row = await ctx.db.get(id as Id<"recipeShares">);
      if (row && row.toUser === me) await ctx.db.delete(row._id);
    } else {
      const row = await ctx.db.get(id as Id<"notifications">);
      if (row && row.userId === me) await ctx.db.delete(row._id);
    }
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

async function customToRecipe(ctx: QueryCtx, doc: Doc<"customRecipes">) {
  const { _id, _creationTime, userId, ...rest } = doc;
  const image = doc.imageStorageId
    ? (await ctx.storage.getUrl(doc.imageStorageId)) ?? rest.image
    : rest.image;
  return { id: _id, ...rest, image };
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
    // Bio + stat counters are visible to self, accepted friends, and anyone
    // when the profile is discoverable. A non-discoverable stranger sees only
    // the name + friendship status (enough to send a request).
    const canSeeStats = isSelf || status === "accepted" || doc.discoverable !== false;

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
    const nonAdminFriendRows = friendRows.filter((r) => !admin || r.other !== admin._id);
    const friendsCount = nonAdminFriendRows.length;
    const ratingSummary = await ratingSummaryFor(ctx, other);

    const base = {
      ...miniProfile(doc, other),
      bio: canSeeStats ? doc.bio ?? "" : "",
      status,
      isSelf,
      isAdmin: isAdminProfile,
      iBlocked,
      blockedByThem,
      memberSince: doc._creationTime,
      stats: canSeeStats
        ? {
            favoritesCount,
            createdCount: customRecipes.length,
            cookedCount,
            friendsCount,
            recipeRatingAvg: ratingSummary.avg,
            recipeRatingCount: ratingSummary.ratingCount,
            distinctRaters: ratingSummary.distinctRaters,
          }
        : null,
    };

    if (!canSeeRecipes) {
      return {
        ...base,
        recipes: [] as any[],
        favorites: [] as any[],
        cooked: [] as any[],
        friendsList: [] as any[],
      };
    }

    // Private custom recipes are hidden from friends (only the owner sees them).
    const visibleCustom = isSelf
      ? customRecipes
      : customRecipes.filter((r) => r.visibility !== "private");
    const visibleCustomFavs = visibleCustom.filter((r) => r.isFavorite);

    // Cooked list: only the custom recipes we can resolve (external cooked
    // recipes aren't snapshotted per user). Count stat stays the full total.
    const customById = new Map(visibleCustom.map((r) => [r._id as string, r]));
    const cooked = (
      await Promise.all(
        cookedRows.map(async (row) => {
          const cr = customById.get(row.recipeId);
          return cr ? { ...(await customToRecipe(ctx, cr)), cookCount: row.count } : null;
        }),
      )
    ).filter((x): x is NonNullable<typeof x> => x !== null);

    // Friend list: the owner's accepted friends. For a non-self viewer only
    // friends who opted in (friendListVisible) are shown. Each carries the
    // viewer's own status toward them so the client can show add / pending /
    // friends.
    const friendsList = [];
    for (const row of nonAdminFriendRows) {
      const fDoc = await ctx.db.get(row.other);
      if (!fDoc) continue;
      if (row.other === me) continue;
      if (!isSelf && fDoc.friendListVisible !== true) continue;
      const { iBlocked: fb1, blockedByThem: fb2 } = await blockState(ctx, me, row.other);
      if (fb1 || fb2) continue;
      friendsList.push({
        ...miniProfile(fDoc, row.other),
        viewerStatus: await friendState(ctx, me, row.other),
      });
    }
    friendsList.sort((a, b) => a.displayName.localeCompare(b.displayName));

    return {
      ...base,
      recipes: await Promise.all(visibleCustom.map((r) => customToRecipe(ctx, r))),
      favorites: [
        ...favRows.map((r) => r.recipe),
        ...(await Promise.all(visibleCustomFavs.map((r) => customToRecipe(ctx, r)))),
      ],
      cooked,
      friendsList,
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
