import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listFreshnessUpdates = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("needs_review"),
        v.literal("approved"),
        v.literal("dismissed"),
        v.literal("snoozed")
      )
    ),
  },
  handler: async (ctx, args) => {
    // Get all user's posts first
    const posts = await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .collect();

    const postIds = new Set(posts.map((p) => p._id));

    if (args.status) {
      const updates = await ctx.db
        .query("freshnessUpdates")
        .withIndex("by_status", (q) => q.eq("status", args.status!))
        .collect();
      return updates.filter((u) => postIds.has(u.postId));
    }

    const allUpdates = [];
    for (const post of posts) {
      const updates = await ctx.db
        .query("freshnessUpdates")
        .withIndex("by_post", (q) => q.eq("postId", post._id))
        .collect();
      allUpdates.push(...updates);
    }
    return allUpdates;
  },
});

export const saveFreshnessResults = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    updates: v.array(
      v.object({
        severity: v.union(
          v.literal("low"),
          v.literal("medium"),
          v.literal("high")
        ),
        confidence: v.number(),
        suggestedAction: v.union(
          v.literal("notice"),
          v.literal("addendum"),
          v.literal("revision")
        ),
        summary: v.string(),
        sourceLinks: v.array(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const update of args.updates) {
      await ctx.db.insert("freshnessUpdates", {
        postId: args.postId,
        userId: args.userId,
        ...update,
        status: "needs_review",
      });
    }
  },
});

export const applyFreshnessDecision = mutation({
  args: {
    updateId: v.id("freshnessUpdates"),
    status: v.union(
      v.literal("approved"),
      v.literal("dismissed"),
      v.literal("snoozed")
    ),
    decisionNote: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.updateId, {
      status: args.status,
      decidedAt: Date.now(),
      decisionNote: args.decisionNote,
    });
  },
});
