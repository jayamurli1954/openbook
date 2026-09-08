// SPDX-License-Identifier: Apache-2.0

import {
  INITIAL_WORKFLOW_STAGE,
  WORKFLOW_STAGES,
  type WorkflowStage,
} from "./stages.js";

/**
 * Valid forward-only stage transitions for Gate 7 Slice 1.
 * Each stage may advance only to the next stage in the ADR-0014 pipeline.
 * PUBLISH is terminal (no further stage transition).
 */
export const ALLOWED_STAGE_TRANSITIONS: Readonly<
  Record<WorkflowStage, readonly WorkflowStage[]>
> = {
  IMPORT: ["STRUCTURE"],
  STRUCTURE: ["AUTHORING"],
  AUTHORING: ["ASSETS"],
  ASSETS: ["VALIDATION"],
  VALIDATION: ["PREVIEW"],
  PREVIEW: ["PUBLISH"],
  PUBLISH: [],
};

export function canTransitionStage(
  from: WorkflowStage,
  to: WorkflowStage,
): boolean {
  return ALLOWED_STAGE_TRANSITIONS[from].includes(to);
}

export function nextStage(from: WorkflowStage): WorkflowStage | undefined {
  const allowed = ALLOWED_STAGE_TRANSITIONS[from];
  return allowed[0];
}

export function stageIndex(stage: WorkflowStage): number {
  return WORKFLOW_STAGES.indexOf(stage);
}

export { INITIAL_WORKFLOW_STAGE };
