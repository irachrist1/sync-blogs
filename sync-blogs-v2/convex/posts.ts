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
    }),
  },
  handler: async (ctx, args) => {
    await ctx.db.patch(args.postId, {
      draftProgress: args.draftProgress,
    });
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
