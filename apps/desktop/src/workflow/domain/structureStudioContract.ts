// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 1 — Structure Studio contract.
 *
 * Capability matrix + command port over BookSession structure operations.
 * React chrome and navigation preview stay outside this module.
 * Nested section trees are deferred.
 */
import type { Book, MatterKind, StructuralSection } from "@openbook/book-model";
import {
  InvalidStructureOperationError,
  isRoleValidForMatter,
} from "@openbook/authoring";

export type StructureStudioCapabilityId =
  | "front-matter"
  | "main-matter"
  | "back-matter"
  | "chapter-ordering"
  | "section-hierarchy"
  | "navigation-preview"
  | "autosave";

export type StructureStudioCapabilityStatus =
  | "in-scope"
  | "reuse-existing"
  | "deferred";

export interface StructureStudioCapability {
  readonly id: StructureStudioCapabilityId;
  readonly status: StructureStudioCapabilityStatus;
  readonly note?: string;
}

/**
 * ROADMAP §3.4 capability matrix under ADR-0035.
 * Nested section trees wait for a Book Model ADR.
 */
export const STRUCTURE_STUDIO_CAPABILITIES: readonly StructureStudioCapability[] =
  [
    { id: "front-matter", status: "in-scope" },
    { id: "main-matter", status: "in-scope" },
    { id: "back-matter", status: "in-scope" },
    { id: "chapter-ordering", status: "in-scope" },
    {
      id: "section-hierarchy",
      status: "deferred",
      note: "Book Model stores a flat section list per matter. Nested trees need a model ADR.",
    },
    {
      id: "navigation-preview",
      status: "in-scope",
      note: "Read-only projection of Book order. Chrome is a later slice. EPUB nav stays in the publishing engine.",
    },
    {
      id: "autosave",
      status: "reuse-existing",
      note: "ADR-0031 PackageAutosavePort — no second autosave protocol",
    },
  ] as const;

export type StructureStudioCommand =
  | {
      readonly type: "add";
      readonly matter: MatterKind;
      readonly title: string;
      readonly role?: string;
      readonly atIndex?: number;
    }
  | { readonly type: "rename"; readonly sectionId: string; readonly title: string }
  | {
      readonly type: "reorder";
      readonly matter: MatterKind;
      readonly fromIndex: number;
      readonly toIndex: number;
    }
  | {
      readonly type: "move";
      readonly sectionId: string;
      readonly targetMatter: MatterKind;
      readonly targetIndex?: number;
    }
  | { readonly type: "remove"; readonly sectionId: string }
  | { readonly type: "set-role"; readonly sectionId: string; readonly role: string };

export type StructureStudioErrorCode =
  | "EMPTY_TITLE"
  | "SECTION_NOT_FOUND"
  | "LAST_MAIN_CHAPTER"
  | "INVALID_ROLE"
  | "INDEX_OUT_OF_BOUNDS"
  | "STRUCTURE_REJECTED";

export type StructureStudioResult =
  | { readonly ok: true }
  | {
      readonly ok: false;
      readonly code: StructureStudioErrorCode;
      readonly message: string;
    };

export interface StructureSectionSummary {
  readonly id: string;
  readonly title: string;
  readonly role: string;
  readonly index: number;
}

export interface StructureMatterGroup {
  readonly matter: MatterKind;
  readonly sections: readonly StructureSectionSummary[];
}

/** Narrow session surface. BookSession satisfies it. No React or TipTap. */
export interface StructureStudioSessionPort {
  getBook(): Book;
  addSection(params: {
    matter: MatterKind;
    title: string;
    role?: string;
    atIndex?: number;
  }): StructuralSection;
  removeSection(sectionId: string): void;
  reorderSection(matter: MatterKind, fromIndex: number, toIndex: number): void;
  moveSection(
    sectionId: string,
    targetMatter: MatterKind,
    targetIndex?: number,
  ): void;
  updateSectionTitle(sectionId: string, title: string): void;
  updateSectionRole(sectionId: string, role: string): void;
}

const MATTERS: readonly MatterKind[] = ["front", "main", "back"];

function sectionsFor(book: Book, matter: MatterKind): readonly StructuralSection[] {
  switch (matter) {
    case "front":
      return book.frontMatter;
    case "main":
      return book.chapters;
    case "back":
      return book.backMatter;
  }
}

export function locateSection(
  book: Book,
  sectionId: string,
): { readonly matter: MatterKind; readonly index: number; readonly section: StructuralSection } | null {
  for (const matter of MATTERS) {
    const sections = sectionsFor(book, matter);
    const index = sections.findIndex((section) => section.id === sectionId);
    if (index >= 0) {
      const section = sections[index];
      if (!section) return null;
      return { matter, index, section };
    }
  }
  return null;
}

export function listBookStructure(book: Book): readonly StructureMatterGroup[] {
  return MATTERS.map((matter) => ({
    matter,
    sections: sectionsFor(book, matter).map((section, index) => ({
      id: section.id,
      title: section.title,
      role: String(section.role),
      index,
    })),
  }));
}

