// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 4 — wire GuidedStartHostAdapter with durable recent list +
 * continue/recovery resolution. Text persistence is injectable (memory default;
 * Node file store for durability tests / future Tauri app-data adapter).
 */
import type { DesktopStudioCoordinator } from "../domain/desktopStudioCoordinator.js";
import {
  GuidedStartHostAdapter,
  type IGuidedStartHostAdapter,
} from "../workflow/domain/guidedStartHostAdapter.js";
import { createGuidedStartContinuePort } from "../workflow/domain/guidedStartContinuePort.js";
import type {
  GuidedStartContinuePort,
  GuidedStartCoordinatorPort,
  GuidedStartRecentEntry,
  GuidedStartRecentListPort,
} from "../workflow/domain/guidedStartContract.js";
import {
  createGuidedStartRecentPort,
  createMemoryGuidedStartRecentTextStore,
  type GuidedStartRecentPort,
  type GuidedStartRecentTextStorePort,
} from "../workflow/domain/guidedStartRecentStore.js";

export interface CreateGuidedStartHostOptions {
  readonly coordinator: DesktopStudioCoordinator;
  /** Override recent text persistence (defaults to in-process memory). */
  readonly recentTextStore?: GuidedStartRecentTextStorePort;
  /** Seed memory store when recentTextStore is omitted. */
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
  reason = "No recent package is available to continue.",
): GuidedStartContinuePort {
  return {
    async resolveContinueTarget() {
      return { kind: "unavailable", reason };
    },
  };
}

function seedMemoryStore(
  entries: readonly GuidedStartRecentEntry[],
): GuidedStartRecentTextStorePort {
  if (entries.length === 0) {
    return createMemoryGuidedStartRecentTextStore();
  }
  const state = {
    schemaVersion: 1 as const,
    entries: [...entries],
    lastContinueRoot: entries[0]?.projectRoot ?? null,
  };
  return createMemoryGuidedStartRecentTextStore(
    `${JSON.stringify(state, null, 2)}\n`,
  );
}

export function createGuidedStartRecentAndContinue(options: {
  readonly coordinator: DesktopStudioCoordinator;
  readonly recentTextStore?: GuidedStartRecentTextStorePort;
  readonly recentEntries?: readonly GuidedStartRecentEntry[];
}): {
  readonly recent: GuidedStartRecentPort;
  readonly continuePort: GuidedStartContinuePort;
} {
  const textStore =
    options.recentTextStore ??
    seedMemoryStore(options.recentEntries ?? []);
  const recent = createGuidedStartRecentPort(textStore);
  const continuePort = createGuidedStartContinuePort({
    getContinueRoot: () => recent.getContinueRoot(),
    discoverPackageRecovery: (projectRoot) =>
      options.coordinator.discoverPackageRecovery(projectRoot),
  });
  return { recent, continuePort };
}

export function createGuidedStartHost(
  options: CreateGuidedStartHostOptions,
): IGuidedStartHostAdapter {
  const { recent, continuePort } = createGuidedStartRecentAndContinue({
    coordinator: options.coordinator,
    recentTextStore: options.recentTextStore,
    recentEntries: options.recentEntries,
  });

  return new GuidedStartHostAdapter({
    coordinator: asCoordinatorPort(options.coordinator),
    recentList: recent,
    recentWrite: recent,
    continuePort: options.continuePort ?? continuePort,
  });
}
