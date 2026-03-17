import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

function simpleHash(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash + char) | 0;
  }
  return Math.abs(hash).toString(36).padStart(8, "0").slice(0, 32);
}

export const listByPost = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("revisions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .collect();
  },
});

export const saveRevision = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    content: v.string(),
    source: v.union(
      v.literal("manual"),
      v.literal("generated"),
      v.literal("imported")
    ),
    titleSuggestion: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("revisions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .first();

    const revisionNumber = existing ? existing.revisionNumber + 1 : 1;

    // Simple hash for dedup
    const contentHash = simpleHash(args.content);

    return await ctx.db.insert("revisions", {
      postId: args.postId,
      userId: args.userId,
      revisionNumber,
      content: args.content,
      contentHash,
      source: args.source,
      titleSuggestion: args.titleSuggestion,
    });
  },
});

export const getGeneratedDrafts = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, args) => {
    const revisions = await ctx.db
      .query("revisions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .collect();
    // Return the most recent batch of generated drafts (typically 3)
    const generated = revisions.filter((r) => r.source === "generated");
    // Take the last 3 (most recent batch)
    return generated.slice(0, 3);
  },
});

export const saveDraftOptions = mutation({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    drafts: v.array(
      v.object({
        content: v.string(),
        titleSuggestion: v.optional(v.string()),
      })
    ),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("revisions")
      .withIndex("by_post", (q) => q.eq("postId", args.postId))
      .order("desc")
      .first();

    let nextNumber = existing ? existing.revisionNumber + 1 : 1;

    const ids = [];
    for (const draft of args.drafts) {
      const contentHash = simpleHash(draft.content);
      const id = await ctx.db.insert("revisions", {
        postId: args.postId,
        userId: args.userId,
        revisionNumber: nextNumber++,
        content: draft.content,
        contentHash,
        source: "generated",
        titleSuggestion: draft.titleSuggestion,
      });
      ids.push(id);
    }
    return ids;
  },
});
