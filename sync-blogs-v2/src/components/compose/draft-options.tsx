"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

interface DraftOptionsProps {
  postId: Id<"posts">;
  drafts: Array<{ content: string; titleSuggestion?: string }>;
  onBack: () => void;
}

const DRAFT_META = [
  {
    mode: "Argument",
    desc: "Thesis-driven, persuasive structure",
    borderColor: "#2d6a4f",
    chipBg: "rgba(45,106,79,0.08)",
    chipText: "#2d6a4f",
  },
  {
    mode: "Narrative",
    desc: "Story arc, personal journey",
    borderColor: "#3b6cb8",
    chipBg: "rgba(59,108,184,0.08)",
    chipText: "#3b6cb8",
  },
  {
    mode: "Brief",
    desc: "Concise, punchy, quick-take",
    borderColor: "#996c1d",
    chipBg: "rgba(153,108,29,0.08)",
    chipText: "#996c1d",
  },
];

function wordCount(text: string): number {
  return text.trim().split(/\s+/).filter(Boolean).length;
}

export function DraftOptions({ postId, drafts, onBack }: DraftOptionsProps) {
  const { user } = useCurrentUser();
  const saveRevision = useMutation(api.revisions.saveRevision);
  const updatePost = useMutation(api.posts.updatePost);
  const saveDraftProgress = useMutation(api.posts.saveDraftProgress);
  const router = useRouter();

  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);
  const [selectingIdx, setSelectingIdx] = useState<number | null>(null);

  const handleSelectDraft = async (
    draft: { content: string; titleSuggestion?: string },
    idx: number
  ) => {
    if (!user) return;
    setSelectingIdx(idx);

    await saveRevision({
      postId,
      userId: user._id,
      content: draft.content,
      source: "generated",
      titleSuggestion: draft.titleSuggestion,
    });

    if (draft.titleSuggestion) {
      await updatePost({ postId, title: draft.titleSuggestion });
    }

    await saveDraftProgress({
      postId,
      draftProgress: {
        draftChosen: true,
        generatedDrafts: [],  // clear so Switch Draft doesn't auto-jump back here
      },
    });

    router.push(`/app/${postId}`);
  };

  if (drafts.length === 0) {
    return (
      <div className="drafts-container">
        <p className="text-[var(--color-muted-app)]">No drafts generated yet.</p>
      </div>
    );
  }

  return (
    <div className="drafts-container">
      <h2>Pick an approach</h2>
      <p className="drafts-subtitle">
        Each takes a different angle. Read enough to feel which one fits.
      </p>

      <div className="draft-options-list">
        {drafts.map((draft, idx) => {
          const meta = DRAFT_META[idx] ?? { mode: `Draft ${idx + 1}`, desc: "", borderColor: "#888", chipBg: "rgba(0,0,0,0.06)", chipText: "#555" };
          const isExpanded = expandedIdx === idx;
          const isSelecting = selectingIdx === idx;
          const wc = wordCount(draft.content);
          const previewChars = isExpanded ? 1200 : 420;
          const previewText = draft.content.slice(0, previewChars);
          const isTruncated = draft.content.length > previewChars;

          return (
            <div
              key={idx}
              className="draft-card-v2"
              style={{ borderLeftColor: meta.borderColor }}
            >
              <div className="draft-card-top">
                <span
                  className="draft-mode-chip"
                  style={{ background: meta.chipBg, color: meta.chipText }}
                >
                  {meta.mode}
                </span>
                <span className="draft-mode-desc">{meta.desc}</span>
              </div>

              {draft.titleSuggestion && (
                <h3 className="draft-card-title">{draft.titleSuggestion}</h3>
              )}

              <div className="draft-card-preview">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {previewText}
                </ReactMarkdown>
                {isTruncated && !isExpanded && <span className="draft-preview-fade" />}
              </div>

              <div className="draft-card-footer">
                <div className="draft-card-meta">
                  {isTruncated && (
                    <button
                      className="draft-read-more"
                      onClick={() => setExpandedIdx(isExpanded ? null : idx)}
                    >
                      {isExpanded ? "Show less" : "Read more"}
                    </button>
                  )}
                  <span className="draft-word-count">{wc.toLocaleString()} words</span>
                </div>

                <button
                  className={`btn-primary-action draft-select-btn${isSelecting ? " is-generating" : ""}`}
                  onClick={() => handleSelectDraft(draft, idx)}
                  disabled={selectingIdx !== null && selectingIdx !== idx}
                >
                  {isSelecting && <span className="btn-spinner" />}
                  <span className="btn-label">
                    {isSelecting ? "Opening\u2026" : "Use this draft"}
                  </span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="drafts-back">
        <button className="btn-ghost-sm" onClick={onBack}>
          &larr; Back to questions
        </button>
      </div>
    </div>
  );
}
