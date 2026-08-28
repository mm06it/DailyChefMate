import { getAuthUserId } from "@convex-dev/auth/server";
import { v } from "convex/values";
import { mutation, query, type QueryCtx, type MutationCtx } from "./_generated/server";
import { Id } from "./_generated/dataModel";

async function requireUserId(ctx: QueryCtx | MutationCtx) {
  const userId = await getAuthUserId(ctx);
  if (!userId) throw new Error("Not authenticated");
  return userId;
}

async function requireOwnItem(ctx: MutationCtx, id: Id<"refrigeratorItems">) {
  const userId = await requireUserId(ctx);
  const item = await ctx.db.get(id);
  if (!item || item.userId !== userId) {
    throw new Error("Ingredient not found");
  }
  return item;
}

export const list = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (!userId) return [];
    return await ctx.db
      .query("refrigeratorItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  },
});

// One-time seed for brand-new accounts so the fridge isn't empty on first
// login — mirrors the previous local mocks/refrigerator.ts catalog. Safe to
// call repeatedly: it no-ops once the user already has any items.
export const seedIfEmpty = mutation({
  args: {
    items: v.array(
      v.object({
        name: v.string(),
        amount: v.string(),
        category: v.string(),
      })
    ),
  },
  handler: async (ctx, { items }) => {
    const userId = await requireUserId(ctx);
    const existing = await ctx.db
      .query("refrigeratorItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .first();
    if (existing) return;
    for (const item of items) {
      await ctx.db.insert("refrigeratorItems", {
        userId,
        name: item.name,
        amount: item.amount,
        category: item.category,
        isSelected: false,
      });
    }
  },
});

// Selecting an ingredient always clears the amount — quantity is opt-in via
// updateAmount, never implied by a preset catalog value.
export const selectItem = mutation({
  args: { id: v.id("refrigeratorItems") },
  handler: async (ctx, { id }) => {
    await requireOwnItem(ctx, id);
    await ctx.db.patch(id, { isSelected: true, amount: "" });
  },
});

export const toggleSelection = mutation({
  args: { id: v.id("refrigeratorItems") },
  handler: async (ctx, { id }) => {
    const item = await requireOwnItem(ctx, id);
    await ctx.db.patch(id, { isSelected: !item.isSelected });
  },
});

export const updateAmount = mutation({
  args: { id: v.id("refrigeratorItems"), amount: v.string() },
  handler: async (ctx, { id, amount }) => {
    await requireOwnItem(ctx, id);
    await ctx.db.patch(id, { amount, isSelected: true });
  },
});

export const addItem = mutation({
  args: {
    name: v.string(),
    amount: v.string(),
    category: v.string(),
    isSelected: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const userId = await requireUserId(ctx);
    return await ctx.db.insert("refrigeratorItems", {
      userId,
      name: args.name,
      amount: args.amount,
      category: args.category,
      isSelected: args.isSelected ?? false,
    });
  },
});
