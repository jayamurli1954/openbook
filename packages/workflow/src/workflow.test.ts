// SPDX-License-Identifier: Apache-2.0
import test from "node:test";
import * as assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import {
  ALLOWED_STAGE_TRANSITIONS,
  WORKFLOW_STAGES,
  INITIAL_WORKFLOW_STAGE,
  INITIAL_JOB_STATUS,
  WorkflowCoordinator,
  createInitialWorkflowState,
  assertNoCanonicalBookContent,
  canTransitionStage,
  canTransitionJobStatus,
  isWorkflowStage,
  isJobStatus,
  FORBIDDEN_WORKFLOW_CONTENT_KEYS,
  InvalidWorkflowTransitionError,
  InvalidJobStatusTransitionError,
  InvalidWorkflowStageError,
  InvalidJobStatusError,
  type WorkflowStage,
  type JobStatus,
} from "./index.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

test("initial workflow state is IMPORT with idle job status", () => {
  const state = createInitialWorkflowState();
  assert.equal(state.stage, "IMPORT");
  assert.equal(state.jobStatus, "idle");
  assert.equal(INITIAL_WORKFLOW_STAGE, "IMPORT");
  assert.equal(INITIAL_JOB_STATUS, "idle");

  const coordinator = new WorkflowCoordinator();
  assert.deepEqual(coordinator.getState(), {
    stage: "IMPORT",
    jobStatus: "idle",
  });
});

test("WORKFLOW_STAGES lists the seven ADR-0014 pipeline stages in order", () => {
  assert.deepEqual([...WORKFLOW_STAGES], [
    "IMPORT",
    "STRUCTURE",
    "AUTHORING",
    "ASSETS",
    "VALIDATION",
    "PREVIEW",
    "PUBLISH",
  ]);
});

test("every valid forward stage transition is accepted", () => {
  const coordinator = new WorkflowCoordinator();
  const path: WorkflowStage[] = ["IMPORT"];

  for (const from of WORKFLOW_STAGES) {
    const allowed = ALLOWED_STAGE_TRANSITIONS[from];
    for (const to of allowed) {
      assert.equal(canTransitionStage(from, to), true);
      assert.equal(coordinator.canTransitionTo(to), true);
      const state = coordinator.requestTransition({ to });
      assert.equal(state.stage, to);
      path.push(to);
    }
  }

  assert.deepEqual(path, [...WORKFLOW_STAGES]);
  assert.equal(coordinator.getStage(), "PUBLISH");
  assert.equal(coordinator.canTransitionTo("PUBLISH"), false);
});

test("invalid and backward stage transitions are rejected", () => {
  const coordinator = new WorkflowCoordinator({ stage: "AUTHORING" });

  const invalidTargets: WorkflowStage[] = [
    "IMPORT",
    "STRUCTURE",
    "AUTHORING",
    "VALIDATION",
    "PREVIEW",
    "PUBLISH",
  ];

  for (const to of invalidTargets) {
    assert.equal(canTransitionStage("AUTHORING", to), false);
    assert.equal(coordinator.canTransitionTo(to), false);
    assert.throws(
      () => coordinator.requestTransition({ to }),
      (err: unknown) =>
        err instanceof InvalidWorkflowTransitionError &&
        err.from === "AUTHORING" &&
        err.to === to,
    );
  }

  // Still on AUTHORING; only ASSETS is valid.
  assert.equal(coordinator.getStage(), "AUTHORING");
  coordinator.requestTransition({ to: "ASSETS" });
  assert.equal(coordinator.getStage(), "ASSETS");
});

test("invalid stage values are rejected", () => {
  assert.equal(isWorkflowStage("IMPORT"), true);
  assert.equal(isWorkflowStage("EXPORT"), false);
  assert.equal(isWorkflowStage(""), false);
  assert.equal(isWorkflowStage(null), false);
  assert.equal(isWorkflowStage(42), false);

  assert.throws(
    () => new WorkflowCoordinator({ stage: "NOT_A_STAGE" as WorkflowStage }),
    (err: unknown) => err instanceof InvalidWorkflowStageError,
  );

  const coordinator = new WorkflowCoordinator();
  assert.throws(
    () =>
      coordinator.requestTransition({
        to: "BOGUS" as WorkflowStage,
      }),
    (err: unknown) => err instanceof InvalidWorkflowStageError,
  );
});

test("valid job status transitions succeed", () => {
  const coordinator = new WorkflowCoordinator();
  assert.equal(coordinator.getJobStatus(), "idle");

  assert.equal(canTransitionJobStatus("idle", "running"), true);
  coordinator.requestJobStatus({ to: "running", jobId: "job-1" });
  assert.deepEqual(coordinator.getState(), {
    stage: "IMPORT",
    jobStatus: "running",
    jobId: "job-1",
  });

  coordinator.requestJobStatus({ to: "succeeded" });
  assert.equal(coordinator.getJobStatus(), "succeeded");

  coordinator.requestJobStatus({ to: "idle" });
  assert.deepEqual(coordinator.getState(), {
    stage: "IMPORT",
    jobStatus: "idle",
  });

  coordinator.requestJobStatus({ to: "running", jobId: "job-2" });
  coordinator.requestJobStatus({ to: "failed" });
  assert.equal(coordinator.getJobStatus(), "failed");
  coordinator.requestJobStatus({ to: "running", jobId: "job-3" });
  assert.equal(coordinator.getJobStatus(), "running");
});

test("invalid job status transitions are rejected", () => {
  const coordinator = new WorkflowCoordinator();

  assert.equal(canTransitionJobStatus("idle", "succeeded"), false);
  assert.throws(
    () => coordinator.requestJobStatus({ to: "succeeded" }),
    (err: unknown) =>
      err instanceof InvalidJobStatusTransitionError && err.from === "idle",
  );

  coordinator.requestJobStatus({ to: "running" });
  assert.throws(
    () => coordinator.requestJobStatus({ to: "idle" }),
    (err: unknown) => err instanceof InvalidJobStatusTransitionError,
  );

  assert.throws(
    () =>
      coordinator.requestJobStatus({
        to: "not-a-status" as JobStatus,
      }),
    (err: unknown) => err instanceof InvalidJobStatusError,
  );
  assert.equal(isJobStatus("running"), true);
  assert.equal(isJobStatus("queued"), false);
});

test("workflow state never contains canonical Book content keys", () => {
  const coordinator = new WorkflowCoordinator();
  const state = coordinator.getState();

  for (const key of FORBIDDEN_WORKFLOW_CONTENT_KEYS) {
    assert.equal(
      Object.prototype.hasOwnProperty.call(state, key),
      false,
      `workflow state must not expose "${key}"`,
    );
  }

  assert.doesNotThrow(() => assertNoCanonicalBookContent(state));

  assert.throws(
    () =>
      assertNoCanonicalBookContent({
        stage: "IMPORT",
        jobStatus: "idle",
        book: { title: "leak" },
      } as object),
    /must not contain canonical Book content key "book"/,
  );

  assert.throws(
    () =>
      assertNoCanonicalBookContent({
        stage: "IMPORT",
        jobStatus: "idle",
        chapters: [],
      } as object),
    /chapters/,
  );

  // Package must not depend on @openbook/book-model (Slice 1 boundary).
  const pkg = JSON.parse(
    readFileSync(path.join(__dirname, "..", "package.json"), "utf8"),
  ) as { dependencies?: Record<string, string>; name: string };
  assert.equal(pkg.name, "@openbook/workflow");
  assert.equal(pkg.dependencies, undefined);
});
