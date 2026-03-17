"use client";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { PRIORITY_LABELS } from "@/lib/constants";
import { Check, X, Pin } from "lucide-react";
import { Doc } from "../../../convex/_generated/dataModel";

interface ReviewItemProps {
  item: Doc<"reviewItems">;
  onDecision: (status: "accepted" | "dismissed" | "pinned") => void;
}

const priorityColors = {
  now: "bg-danger-soft text-danger border-danger/20",
  soon: "bg-warn-soft text-warn border-warn/20",
  optional: "bg-accent-soft text-accent-app border-accent-app/20",
};

export function ReviewItem({ item, onDecision }: ReviewItemProps) {
  const isResolved = item.actionStatus !== "open";

  return (
    <div
      className={`p-3 rounded-lg border border-line ${isResolved ? "opacity-50" : ""}`}
    >
      <div className="flex items-start justify-between gap-2 mb-1">
        <p className="text-sm font-medium text-ink">{item.issue}</p>
        <Badge
          variant="outline"
          className={`text-[10px] shrink-0 ${priorityColors[item.priority]}`}
        >
          {PRIORITY_LABELS[item.priority]}
        </Badge>
      </div>
      <p className="text-sm text-ink-light mb-2">{item.suggestion}</p>
      {item.evidence && (
        <p className="text-xs text-muted-app italic mb-2">
          &ldquo;{item.evidence}&rdquo;
        </p>
      )}
      {!isResolved && (
        <div className="flex gap-1 mt-2">
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onDecision("accepted")}
          >
            <Check className="w-3 h-3 mr-1" />
            Accept
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onDecision("dismissed")}
          >
            <X className="w-3 h-3 mr-1" />
            Dismiss
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 text-xs"
            onClick={() => onDecision("pinned")}
          >
            <Pin className="w-3 h-3 mr-1" />
            Pin
          </Button>
        </div>
      )}
      {isResolved && (
        <p className="text-xs text-muted-app mt-1 capitalize">
          {item.actionStatus}
        </p>
      )}
    </div>
  );
}
