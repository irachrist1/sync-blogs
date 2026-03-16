import test from "node:test";
import assert from "node:assert/strict";
import { parseJsonResponse } from "./json.js";

test("parseJsonResponse parses raw json", () => {
  const parsed = parseJsonResponse<{ ok: boolean }>('{"ok":true}');
  assert.equal(parsed.ok, true);
});

test("parseJsonResponse unwraps fenced json", () => {
  const parsed = parseJsonResponse<{ value: string }>('```json\n{"value":"hello"}\n```');
  assert.equal(parsed.value, "hello");
});
