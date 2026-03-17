import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getProgress = query({
  args: {
    postId: v.id("posts"),
    taskType: v.union(
      v.literal("compose"),
      v.literal("review"),
      v.literal("freshness")
    ),
  },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("taskProgress")
      .withIndex("by_post_type", (q) =>
        q.eq("postId", args.postId).eq("taskType", args.taskType)
      )
      .order("desc")
      .first();
  },
});

export const upsertProgress = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    taskType: v.union(
      v.literal("compose"),
      v.literal("review"),
      v.literal("freshness")
    ),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.number(),
    message: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("taskProgress")
      .withIndex("by_post_type", (q) =>
        q.eq("postId", args.postId).eq("taskType", args.taskType)
      )
      .order("desc")
      .first();

    const data = {
      postId: args.postId,
      userId: args.userId,
      taskType: args.taskType,
      status: args.status,
      progress: args.progress,
      message: args.message,
      completedAt:
        args.status === "completed" || args.status === "failed"
          ? Date.now()
          : undefined,
    };

    if (existing) {
      await ctx.db.patch(existing._id, data);
      return existing._id;
    }

    return await ctx.db.insert("taskProgress", data);
  },
});
