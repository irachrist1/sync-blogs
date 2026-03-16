import test from "node:test";
import assert from "node:assert/strict";
import { aggregatePersonaIssues } from "./aggregate.js";
import type { PersonaOutput } from "./types.js";

test("aggregatePersonaIssues sorts by weighted priority and confidence", () => {
  const outputs: PersonaOutput[] = [
    {
      persona: "Editor",
      strengths: [],
      issues: [
        {
          priority: "soon",
          issue: "Improve structure",
          suggestion: "Split into clearer sections",
          confidence: 0.9,
        },
      ],
      questions: [],
    },
    {
      persona: "Coach",
      strengths: [],
      issues: [
        {
          priority: "now",
          issue: "Clarify the opening",
          suggestion: "State the central point in the first paragraph",
          confidence: 0.7,
        },
      ],
      questions: [],
    },
  ];

  const ranked = aggregatePersonaIssues(outputs);
  assert.equal(ranked[0]?.issue, "Clarify the opening");
  assert.equal(ranked[1]?.issue, "Improve structure");
});
