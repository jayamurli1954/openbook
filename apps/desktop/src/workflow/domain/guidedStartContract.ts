// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0033 Slice 1 — Guided-start contract (Book Wizard / Guided Start).
 *
 * Types/ports for the four entry paths and New Book field validation.
 * React/Tauri/filesystem/coordinator mutation remain outside this module.
 * Execution wiring is Slice 2.
 */
import type { ImportSource } from "@openbook/importer";
import type {
  OpenFromProjectPackageOptions,
  OpenFromProjectPackageResult,
  StudioImportOptions,
  StudioImportResult,
} from "../../domain/desktopStudioCoordinator.js";

export type GuidedStartPath =
  | "new-book"
  | "import"
  | "open-recent"
  | "continue";

export const GUIDED_START_PATHS: readonly GuidedStartPath[] = [
  "new-book",
  "import",
  "open-recent",
  "continue",
] as const;

/**
 * ROADMAP §3.1 New Book fields.
 * Canonical BookMetadata today: title, subtitle, authors, language.
 * bookType / intendedAudience / approximateLength / writingGoal are wizard
 * form fields only in Slice 1 — not persisted by this contract.
 */
export interface NewBookFields {
  readonly title: string;
  readonly subtitle?: string;
  readonly authors: readonly string[];
  readonly language: string;
  readonly bookType?: string;
  readonly intendedAudience?: string;
  readonly approximateLength?: string;
  readonly writingGoal?: string;
}

export type NewBookValidationErrorCode =
  | "TITLE_REQUIRED"
  | "LANGUAGE_REQUIRED";

export type NewBookValidation =
  | {
      readonly ok: true;
      readonly fields: NewBookFields;
      /** Suggested project / package display name (from title). */
      readonly projectName: string;
    }
  | {
      readonly ok: false;
      readonly code: NewBookValidationErrorCode;
      readonly message: string;
    };

/** Maps validated New Book fields onto today's coordinator.newProject inputs. */
export interface NewBookCoordinatorRequest {
  readonly name: string;
  readonly language: string;
  readonly authors: readonly string[];
  readonly subtitle?: string;
  readonly wizardOnly: {
    readonly bookType?: string;
    readonly intendedAudience?: string;
    readonly approximateLength?: string;
    readonly writingGoal?: string;
  };
}

export interface GuidedStartRecentEntry {
  readonly projectRoot: string;
  readonly displayName: string;
  readonly lastOpenedAt: string;
}

export type GuidedStartContinueTarget =
  | {
      readonly kind: "package";
      readonly projectRoot: string;
      readonly options?: OpenFromProjectPackageOptions;
    }
  | {
      readonly kind: "unavailable";
      readonly reason: string;
    };

export interface GuidedStartImportRequest {
  readonly source: ImportSource;
  readonly options?: StudioImportOptions;
}

export interface GuidedStartOpenRecentRequest {
  readonly projectRoot: string;
  readonly options?: OpenFromProjectPackageOptions;
}

export interface GuidedStartContinueRequest {
  readonly target: Extract<GuidedStartContinueTarget, { kind: "package" }>;
}

export interface GuidedStartCoordinatorPort {
  newProject(name: string, language?: string): Promise<void>;
  importContent(
    source: ImportSource,
    options?: StudioImportOptions,
  ): Promise<StudioImportResult>;
  openFromProjectPackage(
    projectRoot: string,
    options?: OpenFromProjectPackageOptions,
  ): Promise<OpenFromProjectPackageResult>;
}

export interface GuidedStartRecentListPort {
  listRecent(): Promise<readonly GuidedStartRecentEntry[]>;
}

export interface GuidedStartContinuePort {
  /** Resume last bound package / recovery handoff — no second recovery protocol. */
  resolveContinueTarget(): Promise<GuidedStartContinueTarget>;
}

export function isGuidedStartPath(value: string): value is GuidedStartPath {
  return (GUIDED_START_PATHS as readonly string[]).includes(value);
}

function trimOptional(value: string | undefined): string | undefined {
  if (value === undefined) return undefined;
  const trimmed = value.trim();
  return trimmed.length === 0 ? undefined : trimmed;
}

function normalizeAuthors(
  authors: readonly string[] | undefined,
): readonly string[] {
  if (!authors || authors.length === 0) return [];
  return authors.map((a) => a.trim()).filter((a) => a.length > 0);
}

/**
 * Validate and normalize New Book wizard fields.
 * Minimum viable: non-empty title + language (ADR-0033 §2.2).
 */
export function validateNewBook(
  input: Partial<NewBookFields> | NewBookFields,
): NewBookValidation {
  const title = typeof input.title === "string" ? input.title.trim() : "";
  if (title.length === 0) {
    return {
      ok: false,
      code: "TITLE_REQUIRED",
      message: "A book title is required.",
    };
  }

  const language =
    typeof input.language === "string" ? input.language.trim() : "";
  if (language.length === 0) {
    return {
      ok: false,
      code: "LANGUAGE_REQUIRED",
      message: "A language code is required.",
    };
  }

  const authors = normalizeAuthors(input.authors);

  const fields: NewBookFields = {
    title,
    language,
    authors,
    ...(trimOptional(input.subtitle)
      ? { subtitle: trimOptional(input.subtitle) }
      : {}),
    ...(trimOptional(input.bookType)
      ? { bookType: trimOptional(input.bookType) }
      : {}),
    ...(trimOptional(input.intendedAudience)
      ? { intendedAudience: trimOptional(input.intendedAudience) }
      : {}),
    ...(trimOptional(input.approximateLength)
      ? { approximateLength: trimOptional(input.approximateLength) }
      : {}),
    ...(trimOptional(input.writingGoal)
      ? { writingGoal: trimOptional(input.writingGoal) }
      : {}),
  };

  return { ok: true, fields, projectName: title };
}

/**
 * Map validated New Book fields to coordinator-shaped request data.
 * Does not call the coordinator; Slice 2 performs execution.
 */
export function toNewBookCoordinatorRequest(
  validation: Extract<NewBookValidation, { ok: true }>,
): NewBookCoordinatorRequest {
  const { fields, projectName } = validation;
  return {
    name: projectName,
    language: fields.language,
    authors: fields.authors,
    ...(fields.subtitle !== undefined ? { subtitle: fields.subtitle } : {}),
    wizardOnly: {
      ...(fields.bookType !== undefined ? { bookType: fields.bookType } : {}),
      ...(fields.intendedAudience !== undefined
        ? { intendedAudience: fields.intendedAudience }
        : {}),
      ...(fields.approximateLength !== undefined
        ? { approximateLength: fields.approximateLength }
        : {}),
      ...(fields.writingGoal !== undefined
        ? { writingGoal: fields.writingGoal }
        : {}),
    },
  };
}
