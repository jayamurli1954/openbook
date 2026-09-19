// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { test } from "node:test";
import {
  BOOK_MODEL_SCHEMA_VERSION,
  createBook,
  serializeBook,
  type Book,
} from "@openbook/book-model";
import {
  mapBookToPackagePayload,
  parsePackageBookDocument,
  parsePackagePayloadToBook,
  serializePackageBookDocument,
  validatePackageBookDocument,
} from "./bookPackageMapping.js";

const validBook = (): Book =>
  createBook({
    title: "ಕನ್ನಡ Example",
    language: "kn",
    authors: ["Author"],
  });

test("maps a valid Book into a compatible package payload", () => {
  const book = validBook();
  const result = mapBookToPackagePayload(book);
  assert.equal(result.compatibility, "compatible");
  assert.equal(result.errors.length, 0);
  assert.equal(result.document?.bookModelVersion, BOOK_MODEL_SCHEMA_VERSION);
  assert.equal(result.document?.book, book);
});

test("serializes and parses a package Book document deterministically", () => {
  const mapped = mapBookToPackagePayload(validBook());
  assert.equal(mapped.compatibility, "compatible");
  assert.ok(mapped.document);

  const serialized = serializePackageBookDocument(mapped.document);
  const parsed = parsePackageBookDocument(serialized);
  assert.equal(parsed.compatibility, "compatible");
  assert.deepEqual(parsed.document, mapped.document);

  // Nested Book remains aligned with book-model serialize/parse contract.
  const nestedBookJson = serializeBook(mapped.document.book);
  assert.equal(JSON.parse(nestedBookJson).schemaVersion, BOOK_MODEL_SCHEMA_VERSION);
});

test("parsePackagePayloadToBook accepts a valid package payload", () => {
  const book = validBook();
  const result = parsePackagePayloadToBook({
    bookModelVersion: BOOK_MODEL_SCHEMA_VERSION,
    book,
  });
  assert.equal(result.compatibility, "compatible");
  assert.deepEqual(result.document?.book, book);
});

test("fails closed when bookModelVersion is missing", () => {
  const result = validatePackageBookDocument({ book: validBook() });
  assert.equal(result.compatibility, "malformed");
  assert.equal(
    result.errors.some((error) => error.code === "INVALID_BOOK_MODEL_VERSION"),
    true,
  );
});

test("classifies malformed JSON as malformed", () => {
  const result = parsePackageBookDocument("{not-json");
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "MALFORMED_PACKAGE_BOOK");
});

test("classifies a future Book Model version explicitly", () => {
  const book = { ...validBook(), schemaVersion: BOOK_MODEL_SCHEMA_VERSION + 1 };
  const result = validatePackageBookDocument({
    bookModelVersion: BOOK_MODEL_SCHEMA_VERSION + 1,
    book,
  });
  assert.equal(result.compatibility, "unsupported-future-version");
  assert.equal(result.errors[0]?.code, "UNSUPPORTED_FUTURE_VERSION");
});

test("classifies an older recognized Book Model version as migration-required", () => {
  const book = { ...validBook(), schemaVersion: 0 };
  const result = validatePackageBookDocument({
    bookModelVersion: 0,
    book,
  });
  assert.equal(result.compatibility, "migration-required");
  assert.equal(result.errors[0]?.code, "MIGRATION_REQUIRED");
});

test("rejects schemaVersion mismatch between envelope and Book", () => {
  const result = validatePackageBookDocument({
    bookModelVersion: BOOK_MODEL_SCHEMA_VERSION,
    book: { ...validBook(), schemaVersion: 0 },
  });
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "SCHEMA_VERSION_MISMATCH");
});

test("rejects Tiptap/ProseMirror JSON as package Book truth", () => {
  const result = mapBookToPackagePayload({
    type: "doc",
    content: [],
  } as unknown as Book);
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "TIPTAP_PAYLOAD_REJECTED");
});

test("rejects publishing-specific EPUB fields on the package Book document", () => {
  const result = validatePackageBookDocument({
    bookModelVersion: BOOK_MODEL_SCHEMA_VERSION,
    book: { ...validBook(), spine: [] },
  });
  assert.equal(result.compatibility, "malformed");
  assert.equal(
    result.errors.some((error) => error.code === "BOOK_VALIDATION_FAILED"),
    true,
  );
});

test("rejects unsupported top-level package Book fields", () => {
  const result = validatePackageBookDocument({
    bookModelVersion: BOOK_MODEL_SCHEMA_VERSION,
    book: validBook(),
    assets: [],
  });
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "MALFORMED_PACKAGE_BOOK");
});

test("rejects a Book that fails domain validation", () => {
  const result = mapBookToPackagePayload(createBook({ title: "Untitled", language: "" }));
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "BOOK_VALIDATION_FAILED");
});

test("preserves Unicode Book content through package mapping round-trip", () => {
  const book = validBook();
  book.chapters[0]!.blocks[0] = {
    type: "paragraph",
    id: book.chapters[0]!.blocks[0]!.id,
    inlines: [{ type: "text", text: "ನಮಸ್ಕಾರ — hello" }],
  };
  const mapped = mapBookToPackagePayload(book);
  assert.equal(mapped.compatibility, "compatible");
  assert.ok(mapped.document);
  const roundTrip = parsePackageBookDocument(serializePackageBookDocument(mapped.document));
  assert.equal(roundTrip.compatibility, "compatible");
  assert.equal(
    (roundTrip.document?.book.chapters[0]?.blocks[0] as { inlines: Array<{ text: string }> })
      .inlines[0]?.text,
    "ನಮಸ್ಕಾರ — hello",
  );
});
