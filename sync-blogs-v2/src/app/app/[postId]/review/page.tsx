"use client";

import { useParams, useRouter } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id, Doc } from "../../../../../convex/_generated/dataModel";
import { PERSONAS, PRIORITY_LABELS } from "@/lib/constants";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

const priorityStyles: Record<string, string> = {
  now: "review-priority-now",
  soon: "review-priority-soon",
  optional: "review-priority-optional",
};

function ReviewFeedbackItem({
  item,
  onDecision,
}: {
  item: Doc<"reviewItems">;
  onDecision: (
    itemId: Doc<"reviewItems">["_id"],
    status: "accepted" | "dismissed"
  ) => void;
}) {
  const isResolved = item.actionStatus !== "open";
  const persona = PERSONAS.find((p) => p.id === item.persona);

  return (
    <div className={`review-item${isResolved ? " review-item-resolved" : ""}`}>
      <div className="review-item-header">
        <span
          className="review-persona-dot"
          style={{ backgroundColor: persona?.color ?? "#888" }}
          title={persona?.name ?? item.persona}
        />
        <span className={`review-priority-badge ${priorityStyles[item.priority] ?? ""}`}>
          {PRIORITY_LABELS[item.priority]}
        </span>
      </div>
      <div className="review-item-issue">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.issue}</ReactMarkdown>
      </div>
      <div className="review-item-suggestion">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{item.suggestion}</ReactMarkdown>
      </div>
      {item.evidence && (
        <p className="review-item-evidence">&ldquo;{item.evidence}&rdquo;</p>
      )}
      {!isResolved && (
        <div className="review-item-actions">
          <button
            className="review-action-accept"
            onClick={() => onDecision(item._id, "accepted")}
          >
            Got it
          </button>
          <button
            className="review-action-dismiss"
            onClick={() => onDecision(item._id, "dismissed")}
          >
            Skip
          </button>
        </div>
      )}
      {isResolved && (
        <span className="review-item-status">{item.actionStatus}</span>
      )}
    </div>
  );
}

export default function ReviewPage() {
  const params = useParams();
  const router = useRouter();
  const postId = params.postId as Id<"posts">;

  const runs = useQuery(api.reviews.listReviewRunsByPost, { postId });
  const latestRun = runs?.[0];
  const runData = useQuery(
    api.reviews.getReviewRun,
    latestRun ? { runId: latestRun._id } : "skip"
  );

  const applyDecision = useMutation(api.reviews.applyReviewDecision);

  const handleDecision = (
    itemId: Doc<"reviewItems">["_id"],
    actionStatus: "accepted" | "dismissed"
  ) => {
    applyDecision({ itemId, actionStatus });
  };

  if (!runs) {
    return (
      <div className="review-container">
        <div className="review-loading">
          <div className="review-loading-dot" />
          <div className="review-loading-dot" />
          <div className="review-loading-dot" />
        </div>
      </div>
    );
  }

  if (!latestRun || !runData) {
    return (
      <div className="review-container">
        <div className="review-empty">
          <p>No reviews yet for this post.</p>
          <button
            className="btn-ghost-sm"
            onClick={() => router.push(`/app/${postId}`)}
          >
            Back to editor
          </button>
        </div>
      </div>
    );
  }

  const items = runData.items ?? [];
  const nowItems = items.filter((i) => i.priority === "now");
  const soonItems = items.filter((i) => i.priority === "soon");
  const optionalItems = items.filter((i) => i.priority === "optional");
  const allResolved = items.every((i) => i.actionStatus !== "open");

  return (
    <div className="review-container">
      <header className="review-header">
        <button
          className="review-back-link"
          onClick={() => router.push(`/app/${postId}`)}
        >
          &larr; Back to editor
        </button>
        <h2 className="review-title">Review feedback</h2>
        <p className="review-subtitle">
          {items.length} suggestion{items.length === 1 ? "" : "s"} &middot;{" "}
          {items.filter((i) => i.actionStatus === "open").length} remaining
        </p>
      </header>

      <div className="review-items">
        {nowItems.length > 0 && (
          <>
            <div className="review-section-label">Worth fixing now</div>
            {nowItems.map((item) => (
              <ReviewFeedbackItem
                key={item._id}
                item={item}
                onDecision={handleDecision}
              />
            ))}
          </>
        )}
        {soonItems.length > 0 && (
          <>
            <div className="review-section-label">Consider soon</div>
            {soonItems.map((item) => (
              <ReviewFeedbackItem
                key={item._id}
                item={item}
                onDecision={handleDecision}
              />
            ))}
          </>
        )}
        {optionalItems.length > 0 && (
          <>
            <div className="review-section-label">Nice to have</div>
            {optionalItems.map((item) => (
              <ReviewFeedbackItem
                key={item._id}
                item={item}
                onDecision={handleDecision}
              />
            ))}
          </>
        )}
      </div>

      <div className="review-footer">
        {allResolved ? (
          <button
            className="btn-primary-action"
            onClick={() => router.push(`/app/${postId}`)}
          >
            <span className="btn-label">Back to editing</span>
          </button>
        ) : (
          <button
            className="btn-ghost-sm"
            onClick={() => router.push(`/app/${postId}`)}
          >
            Done reviewing
          </button>
        )}
      </div>
    </div>
  );
}
