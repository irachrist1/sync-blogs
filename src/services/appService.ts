import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { aggregatePersonaIssues } from "../orchestrator/aggregate.js";
import type { PersonaOutput, PriorityBucket } from "../orchestrator/types.js";
import { composeDraftOptions, type ComposeMode } from "../composer/compose.js";
import { classifyDriftSeverity } from "../freshness/severity.js";

type PostStatus = "draft" | "published" | "archived";
type Visibility = "private" | "public";
type ReviewAction = "open" | "accepted" | "dismissed" | "pinned";
type FreshnessStatus = "needs_review" | "approved" | "dismissed" | "snoozed";
type SuggestedAction = "notice" | "addendum" | "revision";

export interface PostRecord {
  id: string;
  title: string;
  status: PostStatus;
  visibility: Visibility;
  createdAt: string;
  updatedAt: string;
  publishedAt?: string;
  tags: string[];
  monitorFreshness: boolean;
}

export interface RevisionRecord {
  id: string;
  postId: string;
  revisionNumber: number;
  content: string;
  contentHash: string;
  source: "manual" | "generated" | "imported";
  createdAt: string;
}

export interface ReviewRunRecord {
  id: string;
  postId: string;
  revisionId: string;
  intensity: "gentle" | "balanced" | "rigorous";
  createdAt: string;
  completedAt: string;
  summary: string;
}

export interface ReviewItemRecord {
  id: string;
  runId: string;
  postId: string;
  persona: string;
  priority: PriorityBucket;
  issue: string;
  suggestion: string;
  evidence?: string;
  confidence: number;
  actionStatus: ReviewAction;
  createdAt: string;
}

export interface FreshnessUpdateRecord {
  id: string;
  postId: string;
  severity: "low" | "medium" | "high";
  confidence: number;
  suggestedAction: SuggestedAction;
  summary: string;
  sourceLinks: string[];
  status: FreshnessStatus;
  decidedAt?: string;
  decisionNote?: string;
  createdAt: string;
}

interface StoreState {
  posts: PostRecord[];
  revisions: RevisionRecord[];
  reviewRuns: ReviewRunRecord[];
  reviewItems: ReviewItemRecord[];
  freshnessUpdates: FreshnessUpdateRecord[];
  settings: {
    versionWatchlist: Record<string, string>;
  };
}

const DEFAULT_STORE: StoreState = {
  posts: [],
  revisions: [],
  reviewRuns: [],
  reviewItems: [],
  freshnessUpdates: [],
  settings: {
    versionWatchlist: {
      codex: "5.3",
    },
  },
};

function safeNow(): string {
  return new Date().toISOString();
}

function versionCmp(a: string, b: string): number {
  const aParts = a.split(".").map((n) => Number(n));
  const bParts = b.split(".").map((n) => Number(n));
  const len = Math.max(aParts.length, bParts.length);

  for (let i = 0; i < len; i += 1) {
    const av = aParts[i] ?? 0;
    const bv = bParts[i] ?? 0;
    if (av > bv) return 1;
    if (av < bv) return -1;
  }
  return 0;
}

function normalize(str: string): string {
  return str.trim().toLowerCase();
}

function textStats(content: string): { words: number; paragraphs: number } {
  const words = content.trim().split(/\s+/).filter(Boolean).length;
  const paragraphs = content
    .split(/\n{2,}/g)
    .map((p) => p.trim())
    .filter(Boolean).length;
  return { words, paragraphs };
}

