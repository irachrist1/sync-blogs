import type { PersonaOutput, RankedIssue } from "./types.js";

const PRIORITY_MULTIPLIER: Record<string, number> = {
  now: 1.0,
  soon: 0.65,
  optional: 0.4,
};

export interface AggregateOptions {
  maxItems?: number;
  dedupeByIssue?: boolean;
}

function normalizeKey(text: string): string {
  return text.trim().toLowerCase().replace(/\s+/g, " ");
}

/**
 * Merge persona feedback into a ranked list for UI display.
 * Score is confidence weighted by priority bucket.
 */
export function aggregatePersonaIssues(
  outputs: PersonaOutput[],
  options: AggregateOptions = {},
): RankedIssue[] {
  const maxItems = options.maxItems ?? 5;
  const dedupeByIssue = options.dedupeByIssue ?? true;
  const seen = new Set<string>();
  const ranked: RankedIssue[] = [];

  for (const output of outputs) {
    for (const item of output.issues) {
      const key = normalizeKey(item.issue);
      if (dedupeByIssue && seen.has(key)) continue;

      const priorityWeight = PRIORITY_MULTIPLIER[item.priority] ?? 0.4;
      const score = Math.max(0, Math.min(1, item.confidence)) * priorityWeight;

      ranked.push({
        ...item,
        persona: output.persona,
        score,
      });

      if (dedupeByIssue) seen.add(key);
    }
  }

  ranked.sort((a, b) => b.score - a.score);
  return ranked.slice(0, maxItems);
}
