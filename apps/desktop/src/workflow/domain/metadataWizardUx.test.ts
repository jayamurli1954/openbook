// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0037 Slice 3 — OPF / ONIX firewall unit tests.
 */
import assert from "node:assert/strict";
import test from "node:test";
import { createBook } from "@openbook/book-model";
import { findStoredMetadataDocumentLeak } from "./metadataWizardUx.js";

test("a canonical Book payload has no stored metadata document", () => {
  const book = createBook({ title: "ಕನ್ನಡ", language: "kn", authors: ["ಲೇಖಕ"] });
  assert.equal(findStoredMetadataDocumentLeak(book), null);
  assert.equal(findStoredMetadataDocumentLeak({ book }), null);
});

test("OPF and ONIX keys are reported with their path", () => {
  assert.equal(findStoredMetadataDocumentLeak({ opf: "<package/>" }), "$.opf");
  assert.equal(
    findStoredMetadataDocumentLeak({ book: { metadata: { onix: {} } } }),
    "$.book.metadata.onix",
  );
  assert.equal(
    findStoredMetadataDocumentLeak({ entries: [{}, { packageDocument: "x" }] }),
    "$.entries[1].packageDocument",
  );
  assert.equal(
    findStoredMetadataDocumentLeak({ records: [{ onixRecord: null }] }),
    "$.records[0].onixRecord",
  );
});

test("metadata text mentioning OPF or ONIX is not a leak", () => {
  assert.equal(
    findStoredMetadataDocumentLeak({
      metadata: { description: "Explains opf and onix files.", subjects: ["onix"] },
    }),
    null,
  );
  assert.equal(findStoredMetadataDocumentLeak(null), null);
  assert.equal(findStoredMetadataDocumentLeak("opf"), null);
});
