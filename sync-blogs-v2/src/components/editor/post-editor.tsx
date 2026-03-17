"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { useAction, useMutation } from "convex/react";
import { useRouter } from "next/navigation";
import { api } from "../../../convex/_generated/api";
import { Id, Doc } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";
import { SaveStatus } from "./save-status";
import { PublishDialog } from "../publish/publish-dialog";

interface PostEditorProps {
  postId: Id<"posts">;
  post: Doc<"posts"> & {
    latestRevision: Doc<"revisions"> | null;
  };
}

export function PostEditor({ postId, post }: PostEditorProps) {
  const { user } = useCurrentUser();
  const router = useRouter();

  const updatePost = useMutation(api.posts.updatePost);
  const saveRevision = useMutation(api.revisions.saveRevision);
  const createReviewRun = useMutation(api.reviews.createReviewRun);
  const runReview = useAction(api.ai.runReview);
  const scanFreshness = useAction(api.ai.scanFreshness);

  const [title, setTitle] = useState(post.title);
  const [content, setContent] = useState(
    post.latestRevision?.content ?? ""
  );
  const [saveState, setSaveState] = useState<
    "saved" | "saving" | "unsaved"
  >("saved");
  const [publishOpen, setPublishOpen] = useState(false);
  const [isReviewing, setIsReviewing] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedContent = useRef(content);

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

      router.push(`/app/${postId}/review`);
    } catch (err) {
      console.error("Review failed:", err);
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
      console.error("Freshness scan failed:", err);
    } finally {
      setIsScanning(false);
    }
  };

  // Auto-grow title textarea
  const titleRef = useRef<HTMLTextAreaElement>(null);
  useEffect(() => {
    if (titleRef.current) {
      titleRef.current.style.height = "auto";
      titleRef.current.style.height = titleRef.current.scrollHeight + "px";
    }
  }, [title]);

  const actionLabel = post.status === "published" ? "Check freshness" : "Review this draft";
  const actionLoading = post.status === "published" ? isScanning : isReviewing;
  const handleAction = post.status === "published" ? handleFreshnessScan : handleReview;

  return (
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

      <textarea
        value={content}
        onChange={(e) => handleContentChange(e.target.value)}
        placeholder="Start writing..."
        className="content-input"
      />

      <div className="editor-footer">
        {post.status === "draft" && (
          <button
            onClick={() => setPublishOpen(true)}
            className="btn-ghost-sm"
          >
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
              ? (post.status === "published" ? "Scanning\u2026" : "Reviewing\u2026")
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
  );
}
