// SPDX-License-Identifier: Apache-2.0
import assert from "node:assert/strict";
import test from "node:test";
import type { ProjectPackageRecoveryDiscovery } from "../../persistence/projectPackageRecovery.js";
import { createGuidedStartContinuePort } from "./guidedStartContinuePort.js";

test("continue port fails closed when no root is remembered", async () => {
  const port = createGuidedStartContinuePort({
    async getContinueRoot() {
      return null;
    },
    async discoverPackageRecovery() {
      throw new Error("should not discover");
    },
  });
  const target = await port.resolveContinueTarget();
  assert.equal(target.kind, "unavailable");
});

test("continue port maps live-ready and recoverable discovery", async () => {
  const live: ProjectPackageRecoveryDiscovery = {
    status: "live-ready",
    projectRoot: "/live",
    liveExists: true,
    backups: [],
  };
  const livePort = createGuidedStartContinuePort({
    async getContinueRoot() {
      return "/live";
    },
    async discoverPackageRecovery() {
      return live;
    },
  });
  const liveTarget = await livePort.resolveContinueTarget();
  assert.equal(liveTarget.kind, "package");
  if (liveTarget.kind === "package") {
    assert.equal(liveTarget.options?.recover?.mode, "none");
  }

  const recoverable: ProjectPackageRecoveryDiscovery = {
    status: "recoverable",
    projectRoot: "/gone",
    liveExists: false,
    backupRoot: "/gone.openbook-backup-1",
    backups: ["/gone.openbook-backup-1"],
  };
  const recoverPort = createGuidedStartContinuePort({
    async getContinueRoot() {
      return "/gone";
    },
    async discoverPackageRecovery() {
      return recoverable;
    },
  });
  const recoverTarget = await recoverPort.resolveContinueTarget();
  assert.equal(recoverTarget.kind, "package");
  if (recoverTarget.kind === "package") {
    assert.equal(recoverTarget.options?.recover?.mode, "restore-if-live-missing");
    assert.equal(
      recoverTarget.options?.recover &&
        recoverTarget.options.recover.mode === "restore-if-live-missing"
        ? recoverTarget.options.recover.backupRoot
        : undefined,
      "/gone.openbook-backup-1",
    );
  }
});

test("continue port refuses ambiguous backups", async () => {
  const port = createGuidedStartContinuePort({
    async getContinueRoot() {
      return "/ambiguous";
    },
    async discoverPackageRecovery(): Promise<ProjectPackageRecoveryDiscovery> {
      return {
        status: "ambiguous",
        projectRoot: "/ambiguous",
        liveExists: false,
        backups: ["/a", "/b"],
      };
    },
  });
  const target = await port.resolveContinueTarget();
  assert.equal(target.kind, "unavailable");
  if (target.kind === "unavailable") {
    assert.match(target.reason, /Multiple package backups/);
  }
});
