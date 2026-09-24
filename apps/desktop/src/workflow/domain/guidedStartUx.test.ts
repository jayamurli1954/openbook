// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import {
  GUIDED_START_CONTINUE_HINT,
  GUIDED_START_EMPTY_RECENT,
  GUIDED_START_HUB_STATUS,
  formatGuidedStartFailure,
  formatGuidedStartImportSuccess,
  formatGuidedStartNewBookSuccess,
  formatGuidedStartOpenSuccess,
  formatGuidedStartPathStatus,
  guidedStartStatusClass,
} from "./guidedStartUx.js";

test("failure UX maps codes to plain language without leaking AI", () => {
  assert.equal(
    formatGuidedStartFailure("TITLE_REQUIRED"),
    "Enter a book title to continue.",
  );
  assert.match(
    formatGuidedStartFailure("CONTINUE_UNAVAILABLE", "No recent package"),
    /Nothing to continue/,
  );
  assert.match(
    formatGuidedStartFailure("COORDINATOR_FAILED", "disk full"),
    /disk full/,
  );
  for (const text of [
    formatGuidedStartFailure("CANCELLED"),
    GUIDED_START_HUB_STATUS,
    GUIDED_START_EMPTY_RECENT,
    GUIDED_START_CONTINUE_HINT,
  ]) {
    assert.doesNotMatch(text, /\bOllama\b|\bAI outline\b/i);
  }
});

test("success copy preserves English and Kannada metadata text", () => {
  assert.match(
    formatGuidedStartNewBookSuccess("Open Book", "en"),
    /Open Book/,
  );
  assert.match(
    formatGuidedStartNewBookSuccess("ಕನ್ನಡ ಕಥೆ", "kn"),
    /ಕನ್ನಡ ಕಥೆ/,
  );
  assert.match(formatGuidedStartImportSuccess(2, 40), /2 section/);
  assert.match(
    formatGuidedStartOpenSuccess("/tmp/ಕನ್ನಡ.obproj", true),
    /ಕನ್ನಡ\.obproj/,
  );
  assert.equal(formatGuidedStartPathStatus("new-book").includes("title"), true);
  assert.equal(guidedStartStatusClass("error"), "status status-error");
  assert.equal(guidedStartStatusClass("ok"), "status status-ok");
});
