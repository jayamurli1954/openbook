// SPDX-License-Identifier: Apache-2.0

/**
 * Background / export job status for WorkflowCoordinator (ADR-0014).
 */
export const JOB_STATUSES = [
  "idle",
  "running",
  "succeeded",
  "failed",
] as const;

export type JobStatus = (typeof JOB_STATUSES)[number];

export const INITIAL_JOB_STATUS: JobStatus = "idle";

export function isJobStatus(value: unknown): value is JobStatus {
  return (
    typeof value === "string" &&
    (JOB_STATUSES as readonly string[]).includes(value)
  );
}

/**
 * Allowed job-status transitions.
 * idle → running → succeeded|failed; terminal states may return to idle or restart to running.
 */
export const ALLOWED_JOB_STATUS_TRANSITIONS: Readonly<
  Record<JobStatus, readonly JobStatus[]>
> = {
  idle: ["running"],
  running: ["succeeded", "failed"],
  succeeded: ["idle", "running"],
  failed: ["idle", "running"],
};

export function canTransitionJobStatus(
  from: JobStatus,
  to: JobStatus,
): boolean {
  if (from === to) {
    return false;
  }
  return ALLOWED_JOB_STATUS_TRANSITIONS[from].includes(to);
}
