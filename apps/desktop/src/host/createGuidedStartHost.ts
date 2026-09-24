// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 3 — wire GuidedStartHostAdapter to a live coordinator with
 * in-memory recent/continue stubs (durable persistence is Slice 4).
 */
import type { DesktopStudioCoordinator } from "../domain/desktopStudioCoordinator.js";
import {
  GuidedStartHostAdapter,
  type IGuidedStartHostAdapter,
} from "../workflow/domain/guidedStartHostAdapter.js";
import type {
  GuidedStartContinuePort,
  GuidedStartCoordinatorPort,
  GuidedStartRecentEntry,
  GuidedStartRecentListPort,
} from "../workflow/domain/guidedStartContract.js";

export interface CreateGuidedStartHostOptions {
  readonly coordinator: DesktopStudioCoordinator;
  readonly recentEntries?: readonly GuidedStartRecentEntry[];
  readonly continuePort?: GuidedStartContinuePort;
}

function asCoordinatorPort(
  coordinator: DesktopStudioCoordinator,
): GuidedStartCoordinatorPort {
  return {
    newProject: (name, language) => coordinator.newProject(name, language),
    importContent: (source, options) =>
      coordinator.importContent(source, options),
    openFromProjectPackage: (projectRoot, options) =>
      coordinator.openFromProjectPackage(projectRoot, options),
  };
}

export function createInMemoryRecentListPort(
  entries: readonly GuidedStartRecentEntry[] = [],
): GuidedStartRecentListPort {
  return {
    async listRecent() {
      return entries;
    },
  };
}

export function createUnavailableContinuePort(
  reason = "No continue target yet (durable continue arrives in Slice 4).",
): GuidedStartContinuePort {
  return {
    async resolveContinueTarget() {
      return { kind: "unavailable", reason };
    },
  };
}

export function createGuidedStartHost(
  options: CreateGuidedStartHostOptions,
): IGuidedStartHostAdapter {
  return new GuidedStartHostAdapter({
    coordinator: asCoordinatorPort(options.coordinator),
    recentList: createInMemoryRecentListPort(options.recentEntries ?? []),
    continuePort:
      options.continuePort ?? createUnavailableContinuePort(),
  });
}
