// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 4 — Continue target resolution using last package root +
 * ADR-0031 recovery discovery. Does not invent a second recovery protocol.
 */
import type { ProjectPackageRecoveryDiscovery } from "../../persistence/projectPackageRecovery.js";
import type {
  GuidedStartContinuePort,
  GuidedStartContinueTarget,
} from "./guidedStartContract.js";

export interface GuidedStartContinueResolveDeps {
  getContinueRoot(): Promise<string | null>;
  discoverPackageRecovery(
    projectRoot: string,
  ): Promise<ProjectPackageRecoveryDiscovery>;
}

export function createGuidedStartContinuePort(
  deps: GuidedStartContinueResolveDeps,
): GuidedStartContinuePort {
  return {
    async resolveContinueTarget(): Promise<GuidedStartContinueTarget> {
      const root = (await deps.getContinueRoot())?.trim() ?? "";
      if (!root) {
        return {
          kind: "unavailable",
          reason: "No recent package is available to continue.",
        };
      }

      const discovery = await deps.discoverPackageRecovery(root);
      switch (discovery.status) {
        case "live-ready":
          return {
            kind: "package",
            projectRoot: root,
            options: { recover: { mode: "none" } },
          };
        case "recoverable":
          return {
            kind: "package",
            projectRoot: root,
            options: {
              recover: {
                mode: "restore-if-live-missing",
                ...(discovery.backupRoot
                  ? { backupRoot: discovery.backupRoot }
                  : {}),
              },
            },
          };
        case "ambiguous":
          return {
            kind: "unavailable",
            reason:
              "Multiple package backups found; choose an explicit recovery path before continuing.",
          };
        case "unavailable":
          return {
            kind: "unavailable",
            reason: discovery.message,
          };
        default: {
          const _exhaustive: never = discovery;
          return _exhaustive;
        }
      }
    },
  };
}
