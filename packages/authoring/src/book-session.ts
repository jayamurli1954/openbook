// SPDX-License-Identifier: Apache-2.0
import type {
  Book,
  BookMetadata,
  ContentBlock,
  MatterKind,
  StructuralSection,
} from "@openbook/book-model";
import { serializeBook, validateBook } from "@openbook/book-model";
import { cloneBook } from "./clone.js";
import {
  BlockNotFoundError,
  DomainValidationError,
  InvalidStructureOperationError,
  SectionNotFoundError,
} from "./errors.js";
import { DeterministicIdFactory } from "./ids.js";
import type {
  AddSectionParams,
  BookSessionOptions,
  IBookSession,
  SessionState,
} from "./types.js";
import { BLOCK_TYPES } from "./types.js";

interface HistoryEntry {
  book: Book;
  selectedSectionId: string;
}

function matterKey(matter: MatterKind): "frontMatter" | "chapters" | "backMatter" {
  switch (matter) {
    case "front":
      return "frontMatter";
    case "back":
      return "backMatter";
    default:
      return "chapters";
  }
}

function defaultRole(matter: MatterKind): string {
  return matter === "main" ? "chapter" : "custom";
}

function isContentBlock(value: unknown): value is ContentBlock {
  if (!value || typeof value !== "object") return false;
  const type = (value as { type?: unknown }).type;
  return typeof type === "string" && (BLOCK_TYPES as readonly string[]).includes(type);
}

function emptyParagraph(id: string): ContentBlock {
  return {
    type: "paragraph",
    id,
    inlines: [{ type: "text", text: "" }],
  };
}

function findSection(
  book: Book,
  sectionId: string,
): { section: StructuralSection; matter: MatterKind; index: number } {
  const partitions: Array<{ matter: MatterKind; sections: StructuralSection[] }> = [
    { matter: "front", sections: book.frontMatter },
    { matter: "main", sections: book.chapters },
    { matter: "back", sections: book.backMatter },
  ];
  for (const part of partitions) {
    const index = part.sections.findIndex((s) => s.id === sectionId);
    if (index >= 0) {
      return { section: part.sections[index]!, matter: part.matter, index };
    }
  }
  throw new SectionNotFoundError(sectionId);
}

/**
 * Headless transactional session over a canonical Book (ADR-0016).
 */
export class BookSession implements IBookSession {
  #book: Book;
  #selectedSectionId: string;
  #isDirty = false;
  #revision = 0;
  readonly #ids: DeterministicIdFactory;
  readonly #undo: HistoryEntry[] = [];
  readonly #redo: HistoryEntry[] = [];

  constructor(options: BookSessionOptions) {
    const book = cloneBook(options.book);
    const errors = validateBook(book).filter((i) => i.severity === "error");
    if (errors.length > 0) {
      throw new DomainValidationError(errors);
    }
    if (book.chapters.length === 0) {
      throw new InvalidStructureOperationError(
        "Initial Book must contain at least one main-matter chapter.",
      );
    }

    this.#book = book;
    this.#ids = new DeterministicIdFactory(
      options.idSeed ?? serializeBook(book),
    );

