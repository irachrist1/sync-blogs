"use client";

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PERSONAS, PRIORITY_LABELS } from "@/lib/constants";
import { ReviewItem } from "./review-item";
import { Doc } from "../../../convex/_generated/dataModel";

interface PersonaCardProps {
  personaId: string;
  items: Doc<"reviewItems">[];
  onDecision: (
    itemId: Doc<"reviewItems">["_id"],
    status: "accepted" | "dismissed" | "pinned"
  ) => void;
}

export function PersonaCard({
  personaId,
  items,
  onDecision,
}: PersonaCardProps) {
  const persona = PERSONAS.find((p) => p.id === personaId);
  if (!persona) return null;

  return (
    <Card className="overflow-hidden">
      <div
        className="h-1"
        style={{ backgroundColor: persona.color }}
      />
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-base">{persona.name}</CardTitle>
          <Badge variant="secondary" className="text-[10px]">
            {items.length} items
          </Badge>
        </div>
        <p className="text-xs text-muted-app">{persona.role}</p>
      </CardHeader>
      <CardContent className="space-y-3">
        {items.map((item) => (
          <ReviewItem
            key={item._id}
            item={item}
            onDecision={(status) => onDecision(item._id, status)}
          />
        ))}
      </CardContent>
    </Card>
  );
}