export function getStructureStudioCapability(
  id: StructureStudioCapabilityId,
): StructureStudioCapability | undefined {
  return STRUCTURE_STUDIO_CAPABILITIES.find((capability) => capability.id === id);
}

export function isStructureStudioCommandType(value: string): boolean {
  return (
    value === "add" ||
    value === "rename" ||
    value === "reorder" ||
    value === "move" ||
    value === "remove" ||
    value === "set-role"
  );
}

function fail(
  code: StructureStudioErrorCode,
  message: string,
): StructureStudioResult {
  return { ok: false, code, message };
}

function isLastMainChapter(book: Book, matter: MatterKind): boolean {
  return matter === "main" && book.chapters.length <= 1;
}

/**
 * Apply one structure command. Fail-closed checks run before BookSession
 * mutation so a rejected command leaves the Book unchanged.
 */
export function executeStructureCommand(
  session: StructureStudioSessionPort,
  command: StructureStudioCommand,
): StructureStudioResult {
  const book = session.getBook();

  try {
    switch (command.type) {
      case "add": {
        const title = command.title.trim();
        if (title.length === 0) {
          return fail("EMPTY_TITLE", "A section title is required.");
        }
        if (
          command.role !== undefined &&
          !isRoleValidForMatter(command.role, command.matter)
        ) {
          return fail(
            "INVALID_ROLE",
            `Role "${command.role}" is not valid for ${command.matter} matter.`,
          );
        }
        session.addSection({
          matter: command.matter,
          title,
          ...(command.role !== undefined ? { role: command.role } : {}),
          ...(command.atIndex !== undefined ? { atIndex: command.atIndex } : {}),
        });
        return { ok: true };
      }
      case "rename": {
        const title = command.title.trim();
        if (title.length === 0) {
          return fail("EMPTY_TITLE", "A section title is required.");
        }
        if (!locateSection(book, command.sectionId)) {
          return fail(
            "SECTION_NOT_FOUND",
            `No section with id "${command.sectionId}".`,
          );
        }
        session.updateSectionTitle(command.sectionId, title);
        return { ok: true };
      }
      case "reorder": {
        const list = sectionsFor(book, command.matter);
        if (
          command.fromIndex < 0 ||
          command.toIndex < 0 ||
          command.fromIndex >= list.length ||
          command.toIndex >= list.length
        ) {
          return fail(
            "INDEX_OUT_OF_BOUNDS",
            "Reorder indices are outside this matter list.",
          );
        }
        session.reorderSection(
          command.matter,
          command.fromIndex,
          command.toIndex,
        );
        return { ok: true };
      }
      case "move": {
        const located = locateSection(book, command.sectionId);
        if (!located) {
          return fail(
            "SECTION_NOT_FOUND",
            `No section with id "${command.sectionId}".`,
          );
        }
        if (
          isLastMainChapter(book, located.matter) &&
          command.targetMatter !== "main"
        ) {
          return fail(
            "LAST_MAIN_CHAPTER",
            "The last main-matter chapter cannot be moved out of main matter.",
          );
        }
        const role = String(located.section.role);
        if (!isRoleValidForMatter(role, command.targetMatter)) {
          return fail(
            "INVALID_ROLE",
            `Role "${role}" is not valid for ${command.targetMatter} matter.`,
          );
        }
        session.moveSection(
          command.sectionId,
          command.targetMatter,
          command.targetIndex,
        );
        return { ok: true };
      }
      case "remove": {
        const located = locateSection(book, command.sectionId);
        if (!located) {
          return fail(
            "SECTION_NOT_FOUND",
            `No section with id "${command.sectionId}".`,
          );
        }
        if (isLastMainChapter(book, located.matter)) {
          return fail(
            "LAST_MAIN_CHAPTER",
            "The last main-matter chapter cannot be removed.",
          );
        }
        session.removeSection(command.sectionId);
        return { ok: true };
      }
      case "set-role": {
        const located = locateSection(book, command.sectionId);
        if (!located) {
          return fail(
            "SECTION_NOT_FOUND",
            `No section with id "${command.sectionId}".`,
          );
        }
        if (!isRoleValidForMatter(command.role, located.matter)) {
          return fail(
            "INVALID_ROLE",
            `Role "${command.role}" is not valid for ${located.matter} matter.`,
          );
        }
        session.updateSectionRole(command.sectionId, command.role);
        return { ok: true };
      }
      default: {
        const unexpected: never = command;
        return fail("STRUCTURE_REJECTED", `Unsupported command: ${String(unexpected)}`);
      }
    }
  } catch (err) {
    if (err instanceof InvalidStructureOperationError) {
      return fail("STRUCTURE_REJECTED", err.message);
    }
    const message = err instanceof Error ? err.message : String(err);
    return fail("STRUCTURE_REJECTED", message);
  }
}