function buildPersonaOutputs(content: string): PersonaOutput[] {
  const { words, paragraphs } = textStats(content);
  const lower = content.toLowerCase();
  const hasAbsoluteClaims = /\b(always|never|everyone|nobody)\b/i.test(content);
  const hasQuestion = content.includes("?");
  const hasHeavyDash = (content.match(/—/g) ?? []).length >= 3;
  const hasVersionMention = /\b[A-Za-z][A-Za-z0-9+-]*\s+\d+\.\d+\b/.test(content);

  const outputs: PersonaOutput[] = [
    {
      persona: "Editor",
      strengths: [
        words > 120 ? "You have enough material to shape a strong article." : "The core direction is clear.",
      ],
      issues: [
        ...(words < 120
          ? [
              {
                priority: "now" as const,
                issue: "The draft is short for a full article.",
                suggestion: "Add one concrete example and one specific takeaway.",
                evidence: `Current length is about ${words} words.`,
                confidence: 0.86,
              },
            ]
          : []),
        ...(paragraphs < 3
          ? [
              {
                priority: "soon" as const,
                issue: "The structure is dense.",
                suggestion: "Split ideas into 3-5 paragraphs with one key point each.",
                confidence: 0.74,
              },
            ]
          : []),
        ...(hasHeavyDash
          ? [
              {
                priority: "optional" as const,
                issue: "Punctuation pattern feels repetitive.",
                suggestion: "Reduce em-dash usage and vary sentence rhythm.",
                confidence: 0.7,
              },
            ]
          : []),
      ],
      questions: ["What should the reader remember one day later?"],
    },
    {
      persona: "Skeptic",
      strengths: ["The argument has a clear direction."],
      issues: [
        ...(hasAbsoluteClaims
          ? [
              {
                priority: "now" as const,
                issue: "There are absolute claims that may be too strong.",
                suggestion: "Replace absolutes with bounded language and one supporting source.",
                confidence: 0.81,
              },
            ]
          : []),
        ...(hasVersionMention
          ? [
              {
                priority: "soon" as const,
                issue: "Version-based claims can age quickly.",
                suggestion: "Add a date-stamped context note to future-proof this section.",
                confidence: 0.72,
              },
            ]
          : []),
      ],
      questions: ["What is the strongest counterargument to your core claim?"],
    },
    {
      persona: "Empath",
      strengths: ["The intent feels authentic."],
      issues: [
        ...(lower.includes("you should")
          ? [
              {
                priority: "soon" as const,
                issue: "Some lines may read as prescriptive.",
                suggestion: 'Use framing like "one option is..." to keep tone collaborative.',
                confidence: 0.68,
              },
            ]
          : []),
      ],
      questions: ["Which line best captures what you actually feel about this topic?"],
    },
    {
      persona: "Philosopher",
      strengths: ["There is a meaningful idea worth developing."],
      issues: [],
      questions: [
        hasQuestion
          ? "Which question in this draft deserves deeper exploration?"
          : "What deeper question sits under this argument?",
      ],
    },
    {
      persona: "Coach",
      strengths: ["You already have momentum."],
      issues: [
        {
          priority: "optional" as const,
          issue: "Closing could convert insight into action more directly.",
          suggestion: "End with one concrete next step the reader can apply today.",
          confidence: 0.62,
        },
      ],
      questions: ["What is the smallest next edit that would materially improve this draft?"],
    },
  ];

  return outputs;
}

export class AppService {
  private readonly storePath: string;

  private state: StoreState = structuredClone(DEFAULT_STORE);

  constructor(storePath = `${process.cwd()}/data/store.json`) {
    this.storePath = storePath;
    this.load();
  }

  private load(): void {
    if (!existsSync(this.storePath)) {
      this.persist();
      return;
    }

    const raw = readFileSync(this.storePath, "utf8").trim();
    if (!raw) {
      this.persist();
      return;
    }

    const parsed = JSON.parse(raw) as Partial<StoreState>;
    this.state = {
      ...structuredClone(DEFAULT_STORE),
      ...parsed,
      settings: {
        ...DEFAULT_STORE.settings,
        ...(parsed.settings ?? {}),
      },
    };
  }

  private persist(): void {
    mkdirSync(dirname(this.storePath), { recursive: true });
    writeFileSync(this.storePath, JSON.stringify(this.state, null, 2), "utf8");
  }

  listPosts(status?: PostStatus): PostRecord[] {
    const rows = status ? this.state.posts.filter((p) => p.status === status) : this.state.posts;
    return [...rows].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  }

