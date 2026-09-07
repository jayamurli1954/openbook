// SPDX-License-Identifier: Apache-2.0
import {
  SEMANTIC_DOCUMENT_SCHEMA_VERSION,
  type SemanticDocument,
  type SemanticIssue,
} from "./types.js";

/** Keys that must never appear on an authoring SemanticDocument (EPUB package leaks). */
export const EPUB_AUTHORING_LEAK_KEYS = [
  "opf",
  "manifest",
  "spine",
  "ncx",
  "nav",
  "navDoc",
  "container",
  "packageDocument",
] as const;

function collectIds(doc: SemanticDocument): { id: string; path: string }[] {
  const found: { id: string; path: string }[] = [];
  for (const [si, section] of doc.sections.entries()) {
    found.push({ id: section.id, path: `sections/${si}` });
    for (const [bi, block] of section.blocks.entries()) {
      found.push({ id: block.id, path: `sections/${si}/blocks/${bi}` });
    }
  }
  for (const [ai, asset] of doc.assets.entries()) {
    found.push({ id: asset.id, path: `assets/${ai}` });
  }
  return found;
}

/**
 * Contract validation for SemanticDocument.
 * Does not replace Book Model validation; run `validateBook` after mapping when needed.
 */
export function validateSemanticDocument(doc: SemanticDocument): SemanticIssue[] {
  const issues: SemanticIssue[] = [];

  if (doc.schemaVersion !== SEMANTIC_DOCUMENT_SCHEMA_VERSION) {
    issues.push({
      code: "unknown-schema-version",
      severity: "error",
      message: `Unsupported semantic document schemaVersion ${doc.schemaVersion}; expected ${SEMANTIC_DOCUMENT_SCHEMA_VERSION}`,
      path: "schemaVersion",
    });
  }

  const root = doc as unknown as Record<string, unknown>;
  for (const key of EPUB_AUTHORING_LEAK_KEYS) {
    if (Object.prototype.hasOwnProperty.call(root, key)) {
      issues.push({
        code: "epub-authoring-leak",
        severity: "error",
        message: `SemanticDocument must not contain EPUB packaging field "${key}"`,
        path: key,
      });
    }
  }

  if (!doc.metadata.language.trim()) {
    issues.push({
      code: "missing-language",
      severity: "error",
      message: "metadata.language is required",
      path: "metadata.language",
    });
  }

  if (!doc.metadata.title.trim()) {
    issues.push({
      code: "empty-title",
      severity: "warning",
      message: "metadata.title is empty",
      path: "metadata.title",
    });
  }

  const seen = new Map<string, string>();
  for (const { id, path } of collectIds(doc)) {
    if (!id) {
      issues.push({
        code: "empty-id",
        severity: "error",
        message: "Empty id is not allowed",
        path,
      });
      continue;
    }
    const prior = seen.get(id);
    if (prior !== undefined) {
      issues.push({
        code: "duplicate-id",
        severity: "error",
        message: `Duplicate id "${id}" (also at ${prior})`,
        path,
      });
    } else {
      seen.set(id, path);
    }
  }

  for (const [si, section] of doc.sections.entries()) {
    for (const [bi, block] of section.blocks.entries()) {
      if (block.type === "image") {
        const assetExists = doc.assets.some((a) => a.id === block.assetId);
        if (!assetExists) {
          issues.push({
            code: "missing-asset",
            severity: "error",
            message: `Image block references unknown assetId "${block.assetId}"`,
            path: `sections/${si}/blocks/${bi}/assetId`,
          });
        }
      }
    }
  }

  return issues;
}
