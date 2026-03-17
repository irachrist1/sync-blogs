"use node";

import { v } from "convex/values";
import { action } from "./_generated/server";
import { api } from "./_generated/api";
import Anthropic from "@anthropic-ai/sdk";
import { Id } from "./_generated/dataModel";

function getClient(): Anthropic {
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function getModelForUser(ctx: any, userId?: Id<"users">): Promise<string> {
  if (userId) {
    try {
      const preferred = await ctx.runQuery(api.users.getPreferredModel, { userId }) as string | null;
      if (preferred) return preferred;
    } catch {
      // fall through to default
    }
  }
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
  cleaned = cleaned.replace(/^```(?:json)?\s*\n?/, "");
  cleaned = cleaned.replace(/\n?\s*```\s*$/, "");
  cleaned = cleaned.trim();

  try {
    return JSON.parse(cleaned);
  } catch (e) {
    const jsonMatch = cleaned.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
    if (jsonMatch) {
      try {
        return JSON.parse(jsonMatch[1]);
      } catch {
        let attempt = jsonMatch[1];
        const opens = (attempt.match(/\{/g) || []).length;
        const closes = (attempt.match(/\}/g) || []).length;
        const openBrackets = (attempt.match(/\[/g) || []).length;
        const closeBrackets = (attempt.match(/\]/g) || []).length;

        attempt = attempt.replace(/,\s*"[^"]*$/, "");
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
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, args) => {
    console.log("[clarify] Starting clarifying questions generation");
    console.log("[clarify] Input length:", args.roughInput.length, "chars");
    console.log("[clarify] Has writing profile:", !!args.writingProfile);
    const client = getClient();
    const model = await getModelForUser(ctx, args.userId);

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

    const rawText = readText(response);
    console.log("[clarify] Response length:", rawText.length, "chars");
    console.log("[clarify] Stop reason:", response.stop_reason);

    const parsed = parseJson<{
      questions: Array<{
        id: string;
        question: string;
        options: string[];
        allowCustom: boolean;
      }>;
    }>(rawText);

    console.log("[clarify] Parsed", parsed.questions.length, "questions");
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
    console.log("[compose] Starting draft composition");
    console.log("[compose] Post:", args.postId, "| Title:", args.title);
    console.log("[compose] Input length:", args.roughInput.length, "chars");
    console.log("[compose] Mode:", args.mode ?? "all (argument + narrative + brief)");
    console.log("[compose] Has writing profile:", !!args.writingProfile);
    console.log("[compose] Has clarifying answers:", !!args.clarifyingAnswers);

    const client = getClient();
    const model = await getModelForUser(ctx, args.userId);

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
        "- Follow their formatting habits, capitalization style, and sentence case headers"
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
      // Explicitly honour formattingAvoid — e.g. if the writer chose "em-dashes" during onboarding
      const avoid = args.writingProfile?.formattingAvoid;
      if (Array.isArray(avoid) && avoid.length > 0) {
        profileLines.push(
          `- The writer explicitly avoids these styles: ${avoid.join(", ")}. NEVER use them.`
        );
        if (avoid.includes("em-dashes")) {
          profileLines.push(
            "- NEVER use em-dashes (—) under any circumstances. Use commas, colons, or rewrite the sentence instead."
          );
        }
      }
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
      "The JSON must be an object with key `options`, where `options` is an array of EXACTLY 3 objects.",
      "You MUST return all 3 modes — no fewer. Each draft must be a complete, well-developed article.",
      "Each option object must have: `mode`, `titleSuggestion`, `draft`.",
      "The `draft` field should NOT include the title — it should start with the first paragraph of the body.",
      "Each draft must be at least 800 words. Do not truncate or abbreviate.",
      "The three required modes are `argument`, `narrative`, and `brief`.",
      "Do NOT add filler phrases like 'In conclusion' or 'It's worth noting that'.",
      "Do NOT start sentences with 'Delve' or 'In today's world'.",
      "Do NOT over-explain. Trust the reader.",
      "If the writer writes opinionated content, take a stance — don't hedge.",
      "Use markdown formatting: headers with ##, bold for key terms. Do not use em-dashes (—).",
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

    // Task 4: Cached system prompt for composeDrafts
    const systemContent: any[] = [
      {
        type: "text",
        text: "Output strict JSON only. No markdown. No explanation before or after the JSON object.",
        cache_control: { type: "ephemeral" },
      },
    ];

    let messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: [
          {
            type: "text",
            text: prompt,
            cache_control: { type: "ephemeral" },
          },
        ],
      },
    ];
    let fullText = "";

    console.log("[compose] Prompt length:", prompt.length, "chars");

    for (let attempt = 0; attempt < 3; attempt++) {
      console.log(`[compose] API call attempt ${attempt + 1}/3, max_tokens: 20000`);

      const response = await client.messages.create(
        {
          model,
          max_tokens: 20000,
          temperature: 0.7,
          system: systemContent,
          messages,
        },
        {
          headers: { "anthropic-beta": "prompt-caching-2024-07-31" },
        }
      );

      const chunk = readText(response);
      fullText += chunk;

      console.log(`[compose] Attempt ${attempt + 1}: got ${chunk.length} chars, stop_reason: ${response.stop_reason}, usage: input=${response.usage.input_tokens} output=${response.usage.output_tokens}`);

      // Task 2: Log token usage for each attempt
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx.runMutation((api as any).tokenUsage.logUsage, {
        postId: args.postId,
        userId: args.userId,
        action: "compose",
        model,
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        cacheReadTokens: (response.usage as any).cache_read_input_tokens ?? 0,
        cacheWriteTokens: (response.usage as any).cache_creation_input_tokens ?? 0,
        createdAt: Date.now(),
      }).catch(() => {});  // never throw on logging failure

      if (response.stop_reason === "end_turn") break;

      console.log(`[compose] Response truncated (${response.stop_reason}), requesting continuation...`);
      messages = [
        ...messages,
        { role: "assistant", content: chunk },
        { role: "user", content: "Continue the JSON from exactly where you left off." },
      ];
    }

    console.log("[compose] Total response length:", fullText.length, "chars");

    const parsed = parseJson<{
      options: Array<{
        mode: string;
        titleSuggestion: string;
        draft: string;
      }>;
    }>(fullText);

    console.log("[compose] Parsed", parsed.options.length, "draft options");
    for (const opt of parsed.options) {
      console.log(`[compose]   - mode: ${opt.mode}, title: "${opt.titleSuggestion}", draft length: ${opt.draft.length} chars (~${Math.round(opt.draft.split(/\s+/).length)} words)`);
    }

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "compose",
      status: "running",
      progress: 80,
      message: "Saving drafts...",
    });

    const drafts = parsed.options.map((opt) => ({
      content: opt.draft,
      titleSuggestion: opt.titleSuggestion,
    }));

    await ctx.runMutation(api.revisions.saveDraftOptions, {
      postId: args.postId,
      userId: args.userId,
      drafts,
    });

    // Store draft array in draftProgress so the UI reads from here
    // (avoids revision-query race where getGeneratedDrafts returns wrong results
    // after the user selects a draft and a new generated revision is created)
    await ctx.runMutation(api.posts.saveDraftProgress, {
      postId: args.postId,
      draftProgress: { generatedDrafts: drafts },
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
    writingProfile: v.optional(v.any()),  // Task 3
  },
  handler: async (ctx, args) => {
    console.log("[review] Starting review for post:", args.postId);
    console.log("[review] Intensity:", args.intensity);
    console.log("[review] Content length:", args.content.length, "chars");

    const client = getClient();
    const model = await getModelForUser(ctx, args.userId);

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "review",
      status: "running",
      progress: 10,
      message: "Starting review...",
    });

    // Task 3: Extract formattingAvoid and build constraint string
    const formattingAvoidList = Array.isArray(args.writingProfile?.formattingAvoid)
      ? args.writingProfile.formattingAvoid as string[]
      : [];
    const avoidInstruction = formattingAvoidList.length > 0
      ? `\n\nIMPORTANT: The writer explicitly avoids these styles: ${formattingAvoidList.join(", ")}. When writing suggestions, do NOT suggest or introduce these patterns.${formattingAvoidList.includes("em-dashes") ? " Never use em-dashes (—) in your feedback text." : ""}`
      : "";

    const personas = [
      {
        name: "Craft",
        id: "craft",
        role: "Review structure, clarity, rhythm, readability, and tone. Catch awkward phrasing, weak openings, redundancy, and pacing issues.",
      },
      {
        name: "Truth",
        id: "truth",
        role: "Stress-test claims, logic, and audience fit. Flag unsupported assertions, logical gaps, and anything that might confuse or lose the reader.",
      },
    ];

    const maxItems = args.intensity === "gentle" ? 3 : args.intensity === "rigorous" ? 6 : 4;

    const allItems: Array<{
      persona: string;
      priority: "now" | "soon" | "optional";
      issue: string;
      suggestion: string;
      evidence?: string;
      confidence: number;
    }> = [];

    const results = await Promise.all(
      personas.map(async (persona, idx) => {
        console.log(`[review] Running persona: ${persona.name}`);

        // Task 4: Cached system prompt for each persona call
        const systemContent: any[] = [
          {
            type: "text",
            text: [
              `You are a writing reviewer called "${persona.name}" in a private blogging app.`,
              `Your focus: ${persona.role}`,
              "",
              "IMPORTANT TONE RULES:",
              "- Write like a smart friend giving feedback over coffee, NOT like an AI.",
              '- Use first person: "I noticed...", "I think...", "How about..."',
              "- Be specific — quote the exact words or section you're referring to.",
              "- Keep each issue to 1-2 sentences. No filler, no flattery, no hedging.",
              "- Don't repeat yourself. Each item must be a distinct, actionable point.",
              `- Return at most ${maxItems} items. Only the most impactful ones.`,
              "- If the writing is good, return fewer items. Don't invent problems.",
              "",
              "Return strict JSON only.",
              "Required shape:",
              `{"persona":"${persona.id}","items":[{"priority":"now|soon|optional","issue":"string","suggestion":"string","evidence":"optional quoted text from the draft","confidence":0.0-1.0}]}`,
              "",
              "Examples of good issue/suggestion pairs:",
              '- issue: "Your opening feels generic — \\"In today\'s world\\" doesn\'t hook anyone."',
              '  suggestion: "Try leading with your strongest claim or a surprising stat."',
              '- issue: "I noticed you mention \\"studies show\\" twice without citing anything specific."',
              '  suggestion: "Either name the study or drop the appeal to authority — your argument is strong enough without it."',
              avoidInstruction,
            ].join("\n"),
            cache_control: { type: "ephemeral" },
          },
        ];

        const response = await client.messages.create(
          {
            model,
            max_tokens: 2000,
            temperature: 0.4,
            system: systemContent,
            messages: [
              {
                role: "user",
                content: `Title: ${args.title}\n\nDraft:\n${args.content}`,
              },
            ],
          },
          {
            headers: { "anthropic-beta": "prompt-caching-2024-07-31" },
          }
        );

        await ctx.runMutation(api.taskProgress.upsertProgress, {
          postId: args.postId,
          userId: args.userId,
          taskType: "review",
          status: "running",
          progress: 10 + ((idx + 1) / personas.length) * 70,
          message: `${persona.name} reviewed...`,
        });

        const rawText = readText(response);
        console.log(`[review] ${persona.name} done: ${rawText.length} chars, usage: input=${response.usage.input_tokens} output=${response.usage.output_tokens}`);

        // Task 2: Log token usage for each persona
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        ctx.runMutation((api as any).tokenUsage.logUsage, {
          postId: args.postId,
          userId: args.userId,
          action: "review",
          model,
          inputTokens: response.usage.input_tokens,
          outputTokens: response.usage.output_tokens,
          cacheReadTokens: (response.usage as any).cache_read_input_tokens ?? 0,
          cacheWriteTokens: (response.usage as any).cache_creation_input_tokens ?? 0,
          createdAt: Date.now(),
        }).catch(() => {});  // never throw on logging failure

        return parseJson<{
          persona: string;
          items: Array<{
            priority: string;
            issue: string;
            suggestion: string;
            evidence?: string;
            confidence: number;
          }>;
        }>(rawText);
      })
    );

    console.log("[review] All personas complete");

    for (const result of results) {
      const personaId = result.persona || "craft";
      for (const issue of result.items || []) {
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

    const summary = `${allItems.length} suggestion${allItems.length === 1 ? "" : "s"} from review`;

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

    console.log("[review] Complete:", allItems.length, "issues found");
    return { summary, itemCount: allItems.length };
  },
});

