// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import {
  GUIDED_START_PATHS,
  isGuidedStartPath,
  toNewBookCoordinatorRequest,
  validateNewBook,
  type GuidedStartCoordinatorPort,
  type GuidedStartContinuePort,
  type GuidedStartRecentListPort,
} from "./guidedStartContract.js";

test("exposes the four guided-start paths", () => {
  assert.deepEqual([...GUIDED_START_PATHS], [
    "new-book",
    "import",
    "open-recent",
    "continue",
  ]);
  assert.equal(isGuidedStartPath("new-book"), true);
  assert.equal(isGuidedStartPath("export"), false);
});

test("validateNewBook requires title and language only", () => {
  assert.equal(validateNewBook({}).ok, false);
  assert.equal(
    (validateNewBook({ title: "  ", language: "en", authors: ["A"] }) as { code: string })
      .code,
    "TITLE_REQUIRED",
  );
  assert.equal(
    (
      validateNewBook({ title: "My Book", language: "  ", authors: ["A"] }) as {
        code: string;
      }
    ).code,
    "LANGUAGE_REQUIRED",
  );
  const noAuthors = validateNewBook({ title: "My Book", language: "en" });
  assert.equal(noAuthors.ok, true);
  if (!noAuthors.ok) return;
  assert.deepEqual(noAuthors.fields.authors, []);
});

test("validateNewBook accepts English and Kannada titles and optional fields", () => {
  const en = validateNewBook({
    title: "  Open Book  ",
    subtitle: " A guide ",
    authors: ["  Ada ", ""],
    language: "en",
    bookType: "nonfiction",
    intendedAudience: "beginners",
    approximateLength: "40k words",
    writingGoal: "finish draft",
  });
  assert.equal(en.ok, true);
  if (!en.ok) return;
  assert.equal(en.fields.title, "Open Book");
  assert.equal(en.fields.subtitle, "A guide");
  assert.deepEqual(en.fields.authors, ["Ada"]);
  assert.equal(en.projectName, "Open Book");
  assert.equal(en.fields.bookType, "nonfiction");

  const kn = validateNewBook({
    title: "ಕನ್ನಡ ಕಥೆ",
    authors: ["ಲೇಖಕ"],
    language: "kn",
  });
  assert.equal(kn.ok, true);
  if (!kn.ok) return;
  assert.equal(kn.fields.title, "ಕನ್ನಡ ಕಥೆ");
  assert.equal(kn.fields.language, "kn");
  assert.equal(kn.fields.subtitle, undefined);
});

test("toNewBookCoordinatorRequest maps canonical fields and isolates wizard-only metadata", () => {
  const validated = validateNewBook({
    title: "Guide",
    subtitle: "One",
    authors: ["Ada"],
    language: "en",
    writingGoal: "ship MVP",
  });
  assert.equal(validated.ok, true);
  if (!validated.ok) return;

  const request = toNewBookCoordinatorRequest(validated);
  assert.equal(request.name, "Guide");
  assert.equal(request.language, "en");
  assert.deepEqual(request.authors, ["Ada"]);
  assert.equal(request.subtitle, "One");
  assert.deepEqual(request.wizardOnly, { writingGoal: "ship MVP" });
  assert.equal(
    Object.prototype.hasOwnProperty.call(request, "tiptap"),
    false,
  );
});

test("port shapes do not expose filesystem or React operations", () => {
  const coordinator: GuidedStartCoordinatorPort = {
    async newProject() {},
    async importContent() {
      return {
        success: true,
        mode: "new-project",
        sectionCount: 0,
        blockCount: 0,
        wordCount: 0,
        issues: [],
      };
    },
    async openFromProjectPackage() {
      return { projectRoot: "/tmp/demo", recovered: false };
    },
  };
  const recent: GuidedStartRecentListPort = {
    async listRecent() {
      return [];
    },
  };
  const cont: GuidedStartContinuePort = {
    async resolveContinueTarget() {
      return { kind: "unavailable", reason: "none" };
    },
  };

  assert.equal(typeof coordinator.newProject, "function");
  assert.equal(typeof recent.listRecent, "function");
  assert.equal(typeof cont.resolveContinueTarget, "function");
  assert.equal(
    "writeFile" in coordinator || "chooseDirectory" in recent,
    false,
  );
});
