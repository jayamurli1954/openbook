// SPDX-License-Identifier: Apache-2.0
import type { DomainIssue } from "@openbook/book-model";

export class AuthoringError extends Error {
  readonly code: string;

  constructor(code: string, message: string, options?: { cause?: unknown }) {
    super(message, options);
    this.name = "AuthoringError";
    this.code = code;
  }
}

export class SectionNotFoundError extends AuthoringError {
  readonly sectionId: string;

  constructor(sectionId: string) {
    super(
      "SECTION_NOT_FOUND",
      `Section "${sectionId}" was not found in the active Book.`,
    );
    this.name = "SectionNotFoundError";
    this.sectionId = sectionId;
  }
}

export class BlockNotFoundError extends AuthoringError {
  readonly sectionId: string;
  readonly blockId: string;

  constructor(sectionId: string, blockId: string) {
    super(
      "BLOCK_NOT_FOUND",
      `Block "${blockId}" was not found in section "${sectionId}".`,
    );
    this.name = "BlockNotFoundError";
    this.sectionId = sectionId;
    this.blockId = blockId;
  }
}

export class InvalidStructureOperationError extends AuthoringError {
  constructor(message: string) {
    super("INVALID_STRUCTURE_OPERATION", message);
    this.name = "InvalidStructureOperationError";
  }
}

export class DomainValidationError extends AuthoringError {
  readonly issues: readonly DomainIssue[];

  constructor(issues: readonly DomainIssue[]) {
    const summary = issues.map((i) => i.message).join("; ");
    super(
      "DOMAIN_VALIDATION",
      `Book validation failed after mutation: ${summary}`,
    );
    this.name = "DomainValidationError";
    this.issues = issues;
  }
}
