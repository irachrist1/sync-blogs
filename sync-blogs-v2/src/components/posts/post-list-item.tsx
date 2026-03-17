"use client";

import { Badge } from "@/components/ui/badge";
import { Doc } from "../../../convex/_generated/dataModel";
import { Trash2 } from "lucide-react";

interface PostListItemProps {
  post: Doc<"posts">;
  isSelected: boolean;
  onClick: () => void;
  onDelete: (e: React.MouseEvent) => void;
}

function getDisplayTitle(post: Doc<"posts">): string {
  if (post.title && post.title !== "Untitled") return post.title;
  // Fallback: show first ~40 chars of rough input
  const rough = (post.draftProgress as { roughInput?: string } | undefined)?.roughInput;
  if (rough) {
    const preview = rough.replace(/\s+/g, " ").trim().slice(0, 40);
    return preview + (rough.length > 40 ? "\u2026" : "");
  }
  return "New draft";
}

export function PostListItem({ post, isSelected, onClick, onDelete }: PostListItemProps) {
  const displayTitle = getDisplayTitle(post);
  const isFallback = !post.title || post.title === "Untitled";

  return (
    <button
      onClick={onClick}
      className={`group w-full text-left p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
        isSelected
          ? "bg-accent-soft border border-accent-muted"
          : "hover:bg-line-light"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span
          className={`text-sm truncate flex-1 ${
            isFallback
              ? "text-muted-app italic"
              : "font-medium text-ink"
          }`}
        >
          {displayTitle}
        </span>
        <div className="flex items-center gap-1 shrink-0">
          <Badge
            variant={post.status === "published" ? "default" : "secondary"}
            className="text-[10px]"
          >
            {post.status}
          </Badge>
          <span
            role="button"
            onClick={onDelete}
            className="opacity-0 group-hover:opacity-100 p-0.5 rounded text-muted-app hover:text-red-500 transition-all"
            title="Delete post"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </span>
        </div>
      </div>
    </button>
  );
}
