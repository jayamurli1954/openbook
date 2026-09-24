// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import {
  GUIDED_START_FIELD_HELP,
  getGuidedStartFieldHelp,
} from "./guidedStartTerminology.js";

test("terminology stubs cover ROADMAP New Book fields", () => {
  const keys = Object.keys(GUIDED_START_FIELD_HELP).sort();
  assert.deepEqual(keys, [
    "approximateLength",
    "authors",
    "bookType",
    "intendedAudience",
    "language",
    "subtitle",
    "title",
    "writingGoal",
  ]);
  for (const key of keys) {
    const help = getGuidedStartFieldHelp(
      key as keyof typeof GUIDED_START_FIELD_HELP,
    );
    assert.ok(help.length > 10);
    assert.doesNotMatch(help, /\bAI\b|\bOllama\b/i);
  }
});
