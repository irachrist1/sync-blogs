import express from "express";
import type { Request, Response, NextFunction } from "express";
import { join } from "node:path";
import { AppService } from "./services/appService.js";
import { AuthService } from "./services/authService.js";
import { generateClarifyingQuestions } from "./services/anthropicService.js";

const app = express();
const service = new AppService();
const auth = new AuthService();
const port = Number(process.env.PORT ?? 4000);
const publicDir = join(process.cwd(), "public");

app.use(express.json({ limit: "1mb" }));
app.use(express.static(publicDir, { index: false }));

/* ===== AUTH MIDDLEWARE ===== */

interface AuthRequest extends Request {
  userId?: string;
}

function requireAuth(req: AuthRequest, res: Response, next: NextFunction): void {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    res.status(401).json({ error: "Authentication required" });
    return;
  }
  const token = header.slice(7);
  const user = auth.validateToken(token);
  if (!user) {
    res.status(401).json({ error: "Invalid or expired session" });
    return;
  }
  req.userId = user.id;
  next();
}

/* ===== HEALTH ===== */

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sync-blogs", date: new Date().toISOString() });
});

/* ===== AUTH ENDPOINTS ===== */

app.post("/v1/auth/register", (req, res) => {
  try {
    const { email, password, name } = req.body ?? {};
    const result = auth.register(email ?? "", password ?? "", name ?? "");
    return res.status(201).json({
      token: result.token,
      user: AuthService.safeUser(result.user),
    });
  } catch (err) {
    return res.status(400).json({ error: err instanceof Error ? err.message : "Registration failed" });
  }
});

app.post("/v1/auth/login", (req, res) => {
  try {
    const { email, password } = req.body ?? {};
    const result = auth.login(email ?? "", password ?? "");
    return res.status(200).json({
      token: result.token,
      user: AuthService.safeUser(result.user),
    });
  } catch (err) {
    return res.status(401).json({ error: err instanceof Error ? err.message : "Login failed" });
  }
});

app.post("/v1/auth/logout", requireAuth, (req: AuthRequest, res: Response) => {
  const header = req.headers.authorization;
  if (header) {
    auth.logout(header.slice(7));
  }
  return res.json({ ok: true });
});

app.get("/v1/auth/me", requireAuth, (req: AuthRequest, res: Response) => {
  const user = auth.getUser(req.userId!);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: AuthService.safeUser(user) });
});

/* ===== ONBOARDING & WRITING PROFILE ===== */

app.post("/v1/auth/onboarding", requireAuth, (req: AuthRequest, res: Response) => {
  const { writingProfile } = req.body ?? {};
  if (!writingProfile) return res.status(400).json({ error: "writingProfile is required" });
  const user = auth.completeOnboarding(req.userId!, writingProfile);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: AuthService.safeUser(user) });
});

app.patch("/v1/auth/writing-profile", requireAuth, (req: AuthRequest, res: Response) => {
  const profile = req.body ?? {};
  const user = auth.updateWritingProfile(req.userId!, profile);
  if (!user) return res.status(404).json({ error: "User not found" });
  return res.json({ user: AuthService.safeUser(user) });
});

/* ===== RUNTIME ===== */

app.get("/v1/runtime", (_req, res) => {
  return res.json(service.getRuntimeStatus());
});

/* ===== POSTS ===== */

app.get("/v1/posts", requireAuth, (req: AuthRequest, res: Response) => {
  const status = req.query.status as "draft" | "published" | "archived" | undefined;
  return res.json(service.listPosts(req.userId!, status));
});

app.post("/v1/posts", requireAuth, (req: AuthRequest, res: Response) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  return res.status(201).json(service.createPost(req.userId!, title));
});

app.get("/v1/posts/:postId", requireAuth, (req: AuthRequest, res: Response) => {
  const row = service.getPost(req.params.postId as string);
  if (!row) return res.status(404).json({ error: "post not found" });
  return res.json(row);
});

app.patch("/v1/posts/:postId", requireAuth, (req: AuthRequest, res: Response) => {
  const row = service.updatePost(req.params.postId as string, {
    title: req.body?.title,
    status: req.body?.status,
    visibility: req.body?.visibility,
    tags: req.body?.tags,
    monitorFreshness: req.body?.monitorFreshness,
  });
  if (!row) return res.status(404).json({ error: "post not found" });
  return res.json(row);
});

/* ===== DRAFT PROGRESS (cross-device persistence) ===== */

app.patch("/v1/posts/:postId/progress", requireAuth, (req: AuthRequest, res: Response) => {
  const postId = req.params.postId as string;
  const { roughInput, clarifyingQuestions, clarifyingAnswers } = req.body ?? {};
  const post = service.saveDraftProgress(postId, {
    roughInput,
    clarifyingQuestions,
    clarifyingAnswers,
  });
  if (!post) return res.status(404).json({ error: "post not found" });
  return res.json({ ok: true, draftProgress: post.draftProgress });
});

/* ===== REVISIONS ===== */

app.post("/v1/posts/:postId/revisions", requireAuth, (req: AuthRequest, res: Response) => {
  const content = String(req.body?.content ?? "");
  const source = req.body?.source as "manual" | "generated" | "imported" | undefined;
  if (!content.trim()) return res.status(400).json({ error: "content is required" });
  const revision = service.saveRevision(req.params.postId as string, content, source ?? "manual");
  if (!revision) return res.status(404).json({ error: "post not found" });
  return res.status(201).json(revision);
});

