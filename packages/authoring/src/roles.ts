// SPDX-License-Identifier: Apache-2.0
import type { MatterKind } from "@openbook/book-model";

/**
 * Roles permitted per matter partition for Gate 7 Slice 3 move/structure ops.
 * Unknown custom string roles are allowed only via the explicit "custom" token
 * or as free-form roles only when listed here; free-form beyond the ADR set
 * is rejected for moveSection validation (strict Slice 3).
 */
const FRONT_ROLES = new Set([
  "half-title",
  "title-page",
  "copyright",
  "dedication",
  "preface",
  "foreword",
  "introduction",
  "custom",
]);

const MAIN_ROLES = new Set(["chapter", "introduction", "custom"]);

const BACK_ROLES = new Set([
  "appendix",
  "notes",
  "references",
  "bibliography",
  "about-author",
  "other-books",
  "custom",
]);

export function isRoleValidForMatter(
  role: string,
  matter: MatterKind,
): boolean {
  switch (matter) {
    case "front":
      return FRONT_ROLES.has(role);
    case "main":
      return MAIN_ROLES.has(role);
    case "back":
      return BACK_ROLES.has(role);
    default:
      return false;
  }
}
