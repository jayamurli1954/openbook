// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import { test } from "node:test";
import { sha256Hex } from "@openbook/assets";
import {
  PACKAGE_INTEGRITY_ALGORITHM,
  PACKAGE_INTEGRITY_SCHEMA_VERSION,
  buildPackageIntegrityEvidence,
  parsePackageIntegrityEvidence,
  serializePackageIntegrityEvidence,
  validatePackageIntegrityEvidence,
  verifyComponentDigests,
} from "./packageIntegrity.js";

const parts = {
  "manifest.json": '{"packageVersion":1}',
  "book.json": '{\n  "bookModelVersion": 1\n}\n',
  "assets.json": '{\n  "assets": []\n}\n',
};

test("builds digests from exact UTF-8 component texts", () => {
  const evidence = buildPackageIntegrityEvidence(parts);
  assert.equal(evidence.schemaVersion, PACKAGE_INTEGRITY_SCHEMA_VERSION);
  assert.equal(evidence.algorithm, PACKAGE_INTEGRITY_ALGORITHM);
  assert.equal(
    evidence.digests["manifest.json"],
    sha256Hex(new TextEncoder().encode(parts["manifest.json"])),
  );
  assert.equal(
    evidence.digests["book.json"],
    sha256Hex(new TextEncoder().encode(parts["book.json"])),
  );
  assert.equal(
    evidence.digests["assets.json"],
    sha256Hex(new TextEncoder().encode(parts["assets.json"])),
  );
});

test("serializes and parses integrity evidence deterministically", () => {
  const evidence = buildPackageIntegrityEvidence(parts);
  const serialized = serializePackageIntegrityEvidence(evidence);
  const parsed = parsePackageIntegrityEvidence(serialized);
  assert.equal(parsed.compatibility, "compatible");
  assert.deepEqual(parsed.evidence, evidence);
  assert.equal(serialized.endsWith("\n"), true);
});

test("rejects unsupported top-level fields", () => {
  const result = validatePackageIntegrityEvidence({
    ...buildPackageIntegrityEvidence(parts),
    extra: true,
  });
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "MALFORMED_INTEGRITY");
});

test("rejects invalid digest hex", () => {
  const evidence = buildPackageIntegrityEvidence(parts);
  evidence.digests["book.json"] = "not-a-hash";
  const result = validatePackageIntegrityEvidence(evidence);
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors.some((error) => error.path === "book.json"), true);
});

test("classifies future integrity schemaVersion as unsupported", () => {
  const evidence = buildPackageIntegrityEvidence(parts);
  const result = validatePackageIntegrityEvidence({
    ...evidence,
    schemaVersion: PACKAGE_INTEGRITY_SCHEMA_VERSION + 1,
  });
  assert.equal(result.compatibility, "unsupported-future-version");
});

test("detects component digest mismatches", () => {
  const evidence = buildPackageIntegrityEvidence(parts);
  const result = verifyComponentDigests(evidence, {
    ...parts,
    "book.json": parts["book.json"] + " ",
  });
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "INTEGRITY_MISMATCH");
  assert.equal(result.errors[0]?.path, "book.json");
});

test("classifies malformed integrity JSON", () => {
  const result = parsePackageIntegrityEvidence("{not-json");
  assert.equal(result.compatibility, "malformed");
  assert.equal(result.errors[0]?.code, "MALFORMED_INTEGRITY");
});
