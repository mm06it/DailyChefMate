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

// Retrofit for accounts seeded before the catalogue was slimmed to ~12 per
// category: remove the *pristine* catalogue rows that a new account no longer
// gets. Only deletes an item when it is untouched — not selected and still at
// its original catalogue amount — so anything the user picked, re-portioned or
// added by hand is left alone. Idempotent: once the stale rows are gone it
// finds nothing to do.
export const trimSeededCatalog = mutation({
  args: {
    keep: v.array(v.string()),
    catalog: v.array(v.object({ name: v.string(), amount: v.string() })),
  },
  handler: async (ctx, { keep, catalog }) => {
    const userId = await requireUserId(ctx);

    const keepSet = new Set(keep);
    const catalogAmount = new Map(catalog.map((c) => [c.name, c.amount]));

    const items = await ctx.db
      .query("refrigeratorItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();

    let removed = 0;
    for (const item of items) {
      if (item.isSelected) continue;
      if (keepSet.has(item.name)) continue;
      const original = catalogAmount.get(item.name);
      if (original === undefined) continue; // user-added, not a catalogue seed
      if (item.amount !== original) continue; // re-portioned by the user
      await ctx.db.delete(item._id);
      removed++;
    }
    return { removed };
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

// Deselect every ingredient the user currently has selected.
export const clearSelection = mutation({
  args: {},
  handler: async (ctx) => {
    const userId = await requireUserId(ctx);
    const items = await ctx.db
      .query("refrigeratorItems")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
    for (const item of items) {
      if (item.isSelected) await ctx.db.patch(item._id, { isSelected: false });
    }
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
