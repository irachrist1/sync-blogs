import test from "node:test";
import assert from "node:assert/strict";
import { getAnthropicConfig } from "../lib/env.js";
import {
  composeWithAnthropic,
  reviewWithAnthropic,
  scanFreshnessWithAnthropic,
} from "./anthropicService.js";

const config = getAnthropicConfig();
const hasKey = Boolean(config.apiKey);

test("composeWithAnthropic returns structured draft options", { skip: !hasKey }, async () => {
  const options = await composeWithAnthropic({
    title: "Testing",
    roughInput: "I have messy notes about private writing. I want a strong first draft that still sounds human.",
  });

  assert.ok(options.length >= 1);
  for (const option of options) {
    assert.ok(option.titleSuggestion.length > 0);
    assert.ok(option.draft.length > 50);
  }
});

test("reviewWithAnthropic returns persona feedback", { skip: !hasKey }, async () => {
  const outputs = await reviewWithAnthropic({
    title: "Private writing",
    content: "Writing privately helps me think more honestly, but I still want useful critique before publishing.",
    intensity: "balanced",
  });

  assert.equal(outputs.length, 5);
  for (const output of outputs) {
    assert.ok(output.persona.length > 0);
    assert.ok(Array.isArray(output.questions));
  }
});

test("scanFreshnessWithAnthropic returns structured suggestions", { skip: !hasKey }, async () => {
  const suggestions = await scanFreshnessWithAnthropic({
    title: "Codex version post",
    publishedAt: "2026-03-01T00:00:00.000Z",
    content: "Codex 5.2 is the latest version and teams should standardize on it today.",
  });

  assert.ok(Array.isArray(suggestions));
  if (suggestions.length > 0) {
    assert.ok(suggestions[0].summary.length > 0);
  }
});