/* ===== CLARIFYING QUESTIONS ===== */

app.post("/v1/posts/:postId/clarify", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const roughInput = String(req.body?.roughInput ?? "");
    if (!roughInput.trim()) return res.status(400).json({ error: "roughInput is required" });

    const user = auth.getUser(req.userId!);
    const writingProfile = user?.writingProfile ?? {};

    const questions = await generateClarifyingQuestions({
      roughInput,
      writingProfile: writingProfile as Record<string, unknown>,
    });

    // Save clarifying questions to draft progress for cross-device persistence
    service.saveDraftProgress(req.params.postId as string, {
      roughInput,
      clarifyingQuestions: questions,
    });

    return res.json({ questions });
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Failed to generate questions" });
  }
});

/* ===== COMPOSE ===== */

app.post("/v1/posts/:postId/compose", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const roughInput = String(req.body?.roughInput ?? "");
    if (!roughInput.trim()) return res.status(400).json({ error: "roughInput is required" });
    const mode = req.body?.mode as "argument" | "narrative" | "brief" | undefined;

    const user = auth.getUser(req.userId!);
    const writingProfile = user?.writingProfile ?? {};
    const clarifyingAnswers = req.body?.clarifyingAnswers as Record<string, string> | undefined;

    const revisions = await service.composeDraft(
      req.params.postId as string,
      roughInput,
      mode,
      writingProfile as Record<string, unknown>,
      clarifyingAnswers,
    );
    if (!revisions) return res.status(404).json({ error: "post not found" });

    // Clear draft progress after successful generation (draft is now created)
    service.saveDraftProgress(req.params.postId as string, {
      roughInput: undefined,
      clarifyingQuestions: undefined,
      clarifyingAnswers: undefined,
    });

    return res.json(revisions);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Compose failed" });
  }
});

/* ===== REVIEW ===== */

app.post("/v1/posts/:postId/review-runs", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const intensity = req.body?.intensity as "gentle" | "balanced" | "rigorous" | undefined;
    const result = await service.triggerReviewRun(req.params.postId as string, intensity ?? "balanced");
    if (!result) return res.status(404).json({ error: "post or revision not found" });
    return res.status(202).json(result);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Review failed" });
  }
});

app.get("/v1/review-runs/:runId", requireAuth, (req: AuthRequest, res: Response) => {
  const row = service.getReviewRun(req.params.runId as string);
  if (!row) return res.status(404).json({ error: "run not found" });
  return res.json(row);
});

app.post("/v1/review-items/:itemId/decision", requireAuth, (req: AuthRequest, res: Response) => {
  const decision = req.body?.decision as "accepted" | "dismissed" | "pinned" | undefined;
  if (!decision) return res.status(400).json({ error: "decision is required" });
  const updated = service.applyReviewDecision(req.params.itemId as string, decision);
  if (!updated) return res.status(404).json({ error: "item not found" });
  return res.json(updated);
});

/* ===== PUBLISH ===== */

app.post("/v1/posts/:postId/publish", requireAuth, (req: AuthRequest, res: Response) => {
  const visibility = (req.body?.visibility as "private" | "public" | undefined) ?? "private";
  const monitorFreshness = Boolean(req.body?.monitorFreshness ?? true);
  const row = service.publishPost(req.params.postId as string, visibility, monitorFreshness);
  if (!row) return res.status(404).json({ error: "post not found" });
  return res.json(row);
});

/* ===== FRESHNESS ===== */

app.post("/v1/posts/:postId/freshness-scan", requireAuth, async (req: AuthRequest, res: Response) => {
  try {
    const rows = await service.runFreshnessScan(req.params.postId as string);
    return res.json(rows);
  } catch (err) {
    return res.status(500).json({ error: err instanceof Error ? err.message : "Freshness scan failed" });
  }
});

app.get("/v1/freshness/updates", requireAuth, (req: AuthRequest, res: Response) => {
  const status = req.query.status as "needs_review" | "approved" | "dismissed" | "snoozed" | undefined;
  return res.json(service.listFreshnessUpdates(status));
});

app.post("/v1/freshness/updates/:updateId/decision", requireAuth, (req: AuthRequest, res: Response) => {
  const decision = req.body?.decision as
    | "approve_notice"
    | "approve_addendum"
    | "open_revision"
    | "dismiss"
    | "snooze"
    | undefined;
  if (!decision) return res.status(400).json({ error: "decision is required" });
  const row = service.applyFreshnessDecision(req.params.updateId as string, decision, req.body?.note);
  if (!row) return res.status(404).json({ error: "update not found" });
  return res.json(row);
});

/* ===== SETTINGS ===== */

app.get("/v1/settings", requireAuth, (_req, res) => {
  return res.json(service.getSettings());
});

app.patch("/v1/settings", requireAuth, (req, res) => {
  const versionWatchlist = (req.body?.versionWatchlist ?? {}) as Record<string, string>;
  return res.json(service.updateWatchlist(versionWatchlist));
});

/* ===== STATIC PAGES ===== */

// Landing page at root
app.get("/", (_req, res) => {
  return res.sendFile("landing.html", { root: publicDir });
});

// Existing app at /app
app.get("/app", (_req, res) => {
  return res.sendFile("index.html", { root: publicDir });
});

// Catch-all: serve app shell for any other non-API route (SPA fallback)
app.get(/.*/, (_req, res) => {
  return res.sendFile("index.html", { root: publicDir });
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Sync Blogs app listening on http://localhost:${port}`);
});
