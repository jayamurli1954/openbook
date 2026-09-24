// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 2 — Guided-start host adapter.
 *
 * Wires the four guided-start paths onto existing coordinator / recent /
 * continue ports. React, Tauri dialogs, filesystem, and durable recent-list
 * persistence remain outside this module (Slices 3–4).
 */
import type {
  OpenFromProjectPackageResult,
  StudioImportResult,
} from "../../domain/desktopStudioCoordinator.js";
import {
  toNewBookCoordinatorRequest,
  validateNewBook,
  type GuidedStartContinuePort,
  type GuidedStartCoordinatorPort,
  type GuidedStartImportRequest,
  type GuidedStartOpenRecentRequest,
  type GuidedStartRecentEntry,
  type GuidedStartRecentListPort,
  type NewBookFields,
  type NewBookValidationErrorCode,
} from "./guidedStartContract.js";

export type GuidedStartHostErrorCode =
  | NewBookValidationErrorCode
  | "PROJECT_ROOT_REQUIRED"
  | "CONTINUE_UNAVAILABLE"
  | "CANCELLED"
  | "COORDINATOR_FAILED";

export type GuidedStartNewBookResult =
  | {
      readonly ok: true;
      readonly path: "new-book";
      readonly projectName: string;
      readonly language: string;
    }
  | {
      readonly ok: false;
      readonly path: "new-book";
      readonly code: GuidedStartHostErrorCode;
      readonly message: string;
    };

export type GuidedStartImportResult =
  | {
      readonly ok: true;
      readonly path: "import";
      readonly result: StudioImportResult;
    }
  | {
      readonly ok: false;
      readonly path: "import";
      readonly code: GuidedStartHostErrorCode;
      readonly message: string;
    };

export type GuidedStartOpenResult =
  | {
      readonly ok: true;
      readonly path: "open-recent" | "continue";
      readonly result: OpenFromProjectPackageResult;
    }
  | {
      readonly ok: false;
      readonly path: "open-recent" | "continue";
      readonly code: GuidedStartHostErrorCode;
      readonly message: string;
    };

export interface GuidedStartHostAdapterDeps {
  readonly coordinator: GuidedStartCoordinatorPort;
  readonly recentList: GuidedStartRecentListPort;
  readonly continuePort: GuidedStartContinuePort;
}

export interface GuidedStartHostCallOptions {
  readonly signal?: AbortSignal;
}

export interface IGuidedStartHostAdapter {
  startNewBook(
    input: Partial<NewBookFields> | NewBookFields,
    options?: GuidedStartHostCallOptions,
  ): Promise<GuidedStartNewBookResult>;
  importBook(
    request: GuidedStartImportRequest,
    options?: GuidedStartHostCallOptions,
  ): Promise<GuidedStartImportResult>;
  openRecent(
    request: GuidedStartOpenRecentRequest,
    options?: GuidedStartHostCallOptions,
  ): Promise<GuidedStartOpenResult>;
  continueExisting(
    options?: GuidedStartHostCallOptions,
  ): Promise<GuidedStartOpenResult>;
  listRecent(): Promise<readonly GuidedStartRecentEntry[]>;
}

function messageFromUnknown(err: unknown): string {
  return err instanceof Error ? err.message : String(err);
}

function assertNotAborted(signal: AbortSignal | undefined): void {
  if (signal?.aborted) {
    const reason =
      typeof signal.reason === "string" && signal.reason.trim().length > 0
        ? signal.reason
        : "Guided-start operation was cancelled.";
    const error = new Error(reason);
    (error as Error & { code: GuidedStartHostErrorCode }).code = "CANCELLED";
    throw error;
  }
}

export class GuidedStartHostAdapter implements IGuidedStartHostAdapter {
  readonly #coordinator: GuidedStartCoordinatorPort;
  readonly #recentList: GuidedStartRecentListPort;
  readonly #continuePort: GuidedStartContinuePort;

  constructor(deps: GuidedStartHostAdapterDeps) {
    this.#coordinator = deps.coordinator;
    this.#recentList = deps.recentList;
    this.#continuePort = deps.continuePort;
  }

