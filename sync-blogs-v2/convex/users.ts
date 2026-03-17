import { v } from "convex/values";
import { query, mutation } from "./_generated/server";
import { getAuthUserId } from "@convex-dev/auth/server";

export const currentUser = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    return await ctx.db.get(userId);
  },
});

export const getWritingProfile = query({
  args: {},
  handler: async (ctx) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) return null;
    const user = await ctx.db.get(userId);
    return user?.writingProfile ?? null;
  },
});

export const completeOnboarding = mutation({
  args: {
    writingProfile: v.object({
      destination: v.optional(v.array(v.string())),
      tone: v.optional(v.array(v.string())),
      sentenceStyle: v.optional(v.array(v.string())),
      structure: v.optional(v.array(v.string())),
      lengthPreference: v.optional(v.array(v.string())),
      perspective: v.optional(v.array(v.string())),
      personalStories: v.optional(v.array(v.string())),
      hookPreference: v.optional(v.array(v.string())),
      formattingHabits: v.optional(v.array(v.string())),
      topicDomains: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    await ctx.db.patch(userId, {
      onboardingCompleted: true,
      writingProfile: args.writingProfile,
    });
  },
});

export const updateWritingProfile = mutation({
  args: {
    writingProfile: v.object({
      destination: v.optional(v.array(v.string())),
      tone: v.optional(v.array(v.string())),
      sentenceStyle: v.optional(v.array(v.string())),
      structure: v.optional(v.array(v.string())),
      lengthPreference: v.optional(v.array(v.string())),
      perspective: v.optional(v.array(v.string())),
      personalStories: v.optional(v.array(v.string())),
      hookPreference: v.optional(v.array(v.string())),
      formattingHabits: v.optional(v.array(v.string())),
      topicDomains: v.optional(v.array(v.string())),
    }),
  },
  handler: async (ctx, args) => {
    const userId = await getAuthUserId(ctx);
    if (userId === null) throw new Error("Not authenticated");
    await ctx.db.patch(userId, {
      writingProfile: args.writingProfile,
    });
  },
});
