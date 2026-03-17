import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getReviewRun = query({
  args: { runId: v.id("reviewRuns") },
  handler: async (ctx, args) => {
    const run = await ctx.db.get(args.runId);
    if (!run) return null;

    const items = await ctx.db
      .query("reviewItems")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();

    return { ...run, items };
  },
});

export const getReviewItems = query({
  args: { runId: v.id("reviewRuns") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reviewItems")
      .withIndex("by_run", (q) => q.eq("runId", args.runId))
      .collect();
  },
});

export const listReviewRunsByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("reviewRuns")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .collect();
  },
});

export const createReviewRun = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    revisionId: v.id("revisions"),
    intensity: v.union(
      v.literal("gentle"),
      v.literal("balanced"),
      v.literal("rigorous")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("reviewRuns", {
      postId: args.postId,
      userId: args.userId,
      revisionId: args.revisionId,
      intensity: args.intensity,
    });
  },
});

export const saveReviewResults = mutation({
  args: {
    runId: v.id("reviewRuns"),
    postId: v.id("posts"),
    summary: v.string(),
    items: v.array(
      v.object({
        persona: v.string(),
        priority: v.union(
          v.literal("now"),
          v.literal("soon"),
          v.literal("optional")
        ),
        issue: v.string(),
        suggestion: v.string(),
        evidence: v.optional(v.string()),
        confidence: v.number(),
      })
    ),
  },
  handler: async (ctx, args) => {
    for (const item of args.items) {
      await ctx.db.insert("reviewItems", {
        runId: args.runId,
        postId: args.postId,
        ...item,
        actionStatus: "open",
      });
    }
    await ctx.db.patch(args.runId, {
      summary: args.summary,
      completedAt: Date.now(),
    });
  },
});

export const applyReviewDecision = mutation({
  args: {
    itemId: v.id("reviewItems"),
    actionStatus: v.union(
      v.literal("accepted"),
      v.literal("dismissed"),
      v.literal("pinned")
    ),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.itemId, {
      actionStatus: args.actionStatus,
    });
  },
});
