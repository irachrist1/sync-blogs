"use client";

import { useRouter } from "next/navigation";
import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Id } from "../../../convex/_generated/dataModel";
import { useCurrentUser } from "@/hooks/use-current-user";

interface DraftOptionsProps {
  postId: Id<"posts">;
  drafts: Array<{ content: string; titleSuggestion?: string }>;
  onBack: () => void;
}

const DRAFT_LABELS = [
  { mode: "Argument", desc: "Thesis-driven, persuasive structure" },
  { mode: "Narrative", desc: "Story arc, personal journey" },
  { mode: "Brief", desc: "Concise, punchy, quick-take" },
];

export function DraftOptions({ postId, drafts, onBack }: DraftOptionsProps) {
  const { user } = useCurrentUser();
  const saveRevision = useMutation(api.revisions.saveRevision);
  const router = useRouter();

  const handleSelectDraft = async (draft: {
    content: string;
    titleSuggestion?: string;
  }) => {
    if (!user) return;
    await saveRevision({
      postId,
      userId: user._id,
      content: draft.content,
      source: "generated",
      titleSuggestion: draft.titleSuggestion,
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
      <p className="drafts-subtitle">Each takes a different angle on your ideas.</p>

      <div className="draft-options">
        {drafts.map((draft, idx) => (
          <div
            key={idx}
            className="draft-option-card"
            onClick={() => handleSelectDraft(draft)}
          >
            <span className="draft-option-mode">
              {DRAFT_LABELS[idx]?.mode ?? `Draft ${idx + 1}`}
            </span>
            {draft.titleSuggestion && (
              <div className="draft-option-title">{draft.titleSuggestion}</div>
            )}
            <p className="draft-option-preview">
              {draft.content.slice(0, 250)}...
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
