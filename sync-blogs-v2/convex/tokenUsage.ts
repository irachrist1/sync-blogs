import { v } from "convex/values";
import { mutation, query } from "./_generated/server";

export const logUsage = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    action: v.string(),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cacheReadTokens: v.optional(v.number()),
    cacheWriteTokens: v.optional(v.number()),
    createdAt: v.number(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("tokenUsage", args);
  },
});

export const getUsageByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tokenUsage")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .collect();
  },
});

export const getUsageByUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("tokenUsage")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(100);
  },
});
