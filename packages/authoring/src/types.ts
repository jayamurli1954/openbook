// SPDX-License-Identifier: Apache-2.0
import type {
  Book,
  BookMetadata,
  ContentBlock,
  MatterKind,
  SectionRole,
  StructuralSection,
} from "@openbook/book-model";

export interface SessionState {
  readonly book: Book;
  readonly selectedSectionId: string;
  readonly isDirty: boolean;
  readonly revision: number;
}

export interface AddSectionParams {
  readonly matter: MatterKind;
  readonly title: string;
  readonly role?: SectionRole | string;
  readonly atIndex?: number;
  readonly initialBlocks?: readonly ContentBlock[];
}

export interface BookSessionOptions {
  readonly book: Book;
  readonly idSeed?: string;
  readonly initialSelectedSectionId?: string;
}

export interface IBookSession {
  getState(): SessionState;
  getBook(): Book;
  getSelectedSection(): StructuralSection | undefined;
  selectSection(sectionId: string): void;

  addSection(params: AddSectionParams): StructuralSection;
  removeSection(sectionId: string): void;
  reorderSection(matter: MatterKind, fromIndex: number, toIndex: number): void;
  moveSection(
    sectionId: string,
    targetMatter: MatterKind,
    targetIndex?: number,
  ): void;
  updateSectionTitle(sectionId: string, title: string): void;
  updateSectionRole(sectionId: string, role: string): void;
  updateMetadata(metadata: Partial<BookMetadata>): void;

  setSectionBlocks(sectionId: string, blocks: readonly ContentBlock[]): void;
  insertBlock(
    sectionId: string,
    atIndex: number,
    block: ContentBlock,
  ): ContentBlock;
  updateBlock(sectionId: string, blockId: string, block: ContentBlock): void;
  removeBlock(sectionId: string, blockId: string): void;

  markSaved(): void;
  canUndo(): boolean;
  canRedo(): boolean;
  undo(): boolean;
  redo(): boolean;
}

export const BLOCK_TYPES = [
  "paragraph",
  "heading",
  "quote",
  "list",
  "image",
] as const;
