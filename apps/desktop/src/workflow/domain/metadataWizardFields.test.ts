// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 2 — guided metadata fields through the Slice 1 port.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { BookSession } from "@openbook/authoring";
import { createBook } from "@openbook/book-model";
import { DesktopStudioCoordinator } from "../../domain/desktopStudioCoordinator.js";
import { InMemorySqliteConnection } from "../../persistence/sqliteDriver.js";
import { SqliteProjectPersistence } from "../../persistence/sqlitePersistence.js";
import {
  createMetadataWizardFields,
  fromMetadataFieldValues,
  toMetadataFieldValues,
} from "./metadataWizardFields.js";

function session(): BookSession {
  return new BookSession({
    book: createBook({ title: "Fields", language: "en", authors: ["Ada"] }),
    idSeed: "metadata-slice-2",
  });
}

test("read shows the Book's metadata with lists one per line", () => {
  const studio = session();
  studio.updateMetadata({ subjects: ["Fiction", "Poetry"] });
  const values = createMetadataWizardFields(studio).read();
  assert.equal(values.title, "Fields");
  assert.equal(values.authors, "Ada");
  assert.equal(values.subjects, "Fiction\nPoetry");
});

test("apply updates the Book and keeps Kannada text", () => {
  const studio = session();
  const fields = createMetadataWizardFields(studio);
  const result = fields.apply({
    ...fields.read(),
    title: "ಕನ್ನಡ ಪುಸ್ತಕ",
    authors: "ಲೇಖಕ\r\nRao, Muralidhar\n\n",
    subjects: "ಕಥೆ\n  \nFiction",
    description: "ಮೊದಲ ಸಾಲು\nಎರಡನೇ ಸಾಲು",
    language: "kn",
  });
  assert.equal(result.ok, true);
  const metadata = studio.getBook().metadata;
  assert.equal(metadata.title, "ಕನ್ನಡ ಪುಸ್ತಕ");
  assert.deepEqual(metadata.authors, ["ಲೇಖಕ", "Rao, Muralidhar"]);
  assert.deepEqual(metadata.subjects, ["ಕಥೆ", "Fiction"]);
  assert.equal(metadata.description, "ಮೊದಲ ಸಾಲು\nಎರಡನೇ ಸಾಲು");
  assert.equal(metadata.language, "kn");
});

test("blank title or language leaves the Book unchanged", () => {
  const studio = session();
  const fields = createMetadataWizardFields(studio);
  const before = JSON.stringify(studio.getBook());

  const title = fields.apply({ ...fields.read(), title: "  ", publisher: "Ignored" });
  assert.equal(title.ok, false);
  if (!title.ok) assert.equal(title.message, "A book title is required.");

  const language = fields.apply({ ...fields.read(), language: "" });
  assert.equal(language.ok, false);
  if (!language.ok) assert.equal(language.code, "EMPTY_LANGUAGE");

  assert.equal(JSON.stringify(studio.getBook()), before);
});

test("field values round-trip through Book metadata", () => {
  const metadata = session().getBook().metadata;
  const values = toMetadataFieldValues({
    ...metadata,
    contributors: ["Editor", "Illustrator"],
  });
  assert.equal(values.contributors, "Editor\nIllustrator");
  assert.deepEqual(fromMetadataFieldValues(values).contributors, [
    "Editor",
    "Illustrator",
  ]);
});

test("metadata edits through the coordinator session mark the project dirty", () => {
  const coordinator = new DesktopStudioCoordinator({
    persistence: new SqliteProjectPersistence(new InMemorySqliteConnection()),
    idSeed: "metadata-slice-2-dirty",
  });
  assert.equal(coordinator.getState().isDirty, false);
  const fields = createMetadataWizardFields({
    getBook: () => coordinator.getBook(),
    updateMetadata: (metadata) => coordinator.getSession().updateMetadata(metadata),
  });
  const result = fields.apply({ ...fields.read(), publisher: "SanMitra" });
  assert.equal(result.ok, true);
  assert.equal(coordinator.getBook().metadata.publisher, "SanMitra");
  assert.equal(coordinator.getState().isDirty, true);
});