  createPost(title: string): PostRecord {
    const now = safeNow();
    const post: PostRecord = {
      id: randomUUID(),
      title,
      status: "draft",
      visibility: "private",
      createdAt: now,
      updatedAt: now,
      tags: [],
      monitorFreshness: true,
    };
    this.state.posts.push(post);
    this.persist();
    return post;
  }

  getPost(postId: string): { post: PostRecord; latestRevision: RevisionRecord | null } | null {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;
    const latestRevision = this.getLatestRevision(postId);
    return { post, latestRevision };
  }

  updatePost(
    postId: string,
    update: Partial<Pick<PostRecord, "title" | "status" | "visibility" | "tags" | "monitorFreshness">>,
  ): PostRecord | null {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;
    if (typeof update.title === "string" && update.title.trim()) post.title = update.title.trim();
    if (update.status) post.status = update.status;
    if (update.visibility) post.visibility = update.visibility;
    if (Array.isArray(update.tags)) post.tags = update.tags.filter(Boolean);
    if (typeof update.monitorFreshness === "boolean") post.monitorFreshness = update.monitorFreshness;
    post.updatedAt = safeNow();
    this.persist();
    return post;
  }

  saveRevision(
    postId: string,
    content: string,
    source: "manual" | "generated" | "imported" = "manual",
  ): RevisionRecord | null {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;

    const revisionNumber = this.state.revisions.filter((r) => r.postId === postId).length + 1;
    const now = safeNow();
    const revision: RevisionRecord = {
      id: randomUUID(),
      postId,
      revisionNumber,
      content,
      contentHash: createHash("sha256").update(content).digest("hex"),
      source,
      createdAt: now,
    };

    this.state.revisions.push(revision);
    post.updatedAt = now;
    this.persist();
    return revision;
  }

  composeDraft(postId: string, roughInput: string, mode?: ComposeMode): RevisionRecord[] | null {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;

    const options = composeDraftOptions({ roughInput, mode });
    const created: RevisionRecord[] = [];
    for (const option of options) {
      const body = `${option.titleSuggestion}\n\n${option.draft}`;
      const revision = this.saveRevision(postId, body, "generated");
      if (revision) created.push(revision);
    }
    return created;
  }

  triggerReviewRun(
    postId: string,
    intensity: "gentle" | "balanced" | "rigorous" = "balanced",
  ):
    | {
        run: ReviewRunRecord;
        ranked: ReviewItemRecord[];
        personaOutputs: PersonaOutput[];
      }
    | null {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;

    const latestRevision = this.getLatestRevision(postId);
    if (!latestRevision) return null;

    const personaOutputs = buildPersonaOutputs(latestRevision.content);
    const maxItems = intensity === "gentle" ? 3 : intensity === "rigorous" ? 8 : 5;
    const ranked = aggregatePersonaIssues(personaOutputs, { maxItems, dedupeByIssue: true });

    const run: ReviewRunRecord = {
      id: randomUUID(),
      postId,
      revisionId: latestRevision.id,
      intensity,
      createdAt: safeNow(),
      completedAt: safeNow(),
      summary:
        ranked.length > 0
          ? `Top priority: ${ranked[0].issue}`
          : "No major issues detected. Consider optional improvements.",
    };
    this.state.reviewRuns.push(run);

    const items: ReviewItemRecord[] = ranked.map((item) => ({
      id: randomUUID(),
      runId: run.id,
      postId,
      persona: item.persona,
      priority: item.priority,
      issue: item.issue,
      suggestion: item.suggestion,
      evidence: item.evidence,
      confidence: item.confidence,
      actionStatus: "open",
      createdAt: safeNow(),
    }));
    this.state.reviewItems.push(...items);
    this.persist();

    return { run, ranked: items, personaOutputs };
  }

  getReviewRun(runId: string): { run: ReviewRunRecord; items: ReviewItemRecord[] } | null {
    const run = this.state.reviewRuns.find((r) => r.id === runId);
    if (!run) return null;
    const items = this.state.reviewItems.filter((i) => i.runId === runId);
    return { run, items };
  }

