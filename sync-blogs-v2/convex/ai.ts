"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

function getModel(): string {
  return process.env.ANTHROPIC_MODEL || "claude-sonnet-4-6";
}

function readText(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function parseJson<T>(text: string): T {
  // Strip markdown code fences if present
  let cleaned = text.trim();
  // Remove opening ```json or ```
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "");
  // Remove closing ```
  cleaned = cleaned.replace(/\n?\s*```\s*$/, "");
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Try to extract JSON object/array from mixed content
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        // Try to fix truncated JSON by closing open braces/brackets
        let attempt = jsonMatch[1];
        const opens = (attempt.match(/\{/g) || []).length;
        const closes = (attempt.match(/\}/g) || []).length;
        const openBrackets = (attempt.match(/\[/g) || []).length;
        const closeBrackets = (attempt.match(/\]/g) || []).length;

        // Remove trailing incomplete string (unterminated)
        attempt = attempt.replace(/,\s*"[^"]*$/, "");
        // Close any open strings
        if ((attempt.match(/"/g) || []).length % 2 !== 0) {
          attempt += '"';
        }

        for (let i = 0; i < openBrackets - closeBrackets; i++) attempt += "]";
        for (let i = 0; i < opens - closes; i++) attempt += "}";

        return JSON.parse(attempt);
      }
    }
    throw new Error(
      `Failed to parse AI response as JSON: ${(e as Error).message}\nRaw text (first 500 chars): ${cleaned.slice(0, 500)}`
    );
  }
}

export const generateClarifyingQuestions = action({
  args: {
    roughInput: v.string(),
    writingProfile: v.optional(v.any()),
  },
  handler: async (_ctx, args) => {
    const client = getClient();
    const model = getModel();

    const profileContext =
      args.writingProfile && Object.keys(args.writingProfile).length > 0
        ? `\n\nThe writer's profile:\n${JSON.stringify(args.writingProfile, null, 2)}`
        : "";

    const response = await client.messages.create({
      model,
      max_tokens: 1200,
      temperature: 0.6,
      system: [
        "You generate 2-4 targeted clarifying questions before turning rough notes into a draft.",
        "Each question should help close ambiguity gaps that would otherwise produce a generic draft.",
        "Each question must have 2-4 suggested answer options that are specific and useful.",
        "Options should sound natural and human — not yes/no, not generic.",
        "Never ask something already inferable from the rough notes or the writing profile.",
        "Prioritize questions about: intended angle/argument, target audience for THIS piece, tone of THIS piece, desired length, whether to include personal experience, specific examples to include.",
        "Return strict JSON only.",
        'Required shape: {"questions":[{"id":"q1","question":"string","options":["string","string"],"allowCustom":true}]}',
        "Maximum 4 questions. Only include questions that would meaningfully change the output.",
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `Raw notes from the writer:\n${args.roughInput}${profileContext}`,
        },
      ],
    });

    const parsed = parseJson<{
      questions: Array<{
        id: string;
        question: string;
        options: string[];
        allowCustom: boolean;
      }>;
    }>(readText(response));

    return parsed.questions;
  },
});

