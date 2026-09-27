// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 2 — matter rail port.
 *
 * Front / main / back list, add, rename, and reorder within one matter.
 * Move, remove, and role changes stay on later slices.
 */
import type { MatterKind } from "@openbook/book-model";
import {
  executeStructureCommand,
  listBookStructure,
  type StructureMatterGroup,
  type StructureStudioResult,
  type StructureStudioSessionPort,
} from "./structureStudioContract.js";

export interface StructureStudioMatterRail {
  list(): readonly StructureMatterGroup[];
  add(matter: MatterKind, title: string): StructureStudioResult;
  rename(sectionId: string, title: string): StructureStudioResult;
  reorder(
    matter: MatterKind,
    fromIndex: number,
    toIndex: number,
  ): StructureStudioResult;
}

export type StructureStudioMatterSessionPort = Pick<
  StructureStudioSessionPort,
  "getBook" | "addSection" | "updateSectionTitle" | "reorderSection"
>;

function asCommandSession(
  session: StructureStudioMatterSessionPort,
): StructureStudioSessionPort {
  return {
    getBook: () => session.getBook(),
    addSection: (params) => session.addSection(params),
    updateSectionTitle: (sectionId, title) =>
      session.updateSectionTitle(sectionId, title),
    reorderSection: (matter, fromIndex, toIndex) =>
      session.reorderSection(matter, fromIndex, toIndex),
    removeSection(): void {
      throw new Error("Remove is not part of the matter rail.");
    },
    moveSection(
      _sectionId: string,
      _targetMatter: MatterKind,
      _targetIndex?: number,
    ): void {
      throw new Error("Move is not part of the matter rail.");
    },
    updateSectionRole(_sectionId: string, _role: string): void {
      throw new Error("Role change is not part of the matter rail.");
    },
  };
}

export function createStructureStudioMatterRail(
  session: StructureStudioMatterSessionPort,
): StructureStudioMatterRail {
  const commands = asCommandSession(session);
  return {
    list(): readonly StructureMatterGroup[] {
      return listBookStructure(session.getBook());
    },
    add(matter: MatterKind, title: string): StructureStudioResult {
      return executeStructureCommand(commands, { type: "add", matter, title });
    },
    rename(sectionId: string, title: string): StructureStudioResult {
      return executeStructureCommand(commands, {
        type: "rename",
        sectionId,
        title,
      });
    },
    reorder(
      matter: MatterKind,
      fromIndex: number,
      toIndex: number,
    ): StructureStudioResult {
      return executeStructureCommand(commands, {
        type: "reorder",
        matter,
        fromIndex,
        toIndex,
      });
    },
  };
}
