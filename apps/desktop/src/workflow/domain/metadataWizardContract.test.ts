// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 1 — metadata contract tests. No React chrome.
 */
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import {
  METADATA_WIZARD_CAPABILITIES,
  executeMetadataCommand,
  getMetadataWizardCapability,
  isMetadataWizardCommandType,
  readBookMetadata,
} from "./metadataWizardContract.js";

function session(): BookSession {
  return new BookSession({
    book: createBook({
      title: "Metadata",
      language: "en",
      authors: ["Ada"],
    }),
    idSeed: "metadata-slice-1",
  });
}

test("capability matrix covers ROADMAP §3.6 and defers unrepresentable fields", () => {
  const inScope = METADATA_WIZARD_CAPABILITIES.filter(
    (capability) => capability.status === "in-scope",
  ).map((capability) => capability.id);
  assert.deepEqual(inScope, [
    "title",
    "subtitle",
    "authors",
    "contributors",
    "language",
    "identifier",
    "publisher",
    "publishedAt",
    "copyright",
    "description",
    "subjects",
    "rights",
  ]);
  assert.equal(getMetadataWizardCapability("cover-metadata")?.status, "deferred");
  assert.equal(getMetadataWizardCapability("accessibility-metadata")?.status, "deferred");
  for (const id of ["book-type", "audience", "length", "writing-goal"] as const) {
    assert.equal(getMetadataWizardCapability(id)?.status, "out-of-scope");
  }
  assert.equal(
    METADATA_WIZARD_CAPABILITIES.some(
      (capability) =>
        (capability.id as string) === "onix" || (capability.id as string) === "opf",
    ),
    false,
  );
  assert.equal(isMetadataWizardCommandType("set-metadata"), true);
  assert.equal(isMetadataWizardCommandType("write-opf"), false);
});

test("readBookMetadata copies metadata from the Book", () => {
  const book = session().getBook();
  const metadata = readBookMetadata(book);
  assert.equal(metadata.title, "Metadata");
  assert.deepEqual(metadata.authors, ["Ada"]);
  metadata.title = "Changed";
  metadata.authors.push("Grace");
  assert.equal(book.metadata.title, "Metadata");
  assert.deepEqual(book.metadata.authors, ["Ada"]);
});

test("set-metadata updates every in-scope field and keeps Kannada text", () => {
  const studio = session();
  const result = executeMetadataCommand(studio, {
    type: "set-metadata",
    metadata: {
      title: " ಕನ್ನಡ ಪುಸ್ತಕ ",
      subtitle: "ಉಪಶೀರ್ಷಿಕೆ",
      authors: [" ಲೇಖಕ ", "Ada"],
      contributors: ["Editor"],
      language: " kn ",
      identifier: "978-0-00-000000-0",
      publisher: "SanMitra",
      publishedAt: "2026-10-12",
      copyright: "© 2026 ಲೇಖಕ",
      description: "ಒಂದು ವಿವರಣೆ",
      subjects: ["Fiction", "ಕಥೆ"],
      rights: "All rights reserved",
    },
  });
  assert.equal(result.ok, true);
  assert.deepEqual(readBookMetadata(studio.getBook()), {
    title: "ಕನ್ನಡ ಪುಸ್ತಕ",
    subtitle: "ಉಪಶೀರ್ಷಿಕೆ",
    authors: ["ಲೇಖಕ", "Ada"],
    contributors: ["Editor"],
    language: "kn",
    identifier: "978-0-00-000000-0",
    publisher: "SanMitra",
    publishedAt: "2026-10-12",
    copyright: "© 2026 ಲೇಖಕ",
    description: "ಒಂದು ವಿವರಣೆ",
    subjects: ["Fiction", "ಕಥೆ"],
    rights: "All rights reserved",
  });
});

test("partial update leaves other fields and list order unchanged", () => {
  const studio = session();
  const before = readBookMetadata(studio.getBook());
  const result = executeMetadataCommand(studio, {
    type: "set-metadata",
    metadata: { subjects: [" b ", "", "  ", "a"] },
  });
  assert.equal(result.ok, true);
  const after = readBookMetadata(studio.getBook());
  assert.deepEqual(after.subjects, ["b", "a"]);
  assert.deepEqual({ ...after, subjects: before.subjects }, before);
});

test("identifier is stored as text without ISBN validation", () => {
  const studio = session();
  const result = executeMetadataCommand(studio, {
    type: "set-metadata",
    metadata: { identifier: " not-an-isbn " },
  });
  assert.equal(result.ok, true);
  assert.equal(studio.getBook().metadata.identifier, "not-an-isbn");
});

test("blank title, blank language, and unknown fields fail closed", () => {
  const studio = session();
  const before = JSON.stringify(studio.getBook());

  const title = executeMetadataCommand(studio, {
    type: "set-metadata",
    metadata: { title: "   ", publisher: "Ignored" },
  });
  assert.equal(title.ok, false);
  if (!title.ok) assert.equal(title.code, "EMPTY_TITLE");

  const language = executeMetadataCommand(studio, {
    type: "set-metadata",
    metadata: { language: "" },
  });
  assert.equal(language.ok, false);
  if (!language.ok) assert.equal(language.code, "EMPTY_LANGUAGE");

  const unknown = executeMetadataCommand(studio, {
    type: "set-metadata",
    metadata: { onix: "<ONIXMessage/>" } as never,
  });
  assert.equal(unknown.ok, false);
  if (!unknown.ok) assert.equal(unknown.code, "UNKNOWN_FIELD");

  assert.equal(JSON.stringify(studio.getBook()), before);
});

test("session validation errors map to METADATA_REJECTED", () => {
  const studio = session();
  const result = executeMetadataCommand(
    {
      getBook: () => studio.getBook(),
      updateMetadata: (metadata) => {
        studio.updateMetadata({ ...metadata, language: "" });
      },
    },
    { type: "set-metadata", metadata: { publisher: "SanMitra" } },
  );
  assert.equal(result.ok, false);
  if (!result.ok) assert.equal(result.code, "METADATA_REJECTED");
  assert.equal(studio.getBook().metadata.language, "en");
  assert.equal(studio.getBook().metadata.publisher, "");
});

test("contract surface stays free of OPF, ONIX, TipTap, and React", () => {
  const source = readFileSync(
    join(
      dirname(fileURLToPath(import.meta.url)),
      "..",
      "..",
      "..",
      "src",
      "workflow",
      "domain",
      "metadataWizardContract.ts",
    ),
    "utf8",
  );
  assert.match(source, /executeMetadataCommand/);
  assert.match(source, /updateMetadata/);
  assert.doesNotMatch(
    source,
    /from ["']@tiptap|from ["']react["']|from ["']@tauri-apps|from ["']@openbook\/epub|from ["']node:fs|localStorage|plugin-fs|writeOpf|ONIXMessage/,
  );
});
