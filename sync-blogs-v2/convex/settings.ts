import { v } from "convex/values";
import { query, mutation } from "./_generated/server";

export const getSettings = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    return await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
  },
});

export const updateWatchlist = mutation({
  args: {
    userId: v.id("users"),
    versionWatchlist: v.any(),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db
      .query("settings")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();

    if (existing) {
      await ctx.db.patch(existing._id, {
        versionWatchlist: args.versionWatchlist,
      });
      return existing._id;
    }

    return await ctx.db.insert("settings", {
      userId: args.userId,
      versionWatchlist: args.versionWatchlist,
    });
  },
});
