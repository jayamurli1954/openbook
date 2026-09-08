// SPDX-License-Identifier: Apache-2.0

/**
 * Gate 7 pipeline stages (ADR-0014 §2.3).
 * Ordered unidirectionally: Import → Structure → Authoring → Assets → Validation → Preview → Publish.
 */
export const WORKFLOW_STAGES = [
  "IMPORT",
  "STRUCTURE",
  "AUTHORING",
  "ASSETS",
  "VALIDATION",
  "PREVIEW",
  "PUBLISH",
] as const;

export type WorkflowStage = (typeof WORKFLOW_STAGES)[number];

export const INITIAL_WORKFLOW_STAGE: WorkflowStage = "IMPORT";

export function isWorkflowStage(value: unknown): value is WorkflowStage {
  return (
    typeof value === "string" &&
    (WORKFLOW_STAGES as readonly string[]).includes(value)
  );
}
