"use client";

import { Badge } from "@/components/ui/badge";
import { Doc } from "../../../convex/_generated/dataModel";

interface PostListItemProps {
  post: Doc<"posts">;
  isSelected: boolean;
  onClick: () => void;
}

export function PostListItem({ post, isSelected, onClick }: PostListItemProps) {
  return (
    <button
      onClick={onClick}
      className={`w-full text-left p-3 rounded-lg cursor-pointer transition-colors mb-1 ${
        isSelected
          ? "bg-accent-soft border border-accent-muted"
          : "hover:bg-line-light"
      }`}
    >
      <div className="flex items-start justify-between gap-2">
        <span className="text-sm font-medium text-ink truncate flex-1">
          {post.title || "Untitled"}
        </span>
        <Badge
          variant={post.status === "published" ? "default" : "secondary"}
          className="text-[10px] shrink-0"
        >
          {post.status}
        </Badge>
      </div>
    </button>
  );
}
