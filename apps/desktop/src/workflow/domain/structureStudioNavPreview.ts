// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 4 — navigation preview.
 *
 * Reading order is a projection of Book sections (front, then main, then back).
 * Nothing here is stored. Publishing navigation stays in the EPUB engine.
 */
import type { Book, MatterKind } from "@openbook/book-model";
import { listBookStructure } from "./structureStudioContract.js";

export interface BookNavigationEntry {
  readonly order: number;
  readonly id: string;
  readonly title: string;
  readonly matter: MatterKind;
  readonly role: string;
}

export function projectBookNavigation(book: Book): readonly BookNavigationEntry[] {
  const entries: BookNavigationEntry[] = [];
  for (const group of listBookStructure(book)) {
    for (const section of group.sections) {
      entries.push({
        order: entries.length + 1,
        id: section.id,
        title: section.title,
        matter: group.matter,
        role: section.role,
      });
    }
  }
  return entries;
}
