import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";
import { authTables } from "@convex-dev/auth/server";

export default defineSchema({
  ...authTables,

  // Override the users table from authTables with our custom fields
  users: defineTable({
    // Fields from authTables
    name: v.optional(v.string()),
    image: v.optional(v.string()),
    email: v.optional(v.string()),
    emailVerificationTime: v.optional(v.number()),
    phone: v.optional(v.string()),
    phoneVerificationTime: v.optional(v.number()),
    isAnonymous: v.optional(v.boolean()),
    // Custom fields
    onboardingCompleted: v.optional(v.boolean()),
    preferredModel: v.optional(v.string()),
    writingProfile: v.optional(
      v.object({
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
      })
    ),
  }).index("email", ["email"]),

  posts: defineTable({
    userId: v.id("users"),
    title: v.string(),
    status: v.union(
      v.literal("draft"),
      v.literal("published"),
      v.literal("archived")
    ),
    visibility: v.union(v.literal("private"), v.literal("public")),
    tags: v.array(v.string()),
    monitorFreshness: v.boolean(),
    publishedAt: v.optional(v.number()),
    draftProgress: v.optional(
      v.object({
        roughInput: v.optional(v.string()),
        clarifyingQuestions: v.optional(v.any()),
        clarifyingAnswers: v.optional(v.any()),
        draftChosen: v.optional(v.boolean()),
        // Generated draft options stored here to avoid revision-query bugs
        generatedDrafts: v.optional(v.any()),
      })
    ),
  })
    .index("by_user", ["userId"])
    .index("by_user_status", ["userId", "status"]),

  revisions: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    revisionNumber: v.number(),
    content: v.string(),
    contentHash: v.string(),
    source: v.union(
      v.literal("manual"),
      v.literal("generated"),
      v.literal("imported")
    ),
    titleSuggestion: v.optional(v.string()),
  })
    .index("by_post", ["postId"])
    .index("by_post_number", ["postId", "revisionNumber"]),

  reviewRuns: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    revisionId: v.id("revisions"),
    intensity: v.union(
      v.literal("gentle"),
      v.literal("balanced"),
      v.literal("rigorous")
    ),
    summary: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  }).index("by_post", ["postId"]),

  reviewItems: defineTable({
    runId: v.id("reviewRuns"),
    postId: v.id("posts"),
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
    actionStatus: v.union(
      v.literal("open"),
      v.literal("accepted"),
      v.literal("dismissed"),
      v.literal("pinned")
    ),
  }).index("by_run", ["runId"]),

  freshnessUpdates: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
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
    status: v.union(
      v.literal("needs_review"),
      v.literal("approved"),
      v.literal("dismissed"),
      v.literal("snoozed")
    ),
    decidedAt: v.optional(v.number()),
    decisionNote: v.optional(v.string()),
  })
    .index("by_post", ["postId"])
    .index("by_status", ["status"]),

  settings: defineTable({
    userId: v.id("users"),
    versionWatchlist: v.any(),
  }).index("by_user", ["userId"]),

  taskProgress: defineTable({
    taskType: v.union(
      v.literal("compose"),
      v.literal("review"),
      v.literal("freshness")
    ),
    postId: v.id("posts"),
    userId: v.id("users"),
    status: v.union(
      v.literal("pending"),
      v.literal("running"),
      v.literal("completed"),
      v.literal("failed")
    ),
    progress: v.number(),
    message: v.optional(v.string()),
    streamContent: v.optional(v.string()),
    completedAt: v.optional(v.number()),
  })
    .index("by_post_type", ["postId", "taskType"])
    .index("by_user", ["userId"]),

  tokenUsage: defineTable({
    postId: v.id("posts"),
    userId: v.id("users"),
    action: v.string(),      // "compose", "review", "freshness", "applyFix", "clarify"
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
    cacheReadTokens: v.optional(v.number()),
    cacheWriteTokens: v.optional(v.number()),
    createdAt: v.number(),
  }).index("by_post", ["postId"])
    .index("by_user", ["userId"]),
});
