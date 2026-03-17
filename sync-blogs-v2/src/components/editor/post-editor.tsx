"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAction, useMutation, useQuery } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";
import { SaveStatus } from "./save-status";
import { PublishDialog } from "../publish/publish-dialog";
import { PERSONAS, PRIORITY_LABELS } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface PostEditorProps {
  postId: Id<"posts">;
  post: Doc<"posts"> & {
    latestRevision: Doc<"revisions"> | null;
  };
}

const priorityStyles: Record<string, string> = {
  now: "review-priority-now",
  soon: "review-priority-soon",
  optional: "review-priority-optional",
};

export function PostEditor({ postId, post }: PostEditorProps) {
  const { user } = useCurrentUser();
  const router = useRouter();

  const updatePost = useMutation(api.posts.updatePost);
  const saveRevision = useMutation(api.revisions.saveRevision);
  const saveDraftProgress = useMutation(api.posts.saveDraftProgress);
  const createReviewRun = useMutation(api.reviews.createReviewRun);
  const applyDecision = useMutation(api.reviews.applyReviewDecision);
  const runReview = useAction(api.ai.runReview);
  const scanFreshness = useAction(api.ai.scanFreshness);
  const applyFix = useAction(api.ai.applyReviewFix);

  const existingRuns = useQuery(api.reviews.listReviewRunsByPost, { postId });
  const latestCompletedRun = existingRuns?.find((r) => r.completedAt);
  const hasCompletedReview = !!latestCompletedRun;
  const runData = useQuery(
    api.reviews.getReviewRun,
    latestCompletedRun ? { runId: latestCompletedRun._id } : "skip"
  );

  // Subscribe to task progress for streaming
  const reviewProgress = useQuery(api.taskProgress.getProgress, {
    postId,
    taskType: "review",
  });

  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(post.latestRevision?.content ?? "");
  const [saveState, setSaveState] = useState<"saved" | "saving" | "unsaved">("saved");
  const [publishOpen, setPublishOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [reviewError, setReviewError] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [viewMode, setViewMode] = useState<"edit" | "preview">("edit");
  const [reviewPanelOpen, setReviewPanelOpen] = useState(false);
  const [applyingItemId, setApplyingItemId] = useState<Id<"reviewItems"> | null>(null);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef(content);

  // When a fix finishes streaming, update local content state
  const prevStreamStatus = useRef<string | undefined>(undefined);
  useEffect(() => {
    const status = reviewProgress?.status;
    const streamContent = reviewProgress?.streamContent;
    // Transition from running → completed: pick up the final content
    if (
      prevStreamStatus.current === "running" &&
      status === "completed" &&
      streamContent === "" // cleared on completion
    ) {
      // content is already updated in handleGotIt when the action returns
    }
    prevStreamStatus.current = status;
  }, [reviewProgress?.status, reviewProgress?.streamContent]);

  // Live stream content — what the AI has written so far
  const streamContent = reviewProgress?.streamContent ?? "";
  const isStreaming =
    !!applyingItemId &&
    reviewProgress?.status === "running" &&
    streamContent.length > 0;

  const debouncedSave = useCallback(
    (newContent: string) => {
      if (!user) return;
      if (saveTimer.current) clearTimeout(saveTimer.current);
      setSaveState("unsaved");

      saveTimer.current = setTimeout(async () => {
        if (newContent === lastSavedContent.current) return;
        setSaveState("saving");
        try {
          await saveRevision({
            postId,
            userId: user._id,
            content: newContent,
            source: "manual",
          });
          lastSavedContent.current = newContent;
          setSaveState("saved");
        } catch {
          setSaveState("unsaved");
        }
      }, 1500);
    },
    [user, postId, saveRevision]
  );

  useEffect(() => {
    return () => {
      if (saveTimer.current) clearTimeout(saveTimer.current);
    };
  }, []);

  const handleContentChange = (value: string) => {
    setContent(value);
    debouncedSave(value);
  };

  const handleTitleChange = (value: string) => {
    setTitle(value);
    updatePost({ postId, title: value });
  };

  const handleReview = async () => {
    if (!user || !post.latestRevision) return;
    setReviewError(null);

    if (hasCompletedReview) {
      setReviewPanelOpen(true);
      return;
    }

    setIsReviewing(true);

    try {
      const runId = await createReviewRun({
        postId,
        userId: user._id,
        revisionId: post.latestRevision._id,
        intensity: "balanced",
      });

      await runReview({
        runId,
        postId,
        userId: user._id,
        title,
        content,
        intensity: "balanced",
      });

      setReviewPanelOpen(true);
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[editor] Review failed:", msg);
      setReviewError(msg);
    } finally {
      setIsReviewing(false);
    }
  };

  const handleFreshnessScan = async () => {
    if (!user) return;
    setIsScanning(true);

    try {
      await scanFreshness({
        postId,
        userId: user._id,
        title,
        content,
        publishedAt: post.publishedAt
          ? new Date(post.publishedAt).toISOString()
          : undefined,
      });
    } catch (err) {
      console.error("[editor] Freshness scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  const handleGotIt = async (item: Doc<"reviewItems">) => {
    if (!user) return;
    setApplyingItemId(item._id);
    try {
      const newContent = await applyFix({
        postId,
        userId: user._id,
        itemId: item._id,
        content,
        issue: item.issue,
        suggestion: item.suggestion,
      });
      if (newContent) {
        setContent(newContent);
        lastSavedContent.current = newContent;
        setSaveState("saved");
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      console.error("[editor] Apply fix failed:", msg);
      setReviewError(msg);
    } finally {
      setApplyingItemId(null);
    }
  };

  const handleSkip = (itemId: Id<"reviewItems">) => {
    applyDecision({ itemId, actionStatus: "dismissed" });
  };

  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  const isPublished = post.status === "published";
  const isGeneratedDraft = post.latestRevision?.source === "generated";
  const reviewLabel = hasCompletedReview ? "View review" : "Review this draft";
  const actionLabel = isPublished ? "Check freshness" : reviewLabel;
  const actionLoading = isPublished ? isScanning : isReviewing;
  const handleAction = isPublished ? handleFreshnessScan : handleReview;

  const reviewItems = runData?.items ?? [];
  const openItems = reviewItems.filter((i) => i.actionStatus === "open");
  const allResolved = reviewItems.length > 0 && openItems.length === 0;

  // Display content: stream in progress → show what AI has written so far
  const displayContent = isStreaming ? streamContent : content;

  return (
    <div className={reviewPanelOpen ? "editor-panel-layout" : ""}>
      <div className="editor-container">
        <header className="editor-topbar">
          <textarea
            ref={titleRef}
            value={title}
            onChange={(e) => handleTitleChange(e.target.value)}
            placeholder="What are you trying to say?"
            className="title-input"
            rows={1}
          />
          <div className="editor-status">
            <SaveStatus state={saveState} />
          </div>
        </header>

        {/* Error banner */}
        {reviewError && (
          <div className="editor-error-banner">
            <span>⚠ {reviewError}</span>
            <button onClick={() => setReviewError(null)}>✕</button>
          </div>
        )}

        <div className="editor-view-tabs">
          <button
            className={`editor-tab${viewMode === "edit" ? " active" : ""}`}
            onClick={() => setViewMode("edit")}
          >
            Edit
          </button>
          <button
            className={`editor-tab${viewMode === "preview" ? " active" : ""}`}
            onClick={() => setViewMode("preview")}
          >
            Preview
          </button>
        </div>

        {/* Content area — streaming replaces the textarea */}
        {isStreaming ? (
          <div className="streaming-editor">
            <div className="streaming-label">
              <span className="streaming-dot" />
              Applying fix…
            </div>
            <div className="streaming-content">
              <ReactMarkdown remarkPlugins={[remarkGfm]}>
                {displayContent}
              </ReactMarkdown>
              <span className="streaming-cursor" />
            </div>
          </div>
        ) : viewMode === "edit" ? (
          <textarea
            value={content}
            onChange={(e) => handleContentChange(e.target.value)}
            placeholder="Start writing..."
            className="content-input"
          />
        ) : (
          <div className="content-preview">
            {content ? (
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
            ) : (
              <p className="content-preview-empty">Nothing to preview yet.</p>
            )}
          </div>
        )}

        <div className="editor-footer">
          {isGeneratedDraft && !isPublished && (
            <button
              className="btn-ghost-sm"
              onClick={() =>
                saveDraftProgress({
                  postId,
                  draftProgress: { draftChosen: false },
                })
              }
            >
              Switch draft
            </button>
          )}
          {post.status === "draft" && (
            <button onClick={() => setPublishOpen(true)} className="btn-ghost-sm">
              Publish
            </button>
          )}
          <button
            onClick={handleAction}
            disabled={actionLoading || !content.trim()}
            className={`btn-primary-action${actionLoading ? " is-generating" : ""}`}
          >
            {actionLoading && <span className="btn-spinner" />}
            <span className="btn-label">
              {actionLoading
                ? isPublished
                  ? "Scanning\u2026"
                  : "Reviewing\u2026"
                : actionLabel}
            </span>
          </button>
        </div>

        <PublishDialog
          postId={postId}
          open={publishOpen}
          onOpenChange={setPublishOpen}
        />
      </div>

      {reviewPanelOpen && (
        <div className="review-side-panel">
          <div className="review-panel-header">
            <div>
              <h3 className="review-panel-title">Review feedback</h3>
              <p className="review-panel-subtitle">
                {openItems.length} remaining · {reviewItems.length} total
              </p>
            </div>
            <button
              className="review-panel-close"
              onClick={() => setReviewPanelOpen(false)}
              title="Close panel"
            >
              ✕
            </button>
          </div>

          <div className="review-panel-items">
            {allResolved && (
              <div className="review-panel-done">
                <span className="review-done-check">✓</span>
                <p>All feedback addressed.</p>
                <button
                  className="btn-ghost-sm"
                  onClick={() => setReviewPanelOpen(false)}
                >
                  Back to editing
                </button>
              </div>
            )}

            {!allResolved &&
              reviewItems.map((item) => {
                const isResolved = item.actionStatus !== "open";
                const persona = PERSONAS.find((p) => p.id === item.persona);
                const isApplying = applyingItemId === item._id;

                return (
                  <div
                    key={item._id}
                    className={`review-panel-item${isResolved ? " resolved" : ""}`}
                  >
                    <div className="review-item-header">
                      <span
                        className="review-persona-dot"
                        style={{ backgroundColor: persona?.color ?? "#888" }}
                        title={persona?.name ?? item.persona}
                      />
                      <span
                        className={`review-priority-badge ${priorityStyles[item.priority] ?? ""}`}
                      >
                        {PRIORITY_LABELS[item.priority]}
                      </span>
                    </div>
                    <div className="review-item-issue">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {item.issue}
                      </ReactMarkdown>
                    </div>
                    <div className="review-item-suggestion">
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {item.suggestion}
                      </ReactMarkdown>
                    </div>
                    {item.evidence && (
                      <p className="review-item-evidence">
                        &ldquo;{item.evidence}&rdquo;
                      </p>
                    )}
                    {!isResolved && (
                      <div className="review-item-actions">
                        <button
                          className={`review-action-accept${isApplying ? " is-applying" : ""}`}
                          onClick={() => handleGotIt(item)}
                          disabled={!!applyingItemId}
                        >
                          {isApplying ? "Applying\u2026" : "Got it"}
                        </button>
                        <button
                          className="review-action-dismiss"
                          onClick={() => handleSkip(item._id)}
                          disabled={!!applyingItemId}
                        >
                          Skip
                        </button>
                      </div>
                    )}
                    {isResolved && (
                      <span className="review-item-status">
                        {item.actionStatus}
                      </span>
                    )}
                  </div>
                );
              })}

            {reviewItems.length === 0 && (
              <p className="review-panel-empty">No feedback items yet.</p>
            )}
          </div>

          <div className="review-panel-footer">
            <button
              className="btn-ghost-sm"
              onClick={() => router.push(`/app/${postId}/review`)}
            >
              Full review page →
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
