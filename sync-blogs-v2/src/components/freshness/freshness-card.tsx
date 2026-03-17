"use client";

import { useMutation } from "convex/react";
import { api } from "../../../convex/_generated/api";
import { Doc } from "../../../convex/_generated/dataModel";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Check, X, Clock } from "lucide-react";

interface FreshnessCardProps {
  update: Doc<"freshnessUpdates">;
}

const severityColors = {
  low: "bg-accent-soft text-accent-app",
  medium: "bg-warn-soft text-warn",
  high: "bg-danger-soft text-danger",
};

const actionLabels = {
  notice: "Add a notice",
  addendum: "Write an addendum",
  revision: "Full revision needed",
};

export function FreshnessCard({ update }: FreshnessCardProps) {
  const applyDecision = useMutation(api.freshness.applyFreshnessDecision);

  const handleDecision = (
    status: "approved" | "dismissed" | "snoozed"
  ) => {
    applyDecision({ updateId: update._id, status });
  };

  const isResolved = update.status !== "needs_review";

  return (
    <Card className={isResolved ? "opacity-50" : ""}>
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{update.summary}</CardTitle>
          <Badge className={severityColors[update.severity]}>
            {update.severity}
          </Badge>
        </div>
        <p className="text-xs text-muted-app">
          Suggested: {actionLabels[update.suggestedAction]}
        </p>
      </CardHeader>
      <CardContent>
        {update.sourceLinks.length > 0 && (
          <div className="mb-3">
            <p className="text-xs text-muted-app mb-1">Sources:</p>
            {update.sourceLinks.map((link, i) => (
              <a
                key={i}
                href={link}
                target="_blank"
                rel="noopener noreferrer"
                className="text-xs text-accent-app hover:underline block"
              >
                {link}
              </a>
            ))}
          </div>
        )}

        {!isResolved && (
          <div className="flex gap-1">
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleDecision("approved")}
            >
              <Check className="w-3 h-3 mr-1" />
              Approve
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleDecision("dismissed")}
            >
              <X className="w-3 h-3 mr-1" />
              Dismiss
            </Button>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 text-xs"
              onClick={() => handleDecision("snoozed")}
            >
              <Clock className="w-3 h-3 mr-1" />
              Snooze
            </Button>
          </div>
        )}
        {isResolved && (
          <p className="text-xs text-muted-app capitalize">
            {update.status}
            {update.decisionNote && ` — ${update.decisionNote}`}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