export const composeDrafts = action({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    title: v.string(),
    roughInput: v.string(),
    mode: v.optional(
      v.union(
        v.literal("argument"),
        v.literal("narrative"),
        v.literal("brief")
      )
    ),
    writingProfile: v.optional(v.any()),
    clarifyingAnswers: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const client = getClient();
    const model = getModel();

    // Update progress
    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "compose",
      status: "running",
      progress: 10,
      message: "Generating drafts...",
    });

    const profileLines: string[] = [];
    if (
      args.writingProfile &&
      Object.keys(args.writingProfile).length > 0
    ) {
      profileLines.push("The writer's profile is:");
      profileLines.push(JSON.stringify(args.writingProfile, null, 2));
      profileLines.push("");
      profileLines.push("Instructions based on profile:");
      profileLines.push(
        "- Write in the user's voice, not a generic AI voice"
      );
      profileLines.push(
        "- Follow their formatting habits (em-dashes, capitalization style, sentence case headers, etc.)"
      );
      profileLines.push(
        "- Match their preferred sentence style and structure"
      );
      profileLines.push("- Use the hook style they prefer");
      profileLines.push(
        "- Write for their stated destination (blog, LinkedIn, etc.)"
      );
      profileLines.push(
        "- Target their preferred article length unless the clarifying answers suggest otherwise"
      );
    }

    const clarifyLines: string[] = [];
    if (
      args.clarifyingAnswers &&
      Object.keys(args.clarifyingAnswers).length > 0
    ) {
      clarifyLines.push(
        "Clarifying answers from the writer for this specific piece:"
      );
      for (const [, answer] of Object.entries(
        args.clarifyingAnswers as Record<string, string>
      )) {
        if (answer) clarifyLines.push(`- ${answer}`);
      }
    } else {
      clarifyLines.push("Clarifying answers: None provided.");
    }

    const prompt = [
      "You are a writing assistant that transforms raw, unpolished notes into coherent, well-written articles.",
      "",
      ...profileLines,
      "",
      ...clarifyLines,
      "",
      "Return valid JSON only.",
      "The JSON must be an object with key `options`, where `options` is an array of 1-3 objects.",
      "Each option object must have: `mode`, `titleSuggestion`, `draft`.",
      "The `draft` field should NOT include the title — it should start with the first paragraph of the body.",
      "The three supported modes are `argument`, `narrative`, and `brief`.",
      "Do NOT add filler phrases like 'In conclusion' or 'It's worth noting that'.",
      "Do NOT start sentences with 'Delve' or 'In today's world'.",
      "Do NOT over-explain. Trust the reader.",
      "If the writer writes opinionated content, take a stance — don't hedge.",
      "Use markdown formatting: headers with ##, bold for key terms, em-dashes where appropriate based on profile.",
      "Avoid generic AI tone, filler, corporate cadence.",
      "Preserve specificity and natural phrasing.",
      args.mode
        ? `Only return the requested mode: ${args.mode}.`
        : "Return all three modes.",
      `Existing title context: ${args.title || "Untitled draft"}`,
      "",
      "Raw thoughts from the writer:",
      args.roughInput,
    ].join("\n");

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "compose",
      status: "running",
      progress: 30,
      message: "AI is writing drafts...",
    });

    // Use continuation to handle long responses that get truncated
    let messages: Anthropic.MessageParam[] = [
      { role: "user", content: prompt },
    ];
    let fullText = "";

    for (let attempt = 0; attempt < 3; attempt++) {
      const response = await client.messages.create({
        model,
        max_tokens: 8000,
        temperature: 0.7,
        system:
          "Output strict JSON only. No markdown. No explanation before or after the JSON object.",
        messages,
      });

      const chunk = readText(response);
      fullText += chunk;

      if (response.stop_reason === "end_turn") break;

      // If truncated, ask the model to continue
      messages = [
        ...messages,
        { role: "assistant", content: chunk },
        { role: "user", content: "Continue the JSON from exactly where you left off." },
      ];
    }

    const parsed = parseJson<{
      options: Array<{
        mode: string;
        titleSuggestion: string;
        draft: string;
      }>;
    }>(fullText);

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "compose",
      status: "running",
      progress: 80,
      message: "Saving drafts...",
    });

    // Save drafts as revisions
    const drafts = parsed.options.map((opt) => ({
      content: opt.draft,
      titleSuggestion: opt.titleSuggestion,
    }));

    await ctx.runMutation(api.revisions.saveDraftOptions, {
      postId: args.postId,
      userId: args.userId,
      drafts,
    });

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "compose",
      status: "completed",
      progress: 100,
      message: "Drafts ready!",
    });

    return parsed.options;
  },
});

