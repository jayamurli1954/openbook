// SPDX-License-Identifier: Apache-2.0

export {
  WORKFLOW_STAGES,
  INITIAL_WORKFLOW_STAGE,
  isWorkflowStage,
  type WorkflowStage,
} from "./stages.js";

export {
  JOB_STATUSES,
  INITIAL_JOB_STATUS,
  isJobStatus,
  canTransitionJobStatus,
  ALLOWED_JOB_STATUS_TRANSITIONS,
  type JobStatus,
} from "./job-status.js";

export {
  ALLOWED_STAGE_TRANSITIONS,
  canTransitionStage,
  nextStage,
  stageIndex,
} from "./transitions.js";

export type {
  WorkflowState,
  ForbiddenWorkflowContentKey,
  WorkflowTransitionRequest,
  JobStatusTransitionRequest,
} from "./types.js";

export {
  FORBIDDEN_WORKFLOW_CONTENT_KEYS,
  InvalidWorkflowTransitionError,
  InvalidJobStatusTransitionError,
  InvalidWorkflowStageError,
  InvalidJobStatusError,
} from "./types.js";

export {
  WorkflowCoordinator,
  createInitialWorkflowState,
  assertNoCanonicalBookContent,
  type IWorkflowCoordinator,
} from "./coordinator.js";