export const applyReviewFix = action({
  args: {
    postId: v.id("posts"),
    userId: v.id("users"),
    itemId: v.id("reviewItems"),
    content: v.string(),
    issue: v.string(),
    suggestion: v.string(),
    writingProfile: v.optional(v.any()),  // Task 3
  },
  handler: async (ctx, args) => {
    console.log("[apply-fix] Applying review fix for item:", args.itemId);
    const client = getClient();
    const model = await getModelForUser(ctx, args.userId);

    // Task 3: Extract formattingAvoid
    const formattingAvoidList = Array.isArray(args.writingProfile?.formattingAvoid)
      ? args.writingProfile.formattingAvoid as string[]
      : [];

    // Initialise progress so the frontend can subscribe to stream updates
    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "review",
      status: "running",
      progress: 10,
      message: "Applying fix…",
      streamContent: "",
    });

    let accumulated = "";
    let lastFlush = Date.now();

    // Stream the response so the editor can show text appearing in real-time
    const stream = await client.messages.stream({
      model,
      max_tokens: 8000,
      temperature: 0.3,
      system: [
        "You apply a specific editorial fix to an article.",
        "You receive the full article, an identified issue, and the suggested fix.",
        "Apply ONLY that specific change. Do not rewrite, restructure, or alter anything else.",
        "Preserve the author's voice, formatting, and all other content exactly as-is.",
        "Return the complete modified article text and nothing else — no preamble, no commentary.",
        ...(formattingAvoidList.length > 0 ? [`The writer avoids: ${formattingAvoidList.join(", ")}. Preserve this in your output.`] : []),
      ].join("\n"),
      messages: [
        {
          role: "user",
          content: `Article:\n${args.content}\n\n---\nIssue to fix: ${args.issue}\nSuggested fix: ${args.suggestion}\n\nReturn the full modified article.`,
        },
      ],
    });

    for await (const event of stream) {
      if (
        event.type === "content_block_delta" &&
        event.delta.type === "text_delta"
      ) {
        accumulated += event.delta.text;
        const now = Date.now();
        // Flush to DB roughly every 150ms so the UI streams smoothly
        if (now - lastFlush > 150) {
          await ctx.runMutation(api.taskProgress.setStreamContent, {
            postId: args.postId,
            taskType: "review",
            streamContent: accumulated,
          });
          lastFlush = now;
        }
      }
    }

    const newContent = accumulated.trim();
    console.log("[apply-fix] Streamed", newContent.length, "chars");

    // Final flush so the UI always gets the complete content
    await ctx.runMutation(api.taskProgress.setStreamContent, {
      postId: args.postId,
      taskType: "review",
      streamContent: newContent,
    });

    // Task 2: Log token usage for applyReviewFix (get final message from stream)
    try {
      const finalMessage = await stream.finalMessage();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ctx.runMutation((api as any).tokenUsage.logUsage, {
        postId: args.postId,
        userId: args.userId,
        action: "applyFix",
        model,
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        cacheReadTokens: (finalMessage.usage as any).cache_read_input_tokens ?? 0,
        cacheWriteTokens: (finalMessage.usage as any).cache_creation_input_tokens ?? 0,
        createdAt: Date.now(),
      }).catch(() => {});  // never throw on logging failure
    } catch {
      // Don't let token logging failure break the apply fix
    }

    await ctx.runMutation(api.revisions.saveRevision, {
      postId: args.postId,
      userId: args.userId,
      content: newContent,
      source: "generated",
    });

    await ctx.runMutation(api.reviews.applyReviewDecision, {
      itemId: args.itemId,
      actionStatus: "accepted",
    });

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "review",
      status: "completed",
      progress: 100,
      message: "Fix applied",
      streamContent: "",
    });

    return newContent;
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
    console.log("[freshness] Starting scan for post:", args.postId);
    console.log("[freshness] Content length:", args.content.length, "chars");

    const client = getClient();
    const model = await getModelForUser(ctx, args.userId);

    await ctx.runMutation(api.taskProgress.upsertProgress, {
      postId: args.postId,
      userId: args.userId,
      taskType: "freshness",
      status: "running",
      progress: 20,
      message: "Scanning for outdated content...",
    });

    const systemPrompt = [
      "You audit published writing for stale claims and context drift.",
      "Use the web_search tool to verify specific version numbers or facts before claiming they are outdated. Do not guess.",
      "After researching, return strict JSON only.",
      "Required shape:",
      '{"suggestions":[{"summary":"string","severity":"low|medium|high","confidence":0.0,"suggestedAction":"notice|addendum|revision","sourceLinks":["https://..."]}]}',
      "Only include suggestions when there is a meaningful chance the published content is now outdated.",
      'If nothing appears outdated, return {"suggestions":[]}.',
    ].join("\n");

    // Anthropic's built-in web search tool — no external API key needed.
    // The API executes searches server-side and returns results inline.
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const webSearchTool: any = { type: "web_search_20250305", name: "web_search" };

    const response = await client.messages.create({
      model,
      max_tokens: 4000,
      temperature: 0.2,
      system: systemPrompt,
      tools: [webSearchTool],
      messages: [
        {
          role: "user",
          content: `Title: ${args.title}\nPublished at: ${args.publishedAt ?? "unknown"}\n\nContent:\n${args.content}`,
        },
      ],
    });

    console.log("[freshness] Response stop_reason:", response.stop_reason);
    const finalText = readText(response);

    // Task 2: Log token usage for scanFreshness
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    ctx.runMutation((api as any).tokenUsage.logUsage, {
      postId: args.postId,
      userId: args.userId,
      action: "freshness",
      model,
      inputTokens: response.usage.input_tokens,
      outputTokens: response.usage.output_tokens,
      cacheReadTokens: (response.usage as any).cache_read_input_tokens ?? 0,
      cacheWriteTokens: (response.usage as any).cache_creation_input_tokens ?? 0,
      createdAt: Date.now(),
    }).catch(() => {});  // never throw on logging failure

    const parsed = parseJson<{
      suggestions: Array<{
        summary: string;
        severity: "low" | "medium" | "high";
        confidence: number;
        suggestedAction: "notice" | "addendum" | "revision";
        sourceLinks: string[];
      }>;
    }>(finalText || '{"suggestions":[]}');

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

    console.log("[freshness] Found", parsed.suggestions.length, "suggestions");
    return parsed.suggestions;
  },
});
