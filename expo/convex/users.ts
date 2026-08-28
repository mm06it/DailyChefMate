import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";

import { mutation, query } from "./_generated/server";

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

// Whether `username` is free for the signed-in user to take (normalized to
// lowercase first). Returns false for a value that can't be a username at
// all, so the caller can treat that the same as "not available".
export const usernameAvailable = query({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
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
    if (!userId) throw new Error("Not authenticated");

    const normalized = username.trim().toLowerCase();
    if (!USERNAME_PATTERN.test(normalized)) {
      throw new Error("INVALID_USERNAME");
    }

    const existing = await ctx.db
      .query("users")
      .withIndex("username", (q) => q.eq("username", normalized))
      .first();
    if (existing && existing._id !== userId) {
      throw new Error("USERNAME_TAKEN");
    }

    await ctx.db.patch(userId, { username: normalized });
    return normalized;
  },
});
