"use client";

import { useParams } from "next/navigation";
import { useQuery, useMutation } from "convex/react";
import { api } from "../../../../../convex/_generated/api";
import { Id, Doc } from "../../../../../convex/_generated/dataModel";
import { PersonaCard } from "@/components/review/persona-card";
import { Skeleton } from "@/components/ui/skeleton";
import { PERSONAS } from "@/lib/constants";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function ReviewPage() {
  const params = useParams();
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
    actionStatus: "accepted" | "dismissed" | "pinned"
  ) => {
    applyDecision({ itemId, actionStatus });
  };

  if (!runs) {
    return (
      <div className="max-w-4xl mx-auto py-12 px-6 space-y-4">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-48 w-full rounded-xl" />
        ))}
      </div>
    );
  }

  if (!latestRun || !runData) {
    return (
      <div className="max-w-prose mx-auto py-12 px-6 text-center">
        <p className="text-muted-app">No reviews yet for this post.</p>
        <Link
          href={`/app/${postId}`}
          className="text-sm text-accent-app hover:underline mt-4 inline-block"
        >
          Back to editor
        </Link>
      </div>
    );
  }

  // Group items by persona
  const itemsByPersona = PERSONAS.reduce(
    (acc, persona) => {
      acc[persona.id] = (runData.items ?? []).filter(
        (item) => item.persona === persona.id
      );
      return acc;
    },
    {} as Record<string, Doc<"reviewItems">[]>
  );

  return (
    <div className="max-w-4xl mx-auto py-12 px-6">
      <Link
        href={`/app/${postId}`}
        className="flex items-center gap-1 text-sm text-muted-app hover:text-ink-light mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to editor
      </Link>

      <h2 className="text-xl font-semibold text-ink mb-1">Review Results</h2>
      <p className="text-sm text-muted-app mb-8">
        {runData.summary ?? `${runData.intensity} review`}
      </p>

      <div className="space-y-6">
        {PERSONAS.map((persona) => {
          const items = itemsByPersona[persona.id];
          if (!items?.length) return null;
          return (
            <PersonaCard
              key={persona.id}
              personaId={persona.id}
              items={items}
              onDecision={handleDecision}
            />
          );
        })}
      </div>
    </div>
  );
}