  applyReviewDecision(itemId: string, decision: ReviewAction): ReviewItemRecord | null {
    const item = this.state.reviewItems.find((i) => i.id === itemId);
    if (!item) return null;
    item.actionStatus = decision;
    this.persist();
    return item;
  }

  publishPost(
    postId: string,
    visibility: Visibility,
    monitorFreshness = true,
  ): PostRecord | null {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;
    const now = safeNow();
    post.status = "published";
    post.visibility = visibility;
    post.publishedAt = post.publishedAt ?? now;
    post.updatedAt = now;
    post.monitorFreshness = monitorFreshness;
    this.persist();
    return post;
  }

  runFreshnessScan(postId?: string): FreshnessUpdateRecord[] {
    const published = this.state.posts.filter(
      (p) => p.status === "published" && p.monitorFreshness && (!postId || p.id === postId),
    );

    const created: FreshnessUpdateRecord[] = [];
    for (const post of published) {
      const latest = this.getLatestRevision(post.id);
      if (!latest) continue;
      const content = latest.content;

      const versionRegex = /\b([A-Za-z][A-Za-z0-9+\-]*)\s+(\d+\.\d+)\b/g;
      const found = [...content.matchAll(versionRegex)];
      for (const match of found) {
        const product = normalize(match[1]);
        const mentioned = match[2];
        const knownLatest = this.state.settings.versionWatchlist[product];
        if (!knownLatest) continue;
        if (versionCmp(mentioned, knownLatest) >= 0) continue;

        const summary = `Version reference may be outdated: ${match[1]} ${mentioned} vs watchlist ${knownLatest}.`;
        const existing = this.state.freshnessUpdates.find(
          (u) =>
            u.postId === post.id &&
            u.summary === summary &&
            (u.status === "needs_review" || u.status === "snoozed"),
        );
        if (existing) continue;

        const confidence = 0.82;
        const severity = classifyDriftSeverity({
          confidence,
          claimType: "version",
          trafficTier: "medium",
        });
        const row: FreshnessUpdateRecord = {
          id: randomUUID(),
          postId: post.id,
          severity,
          confidence,
          suggestedAction: "notice",
          summary,
          sourceLinks: [],
          status: "needs_review",
          createdAt: safeNow(),
        };
        this.state.freshnessUpdates.push(row);
        created.push(row);
      }
    }

    if (created.length > 0) this.persist();
    return created;
  }

  listFreshnessUpdates(status?: FreshnessStatus): FreshnessUpdateRecord[] {
    const rows = status
      ? this.state.freshnessUpdates.filter((u) => u.status === status)
      : this.state.freshnessUpdates;
    return [...rows].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
  }

  applyFreshnessDecision(
    updateId: string,
    decision: "approve_notice" | "approve_addendum" | "open_revision" | "dismiss" | "snooze",
    note?: string,
  ): FreshnessUpdateRecord | null {
    const update = this.state.freshnessUpdates.find((u) => u.id === updateId);
    if (!update) return null;

    if (decision === "dismiss") update.status = "dismissed";
    if (decision === "snooze") update.status = "snoozed";
    if (decision === "approve_notice" || decision === "approve_addendum" || decision === "open_revision") {
      update.status = "approved";
    }
    update.decidedAt = safeNow();
    if (note) update.decisionNote = note;
    this.persist();
    return update;
  }

  getSettings(): StoreState["settings"] {
    return this.state.settings;
  }

  updateWatchlist(versionWatchlist: Record<string, string>): StoreState["settings"] {
    const normalized: Record<string, string> = {};
    for (const [key, value] of Object.entries(versionWatchlist)) {
      const cleanKey = normalize(key);
      const cleanValue = String(value).trim();
      if (!cleanKey || !cleanValue) continue;
      normalized[cleanKey] = cleanValue;
    }
    this.state.settings.versionWatchlist = normalized;
    this.persist();
    return this.state.settings;
  }

  private getLatestRevision(postId: string): RevisionRecord | null {
    const rows = this.state.revisions
      .filter((r) => r.postId === postId)
      .sort((a, b) => b.revisionNumber - a.revisionNumber);
    return rows[0] ?? null;
  }
}
