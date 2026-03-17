"use client";

import { Check, Loader2, Circle } from "lucide-react";

interface SaveStatusProps {
  state: "saved" | "saving" | "unsaved";
}

export function SaveStatus({ state }: SaveStatusProps) {
  return (
    <div className="flex items-center gap-1.5 text-xs text-muted-app">
      {state === "saved" && (
        <>
          <Check className="w-3 h-3 text-accent-app" />
          Saved
        </>
      )}
      {state === "saving" && (
        <>
          <Loader2 className="w-3 h-3 animate-spin" />
          Saving...
        </>
      )}
      {state === "unsaved" && (
        <>
          <Circle className="w-3 h-3" />
          Unsaved changes
        </>
      )}
    </div>
  );
}