    const preferred = options.initialSelectedSectionId;
    if (preferred) {
      findSection(book, preferred);
      this.#selectedSectionId = preferred;
    } else {
      this.#selectedSectionId = book.chapters[0]!.id;
    }
  }

  getState(): SessionState {
    return {
      book: cloneBook(this.#book),
      selectedSectionId: this.#selectedSectionId,
      isDirty: this.#isDirty,
      revision: this.#revision,
    };
  }

  getBook(): Book {
    return cloneBook(this.#book);
  }

  getSelectedSection(): StructuralSection | undefined {
    try {
      const located = findSection(this.#book, this.#selectedSectionId);
      return structuredClone(located.section);
    } catch {
      return undefined;
    }
  }

  selectSection(sectionId: string): void {
    findSection(this.#book, sectionId);
    this.#selectedSectionId = sectionId;
  }

  addSection(params: AddSectionParams): StructuralSection {
    let created!: StructuralSection;
    this.#mutate((candidate) => {
      const key = matterKey(params.matter);
      const list = [...candidate[key]];
      const sectionId = this.#ids.nextSectionId();
      const rawBlocks =
        params.initialBlocks && params.initialBlocks.length > 0
          ? params.initialBlocks
          : [emptyParagraph("temp")];
      const blocks = rawBlocks.map((block) => this.#assignBlockId(block));
      const section: StructuralSection = {
        id: sectionId,
        kind: params.matter,
        role: params.role ?? defaultRole(params.matter),
        title: params.title.trim(),
        blocks,
      };
      const at =
        params.atIndex === undefined
          ? list.length
          : Math.max(0, Math.min(params.atIndex, list.length));
      list.splice(at, 0, section);
      candidate[key] = list;
      created = section;
    });
    this.#selectedSectionId = created.id;
    return structuredClone(created);
  }

  removeSection(sectionId: string): void {
    let nextSelected = this.#selectedSectionId;
    this.#mutate((candidate) => {
      const located = findSection(candidate, sectionId);
      if (located.matter === "main" && candidate.chapters.length <= 1) {
        throw new InvalidStructureOperationError(
          "Cannot delete the last remaining main-matter chapter.",
        );
      }
      const key = matterKey(located.matter);
      const list = [...candidate[key]];
      list.splice(located.index, 1);
      candidate[key] = list;
      if (this.#selectedSectionId === sectionId) {
        nextSelected =
          candidate.chapters[0]?.id ??
          candidate.frontMatter[0]?.id ??
          candidate.backMatter[0]?.id ??
          sectionId;
      }
    });
    this.#selectedSectionId = nextSelected;
  }

  reorderSection(matter: MatterKind, fromIndex: number, toIndex: number): void {
    this.#mutate((candidate) => {
      const key = matterKey(matter);
      const list = [...candidate[key]];
      if (
        fromIndex < 0 ||
        toIndex < 0 ||
        fromIndex >= list.length ||
        toIndex >= list.length
      ) {
        throw new InvalidStructureOperationError(
          `reorderSection indices out of bounds (from=${fromIndex}, to=${toIndex}, length=${list.length}).`,
        );
      }
      const [item] = list.splice(fromIndex, 1);
      list.splice(toIndex, 0, item!);
      candidate[key] = list;
    });
  }

  moveSection(
    sectionId: string,
    targetMatter: MatterKind,
    targetIndex?: number,
  ): void {
    this.#mutate((candidate) => {
      const located = findSection(candidate, sectionId);
      if (located.matter === "main" && candidate.chapters.length <= 1) {
        if (targetMatter !== "main") {
          throw new InvalidStructureOperationError(
            "Cannot move the last remaining main-matter chapter out of main matter.",
          );
        }
      }
      const sourceKey = matterKey(located.matter);
      const sourceList = [...candidate[sourceKey]];
      const [section] = sourceList.splice(located.index, 1);
      if (!section) {
        throw new SectionNotFoundError(sectionId);
      }
      candidate[sourceKey] = sourceList;

      const moved: StructuralSection = {
        ...section,
        kind: targetMatter,
      };
      const targetKey = matterKey(targetMatter);
      const targetList = [...candidate[targetKey]];
      const at =
        targetIndex === undefined
          ? targetList.length
          : Math.max(0, Math.min(targetIndex, targetList.length));
      targetList.splice(at, 0, moved);
      candidate[targetKey] = targetList;
    });
  }

  updateSectionTitle(sectionId: string, title: string): void {
    this.#mutate((candidate) => {
      const located = findSection(candidate, sectionId);
      const key = matterKey(located.matter);
      const list = [...candidate[key]];
      list[located.index] = {
        ...located.section,
        title: title.trim(),
      };
      candidate[key] = list;
    });
  }

  updateSectionRole(sectionId: string, role: string): void {
    this.#mutate((candidate) => {
      const located = findSection(candidate, sectionId);
      const key = matterKey(located.matter);
      const list = [...candidate[key]];
      list[located.index] = {
        ...located.section,
        role,
      };
      candidate[key] = list;
    });
  }

  updateMetadata(metadata: Partial<BookMetadata>): void {
    this.#mutate((candidate) => {
      candidate.metadata = {
        ...candidate.metadata,
        ...metadata,
        authors: metadata.authors
          ? [...metadata.authors]
          : [...candidate.metadata.authors],
        contributors: metadata.contributors
          ? [...metadata.contributors]
          : [...candidate.metadata.contributors],
        subjects: metadata.subjects
          ? [...metadata.subjects]
          : [...candidate.metadata.subjects],
      };
    });
  }

  setSectionBlocks(sectionId: string, blocks: readonly ContentBlock[]): void {
    this.#mutate((candidate) => {
      if (!Array.isArray(blocks)) {
        throw new InvalidStructureOperationError("blocks must be an array.");
      }
      for (const block of blocks) {
        if (!isContentBlock(block)) {
          throw new InvalidStructureOperationError(
            `Unsupported or invalid content block type.`,
          );
        }
      }
      const located = findSection(candidate, sectionId);
      const assigned =
        blocks.length > 0
          ? blocks.map((b) => this.#assignBlockId(b))
          : [emptyParagraph(this.#ids.nextBlockId())];
      const key = matterKey(located.matter);
      const list = [...candidate[key]];
      list[located.index] = {
        ...located.section,
        blocks: assigned,
      };
      candidate[key] = list;
    });
  }

  insertBlock(
    sectionId: string,
    atIndex: number,
    block: ContentBlock,
  ): ContentBlock {
    return this.#mutate((candidate) => {
      if (!isContentBlock(block)) {
        throw new InvalidStructureOperationError(
          `Unsupported or invalid content block type.`,
        );
      }
      const located = findSection(candidate, sectionId);
      const blocks = [...located.section.blocks];
      const inserted = this.#assignBlockId(block);
      const at = Math.max(0, Math.min(atIndex, blocks.length));
      blocks.splice(at, 0, inserted);
      const key = matterKey(located.matter);
      const list = [...candidate[key]];
      list[located.index] = { ...located.section, blocks };
      candidate[key] = list;
      return inserted;
    });
  }

  updateBlock(sectionId: string, blockId: string, block: ContentBlock): void {
    this.#mutate((candidate) => {
      if (!isContentBlock(block)) {
        throw new InvalidStructureOperationError(
          `Unsupported or invalid content block type.`,
        );
      }
      const located = findSection(candidate, sectionId);
      const blocks = [...located.section.blocks];
      const index = blocks.findIndex((b) => b.id === blockId);
      if (index < 0) {
        throw new BlockNotFoundError(sectionId, blockId);
      }
      // Preserve existing canonical block ID (ADR-0016 §2.1 / §2.4).
      blocks[index] = { ...block, id: blockId } as ContentBlock;
      const key = matterKey(located.matter);
      const list = [...candidate[key]];
      list[located.index] = { ...located.section, blocks };
      candidate[key] = list;
    });
  }

  removeBlock(sectionId: string, blockId: string): void {
    this.#mutate((candidate) => {
      const located = findSection(candidate, sectionId);
      const blocks = [...located.section.blocks];
      const index = blocks.findIndex((b) => b.id === blockId);
      if (index < 0) {
        throw new BlockNotFoundError(sectionId, blockId);
      }
      blocks.splice(index, 1);
      if (blocks.length === 0) {
        blocks.push(emptyParagraph(this.#ids.nextBlockId()));
      }
      const key = matterKey(located.matter);
      const list = [...candidate[key]];
      list[located.index] = { ...located.section, blocks };
      candidate[key] = list;
    });
  }

  markSaved(): void {
    this.#isDirty = false;
  }

  canUndo(): boolean {
    return this.#undo.length > 0;
  }

  canRedo(): boolean {
    return this.#redo.length > 0;
  }

  undo(): boolean {
    const previous = this.#undo.pop();
    if (!previous) return false;
    this.#redo.push({
      book: cloneBook(this.#book),
      selectedSectionId: this.#selectedSectionId,
    });
    this.#book = previous.book;
    this.#selectedSectionId = previous.selectedSectionId;
    this.#revision += 1;
    this.#isDirty = true;
    return true;
  }

  redo(): boolean {
    const next = this.#redo.pop();
    if (!next) return false;
    this.#undo.push({
      book: cloneBook(this.#book),
      selectedSectionId: this.#selectedSectionId,
    });
    this.#book = next.book;
    this.#selectedSectionId = next.selectedSectionId;
    this.#revision += 1;
    this.#isDirty = true;
    return true;
  }

  #assignBlockId(block: ContentBlock): ContentBlock {
    const id = this.#ids.nextBlockId();
    return { ...block, id } as ContentBlock;
  }

  #mutate<T>(fn: (candidate: Book) => T): T {
    const before: HistoryEntry = {
      book: cloneBook(this.#book),
      selectedSectionId: this.#selectedSectionId,
    };
    const candidate = cloneBook(this.#book);
    let result: T;
    try {
      result = fn(candidate);
    } catch (err) {
      // Pre-validation structural errors: leave session unchanged.
      throw err;
    }

    const errors = validateBook(candidate).filter((i) => i.severity === "error");
    if (errors.length > 0) {
      throw new DomainValidationError(errors);
    }

    this.#undo.push(before);
    this.#redo.length = 0;
    this.#book = candidate;
    this.#revision += 1;
    this.#isDirty = true;
    return result;
  }
}