  async startNewBook(
    input: Partial<NewBookFields> | NewBookFields,
    options?: GuidedStartHostCallOptions,
  ): Promise<GuidedStartNewBookResult> {
    try {
      assertNotAborted(options?.signal);
      const validation = validateNewBook(input);
      if (!validation.ok) {
        return {
          ok: false,
          path: "new-book",
          code: validation.code,
          message: validation.message,
        };
      }

      const request = toNewBookCoordinatorRequest(validation);
      // Coordinator API today accepts name + language only; authors/subtitle/
      // wizardOnly remain for later Book metadata seeding slices.
      await this.#coordinator.newProject(request.name, request.language);
      assertNotAborted(options?.signal);

      return {
        ok: true,
        path: "new-book",
        projectName: request.name,
        language: request.language,
      };
    } catch (err) {
      return this.#failure("new-book", err);
    }
  }

  async importBook(
    request: GuidedStartImportRequest,
    options?: GuidedStartHostCallOptions,
  ): Promise<GuidedStartImportResult> {
    try {
      assertNotAborted(options?.signal);
      const result = await this.#coordinator.importContent(
        request.source,
        request.options,
      );
      assertNotAborted(options?.signal);
      return { ok: true, path: "import", result };
    } catch (err) {
      return this.#failure("import", err);
    }
  }

  async openRecent(
    request: GuidedStartOpenRecentRequest,
    options?: GuidedStartHostCallOptions,
  ): Promise<GuidedStartOpenResult> {
    try {
      assertNotAborted(options?.signal);
      const projectRoot = request.projectRoot.trim();
      if (projectRoot.length === 0) {
        return {
          ok: false,
          path: "open-recent",
          code: "PROJECT_ROOT_REQUIRED",
          message: "A project package root is required to open a recent book.",
        };
      }

      const result = await this.#coordinator.openFromProjectPackage(
        projectRoot,
        request.options,
      );
      assertNotAborted(options?.signal);
      return { ok: true, path: "open-recent", result };
    } catch (err) {
      return this.#failure("open-recent", err);
    }
  }

  async continueExisting(
    options?: GuidedStartHostCallOptions,
  ): Promise<GuidedStartOpenResult> {
    try {
      assertNotAborted(options?.signal);
      const target = await this.#continuePort.resolveContinueTarget();
      if (target.kind === "unavailable") {
        return {
          ok: false,
          path: "continue",
          code: "CONTINUE_UNAVAILABLE",
          message: target.reason,
        };
      }

      const result = await this.#coordinator.openFromProjectPackage(
        target.projectRoot,
        target.options,
      );
      assertNotAborted(options?.signal);
      return { ok: true, path: "continue", result };
    } catch (err) {
      return this.#failure("continue", err);
    }
  }

  listRecent(): Promise<readonly GuidedStartRecentEntry[]> {
    return this.#recentList.listRecent();
  }

  #failure(
    path: "new-book",
    err: unknown,
  ): Extract<GuidedStartNewBookResult, { ok: false }>;
  #failure(
    path: "import",
    err: unknown,
  ): Extract<GuidedStartImportResult, { ok: false }>;
  #failure(
    path: "open-recent" | "continue",
    err: unknown,
  ): Extract<GuidedStartOpenResult, { ok: false }>;
  #failure(
    path: "new-book" | "import" | "open-recent" | "continue",
    err: unknown,
  ):
    | Extract<GuidedStartNewBookResult, { ok: false }>
    | Extract<GuidedStartImportResult, { ok: false }>
    | Extract<GuidedStartOpenResult, { ok: false }> {
    const code =
      err instanceof Error &&
      "code" in err &&
      (err as { code?: unknown }).code === "CANCELLED"
        ? "CANCELLED"
        : "COORDINATOR_FAILED";
    const message = messageFromUnknown(err);
    if (path === "new-book") {
      return { ok: false, path, code, message };
    }
    if (path === "import") {
      return { ok: false, path, code, message };
    }
    return { ok: false, path, code, message };
  }
}
