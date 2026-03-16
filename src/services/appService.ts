import { createHash, randomUUID } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { aggregatePersonaIssues } from "../orchestrator/aggregate.js";
import type { PriorityBucket } from "../orchestrator/types.js";
import { classifyDriftSeverity } from "../freshness/severity.js";
import { getAnthropicConfig } from "../lib/env.js";
import {
  composeWithAnthropic,
  reviewWithAnthropic,
  scanFreshnessWithAnthropic,
  validatePersonaOutput,
  type FreshnessSuggestionResult,
} from "./anthropicService.js";

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
    voiceProfile: Record<string, string>;
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
    voiceProfile: {},
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

  async composeDraft(
    postId: string,
    roughInput: string,
    mode?: "argument" | "narrative" | "brief",
  ): Promise<RevisionRecord[] | null> {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;

    console.log(`[appService] composeDraft: postId=${postId}, mode=${mode || "all"}`);
    const options = await composeWithAnthropic({
      title: post.title,
      roughInput,
      mode,
      voiceProfile: this.state.settings.voiceProfile,
    });
    const created: RevisionRecord[] = [];
    for (const option of options) {
      // Store draft body without title to avoid duplication
      const revision = this.saveRevision(postId, option.draft, "generated");
      if (revision) {
        // Attach titleSuggestion as metadata on the revision object for the frontend
        (revision as RevisionRecord & { titleSuggestion?: string }).titleSuggestion = option.titleSuggestion;
        created.push(revision);
      }
    }
    return created;
  }

  async triggerReviewRun(
    postId: string,
    intensity: "gentle" | "balanced" | "rigorous" = "balanced",
  ): Promise<
    | {
        run: ReviewRunRecord;
        ranked: ReviewItemRecord[];
        personaOutputs: ReturnType<typeof validatePersonaOutput>[];
      }
    | null
  > {
    const post = this.state.posts.find((p) => p.id === postId);
    if (!post) return null;

    const latestRevision = this.getLatestRevision(postId);
    if (!latestRevision) return null;

    const rawOutputs = await reviewWithAnthropic({
      title: post.title,
      content: latestRevision.content,
      intensity,
    });
    const personaOutputs = rawOutputs.map((item) => validatePersonaOutput(item));
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

  async runFreshnessScan(postId?: string): Promise<FreshnessUpdateRecord[]> {
    const published = this.state.posts.filter(
      (p) => p.status === "published" && p.monitorFreshness && (!postId || p.id === postId),
    );

    const created: FreshnessUpdateRecord[] = [];
    for (const post of published) {
      const latest = this.getLatestRevision(post.id);
      if (!latest) continue;
      let suggestions: FreshnessSuggestionResult[] = [];

      try {
        suggestions = await scanFreshnessWithAnthropic({
          title: post.title,
          content: latest.content,
          publishedAt: post.publishedAt,
        });
      } catch (error) {
        suggestions = this.scanFreshnessFallback(latest.content);

        if (suggestions.length === 0) {
          throw error;
        }
      }

      for (const suggestion of suggestions) {
        const existing = this.state.freshnessUpdates.find(
          (u) =>
            u.postId === post.id &&
            u.summary === suggestion.summary &&
            (u.status === "needs_review" || u.status === "snoozed"),
        );
        if (existing) continue;

        const row: FreshnessUpdateRecord = {
          id: randomUUID(),
          postId: post.id,
          severity: suggestion.severity,
          confidence: suggestion.confidence,
          suggestedAction: suggestion.suggestedAction,
          summary: suggestion.summary,
          sourceLinks: suggestion.sourceLinks,
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

  getRuntimeStatus(): {
    anthropicConfigured: boolean;
    model: string;
  } {
    const config = getAnthropicConfig();
    return {
      anthropicConfigured: Boolean(config.apiKey),
      model: config.model,
    };
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

  updateVoiceProfile(voiceProfile: Record<string, string>): StoreState["settings"] {
    const cleaned: Record<string, string> = {};
    for (const [key, value] of Object.entries(voiceProfile)) {
      const cleanKey = String(key).trim();
      const cleanValue = String(value).trim();
      if (cleanKey) cleaned[cleanKey] = cleanValue;
    }
    this.state.settings.voiceProfile = cleaned;
    this.persist();
    return this.state.settings;
  }

  private getLatestRevision(postId: string): RevisionRecord | null {
    const rows = this.state.revisions
      .filter((r) => r.postId === postId)
      .sort((a, b) => b.revisionNumber - a.revisionNumber);
    return rows[0] ?? null;
  }

  private scanFreshnessFallback(content: string): FreshnessSuggestionResult[] {
    const versionRegex = /\b([A-Za-z][A-Za-z0-9+\-]*)\s+(\d+\.\d+)\b/g;
    const found = [...content.matchAll(versionRegex)];
    const suggestions: FreshnessSuggestionResult[] = [];

    for (const match of found) {
      const product = normalize(match[1]);
      const mentioned = match[2];
      const knownLatest = this.state.settings.versionWatchlist[product];
      if (!knownLatest) continue;
      if (versionCmp(mentioned, knownLatest) >= 0) continue;

      const confidence = 0.82;
      suggestions.push({
        summary: `Version reference may be outdated: ${match[1]} ${mentioned} vs watchlist ${knownLatest}.`,
        severity: classifyDriftSeverity({
          confidence,
          claimType: "version",
          trafficTier: "medium",
        }),
        confidence,
        suggestedAction: "notice",
        sourceLinks: [],
      });
    }

    return suggestions;
  }
}
