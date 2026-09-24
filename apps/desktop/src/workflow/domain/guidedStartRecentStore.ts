// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 4 — durable guided-start recent list + continue root state.
 *
 * Persistence is behind an injectable text store (memory/file/Tauri later).
 * Never invents package roots or Book content.
 */
import type { GuidedStartRecentEntry } from "./guidedStartContract.js";

export const GUIDED_START_RECENT_SCHEMA_VERSION = 1 as const;
export const GUIDED_START_RECENT_MAX_ENTRIES = 10;

export interface GuidedStartRecentState {
  readonly schemaVersion: typeof GUIDED_START_RECENT_SCHEMA_VERSION;
  readonly entries: readonly GuidedStartRecentEntry[];
  /** Last successfully opened package root for Continue. */
  readonly lastContinueRoot: string | null;
}

export interface GuidedStartRecentTextStorePort {
  readText(): Promise<string | null>;
  writeText(text: string): Promise<void>;
}

export interface GuidedStartRecentWritePort {
  rememberOpened(entry: GuidedStartRecentEntry): Promise<void>;
}

export type GuidedStartRecentPort = GuidedStartRecentWritePort & {
  listRecent(): Promise<readonly GuidedStartRecentEntry[]>;
  getContinueRoot(): Promise<string | null>;
};

export function emptyGuidedStartRecentState(): GuidedStartRecentState {
  return {
    schemaVersion: GUIDED_START_RECENT_SCHEMA_VERSION,
    entries: [],
    lastContinueRoot: null,
  };
}

export function displayNameFromProjectRoot(projectRoot: string): string {
  const trimmed = projectRoot.trim().replace(/[\\/]+$/, "");
  if (!trimmed) return "Untitled package";
  const parts = trimmed.split(/[\\/]/).filter((part) => part.length > 0);
  return parts[parts.length - 1] ?? trimmed;
}

export function parseGuidedStartRecentState(
  text: string | null,
): GuidedStartRecentState {
  if (text === null || text.trim().length === 0) {
    return emptyGuidedStartRecentState();
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(text) as unknown;
  } catch {
    throw new Error("Guided-start recent list is malformed JSON.");
  }
  if (
    typeof parsed !== "object" ||
    parsed === null ||
    !("schemaVersion" in parsed) ||
    (parsed as { schemaVersion: unknown }).schemaVersion !==
      GUIDED_START_RECENT_SCHEMA_VERSION
  ) {
    throw new Error("Guided-start recent list schemaVersion is unsupported.");
  }
  const record = parsed as {
    entries?: unknown;
    lastContinueRoot?: unknown;
  };
  if (!Array.isArray(record.entries)) {
    throw new Error("Guided-start recent list entries must be an array.");
  }
  const entries: GuidedStartRecentEntry[] = [];
  for (const item of record.entries) {
    if (typeof item !== "object" || item === null) {
      throw new Error("Guided-start recent entry is malformed.");
    }
    const entry = item as Record<string, unknown>;
    if (
      typeof entry.projectRoot !== "string" ||
      typeof entry.displayName !== "string" ||
      typeof entry.lastOpenedAt !== "string"
    ) {
      throw new Error("Guided-start recent entry fields are invalid.");
    }
    const projectRoot = entry.projectRoot.trim();
    if (!projectRoot) {
      throw new Error("Guided-start recent entry projectRoot is required.");
    }
    entries.push({
      projectRoot,
      displayName: entry.displayName.trim() || displayNameFromProjectRoot(projectRoot),
      lastOpenedAt: entry.lastOpenedAt,
    });
  }
  const lastContinueRoot =
    typeof record.lastContinueRoot === "string" &&
    record.lastContinueRoot.trim().length > 0
      ? record.lastContinueRoot.trim()
      : null;
  return {
    schemaVersion: GUIDED_START_RECENT_SCHEMA_VERSION,
    entries,
    lastContinueRoot,
  };
}

export function serializeGuidedStartRecentState(
  state: GuidedStartRecentState,
): string {
  return `${JSON.stringify(state, null, 2)}\n`;
}

function rememberInState(
  state: GuidedStartRecentState,
  entry: GuidedStartRecentEntry,
): GuidedStartRecentState {
  const projectRoot = entry.projectRoot.trim();
  if (!projectRoot) {
    throw new Error("Cannot remember an empty project root.");
  }
  const normalized: GuidedStartRecentEntry = {
    projectRoot,
    displayName:
      entry.displayName.trim() || displayNameFromProjectRoot(projectRoot),
    lastOpenedAt: entry.lastOpenedAt,
  };
  const rest = state.entries.filter(
    (existing) => existing.projectRoot !== projectRoot,
  );
  return {
    schemaVersion: GUIDED_START_RECENT_SCHEMA_VERSION,
    entries: [normalized, ...rest].slice(0, GUIDED_START_RECENT_MAX_ENTRIES),
    lastContinueRoot: projectRoot,
  };
}

export function createMemoryGuidedStartRecentTextStore(
  initialText: string | null = null,
): GuidedStartRecentTextStorePort & { snapshot(): string | null } {
  let text = initialText;
  return {
    async readText() {
      return text;
    },
    async writeText(next) {
      text = next;
    },
    snapshot() {
      return text;
    },
  };
}

export function createGuidedStartRecentPort(
  textStore: GuidedStartRecentTextStorePort,
  options?: { readonly now?: () => string },
): GuidedStartRecentPort {
  const now = options?.now ?? (() => new Date().toISOString());

  async function load(): Promise<GuidedStartRecentState> {
    return parseGuidedStartRecentState(await textStore.readText());
  }

  async function save(state: GuidedStartRecentState): Promise<void> {
    await textStore.writeText(serializeGuidedStartRecentState(state));
  }

  return {
    async listRecent() {
      return (await load()).entries;
    },
    async getContinueRoot() {
      return (await load()).lastContinueRoot;
    },
    async rememberOpened(entry) {
      const withTime: GuidedStartRecentEntry = {
        ...entry,
        lastOpenedAt: entry.lastOpenedAt || now(),
      };
      const next = rememberInState(await load(), withTime);
      await save(next);
    },
  };
}
