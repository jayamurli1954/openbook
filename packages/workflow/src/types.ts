// SPDX-License-Identifier: Apache-2.0

import type { JobStatus } from "./job-status.js";
import type { WorkflowStage } from "./stages.js";

/**
 * Ephemeral workflow orchestration state (ADR-0014 §2.1).
 *
 * **Invariant:** Must never contain canonical Book content, section bodies,
 * metadata payloads, SemanticDocument trees, or publishing artifacts.
 * Book content remains solely in `@openbook/book-model`.
 */
export interface WorkflowState {
  readonly stage: WorkflowStage;
  readonly jobStatus: JobStatus;
  /**
   * Optional opaque job identifier for UI/process correlation.
   * Must not encode book content.
   */
  readonly jobId?: string;
}

/**
 * Keys that are forbidden on workflow state / snapshots because they would
 * duplicate canonical Book Model concerns.
 */
export const FORBIDDEN_WORKFLOW_CONTENT_KEYS = [
  "book",
  "chapters",
  "frontMatter",
  "backMatter",
  "blocks",
  "inlines",
  "assets",
  "metadata",
  "semanticDocument",
  "content",
  "title",
  "authors",
] as const;

export type ForbiddenWorkflowContentKey =
  (typeof FORBIDDEN_WORKFLOW_CONTENT_KEYS)[number];

export class InvalidWorkflowTransitionError extends Error {
  readonly code = "INVALID_WORKFLOW_TRANSITION";
  readonly from: WorkflowStage;
  readonly to: unknown;

  constructor(from: WorkflowStage, to: unknown, message?: string) {
    super(
      message ??
        `Invalid workflow stage transition: ${String(from)} → ${String(to)}.`,
    );
    this.name = "InvalidWorkflowTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class InvalidJobStatusTransitionError extends Error {
  readonly code = "INVALID_JOB_STATUS_TRANSITION";
  readonly from: JobStatus;
  readonly to: unknown;

  constructor(from: JobStatus, to: unknown, message?: string) {
    super(
      message ??
        `Invalid job status transition: ${String(from)} → ${String(to)}.`,
    );
    this.name = "InvalidJobStatusTransitionError";
    this.from = from;
    this.to = to;
  }
}

export class InvalidWorkflowStageError extends Error {
  readonly code = "INVALID_WORKFLOW_STAGE";
  readonly value: unknown;

  constructor(value: unknown, message?: string) {
    super(message ?? `Invalid workflow stage value: ${String(value)}.`);
    this.name = "InvalidWorkflowStageError";
    this.value = value;
  }
}

export class InvalidJobStatusError extends Error {
  readonly code = "INVALID_JOB_STATUS";
  readonly value: unknown;

  constructor(value: unknown, message?: string) {
    super(message ?? `Invalid job status value: ${String(value)}.`);
    this.name = "InvalidJobStatusError";
    this.value = value;
  }
}

export interface WorkflowTransitionRequest {
  readonly to: WorkflowStage;
}

export interface JobStatusTransitionRequest {
  readonly to: JobStatus;
  readonly jobId?: string;
}