export const runReview = action({
  args: {
    runId: v.id("reviewRuns"),
    postId: v.id("posts"),
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    intensity: v.union(
      v.literal("gentle"),
      v.literal("balanced"),
      v.literal("rigorous")
    ),
  },
  handler: async (ctx, args) => {
    const client = getClient();
    const model = getModel();

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "review",
      status: "running",
      progress: 10,
      message: "Starting review...",
    });

    const personas = [
      {
        name: "Editor",
        role: "Improve structure, clarity, rhythm, and readability without flattening the author's voice.",
        tone: "Calm, exact, editorial.",
      },
      {
        name: "Skeptic",
        role: "Stress-test assumptions, factual claims, and weak logic.",
        tone: "Respectful, sharp, evidence-first.",
      },
      {
        name: "Empath",
        role: "Assess emotional nuance, vulnerability, and whether the writing lands as intended.",
        tone: "Warm, observant, non-judgmental.",
      },
      {
        name: "Philosopher",
        role: "Look for deeper meaning, stronger thesis, and conceptual coherence.",
        tone: "Curious, reflective, spacious.",
      },
      {
        name: "Coach",
        role: "Help the writer move forward with concrete next steps and preserve momentum.",
        tone: "Encouraging, practical, direct.",
      },
    ];

    const intensityLine =
      args.intensity === "gentle"
        ? "Keep feedback light and limited to the most important improvements."
        : args.intensity === "rigorous"
          ? "Be thorough and demanding, but still supportive and concrete."
          : "Balance encouragement with direct, high-signal critique.";

    const allItems: Array<{
      persona: string;
      priority: "now" | "soon" | "optional";
      issue: string;
      suggestion: string;
      evidence?: string;
      confidence: number;
    }> = [];

    // Run all personas in parallel
    const results = await Promise.all(
      personas.map(async (persona, idx) => {
        const response = await client.messages.create({
          model,
          max_tokens: 1600,
          temperature: 0.5,
          system: [
            `You are the ${persona.name} persona in a private writing app.`,
            `Role: ${persona.role}`,
            `Tone: ${persona.tone}`,
            intensityLine,
            "Return strict JSON only.",
            "Required JSON shape:",
            '{"persona":"string","strengths":["string"],"issues":[{"priority":"now|soon|optional","issue":"string","suggestion":"string","evidence":"string","confidence":0.0}],"questions":["string"]}',
            "Prioritize helpful, non-shaming feedback.",
            "If you make a factual challenge, mention the evidence directly in `evidence`.",
          ].join("\n"),
          messages: [
            {
              role: "user",
              content: `Title: ${args.title}\n\nDraft:\n${args.content}`,
            },
          ],
        });

        await ctx.runMutation(api.taskProgress.upsertProgress, {
          postId: args.postId,
          userId: args.userId,
          taskType: "review",
          status: "running",
          progress: 10 + ((idx + 1) / personas.length) * 70,
          message: `${persona.name} reviewed...`,
        });

        return parseJson<{
          persona: string;
          strengths: string[];
          issues: Array<{
            priority: string;
            issue: string;
            suggestion: string;
            evidence?: string;
            confidence: number;
          }>;
          questions: string[];
        }>(readText(response));
      })
    );

    // Flatten items
    for (const result of results) {
      const personaId = result.persona.toLowerCase();
      for (const issue of result.issues || []) {
        const priority = ["now", "soon", "optional"].includes(issue.priority)
          ? (issue.priority as "now" | "soon" | "optional")
          : "soon";
        allItems.push({
          persona: personaId,
          priority,
          issue: String(issue.issue || "").trim(),
          suggestion: String(issue.suggestion || "").trim(),
          evidence: issue.evidence ? String(issue.evidence) : undefined,
          confidence: Math.max(
            0,
            Math.min(1, Number(issue.confidence ?? 0.5))
          ),
        });
      }
    }

    // Build summary
    const summary = results
      .map((r) => `${r.persona}: ${r.strengths?.[0] || "No specific strength noted"}`)
      .join("; ");

    await ctx.runMutation(api.reviews.saveReviewResults, {
      runId: args.runId,
      postId: args.postId,
      summary,
      items: allItems.filter((item) => item.issue && item.suggestion),
    });

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "review",
      status: "completed",
      progress: 100,
      message: "Review complete!",
    });

    return { summary, itemCount: allItems.length };
  },
});

export const scanFreshness = action({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    publishedAt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const client = getClient();
    const model = getModel();

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "freshness",
      status: "running",
      progress: 20,
      message: "Scanning for outdated content...",
    });

    const response = await client.messages.create({
      model,
      max_tokens: 1800,
      temperature: 0.2,
      system: [
        "You audit published writing for stale claims and context drift.",
        "Return strict JSON only.",
        "Required shape:",
        '{"suggestions":[{"summary":"string","severity":"low|medium|high","confidence":0.0,"suggestedAction":"notice|addendum|revision","sourceLinks":["https://..."]}]}',
        "Only include suggestions when there is a meaningful chance the published content is now outdated.",
        'If nothing appears outdated, return {"suggestions":[]}.',
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `Title: ${args.title}\nPublished at: ${args.publishedAt ?? "unknown"}\n\nContent:\n${args.content}`,
        },
      ],
    });

    const parsed = parseJson<{
      suggestions: Array<{
        summary: string;
        severity: "low" | "medium" | "high";
        confidence: number;
        suggestedAction: "notice" | "addendum" | "revision";
        sourceLinks: string[];
      }>;
    }>(readText(response));

    if (parsed.suggestions.length > 0) {
      await ctx.runMutation(api.freshness.saveFreshnessResults, {
        postId: args.postId,
        userId: args.userId,
        updates: parsed.suggestions,
      });
    }

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "freshness",
      status: "completed",
      progress: 100,
      message:
        parsed.suggestions.length > 0
          ? `Found ${parsed.suggestions.length} issue(s)`
          : "Content looks fresh!",
    });

    return parsed.suggestions;
  },
});
