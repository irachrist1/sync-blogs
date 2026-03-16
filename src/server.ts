import express from "express";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { AppService } from "./services/appService.js";

const app = express();
const service = new AppService();
const port = Number(process.env.PORT ?? 4000);
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

app.use(express.json({ limit: "1mb" }));

// Request logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  const method = req.method;
  const url = req.originalUrl;
  console.log(`[${new Date().toISOString()}] → ${method} ${url}`);
  res.on("finish", () => {
    const duration = Date.now() - start;
    console.log(`[${new Date().toISOString()}] ← ${method} ${url} ${res.statusCode} (${duration}ms)`);
  });
  next();
});

app.use(express.static(join(__dirname, "..", "public")));

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "sync-blogs", date: new Date().toISOString() });
});

app.get("/v1/runtime", (_req, res) => {
  return res.json(service.getRuntimeStatus());
});

app.get("/v1/posts", (req, res) => {
  const status = req.query.status as "draft" | "published" | "archived" | undefined;
  return res.json(service.listPosts(status));
});

app.post("/v1/posts", (req, res) => {
  const title = String(req.body?.title ?? "").trim();
  if (!title) return res.status(400).json({ error: "title is required" });
  return res.status(201).json(service.createPost(title));
});

app.get("/v1/posts/:postId", (req, res) => {
  const row = service.getPost(req.params.postId);
  if (!row) return res.status(404).json({ error: "post not found" });
  return res.json(row);
});

app.patch("/v1/posts/:postId", (req, res) => {
  const row = service.updatePost(req.params.postId, {
    title: req.body?.title,
    status: req.body?.status,
    visibility: req.body?.visibility,
    tags: req.body?.tags,
    monitorFreshness: req.body?.monitorFreshness,
  });
  if (!row) return res.status(404).json({ error: "post not found" });
  return res.json(row);
});

app.post("/v1/posts/:postId/revisions", (req, res) => {
  const content = String(req.body?.content ?? "");
  const source = req.body?.source as "manual" | "generated" | "imported" | undefined;
  if (!content.trim()) return res.status(400).json({ error: "content is required" });
  const revision = service.saveRevision(req.params.postId, content, source ?? "manual");
  if (!revision) return res.status(404).json({ error: "post not found" });
  return res.status(201).json(revision);
});

app.post("/v1/posts/:postId/compose", async (req, res) => {
  try {
    const roughInput = String(req.body?.roughInput ?? "");
    if (!roughInput.trim()) return res.status(400).json({ error: "roughInput is required" });
    const mode = req.body?.mode as "argument" | "narrative" | "brief" | undefined;
    const revisions = await service.composeDraft(req.params.postId, roughInput, mode);
    if (!revisions) return res.status(404).json({ error: "post not found" });
    return res.json(revisions);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Compose failed" });
  }
});

app.post("/v1/posts/:postId/review-runs", async (req, res) => {
  try {
    const intensity = req.body?.intensity as "gentle" | "balanced" | "rigorous" | undefined;
    const result = await service.triggerReviewRun(req.params.postId, intensity ?? "balanced");
    if (!result) return res.status(404).json({ error: "post or revision not found" });
    return res.status(202).json(result);
  } catch (error) {
    return res.status(500).json({ error: error instanceof Error ? error.message : "Review failed" });
  }
});

app.get("/v1/review-runs/:runId", (req, res) => {
  const row = service.getReviewRun(req.params.runId);
  if (!row) return res.status(404).json({ error: "run not found" });
  return res.json(row);
});

app.post("/v1/review-items/:itemId/decision", (req, res) => {
  const decision = req.body?.decision as "accepted" | "dismissed" | "pinned" | undefined;
  if (!decision) return res.status(400).json({ error: "decision is required" });
  const updated = service.applyReviewDecision(req.params.itemId, decision);
  if (!updated) return res.status(404).json({ error: "item not found" });
  return res.json(updated);
});

app.post("/v1/posts/:postId/publish", (req, res) => {
  const visibility = (req.body?.visibility as "private" | "public" | undefined) ?? "private";
  const monitorFreshness = Boolean(req.body?.monitorFreshness ?? true);
  const row = service.publishPost(req.params.postId, visibility, monitorFreshness);
  if (!row) return res.status(404).json({ error: "post not found" });
  return res.json(row);
});

app.post("/v1/posts/:postId/freshness-scan", async (req, res) => {
  try {
    const rows = await service.runFreshnessScan(req.params.postId);
    return res.json(rows);
  } catch (error) {
    return res
      .status(500)
      .json({ error: error instanceof Error ? error.message : "Freshness scan failed" });
  }
});

app.get("/v1/freshness/updates", (req, res) => {
  const status = req.query.status as "needs_review" | "approved" | "dismissed" | "snoozed" | undefined;
  return res.json(service.listFreshnessUpdates(status));
});

app.post("/v1/freshness/updates/:updateId/decision", (req, res) => {
  const decision = req.body?.decision as
    | "approve_notice"
    | "approve_addendum"
    | "open_revision"
    | "dismiss"
    | "snooze"
    | undefined;
  if (!decision) return res.status(400).json({ error: "decision is required" });
  const row = service.applyFreshnessDecision(req.params.updateId, decision, req.body?.note);
  if (!row) return res.status(404).json({ error: "update not found" });
  return res.json(row);
});

app.get("/v1/settings", (_req, res) => {
  return res.json(service.getSettings());
});

app.patch("/v1/settings", (req, res) => {
  if (req.body?.versionWatchlist) {
    const versionWatchlist = req.body.versionWatchlist as Record<string, string>;
    service.updateWatchlist(versionWatchlist);
  }
  if (req.body?.voiceProfile) {
    const voiceProfile = req.body.voiceProfile as Record<string, string>;
    service.updateVoiceProfile(voiceProfile);
  }
  return res.json(service.getSettings());
});

app.get(/.*/, (_req, res) => {
  return res.sendFile(join(__dirname, "..", "public", "index.html"));
});

app.listen(port, () => {
  // eslint-disable-next-line no-console
  console.log(`Sync Blogs app listening on http://localhost:${port}`);
});
