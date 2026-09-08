// SPDX-License-Identifier: Apache-2.0

import {
  canTransitionJobStatus,
  INITIAL_JOB_STATUS,
  isJobStatus,
  type JobStatus,
} from "./job-status.js";
import {
  INITIAL_WORKFLOW_STAGE,
  isWorkflowStage,
  type WorkflowStage,
} from "./stages.js";
import { canTransitionStage } from "./transitions.js";
import {
  FORBIDDEN_WORKFLOW_CONTENT_KEYS,
  InvalidJobStatusError,
  InvalidJobStatusTransitionError,
  InvalidWorkflowStageError,
  InvalidWorkflowTransitionError,
  type JobStatusTransitionRequest,
  type WorkflowState,
  type WorkflowTransitionRequest,
} from "./types.js";

/**
 * Orchestrates Gate 7 pipeline stage gates and background job status.
 * Never stores or accepts canonical Book content (ADR-0014 §2.1).
 */
export interface IWorkflowCoordinator {
  getStage(): WorkflowStage;
  getJobStatus(): JobStatus;
  getState(): WorkflowState;
  canTransitionTo(to: WorkflowStage): boolean;
  requestTransition(request: WorkflowTransitionRequest): WorkflowState;
  canSetJobStatus(to: JobStatus): boolean;
  requestJobStatus(request: JobStatusTransitionRequest): WorkflowState;
}

export class WorkflowCoordinator implements IWorkflowCoordinator {
  #stage: WorkflowStage;
  #jobStatus: JobStatus;
  #jobId: string | undefined;

  constructor(initial?: Partial<Pick<WorkflowState, "stage" | "jobStatus" | "jobId">>) {
    if (initial?.stage !== undefined && !isWorkflowStage(initial.stage)) {
      throw new InvalidWorkflowStageError(initial.stage);
    }
    if (initial?.jobStatus !== undefined && !isJobStatus(initial.jobStatus)) {
      throw new InvalidJobStatusError(initial.jobStatus);
    }
    this.#stage = initial?.stage ?? INITIAL_WORKFLOW_STAGE;
    this.#jobStatus = initial?.jobStatus ?? INITIAL_JOB_STATUS;
    this.#jobId = initial?.jobId;
  }

  getStage(): WorkflowStage {
    return this.#stage;
  }

  getJobStatus(): JobStatus {
    return this.#jobStatus;
  }

  getState(): WorkflowState {
    const state: WorkflowState = {
      stage: this.#stage,
      jobStatus: this.#jobStatus,
      ...(this.#jobId !== undefined ? { jobId: this.#jobId } : {}),
    };
    assertNoCanonicalBookContent(state);
    return state;
  }

  canTransitionTo(to: WorkflowStage): boolean {
    if (!isWorkflowStage(to)) {
      return false;
    }
    return canTransitionStage(this.#stage, to);
  }

  requestTransition(request: WorkflowTransitionRequest): WorkflowState {
    if (!isWorkflowStage(request.to)) {
      throw new InvalidWorkflowStageError(request.to);
    }
    if (!canTransitionStage(this.#stage, request.to)) {
      throw new InvalidWorkflowTransitionError(this.#stage, request.to);
    }
    this.#stage = request.to;
    return this.getState();
  }

  canSetJobStatus(to: JobStatus): boolean {
    if (!isJobStatus(to)) {
      return false;
    }
    return canTransitionJobStatus(this.#jobStatus, to);
  }

  requestJobStatus(request: JobStatusTransitionRequest): WorkflowState {
    if (!isJobStatus(request.to)) {
      throw new InvalidJobStatusError(request.to);
    }
    if (!canTransitionJobStatus(this.#jobStatus, request.to)) {
      throw new InvalidJobStatusTransitionError(this.#jobStatus, request.to);
    }
    this.#jobStatus = request.to;
    if (request.jobId !== undefined) {
      this.#jobId = request.jobId;
    } else if (request.to === "idle") {
      this.#jobId = undefined;
    }
    return this.getState();
  }
}

/**
 * Runtime guard: workflow snapshots must not carry Book Model field names.
 */
export function assertNoCanonicalBookContent(
  state: object,
): asserts state is WorkflowState {
  for (const key of FORBIDDEN_WORKFLOW_CONTENT_KEYS) {
    if (Object.prototype.hasOwnProperty.call(state, key)) {
      throw new Error(
        `Workflow state must not contain canonical Book content key "${key}" (ADR-0014).`,
      );
    }
  }
}

export function createInitialWorkflowState(): WorkflowState {
  return {
    stage: INITIAL_WORKFLOW_STAGE,
    jobStatus: INITIAL_JOB_STATUS,
  };
}
