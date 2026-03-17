import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const listPosts = query({
  args: {
    userId: v.id("users"),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
  },
  handler: async (ctx, args) => {
    if (args.status) {
      return await ctx.db
        .query("posts")
        .withIndex("by_user_status", (q) =>
          q.eq("userId", args.userId).eq("status", args.status!)
        )
        .order("desc")
        .collect();
    }
    return await ctx.db
      .query("posts")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .collect();
  },
});

export const getPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) return null;

    const latestRevision = await ctx.db
      .query("revisions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .first();

    return { ...post, latestRevision };
  },
});

export const getDraftProgress = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    return post?.draftProgress ?? null;
  },
});

export const createPost = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
  },
  handler: async (ctx, args) => {
    return await ctx.db.insert("posts", {
      userId: args.userId,
      title: args.title,
      status: "draft",
      visibility: "private",
      tags: [],
      monitorFreshness: false,
    });
  },
});

export const updatePost = mutation({
  args: {
    postId: v.id("posts"),
    title: v.optional(v.string()),
    status: v.optional(
      v.union(
        v.literal("draft"),
        v.literal("published"),
        v.literal("archived")
      )
    ),
    visibility: v.optional(
      v.union(v.literal("private"), v.literal("public"))
    ),
    tags: v.optional(v.array(v.string())),
    monitorFreshness: v.optional(v.boolean()),
  },
  handler: async (ctx, args) => {
    const { postId, ...updates } = args;
    const filtered = Object.fromEntries(
      Object.entries(updates).filter(([, v]) => v !== undefined)
    );
    await ctx.db.patch(postId, filtered);
  },
});

export const saveDraftProgress = mutation({
  args: {
    postId: v.id("posts"),
    draftProgress: v.object({
      roughInput: v.optional(v.string()),
      clarifyingQuestions: v.optional(v.any()),
      clarifyingAnswers: v.optional(v.any()),
      draftChosen: v.optional(v.boolean()),
      generatedDrafts: v.optional(v.any()),
    }),
  },
  handler: async (ctx, args) => {
    // Merge with existing draftProgress so partial updates don't wipe other fields
    const post = await ctx.db.get(args.postId);
    const existing = post?.draftProgress ?? {};
    await ctx.db.patch(args.postId, {
      draftProgress: { ...existing, ...args.draftProgress },
    });
  },
});

export const deletePost = mutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const post = await ctx.db.get(args.postId);
    if (!post) throw new Error("Post not found");

    // Cascade delete revisions
    const revisions = await ctx.db
      .query("revisions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const rev of revisions) {
      await ctx.db.delete(rev._id);
    }

    // Cascade delete review runs and their items
    const reviewRuns = await ctx.db
      .query("reviewRuns")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const run of reviewRuns) {
      const items = await ctx.db
        .query("reviewItems")
        .withIndex("by_run", (q) => q.eq("runId", run._id))
        .collect();
      for (const item of items) {
        await ctx.db.delete(item._id);
      }
      await ctx.db.delete(run._id);
    }

    // Cascade delete freshness updates
    const freshnessUpdates = await ctx.db
      .query("freshnessUpdates")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .collect();
    for (const update of freshnessUpdates) {
      await ctx.db.delete(update._id);
    }

    // Cascade delete task progress
    const taskProgress = await ctx.db
      .query("taskProgress")
      .withIndex("by_post_type", (q) => q.eq("postId", args.postId))
      .collect();
    for (const tp of taskProgress) {
      await ctx.db.delete(tp._id);
    }

    // Delete the post itself
    await ctx.db.delete(args.postId);
  },
});

export const publishPost = mutation({
  args: {
    postId: v.id("posts"),
    visibility: v.union(v.literal("private"), v.literal("public")),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      status: "published",
      visibility: args.visibility,
      publishedAt: Date.now(),
    });
  },
});
