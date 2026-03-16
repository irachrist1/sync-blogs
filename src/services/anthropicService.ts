import Anthropic from "@anthropic-ai/sdk";
import type { ToolUnion } from "@anthropic-ai/sdk/resources/messages/messages";
import { parseJsonResponse } from "../lib/json.js";
import { requireAnthropicConfig } from "../lib/env.js";
import type { PersonaOutput, PriorityBucket } from "../orchestrator/types.js";

export interface DraftOptionResult {
  mode: "argument" | "narrative" | "brief";
  titleSuggestion: string;
  draft: string;
}

export interface FreshnessSuggestionResult {
  summary: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  suggestedAction: "notice" | "addendum" | "revision";
  sourceLinks: string[];
}

interface PersonaDefinition {
  name: PersonaOutput["persona"];
  role: string;
  tone: string;
}

const PERSONAS: PersonaDefinition[] = [
  {
    name: "Editor",
    role: "Improve structure, clarity, rhythm, and readability without flattening the author's voice.",
    tone: "Calm, exact, editorial.",
  },
  {
    name: "Skeptic",
    role: "Stress-test assumptions, factual claims, and weak logic. Use web search when necessary to verify factual drift or current claims.",
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

function readTextFromMessage(message: Anthropic.Message): string {
  return message.content
    .filter((block): block is Anthropic.TextBlock => block.type === "text")
    .map((block) => block.text)
    .join("\n")
    .trim();
}

function buildClient(): Anthropic {
  const { apiKey } = requireAnthropicConfig();
  return new Anthropic({ apiKey });
}

function buildWebSearchTools(): ToolUnion[] {
  return [
    {
      type: "web_search_20250305",
      name: "web_search",
      max_uses: 3,
    },
  ];
}

export async function composeWithAnthropic(input: {
  title: string;
  roughInput: string;
  mode?: "argument" | "narrative" | "brief";
}): Promise<DraftOptionResult[]> {
  const { model } = requireAnthropicConfig();
  const client = buildClient();

  const prompt = [
    "You are helping a writer turn rough thoughts into polished but human writing.",
    "Return valid JSON only.",
    "The JSON must be an object with key `options`, where `options` is an array of 1-3 objects.",
    "Each option object must have: `mode`, `titleSuggestion`, `draft`.",
    "The three supported modes are `argument`, `narrative`, and `brief`.",
    "Avoid generic AI tone, filler, corporate cadence, and em-dash overuse.",
    "Preserve specificity and natural phrasing.",
    input.mode ? `Only return the requested mode: ${input.mode}.` : "Return all three modes.",
    `Existing title context: ${input.title || "Untitled draft"}`,
    "Rough thoughts:",
    input.roughInput,
  ].join("\n");

  const response = await client.messages.create({
    model,
    max_tokens: 2200,
    temperature: 0.7,
    system:
      "Output strict JSON only. No markdown. No explanation before or after the JSON object.",
    messages: [{ role: "user", content: prompt }],
  });

  const parsed = parseJsonResponse<{ options: DraftOptionResult[] }>(readTextFromMessage(response));
  return parsed.options;
}

export async function reviewWithAnthropic(input: {
  title: string;
  content: string;
  intensity: "gentle" | "balanced" | "rigorous";
}): Promise<PersonaOutput[]> {
  const { model } = requireAnthropicConfig();
  const client = buildClient();

  const intensityLine =
    input.intensity === "gentle"
      ? "Keep feedback light and limited to the most important improvements."
      : input.intensity === "rigorous"
        ? "Be thorough and demanding, but still supportive and concrete."
        : "Balance encouragement with direct, high-signal critique.";

  const runs = PERSONAS.map(async (persona) => {
    const response = await client.messages.create({
      model,
      max_tokens: 1600,
      temperature: 0.5,
      tools: persona.name === "Skeptic" ? buildWebSearchTools() : undefined,
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
          content: `Title: ${input.title}\n\nDraft:\n${input.content}`,
        },
      ],
    });

    return parseJsonResponse<PersonaOutput>(readTextFromMessage(response));
  });

  return Promise.all(runs);
}

export async function scanFreshnessWithAnthropic(input: {
  title: string;
  content: string;
  publishedAt?: string;
}): Promise<FreshnessSuggestionResult[]> {
  const { model } = requireAnthropicConfig();
  const client = buildClient();

  const response = await client.messages.create({
    model,
    max_tokens: 1800,
    temperature: 0.2,
    tools: buildWebSearchTools(),
    system: [
      "You audit published writing for stale claims and context drift.",
      "Use web search when needed to verify whether versions, facts, product releases, or timelines have changed.",
      "Return strict JSON only.",
      "Required shape:",
      '{"suggestions":[{"summary":"string","severity":"low|medium|high","confidence":0.0,"suggestedAction":"notice|addendum|revision","sourceLinks":["https://..."]}]}',
      "Only include suggestions when there is a meaningful chance the published content is now outdated.",
      "If nothing appears outdated, return {\"suggestions\":[]}.",
    ].join("\n"),
    messages: [
      {
        role: "user",
        content: `Title: ${input.title}\nPublished at: ${input.publishedAt ?? "unknown"}\n\nContent:\n${input.content}`,
      },
    ],
  });

  const parsed = parseJsonResponse<{ suggestions: FreshnessSuggestionResult[] }>(readTextFromMessage(response));
  return parsed.suggestions;
}

export function validatePersonaOutput(output: PersonaOutput): PersonaOutput {
  const normalizedIssues = (output.issues ?? []).map((issue) => ({
    priority: (["now", "soon", "optional"].includes(issue.priority) ? issue.priority : "soon") as PriorityBucket,
    issue: String(issue.issue ?? "").trim(),
    suggestion: String(issue.suggestion ?? "").trim(),
    evidence: issue.evidence ? String(issue.evidence) : undefined,
    confidence: Math.max(0, Math.min(1, Number(issue.confidence ?? 0.5))),
  }));

  return {
    persona: output.persona,
    strengths: (output.strengths ?? []).map((item) => String(item)).filter(Boolean),
    issues: normalizedIssues.filter((item) => item.issue && item.suggestion),
    questions: (output.questions ?? []).map((item) => String(item)).filter(Boolean),
  };
}
