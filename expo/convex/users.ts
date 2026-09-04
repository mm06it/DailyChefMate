import { getAuthUserId } from "@convex-dev/auth/server";
import { ConvexError, v } from "convex/values";

import { mutation, query } from "./_generated/server";
import { rateLimiter } from "./rateLimits";

// Same rule the sign-up form enforces (app/auth.tsx): 3–20 chars,
// lowercase letters/digits/hyphen/underscore.
const USERNAME_PATTERN = /^[a-z0-9_-]{3,20}$/;

export const current = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return null;
    return await ctx.db.get(userId);
  },
});

// Whether an account already exists for `email` (case-insensitive). The
// sign-in / sign-up form uses this to show a precise "not registered" vs
// "already registered" message, since Convex Auth deliberately returns an
// opaque error for both. Small user table, so a scan is fine.
//
// A `mutation` (not a query) purely so it can consume a rate-limit token — it
// writes nothing. It's a pre-login endpoint with no per-caller key, so only a
// coarse *global* ceiling is possible (Convex has no request IP). Called
// imperatively (convex.mutation), never reactively.
export const emailRegistered = mutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    await rateLimiter.limit(ctx, "emailProbe", { throws: true });
    const target = email.trim().toLowerCase();
    if (target.length === 0) return false;
    const users = await ctx.db.query("users").collect();
    return users.some((u) => (u.email ?? "").trim().toLowerCase() === target);
  },
});

// Whether `username` is free for the signed-in user to take (normalized to
// lowercase first). Returns false for a value that can't be a username at
// all, so the caller can treat that the same as "not available".
// `mutation` for the same rate-limit reason as emailRegistered.
export const usernameAvailable = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    await rateLimiter.limit(ctx, "usernameCheck", { throws: true });
    const normalized = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) return false;
    const userId = await getAuthUserId(ctx);
    const existing = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalized))
      .first();
    return !existing || existing._id === userId;
  },
});

// Set or change the signed-in user's username. Throws on an invalid or
// already-taken name so the client can surface the reason.
export const updateUsername = mutation({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) throw new ConvexError("Not authenticated");
    await rateLimiter.limit(ctx, "usernameCheck", { throws: true });

    const normalized = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) {
      throw new ConvexError("INVALID_USERNAME");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalized))
      .first();
    if (existing && existing._id !== userId) {
      throw new ConvexError("USERNAME_TAKEN");
    }

    await ctx.db.patch(userId, { username: normalized });
    return normalized;
  },
});
