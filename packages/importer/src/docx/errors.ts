// SPDX-License-Identifier: Apache-2.0
import type { ImportIssue } from "../types.js";

export type DocxReadErrorCode =
  | "DOCX_EMPTY"
  | "DOCX_FILE_TOO_LARGE"
  | "DOCX_LEGACY_OR_PROTECTED"
  | "DOCX_NOT_ZIP"
  | "DOCX_ZIP_CORRUPT"
  | "DOCX_ZIP_UNSUPPORTED"
  | "DOCX_ENCRYPTED"
  | "DOCX_TOO_MANY_ENTRIES"
  | "DOCX_DUPLICATE_ENTRY"
  | "DOCX_ENTRY_TOO_LARGE"
  | "DOCX_TOTAL_TOO_LARGE"
  | "DOCX_COMPRESSION_RATIO"
  | "DOCX_MACRO_ENABLED"
  | "DOCX_NOT_WORD_DOCUMENT"
  | "DOCX_PART_MISSING"
  | "DOCX_PART_BLOCKED"
  | "DOCX_EXTERNAL_TARGET"
  | "DOCX_XML_INVALID"
  | "DOCX_XML_DOCTYPE"
  | "DOCX_XML_ENTITY"
  | "DOCX_XML_TOO_DEEP"
  | "DOCX_XML_TOO_MANY_ATTRIBUTES";

/**
 * Fail-closed error from the `.docx` reader. Messages are written for authors (ADR-0040 §6).
 */
export class DocxReadError extends Error {
  readonly code: DocxReadErrorCode;
  /** Package part the error is about, when there is one. */
  readonly part?: string;

  constructor(code: DocxReadErrorCode, message: string, part?: string) {
    super(message);
    this.name = "DocxReadError";
    this.code = code;
    if (part !== undefined) {
      this.part = part;
    }
  }
}

export function docxReadErrorToIssue(err: DocxReadError): ImportIssue {
  return {
    code: err.code,
    severity: "fatal",
    message: err.message,
    ...(err.part !== undefined ? { snippet: err.part } : {}),
  };
}
