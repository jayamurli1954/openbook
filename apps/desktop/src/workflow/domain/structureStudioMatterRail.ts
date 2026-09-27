// SPDX-License-Identifier: Apache-2.0
/**
 * ADR-0035 Slice 2–3 — matter rail port.
 *
 * List, add, rename, and reorder within one matter.
 * Move between matters and set a role that is valid for the current matter.
 * Remove stays out of this rail.
 */
import type { MatterKind } from "@openbook/book-model";
import { rolesForMatter } from "@openbook/authoring";
import {
  executeStructureCommand,
  listBookStructure,
  type StructureMatterGroup,
  type StructureStudioResult,
  type StructureStudioSessionPort,
} from "./structureStudioContract.js";

export interface StructureStudioMatterRail {
  list(): readonly StructureMatterGroup[];
  rolesFor(matter: MatterKind): readonly string[];
  add(matter: MatterKind, title: string): StructureStudioResult;
  rename(sectionId: string, title: string): StructureStudioResult;
  reorder(
    matter: MatterKind,
    fromIndex: number,
    toIndex: number,
  ): StructureStudioResult;
  move(sectionId: string, targetMatter: MatterKind): StructureStudioResult;
  setRole(sectionId: string, role: string): StructureStudioResult;
}

export type StructureStudioMatterSessionPort = Pick<
  StructureStudioSessionPort,
  | "getBook"
  | "addSection"
  | "updateSectionTitle"
  | "reorderSection"
  | "moveSection"
  | "updateSectionRole"
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
    moveSection: (sectionId, targetMatter, targetIndex) =>
      session.moveSection(sectionId, targetMatter, targetIndex),
    updateSectionRole: (sectionId, role) =>
      session.updateSectionRole(sectionId, role),
    removeSection(): void {
      throw new Error("Remove is not part of the matter rail.");
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
    rolesFor(matter: MatterKind): readonly string[] {
      return rolesForMatter(matter);
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
    move(sectionId: string, targetMatter: MatterKind): StructureStudioResult {
      return executeStructureCommand(commands, {
        type: "move",
        sectionId,
        targetMatter,
      });
    },
    setRole(sectionId: string, role: string): StructureStudioResult {
      return executeStructureCommand(commands, {
        type: "set-role",
        sectionId,
        role,
      });
    },
  };
}
