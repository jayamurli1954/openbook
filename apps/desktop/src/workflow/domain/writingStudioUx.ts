// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0034 Slice 5 — Writing Studio empty-state and failure copy.
 * User-facing messages stay out of React so they remain unit-testable.
 * TipTap JSON is never named as something the author should save.
 */
import type { WritingStudioImageErrorCode } from "./writingStudioImageAdapter.js";

export type WritingStudioStatusKind = "idle" | "ok" | "error" | "info" | "busy";

export const WRITING_STUDIO_EMPTY_CHAPTERS =
  "No chapters yet. Create a chapter to start writing in the Book.";

export const WRITING_STUDIO_NO_SECTION =
  "Select a chapter before editing. Changes are stored in the Book, not as editor JSON.";

export const WRITING_STUDIO_EDITOR_UNAVAILABLE =
  "The writing surface is still starting. Formatting and image insert stay disabled until it is ready.";

export const WRITING_STUDIO_SEARCH_NO_MATCHES = "No matches in the Book.";

const IMAGE_FAILURE: Record<
  WritingStudioImageErrorCode,
  { readonly kind: "info" | "error"; readonly message: string }
> = {
  CANCELLED: {
    kind: "info",
    message: "Image selection was cancelled. The Book was not changed.",
  },
  SECTION_REQUIRED: {
    kind: "error",
    message: WRITING_STUDIO_NO_SECTION,
  },
  ASSETS_STAGE_REQUIRED: {
    kind: "error",
    message:
      "Images can be inserted once the project reaches the assets step. The Book was not changed.",
  },
  INSERT_FAILED: {
    kind: "error",
    message: "Could not insert that image. The Book was not changed.",
  },
};

export function formatWritingStudioSearchFailure(code: string): string {
  if (code === "EMPTY_QUERY") {
    return "Enter text to find in the Book. An empty search does not scan the manuscript.";
  }
  return "Could not search the Book.";
}

export function formatWritingStudioImageFailure(
  code: WritingStudioImageErrorCode | string,
  detail?: string,
): { readonly kind: "info" | "error"; readonly message: string } {
  const known =
    code in IMAGE_FAILURE
      ? IMAGE_FAILURE[code as WritingStudioImageErrorCode]
      : {
          kind: "error" as const,
          message: "Could not insert that image. The Book was not changed.",
        };
  const trimmed = detail?.trim();
  if (code === "INSERT_FAILED" && trimmed && trimmed !== known.message) {
    return { kind: "error", message: `${known.message} (${trimmed})` };
  }
  return known;
}

export function formatWritingStudioImageInserted(fileName: string): string {
  const name = fileName.trim() || "image";
  return `Inserted image “${name}” into the Book.`;
}

export function writingStudioStatusClass(
  kind: WritingStudioStatusKind,
): `status status-${"idle" | "ok" | "error" | "running"}` {
  switch (kind) {
    case "ok":
      return "status status-ok";
    case "error":
      return "status status-error";
    case "busy":
      return "status status-running";
    case "info":
    case "idle":
      return "status status-idle";
  }
}

const TIPTAP_CANONICAL_KEYS = ["editorState", "prosemirror", "tiptap"] as const;

/**
 * Walk a persisted Book / package payload. A TipTap document (`type: "doc"`)
 * or editor-state key means canonical storage leaked.
 */
export function findTipTapCanonicalLeak(
  value: unknown,
  path = "$",
): string | null {
  if (!value || typeof value !== "object") return null;
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const hit = findTipTapCanonicalLeak(value[index], `${path}[${index}]`);
      if (hit) return hit;
    }
    return null;
  }
  const record = value as Record<string, unknown>;
  for (const key of TIPTAP_CANONICAL_KEYS) {
    if (Object.prototype.hasOwnProperty.call(record, key)) {
      return `${path}.${key}`;
    }
  }
  if (record.type === "doc" && Array.isArray(record.content)) {
    return `${path} (TipTap doc)`;
  }
  for (const [key, child] of Object.entries(record)) {
    const hit = findTipTapCanonicalLeak(child, `${path}.${key}`);
    if (hit) return hit;
  }
  return null;
}
